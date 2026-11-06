import { Fragment, memo, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ITEM_STATUSES } from "../../api/schemas";
import { Pill } from "../../components/Dashboard";
import { CalculationView, EvidenceList } from "../../components/ResultItemView";
import { VerdictBadge } from "../../components/VerdictBadge";
import { INSPECTION_ORDER, inspectionTypeLabel, isTechnicalError, methodLabel } from "../../lib/verdict";
import type { ChecklistItem, Evidence, InspectionType, ItemStatus, ResultItem } from "../../types";

export type Draft = { status: ItemStatus; explanation: string; reason: string };
export type Drafts = Record<string, Draft>;

export type GridFilter = "all" | "tidak_sesuai" | "error" | "changed" | "draft";

type Verdict = Pick<ResultItem, "status" | "explanation">;
/** Status atau penjelasan berbeda. Dipakai untuk "belum disimpan" (draf vs tersimpan) dan "diubah ROCAN" (final vs AI). */
export const differs = (a: Verdict, b: Verdict | undefined) =>
  b !== undefined && (a.status !== b.status || a.explanation !== b.explanation);

/** Null bila hasilnya sama dengan nilai tersimpan, sehingga draf yang dikembalikan otomatis hilang. */
export function applyDraft(saved: ResultItem, current: Draft | undefined, patch: Partial<Draft>): Draft | null {
  const next = { ...(current ?? { status: saved.status, explanation: saved.explanation, reason: "" }), ...patch };
  return differs(next, saved) ? next : null;
}

const effective = (saved: ResultItem, draft: Draft | undefined): Verdict => draft ?? saved;

const COLUMNS: { label: string; width: string; editOnly?: boolean }[] = [
  { label: "Kode", width: "6rem" },
  { label: "Kriteria", width: "16rem" },
  { label: "Hasil AI", width: "11rem" },
  { label: "Hasil final ROCAN", width: "13rem" },
  { label: "Penjelasan", width: "18rem" },
  { label: "Bukti", width: "6rem" },
  { label: "Alasan perubahan", width: "12rem", editOnly: true },
  { label: "Aksi", width: "7rem", editOnly: true },
];

type Row = { item: ResultItem; depth: number };

function groupRows(items: ResultItem[], checklist: ChecklistItem[]): { type: InspectionType; rows: Row[] }[] {
  const parentOf = new Map(checklist.map((c) => [c.item_id, c.parent_item_id ?? null]));
  const ids = new Set(items.map((i) => i.item_id));
  const children = new Map<string, ResultItem[]>();
  const roots: ResultItem[] = [];
  for (const item of items) {
    const parent = parentOf.get(item.item_id);
    if (parent && ids.has(parent)) children.set(parent, [...(children.get(parent) ?? []), item]);
    else roots.push(item);
  }
  const walk = (item: ResultItem, depth: number): Row[] => [
    { item, depth },
    ...(children.get(item.item_id) ?? []).flatMap((c) => walk(c, depth + 1)),
  ];
  return INSPECTION_ORDER.map((type) => ({
    type,
    rows: roots.filter((i) => i.inspection_type === type).flatMap((i) => walk(i, 0)),
  })).filter((g) => g.rows.length > 0);
}

type Props = {
  items: ResultItem[];
  aiItems: ResultItem[];
  checklist: ChecklistItem[];
  drafts: Drafts;
  /** Harus stabil (useCallback) agar baris yang tidak berubah tidak dirender ulang. */
  onDraftChange: (itemId: string, draft: Draft | null) => void;
  editable: boolean;
  pending: boolean;
  filter: GridFilter;
  missingReason: ReadonlySet<string>;
  onOpenEvidence?: (e: Evidence) => void;
};

