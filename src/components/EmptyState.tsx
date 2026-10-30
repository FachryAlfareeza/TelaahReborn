import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-line bg-white p-8 text-center">
      <Inbox aria-hidden="true" size={32} className="text-ink-soft" />
      <p className="text-base font-semibold text-brand-deep">{title}</p>
      {description && <p className="text-sm text-ink-soft">{description}</p>}
      {action}
    </div>
  );
}
