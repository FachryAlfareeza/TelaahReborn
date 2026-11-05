import { useId, useRef, useState, type DragEvent } from "react";
import { FileText, Upload } from "lucide-react";

type Props = {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  maxSizeMb?: number;
  disabled?: boolean;
};

/** Mengembalikan pesan galat, atau null bila berkas boleh dipakai. */
export function validatePdf(file: File, maxSizeMb: number): string | null {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "Berkas harus berformat PDF.";
  if (file.size > maxSizeMb * 1024 * 1024) return `Ukuran berkas melebihi ${maxSizeMb} MB.`;
  if (file.size === 0) return "Berkas kosong. Pilih berkas lain.";
  return null;
}

/** Unggah satu PDF lewat klik atau seret. Memeriksa tipe dan ukuran. */
export function UploadDropzone({ label, file, onChange, maxSizeMb = 20, disabled = false }: Props) {
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function accept(next: File | undefined) {
    if (!next) return;
    const problem = validatePdf(next, maxSizeMb);
    setError(problem);
    onChange(problem ? null : next);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (!disabled) accept(e.dataTransfer.files[0]);
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
        <p className="text-sm text-ink-soft">PDF, maks. {maxSizeMb} MB. Bisa diseret ke sini.</p>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="application/pdf,.pdf"
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => {
            accept(e.target.files?.[0]);
            e.target.value = "";
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
