import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { getApiClient, type ApiClient } from "../../api";
import type { User } from "../../types";
import { AuthContext, type AuthValue } from "./authState";

/** Menyimpan pengguna yang sedang masuk. Sesi hanya diakses lewat klien API. */
export function AuthProvider({ children, client }: { children: ReactNode; client?: ApiClient }) {
  const api = client ?? getApiClient();
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

  const login = useCallback<AuthValue["login"]>(async (input) => setUser(await api.login(input)), [api]);
  const register = useCallback<AuthValue["register"]>(
    async (input) => setUser(await api.register(input)),
    [api],
  );
  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  }, [api]);
  const changePassword = useCallback<AuthValue["changePassword"]>((input) => api.changePassword(input), [api]);

  const value = useMemo<AuthValue>(
    () => ({ client: api, user, loading, login, register, logout, changePassword }),
    [api, user, loading, login, register, logout, changePassword],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
