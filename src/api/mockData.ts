/**
 * DEMO: data contoh untuk adapter mock. Bentuknya mengikuti kontrak API backend.
 * Kode, nama unit, dan isi dokumen di sini karangan untuk demo, bukan data klien.
 */
import type {
  ChecklistItem,
  ChecklistVersion,
  CodeLabel,
  MasterRoRow,
  ReferenceDocument,
  Role,
} from "../types";

export const DEMO_PASSWORD = "demo12345";

export type SeedUser = {
  id: string;
  nip: string;
  nama: string;
  email: string | null;
  role: Role;
  unit_eselon1: CodeLabel | null;
  unit_eselon2: CodeLabel | null;
};

export const UNIT_E1: CodeLabel = { code: "005", name: "Direktorat Jenderal Contoh Komunikasi" };
export const UNIT_E2_A: CodeLabel = { code: "005.01", name: "Direktorat Contoh Informasi Publik" };
export const UNIT_E2_B: CodeLabel = { code: "005.02", name: "Direktorat Contoh Kemitraan" };

/** Satu akun per peran untuk tombol masuk cepat (demo). */
export const seedUsers: SeedUser[] = [
  {
    id: "u-satker",
    nip: "199001012020011001",
    nama: "Contoh Satker",
    email: "satker@contoh.test",
    role: "satker",
    unit_eselon1: UNIT_E1,
    unit_eselon2: UNIT_E2_A,
  },
  {
    id: "u-rocan",
    nip: "198502022010012002",
    nama: "Contoh ROCAN",
    email: "rocan@contoh.test",
    role: "rocan",
    unit_eselon1: null,
    unit_eselon2: null,
  },
  {
    id: "u-admin",
    nip: "198003032005011003",
    nama: "Contoh Super Admin",
    email: "admin@contoh.test",
    role: "super_admin",
    unit_eselon1: null,
    unit_eselon2: null,
  },
  {
    id: "u-satker-b",
    nip: "199204042021011004",
    nama: "Contoh Satker Kemitraan",
    email: null,
    role: "satker",
    unit_eselon1: UNIT_E1,
    unit_eselon2: UNIT_E2_B,
  },
];

const cl = (code: string, name: string): CodeLabel => ({ code, name });

const PROGRAM = cl("059.GH", "Program Contoh Komunikasi Publik");
const PROGRAM_B = cl("059.WA", "Program Contoh Dukungan Manajemen");

type RowSeed = [CodeLabel, CodeLabel, CodeLabel, CodeLabel, CodeLabel, MasterRoRow["priority"]];

const rowSeeds: RowSeed[] = [
  [PROGRAM, cl("4511", "Kegiatan Contoh Keterbukaan Informasi"), cl("PBM", "Kebijakan Bidang Komunikasi"), cl("001", "Rekomendasi Hasil Survei Contoh"), UNIT_E2_A, "Prioritas Nasional"],
  [PROGRAM, cl("4511", "Kegiatan Contoh Keterbukaan Informasi"), cl("PBM", "Kebijakan Bidang Komunikasi"), cl("002", "Pedoman Layanan Informasi Contoh"), UNIT_E2_A, "Bukan Prioritas Nasional"],
  [PROGRAM, cl("4511", "Kegiatan Contoh Keterbukaan Informasi"), cl("QDB", "Layanan Informasi Publik"), cl("001", "Layanan Informasi Daerah Contoh"), UNIT_E2_A, "Prioritas Nasional"],
  [PROGRAM, cl("4512", "Kegiatan Contoh Kemitraan Media"), cl("PBM", "Kebijakan Bidang Komunikasi"), cl("001", "Rekomendasi Kemitraan Contoh"), UNIT_E2_B, "Bukan Prioritas Nasional"],
  [PROGRAM_B, cl("4520", "Kegiatan Contoh Dukungan Teknis"), cl("EBA", "Layanan Dukungan Manajemen Internal"), cl("955", "Layanan Manajemen Keuangan Contoh"), UNIT_E2_A, "Bukan Prioritas Nasional"],
];

