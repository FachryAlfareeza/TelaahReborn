import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  useChecklist,
  useFinalize,
  useProgress,
  useResultHistory,
  useRetryReview,
  useReviewRequest,
  useReviewResult,
  useUpdateFinal,
} from "../../api/queries";
import { AiCandidateTag } from "../../components/AiCandidateTag";
import { BackLink } from "../../components/BackLink";
import { DocumentPair, type OpenDocument } from "../../components/DocumentPair";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { ProgramContextPanel } from "../../components/ProgramContextPanel";
import { ProgressPanel } from "../../components/ProgressPanel";
import { ResultSections } from "../../components/ResultSections";
import { Screening2View } from "../../components/Screening2View";
import { Section } from "../../components/Section";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate } from "../../lib/date";
import { canRetryReview } from "../../lib/status";
import type { Evidence, HistoryEntry } from "../../types";
import { FinalizePanel } from "./FinalizePanel";
import { ItemEditor } from "./ItemEditor";
import { TechnicalSection } from "./TechnicalSection";

const fieldLabel: Record<string, string> = {
  status: "Status",
  explanation: "Penjelasan",
  evidence: "Bukti",
  error_reason: "Alasan galat",
  final_category: "Kategori final",
  finalization: "Finalisasi",
};

const show = (v: unknown) => (v === null || v === undefined ? "—" : typeof v === "string" ? v : JSON.stringify(v));

function HistoryList({ entries, codeOf }: { entries: HistoryEntry[]; codeOf: (id: string | null) => string }) {
  if (entries.length === 0) return <p className="text-sm text-ink-soft">Belum ada perubahan.</p>;
  return (
    <ol className="space-y-2 text-sm">
      {[...entries].reverse().map((h, i) => (
        <li key={`${h.revision}-${h.field}-${h.item_id}-${i}`} className="border-l-2 border-line pl-3">
          <p>
            <span className="font-medium">{fieldLabel[h.field] ?? h.field}</span>
            {h.item_id && <span className="text-ink-soft"> · {codeOf(h.item_id)}</span>}
            <span className="text-ink-soft"> · revisi {h.revision} · {formatDate(h.changed_at)}</span>
          </p>
          <p className="text-ink-soft">
            {show(h.old)} → <span className="text-ink">{show(h.new)}</span>
          </p>
          {h.change_reason && <p>Alasan: {h.change_reason}</p>}
        </li>
      ))}
    </ol>
  );
}

/**
 * Detail reviu ROCAN (PRD §7.5): dokumen, hierarki, progres, hasil AI (kandidat) di samping
 * Hasil_Final yang dapat diedit, Screening 2, finalisasi, riwayat, dan bagian teknis.
 */
