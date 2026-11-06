import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupApp, nipOf } from "../test/setupApp";
import { DEMO_PASSWORD } from "../api/mockData";

describe("rute dan menu per peran (PRD §5)", () => {
  it("belum masuk diarahkan ke halaman masuk dengan NIP, tanpa pendaftaran mandiri", async () => {
    await setupApp("/satker");
    expect(await screen.findByRole("heading", { name: "Masuk" })).toBeInTheDocument();
    expect(screen.getByLabelText("NIP")).toBeInTheDocument();
    expect(screen.queryByText(/Daftar/)).toBeNull();
  });

  it("masuk dengan NIP mengarah ke beranda peran", async () => {
    await setupApp("/masuk");
    await userEvent.type(await screen.findByLabelText("NIP"), nipOf("satker"));
    await userEvent.type(screen.getByLabelText("Kata sandi"), DEMO_PASSWORD);
    await userEvent.click(screen.getByRole("button", { name: "Masuk" }));
    expect(await screen.findByRole("heading", { name: "Beranda Satker" })).toBeInTheDocument();
  });

  it("Satker hanya melihat menu Satker", async () => {
    await setupApp("/", "satker");
    await screen.findByRole("heading", { name: "Beranda Satker" });
    const nav = screen.getByRole("navigation", { name: "Menu utama" });
    expect(nav.textContent).toContain("Ajukan Baru");
    expect(nav.textContent).not.toContain("Checklist");
  });

  it("ROCAN mengelola checklist, acuan (dokumen dan tabel), Master RO, dan kurasi", async () => {
    await setupApp("/", "rocan");
    await screen.findByRole("heading", { name: "Beranda ROCAN" });
    const nav = screen.getByRole("navigation", { name: "Menu utama" });
    for (const label of ["Checklist", "Acuan", "Master RO", "Kurasi Data"]) {
      expect(nav.textContent).toContain(label);
    }
    expect(nav.textContent).not.toContain("Akun Pengguna");
  });

  it("Super Admin hanya mengelola akun", async () => {
    await setupApp("/", "super_admin");
    expect(await screen.findByRole("heading", { name: "Akun Pengguna" })).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Menu utama" });
    expect(nav.textContent).not.toContain("Daftar Pengajuan");
    expect(nav.textContent).not.toContain("Checklist");
  });

  it("peran tak berhak mendapat 403", async () => {
    await setupApp("/rocan/checklist", "super_admin");
    expect(await screen.findByRole("heading", { name: /403/ })).toBeInTheDocument();
  });

  it("alamat tak dikenal mendapat 404", async () => {
    await setupApp("/tidak-ada", "rocan");
    expect(await screen.findByRole("heading", { name: /404/ })).toBeInTheDocument();
  });
});
