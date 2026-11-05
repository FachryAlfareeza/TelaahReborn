import { Link, useParams } from "react-router-dom";
import { BackLink } from "../../components/BackLink";
import { DocumentPair } from "../../components/DocumentPair";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { Section } from "../../components/Section";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate } from "../../lib/date";
import { displayValue } from "../../lib/empty";
import { useDecision, useSubmission } from "./hooks";

/** Detail untuk Satker: dokumen, status, dan keputusan ROCAN. Tanpa hasil AI atau data teknis. */
export function SubmissionDetailPage() {
  const { id = "" } = useParams();
  const { data, isPending, error, refetch } = useSubmission(id);
  const decided = data?.status === "ACCEPTED" || data?.status === "REJECTED";
  const decision = useDecision(id, decided);

  return (
    <div className="space-y-6">
      <BackLink to="/satker/pengajuan" label="Pengajuan saya" />

      {isPending && <LoadingState />}
      {error && <ErrorState message={error.message} onRetry={() => void refetch()} />}
      {!data && <h1 className="sr-only">Detail Pengajuan</h1>}
      {data && (
        <>
          <header>
            <h1 className="page-title">Pengajuan RO {data.roCode}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
              <span>{formatDate(data.submittedAt)}</span>
              <StatusBadge status={data.status} role="SATKER" />
              {data.previousSubmissionId && (
                <Link className="link" to={`/satker/pengajuan/${data.previousSubmissionId}`}>
                  Pengajuan sebelumnya
                </Link>
              )}
            </p>
          </header>

          {decided && (
            <Section title="Keputusan ROCAN">
              {decision.isPending && <LoadingState />}
              {decision.error && (
                <ErrorState message={decision.error.message} onRetry={() => void decision.refetch()} />
              )}
              {decision.data && (
                <dl className="grid max-w-2xl gap-x-8 gap-y-2 rounded-card bg-sky-pale p-5 text-sm sm:grid-cols-[auto_1fr]">
                  <dt className="term sm:pt-0.5">Keputusan</dt>
                  <dd className="font-medium">{decision.data.decision === "ACCEPTED" ? "Diterima" : "Ditolak"}</dd>
                  <dt className="term sm:pt-0.5">Catatan</dt>
                  <dd className="whitespace-pre-wrap">{displayValue(decision.data.note)}</dd>
                  <dt className="term sm:pt-0.5">Tanggal</dt>
                  <dd>{formatDate(decision.data.decidedAt)}</dd>
                </dl>
              )}
              {decision.data === null && <p className="text-sm text-ink-soft">Belum ada catatan.</p>}
              {data.status === "REJECTED" && (
                <Link to={`/satker/ajukan?ulang=${encodeURIComponent(data.id)}`} className="btn btn-primary mt-4">
                  Ajukan ulang
                </Link>
              )}
            </Section>
          )}

          <Section title="Dokumen">
            <DocumentPair documents={data.documents} />
          </Section>
        </>
      )}
    </div>
  );
}
