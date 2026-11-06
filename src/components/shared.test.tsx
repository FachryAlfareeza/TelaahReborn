import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiCandidateTag } from "./AiCandidateTag";
import { ConfirmDialog } from "./ConfirmDialog";
import { DataTable } from "./DataTable";
import { DemoOnly } from "./DemoOnly";
import { ProgressPanel } from "./ProgressPanel";
import { ResultSections } from "./ResultSections";
import { StatusBadge } from "./StatusBadge";
import { UploadDropzone } from "./UploadDropzone";
import type { ChecklistItem, ResultItem } from "../types";

afterEach(() => vi.unstubAllEnvs());

describe("StatusBadge", () => {
  it("label mengikuti peran dan memuat ikon", () => {
    const { rerender, container } = render(<StatusBadge status="dalam_proses" role="satker" />);
    expect(screen.getByText("Sedang direviu")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
    rerender(<StatusBadge status="dalam_proses" role="rocan" />);
    expect(screen.getByText("Diproses AI")).toBeInTheDocument();
  });
});

describe("AiCandidateTag", () => {
  it("berlabel kandidat", () => {
    render(<AiCandidateTag />);
    expect(screen.getByText("Hasil AI (kandidat)")).toBeInTheDocument();
  });
});

const item = (id: string, status: ResultItem["status"], extra: Partial<ResultItem> = {}): ResultItem => ({
  item_id: id,
  display_code: id.toUpperCase(),
  section: "Bagian",
  inspection_type: "substance",
  method: "llm",
  executor: "app",
  status,
  explanation: `Penjelasan ${id}`,
  evidence: [],
  calculation: null,
  error_reason: null,
  ...extra,
});

describe("ResultSections", () => {
  it("mengelompokkan per jenis pemeriksaan dan menampilkan sub-item di bawah induk", async () => {
    const checklist = [
      { item_id: "p", criterion: "Induk 5W+1H", parent_item_id: null },
      { item_id: "c", criterion: "Apa", parent_item_id: "p" },
    ] as ChecklistItem[];
    render(
      <ResultSections
        items={[
          item("f", "Sesuai", { inspection_type: "format_completeness" }),
          item("p", "Tidak Sesuai atau perlu revisi"),
          item("c", "Tidak Sesuai atau perlu revisi"),
          item("t", "Terjadi Kesalahan pada proses", { inspection_type: "reference_table", error_reason: "Tabel acuan belum tersedia" }),
        ]}
        checklist={checklist}
      />,
    );
    expect(screen.getByRole("heading", { name: "Format dan kelengkapan" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tabel acuan (BAS/SBM)" })).toBeInTheDocument();
    // Kegagalan teknis tampil sebagai alasan, bukan kesimpulan.
    expect(screen.getByText(/Belum dinilai: Tabel acuan belum tersedia/)).toBeInTheDocument();
    expect(screen.queryByText("Apa")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /Induk 5W\+1H/ }));
    expect(screen.getByText("Apa")).toBeInTheDocument();
  });
});

describe("ProgressPanel", () => {
  it("menampilkan tahap tanpa persentase", () => {
    render(
      <ProgressPanel
        progress={{
          review_request_id: "rr",
          run_id: "run",
          request_status: "dalam_proses",
          extraction_path: "team1",
          stages: [
            { stage: "extraction", status: "selesai", started_at: "2026-11-06T01:00:00Z", finished_at: "2026-11-06T01:00:05Z", message: null },
            { stage: "format_check", status: "berjalan", started_at: "2026-11-06T01:00:05Z", finished_at: null, message: null },
          ],
          started_at: "2026-11-06T01:00:00Z",
          updated_at: "2026-11-06T01:00:08Z",
        }}
      />,
    );
    const list = screen.getByRole("list", { name: "Tahap review" });
    expect(within(list).getByText("Membaca TOR dan RAB")).toBeInTheDocument();
    expect(within(list).getByText("Selesai, 5 detik")).toBeInTheDocument();
    expect(within(list).getByText("Berjalan, 3 detik")).toBeInTheDocument();
    expect(list.textContent).not.toMatch(/%/);
  });
});

describe("DataTable", () => {
  type Row = { id: string; nama: string };
  const rows: Row[] = [
    { id: "1", nama: "B" },
    { id: "2", nama: "A" },
  ];
  const columns = [{ key: "nama", header: "Nama", render: (r: Row) => r.nama, sortValue: (r: Row) => r.nama }];
  it("memakai tabel semantik dan bisa diurutkan", async () => {
    render(<DataTable caption="Contoh" columns={columns} rows={rows} getRowKey={(r) => r.id} />);
    expect(screen.getByRole("table", { name: "Contoh" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Nama/ }));
    expect(screen.getAllByRole("rowheader").map((e) => e.textContent)).toEqual(["A", "B"]);
  });

  it("cari cepat menyaring baris dan menampilkan jumlahnya", async () => {
    render(<DataTable caption="Contoh" columns={columns} rows={rows} getRowKey={(r) => r.id} />);
    await userEvent.type(screen.getByLabelText("Cari di contoh"), "a");
    expect(screen.getAllByRole("rowheader").map((e) => e.textContent)).toEqual(["A"]);
    expect(screen.getByText("1 dari 2 baris")).toBeInTheDocument();
  });
});

describe("ConfirmDialog", () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Buka</button>
        <ConfirmDialog open={open} title="Hapus?" onConfirm={() => {}} onCancel={() => setOpen(false)}>
          Yakin?
        </ConfirmDialog>
      </>
    );
  }
  it("fokus masuk, terjebak, dan kembali ke pemicu", async () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Buka" });
    await userEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Hapus?" });
    const cancel = within(dialog).getByRole("button", { name: "Batal" });
    expect(cancel).toHaveFocus();
    await userEvent.tab();
    await userEvent.tab();
    expect(cancel).toHaveFocus();
    fireEvent.keyDown(cancel, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });
});

describe("DemoOnly", () => {
  it("tampil dengan penanda hanya bila VITE_SHOW_DEMO aktif", () => {
    vi.stubEnv("VITE_SHOW_DEMO", "true");
    const { container, unmount } = render(<DemoOnly>isi</DemoOnly>);
    expect(container.querySelector('[data-demo="true"]')).toHaveClass("demo-flag");
    unmount();
    vi.stubEnv("VITE_SHOW_DEMO", "false");
    render(<DemoOnly>isi</DemoOnly>);
    expect(screen.queryByText("isi")).toBeNull();
  });
});

describe("UploadDropzone", () => {
  it("menolak berkas yang bukan PDF sah dan menerima PDF", async () => {
    const onChange = vi.fn();
    render(<UploadDropzone label="Berkas TOR" file={null} onChange={onChange} />);
    const input = screen.getByLabelText("Berkas TOR");
    fireEvent.change(input, { target: { files: [new File(["isi"], "a.pdf", { type: "application/pdf" })] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("bukan PDF");
    expect(onChange).toHaveBeenLastCalledWith(null);
    fireEvent.change(input, { target: { files: [new File(["%PDF-1.4"], "a.pdf", { type: "application/pdf" })] } });
    await waitFor(() => expect(onChange.mock.lastCall?.[0]).toBeInstanceOf(File));
  });
});
