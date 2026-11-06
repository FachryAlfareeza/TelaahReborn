import { useCallback, useMemo, useState } from "react";
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
import { DashboardPage, Panel, StatCard, Tabs, type TabDef } from "../../components/Dashboard";
import { DocumentPair, DocumentPreview, type OpenDocument } from "../../components/DocumentPair";
import { Drawer } from "../../components/Drawer";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { ProgramContextPanel } from "../../components/ProgramContextPanel";
import { ProgressPanel } from "../../components/ProgressPanel";
import { Screening2View } from "../../components/Screening2View";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate } from "../../lib/date";
import { canRetryReview, hasReviewResult } from "../../lib/status";
import { categoryLabel, decisionLabel, isTechnicalError } from "../../lib/verdict";
import type { Evidence, HistoryEntry, ItemStatus } from "../../types";
import { FinalizePanel } from "./FinalizePanel";
import { applyDraft, differs, ResultGrid, type Draft, type Drafts, type GridFilter } from "./ResultGrid";
import { TechnicalSection } from "./TechnicalSection";

const fieldLabel: Record<string, string> = {
  status: "Status",
  explanation: "Penjelasan",
  evidence: "Bukti",
  error_reason: "Alasan galat",
  final_category: "Kategori final",
  finalization: "Finalisasi",
};

const filterLabel: Record<GridFilter, string> = {
  all: "Semua item",
  tidak_sesuai: "Tidak sesuai",
  error: "Error teknis",
  changed: "Diubah ROCAN",
  draft: "Belum disimpan",
};

const EMPTY: ReadonlySet<string> = new Set();

const show = (v: unknown) => (v === null || v === undefined ? "—" : typeof v === "string" ? v : JSON.stringify(v));

type HistoryProps = {
  entries: HistoryEntry[];
  codeOf: (id: string | null) => string;
  onRestore?: (entry: HistoryEntry) => void;
};

