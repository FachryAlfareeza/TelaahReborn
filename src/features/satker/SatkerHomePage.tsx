import { Link } from "react-router-dom";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { Section } from "../../components/Section";
import { StatusBadge } from "../../components/StatusBadge";
import { StatusSummary } from "../../components/StatusSummary";
import { formatDate } from "../../lib/date";
import type { SubmissionStatus } from "../../types";
import { useSubmissions } from "./hooks";

/** Satu status wakil per label yang dilihat Satker. */
const summaryStatuses: SubmissionStatus[] = ["PROCESSING", "AWAITING_REVIEW", "ACCEPTED", "REJECTED"];

export function SatkerHomePage() {
  const { data, isPending, error, refetch } = useSubmissions();
  const recent = [...(data ?? [])].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).slice(0, 5);

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
          <StatusSummary submissions={data} statuses={summaryStatuses} role="SATKER" listPath="/satker/pengajuan" />
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
                {recent.map((s) => (
                  <li key={s.id}>
                    <Link
                      to={`/satker/pengajuan/${s.id}`}
                      className="flex flex-wrap items-center gap-x-6 gap-y-1 py-3 hover:bg-sky-pale"
                    >
                      <span className="w-24 font-medium">RO {s.roCode}</span>
                      <span className="text-sm text-ink-soft">{formatDate(s.submittedAt)}</span>
                      <span className="ml-auto">
                        <StatusBadge status={s.status} role="SATKER" />
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
