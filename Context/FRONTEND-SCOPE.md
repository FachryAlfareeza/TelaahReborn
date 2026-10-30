# Telaah Reborn: Lingkup Frontend (Dokumen Utama)

> Dokumen ini adalah acuan untuk menulis frontend baru dari nol. Frontend ini berdiri sendiri
> dan tidak bergantung pada kode frontend lama. Bahasa semua teks di layar: **Bahasa Indonesia
> sederhana** untuk semua peran. Detail teknis disimpan di bagian belakang aplikasi (lihat 7).

---

## 1. Produk

Aplikasi untuk mereviu **TOR** (Kerangka Acuan Kerja) dan **RAB** (Rencana Anggaran Biaya) setiap
**Rincian Output (RO)** di Biro Perencanaan.

- Satker mengunggah TOR dan RAB.
- Sistem AI memeriksa otomatis (Screening 1 dan Screening 2).
- ROCAN memeriksa hasilnya dan memutuskan: diterima atau ditolak.
- Hasil AI selalu **kandidat**. Keputusan final ada di ROCAN (manusia).

### Alur sistem (pandangan frontend)

```
Satker unggah PDF (TOR + RAB) lalu tekan "Kirim"
  -> dokumen diproses di sistem (vector DB): TOR dibandingkan dengan RAB,
     lalu dengan dokumen acuan (sudah diekstrak menjadi JSON terpotong)
  -> Screening 1 dan Screening 2 jalan otomatis, tanpa tombol tambahan
  -> hasil dikirim ke frontend lewat API
  -> ROCAN memeriksa dan memutuskan
```

Satu-satunya aksi manual Satker adalah menekan tombol **Kirim**. Setelah itu proses berjalan
sendiri.

---

## 2. Peran

| Peran | Tugas utama |
|---|---|
| Satker | Mengunggah TOR dan RAB, memantau status pengajuan. |
| ROCAN | Memeriksa hasil AI, memberi keputusan (Diterima / Ditolak) dan catatan. Mengelola dokumen acuan. |
| Super Admin | Semua kemampuan ROCAN, ditambah pengelolaan data master: Master RO, checklist, kategori, akun pengguna. |

Pembagian utama di UI: **Super Admin** atau **bukan Super Admin**. Menu pengelolaan hanya
tampil untuk Super Admin.

### Tombol peran demo (sementara)

Halaman masuk/daftar memiliki **3 tombol, satu per peran** (Satker, ROCAN, Super Admin) untuk
masuk cepat. Tombol ini **hanya untuk demo** dan wajib ditandai sesuai aturan di bagian 8.
Tombol ini harus mudah dihapus tanpa mengubah logika login asli.

---

## 3. Status Pengajuan

Satu pengajuan, dua sudut pandang. Label berbeda, kondisi sama.

| Satker melihat | ROCAN dan Super Admin melihat | Arti |
|---|---|---|
| Terupload | Diproses AI | Berkas diterima, Screening 1 dan 2 sedang berjalan. |
| Diperiksa | Menunggu Pemeriksaan | AI selesai, menunggu keputusan ROCAN. |
| Diterima | Diterima | ROCAN menerima. |
| Ditolak | Ditolak | ROCAN menolak, disertai catatan. |

Aturan UI:
- Label status ditentukan dari peran pengguna lewat satu fungsi pemetaan, bukan ditulis ulang
  di tiap komponen.
- Status ditampilkan dengan **teks + ikon + warna**, tidak hanya warna.
- Kegagalan sistem (misal pemrosesan gagal) tidak boleh tampil sebagai kesimpulan reviu.
  Tampilkan sebagai "Pemrosesan bermasalah" dengan opsi kirim ulang untuk ROCAN/Super Admin.
  (Sudah dikonfirmasi, lihat bagian 10.)

---

## 4. Model Reviu

### 4.1 Screening 1: kualitas isi TOR/RAB

Checklist berbentuk **induk dengan banyak anak**. Status induk diturunkan dari anak-anaknya.

