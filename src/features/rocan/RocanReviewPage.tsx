import { lazy, Suspense, useState } from "react";
import { useParams } from "react-router-dom";
import { AiCandidateTag } from "../../components/AiCandidateTag";
import { BackLink } from "../../components/BackLink";
import { CategoryResultCard } from "../../components/CategoryResultCard";
import { ChecklistTree } from "../../components/ChecklistTree";
import { DecisionPanel } from "../../components/DecisionPanel";
import { DocumentPair } from "../../components/DocumentPair";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { ProgramContextPanel } from "../../components/ProgramContextPanel";
import { Section } from "../../components/Section";
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
    <div className="space-y-6">
      <BackLink to="/rocan/pengajuan" label="Daftar pengajuan" />

      {isPending && <LoadingState />}
      {error && <ErrorState message={error.message} onRetry={() => void refetch()} />}
      {!data && <h1 className="sr-only">Detail Reviu</h1>}
      {data && (
        <>
          <header>
            <h1 className="page-title">RO {data.roCode}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
              <span className="text-ink">{data.satkerName}</span>
              <span>{formatDate(data.submittedAt)}</span>
              <StatusBadge status={data.status} role={role} />
            </p>
          </header>

          <Section title="Dokumen">
            <DocumentPair documents={data.documents} />
          </Section>

          <Section title="Konteks program">
            <ProgramContextPanel context={data.context} />
          </Section>

          {data.status === "PROCESSING" && <LoadingState label="Masih diproses AI." />}

          {data.status === "PROCESSING_FAILED" && (
            <div role="alert" className="space-y-2 border-l-2 border-bad py-1 pl-4">
              <h2 className="section-title">{TECHNICAL_LABEL}</h2>
              <p className="text-sm text-ink-soft">
                Pemeriksaan otomatis terhenti karena masalah teknis. Ini bukan kesimpulan reviu.
              </p>
              {canResubmitProcessing(data.status, role) && (
                <button
                  type="button"
                  disabled={resubmit.isPending}
                  onClick={() => resubmit.mutate(data.id)}
                  className="btn btn-primary"
                >
                  {resubmit.isPending ? "Mengirim ulang..." : "Kirim ulang pemrosesan"}
                </button>
              )}
              {resubmit.error && <p className="error-text">{resubmit.error.message}</p>}
            </div>
          )}

          {hasResults && (
            <>
              {previewNote && (
                <p role="status" className="text-sm text-ink-soft">
                  {previewNote}
                </p>
              )}
              <Section title="Screening 1: kualitas isi" aside={<AiCandidateTag />}>
                {s1.isPending && <LoadingState />}
                {s1.error && <ErrorState message={s1.error.message} onRetry={() => void s1.refetch()} />}
                {s1.data && <ChecklistTree items={s1.data.items} onOpenEvidence={openEvidence} />}
              </Section>

              <Section title="Screening 2: kategori prioritas" aside={<AiCandidateTag />}>
                {s2.isPending && <LoadingState />}
                {s2.error && <ErrorState message={s2.error.message} onRetry={() => void s2.refetch()} />}
                {s2.data && <CategoryResultCard result={s2.data} onOpenEvidence={openEvidence} />}
              </Section>

              <Section title="Keputusan ROCAN">
                {decision.isPending && decided && <LoadingState />}
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
              </Section>
            </>
          )}

          <div className="border-t border-line pt-6">
            <TechnicalSection role={role} submissionId={data.id} screening1={s1.data} screening2={s2.data} />
          </div>

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
    </div>
  );
}
