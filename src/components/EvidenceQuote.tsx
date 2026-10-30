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
    <figure className="rounded-control border-l-4 border-brand bg-sky-pale p-3 text-sm">
      <blockquote className="whitespace-pre-wrap">{evidence.quote}</blockquote>
      <figcaption className="mt-1 flex flex-wrap items-center gap-2 text-ink-soft">
        <span>Sumber: {source}</span>
        {onOpen && evidence.documentType !== "ACUAN" && (
          <button
            type="button"
            onClick={() => onOpen(evidence)}
            className="rounded-control border border-line bg-white px-2 py-1 text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Lihat di dokumen ({source})
          </button>
        )}
      </figcaption>
    </figure>
  );
}
