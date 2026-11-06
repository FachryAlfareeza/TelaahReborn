import { describe, expect, it } from "vitest";
import {
  checklistVersionSchema,
  masterRoRowSchema,
  progressSchema,
  resultItemSchema,
  reviewRequestSchema,
  reviewResultSchema,
  userSchema,
} from "./schemas";

const T = "2026-11-06T08:00:00+07:00";
const cl = (code: string) => ({ code, name: `Nama ${code}` });

const request = {
  id: "rr-1",
  owner: { id: "u-1", nama: "Satker" },
  title: "Judul",
  description: "Deskripsi",
  fiscal_year: 2026,
  master_ro_row_id: "row-1",
  program: cl("059.GH"),
  activity: cl("4511"),
  kro: cl("PBM"),
  ro: cl("001"),
  unit_eselon1: cl("005"),
  unit_eselon2: cl("005.01"),
  priority: "Prioritas Nasional",
  proposal_category: "K1",
  documents: {
    tor: { filename: "tor.pdf", size_bytes: 10, sha256: "a" },
    rab: { filename: "rab.pdf", size_bytes: 10, sha256: "b" },
  },
  status: "siap_diverifikasi",
  version_number: 1,
  parent_request_id: null,
  resubmission_count: 0,
  extraction_path: "team1",
  submitted_at: T,
  updated_at: T,
};

const item = {
  item_id: "i-1",
  display_code: "I.S.1",
  section: "Substansi",
  inspection_type: "substance",
  method: "llm_rag",
  executor: "app",
  status: "Sesuai",
  explanation: "OK",
  evidence: [{ source: "tor", document_id: null, page: 3, block_id: null, table_id: null, reference_table_row_id: null, quote: "kutipan" }],
  calculation: null,
  error_reason: null,
};

describe("skema kontrak API", () => {
  it("menerima ReviewRequestResponse sesuai kontrak §3.4.1 dan menjaga nol di depan", () => {
    const parsed = reviewRequestSchema.parse(request);
    expect(parsed.ro.code).toBe("001");
    expect(parsed.program.code).toBe("059.GH");
  });

  it("menolak kode berupa angka (nol di depan bisa hilang)", () => {
    const bad = { ...request, ro: { code: 1, name: "RO" } };
    expect(reviewRequestSchema.safeParse(bad).success).toBe(false);
  });

  it("menolak bidang tak dikenal dengan pesan jelas", () => {
    const result = reviewRequestSchema.safeParse({ ...request, tor_file_path: "/srv/x.pdf" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("tor_file_path");
  });

  it("hanya menerima enam status pengajuan dari kontrak §2", () => {
    for (const status of ["menunggu_review", "dalam_proses", "siap_diverifikasi", "selesai_revisi", "selesai_disetujui", "gagal"]) {
      expect(reviewRequestSchema.safeParse({ ...request, status }).success).toBe(true);
    }
    expect(reviewRequestSchema.safeParse({ ...request, status: "ACCEPTED" }).success).toBe(false);
  });

  it("hanya menerima kategori K1 sampai K4", () => {
    expect(reviewRequestSchema.safeParse({ ...request, proposal_category: "K4" }).success).toBe(true);
    expect(reviewRequestSchema.safeParse({ ...request, proposal_category: "K0" }).success).toBe(false);
  });

  it("status hasil per item hanya tiga nilai PRD §13.2", () => {
    expect(resultItemSchema.safeParse(item).success).toBe(true);
    expect(resultItemSchema.safeParse({ ...item, status: "Terjadi Kesalahan pada proses", error_reason: "x" }).success).toBe(true);
    expect(resultItemSchema.safeParse({ ...item, status: "PASS" }).success).toBe(false);
    expect(resultItemSchema.safeParse({ ...item, status: "Bukti kurang" }).success).toBe(false);
  });

  it("bidang opsional item hasil yang tidak dikirim dianggap null", () => {
    const { calculation: _c, error_reason: _e, ...minimal } = item;
    void _c;
    void _e;
    const parsed = resultItemSchema.parse(minimal);
    expect(parsed.calculation).toBeNull();
    expect(parsed.error_reason).toBeNull();
  });

  it("menerima ReviewResultResponse ROCAN dengan hasil AI dan hasil final", () => {
    const parsed = reviewResultSchema.parse({
      review_request_id: "rr-1",
      run_id: "run-1",
      checklist_version_id: "cv-1",
      extraction_path: "docling_fallback",
      provenance: { llm_model: "m", embedding_model: "e", prompt_version: "p" },
      hasil_ai: {
        items: [item],
        screening_2: { claimed_category: "K1", recommended_category: null, status: "Terjadi Kesalahan pada proses", explanation: "", evidence: [] },
        generated_at: T,
      },
      hasil_final: { items: [item], final_category: null, revision: 0, updated_by: null, updated_at: null },
      decision: null,
      finalized_at: null,
    });
    expect(parsed.provenance?.reference_table_versions).toEqual([]);
  });

  it("menerima UserResponse dengan unit null untuk peran selain satker", () => {
    const user = { id: "u", nip: "1990", nama: "A", email: null, role: "rocan", is_active: true, unit_eselon1: null, unit_eselon2: null, created_at: T, updated_at: T };
    expect(userSchema.safeParse(user).success).toBe(true);
    expect(userSchema.safeParse({ ...user, role: "ROCAN" }).success).toBe(false);
  });

  it("menerima MasterRORow dan ProgressResponse", () => {
    expect(
      masterRoRowSchema.safeParse({
        id: "r",
        dataset_id: "d",
        fiscal_year: 2026,
        program: cl("059.GH"),
        activity: cl("4511"),
        kro: cl("PBM"),
        ro: cl("001"),
        unit_eselon1: cl("005"),
        unit_eselon2: cl("005.01"),
        priority: "Bukan Prioritas Nasional",
      }).success,
    ).toBe(true);
    expect(
      progressSchema.safeParse({
        review_request_id: "rr",
        run_id: null,
        request_status: "menunggu_review",
        extraction_path: null,
        stages: [{ stage: "extraction", status: "menunggu", started_at: null, finished_at: null, message: null }],
        started_at: null,
        updated_at: T,
      }).success,
    ).toBe(true);
  });

  it("menerima ChecklistVersionResponse runtime yang itemnya belum punya section/method/executor", () => {
    const parsed = checklistVersionSchema.parse({
      id: "cv",
      nama_versi: "v1",
      screening_1_items: [{ inspection_type: "substance", criterion: "Kriteria" }],
      screening_2_items: [{ inspection_type: "categorization", criterion: "Kategori" }],
      is_active: true,
      created_by: "u",
      created_at: T,
    });
    expect(parsed.screening_1_items[0].method).toBeNull();
    expect(parsed.screening_1_items[0].evidence_requirements).toEqual({});
  });
});
