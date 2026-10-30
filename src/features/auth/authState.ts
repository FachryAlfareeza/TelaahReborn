import { createContext, useContext } from "react";
import type { ApiClient, ChangePasswordInput, LoginInput, RegisterInput } from "../../api";
import type { User } from "../../types";

export type AuthValue = {
  /** Klien API yang dipakai aplikasi. Layar mengambil data lewat sini. */
  client: ApiClient;
  user: User | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (input: ChangePasswordInput) => Promise<void>;
};

export const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider.");
  return ctx;
}
