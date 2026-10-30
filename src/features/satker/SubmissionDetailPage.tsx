import { Link, useParams } from "react-router-dom";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate } from "../../lib/date";
import { displayValue } from "../../lib/empty";
import { formatFileSize } from "./format";
import { useDecision, useSubmission } from "./hooks";

const statusHint = {
  PROCESSING: "Berkas Anda sudah diterima dan sedang diproses. Halaman ini diperbarui sendiri.",
  PROCESSING_FAILED: "Berkas Anda sudah diterima dan sedang diproses. Halaman ini diperbarui sendiri.",
  AWAITING_REVIEW: "Pemeriksaan otomatis selesai. Pengajuan Anda menunggu keputusan ROCAN.",
  ACCEPTED: "ROCAN menerima pengajuan Anda.",
  REJECTED: "ROCAN menolak pengajuan Anda. Baca catatan di bawah.",
} as const;

/** Detail untuk Satker: dokumen, status, dan keputusan ROCAN. Tanpa hasil AI atau data teknis. */
export function SubmissionDetailPage() {
  const { id = "" } = useParams();
  const { data, isPending, error, refetch } = useSubmission(id);
  const decided = data?.status === "ACCEPTED" || data?.status === "REJECTED";
  const decision = useDecision(id, decided);

  return (
    <section className="space-y-6">
      <Link
        to="/satker/pengajuan"
        className="text-sm text-brand-deep underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Kembali ke daftar pengajuan
      </Link>
      <h1 className="text-2xl font-bold text-brand-deep">Detail Pengajuan</h1>

      {isPending && <LoadingState label="Memuat pengajuan..." />}
      {error && <ErrorState message={error.message} onRetry={() => void refetch()} />}
      {data && (
        <>
          <div className="space-y-2 rounded-card border border-line bg-white p-4">
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-medium">Status:</span>
              <StatusBadge status={data.status} role="SATKER" />
            </p>
            <p className="text-sm text-ink-soft">{statusHint[data.status]}</p>
            {data.previousSubmissionId && (
              <p className="text-sm">
                Pengajuan ulang dari{" "}
                <Link className="text-brand-deep underline" to={`/satker/pengajuan/${data.previousSubmissionId}`}>
                  pengajuan sebelumnya
                </Link>
                .
              </p>
            )}
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-soft">Kode RO</dt>
                <dd className="font-medium">{data.roCode}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Tanggal kirim</dt>
                <dd className="font-medium">{formatDate(data.submittedAt)}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-brand-deep">Dokumen yang dikirim</h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {data.documents.map((d) => (
                <li key={d.id} className="rounded-card border border-line bg-white p-4">
                  <p className="text-sm text-ink-soft">{d.type}</p>
                  <p className="font-medium break-all">{d.fileName}</p>
                  <p className="text-sm text-ink-soft">{formatFileSize(d.sizeBytes)}</p>
                </li>
              ))}
            </ul>
          </div>

          {decided && (
            <div className="rounded-card border border-line bg-white p-4">
              <h2 className="mb-2 text-lg font-semibold text-brand-deep">Keputusan ROCAN</h2>
              {decision.isPending && <LoadingState label="Memuat keputusan..." />}
              {decision.error && (
                <ErrorState message={decision.error.message} onRetry={() => void decision.refetch()} />
              )}
              {decision.data && (
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-ink-soft">Keputusan</dt>
                    <dd className="font-medium">{decision.data.decision === "ACCEPTED" ? "Diterima" : "Ditolak"}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">Catatan</dt>
                    <dd className="whitespace-pre-wrap">{displayValue(decision.data.note)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">Tanggal keputusan</dt>
                    <dd>{formatDate(decision.data.decidedAt)}</dd>
                  </div>
                </dl>
              )}
              {data.status === "REJECTED" && (
                <Link
                  to={`/satker/ajukan?ulang=${encodeURIComponent(data.id)}`}
                  className="mt-4 inline-block rounded-control bg-brand-deep px-4 py-2 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  Ajukan ulang
                </Link>
              )}
              {decision.data === null && <p className="text-sm text-ink-soft">Belum ada catatan.</p>}
            </div>
          )}
        </>
      )}
    </section>
  );
}
