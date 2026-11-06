import { useId, useState, type FormEvent } from "react";
import {
  useCreateCurationExport,
  useCurationExports,
  useCurationSample,
  useCurationSamples,
  useReviewCurationSample,
} from "../../api/queries";
import { DataTable, type Column } from "../../components/DataTable";
import { ErrorState } from "../../components/ErrorState";
import { errorText, Feedback, Field } from "../../components/form";
import { LoadingState } from "../../components/LoadingState";
import { ResultItemView } from "../../components/ResultItemView";
import { Section } from "../../components/Section";
import { VerdictBadge } from "../../components/VerdictBadge";
import { useAuth } from "../auth/authState";
import { formatDate } from "../../lib/date";
import { saveBlob } from "../../lib/files";
import { inspectionTypeLabel } from "../../lib/verdict";
import type { CurationSample, CurationStatus, InspectionType } from "../../types";

const statusLabel: Record<CurationStatus, string> = { pending: "Belum ditinjau", approved: "Disetujui", rejected: "Ditolak" };
const exportLabel = { pending: "Menunggu", processing: "Diproses", succeeded: "Selesai", failed: "Gagal" } as const;

function SampleDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const sample = useCurationSample(id);
  const review = useReviewCurationSample();
  const noteId = useId();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function decide(status: "approved" | "rejected") {
    setError(null);
    try {
      await review.mutateAsync({ id, status, note: note.trim() || undefined });
      onClose();
    } catch (err) {
      setError(errorText(err));
    }
  }

  if (sample.isPending) return <LoadingState />;
  if (sample.error) return <ErrorState message={sample.error.message} />;
  const s = sample.data;
  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="term mb-1">Hasil AI</p>
          <ResultItemView item={s.hasil_ai_item} />
        </div>
        <div>
          <p className="term mb-1">Hasil final ROCAN</p>
          <ResultItemView item={s.hasil_final_item} />
        </div>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer">Input yang dipakai</summary>
        <pre className="mt-2 max-h-64 overflow-auto rounded-control bg-sky-pale p-3 text-xs">{JSON.stringify(s.input, null, 2)}</pre>
      </details>
      <Field id={noteId} label="Catatan (opsional)">
        <textarea id={noteId} value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="field max-w-xl" />
      </Field>
      <Feedback notice={null} error={error} />
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={review.isPending} className="btn btn-primary" onClick={() => void decide("approved")}>
          Setujui untuk dataset
        </button>
        <button type="button" disabled={review.isPending} className="btn btn-secondary" onClick={() => void decide("rejected")}>
          Tolak
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Tutup
        </button>
      </div>
    </div>
  );
}

function Exports() {
  const { client } = useAuth();
  const exports = useCurationExports();
  const create = useCreateCurationExport();
  const [types, setTypes] = useState<InspectionType[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await create.mutateAsync({ inspection_types: types.length ? types : undefined });
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function download(id: string) {
    try {
      const blob = await client.downloadCurationExport(id);
      saveBlob(blob, blob.type === "application/zip" ? `kurasi-${id}.zip` : `kurasi-${id}.jsonl`);
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <fieldset>
          <legend className="field-label">Jenis pemeriksaan (kosong = semua)</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {(Object.keys(inspectionTypeLabel) as InspectionType[]).map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={types.includes(t)}
                  onChange={(e) => setTypes((list) => (e.target.checked ? [...list, t] : list.filter((x) => x !== t)))}
                />
                {inspectionTypeLabel[t]}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="text-xs text-ink-soft">Hanya sampel yang disetujui yang masuk. NIP dan nama pada tanda tangan disamarkan.</p>
        <button type="submit" disabled={create.isPending} className="btn btn-primary">
          {create.isPending ? "Membuat..." : "Buat ekspor"}
        </button>
      </form>
      <Feedback notice={null} error={error} />
      {exports.data && exports.data.length > 0 && (
        <ul className="divide-y divide-line border-y border-line text-sm">
          {exports.data.map((x) => (
            <li key={x.export_id} className="flex flex-wrap items-center gap-x-6 gap-y-1 py-2">
              <span>{formatDate(x.created_at)}</span>
              <span>{x.sample_count} sampel</span>
              <span>{exportLabel[x.status]}</span>
              {x.sha256 && <span className="text-xs break-all text-ink-soft">sha256 {x.sha256}</span>}
              {x.status === "succeeded" && (
                <button type="button" className="link ml-auto" onClick={() => void download(x.export_id)}>
                  Unduh
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Kurasi data SFT (PRD §8.16): sampel dibuat saat finalisasi; ROCAN menyetujui yang layak masuk
 * dataset, lalu mengekspor dataset berversi. Training tidak dilakukan di MVP.
 */
export function CurationPage() {
  const [status, setStatus] = useState<CurationStatus | "">("pending");
  const [type, setType] = useState<InspectionType | "">("");
  const [open, setOpen] = useState<string | null>(null);
  const ids = { status: useId(), type: useId() };
  const samples = useCurationSamples({ status: status || undefined, inspection_type: type || undefined });

  const columns: Column<CurationSample>[] = [
    { key: "code", header: "Item", render: (s) => s.display_code ?? s.item_id, sortValue: (s) => s.display_code ?? "" },
    { key: "type", header: "Jenis", render: (s) => inspectionTypeLabel[s.inspection_type] },
    { key: "ai", header: "Hasil AI", render: (s) => <VerdictBadge status={s.hasil_ai_status} /> },
    { key: "final", header: "Hasil final", render: (s) => <VerdictBadge status={s.hasil_final_status} /> },
    { key: "changed", header: "Diubah ROCAN", render: (s) => (s.changed_by_rocan ? "Ya" : "Tidak") },
    { key: "status", header: "Status", render: (s) => statusLabel[s.status] },
    {
      key: "open",
      header: "Rincian",
      render: (s) => (
        <button type="button" className="link" onClick={() => setOpen(s.id)}>
          Tinjau
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="page-title">Kurasi Data</h1>
      <Section title="Sampel">
        <div className="mb-3 flex flex-wrap gap-4">
          <Field id={ids.status} label="Status">
            <select id={ids.status} value={status} onChange={(e) => setStatus(e.target.value as CurationStatus | "")} className="field w-auto">
              <option value="">Semua</option>
              {Object.entries(statusLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field id={ids.type} label="Jenis pemeriksaan">
            <select id={ids.type} value={type} onChange={(e) => setType(e.target.value as InspectionType | "")} className="field w-auto">
              <option value="">Semua</option>
              {Object.entries(inspectionTypeLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {samples.isPending && <LoadingState />}
        {samples.error && <ErrorState message={samples.error.message} onRetry={() => void samples.refetch()} />}
        {samples.data && (
          <DataTable
            caption="Sampel kurasi"
            columns={columns}
            rows={samples.data}
            getRowKey={(s) => s.id}
            emptyTitle="Belum ada sampel. Sampel dibuat saat ROCAN memfinalisasi pengajuan."
          />
        )}
      </Section>
      {open && (
        <Section title="Tinjau sampel">
          <SampleDetail key={open} id={open} onClose={() => setOpen(null)} />
        </Section>
      )}
      <Section title="Ekspor dataset">
        <Exports />
      </Section>
    </div>
  );
}
