import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, type ApiClient } from "./client";
import { createApiClient } from "./index";
import { createMockClient } from "./mockClient";
import { createRealClient } from "./realClient";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    map,
  };
}

const pdf = (name: string) => new File(["%PDF-1.4"], name, { type: "application/pdf" });

async function expectApiError(p: Promise<unknown>, code: string) {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ApiError);
  expect((err as ApiError).code).toBe(code);
}

describe("klien mock: kontrak", () => {
  let storage: ReturnType<typeof memoryStorage>;
  let time: number;
  let client: ApiClient;

  beforeEach(() => {
    storage = memoryStorage();
    time = 1_000_000;
    client = createMockClient({ storage, processingMs: 5000, now: () => time });
  });

  it("menolak akses tanpa masuk", async () => {
    expect(await client.getSession()).toBeNull();
    await expectApiError(client.listSubmissions(), "UNAUTHENTICATED");
  });

  it("masuk, sesi, keluar, dan kata sandi salah", async () => {
    await expectApiError(client.login({ email: "satker@contoh.test", password: "salah" }), "UNAUTHENTICATED");
    const user = await client.login({ email: "satker@contoh.test", password: "demo1234" });
    expect(user.role).toBe("SATKER");
    expect(user).not.toHaveProperty("password");
    expect((await client.getSession())?.id).toBe(user.id);
    await client.logout();
    expect(await client.getSession()).toBeNull();
  });

  it("Satker mendaftar sendiri dan email ganda ditolak", async () => {
    const input = { name: "Budi", email: "Budi@contoh.test", password: "rahasia123", satkerName: "Satker B" };
    const user = await client.register(input);
    expect(user.role).toBe("SATKER");
    await expectApiError(client.register(input), "CONFLICT");
    await expectApiError(client.register({ ...input, email: "lain@contoh.test", password: "pendek" }), "INVALID_INPUT");
  });

  it("pengajuan baru: Terupload lalu Diperiksa, kode RO tetap string", async () => {
    await client.login({ email: "satker@contoh.test", password: "demo1234" });
    const created = await client.createSubmission({ roCode: "001", tor: pdf("tor.pdf"), rab: pdf("rab.pdf") });
    expect(created.status).toBe("PROCESSING");
    expect(created.roCode).toBe("001");
    expect((await client.getSubmission(created.id)).status).toBe("PROCESSING");
    time += 5000;
    expect((await client.getSubmission(created.id)).status).toBe("AWAITING_REVIEW");
  });

  it("menolak berkas bukan PDF dan RO tidak aktif", async () => {
    await client.login({ email: "satker@contoh.test", password: "demo1234" });
    const txt = new File(["x"], "tor.txt", { type: "text/plain" });
    await expectApiError(client.createSubmission({ roCode: "001", tor: txt, rab: pdf("rab.pdf") }), "INVALID_INPUT");
    await expectApiError(client.createSubmission({ roCode: "003", tor: pdf("t.pdf"), rab: pdf("r.pdf") }), "INVALID_INPUT");
  });

  it("Satker tidak melihat hasil AI dan tidak melihat pengajuan orang lain", async () => {
    await client.login({ email: "satker@contoh.test", password: "demo1234" });
    await expectApiError(client.getScreening1("s-contoh-1"), "FORBIDDEN");
    await expectApiError(client.getScreening2("s-contoh-1"), "FORBIDDEN");
    await client.register({ name: "Lain", email: "lain@contoh.test", password: "rahasia123", satkerName: "Satker L" });
    expect(await client.listSubmissions()).toEqual([]);
    await expectApiError(client.getSubmission("s-contoh-1"), "NOT_FOUND");
  });

  it("ROCAN melihat Screening 1 dan 2 lalu memutuskan", async () => {
    await client.login({ email: "rocan@contoh.test", password: "demo1234" });
    const s1 = await client.getScreening1("s-contoh-1");
    expect(s1.items[0].children).toHaveLength(6);
    const s2 = await client.getScreening2("s-contoh-1");
    expect(s2.category).toBe(2);
    await expectApiError(client.saveDecision({ submissionId: "s-contoh-1", decision: "REJECTED", note: " " }), "INVALID_INPUT");
    const d = await client.saveDecision({ submissionId: "s-contoh-1", decision: "ACCEPTED", note: "Baik" });
    expect(d.decidedBy).toBe("Contoh ROCAN");
    expect((await client.getSubmission("s-contoh-1")).status).toBe("ACCEPTED");
    expect((await client.getDecision("s-contoh-1"))?.decision).toBe("ACCEPTED");
    await expectApiError(client.saveDecision({ submissionId: "s-contoh-1", decision: "ACCEPTED", note: "" }), "CONFLICT");
  });

  it("Super Admin tidak dapat menetapkan keputusan", async () => {
    await client.login({ email: "admin@contoh.test", password: "demo1234" });
    await expectApiError(client.saveDecision({ submissionId: "s-contoh-1", decision: "ACCEPTED", note: "" }), "FORBIDDEN");
  });

  it("data localStorage rusak tidak membuat crash", async () => {
    storage.setItem("telaah-mock-db", "{bukan json");
    const user = await client.login({ email: "rocan@contoh.test", password: "demo1234" });
    expect(user.role).toBe("ROCAN");
    storage.setItem("telaah-mock-db", JSON.stringify({ users: "salah" }));
    expect((await client.listSubmissions()).length).toBe(1);
  });
});

describe("klien real: respons buruk gagal tanpa crash", () => {
  const reply = (body: unknown, status = 200) =>
    (async () =>
      new Response(typeof body === "string" ? body : JSON.stringify(body), { status })) as unknown as typeof fetch;

  it("respons valid diterima", async () => {
    const c = createRealClient("http://api.test/", reply([{ code: "001", description: "RO", active: true }]));
    expect((await c.listRos())[0].code).toBe("001");
  });

  it("bidang tak dikenal ditolak dengan pesan jelas", async () => {
    const c = createRealClient("http://api.test", reply([{ code: "001", description: "RO", active: true, ekstra: 1 }]));
    const err = await c.listRos().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe("INVALID_RESPONSE");
    expect((err as ApiError).message).toContain("Bidang tidak dikenal");
  });

  it("kode angka (bukan string) ditolak", async () => {
    const c = createRealClient("http://api.test", reply([{ code: 1, description: "RO", active: true }]));
    await expectApiError(c.listRos(), "INVALID_RESPONSE");
  });

  it("bukan JSON, galat HTTP, dan jaringan putus", async () => {
    await expectApiError(createRealClient("http://api.test", reply("<html>")).listRos(), "INVALID_RESPONSE");
    await expectApiError(createRealClient("http://api.test", reply({}, 500)).listRos(), "SERVER");
    await expectApiError(createRealClient("http://api.test", reply({}, 403)).listRos(), "FORBIDDEN");
    const down = (async () => {
      throw new TypeError("gagal");
    }) as unknown as typeof fetch;
    await expectApiError(createRealClient("http://api.test", down).listRos(), "NETWORK");
  });

  it("sesi kosong bila 401", async () => {
    expect(await createRealClient("http://api.test", reply({}, 401)).getSession()).toBeNull();
  });
});

describe("pemilihan adapter", () => {
  it("VITE_API_MODE memilih adapter", () => {
    expect(createApiClient("real", "http://api.test").mode).toBe("real");
    expect(createApiClient("mock").mode).toBe("mock");
    expect(createApiClient(undefined).mode).toBe("mock");
  });
});
