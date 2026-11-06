import { useId, useState, type FormEvent } from "react";
import {
  useActivateReferenceTable,
  useImportReferenceTable,
  useReferenceDocuments,
  useReferenceTableRows,
  useReferenceTables,
  useStartTableExtraction,
  useTableExtraction,
} from "../../api/queries";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { DataTable, type Column } from "../../components/DataTable";
import { ErrorState } from "../../components/ErrorState";
import { errorText, Feedback, Field } from "../../components/form";
import { LoadingState } from "../../components/LoadingState";
import { Section } from "../../components/Section";
import { UploadDropzone } from "../../components/UploadDropzone";
import { useAuth } from "../auth/authState";
import { formatDate } from "../../lib/date";
import { saveBlob, validatePdf } from "../../lib/files";
import { formatIdr } from "../../lib/money";
import type { ReferenceTableRow, ReferenceTableType, ReferenceTableVersion, VersionStatus } from "../../types";

const typeLabel: Record<ReferenceTableType, string> = { bas: "BAS (Bagan Akun Standar)", sbm: "SBM (Standar Biaya Masukan)" };
const statusLabel: Record<VersionStatus, string> = { draft: "Draf", active: "Aktif", superseded: "Digantikan" };
const extractionLabel = { pending: "Menunggu", processing: "Diproses", succeeded: "Selesai", failed: "Gagal" } as const;
/** Kolom minimum berkas impor (kontrak §3.9, usulan). */
const requiredColumns: Record<ReferenceTableType, string> = {
  bas: "kode_akun, uraian, source_page",
  sbm: "kode, uraian, satuan, besaran, source_page",
};

async function validateTableFile(file: File): Promise<string | null> {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".csv") && !name.endsWith(".xlsx")) return "Berkas harus .csv atau .xlsx.";
  if (file.size === 0) return "Berkas kosong. Pilih berkas lain.";
  return null;
}

