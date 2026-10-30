import { TriangleAlert } from "lucide-react";

type Props = {
  title?: string;
  /** Jelaskan apa yang terjadi dan apa yang bisa dilakukan. */
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ title = "Terjadi masalah", message, onRetry }: Props) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 rounded-card border border-bad bg-white p-6">
      <p className="flex items-center gap-2 text-base font-semibold text-ink">
        <TriangleAlert aria-hidden="true" size={20} className="text-bad" />
        {title}
      </p>
      <p className="text-sm text-ink-soft">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-control bg-brand-deep px-4 py-2 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}
