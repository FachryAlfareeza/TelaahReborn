import { useId, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { ReviewRequestFilters } from "../../api/client";
import { useFiscalYears, useReviewRequests } from "../../api/queries";
import { DataTable, type Column } from "../../components/DataTable";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate } from "../../lib/date";
import { getStatusLabel, REQUEST_STATUSES } from "../../lib/status";
import { CATEGORIES, categoryLabel } from "../../lib/verdict";
import type { Category, ReviewRequest, ReviewRequestStatus } from "../../types";

type Draft = Record<keyof ReviewRequestFilters, string>;
const empty: Draft = {
  status: "",
  fiscal_year: "",
  program_code: "",
  activity_code: "",
  kro_code: "",
  ro_code: "",
  proposal_category: "",
  submitted_from: "",
  submitted_to: "",
};

/** Ubah isian saringan menjadi query kontrak §3.4.2; kosong tidak dikirim. */
function toFilters(d: Draft): ReviewRequestFilters {
  return {
    status: (d.status || undefined) as ReviewRequestStatus | undefined,
    fiscal_year: d.fiscal_year ? Number(d.fiscal_year) : undefined,
    program_code: d.program_code.trim() || undefined,
    activity_code: d.activity_code.trim() || undefined,
    kro_code: d.kro_code.trim() || undefined,
    ro_code: d.ro_code.trim() || undefined,
    proposal_category: (d.proposal_category || undefined) as Category | undefined,
    submitted_from: d.submitted_from || undefined,
    submitted_to: d.submitted_to || undefined,
  };
}

/** Status dari tautan ringkasan beranda dikirim sebagai label; terjemahkan ke nilai enum. */
function statusFromLabel(label: string | null): string {
  if (!label) return "";
  return REQUEST_STATUSES.find((s) => getStatusLabel(s, "rocan") === label) ?? "";
}

export function RocanSubmissionsPage() {
  const [params] = useSearchParams();
  const initial = { ...empty, status: statusFromLabel(params.get("status")) };
  const [draft, setDraft] = useState<Draft>(initial);
  const [filters, setFilters] = useState<ReviewRequestFilters>(toFilters(initial));
  const years = useFiscalYears();
  const { data, isPending, error, refetch } = useReviewRequests(filters);
  const id = (k: string) => `filter-${k}`;
  const formId = useId();

  const set = (k: keyof Draft) => (e: { target: { value: string } }) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFilters(toFilters(draft));
  };

  const columns: Column<ReviewRequest>[] = [
    { key: "title", header: "Judul usulan", render: (r) => r.title, sortValue: (r) => r.title },
    { key: "satker", header: "Satker", render: (r) => r.owner.nama, sortValue: (r) => r.owner.nama },
    {
      key: "ro",
      header: "RO",
      render: (r) => `${r.program.code} / ${r.activity.code} / ${r.kro.code}.${r.ro.code}`,
      sortValue: (r) => `${r.program.code}${r.activity.code}${r.kro.code}${r.ro.code}`,
    },
    { key: "category", header: "Kategori usulan", render: (r) => r.proposal_category, sortValue: (r) => r.proposal_category },
    { key: "date", header: "Tanggal kirim", render: (r) => formatDate(r.submitted_at), sortValue: (r) => r.submitted_at },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.status} role="rocan" />,
      sortValue: (r) => getStatusLabel(r.status, "rocan"),
    },
    {
      key: "open",
      header: "Rincian",
      render: (r) => (
        <Link to={`/rocan/pengajuan/${r.id}`} aria-label={`Buka ${r.title}`} className="link">
          Buka
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="page-title">Daftar Pengajuan</h1>
      <form id={formId} onSubmit={onSubmit} aria-label="Saring pengajuan" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor={id("status")} className="field-label">Status</label>
          <select id={id("status")} value={draft.status} onChange={set("status")} className="field">
            <option value="">Semua status</option>
            {REQUEST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {getStatusLabel(s, "rocan")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={id("year")} className="field-label">Tahun anggaran</label>
          <select id={id("year")} value={draft.fiscal_year} onChange={set("fiscal_year")} className="field">
            <option value="">Semua tahun</option>
            {(years.data ?? []).map((y) => (
              <option key={y.fiscal_year} value={y.fiscal_year}>
                {y.fiscal_year}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={id("category")} className="field-label">Kategori usulan</label>
          <select id={id("category")} value={draft.proposal_category} onChange={set("proposal_category")} className="field">
            <option value="">Semua kategori</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabel[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor={id("from")} className="field-label">Dari tanggal</label>
            <input id={id("from")} type="date" value={draft.submitted_from} onChange={set("submitted_from")} className="field" />
          </div>
          <div>
            <label htmlFor={id("to")} className="field-label">Sampai tanggal</label>
            <input id={id("to")} type="date" value={draft.submitted_to} onChange={set("submitted_to")} className="field" />
          </div>
        </div>
        {(
          [
            ["program_code", "Kode program"],
            ["activity_code", "Kode kegiatan"],
            ["kro_code", "Kode KRO"],
            ["ro_code", "Kode RO"],
          ] as const
        ).map(([k, label]) => (
          <div key={k}>
            <label htmlFor={id(k)} className="field-label">{label}</label>
            <input id={id(k)} value={draft[k]} onChange={set(k)} className="field" />
          </div>
        ))}
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
          <button type="submit" className="btn btn-primary">
            Terapkan
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setDraft(empty);
              setFilters({});
            }}
          >
            Hapus saringan
          </button>
        </div>
      </form>

      {isPending && <LoadingState label="Memuat daftar pengajuan..." />}
      {error && <ErrorState message={error.message} onRetry={() => void refetch()} />}
      {data && (
        <DataTable
          caption="Semua pengajuan"
          columns={columns}
          rows={data}
          getRowKey={(r) => r.id}
          emptyTitle="Tidak ada pengajuan yang cocok dengan saringan."
        />
      )}
    </div>
  );
}
