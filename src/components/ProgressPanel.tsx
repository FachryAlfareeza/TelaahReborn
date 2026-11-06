import { CircleCheck, CircleDashed, CircleMinus, CircleX, Loader } from "lucide-react";
import { formatDate } from "../lib/date";
import { stageLabel, stageStatusLabel } from "../lib/verdict";
import type { Progress, Stage } from "../types";

const icon: Record<Stage["status"], { Icon: typeof Loader; className: string }> = {
  menunggu: { Icon: CircleDashed, className: "text-ink-soft" },
  berjalan: { Icon: Loader, className: "text-brand" },
  selesai: { Icon: CircleCheck, className: "text-ok" },
  gagal: { Icon: CircleX, className: "text-bad" },
  dilewati: { Icon: CircleMinus, className: "text-ink-soft" },
};

function duration(stage: Stage, now: number): string | null {
  if (!stage.started_at) return null;
  const end = stage.finished_at ? Date.parse(stage.finished_at) : now;
  const seconds = Math.max(0, Math.round((end - Date.parse(stage.started_at)) / 1000));
  return seconds < 60 ? `${seconds} detik` : `${Math.floor(seconds / 60)} menit ${seconds % 60} detik`;
}

/** Tanpa persentase atau perkiraan waktu (PRD FR-PIPE-05). */
export function ProgressPanel({ progress, showMessages = true }: { progress: Progress; showMessages?: boolean }) {
  // Durasi tahap yang masih berjalan dihitung sampai waktu pembaruan terakhir dari server.
  const now = Date.parse(progress.updated_at);
  if (!progress.run_id) {
    return <p className="text-sm text-ink-soft">Review belum dimulai.</p>;
  }
  return (
    <div className="space-y-2">
      <p className="text-sm text-ink-soft">Dimulai {formatDate(progress.started_at)}. Diperbarui otomatis.</p>
      <ol aria-label="Tahap review" className="space-y-1.5">
        {progress.stages.map((stage) => {
          const { Icon, className } = icon[stage.status];
          const time = duration(stage, now);
          return (
            <li key={stage.stage} className="flex flex-wrap items-center gap-x-2 text-sm">
              <Icon aria-hidden="true" size={16} className={className} />
              <span className={stage.status === "berjalan" ? "font-medium" : ""}>{stageLabel[stage.stage]}</span>
              <span className="text-ink-soft">
                {stageStatusLabel[stage.status]}
                {time ? `, ${time}` : ""}
              </span>
              {showMessages && stage.message && <span className="w-full pl-6 text-ink-soft">{stage.message}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
