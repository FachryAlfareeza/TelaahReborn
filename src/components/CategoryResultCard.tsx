import type { Evidence, Screening2Result } from "../types";
import { categoryLabel, questionKind } from "../lib/verdict";
import { displayValue } from "../lib/empty";
import { VerdictRow } from "./VerdictRow";

type Props = {
  result: Screening2Result;
  onOpenEvidence?: (evidence: Evidence) => void;
};

/** Hasil Screening 2: kategori, pertanyaan penentu, dan status tiap pertanyaan. */
export function CategoryResultCard({ result, onOpenEvidence }: Props) {
  const hasTechnical = result.questions.some((q) => q.technicalStatus !== "NORMAL");
  return (
    <div className="space-y-4 rounded-card border border-line bg-white p-4">
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-ink-soft">Kategori hasil</dt>
          <dd className="text-lg font-semibold text-brand-deep">{categoryLabel(result.category)}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Pertanyaan penentu</dt>
          <dd className="font-medium">{displayValue(result.decidingQuestion)}</dd>
        </div>
      </dl>
      {hasTechnical && (
        <p role="note" className="text-sm text-ink-soft">
          Sebagian pertanyaan mengalami pemrosesan bermasalah, jadi kategori ini perlu dicek dengan teliti.
        </p>
      )}
      <ul className="space-y-3">
        {result.questions.map((q) => (
          <li key={q.code} className="rounded-control border border-line p-3">
            <VerdictRow
              code={q.code}
              title={q.text}
              kind={questionKind(q)}
              evidence={q.evidence}
              onOpenEvidence={onOpenEvidence}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
