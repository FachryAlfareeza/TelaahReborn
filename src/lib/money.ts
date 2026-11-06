import { EMPTY_VALUE } from "./empty";

const numberFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** 1500000 menjadi "Rp 1.500.000". */
export function formatIdr(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return EMPTY_VALUE;
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}Rp ${numberFormat.format(Math.abs(rounded))}`;
}