Jawaban per butir: `PASS` (Sesuai), `NOT_PASS` (Belum sesuai), `INSUFFICIENT_EVIDENCE`
(Bukti kurang). Tampilkan dengan label Indonesia sederhana.

Setiap jawaban punya:
- **Kutipan bukti** persis dari dokumen (maks. 40 kata),
- **sumber**: jenis dokumen (TOR / RAB / Acuan) dan nomor halaman,
- **rekomendasi** bila Belum sesuai.

Induk awal (boleh bertambah, karena checklist dapat dipecah lebih teknis oleh Super Admin):

| Kode | Isi singkat | Dokumen yang dikutip |
|---|---|---|
| II.A.1 | Selaras dengan prioritas nasional, Renstra, dan arahan | TOR + Acuan |
| II.C.1 | Latar belakang dan rincian output dijelaskan lengkap | TOR |
| II.C.2 | Manajemen risiko dan mitigasi | TOR + Acuan |
| IV.A.1 | RAB menjabarkan kebutuhan TOR | TOR + RAB |
| IV.B.1 | Kode akun sesuai standar | RAB + Acuan |
| IV.C.1 | Harga satuan tidak melebihi standar biaya | RAB + Acuan |

**Anak dari II.C.1 (kelengkapan penjelasan RO, versi 5W+1H yang direvisi):**

| Unsur | Dicari di bagian TOR |
|---|---|
| Apa (What) | Latar belakang: gambaran umum |
| Mengapa (Why) | Latar belakang: dasar hukum dan gambaran umum |
| Siapa (Who) | Penerima manfaat |
| Kapan (When) | Tahapan dan waktu pelaksanaan |
| Di mana (Where) | Metode pelaksanaan: rincian lokasi |
| Bagaimana (How) | Metode pelaksanaan |

> Catatan: pemetaan ini bisa berubah lagi (kemungkinan dibatalkan). Simpan sebagai data
> checklist yang bisa diedit, **jangan ditulis permanen di kode komponen**.

**Anak dari II.C.2 (manajemen risiko, bagian 2B.2):** diperiksa per bagian/section TOR,
masing-masing menjadi sub-butir sendiri.

### 4.2 Screening 2: kategori prioritas RO

- 12 pertanyaan (C01 sampai C12), diperiksa berurutan per kelompok kategori.
- Jawaban: `MATCH`, `NO_MATCH`, `INSUFFICIENT_EVIDENCE`.
- Hasil: **Kategori 1, 2, 3, 4**, atau **Kategori 0** (perlu pemeriksaan manual).
- Kategori pertama yang `MATCH` menang. Bukti kurang tidak otomatis menjadi Kategori 4.

| Kategori | Pertanyaan | Contoh |
|---|---|---|
| 1 | C01 sampai C03 | Prioritas nasional, belanja wajib, layanan publik |
| 2 | C04 sampai C10 | Operasional, PNBP, multiyears, dukungan manajemen, arahan |
| 3 | C11 | Program prioritas kementerian |
| 4 | C12 | Tidak terkait langsung (cadangan) |

Tampilkan: kategori hasil, pertanyaan penentu, status per pertanyaan, kutipan bukti.

### 4.3 Dua jenis status pada hasil

- **Status isi**: Sesuai / Belum sesuai / Bukti kurang (Screening 1); Cocok / Tidak cocok /
  Bukti kurang (Screening 2).
- **Status teknis**: normal, atau salah model, gagal baca, gagal verifikasi. Tampil terpisah.

---

## 5. Layar dan Komponen

### 5.1 Layar

**Umum**
- **Masuk / Daftar**: formulir masuk, daftar, dan 3 tombol peran demo (ditandai merah).
- **Kerangka aplikasi**: navigasi samping atau atas sesuai peran, nama pengguna, keluar,
  ganti kata sandi.

