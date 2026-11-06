import { useId, useState, type FormEvent } from "react";
import { ITEM_STATUSES } from "../../api/schemas";
import { VerdictBadge } from "../../components/VerdictBadge";
import type { ItemStatus, ResultItem } from "../../types";

type Props = {
  finalItem: ResultItem;
  /** Item hasil AI asli; tidak pernah berubah (PRD FR-VER-01). */
  aiItem: ResultItem | undefined;
  editable: boolean;
  pending: boolean;
  onSave: (edit: { status?: ItemStatus; explanation?: string; change_reason?: string }) => Promise<unknown>;
};

/**
 * Editor satu item Hasil_Final. Hanya bidang yang berubah yang dikirim; alasan wajib bila status
 * diubah (kontrak §3.6.3).
 */
export function ItemEditor({ finalItem, aiItem, editable, pending, onSave }: Props) {
  const ids = { status: useId(), explanation: useId(), reason: useId() };
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ItemStatus>(finalItem.status);
  const [explanation, setExplanation] = useState(finalItem.explanation);
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const changedFromAi =
    aiItem !== undefined && (aiItem.status !== finalItem.status || aiItem.explanation !== finalItem.explanation);

  function reset() {
    setStatus(finalItem.status);
    setExplanation(finalItem.explanation);
    setReason("");
    setProblem(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const statusChanged = status !== finalItem.status;
    const explanationChanged = explanation !== finalItem.explanation;
    if (!statusChanged && !explanationChanged) return setProblem("Belum ada perubahan.");
    if (statusChanged && !reason.trim()) return setProblem("Isi alasan perubahan status.");
    setProblem(null);
    try {
      await onSave({
        status: statusChanged ? status : undefined,
        explanation: explanationChanged ? explanation : undefined,
        change_reason: reason.trim() || undefined,
      });
      setOpen(false);
      setReason("");
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "Perubahan belum tersimpan.");
    }
  }

  return (
    <div className="space-y-2 text-sm">
      {changedFromAi && aiItem && (
        <p className="flex flex-wrap items-center gap-x-2 text-ink-soft">
          <span className="font-medium text-ink">Diubah ROCAN.</span> Hasil AI semula: <VerdictBadge status={aiItem.status} />
        </p>
      )}
      {editable && !open && (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            reset();
            setOpen(true);
          }}
          aria-label={`Ubah hasil ${finalItem.display_code ?? ""}`.trim()}
        >
          Ubah hasil
        </button>
      )}
      {editable && open && (
        <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-3">
          <div>
            <label htmlFor={ids.status} className="field-label">
              Status final
            </label>
            <select
              id={ids.status}
              value={status}
              onChange={(e) => setStatus(e.target.value as ItemStatus)}
              disabled={pending}
              className="field"
            >
              {ITEM_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={ids.explanation} className="field-label">
              Penjelasan
            </label>
            <textarea
              id={ids.explanation}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={3}
              disabled={pending}
              className="field"
            />
          </div>
          <div>
            <label htmlFor={ids.reason} className="field-label">
              Alasan perubahan{status !== finalItem.status ? " (wajib)" : ""}
            </label>
            <input id={ids.reason} value={reason} onChange={(e) => setReason(e.target.value)} disabled={pending} className="field" />
          </div>
          {problem && (
            <p role="alert" className="error-text">
              {problem}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
              {pending ? "Menyimpan..." : "Simpan"}
            </button>
            <button type="button" disabled={pending} onClick={() => setOpen(false)} className="btn btn-secondary btn-sm">
              Batal
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
