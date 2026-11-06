import type {
  Category,
  CheckExecutor,
  CheckMethod,
  Decision,
  Evidence,
  InspectionType,
  ItemStatus,
  PipelineStageName,
  StageStatus,
} from "../types";

export type VerdictTone = "success" | "warning" | "error" | "info";

export type VerdictView = {
  label: ItemStatus;
  tone: VerdictTone;
  icon: "CircleCheck" | "CircleX" | "TriangleAlert";
};

/**
 * Tiga status hasil per item, apa adanya dari PRD §13.2. Tidak ada status lain.
 * "Terjadi Kesalahan pada proses" adalah kegagalan teknis, bukan kesimpulan reviu.
 */
const views: Record<ItemStatus, VerdictView> = {
  Sesuai: { label: "Sesuai", tone: "success", icon: "CircleCheck" },
  "Tidak Sesuai atau perlu revisi": { label: "Tidak Sesuai atau perlu revisi", tone: "error", icon: "CircleX" },
  "Terjadi Kesalahan pada proses": { label: "Terjadi Kesalahan pada proses", tone: "warning", icon: "TriangleAlert" },
};

export const getVerdictView = (status: ItemStatus) => views[status];
export const isTechnicalError = (status: ItemStatus) => status === "Terjadi Kesalahan pada proses";

/** Kategori RO (PRD §13.3). Klaim Satker, rekomendasi Screening 2, dan kategori final memakai set yang sama. */
export const CATEGORIES: Category[] = ["K1", "K2", "K3", "K4"];
export const categoryLabel: Record<Category, string> = {
  K1: "K1 RO Wajib",
  K2: "K2 RO Prioritas Strategis",
  K3: "K3 RO Strategis/Diskresioner",
  K4: "K4 RO Non-Strategis",
};

export const decisionLabel: Record<Decision, string> = {
  selesai_revisi: "Perlu revisi",
  selesai_disetujui: "Disetujui",
};

/** Bagian tampilan hasil (PRD FR-VER-02): format, substansi, tabel acuan, Screening 2. */
export const inspectionTypeLabel: Record<InspectionType, string> = {
  format_completeness: "Format dan kelengkapan",
  substance: "Substansi",
  tor_rab_alignment: "Kesesuaian TOR dan RAB",
  reference_table: "Tabel acuan (BAS/SBM)",
  categorization: "Kategorisasi (Screening 2)",
};

export const methodLabel: Record<CheckMethod, string> = {
  rule: "Aturan",
  lookup: "Pencocokan tabel",
  llm_rag: "AI dengan dokumen acuan",
  llm: "AI",
  manual: "Manual oleh ROCAN",
};

export const executorLabel: Record<CheckExecutor, string> = {
  team1_lapis_a: "Lapis A (Tim 1)",
  app: "Aplikasi",
};

export const evidenceSourceLabel: Record<Evidence["source"], string> = {
  tor: "TOR",
  rab: "RAB",
  reference_document: "Dokumen acuan",
  reference_table: "Tabel acuan",
};

/** Nama tahap pipeline dalam bahasa sederhana (PRD §7.4 T1–T8). */
export const stageLabel: Record<PipelineStageName, string> = {
  extraction: "Membaca TOR dan RAB",
  format_check: "Memeriksa format dan kelengkapan",
  sectioning: "Memetakan bagian dokumen",
  reference_table_check: "Mencocokkan tabel acuan",
  retrieval: "Mencari dokumen acuan",
  substance_assessment: "Menilai substansi",
  categorization: "Memeriksa kategori",
  aggregation: "Menyusun hasil",
};

export const stageStatusLabel: Record<StageStatus, string> = {
  menunggu: "Menunggu",
  berjalan: "Berjalan",
  selesai: "Selesai",
  gagal: "Gagal",
  dilewati: "Dilewati",
};
