import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useCascade, useCreateReviewRequest, useFiscalYears } from "../../api/queries";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { UploadDropzone } from "../../components/UploadDropzone";
import { formatFileSize } from "../../lib/files";
import { CATEGORIES, categoryLabel } from "../../lib/verdict";
import type { Category, CodeLabel } from "../../types";
import { useAuth } from "../auth/authState";

function LocalPreview({ file, label }: { file: File; label: string }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <details className="py-1">
      <summary className="cursor-pointer text-sm font-medium">
        Pratinjau {label}: {file.name} ({formatFileSize(file.size)})
      </summary>
      <object data={url} type="application/pdf" aria-label={`Pratinjau ${label}`} className="mt-2 h-96 w-full">
        <p className="text-sm text-ink-soft">Website Anda tidak dapat menampilkan pratinjau PDF.</p>
      </object>
    </details>
  );
}

type SelectProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: CodeLabel[] | undefined;
  loading: boolean;
  disabled: boolean;
  placeholder: string;
};

function CodeSelect({ label, value, onChange, options, loading, disabled, placeholder }: SelectProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="field">
        <option value="">{loading ? "Memuat..." : placeholder}</option>
        {(options ?? []).map((o) => (
          <option key={o.code} value={o.code}>
            {o.code} - {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="field-label">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

/** Unit dan prioritas hanya ditampilkan; server menurunkannya dari baris Master RO. */
export function SubmitPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const years = useFiscalYears();
  const create = useCreateReviewRequest();
  const ids = { title: useId(), description: useId(), year: useId(), ro: useId() };

  const [year, setYear] = useState<number | null>(null);
  const [program, setProgram] = useState("");
  const [activity, setActivity] = useState("");
  const [kro, setKro] = useState("");
  const [rowId, setRowId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [tor, setTor] = useState<File | null>(null);
  const [rab, setRab] = useState<File | null>(null);
  const [problems, setProblems] = useState<string[]>([]);

  const cascade = useCascade({ fiscal_year: year ?? undefined, program_code: program, activity_code: activity, kro_code: kro });
  const row = cascade.ros.data?.find((r) => r.id === rowId) ?? null;
  const busy = create.isPending;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const found: string[] = [];
    if (!year) found.push("Pilih tahun anggaran.");
    if (!row) found.push("Pilih Program, Kegiatan, KRO, dan Rincian Output (RO).");
    if (!title.trim()) found.push("Isi judul atau nama usulan.");
    if (!description.trim()) found.push("Isi deskripsi usulan.");
    if (!category) found.push("Pilih kategori usulan.");
    if (!tor) found.push("Unggah berkas TOR dalam format PDF.");
    if (!rab) found.push("Unggah berkas RAB dalam format PDF.");
    setProblems(found);
    if (found.length > 0 || !year || !row || !category || !tor || !rab) return;
    create.mutate(
      {
        fiscal_year: year,
        master_ro_row_id: row.id,
        title: title.trim(),
        description: description.trim(),
        proposal_category: category,
        tor_file: tor,
        rab_file: rab,
      },
      { onSuccess: (r) => navigate(`/satker/pengajuan/${r.id}`) },
    );
  }

  return (
    <section className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Ajukan Baru</h1>
        <p className="mt-1 text-ink-soft">Isi formulir lalu tekan Kirim. Reviu berjalan otomatis setelah itu.</p>
      </div>

      {years.isPending && <LoadingState label="Memuat tahun anggaran..." />}
      {years.error && <ErrorState message={years.error.message} onRetry={() => void years.refetch()} />}
      {years.data && years.data.length === 0 && (
        <ErrorState title="Belum bisa mengajukan" message="Belum ada data Master RO aktif. Hubungi ROCAN." />
      )}

      {years.data && years.data.length > 0 && (
        <form onSubmit={onSubmit} noValidate className="space-y-8">
          {problems.length > 0 && (
            <div role="alert" className="border-l-2 border-bad py-1 pl-4 text-sm">
              <p className="font-semibold">Mohon lengkapi dulu:</p>
              <ul className="list-disc pl-5">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          <fieldset className="space-y-4" disabled={busy}>
            <legend className="section-title mb-2">A. Hierarki anggaran</legend>
            <div>
              <label htmlFor={ids.year} className="field-label">
                Tahun anggaran
              </label>
              <select
                id={ids.year}
                value={year ?? ""}
                onChange={(e) => {
                  setYear(e.target.value ? Number(e.target.value) : null);
                  setProgram("");
                  setActivity("");
                  setKro("");
                  setRowId("");
                }}
                className="field"
              >
                <option value="">Pilih tahun</option>
                {years.data.map((y) => (
                  <option key={y.fiscal_year} value={y.fiscal_year}>
                    {y.fiscal_year}
                  </option>
                ))}
              </select>
            </div>
            <CodeSelect
              label="Program"
              value={program}
              onChange={(v) => {
                setProgram(v);
                setActivity("");
                setKro("");
                setRowId("");
              }}
              options={cascade.programs.data}
              loading={cascade.programs.isFetching}
              disabled={!year}
              placeholder="Pilih program"
            />
            <CodeSelect
              label="Kegiatan"
              value={activity}
              onChange={(v) => {
                setActivity(v);
                setKro("");
                setRowId("");
              }}
              options={cascade.activities.data}
              loading={cascade.activities.isFetching}
              disabled={!program}
              placeholder="Pilih kegiatan"
            />
            <CodeSelect
              label="Klasifikasi Rincian Output (KRO)"
              value={kro}
              onChange={(v) => {
                setKro(v);
                setRowId("");
              }}
              options={cascade.kros.data}
              loading={cascade.kros.isFetching}
              disabled={!activity}
              placeholder="Pilih KRO"
            />
            <div>
              <label htmlFor={ids.ro} className="field-label">
                Rincian Output (RO)
              </label>
              <select id={ids.ro} value={rowId} onChange={(e) => setRowId(e.target.value)} disabled={!kro} className="field">
                <option value="">{cascade.ros.isFetching ? "Memuat..." : "Pilih RO"}</option>
                {(cascade.ros.data ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.ro.code} - {r.ro.name}
                  </option>
                ))}
              </select>
            </div>
            {cascade.programs.data?.length === 0 && (
              <p className="text-sm text-ink-soft">Belum ada RO untuk unit Anda pada tahun ini.</p>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <ReadOnly label="Unit Eselon I" value={user?.unit_eselon1?.name ?? "—"} />
              <ReadOnly label="Unit Eselon II" value={user?.unit_eselon2?.name ?? "—"} />
              <ReadOnly label="Prioritas" value={row?.priority ?? "—"} />
            </div>
            <p className="text-xs text-ink-soft">Unit diambil dari akun Anda. Prioritas mengikuti RO yang dipilih.</p>
          </fieldset>

          <fieldset className="space-y-4" disabled={busy}>
            <legend className="section-title mb-2">B. Klasifikasi dan uraian</legend>
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
                rows={4}
                className="field"
              />
            </div>
            <fieldset>
              <legend className="field-label">Kategori usulan</legend>
              <div className="space-y-1.5">
                {CATEGORIES.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="kategori"
                      value={c}
                      checked={category === c}
                      onChange={() => setCategory(c)}
                    />
                    {categoryLabel[c]}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-ink-soft">Kategori ini adalah klaim Anda dan akan diverifikasi saat reviu.</p>
            </fieldset>
          </fieldset>

          <fieldset className="space-y-4" disabled={busy}>
            <legend className="section-title mb-2">C. Berkas</legend>
            <UploadDropzone label="Berkas TOR (PDF)" file={tor} onChange={setTor} disabled={busy} />
            <UploadDropzone label="Berkas RAB (PDF)" file={rab} onChange={setRab} disabled={busy} />
            {(tor || rab) && (
              <div className="space-y-2">
                {tor && <LocalPreview file={tor} label="TOR" />}
                {rab && <LocalPreview file={rab} label="RAB" />}
              </div>
            )}
          </fieldset>

          {create.error && <ErrorState title="Pengajuan belum terkirim" message={create.error.message} />}

          <button type="submit" disabled={busy} className="btn btn-primary">
            {busy ? "Mengirim..." : "Kirim"}
          </button>
        </form>
      )}
    </section>
  );
}
