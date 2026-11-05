import type { ReactNode } from "react";

export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="py-6 text-sm text-ink-soft">
      <p>{title}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
