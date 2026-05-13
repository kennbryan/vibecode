"use client";

import type { ReportSeverity, WaterDepth } from "@/types/report";

const DB_NAME = "civisense-offline";
const DB_VERSION = 1;
const STORE_NAME = "civisense:pending-reports";
export const PENDING_REPORTS_CHANGED_EVENT = "civisense:pending-reports-changed";

export type PendingReport = {
  id: string;
  createdAt: string;
  latitude: number;
  longitude: number;
  severity: ReportSeverity;
  water_depth: WaterDepth | null;
  comment: string;
  reporter_name: string;
  photo: Blob;
  photoName: string;
};

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function dispatchPendingChanged() {
  window.dispatchEvent(new Event(PENDING_REPORTS_CHANGED_EVENT));
}

async function withStore<T>(mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDb();

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = callback(transaction.objectStore(STORE_NAME));

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export async function queuePendingReport(report: PendingReport) {
  await withStore("readwrite", (store) => store.put(report));
  dispatchPendingChanged();
}

export async function removePendingReport(id: string) {
  await withStore("readwrite", (store) => store.delete(id));
  dispatchPendingChanged();
}

export async function getPendingReports() {
  return withStore<PendingReport[]>("readonly", (store) => store.getAll() as IDBRequest<PendingReport[]>);
}

export async function getPendingReportCount() {
  return withStore<number>("readonly", (store) => store.count());
}

export async function replayPendingReports() {
  const reports = await getPendingReports();
  let sent = 0;

  for (const report of reports) {
    const formData = new FormData();
    formData.set("latitude", String(report.latitude));
    formData.set("longitude", String(report.longitude));
    formData.set("severity", report.severity);
    if (report.water_depth) {
      formData.set("water_depth", report.water_depth);
    }
    formData.set("comment", report.comment);
    formData.set("reporter_name", report.reporter_name);
    formData.set("photo", report.photo, report.photoName);

    const response = await fetch("/api/reports", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      continue;
    }

    await removePendingReport(report.id);
    sent += 1;
  }

  return sent;
}
