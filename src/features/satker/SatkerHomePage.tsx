import { Link } from "react-router-dom";
import { useReviewRequests } from "../../api/queries";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { Section } from "../../components/Section";
import { StatusBadge } from "../../components/StatusBadge";
import { StatusSummary } from "../../components/StatusSummary";
import { formatDate } from "../../lib/date";
import type { ReviewRequestStatus } from "../../types";

/** Satu status wakil per label yang dilihat Satker. */
const summaryStatuses: ReviewRequestStatus[] = ["menunggu_review", "dalam_proses", "siap_diverifikasi", "selesai_revisi", "selesai_disetujui"];

/** Beranda Satker: pengajuan miliknya dan statusnya (PRD FR-UI-01). */
export function SatkerHomePage() {
  const { data, isPending, error, refetch } = useReviewRequests();
  const recent = (data ?? []).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="page-title">Beranda Satker</h1>
        <Link to="/satker/ajukan" className="btn btn-primary">
          Ajukan Baru
        </Link>
      </div>

      {isPending && <LoadingState />}
      {error && <ErrorState message={error.message} onRetry={() => void refetch()} />}
      {data && (
        <>
          <StatusSummary requests={data} statuses={summaryStatuses} role="satker" listPath="/satker/pengajuan" />
          <Section
            title="Pengajuan terbaru"
            aside={
              data.length > recent.length && (
                <Link to="/satker/pengajuan" className="link ml-auto text-sm">
                  Lihat semua
                </Link>
              )
            }
          >
            {recent.length === 0 ? (
              <EmptyState title="Belum ada pengajuan." />
            ) : (
              <ul className="divide-y divide-line">
                {recent.map((r) => (
                  <li key={r.id}>
                    <Link
                      to={`/satker/pengajuan/${r.id}`}
                      className="flex flex-wrap items-center gap-x-6 gap-y-1 py-3 hover:bg-sky-pale"
                    >
                      <span className="font-medium">{r.title}</span>
                      <span className="text-sm text-ink-soft tabular-nums">
                        RO {r.kro.code}.{r.ro.code} · {formatDate(r.submitted_at)}
                      </span>
                      <span className="ml-auto">
                        <StatusBadge status={r.status} role="satker" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
