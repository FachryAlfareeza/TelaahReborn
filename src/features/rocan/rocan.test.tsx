import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupApp } from "../../test/setupApp";

describe("alur ROCAN", () => {
  it("beranda menampilkan antrean siap diverifikasi dan gagal", async () => {
    await setupApp("/rocan", "rocan");
    expect(await screen.findByRole("heading", { name: "Siap diverifikasi" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pemrosesan gagal" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buka Survei Keterbukaan Informasi 2026" })).toBeInTheDocument();
  });

  it("saring daftar pengajuan memakai query kontrak", async () => {
    await setupApp("/rocan/pengajuan", "rocan");
    await screen.findByRole("table", { name: "Semua pengajuan" });
    await userEvent.selectOptions(screen.getByLabelText("Status"), "gagal");
    await userEvent.click(screen.getByRole("button", { name: "Terapkan" }));
    await waitFor(() => expect(screen.getAllByRole("rowheader").map((r) => r.textContent)).toEqual(["Layanan Informasi Daerah"]));
  });

  it("review gagal bisa dijalankan ulang dan bukan kesimpulan reviu", async () => {
    await setupApp("/rocan/pengajuan/rr-gagal", "rocan", { processingMs: 60_000 });
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("bukan kesimpulan reviu");
    await userEvent.click(within(alert).getByRole("button", { name: "Jalankan ulang review" }));
    expect(await screen.findAllByText("Diproses AI")).not.toHaveLength(0);
  });

  it("verifikasi: ubah status butuh alasan, lalu finalisasi dengan konfirmasi", async () => {
    await setupApp("/rocan/pengajuan/rr-siap", "rocan");
    await screen.findByRole("heading", { name: "Screening 1: hasil per item" });
    expect(screen.getAllByText("Hasil AI (kandidat)").length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole("button", { name: "Ubah hasil I.F.1" }));
    const status = screen.getByLabelText("Status final");
    const current = (status as HTMLSelectElement).value;
    await userEvent.selectOptions(status, current === "Sesuai" ? "Tidak Sesuai atau perlu revisi" : "Sesuai");
    await userEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(await screen.findByText("Isi alasan perubahan status.")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Alasan perubahan/), "Tanda tangan ada di halaman 9");
    await userEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(await screen.findByText("Diubah ROCAN.")).toBeInTheDocument();
    // Alasan perubahan tercatat di riwayat.
    expect((await screen.findAllByText("Alasan: Tanda tangan ada di halaman 9")).length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole("radio", { name: "Minta revisi" }));
    await userEvent.click(screen.getByRole("button", { name: "Finalisasi" }));
    expect(await screen.findByText(/Tulis catatan/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Catatan/), "Lengkapi rincian lokasi.");
    await userEvent.click(screen.getByRole("button", { name: "Finalisasi" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Ya, finalisasi" }));
    expect(await screen.findByText("Difinalisasi")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ubah hasil/ })).toBeNull();
  });
});

describe("pengelolaan ROCAN", () => {
  it("checklist aktif tampil dan versi baru dapat dibuat dari salinan", async () => {
    await setupApp("/rocan/checklist", "rocan");
    expect(await screen.findByRole("heading", { name: "Checklist contoh 2026" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Buat versi baru" }));
    const name = screen.getByLabelText("Nama versi");
    await userEvent.clear(name);
    await userEvent.type(name, "Checklist 2027");
    await userEvent.click(screen.getByRole("button", { name: "Simpan versi baru" }));
    expect(await screen.findByRole("button", { name: "Checklist 2027" })).toBeInTheDocument();
  });

  it("dokumen acuan: unggah dengan metadata lalu masuk antrean ingestion", async () => {
    await setupApp("/rocan/acuan", "rocan");
    await screen.findByRole("table", { name: "Dokumen acuan" });
    await userEvent.upload(screen.getByLabelText("Berkas dokumen acuan"), new File(["%PDF-"], "rkp.pdf", { type: "application/pdf" }));
    await userEvent.type(screen.getByLabelText("Judul"), "RKP contoh 2027");
    await userEvent.selectOptions(screen.getByLabelText("Jenis dokumen"), "rkp");
    await userEvent.click(screen.getByRole("button", { name: "Unggah" }));
    expect(await screen.findByText(/Ingestion berjalan/)).toBeInTheDocument();
    expect(await screen.findByText("RKP contoh 2027")).toBeInTheDocument();
  });

  it("Master RO menampilkan dataset aktif per tahun", async () => {
    await setupApp("/rocan/master-ro", "rocan");
    const table = await screen.findByRole("table", { name: "Dataset Master RO" });
    expect(within(table).getAllByText("Aktif")).toHaveLength(2);
  });
});
