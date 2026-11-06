# Telaah Reborn: Lingkup Frontend (Dokumen Utama)

> Dokumen ini adalah acuan frontend Telaah Reborn. Bahasa semua teks di layar: **Bahasa Indonesia
> sederhana** untuk semua peran. Detail teknis disimpan di bagian belakang aplikasi (lihat 7).

> **Proyek ini hanya frontend (diputuskan 6 November 2026).** Jangan menulis, mengubah, atau
> merencanakan kode backend (FastAPI, pipeline reviu, Celery, database, Qdrant, LLM), baik di
> repo ini maupun di `tor-rab-ai-reviewer`. Backend dikerjakan tim lain. Frontend cukup
> mengikuti kontrak API mereka dan memakai adapter mock selama backend belum siap. Bila sebuah
> fitur butuh endpoint yang belum ada, catat kebutuhannya di `BACKEND-APPENDIX.md` bagian 4,
> jangan membangunnya.

> **Acuan yang mengikat (diputuskan 6 November 2026).** Bila dokumen ini berbeda dengan dokumen
> backend, yang menang adalah (urut): `tor-rab-ai-reviewer/docs/prd.md` (PRD v2.1), lalu
> `tor-rab-ai-reviewer/docs/api/contract.md` (kontrak API v2.1). Dokumen ini menurunkan isi
> keduanya untuk frontend, ditambah aturan yang hanya milik frontend (desain, penanda demo,
> bahasa). Nomor seperti "PRD §7.3" dan "K-25" merujuk dokumen tersebut.

---

## 1. Produk

Aplikasi untuk mereviu **TOR** (Kerangka Acuan Kerja) dan **RAB** (Rincian Anggaran Biaya) setiap
**Rincian Output (RO)** di Biro Perencanaan.

- Satker mengajukan program: hierarki anggaran, kategori usulan, judul, deskripsi, PDF TOR dan RAB.
- Reviu otomatis berjalan begitu pengajuan terkirim (PRD K-25), tanpa tombol tambahan.
- ROCAN memverifikasi hasil AI, mengedit hasil final, lalu memfinalisasi: **Setujui** atau
  **Minta revisi**, dengan kategori final.
- Hasil AI selalu **kandidat** dan tidak pernah berubah (Hasil_AI). Perubahan ROCAN disimpan
  terpisah (Hasil_Final) beserta riwayatnya. Satker hanya melihat hasil final setelah finalisasi.

### Alur sistem (pandangan frontend)

```
Satker mengisi formulir dan menekan "Kirim"
  -> status menunggu_review, lalu dalam_proses (otomatis bila ada checklist aktif)
  -> 8 tahap pipeline (T1–T8), frontend memantau progres lewat polling
  -> siap_diverifikasi: ROCAN memeriksa dan mengedit Hasil_Final
  -> ROCAN memfinalisasi: selesai_disetujui atau selesai_revisi
  -> selesai_revisi: Satker mengirim versi revisi (maks. 3 kali)
```

Satu-satunya aksi manual Satker adalah menekan **Kirim**. ROCAN hanya bisa menjalankan ulang
review yang **gagal** (`retry-review`).

---

## 2. Peran

| Peran | Tugas utama (PRD §5) |
|---|---|
| Satker | Mengajukan program, memantau progres, membaca hasil final, mengirim revisi. Hanya melihat pengajuan miliknya; dropdown dibatasi unitnya. |
| ROCAN | Memverifikasi dan memfinalisasi hasil, menjalankan ulang review gagal, mengelola checklist, dokumen acuan, tabel acuan (BAS/SBM), Master RO, dan kurasi data. |
| Super Admin | Mengelola akun dan peran, termasuk menetapkan Unit Eselon I/II akun Satker. **Tidak** memverifikasi pengajuan. |

Penjaga rute di frontend hanya untuk tampilan; pembatasan sebenarnya ada di backend.

### Masuk dan akun

