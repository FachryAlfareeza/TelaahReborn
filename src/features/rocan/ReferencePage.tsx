import { useMemo, useState } from "react";
import { useActivateReferenceTable, useFileFetcher, useReferenceDocuments, useReferenceTables } from "../../api/queries";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { DashboardPage, Panel, Pill, SplitPane, StatCard } from "../../components/Dashboard";
import { DataTable, type Column } from "../../components/DataTable";
import { Drawer } from "../../components/Drawer";
import { ErrorState } from "../../components/ErrorState";
import { errorText, FilterSelect } from "../../components/form";
import { LoadingState } from "../../components/LoadingState";
import { PdfPreview } from "../../components/PdfPreview";
import { formatDate } from "../../lib/date";
import { displayValue } from "../../lib/empty";
import { toPdfFile } from "../../lib/files";
import type { ReferenceDocType, ReferenceDocument, ReferenceDocumentStatus, ReferenceTableVersion } from "../../types";
import { docStatusLabel, docStatusTone, docTypeLabel, tableName, versionStatusTone } from "./labels";
import { DocumentDetail, TableRows } from "./ReferenceDetail";
import { TableWizard, UploadForm } from "./ReferenceForms";

/** Saringan status dari kartu angka; "processing" mencakup menunggu dan sedang diproses. */
type StatusFilter = "" | "active" | "processing" | "failed" | "inactive";
const isProcessing = (s: ReferenceDocumentStatus) => s === "pending" || s === "processing";
const matchesStatus = (d: ReferenceDocument, f: StatusFilter) => !f || (f === "processing" ? isProcessing(d.status) : d.status === f);

