import { useId, useState, type FormEvent } from "react";
import { formatDate } from "../lib/date";
import { displayValue } from "../lib/empty";
import type { Decision } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";

type Choice = "ACCEPTED" | "REJECTED";

type Props = {
  /** Keputusan yang sudah tersimpan, bila ada. */
  decision: Decision | null;
  /** Hanya ROCAN yang boleh memutuskan. */
  canDecide: boolean;
  /** Pengajuan sudah siap diputuskan (AI selesai, belum diputuskan). */
  ready: boolean;
  pending?: boolean;
  errorMessage?: string | null;
  onSave: (decision: Choice, note: string) => void;
};

const choiceLabel: Record<Choice, string> = { ACCEPTED: "Diterima", REJECTED: "Ditolak" };

/** Keputusan ROCAN. Terpisah dari hasil AI, dan selalu meminta konfirmasi sebelum disimpan. */
export function DecisionPanel({ decision, canDecide, ready, pending = false, errorMessage, onSave }: Props) {
  const noteId = useId();
  const [choice, setChoice] = useState<Choice | "">("");
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (decision) {
    return (
      <dl className="space-y-2 rounded-card border border-line bg-white p-4 text-sm">
        <div>
          <dt className="text-ink-soft">Keputusan</dt>
          <dd className="font-medium">{choiceLabel[decision.decision]}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Catatan</dt>
          <dd className="whitespace-pre-wrap">{displayValue(decision.note || null)}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Diputuskan oleh</dt>
          <dd>
            {decision.decidedBy}, {formatDate(decision.decidedAt)}
          </dd>
        </div>
      </dl>
    );
  }

  if (!ready) {
    return (
      <p className="rounded-card border border-line bg-white p-4 text-sm text-ink-soft">
        Keputusan bisa diberikan setelah pemeriksaan otomatis selesai.
      </p>
    );
  }

  if (!canDecide) {
    return (
      <p className="rounded-card border border-line bg-white p-4 text-sm text-ink-soft">
        Hanya ROCAN yang dapat menerima atau menolak pengajuan.
      </p>
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!choice) return setProblem("Pilih Diterima atau Ditolak terlebih dahulu.");
    if (choice === "REJECTED" && !note.trim()) return setProblem("Catatan wajib diisi saat menolak.");
    setProblem(null);
    setConfirming(true);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-card border border-line bg-white p-4">
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium text-brand-deep">Keputusan Anda</legend>
        {(["ACCEPTED", "REJECTED"] as const).map((c) => (
          <label key={c} className="flex items-center gap-2">
            <input
              type="radio"
              name="keputusan"
              value={c}
              checked={choice === c}
              onChange={() => setChoice(c)}
              disabled={pending}
            />
            {choiceLabel[c]}
          </label>
        ))}
      </fieldset>
      <div>
        <label htmlFor={noteId} className="mb-1 block text-sm font-medium text-brand-deep">
          Catatan {choice === "REJECTED" ? "(wajib)" : "(boleh kosong)"}
        </label>
        <textarea
          id={noteId}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          disabled={pending}
          className="w-full rounded-control border border-line px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        />
      </div>
      {problem && (
        <p role="alert" className="text-sm">
          {problem}
        </p>
      )}
      {errorMessage && (
        <p role="alert" className="text-sm">
          Keputusan belum tersimpan. {errorMessage}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-control bg-brand-deep px-6 py-2 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60"
      >
        {pending ? "Menyimpan..." : "Simpan keputusan"}
      </button>
      <ConfirmDialog
        open={confirming}
        title={`Simpan keputusan: ${choice ? choiceLabel[choice] : ""}?`}
        confirmLabel="Ya, simpan"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          if (choice) onSave(choice, note.trim());
        }}
      >
        Keputusan ini akan terlihat oleh Satker dan tidak bisa diubah dari halaman ini.
      </ConfirmDialog>
    </form>
  );
}
