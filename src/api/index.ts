import type { ApiClient } from "./client";
import { createMockClient } from "./mockClient";
import { createRealClient } from "./realClient";

export * from "./client";

/** Memilih adapter dari VITE_API_MODE. Nilai tak dikenal dianggap mock. */
export function createApiClient(
  mode: string | undefined = import.meta.env.VITE_API_MODE,
  url: string | undefined = import.meta.env.VITE_API_URL,
): ApiClient {
  if (mode === "real") return createRealClient(url ?? "");
  return createMockClient();
}

let instance: ApiClient | null = null;

/** Satu klien untuk seluruh aplikasi. Komponen tidak boleh membuat klien sendiri. */
export function getApiClient(): ApiClient {
  instance ??= createApiClient();
  return instance;
}
