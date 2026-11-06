import { z } from "zod";

/**
 * Skema respons mengikuti kontrak API backend (`tor-rab-ai-reviewer/docs/api/contract.md`, v2.1).
 * Nama bidang sama persis dengan kontrak (snake_case) agar tidak ada lapisan penerjemah.
 * Objek ketat: bidang tak dikenal ditolak dengan pesan jelas.
 */
const strictObject = <T extends z.ZodRawShape>(shape: T) =>
  z.strictObject(shape, {
    error: (issue) =>
      issue.code === "unrecognized_keys"
        ? `Bidang tidak dikenal: ${issue.keys.join(", ")}`
        : undefined,
  });

/** Kode anggaran selalu string agar nol di depan tidak hilang (kontrak §1). */
const code = z.string({ error: "Kode harus berupa teks" }).min(1, "Kode tidak boleh kosong");
const id = z.string().min(1, "ID tidak boleh kosong");
/** Waktu RFC 3339 dengan zona waktu (kontrak §1). */
const time = z.iso.datetime({ offset: true });
const nullable = <T extends z.ZodType>(schema: T) => schema.nullable();
/** Bidang yang boleh tidak dikirim server; dianggap null. */
const optionalNull = <T extends z.ZodType>(schema: T) => schema.nullable().optional().transform((v) => v ?? null);

// --- Kosakata (kontrak §2) ----------------------------------------------------

export const roleSchema = z.enum(["super_admin", "rocan", "satker"]);

export const reviewRequestStatusSchema = z.enum([
  "menunggu_review",
  "dalam_proses",
  "siap_diverifikasi",
  "selesai_revisi",
  "selesai_disetujui",
  "gagal",
]);

export const ITEM_STATUSES = [
  "Sesuai",
  "Tidak Sesuai atau perlu revisi",
  "Terjadi Kesalahan pada proses",
] as const;
export const itemStatusSchema = z.enum(ITEM_STATUSES);

export const categorySchema = z.enum(["K1", "K2", "K3", "K4"]);
export const stageStatusSchema = z.enum(["menunggu", "berjalan", "selesai", "gagal", "dilewati"]);
export const priorityValueSchema = z.enum(["Prioritas Nasional", "Bukan Prioritas Nasional"]);
export const pipelineStageSchema = z.enum([
  "extraction",
  "format_check",
  "sectioning",
  "reference_table_check",
  "retrieval",
  "substance_assessment",
  "categorization",
  "aggregation",
]);
export const extractionPathSchema = z.enum(["team1", "docling_fallback"]);
export const inspectionTypeSchema = z.enum([
  "format_completeness",
  "substance",
  "tor_rab_alignment",
  "reference_table",
  "categorization",
]);
export const checkMethodSchema = z.enum(["rule", "lookup", "llm_rag", "llm", "manual"]);
export const checkExecutorSchema = z.enum(["team1_lapis_a", "app"]);
export const referenceDocumentStatusSchema = z.enum(["pending", "processing", "active", "failed", "inactive"]);
export const referenceDocTypeSchema = z.enum([
  "rpjmn",
  "renstra",
  "rkp",
  "sbm",
  "bas",
  "kepmen",
  "pmk",
  "perpres",
  "pkpn",
  "pn_sbpi",
  "lainnya",
]);
export const validitySchema = z.enum(["berlaku", "draf", "historis"]);
export const referenceTableTypeSchema = z.enum(["bas", "sbm"]);
export const versionStatusSchema = z.enum(["draft", "active", "superseded"]);
export const curationStatusSchema = z.enum(["pending", "approved", "rejected"]);
export const decisionValueSchema = z.enum(["selesai_revisi", "selesai_disetujui"]);
export const datasetIssueTypeSchema = z.enum([
  "missing_value",
  "duplicate_combination",
  "inconsistent_metadata",
  "unparseable_code",
]);

// --- Autentikasi dan akun (§3.1, §3.2) ---------------------------------------

export const codeLabelSchema = strictObject({ code, name: z.string() });

export const tokenResponseSchema = strictObject({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  token_type: z.literal("bearer"),
  expires_in: z.number().int().positive(),
});

export const userSchema = strictObject({
  id,
  nip: z.string().min(1),
  nama: z.string().min(1),
  email: nullable(z.string()),
  role: roleSchema,
  is_active: z.boolean(),
  unit_eselon1: nullable(codeLabelSchema),
  unit_eselon2: nullable(codeLabelSchema),
  created_at: time,
  updated_at: time,
});

// --- Master RO (§3.3) ---------------------------------------------------------

export const fiscalYearSchema = strictObject({
  fiscal_year: z.number().int(),
  dataset_id: id,
  activated_at: nullable(time),
});

export const unitPairSchema = strictObject({
  unit_eselon1: codeLabelSchema,
  unit_eselon2: codeLabelSchema,
});

export const masterRoRowSchema = strictObject({
  id,
  dataset_id: id,
  fiscal_year: z.number().int(),
  program: codeLabelSchema,
  activity: codeLabelSchema,
  kro: codeLabelSchema,
  ro: codeLabelSchema,
  unit_eselon1: codeLabelSchema,
  unit_eselon2: codeLabelSchema,
  priority: priorityValueSchema,
});

