import { useId, useMemo, useState, type FormEvent } from "react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { DataTable, type Column } from "../../components/DataTable";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { displayValue } from "../../lib/empty";
import type { ChecklistItem, DocumentType } from "../../types";
import {
  useChecklist,
  useCreateChecklistItem,
  useDeleteChecklistItem,
  useSplitChecklistItem,
  useUpdateChecklistItem,
} from "./hooks";
import { ActiveLabel, errorText, Feedback, Field } from "./ui";

const docTypes: { value: DocumentType; label: string }[] = [
  { value: "TOR", label: "TOR" },
  { value: "RAB", label: "RAB" },
  { value: "ACUAN", label: "Acuan" },
];
const docLabel = (t: DocumentType) => docTypes.find((d) => d.value === t)?.label ?? t;

type Draft = {
  code: string;
  title: string;
  parentCode: string;
  order: string;
  requiredDocuments: DocumentType[];
  source: string;
};
const blank: Draft = { code: "", title: "", parentCode: "", order: "1", requiredDocuments: ["TOR"], source: "" };

/** Urutan tampil: induk berurutan, tiap induk diikuti anak-anaknya. */
function arrange(items: ChecklistItem[]): ChecklistItem[] {
  const byOrder = (a: ChecklistItem, b: ChecklistItem) => a.order - b.order || a.code.localeCompare(b.code);
  const out: ChecklistItem[] = [];
  const walk = (parent: string | null) => {
    for (const i of items.filter((x) => x.parentCode === parent).sort(byOrder)) {
      out.push(i);
      walk(i.code);
    }
  };
  walk(null);
  // Butir yatim (induk tidak ada) tetap ditampilkan agar tidak hilang.
  for (const i of items) if (!out.includes(i)) out.push(i);
  return out;
}

