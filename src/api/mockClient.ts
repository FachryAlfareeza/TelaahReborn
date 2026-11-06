/**
 * DEMO: adapter mock. Meniru perilaku backend sesuai kontrak API (`docs/api/contract.md` v2.1)
 * agar frontend dapat dibangun sebelum backend siap. Data disimpan di localStorage; berkas
 * unggahan hanya disimpan di memori tab ini.
 */
import { ApiError, type ApiClient, type ApiErrorCode, type ResultItemEdit } from "./client";
import {
  DATASET_2026,
  DATASET_2027,
  DEMO_PASSWORD,
  SAMPLE_PDF,
  sampleQuotes,
  seedChecklist,
  seedReferenceDocuments,
  seedRows,
  seedUsers,
} from "./mockData";
import { ITEM_STATUSES } from "./schemas";
import type {
  Category,
  ChecklistItem,
  ChecklistVersion,
  CodeLabel,
  CurationExport,
  CurationSampleDetail,
  DatasetIssue,
  Evidence,
  HistoryEntry,
  ItemStatus,
  MasterRoDataset,
  MasterRoRow,
  Notification,
  PipelineStageName,
  Progress,
  ReferenceDocument,
  ReferenceTableRow,
  ReferenceTableVersion,
  ResultItem,
  ReviewRequest,
  ReviewResult,
  Role,
  Stage,
  TableExtraction,
  UnitPair,
  User,
} from "../types";

const DB_KEY = "telaah-mock-db-v2";
const SESSION_KEY = "telaah-mock-session-v2";
/** Batas berkas dan resubmisi (PRD OQ-08). */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_RESUBMISSIONS = 3;

export const STAGES: PipelineStageName[] = [
  "extraction",
  "format_check",
  "sectioning",
  "reference_table_check",
  "retrieval",
  "substance_assessment",
  "categorization",
  "aggregation",
];

type StoredUser = User & { password: string };
type StoredRequest = ReviewRequest & {
  run_id: string | null;
  run_started_at: number | null;
  checklist_version_id: string | null;
  /** Demo: run ini berakhir gagal di tahap ekstraksi. */
  fail_demo: boolean;
};
type StoredRow = MasterRoRow & { has_issue: boolean };
type StoredDoc = ReferenceDocument & { timeline_start: number };
type StoredExtraction = TableExtraction & { table_type: "bas" | "sbm"; started: number };
type StoredTable = ReferenceTableVersion & { rows: ReferenceTableRow[] };
type StoredExport = CurationExport & { started: number; created: number };
type StoredNotification = Notification & { user_id: string };

type Db = {
  users: StoredUser[];
  datasets: MasterRoDataset[];
  rows: StoredRow[];
  issues: Record<string, DatasetIssue[]>;
  requests: StoredRequest[];
  results: Record<string, ReviewResult>;
  history: Record<string, HistoryEntry[]>;
  checklists: ChecklistVersion[];
  documents: StoredDoc[];
  extractions: StoredExtraction[];
  tables: StoredTable[];
  samples: CurationSampleDetail[];
  exports: StoredExport[];
  notifications: StoredNotification[];
};

export type MockOptions = {
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  /** Lama simulasi review dari dipicu sampai siap diverifikasi (milidetik). */
  processingMs?: number;
  now?: () => number;
};

const fail = (code: ApiErrorCode, message: string): never => {
  throw new ApiError(code, message);
};

const iso = (ms: number) => new Date(ms).toISOString();
const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const clone = <T>(v: T): T => structuredClone(v);

/** Hash sederhana agar hasil simulasi stabil untuk pasangan item dan pengajuan yang sama. */
function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

/** Pemisahan kode dan label pada tanda hubung pertama (PRD FR-MRO-02). */
export function splitCodeLabel(raw: string): CodeLabel | null {
  const text = raw.trim();
  const at = text.indexOf("-");
  if (at <= 0) return null;
  const code = text.slice(0, at).trim();
  const name = text.slice(at + 1).trim();
  return code && name ? { code, name } : null;
}

