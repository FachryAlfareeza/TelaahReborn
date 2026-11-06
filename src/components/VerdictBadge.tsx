import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { getVerdictView } from "../lib/verdict";
import type { ItemStatus } from "../types";
import { toneIcon } from "./tone";

const icons = { CircleCheck, CircleX, TriangleAlert };

/** Status hasil per item (Sesuai / Tidak Sesuai atau perlu revisi / Terjadi Kesalahan pada proses). */
export function VerdictBadge({ status }: { status: ItemStatus }) {
  const view = getVerdictView(status);
  const Icon = icons[view.icon];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
      <Icon aria-hidden="true" size={16} className={`shrink-0 ${toneIcon[view.tone]}`} />
      {view.label}
    </span>
  );
}
