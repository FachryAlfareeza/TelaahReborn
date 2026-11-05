import { useId, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DataTable, type Column } from "../../components/DataTable";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate } from "../../lib/date";
import { getStatusLabel } from "../../lib/status";
import type { Submission } from "../../types";
import { useSubmissions } from "./hooks";

const filterOptions = ["Terupload", "Diperiksa", "Diterima", "Ditolak"];

export function SubmissionsPage() {
  const { data, isPending, error, refetch } = useSubmissions();
  const [params] = useSearchParams();
  const [filter, setFilter] = useState(params.get("status") ?? "");
  const filterId = useId();

  const rows = useMemo(
    () => (data ?? []).filter((s) => !filter || getStatusLabel(s.status, "SATKER") === filter),
    [data, filter],
  );

  const columns: Column<Submission>[] = [
    { key: "ro", header: "Kode RO", render: (s) => s.roCode, sortValue: (s) => s.roCode },
    {
      key: "date",
      header: "Tanggal kirim",
      render: (s) => formatDate(s.submittedAt),
      sortValue: (s) => s.submittedAt,
    },
    {
      key: "status",
      header: "Status",
      render: (s) => <StatusBadge status={s.status} role="SATKER" />,
      sortValue: (s) => getStatusLabel(s.status, "SATKER"),
    },
    {
      key: "detail",
      header: "Rincian",
      render: (s) => (
        <Link
          to={`/satker/pengajuan/${s.id}`}
          aria-label={`Lihat detail pengajuan RO ${s.roCode}, ${formatDate(s.submittedAt)}`}
          className="link"
        >
          Lihat detail
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="page-title">Pengajuan Saya</h1>
      <div>
        <label htmlFor={filterId} className="field-label">
          Tampilkan status
        </label>
        <select
          id={filterId}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="field w-auto"
        >
          <option value="">Semua status</option>
          {filterOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>

      {isPending && <LoadingState label="Memuat daftar pengajuan..." />}
      {error && <ErrorState message={error.message} onRetry={() => void refetch()} />}
      {data && (
        <DataTable
          caption="Daftar pengajuan"
          columns={columns}
          rows={rows}
          getRowKey={(s) => s.id}
          emptyTitle={filter ? `Belum ada pengajuan berstatus ${filter}` : "Belum ada pengajuan"}
        />
      )}
    </div>
  );
}
