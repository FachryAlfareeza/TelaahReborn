import type { ReactNode } from "react";

export { ActiveLabel } from "./ActiveLabel";

export function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
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
        {notice && <p className="text-sm text-ok">{notice}</p>}
      </div>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
    </>
  );
}

export const errorText = (e: unknown) => (e instanceof Error ? e.message : "Terjadi masalah. Coba lagi.");
