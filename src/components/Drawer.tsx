import { useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "./useFocusTrap";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  width?: "md" | "lg" | "xl";
};

const widths = { md: "sm:max-w-md", lg: "sm:max-w-xl", xl: "sm:max-w-3xl" };

export function Drawer({ open, title, description, onClose, children, width = "lg" }: Props) {
  const titleId = useId();
  const { ref, onKeyDown } = useFocusTrap<HTMLDivElement>(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/30" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        tabIndex={-1}
        className={`flex h-full w-full flex-col bg-white shadow-xl ${widths[width]}`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 id={titleId} className="section-title">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-ink-soft">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm" aria-label="Tutup">
            <X aria-hidden size={16} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
