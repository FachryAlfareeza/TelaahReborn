import { describe, expect, it, vi } from "vitest";
import { ApiError } from "./client";
import { createRealClient, TOKEN_KEYS } from "./realClient";
import { memoryStorage } from "../test/setupApp";

const T = "2026-11-06T08:00:00+07:00";
const me = { id: "u", nip: "1990", nama: "A", email: null, role: "rocan", is_active: true, unit_eselon1: null, unit_eselon2: null, created_at: T, updated_at: T };
const tokens = (n: number) => ({ access_token: `a${n}`, refresh_token: `r${n}`, token_type: "bearer", expires_in: 1800 });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("klien API real", () => {
  it("masuk dengan NIP lewat /api/v1/auth/login lalu mengambil /auth/me dengan Bearer", async () => {
    const store = memoryStorage();
    const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith("/api/v1/auth/login")) {
        expect(JSON.parse(String(init?.body))).toEqual({ nip: "1990", password: "rahasia1" });
        return json(tokens(1));
      }
      if (u.endsWith("/api/v1/auth/me")) {
        expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer a1");
        return json(me);
      }
      return json({}, 404);
    });
    const client = createRealClient("https://api.contoh", fetchMock as typeof fetch, store);
    const user = await client.login({ nip: "1990", password: "rahasia1" });
    expect(user.nama).toBe("A");
    expect(store.getItem(TOKEN_KEYS.access)).toBe("a1");
    expect(store.getItem(TOKEN_KEYS.refresh)).toBe("r1");
  });

  it("memperbarui token sekali saat 401 lalu mengulang permintaan", async () => {
    const store = memoryStorage();
    store.setItem(TOKEN_KEYS.access, "lama");
    store.setItem(TOKEN_KEYS.refresh, "r0");
    const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith("/auth/refresh")) return json(tokens(2));
      const auth = new Headers(init?.headers).get("Authorization");
      return auth === "Bearer a2" ? json({ count: 3 }) : json({ detail: "Token kedaluwarsa" }, 401);
    });
    const client = createRealClient("", fetchMock as typeof fetch, store);
    await expect(client.getUnreadCount()).resolves.toBe(3);
    expect(store.getItem(TOKEN_KEYS.refresh)).toBe("r2");
  });

  it("menghapus token dan mengembalikan null sesi bila refresh gagal", async () => {
    const store = memoryStorage();
    store.setItem(TOKEN_KEYS.access, "lama");
    store.setItem(TOKEN_KEYS.refresh, "r0");
    const fetchMock = vi.fn(async () => json({ detail: "x" }, 401));
    const client = createRealClient("", fetchMock as typeof fetch, store);
    await expect(client.getSession()).resolves.toBeNull();
    expect(store.getItem(TOKEN_KEYS.access)).toBeNull();
  });

  it("memakai pesan detail Bahasa Indonesia dari server", async () => {
    const fetchMock = vi.fn(async () => json({ detail: "Status pengajuan tidak dapat difinalisasi" }, 409));
    const client = createRealClient("", fetchMock as typeof fetch, memoryStorage());
    const err = await client.finalize("rr", { decision: "selesai_disetujui", final_category: "K1" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe("CONFLICT");
    expect((err as ApiError).message).toBe("Status pengajuan tidak dapat difinalisasi");
  });

  it("413 menjadi TOO_LARGE", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 413 }));
    const client = createRealClient("", fetchMock as typeof fetch, memoryStorage());
    const err = await client.getReviewRequest("x").catch((e: unknown) => e);
    expect((err as ApiError).code).toBe("TOO_LARGE");
  });

  it("respons yang tidak sesuai kontrak ditolak tanpa crash", async () => {
    const fetchMock = vi.fn(async () => json([{ id: "rr", status: "ACCEPTED" }]));
    const client = createRealClient("", fetchMock as typeof fetch, memoryStorage());
    const err = await client.listReviewRequests().catch((e: unknown) => e);
    expect((err as ApiError).code).toBe("INVALID_RESPONSE");
  });

  it("mengirim saringan daftar sebagai query dan pengajuan sebagai multipart", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return json([]);
    });
    const client = createRealClient("", fetchMock as typeof fetch, memoryStorage());
    await client.listReviewRequests({ status: "gagal", fiscal_year: 2026, ro_code: "001" });
    expect(calls[0].url).toBe("/api/v1/review-requests?status=gagal&fiscal_year=2026&ro_code=001");

    await client
      .createReviewRequest({
        fiscal_year: 2026,
        master_ro_row_id: "row",
        title: "T",
        description: "D",
        proposal_category: "K2",
        tor_file: new File(["%PDF-"], "t.pdf", { type: "application/pdf" }),
        rab_file: new File(["%PDF-"], "r.pdf", { type: "application/pdf" }),
      })
      .catch(() => undefined);
    const body = calls[1].init?.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect([...body.keys()].sort()).toEqual(
      ["description", "fiscal_year", "master_ro_row_id", "proposal_category", "rab_file", "title", "tor_file"].sort(),
    );
  });
});