- Masuk dengan **NIP dan kata sandi** (PRD FR-AUTH-01). Pesan gagal generik.
- **Tidak ada pendaftaran mandiri.** Semua akun dibuat Super Admin (PRD §7.2).
- Akun Satker wajib punya Unit Eselon I dan II yang dipilih dari daftar unit Master RO. Satker
  tidak bisa mengubah unitnya.
- Token access dan refresh disimpan di localStorage (PRD FR-AUTH-05, OQ-07). Saat 401, frontend
  mencoba refresh sekali, lalu kembali ke halaman masuk.
- Ganti kata sandi sendiri **belum ada** di kontrak; Super Admin mengatur ulang lewat Ubah akun.

### Tombol peran demo (sementara)

Halaman masuk memiliki **3 tombol, satu per peran** untuk masuk cepat. Tombol ini hanya tampil
pada adapter mock, wajib ditandai sesuai bagian 8, dan bisa dihapus tanpa mengubah logika masuk.

---

## 3. Status Pengajuan

Enam status dari kontrak §2 (`ReviewRequestStatus`). Label ditentukan satu fungsi pemetaan per
peran (`src/lib/status.ts`), bukan ditulis ulang di tiap komponen.

| Status (kontrak) | Satker melihat | ROCAN melihat | Arti |
|---|---|---|---|
| `menunggu_review` | Menunggu reviu | Menunggu reviu | Pengajuan diterima, review belum dimulai (mis. belum ada checklist aktif). |
| `dalam_proses` | Sedang direviu | Diproses AI | Pipeline berjalan. |
| `siap_diverifikasi` | Diperiksa ROCAN | Siap diverifikasi | Hasil AI siap, menunggu ROCAN. |
| `gagal` | Sedang direviu | Pemrosesan gagal | Hasil AI tidak dapat disusun. ROCAN bisa menjalankan ulang. |
| `selesai_revisi` | Perlu revisi | Perlu revisi | ROCAN meminta Satker memperbaiki. |
| `selesai_disetujui` | Disetujui | Disetujui | ROCAN menyetujui. |

Aturan UI:
- Status ditampilkan dengan **teks + ikon + warna**, tidak hanya warna.
- Kegagalan teknis tidak boleh tampil sebagai kesimpulan reviu. Satker tidak dilibatkan saat
  review gagal (kontrak §4.3), jadi baginya `gagal` tetap terbaca "Sedang direviu".

---

## 4. Model Reviu

### 4.1 Status hasil per item (PRD §13.2)

Hanya tiga, ditampilkan apa adanya:

| Status | Arti |
|---|---|
| Sesuai | Dokumen memenuhi kriteria. |
| Tidak Sesuai atau perlu revisi | Dokumen tidak memenuhi kriteria. |
| Terjadi Kesalahan pada proses | Pemeriksaan gagal secara teknis atau bahan tidak tersedia. **Bukan** kesimpulan reviu; selalu disertai `error_reason`. |

Setiap item hasil (`ResultItem`, kontrak §3.6.1) punya: kode tampilan, bagian, jenis pemeriksaan,
metode, pelaksana, status, penjelasan, bukti (`tor`/`rab`/dokumen acuan/tabel acuan, halaman,
kutipan verbatim bila ada), dan perhitungan untuk item tabel acuan (rumus, nilai, sumber angka).

### 4.2 Screening 1: bagian hasil (PRD FR-VER-02)

Hasil ditampilkan per bagian, berurutan:
1. **Format dan kelengkapan** (Lapis A, dari modul Tim 1),
2. **Substansi**,
3. **Kesesuaian TOR dan RAB**,
4. **Tabel acuan (BAS/SBM)**: dihitung deterministik, bukan oleh AI.

Item induk dan sub-item diambil dari relasi `parent_item_id` pada checklist versi yang dipakai.
Contoh sub-item 5W+1H pada II.C.1 disimpan sebagai **data checklist** (kolom `source`), bukan
ditulis di kode, karena pemetaannya bisa berubah.

### 4.3 Screening 2: verifikasi klaim kategori (PRD §8.9)

- Kategori usulan Satker adalah **klaim**: K1 RO Wajib, K2 RO Prioritas Strategis,
  K3 RO Strategis/Diskresioner, K4 RO Non-Strategis.
