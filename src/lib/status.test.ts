import { describe, expect, it } from "vitest";
import { canRetryReview, getStatusLabel, REQUEST_STATUSES, statusOptions } from "./status";
import { validatePdf } from "./files";

describe("pemetaan status per peran", () => {
  it("ROCAN melihat enam status berbeda", () => {
    const labels = REQUEST_STATUSES.map((s) => getStatusLabel(s, "rocan"));
    expect(new Set(labels).size).toBe(6);
    expect(getStatusLabel("gagal", "rocan")).toBe("Pemrosesan gagal");
  });

  it("Satker tidak melihat kegagalan teknis sebagai kesimpulan", () => {
    expect(getStatusLabel("gagal", "satker")).toBe(getStatusLabel("dalam_proses", "satker"));
    expect(getStatusLabel("siap_diverifikasi", "satker")).toBe("Diperiksa ROCAN");
    expect(statusOptions("satker").map((o) => o.label)).not.toContain("Pemrosesan gagal");
  });

  it("keputusan akhir sama untuk semua peran", () => {
    expect(getStatusLabel("selesai_disetujui", "satker")).toBe("Disetujui");
    expect(getStatusLabel("selesai_revisi", "rocan")).toBe("Perlu revisi");
  });

  it("jalankan ulang hanya ROCAN dari status gagal", () => {
    expect(canRetryReview("gagal", "rocan")).toBe(true);
    expect(canRetryReview("gagal", "satker")).toBe(false);
    expect(canRetryReview("siap_diverifikasi", "rocan")).toBe(false);
  });
});

describe("validasi PDF (PRD §7.3)", () => {
  const file = (body: string, name = "a.pdf", type = "application/pdf") => new File([body], name, { type });
  it("menerima PDF sah", async () => {
    await expect(validatePdf(file("%PDF-1.7 isi"))).resolves.toBeNull();
  });
  it("memeriksa ekstensi, MIME, isi kosong, signature, dan ukuran", async () => {
    await expect(validatePdf(file("%PDF-", "a.txt"))).resolves.toContain(".pdf");
    await expect(validatePdf(file("%PDF-", "a.pdf", "text/plain"))).resolves.toContain("PDF");
    await expect(validatePdf(file(""))).resolves.toContain("kosong");
    await expect(validatePdf(file("bukan pdf"))).resolves.toContain("bukan PDF");
    await expect(validatePdf(file("%PDF-" + "x".repeat(2 * 1024 * 1024)), 1)).resolves.toContain("1 MB");
  });
});
