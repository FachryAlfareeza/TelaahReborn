import { Link } from "react-router-dom";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { Section } from "../../components/Section";
import { StatusSummary } from "../../components/StatusSummary";
import { formatDate } from "../../lib/date";
import type { SubmissionStatus } from "../../types";
import { useAuth } from "../auth/authState";
import { useSubmissions } from "../satker/hooks";

const summaryStatuses: SubmissionStatus[] = [
  "PROCESSING",
  "AWAITING_REVIEW",
  "ACCEPTED",
  "REJECTED",
  "PROCESSING_FAILED",
];

export function RocanHomePage() {
  const { user } = useAuth();
  const role = user?.role ?? "ROCAN";
  const { data, isPending, error, refetch } = useSubmissions();
  const queue = (data ?? []).filter((s) => s.status === "AWAITING_REVIEW");

  return (
    <div className="space-y-6">
      <h1 className="page-title">Beranda ROCAN</h1>
      {isPending && <LoadingState />}
      {error && <ErrorState message={error.message} onRetry={() => void refetch()} />}
      {data && (
        <>
          <StatusSummary submissions={data} statuses={summaryStatuses} role={role} listPath="/rocan/pengajuan" />
          <Section title="Menunggu Pemeriksaan">
            {queue.length === 0 ? (
              <EmptyState title="Antrean kosong." />
            ) : (
              <ul className="divide-y divide-line">
                {queue.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 py-3">
                    <span className="w-24 font-medium">RO {s.roCode}</span>
                    <span className="text-sm">{s.satkerName}</span>
                    <span className="text-sm text-ink-soft">{formatDate(s.submittedAt)}</span>
                    <Link
                      to={`/rocan/pengajuan/${s.id}`}
                      aria-label={`Periksa pengajuan RO ${s.roCode} dari ${s.satkerName}`}
                      className="btn btn-secondary btn-sm ml-auto"
                    >
                      Periksa
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
