import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiCandidateTag } from "./AiCandidateTag";
import { ConfirmDialog } from "./ConfirmDialog";
import { DataTable } from "./DataTable";
import { DemoOnly } from "./DemoOnly";
import { StatusBadge } from "./StatusBadge";
import { UploadDropzone } from "./UploadDropzone";

afterEach(() => vi.unstubAllEnvs());

describe("StatusBadge", () => {
  it("label mengikuti peran", () => {
    const { rerender } = render(<StatusBadge status="PROCESSING" role="SATKER" />);
    expect(screen.getByText("Terupload")).toBeInTheDocument();
    rerender(<StatusBadge status="PROCESSING" role="ROCAN" />);
    expect(screen.getByText("Diproses AI")).toBeInTheDocument();
    rerender(<StatusBadge status="AWAITING_REVIEW" role="SATKER" />);
    expect(screen.getByText("Diperiksa")).toBeInTheDocument();
    rerender(<StatusBadge status="AWAITING_REVIEW" role="SUPER_ADMIN" />);
    expect(screen.getByText("Menunggu Pemeriksaan")).toBeInTheDocument();
  });
  it("memuat ikon selain teks", () => {
    const { container } = render(<StatusBadge status="ACCEPTED" role="ROCAN" />);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});

describe("AiCandidateTag", () => {
  it("berlabel kandidat", () => {
    render(<AiCandidateTag />);
    expect(screen.getByText("Hasil AI (kandidat)")).toBeInTheDocument();
  });
});

describe("DataTable", () => {
  type Row = { id: string; nama: string; jumlah: number };
  const rows: Row[] = [
    { id: "1", nama: "B", jumlah: 2 },
    { id: "2", nama: "A", jumlah: 3 },
  ];
  const columns = [
    { key: "nama", header: "Nama", render: (r: Row) => r.nama, sortValue: (r: Row) => r.nama },
    { key: "jumlah", header: "Jumlah", render: (r: Row) => r.jumlah },
  ];
  it("memakai tabel semantik dan bisa diurutkan", async () => {
    render(<DataTable caption="Contoh" columns={columns} rows={rows} getRowKey={(r) => r.id} />);
    expect(screen.getByRole("table", { name: "Contoh" })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(screen.getAllByRole("rowheader").map((e) => e.textContent)).toEqual(["B", "A"]);
    await userEvent.click(screen.getByRole("button", { name: /Nama/ }));
    expect(screen.getAllByRole("rowheader").map((e) => e.textContent)).toEqual(["A", "B"]);
    expect(screen.getByRole("columnheader", { name: /Nama/ })).toHaveAttribute("aria-sort", "ascending");
  });
  it("menampilkan keadaan kosong", () => {
    render(<DataTable caption="Kosong" columns={columns} rows={[]} getRowKey={(r) => r.id} />);
    expect(screen.getByText("Belum ada data")).toBeInTheDocument();
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
    const ok = within(dialog).getByRole("button", { name: "Ya, lanjutkan" });
    expect(cancel).toHaveFocus();
    await userEvent.tab();
    expect(ok).toHaveFocus();
    await userEvent.tab();
    expect(cancel).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(ok).toHaveFocus();
    fireEvent.keyDown(ok, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });
});

describe("DemoOnly", () => {
  it("tampil dengan penanda bila VITE_SHOW_DEMO aktif", () => {
    vi.stubEnv("VITE_SHOW_DEMO", "true");
    const { container } = render(<DemoOnly>isi</DemoOnly>);
    const el = container.querySelector('[data-demo="true"]');
    expect(el).not.toBeNull();
    expect(el).toHaveClass("demo-flag");
  });
  it("tidak tampil bila nonaktif", () => {
    vi.stubEnv("VITE_SHOW_DEMO", "false");
    const { container } = render(<DemoOnly>isi</DemoOnly>);
    expect(container.querySelector("[data-demo]")).toBeNull();
    expect(screen.queryByText("isi")).toBeNull();
  });
});

describe("UploadDropzone", () => {
  it("menolak berkas bukan PDF dan menerima PDF", async () => {
    const onChange = vi.fn();
    render(<UploadDropzone label="Berkas TOR" file={null} onChange={onChange} />);
    const input = screen.getByLabelText("Berkas TOR");
    fireEvent.change(input, { target: { files: [new File(["x"], "a.txt", { type: "text/plain" })] } });
    expect(screen.getByRole("alert")).toHaveTextContent("PDF");
    expect(onChange).toHaveBeenLastCalledWith(null);
    fireEvent.change(input, { target: { files: [new File(["x"], "a.pdf", { type: "application/pdf" })] } });
    expect(onChange.mock.lastCall?.[0]).toBeInstanceOf(File);
  });
});
