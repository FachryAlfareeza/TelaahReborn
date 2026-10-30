import { z } from "zod";

/** Semua objek ketat: bidang tak dikenal ditolak dengan pesan jelas. */
const strictObject = <T extends z.ZodRawShape>(shape: T) =>
  z.strictObject(shape, {
    error: (issue) =>
      issue.code === "unrecognized_keys"
        ? `Bidang tidak dikenal: ${issue.keys.join(", ")}`
        : undefined,
  });

/** Kode selalu string agar nol di depan tidak hilang. */
const code = z.string({ error: "Kode harus berupa teks" }).min(1, "Kode tidak boleh kosong");
const id = z.string().min(1, "ID tidak boleh kosong");
const isoDate = z.iso.datetime({ offset: true }).or(z.iso.date());

export const roleSchema = z.enum(["SATKER", "ROCAN", "SUPER_ADMIN"]);

export const submissionStatusSchema = z.enum([
  "PROCESSING",
  "AWAITING_REVIEW",
  "ACCEPTED",
  "REJECTED",
  "PROCESSING_FAILED",
]);

export const documentTypeSchema = z.enum(["TOR", "RAB", "ACUAN"]);

export const documentSchema = strictObject({
  id,
  type: z.enum(["TOR", "RAB"]),
  fileName: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  pageCount: z.number().int().positive().nullable(),
  previewUrl: z.string().nullable(),
});

export const programContextSchema = strictObject({
  fiscalYear: z.string().nullable(),
  ministry: z.string().nullable(),
  unit: z.string().nullable(),
  programCode: code.nullable(),
  programName: z.string().nullable(),
  activityCode: code.nullable(),
  activityName: z.string().nullable(),
  kroCode: code.nullable(),
  kroName: z.string().nullable(),
  roCode: code.nullable(),
  roName: z.string().nullable(),
});

export const roSchema = strictObject({
  code,
  description: z.string(),
  active: z.boolean(),
});

export const submissionSchema = strictObject({
  id,
  status: submissionStatusSchema,
  roCode: code,
  satkerId: id,
  satkerName: z.string(),
  submittedAt: isoDate,
  documents: z.array(documentSchema),
  context: programContextSchema,
  previousSubmissionId: id.nullable(),
});

export const evidenceSchema = strictObject({
  id,
  quote: z
    .string()
    .refine((s) => s.trim().split(/\s+/).filter(Boolean).length <= 40, "Kutipan maksimal 40 kata"),
  documentType: documentTypeSchema,
  page: z.number().int().positive().nullable(),
});

export const technicalStatusSchema = z.enum([
  "NORMAL",
  "WRONG_MODEL",
  "READ_FAILED",
  "VERIFICATION_FAILED",
]);

export const screening1AnswerSchema = z.enum(["PASS", "NOT_PASS", "INSUFFICIENT_EVIDENCE"]);
export const screening2AnswerSchema = z.enum(["MATCH", "NO_MATCH", "INSUFFICIENT_EVIDENCE"]);

export type Screening1Node = {
  code: string;
  title: string;
  answer: z.infer<typeof screening1AnswerSchema> | null;
  recommendation: string | null;
  evidence: z.infer<typeof evidenceSchema>[];
  technicalStatus: z.infer<typeof technicalStatusSchema>;
  children: Screening1Node[];
};

export const screening1NodeSchema: z.ZodType<Screening1Node> = z.lazy(() =>
  strictObject({
    code,
    title: z.string(),
    answer: screening1AnswerSchema.nullable(),
    recommendation: z.string().nullable(),
    evidence: z.array(evidenceSchema),
    technicalStatus: technicalStatusSchema,
    children: z.array(screening1NodeSchema),
  }),
);

export const screening1ResultSchema = strictObject({
  submissionId: id,
  checklistVersion: z.string(),
  model: z.string().nullable(),
  items: z.array(screening1NodeSchema),
});

export const screening2QuestionSchema = strictObject({
  code: z.string().regex(/^C(0[1-9]|1[0-2])$/, "Kode pertanyaan harus C01 sampai C12"),
  text: z.string(),
  answer: screening2AnswerSchema,
  technicalStatus: technicalStatusSchema,
  evidence: z.array(evidenceSchema),
});

export const screening2ResultSchema = strictObject({
  submissionId: id,
  /** 0 = perlu pemeriksaan manual. */
  category: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  decidingQuestion: z.string().nullable(),
  questions: z.array(screening2QuestionSchema),
});

export const decisionSchema = strictObject({
  submissionId: id,
  decision: z.enum(["ACCEPTED", "REJECTED"]),
  note: z.string(),
  decidedBy: z.string(),
  decidedAt: isoDate,
});

export const checklistItemSchema = strictObject({
  code,
  title: z.string(),
  parentCode: code.nullable(),
  order: z.number().int().nonnegative(),
  requiredDocuments: z.array(documentTypeSchema),
  /** Bagian dokumen yang dicari untuk butir ini (mis. pemetaan 5W+1H). Data yang bisa diedit. */
  source: z.string().nullable().default(null),
  active: z.boolean(),
});

export const checklistSchema = strictObject({
  version: z.string(),
  active: z.boolean(),
  items: z.array(checklistItemSchema),
});

export const priorityCategorySchema = strictObject({
  category: z.number().int().min(0).max(4),
  name: z.string(),
  questionCodes: z.array(z.string()),
});

export const documentCategorySchema = strictObject({
  code,
  name: z.string(),
});

export const referenceDocumentSchema = strictObject({
  id,
  categoryCode: code,
  title: z.string(),
  fileName: z.string(),
  active: z.boolean(),
  addedAt: isoDate,
});

export const userSchema = strictObject({
  id,
  name: z.string().min(1),
  email: z.string().min(1),
  role: roleSchema,
  active: z.boolean(),
  satkerName: z.string().nullable(),
});
