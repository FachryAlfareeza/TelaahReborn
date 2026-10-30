import { useId, useState, type FormEvent } from "react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { DataTable, type Column } from "../../components/DataTable";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import type { Ro } from "../../types";
import { useRos } from "../satker/hooks";
import { useCreateRo, useDeleteRo, useUpdateRo } from "./hooks";
import { ActiveLabel, errorText, Feedback, Field, inputClass, primaryButton, smallButton } from "./ui";

export function RoPage() {
  const ros = useRos();
  const create = useCreateRo();
  const update = useUpdateRo();
  const remove = useDeleteRo();

  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState<Ro | null>(null);
  const [editText, setEditText] = useState("");
  const [toDelete, setToDelete] = useState<Ro | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const ids = { code: useId(), desc: useId(), edit: useId() };

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

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!code.trim() || !description.trim()) {
      return setError("Isi kode dan deskripsi RO terlebih dahulu.");
    }
    if (await run(() => create.mutateAsync({ code, description }), `RO ${code.trim()} sudah ditambahkan.`)) {
      setCode("");
      setDescription("");
    }
  }

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const target = editing;
    if (await run(() => update.mutateAsync({ code: target.code, patch: { description: editText } }), `RO ${target.code} sudah diubah.`)) {
      setEditing(null);
    }
  }

  async function onConfirmDelete() {
    const target = toDelete;
    setToDelete(null);
    if (target) await run(() => remove.mutateAsync(target.code), `RO ${target.code} sudah dihapus.`);
  }

  const columns: Column<Ro>[] = [
    { key: "code", header: "Kode", render: (r) => r.code, sortValue: (r) => r.code },
    { key: "desc", header: "Deskripsi", render: (r) => r.description, sortValue: (r) => r.description },
    { key: "status", header: "Status", render: (r) => <ActiveLabel active={r.active} /> },
    {
      key: "actions",
      header: "Tindakan",
      render: (r) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-label={`Ubah RO ${r.code}`}
            className={smallButton}
            onClick={() => {
              setEditing(r);
              setEditText(r.description);
            }}
          >
            Ubah
          </button>
          <button
            type="button"
            aria-label={`${r.active ? "Nonaktifkan" : "Aktifkan"} RO ${r.code}`}
            className={smallButton}
            disabled={update.isPending}
            onClick={() =>
              void run(
                () => update.mutateAsync({ code: r.code, patch: { active: !r.active } }),
                `RO ${r.code} sekarang ${r.active ? "nonaktif" : "aktif"}.`,
              )
            }
          >
            {r.active ? "Nonaktifkan" : "Aktifkan"}
          </button>
          <button type="button" aria-label={`Hapus RO ${r.code}`} className={smallButton} onClick={() => setToDelete(r)}>
            Hapus
          </button>
        </div>
      ),
    },
  ];

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-deep">Master RO</h1>
      <p className="text-ink-soft">
        Daftar Rincian Output (RO) yang bisa dipilih Satker saat mengajukan. RO yang nonaktif tidak bisa dipilih.
      </p>

      <form aria-label="Tambah RO" onSubmit={(e) => void onAdd(e)} className="space-y-4 rounded-card border border-line bg-white p-4">
        <h2 className="text-xl font-bold text-brand-deep">Tambah RO</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_3fr]">
          <Field id={ids.code} label="Kode RO">
            <input id={ids.code} value={code} onChange={(e) => setCode(e.target.value)} className={inputClass} />
          </Field>
          <Field id={ids.desc} label="Deskripsi RO">
            <input id={ids.desc} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <button type="submit" disabled={create.isPending} className={primaryButton}>
          Tambah RO
        </button>
      </form>

      {editing && (
        <form aria-label="Ubah RO" onSubmit={(e) => void onSaveEdit(e)} className="space-y-4 rounded-card border border-line bg-white p-4">
          <h2 className="text-xl font-bold text-brand-deep">Ubah RO {editing.code}</h2>
          <Field id={ids.edit} label="Deskripsi baru">
            <input id={ids.edit} value={editText} onChange={(e) => setEditText(e.target.value)} className={inputClass} />
          </Field>
          <div className="flex gap-2">
            <button type="submit" disabled={update.isPending} className={primaryButton}>
              Simpan perubahan
            </button>
            <button type="button" className={smallButton} onClick={() => setEditing(null)}>
              Batal ubah
            </button>
          </div>
        </form>
      )}

      <Feedback notice={notice} error={error} />

      {ros.isPending && <LoadingState label="Memuat daftar RO..." />}
      {ros.error && <ErrorState message={ros.error.message} onRetry={() => void ros.refetch()} />}
      {ros.data && (
        <DataTable caption="Daftar RO" columns={columns} rows={ros.data} getRowKey={(r) => r.code} emptyTitle="Belum ada RO" />
      )}

      <ConfirmDialog open={toDelete !== null} title="Hapus RO?" confirmLabel="Ya, hapus" onConfirm={() => void onConfirmDelete()} onCancel={() => setToDelete(null)}>
        <p>
          RO {toDelete?.code} akan dihapus. RO yang sudah dipakai pengajuan tidak bisa dihapus. Bila hanya ingin
          berhenti memakainya, pilih Nonaktifkan.
        </p>
      </ConfirmDialog>
    </section>
  );
}
