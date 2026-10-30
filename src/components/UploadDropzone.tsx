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
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-brand-deep">
        {label}
      </label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center gap-2 rounded-card border-2 border-dashed p-6 text-center ${
          dragging ? "border-brand bg-sky-soft" : "border-line bg-white"
        }`}
      >
        <Upload aria-hidden="true" size={24} className="text-brand-deep" />
        <p className="text-sm text-ink-soft">Seret berkas PDF ke sini, atau pilih dari perangkat. Maksimal {maxSizeMb} MB.</p>
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
          className="text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
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
              className="ml-2 rounded-control text-brand-deep underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Hapus
            </button>
          </p>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-ink">
          <span className="font-semibold text-bad-text">Galat: </span>
          {error}
        </p>
      )}
    </div>
  );
}
