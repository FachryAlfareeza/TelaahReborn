import { lazy, Suspense, useState } from "react";
import { FileText } from "lucide-react";
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
      <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {slots.map(({ type, doc }) => (
          <li key={type} className="flex gap-3">
            <FileText aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-ink-soft" />
            <div className="min-w-0">
              <p className="term">{type}</p>
              <p className="font-medium break-all">{displayValue(doc?.fileName)}</p>
              <p className="text-sm text-ink-soft">
                {doc ? formatFileSize(doc.sizeBytes) : "—"} · {displayValue(doc?.pageCount)} halaman
                {doc?.previewUrl ? (
                  <>
                    {" · "}
                    <button type="button" onClick={() => setOpen(doc)} aria-label={`Lihat pratinjau ${type}`} className="link">
                      Pratinjau
                    </button>
                  </>
                ) : (
                  <>
                    {" · "}
                    <span>Pratinjau belum tersedia.</span>
                  </>
                )}
              </p>
            </div>
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
