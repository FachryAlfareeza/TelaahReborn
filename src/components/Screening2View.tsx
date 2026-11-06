import { categoryLabel, isTechnicalError } from "../lib/verdict";
import { displayValue } from "../lib/empty";
import type { Evidence, Priority, Screening2 } from "../types";
import { EvidenceQuote } from "./EvidenceQuote";
import { VerdictBadge } from "./VerdictBadge";

type Props = {
  result: Screening2;
  /** Prioritas dari Master RO: konteks bagi ROCAN, tidak menentukan kategori (PRD FR-S2-04). */
  priority?: Priority;
  onOpenEvidence?: (evidence: Evidence) => void;
};

export function Screening2View({ result, priority, onOpenEvidence }: Props) {
  return (
    <div className="space-y-3">
      <dl className="grid gap-x-10 gap-y-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="term">Klaim Satker</dt>
          <dd className="font-semibold">{categoryLabel[result.claimed_category]}</dd>
        </div>
        <div>
          <dt className="term">Rekomendasi sistem</dt>
          <dd className="font-semibold">
            {result.recommended_category ? categoryLabel[result.recommended_category] : displayValue(null)}
          </dd>
        </div>
        <div>
          <dt className="term">Kesesuaian klaim</dt>
          <dd>
            <VerdictBadge status={result.status} />
          </dd>
        </div>
        {priority && (
          <div>
            <dt className="term">Prioritas (Master RO)</dt>
            <dd>{priority}</dd>
          </div>
        )}
      </dl>
      {isTechnicalError(result.status) ? (
        <p className="text-sm text-ink-soft">Kategori belum dapat dinilai. Tetapkan kategori final secara manual.</p>
      ) : (
        result.explanation && <p className="text-sm">{result.explanation}</p>
      )}
      {result.evidence.length > 0 && (
        <ul className="space-y-2">
          {result.evidence.map((e, i) => (
            <li key={`${e.source}-${i}`}>
              <EvidenceQuote evidence={e} onOpen={onOpenEvidence} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