**Satker**
- **Beranda Satker**: ringkasan jumlah per status, tombol "Ajukan Baru".
- **Ajukan Baru**: pilih RO, unggah TOR (PDF) dan RAB (PDF), pratinjau, validasi, tombol Kirim.
- **Daftar Pengajuan Saya**: tabel + filter status (Terupload / Diperiksa / Diterima / Ditolak).
- **Detail Pengajuan (Satker)**: pasangan dokumen, status, keputusan dan catatan ROCAN bila ada.
  Satker **tidak** melihat detail teknis.

**ROCAN**
- **Beranda ROCAN**: antrean "Menunggu Pemeriksaan", ringkasan per status.
- **Daftar Pengajuan**: semua pengajuan, filter status, kategori RO, satker, tanggal.
- **Detail Reviu** (layar terpenting, lihat 5.3).
- **Dokumen Acuan**: tambah, lihat, aktif/nonaktifkan, hapus; dikelompokkan per kategori acuan.

**Super Admin** (semua layar ROCAN, ditambah)
- **Master RO**: kode, deskripsi, aktif/nonaktif.
- **Pengelolaan Checklist**: versi checklist, induk dan anak, urutan, dokumen wajib kutip,
  aktif/nonaktif. Pecah satu checklist menjadi beberapa checklist baru.
- **Pengelolaan Kategori** (dua tab):
  1. Kategori prioritas RO (Kategori 0 sampai 4, pertanyaan C01 sampai C12 per kategori),
  2. Kategori dokumen (TOR, RAB, jenis acuan seperti RPJMN, Renstra, PMK/SBM).
- **Akun Pengguna**: tambah, ubah peran, aktif/nonaktif, reset kata sandi.

**Bagian belakang (teknis)** untuk ROCAN dan Super Admin: lihat 7.

### 5.2 Komponen bersama

| Komponen | Fungsi |
|---|---|
| `StatusBadge` | Status dengan teks + ikon + warna, label menurut peran. |
| `DocumentPair` | Menampilkan TOR dan RAB berdampingan: nama berkas, pratinjau PDF. |
| `PdfPreviewModal` | Pratinjau PDF, bisa lompat ke halaman bukti. |
| `UploadDropzone` | Unggah PDF, validasi tipe/ukuran, status unggah. |
| `ProgramContextPanel` | Tahun anggaran, kementerian/unit, program, kegiatan, KRO, RO. Nilai kosong tampil "—". Kode tetap string. |
| `ChecklistTree` | Induk dan anak, bisa dibuka/tutup, status turunan di induk. |
| `VerdictRow` | Satu butir: status, rekomendasi, bukti. |
| `EvidenceQuote` | Kutipan, jenis dokumen, halaman, tautan ke pratinjau. |
| `CategoryResultCard` | Hasil Screening 2: kategori, pertanyaan penentu, daftar pertanyaan. |
| `DecisionPanel` | Pilihan Diterima / Ditolak + catatan (ROCAN). |
| `AiCandidateTag` | Label "Hasil AI (kandidat)" agar berbeda dari keputusan ROCAN. |
| `DataTable` | Tabel dengan header, urutan, filter, halaman. Dapat dibaca pembaca layar. |
| `EmptyState`, `LoadingState`, `ErrorState` | Tiga keadaan, bahasa tenang dan jelas. |
| `ConfirmDialog` | Konfirmasi hapus/ubah yang berisiko. |
| `DemoOnly` | Pembungkus penanda demo (lihat 8). |

### 5.3 Detail Reviu (ROCAN dan Super Admin)

Urutan dari atas ke bawah:

1. Header: RO, satker, tanggal, status.
2. Pasangan dokumen TOR dan RAB.
3. Konteks program.
4. Screening 1: pohon checklist, bukti per butir.
5. Screening 2: kategori hasil dan rincian.
6. Keputusan ROCAN: Diterima / Ditolak + catatan.
7. Bagian belakang teknis (tersembunyi di balik tombol, lihat 7).

Hasil AI dan keputusan ROCAN selalu tampil **terpisah** dan berlabel jelas.

---

## 6. Lapisan Data (API)

