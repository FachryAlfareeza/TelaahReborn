import { useId, type ReactNode } from "react";

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

export function LabelOptions({ labels }: { labels: Record<string, string> }) {
  return Object.entries(labels).map(([value, text]) => (
    <option key={value} value={value}>
      {text}
    </option>
  ));
}

type FilterSelectProps<V extends string> = {
  label: string;
  value: V | "";
  onChange: (value: V | "") => void;
  allLabel: string;
  options: Record<V, string>;
};

/** Labelnya hanya untuk pembaca layar. */
export function FilterSelect<V extends string>({ label, value, onChange, allLabel, options }: FilterSelectProps<V>) {
  const id = useId();
  return (
    <span>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as V | "")} className="field w-auto py-1.5">
        <option value="">{allLabel}</option>
        <LabelOptions labels={options} />
      </select>
    </span>
  );
}
