import { useId, useState, type FormEvent } from "react";
import {
  useActivateChecklist,
  useChecklists,
  useCreateChecklist,
  useUpdateChecklistItems,
} from "../../api/queries";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ErrorState } from "../../components/ErrorState";
import { ActiveLabel, errorText, Feedback, Field } from "../../components/form";
import { LoadingState } from "../../components/LoadingState";
import { DashboardPage, Panel, StatCard } from "../../components/Dashboard";
import { formatDate } from "../../lib/date";
import { executorLabel, inspectionTypeLabel, methodLabel } from "../../lib/verdict";
import type { CheckExecutor, CheckMethod, ChecklistItem, ChecklistVersion, InspectionType } from "../../types";

/** Metode bawaan per jenis pemeriksaan, sama dengan aturan backend. */
const DEFAULT_METHOD: Record<InspectionType, CheckMethod> = {
  format_completeness: "rule",
  substance: "llm_rag",
  tor_rab_alignment: "llm",
  reference_table: "lookup",
  categorization: "llm_rag",
};

const S1_TYPES: InspectionType[] = ["format_completeness", "substance", "tor_rab_alignment", "reference_table"];

const blankItem = (type: InspectionType = "substance"): ChecklistItem => ({
  item_id: crypto.randomUUID(),
  display_code: "",
  section: "",
  inspection_type: type,
  method: DEFAULT_METHOD[type],
  executor: "app",
  criterion: "",
  instructions: null,
  pass_criteria: null,
  source: null,
  parent_item_id: null,
  evidence_requirements: {},
});

/**
 * Aturan item checklist (kontrak §3.7). Diperiksa di sini agar pesan muncul sebelum dikirim;
 * backend tetap memvalidasi ulang.
 */
export function checklistProblems(s1: ChecklistItem[], s2: ChecklistItem[]): string[] {
  const out: string[] = [];
  if (s1.length === 0) out.push("Screening 1 harus berisi minimal satu item.");
  if (s2.length !== 1 || s2[0].inspection_type !== "categorization") out.push("Screening 2 harus berupa satu item kategorisasi.");
  if (s1.some((i) => i.inspection_type === "categorization")) out.push("Item kategorisasi hanya boleh di Screening 2.");
  [...s1, ...s2].forEach((i, n) => {
    const name = i.display_code || `item ke-${n + 1}`;
    if (!i.criterion.trim()) out.push(`Kriteria ${name} belum diisi.`);
    if (i.executor === "team1_lapis_a" && i.inspection_type !== "format_completeness") {
      out.push(`${name}: pelaksana Lapis A hanya untuk item format dan kelengkapan.`);
    }
    if (i.executor === "team1_lapis_a" && !i.display_code?.trim()) out.push(`${name}: item Lapis A wajib punya kode tampilan.`);
    if (i.inspection_type === "reference_table" && i.method !== "lookup") out.push(`${name}: item tabel acuan wajib memakai pencocokan tabel.`);
  });
  return out;
}