- Sistem memberi **kategori rekomendasi** dan status kesesuaian klaim (Sesuai bila sama,
  Tidak Sesuai atau perlu revisi bila berbeda, Terjadi Kesalahan pada proses bila gagal dinilai).
- Prioritas Nasional dari Master RO ditampilkan sebagai konteks, tidak menentukan kategori.
- **ROCAN menetapkan kategori final** saat finalisasi.
- Kategori 0 dan pertanyaan C01–C12 **tidak dipakai** (PRD K-20).

### 4.4 Progres

Delapan tahap (`extraction` sampai `aggregation`) dengan status `menunggu`, `berjalan`, `selesai`,
`gagal`, `dilewati`. Tampilkan tahap aktif, tahap selesai, dan durasi. **Tanpa persentase atau
perkiraan waktu** (PRD FR-PIPE-05). Polling tiap 5 detik selama `dalam_proses` (PRD FR-PRG-01).

---

## 5. Layar dan Komponen

### 5.1 Layar

**Umum**
- **Masuk**: NIP, kata sandi, 3 tombol peran demo (ditandai merah).
- **Kerangka aplikasi**: navigasi samping per peran, notifikasi dengan jumlah belum dibaca, nama dan
  NIP pengguna, keluar.
- **Notifikasi**: notifikasi belum dibaca, tandai dibaca, tautan ke pengajuan terkait.

**Satker**
- **Beranda Satker**: ringkasan jumlah per status, pengajuan terbaru, tombol "Ajukan Baru".
- **Ajukan Baru** (PRD §7.3), tiga bagian:
  - A. Hierarki anggaran: Tahun Anggaran (hanya tahun dengan dataset aktif) → Program → Kegiatan →
    KRO → RO (dropdown bertingkat, difilter unit akun). Unit Eselon I/II dan Prioritas hanya
    ditampilkan (read-only).
  - B. Judul atau nama usulan (wajib), Deskripsi (wajib), Kategori usulan K1–K4 (wajib).
  - C. PDF TOR dan RAB (wajib): ekstensi `.pdf`, MIME `application/pdf`, signature `%PDF-`, tidak
    kosong, maks. 20 MB.
- **Pengajuan Saya**: tabel + saring status.
- **Detail Pengajuan (Satker)**: berkas (pratinjau dan unduh), hierarki anggaran, progres saat
  berjalan, hasil final setelah finalisasi (keputusan, kategori final, item hasil final), formulir
  revisi bila `selesai_revisi`, riwayat versi. **Tidak** menampilkan hasil AI atau bagian teknis.

**ROCAN**
- **Beranda ROCAN**: ringkasan semua status; antrean siap diverifikasi, gagal, sedang diproses,
  menunggu reviu.
- **Daftar Pengajuan**: saring status, tahun anggaran, kode program/kegiatan/KRO/RO, kategori
  usulan, rentang tanggal (PRD FR-REQ-03).
- **Detail Reviu** (layar terpenting, lihat 5.3).
- **Checklist**: daftar versi, satu aktif; lihat item; buat versi baru (dari salinan); ubah versi
  yang belum dipakai; aktifkan.
- **Dokumen Acuan**: unggah PDF/XLSX dengan jenis, judul, nomor, tahun berlaku, status berlaku;
  pantau ingestion; nonaktifkan, aktifkan kembali, ingest ulang. Tidak ada hapus.
- **Tabel Acuan**: ekstraksi tabel kandidat → unduh CSV → verifikasi manusia → impor → aktifkan.
- **Master RO**: impor dataset RENJA (CSV/XLSX) per tahun, laporan masalah per baris, aktivasi.
- **Kurasi Data**: tinjau sampel (hasil AI vs hasil final), setujui/tolak, ekspor dataset.

**Super Admin**
- **Akun Pengguna**: daftar dengan saring peran; buat, ubah, nonaktifkan; atur ulang kata sandi;
  unit Satker dipilih dari `GET /master-data/units`.

