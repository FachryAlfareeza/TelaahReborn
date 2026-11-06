/** Batas ukuran berkas pengajuan (PRD OQ-08: `MAX_FILE_SIZE_MB=20`). */
export const MAX_FILE_MB = 20;
/** Batas resubmisi per pengajuan (PRD OQ-08: `MAX_RESUBMISI=3`). */
export const MAX_RESUBMISSIONS = 3;

async function readHead(file: Blob, bytes: number): Promise<string> {
  const part = file.slice(0, bytes);
  if (typeof part.text === "function") return part.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(part);
  });
}

/**
 * Validasi PDF sesuai PRD §7.3 butir 8: ekstensi `.pdf`, MIME `application/pdf`, signature `%PDF-`,
 * tidak kosong, dan ukuran maksimum. Server tetap memvalidasi ulang.
 * Mengembalikan pesan galat, atau null bila berkas boleh dipakai.
 */
export async function validatePdf(file: File, maxSizeMb = MAX_FILE_MB): Promise<string | null> {
  if (!file.name.toLowerCase().endsWith(".pdf")) return "Berkas harus berekstensi .pdf.";
  if (file.type !== "application/pdf") return "Berkas harus bertipe PDF.";
  if (file.size === 0) return "Berkas kosong. Pilih berkas lain.";
  if (file.size > maxSizeMb * 1024 * 1024) return `Ukuran berkas melebihi ${maxSizeMb} MB.`;
  if ((await readHead(file, 5)) !== "%PDF-") return "Isi berkas bukan PDF yang sah.";
  return null;
}

/** Ukuran berkas dalam KB atau MB, format Indonesia. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB`;
}

/** Simpan Blob sebagai berkas di perangkat pengguna. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