function HistoryList({ entries, codeOf, onRestore }: HistoryProps) {
  const newestFirst = useMemo(() => [...entries].reverse(), [entries]);
  if (entries.length === 0) return <p className="p-4 text-sm text-ink-soft">Belum ada perubahan.</p>;
  return (
    <table className="sheet">
      <caption className="sr-only">Riwayat perubahan</caption>
      <thead>
        <tr>
          <th scope="col">Revisi</th>
          <th scope="col">Waktu</th>
          <th scope="col">Item</th>
          <th scope="col">Bidang</th>
          <th scope="col">Sebelum</th>
          <th scope="col">Sesudah</th>
          <th scope="col">Alasan</th>
          {onRestore && <th scope="col">Pulihkan</th>}
        </tr>
      </thead>
      <tbody>
        {newestFirst.map((h, i) => {
          const restorable = h.item_id && (h.field === "status" || h.field === "explanation") && typeof h.old === "string";
          return (
            <tr key={`${h.revision}-${h.field}-${h.item_id}-${i}`}>
              <th scope="row" className="tabular-nums">
                {h.revision}
              </th>
              <td className="whitespace-nowrap">{formatDate(h.changed_at)}</td>
              <td className="whitespace-nowrap">{h.item_id ? codeOf(h.item_id) : "—"}</td>
              <td>{fieldLabel[h.field] ?? h.field}</td>
              <td className="text-ink-soft">{show(h.old)}</td>
              <td>{show(h.new)}</td>
              <td>{h.change_reason ? `Alasan: ${h.change_reason}` : "—"}</td>
              {onRestore && (
                <td>
                  {restorable && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-brand hover:text-brand-deep"
                      onClick={() => onRestore(h)}
                      aria-label={`Pulihkan ${fieldLabel[h.field]} ${codeOf(h.item_id)} ke nilai sebelum revisi ${h.revision}`}
                    >
                      Pulihkan nilai ini
                    </button>
                  )}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

type TabId = "s1" | "s2" | "files" | "history" | "tech" | "progress";

export function RocanReviewPage() {
  const { id = "" } = useParams();
  const request = useReviewRequest(id);
  const status = request.data?.status;
  const hasResult = status !== undefined && hasReviewResult(status);
  const progress = useProgress(id, status !== undefined);
  const result = useReviewResult(id, hasResult);
  const checklist = useChecklist(result.data?.checklist_version_id ?? null);
  const history = useResultHistory(id, hasResult);
  const update = useUpdateFinal(id);
  const finalize = useFinalize(id);
  const retry = useRetryReview(id);
  const [open, setOpen] = useState<OpenDocument | null>(null);
  const [tab, setTab] = useState<TabId>("s1");
  const [filter, setFilter] = useState<GridFilter>("all");
  const [drafts, setDrafts] = useState<Drafts>({});
  const [triedSave, setTriedSave] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);

  const res = result.data;
  const checklistItems = useMemo(
    () => (checklist.data ? [...checklist.data.screening_1_items, ...checklist.data.screening_2_items] : []),
    [checklist.data],
  );
  const { finalItems, aiItems, savedOf, stats } = useMemo(() => {
    const finalItems = res?.hasil_final.items ?? [];
    const aiItems = res?.hasil_ai?.items ?? [];
    const aiOf = new Map(aiItems.map((i) => [i.item_id, i]));
    const stats = { sesuai: 0, tidakSesuai: 0, error: 0, changed: 0 };
    for (const i of finalItems) {
      if (i.status === "Sesuai") stats.sesuai++;
      else if (isTechnicalError(i.status)) stats.error++;
      else stats.tidakSesuai++;
      if (differs(i, aiOf.get(i.item_id))) stats.changed++;
    }
    return { finalItems, aiItems, savedOf: new Map(finalItems.map((i) => [i.item_id, i])), stats };
  }, [res]);

  const setDraft = useCallback((itemId: string, draft: Draft | null) => {
    setDrafts((ds) => {
      const next = { ...ds };
      if (draft) next[itemId] = draft;
      else delete next[itemId];
      return next;
    });
  }, []);
  const openEvidence = useCallback((e: Evidence) => {
    if (e.source === "tor" || e.source === "rab") setOpen({ kind: e.source, page: e.page ?? undefined });
  }, []);

  const dirtyIds = Object.keys(drafts);
  // Alasan wajib bila status diubah.
  const needsReason = useMemo(
    () => new Set(Object.keys(drafts).filter((itemId) => drafts[itemId].status !== savedOf.get(itemId)?.status && !drafts[itemId].reason.trim())),
    [drafts, savedOf],
  );
  // Baru ditandai setelah ROCAN mencoba menyimpan.
  const missingReason = triedSave ? needsReason : EMPTY;

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
  const editable = r.status === "siap_diverifikasi" && !res?.decision;
  const codeOf = (itemId: string | null) => savedOf.get(itemId ?? "")?.display_code ?? itemId ?? "";
  const savedCount = update.isSuccess && dirtyIds.length === 0 ? update.variables.items.length : 0;

  function restore(entry: HistoryEntry) {
    const saved = entry.item_id ? savedOf.get(entry.item_id) : undefined;
    if (!saved || typeof entry.old !== "string") return;
    const patch: Partial<Draft> = entry.field === "status" ? { status: entry.old as ItemStatus } : { explanation: entry.old };
    setDraft(saved.item_id, applyDraft(saved, drafts[saved.item_id], { ...patch, reason: `Dipulihkan dari sebelum revisi ${entry.revision}` }));
    setTab("s1");
  }

  function saveAll() {
    if (!res) return;
    setTriedSave(true);
    if (needsReason.size > 0) return setFilter("draft");
    update.mutate(
      {
        expected_revision: res.hasil_final.revision,
        items: dirtyIds.map((itemId) => {
          const d = drafts[itemId];
          const saved = savedOf.get(itemId)!;
          return {
            item_id: itemId,
            status: d.status !== saved.status ? d.status : undefined,
            explanation: d.explanation !== saved.explanation ? d.explanation : undefined,
            change_reason: d.reason.trim() || undefined,
          };
        }),
      },
      {
        onSuccess: () => {
          setDrafts({});
          setTriedSave(false);
          setFilter((f) => (f === "draft" ? "all" : f));
        },
      },
    );
  }

  const toggleFilter = (f: GridFilter) => setFilter((cur) => (cur === f ? "all" : f));

  const tabs: TabDef<TabId>[] = hasResult
    ? [
        { id: "s1", label: "Screening 1", badge: finalItems.length },
        { id: "s2", label: "Screening 2" },
        { id: "files", label: "Berkas & hierarki" },
        { id: "history", label: "Riwayat", badge: history.data?.length },
        { id: "tech", label: "Teknis" },
      ]
    : [
        { id: "progress", label: "Progres review" },
        { id: "files", label: "Berkas & hierarki" },
        { id: "tech", label: "Teknis" },
      ];
  const activeTab = tabs.some((t) => t.id === tab) ? tab : tabs[0].id;

  const saveBar =
    activeTab === "s1" && editable ? (
      dirtyIds.length > 0 ? (
        <>
          <span className="text-sm text-warn tabular-nums">{dirtyIds.length} perubahan belum disimpan</span>
          <button type="button" className="btn btn-secondary btn-sm" disabled={update.isPending} onClick={() => setDrafts({})}>
            Batalkan semua
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={update.isPending} onClick={saveAll}>
            {update.isPending ? "Menyimpan..." : `Simpan semua (${dirtyIds.length})`}
          </button>
        </>
      ) : (
        savedCount > 0 && (
          <span role="status" className="text-sm text-ok">
            {savedCount} perubahan disimpan.
          </span>
        )
      )
    ) : undefined;

  return (
    <DashboardPage
      before={<BackLink to="/rocan/pengajuan" label="Daftar pengajuan" />}
      title={r.title}
      subtitle={
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-ink">{r.owner.nama}</span>
          <span>{r.unit_eselon2.name}</span>
          <span>Dikirim {formatDate(r.submitted_at)}</span>
          <span>Versi {r.version_number}</span>
          <StatusBadge status={r.status} role="rocan" />
        </span>
      }
      actions={
        res && (
          <>
            <AiCandidateTag />
            {res.decision ? (
              <button type="button" className="btn btn-secondary" onClick={() => setFinalizeOpen(true)}>
                {decisionLabel[res.decision]}
                {res.hasil_final.final_category && ` · ${categoryLabel[res.hasil_final.final_category]}`}
              </button>
            ) : (
              <button type="button" className="btn btn-primary" disabled={!editable} onClick={() => setFinalizeOpen(true)}>
                Keputusan ROCAN
              </button>
            )}
          </>
        )
      }
      stats={
        res && (
          <>
            <StatCard label="Total item" value={finalItems.length} onClick={() => setFilter("all")} active={filter === "all"} />
            <StatCard label="Sesuai" value={stats.sesuai} />
            <StatCard label="Tidak sesuai / revisi" value={stats.tidakSesuai} onClick={() => toggleFilter("tidak_sesuai")} active={filter === "tidak_sesuai"} />
            <StatCard label="Error teknis" value={stats.error} onClick={() => toggleFilter("error")} active={filter === "error"} />
            <StatCard label="Diubah ROCAN" value={stats.changed} onClick={() => toggleFilter("changed")} active={filter === "changed"} />
            <StatCard label="Belum disimpan" value={dirtyIds.length} onClick={() => toggleFilter("draft")} active={filter === "draft"} />
            <StatCard
              label={res.decision ? "Kategori final" : "Rekomendasi kategori AI"}
              value={(res.decision ? res.hasil_final.final_category : res.hasil_ai?.screening_2.recommended_category) ?? "—"}
              hint={res.decision ? decisionLabel[res.decision] : `Revisi ${res.hasil_final.revision}`}
            />
          </>
        )
      }
    >
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
      {result.error && <ErrorState message={result.error.message} onRetry={() => void result.refetch()} />}
      {missingReason.size > 0 && (
        <p role="alert" className="rounded-control bg-bad/10 px-3 py-2 text-sm text-bad-text">
          Isi alasan perubahan status untuk {missingReason.size} item sebelum menyimpan.
        </p>
      )}

      <Tabs tabs={tabs} value={activeTab} onChange={setTab} label="Bagian reviu" actions={saveBar}>
        {activeTab === "progress" && (
          <div className="space-y-4 p-4">
            {r.status === "gagal" && (
              <div role="alert" className="space-y-2 border-l-2 border-bad py-1 pl-4">
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
          </div>
        )}

        {activeTab === "s1" && (
          <>
            {result.isPending && <LoadingState label="Memuat hasil review..." />}
            {res && (
              <>
                <h2 className="sr-only">Screening 1: hasil per item</h2>
                {(filter !== "all" || !editable) && (
                  <p className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2 text-xs text-ink-soft">
                    {filter !== "all" && (
                      <>
                        <span>Menampilkan: {filterLabel[filter]}</span>
                        <button type="button" className="link" onClick={() => setFilter("all")}>
                          Tampilkan semua
                        </button>
                      </>
                    )}
                    {!editable && (
                      <span className="ml-auto">
                        {res.decision ? "Sudah difinalisasi." : "Hanya bisa diubah saat siap diverifikasi."}
                      </span>
                    )}
                  </p>
                )}
                {finalItems.length === 0 ? (
                  <p className="p-4 text-sm text-ink-soft">Belum ada item hasil.</p>
                ) : (
                  <ResultGrid
                    items={finalItems}
                    aiItems={aiItems}
                    checklist={checklistItems}
                    drafts={drafts}
                    onDraftChange={setDraft}
                    editable={editable}
                    pending={update.isPending}
                    filter={filter}
                    missingReason={missingReason}
                    onOpenEvidence={openEvidence}
                  />
                )}
              </>
            )}
          </>
        )}

        {activeTab === "s2" && (
          <div className="space-y-3 p-4">
            <h2 className="section-title">Screening 2: kategori RO</h2>
            {res?.hasil_ai ? (
              <Screening2View result={res.hasil_ai.screening_2} priority={r.priority} onOpenEvidence={openEvidence} />
            ) : (
              <p className="text-sm text-ink-soft">Hasil Screening 2 tidak tersedia.</p>
            )}
            <p className="text-sm text-ink-soft">Kategori final ditetapkan ROCAN saat finalisasi.</p>
          </div>
        )}

        {activeTab === "files" && (
          <div className="grid gap-4 p-4 xl:grid-cols-2">
            <Panel title="Berkas">
              <DocumentPair request={r} open={open} onOpenChange={setOpen} withPreview={false} />
            </Panel>
            <Panel title="Hierarki anggaran">
              <ProgramContextPanel request={r} />
            </Panel>
          </div>
        )}

        {activeTab === "history" && (
          <>
            <h2 className="sr-only">Riwayat perubahan</h2>
            {history.isPending && <LoadingState />}
            {history.error && <ErrorState message={history.error.message} onRetry={() => void history.refetch()} />}
            {history.data && <HistoryList entries={history.data} codeOf={codeOf} onRestore={editable ? restore : undefined} />}
          </>
        )}

        {activeTab === "tech" && (
          <div className="p-4">
            <TechnicalSection requestId={r.id} result={res} progress={progress.data} />
          </div>
        )}
      </Tabs>

      {/* Di luar tab supaya bukti bisa membuka TOR/RAB dari tab mana pun. */}
      <DocumentPreview request={r} open={open} onClose={() => setOpen(null)} />

      <Drawer
        open={finalizeOpen && !!res}
        title="Keputusan ROCAN"
        description={dirtyIds.length > 0 ? `Simpan ${dirtyIds.length} perubahan dulu sebelum finalisasi.` : undefined}
        onClose={() => setFinalizeOpen(false)}
        width="md"
      >
        {res && (
          <FinalizePanel
            key={res.hasil_final.revision}
            result={res}
            ready={editable && dirtyIds.length === 0}
            pending={finalize.isPending}
            errorMessage={finalize.error?.message ?? null}
            onFinalize={(input) => finalize.mutate(input)}
          />
        )}
      </Drawer>
    </DashboardPage>
  );
}
