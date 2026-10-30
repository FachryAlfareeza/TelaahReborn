import { Link } from "react-router-dom";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { StatusBadge } from "../../components/StatusBadge";
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
    <section className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-deep">Beranda ROCAN</h1>
      {isPending && <LoadingState label="Memuat antrean pemeriksaan..." />}
      {error && <ErrorState message={error.message} onRetry={() => void refetch()} />}
      {data && (
        <>
          <div>
            <h2 className="mb-2 text-lg font-semibold text-brand-deep">Menunggu Pemeriksaan</h2>
            {queue.length === 0 ? (
              <EmptyState title="Tidak ada pengajuan yang menunggu pemeriksaan" />
            ) : (
              <ul className="space-y-2">
                {queue.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-line bg-white p-4"
                  >
                    <div>
                      <p className="font-medium">RO {s.roCode}</p>
                      <p className="text-sm text-ink-soft">
                        {s.satkerName} · {formatDate(s.submittedAt)}
                      </p>
                    </div>
                    <Link
                      to={`/rocan/pengajuan/${s.id}`}
                      aria-label={`Periksa pengajuan RO ${s.roCode} dari ${s.satkerName}`}
                      className="rounded-control bg-brand-deep px-4 py-2 text-sm text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                      Periksa
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-brand-deep">Ringkasan pengajuan</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {summaryStatuses.map((status) => (
                <li key={status} className="rounded-card border border-line bg-white p-4 shadow-sm">
                  <StatusBadge status={status} role={role} />
                  <p className="mt-2 text-3xl font-bold tabular-nums text-ink">
                    {data.filter((s) => s.status === status).length}
                  </p>
                  <p className="text-sm text-ink-soft">pengajuan</p>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
