import { createContext, useContext } from "react";
import type { ApiClient, LoginInput } from "../../api/client";
import type { User } from "../../types";

export type AuthValue = {
  client: ApiClient;
  user: User | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider.");
  return ctx;
}
