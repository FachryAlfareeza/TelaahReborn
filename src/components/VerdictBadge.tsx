import { CircleCheck, CircleHelp, CircleX, Loader, TriangleAlert } from "lucide-react";
import { getVerdictView, type VerdictKind, type VerdictTone } from "../lib/verdict";

const icons = { CircleCheck, CircleX, CircleHelp, TriangleAlert, Loader };

const toneClass: Record<VerdictTone, string> = {
  success: "border-ok text-ink",
  warning: "border-warn text-ink",
  error: "border-bad text-ink",
  info: "border-brand text-brand-deep",
};

/** Status butir hasil AI: teks + ikon + warna, tidak hanya warna. */
export function VerdictBadge({ kind }: { kind: VerdictKind }) {
  const view = getVerdictView(kind);
  const Icon = icons[view.icon];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-control border bg-white px-2 py-1 text-sm font-medium ${toneClass[view.tone]}`}
    >
      <Icon aria-hidden="true" size={16} />
      {view.label}
    </span>
  );
}
