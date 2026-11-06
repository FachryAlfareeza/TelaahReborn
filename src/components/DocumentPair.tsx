import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { useFileFetcher } from "../api/queries";
import { formatFileSize, saveBlob, toPdfFile } from "../lib/files";
import type { DocumentKind, ReviewRequest } from "../types";
import { errorText } from "./form";
import { LoadingState } from "./LoadingState";
import { PdfPreview } from "./PdfPreview";

export type OpenDocument = { kind: DocumentKind; page?: number };

const label: Record<DocumentKind, string> = { tor: "TOR", rab: "RAB" };

type PreviewProps = {
  request: ReviewRequest;
  open: OpenDocument | null;
  onClose: () => void;
};

/** Terpisah dari daftar berkas agar tombol bukti bisa membukanya dari tab mana pun. */
export function DocumentPreview({ request, open, onClose }: PreviewProps) {
  const fetchFile = useFileFetcher();
  // Hasil terakhir per jenis dokumen; hasil untuk dokumen lain diabaikan sampai unduhan baru selesai.
  const [loaded, setLoaded] = useState<{ kind: DocumentKind; file?: File; error?: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const { kind } = open;
    fetchFile
      .document(request.id, kind)
      .then((blob) => !cancelled && setLoaded({ kind, file: toPdfFile(blob, request.documents[kind].filename) }))
      .catch((e: unknown) => !cancelled && setLoaded({ kind, error: errorText(e) }));
    return () => {
      cancelled = true;
    };
  }, [open, request, fetchFile]);

  if (!open) return null;
  if (loaded?.kind !== open.kind) return <LoadingState label="Memuat berkas..." />;
  if (!loaded.file) {
    return (
      <p role="alert" className="error-text">
        {loaded.error}
      </p>
    );
  }
  return <PdfPreview title={`${label[open.kind]}: ${loaded.file.name}`} file={loaded.file} initialPage={open.page} onClose={onClose} />;
}

type Props = {
  request: ReviewRequest;
  open: OpenDocument | null;
  onOpenChange: (open: OpenDocument | null) => void;
  /** Matikan bila halaman merender DocumentPreview sendiri. */
  withPreview?: boolean;
};

/** Berkas lewat endpoint unduh berhak akses; path storage tidak pernah dikirim (kontrak §1). */
export function DocumentPair({ request, open, onOpenChange, withPreview = true }: Props) {
  const fetchFile = useFileFetcher();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<DocumentKind | null>(null);

  async function download(kind: DocumentKind) {
    setBusy(kind);
    setError(null);
    try {
      saveBlob(await fetchFile.document(request.id, kind), request.documents[kind].filename);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {(["tor", "rab"] as const).map((kind) => {
          const doc = request.documents[kind];
          return (
            <li key={kind} className="flex gap-3">
              <FileText aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-ink-soft" />
              <div className="min-w-0">
                <p className="term">{label[kind]}</p>
                <p className="font-medium break-all">{doc.filename}</p>
                <p className="flex flex-wrap gap-x-2 text-sm text-ink-soft">
                  <span>{formatFileSize(doc.size_bytes)}</span>
                  <button
                    type="button"
                    onClick={() => onOpenChange({ kind })}
                    disabled={busy !== null}
                    aria-label={`Lihat pratinjau ${label[kind]}`}
                    className="link"
                  >
                    Pratinjau
                  </button>
                  <button
                    type="button"
                    onClick={() => void download(kind)}
                    disabled={busy !== null}
                    aria-label={`Unduh ${label[kind]}`}
                    className="link"
                  >
                    Unduh
                  </button>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="mt-2 error-text">
          {error}
        </p>
      )}
      {withPreview && <DocumentPreview request={request} open={open} onClose={() => onOpenChange(null)} />}
    </div>
  );
}
