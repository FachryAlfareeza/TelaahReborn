import type { Role, ReviewRequestStatus } from "../types";

export type StatusTone = "info" | "warning" | "success" | "error";

export type StatusView = {
  label: string;
  tone: StatusTone;
  /** Nama ikon lucide-react. Status tidak boleh hanya warna. */
  icon: "Clock" | "Loader" | "ClipboardCheck" | "CircleCheck" | "RotateCcw" | "TriangleAlert";
};

/** Urutan status pengajuan (kontrak §2), dipakai filter dan ringkasan. */
export const REQUEST_STATUSES: ReviewRequestStatus[] = [
  "menunggu_review",
  "dalam_proses",
  "siap_diverifikasi",
  "gagal",
  "selesai_revisi",
  "selesai_disetujui",
];

/**
 * Label per peran. Bagi Satker, `siap_diverifikasi` tampil sebagai sedang diperiksa (hasil AI belum
 * boleh dilihat, PRD FR-VER-03) dan `gagal` tidak tampil sebagai kegagalan (kontrak §4.3).
 */
export function getStatusView(status: ReviewRequestStatus, role: Role): StatusView {
  const isSatker = role === "satker";
  switch (status) {
    case "menunggu_review":
      return { label: "Menunggu reviu", tone: "info", icon: "Clock" };
    case "dalam_proses":
      return { label: isSatker ? "Sedang direviu" : "Diproses AI", tone: "info", icon: "Loader" };
    case "siap_diverifikasi":
      return isSatker
        ? { label: "Diperiksa ROCAN", tone: "warning", icon: "ClipboardCheck" }
        : { label: "Siap diverifikasi", tone: "warning", icon: "ClipboardCheck" };
    case "gagal":
      return isSatker
        ? { label: "Sedang direviu", tone: "info", icon: "Loader" }
        : { label: "Pemrosesan gagal", tone: "error", icon: "TriangleAlert" };
    case "selesai_revisi":
      return { label: "Perlu revisi", tone: "error", icon: "RotateCcw" };
    case "selesai_disetujui":
      return { label: "Disetujui", tone: "success", icon: "CircleCheck" };
  }
}

export function getStatusLabel(status: ReviewRequestStatus, role: Role): string {
  return getStatusView(status, role).label;
}

export function statusOptions(role: Role): { label: string; statuses: ReviewRequestStatus[] }[] {
  const groups = new Map<string, ReviewRequestStatus[]>();
  for (const s of REQUEST_STATUSES) {
    const label = getStatusLabel(s, role);
    groups.set(label, [...(groups.get(label) ?? []), s]);
  }
  return [...groups].map(([label, statuses]) => ({ label, statuses }));
}

/** Jalankan ulang hanya untuk ROCAN, dari status gagal (PRD K-25). */
export const canRetryReview = (status: ReviewRequestStatus, role: Role) => role === "rocan" && status === "gagal";

export const isRunning = (status: ReviewRequestStatus) => status === "menunggu_review" || status === "dalam_proses";

export const isFinal = (status: ReviewRequestStatus) => status === "selesai_revisi" || status === "selesai_disetujui";

export const hasReviewResult = (status: ReviewRequestStatus) => status === "siap_diverifikasi" || isFinal(status);
