import type { ReactNode } from "react";
import type { Evidence } from "../types";
import { EvidenceQuote } from "./EvidenceQuote";
import { VerdictBadge } from "./VerdictBadge";
import type { VerdictKind } from "../lib/verdict";

type Props = {
  title: string;
  code?: string;
  kind: VerdictKind;
  recommendation?: string | null;
  evidence?: Evidence[];
  onOpenEvidence?: (evidence: Evidence) => void;
  children?: ReactNode;
};

/** Satu butir: status, rekomendasi, dan bukti. Gagal teknis tidak diberi kesimpulan. */
export function VerdictRow({ title, code, kind, recommendation, evidence = [], onOpenEvidence, children }: Props) {
  const technical = kind === "TECHNICAL";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {code && <span className="text-sm text-ink-soft">{code}</span>}
        <span className="font-medium">{title}</span>
        <VerdictBadge kind={kind} />
      </div>
      {technical && (
        <p className="text-sm text-ink-soft">
          Butir ini belum bisa dinilai karena ada masalah pada pemrosesan. Ini bukan kesimpulan reviu.
        </p>
      )}
      {!technical && recommendation && (
        <p className="text-sm">
          <span className="font-medium">Saran: </span>
          {recommendation}
        </p>
      )}
      {!technical && evidence.length > 0 && (
        <ul className="space-y-2">
          {evidence.map((e) => (
            <li key={e.id}>
              <EvidenceQuote evidence={e} onOpen={onOpenEvidence} />
            </li>
          ))}
        </ul>
      )}
      {children}
    </div>
  );
}