Alur data nyata: unggah PDF, diproses backend, hasil diambil frontend. Maka frontend memakai
**lapisan API**, bukan impor JSON sebagai jalur utama.

- Semua akses data lewat satu modul klien API dengan antarmuka tetap.
- Sediakan **adapter mock** (data JSON contoh yang mengikuti bentuk hasil Screening 1 dan 2)
  agar frontend dapat dibangun sebelum backend siap. Adapter diganti lewat konfigurasi.
- Anggap semua respons **tidak tepercaya**: validasi bentuk, tolak bidang tak dikenal dengan
  pesan jelas, jangan sampai aplikasi crash.
- Status proses (Diproses AI) diperbarui lewat polling berkala atau mekanisme dorong dari API.
  Metode final menunggu kesepakatan backend.
- Aturan data: kode tetap string (nol di depan tidak hilang), uang dalam rupiah diformat di
  satu tempat, tanggal disimpan ISO dan ditampilkan dengan satu utilitas, `null` berarti
  tidak diketahui (tampilkan "—", jangan mengarang).
- Jangan menaruh rahasia di variabel `VITE_*` karena terkirim ke browser.
- Backend: FastAPI. Adapter dipilih lewat `VITE_API_MODE` (`mock` atau `real`), alamat lewat
  `VITE_API_URL`.
- Skema respons ditulis dengan zod, tipe diturunkan dari skema. Pembuatan tipe otomatis dari
  OpenAPI FastAPI dipertimbangkan setelah kontrak stabil.
- Sementara backend belum ada, daftar dan masuk memakai adapter mock yang menyimpan akun,
  sesi, dan pengajuan di `localStorage`. Sesi tetap diakses lewat klien API agar mudah diganti
  ke autentikasi backend. Semua ini termasuk komponen demo (bagian 8).
- Pembaruan status memakai TanStack Query (polling berkala) sampai backend menentukan metode.
- Pratinjau PDF memakai react-pdf, dibungkus `PdfPreviewModal`, agar bisa lompat ke halaman
  bukti dan mudah diganti.

### Daftar rute

| Peran | Rute |
|---|---|
| Umum | `/masuk`, 403, 404 |
| Satker | `/satker`, `/satker/ajukan`, `/satker/pengajuan`, `/satker/pengajuan/:id` |
| ROCAN | `/rocan`, `/rocan/pengajuan`, `/rocan/pengajuan/:id`, `/rocan/acuan` |
| Super Admin | semua rute ROCAN, ditambah `/admin/ro`, `/admin/checklist`, `/admin/kategori`, `/admin/pengguna` |

Kontrak data yang dibutuhkan (bentuk final menunggu backend, lihat `BACKEND-APPENDIX.md`):
pengajuan, dokumen, konteks program, hasil Screening 1, hasil Screening 2, keputusan ROCAN,
checklist, kategori, Master RO, dokumen acuan, pengguna.

---

## 7. Bagian Belakang Aplikasi (Detail Teknis)

Semua UI utama memakai bahasa sederhana. Hal teknis dipindah ke area terpisah yang hanya bisa
dibuka ROCAN dan Super Admin (Satker tidak melihatnya):

- JSON mentah hasil Screening 1 dan 2,
- ID bukti, skor kemiripan, potongan (chunk) yang dipakai,
- status teknis dan pesan galat,
- versi checklist dan model yang dipakai,
- unduh JSON.

Aturan: area ini tidak boleh dibutuhkan untuk memahami hasil. Semua kesimpulan penting sudah
terbaca di UI utama.

---

## 8. Penanda Komponen Demo

Semua komponen yang hanya untuk demo **wajib** ditandai dengan cara yang sama dan mencolok:

- Garis tepi **merah terang** (`#FF0000`, 3px, putus-putus) di sekeliling komponen.
- Label kecil "DEMO" berlatar merah di pojok komponen.
- Atribut `data-demo="true"` pada elemen akar.
- Dibungkus komponen `DemoOnly`, sehingga semua penanda bisa dicari dan dihapus sekaligus.
- Kelas CSS bersama `.demo-flag`. Warna merah terang **tidak boleh dipakai** untuk hal lain
  di desain, agar penanda tetap unik.
