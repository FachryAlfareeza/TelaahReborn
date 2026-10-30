import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AddReferenceDocumentInput, CreateSubmissionInput, SaveDecisionInput } from "../../api";
import { useAuth } from "../auth/authState";
import type { Submission } from "../../types";

/** Jeda pembaruan status saat ada pengajuan yang masih diproses (milidetik). */
export const STATUS_POLL_MS = 3000;

const isRunning = (s: Submission) => s.status === "PROCESSING";

export function useRos() {
  const { client } = useAuth();
  return useQuery({ queryKey: ["ros"], queryFn: () => client.listRos() });
}

/** Daftar pengajuan. Diperbarui berkala selama masih ada yang diproses. */
export function useSubmissions() {
  const { client } = useAuth();
  return useQuery({
    queryKey: ["submissions"],
    queryFn: () => client.listSubmissions(),
    refetchInterval: (query) => (query.state.data?.some(isRunning) ? STATUS_POLL_MS : false),
  });
}

/** Satu pengajuan. Diperbarui berkala selama masih diproses. */
export function useSubmission(id: string) {
  const { client } = useAuth();
  return useQuery({
    queryKey: ["submission", id],
    queryFn: () => client.getSubmission(id),
    refetchInterval: (query) => (query.state.data && isRunning(query.state.data) ? STATUS_POLL_MS : false),
  });
}

/** Keputusan ROCAN, hanya diminta setelah pengajuan diputuskan. */
export function useDecision(id: string, enabled: boolean) {
  const { client } = useAuth();
  return useQuery({
    queryKey: ["decision", id],
    queryFn: () => client.getDecision(id),
    enabled,
  });
}

export function useCreateSubmission() {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSubmissionInput) => client.createSubmission(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["submissions"] }),
  });
}

/** Hasil Screening 1, hanya diminta bila sudah ada hasil. */
export function useScreening1(id: string, enabled: boolean) {
  const { client } = useAuth();
  return useQuery({ queryKey: ["screening1", id], queryFn: () => client.getScreening1(id), enabled });
}

export function useScreening2(id: string, enabled: boolean) {
  const { client } = useAuth();
  return useQuery({ queryKey: ["screening2", id], queryFn: () => client.getScreening2(id), enabled });
}

export function useSaveDecision() {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveDecisionInput) => client.saveDecision(input),
    onSuccess: (_d, input) => {
      void queryClient.invalidateQueries({ queryKey: ["decision", input.submissionId] });
      void queryClient.invalidateQueries({ queryKey: ["submission", input.submissionId] });
      void queryClient.invalidateQueries({ queryKey: ["submissions"] });
    },
  });
}

export function useDocumentCategories() {
  const { client } = useAuth();
  return useQuery({ queryKey: ["documentCategories"], queryFn: () => client.listDocumentCategories() });
}

export function useReferenceDocuments() {
  const { client } = useAuth();
  return useQuery({ queryKey: ["referenceDocuments"], queryFn: () => client.listReferenceDocuments() });
}

export function useAddReferenceDocument() {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddReferenceDocumentInput) => client.addReferenceDocument(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["referenceDocuments"] }),
  });
}

export function useSetReferenceDocumentActive() {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; active: boolean }) => client.setReferenceDocumentActive(v.id, v.active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["referenceDocuments"] }),
  });
}

export function useDeleteReferenceDocument() {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => client.deleteReferenceDocument(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["referenceDocuments"] }),
  });
}

export function useResubmitProcessing() {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (submissionId: string) => client.resubmitProcessing(submissionId),
    onSuccess: (s) => {
      void queryClient.invalidateQueries({ queryKey: ["submission", s.id] });
      void queryClient.invalidateQueries({ queryKey: ["submissions"] });
    },
  });
}
