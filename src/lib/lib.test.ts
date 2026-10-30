import { describe, expect, it } from "vitest";
import { formatDate } from "./date";
import { displayValue, EMPTY_VALUE } from "./empty";
import { formatIdr } from "./money";

describe("formatIdr", () => {
  it("memformat rupiah dengan titik ribuan", () => {
    expect(formatIdr(1500000)).toBe("Rp 1.500.000");
    expect(formatIdr(0)).toBe("Rp 0");
  });
  it("membulatkan ke rupiah penuh dan menangani negatif", () => {
    expect(formatIdr(1234.6)).toBe("Rp 1.235");
    expect(formatIdr(-2500)).toBe("-Rp 2.500");
  });
  it("menampilkan — untuk nilai tidak diketahui", () => {
    expect(formatIdr(null)).toBe(EMPTY_VALUE);
    expect(formatIdr(undefined)).toBe(EMPTY_VALUE);
    expect(formatIdr(Number.NaN)).toBe(EMPTY_VALUE);
  });
});

describe("formatDate", () => {
  it("menampilkan tanggal ISO tanpa bergeser zona waktu", () => {
    expect(formatDate("2025-03-05")).toBe("5 Maret 2025");
    expect(formatDate("2025-12-31")).toBe("31 Desember 2025");
  });
  it("menampilkan tanggal dan jam dalam WIB", () => {
    expect(formatDate("2025-03-05T07:30:00Z")).toBe("5 Maret 2025, 14:30 WIB");
  });
  it("menampilkan — untuk kosong atau tidak valid", () => {
    expect(formatDate(null)).toBe(EMPTY_VALUE);
    expect(formatDate("")).toBe(EMPTY_VALUE);
    expect(formatDate("bukan tanggal")).toBe(EMPTY_VALUE);
  });
});

describe("displayValue", () => {
  it("mengubah null dan teks kosong menjadi —", () => {
    expect(displayValue(null)).toBe(EMPTY_VALUE);
    expect(displayValue(undefined)).toBe(EMPTY_VALUE);
    expect(displayValue("  ")).toBe(EMPTY_VALUE);
  });
  it("menjaga nol di depan pada kode", () => {
    expect(displayValue("007")).toBe("007");
    expect(displayValue("054.01")).toBe("054.01");
  });
});
