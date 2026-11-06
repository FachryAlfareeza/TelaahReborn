import { useId, useState, type FormEvent } from "react";
import { useImportReferenceTable, useStartTableExtraction, useTableExtraction, useUploadReferenceDocument } from "../../api/queries";
import { errorText, Feedback, Field, LabelOptions } from "../../components/form";
import { UploadDropzone } from "../../components/UploadDropzone";
import { saveBlob, validateExtension, validatePdf } from "../../lib/files";
import type { ReferenceDocType, ReferenceDocument, ReferenceTableType, Validity } from "../../types";
import { useAuth } from "../auth/authState";
import { docTypeLabel, jobStatusLabel, requiredColumns, tableName, tableTypeLabel, validityLabel } from "./labels";

export function UploadForm({ onDone }: { onDone: (title: string) => void }) {
  const upload = useUploadReferenceDocument();
  const ids = { title: useId(), type: useId(), validity: useId(), number: useId(), year: useId() };
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ReferenceDocType | "">("");
  const [validity, setValidity] = useState<Validity>("berlaku");
  const [number, setNumber] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
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
      onDone(title.trim());
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <UploadDropzone
        label="Berkas dokumen acuan"
        file={file}
        onChange={setFile}
        validate={(f) => validateExtension(f, [".pdf", ".xlsx"])}
        accept=".pdf,.xlsx,application/pdf"
        hint="PDF atau XLSX."
        disabled={upload.isPending}
      />
      <Field id={ids.title} label="Judul">
        <input id={ids.title} value={title} onChange={(e) => setTitle(e.target.value)} className="field" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={ids.type} label="Jenis dokumen">
          <select id={ids.type} value={type} onChange={(e) => setType(e.target.value as ReferenceDocType)} className="field">
            <option value="">Pilih jenis</option>
            <LabelOptions labels={docTypeLabel} />
          </select>
        </Field>
        <Field id={ids.validity} label="Status berlaku">
          <select id={ids.validity} value={validity} onChange={(e) => setValidity(e.target.value as Validity)} className="field">
            <LabelOptions labels={validityLabel} />
          </select>
        </Field>
        <Field id={ids.number} label="Nomor (opsional)">
          <input id={ids.number} value={number} onChange={(e) => setNumber(e.target.value)} className="field" />
        </Field>
        <Field id={ids.year} label="Tahun berlaku (opsional)">
          <input id={ids.year} type="number" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} className="field" />
        </Field>
      </div>
      <Feedback notice={null} error={error} />
      <button type="submit" disabled={upload.isPending} className="btn btn-primary">
        {upload.isPending ? "Mengunggah..." : "Unggah"}
      </button>
    </form>
  );
}

function StepHeader({ n, title, active }: { n: number; title: string; active: boolean }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold">
      <span
        className={`inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums ${
          active ? "bg-brand text-white" : "bg-sky-soft text-brand-deep"
        }`}
      >
        {n}
      </span>
      {title}
    </h3>
  );
}

