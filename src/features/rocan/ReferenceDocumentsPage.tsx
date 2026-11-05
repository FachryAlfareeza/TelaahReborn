import { useId, useState, type FormEvent } from "react";
import { ActiveLabel } from "../../components/ActiveLabel";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { DataTable, type Column } from "../../components/DataTable";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { UploadDropzone } from "../../components/UploadDropzone";
import { formatDate } from "../../lib/date";
import type { ReferenceDocument } from "../../types";
import {
  useAddReferenceDocument,
  useDeleteReferenceDocument,
  useDocumentCategories,
  useReferenceDocuments,
  useSetReferenceDocumentActive,
} from "../satker/hooks";




export function ReferenceDocumentsPage() {
  const categories = useDocumentCategories();
  const docs = useReferenceDocuments();
  const add = useAddReferenceDocument();
  const toggle = useSetReferenceDocumentActive();
  const remove = useDeleteReferenceDocument();

  const [categoryCode, setCategoryCode] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ReferenceDocument | null>(null);
  const ids = { category: useId(), title: useId(), error: useId() };

  const categoryName = (code: string) => categories.data?.find((c) => c.code === code)?.name ?? code;
  const viewed = docs.data?.find((d) => d.id === viewId) ?? null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (!categoryCode) return setFormError("Pilih kategori dokumen terlebih dahulu.");
    if (!title.trim()) return setFormError("Isi judul dokumen terlebih dahulu.");
    if (!file) return setFormError("Pilih berkas PDF terlebih dahulu.");
    setFormError(null);
    try {
      await add.mutateAsync({ categoryCode, title, file });
      setTitle("");
      setFile(null);
      setNotice("Dokumen acuan sudah ditambahkan.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Dokumen belum bisa ditambahkan. Coba lagi.");
    }
  }

  async function onToggle(d: ReferenceDocument) {
    setNotice(null);
    try {
      await toggle.mutateAsync({ id: d.id, active: !d.active });
      setNotice(`"${d.title}" sekarang ${d.active ? "nonaktif" : "aktif"}.`);
    } catch {
      /* galat ditampilkan lewat toggle.error */
    }
  }

  async function onConfirmDelete() {
    const target = toDelete;
    setToDelete(null);
    if (!target) return;
    setNotice(null);
    try {
      await remove.mutateAsync(target.id);
      if (viewId === target.id) setViewId(null);
      setNotice(`"${target.title}" sudah dihapus.`);
    } catch {
      /* galat ditampilkan lewat remove.error */
    }
  }

  const columns: Column<ReferenceDocument>[] = [
    { key: "title", header: "Judul", render: (d) => d.title, sortValue: (d) => d.title },
    { key: "file", header: "Berkas", render: (d) => d.fileName },
    { key: "date", header: "Ditambahkan", render: (d) => formatDate(d.addedAt), sortValue: (d) => d.addedAt },
    { key: "status", header: "Status", render: (d) => <ActiveLabel active={d.active} /> },
    {
      key: "actions",
      header: "Tindakan",
      render: (d) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-expanded={viewId === d.id}
            aria-label={`${viewId === d.id ? "Tutup" : "Lihat"} rincian ${d.title}`}
            onClick={() => setViewId(viewId === d.id ? null : d.id)}
            className="btn btn-secondary btn-sm"
          >
            {viewId === d.id ? "Tutup rincian" : "Lihat"}
          </button>
          <button
            type="button"
            aria-label={`${d.active ? "Nonaktifkan" : "Aktifkan"} ${d.title}`}
            disabled={toggle.isPending}
            onClick={() => void onToggle(d)}
            className={`btn btn-secondary btn-sm disabled:opacity-50`}
          >
            {d.active ? "Nonaktifkan" : "Aktifkan"}
          </button>
          <button
            type="button"
            aria-label={`Hapus ${d.title}`}
            onClick={() => setToDelete(d)}
            className="btn btn-secondary btn-sm"
          >
            Hapus
          </button>
        </div>
      ),
    },
  ];

  const actionError = toggle.error ?? remove.error;

  return (
    <div className="space-y-6">
      <h1 className="page-title">Dokumen Acuan</h1>

      <form
        aria-label="Tambah dokumen acuan"
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-4 border-t border-line pt-6"
      >
        <h2 className="section-title">Tambah dokumen acuan</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={ids.category} className="field-label">
              Kategori
            </label>
            <select
              id={ids.category}
              value={categoryCode}
              onChange={(e) => setCategoryCode(e.target.value)}
              className="field"
            >
              <option value="">Pilih kategori</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={ids.title} className="field-label">
              Judul dokumen
            </label>
            <input
              id={ids.title}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="field"
            />
          </div>
        </div>
        <UploadDropzone label="Berkas PDF" file={file} onChange={setFile} disabled={add.isPending} />
        {formError && (
          <p id={ids.error} role="alert" className="error-text">
            {formError}
          </p>
        )}
        <button
          type="submit"
          disabled={add.isPending}
          className="btn btn-primary"
        >
          {add.isPending ? "Menambahkan..." : "Tambah dokumen"}
        </button>
      </form>

      <div role="status" aria-live="polite">
        {notice && <p className="text-sm text-ok">{notice}</p>}
      </div>
      {actionError && <ErrorState message={actionError.message} />}

      {viewed && (
        <section aria-label="Rincian dokumen acuan" className="rounded-card bg-sky-pale p-5">
          <h2 className="section-title">{viewed.title}</h2>
          <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
            <dt className="text-ink-soft">Kategori</dt>
            <dd>{categoryName(viewed.categoryCode)}</dd>
            <dt className="text-ink-soft">Berkas</dt>
            <dd>{viewed.fileName}</dd>
            <dt className="text-ink-soft">Ditambahkan</dt>
            <dd>{formatDate(viewed.addedAt)}</dd>
            <dt className="text-ink-soft">Status</dt>
            <dd>
              <ActiveLabel active={viewed.active} />
            </dd>
          </dl>
          <button type="button" onClick={() => setViewId(null)} className={`btn btn-secondary btn-sm mt-3`}>
            Tutup rincian
          </button>
        </section>
      )}

      {(docs.isPending || categories.isPending) && <LoadingState label="Memuat dokumen acuan..." />}
      {docs.error && <ErrorState message={docs.error.message} onRetry={() => void docs.refetch()} />}
      {categories.error && <ErrorState message={categories.error.message} onRetry={() => void categories.refetch()} />}
      {docs.data &&
        categories.data &&
        categories.data.map((c) => (
          <section key={c.code} aria-labelledby={`grup-${c.code}`} className="space-y-2">
            <h2 id={`grup-${c.code}`} className="section-title">
              {c.name}
            </h2>
            <DataTable
              caption={`Dokumen acuan ${c.name}`}
              columns={columns}
              rows={docs.data.filter((d) => d.categoryCode === c.code)}
              getRowKey={(d) => d.id}
              emptyTitle={`Belum ada dokumen acuan ${c.name}`}
            />
          </section>
        ))}

      <ConfirmDialog
        open={toDelete !== null}
        title="Hapus dokumen acuan?"
        confirmLabel="Ya, hapus"
        onConfirm={() => void onConfirmDelete()}
        onCancel={() => setToDelete(null)}
      >
        <p>
          Dokumen "{toDelete?.title}" akan dihapus dan tidak dipakai lagi sebagai acuan. Tindakan ini tidak bisa
          dibatalkan. Bila hanya ingin berhenti memakainya sementara, pilih Nonaktifkan.
        </p>
      </ConfirmDialog>
    </div>
  );
}
