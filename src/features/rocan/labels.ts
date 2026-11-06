import type { Tone } from "../../components/tone";
import type { ReferenceDocType, ReferenceDocumentStatus, ReferenceTableType, Validity, VersionStatus } from "../../types";

export const docTypeLabel: Record<ReferenceDocType, string> = {
  rpjmn: "RPJMN",
  renstra: "Renstra",
  rkp: "RKP",
  sbm: "SBM",
  bas: "BAS",
  kepmen: "Kepmen",
  pmk: "PMK",
  perpres: "Perpres",
  pkpn: "PKPN",
  pn_sbpi: "PN/SBPI",
  lainnya: "Lainnya",
};

export const validityLabel: Record<Validity, string> = { berlaku: "Berlaku", draf: "Draf", historis: "Historis" };

export const docStatusLabel: Record<ReferenceDocumentStatus, string> = {
  pending: "Menunggu diproses",
  processing: "Sedang diproses",
  active: "Aktif",
  failed: "Gagal diproses",
  inactive: "Nonaktif",
};

export const docStatusTone: Record<ReferenceDocumentStatus, Tone> = {
  pending: "info",
  processing: "info",
  active: "success",
  failed: "error",
  inactive: "neutral",
};

export const tableTypeLabel: Record<ReferenceTableType, string> = {
  bas: "BAS (Bagan Akun Standar)",
  sbm: "SBM (Standar Biaya Masukan)",
};

/** Status versi berkas impor (tabel acuan, dataset Master RO). */
export const versionStatusLabel: Record<VersionStatus, string> = { draft: "Draf", active: "Aktif", superseded: "Digantikan" };
export const versionStatusTone: Record<VersionStatus, Tone> = { draft: "warning", active: "success", superseded: "neutral" };

/** Status pekerjaan latar (ekstraksi tabel, ekspor kurasi). */
export const jobStatusLabel = { pending: "Menunggu", processing: "Diproses", succeeded: "Selesai", failed: "Gagal" } as const;

/** Kolom minimum berkas impor (kontrak §3.9). */
export const requiredColumns: Record<ReferenceTableType, string> = {
  bas: "kode_akun, uraian, source_page",
  sbm: "kode, uraian, satuan, besaran, source_page",
};

export const tableName = (t: { table_type: ReferenceTableType; fiscal_year: number }) => `${t.table_type.toUpperCase()} ${t.fiscal_year}`;
