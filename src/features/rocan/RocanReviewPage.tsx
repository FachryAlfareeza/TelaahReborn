import { lazy, Suspense, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AiCandidateTag } from "../../components/AiCandidateTag";
import { CategoryResultCard } from "../../components/CategoryResultCard";
import { ChecklistTree } from "../../components/ChecklistTree";
import { DecisionPanel } from "../../components/DecisionPanel";
import { DocumentPair } from "../../components/DocumentPair";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { ProgramContextPanel } from "../../components/ProgramContextPanel";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate } from "../../lib/date";
import { TECHNICAL_LABEL } from "../../lib/verdict";
import { canResubmitProcessing } from "../../lib/status";
import type { Evidence } from "../../types";
import { useAuth } from "../auth/authState";
import {
  useDecision,
  useResubmitProcessing,
  useSaveDecision,
  useScreening1,
  useScreening2,
  useSubmission,
} from "../satker/hooks";
import { TechnicalSection } from "./TechnicalSection";

const PdfPreviewModal = lazy(() =>
  import("../../components/PdfPreviewModal").then((m) => ({ default: m.PdfPreviewModal })),
);

/** Detail Reviu: dokumen, konteks, hasil AI (kandidat), keputusan ROCAN, dan bagian teknis. */
export function RocanReviewPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const role = user?.role ?? "ROCAN";
  const { data, isPending, error, refetch } = useSubmission(id);
  const hasResults =
    data?.status === "AWAITING_REVIEW" || data?.status === "ACCEPTED" || data?.status === "REJECTED";
  const decided = data?.status === "ACCEPTED" || data?.status === "REJECTED";
  const s1 = useScreening1(id, hasResults);
  const s2 = useScreening2(id, hasResults);
  const decision = useDecision(id, decided);
  const save = useSaveDecision();
  const resubmit = useResubmitProcessing();
  const [preview, setPreview] = useState<{ title: string; file: string; page: number } | null>(null);
  const [previewNote, setPreviewNote] = useState<string | null>(null);

  function openEvidence(e: Evidence) {
    const doc = data?.documents.find((d) => d.type === e.documentType);
    if (!doc?.previewUrl) {
      setPreviewNote(`Pratinjau ${e.documentType} belum tersedia.`);
      return;
    }
    setPreviewNote(null);
    setPreview({ title: `${doc.type}: ${doc.fileName}`, file: doc.previewUrl, page: e.page ?? 1 });
  }

  return (
    <section className="space-y-6">
      <Link
        to="/rocan/pengajuan"
        className="text-sm text-brand-deep underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Kembali ke daftar pengajuan
      </Link>
      <h1 className="text-2xl font-bold text-brand-deep">Detail Reviu</h1>

      {isPending && <LoadingState label="Memuat pengajuan..." />}
      {error && <ErrorState message={error.message} onRetry={() => void refetch()} />}
      {data && (
        <>
          <div className="space-y-2 rounded-card border border-line bg-white p-4">
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-medium">Status:</span>
              <StatusBadge status={data.status} role={role} />
            </p>
            <dl className="grid gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-ink-soft">Kode RO</dt>
                <dd className="font-medium">{data.roCode}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Satker</dt>
                <dd className="font-medium">{data.satkerName}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Tanggal kirim</dt>
                <dd className="font-medium">{formatDate(data.submittedAt)}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-brand-deep">Dokumen</h2>
            <DocumentPair documents={data.documents} />
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-brand-deep">Konteks program</h2>
            <ProgramContextPanel context={data.context} />
          </div>

          {data.status === "PROCESSING" && (
            <LoadingState label="Dokumen masih diproses AI. Halaman ini diperbarui sendiri." />
          )}

          {data.status === "PROCESSING_FAILED" && (
            <div role="alert" className="space-y-2 rounded-card border border-bad bg-white p-4">
              <h2 className="text-lg font-semibold text-brand-deep">{TECHNICAL_LABEL}</h2>
              <p className="text-sm">
                Pemeriksaan otomatis belum selesai karena ada masalah teknis. Ini bukan kesimpulan reviu.
              </p>
              {canResubmitProcessing(data.status, role) && (
                <button
                  type="button"
                  disabled={resubmit.isPending}
                  onClick={() => resubmit.mutate(data.id)}
                  className="rounded-control bg-brand-deep px-4 py-2 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60"
                >
                  {resubmit.isPending ? "Mengirim ulang..." : "Kirim ulang pemrosesan"}
                </button>
              )}
              {resubmit.error && <p className="text-sm">{resubmit.error.message}</p>}
            </div>
          )}

          {hasResults && (
            <>
              {previewNote && (
                <p role="status" className="text-sm text-ink-soft">
                  {previewNote}
                </p>
              )}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-brand-deep">Screening 1: kualitas isi</h2>
                  <AiCandidateTag />
                </div>
                {s1.isPending && <LoadingState label="Memuat hasil Screening 1..." />}
                {s1.error && <ErrorState message={s1.error.message} onRetry={() => void s1.refetch()} />}
                {s1.data && <ChecklistTree items={s1.data.items} onOpenEvidence={openEvidence} />}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-brand-deep">Screening 2: kategori prioritas</h2>
                  <AiCandidateTag />
                </div>
                {s2.isPending && <LoadingState label="Memuat hasil Screening 2..." />}
                {s2.error && <ErrorState message={s2.error.message} onRetry={() => void s2.refetch()} />}
                {s2.data && <CategoryResultCard result={s2.data} onOpenEvidence={openEvidence} />}
              </div>

              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-brand-deep">Keputusan ROCAN</h2>
                {decision.isPending && decided && <LoadingState label="Memuat keputusan..." />}
                {decision.error && (
                  <ErrorState message={decision.error.message} onRetry={() => void decision.refetch()} />
                )}
                {!(decided && decision.isPending) && (
                  <DecisionPanel
                    decision={decision.data ?? null}
                    ready={data.status === "AWAITING_REVIEW" || decided}
                    canDecide={role === "ROCAN"}
                    pending={save.isPending}
                    errorMessage={save.error?.message ?? null}
                    onSave={(d, note) => save.mutate({ submissionId: data.id, decision: d, note })}
                  />
                )}
              </div>
            </>
          )}

          <TechnicalSection role={role} submissionId={data.id} screening1={s1.data} screening2={s2.data} />

          {preview && (
            <Suspense fallback={<LoadingState label="Memuat pratinjau..." />}>
              <PdfPreviewModal
                open
                title={preview.title}
                file={preview.file}
                initialPage={preview.page}
                onClose={() => setPreview(null)}
              />
            </Suspense>
          )}
        </>
      )}
    </section>
  );
}
