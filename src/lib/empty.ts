/** Tanda untuk nilai yang tidak diketahui. Jangan mengarang nilai. */
export const EMPTY_VALUE = "—";

/** `null`, `undefined`, atau teks kosong tampil sebagai "—". Teks lain apa adanya (kode tetap string). */
export function displayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return EMPTY_VALUE;
  const text = String(value);
  return text.trim() === "" ? EMPTY_VALUE : text;
}
