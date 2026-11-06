import { lazy, Suspense } from "react";
import { LoadingState } from "./LoadingState";

// Pustaka PDF besar, jadi baru dimuat saat pratinjau dibuka.
const PdfPreviewModal = lazy(() => import("./PdfPreviewModal").then((m) => ({ default: m.PdfPreviewModal })));

type Props = { title: string; file: File; initialPage?: number; onClose: () => void };

export function PdfPreview(props: Props) {
  return (
    <Suspense fallback={<LoadingState label="Memuat pratinjau..." />}>
      <PdfPreviewModal open {...props} />
    </Suspense>
  );
}