function ItemFields({
  item,
  siblings,
  onChange,
  onRemove,
  categorization,
}: {
  item: ChecklistItem;
  siblings: ChecklistItem[];
  onChange: (item: ChecklistItem) => void;
  onRemove?: () => void;
  categorization?: boolean;
}) {
  const base = useId();
  const id = (k: string) => `${base}-${k}`;
  const set = <K extends keyof ChecklistItem>(k: K, v: ChecklistItem[K]) => onChange({ ...item, [k]: v });
  const text = (v: string) => (v.trim() === "" ? null : v);
  return (
    <details className="py-1" open={!item.criterion}>
      <summary className="cursor-pointer text-sm">
        <span className="tabular-nums text-ink-soft">{item.display_code || "Tanpa kode"}</span>{" "}
        <span className="font-medium">{item.criterion || "Item baru"}</span>
      </summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field id={id("code")} label="Kode tampilan">
          <input id={id("code")} value={item.display_code ?? ""} onChange={(e) => set("display_code", text(e.target.value))} className="field" />
        </Field>
        <Field id={id("section")} label="Bagian">
          <input id={id("section")} value={item.section ?? ""} onChange={(e) => set("section", text(e.target.value))} className="field" />
        </Field>
        {!categorization && (
          <Field id={id("type")} label="Jenis pemeriksaan">
            <select
              id={id("type")}
              value={item.inspection_type}
              onChange={(e) => {
                const type = e.target.value as InspectionType;
                onChange({
                  ...item,
                  inspection_type: type,
                  method: DEFAULT_METHOD[type],
                  executor: type === "format_completeness" ? item.executor : "app",
                });
              }}
              className="field"
            >
              {S1_TYPES.map((t) => (
                <option key={t} value={t}>
                  {inspectionTypeLabel[t]}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field id={id("method")} label="Metode">
          <select id={id("method")} value={item.method ?? ""} onChange={(e) => set("method", e.target.value as CheckMethod)} className="field">
            {(Object.keys(methodLabel) as CheckMethod[]).map((m) => (
              <option key={m} value={m}>
                {methodLabel[m]}
              </option>
            ))}
          </select>
        </Field>
        <Field id={id("executor")} label="Pelaksana">
          <select
            id={id("executor")}
            value={item.executor ?? "app"}
            onChange={(e) => set("executor", e.target.value as CheckExecutor)}
            className="field"
          >
            {(Object.keys(executorLabel) as CheckExecutor[]).map((x) => (
              <option key={x} value={x} disabled={x === "team1_lapis_a" && item.inspection_type !== "format_completeness"}>
                {executorLabel[x]}
              </option>
            ))}
          </select>
        </Field>
        {!categorization && (
          <Field id={id("parent")} label="Induk (opsional)">
            <select
              id={id("parent")}
              value={item.parent_item_id ?? ""}
              onChange={(e) => set("parent_item_id", e.target.value || null)}
              className="field"
            >
              <option value="">Tanpa induk</option>
              {siblings
                .filter((s) => s.item_id !== item.item_id && !s.parent_item_id)
                .map((s) => (
                  <option key={s.item_id} value={s.item_id ?? ""}>
                    {s.display_code || s.criterion.slice(0, 40)}
                  </option>
                ))}
            </select>
          </Field>
        )}
        <div className="sm:col-span-2">
          <Field id={id("criterion")} label="Kriteria">
            <textarea id={id("criterion")} value={item.criterion} onChange={(e) => set("criterion", e.target.value)} rows={2} className="field" />
          </Field>
        </div>
        <Field id={id("source")} label="Sumber atau bagian yang dicari (opsional)">
          <input id={id("source")} value={item.source ?? ""} onChange={(e) => set("source", text(e.target.value))} className="field" />
        </Field>
        <Field id={id("pass")} label="Kriteria lulus (opsional)">
          <input id={id("pass")} value={item.pass_criteria ?? ""} onChange={(e) => set("pass_criteria", text(e.target.value))} className="field" />
        </Field>
        <div className="sm:col-span-2">
          <Field id={id("instructions")} label="Instruksi pemeriksaan (opsional)">
            <textarea
              id={id("instructions")}
              value={item.instructions ?? ""}
              onChange={(e) => set("instructions", text(e.target.value))}
              rows={2}
              className="field"
            />
          </Field>
        </div>
      </div>
      {onRemove && (
        <button type="button" onClick={onRemove} className="mt-3 link text-sm">
          Hapus item ini
        </button>
      )}
    </details>
  );
}

type EditorProps = {
  /** Versi yang diedit langsung, atau null untuk versi baru. */
  editing: ChecklistVersion | null;
  initial: { s1: ChecklistItem[]; s2: ChecklistItem[]; name: string };
  onDone: () => void;
};

function ChecklistEditor({ editing, initial, onDone }: EditorProps) {
  const create = useCreateChecklist();
  const update = useUpdateChecklistItems();
  const nameId = useId();
  const [name, setName] = useState(initial.name);
  const [activate, setActivate] = useState(true);
  const [s1, setS1] = useState(initial.s1);
  const [s2, setS2] = useState(initial.s2.length ? initial.s2 : [blankItem("categorization")]);
  const [error, setError] = useState<string | null>(null);
  const busy = create.isPending || update.isPending;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const problems = checklistProblems(s1, s2);
    if (!editing && !name.trim()) problems.unshift("Nama versi belum diisi.");
    if (problems.length) return setError(problems.join(" "));
    setError(null);
    // Induk yang terhapus tidak boleh tetap dirujuk.
    const ids = new Set(s1.map((i) => i.item_id));
    const items = s1.map((i) => (i.parent_item_id && !ids.has(i.parent_item_id) ? { ...i, parent_item_id: null } : i));
    try {
      if (editing) await update.mutateAsync({ id: editing.id, input: { screening_1_items: items, screening_2_items: s2 } });
      else await create.mutateAsync({ nama_versi: name.trim(), screening_1_items: items, screening_2_items: s2, activate });
      onDone();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {!editing && (
        <div className="flex flex-wrap items-end gap-4">
          <Field id={nameId} label="Nama versi">
            <input id={nameId} value={name} onChange={(e) => setName(e.target.value)} className="field w-80" />
          </Field>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" checked={activate} onChange={(e) => setActivate(e.target.checked)} />
            Langsung aktifkan
          </label>
        </div>
      )}
      <h3 className="text-sm font-semibold">Screening 1 ({s1.length} item)</h3>
      <div className="space-y-2">
        {s1.map((item, i) => (
          <ItemFields
            key={item.item_id}
            item={item}
            siblings={s1}
            onChange={(next) => setS1((list) => list.map((x, j) => (j === i ? next : x)))}
            onRemove={() => setS1((list) => list.filter((_, j) => j !== i))}
          />
        ))}
      </div>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setS1((list) => [...list, blankItem()])}>
        Tambah item
      </button>
      <h3 className="text-sm font-semibold">Screening 2 (satu item kategorisasi)</h3>
      <ItemFields item={s2[0]} siblings={[]} categorization onChange={(next) => setS2([next])} />
      <Feedback notice={null} error={error} />
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? "Menyimpan..." : editing ? "Simpan perubahan" : "Simpan versi baru"}
        </button>
        <button type="button" disabled={busy} onClick={onDone} className="btn btn-secondary">
          Batal
        </button>
      </div>
    </form>
  );
}

function VersionItems({ version }: { version: ChecklistVersion }) {
  const items = version.screening_1_items;
  const roots = items.filter((i) => !i.parent_item_id);
  const row = (i: ChecklistItem) => (
    <span>
      <span className="tabular-nums text-ink-soft">{i.display_code ?? "—"}</span> {i.criterion}
      <span className="block text-xs text-ink-soft">
        {inspectionTypeLabel[i.inspection_type]} · {i.method ? methodLabel[i.method] : "—"} ·{" "}
        {i.executor ? executorLabel[i.executor] : "—"}
        {i.source ? ` · ${i.source}` : ""}
      </span>
    </span>
  );
  return (
    <div className="space-y-3 text-sm">
      <ul className="space-y-2">
        {roots.map((r) => (
          <li key={r.item_id}>
            {row(r)}
            {items.some((c) => c.parent_item_id === r.item_id) && (
              <ul className="mt-1 ml-4 space-y-1 border-l border-line pl-3">
                {items
                  .filter((c) => c.parent_item_id === r.item_id)
                  .map((c) => (
                    <li key={c.item_id}>{row(c)}</li>
                  ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <p className="term">Screening 2</p>
      {version.screening_2_items.map((i) => (
        <p key={i.item_id}>{row(i)}</p>
      ))}
    </div>
  );
}

/** Versi yang sudah dipakai review tidak bisa diedit; buat versi baru (PRD §8.7). */
export function ChecklistPage() {
  const versions = useChecklists();
  const activate = useActivateChecklist();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<{ kind: "view" } | { kind: "new"; from: ChecklistVersion | null } | { kind: "edit" }>({
    kind: "view",
  });
  const [confirm, setConfirm] = useState<ChecklistVersion | null>(null);

  if (versions.isPending) return <LoadingState label="Memuat checklist..." />;
  if (versions.error) return <ErrorState message={versions.error.message} onRetry={() => void versions.refetch()} />;
  const list = versions.data;
  const active = list.find((v) => v.is_active) ?? null;
  const selected = list.find((v) => v.id === selectedId) ?? active ?? list[0] ?? null;

  return (
    <DashboardPage
      title="Checklist"
      actions={
        mode.kind === "view" && (
          <button type="button" className="btn btn-primary" onClick={() => setMode({ kind: "new", from: selected })}>
            Buat versi baru
          </button>
        )
      }
      stats={
        <>
          <StatCard label="Versi" value={list.length} />
          <StatCard label="Versi aktif" value={active?.nama_versi ?? "—"} />
          <StatCard label="Item Screening 1 (aktif)" value={active?.screening_1_items.length ?? 0} />
          <StatCard label="Item Screening 2 (aktif)" value={active?.screening_2_items.length ?? 0} />
        </>
      }
    >
      {!active && <ErrorState title="Belum ada checklist aktif" message="Pengajuan baru tidak akan direviu sampai ada versi aktif." />}
      {activate.error && <ErrorState message={activate.error.message} />}

      {mode.kind !== "view" ? (
        <Panel title={mode.kind === "edit" ? `Ubah ${selected?.nama_versi ?? ""}` : "Versi baru"} className="lg:flex-1">
          <ChecklistEditor
            editing={mode.kind === "edit" ? selected : null}
            initial={
              mode.kind === "edit" && selected
                ? { s1: selected.screening_1_items, s2: selected.screening_2_items, name: selected.nama_versi }
                : mode.kind === "new" && mode.from
                  ? { s1: mode.from.screening_1_items, s2: mode.from.screening_2_items, name: `${mode.from.nama_versi} (salinan)` }
                  : { s1: [blankItem()], s2: [blankItem("categorization")], name: "" }
            }
            onDone={() => setMode({ kind: "view" })}
          />
        </Panel>
      ) : (
        <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Panel title="Versi" flush>
            {list.length === 0 ? (
              <p className="p-4 text-sm text-ink-soft">Belum ada versi checklist.</p>
            ) : (
              <ul className="divide-y divide-line">
                {list.map((v) => (
                  <li key={v.id} className={`space-y-1 px-4 py-3 text-sm ${v.id === selected?.id ? "bg-sky-pale" : ""}`}>
                    <button type="button" className="link font-medium" onClick={() => setSelectedId(v.id)} aria-current={v.id === selected?.id}>
                      {v.nama_versi}
                    </button>
                    <p className="flex flex-wrap items-center gap-x-3 text-xs text-ink-soft">
                      <span>{formatDate(v.created_at)}</span>
                      <span>{v.screening_1_items.length} item</span>
                      <ActiveLabel active={v.is_active} />
                    </p>
                    {!v.is_active && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirm(v)}>
                        Aktifkan
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {selected ? (
            <Panel
              title={selected.nama_versi}
              actions={
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMode({ kind: "edit" })}>
                  Ubah versi ini
                </button>
              }
            >
              <p className="mb-3 text-xs text-ink-soft">Versi yang sudah dipakai review tidak dapat diubah; buat versi baru.</p>
              <VersionItems version={selected} />
            </Panel>
          ) : (
            <Panel>
              <p className="text-sm text-ink-soft">Belum ada versi.</p>
            </Panel>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirm !== null}
        title={`Aktifkan ${confirm?.nama_versi ?? ""}?`}
        confirmLabel="Ya, aktifkan"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) activate.mutate(confirm.id);
          setConfirm(null);
        }}
      >
        Versi aktif lain akan dinonaktifkan. Review berikutnya memakai versi ini; review lama tetap memakai versinya.
      </ConfirmDialog>
    </DashboardPage>
  );
}
