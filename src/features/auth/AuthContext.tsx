import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getApiClient, type ApiClient } from "../../api";
import type { User } from "../../types";
import { AuthContext, type AuthValue } from "./authState";

/** Menyimpan pengguna yang sedang masuk. Sesi hanya diakses lewat klien API (`GET /auth/me`). */
export function AuthProvider({ children, client }: { children: ReactNode; client?: ApiClient }) {
  const api = client ?? getApiClient();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getSession()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const login = useCallback<AuthValue["login"]>(
    async (input) => {
      const next = await api.login(input);
      queryClient.clear();
      setUser(next);
    },
    [api, queryClient],
  );
  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      queryClient.clear();
      setUser(null);
    }
  }, [api, queryClient]);

  const value = useMemo<AuthValue>(() => ({ client: api, user, loading, login, logout }), [api, user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
