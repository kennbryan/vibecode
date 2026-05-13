"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { REPORT_REFRESH_MS } from "@/lib/constants";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { compressReportPhoto } from "@/lib/image";
import type { ConfirmReportAction, ConfirmReportOptions, FloodReport, ReportFilters } from "@/types/report";

const VOTES_STORAGE_KEY = "civisense:votes";

function loadVotedIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(VOTES_STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveVotedIds(ids: Set<string>) {
  try {
    window.localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore storage errors
  }
}

type UseReportsOptions = {
  initialReports?: FloodReport[];
  filters: ReportFilters;
};

export function useReports({ initialReports = [], filters }: UseReportsOptions) {
  const [reports, setReports] = useState<FloodReport[]>(initialReports);
  const [isLoading, setIsLoading] = useState(initialReports.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const realtimeConnected = useRef(false);

  // Load voted ids from localStorage on mount
  useEffect(() => {
    setVotedIds(loadVotedIds());
  }, []);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      severity: filters.severity,
      time: filters.timeWindow,
      sort: filters.sort,
    });
    return params.toString();
  }, [filters.severity, filters.sort, filters.timeWindow]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/reports?${queryString}`, { cache: "no-store" });
      const payload = (await response.json()) as { reports?: FloodReport[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Tidak dapat memuat laporan.");
      setReports(payload.reports || []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Tidak dapat memuat laporan.");
    } finally {
      setIsLoading(false);
    }
  }, [queryString]);

  const confirmReport = useCallback(async (id: string, action: ConfirmReportAction, options?: ConfirmReportOptions) => {
    const hasMultipartPayload = Boolean(options?.photo || options?.comment?.trim());
    const response = hasMultipartPayload
      ? await fetch(`/api/reports/${id}/confirm`, {
          method: "POST",
          body: await buildConfirmationFormData(action, options),
        })
      : await fetch(`/api/reports/${id}/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });

    const payload = (await response.json()) as { report?: FloodReport; error?: string };

    if (!response.ok || !payload.report) {
      throw new Error(payload.error || "Verifikasi gagal dikirim.");
    }

    // Mark as voted in localStorage
    setVotedIds((current) => {
      const next = new Set(current);
      next.add(id);
      saveVotedIds(next);
      return next;
    });

    // Update report in place — never remove it from the map regardless of action
    setReports((current) =>
      current.map((report) => (report.id === id ? payload.report! : report)),
    );

    return payload.report;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasVoted = useCallback((id: string) => votedIds.has(id), [votedIds]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      if (!realtimeConnected.current) void refresh();
    }, REPORT_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel("flood-reports")
      .on("postgres_changes", { event: "*", schema: "public", table: "flood_reports" }, () => {
        void refresh();
      })
      .subscribe((status) => {
        realtimeConnected.current = status === "SUBSCRIBED";
      });

    return () => {
      realtimeConnected.current = false;
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { reports, isLoading, error, refresh, confirmReport, hasVoted };
}

async function buildConfirmationFormData(action: ConfirmReportAction, options?: ConfirmReportOptions) {
  const formData = new FormData();
  formData.set("action", action);
  if (options?.comment?.trim()) formData.set("comment", options.comment.trim());
  if (options?.photo) {
    const compressed = await compressReportPhoto(options.photo);
    formData.set("photo", compressed, compressed.name || "flood-confirmation.jpg");
  }
  return formData;
}
