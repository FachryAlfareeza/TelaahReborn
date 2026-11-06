import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useAuth } from "../features/auth/authState";
import { isRunning } from "../lib/status";
import type {
  CascadeQuery,
  ChecklistItemsInput,
  ChecklistVersionInput,
  CreateCurationExportInput,
  CreateReviewRequestInput,
  CreateUserInput,
  CurationFilters,
  FinalizeInput,
  ImportReferenceTableInput,
  ReferenceDocumentFilters,
  ResubmitInput,
  ReviewRequestFilters,
  StartTableExtractionInput,
  UpdateFinalInput,
  UpdateUserInput,
  UploadReferenceDocumentInput,
} from "./client";
import type { ReferenceTableType, Role } from "../types";

/** Jeda polling progres saat halaman detail terbuka (PRD FR-PRG-01, usulan 5 detik). */
export const POLL_MS = 5000;
/** Jeda pembaruan jumlah notifikasi belum dibaca. */
export const NOTIFICATION_POLL_MS = 30_000;

function useClient() {
  return useAuth().client;
}

function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: QueryKey[]) => Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })));
}

// --- Pengajuan ---------------------------------------------------------------

export function useReviewRequests(filters: ReviewRequestFilters = {}) {
  const client = useClient();
  return useQuery({
    queryKey: ["review-requests", filters],
    queryFn: () => client.listReviewRequests(filters),
    refetchInterval: (q) => (q.state.data?.some((r) => isRunning(r.status)) ? POLL_MS : false),
  });
}

export function useReviewRequest(id: string) {
  const client = useClient();
  return useQuery({
    queryKey: ["review-request", id],
    queryFn: () => client.getReviewRequest(id),
    refetchInterval: (q) => (q.state.data && isRunning(q.state.data.status) ? POLL_MS : false),
  });
}

/** Progres tahap. Polling berhenti saat status bukan lagi `dalam_proses` (kontrak §3.5). */
export function useProgress(id: string, enabled = true) {
  const client = useClient();
  const qc = useQueryClient();
  return useQuery({
    queryKey: ["progress", id],
    queryFn: async () => {
      const progress = await client.getProgress(id);
      if (!isRunning(progress.request_status)) {
        void qc.invalidateQueries({ queryKey: ["review-request", id] });
        void qc.invalidateQueries({ queryKey: ["result", id] });
      }
      return progress;
    },
    enabled,
    refetchInterval: (q) => (!q.state.data || q.state.data.request_status === "dalam_proses" ? POLL_MS : false),
  });
}

export function useVersions(id: string) {
  const client = useClient();
  return useQuery({ queryKey: ["versions", id], queryFn: () => client.listVersions(id) });
}

export function useCreateReviewRequest() {
  const client = useClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateReviewRequestInput) => client.createReviewRequest(input),
    onSuccess: () => invalidate(["review-requests"]),
  });
}

export function useResubmit(id: string) {
  const client = useClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: ResubmitInput) => client.resubmit(id, input),
    onSuccess: () => invalidate(["review-requests"], ["versions"], ["review-request", id]),
  });
}

export function useRetryReview(id: string) {
  const client = useClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: () => client.retryReview(id),
    onSuccess: () => invalidate(["review-request", id], ["progress", id], ["review-requests"]),
  });
}

// --- Hasil ---------------------------------------------------------------------

export function useReviewResult(id: string, enabled: boolean) {
  const client = useClient();
  return useQuery({ queryKey: ["result", id, "rocan"], queryFn: () => client.getReviewResult(id), enabled });
}

export function useFinalResult(id: string, enabled: boolean) {
  const client = useClient();
  return useQuery({ queryKey: ["result", id, "final"], queryFn: () => client.getFinalResult(id), enabled });
}

export function useResultHistory(id: string, enabled: boolean) {
  const client = useClient();
  return useQuery({ queryKey: ["result", id, "history"], queryFn: () => client.getResultHistory(id), enabled });
}

export function useUpdateFinal(id: string) {
  const client = useClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: UpdateFinalInput) => client.updateFinalResult(id, input),
    onSuccess: () => invalidate(["result", id]),
  });
}

export function useFinalize(id: string) {
  const client = useClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: FinalizeInput) => client.finalize(id, input),
    onSuccess: () => invalidate(["result", id], ["review-request", id], ["review-requests"], ["curation"]),
  });
}

// --- Master RO -------------------------------------------------------------------

