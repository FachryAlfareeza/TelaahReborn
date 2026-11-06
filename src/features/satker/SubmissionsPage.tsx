import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useReviewRequests } from "../../api/queries";
import { DashboardPage, Panel, StatCard } from "../../components/Dashboard";
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
  const options = statusOptions("satker");

  const all = data ?? [];
  const rows = all.filter((r) => !filter || getStatusLabel(r.status, "satker") === filter);

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
    <DashboardPage
      title="Pengajuan Saya"
      actions={
        <Link to="/satker/ajukan" className="btn btn-primary">
          Ajukan baru
        </Link>
      }
      stats={
        <>
          <StatCard label="Semua pengajuan" value={all.length} onClick={() => setFilter("")} active={filter === ""} />
          {options.map((o) => (
            <StatCard
              key={o.label}
              label={o.label}
              value={all.filter((r) => getStatusLabel(r.status, "satker") === o.label).length}
              onClick={() => setFilter(filter === o.label ? "" : o.label)}
              active={filter === o.label}
            />
          ))}
        </>
      }
    >
      <Panel title="Daftar pengajuan" table className="lg:flex-1">
        {isPending && <LoadingState label="Memuat daftar pengajuan..." />}
        {error && <ErrorState message={error.message} onRetry={() => void refetch()} />}
        {data && (
          <DataTable
            fill
            caption="Daftar pengajuan"
            columns={columns}
            rows={rows}
            getRowKey={(r) => r.id}
            emptyTitle={filter ? `Belum ada pengajuan berstatus ${filter}` : "Belum ada pengajuan"}
          />
        )}
      </Panel>
    </DashboardPage>
  );
}
