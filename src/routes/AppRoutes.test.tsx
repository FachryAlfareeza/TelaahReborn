import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { createMockClient } from "../api/mockClient";
import { AuthProvider } from "../features/auth/AuthContext";
import { AppRoutes } from "./AppRoutes";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

function setup(path: string, signIn?: { email: string; password: string }) {
  const client = createMockClient({ storage: memoryStorage() });
  const ready = signIn ? client.login(signIn) : Promise.resolve();
  return ready.then(() =>
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={[path]}>
          <AuthProvider client={client}>
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  );
}

const satker = { email: "satker@contoh.test", password: "demo1234" };
const rocan = { email: "rocan@contoh.test", password: "demo1234" };
const admin = { email: "admin@contoh.test", password: "demo1234" };

afterEach(() => vi.unstubAllEnvs());

describe("rute dan menu per peran", () => {
  it("belum masuk diarahkan ke halaman masuk", async () => {
    await setup("/satker");
    expect(await screen.findByRole("heading", { name: "Masuk" })).toBeTruthy();
  });

  it("Satker melihat menu Satker saja", async () => {
    await setup("/", satker);
    expect(await screen.findByRole("heading", { name: "Beranda Satker" })).toBeTruthy();
    const nav = screen.getByRole("navigation", { name: "Menu utama" });
    expect(nav.textContent).toContain("Ajukan Baru");
    expect(nav.textContent).not.toContain("Dokumen Acuan");
    expect(nav.textContent).not.toContain("Master RO");
  });

  it("ROCAN melihat menu ROCAN tanpa menu pengelolaan", async () => {
    await setup("/", rocan);
    expect(await screen.findByRole("heading", { name: "Beranda ROCAN" })).toBeTruthy();
    const nav = screen.getByRole("navigation", { name: "Menu utama" });
    expect(nav.textContent).toContain("Dokumen Acuan");
    expect(nav.textContent).not.toContain("Akun Pengguna");
  });

  it("Super Admin melihat menu ROCAN ditambah pengelolaan", async () => {
    await setup("/", admin);
    await screen.findByRole("heading", { name: "Beranda ROCAN" });
    const nav = screen.getByRole("navigation", { name: "Menu utama" });
    for (const label of ["Dokumen Acuan", "Master RO", "Checklist", "Kategori", "Akun Pengguna"]) {
      expect(nav.textContent).toContain(label);
    }
  });

  it("peran tak berhak mendapat 403", async () => {
    await setup("/admin/ro", rocan);
    expect(await screen.findByRole("heading", { name: /403/ })).toBeTruthy();
    await setup("/rocan", satker);
    expect((await screen.findAllByRole("heading", { name: /403/ })).length).toBeGreaterThan(0);
  });

  it("alamat tak dikenal mendapat 404", async () => {
    await setup("/tidak-ada", rocan);
    expect(await screen.findByRole("heading", { name: /404/ })).toBeTruthy();
  });

  it("keluar mengembalikan ke halaman masuk", async () => {
    await setup("/", satker);
    await userEvent.click(await screen.findByRole("button", { name: /Keluar/ }));
    expect(await screen.findByRole("heading", { name: "Masuk" })).toBeTruthy();
  });
});

describe("masuk dan daftar", () => {
  it("tombol demo tampil dan memasukkan sesuai peran bila demo aktif", async () => {
    vi.stubEnv("VITE_SHOW_DEMO", "true");
    const { container } = await setup("/masuk");
    expect(container.querySelector('[data-demo="true"]')).not.toBeNull();
    await userEvent.click(await screen.findByRole("button", { name: /Masuk sebagai ROCAN/ }));
    expect(await screen.findByRole("heading", { name: "Beranda ROCAN" })).toBeTruthy();
  });

  it("tanpa tombol demo, formulir masuk tetap berfungsi", async () => {
    vi.stubEnv("VITE_SHOW_DEMO", "false");
    const { container } = await setup("/masuk");
    await screen.findByRole("heading", { name: "Masuk" });
    expect(container.querySelector("[data-demo]")).toBeNull();
    await userEvent.type(screen.getByLabelText("Email"), satker.email);
    await userEvent.type(screen.getByLabelText("Kata sandi"), satker.password);
    await userEvent.click(screen.getByRole("button", { name: "Masuk" }));
    expect(await screen.findByRole("heading", { name: "Beranda Satker" })).toBeTruthy();
  });

  it("kata sandi salah menampilkan pesan", async () => {
    await setup("/masuk");
    await userEvent.type(await screen.findByLabelText("Email"), satker.email);
    await userEvent.type(screen.getByLabelText("Kata sandi"), "salahsekali");
    await userEvent.click(screen.getByRole("button", { name: "Masuk" }));
    expect((await screen.findByRole("alert")).textContent).toContain("salah");
  });

  it("Satker dapat mendaftar sendiri", async () => {
    await setup("/masuk");
    await userEvent.click(await screen.findByRole("button", { name: /Daftar sebagai Satker/ }));
    await userEvent.type(screen.getByLabelText("Nama lengkap"), "Budi");
    await userEvent.type(screen.getByLabelText("Nama satker"), "Satker Baru");
    await userEvent.type(screen.getByLabelText("Email"), "budi@contoh.test");
    await userEvent.type(screen.getByLabelText(/Kata sandi/), "rahasia123");
    await userEvent.click(screen.getByRole("button", { name: "Daftar" }));
    expect(await screen.findByRole("heading", { name: "Beranda Satker" })).toBeTruthy();
  });

  it("ganti kata sandi lewat dialog", async () => {
    await setup("/", satker);
    await userEvent.click(await screen.findByRole("button", { name: /Ganti kata sandi/ }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(screen.getByLabelText("Kata sandi saat ini"), satker.password);
    await userEvent.type(screen.getByLabelText(/Kata sandi baru/), "baru12345");
    await userEvent.type(screen.getByLabelText("Ulangi kata sandi baru"), "baru12345");
    await userEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect((await screen.findByRole("status")).textContent).toContain("sudah diganti");
    expect(dialog).toBeTruthy();
  });
});
