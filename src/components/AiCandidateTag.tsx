/** Penanda bahwa hasil berasal dari AI dan masih kandidat, bukan keputusan ROCAN. */
export function AiCandidateTag() {
  return (
    <span className="rounded-sm border border-line-strong px-1.5 py-0.5 text-xs font-medium text-ink-soft">
      Hasil AI (kandidat)
    </span>
  );
}
