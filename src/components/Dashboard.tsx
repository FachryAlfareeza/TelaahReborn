import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { toneDot, type Tone } from "./tone";

type PageProps = {
  title: string;
  subtitle?: ReactNode;
  before?: ReactNode;
  actions?: ReactNode;
  stats?: ReactNode;
  children: ReactNode;
};

/** Di layar besar halaman tidak menggulir; panel di dalamnya yang menggulir. */
export function DashboardPage({ title, subtitle, before, actions, stats, children }: PageProps) {
  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          {before}
          <h1 className="page-title">{title}</h1>
          {subtitle && <div className="text-sm text-ink-soft">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      {stats && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(130px,1fr))]">{stats}</div>}
      <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1">{children}</div>
    </div>
  );
}

type StatProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  onClick?: () => void;
  active?: boolean;
};

export function StatCard({ label, value, hint, onClick, active = false }: StatProps) {
  const body = (
    <>
      <span className="block text-xs font-medium text-ink-soft">{label}</span>
      <span className="mt-0.5 block truncate text-xl font-semibold text-ink tabular-nums">{value}</span>
      {hint && <span className="block truncate text-xs text-ink-soft">{hint}</span>}
    </>
  );
  const base = "stat-card text-left";
  if (!onClick) return <div className={base}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${base} cursor-pointer hover:border-line-strong ${active ? "border-brand bg-sky-pale" : ""}`}
    >
      {body}
    </button>
  );
}

type PanelProps = {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Isi berupa DataTable `fill`: tabel itu sendiri yang menggulir, bukan panel. */
  table?: boolean;
  flush?: boolean;
};

export function Panel({ title, actions, children, className = "", table = false, flush = false }: PanelProps) {
  return (
    <section className={`panel flex min-h-0 flex-col ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          {typeof title === "string" ? <h2 className="section-title">{title}</h2> : title}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={`min-h-0 flex-1 ${table ? "p-3 lg:flex lg:flex-col" : `lg:overflow-auto ${flush ? "" : "p-4"}`}`}>{children}</div>
    </section>
  );
}

export function SplitPane({ children, side = "420px" }: { children: ReactNode; side?: string }) {
  return (
    <div
      className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_var(--side)]"
      style={{ ["--side" as string]: side }}
    >
      {children}
    </div>
  );
}

export type TabDef<Id extends string> = { id: Id; label: ReactNode; badge?: ReactNode };

type TabsProps<Id extends string> = {
  tabs: TabDef<Id>[];
  value: Id;
  onChange: (id: Id) => void;
  label: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function Tabs<Id extends string>({ tabs, value, onChange, label, children, actions }: TabsProps<Id>) {
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  }
  return (
    <section className="panel flex min-h-0 flex-col lg:flex-1">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-2">
        <div role="tablist" aria-label={label} className="flex flex-wrap">
          {tabs.map((t, i) => {
            const selected = t.id === value;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`${base}-tab-${t.id}`}
                aria-selected={selected}
                aria-controls={`${base}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => onChange(t.id)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium ${
                  selected ? "border-brand text-brand-deep" : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                {t.label}
                {t.badge !== undefined && <span className="text-xs text-ink-soft tabular-nums">{t.badge}</span>}
              </button>
            );
          })}
        </div>
        {actions && <div className="flex items-center gap-2 py-1.5 pr-2">{actions}</div>}
      </div>
      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${value}`} className="min-h-0 flex-1 overflow-x-auto lg:overflow-auto">
        {children}
      </div>
    </section>
  );
}

export function Pill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap text-ink">
      <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${toneDot[tone]}`} />
      {children}
    </span>
  );
}
