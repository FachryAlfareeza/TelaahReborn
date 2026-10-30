# Lampiran Backend (Bukan Lingkup Frontend)

> Konteks agar tim frontend memahami apa yang terjadi di belakang layar dan data apa yang akan
> datang. Tidak untuk dibangun di frontend. Seluruh isi dapat berubah.

## 1. Alur Pemrosesan

1. Satker mengunggah TOR dan RAB (PDF) lalu menekan Kirim.
2. Dokumen diekstrak dan disimpan ke vector DB.
3. TOR dibandingkan dengan RAB, lalu dengan dokumen acuan.
4. Dokumen acuan sudah diekstrak lebih dulu menjadi JSON terpotong (chunk).
5. Screening 1 dan Screening 2 berjalan otomatis begitu pengajuan masuk.
6. Hasil dikirim lewat API, status berubah ke menunggu pemeriksaan ROCAN.

## 2. Screening

- **Screening 1**: satu butir checklist per sekali jalan. Model membaca potongan dokumen yang
  relevan dan menjawab `PASS` / `NOT_PASS` / `INSUFFICIENT_EVIDENCE` dengan kutipan persis.
- **Screening 2**: 12 pertanyaan kategori, diperiksa berurutan per kelompok. `MATCH` pertama
  menentukan Kategori 1 sampai 4. Bukti kurang tanpa `MATCH` menghasilkan Kategori 0.
- Setiap jawaban punya kutipan (maks. 40 kata), ID bukti valid, dan mencakup semua jenis
  dokumen wajib. Jawaban yang gagal verifikasi ditandai gagal verifikasi, tidak diterima.
- Dua kolom status dipisah: status isi dan status teknis (salah model, gagal baca, gagal
  verifikasi).
- Hasil keluar sebagai `screening1.json` dan `screening2.json` (bentuk final menunggu
  kesepakatan API).

## 3. Catatan Perubahan dari Rapat

- **Chunking lama dihapus.** Strategi chunking dibuat sendiri, memakai dimensi embedding yang
  kecil. Chunking TOR dilakukan per section, lalu tiap section diambil ke dokumen acuan.
- **Ganti-ganti model retrieval** dan coba strategi chunking eksperimental. Bila jawaban tidak
  ada di dokumen acuan, gunakan RRF (reciprocal rank fusion).
- **Checklist dibuat lebih teknis.** Satu checklist dipecah menjadi beberapa checklist baru
  (induk dan anak). Frontend sudah mengantisipasi ini (lihat FRONTEND-SCOPE 4.1).
- **5W+1H**: butir "gambaran umum" diganti menjadi "latar belakang (dasar hukum dan gambaran
  umum)". Peta: Apa = gambaran umum, Mengapa = dasar hukum dan gambaran umum, Siapa = penerima
  manfaat, Kapan = tahapan dan waktu pelaksanaan, Di mana = metode pelaksanaan (lokasi),
  Bagaimana = metode pelaksanaan.
- **Manajemen risiko (2B.2)**: ambil semua section dari TOR, masukkan per section ke LLM,
  hasilnya menjadi sub-butir.
- **Reviu otomatis berjalan saat Satker mengirim TOR dan RAB.**

## 4. Yang Dibutuhkan Frontend dari Backend

- Unggah pengajuan (multipart: TOR + RAB + RO).
- Daftar dan detail pengajuan dengan status.
- Hasil Screening 1 (pohon induk-anak, bukti, rekomendasi) dan Screening 2 (kategori,
  pertanyaan, bukti).
- Simpan keputusan ROCAN dan catatan.
- CRUD: Master RO, checklist, kategori (RO dan dokumen), dokumen acuan, pengguna.
- Berkas PDF atau tautan pratinjau aman.
- Data teknis mentah untuk "bagian belakang" aplikasi.
- Autentikasi dan peran: Satker, ROCAN, Super Admin.

## 5. Prinsip yang Dipegang

- Hasil otomatis selalu kandidat. Keputusan final di ROCAN.
- Dokumen asli TOR, RAB, checklist, atau regulasi tidak boleh masuk repositori.
- Kegagalan teknis tidak boleh disajikan sebagai kesimpulan reviu.
