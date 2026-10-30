import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiClient } from "../../api";
import { useAuth } from "../auth/authState";

/** Mutasi pengelolaan: setelah berhasil, data pada kunci terkait dimuat ulang. */
function useAdminMutation<V, R>(run: (client: ApiClient, v: V) => Promise<R>, keys: string[]) {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: V) => run(client, v),
    onSuccess: () => Promise.all(keys.map((k) => queryClient.invalidateQueries({ queryKey: [k] }))),
  });
}

export function useChecklist() {
  const { client } = useAuth();
  return useQuery({ queryKey: ["checklist"], queryFn: () => client.getChecklist() });
}

export function usePriorityCategories() {
  const { client } = useAuth();
  return useQuery({ queryKey: ["priorityCategories"], queryFn: () => client.listPriorityCategories() });
}

export function useUsers() {
  const { client } = useAuth();
  return useQuery({ queryKey: ["users"], queryFn: () => client.listUsers() });
}

export const useCreateRo = () =>
  useAdminMutation((c, v: Parameters<ApiClient["createRo"]>[0]) => c.createRo(v), ["ros"]);
export const useUpdateRo = () =>
  useAdminMutation((c, v: { code: string; patch: Parameters<ApiClient["updateRo"]>[1] }) => c.updateRo(v.code, v.patch), ["ros"]);
export const useDeleteRo = () => useAdminMutation((c, code: string) => c.deleteRo(code), ["ros"]);

export const useCreateChecklistItem = () =>
  useAdminMutation((c, v: Parameters<ApiClient["createChecklistItem"]>[0]) => c.createChecklistItem(v), ["checklist"]);
export const useUpdateChecklistItem = () =>
  useAdminMutation(
    (c, v: { code: string; patch: Parameters<ApiClient["updateChecklistItem"]>[1] }) => c.updateChecklistItem(v.code, v.patch),
    ["checklist"],
  );
export const useDeleteChecklistItem = () =>
  useAdminMutation((c, code: string) => c.deleteChecklistItem(code), ["checklist"]);
export const useSplitChecklistItem = () =>
  useAdminMutation((c, v: { code: string; titles: string[] }) => c.splitChecklistItem(v.code, v.titles), ["checklist"]);

export const useUpdatePriorityCategory = () =>
  useAdminMutation(
    (c, v: { category: number; patch: Parameters<ApiClient["updatePriorityCategory"]>[1] }) =>
      c.updatePriorityCategory(v.category, v.patch),
    ["priorityCategories"],
  );
export const useCreateDocumentCategory = () =>
  useAdminMutation((c, v: Parameters<ApiClient["createDocumentCategory"]>[0]) => c.createDocumentCategory(v), ["documentCategories"]);
export const useUpdateDocumentCategory = () =>
  useAdminMutation((c, v: { code: string; name: string }) => c.updateDocumentCategory(v.code, v.name), ["documentCategories"]);
export const useDeleteDocumentCategory = () =>
  useAdminMutation((c, code: string) => c.deleteDocumentCategory(code), ["documentCategories"]);

export const useCreateUser = () =>
  useAdminMutation((c, v: Parameters<ApiClient["createUser"]>[0]) => c.createUser(v), ["users"]);
export const useUpdateUser = () =>
  useAdminMutation((c, v: { id: string; patch: Parameters<ApiClient["updateUser"]>[1] }) => c.updateUser(v.id, v.patch), ["users"]);
export const useResetUserPassword = () =>
  useAdminMutation((c, v: { id: string; password: string }) => c.resetUserPassword(v.id, v.password), ["users"]);