export const DATASET_2026 = "ds-2026";
export const DATASET_2027 = "ds-2027";

function rowsFor(datasetId: string, fiscalYear: number): MasterRoRow[] {
  return rowSeeds.map(([program, activity, kro, ro, unit2, priority], i) => ({
    id: `${datasetId}-row-${i + 1}`,
    dataset_id: datasetId,
    fiscal_year: fiscalYear,
    program,
    activity,
    kro,
    ro,
    unit_eselon1: UNIT_E1,
    unit_eselon2: unit2,
    priority,
  }));
}

export const seedRows: MasterRoRow[] = [...rowsFor(DATASET_2026, 2026), ...rowsFor(DATASET_2027, 2027)];

// Checklist

const item = (
  item_id: string,
  display_code: string,
  section: string,
  inspection_type: ChecklistItem["inspection_type"],
  method: ChecklistItem["method"],
  executor: ChecklistItem["executor"],
  criterion: string,
  extra: Partial<ChecklistItem> = {},
): ChecklistItem => ({
  item_id,
  display_code,
  section,
  inspection_type,
  method,
  executor,
  criterion,
  instructions: null,
  pass_criteria: null,
  source: null,
  parent_item_id: null,
  evidence_requirements: {},
  ...extra,
});

/**
 * Checklist contoh. Pemetaan 5W+1H disimpan sebagai data item (kolom `source`), bukan di kode,
 * karena pemetaan ini bisa berubah.
 */
export const seedChecklistItems: ChecklistItem[] = [
  item("ci-if1", "I.F.1", "Bagian I. Format", "format_completeness", "rule", "team1_lapis_a", "TOR memuat bagian latar belakang"),
  item("ci-if2", "I.F.2", "Bagian I. Format", "format_completeness", "rule", "team1_lapis_a", "TOR ditandatangani pejabat yang berwenang"),
  item("ci-iia1", "II.A.1", "Bagian II. Substansi", "substance", "llm_rag", "app", "Selaras dengan prioritas nasional, Renstra, dan arahan pimpinan", { source: "RPJMN, Renstra" }),
  item("ci-iic1", "II.C.1", "Bagian II. Substansi", "substance", "llm", "app", "Latar belakang dan rincian output dijelaskan lengkap (5W+1H)"),
  item("ci-iic1-a", "II.C.1.a", "Bagian II. Substansi", "substance", "llm", "app", "Apa: gambaran umum kegiatan", { parent_item_id: "ci-iic1", source: "Latar belakang: gambaran umum" }),
  item("ci-iic1-b", "II.C.1.b", "Bagian II. Substansi", "substance", "llm", "app", "Mengapa: dasar hukum dan gambaran umum", { parent_item_id: "ci-iic1", source: "Latar belakang: dasar hukum dan gambaran umum" }),
  item("ci-iic1-c", "II.C.1.c", "Bagian II. Substansi", "substance", "llm", "app", "Siapa: penerima manfaat", { parent_item_id: "ci-iic1", source: "Penerima manfaat" }),
  item("ci-iic1-d", "II.C.1.d", "Bagian II. Substansi", "substance", "llm", "app", "Kapan: tahapan dan waktu pelaksanaan", { parent_item_id: "ci-iic1", source: "Tahapan dan waktu pelaksanaan" }),
  item("ci-iic1-e", "II.C.1.e", "Bagian II. Substansi", "substance", "llm", "app", "Di mana: rincian lokasi", { parent_item_id: "ci-iic1", source: "Metode pelaksanaan: rincian lokasi" }),
  item("ci-iic1-f", "II.C.1.f", "Bagian II. Substansi", "substance", "llm", "app", "Bagaimana: metode pelaksanaan", { parent_item_id: "ci-iic1", source: "Metode pelaksanaan" }),
  item("ci-iic2", "II.C.2", "Bagian II. Substansi", "substance", "llm_rag", "app", "Manajemen risiko dan mitigasi dijelaskan"),
  item("ci-iva1", "IV.A.1", "Bagian IV. Kesesuaian RAB dan TOR", "tor_rab_alignment", "llm", "app", "RAB menjabarkan kebutuhan pada TOR"),
  item("ci-ivb1", "IV.B.1", "Bagian III. RAB", "reference_table", "lookup", "app", "Kode akun sesuai Bagan Akun Standar"),
  item("ci-ivc1", "IV.C.1", "Bagian III. RAB", "reference_table", "lookup", "app", "Harga satuan tidak melebihi Standar Biaya Masukan"),
];