export function useFiscalYears() {
  const client = useClient();
  return useQuery({ queryKey: ["fiscal-years"], queryFn: () => client.listFiscalYears() });
}

export function useUnits(fiscalYear: number | null) {
  const client = useClient();
  return useQuery({
    queryKey: ["units", fiscalYear],
    queryFn: () => client.listUnits(fiscalYear!),
    enabled: fiscalYear !== null,
  });
}

/** Dropdown bertingkat: tiap tingkat baru diminta setelah semua induknya dipilih. */
export function useCascade(q: Partial<CascadeQuery>) {
  const client = useClient();
  const year = q.fiscal_year;
  const programs = useQuery({
    queryKey: ["cascade", "programs", year],
    queryFn: () => client.listPrograms({ fiscal_year: year! }),
    enabled: !!year,
  });
  const activities = useQuery({
    queryKey: ["cascade", "activities", year, q.program_code],
    queryFn: () => client.listActivities({ fiscal_year: year!, program_code: q.program_code! }),
    enabled: !!year && !!q.program_code,
  });
  const kros = useQuery({
    queryKey: ["cascade", "kros", year, q.program_code, q.activity_code],
    queryFn: () =>
      client.listKros({ fiscal_year: year!, program_code: q.program_code!, activity_code: q.activity_code! }),
    enabled: !!year && !!q.program_code && !!q.activity_code,
  });
  const ros = useQuery({
    queryKey: ["cascade", "ros", year, q.program_code, q.activity_code, q.kro_code],
    queryFn: () =>
      client.listRos({
        fiscal_year: year!,
        program_code: q.program_code!,
        activity_code: q.activity_code!,
        kro_code: q.kro_code!,
      }),
    enabled: !!year && !!q.program_code && !!q.activity_code && !!q.kro_code,
  });
  return { programs, activities, kros, ros };
}

export function useDatasets() {
  const client = useClient();
  return useQuery({ queryKey: ["datasets"], queryFn: () => client.listDatasets() });
}

export function useDatasetIssues(id: string | null) {
  const client = useClient();
  return useQuery({
    queryKey: ["dataset-issues", id],
    queryFn: () => client.listDatasetIssues(id!),
    enabled: id !== null,
  });
}

export function useImportDataset() {
  const client = useClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { file: File; fiscalYear: number }) => client.importDataset(v.file, v.fiscalYear),
    onSuccess: () => invalidate(["datasets"]),
  });
}

export function useActivateDataset() {
  const client = useClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => client.activateDataset(id),
    onSuccess: () => invalidate(["datasets"], ["fiscal-years"], ["cascade"], ["units"]),
  });
}

// --- Checklist -----------------------------------------------------------------

export function useChecklists() {
  const client = useClient();
  return useQuery({ queryKey: ["checklists"], queryFn: () => client.listChecklists() });
}

export function useChecklist(id: string | null) {
  const client = useClient();
  return useQuery({ queryKey: ["checklist", id], queryFn: () => client.getChecklist(id!), enabled: id !== null });
}

export function useCreateChecklist() {
  const client = useClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: ChecklistVersionInput) => client.createChecklist(input),
    onSuccess: () => invalidate(["checklists"]),
  });
}

export function useUpdateChecklistItems() {
  const client = useClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { id: string; input: ChecklistItemsInput }) => client.updateChecklistItems(v.id, v.input),
    onSuccess: (_d, v) => invalidate(["checklists"], ["checklist", v.id]),
  });
}

export function useActivateChecklist() {
  const client = useClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => client.activateChecklist(id),
    onSuccess: () => invalidate(["checklists"]),
  });
}

// --- Dokumen acuan ----------------------------------------------------------------

export function useReferenceDocuments(filters: ReferenceDocumentFilters = {}) {
  const client = useClient();
  return useQuery({
    queryKey: ["reference-documents", filters],
    queryFn: () => client.listReferenceDocuments(filters),
    refetchInterval: (q) =>
      q.state.data?.some((d) => d.status === "pending" || d.status === "processing") ? POLL_MS : false,
  });
}

function useDocMutation<T>(fn: (input: T) => Promise<unknown>) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate(["reference-documents"]) });
}

