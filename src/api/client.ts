import type {
  Checklist,
  ChecklistItem,
  Decision,
  DocumentCategory,
  PriorityCategory,
  ReferenceDocument,
  Role,
  Ro,
  Screening1Result,
  Screening2Result,
  Submission,
  User,
} from "../types";

export type ApiErrorCode =
  | "NETWORK"
  | "INVALID_RESPONSE"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "CONFLICT"
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

export type LoginInput = { email: string; password: string };
export type RegisterInput = { name: string; email: string; password: string; satkerName: string };
export type ChangePasswordInput = { currentPassword: string; newPassword: string };
export type CreateSubmissionInput = {
  roCode: string;
  tor: File;
  rab: File;
  /** Diisi saat Satker mengajukan ulang pengajuan yang ditolak. */
  previousSubmissionId?: string;
};
export type AddReferenceDocumentInput = {
  categoryCode: string;
  title: string;
  file: File;
};
export type SaveDecisionInput = {
  submissionId: string;
  decision: "ACCEPTED" | "REJECTED";
  note: string;
};

export type RoInput = { code: string; description: string };
export type RoPatch = { description?: string; active?: boolean };
export type ChecklistItemPatch = Partial<Omit<ChecklistItem, "code">>;
export type PriorityCategoryPatch = { name?: string; questionCodes?: string[] };
export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: Role;
  satkerName: string | null;
};
export type UserPatch = { name?: string; role?: Role; active?: boolean };

/** Antarmuka tetap. Semua akses data lewat sini; adapter real dan mock memenuhinya. */
export interface ApiClient {
  /** Sumber data, dipakai untuk penanda demo. */
  readonly mode: "mock" | "real";

  // Sesi
  login(input: LoginInput): Promise<User>;
  register(input: RegisterInput): Promise<User>;
  logout(): Promise<void>;
  /** Pengguna yang sedang masuk, atau null bila belum masuk. */
  getSession(): Promise<User | null>;
  changePassword(input: ChangePasswordInput): Promise<void>;

  // Data
  listRos(): Promise<Ro[]>;
  listSubmissions(): Promise<Submission[]>;
  getSubmission(id: string): Promise<Submission>;
  createSubmission(input: CreateSubmissionInput): Promise<Submission>;

  /** Kirim ulang pemrosesan yang bermasalah (ROCAN dan Super Admin). */
  resubmitProcessing(submissionId: string): Promise<Submission>;
  // Hasil reviu (hanya ROCAN dan Super Admin)
  getScreening1(submissionId: string): Promise<Screening1Result>;
  getScreening2(submissionId: string): Promise<Screening2Result>;

  // Dokumen acuan (ROCAN dan Super Admin)
  listDocumentCategories(): Promise<DocumentCategory[]>;
  listReferenceDocuments(): Promise<ReferenceDocument[]>;
  addReferenceDocument(input: AddReferenceDocumentInput): Promise<ReferenceDocument>;
  setReferenceDocumentActive(id: string, active: boolean): Promise<ReferenceDocument>;
  deleteReferenceDocument(id: string): Promise<void>;

  // Pengelolaan (hanya Super Admin)
  createRo(input: RoInput): Promise<Ro>;
  updateRo(code: string, patch: RoPatch): Promise<Ro>;
  deleteRo(code: string): Promise<void>;

  getChecklist(): Promise<Checklist>;
  createChecklistItem(item: ChecklistItem): Promise<Checklist>;
  updateChecklistItem(code: string, patch: ChecklistItemPatch): Promise<Checklist>;
  deleteChecklistItem(code: string): Promise<Checklist>;
  /** Pecah satu butir menjadi beberapa butir anak baru. */
  splitChecklistItem(code: string, titles: string[]): Promise<Checklist>;

  listPriorityCategories(): Promise<PriorityCategory[]>;
  updatePriorityCategory(category: number, patch: PriorityCategoryPatch): Promise<PriorityCategory[]>;
  createDocumentCategory(input: DocumentCategory): Promise<DocumentCategory>;
  updateDocumentCategory(code: string, name: string): Promise<DocumentCategory>;
  deleteDocumentCategory(code: string): Promise<void>;

  listUsers(): Promise<User[]>;
  createUser(input: CreateUserInput): Promise<User>;
  updateUser(id: string, patch: UserPatch): Promise<User>;
  resetUserPassword(id: string, newPassword: string): Promise<void>;

  // Keputusan
  getDecision(submissionId: string): Promise<Decision | null>;
  saveDecision(input: SaveDecisionInput): Promise<Decision>;
}
