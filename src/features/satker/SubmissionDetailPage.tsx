import { useId, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useFinalResult, useProgress, useResubmit, useReviewRequest, useVersions } from "../../api/queries";
import { BackLink } from "../../components/BackLink";
import { DocumentPair, type OpenDocument } from "../../components/DocumentPair";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { ProgramContextPanel } from "../../components/ProgramContextPanel";
import { ProgressPanel } from "../../components/ProgressPanel";
import { ResultSections } from "../../components/ResultSections";
import { Section } from "../../components/Section";
import { StatusBadge } from "../../components/StatusBadge";
import { UploadDropzone } from "../../components/UploadDropzone";
import { formatDate } from "../../lib/date";
import { MAX_RESUBMISSIONS } from "../../lib/files";
import { isFinal } from "../../lib/status";
import { CATEGORIES, categoryLabel, decisionLabel } from "../../lib/verdict";
import type { Category, Evidence, ReviewRequest } from "../../types";

/** Hasil AI tidak pernah tampil di sini; Satker hanya melihat hasil final (PRD FR-VER-03). */
export function SubmissionDetailPage() {
  const { id = "" } = useParams();
  const request = useReviewRequest(id);
  const [open, setOpen] = useState<OpenDocument | null>(null);
  const status = request.data?.status;
  const progress = useProgress(id, status === "dalam_proses");
  const final = useFinalResult(id, status !== undefined && isFinal(status));
  const versions = useVersions(id);

  if (request.isPending) return <LoadingState label="Memuat pengajuan..." />;
  if (request.error) return <ErrorState message={request.error.message} onRetry={() => void request.refetch()} />;
  const r = request.data;
  const chain = versions.data ?? [];
  const newer = chain.find((v) => v.parent_request_id === r.id);
  const openEvidence = (e: Evidence) => {
    if (e.source === "tor" || e.source === "rab") setOpen({ kind: e.source, page: e.page ?? undefined });
  };

  return (
    <div className="space-y-6">
      <BackLink to="/satker/pengajuan" label="Pengajuan Saya" />
      <header className="space-y-2">
        <h1 className="page-title">{r.title}</h1>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-ink-soft">
          <StatusBadge status={r.status} role="satker" />
          <span>Dikirim {formatDate(r.submitted_at)}</span>
          <span>Versi {r.version_number}</span>
        </div>
      </header>

      <Section title="Berkas">
        <DocumentPair request={r} open={open} onOpenChange={setOpen} />
      </Section>

      <Section title="Hierarki anggaran">
        <ProgramContextPanel request={r} />
      </Section>

      <Section title="Hasil reviu">
        {r.status === "menunggu_review" && (
          <p className="text-sm text-ink-soft">Pengajuan diterima dan menunggu reviu dimulai.</p>
        )}
        {(r.status === "dalam_proses" || r.status === "gagal") && (
          <div className="space-y-3">
            <p className="text-sm text-ink-soft">Reviu otomatis sedang berjalan. Halaman ini diperbarui sendiri.</p>
            {r.status === "dalam_proses" && progress.data && <ProgressPanel progress={progress.data} showMessages={false} />}
          </div>
        )}
        {r.status === "siap_diverifikasi" && (
          <p className="text-sm text-ink-soft">Reviu otomatis selesai dan sedang diperiksa ROCAN.</p>
        )}
        {isFinal(r.status) && (
          <>
            {final.isPending && <LoadingState label="Memuat hasil final..." />}
            {final.error && <ErrorState message={final.error.message} onRetry={() => void final.refetch()} />}
            {final.data && (
              <div className="space-y-4">
                <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="term">Keputusan ROCAN</dt>
                    <dd className="font-medium">{decisionLabel[final.data.decision]}</dd>
                  </div>
                  <div>
                    <dt className="term">Kategori final</dt>
                    <dd className="font-medium">
                      {final.data.hasil_final.final_category ? categoryLabel[final.data.hasil_final.final_category] : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="term">Difinalisasi</dt>
                    <dd>{formatDate(final.data.finalized_at)}</dd>
                  </div>
                </dl>
                <ResultSections items={final.data.hasil_final.items} onOpenEvidence={openEvidence} />
              </div>
            )}
          </>
        )}
      </Section>

      {r.status === "selesai_revisi" && (
        <Section title="Kirim revisi">
          {newer ? (
            <p className="text-sm">
              Revisi sudah dikirim sebagai{" "}
              <Link to={`/satker/pengajuan/${newer.id}`} className="link">
                versi {newer.version_number}
              </Link>
              .
            </p>
          ) : r.resubmission_count >= MAX_RESUBMISSIONS ? (
            <p className="text-sm text-ink-soft">
              Batas {MAX_RESUBMISSIONS} kali revisi sudah tercapai. Ajukan sebagai pengajuan baru bila perlu.
            </p>
          ) : (
            <ResubmitForm request={r} />
          )}
        </Section>
      )}

      {chain.length > 1 && (
        <Section title="Riwayat versi">
          <ol className="space-y-1 text-sm">
            {chain.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-x-4">
                {v.id === r.id ? (
                  <span className="font-medium">Versi {v.version_number} (halaman ini)</span>
                ) : (
                  <Link to={`/satker/pengajuan/${v.id}`} className="link">
                    Versi {v.version_number}
                  </Link>
                )}
                <span className="text-ink-soft">{formatDate(v.submitted_at)}</span>
                <StatusBadge status={v.status} role="satker" />
              </li>
            ))}
          </ol>
        </Section>
      )}
    </div>
  );
}