export function ResultGrid({ items, aiItems, checklist, drafts, onDraftChange, editable, pending, filter, missingReason, onOpenEvidence }: Props) {
  const groups = useMemo(() => groupRows(items, checklist), [items, checklist]);
  const criterionOf = useMemo(() => new Map(checklist.map((c) => [c.item_id, c.criterion])), [checklist]);
  const aiOf = useMemo(() => new Map(aiItems.map((a) => [a.item_id, a])), [aiItems]);
  const columns = COLUMNS.filter((c) => editable || !c.editOnly);

  const matches = (item: ResultItem) => {
    const status = effective(item, drafts[item.item_id]).status;
    switch (filter) {
      case "tidak_sesuai":
        return status === "Tidak Sesuai atau perlu revisi";
      case "error":
        return isTechnicalError(status);
      case "changed":
        return differs(item, aiOf.get(item.item_id));
      case "draft":
        return drafts[item.item_id] !== undefined;
      default:
        return true;
    }
  };
  const visible = groups.map((g) => ({ ...g, rows: g.rows.filter((r) => matches(r.item)) })).filter((g) => g.rows.length > 0);

  if (visible.length === 0) return <p className="p-6 text-center text-sm text-ink-soft">Tidak ada item untuk saringan ini.</p>;

  // Tanpa bingkai sendiri: panel tab yang menggulir, sehingga kepala tabel tetap lengket.
  return (
    <table className="sheet">
      <caption className="sr-only">Hasil Screening 1 per item</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.label} scope="col" style={{ minWidth: c.width }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {visible.map((g) => (
          <Fragment key={g.type}>
            <tr data-group>
              <th scope="colgroup" colSpan={columns.length}>
                {inspectionTypeLabel[g.type]} · {g.rows.length} item
              </th>
            </tr>
            {g.rows.map(({ item, depth }) => (
              <ResultRow
                key={item.item_id}
                item={item}
                depth={depth}
                ai={aiOf.get(item.item_id)}
                criterion={criterionOf.get(item.item_id)}
                draft={drafts[item.item_id]}
                editable={editable}
                pending={pending}
                needsReason={missingReason.has(item.item_id)}
                colCount={columns.length}
                onDraftChange={onDraftChange}
                onOpenEvidence={onOpenEvidence}
              />
            ))}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}

type RowProps = {
  item: ResultItem;
  depth: number;
  ai: ResultItem | undefined;
  criterion: string | undefined;
  draft: Draft | undefined;
  editable: boolean;
  pending: boolean;
  needsReason: boolean;
  colCount: number;
  onDraftChange: Props["onDraftChange"];
  onOpenEvidence?: Props["onOpenEvidence"];
};

const ResultRow = memo(function ResultRow({ item, depth, ai, criterion, draft, editable, pending, needsReason, colCount, onDraftChange, onOpenEvidence }: RowProps) {
  const [open, setOpen] = useState(false);
  const { status, explanation } = effective(item, draft);
  const dirty = draft !== undefined;
  const overridden = differs(item, ai);
  const technical = isTechnicalError(item.status);
  const code = item.display_code ?? item.item_id;
  const hasDetail = item.evidence.length > 0 || item.calculation !== null || technical;
  const update = (patch: Partial<Draft>) => onDraftChange(item.item_id, applyDraft(item, draft, patch));

  return (
    <>
      <tr data-selected={dirty || undefined}>
        <th scope="row" className="font-medium whitespace-nowrap tabular-nums">
          <span style={{ paddingLeft: `${depth * 14}px` }} className="inline-block">
            {depth > 0 && <span className="mr-1 text-ink-soft">↳</span>}
            {code}
          </span>
        </th>
        <td>
          <span className="block font-medium">{criterion ?? item.section ?? "Item checklist"}</span>
          <span className="mt-0.5 flex flex-wrap gap-1">
            {item.method && <span className="text-xs text-ink-soft">{methodLabel[item.method]}</span>}
            {overridden && <Pill tone="info">Diubah ROCAN</Pill>}
            {dirty && <Pill tone="warning">Belum disimpan</Pill>}
          </span>
        </td>
        <td>{ai ? <VerdictBadge status={ai.status} /> : <span className="text-ink-soft">—</span>}</td>
        <td>
          {editable ? (
            <select
              aria-label={`Hasil final ${code}`}
              value={status}
              disabled={pending}
              onChange={(e) => update({ status: e.target.value as ItemStatus })}
              className="field py-1"
            >
              {ITEM_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            <VerdictBadge status={item.status} />
          )}
        </td>
        <td>
          {editable ? (
            <textarea
              aria-label={`Penjelasan ${code}`}
              value={explanation}
              disabled={pending}
              rows={2}
              onChange={(e) => update({ explanation: e.target.value })}
              className="cell-input min-h-12 resize-y [field-sizing:content]"
            />
          ) : (
            <p className="whitespace-pre-wrap">{explanation || <span className="text-ink-soft">—</span>}</p>
          )}
          {technical && <p className="mt-1 text-xs text-warn">Belum dinilai: {item.error_reason ?? "pemeriksaan gagal secara teknis."}</p>}
        </td>
        <td>
          {hasDetail ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={`${open ? "Sembunyikan" : "Tampilkan"} bukti ${code}`}
              className="inline-flex items-center gap-1 text-sm text-brand hover:text-brand-deep"
            >
              {open ? <ChevronDown aria-hidden size={14} /> : <ChevronRight aria-hidden size={14} />}
              {item.evidence.length} bukti
            </button>
          ) : (
            <span className="text-ink-soft">—</span>
          )}
        </td>
        {editable && (
          <td>
            <input
              aria-label={`Alasan perubahan ${code}`}
              aria-invalid={needsReason || undefined}
              value={draft?.reason ?? ""}
              disabled={pending || !dirty}
              placeholder={status !== item.status ? "Wajib diisi" : dirty ? "Opsional" : ""}
              onChange={(e) => update({ reason: e.target.value })}
              className={`cell-input ${needsReason ? "border-bad bg-bad/5" : ""}`}
            />
            {needsReason && <span className="mt-0.5 block text-xs text-bad-text">Isi alasan perubahan status.</span>}
          </td>
        )}
        {editable && (
          <td>
            <span className="flex flex-col items-start gap-1">
              {dirty && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-brand hover:text-brand-deep"
                  onClick={() => onDraftChange(item.item_id, null)}
                  disabled={pending}
                  aria-label={`Batalkan draf ${code}`}
                >
                  Batalkan
                </button>
              )}
              {ai && differs({ status, explanation }, ai) && (overridden || dirty) && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-left text-xs text-brand hover:text-brand-deep"
                  onClick={() => update({ status: ai.status, explanation: ai.explanation, reason: "Dikembalikan ke hasil AI" })}
                  disabled={pending}
                  aria-label={`Kembalikan ${code} ke hasil AI`}
                >
                  Ke hasil AI
                </button>
              )}
            </span>
          </td>
        )}
      </tr>
      {open && (
        <tr>
          <td colSpan={colCount} className="bg-sky-pale/60">
            <div className="space-y-2 py-1 pl-6">
              {item.calculation && <CalculationView calculation={item.calculation} />}
              {item.evidence.length === 0 && <p className="text-sm text-ink-soft">Tanpa bukti kutipan.</p>}
              <EvidenceList evidence={item.evidence} onOpen={onOpenEvidence} className="grid gap-2 lg:grid-cols-2" />
            </div>
          </td>
        </tr>
      )}
    </>
  );
});