export function useUploadReferenceDocument() {
  const client = useClient();
  return useDocMutation((input: UploadReferenceDocumentInput) => client.uploadReferenceDocument(input));
}
export function useReingestReferenceDocument() {
  const client = useClient();
  return useDocMutation((id: string) => client.reingestReferenceDocument(id));
}
export function useSetReferenceDocumentActive() {
  const client = useClient();
  return useDocMutation((v: { id: string; active: boolean }) =>
    v.active ? client.activateReferenceDocument(v.id) : client.deactivateReferenceDocument(v.id),
  );
}

// --- Tabel acuan -------------------------------------------------------------------

export function useReferenceTables(filters: { table_type?: ReferenceTableType; fiscal_year?: number } = {}) {
  const client = useClient();
  return useQuery({ queryKey: ["reference-tables", filters], queryFn: () => client.listReferenceTables(filters) });
}

export function useReferenceTableRows(id: string | null, search: string) {
  const client = useClient();
  return useQuery({
    queryKey: ["reference-table-rows", id, search],
    queryFn: () => client.listReferenceTableRows(id!, search || undefined),
    enabled: id !== null,
  });
}

export function useTableExtraction(id: string | null) {
  const client = useClient();
  return useQuery({
    queryKey: ["table-extraction", id],
    queryFn: () => client.getTableExtraction(id!),
    enabled: id !== null,
    refetchInterval: (q) =>
      q.state.data && (q.state.data.status === "succeeded" || q.state.data.status === "failed") ? false : 2000,
  });
}

export function useStartTableExtraction() {
  const client = useClient();
  return useMutation({ mutationFn: (input: StartTableExtractionInput) => client.startTableExtraction(input) });
}

export function useImportReferenceTable() {
  const client = useClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: ImportReferenceTableInput) => client.importReferenceTable(input),
    onSuccess: () => invalidate(["reference-tables"]),
  });
}

export function useActivateReferenceTable() {
  const client = useClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => client.activateReferenceTable(id),
    onSuccess: () => invalidate(["reference-tables"]),
  });
}

// --- Kurasi ---------------------------------------------------------------------

export function useCurationSamples(filters: CurationFilters) {
  const client = useClient();
  return useQuery({ queryKey: ["curation", "samples", filters], queryFn: () => client.listCurationSamples(filters) });
}

export function useCurationSample(id: string | null) {
  const client = useClient();
  return useQuery({
    queryKey: ["curation", "sample", id],
    queryFn: () => client.getCurationSample(id!),
    enabled: id !== null,
  });
}

export function useReviewCurationSample() {
  const client = useClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { id: string; status: "approved" | "rejected"; note?: string }) =>
      client.reviewCurationSample(v.id, { status: v.status, note: v.note }),
    onSuccess: () => invalidate(["curation"]),
  });
}

export function useCurationExports() {
  const client = useClient();
  return useQuery({
    queryKey: ["curation", "exports"],
    queryFn: () => client.listCurationExports(),
    refetchInterval: (q) =>
      q.state.data?.some((x) => x.status === "pending" || x.status === "processing") ? 2000 : false,
  });
}

export function useCreateCurationExport() {
  const client = useClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateCurationExportInput) => client.createCurationExport(input),
    onSuccess: () => invalidate(["curation", "exports"]),
  });
}

// --- Akun --------------------------------------------------------------------------

export function useUsers(role?: Role) {
  const client = useClient();
  return useQuery({ queryKey: ["users", role ?? "all"], queryFn: () => client.listUsers(role) });
}

export function useCreateUser() {
  const client = useClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateUserInput) => client.createUser(input),
    onSuccess: () => invalidate(["users"]),
  });
}

export function useUpdateUser() {
  const client = useClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { id: string; input: UpdateUserInput }) => client.updateUser(v.id, v.input),
    onSuccess: () => invalidate(["users"]),
  });
}

export function useDeactivateUser() {
  const client = useClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => client.deactivateUser(id),
    onSuccess: () => invalidate(["users"]),
  });
}

// --- Notifikasi -------------------------------------------------------------------

export function useUnreadCount() {
  const client = useClient();
  return useQuery({
    queryKey: ["notifications", "count"],
    queryFn: () => client.getUnreadCount(),
    refetchInterval: NOTIFICATION_POLL_MS,
  });
}

export function useNotifications() {
  const client = useClient();
  return useQuery({ queryKey: ["notifications", "list"], queryFn: () => client.listNotifications() });
}

export function useMarkNotificationRead() {
  const client = useClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => client.markNotificationRead(id),
    onSuccess: () => invalidate(["notifications"]),
  });
}
