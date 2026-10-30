import { Link } from "react-router-dom";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { StatusBadge } from "../../components/StatusBadge";
import { getStatusLabel } from "../../lib/status";
import type { SubmissionStatus } from "../../types";
import { useSubmissions } from "./hooks";

/** Satu status wakil per label yang dilihat Satker. */
const summaryStatuses: SubmissionStatus[] = ["PROCESSING", "AWAITING_REVIEW", "ACCEPTED", "REJECTED"];

export function SatkerHomePage() {
  const { data, isPending, error, refetch } = useSubmissions();

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-brand-deep">Beranda Satker</h1>
        <Link
          to="/satker/ajukan"
          className="rounded-control bg-brand-deep px-4 py-2 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Ajukan Baru
        </Link>
      </div>

      {isPending && <LoadingState label="Memuat ringkasan pengajuan..." />}
      {error && <ErrorState message={error.message} onRetry={() => void refetch()} />}
      {data && (
        <>
          <h2 className="text-lg font-semibold text-brand-deep">Ringkasan pengajuan</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryStatuses.map((status) => {
              const label = getStatusLabel(status, "SATKER");
              // Pemrosesan bermasalah tampil sebagai "Terupload" bagi Satker, jadi ikut dihitung.
              const count = data.filter((s) => getStatusLabel(s.status, "SATKER") === label).length;
              return (
                <li key={status} className="rounded-card border border-line bg-white p-4 shadow-sm">
                  <StatusBadge status={status} role="SATKER" />
                  <p className="mt-2 text-3xl font-bold tabular-nums text-ink">{count}</p>
                  <p className="text-sm text-ink-soft">pengajuan</p>
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-ink-soft">
            Setelah Anda menekan Kirim, pemeriksaan berjalan sendiri. Anda tidak perlu menekan tombol lain.
          </p>
        </>
      )}
    </section>
  );
}
