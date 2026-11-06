import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { inspectionTypeLabel } from "../lib/verdict";
import type { ChecklistItem, Evidence, InspectionType, ResultItem } from "../types";
import { ResultItemView } from "./ResultItemView";
import { VerdictBadge } from "./VerdictBadge";

/** Urutan bagian hasil (PRD FR-VER-02): Lapis A/format, substansi, tabel acuan. Screening 2 terpisah. */
const ORDER: InspectionType[] = ["format_completeness", "substance", "tor_rab_alignment", "reference_table"];

type Props = {
  items: ResultItem[];
  /** Item checklist versi yang dipakai, untuk teks kriteria dan relasi induk-anak. */
  checklist?: ChecklistItem[];
  onOpenEvidence?: (evidence: Evidence) => void;
  /** Isi tambahan per item (mis. editor ROCAN). */
  renderExtra?: (item: ResultItem) => ReactNode;
};

/** Hasil Screening 1 per bagian. Sub-item tampil di bawah induknya bila relasinya diketahui. */
export function ResultSections({ items, checklist = [], onOpenEvidence, renderExtra }: Props) {
  const byId = new Map(checklist.map((c) => [c.item_id, c]));
  const parentOf = (item: ResultItem) => byId.get(item.item_id)?.parent_item_id ?? null;
  const ids = new Set(items.map((i) => i.item_id));
  const roots = items.filter((i) => {
    const parent = parentOf(i);
    return !parent || !ids.has(parent);
  });
  const childrenOf = (item: ResultItem) => items.filter((i) => parentOf(i) === item.item_id);
  const render = (item: ResultItem) => (
    <Node
      key={item.item_id}
      item={item}
      criterion={byId.get(item.item_id)?.criterion}
      childItems={childrenOf(item)}
      renderChild={render}
      onOpenEvidence={onOpenEvidence}
      extra={renderExtra?.(item)}
    />
  );

  const groups = ORDER.map((type) => ({ type, items: roots.filter((i) => i.inspection_type === type) })).filter(
    (g) => g.items.length > 0,
  );
  if (groups.length === 0) return <p className="text-sm text-ink-soft">Belum ada item hasil.</p>;

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.type}>
          <h3 className="text-sm font-semibold text-ink-soft">{inspectionTypeLabel[g.type]}</h3>
          <ul className="mt-1 divide-y divide-line border-y border-line">{g.items.map(render)}</ul>
        </div>
      ))}
    </div>
  );
}

type NodeProps = {
  item: ResultItem;
  criterion?: string;
  childItems: ResultItem[];
  renderChild: (item: ResultItem) => ReactNode;
  onOpenEvidence?: (evidence: Evidence) => void;
  extra?: ReactNode;
};

function Node({ item, criterion, childItems, renderChild, onOpenEvidence, extra }: NodeProps) {
  const [open, setOpen] = useState(false);
  if (childItems.length === 0) {
    return (
      <li className="py-3">
        <ResultItemView item={item} criterion={criterion} onOpenEvidence={onOpenEvidence}>
          {extra}
        </ResultItemView>
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
        {item.display_code && <span className="text-sm text-ink-soft tabular-nums">{item.display_code}</span>}
        <span className="font-medium">{criterion ?? item.section}</span>
        <VerdictBadge status={item.status} />
        <span className="text-sm text-ink-soft">{childItems.length} sub-item</span>
      </button>
      {open && (
        <div className="mt-2 ml-2 border-l border-line pl-5">
          {item.explanation && <p className="text-sm">{item.explanation}</p>}
          {extra}
          <ul className="divide-y divide-line">{childItems.map(renderChild)}</ul>
        </div>
      )}
    </li>
  );
}
