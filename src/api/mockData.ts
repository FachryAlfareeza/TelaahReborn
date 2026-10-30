import type {
  Checklist,
  DocumentCategory,
  PriorityCategory,
  ReferenceDocument,
  Ro,
  Screening1Result,
  Screening2Result,
} from "../types";

/** Data contoh untuk demo. Seluruhnya fiktif, bukan dokumen asli. */

export const sampleDocumentCategories: DocumentCategory[] = [
  { code: "RPJMN", name: "RPJMN" },
  { code: "RENSTRA", name: "Renstra" },
  { code: "PMK-SBM", name: "PMK/SBM" },
];

export const sampleReferenceDocuments: ReferenceDocument[] = [
  {
    id: "r-contoh-1",
    categoryCode: "RPJMN",
    title: "Contoh: Dokumen RPJMN (fiktif)",
    fileName: "contoh-rpjmn.pdf",
    active: true,
    addedAt: "2025-01-10T03:00:00.000Z",
  },
  {
    id: "r-contoh-2",
    categoryCode: "PMK-SBM",
    title: "Contoh: Standar biaya (fiktif)",
    fileName: "contoh-sbm.pdf",
    active: false,
    addedAt: "2025-02-15T03:00:00.000Z",
  },
];

export const sampleRos: Ro[] = [
  { code: "001", description: "Contoh: Dokumen perencanaan program (fiktif)", active: true },
  { code: "002", description: "Contoh: Layanan dukungan manajemen (fiktif)", active: true },
  { code: "003", description: "Contoh: Rincian output nonaktif (fiktif)", active: false },
];

/**
 * Checklist contoh. Pemetaan 5W+1H disimpan sebagai data (kolom `source`) agar bisa diedit
 * Super Admin, bukan ditulis permanen di komponen.
 */
export const sampleChecklist: Checklist = {
  version: "contoh-1",
  active: true,
  items: [
    { code: "II.A.1", title: "Selaras dengan prioritas nasional, Renstra, dan arahan", parentCode: null, order: 1, requiredDocuments: ["TOR", "ACUAN"], source: null, active: true },
    { code: "II.C.1", title: "Latar belakang dan rincian output dijelaskan lengkap", parentCode: null, order: 2, requiredDocuments: ["TOR"], source: null, active: true },
    { code: "II.C.1.1", title: "Apa", parentCode: "II.C.1", order: 1, requiredDocuments: ["TOR"], source: "Latar belakang: gambaran umum", active: true },
    { code: "II.C.1.2", title: "Mengapa", parentCode: "II.C.1", order: 2, requiredDocuments: ["TOR"], source: "Latar belakang: dasar hukum dan gambaran umum", active: true },
    { code: "II.C.1.3", title: "Siapa", parentCode: "II.C.1", order: 3, requiredDocuments: ["TOR"], source: "Penerima manfaat", active: true },
    { code: "II.C.1.4", title: "Kapan", parentCode: "II.C.1", order: 4, requiredDocuments: ["TOR"], source: "Tahapan dan waktu pelaksanaan", active: true },
    { code: "II.C.1.5", title: "Di mana", parentCode: "II.C.1", order: 5, requiredDocuments: ["TOR"], source: "Metode pelaksanaan: rincian lokasi", active: true },
    { code: "II.C.1.6", title: "Bagaimana", parentCode: "II.C.1", order: 6, requiredDocuments: ["TOR"], source: "Metode pelaksanaan", active: true },
    { code: "II.C.2", title: "Manajemen risiko dan mitigasi", parentCode: null, order: 3, requiredDocuments: ["TOR", "ACUAN"], source: null, active: true },
    { code: "IV.A.1", title: "RAB menjabarkan kebutuhan TOR", parentCode: null, order: 4, requiredDocuments: ["TOR", "RAB"], source: null, active: true },
    { code: "IV.B.1", title: "Kode akun sesuai standar", parentCode: null, order: 5, requiredDocuments: ["RAB", "ACUAN"], source: null, active: true },
    { code: "IV.C.1", title: "Harga satuan tidak melebihi standar biaya", parentCode: null, order: 6, requiredDocuments: ["RAB", "ACUAN"], source: null, active: true },
  ],
};

