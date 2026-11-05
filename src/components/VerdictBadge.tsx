import { CircleCheck, CircleHelp, CircleX, Loader, TriangleAlert } from "lucide-react";
import { getVerdictView, type VerdictKind } from "../lib/verdict";
import { toneIcon } from "./tone";

const icons = { CircleCheck, CircleX, CircleHelp, TriangleAlert, Loader };

/** Status butir hasil AI: teks + ikon berwarna. */
export function VerdictBadge({ kind }: { kind: VerdictKind }) {
  const view = getVerdictView(kind);
  const Icon = icons[view.icon];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap text-ink">
      <Icon aria-hidden="true" size={16} className={toneIcon[view.tone]} />
      {view.label}
    </span>
  );
}