/** Hanya versi yang diaktifkan yang dipakai pemeriksaan otomatis (PRD §7.8). */
export function TableWizard({ docs, initialDocId, onDone }: { docs: ReferenceDocument[]; initialDocId: string; onDone: (msg: string) => void }) {
  const { client } = useAuth();
  const start = useStartTableExtraction();
  const importTable = useImportReferenceTable();
  const ids = { type: useId(), year: useId(), doc: useId(), from: useId(), to: useId(), note: useId() };
  const [type, setType] = useState<ReferenceTableType>("sbm");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [docId, setDocId] = useState(initialDocId);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [extractionId, setExtractionId] = useState<string | null>(null);
  const [tableFile, setTableFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const extraction = useTableExtraction(extractionId);
  const yearOk = /^\d{4}$/.test(year);

  async function onExtract() {
    if (!sourceFile && !docId) return setError("Pilih dokumen acuan atau unggah PDF sumber.");
    if (!yearOk) return setError("Isi tahun anggaran (4 angka).");
    setError(null);
    try {
      const res = await start.mutateAsync({
        table_type: type,
        fiscal_year: Number(year),
        file: sourceFile ?? undefined,
        reference_document_id: sourceFile ? undefined : docId,
        page_from: from ? Number(from) : undefined,
        page_to: to ? Number(to) : undefined,
      });
      setExtractionId(res.extraction_id);
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

  async function onImport(e: FormEvent) {
    e.preventDefault();
    if (!tableFile || !docId || !note.trim() || !yearOk) {
      return setError("Lengkapi berkas tabel, tahun, dokumen sumber, dan catatan verifikasi.");
    }
    setError(null);
    try {
      const t = await importTable.mutateAsync({
        file: tableFile,
        table_type: type,
        fiscal_year: Number(year),
        source_document_id: docId,
        extraction_id: extractionId ?? undefined,
        verification_note: note.trim(),
      });
      onDone(`Tabel ${tableName(t)} diimpor sebagai draf: ${t.row_count} baris valid, ${t.error_count} bermasalah.`);
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <form onSubmit={onImport} noValidate className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={ids.type} label="Jenis tabel">
          <select id={ids.type} value={type} onChange={(e) => setType(e.target.value as ReferenceTableType)} className="field">
            <LabelOptions labels={tableTypeLabel} />
          </select>
        </Field>
        <Field id={ids.year} label="Tahun anggaran">
          <input id={ids.year} value={year} inputMode="numeric" onChange={(e) => setYear(e.target.value)} className="field" />
        </Field>
        <div className="sm:col-span-2">
          <Field id={ids.doc} label="Dokumen acuan sumber">
            <select id={ids.doc} value={docId} onChange={(e) => setDocId(e.target.value)} className="field">
              <option value="">Pilih dokumen</option>
              {docs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="space-y-3 rounded-control border border-line p-4">
        <StepHeader n={1} title="Ekstraksi tabel kandidat (opsional)" active={!extractionId} />
        <div className="grid grid-cols-2 gap-2">
          <Field id={ids.from} label="Dari halaman">
            <input id={ids.from} type="number" min={1} value={from} onChange={(e) => setFrom(e.target.value)} className="field" />
          </Field>
          <Field id={ids.to} label="Sampai halaman">
            <input id={ids.to} type="number" min={1} value={to} onChange={(e) => setTo(e.target.value)} className="field" />
          </Field>
        </div>
        <UploadDropzone label="Atau unggah PDF sumber" file={sourceFile} onChange={setSourceFile} validate={(f) => validatePdf(f, 100)} maxSizeMb={100} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void onExtract()} disabled={start.isPending} className="btn btn-secondary">
            {start.isPending ? "Memulai..." : "Mulai ekstraksi"}
          </button>
          {extraction.data && (
            <span role="status" className="text-sm">
              Ekstraksi: {jobStatusLabel[extraction.data.status]}
              {extraction.data.status === "succeeded" && `, ${extraction.data.tables_found} tabel ditemukan`}
            </span>
          )}
          {extraction.data?.error_message && <span className="error-text">{extraction.data.error_message}</span>}
          {extraction.data?.status === "succeeded" && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void download()}>
              Unduh tabel kandidat (CSV)
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2 rounded-control border border-line p-4">
        <StepHeader n={2} title="Verifikasi" active={!!extractionId && !tableFile} />
        <p className="text-sm text-ink-soft">
          Cocokkan tabel kandidat dengan PDF sumber dan perbaiki nilai yang salah. Jangan hapus kolom source_page.
        </p>
      </div>

      <div className="space-y-3 rounded-control border border-line p-4">
        <StepHeader n={3} title="Impor tabel terverifikasi" active={!!tableFile} />
        <UploadDropzone
          label="Berkas tabel terverifikasi"
          file={tableFile}
          onChange={setTableFile}
          validate={(f) => validateExtension(f, [".csv", ".xlsx"])}
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
      </div>

      <Feedback notice={null} error={error} />
      <button type="submit" disabled={importTable.isPending} className="btn btn-primary">
        {importTable.isPending ? "Mengimpor..." : "Impor tabel"}
      </button>
    </form>
  );
}
