import { CircleCheck, ClipboardCheck, Clock, Loader, RotateCcw, TriangleAlert } from "lucide-react";
import { getStatusView } from "../lib/status";
import type { ReviewRequestStatus, Role } from "../types";
import { toneIcon } from "./tone";

const icons = { Clock, Loader, ClipboardCheck, CircleCheck, RotateCcw, TriangleAlert };

/** Status pengajuan dengan teks + ikon berwarna. Label mengikuti peran. */
export function StatusBadge({ status, role }: { status: ReviewRequestStatus; role: Role }) {
  const view = getStatusView(status, role);
  const Icon = icons[view.icon];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap text-ink">
      <Icon aria-hidden="true" size={16} className={toneIcon[view.tone]} />
      {view.label}
    </span>
  );
}