function uniqueBy<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((t) => {
    const k = key(t);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function readText(file: Blob): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/** Validasi berkas pengajuan sesuai kontrak §3.4 butir 4. */
async function checkPdf(file: File, label: string): Promise<void> {
  if (!file.name.toLowerCase().endsWith(".pdf")) fail("INVALID_INPUT", `${label} harus berekstensi .pdf.`);
  if (file.type !== "application/pdf") fail("INVALID_INPUT", `${label} harus bertipe PDF.`);
  if (file.size === 0) fail("INVALID_INPUT", `${label} kosong.`);
  if (file.size > MAX_FILE_BYTES) fail("TOO_LARGE", `${label} melebihi batas 20 MB.`);
  const head = await readText(file.slice(0, 5));
  if (head !== "%PDF-") fail("INVALID_INPUT", `${label} bukan berkas PDF yang sah.`);
}

function parseCsv(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return [];
  const delimiter = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
  return lines.map((l) => l.split(delimiter).map((c) => c.trim()));
}

const normalizeHeader = (h: string) => h.trim().toLowerCase().replace(/\s+/g, "_");

function seed(now: number): Db {
  const users: StoredUser[] = seedUsers.map((u) => ({
    ...u,
    is_active: true,
    password: DEMO_PASSWORD,
    created_at: iso(now - 30 * 86_400_000),
    updated_at: iso(now - 30 * 86_400_000),
  }));
  const datasets: MasterRoDataset[] = [
    [DATASET_2026, 2026, "laporan_renja_2026_contoh.csv"],
    [DATASET_2027, 2027, "laporan_renja_2027_contoh.xlsx"],
  ].map(([id, year, filename]) => ({
    id: id as string,
    fiscal_year: year as number,
    source_filename: filename as string,
    sha256: `sha-${id}`,
    status: "active",
    row_count: 5,
    valid_row_count: 5,
    issue_count: 0,
    imported_by: "u-rocan",
    imported_at: iso(now - 20 * 86_400_000),
    activated_at: iso(now - 20 * 86_400_000),
  }));
  const db: Db = {
    users,
    datasets,
    rows: seedRows.map((r) => ({ ...r, has_issue: false })),
    issues: {},
    requests: [],
    results: {},
    history: {},
    checklists: [clone(seedChecklist)],
    documents: seedReferenceDocuments.map((d) => ({ ...d, timeline_start: now - 86_400_000 })),
    extractions: [],
    tables: [],
    samples: [],
    exports: [],
    notifications: [],
  };

  const row = (i: number) => db.rows.find((r) => r.id === `${DATASET_2026}-row-${i}`)!;
  const add = (
    id: string,
    owner: StoredUser,
    r: StoredRow,
    title: string,
    category: Category,
    status: ReviewRequest["status"],
    daysAgo: number,
  ) => {
    const t = now - daysAgo * 86_400_000;
    const req = newRequest(db, owner, r, {
      id,
      title,
      description: `Uraian contoh untuk ${title.toLowerCase()}.`,
      category,
      tor: { filename: `TOR ${r.ro.code}.pdf`, size_bytes: 482_133, sha256: `sha-tor-${id}` },
      rab: { filename: `RAB ${r.ro.code}.pdf`, size_bytes: 210_550, sha256: `sha-rab-${id}` },
      at: t,
    });
    req.status = status;
    if (status !== "menunggu_review") {
      req.run_id = `run-${id}`;
      req.run_started_at = t;
      req.checklist_version_id = seedChecklist.id;
      req.extraction_path = "team1";
    }
    db.requests.push(req);
    return req;
  };

  const [satker, , , satkerB] = users;
  const siap = add("rr-siap", satker, row(1), "Survei Keterbukaan Informasi 2026", "K1", "siap_diverifikasi", 2);
  db.results[siap.id] = buildResult(siap, seedChecklist, now - 2 * 86_400_000);

  const revisi = add("rr-revisi", satker, row(2), "Pedoman Layanan Informasi", "K2", "selesai_revisi", 9);
  const revisiResult = buildResult(revisi, seedChecklist, now - 9 * 86_400_000);
  revisiResult.decision = "selesai_revisi";
  revisiResult.finalized_at = iso(now - 7 * 86_400_000);
  revisiResult.hasil_final.final_category = "K2";
  db.results[revisi.id] = revisiResult;
  db.history[revisi.id] = [
    {
      revision: 0,
      item_id: null,
      field: "finalization",
      old: null,
      new: "selesai_revisi",
      change_reason: "Lengkapi rincian lokasi dan manajemen risiko.",
      changed_by: "u-rocan",
      changed_at: iso(now - 7 * 86_400_000),
    },
  ];

  const gagal = add("rr-gagal", satker, row(3), "Layanan Informasi Daerah", "K1", "gagal", 1);
  gagal.fail_demo = true;

  const setuju = add("rr-setuju", satkerB, row(4), "Rekomendasi Kemitraan Media", "K3", "selesai_disetujui", 14);
  const setujuResult = buildResult(setuju, seedChecklist, now - 14 * 86_400_000);
  setujuResult.decision = "selesai_disetujui";
  setujuResult.finalized_at = iso(now - 12 * 86_400_000);
  setujuResult.hasil_final.final_category = "K3";
  db.results[setuju.id] = setujuResult;

  add("rr-menunggu", satker, row(5), "Layanan Manajemen Keuangan", "K4", "menunggu_review", 0);

  notify(db, "u-rocan", "Review siap diverifikasi", `Pengajuan "${siap.title}" siap diverifikasi.`, siap.id, now);
  notify(db, "u-rocan", "Review gagal", `Review otomatis "${gagal.title}" gagal. Jalankan ulang atau periksa manual.`, gagal.id, now);
  notify(db, satker.id, "Hasil reviu sudah final", `Pengajuan "${revisi.title}" perlu revisi.`, revisi.id, now);
  return db;
}

function newRequest(
  db: Db,
  owner: StoredUser,
  row: StoredRow,
  v: {
    id?: string;
    title: string;
    description: string;
    category: Category;
    tor: ReviewRequest["documents"]["tor"];
    rab: ReviewRequest["documents"]["rab"];
    at: number;
    parent?: StoredRequest;
  },
): StoredRequest {
  void db;
  return {
    id: v.id ?? uid("rr"),
    owner: { id: owner.id, nama: owner.nama },
    title: v.title,
    description: v.description,
    fiscal_year: row.fiscal_year,
    master_ro_row_id: row.id,
    program: row.program,
    activity: row.activity,
    kro: row.kro,
    ro: row.ro,
    unit_eselon1: row.unit_eselon1,
    unit_eselon2: row.unit_eselon2,
    priority: row.priority,
    proposal_category: v.category,
    documents: { tor: v.tor, rab: v.rab },
    status: "menunggu_review",
    version_number: v.parent ? v.parent.version_number + 1 : 1,
    parent_request_id: v.parent?.id ?? null,
    resubmission_count: v.parent ? v.parent.resubmission_count + 1 : 0,
    extraction_path: null,
    submitted_at: iso(v.at),
    updated_at: iso(v.at),
    run_id: null,
    run_started_at: null,
    checklist_version_id: null,
    fail_demo: false,
  };
}

function notify(db: Db, userId: string, judul: string, pesan: string, related: string | null, at: number) {
  db.notifications.unshift({
    id: uid("ntf"),
    user_id: userId,
    judul,
    pesan,
    related_review_id: related,
    is_read: false,
    created_at: iso(at),
  });
}

const notifyRole = (db: Db, role: Role, judul: string, pesan: string, related: string | null, at: number) =>
  db.users.filter((u) => u.role === role && u.is_active).forEach((u) => notify(db, u.id, judul, pesan, related, at));

/** Hasil AI simulasi untuk satu pengajuan, dari checklist versi aktif. */
function buildResult(req: StoredRequest, checklist: ChecklistVersion, at: number): ReviewResult {
  const fallback = req.extraction_path === "docling_fallback";
  const leafItem = (c: ChecklistItem): ResultItem => {
    const itemId = c.item_id ?? uid("ci");
    const roll = hash(`${itemId}:${req.id}`) % 10;
    const base = {
      item_id: itemId,
      display_code: c.display_code,
      section: c.section,
      inspection_type: c.inspection_type,
      method: c.method,
      executor: c.executor,
      calculation: null,
    };
    if (c.executor === "team1_lapis_a" && fallback) {
      return {
        ...base,
        status: "Terjadi Kesalahan pada proses",
        explanation: "",
        evidence: [],
        error_reason: "Hasil Lapis A tidak tersedia (jalur fallback)",
      };
    }
    if (c.method === "manual") {
      return {
        ...base,
        status: "Terjadi Kesalahan pada proses",
        explanation: "",
        evidence: [],
        error_reason: "Item ini diperiksa manual oleh ROCAN.",
      };
    }
    if (roll === 9) {
      return {
        ...base,
        status: "Terjadi Kesalahan pada proses",
        explanation: "",
        evidence: [],
        error_reason: "Kutipan dari model tidak ditemukan pada halaman sumber.",
      };
    }
    const status: ItemStatus = roll >= 7 ? "Tidak Sesuai atau perlu revisi" : "Sesuai";
    const torQuote = sampleQuotes.tor[roll % sampleQuotes.tor.length];
    const evidence: Evidence[] = [];
    const ev = (source: Evidence["source"], page: number | null, quote: string, document_id: string | null = null): Evidence => ({
      source,
      document_id,
      page,
      block_id: null,
      table_id: null,
      reference_table_row_id: null,
      quote,
    });
    if (c.inspection_type === "reference_table") {
      evidence.push(ev("rab", 1 + (roll % 3), sampleQuotes.rab[roll % sampleQuotes.rab.length]));
      return {
        ...base,
        status,
        explanation:
          status === "Sesuai"
            ? "Nilai pada RAB sesuai tabel acuan aktif."
            : "Nilai pada RAB melebihi batas tabel acuan aktif.",
        evidence,
        calculation: {
          formula: "harga satuan RAB ≤ besaran SBM",
          inputs: [
            { label: "Harga satuan RAB", value: status === "Sesuai" ? 1_700_000 : 2_100_000, source: "RAB halaman 2" },
            { label: "Besaran SBM", value: 1_900_000, source: "SBM 2026 halaman 41" },
          ],
          result: status === "Sesuai" ? 1 : 0,
        },
        error_reason: null,
      };
    }
    evidence.push(ev("tor", 2 + (roll % 4), torQuote));
    if (c.inspection_type === "tor_rab_alignment") evidence.push(ev("rab", 1, sampleQuotes.rab[0]));
    if (c.method === "llm_rag") evidence.push(ev("reference_document", 12, sampleQuotes.acuan[0], "rd-rpjmn"));
    return {
      ...base,
      status,
      explanation:
        status === "Sesuai"
          ? "Dokumen memenuhi kriteria item ini."
          : "Bagian yang diminta belum dijelaskan cukup rinci pada TOR.",
      evidence,
      error_reason: null,
    };
  };

  const items = checklist.screening_1_items.map(leafItem);
  // Item induk: statusnya diturunkan dari anak-anaknya.
  for (const parent of checklist.screening_1_items) {
    const children = checklist.screening_1_items.filter((c) => c.parent_item_id === parent.item_id);
    if (children.length === 0) continue;
    const childStatuses = items.filter((i) => children.some((c) => c.item_id === i.item_id)).map((i) => i.status);
    const target = items.find((i) => i.item_id === parent.item_id)!;
    const status: ItemStatus = childStatuses.includes("Tidak Sesuai atau perlu revisi")
      ? "Tidak Sesuai atau perlu revisi"
      : childStatuses.includes("Terjadi Kesalahan pada proses")
        ? "Terjadi Kesalahan pada proses"
        : "Sesuai";
    Object.assign(target, {
      status,
      explanation: status === "Sesuai" ? "Semua sub-butir terpenuhi." : "Sebagian sub-butir belum terpenuhi.",
      evidence: [],
      error_reason: status === "Terjadi Kesalahan pada proses" ? "Sebagian sub-butir gagal dinilai." : null,
    });
  }

  const categories: Category[] = ["K1", "K2", "K3", "K4"];
  const roll = hash(req.id) % 10;
  const recommended = roll < 7 ? req.proposal_category : categories[(categories.indexOf(req.proposal_category) + 1) % 4];
  return {
    review_request_id: req.id,
    run_id: req.run_id ?? uid("run"),
    checklist_version_id: checklist.id,
    extraction_path: req.extraction_path ?? "team1",
    provenance: {
      team1_job_id: null,
      extraction_schema_version: "1.0",
      lapis_a_ruleset_version: fallback ? null : "lapis-a-contoh-1",
      reference_table_versions: [],
      llm_model: "model-contoh",
      embedding_model: "intfloat/multilingual-e5-base",
      prompt_version: "review-v1",
    },
    hasil_ai: {
      items,
      screening_2: {
        claimed_category: req.proposal_category,
        recommended_category: recommended,
        status: recommended === req.proposal_category ? "Sesuai" : "Tidak Sesuai atau perlu revisi",
        explanation:
          recommended === req.proposal_category
            ? "Bukti pada TOR dan dokumen acuan mendukung klaim kategori."
            : "Bukti lebih sesuai dengan kategori lain.",
        evidence: [
          {
            source: "tor",
            document_id: null,
            page: 1,
            block_id: null,
            table_id: null,
            reference_table_row_id: null,
            quote: sampleQuotes.tor[0],
          },
        ],
      },
      generated_at: iso(at),
    },
    hasil_final: { items: clone(items), final_category: null, revision: 0, updated_by: null, updated_at: null },
    decision: null,
    finalized_at: null,
  };
}

const publicUser = ({ password: _password, ...u }: StoredUser): User => {
  void _password;
  return clone(u);
};
const publicRequest = (r: StoredRequest): ReviewRequest => {
  const { run_id, run_started_at, checklist_version_id, fail_demo, ...rest } = r;
  void run_id;
  void run_started_at;
  void checklist_version_id;
  void fail_demo;
  return clone(rest);
};
const publicDoc = ({ timeline_start: _t, ...d }: StoredDoc): ReferenceDocument => {
  void _t;
  return clone(d);
};
const publicExtraction = ({ table_type: _a, started: _b, ...e }: StoredExtraction): TableExtraction => {
  void _a;
  void _b;
  return clone(e);
};
const publicTable = ({ rows: _rows, ...t }: StoredTable): ReferenceTableVersion => {
  void _rows;
  return clone(t);
};
const publicExport = ({ started: _a, created: _b, ...e }: StoredExport): CurationExport => {
  void _a;
  void _b;
  return clone(e);
};
const publicNotification = ({ user_id: _u, ...n }: StoredNotification): Notification => {
  void _u;
  return clone(n);
};

export function createMockClient(options: MockOptions = {}): ApiClient {
  const storage = options.storage ?? localStorage;
  const now = options.now ?? (() => Date.now());
  const processingMs = options.processingMs ?? 12_000;
  const stageMs = processingMs / STAGES.length;
  /** Isi berkas unggahan; tidak disimpan ke localStorage agar kuota tidak habis. */
  const files = new Map<string, Blob>();

  function load(): Db {
    const raw = storage.getItem(DB_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as Db;
      } catch {
        // Data rusak: mulai ulang dari data contoh.
      }
    }
    const db = seed(now());
    storage.setItem(DB_KEY, JSON.stringify(db));
    return db;
  }
  const save = (db: Db) => storage.setItem(DB_KEY, JSON.stringify(db));

  /** Memajukan proses berbasis waktu: review, ingestion, ekstraksi tabel, ekspor. */
  function tick(db: Db): void {
    const t = now();
    for (const req of db.requests) {
      if (req.status !== "dalam_proses" || req.run_started_at === null) continue;
      const elapsed = t - req.run_started_at;
      if (req.fail_demo && elapsed >= stageMs) {
        req.status = "gagal";
        req.updated_at = iso(t);
        notifyRole(db, "rocan", "Review gagal", `Review otomatis "${req.title}" gagal.`, req.id, t);
      } else if (elapsed >= processingMs) {
        const checklist = db.checklists.find((c) => c.id === req.checklist_version_id) ?? db.checklists[0];
        db.results[req.id] = buildResult(req, checklist, t);
        req.status = "siap_diverifikasi";
        req.updated_at = iso(t);
        notifyRole(db, "rocan", "Review siap diverifikasi", `Pengajuan "${req.title}" siap diverifikasi.`, req.id, t);
      }
    }
    for (const d of db.documents) {
      if (d.status !== "pending" && d.status !== "processing") continue;
      const elapsed = t - d.timeline_start;
      if (elapsed >= 4000) {
        d.status = "active";
        d.chunks_count = 80 + (hash(d.id) % 60);
        d.processed_at = iso(t);
        d.error_message = null;
        notify(db, d.uploaded_by, "Ingestion selesai", `Dokumen acuan "${d.title}" siap dipakai.`, null, t);
      } else if (elapsed >= 1500) {
        d.status = "processing";
      }
    }
    for (const e of db.extractions) {
      if (e.status === "succeeded" || e.status === "failed") continue;
      const elapsed = t - e.started;
      if (elapsed >= 3000) {
        e.status = "succeeded";
        e.tables_found = 3;
      } else if (elapsed >= 1000) e.status = "processing";
    }
    for (const x of db.exports) {
      if (x.status === "succeeded" || x.status === "failed") continue;
      if (t - x.started >= 2000) {
        x.status = "succeeded";
        x.sha256 = `sha-${x.export_id}`;
      } else x.status = "processing";
    }
  }

  /** Buka basis data, jalankan proses waktu, lalu simpan setelah fungsi selesai. */
  async function withDb<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
    const db = load();
    tick(db);
    const result = await fn(db);
    save(db);
    return result;
  }

  function me(db: Db): StoredUser {
    const id = storage.getItem(SESSION_KEY);
    const user = db.users.find((u) => u.id === id);
    if (!user || !user.is_active) {
      storage.removeItem(SESSION_KEY);
      return fail("UNAUTHENTICATED", "Sesi berakhir. Silakan masuk lagi.");
    }
    return user;
  }

  function requireRole(db: Db, ...roles: Role[]): StoredUser {
    const user = me(db);
    if (!roles.includes(user.role)) fail("FORBIDDEN", "Anda tidak punya izin untuk tindakan ini.");
    return user;
  }

  /** Satker hanya boleh melihat pengajuan miliknya; lainnya 404 (kontrak §1 Ownership). */
  function visibleRequest(db: Db, user: StoredUser, id: string): StoredRequest {
    const req = db.requests.find((r) => r.id === id);
    if (!req || (user.role === "satker" && req.owner.id !== user.id)) {
      return fail("NOT_FOUND", "Pengajuan tidak ditemukan.");
    }
    return req;
  }

  function activeDataset(db: Db, year: number): MasterRoDataset {
    const ds = db.datasets.find((d) => d.fiscal_year === year && d.status === "active");
    return ds ?? fail("NOT_FOUND", `Belum ada data Master RO aktif untuk tahun ${year}.`);
  }

  function cascadeRows(db: Db, user: StoredUser, q: { fiscal_year: number; unit_eselon2_code?: string }) {
    const ds = activeDataset(db, q.fiscal_year);
    let rows = db.rows.filter((r) => r.dataset_id === ds.id && !r.has_issue);
    if (user.role === "satker") {
      const unit = user.unit_eselon2?.code;
      rows = unit ? rows.filter((r) => r.unit_eselon2.code === unit) : [];
    } else if (q.unit_eselon2_code) {
      rows = rows.filter((r) => r.unit_eselon2.code === q.unit_eselon2_code);
    }
    return rows;
  }

  function allUnits(db: Db): UnitPair[] {
    const activeIds = new Set(db.datasets.filter((d) => d.status === "active").map((d) => d.id));
    return uniqueBy(
      db.rows
        .filter((r) => activeIds.has(r.dataset_id))
        .map((r) => ({ unit_eselon1: r.unit_eselon1, unit_eselon2: r.unit_eselon2 })),
      (u) => `${u.unit_eselon1.code}|${u.unit_eselon2.code}`,
    );
  }

  /** Mulai review otomatis (PRD K-25). Tanpa checklist aktif: tetap menunggu dan ROCAN diberi tahu. */
  function trigger(db: Db, req: StoredRequest): void {
    const checklist = db.checklists.find((c) => c.is_active);
    const t = now();
    if (!checklist) {
      notifyRole(db, "rocan", "Checklist aktif belum ada", `Pengajuan "${req.title}" menunggu checklist aktif.`, req.id, t);
      return;
    }
    req.status = "dalam_proses";
    req.run_id = uid("run");
    req.run_started_at = t;
    req.checklist_version_id = checklist.id;
    req.extraction_path = "team1";
    req.updated_at = iso(t);
  }

  function progressOf(req: StoredRequest): Progress {
    const t = now();
    const stages: Stage[] = STAGES.map((stage, i) => {
      const start = req.run_started_at === null ? null : req.run_started_at + i * stageMs;
      const end = start === null ? null : start + stageMs;
      let status: Stage["status"] = "menunggu";
      let message: string | null = null;
      if (start !== null && end !== null) {
        const finished = ["siap_diverifikasi", "selesai_revisi", "selesai_disetujui"].includes(req.status);
        if (req.status === "gagal" && req.fail_demo) {
          status = i === 0 ? "gagal" : "menunggu";
          if (i === 0) message = "Ekstraksi TOR dan RAB tidak menghasilkan keluaran yang valid.";
        } else if (finished || t >= end) status = "selesai";
        else if (t >= start) status = "berjalan";
      }
      const started = status === "menunggu" || start === null ? null : iso(start);
      const done = (status === "selesai" || status === "gagal") && end !== null ? iso(Math.min(end, t)) : null;
      return { stage, status, started_at: started, finished_at: done, message };
    });
    return {
      review_request_id: req.id,
      run_id: req.run_id,
      request_status: req.status,
      extraction_path: req.extraction_path,
      stages,
      started_at: req.run_started_at === null ? null : iso(req.run_started_at),
      // Waktu catatan progres ini; saat review berjalan, sama dengan saat diminta.
      updated_at: req.status === "dalam_proses" ? iso(t) : req.updated_at,
    };
  }

  function chainOf(db: Db, req: StoredRequest): StoredRequest[] {
    let root = req;
    while (root.parent_request_id) {
      const parent = db.requests.find((r) => r.id === root.parent_request_id);
      if (!parent) break;
      root = parent;
    }
    const chain = [root];
    let next = db.requests.find((r) => r.parent_request_id === root.id);
    while (next) {
      chain.push(next);
      const current: StoredRequest = next;
      next = db.requests.find((r) => r.parent_request_id === current.id);
    }
    return chain;
  }

  function validateChecklist(s1: ChecklistItem[], s2: ChecklistItem[]): void {
    if (s1.length === 0) fail("INVALID_INPUT", "Screening 1 harus berisi minimal satu item.");
    if (s2.length !== 1 || s2[0].inspection_type !== "categorization") {
      fail("INVALID_INPUT", "Screening 2 harus berupa satu pemeriksaan kategorisasi.");
    }
    if (s1.some((i) => i.inspection_type === "categorization")) {
      fail("INVALID_INPUT", "Item kategorisasi harus berada di Screening 2.");
    }
    for (const i of [...s1, ...s2]) {
      if (!i.criterion.trim()) fail("INVALID_INPUT", "Kriteria item tidak boleh kosong.");
      if (i.executor === "team1_lapis_a" && i.inspection_type !== "format_completeness") {
        fail("INVALID_INPUT", "Pelaksana Lapis A hanya untuk item format/kelengkapan.");
      }
      if (i.executor === "team1_lapis_a" && !i.display_code) {
        fail("INVALID_INPUT", "Item Lapis A wajib memiliki kode tampilan.");
      }
      if (i.inspection_type === "reference_table" && i.method !== "lookup") {
        fail("INVALID_INPUT", "Item tabel acuan wajib memakai metode lookup.");
      }
    }
  }

  const withIds = (items: ChecklistItem[]) => items.map((i) => ({ ...clone(i), item_id: i.item_id ?? uid("ci") }));

  function validateUnits(db: Db, role: Role, e1?: string, e2?: string): { e1: CodeLabel | null; e2: CodeLabel | null } {
    if (role !== "satker") return { e1: null, e2: null };
    if (!e1 || !e2) fail("INVALID_INPUT", "Akun Satker wajib memiliki Unit Eselon I dan Unit Eselon II.");
    const pair = allUnits(db).find((u) => u.unit_eselon1.code === e1 && u.unit_eselon2.code === e2);
    if (!pair) fail("INVALID_INPUT", "Pasangan Unit Eselon I dan II tidak ada pada daftar unit Master RO.");
    return { e1: pair!.unit_eselon1, e2: pair!.unit_eselon2 };
  }

  return {
    mode: "mock",

    // --- Autentikasi ---------------------------------------------------------
    login: (input) =>
      withDb((db) => {
        const user = db.users.find((u) => u.nip === input.nip.trim());
        // Pesan generik: tidak membedakan NIP salah dan kata sandi salah (PRD FR-AUTH-01).
        if (!user || user.password !== input.password || !user.is_active) {
          fail("UNAUTHENTICATED", "NIP atau kata sandi salah.");
        }
        storage.setItem(SESSION_KEY, user!.id);
        return publicUser(user!);
      }),
    logout: async () => storage.removeItem(SESSION_KEY),
    getSession: () =>
      withDb((db) => {
        const id = storage.getItem(SESSION_KEY);
        const user = db.users.find((u) => u.id === id && u.is_active);
        return user ? publicUser(user) : null;
      }),

    // --- Akun -----------------------------------------------------------------
    listUsers: (role) =>
      withDb((db) => {
        requireRole(db, "super_admin");
        return db.users.filter((u) => !role || u.role === role).map(publicUser);
      }),
    createUser: (input) =>
      withDb((db) => {
        requireRole(db, "super_admin");
        if (!input.nip.trim() || !input.nama.trim()) fail("INVALID_INPUT", "NIP dan nama wajib diisi.");
        if (input.password.length < 8 || input.password.length > 128) {
          fail("INVALID_INPUT", "Kata sandi harus 8 sampai 128 karakter.");
        }
        if (db.users.some((u) => u.nip === input.nip.trim())) fail("CONFLICT", "NIP sudah terdaftar.");
        const units = validateUnits(db, input.role, input.unit_eselon1_code, input.unit_eselon2_code);
        const t = iso(now());
        const user: StoredUser = {
          id: uid("u"),
          nip: input.nip.trim(),
          nama: input.nama.trim(),
          email: input.email?.trim() || null,
          role: input.role,
          is_active: true,
          unit_eselon1: units.e1,
          unit_eselon2: units.e2,
          created_at: t,
          updated_at: t,
          password: input.password,
        };
        db.users.push(user);
        return publicUser(user);
      }),
    updateUser: (id, input) =>
      withDb((db) => {
        requireRole(db, "super_admin");
        const user = db.users.find((u) => u.id === id) ?? fail("NOT_FOUND", "Akun tidak ditemukan.");
        if (input.nip !== undefined && db.users.some((u) => u.nip === input.nip && u.id !== id)) {
          fail("CONFLICT", "NIP sudah terdaftar.");
        }
        if (input.password !== undefined && (input.password.length < 8 || input.password.length > 128)) {
          fail("INVALID_INPUT", "Kata sandi harus 8 sampai 128 karakter.");
        }
        const role = input.role ?? user.role;
        const units = validateUnits(
          db,
          role,
          input.unit_eselon1_code ?? user.unit_eselon1?.code,
          input.unit_eselon2_code ?? user.unit_eselon2?.code,
        );
        Object.assign(user, {
          nip: input.nip ?? user.nip,
          nama: input.nama ?? user.nama,
          email: input.email === undefined ? user.email : input.email || null,
          role,
          is_active: input.is_active ?? user.is_active,
          unit_eselon1: units.e1,
          unit_eselon2: units.e2,
          password: input.password ?? user.password,
          updated_at: iso(now()),
        });
        return publicUser(user);
      }),
    deactivateUser: (id) =>
      withDb((db) => {
        requireRole(db, "super_admin");
        const user = db.users.find((u) => u.id === id) ?? fail("NOT_FOUND", "Akun tidak ditemukan.");
        user.is_active = false;
        user.updated_at = iso(now());
      }),

    // --- Master RO --------------------------------------------------------------
    listFiscalYears: () =>
      withDb((db) => {
        me(db);
        return db.datasets
          .filter((d) => d.status === "active")
          .sort((a, b) => a.fiscal_year - b.fiscal_year)
          .map((d) => ({ fiscal_year: d.fiscal_year, dataset_id: d.id, activated_at: d.activated_at }));
      }),
    listUnits: (year) =>
      withDb((db) => {
        requireRole(db, "super_admin", "rocan");
        const ds = activeDataset(db, year);
        return uniqueBy(
          db.rows
            .filter((r) => r.dataset_id === ds.id && !r.has_issue)
            .map((r) => ({ unit_eselon1: r.unit_eselon1, unit_eselon2: r.unit_eselon2 })),
          (u) => `${u.unit_eselon1.code}|${u.unit_eselon2.code}`,
        );
      }),
    listPrograms: (q) =>
      withDb((db) => uniqueBy(cascadeRows(db, me(db), q).map((r) => r.program), (c) => c.code)),
    listActivities: (q) =>
      withDb((db) =>
        uniqueBy(
          cascadeRows(db, me(db), q)
            .filter((r) => r.program.code === q.program_code)
            .map((r) => r.activity),
          (c) => c.code,
        ),
      ),
    listKros: (q) =>
      withDb((db) =>
        uniqueBy(
          cascadeRows(db, me(db), q)
            .filter((r) => r.program.code === q.program_code && r.activity.code === q.activity_code)
            .map((r) => r.kro),
          (c) => c.code,
        ),
      ),
    listRos: (q) =>
      withDb((db) =>
        cascadeRows(db, me(db), q)
          .filter(
            (r) => r.program.code === q.program_code && r.activity.code === q.activity_code && r.kro.code === q.kro_code,
          )
          .map(({ has_issue: _h, ...r }) => {
            void _h;
            return clone(r);
          }),
      ),
    listDatasets: (year) =>
      withDb((db) => {
        requireRole(db, "rocan");
        return clone(db.datasets.filter((d) => year === undefined || d.fiscal_year === year));
      }),
    importDataset: (file, year) =>
      withDb(async (db) => {
        const user = requireRole(db, "rocan");
        const name = file.name.toLowerCase();
        if (!name.endsWith(".csv") && !name.endsWith(".xlsx")) fail("INVALID_INPUT", "Berkas harus .csv atau .xlsx.");
        if (!Number.isInteger(year)) fail("INVALID_INPUT", "Tahun anggaran wajib diisi.");
        const sha = `sha-${file.name}-${file.size}`;
        const dup = db.datasets.find((d) => d.fiscal_year === year && d.sha256 === sha);
        if (dup) fail("CONFLICT", `Berkas yang sama sudah diimpor untuk tahun ${year} (dataset ${dup.id}).`);
        const id = uid("ds");
        const issues: DatasetIssue[] = [];
        const rows: StoredRow[] = [];
        if (name.endsWith(".csv")) {
          const table = parseCsv(await readText(file));
          const header = (table[0] ?? []).map(normalizeHeader);
          const required = ["program", "unit_eselon1", "kegiatan", "unit_eselon2", "prioritas_check", "kro", "ro"];
          const missing = required.filter((c) => !header.includes(c));
          if (missing.length) fail("INVALID_INPUT", `Kolom wajib tidak ada: ${missing.join(", ")}.`);
          const col = (r: string[], c: string) => r[header.indexOf(c)] ?? "";
          const seen = new Map<string, number[]>();
          table.slice(1).forEach((cells, i) => {
            const rowNumber = i + 2;
            const raw = Object.fromEntries(header.map((h, j) => [h, cells[j] ?? ""]));
            let bad = false;
            const parsed: Record<string, CodeLabel | null> = {};
            for (const c of ["program", "unit_eselon1", "kegiatan", "unit_eselon2", "kro", "ro"]) {
              const value = col(cells, c);
              if (!value) {
                issues.push({ row_number: rowNumber, issue: "missing_value", column: c, raw });
                bad = true;
                continue;
              }
              parsed[c] = splitCodeLabel(value);
              if (!parsed[c]) {
                issues.push({ row_number: rowNumber, issue: "unparseable_code", column: c, raw });
                bad = true;
              }
            }
            const priority = col(cells, "prioritas_check");
            if (priority !== "Prioritas Nasional" && priority !== "Bukan Prioritas Nasional") {
              issues.push({ row_number: rowNumber, issue: "missing_value", column: "prioritas_check", raw });
              bad = true;
            }
            if (bad) return;
            const key = ["program", "kegiatan", "kro", "ro"].map((c) => parsed[c]!.code).join("|");
            seen.set(key, [...(seen.get(key) ?? []), rowNumber]);
            rows.push({
              id: `${id}-row-${rowNumber}`,
              dataset_id: id,
              fiscal_year: year,
              program: parsed.program!,
              activity: parsed.kegiatan!,
              kro: parsed.kro!,
              ro: parsed.ro!,
              unit_eselon1: parsed.unit_eselon1!,
              unit_eselon2: parsed.unit_eselon2!,
              priority: priority as MasterRoRow["priority"],
              has_issue: false,
            });
          });
          for (const [, numbers] of seen) {
            if (numbers.length < 2) continue;
            for (const n of numbers) {
              issues.push({ row_number: n, issue: "duplicate_combination", column: null, raw: {} });
              const r = rows.find((x) => x.id === `${id}-row-${n}`);
              if (r) r.has_issue = true;
            }
          }
        } else {
          // Demo: berkas XLSX tidak dibaca di peramban; isinya diambil dari data contoh.
          seedRows
            .filter((r) => r.dataset_id === DATASET_2026)
            .forEach((r, i) => rows.push({ ...clone(r), id: `${id}-row-${i + 2}`, dataset_id: id, fiscal_year: year, has_issue: false }));
        }
        const badRows = new Set(issues.map((i) => i.row_number));
        const dataset: MasterRoDataset = {
          id,
          fiscal_year: year,
          source_filename: file.name,
          sha256: sha,
          status: "draft",
          row_count: rows.filter((r) => !r.has_issue).length + badRows.size,
          valid_row_count: rows.filter((r) => !r.has_issue).length,
          issue_count: issues.length,
          imported_by: user.id,
          imported_at: iso(now()),
          activated_at: null,
        };
        db.datasets.push(dataset);
        db.rows.push(...rows);
        db.issues[id] = issues;
        return clone(dataset);
      }),
    listDatasetIssues: (id) =>
      withDb((db) => {
        requireRole(db, "rocan");
        if (!db.datasets.some((d) => d.id === id)) fail("NOT_FOUND", "Dataset tidak ditemukan.");
        return clone(db.issues[id] ?? []);
      }),
    activateDataset: (id) =>
      withDb((db) => {
        requireRole(db, "rocan");
        const ds = db.datasets.find((d) => d.id === id) ?? fail("NOT_FOUND", "Dataset tidak ditemukan.");
        for (const other of db.datasets) {
          if (other.fiscal_year === ds.fiscal_year && other.status === "active" && other.id !== id) {
            other.status = "superseded";
          }
        }
        ds.status = "active";
        ds.activated_at = iso(now());
        return clone(ds);
      }),

    // --- Pengajuan ------------------------------------------------------------
    listReviewRequests: (f = {}) =>
      withDb((db) => {
        const user = requireRole(db, "satker", "rocan");
        const from = f.submitted_from ? Date.parse(f.submitted_from) : null;
        const to = f.submitted_to ? Date.parse(f.submitted_to) + (f.submitted_to.length <= 10 ? 86_399_999 : 0) : null;
        return db.requests
          .filter((r) => user.role !== "satker" || r.owner.id === user.id)
          .filter((r) => !f.status || r.status === f.status)
          .filter((r) => !f.fiscal_year || r.fiscal_year === f.fiscal_year)
          .filter((r) => !f.program_code || r.program.code === f.program_code)
          .filter((r) => !f.activity_code || r.activity.code === f.activity_code)
          .filter((r) => !f.kro_code || r.kro.code === f.kro_code)
          .filter((r) => !f.ro_code || r.ro.code === f.ro_code)
          .filter((r) => !f.proposal_category || r.proposal_category === f.proposal_category)
          .filter((r) => from === null || Date.parse(r.submitted_at) >= from)
          .filter((r) => to === null || Date.parse(r.submitted_at) <= to)
          .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))
          .map(publicRequest);
      }),
    getReviewRequest: (id) =>
      withDb((db) => publicRequest(visibleRequest(db, requireRole(db, "satker", "rocan"), id))),
    createReviewRequest: (input) =>
      withDb(async (db) => {
        const user = requireRole(db, "satker");
        const year = Number(input.fiscal_year);
        const ds = db.datasets.find((d) => d.fiscal_year === year && d.status === "active");
        if (!ds) fail("INVALID_INPUT", "Tahun anggaran tidak memiliki data Master RO aktif.");
        const row = db.rows.find((r) => r.id === input.master_ro_row_id && r.dataset_id === ds!.id && !r.has_issue);
        if (!row || row.unit_eselon2.code !== user.unit_eselon2?.code) {
          fail("INVALID_INPUT", "Rincian Output yang dipilih tidak tersedia untuk unit Anda.");
        }
        if (!input.title.trim()) fail("INVALID_INPUT", "Judul usulan wajib diisi.");
        if (!input.description.trim()) fail("INVALID_INPUT", "Deskripsi wajib diisi.");
        if (!["K1", "K2", "K3", "K4"].includes(input.proposal_category)) {
          fail("INVALID_INPUT", "Kategori usulan harus salah satu dari K1 sampai K4.");
        }
        await checkPdf(input.tor_file, "Berkas TOR");
        await checkPdf(input.rab_file, "Berkas RAB");
        const req = newRequest(db, user, row!, {
          title: input.title.trim(),
          description: input.description.trim(),
          category: input.proposal_category,
          tor: { filename: input.tor_file.name, size_bytes: input.tor_file.size, sha256: `sha-${input.tor_file.name}` },
          rab: { filename: input.rab_file.name, size_bytes: input.rab_file.size, sha256: `sha-${input.rab_file.name}` },
          at: now(),
        });
        files.set(`${req.id}:tor`, input.tor_file);
        files.set(`${req.id}:rab`, input.rab_file);
        db.requests.push(req);
        trigger(db, req);
        return publicRequest(req);
      }),
    getDocument: (id, kind) =>
      withDb((db) => {
        visibleRequest(db, requireRole(db, "satker", "rocan"), id);
        return files.get(`${id}:${kind}`) ?? new Blob([SAMPLE_PDF], { type: "application/pdf" });
      }),
    listVersions: (id) =>
      withDb((db) => chainOf(db, visibleRequest(db, requireRole(db, "satker", "rocan"), id)).map(publicRequest)),
    resubmit: (id, input) =>
      withDb(async (db) => {
        const user = requireRole(db, "satker");
        const parent = visibleRequest(db, user, id);
        if (parent.status !== "selesai_revisi") {
          fail("CONFLICT", "Resubmisi hanya untuk pengajuan berstatus perlu revisi.");
        }
        if (db.requests.some((r) => r.parent_request_id === parent.id)) {
          fail("CONFLICT", "Versi revisi untuk pengajuan ini sudah dikirim.");
        }
        if (parent.resubmission_count >= MAX_RESUBMISSIONS) {
          fail("CONFLICT", `Batas ${MAX_RESUBMISSIONS} kali resubmisi sudah tercapai.`);
        }
        await checkPdf(input.tor_file, "Berkas TOR");
        await checkPdf(input.rab_file, "Berkas RAB");
        const row = db.rows.find((r) => r.id === parent.master_ro_row_id)!;
        const req = newRequest(db, user, row, {
          title: input.title?.trim() || parent.title,
          description: input.description?.trim() || parent.description,
          category: input.proposal_category ?? parent.proposal_category,
          tor: { filename: input.tor_file.name, size_bytes: input.tor_file.size, sha256: `sha-${input.tor_file.name}` },
          rab: { filename: input.rab_file.name, size_bytes: input.rab_file.size, sha256: `sha-${input.rab_file.name}` },
          at: now(),
          parent,
        });
        // Snapshot hierarki tetap mengikuti versi induk (PRD FR-REQ-02).
        Object.assign(req, {
          program: parent.program,
          activity: parent.activity,
          kro: parent.kro,
          ro: parent.ro,
          unit_eselon1: parent.unit_eselon1,
          unit_eselon2: parent.unit_eselon2,
          priority: parent.priority,
          fiscal_year: parent.fiscal_year,
        });
        files.set(`${req.id}:tor`, input.tor_file);
        files.set(`${req.id}:rab`, input.rab_file);
        db.requests.push(req);
        trigger(db, req);
        return publicRequest(req);
      }),

    // --- Pipeline -------------------------------------------------------------
    retryReview: (id) =>
      withDb((db) => {
        const user = requireRole(db, "rocan");
        const req = visibleRequest(db, user, id);
        if (req.status !== "gagal") fail("CONFLICT", "Jalankan ulang hanya untuk pengajuan yang gagal diproses.");
        if (!db.checklists.some((c) => c.is_active)) fail("CONFLICT", "Belum ada checklist aktif.");
        req.fail_demo = false;
        trigger(db, req);
      }),
    getProgress: (id) => withDb((db) => progressOf(visibleRequest(db, requireRole(db, "satker", "rocan"), id))),

    // --- Hasil ----------------------------------------------------------------
    getReviewResult: (id) =>
      withDb((db) => {
        const user = requireRole(db, "rocan");
        visibleRequest(db, user, id);
        return clone(db.results[id] ?? fail("NOT_FOUND", "Hasil review belum ada."));
      }),
    getFinalResult: (id) =>
      withDb((db) => {
        const user = requireRole(db, "satker", "rocan");
        visibleRequest(db, user, id);
        const result = db.results[id];
        if (!result?.decision || !result.finalized_at) fail("NOT_FOUND", "Hasil final belum tersedia.");
        return clone({
          review_request_id: id,
          hasil_final: result!.hasil_final,
          decision: result!.decision!,
          finalized_at: result!.finalized_at!,
        });
      }),
    updateFinalResult: (id, input) =>
      withDb((db) => {
        const user = requireRole(db, "rocan");
        const req = visibleRequest(db, user, id);
        const result = db.results[id] ?? fail("NOT_FOUND", "Hasil review belum ada.");
        if (req.status !== "siap_diverifikasi") fail("CONFLICT", "Hasil hanya dapat diedit saat siap diverifikasi.");
        if (input.expected_revision !== result.hasil_final.revision) {
          fail("CONFLICT", "Hasil sudah diubah orang lain. Muat ulang untuk melihat versi terbaru.");
        }
        const ids = input.items.map((i) => i.item_id);
        if (new Set(ids).size !== ids.length) fail("INVALID_INPUT", "Item tidak boleh dikirim lebih dari sekali.");
        const t = iso(now());
        const nextRevision = result.hasil_final.revision + 1;
        const entries: HistoryEntry[] = [];
        const record = (item_id: string | null, field: string, old: unknown, next: unknown, reason: string | null) =>
          entries.push({ revision: nextRevision, item_id, field, old, new: next, change_reason: reason, changed_by: user.id, changed_at: t });

        const edits: [ResultItem, ResultItemEdit][] = input.items.map((edit) => {
          const target = result.hasil_final.items.find((i) => i.item_id === edit.item_id);
          if (!target) return fail("INVALID_INPUT", "Item tidak ada pada hasil review.");
          if (edit.status !== undefined && !ITEM_STATUSES.includes(edit.status)) {
            fail("INVALID_INPUT", "Status item tidak dikenal.");
          }
          if (edit.status !== undefined && edit.status !== target.status && !edit.change_reason?.trim()) {
            fail("INVALID_INPUT", "Alasan perubahan wajib diisi bila status diubah.");
          }
          return [target, edit];
        });
        for (const [target, edit] of edits) {
          const reason = edit.change_reason?.trim() || null;
          if (edit.status !== undefined && edit.status !== target.status) {
            record(target.item_id, "status", target.status, edit.status, reason);
            if (target.status === "Terjadi Kesalahan pada proses") {
              record(target.item_id, "error_reason", target.error_reason, null, reason);
              target.error_reason = null;
            }
            target.status = edit.status;
          }
          if (edit.explanation !== undefined && edit.explanation !== target.explanation) {
            record(target.item_id, "explanation", target.explanation, edit.explanation, reason);
            target.explanation = edit.explanation;
          }
          if (edit.evidence !== undefined && JSON.stringify(edit.evidence) !== JSON.stringify(target.evidence)) {
            record(target.item_id, "evidence", target.evidence, edit.evidence, reason);
            target.evidence = clone(edit.evidence);
          }
        }
        if (input.final_category !== undefined && input.final_category !== result.hasil_final.final_category) {
          record(null, "final_category", result.hasil_final.final_category, input.final_category, null);
          result.hasil_final.final_category = input.final_category;
        }
        if (entries.length > 0) {
          result.hasil_final.revision = nextRevision;
          result.hasil_final.updated_by = user.id;
          result.hasil_final.updated_at = t;
          db.history[id] = [...(db.history[id] ?? []), ...entries];
        }
        return clone(result);
      }),
    getResultHistory: (id) =>
      withDb((db) => {
        visibleRequest(db, requireRole(db, "rocan"), id);
        return clone(db.history[id] ?? []);
      }),
    finalize: (id, input) =>
      withDb((db) => {
        const user = requireRole(db, "rocan");
        const req = visibleRequest(db, user, id);
        const result = db.results[id] ?? fail("NOT_FOUND", "Hasil review belum ada.");
        if (req.status !== "siap_diverifikasi") fail("CONFLICT", "Finalisasi hanya dari status siap diverifikasi.");
        if (!["K1", "K2", "K3", "K4"].includes(input.final_category)) fail("INVALID_INPUT", "Kategori final wajib dipilih.");
        const t = now();
        if (input.final_category !== result.hasil_final.final_category) {
          (db.history[id] ??= []).push({
            revision: result.hasil_final.revision,
            item_id: null,
            field: "final_category",
            old: result.hasil_final.final_category,
            new: input.final_category,
            change_reason: null,
            changed_by: user.id,
            changed_at: iso(t),
          });
          result.hasil_final.final_category = input.final_category;
        }
        (db.history[id] ??= []).push({
          revision: result.hasil_final.revision,
          item_id: null,
          field: "finalization",
          old: null,
          new: input.decision,
          change_reason: input.note?.trim() || null,
          changed_by: user.id,
          changed_at: iso(t),
        });
        result.decision = input.decision;
        result.finalized_at = iso(t);
        req.status = input.decision;
        req.updated_at = iso(t);
        notify(
          db,
          req.owner.id,
          "Hasil reviu sudah final",
          input.decision === "selesai_disetujui"
            ? `Pengajuan "${req.title}" disetujui.`
            : `Pengajuan "${req.title}" perlu revisi.`,
          req.id,
          t,
        );
        // Sampel kurasi dibuat satu per item hasil saat finalisasi (kontrak §3.10).
        for (const finalItem of result.hasil_final.items) {
          const aiItem = result.hasil_ai?.items.find((i) => i.item_id === finalItem.item_id) ?? finalItem;
          db.samples.push({
            id: uid("cs"),
            review_request_id: id,
            item_id: finalItem.item_id,
            display_code: finalItem.display_code,
            inspection_type: finalItem.inspection_type,
            hasil_ai_status: aiItem.status,
            hasil_final_status: finalItem.status,
            changed_by_rocan: JSON.stringify(aiItem) !== JSON.stringify(finalItem),
            status: "pending",
            input: {
              checklist_version_id: result.checklist_version_id,
              prompt_version: result.provenance?.prompt_version ?? null,
              evidence: aiItem.evidence,
            },
            hasil_ai_item: clone(aiItem),
            hasil_final_item: clone(finalItem),
            note: null,
          });
        }
        return clone(result);
      }),

    // --- Checklist --------------------------------------------------------------
    listChecklists: () =>
      withDb((db) => {
        requireRole(db, "rocan");
        return clone(db.checklists);
      }),
    getChecklist: (id) =>
      withDb((db) => {
        requireRole(db, "rocan");
        return clone(db.checklists.find((c) => c.id === id) ?? fail("NOT_FOUND", "Versi checklist tidak ditemukan."));
      }),
    createChecklist: (input) =>
      withDb((db) => {
        const user = requireRole(db, "rocan");
        if (!input.nama_versi.trim()) fail("INVALID_INPUT", "Nama versi wajib diisi.");
        validateChecklist(input.screening_1_items, input.screening_2_items);
        const version: ChecklistVersion = {
          id: uid("cv"),
          nama_versi: input.nama_versi.trim(),
          screening_1_items: withIds(input.screening_1_items),
          screening_2_items: withIds(input.screening_2_items),
          is_active: false,
          created_by: user.id,
          created_at: iso(now()),
        };
        db.checklists.push(version);
        if (input.activate ?? true) {
          db.checklists.forEach((c) => (c.is_active = c.id === version.id));
        }
        return clone(version);
      }),
    updateChecklistItems: (id, input) =>
      withDb((db) => {
        requireRole(db, "rocan");
        const version = db.checklists.find((c) => c.id === id) ?? fail("NOT_FOUND", "Versi checklist tidak ditemukan.");
        if (db.requests.some((r) => r.checklist_version_id === id)) {
          fail("CONFLICT", "Versi ini sudah dipakai review. Buat versi baru untuk mengubahnya.");
        }
        validateChecklist(input.screening_1_items, input.screening_2_items);
        version.screening_1_items = withIds(input.screening_1_items);
        version.screening_2_items = withIds(input.screening_2_items);
        return clone(version);
      }),
    activateChecklist: (id) =>
      withDb((db) => {
        requireRole(db, "rocan");
        const version = db.checklists.find((c) => c.id === id) ?? fail("NOT_FOUND", "Versi checklist tidak ditemukan.");
        db.checklists.forEach((c) => (c.is_active = c.id === version.id));
        return clone(version);
      }),

    // --- Dokumen acuan ----------------------------------------------------------
    listReferenceDocuments: (f = {}) =>
      withDb((db) => {
        requireRole(db, "rocan");
        return db.documents
          .filter((d) => !f.status || d.status === f.status)
          .filter((d) => !f.doc_type || d.doc_type === f.doc_type)
          .filter((d) => !f.validity || d.validity === f.validity)
          .map(publicDoc);
      }),
    uploadReferenceDocument: (input) =>
      withDb((db) => {
        const user = requireRole(db, "rocan");
        const name = input.file.name.toLowerCase();
        if (!name.endsWith(".pdf") && !name.endsWith(".xlsx")) fail("INVALID_INPUT", "Berkas harus .pdf atau .xlsx.");
        if (input.file.size === 0) fail("INVALID_INPUT", "Berkas kosong.");
        if (!input.title.trim()) fail("INVALID_INPUT", "Judul wajib diisi.");
        const sha = `sha-${input.file.name}-${input.file.size}`;
        const dup = db.documents.find((d) => d.sha256 === sha);
        if (dup) fail("CONFLICT", `Dokumen yang sama sudah diunggah ("${dup.title}").`);
        const t = now();
        const docRow: StoredDoc = {
          id: uid("rd"),
          title: input.title.trim(),
          doc_type: input.doc_type,
          number: input.number?.trim() || null,
          effective_year: input.effective_year ?? null,
          validity: input.validity,
          filename: input.file.name,
          sha256: sha,
          status: "pending",
          chunks_count: 0,
          error_message: null,
          uploaded_by: user.id,
          uploaded_at: iso(t),
          processed_at: null,
          timeline_start: t,
        };
        db.documents.unshift(docRow);
        return publicDoc(docRow);
      }),
    reingestReferenceDocument: (id) =>
      withDb((db) => {
        requireRole(db, "rocan");
        const d = db.documents.find((x) => x.id === id) ?? fail("NOT_FOUND", "Dokumen acuan tidak ditemukan.");
        if (d.status === "processing" || d.status === "pending") fail("CONFLICT", "Dokumen sedang diproses.");
        d.status = "pending";
        d.timeline_start = now();
      }),
    deactivateReferenceDocument: (id) =>
      withDb((db) => {
        requireRole(db, "rocan");
        const d = db.documents.find((x) => x.id === id) ?? fail("NOT_FOUND", "Dokumen acuan tidak ditemukan.");
        if (d.status !== "active") fail("CONFLICT", "Hanya dokumen aktif yang dapat dinonaktifkan.");
        d.status = "inactive";
        return publicDoc(d);
      }),
    activateReferenceDocument: (id) =>
      withDb((db) => {
        requireRole(db, "rocan");
        const d = db.documents.find((x) => x.id === id) ?? fail("NOT_FOUND", "Dokumen acuan tidak ditemukan.");
        if (d.status !== "inactive" || !d.processed_at) {
          fail("CONFLICT", "Hanya dokumen yang pernah aktif yang dapat diaktifkan kembali.");
        }
        d.status = "active";
        return publicDoc(d);
      }),

    // --- Tabel acuan ----------------------------------------------------------------
    startTableExtraction: (input) =>
      withDb((db) => {
        requireRole(db, "rocan");
        if (!input.file && !input.reference_document_id) {
          fail("INVALID_INPUT", "Pilih berkas PDF sumber atau dokumen acuan.");
        }
        const e: StoredExtraction = {
          extraction_id: uid("ex"),
          status: "pending",
          tables_found: 0,
          error_message: null,
          table_type: input.table_type,
          started: now(),
        };
        db.extractions.unshift(e);
        return publicExtraction(e);
      }),
    getTableExtraction: (id) =>
      withDb((db) => {
        requireRole(db, "rocan");
        return publicExtraction(
          db.extractions.find((e) => e.extraction_id === id) ?? fail("NOT_FOUND", "Ekstraksi tidak ditemukan."),
        );
      }),
    downloadTableCandidate: (id) =>
      withDb((db) => {
        requireRole(db, "rocan");
        const e = db.extractions.find((x) => x.extraction_id === id) ?? fail("NOT_FOUND", "Ekstraksi tidak ditemukan.");
        if (e.status !== "succeeded") fail("CONFLICT", "Tabel kandidat belum siap.");
        const csv =
          e.table_type === "bas"
            ? "kode_akun,uraian,source_page\n521211,Belanja Bahan,12\n522151,Belanja Jasa Profesi,14\n"
            : "kode,uraian,satuan,besaran,source_page\n1.1,Honorarium Narasumber Eselon I,OJ,1700000,41\n2.3,Paket Meeting Dalam Kota,OH,650000,77\n";
        return new Blob([csv], { type: "text/csv" });
      }),
    importReferenceTable: (input) =>
      withDb(async (db) => {
        requireRole(db, "rocan");
        const name = input.file.name.toLowerCase();
        if (!name.endsWith(".csv") && !name.endsWith(".xlsx")) fail("INVALID_INPUT", "Berkas harus .csv atau .xlsx.");
        if (!input.verification_note.trim()) fail("INVALID_INPUT", "Catatan verifikasi wajib diisi.");
        if (!db.documents.some((d) => d.id === input.source_document_id)) {
          fail("INVALID_INPUT", "Dokumen sumber tidak ditemukan.");
        }
        const required =
          input.table_type === "bas"
            ? ["kode_akun", "uraian", "source_page"]
            : ["kode", "uraian", "satuan", "besaran", "source_page"];
        const id = uid("rt");
        const rows: ReferenceTableRow[] = [];
        let errors = 0;
        if (name.endsWith(".csv")) {
          const table = parseCsv(await readText(input.file));
          const header = (table[0] ?? []).map(normalizeHeader);
          const missing = required.filter((c) => !header.includes(c));
          if (missing.length) fail("INVALID_INPUT", `Kolom wajib tidak ada: ${missing.join(", ")}.`);
          table.slice(1).forEach((cells, i) => {
            const values: Record<string, string | number | null> = Object.fromEntries(
              header.map((h, j) => [h, cells[j] === undefined || cells[j] === "" ? null : cells[j]]),
            );
            const page = Number(values.source_page);
            const besaranBad = input.table_type === "sbm" && !/^\d+$/.test(String(values.besaran ?? ""));
            if (required.some((c) => values[c] === null) || !Number.isInteger(page) || page < 1 || besaranBad) {
              errors++;
              return;
            }
            if (input.table_type === "sbm") values.besaran = Number(values.besaran);
            rows.push({ id: `${id}-r${i + 1}`, source_page: page, values });
          });
        }
        const table: StoredTable = {
          id,
          table_type: input.table_type,
          fiscal_year: input.fiscal_year,
          source_document_id: input.source_document_id,
          extraction_id: input.extraction_id ?? null,
          status: "draft",
          row_count: rows.length,
          error_count: errors,
          verification_note: input.verification_note.trim(),
          imported_at: iso(now()),
          activated_at: null,
          rows,
        };
        db.tables.unshift(table);
        return publicTable(table);
      }),
    listReferenceTables: (f = {}) =>
      withDb((db) => {
        requireRole(db, "rocan");
        return db.tables
          .filter((t) => !f.table_type || t.table_type === f.table_type)
          .filter((t) => !f.fiscal_year || t.fiscal_year === f.fiscal_year)
          .map(publicTable);
      }),
    listReferenceTableRows: (id, search) =>
      withDb((db) => {
        requireRole(db, "rocan");
        const table = db.tables.find((t) => t.id === id) ?? fail("NOT_FOUND", "Tabel acuan tidak ditemukan.");
        const q = search?.trim().toLowerCase();
        return clone(
          table.rows.filter((r) => !q || Object.values(r.values).some((v) => String(v ?? "").toLowerCase().includes(q))),
        );
      }),
    activateReferenceTable: (id) =>
      withDb((db) => {
        requireRole(db, "rocan");
        const table = db.tables.find((t) => t.id === id) ?? fail("NOT_FOUND", "Tabel acuan tidak ditemukan.");
        if (table.error_count > 0) fail("CONFLICT", "Tabel masih memiliki baris bermasalah. Perbaiki lalu impor ulang.");
        for (const other of db.tables) {
          if (other.table_type === table.table_type && other.fiscal_year === table.fiscal_year && other.status === "active") {
            other.status = "superseded";
          }
        }
        table.status = "active";
        table.activated_at = iso(now());
        return publicTable(table);
      }),

    // --- Kurasi -------------------------------------------------------------------
    listCurationSamples: (f = {}) =>
      withDb((db) => {
        requireRole(db, "rocan");
        return db.samples
          .filter((x) => !f.status || x.status === f.status)
          .filter((x) => !f.inspection_type || x.inspection_type === f.inspection_type)
          .filter((x) => !f.checklist_item_id || x.item_id === f.checklist_item_id)
          .map(({ input: _i, hasil_ai_item: _a, hasil_final_item: _f, note: _n, ...rest }) => {
            void _i;
            void _a;
            void _f;
            void _n;
            return clone(rest);
          });
      }),
    getCurationSample: (id) =>
      withDb((db) => {
        requireRole(db, "rocan");
        return clone(db.samples.find((x) => x.id === id) ?? fail("NOT_FOUND", "Sampel tidak ditemukan."));
      }),
    reviewCurationSample: (id, input) =>
      withDb((db) => {
        requireRole(db, "rocan");
        const sample = db.samples.find((x) => x.id === id) ?? fail("NOT_FOUND", "Sampel tidak ditemukan.");
        sample.status = input.status;
        sample.note = input.note?.trim() || null;
      }),
    createCurationExport: (input) =>
      withDb((db) => {
        requireRole(db, "rocan");
        const count = db.samples.filter(
          (x) => x.status === "approved" && (!input.inspection_types?.length || input.inspection_types.includes(x.inspection_type)),
        ).length;
        const t = now();
        const x: StoredExport = {
          export_id: uid("exp"),
          status: "pending",
          sample_count: count,
          sha256: null,
          created_at: iso(t),
          started: t,
          created: t,
        };
        db.exports.unshift(x);
        return publicExport(x);
      }),
    listCurationExports: () =>
      withDb((db) => {
        requireRole(db, "rocan");
        return db.exports.map(publicExport);
      }),
    downloadCurationExport: (id) =>
      withDb((db) => {
        requireRole(db, "rocan");
        const x = db.exports.find((e) => e.export_id === id) ?? fail("NOT_FOUND", "Ekspor tidak ditemukan.");
        if (x.status !== "succeeded") fail("CONFLICT", "Ekspor belum selesai.");
        // Demo: backend mengirim ZIP (dataset.jsonl + manifest.json); mock hanya JSONL.
        const lines = db.samples
          .filter((s) => s.status === "approved")
          .map((s) => JSON.stringify({ input: s.input, hasil_final: s.hasil_final_item }));
        return new Blob([lines.join("\n")], { type: "application/x-ndjson" });
      }),

    // --- Notifikasi ---------------------------------------------------------------
    listNotifications: () =>
      withDb((db) => {
        const user = me(db);
        return db.notifications.filter((n) => n.user_id === user.id && !n.is_read).map(publicNotification);
      }),
    getUnreadCount: () =>
      withDb((db) => {
        const user = me(db);
        return db.notifications.filter((n) => n.user_id === user.id && !n.is_read).length;
      }),
    markNotificationRead: (id) =>
      withDb((db) => {
        const user = me(db);
        const n = db.notifications.find((x) => x.id === id && x.user_id === user.id);
        if (!n) fail("NOT_FOUND", "Notifikasi tidak ditemukan.");
        n!.is_read = true;
      }),
  };
}
