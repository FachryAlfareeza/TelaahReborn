import { CircleCheck, CircleX, ClipboardCheck, Loader, TriangleAlert } from "lucide-react";
import { getStatusView, type StatusTone } from "../lib/status";
import type { Role, SubmissionStatus } from "../types";

const icons = { Loader, ClipboardCheck, CircleCheck, CircleX, TriangleAlert };

const toneClass: Record<StatusTone, string> = {
  info: "border-brand text-brand-deep bg-sky-pale",
  warning: "border-warn text-ink bg-white",
  success: "border-ok text-ink bg-white",
  error: "border-bad text-ink bg-white",
};

/** Status dengan teks + ikon + warna. Label mengikuti peran. */
export function StatusBadge({ status, role }: { status: SubmissionStatus; role: Role }) {
  const view = getStatusView(status, role);
  const Icon = icons[view.icon];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-control border px-2 py-1 text-sm font-medium ${toneClass[view.tone]}`}
    >
      <Icon aria-hidden="true" size={16} />
      {view.label}
    </span>
  );
}
