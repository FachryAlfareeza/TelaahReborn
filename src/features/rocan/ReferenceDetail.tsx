import { useId, useMemo, useState } from "react";
import { useReferenceTableRows, useReingestReferenceDocument, useSetReferenceDocumentActive } from "../../api/queries";
import { Panel, Pill } from "../../components/Dashboard";
import { DataTable, type Column } from "../../components/DataTable";
import { ErrorState } from "../../components/ErrorState";
import { Field } from "../../components/form";
import { LoadingState } from "../../components/LoadingState";
import { formatDate } from "../../lib/date";
import { displayValue } from "../../lib/empty";
import { formatIdr } from "../../lib/money";
import type { ReferenceDocument, ReferenceTableRow, ReferenceTableVersion } from "../../types";
import { docStatusLabel, docStatusTone, docTypeLabel, tableName, validityLabel, versionStatusLabel, versionStatusTone } from "./labels";

export function TableRows({ table }: { table: ReferenceTableVersion }) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const searchId = useId();
  const rows = useReferenceTableRows(table.id, query);
  const columns = useMemo<Column<ReferenceTableRow>[]>(() => {
    const keys = rows.data?.[0] ? Object.keys(rows.data[0].values) : [];
    return [
      ...keys.map((k) => ({
        key: k,
        header: k,
        numeric: k === "besaran",
        render: (r: ReferenceTableRow) => {
          const v = r.values[k];
          return k === "besaran" && typeof v === "number" ? formatIdr(v) : displayValue(v);
        },
      })),
      { key: "page", header: "Hal.", render: (r) => r.source_page, numeric: true },
    ];
  }, [rows.data]);
  return (
    <div className="space-y-3">
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search);
        }}
      >
        <Field id={searchId} label="Cari baris">
          <input id={searchId} value={search} onChange={(e) => setSearch(e.target.value)} className="field" />
        </Field>
        <button type="submit" className="btn btn-secondary">
          Cari
        </button>
      </form>
      {rows.isPending && <LoadingState />}
      {rows.error && <ErrorState message={rows.error.message} />}
      {rows.data && <DataTable caption="Baris tabel acuan" columns={columns} rows={rows.data} getRowKey={(r) => r.id} emptyTitle="Tidak ada baris." />}
    </div>
  );
}

type VersionActions = {
  onViewRows: (t: ReferenceTableVersion) => void;
  onActivateTable: (t: ReferenceTableVersion) => void;
};

function VersionTable({ caption, versions, onViewRows, onActivateTable }: { caption: string; versions: ReferenceTableVersion[] } & VersionActions) {
  const columns: Column<ReferenceTableVersion>[] = [
    { key: "name", header: "Tabel", render: tableName },
    { key: "status", header: "Status", render: (t) => <Pill tone={versionStatusTone[t.status]}>{versionStatusLabel[t.status]}</Pill> },
    {
      key: "rows",
      header: "Baris",
      numeric: true,
      render: (t) => (
        <span>
          {t.row_count}
          {t.error_count > 0 && <span className="block text-xs text-bad-text">{t.error_count} bermasalah</span>}
        </span>
      ),
    },
    {
      key: "act",
      header: "Tindakan",
      render: (t) => (
        <span className="flex flex-wrap gap-2">
          <button type="button" className="link" onClick={() => onViewRows(t)} aria-label={`Lihat baris ${tableName(t)}`}>
            Lihat baris
          </button>
          {t.status === "draft" && t.error_count === 0 && (
            <button type="button" className="link" onClick={() => onActivateTable(t)}>
              Aktifkan
            </button>
          )}
        </span>
      ),
    },
  ];
  return <DataTable caption={caption} columns={columns} rows={versions} getRowKey={(t) => t.id} emptyTitle="Belum ada tabel dari dokumen ini." />;
}

type DetailProps = VersionActions & {
  doc: ReferenceDocument | undefined;
  versions: ReferenceTableVersion[];
  orphanVersions: ReferenceTableVersion[];
  onViewPdf: (d: ReferenceDocument) => void;
  onAddTable: (docId: string) => void;
};

export function DocumentDetail({ doc, versions, orphanVersions, onViewPdf, onAddTable, onViewRows, onActivateTable }: DetailProps) {
  const setActive = useSetReferenceDocumentActive();
  const reingest = useReingestReferenceDocument();
  const actionError = setActive.error ?? reingest.error;

  if (!doc) {
    return (
      <Panel title="Rincian">
        <p className="text-sm text-ink-soft">Pilih dokumen untuk melihat rinciannya.</p>
        {orphanVersions.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold">Tabel tanpa dokumen sumber</h3>
            <VersionTable caption="Tabel tanpa dokumen sumber" versions={orphanVersions} onViewRows={onViewRows} onActivateTable={onActivateTable} />
          </div>
        )}
      </Panel>
    );
  }

  const meta: [string, string][] = [
    ["Jenis", docTypeLabel[doc.doc_type]],
    ["Nomor", displayValue(doc.number)],
    ["Tahun berlaku", displayValue(doc.effective_year)],
    ["Status berlaku", validityLabel[doc.validity]],
    ["Diunggah", formatDate(doc.uploaded_at)],
    ["Diproses", doc.processed_at ? formatDate(doc.processed_at) : "—"],
  ];

  return (
    <Panel
      title={
        <div className="min-w-0">
          <h2 className="section-title break-words">{doc.title}</h2>
          <p className="text-xs break-all text-ink-soft">{doc.filename}</p>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={docStatusTone[doc.status]}>{docStatusLabel[doc.status]}</Pill>
          {doc.error_message && <span className="text-xs text-bad-text">{doc.error_message}</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onViewPdf(doc)}>
            Lihat PDF
          </button>
          {doc.status === "active" && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setActive.mutate({ id: doc.id, active: false })} aria-label={`Nonaktifkan ${doc.title}`}>
              Nonaktifkan
            </button>
          )}
          {doc.status === "inactive" && doc.processed_at && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setActive.mutate({ id: doc.id, active: true })} aria-label={`Aktifkan ${doc.title}`}>
              Aktifkan
            </button>
          )}
          {doc.status !== "pending" && doc.status !== "processing" && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => reingest.mutate(doc.id)} aria-label={`Ingest ulang ${doc.title}`}>
              Ingest ulang
            </button>
          )}
        </div>
        {actionError && <ErrorState message={actionError.message} />}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {meta.map(([k, v]) => (
            <div key={k}>
              <dt className="term">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Tabel BAS/SBM dari dokumen ini</h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onAddTable(doc.id)}>
              Buat tabel
            </button>
          </div>
          <VersionTable caption={`Tabel dari ${doc.title}`} versions={versions} onViewRows={onViewRows} onActivateTable={onActivateTable} />
        </div>
      </div>
    </Panel>
  );
}
