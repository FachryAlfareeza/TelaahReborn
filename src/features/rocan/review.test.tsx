import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategoryResultCard } from "../../components/CategoryResultCard";
import { ChecklistTree } from "../../components/ChecklistTree";
import { DecisionPanel } from "../../components/DecisionPanel";
import { sampleScreening1, sampleScreening2 } from "../../api/mockData";
import { createMockClient } from "../../api/mockClient";
import { deriveNodeStatus } from "../../lib/verdict";
import type { Screening1Node } from "../../types";
import { TechnicalSection } from "./TechnicalSection";

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

const leaf = (code: string, answer: Screening1Node["answer"], technicalStatus: Screening1Node["technicalStatus"] = "NORMAL"): Screening1Node => ({
  code,
  title: code,
  answer,
  recommendation: null,
  evidence: [],
  technicalStatus,
  children: [],
});
const parent = (children: Screening1Node[]): Screening1Node => ({ ...leaf("P", null), children });

describe("status induk checklist", () => {
  it("diturunkan dari anak", () => {
    expect(deriveNodeStatus(parent([leaf("a", "PASS"), leaf("b", "PASS")]))).toBe("PASS");
    expect(deriveNodeStatus(parent([leaf("a", "PASS"), leaf("b", "INSUFFICIENT_EVIDENCE")]))).toBe("INSUFFICIENT_EVIDENCE");
    expect(deriveNodeStatus(parent([leaf("a", "INSUFFICIENT_EVIDENCE"), leaf("b", "NOT_PASS")]))).toBe("NOT_PASS");
  });
  it("gagal teknis tidak pernah menjadi kesimpulan Sesuai", () => {
    expect(deriveNodeStatus(parent([leaf("a", "PASS"), leaf("b", "PASS", "READ_FAILED")]))).toBe("TECHNICAL");
    expect(deriveNodeStatus(leaf("c", "PASS", "VERIFICATION_FAILED"))).toBe("TECHNICAL");
  });
});

describe("ChecklistTree dan CategoryResultCard", () => {
  it("induk membuka anak dan menampilkan label sederhana", async () => {
    render(<ChecklistTree items={sampleScreening1("s").items} />);
    expect(screen.queryByText("Siapa")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /II\.C\.1/ }));
    expect(screen.getByText("Siapa")).toBeInTheDocument();
    expect(screen.getAllByText("Belum sesuai").length).toBeGreaterThan(0);
  });
  it("gagal teknis tampil sebagai Pemrosesan bermasalah", () => {
    const r = sampleScreening2("s");
    r.questions[0] = { ...r.questions[0], technicalStatus: "READ_FAILED" };
    render(<CategoryResultCard result={r} />);
    expect(screen.getByText("Pemrosesan bermasalah")).toBeInTheDocument();
    expect(screen.getByText("Kategori 2")).toBeInTheDocument();
  });
});

describe("DecisionPanel", () => {
  it("menolak wajib bercatatan dan meminta konfirmasi", async () => {
    const onSave = vi.fn();
    render(<DecisionPanel decision={null} ready canDecide onSave={onSave} />);
    await userEvent.click(screen.getByLabelText("Ditolak"));
    await userEvent.click(screen.getByRole("button", { name: "Simpan keputusan" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Catatan wajib");
    await userEvent.type(screen.getByLabelText(/Catatan/), "Lengkapi TOR");
    await userEvent.click(screen.getByRole("button", { name: "Simpan keputusan" }));
    expect(onSave).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Ya, simpan" }));
    expect(onSave).toHaveBeenCalledWith("REJECTED", "Lengkapi TOR");
  });
  it("Super Admin tidak bisa memutuskan", () => {
    render(<DecisionPanel decision={null} ready canDecide={false} onSave={() => {}} />);
    expect(screen.queryByRole("button", { name: "Simpan keputusan" })).not.toBeInTheDocument();
  });
});

describe("TechnicalSection", () => {
  it("tersembunyi di balik tombol dan tidak tampil untuk Satker", async () => {
    const s1 = sampleScreening1("s");
    const { rerender, container } = render(<TechnicalSection role="ROCAN" submissionId="s" screening1={s1} />);
    expect(screen.queryByText("JSON mentah")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Tampilkan bagian teknis" }));
    expect(screen.getByText("JSON mentah")).toBeInTheDocument();
    rerender(<TechnicalSection role="SATKER" submissionId="s" screening1={s1} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("alur keputusan di klien mock", () => {
  async function setup() {
    const storage = memoryStorage();
    const client = createMockClient({ storage });
    await client.login({ email: "rocan@contoh.test", password: "demo1234" });
    return { client, storage };
  }
  it("ROCAN menolak, Satker melihat keputusan dan bisa mengajukan ulang tertaut", async () => {
    const { client, storage } = await setup();
    await client.saveDecision({ submissionId: "s-contoh-1", decision: "REJECTED", note: "Lengkapi TOR" });
    await client.login({ email: "satker@contoh.test", password: "demo1234" });
    const d = await client.getDecision("s-contoh-1");
    expect(d).toMatchObject({ decision: "REJECTED", note: "Lengkapi TOR" });
    const pdf = (n: string) => new File(["x"], n, { type: "application/pdf" });
    const next = await client.createSubmission({
      roCode: "001",
      tor: pdf("t.pdf"),
      rab: pdf("r.pdf"),
      previousSubmissionId: "s-contoh-1",
    });
    expect(next.previousSubmissionId).toBe("s-contoh-1");
    await expect(
      client.createSubmission({ roCode: "001", tor: pdf("t.pdf"), rab: pdf("r.pdf"), previousSubmissionId: next.id }),
    ).rejects.toThrow();
    expect(storage.getItem("telaah-mock-db")).toBeTruthy();
  });
  it("Satker tidak bisa kirim ulang pemrosesan", async () => {
    const { client } = await setup();
    await client.login({ email: "satker@contoh.test", password: "demo1234" });
    await expect(client.resubmitProcessing("s-contoh-1")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
