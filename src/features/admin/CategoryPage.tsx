import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { DataTable, type Column } from "../../components/DataTable";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import type { DocumentCategory, PriorityCategory } from "../../types";
import { useDocumentCategories } from "../satker/hooks";
import {
  useCreateDocumentCategory,
  useDeleteDocumentCategory,
  usePriorityCategories,
  useUpdateDocumentCategory,
  useUpdatePriorityCategory,
} from "./hooks";
import { errorText, Feedback, Field, inputClass, primaryButton, smallButton } from "./ui";

const questionCodes = Array.from({ length: 12 }, (_, i) => `C${String(i + 1).padStart(2, "0")}`);

type Tab = "priority" | "document";
const tabs: { key: Tab; label: string }[] = [
  { key: "priority", label: "Kategori prioritas RO" },
  { key: "document", label: "Kategori dokumen" },
];

function PriorityCard({
  item,
  onSave,
  busy,
}: {
  item: PriorityCategory;
  onSave: (category: number, name: string, codes: string[]) => void;
  busy: boolean;
}) {
  const [name, setName] = useState(item.name);
  const [codes, setCodes] = useState<string[]>(item.questionCodes);
  const nameId = useId();
  const toggle = (c: string) => setCodes((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));
  return (
    <form
      aria-label={`Kategori ${item.category}`}
      onSubmit={(e) => {
        e.preventDefault();
        onSave(item.category, name, codes);
      }}
      className="space-y-3 rounded-card border border-line bg-white p-4"
    >
      <h2 className="text-xl font-bold text-brand-deep">Kategori {item.category}</h2>
      <Field id={nameId} label={`Nama kategori ${item.category}`}>
        <input id={nameId} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </Field>
      {item.category === 0 ? (
        <p className="text-sm text-ink-soft">Kategori 0 tidak punya pertanyaan. Dipakai bila bukti kurang.</p>
      ) : (
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-brand-deep">Pertanyaan pada kategori {item.category}</legend>
          <div className="flex flex-wrap gap-4">
            {questionCodes.map((c) => (
              <label key={c} className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={codes.includes(c)}
                  onChange={() => toggle(c)}
                  aria-label={`${c} untuk kategori ${item.category}`}
                />
                {c}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <button type="submit" disabled={busy} className={primaryButton}>
        Simpan kategori {item.category}
      </button>
    </form>
  );
}

export function CategoryPage() {
  const [tab, setTab] = useState<Tab>("priority");
  const priority = usePriorityCategories();
  const docCats = useDocumentCategories();
  const updatePriority = useUpdatePriorityCategory();
  const createDoc = useCreateDocumentCategory();
  const updateDoc = useUpdateDocumentCategory();
  const removeDoc = useDeleteDocumentCategory();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<DocumentCategory | null>(null);
  const [editName, setEditName] = useState("");
  const [toDelete, setToDelete] = useState<DocumentCategory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const ids = { code: useId(), name: useId(), edit: useId() };

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

  function onTabKey(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const next = (index + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
    setTab(tabs[next].key);
    document.getElementById(`tab-${tabs[next].key}`)?.focus();
  }

  async function onAddDoc(e: FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return setError("Isi kode dan nama kategori terlebih dahulu.");
    if (await run(() => createDoc.mutateAsync({ code, name }), `Kategori ${name.trim()} sudah ditambahkan.`)) {
      setCode("");
      setName("");
    }
  }

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const target = editing;
    if (await run(() => updateDoc.mutateAsync({ code: target.code, name: editName }), `Kategori ${target.code} sudah diubah.`)) {
      setEditing(null);
    }
  }

  async function onConfirmDelete() {
    const target = toDelete;
    setToDelete(null);
    if (target) await run(() => removeDoc.mutateAsync(target.code), `Kategori ${target.name} sudah dihapus.`);
  }

  const columns: Column<DocumentCategory>[] = [
    { key: "code", header: "Kode", render: (c) => c.code, sortValue: (c) => c.code },
    { key: "name", header: "Nama", render: (c) => c.name, sortValue: (c) => c.name },
    {
      key: "actions",
      header: "Tindakan",
      render: (c) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-label={`Ubah kategori ${c.code}`}
            className={smallButton}
            onClick={() => {
              setEditing(c);
              setEditName(c.name);
            }}
          >
            Ubah
          </button>
          <button type="button" aria-label={`Hapus kategori ${c.code}`} className={smallButton} onClick={() => setToDelete(c)}>
            Hapus
          </button>
        </div>
      ),
    },
  ];

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-deep">Pengelolaan Kategori</h1>

      <div role="tablist" aria-label="Jenis kategori" className="flex gap-2 border-b border-line">
        {tabs.map((t, i) => (
          <button
            key={t.key}
            id={`tab-${t.key}`}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            aria-controls={`panel-${t.key}`}
            tabIndex={tab === t.key ? 0 : -1}
            onClick={() => setTab(t.key)}
            onKeyDown={(e) => onTabKey(e, i)}
            className={`rounded-t-control px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              tab === t.key ? "border-b-2 border-brand-deep text-brand-deep" : "text-ink-soft"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Feedback notice={notice} error={error} />

      {tab === "priority" && (
        <div role="tabpanel" id="panel-priority" aria-labelledby="tab-priority" className="space-y-4">
          <p className="text-ink-soft">
            Hasil Screening 2 adalah Kategori 1 sampai 4, atau Kategori 0 bila perlu pemeriksaan manual. Satu
            pertanyaan hanya bisa ada di satu kategori. Bila dipindah, pertanyaan itu keluar dari kategori lamanya.
          </p>
          {priority.isPending && <LoadingState label="Memuat kategori prioritas..." />}
          {priority.error && <ErrorState message={priority.error.message} onRetry={() => void priority.refetch()} />}
          {priority.data?.map((p) => (
            <PriorityCard
              key={`${p.category}-${p.name}-${p.questionCodes.join()}`}
              item={p}
              busy={updatePriority.isPending}
              onSave={(category, newName, codes) =>
                void run(
                  () => updatePriority.mutateAsync({ category, patch: { name: newName, questionCodes: codes } }),
                  `Kategori ${category} sudah disimpan.`,
                )
              }
            />
          ))}
        </div>
      )}

      {tab === "document" && (
        <div role="tabpanel" id="panel-document" aria-labelledby="tab-document" className="space-y-4">
          <p className="text-ink-soft">Jenis dokumen, misalnya TOR, RAB, dan jenis acuan seperti RPJMN, Renstra, PMK/SBM.</p>
          <form aria-label="Tambah kategori dokumen" onSubmit={(e) => void onAddDoc(e)} className="space-y-4 rounded-card border border-line bg-white p-4">
            <h2 className="text-xl font-bold text-brand-deep">Tambah kategori dokumen</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id={ids.code} label="Kode kategori dokumen">
                <input id={ids.code} value={code} onChange={(e) => setCode(e.target.value)} className={inputClass} />
              </Field>
              <Field id={ids.name} label="Nama kategori dokumen">
                <input id={ids.name} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
              </Field>
            </div>
            <button type="submit" disabled={createDoc.isPending} className={primaryButton}>
              Tambah kategori
            </button>
          </form>

          {editing && (
            <form aria-label="Ubah kategori dokumen" onSubmit={(e) => void onSaveEdit(e)} className="space-y-4 rounded-card border border-line bg-white p-4">
              <h2 className="text-xl font-bold text-brand-deep">Ubah kategori {editing.code}</h2>
              <Field id={ids.edit} label="Nama baru">
                <input id={ids.edit} value={editName} onChange={(e) => setEditName(e.target.value)} className={inputClass} />
              </Field>
              <div className="flex gap-2">
                <button type="submit" disabled={updateDoc.isPending} className={primaryButton}>
                  Simpan perubahan
                </button>
                <button type="button" className={smallButton} onClick={() => setEditing(null)}>
                  Batal ubah
                </button>
              </div>
            </form>
          )}

          {docCats.isPending && <LoadingState label="Memuat kategori dokumen..." />}
          {docCats.error && <ErrorState message={docCats.error.message} onRetry={() => void docCats.refetch()} />}
          {docCats.data && (
            <DataTable caption="Kategori dokumen" columns={columns} rows={docCats.data} getRowKey={(c) => c.code} emptyTitle="Belum ada kategori dokumen" />
          )}
        </div>
      )}

      <ConfirmDialog open={toDelete !== null} title="Hapus kategori dokumen?" confirmLabel="Ya, hapus" onConfirm={() => void onConfirmDelete()} onCancel={() => setToDelete(null)}>
        <p>
          Kategori "{toDelete?.name}" akan dihapus. Kategori yang masih dipakai dokumen acuan tidak bisa dihapus.
        </p>
      </ConfirmDialog>
    </section>
  );
}