**Bagian belakang (teknis)** untuk ROCAN: lihat 7.

### 5.2 Komponen bersama

| Komponen | Fungsi |
|---|---|
| `StatusBadge` | Status pengajuan dengan teks + ikon + warna, label menurut peran. |
| `VerdictBadge` | Status hasil per item (tiga status resmi). |
| `DocumentPair` | TOR dan RAB: nama, ukuran, pratinjau, unduh lewat endpoint unduh. |
| `PdfPreviewModal` | Pratinjau PDF, bisa dibuka di halaman bukti; halaman di luar batas dibatasi ke halaman terakhir. |
| `UploadDropzone` | Unggah satu berkas; bawaannya validasi PDF sesuai PRD §7.3. |
| `ProgramContextPanel` | Snapshot hierarki: tahun, unit, program, kegiatan, KRO, RO, prioritas, kategori klaim, deskripsi. |
| `ProgressPanel` | Delapan tahap pipeline tanpa persentase. |
| `ResultSections` | Hasil per bagian, induk dan sub-item. |
| `ResultItemView` | Satu item: status, penjelasan, alasan galat, perhitungan, bukti. |
| `EvidenceQuote` | Kutipan, sumber, halaman, tautan ke pratinjau. |
| `Screening2View` | Klaim, rekomendasi, kesesuaian, bukti. |
| `AiCandidateTag` | Label "Hasil AI (kandidat)". |
| `DataTable` | Tabel semantik dengan urutan dan halaman. |
| `EmptyState`, `LoadingState`, `ErrorState` | Tiga keadaan, bahasa tenang dan jelas. |
| `ConfirmDialog` | Konfirmasi tindakan berisiko (finalisasi, aktivasi, nonaktifkan akun). |
| `DemoOnly` | Pembungkus penanda demo (lihat 8). |

### 5.3 Detail Reviu (ROCAN)

Urutan dari atas ke bawah:

1. Header: judul usulan, Satker, unit, tanggal, versi, status.
2. Berkas TOR dan RAB.
3. Hierarki anggaran.
4. Progres (saat menunggu, berjalan, atau gagal). Bila gagal: penjelasan bahwa ini bukan
   kesimpulan reviu, dan tombol "Jalankan ulang review".
5. Screening 1: Hasil_Final per item. Item yang berbeda dari Hasil_AI ditandai "Diubah ROCAN"
   beserta status AI semula. Tombol "Ubah hasil" per item: status, penjelasan, dan alasan
   (wajib bila status berubah). Simpan memakai `expected_revision`; bentrok revisi (409) meminta
   muat ulang.
6. Screening 2: klaim, rekomendasi, kesesuaian, bukti.
7. Keputusan ROCAN: Setujui / Minta revisi, kategori final (wajib), catatan (wajib saat minta
   revisi), dengan konfirmasi. Hanya dari `siap_diverifikasi`.
8. Riwayat perubahan: siapa, kapan, nilai lama/baru, alasan.
9. Bagian belakang teknis (tersembunyi di balik tombol, lihat 7).

Hasil AI dan keputusan ROCAN selalu tampil **terpisah** dan berlabel jelas.

---

## 6. Lapisan Data (API)

- Semua akses data lewat satu klien API dengan antarmuka tetap (`src/api/client.ts`) yang
  mengikuti kontrak §3 endpoint demi endpoint.
- Adapter `real`: prefix `/api/v1`, `Authorization: Bearer`, refresh token sekali saat 401, pesan
  `{"detail": ...}` dari server dipakai apa adanya. Adapter `mock`: meniru aturan kontrak
  (peran, kepemilikan 404, filter unit, validasi berkas, batas resubmisi, bentrok revisi) dengan
  data di `localStorage`. Dipilih lewat `VITE_API_MODE`, alamat lewat `VITE_API_URL` (tanpa
  `/api/v1`).
- Skema respons ditulis dengan zod memakai **nama bidang kontrak (snake_case)**; tipe diturunkan
  dari skema. Respons dianggap tidak tepercaya: bidang tak dikenal ditolak dengan pesan jelas.
