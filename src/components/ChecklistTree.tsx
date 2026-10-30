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
    <ul className="space-y-3">
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
      <li className="rounded-card border border-line bg-white p-3">
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
    <li className="rounded-card border border-line bg-white p-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-wrap items-center gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <Icon aria-hidden="true" size={16} />
        <span className="text-sm text-ink-soft">{node.code}</span>
        <span className="font-medium">{node.title}</span>
        <VerdictBadge kind={kind} />
        <span className="text-sm text-ink-soft">({node.children.length} butir)</span>
      </button>
      {open && (
        <ul className="mt-3 space-y-3 border-l border-line pl-4">
          {node.children.map((c) => (
            <TreeNode key={c.code} node={c} onOpenEvidence={onOpenEvidence} />
          ))}
        </ul>
      )}
    </li>
  );
}
