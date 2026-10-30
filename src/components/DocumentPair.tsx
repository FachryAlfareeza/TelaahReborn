import { lazy, Suspense, useState } from "react";
import { displayValue } from "../lib/empty";
import { formatFileSize } from "../features/satker/format";
import type { Submission } from "../types";
import { LoadingState } from "./LoadingState";

// Pustaka PDF besar, jadi baru dimuat saat pratinjau dibuka.
const PdfPreviewModal = lazy(() =>
  import("./PdfPreviewModal").then((m) => ({ default: m.PdfPreviewModal })),
);

type Doc = Submission["documents"][number];

/** TOR dan RAB berdampingan: nama berkas, ukuran, dan tombol pratinjau. */
export function DocumentPair({ documents }: { documents: Doc[] }) {
  const [open, setOpen] = useState<Doc | null>(null);
  const slots = (["TOR", "RAB"] as const).map((type) => ({
    type,
    doc: documents.find((d) => d.type === type) ?? null,
  }));

  return (
    <div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {slots.map(({ type, doc }) => (
          <li key={type} className="rounded-card border border-line bg-white p-4">
            <p className="text-sm text-ink-soft">{type}</p>
            <p className="font-medium break-all">{displayValue(doc?.fileName)}</p>
            <p className="text-sm text-ink-soft">
              {doc ? formatFileSize(doc.sizeBytes) : "—"} · {displayValue(doc?.pageCount)} halaman
            </p>
            {doc?.previewUrl ? (
              <button
                type="button"
                onClick={() => setOpen(doc)}
                className="mt-2 rounded-control border border-line px-3 py-2 text-sm text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Lihat pratinjau {type}
              </button>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">Pratinjau belum tersedia.</p>
            )}
          </li>
        ))}
      </ul>
      {open?.previewUrl && (
        <Suspense fallback={<LoadingState label="Memuat pratinjau..." />}>
          <PdfPreviewModal
            open
            title={`${open.type}: ${open.fileName}`}
            file={open.previewUrl}
            onClose={() => setOpen(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