- Aturan data: kode anggaran selalu string (nol di depan tidak hilang), waktu RFC 3339, rupiah
  diformat di satu tempat, `null` tampil "—".
- Path storage tidak pernah diterima dari server; berkas diambil lewat
  `GET /review-requests/{id}/documents/{tor|rab}`.
- Jangan menaruh rahasia di variabel `VITE_*`.

### Daftar rute

| Peran | Rute |
|---|---|
| Umum | `/masuk`, `/notifikasi`, 403, 404 |
| Satker | `/satker`, `/satker/ajukan`, `/satker/pengajuan`, `/satker/pengajuan/:id` |
| ROCAN | `/rocan`, `/rocan/pengajuan`, `/rocan/pengajuan/:id`, `/rocan/checklist`, `/rocan/acuan`, `/rocan/tabel-acuan`, `/rocan/master-ro`, `/rocan/kurasi` |
| Super Admin | `/admin/pengguna` |

---

## 7. Bagian Belakang Aplikasi (Detail Teknis)

Hanya untuk ROCAN, tersembunyi di balik tombol:

- run, jalur ekstraksi (`team1`/`docling_fallback`), versi checklist,
- provenance: versi skema ekstraksi, versi aturan Lapis A, tabel acuan yang dipakai, model LLM,
  model embedding, versi prompt,
- JSON mentah hasil dan progres, unduh JSON.

Aturan: area ini tidak boleh dibutuhkan untuk memahami hasil.

---

## 8. Penanda Komponen Demo

Semua komponen yang hanya untuk demo **wajib** ditandai dengan cara yang sama dan mencolok:

- Garis tepi **merah terang** (`#FF0000`, 3px, garis penuh, sudut siku tanpa lengkung) di sekeliling komponen.
- Label kecil "DEMO" berlatar merah di pojok komponen.
- Atribut `data-demo="true"` pada elemen akar.
- Dibungkus komponen `DemoOnly`, sehingga semua penanda bisa dicari dan dihapus sekaligus.
- Kelas CSS bersama `.demo-flag`. Warna merah terang **tidak boleh dipakai** untuk hal lain
  di desain, agar penanda tetap unik.
- Satu flag lingkungan (`VITE_SHOW_DEMO`) menyalakan atau mematikan semua komponen demo.

Daftar demo saat ini:
1. 3 tombol peran di halaman Masuk.
2. Adapter data mock dan penanda sumber data.
3. Data contoh bawaan (`src/api/mockData.ts`): kode, unit, dan isi dokumen karangan, bukan data klien.

---

## 9. Sistem Desain

Tema utama: **biru muda (baby blue)**. Selain itu bebas, selama konsisten. Tidak mengikuti
desain ROCAN lama. Token ada di `src/styles/index.css`.

### 9.1 Prinsip
1. Sederhana: satu tugas per layar, bahasa sehari-hari.
2. Tenang dan ramah: ruang kosong cukup. Kartu dan panel putih polos, tanpa garis tepi dan tanpa bayangan.
3. Jujur: hasil AI selalu berlabel kandidat, data kosong ditampilkan apa adanya.
4. Terbaca: status tidak hanya warna, kontras cukup, fokus keyboard terlihat.
5. Responsif: nyaman di laptop dan tablet. Ponsel didukung untuk Satker.

### 9.2 Warna

| Peran warna | Nilai | Pakai untuk |
|---|---|---|
| Biru muda dasar | `#DBEAF6` | Sorotan, garis di navigasi |
| Biru muda pucat | `#EEF5FB` | Navigasi samping (latar halaman putih) |
| Biru utama | `#2B74AD` | Tombol utama, tautan, fokus |
| Biru tua | `#1B4F78` | Nama aplikasi, menu aktif (judul memakai warna teks) |
| Teks | `#18222D` | Teks isi dan judul |
| Teks sekunder | `#5C6875` | Keterangan |
| Garis | `#E3E8EE` (tegas `#CBD5DF`) | Pemisah antarbagian, batas input |
| Sukses | `#1F7A52` | Disetujui, Sesuai |
| Peringatan | `#9A6700` | Siap diverifikasi, Terjadi Kesalahan pada proses |
| Galat | `#C23B3B` | Perlu revisi, Tidak Sesuai, Pemrosesan gagal |
| Info | `#2B74AD` | Menunggu reviu, Diproses AI |
| **Penanda demo** | `#FF0000` | **Khusus komponen demo, jangan dipakai lain** |

