import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "../../api";
import { createMockClient } from "../../api/mockClient";
import { AppRoutes } from "../../routes/AppRoutes";
import { AuthProvider } from "../auth/AuthContext";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

async function setup(path: string, processingMs = 8000) {
  const client = createMockClient({ storage: memoryStorage(), processingMs });
  await client.login({ email: "satker@contoh.test", password: "demo1234" });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider client={client}>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}

const pdf = (name: string) => new File(["%PDF-1.4 isi"], name, { type: "application/pdf" });

beforeAll(() => {
  // jsdom tidak menyediakan pembuat URL berkas.
  URL.createObjectURL = vi.fn(() => "blob:contoh");
  URL.revokeObjectURL = vi.fn();
});

describe("alur Satker", () => {
  it("beranda menampilkan ringkasan dengan label Satker", async () => {
    await setup("/satker");
    await screen.findByRole("heading", { name: "Ringkasan pengajuan" });
    for (const label of ["Terupload", "Diperiksa", "Diterima", "Ditolak"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.queryByText("Menunggu Pemeriksaan")).toBeNull();
  });

  it("Kirim tanpa isian menampilkan pesan, bukan mengirim", async () => {
    await setup("/satker/ajukan");
    await userEvent.click(await screen.findByRole("button", { name: "Kirim" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Pilih Rincian Output");
    expect(alert.textContent).toContain("TOR");
    expect(alert.textContent).toContain("RAB");
  });

  it("berkas bukan PDF ditolak", async () => {
    await setup("/satker/ajukan");
    const input = await screen.findByLabelText("Berkas TOR (PDF)");
    await userEvent.upload(input, new File(["x"], "catatan.txt", { type: "text/plain" }), { applyAccept: false });
    expect((await screen.findByText(/harus berformat PDF/)).textContent).toBeTruthy();
  });

  it("pengajuan bergerak dari Terupload ke Diperiksa dan Satker tidak melihat bukti AI", async () => {
    const client = await setup("/satker/ajukan", 1500);
    await userEvent.selectOptions(await screen.findByLabelText("Rincian Output (RO)"), "001");
    await userEvent.upload(screen.getByLabelText("Berkas TOR (PDF)"), pdf("tor.pdf"));
    await userEvent.upload(screen.getByLabelText("Berkas RAB (PDF)"), pdf("rab.pdf"));
    expect(screen.getByText(/Pratinjau TOR/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Kirim" }));

    expect(await screen.findByRole("heading", { name: "Detail Pengajuan" })).toBeTruthy();
    expect(await screen.findByText("Terupload")).toBeTruthy();
    // Polling berkala memperbarui status tanpa aksi tambahan.
    expect(await screen.findByText("Diperiksa", {}, { timeout: 8000 })).toBeTruthy();

    const text = document.body.textContent ?? "";
    for (const forbidden of ["Hasil AI", "kandidat", "Kutipan", "INSUFFICIENT", "JSON", "Screening"]) {
      expect(text).not.toContain(forbidden);
    }
    await expect(client.getScreening1("s-contoh-1")).rejects.toBeInstanceOf(ApiError);
    await expect(client.getScreening2("s-contoh-1")).rejects.toMatchObject({ code: "FORBIDDEN" });
  }, 15000);

  it("daftar pengajuan dapat disaring menurut status", async () => {
    await setup("/satker/pengajuan");
    await screen.findByRole("table");
    await userEvent.selectOptions(screen.getByLabelText("Tampilkan status"), "Diterima");
    expect(await screen.findByText("Belum ada pengajuan berstatus Diterima")).toBeTruthy();
    await userEvent.selectOptions(screen.getByLabelText("Tampilkan status"), "Diperiksa");
    expect(await screen.findByRole("table")).toBeTruthy();
  });
});
