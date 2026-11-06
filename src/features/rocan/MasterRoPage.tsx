import { useId, useState, type FormEvent } from "react";
import { useActivateDataset, useDatasetIssues, useDatasets, useImportDataset } from "../../api/queries";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { DataTable, type Column } from "../../components/DataTable";
import { ErrorState } from "../../components/ErrorState";
import { errorText, Feedback, Field } from "../../components/form";
import { LoadingState } from "../../components/LoadingState";
import { DashboardPage, Panel, Pill, SplitPane, StatCard } from "../../components/Dashboard";
import { Drawer } from "../../components/Drawer";
import { UploadDropzone } from "../../components/UploadDropzone";
import { formatDate } from "../../lib/date";
import { validateExtension } from "../../lib/files";
import { displayValue } from "../../lib/empty";
import type { DatasetIssue, MasterRoDataset } from "../../types";
import { versionStatusLabel, versionStatusTone } from "./labels";

const issueLabel: Record<DatasetIssue["issue"], string> = {
  missing_value: "Nilai kosong",
  duplicate_combination: "Kombinasi ganda",
  inconsistent_metadata: "Metadata tidak konsisten",
  unparseable_code: "Kode tidak terbaca",
};

function ImportForm() {
  const importDataset = useImportDataset();
  const yearId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState(String(new Date().getFullYear() + 1));
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (!file || !/^\d{4}$/.test(year)) return setError("Pilih berkas dan isi tahun anggaran (4 angka).");
    setError(null);
    try {
      const ds = await importDataset.mutateAsync({ file, fiscalYear: Number(year) });
      setNotice(
        `Dataset ${ds.fiscal_year} diimpor sebagai draf: ${ds.valid_row_count} dari ${ds.row_count} baris valid, ${ds.issue_count} masalah. Periksa lalu aktifkan.`,
      );
      setFile(null);
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-4">
      <UploadDropzone
        label="Berkas RENJA (CSV atau XLSX)"
        file={file}
        onChange={setFile}
        validate={(f) => validateExtension(f, [".csv", ".xlsx"])}
        accept=".csv,.xlsx"
        hint="Kolom wajib: program, unit_eselon1, kegiatan, unit_eselon2, prioritas_check, kro, ro."
        disabled={importDataset.isPending}
      />
      <Field id={yearId} label="Tahun anggaran">
        <input id={yearId} value={year} inputMode="numeric" onChange={(e) => setYear(e.target.value)} className="field w-32" />
      </Field>
      <Feedback notice={notice} error={error} />
      <button type="submit" disabled={importDataset.isPending} className="btn btn-primary">
        {importDataset.isPending ? "Mengimpor..." : "Impor"}
      </button>
    </form>
  );
}

function IssueList({ datasetId }: { datasetId: string }) {
  const issues = useDatasetIssues(datasetId);
  if (issues.isPending) return <LoadingState />;
  if (issues.error) return <ErrorState message={issues.error.message} />;
  if (issues.data.length === 0) return <p className="text-sm text-ink-soft">Tidak ada masalah.</p>;
  const columns: Column<DatasetIssue>[] = [
    { key: "row", header: "Baris", render: (i) => i.row_number, sortValue: (i) => i.row_number, numeric: true },
    { key: "issue", header: "Masalah", render: (i) => issueLabel[i.issue], sortValue: (i) => i.issue },
    { key: "column", header: "Kolom", render: (i) => displayValue(i.column) },
    {
      key: "raw",
      header: "Nilai mentah",
      render: (i) => <span className="text-xs break-all text-ink-soft">{Object.values(i.raw).map(String).join(" | ") || "—"}</span>,
    },
  ];
  return <DataTable caption="Masalah dataset" columns={columns} rows={issues.data} getRowKey={(i) => `${i.row_number}-${i.issue}-${i.column}`} />;
}

