# Penanda Komponen Demo

Setiap komponen atau data yang hanya untuk demo WAJIB ditandai dengan cara yang sama:

- Bungkus dengan komponen `DemoOnly`.
- Garis tepi merah terang `#FF0000`, 3px, putus-putus, kelas CSS `.demo-flag`.
- Label kecil "DEMO" berlatar merah di pojok.
- Atribut `data-demo="true"` pada elemen akar.
- Tampil hanya bila `VITE_SHOW_DEMO` aktif.
- Warna `#FF0000` khusus penanda demo. Jangan dipakai untuk status galat atau hal lain.

Saat ini yang demo: 3 tombol peran (Satker, ROCAN, Super Admin) di halaman Masuk/Daftar, adapter
data mock, dan data contoh. Semua harus bisa dihapus dengan mencari `DemoOnly` dan `data-demo`
tanpa mengubah logika login asli.
