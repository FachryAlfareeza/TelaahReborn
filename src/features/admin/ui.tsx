import type { ReactNode } from "react";
import { CircleCheck, CircleMinus } from "lucide-react";

export const inputClass =
  "w-full rounded-control border border-line bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
export const smallButton =
  "rounded-control border border-line px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50";
export const primaryButton =
  "rounded-control bg-brand-deep px-4 py-2 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50";

/** Status aktif dengan ikon dan teks, tidak hanya warna. */
export function ActiveLabel({ active }: { active: boolean }) {
  const Icon = active ? CircleCheck : CircleMinus;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon aria-hidden="true" size={16} className={active ? "text-ok" : "text-ink-soft"} />
      {active ? "Aktif" : "Nonaktif"}
    </span>
  );
}

export function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-brand-deep">
        {label}
      </label>
      {children}
    </div>
  );
}

/** Pesan hasil (status) dan galat, dibacakan pembaca layar. */
export function Feedback({ notice, error }: { notice: string | null; error: string | null }) {
  return (
    <>
      <div role="status" aria-live="polite">
        {notice && <p className="text-sm font-medium text-brand-deep">{notice}</p>}
      </div>
      {error && (
        <p role="alert" className="text-sm text-ink">
          <span className="font-semibold text-bad-text">Galat: </span>
          {error}
        </p>
      )}
    </>
  );
}

export const errorText = (e: unknown) => (e instanceof Error ? e.message : "Terjadi masalah. Coba lagi.");