/** Baris bermasalah dilaporkan, tidak dibuang diam-diam, dan tidak tampil di dropdown. */
export function MasterRoPage() {
  const datasets = useDatasets();
  const activate = useActivateDataset();
  const [issuesFor, setIssuesFor] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<MasterRoDataset | null>(null);
  const [importing, setImporting] = useState(false);

  const columns: Column<MasterRoDataset>[] = [
    { key: "year", header: "Tahun", render: (d) => d.fiscal_year, sortValue: (d) => d.fiscal_year, numeric: true },
    { key: "file", header: "Berkas", render: (d) => d.source_filename, sortValue: (d) => d.source_filename },
    { key: "status", header: "Status", render: (d) => <Pill tone={versionStatusTone[d.status]}>{versionStatusLabel[d.status]}</Pill>, sortValue: (d) => d.status },
    { key: "rows", header: "Baris valid", render: (d) => `${d.valid_row_count} / ${d.row_count}`, numeric: true },
    { key: "issues", header: "Masalah", render: (d) => d.issue_count, sortValue: (d) => d.issue_count, numeric: true },
    { key: "imported", header: "Diimpor", render: (d) => formatDate(d.imported_at), sortValue: (d) => d.imported_at },
    {
      key: "actions",
      header: "Tindakan",
      render: (d) => (
        <span className="flex flex-wrap gap-2">
          <button type="button" className="link" onClick={() => setIssuesFor(d.id)} aria-label={`Lihat masalah dataset ${d.fiscal_year}`}>
            Lihat masalah
          </button>
          {d.status !== "active" && (
            <button type="button" className="link" onClick={() => setConfirm(d)} aria-label={`Aktifkan dataset ${d.fiscal_year}`}>
              Aktifkan
            </button>
          )}
        </span>
      ),
    },
  ];
  const selected = datasets.data?.find((d) => d.id === issuesFor);

  const all = datasets.data ?? [];

  return (
    <DashboardPage
      title="Master RO"
      actions={
        <button type="button" className="btn btn-primary" onClick={() => setImporting(true)}>
          Impor dataset
        </button>
      }
      stats={
        <>
          <StatCard label="Dataset" value={all.length} />
          <StatCard
            label="Tahun aktif"
            value={all.filter((d) => d.status === "active").map((d) => d.fiscal_year).join(", ") || "—"}
          />
          <StatCard label="Draf" value={all.filter((d) => d.status === "draft").length} />
          <StatCard label="Baris bermasalah" value={all.reduce((n, d) => n + d.issue_count, 0)} />
        </>
      }
    >
      {activate.error && <ErrorState message={activate.error.message} />}
      <SplitPane side="460px">
        <Panel title="Dataset" table>
          {datasets.isPending && <LoadingState />}
          {datasets.error && <ErrorState message={datasets.error.message} onRetry={() => void datasets.refetch()} />}
          {datasets.data && (
            <DataTable
              fill
              caption="Dataset Master RO"
              columns={columns}
              rows={datasets.data}
              getRowKey={(d) => d.id}
              onRowClick={(d) => setIssuesFor(d.id)}
              selectedKey={issuesFor}
              emptyTitle="Belum ada dataset."
            />
          )}
        </Panel>
        <Panel title={selected ? `Masalah dataset ${selected.fiscal_year}` : "Masalah dataset"}>
          {selected ? (
            <div className="space-y-2">
              <p className="text-xs break-all text-ink-soft">{selected.source_filename}</p>
              <IssueList datasetId={selected.id} />
            </div>
          ) : (
            <p className="text-sm text-ink-soft">Pilih dataset untuk melihat masalahnya.</p>
          )}
        </Panel>
      </SplitPane>
      <Drawer open={importing} title="Impor dataset Master RO" onClose={() => setImporting(false)}>
        <ImportForm />
      </Drawer>
      <ConfirmDialog
        open={confirm !== null}
        title={`Aktifkan dataset ${confirm?.fiscal_year ?? ""}?`}
        confirmLabel="Ya, aktifkan"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) activate.mutate(confirm.id);
          setConfirm(null);
        }}
      >
        Dataset aktif lain untuk tahun yang sama akan digantikan. Pengajuan lama tetap memakai data saat diajukan.
      </ConfirmDialog>
    </DashboardPage>
  );
}
