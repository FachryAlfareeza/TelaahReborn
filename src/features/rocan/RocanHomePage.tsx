import { Link } from "react-router-dom";
import { useReviewRequests } from "../../api/queries";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { Section } from "../../components/Section";
import { StatusBadge } from "../../components/StatusBadge";
import { StatusSummary } from "../../components/StatusSummary";
import { formatDate } from "../../lib/date";
import { getStatusLabel, REQUEST_STATUSES } from "../../lib/status";
import type { ReviewRequest, ReviewRequestStatus } from "../../types";

const QUEUES: { status: ReviewRequestStatus; empty: string }[] = [
  { status: "siap_diverifikasi", empty: "Tidak ada pengajuan yang menunggu verifikasi." },
  { status: "gagal", empty: "Tidak ada review yang gagal." },
  { status: "dalam_proses", empty: "Tidak ada review yang sedang berjalan." },
  { status: "menunggu_review", empty: "Tidak ada pengajuan yang menunggu review dimulai." },
];

function QueueList({ rows }: { rows: ReviewRequest[] }) {
  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 py-3">
          <span className="font-medium">{r.title}</span>
          <span className="text-sm">{r.owner.nama}</span>
          <span className="text-sm text-ink-soft tabular-nums">
            RO {r.kro.code}.{r.ro.code} · {formatDate(r.submitted_at)}
          </span>
          <StatusBadge status={r.status} role="rocan" />
          <Link to={`/rocan/pengajuan/${r.id}`} aria-label={`Buka ${r.title}`} className="btn btn-secondary btn-sm ml-auto">
            Buka
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function RocanHomePage() {
  const { data, isPending, error, refetch } = useReviewRequests();

  return (
    <div className="space-y-6">
      <h1 className="page-title">Beranda ROCAN</h1>
      {isPending && <LoadingState />}
      {error && <ErrorState message={error.message} onRetry={() => void refetch()} />}
      {data && (
        <>
          <StatusSummary requests={data} statuses={REQUEST_STATUSES} role="rocan" listPath="/rocan/pengajuan" />
          {QUEUES.map((q) => {
            const rows = data.filter((r) => r.status === q.status);
            return (
              <Section key={q.status} title={getStatusLabel(q.status, "rocan")}>
                {rows.length === 0 ? <EmptyState title={q.empty} /> : <QueueList rows={rows} />}
              </Section>
            );
          })}
        </>
      )}
    </div>
  );
}
