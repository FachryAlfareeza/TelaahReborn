import { lazy, Suspense, useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { useAuth } from "../features/auth/authState";
import { formatFileSize, saveBlob } from "../lib/files";
import type { DocumentKind, ReviewRequest } from "../types";
import { LoadingState } from "./LoadingState";

// Pustaka PDF besar, jadi baru dimuat saat pratinjau dibuka.
const PdfPreviewModal = lazy(() => import("./PdfPreviewModal").then((m) => ({ default: m.PdfPreviewModal })));

export type OpenDocument = { kind: DocumentKind; page?: number };

type Props = {
  request: ReviewRequest;
  /** Dokumen yang sedang dibuka (dikendalikan dari luar agar bukti bisa membuka halaman tertentu). */
  open: OpenDocument | null;
  onOpenChange: (open: OpenDocument | null) => void;
};

const label: Record<DocumentKind, string> = { tor: "TOR", rab: "RAB" };

/**
 * TOR dan RAB berdampingan. Berkas diambil lewat endpoint unduh yang memeriksa hak akses
 * (kontrak §1: path storage tidak pernah dikirim ke client).
 */
export function DocumentPair({ request, open, onOpenChange }: Props) {
  const { client } = useAuth();
  const [files, setFiles] = useState<Partial<Record<DocumentKind, File>>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<DocumentKind | null>(null);

  async function load(kind: DocumentKind): Promise<File | null> {
    const cached = files[kind];
    if (cached) return cached;
    setBusy(kind);
    setError(null);
    try {
      const blob = await client.getDocument(request.id, kind);
      const file = new File([blob], request.documents[kind].filename, { type: "application/pdf" });
      setFiles((f) => ({ ...f, [kind]: file }));
      return file;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Berkas tidak dapat diambil.");
      return null;
    } finally {
      setBusy(null);
    }
  }

  // Dokumen bisa dibuka dari luar (mis. tombol bukti); ambil berkasnya bila belum ada.
  useEffect(() => {
    if (!open || files[open.kind]) return;
    let cancelled = false;
    client
      .getDocument(request.id, open.kind)
      .then((blob) => {
        if (cancelled) return;
        const file = new File([blob], request.documents[open.kind].filename, { type: "application/pdf" });
        setFiles((f) => ({ ...f, [open.kind]: file }));
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Berkas tidak dapat diambil.");
      });
    return () => {
      cancelled = true;
    };
  }, [open, files, client, request]);

  async function download(kind: DocumentKind) {
    const file = await load(kind);
    if (file) saveBlob(file, file.name);
  }

  const openFile = open ? files[open.kind] : undefined;

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
                    onClick={() => {
                      setError(null);
                      onOpenChange({ kind });
                    }}
                    disabled={busy !== null}
                    aria-label={`Lihat pratinjau ${label[kind]}`}
                    className="link"
                  >
                    {open?.kind === kind && !openFile ? "Memuat..." : "Pratinjau"}
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
      {open && openFile && (
        <Suspense fallback={<LoadingState label="Memuat pratinjau..." />}>
          <PdfPreviewModal
            open
            title={`${label[open.kind]}: ${openFile.name}`}
            file={openFile}
            initialPage={open.page}
            onClose={() => onOpenChange(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
