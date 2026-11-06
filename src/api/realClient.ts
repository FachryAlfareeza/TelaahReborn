import { z } from "zod";
import * as s from "./schemas";
import { ApiError, type ApiClient, type ApiErrorCode } from "./client";

/** Prefix seluruh endpoint publik (kontrak §1, PRD K-22). */
export const API_PREFIX = "/api/v1";

/** Token disimpan di localStorage (PRD FR-AUTH-05, OQ-07). */
export const TOKEN_KEYS = { access: "telaah-access-token", refresh: "telaah-refresh-token" } as const;

type TokenStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function statusToCode(status: number): ApiErrorCode {
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 413) return "TOO_LARGE";
  if (status === 400 || status === 422) return "INVALID_INPUT";
  if (status === 503) return "UNAVAILABLE";
  return "SERVER";
}

export const statusMessages: Record<ApiErrorCode, string> = {
  NETWORK: "Tidak dapat terhubung ke server. Periksa sambungan, lalu coba lagi.",
  INVALID_RESPONSE: "Server mengirim data yang tidak dikenali. Coba lagi nanti.",
  UNAUTHENTICATED: "Sesi berakhir. Silakan masuk lagi.",
  FORBIDDEN: "Anda tidak punya izin untuk tindakan ini.",
  NOT_FOUND: "Data tidak ditemukan.",
  INVALID_INPUT: "Data yang dikirim belum sesuai. Periksa isian Anda.",
  CONFLICT: "Tindakan ini bentrok dengan keadaan data saat ini. Muat ulang halaman, lalu coba lagi.",
  TOO_LARGE: "Berkas melebihi batas ukuran.",
  UNAVAILABLE: "Layanan sedang tidak tersedia. Coba lagi beberapa saat lagi.",
  SERVER: "Server sedang bermasalah. Coba lagi nanti.",
};

function describeIssues(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) return statusMessages.INVALID_RESPONSE;
  const path = first.path.length ? ` (${first.path.join(".")})` : "";
  return `${statusMessages.INVALID_RESPONSE} Rincian: ${first.message}${path}`;
}

/**
 * Pesan galat dari server berbentuk `{"detail": "<pesan Bahasa Indonesia>"}` atau
 * `{"detail": [...]}` untuk 422 (kontrak §1). Pesan teks dipakai bila ada.
 */
async function readDetail(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "detail" in body) {
      const detail = (body as { detail: unknown }).detail;
      if (typeof detail === "string" && detail.trim()) return detail;
      if (Array.isArray(detail)) {
        const msg = detail
          .map((d) => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : null))
          .filter(Boolean)
          .join("; ");
        if (msg) return msg;
      }
    }
  } catch {
    // Badan respons bukan JSON; pakai pesan umum.
  }
  return null;
}

type Query = Record<string, string | number | undefined>;

function withQuery(path: string, query?: Query): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

function form(fields: Record<string, string | number | File | undefined>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === "") continue;
    data.append(k, v instanceof File ? v : String(v));
  }
  return data;
}

