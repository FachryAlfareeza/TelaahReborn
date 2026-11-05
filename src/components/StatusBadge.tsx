import { CircleCheck, CircleX, ClipboardCheck, Loader, TriangleAlert } from "lucide-react";
import { getStatusView } from "../lib/status";
import type { Role, SubmissionStatus } from "../types";
import { toneIcon } from "./tone";

const icons = { Loader, ClipboardCheck, CircleCheck, CircleX, TriangleAlert };

/** Status dengan teks + ikon berwarna. Label mengikuti peran. */
export function StatusBadge({ status, role }: { status: SubmissionStatus; role: Role }) {
  const view = getStatusView(status, role);
  const Icon = icons[view.icon];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap text-ink">
      <Icon aria-hidden="true" size={16} className={toneIcon[view.tone]} />
      {view.label}
    </span>
  );
}
