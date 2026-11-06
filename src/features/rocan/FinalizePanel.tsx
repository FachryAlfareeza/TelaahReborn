import { useId, useState, type FormEvent } from "react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { formatDate } from "../../lib/date";
import { CATEGORIES, categoryLabel, decisionLabel } from "../../lib/verdict";
import type { Category, Decision, ReviewResult } from "../../types";

type Props = {
  result: ReviewResult;
  /** Finalisasi hanya dari `siap_diverifikasi` (kontrak §3.6.3). */
  ready: boolean;
  pending: boolean;
  errorMessage: string | null;
  onFinalize: (input: { decision: Decision; final_category: Category; note?: string }) => void;
};

const choices: Decision[] = ["selesai_disetujui", "selesai_revisi"];

/** Selalu meminta konfirmasi karena hasil final langsung dikirim ke Satker. */
export function FinalizePanel({ result, ready, pending, errorMessage, onFinalize }: Props) {
  const ids = { category: useId(), note: useId() };
  const suggested = result.hasil_final.final_category ?? result.hasil_ai?.screening_2.recommended_category ?? "";
  const [decision, setDecision] = useState<Decision | "">("");
  const [category, setCategory] = useState<Category | "">(suggested);
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (result.decision) {
    return (
      <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="term">Keputusan</dt>
          <dd className="font-medium">{decisionLabel[result.decision]}</dd>
        </div>
        <div>
          <dt className="term">Kategori final</dt>
          <dd className="font-medium">
            {result.hasil_final.final_category ? categoryLabel[result.hasil_final.final_category] : "—"}
          </dd>
        </div>
        <div>
          <dt className="term">Difinalisasi</dt>
          <dd>{formatDate(result.finalized_at)}</dd>
        </div>
      </dl>
    );
  }

  if (!ready) return <p className="text-sm text-ink-soft">Finalisasi tersedia setelah review otomatis selesai.</p>;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!decision) return setProblem("Pilih Setujui atau Minta revisi.");
    if (!category) return setProblem("Pilih kategori final.");
    if (decision === "selesai_revisi" && !note.trim()) return setProblem("Tulis catatan agar Satker tahu apa yang perlu diperbaiki.");
    setProblem(null);
    setConfirming(true);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-4">
      <fieldset className="flex flex-wrap gap-6">
        <legend className="sr-only">Keputusan</legend>
        {choices.map((c) => (
          <label key={c} className="flex items-center gap-2">
            <input
              type="radio"
              name="keputusan"
              value={c}
              checked={decision === c}
              onChange={() => setDecision(c)}
              disabled={pending}
            />
            {c === "selesai_disetujui" ? "Setujui" : "Minta revisi"}
          </label>
        ))}
      </fieldset>
      <div>
        <label htmlFor={ids.category} className="field-label">
          Kategori final
        </label>
        <select
          id={ids.category}
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          disabled={pending}
          className="field"
        >
          <option value="">Pilih kategori</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {categoryLabel[c]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={ids.note} className="field-label">
          Catatan{decision === "selesai_revisi" ? " (wajib)" : ""}
        </label>
        <textarea id={ids.note} value={note} onChange={(e) => setNote(e.target.value)} rows={4} disabled={pending} className="field" />
        <p className="mt-1 text-xs text-ink-soft">Catatan disimpan di riwayat reviu.</p>
      </div>
      {problem && (
        <p role="alert" className="error-text">
          {problem}
        </p>
      )}
      {errorMessage && (
        <p role="alert" className="error-text">
          Finalisasi belum tersimpan. {errorMessage}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Menyimpan..." : "Finalisasi"}
      </button>
      <ConfirmDialog
        open={confirming}
        title={`Finalisasi: ${decision ? decisionLabel[decision] : ""}?`}
        confirmLabel="Ya, finalisasi"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          if (decision && category) onFinalize({ decision, final_category: category, note: note.trim() || undefined });
        }}
      >
        Hasil final akan dikirim ke Satker dan tidak dapat diubah lagi.
      </ConfirmDialog>
    </form>
  );
}
