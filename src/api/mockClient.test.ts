import { describe, expect, it } from "vitest";
import { ApiError } from "./client";
import { createMockClient, splitCodeLabel } from "./mockClient";
import { DEMO_PASSWORD } from "./mockData";
import { memoryStorage, mockClient, nipOf, pdf } from "../test/setupApp";

const code = (p: Promise<unknown>) => p.then(() => "ok").catch((e: unknown) => (e instanceof ApiError ? e.code : "lain"));

describe("adapter mock mengikuti kontrak", () => {
  it("memisahkan kode dan label pada tanda hubung pertama", () => {
    expect(splitCodeLabel("001-Rekomendasi hasil Survey - Tahap 2")).toEqual({ code: "001", name: "Rekomendasi hasil Survey - Tahap 2" });
    expect(splitCodeLabel("TanpaKode")).toBeNull();
  });

  it("login memakai NIP dan pesan gagal generik", async () => {
    const client = createMockClient({ storage: memoryStorage() });
    const err = await client.login({ nip: nipOf("rocan"), password: "salah" }).catch((e: Error) => e.message);
    expect(err).toBe("NIP atau kata sandi salah.");
    const user = await client.login({ nip: nipOf("rocan"), password: DEMO_PASSWORD });
    expect(user.role).toBe("rocan");
  });

  it("dropdown Satker difilter per unit Eselon II akun", async () => {
    const client = await mockClient("satker");
    const programs = await client.listPrograms({ fiscal_year: 2026, unit_eselon2_code: "005.02" });
    const activities = await client.listActivities({ fiscal_year: 2026, program_code: "059.GH" });
    // Kegiatan 4512 milik unit lain tidak tampil walau query unit diganti.
    expect(activities.map((a) => a.code)).toEqual(["4511"]);
    expect(programs.length).toBeGreaterThan(0);
    await expect(code(client.listPrograms({ fiscal_year: 2031 }))).resolves.toBe("NOT_FOUND");
  });

  it("pengajuan baru langsung dipicu reviu dan berakhir siap diverifikasi", async () => {
    let now = Date.parse("2026-11-06T01:00:00Z");
    const client = await mockClient("satker", { processingMs: 800, now: () => now });
    const [row] = await client.listRos({ fiscal_year: 2026, program_code: "059.GH", activity_code: "4511", kro_code: "PBM" });
    const req = await client.createReviewRequest({
      fiscal_year: 2026,
      master_ro_row_id: row.id,
      title: "Usulan",
      description: "Uraian",
      proposal_category: "K2",
      tor_file: pdf("tor.pdf"),
      rab_file: pdf("rab.pdf"),
    });
    expect(req.status).toBe("dalam_proses");
    expect(req.ro.code).toBe(row.ro.code);
    now += 200;
    const mid = await client.getProgress(req.id);
    expect(mid.stages.some((s) => s.status === "berjalan")).toBe(true);
    now += 1000;
    expect((await client.getReviewRequest(req.id)).status).toBe("siap_diverifikasi");
    // Satker tidak bisa melihat hasil sebelum finalisasi.
    await expect(code(client.getFinalResult(req.id))).resolves.toBe("NOT_FOUND");
    await expect(code(client.getReviewResult(req.id))).resolves.toBe("FORBIDDEN");
  });

  it("menolak berkas yang bukan PDF sah, RO unit lain, dan isian kosong", async () => {
    const client = await mockClient("satker");
    const rows = await client.listRos({ fiscal_year: 2026, program_code: "059.GH", activity_code: "4511", kro_code: "PBM" });
    const base = {
      fiscal_year: 2026,
      master_ro_row_id: rows[0].id,
      title: "T",
      description: "D",
      proposal_category: "K1" as const,
      tor_file: pdf("tor.pdf"),
      rab_file: pdf("rab.pdf"),
    };
    await expect(code(client.createReviewRequest({ ...base, tor_file: pdf("tor.pdf", "bukan pdf") }))).resolves.toBe("INVALID_INPUT");
    await expect(code(client.createReviewRequest({ ...base, master_ro_row_id: "ds-2026-row-4" }))).resolves.toBe("INVALID_INPUT");
    await expect(code(client.createReviewRequest({ ...base, title: " " }))).resolves.toBe("INVALID_INPUT");
  });

  it("edit hasil final: alasan wajib bila status berubah dan revisi lama ditolak", async () => {
    const client = await mockClient("rocan");
    const result = await client.getReviewResult("rr-siap");
    const target = result.hasil_final.items[0];
    const other = target.status === "Sesuai" ? "Tidak Sesuai atau perlu revisi" : "Sesuai";
    await expect(
      code(client.updateFinalResult("rr-siap", { expected_revision: 0, items: [{ item_id: target.item_id, status: other }] })),
    ).resolves.toBe("INVALID_INPUT");
    const updated = await client.updateFinalResult("rr-siap", {
      expected_revision: 0,
      items: [{ item_id: target.item_id, status: other, change_reason: "Bukti tidak cukup" }],
    });
    expect(updated.hasil_final.revision).toBe(1);
    // Hasil AI tidak pernah berubah.
    expect(updated.hasil_ai?.items[0].status).toBe(target.status);
    await expect(
      code(client.updateFinalResult("rr-siap", { expected_revision: 0, items: [{ item_id: target.item_id, explanation: "x" }] })),
    ).resolves.toBe("CONFLICT");
    const history = await client.getResultHistory("rr-siap");
    expect(history.some((h) => h.field === "status" && h.change_reason === "Bukti tidak cukup")).toBe(true);
  });

  it("finalisasi hanya dari siap diverifikasi dan memberi tahu Satker", async () => {
    const storage = memoryStorage();
    const rocan = createMockClient({ storage });
    await rocan.login({ nip: nipOf("rocan"), password: DEMO_PASSWORD });
    await expect(code(rocan.finalize("rr-setuju", { decision: "selesai_disetujui", final_category: "K1" }))).resolves.toBe("CONFLICT");
    const res = await rocan.finalize("rr-siap", { decision: "selesai_revisi", final_category: "K2", note: "Lengkapi lokasi" });
    expect(res.decision).toBe("selesai_revisi");
    expect((await rocan.listCurationSamples({})).length).toBe(res.hasil_final.items.length);

    const satker = createMockClient({ storage });
    await satker.login({ nip: nipOf("satker"), password: DEMO_PASSWORD });
    const final = await satker.getFinalResult("rr-siap");
    expect(final.hasil_final.final_category).toBe("K2");
    expect("hasil_ai" in final).toBe(false);
    expect((await satker.listNotifications()).some((n) => n.related_review_id === "rr-siap")).toBe(true);
  });

  it("resubmisi hanya dari perlu revisi, satu kali per versi, maksimal 3 kali", async () => {
    const client = await mockClient("satker");
    await expect(code(client.resubmit("rr-gagal", { tor_file: pdf("t.pdf"), rab_file: pdf("r.pdf") }))).resolves.toBe("CONFLICT");
    const v2 = await client.resubmit("rr-revisi", { tor_file: pdf("t.pdf"), rab_file: pdf("r.pdf") });
    expect(v2.version_number).toBe(2);
    expect(v2.parent_request_id).toBe("rr-revisi");
    expect(v2.resubmission_count).toBe(1);
    await expect(code(client.resubmit("rr-revisi", { tor_file: pdf("t.pdf"), rab_file: pdf("r.pdf") }))).resolves.toBe("CONFLICT");
    expect((await client.listVersions(v2.id)).map((v) => v.version_number)).toEqual([1, 2]);
  });

  it("retry-review hanya untuk ROCAN dari status gagal", async () => {
    const satker = await mockClient("satker");
    await expect(code(satker.retryReview("rr-gagal"))).resolves.toBe("FORBIDDEN");
    const rocan = await mockClient("rocan");
    await expect(code(rocan.retryReview("rr-siap"))).resolves.toBe("CONFLICT");
    await rocan.retryReview("rr-gagal");
    expect((await rocan.getReviewRequest("rr-gagal")).status).toBe("dalam_proses");
  });

  it("Satker tidak dapat melihat pengajuan Satker lain (404, bukan 403)", async () => {
    const client = await mockClient("satker");
    await expect(code(client.getReviewRequest("rr-setuju"))).resolves.toBe("NOT_FOUND");
  });

  it("akun Satker wajib punya pasangan unit yang ada di Master RO", async () => {
    const client = await mockClient("super_admin");
    const base = { nip: "200001012025011001", nama: "Baru", password: "katasandi1", role: "satker" as const };
    await expect(code(client.createUser(base))).resolves.toBe("INVALID_INPUT");
    await expect(code(client.createUser({ ...base, unit_eselon1_code: "005", unit_eselon2_code: "999" }))).resolves.toBe("INVALID_INPUT");
    const user = await client.createUser({ ...base, unit_eselon1_code: "005", unit_eselon2_code: "005.02" });
    expect(user.unit_eselon2?.code).toBe("005.02");
    await expect(code(client.createUser({ ...base, unit_eselon1_code: "005", unit_eselon2_code: "005.02" }))).resolves.toBe("CONFLICT");
  });

  it("checklist: aturan item ditegakkan dan versi terpakai tidak dapat diedit", async () => {
    const client = await mockClient("rocan");
    const [active] = await client.listChecklists();
    await expect(code(client.updateChecklistItems(active.id, { screening_1_items: active.screening_1_items, screening_2_items: active.screening_2_items }))).resolves.toBe("CONFLICT");
    const bad = { ...active.screening_1_items[0], executor: "team1_lapis_a" as const, inspection_type: "substance" as const };
    await expect(
      code(client.createChecklist({ nama_versi: "v2", screening_1_items: [bad], screening_2_items: active.screening_2_items })),
    ).resolves.toBe("INVALID_INPUT");
  });

  it("impor dataset melaporkan baris bermasalah, tidak membuangnya diam-diam", async () => {
    const client = await mockClient("rocan");
    const csv = [
      "program,unit_eselon1,kegiatan,unit_eselon2,prioritas_check,kro,ro",
      "059.GH-Program,005-E1,4511-Keg,005.01-E2,Prioritas Nasional,PBM-KRO,001-RO",
      "059.GH-Program,005-E1,4511-Keg,005.01-E2,Prioritas Nasional,PBM-KRO,001-RO",
      "059.GH-Program,005-E1,4511-Keg,,Prioritas Nasional,PBM-KRO,002-RO",
    ].join("\n");
    const ds = await client.importDataset(new File([csv], "renja.csv", { type: "text/csv" }), 2028);
    expect(ds.status).toBe("draft");
    const issues = await client.listDatasetIssues(ds.id);
    expect(issues.map((i) => i.issue).sort()).toEqual(["duplicate_combination", "duplicate_combination", "missing_value"]);
    await expect(code(client.importDataset(new File([csv], "renja.csv", { type: "text/csv" }), 2028))).resolves.toBe("CONFLICT");
  });
});
