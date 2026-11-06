import type { ReactNode } from "react";
import { formatIdr } from "../lib/money";
import { isTechnicalError } from "../lib/verdict";
import type { Evidence, ResultItem } from "../types";
import { EvidenceQuote } from "./EvidenceQuote";
import { VerdictBadge } from "./VerdictBadge";

type Props = {
  item: ResultItem;
  criterion?: string | null;
  onOpenEvidence?: (evidence: Evidence) => void;
  children?: ReactNode;
};

/** Item `Terjadi Kesalahan pada proses` menampilkan alasan teknis, bukan kesimpulan reviu. */
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
      {item.calculation && <CalculationView calculation={item.calculation} />}
      <EvidenceList evidence={item.evidence} onOpen={onOpenEvidence} />
      {children}
    </div>
  );
}

export function CalculationView({ calculation }: { calculation: NonNullable<ResultItem["calculation"]> }) {
  return (
    <div className="text-sm">
      <p className="term">Perhitungan: {calculation.formula}</p>
      <ul className="mt-1 space-y-0.5">
        {calculation.inputs.map((input) => (
          <li key={input.label} className="tabular-nums">
            {input.label}: {formatIdr(input.value)} <span className="text-ink-soft">({input.source})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EvidenceList({ evidence, onOpen, className = "space-y-2" }: { evidence: Evidence[]; onOpen?: (e: Evidence) => void; className?: string }) {
  if (evidence.length === 0) return null;
  return (
    <ul className={className}>
      {evidence.map((e, i) => (
        <li key={`${e.source}-${e.page}-${i}`}>
          <EvidenceQuote evidence={e} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}
