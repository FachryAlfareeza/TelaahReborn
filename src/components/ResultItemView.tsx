import type { ReactNode } from "react";
import { formatIdr } from "../lib/money";
import { isTechnicalError } from "../lib/verdict";
import type { Evidence, ResultItem } from "../types";
import { EvidenceQuote } from "./EvidenceQuote";
import { VerdictBadge } from "./VerdictBadge";

type Props = {
  item: ResultItem;
  /** Teks kriteria dari checklist, bila tersedia. */
  criterion?: string | null;
  onOpenEvidence?: (evidence: Evidence) => void;
  /** Isi tambahan di bawah item, mis. hasil AI pembanding atau editor ROCAN. */
  children?: ReactNode;
};

/**
 * Satu item hasil: status, penjelasan, bukti, dan perhitungan (bila deterministik).
 * Item `Terjadi Kesalahan pada proses` menampilkan alasan teknis, bukan kesimpulan reviu.
 */
export function ResultItemView({ item, criterion, onOpenEvidence, children }: Props) {
  const technical = isTechnicalError(item.status);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {item.display_code && <span className="text-sm text-ink-soft tabular-nums">{item.display_code}</span>}
        <span className="font-medium">{criterion ?? item.section ?? "Item checklist"}</span>
        <VerdictBadge status={item.status} />
      </div>
      {technical && (
        <p className="text-sm text-ink-soft">
          Belum dinilai: {item.error_reason ?? "pemeriksaan gagal secara teknis."} Periksa manual atau jalankan ulang.
        </p>
      )}
      {!technical && item.explanation && <p className="text-sm">{item.explanation}</p>}
      {item.calculation && (
        <div className="text-sm">
          <p className="term">Perhitungan: {item.calculation.formula}</p>
          <ul className="mt-1 space-y-0.5">
            {item.calculation.inputs.map((input) => (
              <li key={input.label} className="tabular-nums">
                {input.label}: {formatIdr(input.value)} <span className="text-ink-soft">({input.source})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {item.evidence.length > 0 && (
        <ul className="space-y-2">
          {item.evidence.map((e, i) => (
            <li key={`${e.source}-${e.page}-${i}`}>
              <EvidenceQuote evidence={e} onOpen={onOpenEvidence} />
            </li>
          ))}
        </ul>
      )}
      {children}
    </div>
  );
}
