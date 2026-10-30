import { Sparkles } from "lucide-react";

/** Penanda bahwa hasil berasal dari AI dan masih kandidat, bukan keputusan ROCAN. */
export function AiCandidateTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-control border border-brand bg-sky-soft px-2 py-1 text-xs font-medium text-brand-deep">
      <Sparkles aria-hidden="true" size={14} />
      Hasil AI (kandidat)
    </span>
  );
}