export const seedScreening2Items: ChecklistItem[] = [
  item("ci-s2", "S2", "Screening 2", "categorization", "llm_rag", "app", "Verifikasi klaim kategori RO (Kategori 1 sampai 4, Kategori 4 sebagai cadangan)"),
];

export const seedChecklist: ChecklistVersion = {
  id: "cv-1",
  nama_versi: "Checklist contoh 2026",
  screening_1_items: seedChecklistItems,
  screening_2_items: seedScreening2Items,
  is_active: true,
  created_by: "u-rocan",
  created_at: "2026-10-28T09:00:00+07:00",
};

// Dokumen acuan

const doc = (
  id: string,
  title: string,
  doc_type: ReferenceDocument["doc_type"],
  status: ReferenceDocument["status"],
  extra: Partial<ReferenceDocument> = {},
): ReferenceDocument => ({
  id,
  title,
  doc_type,
  number: null,
  effective_year: 2026,
  validity: "berlaku",
  filename: `${id}.pdf`,
  sha256: `sha-${id}`,
  status,
  chunks_count: status === "active" || status === "inactive" ? 120 : 0,
  error_message: null,
  uploaded_by: "u-rocan",
  uploaded_at: "2026-10-27T08:00:00+07:00",
  processed_at: status === "active" || status === "inactive" ? "2026-10-27T08:05:00+07:00" : null,
  ...extra,
});

export const seedReferenceDocuments: ReferenceDocument[] = [
  doc("rd-rpjmn", "RPJMN contoh 2025-2029", "rpjmn", "active", { effective_year: 2025 }),
  doc("rd-renstra", "Renstra contoh 2025-2029", "renstra", "active", { effective_year: 2025 }),
  doc("rd-sbm", "Standar Biaya Masukan contoh 2026", "sbm", "active", { number: "PMK 32/2025" }),
  doc("rd-bas", "Bagan Akun Standar contoh", "bas", "inactive", { validity: "historis" }),
  doc("rd-gagal", "Matriks Renstra contoh (XLSX)", "renstra", "failed", {
    filename: "matriks-renstra.xlsx",
    error_message: "Format berkas belum didukung layanan ekstraksi.",
  }),
];

/** Kutipan contoh untuk hasil AI simulasi. */
export const sampleQuotes = {
  tor: [
    "Kegiatan ini bertujuan meningkatkan kualitas layanan informasi publik di daerah.",
    "Penerima manfaat kegiatan adalah badan publik di 34 provinsi.",
    "Kegiatan dilaksanakan pada triwulan II sampai triwulan IV.",
  ],
  rab: ["Belanja jasa profesi: 5 orang x 4 kali x Rp1.700.000", "Belanja perjalanan dinas paket meeting dalam kota"],
  acuan: ["Meningkatkan keterbukaan informasi publik sebagai bagian dari prioritas nasional."],
};

/** PDF satu halaman untuk pratinjau demo. */
export const SAMPLE_PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 60>>stream
BT /F1 18 Tf 72 760 Td (Dokumen contoh untuk demo) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF`;
