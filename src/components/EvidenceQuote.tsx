import type { Evidence } from "../types";
import { displayValue } from "../lib/empty";

type Props = {
  evidence: Evidence;
  /** Bila diberikan, tombol "Lihat di dokumen" tampil dan memanggil ini. */
  onOpen?: (evidence: Evidence) => void;
};

/** Satu kutipan bukti: teks persis, jenis dokumen, dan halaman. */
export function EvidenceQuote({ evidence, onOpen }: Props) {
  const source = `${evidence.documentType}, halaman ${displayValue(evidence.page)}`;
  return (
    <figure className="border-l-2 border-sky-soft pl-3 text-sm">
      <blockquote className="whitespace-pre-wrap text-ink">{evidence.quote}</blockquote>
      <figcaption className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-ink-soft">
        <span>{source}</span>
        {onOpen && evidence.documentType !== "ACUAN" && (
          <button
            type="button"
            onClick={() => onOpen(evidence)}
            aria-label={`Lihat di dokumen (${source})`}
            className="link"
          >
            Lihat di dokumen
          </button>
        )}
      </figcaption>
    </figure>
  );
}
