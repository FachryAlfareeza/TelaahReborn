import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Evidence, Screening1Node } from "../types";
import { deriveNodeStatus } from "../lib/verdict";
import { VerdictBadge } from "./VerdictBadge";
import { VerdictRow } from "./VerdictRow";

type Props = {
  items: Screening1Node[];
  onOpenEvidence?: (evidence: Evidence) => void;
};

/** Pohon checklist induk dan anak. Status induk diturunkan dari anak-anaknya. */
export function ChecklistTree({ items, onOpenEvidence }: Props) {
  if (items.length === 0) return <p className="text-sm text-ink-soft">Belum ada butir checklist.</p>;
  return (
    <ul className="divide-y divide-line border-y border-line">
      {items.map((n) => (
        <TreeNode key={n.code} node={n} onOpenEvidence={onOpenEvidence} />
      ))}
    </ul>
  );
}

function TreeNode({ node, onOpenEvidence }: { node: Screening1Node; onOpenEvidence?: Props["onOpenEvidence"] }) {
  const [open, setOpen] = useState(false);
  const kind = deriveNodeStatus(node);

  if (node.children.length === 0) {
    return (
      <li className="py-3">
        <VerdictRow
          code={node.code}
          title={node.title}
          kind={kind}
          recommendation={node.recommendation}
          evidence={node.evidence}
          onOpenEvidence={onOpenEvidence}
        />
      </li>
    );
  }

  const Icon = open ? ChevronDown : ChevronRight;
  return (
    <li className="py-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-left"
      >
        <Icon aria-hidden="true" size={16} className="text-ink-soft" />
        <span className="text-sm text-ink-soft tabular-nums">{node.code}</span>
        <span className="font-medium">{node.title}</span>
        <VerdictBadge kind={kind} />
        <span className="text-sm text-ink-soft">{node.children.length} butir</span>
      </button>
      {open && (
        <ul className="mt-2 ml-2 divide-y divide-line border-l border-line pl-5">
          {node.children.map((c) => (
            <TreeNode key={c.code} node={c} onOpenEvidence={onOpenEvidence} />
          ))}
        </ul>
      )}
    </li>
  );
}