export function ReferencePage() {
  const fetchFile = useFileFetcher();
  const docs = useReferenceDocuments();
  const tables = useReferenceTables();
  const activateTable = useActivateReferenceTable();
  const [status, setStatus] = useState<StatusFilter>("");
  const [docType, setDocType] = useState<ReferenceDocType | "">("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [wizardDocId, setWizardDocId] = useState<string | null>(null);
  const [rowsOf, setRowsOf] = useState<ReferenceTableVersion | null>(null);
  const [confirm, setConfirm] = useState<ReferenceTableVersion | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pdf, setPdf] = useState<{ title: string; file: File } | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);

  const all = useMemo(() => docs.data ?? [], [docs.data]);
  const { versionsByDoc, orphanVersions, activeVersions } = useMemo(() => {
    const versions = tables.data ?? [];
    const docIds = new Set(all.map((d) => d.id));
    const versionsByDoc = new Map<string, ReferenceTableVersion[]>();
    for (const t of versions) versionsByDoc.set(t.source_document_id, [...(versionsByDoc.get(t.source_document_id) ?? []), t]);
    return {
      versionsByDoc,
      orphanVersions: versions.filter((t) => !docIds.has(t.source_document_id)),
      activeVersions: versions.filter((t) => t.status === "active"),
    };
  }, [all, tables.data]);
  const versionsOf = (id: string) => versionsByDoc.get(id) ?? [];
  const counts = useMemo(() => {
    const c: Record<Exclude<StatusFilter, "">, number> = { active: 0, processing: 0, failed: 0, inactive: 0 };
    for (const d of all) c[isProcessing(d.status) ? "processing" : (d.status as Exclude<StatusFilter, "" | "processing">)]++;
    return c;
  }, [all]);
  const rows = useMemo(() => all.filter((d) => matchesStatus(d, status) && (!docType || d.doc_type === docType)), [all, status, docType]);
  const selected = all.find((d) => d.id === selectedId);

  async function viewPdf(d: ReferenceDocument) {
    setPdfError(null);
    setPdfLoading(d.id);
    try {
      setPdf({ title: d.title, file: toPdfFile(await fetchFile.referenceDocument(d.id), d.filename) });
    } catch (err) {
      setPdfError(`${d.title}: ${errorText(err)}`);
    } finally {
      setPdfLoading(null);
    }
  }

  const statusCard = (f: Exclude<StatusFilter, "">, label: string) => (
    <StatCard label={label} value={counts[f]} onClick={() => setStatus((cur) => (cur === f ? "" : f))} active={status === f} />
  );

  const columns: Column<ReferenceDocument>[] = [
    {
      key: "title",
      header: "Judul",
      width: "15rem",
      render: (d) => (
        <span>
          {d.title}
          <span className="block text-xs font-normal text-ink-soft">{d.filename}</span>
        </span>
      ),
      sortValue: (d) => d.title,
      searchValue: (d) => `${d.title} ${d.filename} ${d.number ?? ""}`,
    },
    { key: "type", header: "Jenis", render: (d) => docTypeLabel[d.doc_type], sortValue: (d) => docTypeLabel[d.doc_type] },
    { key: "year", header: "Tahun", render: (d) => displayValue(d.effective_year), sortValue: (d) => d.effective_year ?? 0, numeric: true },
    {
      key: "status",
      header: "Status",
      render: (d) => (
        <span className="space-y-0.5">
          <Pill tone={docStatusTone[d.status]}>{docStatusLabel[d.status]}</Pill>
          {d.error_message && <span className="block text-xs text-bad-text">{d.error_message}</span>}
        </span>
      ),
      sortValue: (d) => d.status,
    },
    {
      key: "tables",
      header: "Tabel BAS/SBM",
      render: (d) => {
        const vs = versionsOf(d.id);
        if (vs.length === 0) return <span className="text-ink-soft">—</span>;
        return (
          <span className="flex flex-wrap gap-1">
            {vs.map((t) => (
              <Pill key={t.id} tone={versionStatusTone[t.status]}>
                {tableName(t)}
              </Pill>
            ))}
          </span>
        );
      },
      sortValue: (d) => versionsOf(d.id).length,
    },
    { key: "date", header: "Diunggah", render: (d) => formatDate(d.uploaded_at), sortValue: (d) => d.uploaded_at },
    {
      key: "pdf",
      header: "PDF",
      render: (d) => (
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void viewPdf(d)} disabled={pdfLoading === d.id} aria-label={`Lihat PDF ${d.title}`}>
          {pdfLoading === d.id ? "Memuat..." : "Lihat"}
        </button>
      ),
    },
  ];

  return (
    <DashboardPage
      title="Acuan"
      actions={
        <>
          <button type="button" className="btn btn-secondary" onClick={() => setWizardDocId(selectedId ?? "")}>
            Tambah tabel BAS/SBM
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setUploading(true)}>
            Unggah dokumen
          </button>
        </>
      }
      stats={
        <>
          <StatCard label="Semua dokumen" value={all.length} onClick={() => setStatus("")} active={status === ""} />
          {statusCard("active", "Aktif")}
          {statusCard("processing", "Sedang diproses")}
          {statusCard("failed", "Gagal diproses")}
          {statusCard("inactive", "Nonaktif")}
          <StatCard label="Tabel acuan aktif" value={activeVersions.length} hint={activeVersions.map(tableName).join(" · ") || "Belum ada"} />
        </>
      }
    >
      {notice && (
        <p role="status" className="rounded-control bg-ok/10 px-3 py-2 text-sm text-ok">
          {notice}
        </p>
      )}
      {pdfError && (
        <p role="alert" className="rounded-control bg-warn/10 px-3 py-2 text-sm text-warn">
          {pdfError}
        </p>
      )}
      {activateTable.error && <ErrorState message={activateTable.error.message} />}
      <SplitPane side="360px">
        <Panel title="Daftar dokumen acuan" table>
          {docs.isPending && <LoadingState />}
          {docs.error && <ErrorState message={docs.error.message} onRetry={() => void docs.refetch()} />}
          {docs.data && (
            <DataTable
              fill
              caption="Dokumen acuan"
              columns={columns}
              rows={rows}
              getRowKey={(d) => d.id}
              onRowClick={(d) => setSelectedId(d.id)}
              selectedKey={selectedId}
              emptyTitle={all.length === 0 ? "Belum ada dokumen acuan." : "Tidak ada dokumen dengan saringan ini."}
              toolbar={<FilterSelect label="Jenis" value={docType} onChange={setDocType} allLabel="Semua jenis" options={docTypeLabel} />}
            />
          )}
        </Panel>
        <DocumentDetail
          doc={selected}
          versions={selected ? versionsOf(selected.id) : []}
          orphanVersions={orphanVersions}
          onViewPdf={(d) => void viewPdf(d)}
          onAddTable={setWizardDocId}
          onViewRows={setRowsOf}
          onActivateTable={setConfirm}
        />
      </SplitPane>

      <Drawer open={uploading} title="Unggah dokumen acuan" onClose={() => setUploading(false)}>
        <UploadForm
          onDone={(title) => {
            setUploading(false);
            setNotice(`"${title}" diunggah. Ingestion berjalan di latar belakang.`);
          }}
        />
      </Drawer>
      {wizardDocId !== null && (
        <Drawer
          open
          title="Tambah tabel BAS/SBM"
          description="Tabel diimpor sebagai draf dan baru dipakai setelah diaktifkan."
          onClose={() => setWizardDocId(null)}
          width="xl"
        >
          <TableWizard
            docs={all}
            initialDocId={wizardDocId}
            onDone={(msg) => {
              setWizardDocId(null);
              setNotice(msg);
            }}
          />
        </Drawer>
      )}
      {rowsOf && (
        <Drawer open title={`Baris ${tableName(rowsOf)}`} description={rowsOf.verification_note} onClose={() => setRowsOf(null)} width="xl">
          <TableRows table={rowsOf} />
        </Drawer>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={`Aktifkan tabel ${confirm ? tableName(confirm) : ""}?`}
        confirmLabel="Ya, aktifkan"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) activateTable.mutate(confirm.id);
          setConfirm(null);
        }}
      >
        Versi aktif lain dengan jenis dan tahun yang sama akan digantikan.
      </ConfirmDialog>

      {pdf && <PdfPreview title={pdf.title} file={pdf.file} onClose={() => setPdf(null)} />}
    </DashboardPage>
  );
}
