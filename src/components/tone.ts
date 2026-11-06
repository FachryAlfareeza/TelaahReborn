import type { StatusTone } from "../lib/status";

/** Nada status; `neutral` untuk keadaan tanpa makna baik/buruk. */
export type Tone = StatusTone | "neutral";

export const toneIcon: Record<StatusTone, string> = {
  info: "text-brand",
  warning: "text-warn",
  success: "text-ok",
  error: "text-bad",
};

export const toneDot: Record<Tone, string> = {
  neutral: "bg-ink-soft",
  info: "bg-brand",
  success: "bg-ok",
  warning: "bg-warn",
  error: "bg-bad",
};
