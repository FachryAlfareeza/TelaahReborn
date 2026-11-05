import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
      <ArrowLeft aria-hidden="true" size={14} />
      {label}
    </Link>
  );
}
