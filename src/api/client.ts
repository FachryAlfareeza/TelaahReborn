import type {
  Category,
  ChecklistItem,
  ChecklistVersion,
  CurationExport,
  CurationSample,
  CurationSampleDetail,
  CurationStatus,
  DatasetIssue,
  Decision,
  DocumentKind,
  Evidence,
  FinalResult,
  FiscalYear,
  HistoryEntry,
  InspectionType,
  ItemStatus,
  MasterRoDataset,
  MasterRoRow,
  Notification,
  Progress,
  ReferenceDocType,
  ReferenceDocument,
  ReferenceDocumentStatus,
  ReferenceTableRow,
  ReferenceTableType,
  ReferenceTableVersion,
  ReviewRequest,
  ReviewRequestStatus,
  ReviewResult,
  Role,
  TableExtraction,
  UnitPair,
  User,
  Validity,
  CodeLabel,
} from "../types";

export type ApiErrorCode =
  | "NETWORK"
  | "INVALID_RESPONSE"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "CONFLICT"
  | "TOO_LARGE"
  | "UNAVAILABLE"
  | "SERVER";

/** Satu-satunya jenis galat yang keluar dari klien API. Pesan sudah dalam Bahasa Indonesia. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

// --- Masukan, mengikuti kontrak §3 -------------------------------------------

export type LoginInput = { nip: string; password: string };

export type CreateUserInput = {
  nip: string;
  nama: string;
  password: string;
  role: Role;
  email?: string;
  /** Wajib untuk satker; pasangan harus ada di `GET /master-data/units`. */
  unit_eselon1_code?: string;
  unit_eselon2_code?: string;
};
export type UpdateUserInput = Partial<CreateUserInput> & { is_active?: boolean };

export type CascadeQuery = {
  fiscal_year: number;
  /** Hanya untuk rocan/super_admin. Satker selalu difilter unitnya oleh server. */
  unit_eselon2_code?: string;
  program_code?: string;
  activity_code?: string;
  kro_code?: string;
};

export type CreateReviewRequestInput = {
  fiscal_year: number;
  master_ro_row_id: string;
  title: string;
  description: string;
  proposal_category: Category;
  tor_file: File;
  rab_file: File;
};

export type ResubmitInput = {
  tor_file: File;
  rab_file: File;
  title?: string;
  description?: string;
  proposal_category?: Category;
};

export type ReviewRequestFilters = {
  status?: ReviewRequestStatus;
  fiscal_year?: number;
  program_code?: string;
  activity_code?: string;
  kro_code?: string;
  ro_code?: string;
  proposal_category?: Category;
  /** Tanggal ISO (YYYY-MM-DD) atau RFC 3339. */
  submitted_from?: string;
  submitted_to?: string;
};

export type ResultItemEdit = {
  item_id: string;
  status?: ItemStatus;
  explanation?: string;
  evidence?: Evidence[];
  /** Wajib bila status berubah. */
  change_reason?: string;
};

export type UpdateFinalInput = {
  expected_revision: number;
  items: ResultItemEdit[];
  final_category?: Category;
};

export type FinalizeInput = { decision: Decision; final_category: Category; note?: string };

export type ChecklistVersionInput = {
  nama_versi: string;
  screening_1_items: ChecklistItem[];
  screening_2_items: ChecklistItem[];
  activate?: boolean;
};
export type ChecklistItemsInput = Pick<ChecklistVersionInput, "screening_1_items" | "screening_2_items">;

export type ReferenceDocumentFilters = {
  status?: ReferenceDocumentStatus;
  doc_type?: ReferenceDocType;
  validity?: Validity;
};

export type UploadReferenceDocumentInput = {
  file: File;
  title: string;
  doc_type: ReferenceDocType;
  validity: Validity;
  number?: string;
  effective_year?: number;
};

export type StartTableExtractionInput = {
  table_type: ReferenceTableType;
  fiscal_year: number;
  file?: File;
  reference_document_id?: string;
  page_from?: number;
  page_to?: number;
};

export type ImportReferenceTableInput = {
  file: File;
  table_type: ReferenceTableType;
  fiscal_year: number;
  source_document_id: string;
  extraction_id?: string;
  verification_note: string;
};

export type CurationFilters = {
  status?: CurationStatus;
  inspection_type?: InspectionType;
  checklist_item_id?: string;
};

export type CreateCurationExportInput = {
  inspection_types?: InspectionType[];
  approved_from?: string;
  approved_to?: string;
};

/** Antarmuka tetap. Semua akses data lewat sini; adapter real dan mock memenuhinya. */
export interface ApiClient {
  /** Sumber data, dipakai untuk penanda demo. */
  readonly mode: "mock" | "real";

  // §3.1 Autentikasi
  login(input: LoginInput): Promise<User>;
  logout(): Promise<void>;
  /** Pengguna yang sedang masuk (`GET /auth/me`), atau null bila belum masuk. */
  getSession(): Promise<User | null>;

