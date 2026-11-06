import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

type Props = {
  open: boolean;
  title: string;
  /** Alamat berkas PDF atau berkas lokal. */
  file: string | File;
  /** Halaman yang dibuka pertama kali (mulai dari 1). */
  initialPage?: number;
  onClose: () => void;
};

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Pratinjau PDF dalam dialog. Membungkus react-pdf supaya mudah diganti.
 * Bisa dibuka langsung di halaman tertentu dan lompat ke halaman lain.
 */
export function PdfPreviewModal(props: Props) {
  if (!props.open) return null;
  // Dipasang ulang tiap dibuka atau berganti halaman awal, sehingga halaman awal selalu dipakai.
  return <PreviewDialog key={`${props.initialPage ?? 1}`} {...props} />;
}

function PreviewDialog({ title, file, initialPage = 1, onClose }: Props) {
  const titleId = useId();
  const pageInputId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [page, setPage] = useState(Math.max(1, initialPage));
  const [draft, setDraft] = useState(String(Math.max(1, initialPage)));
  const [loadError, setLoadError] = useState(false);
  const [outOfRange, setOutOfRange] = useState<number | null>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => previous?.focus();
  }, []);

  const max = pageCount ?? Number.POSITIVE_INFINITY;

  function goTo(n: number) {
    if (!Number.isFinite(n)) return;
    const next = Math.min(Math.max(1, Math.trunc(n)), max);
    setPage(next);
    setDraft(String(next));
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const items = ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!items || items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className="flex max-h-full w-full max-w-3xl flex-col rounded-card bg-white p-4"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 id={titleId} className="text-lg font-bold break-all text-brand-deep">
            {title}
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} className="btn btn-secondary">
            Tutup
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-secondary" disabled={page <= 1} onClick={() => goTo(page - 1)}>
            Sebelumnya
          </button>
          <button type="button" className="btn btn-secondary" disabled={page >= max} onClick={() => goTo(page + 1)}>
            Berikutnya
          </button>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              goTo(Number(draft));
            }}
          >
            <label htmlFor={pageInputId} className="text-sm">
              Lompat ke halaman
            </label>
            <input
              id={pageInputId}
              type="number"
              min={1}
              max={pageCount ?? undefined}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-20 rounded-control border border-line px-2 py-1"
            />
            <button type="submit" className="btn btn-secondary">
              Buka
            </button>
          </form>
          <p className="text-sm text-ink-soft" aria-live="polite">
            Halaman {page} dari {pageCount ?? "—"}
          </p>
          {outOfRange !== null && (
            <p role="status" className="w-full text-sm text-warn">
              Halaman {outOfRange} tidak ada pada berkas ini. Ditampilkan halaman terakhir.
            </p>
          )}
        </div>

        <div className="mt-3 min-h-40 overflow-auto rounded-control border border-line bg-sky-pale p-2">
          {loadError ? (
            <p role="alert" className="p-4 text-sm">
              Berkas PDF tidak dapat dibuka. Coba lagi nanti atau hubungi pengelola.
            </p>
          ) : (
            <Document
              file={file}
              loading={<p className="p-4 text-sm">Memuat berkas...</p>}
              error={<p className="p-4 text-sm">Berkas PDF tidak dapat dibuka.</p>}
              onLoadSuccess={({ numPages }) => {
                setPageCount(numPages);
                setLoadError(false);
                if (page > numPages) {
                  setOutOfRange(page);
                  goTo(numPages);
                }
              }}
              onLoadError={() => setLoadError(true)}
            >
              {/* Halaman baru diminta setelah jumlah halaman diketahui; nomor di luar batas memicu galat pdf.js. */}
              {pageCount !== null && (
                <Page
                  pageNumber={Math.min(page, pageCount)}
                  width={640}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              )}
            </Document>
          )}
        </div>
      </div>
    </div>
  );
}
