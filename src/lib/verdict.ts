import type { Screening1Node, Screening2Question, TechnicalStatus } from "../types";

export type VerdictTone = "success" | "warning" | "error" | "info";

/** Status tampilan satu butir. "TECHNICAL" berarti pemrosesan bermasalah, bukan kesimpulan reviu. */
export type VerdictKind =
  | "PASS"
  | "NOT_PASS"
  | "MATCH"
  | "NO_MATCH"
  | "INSUFFICIENT_EVIDENCE"
  | "TECHNICAL"
  | "PENDING";

export type VerdictView = {
  label: string;
  tone: VerdictTone;
  icon: "CircleCheck" | "CircleX" | "CircleHelp" | "TriangleAlert" | "Loader";
};

export const TECHNICAL_LABEL = "Pemrosesan bermasalah";

const views: Record<VerdictKind, VerdictView> = {
  PASS: { label: "Sesuai", tone: "success", icon: "CircleCheck" },
  NOT_PASS: { label: "Belum sesuai", tone: "error", icon: "CircleX" },
  MATCH: { label: "Cocok", tone: "success", icon: "CircleCheck" },
  NO_MATCH: { label: "Tidak cocok", tone: "error", icon: "CircleX" },
  INSUFFICIENT_EVIDENCE: { label: "Bukti kurang", tone: "warning", icon: "CircleHelp" },
  TECHNICAL: { label: TECHNICAL_LABEL, tone: "error", icon: "TriangleAlert" },
  PENDING: { label: "Belum ada hasil", tone: "info", icon: "Loader" },
};

export function getVerdictView(kind: VerdictKind): VerdictView {
  return views[kind];
}

export const technicalStatusLabel: Record<TechnicalStatus, string> = {
  NORMAL: "Normal",
  WRONG_MODEL: "Salah model",
  READ_FAILED: "Gagal baca",
  VERIFICATION_FAILED: "Gagal verifikasi",
};

/**
 * Status satu butir Screening 1. Butir dengan anak diturunkan dari anak-anaknya.
 * Gagal teknis tidak pernah menjadi kesimpulan: tampil sebagai "TECHNICAL".
 * Urutan: Belum sesuai, gagal teknis, Bukti kurang, belum ada hasil, Sesuai.
 */
export function deriveNodeStatus(node: Screening1Node): VerdictKind {
  if (node.technicalStatus !== "NORMAL") return "TECHNICAL";
  if (node.children.length === 0) return node.answer ?? "PENDING";
  const kinds = node.children.map(deriveNodeStatus);
  if (kinds.includes("NOT_PASS")) return "NOT_PASS";
  if (kinds.includes("TECHNICAL")) return "TECHNICAL";
  if (kinds.includes("INSUFFICIENT_EVIDENCE")) return "INSUFFICIENT_EVIDENCE";
  if (kinds.includes("PENDING")) return "PENDING";
  return "PASS";
}

/** Status satu pertanyaan Screening 2. */
export function questionKind(q: Screening2Question): VerdictKind {
  return q.technicalStatus !== "NORMAL" ? "TECHNICAL" : q.answer;
}

export const categoryLabel = (category: number) =>
  category === 0 ? "Kategori 0 (perlu pemeriksaan manual)" : `Kategori ${category}`;
