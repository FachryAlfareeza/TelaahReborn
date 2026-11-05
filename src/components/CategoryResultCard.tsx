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
    <div className="space-y-3">
      <dl className="flex flex-wrap gap-x-10 gap-y-2">
        <div>
          <dt className="term">Kategori hasil</dt>
          <dd className="text-lg font-semibold">{categoryLabel(result.category)}</dd>
        </div>
        <div>
          <dt className="term">Pertanyaan penentu</dt>
          <dd className="text-lg font-semibold">{displayValue(result.decidingQuestion)}</dd>
        </div>
      </dl>
      {hasTechnical && (
        <p role="note" className="text-sm text-warn">
          Sebagian pertanyaan gagal diproses. Periksa kategori ini dengan teliti.
        </p>
      )}
      <ul className="divide-y divide-line border-y border-line">
        {result.questions.map((q) => (
          <li key={q.code} className="py-3">
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
