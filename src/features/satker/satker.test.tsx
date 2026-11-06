import { beforeAll, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { pdf, setupApp } from "../../test/setupApp";

beforeAll(() => {
  // jsdom tidak menyediakan pembuat URL berkas.
  URL.createObjectURL = vi.fn(() => "blob:contoh");
  URL.revokeObjectURL = vi.fn();
});

describe("alur Satker", () => {
  it("beranda menampilkan ringkasan dengan label Satker", async () => {
    await setupApp("/satker", "satker");
    const summary = await screen.findByRole("list", { name: "Ringkasan pengajuan" });
    expect(within(summary).getByText("Perlu revisi")).toBeInTheDocument();
    expect(summary.textContent).not.toContain("Pemrosesan gagal");
  });

  it("Kirim tanpa isian menampilkan daftar yang harus dilengkapi", async () => {
    await setupApp("/satker/ajukan", "satker");
    await userEvent.click(await screen.findByRole("button", { name: "Kirim" }));
    const alert = await screen.findByRole("alert");
    for (const text of ["tahun anggaran", "Rincian Output", "judul", "deskripsi", "kategori", "TOR", "RAB"]) {
      expect(alert.textContent).toContain(text);
    }
  });

  it("dropdown bertingkat, unit dan prioritas read-only, lalu kirim memicu reviu", async () => {
    await setupApp("/satker/ajukan", "satker", { processingMs: 60_000 });
    await userEvent.selectOptions(await screen.findByLabelText("Tahun anggaran"), "2026");
    const program = screen.getByLabelText("Program");
    await waitFor(() => expect(within(program).getAllByRole("option").length).toBeGreaterThan(1));
    await userEvent.selectOptions(program, "059.GH");
    const activity = screen.getByLabelText("Kegiatan");
    await waitFor(() => expect(within(activity).getAllByRole("option").length).toBeGreaterThan(1));
    // Kegiatan milik unit lain tidak ditawarkan.
    expect(within(activity).queryByRole("option", { name: /4512/ })).toBeNull();
    await userEvent.selectOptions(activity, "4511");
    const kro = screen.getByLabelText("Klasifikasi Rincian Output (KRO)");
    await waitFor(() => expect(within(kro).getAllByRole("option").length).toBeGreaterThan(1));
    await userEvent.selectOptions(kro, "PBM");
    const ro = screen.getByLabelText("Rincian Output (RO)");
    await waitFor(() => expect(within(ro).getAllByRole("option").length).toBeGreaterThan(1));
    await userEvent.selectOptions(ro, within(ro).getByRole("option", { name: /^001/ }));
    expect(screen.getByText("Prioritas Nasional")).toBeInTheDocument();
    expect(screen.getByText("Unit Eselon II").nextElementSibling).toHaveTextContent("Direktorat Contoh Informasi Publik");

    await userEvent.type(screen.getByLabelText("Judul atau nama usulan"), "Survei baru");
    await userEvent.type(screen.getByLabelText("Deskripsi"), "Uraian survei");
    await userEvent.click(screen.getByRole("radio", { name: "K2 RO Prioritas Strategis" }));
    await userEvent.upload(screen.getByLabelText("Berkas TOR (PDF)"), pdf("tor.pdf"));
    await userEvent.upload(screen.getByLabelText("Berkas RAB (PDF)"), pdf("rab.pdf"));
    await waitFor(() => expect(screen.getByText("rab.pdf")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Kirim" }));

    expect(await screen.findByRole("heading", { name: "Survei baru" })).toBeInTheDocument();
    expect(screen.getAllByText("Sedang direviu").length).toBeGreaterThan(0);
    expect(await screen.findByRole("list", { name: "Tahap review" })).toBeInTheDocument();
  });

  it("pengajuan siap diverifikasi tidak memperlihatkan hasil AI ke Satker", async () => {
    await setupApp("/satker/pengajuan/rr-siap", "satker");
    expect(await screen.findByText("Reviu otomatis selesai dan sedang diperiksa ROCAN.")).toBeInTheDocument();
    expect(screen.queryByText("Hasil AI (kandidat)")).toBeNull();
  });

  it("pengajuan gagal tampil sebagai sedang direviu bagi Satker", async () => {
    await setupApp("/satker/pengajuan/rr-gagal", "satker");
    await screen.findByRole("heading", { name: "Layanan Informasi Daerah" });
    expect(screen.queryByText(/gagal/i)).toBeNull();
  });

  it("hasil final dan formulir revisi tampil untuk pengajuan perlu revisi", async () => {
    await setupApp("/satker/pengajuan/rr-revisi", "satker", { processingMs: 60_000 });
    expect(await screen.findByText("Keputusan ROCAN")).toBeInTheDocument();
    expect(screen.getByText("Kategori final").nextElementSibling).toHaveTextContent("K2 RO Prioritas Strategis");
    const submit = screen.getByRole("button", { name: "Kirim revisi" });
    await userEvent.click(submit);
    expect(await screen.findByRole("alert")).toHaveTextContent("TOR dan RAB");
    await userEvent.upload(screen.getByLabelText("TOR revisi (PDF)"), pdf("tor2.pdf"));
    await userEvent.upload(screen.getByLabelText("RAB revisi (PDF)"), pdf("rab2.pdf"));
    await waitFor(() => expect(screen.getByText("rab2.pdf")).toBeInTheDocument());
    await userEvent.click(submit);
    expect(await screen.findByText("Versi 2 (halaman ini)")).toBeInTheDocument();
  });
});