export const masterRoDatasetSchema = strictObject({
  id,
  fiscal_year: z.number().int(),
  source_filename: z.string(),
  sha256: z.string(),
  status: versionStatusSchema,
  row_count: z.number().int().nonnegative(),
  valid_row_count: z.number().int().nonnegative(),
  issue_count: z.number().int().nonnegative(),
  imported_by: id,
  imported_at: time,
  activated_at: nullable(time),
});

export const datasetIssueSchema = strictObject({
  row_number: z.number().int().positive(),
  issue: datasetIssueTypeSchema,
  column: nullable(z.string()),
  raw: z.record(z.string(), z.unknown()),
});

// --- Pengajuan (§3.4) ---------------------------------------------------------

export const storedDocumentSchema = strictObject({
  filename: z.string().min(1),
  size_bytes: z.number().int().nonnegative(),
  sha256: z.string(),
});

export const reviewRequestSchema = strictObject({
  id,
  owner: strictObject({ id, nama: z.string() }),
  title: z.string(),
  description: z.string(),
  fiscal_year: z.number().int(),
  master_ro_row_id: id,
  program: codeLabelSchema,
  activity: codeLabelSchema,
  kro: codeLabelSchema,
  ro: codeLabelSchema,
  unit_eselon1: codeLabelSchema,
  unit_eselon2: codeLabelSchema,
  priority: priorityValueSchema,
  proposal_category: categorySchema,
  documents: strictObject({ tor: storedDocumentSchema, rab: storedDocumentSchema }),
  status: reviewRequestStatusSchema,
  version_number: z.number().int().positive(),
  parent_request_id: nullable(id),
  resubmission_count: z.number().int().nonnegative(),
  extraction_path: nullable(extractionPathSchema),
  submitted_at: time,
  updated_at: time,
});

// --- Pipeline dan progres (§3.5) ---------------------------------------------

export const stageSchema = strictObject({
  stage: pipelineStageSchema,
  status: stageStatusSchema,
  started_at: nullable(time),
  finished_at: nullable(time),
  message: nullable(z.string()),
});

export const progressSchema = strictObject({
  review_request_id: id,
  run_id: nullable(id),
  request_status: reviewRequestStatusSchema,
  extraction_path: nullable(extractionPathSchema),
  stages: z.array(stageSchema),
  started_at: nullable(time),
  updated_at: time,
});

export const retryReviewSchema = strictObject({
  review_request_id: id,
  run_id: id,
  status: z.literal("dalam_proses"),
  started_at: time,
});

// --- Hasil review (§3.6) -----------------------------------------------------

export const evidenceSchema = strictObject({
  source: z.enum(["tor", "rab", "reference_document", "reference_table"]),
  document_id: optionalNull(id),
  page: optionalNull(z.number().int().positive()),
  block_id: optionalNull(z.string()),
  table_id: optionalNull(z.string()),
  reference_table_row_id: optionalNull(id),
  quote: optionalNull(z.string()),
});

export const calculationSchema = strictObject({
  formula: z.string(),
  inputs: z.array(strictObject({ label: z.string(), value: z.number(), source: z.string() })),
  result: z.number(),
});

export const resultItemSchema = strictObject({
  item_id: id,
  display_code: optionalNull(z.string()),
  section: optionalNull(z.string()),
  inspection_type: inspectionTypeSchema,
  method: optionalNull(checkMethodSchema),
  executor: optionalNull(checkExecutorSchema),
  status: itemStatusSchema,
  explanation: z.string(),
  evidence: z.array(evidenceSchema),
  calculation: optionalNull(calculationSchema),
  error_reason: optionalNull(z.string()),
});

export const screening2Schema = strictObject({
  claimed_category: categorySchema,
  recommended_category: nullable(categorySchema),
  status: itemStatusSchema,
  explanation: z.string(),
  evidence: z.array(evidenceSchema),
});

export const hasilFinalSchema = strictObject({
  items: z.array(resultItemSchema),
  final_category: nullable(categorySchema),
  revision: z.number().int().nonnegative(),
  updated_by: nullable(id),
  updated_at: nullable(time),
});

export const provenanceSchema = strictObject({
  team1_job_id: optionalNull(z.string()),
  extraction_schema_version: optionalNull(z.string()),
  lapis_a_ruleset_version: optionalNull(z.string()),
  reference_table_versions: z.array(id).optional().transform((v) => v ?? []),
  llm_model: optionalNull(z.string()),
  embedding_model: optionalNull(z.string()),
  prompt_version: optionalNull(z.string()),
});

/** Tampilan ROCAN: hasil AI (tidak berubah) dan hasil final (diedit ROCAN). */
export const reviewResultSchema = strictObject({
  review_request_id: id,
  run_id: id,
  checklist_version_id: id,
  extraction_path: nullable(extractionPathSchema),
  provenance: nullable(provenanceSchema),
  hasil_ai: nullable(
    strictObject({
      items: z.array(resultItemSchema),
      screening_2: screening2Schema,
      generated_at: time,
    }),
  ),
  hasil_final: hasilFinalSchema,
  decision: nullable(decisionValueSchema),
  finalized_at: nullable(time),
});

