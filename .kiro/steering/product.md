# Produk: Telaah Reborn

Frontend baru, berdiri sendiri, untuk sistem reviu TOR dan RAB berbantuan AI (Biro Perencanaan).
Tidak bergantung pada kode frontend lama (`AITF_Web`).

Acuan lengkap: #[[file:Context/FRONTEND-SCOPE.md]]
Konteks backend: #[[file:Context/BACKEND-APPENDIX.md]]

## Aturan produk
- Semua teks di layar: Bahasa Indonesia sederhana, untuk semua peran. Detail teknis hanya di
  "bagian belakang" aplikasi (ROCAN dan Super Admin).
- Peran: Satker, ROCAN, Super Admin.
- Status Satker: Terupload, Diperiksa, Diterima, Ditolak.
- Status ROCAN dan Super Admin: Diproses AI, Menunggu Pemeriksaan, Diterima, Ditolak.
- Pemetaan: Terupload = Diproses AI, Diperiksa = Menunggu Pemeriksaan. Pakai satu fungsi pemetaan.
- Screening 1 dan 2 jalan otomatis setelah Satker menekan Kirim. Tidak ada pemicu manual.
- Hasil AI selalu "kandidat". Keputusan ROCAN ditampilkan terpisah dan berlabel jelas.
- Checklist berbentuk induk dengan banyak anak. Pemetaan 5W+1H bisa dibatalkan, simpan sebagai
  data yang dapat diedit, bukan hardcode.
- Kegagalan teknis tidak boleh tampil sebagai kesimpulan reviu.
- Tema utama biru muda. Tidak mengikuti desain ROCAN lama.
