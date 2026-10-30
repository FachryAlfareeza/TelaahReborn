import type { Role, SubmissionStatus } from "../types";

export type StatusTone = "info" | "warning" | "success" | "error";

export type StatusView = {
  label: string;
  tone: StatusTone;
  /** Nama ikon lucide-react. Status tidak boleh hanya warna. */
  icon: "Loader" | "ClipboardCheck" | "CircleCheck" | "CircleX" | "TriangleAlert";
};

/** Satu-satunya pemetaan status per peran. Dipakai semua komponen. */
export function getStatusView(status: SubmissionStatus, role: Role): StatusView {
  const isSatker = role === "SATKER";
  switch (status) {
    case "PROCESSING":
      return { label: isSatker ? "Terupload" : "Diproses AI", tone: "info", icon: "Loader" };
    case "AWAITING_REVIEW":
      return {
        label: isSatker ? "Diperiksa" : "Menunggu Pemeriksaan",
        tone: "warning",
        icon: "ClipboardCheck",
      };
    case "ACCEPTED":
      return { label: "Diterima", tone: "success", icon: "CircleCheck" };
    case "REJECTED":
      return { label: "Ditolak", tone: "error", icon: "CircleX" };
    case "PROCESSING_FAILED":
      // Kegagalan sistem bukan kesimpulan reviu. Satker tetap melihat "Terupload".
      return isSatker
        ? { label: "Terupload", tone: "info", icon: "Loader" }
        : { label: "Pemrosesan bermasalah", tone: "error", icon: "TriangleAlert" };
  }
}

export function getStatusLabel(status: SubmissionStatus, role: Role): string {
  return getStatusView(status, role).label;
}

/** Kirim ulang hanya untuk ROCAN dan Super Admin saat pemrosesan bermasalah. */
export function canResubmitProcessing(status: SubmissionStatus, role: Role): boolean {
  return status === "PROCESSING_FAILED" && role !== "SATKER";
}
