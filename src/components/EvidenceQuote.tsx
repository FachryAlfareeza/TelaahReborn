import type { Evidence } from "../types";
import { displayValue } from "../lib/empty";
import { evidenceSourceLabel } from "../lib/verdict";

type Props = {
  evidence: Evidence;
  /** Bila diberikan, tombol "Lihat di dokumen" tampil untuk bukti dari TOR atau RAB. */
  onOpen?: (evidence: Evidence) => void;
};

export function EvidenceQuote({ evidence, onOpen }: Props) {
  const source = `${evidenceSourceLabel[evidence.source]}, halaman ${displayValue(evidence.page)}`;
  const inSubmission = evidence.source === "tor" || evidence.source === "rab";
  return (
    <figure className="border-l-2 border-sky-soft pl-3 text-sm">
      {evidence.quote ? (
        <blockquote className="whitespace-pre-wrap text-ink">{evidence.quote}</blockquote>
      ) : (
        <p className="text-ink-soft">Tanpa kutipan.</p>
      )}
      <figcaption className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-ink-soft">
        <span>{source}</span>
        {onOpen && inSubmission && (
          <button type="button" onClick={() => onOpen(evidence)} aria-label={`Lihat di dokumen (${source})`} className="link">
            Lihat di dokumen
          </button>
        )}
      </figcaption>
    </figure>
  );
}