export const samplePriorityCategories: PriorityCategory[] = [
  { category: 0, name: "Perlu pemeriksaan manual", questionCodes: [] },
  { category: 1, name: "Prioritas nasional, belanja wajib, layanan publik", questionCodes: ["C01", "C02", "C03"] },
  { category: 2, name: "Operasional, PNBP, multiyears, dukungan manajemen, arahan", questionCodes: ["C04", "C05", "C06", "C07", "C08", "C09", "C10"] },
  { category: 3, name: "Program prioritas kementerian", questionCodes: ["C11"] },
  { category: 4, name: "Tidak terkait langsung", questionCodes: ["C12"] },
];

export type SeedUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "SATKER" | "ROCAN" | "SUPER_ADMIN";
  active: boolean;
  satkerName: string | null;
};

export const seedUsers: SeedUser[] = [
  {
    id: "u-satker",
    name: "Contoh Satker",
    email: "satker@contoh.test",
    password: "demo1234",
    role: "SATKER",
    active: true,
    satkerName: "Satker Contoh",
  },
  {
    id: "u-rocan",
    name: "Contoh ROCAN",
    email: "rocan@contoh.test",
    password: "demo1234",
    role: "ROCAN",
    active: true,
    satkerName: null,
  },
  {
    id: "u-admin",
    name: "Contoh Super Admin",
    email: "admin@contoh.test",
    password: "demo1234",
    role: "SUPER_ADMIN",
    active: true,
    satkerName: null,
  },
];

export function sampleScreening1(submissionId: string): Screening1Result {
  const child = (code: string, title: string, answer: "PASS" | "NOT_PASS" | "INSUFFICIENT_EVIDENCE") => ({
    code,
    title,
    answer,
    recommendation: answer === "NOT_PASS" ? "Lengkapi bagian ini pada TOR." : null,
    evidence:
      answer === "INSUFFICIENT_EVIDENCE"
        ? []
        : [
            {
              id: `ev-${code}`,
              quote: "Kutipan contoh dari dokumen TOR fiktif untuk keperluan demo.",
              documentType: "TOR" as const,
              page: 3,
            },
          ],
    technicalStatus: "NORMAL" as const,
    children: [],
  });
  return {
    submissionId,
    checklistVersion: "contoh-1",
    model: null,
    items: [
      {
        code: "II.C.1",
        title: "Latar belakang dan rincian output dijelaskan lengkap",
        answer: null,
        recommendation: null,
        evidence: [],
        technicalStatus: "NORMAL",
        children: [
          child("II.C.1.1", "Apa", "PASS"),
          child("II.C.1.2", "Mengapa", "PASS"),
          child("II.C.1.3", "Siapa", "NOT_PASS"),
          child("II.C.1.4", "Kapan", "PASS"),
          child("II.C.1.5", "Di mana", "INSUFFICIENT_EVIDENCE"),
          child("II.C.1.6", "Bagaimana", "PASS"),
        ],
      },
      { ...child("IV.A.1", "RAB menjabarkan kebutuhan TOR", "PASS"), evidence: [] },
    ],
  };
}

export function sampleScreening2(submissionId: string): Screening2Result {
  const question = (
    code: string,
    text: string,
    answer: "MATCH" | "NO_MATCH" | "INSUFFICIENT_EVIDENCE",
  ) => ({
    code,
    text,
    answer,
    technicalStatus: "NORMAL" as const,
    evidence:
      answer === "MATCH"
        ? [
            {
              id: `ev-${code}`,
              quote: "Kutipan contoh yang menunjukkan kecocokan (fiktif).",
              documentType: "TOR" as const,
              page: 2,
            },
          ]
        : [],
  });
  return {
    submissionId,
    category: 2,
    decidingQuestion: "C04",
    questions: [
      question("C01", "Contoh pertanyaan prioritas nasional", "NO_MATCH"),
      question("C02", "Contoh pertanyaan belanja wajib", "NO_MATCH"),
      question("C03", "Contoh pertanyaan layanan publik", "INSUFFICIENT_EVIDENCE"),
      question("C04", "Contoh pertanyaan operasional", "MATCH"),
    ],
  };
}
