import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { UploadDropzone } from "../../components/UploadDropzone";
import { formatFileSize } from "./format";
import { useCreateSubmission, useRos } from "./hooks";

/** Pratinjau PDF dari berkas yang dipilih, dibuka bila diminta. */
function LocalPreview({ file, label }: { file: File; label: string }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <details className="rounded-card border border-line bg-white p-3">
      <summary className="cursor-pointer text-sm font-medium text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
        Pratinjau {label}: {file.name} ({formatFileSize(file.size)})
      </summary>
      <object data={url} type="application/pdf" aria-label={`Pratinjau ${label}`} className="mt-2 h-96 w-full">
        <p className="text-sm text-ink-soft">Peramban Anda tidak dapat menampilkan pratinjau PDF.</p>
      </object>
    </details>
  );
}

export function SubmitPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const previousSubmissionId = params.get("ulang") || undefined;
  const roId = useId();
  const roError = useId();
  const ros = useRos();
  const create = useCreateSubmission();
  const [roCode, setRoCode] = useState("");
  const [tor, setTor] = useState<File | null>(null);
  const [rab, setRab] = useState<File | null>(null);
  const [problems, setProblems] = useState<string[]>([]);

  const activeRos = (ros.data ?? []).filter((r) => r.active);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const found: string[] = [];
    if (!roCode) found.push("Pilih Rincian Output (RO) terlebih dahulu.");
    if (!tor) found.push("Unggah berkas TOR dalam format PDF.");
    if (!rab) found.push("Unggah berkas RAB dalam format PDF.");
    setProblems(found);
    if (found.length > 0 || !tor || !rab) return;
    create.mutate(
      { roCode, tor, rab, previousSubmissionId },
      { onSuccess: (s) => navigate(`/satker/pengajuan/${s.id}`) },
    );
  }

  return (
    <section className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-brand-deep">Ajukan Baru</h1>
      <p className="text-ink-soft">
        Pilih RO, unggah TOR dan RAB, lalu tekan Kirim. Pemeriksaan berjalan sendiri setelah itu.
      </p>

      {previousSubmissionId && (
        <p className="rounded-card border border-line bg-white p-3 text-sm">
          Ini pengajuan ulang dari pengajuan yang ditolak. Keduanya akan tertaut.
        </p>
      )}
      {ros.isPending && <LoadingState label="Memuat daftar RO..." />}
      {ros.error && <ErrorState message={ros.error.message} onRetry={() => void ros.refetch()} />}

      {ros.data && (
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          {problems.length > 0 && (
            <div role="alert" className="rounded-card border border-bad bg-white p-4 text-sm">
              <p className="font-semibold">Mohon lengkapi dulu:</p>
              <ul className="list-disc pl-5">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label htmlFor={roId} className="mb-1 block text-sm font-medium text-brand-deep">
              Rincian Output (RO)
            </label>
            <select
              id={roId}
              value={roCode}
              onChange={(e) => setRoCode(e.target.value)}
              aria-describedby={roError}
              disabled={create.isPending}
              className="w-full rounded-control border border-line bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <option value="">Pilih RO</option>
              {activeRos.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.code} - {r.description}
                </option>
              ))}
            </select>
            <p id={roError} className="mt-1 text-sm text-ink-soft">
              Hanya RO yang aktif yang tampil.
            </p>
          </div>

          <UploadDropzone label="Berkas TOR (PDF)" file={tor} onChange={setTor} disabled={create.isPending} />
          <UploadDropzone label="Berkas RAB (PDF)" file={rab} onChange={setRab} disabled={create.isPending} />

          {(tor || rab) && (
            <div className="space-y-2">
              {tor && <LocalPreview file={tor} label="TOR" />}
              {rab && <LocalPreview file={rab} label="RAB" />}
            </div>
          )}

          {create.error && (
            <ErrorState title="Pengajuan belum terkirim" message={create.error.message} />
          )}

          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-control bg-brand-deep px-6 py-2 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60"
          >
            {create.isPending ? "Mengirim..." : "Kirim"}
          </button>
        </form>
      )}
    </section>
  );
}