export function RocanReviewPage() {
  const { id = "" } = useParams();
  const request = useReviewRequest(id);
  const status = request.data?.status;
  const hasResult = status === "siap_diverifikasi" || status === "selesai_revisi" || status === "selesai_disetujui";
  const progress = useProgress(id, status !== undefined);
  const result = useReviewResult(id, hasResult);
  const checklist = useChecklist(result.data?.checklist_version_id ?? null);
  const history = useResultHistory(id, hasResult);
  const update = useUpdateFinal(id);
  const finalize = useFinalize(id);
  const retry = useRetryReview(id);
  const [open, setOpen] = useState<OpenDocument | null>(null);

  if (request.isPending) return <LoadingState label="Memuat pengajuan..." />;
  if (request.error) {
    return (
      <div className="space-y-4">
        <BackLink to="/rocan/pengajuan" label="Daftar pengajuan" />
        <h1 className="sr-only">Detail Reviu</h1>
        <ErrorState message={request.error.message} onRetry={() => void request.refetch()} />
      </div>
    );
  }

  const r = request.data;
  const res = result.data;
  const editable = r.status === "siap_diverifikasi" && !res?.decision;
  const checklistItems = checklist.data ? [...checklist.data.screening_1_items, ...checklist.data.screening_2_items] : [];
  const codeOf = (itemId: string | null) =>
    res?.hasil_final.items.find((i) => i.item_id === itemId)?.display_code ?? itemId ?? "";
  const openEvidence = (e: Evidence) => {
    if (e.source === "tor" || e.source === "rab") setOpen({ kind: e.source, page: e.page ?? undefined });
  };

  return (
    <div className="space-y-6">
      <BackLink to="/rocan/pengajuan" label="Daftar pengajuan" />
      <header className="space-y-2">
        <h1 className="page-title">{r.title}</h1>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
          <span className="text-ink">{r.owner.nama}</span>
          <span>{r.unit_eselon2.name}</span>
          <span>Dikirim {formatDate(r.submitted_at)}</span>
          <span>Versi {r.version_number}</span>
          <StatusBadge status={r.status} role="rocan" />
        </p>
      </header>

      <Section title="Berkas">
        <DocumentPair request={r} open={open} onOpenChange={setOpen} />
      </Section>

      <Section title="Hierarki anggaran">
        <ProgramContextPanel request={r} />
      </Section>

      {(r.status === "menunggu_review" || r.status === "dalam_proses" || r.status === "gagal") && (
        <Section title="Progres review">
          {r.status === "gagal" && (
            <div role="alert" className="mb-4 space-y-2 border-l-2 border-bad py-1 pl-4">
              <p className="font-medium">Review otomatis gagal</p>
              <p className="text-sm text-ink-soft">
                Hasil AI tidak dapat disusun karena masalah teknis. Ini bukan kesimpulan reviu. Jalankan ulang atau periksa
                manual.
              </p>
              {canRetryReview(r.status, "rocan") && (
                <button type="button" disabled={retry.isPending} onClick={() => retry.mutate()} className="btn btn-primary">
                  {retry.isPending ? "Menjalankan ulang..." : "Jalankan ulang review"}
                </button>
              )}
              {retry.error && <p className="error-text">{retry.error.message}</p>}
            </div>
          )}
          {r.status === "menunggu_review" && !progress.data?.run_id && (
            <p className="text-sm text-ink-soft">Review belum dimulai. Biasanya karena belum ada checklist aktif.</p>
          )}
          {progress.data?.run_id && <ProgressPanel progress={progress.data} />}
        </Section>
      )}

      {hasResult && (
        <>
          {result.isPending && <LoadingState label="Memuat hasil review..." />}
          {result.error && <ErrorState message={result.error.message} onRetry={() => void result.refetch()} />}
          {res && (
            <>
              {update.error && (
                <ErrorState
                  title="Perubahan belum tersimpan"
                  message={update.error.message}
                  onRetry={() => {
                    update.reset();
                    void result.refetch();
                  }}
                />
              )}
              <Section
                title="Screening 1: hasil per item"
                aside={
                  <span className="flex items-center gap-2 text-xs text-ink-soft">
                    <AiCandidateTag /> diverifikasi ROCAN · revisi {res.hasil_final.revision}
                  </span>
                }
              >
                {res.hasil_final.items.length === 0 ? (
                  <p className="text-sm text-ink-soft">Belum ada item hasil.</p>
                ) : (
                  <ResultSections
                    items={res.hasil_final.items}
                    checklist={checklistItems}
                    onOpenEvidence={openEvidence}
                    renderExtra={(item) => (
                      <ItemEditor
                        key={`${item.item_id}-${res.hasil_final.revision}`}
                        finalItem={item}
                        aiItem={res.hasil_ai?.items.find((a) => a.item_id === item.item_id)}
                        editable={editable}
                        pending={update.isPending}
                        onSave={(edit) =>
                          update.mutateAsync({
                            expected_revision: res.hasil_final.revision,
                            items: [{ item_id: item.item_id, ...edit }],
                          })
                        }
                      />
                    )}
                  />
                )}
              </Section>

              <Section title="Screening 2: kategori RO" aside={<AiCandidateTag />}>
                {res.hasil_ai ? (
                  <Screening2View result={res.hasil_ai.screening_2} priority={r.priority} onOpenEvidence={openEvidence} />
                ) : (
                  <p className="text-sm text-ink-soft">Hasil Screening 2 tidak tersedia.</p>
                )}
                <p className="mt-3 text-sm text-ink-soft">Kategori final ditetapkan ROCAN saat finalisasi.</p>
              </Section>

              <Section title="Keputusan ROCAN">
                <FinalizePanel
                  key={res.hasil_final.revision}
                  result={res}
                  ready={editable}
                  pending={finalize.isPending}
                  errorMessage={finalize.error?.message ?? null}
                  onFinalize={(input) => finalize.mutate(input)}
                />
              </Section>

              <Section title="Riwayat perubahan">
                {history.isPending && <LoadingState />}
                {history.error && <ErrorState message={history.error.message} onRetry={() => void history.refetch()} />}
                {history.data && <HistoryList entries={history.data} codeOf={codeOf} />}
              </Section>
            </>
          )}
        </>
      )}

      <div className="border-t border-line pt-6">
        <TechnicalSection requestId={r.id} result={res} progress={progress.data} />
      </div>
    </div>
  );
}
