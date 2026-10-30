/** Indikator lembut, bukan spinner penuh layar. */
export function LoadingState({ label = "Memuat data..." }: { label?: string }) {
  return (
    <div role="status" className="rounded-card border border-line bg-white p-6 text-sm text-ink-soft">
      <p>{label}</p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-control bg-sky-soft" aria-hidden="true">
        <div className="h-2 w-1/3 animate-pulse rounded-control bg-brand" />
      </div>
    </div>
  );
}
