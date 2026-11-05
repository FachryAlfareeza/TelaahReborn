import { TriangleAlert } from "lucide-react";

type Props = {
  title?: string;
  /** Jelaskan apa yang terjadi dan apa yang bisa dilakukan. */
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ title = "Terjadi masalah", message, onRetry }: Props) {
  return (
    <div role="alert" className="space-y-2 border-l-2 border-bad py-1 pl-4">
      <p className="flex items-center gap-2 font-medium text-ink">
        <TriangleAlert aria-hidden="true" size={16} className="text-bad" />
        {title}
      </p>
      <p className="text-sm text-ink-soft">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-secondary btn-sm">
          Coba lagi
        </button>
      )}
    </div>
  );
}