  // §3.2 Akun (super_admin)
  listUsers(role?: Role): Promise<User[]>;
  createUser(input: CreateUserInput): Promise<User>;
  updateUser(id: string, input: UpdateUserInput): Promise<User>;
  /** Soft-deactivate dan cabut sesi. */
  deactivateUser(id: string): Promise<void>;

  // §3.3 Master RO
  listFiscalYears(): Promise<FiscalYear[]>;
  listUnits(fiscalYear: number): Promise<UnitPair[]>;
  listPrograms(query: CascadeQuery): Promise<CodeLabel[]>;
  listActivities(query: CascadeQuery & { program_code: string }): Promise<CodeLabel[]>;
  listKros(query: CascadeQuery & { program_code: string; activity_code: string }): Promise<CodeLabel[]>;
  listRos(
    query: CascadeQuery & { program_code: string; activity_code: string; kro_code: string },
  ): Promise<MasterRoRow[]>;
  listDatasets(fiscalYear?: number): Promise<MasterRoDataset[]>;
  importDataset(file: File, fiscalYear: number): Promise<MasterRoDataset>;
  listDatasetIssues(datasetId: string): Promise<DatasetIssue[]>;
  activateDataset(datasetId: string): Promise<MasterRoDataset>;

  // §3.4 Pengajuan
  listReviewRequests(filters?: ReviewRequestFilters): Promise<ReviewRequest[]>;
  getReviewRequest(id: string): Promise<ReviewRequest>;
  createReviewRequest(input: CreateReviewRequestInput): Promise<ReviewRequest>;
  getDocument(id: string, kind: DocumentKind): Promise<Blob>;
  listVersions(id: string): Promise<ReviewRequest[]>;
  resubmit(id: string, input: ResubmitInput): Promise<ReviewRequest>;

  // §3.5 Pipeline
  retryReview(id: string): Promise<void>;
  getProgress(id: string): Promise<Progress>;

  // §3.6 Hasil
  /** Tampilan ROCAN (hasil AI + hasil final). */
  getReviewResult(id: string): Promise<ReviewResult>;
  /** Tampilan Satker, hanya setelah finalisasi; sebelum itu NOT_FOUND. */
  getFinalResult(id: string): Promise<FinalResult>;
  updateFinalResult(id: string, input: UpdateFinalInput): Promise<ReviewResult>;
  getResultHistory(id: string): Promise<HistoryEntry[]>;
  finalize(id: string, input: FinalizeInput): Promise<ReviewResult>;

  // §3.7 Checklist (rocan)
  listChecklists(): Promise<ChecklistVersion[]>;
  getChecklist(id: string): Promise<ChecklistVersion>;
  createChecklist(input: ChecklistVersionInput): Promise<ChecklistVersion>;
  updateChecklistItems(id: string, input: ChecklistItemsInput): Promise<ChecklistVersion>;
  activateChecklist(id: string): Promise<ChecklistVersion>;

  // §3.8 Dokumen acuan (rocan)
  listReferenceDocuments(filters?: ReferenceDocumentFilters): Promise<ReferenceDocument[]>;
  uploadReferenceDocument(input: UploadReferenceDocumentInput): Promise<ReferenceDocument>;
  reingestReferenceDocument(id: string): Promise<void>;
  deactivateReferenceDocument(id: string): Promise<ReferenceDocument>;
  activateReferenceDocument(id: string): Promise<ReferenceDocument>;

  // §3.9 Tabel acuan (rocan)
  startTableExtraction(input: StartTableExtractionInput): Promise<TableExtraction>;
  getTableExtraction(id: string): Promise<TableExtraction>;
  downloadTableCandidate(id: string): Promise<Blob>;
  importReferenceTable(input: ImportReferenceTableInput): Promise<ReferenceTableVersion>;
  listReferenceTables(filters?: { table_type?: ReferenceTableType; fiscal_year?: number }): Promise<
    ReferenceTableVersion[]
  >;
  listReferenceTableRows(id: string, search?: string): Promise<ReferenceTableRow[]>;
  activateReferenceTable(id: string): Promise<ReferenceTableVersion>;

  // §3.10 Kurasi (rocan)
  listCurationSamples(filters?: CurationFilters): Promise<CurationSample[]>;
  getCurationSample(id: string): Promise<CurationSampleDetail>;
  reviewCurationSample(id: string, input: { status: "approved" | "rejected"; note?: string }): Promise<void>;
  createCurationExport(input: CreateCurationExportInput): Promise<CurationExport>;
  listCurationExports(): Promise<CurationExport[]>;
  downloadCurationExport(id: string): Promise<Blob>;

  // §3.11 Notifikasi
  listNotifications(): Promise<Notification[]>;
  getUnreadCount(): Promise<number>;
  markNotificationRead(id: string): Promise<void>;
}
