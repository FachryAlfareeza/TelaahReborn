# Teknologi

Stack (diputuskan): React 19 + TypeScript + Vite (SPA, bukan Next.js) + Tailwind CSS 4.
Alasan tidak memakai Next.js: aplikasi ini dasbor yang butuh login, tidak butuh SEO atau render
server, dan backend sudah terpisah (FastAPI). Satu server statis lebih sederhana dan lebih aman
untuk aturan rahasia di bawah.

## Pustaka
| Area | Pilihan |
|---|---|
| Routing | react-router-dom 7, rute dijaga per peran |
| Ikon | lucide-react |
| Validasi | zod 4 (skema ditulis tangan, tipe diturunkan dari skema) |
| Data server | TanStack Query (polling status, cache, retry) |
| Pratinjau PDF | react-pdf (pdf.js), dibungkus `PdfPreviewModal` agar mudah diganti |
| Mutu | ESLint, Vitest, Testing Library |
| Font | Inter atau Plus Jakarta Sans, dilayani sendiri (tanpa permintaan ke pihak ketiga) |

Tipe dari skema OpenAPI FastAPI boleh dibuat otomatis nanti, setelah kontrak backend stabil.
Zod tetap dipakai sebagai pemeriksaan saat berjalan.

## Konfigurasi (env)
- `VITE_API_MODE`: `mock` atau `real`. Memilih adapter klien API.
- `VITE_API_URL`: alamat FastAPI (dipakai saat `real`).
- `VITE_SHOW_DEMO`: menyalakan semua komponen demo.
- Semua nilai di atas bukan rahasia. Jangan menaruh rahasia di `VITE_*`.

## Mock sementara
- Daftar, masuk, dan pengajuan disimpan di `localStorage` oleh adapter mock.
- Sesi diakses lewat klien API, bukan langsung dari komponen, agar mudah diganti ke autentikasi
  backend (cookie HttpOnly atau token dari backend).
- Adapter mock, data contoh, dan penanda sumber data adalah komponen demo (lihat
  demo-flagging.md).

## Aturan
- Semua akses data lewat satu klien API dengan antarmuka tetap. Sediakan adapter mock (JSON
  contoh berbentuk hasil Screening 1 dan 2) yang bisa diganti lewat konfigurasi.
- Anggap respons API tidak tepercaya: validasi bentuk, tolak bidang tak dikenal dengan pesan
  jelas, jangan sampai crash.
- Kode tetap string (nol di depan). Uang IDR diformat di satu utilitas. Tanggal ISO, tampil lewat
  satu utilitas. `null` tampil "—", jangan mengarang nilai.
- Jangan menaruh rahasia di variabel `VITE_*` (terkirim ke browser).
- Jangan commit dokumen asli TOR/RAB/checklist/regulasi, `.env`, atau kredensial.
- Aksesibilitas praktis: tabel semantik, kontrol berlabel, fokus terlihat, status tidak hanya warna.
  Jangan klaim kepatuhan WCAG penuh.
- Perintah build, lint, dan test dijalankan sebelum menyatakan pekerjaan selesai.
