import { describe, expect, it } from "vitest";
import {
  decisionSchema,
  programContextSchema,
  roSchema,
  screening1ResultSchema,
  screening2ResultSchema,
  submissionSchema,
  userSchema,
} from "./schemas";
import { getStatusLabel, getStatusView, canResubmitProcessing } from "../lib/status";
import type { SubmissionStatus } from "../types";

const context = {
  fiscalYear: "2025",
  ministry: "054",
  unit: null,
  programCode: "WA",
  programName: null,
  activityCode: "4567",
  activityName: null,
  kroCode: "QDB",
  kroName: null,
  roCode: "001",
  roName: null,
};

const submission = {
  id: "s1",
  status: "PROCESSING",
  roCode: "054.01",
  satkerId: "k1",
  satkerName: "Satker A",
  submittedAt: "2025-03-05T07:30:00Z",
  documents: [],
  context,
  previousSubmissionId: null,
};

describe("skema domain", () => {
  it("menerima payload valid dan menjaga nol di depan", () => {
    const r = submissionSchema.parse(submission);
    expect(r.roCode).toBe("054.01");
    expect(programContextSchema.parse(context).roCode).toBe("001");
    expect(roSchema.parse({ code: "007", description: "x", active: true }).code).toBe("007");
  });

  it("menolak kode berupa angka", () => {
    expect(roSchema.safeParse({ code: 7, description: "x", active: true }).success).toBe(false);
  });

  it("menolak bidang tak dikenal dengan pesan jelas", () => {
    const r = submissionSchema.safeParse({ ...submission, rahasia: 1 });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toContain("Bidang tidak dikenal: rahasia");
  });

  it("menolak status dan peran tidak valid", () => {
    expect(submissionSchema.safeParse({ ...submission, status: "SELESAI" }).success).toBe(false);
    expect(
      userSchema.safeParse({
        id: "u",
        name: "A",
        email: "a@x.id",
        role: "ADMIN",
        active: true,
        satkerName: null,
      }).success,
    ).toBe(false);
  });

  it("menerima Screening 1 bersarang dan menolak kutipan lebih dari 40 kata", () => {
    const node = (quote: string) => ({
      submissionId: "s1",
      checklistVersion: "v1",
      model: null,
      items: [
        {
          code: "II.C.1",
          title: "Induk",
          answer: null,
          recommendation: null,
          evidence: [],
          technicalStatus: "NORMAL",
          children: [
            {
              code: "II.C.1.a",
              title: "Anak",
              answer: "PASS",
              recommendation: null,
              evidence: [{ id: "e1", quote, documentType: "TOR", page: 2 }],
              technicalStatus: "NORMAL",
              children: [],
            },
          ],
        },
      ],
    });
    expect(screening1ResultSchema.safeParse(node("kutipan pendek")).success).toBe(true);
    expect(screening1ResultSchema.safeParse(node("kata ".repeat(41))).success).toBe(false);
  });

  it("memvalidasi Screening 2", () => {
    const base = {
      submissionId: "s1",
      category: 0,
      decidingQuestion: null,
      questions: [
        { code: "C01", text: "t", answer: "INSUFFICIENT_EVIDENCE", technicalStatus: "NORMAL", evidence: [] },
      ],
    };
    expect(screening2ResultSchema.safeParse(base).success).toBe(true);
    expect(screening2ResultSchema.safeParse({ ...base, category: 5 }).success).toBe(false);
    expect(
      screening2ResultSchema.safeParse({
        ...base,
        questions: [{ ...base.questions[0], code: "C13" }],
      }).success,
    ).toBe(false);
  });

  it("memvalidasi keputusan", () => {
    const d = {
      submissionId: "s1",
      decision: "REJECTED",
      note: "Perbaiki RAB",
      decidedBy: "rocan",
      decidedAt: "2025-03-06",
    };
    expect(decisionSchema.safeParse(d).success).toBe(true);
    expect(decisionSchema.safeParse({ ...d, decision: "PROCESSING" }).success).toBe(false);
  });
});

describe("pemetaan status per peran", () => {
  const cases: [SubmissionStatus, string, string][] = [
    ["PROCESSING", "Terupload", "Diproses AI"],
    ["AWAITING_REVIEW", "Diperiksa", "Menunggu Pemeriksaan"],
    ["ACCEPTED", "Diterima", "Diterima"],
    ["REJECTED", "Ditolak", "Ditolak"],
  ];
  it.each(cases)("%s", (status, satker, rocan) => {
    expect(getStatusLabel(status, "SATKER")).toBe(satker);
    expect(getStatusLabel(status, "ROCAN")).toBe(rocan);
    expect(getStatusLabel(status, "SUPER_ADMIN")).toBe(rocan);
  });

  it("pemrosesan bermasalah tidak tampil sebagai kesimpulan reviu", () => {
    expect(getStatusLabel("PROCESSING_FAILED", "ROCAN")).toBe("Pemrosesan bermasalah");
    expect(getStatusLabel("PROCESSING_FAILED", "SATKER")).toBe("Terupload");
    expect(canResubmitProcessing("PROCESSING_FAILED", "ROCAN")).toBe(true);
    expect(canResubmitProcessing("PROCESSING_FAILED", "SUPER_ADMIN")).toBe(true);
    expect(canResubmitProcessing("PROCESSING_FAILED", "SATKER")).toBe(false);
  });

  it("selalu menyertakan ikon dan label", () => {
    const v = getStatusView("ACCEPTED", "SATKER");
    expect(v.icon).toBeTruthy();
    expect(v.label).toBeTruthy();
  });
});