export function ChecklistPage() {
  const checklist = useChecklist();
  const create = useCreateChecklistItem();
  const update = useUpdateChecklistItem();
  const remove = useDeleteChecklistItem();
  const split = useSplitChecklistItem();

  const [draft, setDraft] = useState<Draft>(blank);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [splitCode, setSplitCode] = useState<string | null>(null);
  const [splitText, setSplitText] = useState("");
  const [toDelete, setToDelete] = useState<ChecklistItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const ids = { code: useId(), title: useId(), parent: useId(), order: useId(), source: useId(), split: useId() };

  const items = useMemo(() => arrange(checklist.data?.items ?? []), [checklist.data]);
  const titleOf = (code: string | null) => (code ? (items.find((i) => i.code === code)?.title ?? code) : null);

  async function run(action: () => Promise<unknown>, done: string) {
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(done);
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    }
  }

  function toggleDoc(t: DocumentType) {
    setDraft((d) => ({
      ...d,
      requiredDocuments: d.requiredDocuments.includes(t)
        ? d.requiredDocuments.filter((x) => x !== t)
        : [...d.requiredDocuments, t],
    }));
  }

  function startEdit(i: ChecklistItem) {
    setSplitCode(null);
    setEditingCode(i.code);
    setDraft({
      code: i.code,
      title: i.title,
      parentCode: i.parentCode ?? "",
      order: String(i.order),
      requiredDocuments: [...i.requiredDocuments],
      source: i.source ?? "",
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft.code.trim() || !draft.title.trim()) return setError("Isi kode dan judul butir terlebih dahulu.");
    const order = Number(draft.order);
    if (!Number.isInteger(order) || order < 0) return setError("Urutan harus berupa bilangan bulat 0 atau lebih.");
    const base = {
      title: draft.title,
      parentCode: draft.parentCode || null,
      order,
      requiredDocuments: draft.requiredDocuments,
      source: draft.source.trim() || null,
    };
    const ok = editingCode
      ? await run(() => update.mutateAsync({ code: editingCode, patch: base }), `Butir ${editingCode} sudah diubah.`)
      : await run(
          () => create.mutateAsync({ ...base, code: draft.code, active: true }),
          `Butir ${draft.code.trim()} sudah ditambahkan.`,
        );
    if (ok) {
      setEditingCode(null);
      setDraft(blank);
    }
  }

  async function onSplit(e: FormEvent) {
    e.preventDefault();
    if (!splitCode) return;
    const code = splitCode;
    const titles = splitText.split("\n");
    if (await run(() => split.mutateAsync({ code, titles }), `Butir ${code} sudah dipecah.`)) {
      setSplitCode(null);
      setSplitText("");
    }
  }

  async function onConfirmDelete() {
    const target = toDelete;
    setToDelete(null);
    if (target) await run(() => remove.mutateAsync(target.code), `Butir ${target.code} sudah dihapus.`);
  }

  const columns: Column<ChecklistItem>[] = [
    { key: "code", header: "Kode", render: (i) => i.code },
    { key: "title", header: "Judul", render: (i) => i.title },
    { key: "parent", header: "Induk", render: (i) => displayValue(i.parentCode) },
    { key: "order", header: "Urutan", render: (i) => i.order, numeric: true },
    { key: "docs", header: "Dokumen wajib dikutip", render: (i) => i.requiredDocuments.map(docLabel).join(", ") || "—" },
    { key: "source", header: "Dicari di bagian TOR", render: (i) => displayValue(i.source) },
    { key: "status", header: "Status", render: (i) => <ActiveLabel active={i.active} /> },
    {
      key: "actions",
      header: "Tindakan",
      render: (i) => (
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-label={`Ubah butir ${i.code}`} className="btn btn-secondary btn-sm" onClick={() => startEdit(i)}>
            Ubah
          </button>
          <button
            type="button"
            aria-label={`Pecah butir ${i.code}`}
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setEditingCode(null);
              setDraft(blank);
              setSplitCode(i.code);
            }}
          >
            Pecah
          </button>
          <button
            type="button"
            aria-label={`${i.active ? "Nonaktifkan" : "Aktifkan"} butir ${i.code}`}
            className="btn btn-secondary btn-sm"
            disabled={update.isPending}
            onClick={() =>
              void run(
                () => update.mutateAsync({ code: i.code, patch: { active: !i.active } }),
                `Butir ${i.code} sekarang ${i.active ? "nonaktif" : "aktif"}.`,
              )
            }
          >
            {i.active ? "Nonaktifkan" : "Aktifkan"}
          </button>
          <button type="button" aria-label={`Hapus butir ${i.code}`} className="btn btn-secondary btn-sm" onClick={() => setToDelete(i)}>
            Hapus
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="page-title">Pengelolaan Checklist</h1>
      {checklist.data && (
        <p className="text-sm text-ink-soft">Versi checklist: {checklist.data.version}</p>
      )}

      <form
        aria-label={editingCode ? "Ubah butir checklist" : "Tambah butir checklist"}
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-4 border-t border-line pt-6"
      >
        <h2 className="section-title">
          {editingCode ? `Ubah butir ${editingCode}` : "Tambah butir checklist"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={ids.code} label="Kode butir">
            <input id={ids.code} value={draft.code} disabled={editingCode !== null} onChange={(e) => setDraft({ ...draft, code: e.target.value })} className={`field disabled:bg-sky-pale`} />
          </Field>
          <Field id={ids.title} label="Judul butir">
            <input id={ids.title} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="field" />
          </Field>
          <Field id={ids.parent} label="Induk">
            <select id={ids.parent} value={draft.parentCode} onChange={(e) => setDraft({ ...draft, parentCode: e.target.value })} className="field">
              <option value="">Tanpa induk</option>
              {items
                .filter((i) => i.code !== editingCode)
                .map((i) => (
                  <option key={i.code} value={i.code}>
                    {i.code} - {i.title}
                  </option>
                ))}
            </select>
          </Field>
          <Field id={ids.order} label="Urutan">
            <input id={ids.order} type="number" min={0} value={draft.order} onChange={(e) => setDraft({ ...draft, order: e.target.value })} className="field" />
          </Field>
          <Field id={ids.source} label="Dicari di bagian TOR (pemetaan 5W+1H)">
            <input id={ids.source} value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} className="field" />
          </Field>
          <fieldset>
            <legend className="field-label">Dokumen wajib dikutip</legend>
            <div className="flex flex-wrap gap-4">
              {docTypes.map((d) => (
                <label key={d.value} className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.requiredDocuments.includes(d.value)} onChange={() => toggleDoc(d.value)} />
                  {d.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={create.isPending || update.isPending} className="btn btn-primary">
            {editingCode ? "Simpan perubahan" : "Tambah butir"}
          </button>
          {editingCode && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setEditingCode(null);
                setDraft(blank);
              }}
            >
              Batal ubah
            </button>
          )}
        </div>
      </form>

      {splitCode && (
        <form aria-label="Pecah butir" onSubmit={(e) => void onSplit(e)} className="space-y-4 border-t border-line pt-6">
          <h2 className="section-title">Pecah butir {splitCode}</h2>
          <p className="text-sm text-ink-soft">
            Butir "{titleOf(splitCode)}" akan punya anak baru. Tulis satu judul per baris, minimal dua baris.
          </p>
          <Field id={ids.split} label="Judul butir baru (satu per baris)">
            <textarea id={ids.split} rows={4} value={splitText} onChange={(e) => setSplitText(e.target.value)} className="field" />
          </Field>
          <div className="flex gap-2">
            <button type="submit" disabled={split.isPending} className="btn btn-primary">
              Pecah butir
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSplitCode(null)}>
              Batal pecah
            </button>
          </div>
        </form>
      )}

      <Feedback notice={notice} error={error} />

      {checklist.isPending && <LoadingState label="Memuat checklist..." />}
      {checklist.error && <ErrorState message={checklist.error.message} onRetry={() => void checklist.refetch()} />}
      {checklist.data && (
        <DataTable caption="Butir checklist" columns={columns} rows={items} getRowKey={(i) => i.code} pageSize={50} emptyTitle="Belum ada butir checklist" />
      )}

      <ConfirmDialog open={toDelete !== null} title="Hapus butir checklist?" confirmLabel="Ya, hapus" onConfirm={() => void onConfirmDelete()} onCancel={() => setToDelete(null)}>
        <p>
          Butir {toDelete?.code} akan dihapus. Butir yang masih punya anak tidak bisa dihapus. Bila hanya ingin
          berhenti memakainya, pilih Nonaktifkan.
        </p>
      </ConfirmDialog>
    </div>
  );
}
