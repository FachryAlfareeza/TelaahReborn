import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupApp } from "../../test/setupApp";
import { createRealClient } from "../../api/realClient";
import { memoryStorage } from "../../test/setupApp";

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
    await userEvent.click(screen.getByRole("button", { name: /Saringan/ }));
    await userEvent.selectOptions(screen.getByLabelText("Status"), "gagal");
    await userEvent.click(screen.getByRole("button", { name: "Terapkan" }));
    await waitFor(() => expect(screen.getAllByRole("rowheader").map((r) => r.textContent)).toEqual(["Layanan Informasi Daerah"]));
  });

  it("kartu status menyaring daftar pengajuan", async () => {
    await setupApp("/rocan/pengajuan", "rocan");
    await screen.findByRole("table", { name: "Semua pengajuan" });
    await userEvent.click(await screen.findByRole("button", { name: /Pemrosesan gagal/ }));
    await waitFor(() => expect(screen.getAllByRole("rowheader").map((r) => r.textContent)).toEqual(["Layanan Informasi Daerah"]));
  });

  it("review gagal bisa dijalankan ulang dan bukan kesimpulan reviu", async () => {
    await setupApp("/rocan/pengajuan/rr-gagal", "rocan", { processingMs: 60_000 });
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("bukan kesimpulan reviu");
    await userEvent.click(within(alert).getByRole("button", { name: "Jalankan ulang review" }));
    expect(await screen.findAllByText("Diproses AI")).not.toHaveLength(0);
  });

  it("verifikasi inline: ubah beberapa item, alasan wajib, simpan sekaligus, lalu finalisasi", async () => {
    await setupApp("/rocan/pengajuan/rr-siap", "rocan");
    await screen.findByRole("heading", { name: "Screening 1: hasil per item" });
    expect(screen.getAllByText("Hasil AI (kandidat)").length).toBeGreaterThan(0);

    const status = (await screen.findByLabelText("Hasil final I.F.1")) as HTMLSelectElement;
    const original = status.value;
    await userEvent.selectOptions(status, original === "Sesuai" ? "Tidak Sesuai atau perlu revisi" : "Sesuai");
    // Item lain: hanya penjelasan, alasan tidak wajib.
    const explanation = screen.getAllByLabelText(/^Penjelasan /).find((el) => el.getAttribute("aria-label") !== "Penjelasan I.F.1")!;
    await userEvent.type(explanation, " Ditambah ROCAN.");
    expect(screen.getByText("2 perubahan belum disimpan")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Simpan semua (2)" }));
    expect(await screen.findByText("Isi alasan perubahan status.")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Alasan perubahan I.F.1"), "Tanda tangan ada di halaman 9");
    await userEvent.click(screen.getByRole("button", { name: "Simpan semua (2)" }));
    expect(await screen.findByText("2 perubahan disimpan.")).toBeInTheDocument();
    expect(screen.getAllByText("Diubah ROCAN").length).toBeGreaterThan(1);

    // Riwayat mencatat alasan.
    await userEvent.click(screen.getByRole("tab", { name: /Riwayat/ }));
    expect((await screen.findAllByText("Alasan: Tanda tangan ada di halaman 9")).length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole("button", { name: "Keputusan ROCAN" }));
    const drawer = await screen.findByRole("dialog", { name: "Keputusan ROCAN" });
    await userEvent.click(within(drawer).getByRole("radio", { name: "Minta revisi" }));
    await userEvent.click(within(drawer).getByRole("button", { name: "Finalisasi" }));
    expect(await within(drawer).findByText(/Tulis catatan/)).toBeInTheDocument();
    await userEvent.type(within(drawer).getByLabelText(/Catatan/), "Lengkapi rincian lokasi.");
    await userEvent.click(within(drawer).getByRole("button", { name: "Finalisasi" }));
    const confirm = await screen.findByRole("dialog", { name: /Finalisasi:/ });
    await userEvent.click(within(confirm).getByRole("button", { name: "Ya, finalisasi" }));
    expect(await screen.findByText("Difinalisasi")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByLabelText("Hasil final I.F.1")).toBeNull());
  });

  it("bisa mundur: kembalikan ke hasil AI dan pulihkan nilai dari riwayat", async () => {
    await setupApp("/rocan/pengajuan/rr-siap", "rocan");
    const status = (await screen.findByLabelText("Hasil final I.F.1")) as HTMLSelectElement;
    const original = status.value;
    const other = original === "Sesuai" ? "Tidak Sesuai atau perlu revisi" : "Sesuai";
    await userEvent.selectOptions(status, other);
    await userEvent.type(screen.getByLabelText("Alasan perubahan I.F.1"), "Salah baca");
    await userEvent.click(screen.getByRole("button", { name: "Simpan semua (1)" }));
    await screen.findByText("1 perubahan disimpan.");
    await waitFor(() => expect((screen.getByLabelText("Hasil final I.F.1") as HTMLSelectElement).value).toBe(other));

    // Kembalikan ke hasil AI (alasan terisi otomatis), lalu simpan.
    await userEvent.click(screen.getByRole("button", { name: "Kembalikan I.F.1 ke hasil AI" }));
    expect((screen.getByLabelText("Alasan perubahan I.F.1") as HTMLInputElement).value).toBe("Dikembalikan ke hasil AI");
    await userEvent.click(screen.getByRole("button", { name: "Simpan semua (1)" }));
    await waitFor(() => expect((screen.getByLabelText("Hasil final I.F.1") as HTMLSelectElement).value).toBe(original));

    // Pulihkan nilai lama dari riwayat menjadi draf; batalkan draf mengembalikan nilai tersimpan.
    await userEvent.click(screen.getByRole("tab", { name: /Riwayat/ }));
    const restore = await screen.findAllByRole("button", { name: /Pulihkan Status I\.F\.1/ });
    await userEvent.click(restore[0]);
    expect(await screen.findByText("1 perubahan belum disimpan")).toBeInTheDocument();
    expect((screen.getByLabelText("Hasil final I.F.1") as HTMLSelectElement).value).toBe(other);
    await userEvent.click(screen.getByRole("button", { name: "Batalkan draf I.F.1" }));
    expect((screen.getByLabelText("Hasil final I.F.1") as HTMLSelectElement).value).toBe(original);
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

  it("acuan: unggah dokumen dari laci lalu masuk antrean ingestion, tanpa kolom potongan", async () => {
    await setupApp("/rocan/acuan", "rocan");
    const table = await screen.findByRole("table", { name: "Dokumen acuan" });
    expect(within(table).queryByText(/Potongan/i)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Unggah dokumen" }));
    await userEvent.upload(screen.getByLabelText("Berkas dokumen acuan"), new File(["%PDF-"], "rkp.pdf", { type: "application/pdf" }));
    await userEvent.type(screen.getByLabelText("Judul"), "RKP contoh 2027");
    await userEvent.selectOptions(screen.getByLabelText("Jenis dokumen"), "rkp");
    await userEvent.click(screen.getByRole("button", { name: "Unggah" }));
    expect(await screen.findByText(/Ingestion berjalan/)).toBeInTheDocument();
    expect(await screen.findByText("RKP contoh 2027")).toBeInTheDocument();
  });

  it("acuan: memilih dokumen menampilkan rincian dan tabel BAS/SBM-nya", async () => {
    await setupApp("/rocan/acuan", "rocan");
    const table = await screen.findByRole("table", { name: "Dokumen acuan" });
    const first = within(table).getAllByRole("rowheader")[0];
    await userEvent.click(within(first).getByRole("button"));
    expect(await screen.findByRole("heading", { name: "Tabel BAS/SBM dari dokumen ini" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Buat tabel/ })).toBeInTheDocument();
  });

  it("alamat tabel acuan lama diarahkan ke halaman Acuan", async () => {
    await setupApp("/rocan/tabel-acuan", "rocan");
    expect(await screen.findByRole("heading", { name: "Acuan" })).toBeInTheDocument();
  });

  it("Master RO menampilkan dataset aktif per tahun", async () => {
    await setupApp("/rocan/master-ro", "rocan");
    const table = await screen.findByRole("table", { name: "Dataset Master RO" });
    expect(within(table).getAllByText("Aktif")).toHaveLength(2);
  });
});

describe("pratinjau dokumen acuan di mode real", () => {
  it("menolak dengan pesan jelas karena kontrak belum punya endpoint berkas", async () => {
    const client = createRealClient("http://contoh.test", fetch, memoryStorage());
    await expect(client.getReferenceDocumentFile("rd-1")).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });
});