Periksa kontras teks minimal 4.5:1. Galat `#C23B3B` sengaja berbeda dari merah demo. Bagian
halaman dipisah garis tipis antarbagian, bukan kotak; tidak ada kartu bergaris tepi, berlatar biru, atau berbayangan.

### 9.3 Tipografi
- Font Inter, dilayani sendiri.
- Skala: 12 / 14 / 16 (isi) / 20 / 24 / 32. Judul tebal, isi reguler.
- Angka tabel memakai angka tabular.

### 9.4 Tata letak dan bentuk
- Grid 8px. Sudut membulat 12px (kartu), 6px (input, tombol).
- Kerangka: navigasi samping tetap di layar lebar, menu ringkas di layar kecil.

### 9.5 Pola interaksi
- Satu tombol utama per layar. Tombol berisiko meminta konfirmasi.
- Status proses berjalan memakai indikator kemajuan lembut, bukan spinner penuh layar.
- Pesan galat menjelaskan apa yang terjadi dan apa yang bisa dilakukan.
- Gerak halus dan singkat, hormati `prefers-reduced-motion`.

### 9.6 Aksesibilitas
- Tabel semantik dengan header berlingkup, kontrol berlabel, urutan fokus logis.
- Dialog dengan peran dan jebakan fokus yang benar.
- Ini pemeriksaan praktis, bukan klaim kepatuhan WCAG penuh.

---

## 10. Keputusan dan Hal yang Belum Pasti

Sudah diputuskan (6 November 2026, menyelaraskan dengan PRD v2.1 dan kontrak v2.1):
1. Tidak ada pendaftaran mandiri; akun dibuat Super Admin; masuk dengan NIP.
2. Keputusan akhir ROCAN: `selesai_disetujui` (Disetujui) atau `selesai_revisi` (Perlu revisi).
   Tidak ada "Ditolak". Revisi dikirim sebagai versi baru yang tertaut (maks. 3 kali); RO lain =
   pengajuan baru.
3. Review gagal: ROCAN menjalankan ulang (`retry-review`). Satker tetap melihat "Sedang direviu".
4. Satker hanya melihat Hasil_Final setelah finalisasi, tidak pernah Hasil_AI.
5. Super Admin hanya mengelola akun; checklist, Master RO, dokumen dan tabel acuan, serta kurasi
   dikelola ROCAN.
6. Pembaruan progres memakai polling (PRD K-18), 5 detik.
7. Kategori K1–K4; Kategori 0 dan C01–C12 tidak dipakai (PRD K-20).
8. Pengelolaan "kategori dokumen" dan "Master RO per baris" yang ada di rancangan lama dihapus;
   jenis dokumen acuan mengikuti enum `doc_type` kontrak, dan Master RO dikelola per dataset.

Masih terbuka (lihat juga PRD §17):
- Bentuk `ReferenceTableVersion` dan baris tabel acuan (kontrak §3.9 belum merinci).
- Endpoint ganti kata sandi sendiri (belum ada di kontrak).
- Pemetaan 5W+1H dan pemecahan checklist bisa berubah; tetap disimpan sebagai data checklist.

---

## 11. Di Luar Lingkup Frontend

Seluruh backend berada di luar lingkup proyek ini: API FastAPI, autentikasi di server, basis
data, antrean tugas, ekstraksi PDF, chunking, retrieval, embedding, model LLM, dan verifier.
Ringkasan ada di `BACKEND-APPENDIX.md` agar tim frontend paham konteks, bukan untuk dibangun.
Pekerjaan backend yang pernah dimulai di `tor-rab-ai-reviewer` sudah dibatalkan (6 November
2026).
