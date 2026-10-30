import { z } from "zod";
import {
  checklistSchema,
  decisionSchema,
  documentCategorySchema,
  priorityCategorySchema,
  referenceDocumentSchema,
  roSchema,
  screening1ResultSchema,
  screening2ResultSchema,
  submissionSchema,
  userSchema,
} from "./schemas";
import { ApiError, type ApiClient, type ApiErrorCode } from "./client";

function statusToCode(status: number): ApiErrorCode {
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 400 || status === 422) return "INVALID_INPUT";
  return "SERVER";
}

const statusMessages: Record<ApiErrorCode, string> = {
  NETWORK: "Tidak dapat terhubung ke server. Periksa sambungan, lalu coba lagi.",
  INVALID_RESPONSE: "Server mengirim data yang tidak dikenali. Coba lagi nanti.",
  UNAUTHENTICATED: "Sesi berakhir atau data masuk salah. Silakan masuk lagi.",
  FORBIDDEN: "Anda tidak punya izin untuk tindakan ini.",
  NOT_FOUND: "Data tidak ditemukan.",
  INVALID_INPUT: "Data yang dikirim belum sesuai. Periksa isian Anda.",
  CONFLICT: "Data bentrok dengan data yang sudah ada.",
  SERVER: "Server sedang bermasalah. Coba lagi nanti.",
};

function describeIssues(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) return statusMessages.INVALID_RESPONSE;
  const path = first.path.length ? ` (${first.path.join(".")})` : "";
  return `${statusMessages.INVALID_RESPONSE} Rincian: ${first.message}${path}`;
}

export function createRealClient(baseUrl: string, fetchImpl: typeof fetch = fetch): ApiClient {
  const base = baseUrl.replace(/\/+$/, "");

  async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    init: RequestInit = {},
    options: { allowUnauthenticated?: boolean } = {},
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetchImpl(`${base}${path}`, { credentials: "include", ...init });
    } catch {
      throw new ApiError("NETWORK", statusMessages.NETWORK);
    }
    if (!response.ok) {
      if (response.status === 401 && options.allowUnauthenticated) {
        return null as T;
      }
      const code = statusToCode(response.status);
      throw new ApiError(code, statusMessages[code]);
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ApiError("INVALID_RESPONSE", statusMessages.INVALID_RESPONSE);
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new ApiError("INVALID_RESPONSE", describeIssues(parsed.error));
    return parsed.data;
  }

  const json = (method: string, body: unknown): RequestInit => ({
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const enc = encodeURIComponent;

  return {
    mode: "real",
    login: (input) => request("/auth/login", userSchema, json("POST", input)),
    register: (input) => request("/auth/register", userSchema, json("POST", input)),
    async logout() {
      await request("/auth/logout", z.unknown(), { method: "POST" });
    },
    async changePassword(input) {
      await request(
        "/auth/change-password",
        z.unknown(),
        json("POST", { current_password: input.currentPassword, new_password: input.newPassword }),
      );
    },
    getSession: () =>
      request("/auth/session", userSchema.nullable(), {}, { allowUnauthenticated: true }),
    listRos: () => request("/ro", z.array(roSchema)),
    listSubmissions: () => request("/submissions", z.array(submissionSchema)),
    getSubmission: (id) => request(`/submissions/${enc(id)}`, submissionSchema),
    createSubmission({ roCode, tor, rab, previousSubmissionId }) {
      const form = new FormData();
      form.append("ro_code", roCode);
      form.append("tor", tor);
      form.append("rab", rab);
      if (previousSubmissionId) form.append("previous_submission_id", previousSubmissionId);
      return request("/submissions", submissionSchema, { method: "POST", body: form });
    },
    resubmitProcessing: (id) =>
      request(`/submissions/${enc(id)}/resubmit`, submissionSchema, { method: "POST" }),
    getScreening1: (id) => request(`/submissions/${enc(id)}/screening1`, screening1ResultSchema),
    getScreening2: (id) => request(`/submissions/${enc(id)}/screening2`, screening2ResultSchema),
    listDocumentCategories: () => request("/document-categories", z.array(documentCategorySchema)),
    listReferenceDocuments: () => request("/reference-documents", z.array(referenceDocumentSchema)),
    addReferenceDocument({ categoryCode, title, file }) {
      const form = new FormData();
      form.append("category_code", categoryCode);
      form.append("title", title);
      form.append("file", file);
      return request("/reference-documents", referenceDocumentSchema, { method: "POST", body: form });
    },
    setReferenceDocumentActive: (id, active) =>
      request(`/reference-documents/${enc(id)}`, referenceDocumentSchema, json("PATCH", { active })),
    async deleteReferenceDocument(id) {
      await request(`/reference-documents/${enc(id)}`, z.unknown(), { method: "DELETE" });
    },
    createRo: (input) => request("/ro", roSchema, json("POST", input)),
    updateRo: (code, patch) => request(`/ro/${enc(code)}`, roSchema, json("PATCH", patch)),
    async deleteRo(code) {
      await request(`/ro/${enc(code)}`, z.unknown(), { method: "DELETE" });
    },
    getChecklist: () => request("/checklist", checklistSchema),
    createChecklistItem: (item) => request("/checklist/items", checklistSchema, json("POST", item)),
    updateChecklistItem: (code, patch) =>
      request(`/checklist/items/${enc(code)}`, checklistSchema, json("PATCH", patch)),
    deleteChecklistItem: (code) =>
      request(`/checklist/items/${enc(code)}`, checklistSchema, { method: "DELETE" }),
    splitChecklistItem: (code, titles) =>
      request(`/checklist/items/${enc(code)}/split`, checklistSchema, json("POST", { titles })),
    listPriorityCategories: () => request("/priority-categories", z.array(priorityCategorySchema)),
    updatePriorityCategory: (category, patch) =>
      request(`/priority-categories/${category}`, z.array(priorityCategorySchema), json("PATCH", patch)),
    createDocumentCategory: (input) =>
      request("/document-categories", documentCategorySchema, json("POST", input)),
    updateDocumentCategory: (code, name) =>
      request(`/document-categories/${enc(code)}`, documentCategorySchema, json("PATCH", { name })),
    async deleteDocumentCategory(code) {
      await request(`/document-categories/${enc(code)}`, z.unknown(), { method: "DELETE" });
    },
    listUsers: () => request("/users", z.array(userSchema)),
    createUser: (input) => request("/users", userSchema, json("POST", input)),
    updateUser: (id, patch) => request(`/users/${enc(id)}`, userSchema, json("PATCH", patch)),
    async resetUserPassword(id, newPassword) {
      await request(
        `/users/${enc(id)}/reset-password`,
        z.unknown(),
        json("POST", { new_password: newPassword }),
      );
    },
    getDecision: (id) => request(`/submissions/${enc(id)}/decision`, decisionSchema.nullable()),
    saveDecision: ({ submissionId, ...rest }) =>
      request(`/submissions/${enc(submissionId)}/decision`, decisionSchema, json("PUT", rest)),
  };
}