/** Langkah 1: ekstraksi tabel kandidat dari PDF sumber lewat Docling. */
function ExtractionStep({ onExtracted }: { onExtracted: (id: string) => void }) {
  const { client } = useAuth();
  const start = useStartTableExtraction();
  const docs = useReferenceDocuments();
  const ids = { type: useId(), year: useId(), doc: useId(), from: useId(), to: useId() };
  const [type, setType] = useState<ReferenceTableType>("sbm");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [docId, setDocId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [extractionId, setExtractionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const extraction = useTableExtraction(extractionId);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file && !docId) return setError("Pilih dokumen acuan atau unggah PDF sumber.");
    if (!/^\d{4}$/.test(year)) return setError("Isi tahun anggaran (4 angka).");
    setError(null);
    try {
      const res = await start.mutateAsync({
        table_type: type,
        fiscal_year: Number(year),
        file: file ?? undefined,
        reference_document_id: file ? undefined : docId,
        page_from: from ? Number(from) : undefined,
        page_to: to ? Number(to) : undefined,
      });
      setExtractionId(res.extraction_id);
      onExtracted(res.extraction_id);
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function download() {
    if (!extractionId) return;
    try {
      saveBlob(await client.downloadTableCandidate(extractionId), `kandidat-${type}-${year}.csv`);
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={ids.type} label="Jenis tabel">
          <select id={ids.type} value={type} onChange={(e) => setType(e.target.value as ReferenceTableType)} className="field">
            {Object.entries(typeLabel).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field id={ids.year} label="Tahun anggaran">
          <input id={ids.year} value={year} inputMode="numeric" onChange={(e) => setYear(e.target.value)} className="field" />
        </Field>
        <Field id={ids.doc} label="Dokumen acuan sumber">
          <select id={ids.doc} value={docId} onChange={(e) => setDocId(e.target.value)} disabled={!!file} className="field">
            <option value="">Pilih dokumen</option>
            {(docs.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field id={ids.from} label="Dari halaman">
            <input id={ids.from} type="number" min={1} value={from} onChange={(e) => setFrom(e.target.value)} className="field" />
          </Field>
          <Field id={ids.to} label="Sampai halaman">
            <input id={ids.to} type="number" min={1} value={to} onChange={(e) => setTo(e.target.value)} className="field" />
          </Field>
        </div>
      </div>
      <UploadDropzone label="Atau unggah PDF sumber" file={file} onChange={setFile} validate={(f) => validatePdf(f, 100)} maxSizeMb={100} />
      <Feedback notice={null} error={error} />
      <button type="submit" disabled={start.isPending} className="btn btn-primary">
        {start.isPending ? "Memulai..." : "Mulai ekstraksi"}
      </button>
      {extraction.data && (
        <div role="status" className="flex flex-wrap items-center gap-3 text-sm">
          <span>
            Ekstraksi: {extractionLabel[extraction.data.status]}
            {extraction.data.status === "succeeded" && `, ${extraction.data.tables_found} tabel ditemukan`}
          </span>
          {extraction.data.error_message && <span className="error-text">{extraction.data.error_message}</span>}
          {extraction.data.status === "succeeded" && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void download()}>
              Unduh tabel kandidat (CSV)
            </button>
          )}
        </div>
      )}
    </form>
  );
}

/** Langkah 3: impor tabel yang sudah diverifikasi manusia terhadap PDF sumber. */
function ImportStep({ extractionId }: { extractionId: string | null }) {
  const importTable = useImportReferenceTable();
  const docs = useReferenceDocuments();
  const ids = { type: useId(), year: useId(), doc: useId(), note: useId() };
  const [type, setType] = useState<ReferenceTableType>("sbm");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [docId, setDocId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (!file || !docId || !note.trim() || !/^\d{4}$/.test(year)) {
      return setError("Lengkapi berkas, tahun, dokumen sumber, dan catatan verifikasi.");
    }
    setError(null);
    try {
      const t = await importTable.mutateAsync({
        file,
        table_type: type,
        fiscal_year: Number(year),
        source_document_id: docId,
        extraction_id: extractionId ?? undefined,
        verification_note: note.trim(),
      });
      setNotice(`Diimpor sebagai draf: ${t.row_count} baris valid, ${t.error_count} baris bermasalah.`);
      setFile(null);
      setNote("");
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={ids.type} label="Jenis tabel">
          <select id={ids.type} value={type} onChange={(e) => setType(e.target.value as ReferenceTableType)} className="field">
            {Object.entries(typeLabel).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field id={ids.year} label="Tahun anggaran">
          <input id={ids.year} value={year} inputMode="numeric" onChange={(e) => setYear(e.target.value)} className="field" />
        </Field>
        <Field id={ids.doc} label="Dokumen sumber">
          <select id={ids.doc} value={docId} onChange={(e) => setDocId(e.target.value)} className="field">
            <option value="">Pilih dokumen</option>
            {(docs.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <UploadDropzone
        label="Berkas tabel terverifikasi"
        file={file}
        onChange={setFile}
        validate={validateTableFile}
        accept=".csv,.xlsx"
        hint={`CSV atau XLSX. Kolom wajib: ${requiredColumns[type]}.`}
      />
      <Field id={ids.note} label="Catatan verifikasi">
        <textarea
          id={ids.note}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Siapa yang membandingkan dengan PDF sumber, dan apa yang diperbaiki."
          className="field"
        />
      </Field>
      <Feedback notice={notice} error={error} />
      <button type="submit" disabled={importTable.isPending} className="btn btn-primary">
        {importTable.isPending ? "Mengimpor..." : "Impor tabel"}
      </button>
    </form>
  );
}

function Rows({ table }: { table: ReferenceTableVersion }) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const searchId = useId();
  const rows = useReferenceTableRows(table.id, query);
  const keys = rows.data?.[0] ? Object.keys(rows.data[0].values) : [];
  const columns: Column<ReferenceTableRow>[] = [
    ...keys.map((k) => ({
      key: k,
      header: k,
      render: (r: ReferenceTableRow) => (k === "besaran" && typeof r.values[k] === "number" ? formatIdr(r.values[k] as number) : String(r.values[k] ?? "—")),
    })),
    { key: "page", header: "Halaman sumber", render: (r) => r.source_page, numeric: true },
  ];
  return (
    <div className="space-y-3">
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search);
        }}
      >
        <Field id={searchId} label="Cari baris">
          <input id={searchId} value={search} onChange={(e) => setSearch(e.target.value)} className="field" />
        </Field>
        <button type="submit" className="btn btn-secondary">
          Cari
        </button>
      </form>
      {rows.isPending && <LoadingState />}
      {rows.error && <ErrorState message={rows.error.message} />}
      {rows.data && <DataTable caption="Baris tabel acuan" columns={columns} rows={rows.data} getRowKey={(r) => r.id} emptyTitle="Tidak ada baris." />}
    </div>
  );
}

/**
 * Tabel acuan BAS/SBM (PRD §7.8, K-08): ekstraksi Docling → verifikasi manusia → impor ROCAN →
 * aktivasi. Hanya versi aktif yang dipakai pemeriksaan otomatis.
 */
export function ReferenceTablesPage() {
  const tables = useReferenceTables();
  const activate = useActivateReferenceTable();
  const [extractionId, setExtractionId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ReferenceTableVersion | null>(null);
  const docs = useReferenceDocuments();
  const docTitle = (id: string) => docs.data?.find((d) => d.id === id)?.title ?? id;

  const columns: Column<ReferenceTableVersion>[] = [
    { key: "type", header: "Jenis", render: (t) => t.table_type.toUpperCase(), sortValue: (t) => t.table_type },
    { key: "year", header: "Tahun", render: (t) => t.fiscal_year, sortValue: (t) => t.fiscal_year, numeric: true },
    { key: "source", header: "Sumber", render: (t) => docTitle(t.source_document_id) },
    { key: "status", header: "Status", render: (t) => statusLabel[t.status], sortValue: (t) => t.status },
    { key: "rows", header: "Baris", render: (t) => t.row_count, numeric: true },
    { key: "errors", header: "Bermasalah", render: (t) => t.error_count, numeric: true },
    { key: "note", header: "Catatan verifikasi", render: (t) => <span className="text-xs">{t.verification_note}</span> },
    { key: "date", header: "Diimpor", render: (t) => formatDate(t.imported_at), sortValue: (t) => t.imported_at },
    {
      key: "actions",
      header: "Tindakan",
      render: (t) => (
        <span className="flex flex-wrap gap-2">
          <button type="button" className="link" onClick={() => setViewing(t.id)}>
            Lihat baris
          </button>
          {t.status === "draft" && t.error_count === 0 && (
            <button type="button" className="link" onClick={() => setConfirm(t)}>
              Aktifkan
            </button>
          )}
        </span>
      ),
    },
  ];
  const viewed = tables.data?.find((t) => t.id === viewing);

  return (
    <div className="space-y-6">
      <h1 className="page-title">Tabel Acuan</h1>
      <p className="max-w-2xl text-sm text-ink-soft">
        Kode akun BAS dan batas harga SBM diperiksa dengan pencocokan tabel, bukan AI. Tabel yang belum diverifikasi tidak
        boleh dipakai.
      </p>
      <Section title="1. Ekstraksi tabel kandidat">
        <ExtractionStep onExtracted={setExtractionId} />
      </Section>
      <Section title="2. Verifikasi">
        <p className="max-w-2xl text-sm">
          Bandingkan tabel kandidat dengan PDF sumber baris per baris. Perbaiki nilai yang salah dan pertahankan kolom
          source_page.
        </p>
      </Section>
      <Section title="3. Impor tabel terverifikasi">
        <ImportStep extractionId={extractionId} />
      </Section>
      <Section title="Versi tabel">
        {activate.error && <ErrorState message={activate.error.message} />}
        {tables.isPending && <LoadingState />}
        {tables.error && <ErrorState message={tables.error.message} onRetry={() => void tables.refetch()} />}
        {tables.data && (
          <DataTable caption="Versi tabel acuan" columns={columns} rows={tables.data} getRowKey={(t) => t.id} emptyTitle="Belum ada tabel acuan." />
        )}
      </Section>
      {viewed && (
        <Section title={`Baris ${viewed.table_type.toUpperCase()} ${viewed.fiscal_year}`}>
          <Rows table={viewed} />
        </Section>
      )}
      <ConfirmDialog
        open={confirm !== null}
        title={`Aktifkan tabel ${confirm?.table_type.toUpperCase() ?? ""} ${confirm?.fiscal_year ?? ""}?`}
        confirmLabel="Ya, aktifkan"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) activate.mutate(confirm.id);
          setConfirm(null);
        }}
      >
        Versi aktif lain dengan jenis dan tahun yang sama akan digantikan.
      </ConfirmDialog>
    </div>
  );
}
