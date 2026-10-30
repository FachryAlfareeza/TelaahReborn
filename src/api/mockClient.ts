import { z } from "zod";
import { ApiError, type ApiClient } from "./client";
import {
  sampleChecklist,
  sampleDocumentCategories,
  samplePriorityCategories,
  sampleReferenceDocuments,
  sampleRos,
  sampleScreening1, sampleScreening2,
  seedUsers,
  type SeedUser,
} from "./mockData";
import {
  checklistSchema,
  decisionSchema,
  documentCategorySchema,
  priorityCategorySchema,
  referenceDocumentSchema,
  roSchema,
  roleSchema,
  submissionSchema,
  userSchema,
  screening1ResultSchema,
  screening2ResultSchema,
} from "./schemas";
import type { Decision, Submission, User } from "../types";

/** Adapter mock: seluruhnya demo. Data disimpan di localStorage. */

const DB_KEY = "telaah-mock-db";
const SESSION_KEY = "telaah-mock-session";
const MAX_PDF_BYTES = 20 * 1024 * 1024;

type StoredSubmission = Submission & { processingStartedAt: number };

const dbSchema = z.object({
  users: z.array(
    userSchema.extend({ password: z.string() }),
  ),
  submissions: z.array(submissionSchema.extend({ processingStartedAt: z.number() })),
  decisions: z.array(decisionSchema),
  referenceDocuments: z.array(referenceDocumentSchema).default(() => sampleReferenceDocuments.map((d) => ({ ...d }))),
  ros: z.array(roSchema).default(() => sampleRos.map((r) => ({ ...r }))),
  documentCategories: z.array(documentCategorySchema).default(() => sampleDocumentCategories.map((c) => ({ ...c }))),
  priorityCategories: z.array(priorityCategorySchema).default(() => samplePriorityCategories.map((c) => ({ ...c, questionCodes: [...c.questionCodes] }))),
  checklist: checklistSchema.default(() => structuredClone(sampleChecklist)),
});
type Db = z.infer<typeof dbSchema>;

export type MockOptions = {
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  /** Lama simulasi "Terupload" menuju "Diperiksa", dalam milidetik. */
  processingMs?: number;
  now?: () => number;
};

const emptyContext = {
  fiscalYear: null,
  ministry: null,
  unit: null,
  programCode: null,
  programName: null,
  activityCode: null,
  activityName: null,
  kroCode: null,
  kroName: null,
  roCode: null,
  roName: null,
};

function toUser(u: SeedUser | Db["users"][number]): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active,
    satkerName: u.satkerName,
  };
}

