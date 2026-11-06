import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { createMockClient, type MockOptions } from "../api/mockClient";
import { DEMO_PASSWORD, seedUsers } from "../api/mockData";
import { AuthProvider } from "../features/auth/AuthContext";
import { AppRoutes } from "../routes/AppRoutes";
import type { Role } from "../types";

export function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

export const nipOf = (role: Role) => seedUsers.find((u) => u.role === role)!.nip;

/** Klien mock baru dengan penyimpanan di memori, opsional sudah masuk sebagai peran tertentu. */
export async function mockClient(role?: Role, options: MockOptions = {}) {
  const client = createMockClient({ storage: memoryStorage(), ...options });
  if (role) await client.login({ nip: nipOf(role), password: DEMO_PASSWORD });
  return client;
}

/** Render seluruh aplikasi di alamat tertentu dengan klien mock. */
export async function setupApp(path: string, role?: Role, options: MockOptions = {}) {
  const client = await mockClient(role, options);
  const utils = render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider client={client}>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { client, ...utils };
}

export const pdf = (name: string, body = "%PDF-1.4 isi") => new File([body], name, { type: "application/pdf" });