/** Resubmisi: TOR dan RAB baru wajib; hierarki tidak dapat diubah (kontrak §3.4.2). */
function ResubmitForm({ request }: { request: ReviewRequest }) {
  const navigate = useNavigate();
  const resubmit = useResubmit(request.id);
  const ids = { title: useId(), description: useId() };
  const [tor, setTor] = useState<File | null>(null);
  const [rab, setRab] = useState<File | null>(null);
  const [title, setTitle] = useState(request.title);
  const [description, setDescription] = useState(request.description);
  const [category, setCategory] = useState<Category>(request.proposal_category);
  const [problem, setProblem] = useState<string | null>(null);
  const busy = resubmit.isPending;
  const left = MAX_RESUBMISSIONS - request.resubmission_count;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!tor || !rab) return setProblem("Unggah TOR dan RAB versi revisi.");
    if (!title.trim() || !description.trim()) return setProblem("Judul dan deskripsi tidak boleh kosong.");
    setProblem(null);
    resubmit.mutate(
      {
        tor_file: tor,
        rab_file: rab,
        title: title.trim() !== request.title ? title.trim() : undefined,
        description: description.trim() !== request.description ? description.trim() : undefined,
        proposal_category: category !== request.proposal_category ? category : undefined,
      },
      { onSuccess: (next) => navigate(`/satker/pengajuan/${next.id}`) },
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-4">
      <p className="text-sm text-ink-soft">
        Hierarki anggaran tetap sama. Untuk RO lain, buat pengajuan baru. Sisa kesempatan revisi: {left}.
      </p>
      <fieldset disabled={busy} className="space-y-4">
        <UploadDropzone label="TOR revisi (PDF)" file={tor} onChange={setTor} disabled={busy} />
        <UploadDropzone label="RAB revisi (PDF)" file={rab} onChange={setRab} disabled={busy} />
        <div>
          <label htmlFor={ids.title} className="field-label">
            Judul atau nama usulan
          </label>
          <input id={ids.title} value={title} onChange={(e) => setTitle(e.target.value)} className="field" />
        </div>
        <div>
          <label htmlFor={ids.description} className="field-label">
            Deskripsi
          </label>
          <textarea
            id={ids.description}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="field"
          />
        </div>
        <fieldset>
          <legend className="field-label">Kategori usulan</legend>
          <div className="space-y-1.5">
            {CATEGORIES.map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm">
                <input type="radio" name="kategori-revisi" checked={category === c} onChange={() => setCategory(c)} />
                {categoryLabel[c]}
              </label>
            ))}
          </div>
        </fieldset>
      </fieldset>
      {problem && (
        <p role="alert" className="error-text">
          {problem}
        </p>
      )}
      {resubmit.error && <ErrorState title="Revisi belum terkirim" message={resubmit.error.message} />}
      <button type="submit" disabled={busy} className="btn btn-primary">
        {busy ? "Mengirim..." : "Kirim revisi"}
      </button>
    </form>
  );
}