export function createMockClient(options: MockOptions = {}): ApiClient {
  const storage = options.storage ?? globalThis.localStorage;
  const processingMs = options.processingMs ?? 8000;
  const now = options.now ?? Date.now;

  function seed(): Db {
    const submittedAt = new Date(now()).toISOString();
    const ro = sampleRos[0];
    return {
      users: seedUsers.map((u) => ({ ...u })),
      submissions: [
        {
          id: "s-contoh-1",
          status: "AWAITING_REVIEW",
          roCode: ro.code,
          satkerId: "u-satker",
          satkerName: "Satker Contoh",
          submittedAt,
          documents: [
            { id: "d-contoh-1-tor", type: "TOR", fileName: "tor-contoh.pdf", sizeBytes: 120000, pageCount: 6, previewUrl: null },
            { id: "d-contoh-1-rab", type: "RAB", fileName: "rab-contoh.pdf", sizeBytes: 80000, pageCount: 3, previewUrl: null },
          ],
          context: {
            ...emptyContext,
            fiscalYear: "2025",
            programCode: "01",
            programName: "Program Contoh (fiktif)",
            roCode: ro.code,
            roName: ro.description,
          },
          previousSubmissionId: null,
          processingStartedAt: 0,
        },
      ],
      decisions: [],
      referenceDocuments: sampleReferenceDocuments.map((d) => ({ ...d })),
      ros: sampleRos.map((r) => ({ ...r })),
      documentCategories: sampleDocumentCategories.map((c) => ({ ...c })),
      priorityCategories: samplePriorityCategories.map((c) => ({ ...c, questionCodes: [...c.questionCodes] })),
      checklist: structuredClone(sampleChecklist),
    };
  }

  function load(): Db {
    try {
      const raw = storage.getItem(DB_KEY);
      if (raw) {
        const parsed = dbSchema.safeParse(JSON.parse(raw));
        if (parsed.success) return parsed.data;
      }
    } catch {
      // data rusak: mulai ulang dari data contoh
    }
    const fresh = seed();
    save(fresh);
    return fresh;
  }

  function save(db: Db) {
    try {
      storage.setItem(DB_KEY, JSON.stringify(db));
    } catch {
      throw new ApiError("SERVER", "Penyimpanan lokal penuh atau tidak tersedia.");
    }
  }

  /** Simulasi pemrosesan: Terupload menjadi Diperiksa setelah jeda. */
  function advance(db: Db) {
    let changed = false;
    for (const s of db.submissions) {
      if (s.status === "PROCESSING" && now() - s.processingStartedAt >= processingMs) {
        s.status = "AWAITING_REVIEW";
        changed = true;
      }
    }
    if (changed) save(db);
  }

  function currentUser(db: Db): User {
    const id = storage.getItem(SESSION_KEY);
    const user = id ? db.users.find((u) => u.id === id && u.active) : undefined;
    if (!user) throw new ApiError("UNAUTHENTICATED", "Silakan masuk terlebih dahulu.");
    return toUser(user);
  }

  function requireReviewer(db: Db): User {
    const user = currentUser(db);
    if (user.role === "SATKER") {
      throw new ApiError("FORBIDDEN", "Anda tidak punya izin untuk tindakan ini.");
    }
    return user;
  }

  function requireAdmin(db: Db): User {
    const user = currentUser(db);
    if (user.role !== "SUPER_ADMIN") {
      throw new ApiError("FORBIDDEN", "Hanya Super Admin yang dapat melakukan tindakan ini.");
    }
    return user;
  }

  function strip(s: StoredSubmission): Submission {
    const { processingStartedAt: _ignored, ...rest } = s;
    void _ignored;
    return submissionSchema.parse(rest);
  }

  function findVisible(db: Db, user: User, id: string): StoredSubmission {
    const s = db.submissions.find((x) => x.id === id);
    // Satker hanya boleh melihat miliknya; selain itu tampil sebagai tidak ditemukan.
    if (!s || (user.role === "SATKER" && s.satkerId !== user.id)) {
      throw new ApiError("NOT_FOUND", "Data tidak ditemukan.");
    }
    return s;
  }

  function checkPdf(file: File, label: string) {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) throw new ApiError("INVALID_INPUT", `${label} harus berupa berkas PDF.`);
    if (file.size > MAX_PDF_BYTES) {
      throw new ApiError("INVALID_INPUT", `${label} terlalu besar. Maksimal 20 MB.`);
    }
  }

  return {
    mode: "mock",

    async login({ email, password }) {
      const db = load();
      const user = db.users.find((u) => u.email === email.trim().toLowerCase());
      if (!user || user.password !== password || !user.active) {
        throw new ApiError("UNAUTHENTICATED", "Email atau kata sandi salah.");
      }
      storage.setItem(SESSION_KEY, user.id);
      return toUser(user);
    },

    async register({ name, email, password, satkerName }) {
      const db = load();
      const mail = email.trim().toLowerCase();
      if (!name.trim() || !satkerName.trim() || !mail.includes("@")) {
        throw new ApiError("INVALID_INPUT", "Nama, satker, dan email wajib diisi dengan benar.");
      }
      if (password.length < 8) {
        throw new ApiError("INVALID_INPUT", "Kata sandi minimal 8 karakter.");
      }
      if (db.users.some((u) => u.email === mail)) {
        throw new ApiError("CONFLICT", "Email sudah terdaftar.");
      }
      const user = {
        id: `u-${now()}-${db.users.length}`,
        name: name.trim(),
        email: mail,
        password,
        role: roleSchema.parse("SATKER"),
        active: true,
        satkerName: satkerName.trim(),
      };
      db.users.push(user);
      save(db);
      storage.setItem(SESSION_KEY, user.id);
      return toUser(user);
    },

    async logout() {
      storage.removeItem(SESSION_KEY);
    },

    async changePassword({ currentPassword, newPassword }) {
      const db = load();
      const me = currentUser(db);
      const stored = db.users.find((u) => u.id === me.id);
      if (!stored || stored.password !== currentPassword) {
        throw new ApiError("INVALID_INPUT", "Kata sandi saat ini salah.");
      }
      if (newPassword.length < 8) {
        throw new ApiError("INVALID_INPUT", "Kata sandi baru minimal 8 karakter.");
      }
      stored.password = newPassword;
      save(db);
    },

    async getSession() {
      const db = load();
      const id = storage.getItem(SESSION_KEY);
      const user = id ? db.users.find((u) => u.id === id && u.active) : undefined;
      return user ? toUser(user) : null;
    },

    async listRos() {
      const db = load();
      currentUser(db);
      return db.ros.map((r) => ({ ...r }));
    },

    async listSubmissions() {
      const db = load();
      const user = currentUser(db);
      advance(db);
      return db.submissions
        .filter((s) => user.role !== "SATKER" || s.satkerId === user.id)
        .map(strip)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    },

    async getSubmission(id) {
      const db = load();
      const user = currentUser(db);
      advance(db);
      return strip(findVisible(db, user, id));
    },

    async createSubmission({ roCode, tor, rab, previousSubmissionId }) {
      const db = load();
      const user = currentUser(db);
      if (user.role !== "SATKER") {
        throw new ApiError("FORBIDDEN", "Hanya Satker yang dapat mengajukan.");
      }
      const ro = db.ros.find((r) => r.code === roCode && r.active);
      if (!ro) throw new ApiError("INVALID_INPUT", "Rincian Output tidak valid atau tidak aktif.");
      if (previousSubmissionId) {
        const prev = db.submissions.find((x) => x.id === previousSubmissionId && x.satkerId === user.id);
        if (!prev || prev.status !== "REJECTED") {
          throw new ApiError("INVALID_INPUT", "Pengajuan sebelumnya tidak ditemukan atau belum ditolak.");
        }
      }
      checkPdf(tor, "TOR");
      checkPdf(rab, "RAB");
      const t = now();
      const id = `s-${t}-${db.submissions.length}`;
      const stored: StoredSubmission = {
        id,
        status: "PROCESSING",
        roCode: ro.code,
        satkerId: user.id,
        satkerName: user.satkerName ?? user.name,
        submittedAt: new Date(t).toISOString(),
        documents: [
          { id: `${id}-tor`, type: "TOR", fileName: tor.name, sizeBytes: tor.size, pageCount: null, previewUrl: null },
          { id: `${id}-rab`, type: "RAB", fileName: rab.name, sizeBytes: rab.size, pageCount: null, previewUrl: null },
        ],
        context: { ...emptyContext, roCode: ro.code, roName: ro.description },
        previousSubmissionId: previousSubmissionId ?? null,
        processingStartedAt: t,
      };
      db.submissions.push(stored);
      save(db);
      return strip(stored);
    },

    async resubmitProcessing(submissionId) {
      const db = load();
      const user = requireReviewer(db);
      const s = findVisible(db, user, submissionId);
      if (s.status !== "PROCESSING_FAILED") {
        throw new ApiError("CONFLICT", "Hanya pemrosesan yang bermasalah yang bisa dikirim ulang.");
      }
      s.status = "PROCESSING";
      s.processingStartedAt = now();
      save(db);
      return strip(s);
    },
    async getScreening1(submissionId) {
      const db = load();
      const user = requireReviewer(db);
      advance(db);
      const s = findVisible(db, user, submissionId);
      if (s.status === "PROCESSING") {
        throw new ApiError("NOT_FOUND", "Hasil belum tersedia. Pengajuan masih diproses.");
      }
      return screening1ResultSchema.parse(sampleScreening1(s.id));
    },

    async getScreening2(submissionId) {
      const db = load();
      const user = requireReviewer(db);
      advance(db);
      const s = findVisible(db, user, submissionId);
      if (s.status === "PROCESSING") {
        throw new ApiError("NOT_FOUND", "Hasil belum tersedia. Pengajuan masih diproses.");
      }
      return screening2ResultSchema.parse(sampleScreening2(s.id));
    },

    async listDocumentCategories() {
      const db = load();
      requireReviewer(db);
      return db.documentCategories.map((c) => ({ ...c }));
    },

    async listReferenceDocuments() {
      const db = load();
      requireReviewer(db);
      return db.referenceDocuments.map((d) => ({ ...d }));
    },

    async addReferenceDocument({ categoryCode, title, file }) {
      const db = load();
      requireReviewer(db);
      if (!title.trim()) throw new ApiError("INVALID_INPUT", "Judul dokumen wajib diisi.");
      if (!db.documentCategories.some((c) => c.code === categoryCode)) {
        throw new ApiError("INVALID_INPUT", "Kategori dokumen tidak dikenal.");
      }
      checkPdf(file, "Dokumen acuan");
      const t = now();
      const doc = referenceDocumentSchema.parse({
        id: `r-${t}-${db.referenceDocuments.length}`,
        categoryCode,
        title: title.trim(),
        fileName: file.name,
        active: true,
        addedAt: new Date(t).toISOString(),
      });
      db.referenceDocuments.push(doc);
      save(db);
      return { ...doc };
    },

    async setReferenceDocumentActive(id, active) {
      const db = load();
      requireReviewer(db);
      const doc = db.referenceDocuments.find((d) => d.id === id);
      if (!doc) throw new ApiError("NOT_FOUND", "Data tidak ditemukan.");
      doc.active = active;
      save(db);
      return { ...doc };
    },

    async deleteReferenceDocument(id) {
      const db = load();
      requireReviewer(db);
      if (!db.referenceDocuments.some((d) => d.id === id)) {
        throw new ApiError("NOT_FOUND", "Data tidak ditemukan.");
      }
      db.referenceDocuments = db.referenceDocuments.filter((d) => d.id !== id);
      save(db);
    },

    async createRo({ code, description }) {
      const db = load();
      requireAdmin(db);
      const c = code.trim();
      if (!c) throw new ApiError("INVALID_INPUT", "Kode RO wajib diisi.");
      if (!description.trim()) throw new ApiError("INVALID_INPUT", "Deskripsi RO wajib diisi.");
      if (db.ros.some((r) => r.code === c)) throw new ApiError("CONFLICT", "Kode RO sudah dipakai.");
      const ro = { code: c, description: description.trim(), active: true };
      db.ros.push(ro);
      save(db);
      return { ...ro };
    },

    async updateRo(code, patch) {
      const db = load();
      requireAdmin(db);
      const ro = db.ros.find((r) => r.code === code);
      if (!ro) throw new ApiError("NOT_FOUND", "Data tidak ditemukan.");
      if (patch.description !== undefined) {
        if (!patch.description.trim()) throw new ApiError("INVALID_INPUT", "Deskripsi RO wajib diisi.");
        ro.description = patch.description.trim();
      }
      if (patch.active !== undefined) ro.active = patch.active;
      save(db);
      return { ...ro };
    },

    async deleteRo(code) {
      const db = load();
      requireAdmin(db);
      if (!db.ros.some((r) => r.code === code)) throw new ApiError("NOT_FOUND", "Data tidak ditemukan.");
      if (db.submissions.some((s) => s.roCode === code)) {
        throw new ApiError("CONFLICT", "RO ini sudah dipakai pengajuan. Nonaktifkan saja, jangan dihapus.");
      }
      db.ros = db.ros.filter((r) => r.code !== code);
      save(db);
    },

    async getChecklist() {
      const db = load();
      requireAdmin(db);
      return structuredClone(db.checklist);
    },

    async createChecklistItem(item) {
      const db = load();
      requireAdmin(db);
      const code = item.code.trim();
      if (!code) throw new ApiError("INVALID_INPUT", "Kode butir wajib diisi.");
      if (!item.title.trim()) throw new ApiError("INVALID_INPUT", "Judul butir wajib diisi.");
      if (db.checklist.items.some((i) => i.code === code)) {
        throw new ApiError("CONFLICT", "Kode butir sudah dipakai.");
      }
      if (item.parentCode && !db.checklist.items.some((i) => i.code === item.parentCode)) {
        throw new ApiError("INVALID_INPUT", "Butir induk tidak ditemukan.");
      }
      db.checklist.items.push({ ...item, code, title: item.title.trim(), source: item.source?.trim() || null });
      save(db);
      return structuredClone(db.checklist);
    },

    async updateChecklistItem(code, patch) {
      const db = load();
      requireAdmin(db);
      const item = db.checklist.items.find((i) => i.code === code);
      if (!item) throw new ApiError("NOT_FOUND", "Data tidak ditemukan.");
      if (patch.title !== undefined && !patch.title.trim()) {
        throw new ApiError("INVALID_INPUT", "Judul butir wajib diisi.");
      }
      if (patch.parentCode) {
        // Induk harus ada dan tidak boleh berupa butir itu sendiri atau turunannya.
        let cursor: string | null = patch.parentCode;
        while (cursor) {
          if (cursor === code) throw new ApiError("INVALID_INPUT", "Butir tidak bisa menjadi anak dirinya sendiri.");
          const next: string | null = db.checklist.items.find((i) => i.code === cursor)?.parentCode ?? null;
          if (!db.checklist.items.some((i) => i.code === cursor)) {
            throw new ApiError("INVALID_INPUT", "Butir induk tidak ditemukan.");
          }
          cursor = next;
        }
      }
      Object.assign(item, patch);
      if (patch.title !== undefined) item.title = patch.title.trim();
      if (patch.source !== undefined) item.source = patch.source?.trim() || null;
      save(db);
      return structuredClone(db.checklist);
    },

    async deleteChecklistItem(code) {
      const db = load();
      requireAdmin(db);
      if (!db.checklist.items.some((i) => i.code === code)) {
        throw new ApiError("NOT_FOUND", "Data tidak ditemukan.");
      }
      if (db.checklist.items.some((i) => i.parentCode === code)) {
        throw new ApiError("CONFLICT", "Butir ini masih punya anak. Hapus atau pindahkan anaknya lebih dulu.");
      }
      db.checklist.items = db.checklist.items.filter((i) => i.code !== code);
      save(db);
      return structuredClone(db.checklist);
    },

    async splitChecklistItem(code, titles) {
      const db = load();
      requireAdmin(db);
      const parent = db.checklist.items.find((i) => i.code === code);
      if (!parent) throw new ApiError("NOT_FOUND", "Data tidak ditemukan.");
      const clean = titles.map((t) => t.trim()).filter(Boolean);
      if (clean.length < 2) throw new ApiError("INVALID_INPUT", "Isi minimal dua judul untuk memecah butir.");
      const siblings = db.checklist.items.filter((i) => i.parentCode === code);
      let n = siblings.length;
      let order = siblings.reduce((max, i) => Math.max(max, i.order), 0);
      for (const title of clean) {
        let childCode: string;
        do {
          n += 1;
          childCode = `${code}.${n}`;
        } while (db.checklist.items.some((i) => i.code === childCode));
        order += 1;
        db.checklist.items.push({
          code: childCode,
          title,
          parentCode: code,
          order,
          requiredDocuments: [...parent.requiredDocuments],
          source: null,
          active: true,
        });
      }
      save(db);
      return structuredClone(db.checklist);
    },

    async listPriorityCategories() {
      const db = load();
      requireAdmin(db);
      return structuredClone(db.priorityCategories);
    },

    async updatePriorityCategory(category, patch) {
      const db = load();
      requireAdmin(db);
      const target = db.priorityCategories.find((c) => c.category === category);
      if (!target) throw new ApiError("NOT_FOUND", "Data tidak ditemukan.");
      if (patch.name !== undefined) {
        if (!patch.name.trim()) throw new ApiError("INVALID_INPUT", "Nama kategori wajib diisi.");
        target.name = patch.name.trim();
      }
      if (patch.questionCodes !== undefined) {
        const codes = [...new Set(patch.questionCodes.map((c) => c.trim().toUpperCase()).filter(Boolean))];
        if (codes.some((c) => !/^C(0[1-9]|1[0-2])$/.test(c))) {
          throw new ApiError("INVALID_INPUT", "Kode pertanyaan harus C01 sampai C12.");
        }
        if (category === 0 && codes.length > 0) {
          throw new ApiError("INVALID_INPUT", "Kategori 0 tidak punya pertanyaan.");
        }
        // Satu pertanyaan hanya milik satu kategori: pindahkan dari kategori lain.
        for (const other of db.priorityCategories) {
          if (other.category !== category) {
            other.questionCodes = other.questionCodes.filter((c) => !codes.includes(c));
          }
        }
        target.questionCodes = codes.sort();
      }
      save(db);
      return structuredClone(db.priorityCategories);
    },

    async createDocumentCategory({ code, name }) {
      const db = load();
      requireAdmin(db);
      const c = code.trim();
      if (!c) throw new ApiError("INVALID_INPUT", "Kode kategori wajib diisi.");
      if (!name.trim()) throw new ApiError("INVALID_INPUT", "Nama kategori wajib diisi.");
      if (db.documentCategories.some((x) => x.code === c)) {
        throw new ApiError("CONFLICT", "Kode kategori sudah dipakai.");
      }
      const created = { code: c, name: name.trim() };
      db.documentCategories.push(created);
      save(db);
      return { ...created };
    },

    async updateDocumentCategory(code, name) {
      const db = load();
      requireAdmin(db);
      const cat = db.documentCategories.find((x) => x.code === code);
      if (!cat) throw new ApiError("NOT_FOUND", "Data tidak ditemukan.");
      if (!name.trim()) throw new ApiError("INVALID_INPUT", "Nama kategori wajib diisi.");
      cat.name = name.trim();
      save(db);
      return { ...cat };
    },

    async deleteDocumentCategory(code) {
      const db = load();
      requireAdmin(db);
      if (!db.documentCategories.some((x) => x.code === code)) {
        throw new ApiError("NOT_FOUND", "Data tidak ditemukan.");
      }
      if (db.referenceDocuments.some((d) => d.categoryCode === code)) {
        throw new ApiError("CONFLICT", "Kategori ini masih dipakai dokumen acuan. Pindahkan atau hapus dokumennya dulu.");
      }
      db.documentCategories = db.documentCategories.filter((x) => x.code !== code);
      save(db);
    },

    async listUsers() {
      const db = load();
      requireAdmin(db);
      return db.users.map(toUser);
    },

    async createUser({ name, email, password, role, satkerName }) {
      const db = load();
      requireAdmin(db);
      const mail = email.trim().toLowerCase();
      if (!name.trim() || !mail.includes("@")) {
        throw new ApiError("INVALID_INPUT", "Nama dan email wajib diisi dengan benar.");
      }
      if (password.length < 8) throw new ApiError("INVALID_INPUT", "Kata sandi minimal 8 karakter.");
      if (role === "SATKER" && !satkerName?.trim()) {
        throw new ApiError("INVALID_INPUT", "Nama satker wajib diisi untuk akun Satker.");
      }
      if (db.users.some((u) => u.email === mail)) throw new ApiError("CONFLICT", "Email sudah terdaftar.");
      const user = {
        id: `u-${now()}-${db.users.length}`,
        name: name.trim(),
        email: mail,
        password,
        role,
        active: true,
        satkerName: role === "SATKER" ? (satkerName?.trim() ?? null) : null,
      };
      db.users.push(user);
      save(db);
      return toUser(user);
    },

    async updateUser(id, patch) {
      const db = load();
      const me = requireAdmin(db);
      const user = db.users.find((u) => u.id === id);
      if (!user) throw new ApiError("NOT_FOUND", "Data tidak ditemukan.");
      if (id === me.id && ((patch.role !== undefined && patch.role !== user.role) || patch.active === false)) {
        throw new ApiError("CONFLICT", "Anda tidak bisa mengubah peran atau menonaktifkan akun sendiri.");
      }
      if (patch.name !== undefined) {
        if (!patch.name.trim()) throw new ApiError("INVALID_INPUT", "Nama wajib diisi.");
        user.name = patch.name.trim();
      }
      if (patch.role !== undefined) user.role = patch.role;
      if (patch.active !== undefined) user.active = patch.active;
      save(db);
      return toUser(user);
    },

    async resetUserPassword(id, newPassword) {
      const db = load();
      requireAdmin(db);
      const user = db.users.find((u) => u.id === id);
      if (!user) throw new ApiError("NOT_FOUND", "Data tidak ditemukan.");
      if (newPassword.length < 8) throw new ApiError("INVALID_INPUT", "Kata sandi baru minimal 8 karakter.");
      user.password = newPassword;
      save(db);
    },

    async getDecision(submissionId) {
      const db = load();
      const user = currentUser(db);
      const s = findVisible(db, user, submissionId);
      return db.decisions.find((d) => d.submissionId === s.id) ?? null;
    },

    async saveDecision({ submissionId, decision, note }) {
      const db = load();
      const user = requireReviewer(db);
      if (user.role !== "ROCAN") {
        throw new ApiError("FORBIDDEN", "Hanya ROCAN yang dapat memutuskan.");
      }
      advance(db);
      const s = findVisible(db, user, submissionId);
      if (s.status !== "AWAITING_REVIEW") {
        throw new ApiError("CONFLICT", "Pengajuan ini belum bisa diputuskan.");
      }
      if (decision === "REJECTED" && !note.trim()) {
        throw new ApiError("INVALID_INPUT", "Catatan wajib diisi saat menolak.");
      }
      const saved: Decision = decisionSchema.parse({
        submissionId: s.id,
        decision,
        note: note.trim(),
        decidedBy: user.name,
        decidedAt: new Date(now()).toISOString(),
      });
      db.decisions.push(saved);
      s.status = decision;
      save(db);
      return saved;
    },
  };
}
