import { getStatusLabel } from "../../lib/status";
import type { Role, Submission } from "../../types";

export type SubmissionFilters = {
  /** Label status menurut peran ROCAN, kosong = semua. */
  status: string;
  roCode: string;
  /** Sebagian nama satker, tanpa membedakan huruf besar kecil. */
  satker: string;
  /** Tanggal ISO (yyyy-mm-dd), kosong = tanpa batas. */
  from: string;
  to: string;
};

export const emptyFilters: SubmissionFilters = { status: "", roCode: "", satker: "", from: "", to: "" };

/** Tanggal kirim (ISO) dibandingkan sebagai tanggal WIB agar sesuai dengan yang tampil di layar. */
function wibDate(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  return new Date(t.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

export function filterSubmissions(rows: Submission[], f: SubmissionFilters, role: Role): Submission[] {
  const satker = f.satker.trim().toLowerCase();
  return rows.filter((s) => {
    if (f.status && getStatusLabel(s.status, role) !== f.status) return false;
    if (f.roCode && s.roCode !== f.roCode) return false;
    if (satker && !s.satkerName.toLowerCase().includes(satker)) return false;
    const day = wibDate(s.submittedAt);
    if (f.from && (!day || day < f.from)) return false;
    if (f.to && (!day || day > f.to)) return false;
    return true;
  });
}