export function createRealClient(
  baseUrl: string,
  fetchImpl: typeof fetch = (...args) => fetch(...args),
  store: TokenStore = localStorage,
): ApiClient {
  const base = `${baseUrl.replace(/\/+$/, "")}${API_PREFIX}`;

  const tokens = {
    access: () => store.getItem(TOKEN_KEYS.access),
    refresh: () => store.getItem(TOKEN_KEYS.refresh),
    save(t: z.infer<typeof s.tokenResponseSchema>) {
      store.setItem(TOKEN_KEYS.access, t.access_token);
      store.setItem(TOKEN_KEYS.refresh, t.refresh_token);
    },
    clear() {
      store.removeItem(TOKEN_KEYS.access);
      store.removeItem(TOKEN_KEYS.refresh);
    },
  };

  async function send(path: string, init: RequestInit, auth: boolean): Promise<Response> {
    const headers = new Headers(init.headers);
    const access = tokens.access();
    if (auth && access) headers.set("Authorization", `Bearer ${access}`);
    try {
      return await fetchImpl(`${base}${path}`, { ...init, headers });
    } catch {
      throw new ApiError("NETWORK", statusMessages.NETWORK);
    }
  }

  let refreshing: Promise<boolean> | null = null;
  /** Rotasi refresh token (kontrak §3.1). Satu permintaan refresh untuk banyak 401 bersamaan. */
  function refreshTokens(): Promise<boolean> {
    refreshing ??= (async () => {
      const refresh_token = tokens.refresh();
      if (!refresh_token) return false;
      const res = await send("/auth/refresh", json("POST", { refresh_token }), false).catch(() => null);
      if (!res?.ok) {
        tokens.clear();
        return false;
      }
      const parsed = s.tokenResponseSchema.safeParse(await res.json().catch(() => null));
      if (!parsed.success) {
        tokens.clear();
        return false;
      }
      tokens.save(parsed.data);
      return true;
    })().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  async function raw(path: string, init: RequestInit = {}, auth = true): Promise<Response> {
    let response = await send(path, init, auth);
    if (response.status === 401 && auth && (await refreshTokens())) {
      response = await send(path, init, auth);
    }
    if (!response.ok) {
      const code = statusToCode(response.status);
      if (code === "UNAUTHENTICATED" && auth) tokens.clear();
      throw new ApiError(code, (await readDetail(response)) ?? statusMessages[code]);
    }
    return response;
  }

  async function request<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}, auth = true): Promise<T> {
    const response = await raw(path, init, auth);
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

  async function noBody(path: string, init: RequestInit = {}): Promise<void> {
    await raw(path, init);
  }

  async function blob(path: string): Promise<Blob> {
    return (await raw(path)).blob();
  }

  function json(method: string, body: unknown): RequestInit {
    return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
  }
  const post = (body: FormData): RequestInit => ({ method: "POST", body });
  const enc = encodeURIComponent;
  const rr = (id: string) => `/review-requests/${enc(id)}`;

  return {
    mode: "real",

    async login(input) {
      tokens.save(await request("/auth/login", s.tokenResponseSchema, json("POST", input), false));
      return request("/auth/me", s.userSchema);
    },
    async logout() {
      const refresh_token = tokens.refresh();
      tokens.clear();
      if (refresh_token) {
        await raw("/auth/logout", json("POST", { refresh_token }), false).catch(() => undefined);
      }
    },
    async getSession() {
      if (!tokens.access() && !tokens.refresh()) return null;
      try {
        return await request("/auth/me", s.userSchema);
      } catch (e) {
        if (e instanceof ApiError && e.code === "UNAUTHENTICATED") return null;
        throw e;
      }
    },

    listUsers: (role) => request(withQuery("/users", { role }), z.array(s.userSchema)),
    createUser: (input) => request("/users", s.userSchema, json("POST", input)),
    updateUser: (id, input) => request(`/users/${enc(id)}`, s.userSchema, json("PUT", input)),
    deactivateUser: (id) => noBody(`/users/${enc(id)}`, { method: "DELETE" }),

    listFiscalYears: () => request("/master-data/fiscal-years", z.array(s.fiscalYearSchema)),
    listUnits: (fiscal_year) =>
      request(withQuery("/master-data/units", { fiscal_year }), z.array(s.unitPairSchema)),
    listPrograms: (q) => request(withQuery("/master-data/programs", q), z.array(s.codeLabelSchema)),
    listActivities: (q) => request(withQuery("/master-data/activities", q), z.array(s.codeLabelSchema)),
    listKros: (q) => request(withQuery("/master-data/kros", q), z.array(s.codeLabelSchema)),
    listRos: (q) => request(withQuery("/master-data/ros", q), z.array(s.masterRoRowSchema)),
    listDatasets: (fiscal_year) =>
      request(withQuery("/master-data/datasets", { fiscal_year }), z.array(s.masterRoDatasetSchema)),
    importDataset: (file, fiscal_year) =>
      request("/master-data/datasets", s.masterRoDatasetSchema, post(form({ file, fiscal_year }))),
    listDatasetIssues: (id) =>
      request(`/master-data/datasets/${enc(id)}/issues`, z.array(s.datasetIssueSchema)),
    activateDataset: (id) =>
      request(`/master-data/datasets/${enc(id)}/activate`, s.masterRoDatasetSchema, { method: "POST" }),

    listReviewRequests: (filters) =>
      request(withQuery("/review-requests", filters), z.array(s.reviewRequestSchema)),
    getReviewRequest: (id) => request(rr(id), s.reviewRequestSchema),
    createReviewRequest: (input) =>
      request("/review-requests", s.reviewRequestSchema, post(form(input))),
    getDocument: (id, kind) => blob(`${rr(id)}/documents/${kind}`),
    listVersions: (id) => request(`${rr(id)}/versions`, z.array(s.reviewRequestSchema)),
    resubmit: (id, input) => request(`${rr(id)}/resubmit`, s.reviewRequestSchema, post(form(input))),

    async retryReview(id) {
      await request(`${rr(id)}/retry-review`, s.retryReviewSchema, { method: "POST" });
    },
    getProgress: (id) => request(`${rr(id)}/progress`, s.progressSchema),

    getReviewResult: (id) => request(`${rr(id)}/result`, s.reviewResultSchema),
    getFinalResult: (id) => request(`${rr(id)}/result`, s.finalResultSchema),
    updateFinalResult: (id, input) =>
      request(`${rr(id)}/result/final`, s.reviewResultSchema, json("PATCH", input)),
    getResultHistory: (id) => request(`${rr(id)}/result/history`, z.array(s.historyEntrySchema)),
    finalize: (id, input) => request(`${rr(id)}/finalize`, s.reviewResultSchema, json("POST", input)),

    listChecklists: () => request("/checklists", z.array(s.checklistVersionSchema)),
    getChecklist: (id) => request(`/checklists/${enc(id)}`, s.checklistVersionSchema),
    createChecklist: (input) => request("/checklists", s.checklistVersionSchema, json("POST", input)),
    updateChecklistItems: (id, input) =>
      request(`/checklists/${enc(id)}/items`, s.checklistVersionSchema, json("PUT", input)),
    activateChecklist: (id) =>
      request(`/checklists/${enc(id)}/activate`, s.checklistVersionSchema, { method: "POST" }),

    listReferenceDocuments: (filters) =>
      request(withQuery("/reference-documents", filters), z.array(s.referenceDocumentSchema)),
    uploadReferenceDocument: (input) =>
      request("/reference-documents", s.referenceDocumentSchema, post(form(input))),
    reingestReferenceDocument: (id) => noBody(`/reference-documents/${enc(id)}/reingest`, { method: "POST" }),
    deactivateReferenceDocument: (id) =>
      request(`/reference-documents/${enc(id)}/deactivate`, s.referenceDocumentSchema, { method: "POST" }),
    activateReferenceDocument: (id) =>
      request(`/reference-documents/${enc(id)}/activate`, s.referenceDocumentSchema, { method: "POST" }),

    startTableExtraction: (input) =>
      request("/reference-tables/extractions", s.tableExtractionSchema, post(form(input))),
    getTableExtraction: (id) => request(`/reference-tables/extractions/${enc(id)}`, s.tableExtractionSchema),
    downloadTableCandidate: (id) => blob(`/reference-tables/extractions/${enc(id)}/candidate`),
    importReferenceTable: (input) =>
      request("/reference-tables", s.referenceTableVersionSchema, post(form(input))),
    listReferenceTables: (filters) =>
      request(withQuery("/reference-tables", filters), z.array(s.referenceTableVersionSchema)),
    listReferenceTableRows: (id, search) =>
      request(withQuery(`/reference-tables/${enc(id)}/rows`, { search }), z.array(s.referenceTableRowSchema)),
    activateReferenceTable: (id) =>
      request(`/reference-tables/${enc(id)}/activate`, s.referenceTableVersionSchema, { method: "POST" }),

    listCurationSamples: (filters) =>
      request(withQuery("/curation/samples", filters), z.array(s.curationSampleSchema)),
    getCurationSample: (id) => request(`/curation/samples/${enc(id)}`, s.curationSampleDetailSchema),
    reviewCurationSample: (id, input) => noBody(`/curation/samples/${enc(id)}`, json("PATCH", input)),
    createCurationExport: (input) => request("/curation/exports", s.curationExportSchema, json("POST", input)),
    listCurationExports: () => request("/curation/exports", z.array(s.curationExportSchema)),
    downloadCurationExport: (id) => blob(`/curation/exports/${enc(id)}/download`),

    listNotifications: () => request("/notifications", z.array(s.notificationSchema)),
    getUnreadCount: async () => (await request("/notifications/unread-count", s.unreadCountSchema)).count,
    markNotificationRead: (id) => noBody(`/notifications/${enc(id)}/read`, { method: "PUT" }),
  };
}
