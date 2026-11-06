import { useId, useRef, useState, type DragEvent } from "react";
import { FileText, Upload } from "lucide-react";
import { MAX_FILE_MB, validatePdf } from "../lib/files";

type Props = {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  maxSizeMb?: number;
  disabled?: boolean;
  /** Pemeriksa berkas; bawaan: PDF sesuai PRD §7.3. Kembalikan pesan galat atau null. */
  validate?: (file: File) => Promise<string | null>;
  accept?: string;
  hint?: string;
};

export function UploadDropzone({
  label,
  file,
  onChange,
  maxSizeMb = MAX_FILE_MB,
  disabled = false,
  validate = (f) => validatePdf(f, maxSizeMb),
  accept = "application/pdf,.pdf",
  hint = `PDF, maks. ${maxSizeMb} MB. Bisa diseret ke sini.`,
}: Props) {
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function accept_(next: File | undefined) {
    if (!next) return;
    const problem = await validate(next);
    setError(problem);
    onChange(problem ? null : next);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (!disabled) void accept_(e.dataTransfer.files[0]);
  }

  return (
    <div>
      <label htmlFor={inputId} className="field-label">
        {label}
      </label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-wrap items-center gap-3 rounded-control border border-dashed px-4 py-3 ${
          dragging ? "border-brand bg-sky-pale" : "border-line-strong bg-white"
        }`}
      >
        <Upload aria-hidden="true" size={18} className="text-ink-soft" />
        <p className="text-sm text-ink-soft">{hint}</p>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => {
            const picked = e.target.files?.[0];
            e.target.value = "";
            void accept_(picked);
          }}
          className="text-sm"
        />
        {file && (
          <p className="flex items-center gap-1 text-sm font-medium">
            <FileText aria-hidden="true" size={16} />
            {file.name}
            <button
              type="button"
              onClick={() => {
                setError(null);
                onChange(null);
              }}
              className="ml-2 link"
            >
              Hapus
            </button>
          </p>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1 error-text">
          {error}
        </p>
      )}
    </div>
  );
}
