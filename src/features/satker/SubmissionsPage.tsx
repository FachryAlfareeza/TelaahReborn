import { useId, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useReviewRequests } from "../../api/queries";
import { DataTable, type Column } from "../../components/DataTable";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate } from "../../lib/date";
import { getStatusLabel, statusOptions } from "../../lib/status";
import { categoryLabel } from "../../lib/verdict";
import type { ReviewRequest } from "../../types";

export function SubmissionsPage() {
  const { data, isPending, error, refetch } = useReviewRequests();
  const [params] = useSearchParams();
  const [filter, setFilter] = useState(params.get("status") ?? "");
  const filterId = useId();
  const options = statusOptions("satker");

  const rows = useMemo(
    () => (data ?? []).filter((r) => !filter || getStatusLabel(r.status, "satker") === filter),
    [data, filter],
  );

  const columns: Column<ReviewRequest>[] = [
    { key: "title", header: "Judul usulan", render: (r) => r.title, sortValue: (r) => r.title },
    {
      key: "ro",
      header: "RO",
      render: (r) => `${r.kro.code}.${r.ro.code} ${r.ro.name}`,
      sortValue: (r) => `${r.kro.code}.${r.ro.code}`,
    },
    { key: "year", header: "Tahun", render: (r) => r.fiscal_year, sortValue: (r) => r.fiscal_year, numeric: true },
    { key: "category", header: "Kategori usulan", render: (r) => categoryLabel[r.proposal_category] },
    { key: "date", header: "Tanggal kirim", render: (r) => formatDate(r.submitted_at), sortValue: (r) => r.submitted_at },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.status} role="satker" />,
      sortValue: (r) => getStatusLabel(r.status, "satker"),
    },
    {
      key: "detail",
      header: "Rincian",
      render: (r) => (
        <Link to={`/satker/pengajuan/${r.id}`} aria-label={`Lihat detail ${r.title}`} className="link">
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
        <select id={filterId} value={filter} onChange={(e) => setFilter(e.target.value)} className="field w-auto">
          <option value="">Semua status</option>
          {options.map((o) => (
            <option key={o.label} value={o.label}>
              {o.label}
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
          getRowKey={(r) => r.id}
          emptyTitle={filter ? `Belum ada pengajuan berstatus ${filter}` : "Belum ada pengajuan"}
        />
      )}
    </div>
  );
}
