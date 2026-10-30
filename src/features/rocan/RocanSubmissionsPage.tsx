import { useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DataTable, type Column } from "../../components/DataTable";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate } from "../../lib/date";
import { getStatusLabel } from "../../lib/status";
import type { Submission } from "../../types";
import { useAuth } from "../auth/authState";
import { useRos, useSubmissions } from "../satker/hooks";
import { emptyFilters, filterSubmissions, type SubmissionFilters } from "./filters";

const statusOptions = ["Diproses AI", "Menunggu Pemeriksaan", "Diterima", "Ditolak", "Pemrosesan bermasalah"];

const inputClass =
  "w-full rounded-control border border-line bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function RocanSubmissionsPage() {
  const { user } = useAuth();
  const role = user?.role ?? "ROCAN";
  const { data, isPending, error, refetch } = useSubmissions();
  const ros = useRos();
  const [filters, setFilters] = useState<SubmissionFilters>(emptyFilters);
  const ids = { status: useId(), ro: useId(), satker: useId(), from: useId(), to: useId() };

  const rows = useMemo(() => filterSubmissions(data ?? [], filters, role), [data, filters, role]);
  const set = (patch: Partial<SubmissionFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const filtered = JSON.stringify(filters) !== JSON.stringify(emptyFilters);

  const columns: Column<Submission>[] = [
    { key: "ro", header: "Kode RO", render: (s) => s.roCode, sortValue: (s) => s.roCode },
    { key: "satker", header: "Satker", render: (s) => s.satkerName, sortValue: (s) => s.satkerName },
    {
      key: "date",
      header: "Tanggal kirim",
      render: (s) => formatDate(s.submittedAt),
      sortValue: (s) => s.submittedAt,
    },
    {
      key: "status",
      header: "Status",
      render: (s) => <StatusBadge status={s.status} role={role} />,
      sortValue: (s) => getStatusLabel(s.status, role),
    },
    {
      key: "detail",
      header: "Rincian",
      render: (s) => (
        <Link
          to={`/rocan/pengajuan/${s.id}`}
          aria-label={`Buka reviu RO ${s.roCode} dari ${s.satkerName}, ${formatDate(s.submittedAt)}`}
          className="text-brand-deep underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Buka reviu
        </Link>
      ),
    },
  ];

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-deep">Daftar Pengajuan</h1>
      <form
        aria-label="Saring pengajuan"
        className="grid gap-3 rounded-card border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={(e) => e.preventDefault()}
      >
        <div>
          <label htmlFor={ids.status} className="mb-1 block text-sm font-medium text-brand-deep">
            Status
          </label>
          <select id={ids.status} value={filters.status} onChange={(e) => set({ status: e.target.value })} className={inputClass}>
            <option value="">Semua status</option>
            {statusOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={ids.ro} className="mb-1 block text-sm font-medium text-brand-deep">
            Kode RO
          </label>
          <select id={ids.ro} value={filters.roCode} onChange={(e) => set({ roCode: e.target.value })} className={inputClass}>
            <option value="">Semua RO</option>
            {(ros.data ?? []).map((r) => (
              <option key={r.code} value={r.code}>
                {r.code}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={ids.satker} className="mb-1 block text-sm font-medium text-brand-deep">
            Satker
          </label>
          <input
            id={ids.satker}
            type="text"
            value={filters.satker}
            onChange={(e) => set({ satker: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={ids.from} className="mb-1 block text-sm font-medium text-brand-deep">
            Dikirim dari tanggal
          </label>
          <input id={ids.from} type="date" value={filters.from} onChange={(e) => set({ from: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label htmlFor={ids.to} className="mb-1 block text-sm font-medium text-brand-deep">
            Sampai tanggal
          </label>
          <input id={ids.to} type="date" value={filters.to} onChange={(e) => set({ to: e.target.value })} className={inputClass} />
        </div>
        {filtered && (
          <div className="sm:col-span-2 lg:col-span-5">
            <button
              type="button"
              onClick={() => setFilters(emptyFilters)}
              className="rounded-control border border-line px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Hapus semua saringan
            </button>
          </div>
        )}
      </form>

      {isPending && <LoadingState label="Memuat daftar pengajuan..." />}
      {error && <ErrorState message={error.message} onRetry={() => void refetch()} />}
      {data && (
        <DataTable
          caption="Semua pengajuan"
          columns={columns}
          rows={rows}
          getRowKey={(s) => s.id}
          emptyTitle={filtered ? "Tidak ada pengajuan yang cocok dengan saringan" : "Belum ada pengajuan"}
        />
      )}
    </section>
  );
}
