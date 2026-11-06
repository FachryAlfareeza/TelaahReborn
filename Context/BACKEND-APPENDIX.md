# Lampiran Backend (Bukan Lingkup Frontend)

> Konteks agar tim frontend memahami apa yang terjadi di belakang layar dan data apa yang akan
> datang. Tidak untuk dibangun di frontend.
>
> **Proyek ini hanya frontend.** Backend dikerjakan tim lain, dan kita tidak menulis kode backend
> di repo mana pun. Lampiran ini hanya bahan bacaan. Kebutuhan baru dari frontend dicatat di
> bagian 4.
>
> **Sumber kebenaran** ada di repo backend `tor-rab-ai-reviewer`: `docs/prd.md` (PRD v2.1),
> `docs/api/contract.md` (kontrak API v2.1), dan `docs/api/runtime-status.md` (apa yang benar-benar
> sudah jalan). Lampiran ini hanya ringkasan; bila berbeda, dokumen backend yang benar.

## 1. Alur Pemrosesan (PRD §7.4)

1. Satker mengirim pengajuan (multipart: hierarki, judul, deskripsi, kategori, TOR, RAB).
2. Backend memvalidasi ulang hierarki terhadap Master RO dan unit akun, lalu membuat pengajuan
   `menunggu_review` dan **langsung memicu review** bila ada checklist aktif (K-25).
3. Pipeline Celery, 8 tahap: T1 ekstraksi TOR/RAB (modul in-repo Tim 1, fallback Docling),
   T2 Lapis A (format), T3 sectioning, T4 tabel acuan (BAS/SBM, deterministik), T5 retrieval
   dokumen acuan (Qdrant), T6 penilaian substansi (LLM + rubrik, kutipan divalidasi),
   T7 Screening 2 (verifikasi klaim K1–K4), T8 agregasi.
4. Selesai → `siap_diverifikasi`. Hasil_AI tersimpan tetap; Hasil_Final dibuat sebagai salinan
   untuk diedit ROCAN.
5. Gagal total → `gagal`, ROCAN diberi notifikasi dan bisa `retry-review`.
6. ROCAN memfinalisasi → `selesai_disetujui` / `selesai_revisi`; Satker diberi notifikasi in-app
   dan email; sampel kurasi dibuat per item.

## 2. Prinsip yang Memengaruhi Tampilan

- Status hasil per item hanya: `Sesuai`, `Tidak Sesuai atau perlu revisi`,
  `Terjadi Kesalahan pada proses` (PRD §13.2).
- Kegagalan satu item tidak menggagalkan review; item itu diberi `Terjadi Kesalahan pada proses`
  dengan `error_reason` (FR-PIPE-04).
- Item BAS/SBM dinilai lewat tabel acuan terverifikasi, bukan LLM, dan menyertakan perhitungan
  (FR-TBL-07).
- Kutipan bukti selalu diverifikasi ada pada sumbernya (FR-RAG-03).
- Hasil tidak pernah sampai ke Satker tanpa finalisasi ROCAN (FR-VER-03).
- Dokumen asli TOR, RAB, checklist, regulasi, dan dataset RENJA tidak boleh masuk repositori.

## 3. Kondisi Runtime Backend (per 6 November 2026)

Menurut `runtime-status.md` backend, runtime belum sepenuhnya memakai kontrak. Yang perlu
diperhatikan saat beralih ke `VITE_API_MODE=real`:

- Respons akun runtime memakai bidang datar `unit_eselon1_code`/`_name`, sedangkan kontrak memakai
  objek `unit_eselon1: {code, name}`. Frontend mengikuti **kontrak**; skema zod akan menolak
  bentuk lama sampai backend diselaraskan.
- Endpoint Master RO cascading, pemicuan otomatis, progres, `retry-review`, dokumen acuan v2, tabel
  acuan, kurasi, dan `unread-count` berstatus "Baru" di kontrak; sebagian belum ada di runtime.
- `ChecklistVersionResponse` runtime belum selalu membawa `section`, `method`, `executor` per item;
  frontend menerimanya sebagai null.

## 4. Kebutuhan Frontend yang Belum Diatur Kontrak

Dicatat untuk tim backend; frontend tidak membangunnya.

| Kebutuhan | Kondisi di frontend |
|---|---|
| Bentuk `ReferenceTableVersion` dan baris tabel (kontrak §3.9 hanya menyebut nama) | Frontend memakai usulan: `{id, table_type, fiscal_year, source_document_id, extraction_id, status, row_count, error_count, verification_note, imported_at, activated_at}`; baris `{id, source_page, values}`. Perlu dikonfirmasi. |
| Rincian sampel kurasi (`GET /curation/samples/{id}`) | Frontend memakai `input` (objek bebas), `hasil_ai_item`, `hasil_final_item`, `note`. Perlu dikonfirmasi. |
| Ganti kata sandi oleh pengguna sendiri | Belum ada endpoint; fitur disembunyikan. Super Admin dapat mengatur ulang lewat `PUT /users/{id}`. |
| Status ekspor kurasi selain `pending` | Frontend mengharapkan `pending/processing/succeeded/failed`, `sample_count`, `sha256`, `created_at`. |
| Catatan finalisasi untuk Satker | Kontrak menyimpan `note` hanya di riwayat (ROCAN). Satker kini hanya membaca penjelasan per item. Bila Satker perlu membaca catatan revisi, `GET /result` versi Satker perlu menyertakannya. |
