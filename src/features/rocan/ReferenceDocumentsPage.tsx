import { useId, useState, type FormEvent } from "react";
import {
  useReferenceDocuments,
  useReingestReferenceDocument,
  useSetReferenceDocumentActive,
  useUploadReferenceDocument,
} from "../../api/queries";
import { DataTable, type Column } from "../../components/DataTable";
import { ErrorState } from "../../components/ErrorState";
import { errorText, Feedback, Field } from "../../components/form";
import { LoadingState } from "../../components/LoadingState";
import { Section } from "../../components/Section";
import { UploadDropzone } from "../../components/UploadDropzone";
import { formatDate } from "../../lib/date";
import { displayValue } from "../../lib/empty";
import type { ReferenceDocType, ReferenceDocument, ReferenceDocumentStatus, Validity } from "../../types";

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
const validityLabel: Record<Validity, string> = { berlaku: "Berlaku", draf: "Draf", historis: "Historis" };
const statusLabel: Record<ReferenceDocumentStatus, string> = {
  pending: "Menunggu diproses",
  processing: "Sedang diproses",
  active: "Aktif",
  failed: "Gagal diproses",
  inactive: "Nonaktif",
};

/** Berkas dokumen acuan: PDF atau XLSX (kontrak §3.8). */
async function validateReference(file: File): Promise<string | null> {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".pdf") && !name.endsWith(".xlsx")) return "Berkas harus .pdf atau .xlsx.";
  if (file.size === 0) return "Berkas kosong. Pilih berkas lain.";
  return null;
}

function UploadForm() {
  const upload = useUploadReferenceDocument();
  const ids = { title: useId(), type: useId(), validity: useId(), number: useId(), year: useId() };
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ReferenceDocType | "">("");
  const [validity, setValidity] = useState<Validity>("berlaku");
  const [number, setNumber] = useState("");
  const [year, setYear] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (!file || !title.trim() || !type) return setError("Lengkapi berkas, judul, dan jenis dokumen.");
    setError(null);
    try {
      await upload.mutateAsync({
        file,
        title: title.trim(),
        doc_type: type,
        validity,
        number: number.trim() || undefined,
        effective_year: year ? Number(year) : undefined,
      });
      setNotice(`"${title.trim()}" diunggah. Ingestion berjalan di latar belakang.`);
      setFile(null);
      setTitle("");
      setNumber("");
      setYear("");
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-4">
      <UploadDropzone
        label="Berkas dokumen acuan"
        file={file}
        onChange={setFile}
        validate={validateReference}
        accept=".pdf,.xlsx,application/pdf"
        hint="PDF atau XLSX. Bisa diseret ke sini."
        disabled={upload.isPending}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={ids.title} label="Judul">
          <input id={ids.title} value={title} onChange={(e) => setTitle(e.target.value)} className="field" />
        </Field>
        <Field id={ids.type} label="Jenis dokumen">
          <select id={ids.type} value={type} onChange={(e) => setType(e.target.value as ReferenceDocType)} className="field">
            <option value="">Pilih jenis</option>
            {Object.entries(docTypeLabel).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field id={ids.validity} label="Status berlaku">
          <select id={ids.validity} value={validity} onChange={(e) => setValidity(e.target.value as Validity)} className="field">
            {Object.entries(validityLabel).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field id={ids.number} label="Nomor (opsional)">
          <input id={ids.number} value={number} onChange={(e) => setNumber(e.target.value)} className="field" />
        </Field>
        <Field id={ids.year} label="Tahun berlaku (opsional)">
          <input id={ids.year} type="number" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} className="field" />
        </Field>
      </div>
      <Feedback notice={notice} error={error} />
      <button type="submit" disabled={upload.isPending} className="btn btn-primary">
        {upload.isPending ? "Mengunggah..." : "Unggah"}
      </button>
    </form>
  );
}

/** Dokumen acuan untuk RAG (PRD §7.7): unggah, pantau ingestion, nonaktifkan, aktifkan, ingest ulang. */
export function ReferenceDocumentsPage() {
  const [statusFilter, setStatusFilter] = useState<ReferenceDocumentStatus | "">("");
  const filterId = useId();
  const docs = useReferenceDocuments(statusFilter ? { status: statusFilter } : {});
  const setActive = useSetReferenceDocumentActive();
  const reingest = useReingestReferenceDocument();
  const actionError = setActive.error ?? reingest.error;

  const columns: Column<ReferenceDocument>[] = [
    {
      key: "title",
      header: "Judul",
      render: (d) => (
        <span>
          {d.title}
          <span className="block text-xs font-normal text-ink-soft">{d.filename}</span>
        </span>
      ),
      sortValue: (d) => d.title,
    },
    { key: "type", header: "Jenis", render: (d) => docTypeLabel[d.doc_type], sortValue: (d) => d.doc_type },
    { key: "number", header: "Nomor", render: (d) => displayValue(d.number) },
    { key: "year", header: "Tahun", render: (d) => displayValue(d.effective_year), numeric: true },
    { key: "validity", header: "Berlaku", render: (d) => validityLabel[d.validity] },
    {
      key: "status",
      header: "Status",
      render: (d) => (
        <span>
          {statusLabel[d.status]}
          {d.error_message && <span className="block text-xs text-bad-text">{d.error_message}</span>}
        </span>
      ),
      sortValue: (d) => d.status,
    },
    { key: "chunks", header: "Potongan", render: (d) => d.chunks_count, numeric: true },
    { key: "date", header: "Diunggah", render: (d) => formatDate(d.uploaded_at), sortValue: (d) => d.uploaded_at },
    {
      key: "actions",
      header: "Tindakan",
      render: (d) => (
        <span className="flex flex-wrap gap-2">
          {d.status === "active" && (
            <button type="button" className="link" onClick={() => setActive.mutate({ id: d.id, active: false })} aria-label={`Nonaktifkan ${d.title}`}>
              Nonaktifkan
            </button>
          )}
          {d.status === "inactive" && d.processed_at && (
            <button type="button" className="link" onClick={() => setActive.mutate({ id: d.id, active: true })} aria-label={`Aktifkan ${d.title}`}>
              Aktifkan
            </button>
          )}
          {d.status !== "pending" && d.status !== "processing" && (
            <button type="button" className="link" onClick={() => reingest.mutate(d.id)} aria-label={`Ingest ulang ${d.title}`}>
              Ingest ulang
            </button>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="page-title">Dokumen Acuan</h1>
      <p className="max-w-2xl text-sm text-ink-soft">
        Dokumen aktif dipakai sebagai rujukan reviu. Dokumen nonaktif tidak lagi diambil saat reviu.
      </p>
      <Section title="Unggah dokumen">
        <UploadForm />
      </Section>
      <Section title="Daftar dokumen">
        <div className="mb-3">
          <label htmlFor={filterId} className="field-label">
            Status
          </label>
          <select
            id={filterId}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReferenceDocumentStatus | "")}
            className="field w-auto"
          >
            <option value="">Semua status</option>
            {Object.entries(statusLabel).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        {actionError && <ErrorState message={actionError.message} />}
        {docs.isPending && <LoadingState />}
        {docs.error && <ErrorState message={docs.error.message} onRetry={() => void docs.refetch()} />}
        {docs.data && (
          <DataTable caption="Dokumen acuan" columns={columns} rows={docs.data} getRowKey={(d) => d.id} emptyTitle="Belum ada dokumen acuan." />
        )}
      </Section>
    </div>
  );
}