/** Tampilan Satker, hanya setelah finalisasi: tanpa hasil AI dan provenance. */
export const finalResultSchema = strictObject({
  review_request_id: id,
  hasil_final: hasilFinalSchema,
  decision: decisionValueSchema,
  finalized_at: time,
});

export const historyEntrySchema = strictObject({
  revision: z.number().int().nonnegative(),
  item_id: nullable(id),
  field: z.string(),
  old: z.unknown(),
  new: z.unknown(),
  change_reason: nullable(z.string()),
  changed_by: id,
  changed_at: time,
});

// --- Checklist (§3.7) --------------------------------------------------------

export const checklistItemSchema = strictObject({
  item_id: optionalNull(id),
  display_code: optionalNull(z.string()),
  section: optionalNull(z.string()),
  inspection_type: inspectionTypeSchema,
  method: optionalNull(checkMethodSchema),
  executor: optionalNull(checkExecutorSchema),
  criterion: z.string().min(1),
  instructions: optionalNull(z.string()),
  pass_criteria: optionalNull(z.string()),
  source: optionalNull(z.string()),
  parent_item_id: optionalNull(id),
  evidence_requirements: z.record(z.string(), z.unknown()).optional().transform((v) => v ?? {}),
});

export const checklistVersionSchema = strictObject({
  id,
  nama_versi: z.string(),
  screening_1_items: z.array(checklistItemSchema).nullable().transform((v) => v ?? []),
  screening_2_items: z.array(checklistItemSchema).nullable().transform((v) => v ?? []),
  is_active: z.boolean(),
  created_by: id,
  created_at: time,
});

// --- Dokumen acuan (§3.8) ----------------------------------------------------

export const referenceDocumentSchema = strictObject({
  id,
  title: z.string(),
  doc_type: referenceDocTypeSchema,
  number: nullable(z.string()),
  effective_year: nullable(z.number().int()),
  validity: validitySchema,
  filename: z.string(),
  sha256: z.string(),
  status: referenceDocumentStatusSchema,
  chunks_count: z.number().int().nonnegative(),
  error_message: nullable(z.string()),
  uploaded_by: id,
  uploaded_at: time,
  processed_at: nullable(time),
});

// --- Tabel acuan BAS/SBM (§3.9) -----------------------------------------------

export const tableExtractionSchema = strictObject({
  extraction_id: id,
  status: z.enum(["pending", "processing", "succeeded", "failed"]),
  tables_found: z.number().int().nonnegative().optional().transform((v) => v ?? 0),
  error_message: optionalNull(z.string()),
});

/**
 * Bentuk `ReferenceTableVersion` belum dirinci kontrak §3.9 (hanya disebut namanya).
 * Bidang di bawah adalah usulan frontend; dicatat di BACKEND-APPENDIX §4.
 */
export const referenceTableVersionSchema = strictObject({
  id,
  table_type: referenceTableTypeSchema,
  fiscal_year: z.number().int(),
  source_document_id: id,
  extraction_id: nullable(id),
  status: versionStatusSchema,
  row_count: z.number().int().nonnegative(),
  error_count: z.number().int().nonnegative(),
  verification_note: z.string(),
  imported_at: time,
  activated_at: nullable(time),
});

export const referenceTableRowSchema = strictObject({
  id,
  source_page: z.number().int().positive(),
  values: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
});

// --- Kurasi (§3.10) ----------------------------------------------------------

export const curationSampleSchema = strictObject({
  id,
  review_request_id: id,
  item_id: id,
  display_code: nullable(z.string()),
  inspection_type: inspectionTypeSchema,
  hasil_ai_status: itemStatusSchema,
  hasil_final_status: itemStatusSchema,
  changed_by_rocan: z.boolean(),
  status: curationStatusSchema,
});

/** Rincian sampel. Kontrak hanya menyebut isinya; bentuk input dibiarkan longgar. */
export const curationSampleDetailSchema = curationSampleSchema.extend({
  input: z.record(z.string(), z.unknown()),
  hasil_ai_item: resultItemSchema,
  hasil_final_item: resultItemSchema,
  note: optionalNull(z.string()),
});

export const curationExportSchema = strictObject({
  export_id: id,
  status: z.enum(["pending", "processing", "succeeded", "failed"]),
  sample_count: z.number().int().nonnegative().optional().transform((v) => v ?? 0),
  sha256: optionalNull(z.string()),
  created_at: optionalNull(time),
});

// --- Notifikasi (§3.11) ------------------------------------------------------

export const notificationSchema = strictObject({
  id,
  judul: z.string(),
  pesan: z.string(),
  related_review_id: nullable(id),
  is_read: z.boolean(),
  created_at: time,
});

export const unreadCountSchema = strictObject({ count: z.number().int().nonnegative() });
