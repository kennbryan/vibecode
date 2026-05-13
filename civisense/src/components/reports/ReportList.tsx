"use client";

import { Filter, SlidersHorizontal } from "lucide-react";
import { ReportCard } from "@/components/reports/ReportCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ConfirmReportAction, ConfirmReportOptions, FloodReport, ReportFilters } from "@/types/report";

type ReportListProps = {
  reports: FloodReport[];
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  onConfirm: (id: string, action: ConfirmReportAction, options?: ConfirmReportOptions) => Promise<FloodReport>;
  hasVoted: (id: string) => boolean;
  isLoading?: boolean;
};

export function ReportList({ reports, filters, onFiltersChange, onConfirm, hasVoted, isLoading }: ReportListProps) {
  return (
    <section className="flex h-full flex-col gap-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Select value={filters.severity} onValueChange={(severity) => onFiltersChange({ ...filters, severity: severity as ReportFilters["severity"] })}>
          <SelectTrigger aria-label="Filter tingkat banjir">
            <Filter className="size-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua tingkat</SelectItem>
            <SelectItem value="light">Ringan</SelectItem>
            <SelectItem value="moderate">Sedang</SelectItem>
            <SelectItem value="severe">Parah</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.timeWindow} onValueChange={(timeWindow) => onFiltersChange({ ...filters, timeWindow: timeWindow as ReportFilters["timeWindow"] })}>
          <SelectTrigger aria-label="Filter waktu laporan">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua waktu</SelectItem>
            <SelectItem value="1h">&gt; 1 jam lalu</SelectItem>
            <SelectItem value="3h">&gt; 3 jam lalu</SelectItem>
            <SelectItem value="5h">&gt; 5 jam lalu</SelectItem>
            <SelectItem value="7h">&gt; 7 jam lalu</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.sort} onValueChange={(sort) => onFiltersChange({ ...filters, sort: sort as ReportFilters["sort"] })}>
          <SelectTrigger aria-label="Urutkan laporan">
            <SlidersHorizontal className="size-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Terbaru</SelectItem>
            <SelectItem value="confirmed">Paling dikonfirmasi</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isLoading && <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">Memuat laporan...</p>}
      {!isLoading && reports.length === 0 && (
        <p className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
          Belum ada laporan aktif untuk filter ini.
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <ReportCard key={report.id} report={report} onConfirm={onConfirm} hasVoted={hasVoted(report.id)} />
        ))}
      </div>
    </section>
  );
}
