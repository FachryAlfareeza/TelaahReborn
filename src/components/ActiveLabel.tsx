import { CircleCheck, CircleMinus } from "lucide-react";

/** Status aktif dengan ikon dan teks, tidak hanya warna. */
export function ActiveLabel({ active }: { active: boolean }) {
  const Icon = active ? CircleCheck : CircleMinus;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon aria-hidden="true" size={16} className={active ? "text-ok" : "text-ink-soft"} />
      {active ? "Aktif" : "Nonaktif"}
    </span>
  );
}
