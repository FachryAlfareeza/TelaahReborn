export function LoadingState({ label = "Memuat..." }: { label?: string }) {
  return (
    <div role="status" className="max-w-sm py-4 text-sm text-ink-soft">
      <p>{label}</p>
      <div className="progress-line mt-2" aria-hidden="true" />
    </div>
  );
}
