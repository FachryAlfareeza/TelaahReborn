import { useEffect, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentPair } from "../../components/DocumentPair";
import { PdfPreviewModal } from "../../components/PdfPreviewModal";
import { ProgramContextPanel } from "../../components/ProgramContextPanel";
import type { Submission } from "../../types";
import { emptyFilters, filterSubmissions } from "./filters";

// jsdom tidak bisa menjalankan pdf.js, jadi react-pdf diganti tiruan sederhana (10 halaman).
vi.mock("react-pdf", () => ({
  pdfjs: { GlobalWorkerOptions: {} },
  Document: ({ children, onLoadSuccess }: { children: ReactNode; onLoadSuccess: (d: { numPages: number }) => void }) => {
    useEffect(() => onLoadSuccess({ numPages: 10 }), [onLoadSuccess]);
    return <div>{children}</div>;
  },
  Page: ({ pageNumber }: { pageNumber: number }) => <div data-testid="pdf-page">Isi halaman {pageNumber}</div>,
}));

const base: Submission = {
  id: "s1",
  status: "AWAITING_REVIEW",
  roCode: "001",
  satkerId: "u1",
  satkerName: "Satker Contoh",
  submittedAt: "2025-03-05T03:00:00.000Z",
  documents: [
    { id: "d1", type: "TOR", fileName: "tor.pdf", sizeBytes: 2048, pageCount: null, previewUrl: "blob:tor" },
    { id: "d2", type: "RAB", fileName: "rab.pdf", sizeBytes: 2048, pageCount: 3, previewUrl: null },
  ],
  context: {
    fiscalYear: null,
    ministry: null,
    unit: null,
    programCode: "007",
    programName: null,
    activityCode: null,
    activityName: null,
    kroCode: null,
    kroName: null,
    roCode: null,
    roName: null,
  },
  previousSubmissionId: null,
};

describe("saringan pengajuan", () => {
  const rows: Submission[] = [
    base,
    { ...base, id: "s2", status: "ACCEPTED", roCode: "002", satkerName: "Biro Lain", submittedAt: "2025-04-10T03:00:00.000Z" },
    { ...base, id: "s3", status: "PROCESSING_FAILED", satkerName: "Biro Lain", submittedAt: "2025-04-11T03:00:00.000Z" },
  ];
  const ids = (f: Partial<typeof emptyFilters>) =>
    filterSubmissions(rows, { ...emptyFilters, ...f }, "ROCAN").map((s) => s.id);

  it("menyaring per status, RO, satker, dan tanggal", () => {
    expect(ids({})).toEqual(["s1", "s2", "s3"]);
    expect(ids({ status: "Menunggu Pemeriksaan" })).toEqual(["s1"]);
    expect(ids({ status: "Pemrosesan bermasalah" })).toEqual(["s3"]);
    expect(ids({ roCode: "002" })).toEqual(["s2"]);
    expect(ids({ satker: "biro" })).toEqual(["s2", "s3"]);
    expect(ids({ from: "2025-04-01", to: "2025-04-10" })).toEqual(["s2"]);
  });
});

describe("ProgramContextPanel", () => {
  it("nilai kosong tampil —, kode tetap string", () => {
    render(<ProgramContextPanel context={base.context} />);
    expect(screen.getByText("Tahun anggaran").nextElementSibling?.textContent).toBe("—");
    expect(screen.getByText("Program").nextElementSibling?.textContent).toBe("007");
    expect(screen.getByText("RO").nextElementSibling?.textContent).toBe("—");
  });
});

describe("pratinjau PDF", () => {
  it("terbuka di halaman yang diminta dan bisa lompat halaman", async () => {
    render(<PdfPreviewModal open title="TOR: tor.pdf" file="blob:tor" initialPage={4} onClose={() => {}} />);
    expect(screen.getByRole("dialog", { name: "TOR: tor.pdf" })).toBeInTheDocument();
    expect(screen.getByTestId("pdf-page")).toHaveTextContent("Isi halaman 4");
    await waitFor(() => expect(screen.getByText("Halaman 4 dari 10")).toBeInTheDocument());

    const input = screen.getByLabelText("Lompat ke halaman");
    await userEvent.clear(input);
    await userEvent.type(input, "9");
    await userEvent.click(screen.getByRole("button", { name: "Buka" }));
    expect(screen.getByTestId("pdf-page")).toHaveTextContent("Isi halaman 9");
  });

  it("DocumentPair membuka pratinjau bila ada, dan jujur bila tidak ada", async () => {
    render(<DocumentPair documents={base.documents} />);
    expect(screen.getByText("Pratinjau belum tersedia.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Lihat pratinjau TOR" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Tutup" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