- Satu flag lingkungan (`VITE_SHOW_DEMO`) menyalakan atau mematikan semua komponen demo.

Daftar demo saat ini:
1. 3 tombol peran di halaman Masuk/Daftar.
2. Adapter data mock dan penanda sumber data (bila ditampilkan di UI).
3. Data contoh bawaan.

---

## 9. Sistem Desain

Tema utama: **biru muda (baby blue)**. Selain itu bebas, selama konsisten. Tidak mengikuti
desain ROCAN lama.

### 9.1 Prinsip
1. Sederhana: satu tugas per layar, bahasa sehari-hari.
2. Tenang dan ramah: ruang kosong cukup, sudut membulat, bayangan lembut.
3. Jujur: hasil AI selalu berlabel kandidat, data kosong ditampilkan apa adanya.
4. Terbaca: status tidak hanya warna, kontras cukup, fokus keyboard terlihat.
5. Responsif: nyaman di laptop dan tablet. Ponsel didukung untuk Satker.

### 9.2 Warna (usulan, boleh disetel)

| Peran warna | Nilai | Pakai untuk |
|---|---|---|
| Biru muda dasar | `#BFE3F7` | Latar aksen, panel, sorotan |
| Biru muda pucat | `#EAF6FD` | Latar halaman |
| Biru utama | `#3B9AD9` | Tombol utama, tautan, fokus |
| Biru tua | `#1E5F8E` | Teks di atas biru muda, judul |
| Teks | `#1F2A37` | Teks isi |
| Teks sekunder | `#5B6B7B` | Keterangan |
| Garis | `#D5E3EE` | Batas, pemisah |
| Sukses | `#2E9E6B` | Diterima, Sesuai |
| Peringatan | `#E0A100` | Menunggu, Bukti kurang |
| Galat | `#D64545` | Ditolak, Belum sesuai |
| Info | `#3B9AD9` | Diproses |
| **Penanda demo** | `#FF0000` | **Khusus komponen demo, jangan dipakai lain** |

Periksa kontras teks minimal 4.5:1. Galat `#D64545` sengaja berbeda dari merah demo.

### 9.3 Tipografi
- Font sans-serif bersih dan ramah, mis. Inter atau Plus Jakarta Sans.
- Skala: 12 / 14 / 16 (isi) / 20 / 24 / 32. Judul tebal, isi reguler.
- Angka tabel memakai angka tabular.

### 9.4 Tata letak dan bentuk
- Grid 8px. Sudut membulat 12px (kartu), 8px (input, tombol).
- Kerangka: navigasi samping tetap di layar lebar, menu ringkas di layar kecil.
- Lebar isi maks. 1280px. Kartu untuk ringkasan, tabel untuk daftar.

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

Sudah dikonfirmasi:
1. Pendaftaran: Satker mendaftar sendiri. Akun ROCAN dan Super Admin dibuat oleh Super Admin.
2. Pengajuan ditolak: Satker dapat mengajukan ulang sebagai pengajuan baru yang tertaut.
3. Pemrosesan gagal tampil sebagai "Pemrosesan bermasalah", dengan opsi kirim ulang untuk
   ROCAN dan Super Admin.
4. Satker hanya melihat keputusan dan catatan ROCAN, bukan kutipan bukti AI.
5. Hanya ROCAN yang menetapkan Diterima dan Ditolak.
6. Mekanisme pembaruan status mengikuti kesepakatan backend (polling atau dorong).

Masih terbuka:
- Pemetaan 5W+1H dan pemecahan checklist bisa berubah (kemungkinan dibatalkan).
- Bentuk final kontrak API.

---

## 11. Di Luar Lingkup Frontend

Ekstraksi PDF, chunking, retrieval, embedding, model LLM, dan verifier adalah urusan backend.
Ringkasan ada di `BACKEND-APPENDIX.md` agar tim frontend paham konteks, bukan untuk dibangun.
