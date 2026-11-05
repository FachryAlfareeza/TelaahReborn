# Struktur Proyek (usulan)

```
TelaahReborn/
  Context/                 dokumen lingkup (FRONTEND-SCOPE, BACKEND-APPENDIX)
  .kiro/steering/          aturan untuk agen
  src/
    api/                   klien API (antarmuka tetap), adapter real dan mock, skema zod
    components/            komponen bersama (StatusBadge, DocumentPair, DemoOnly, ...)
    features/              satker/, rocan/, admin/, auth/ (halaman + hook TanStack Query)
    lib/                   utilitas (tanggal, uang, pemetaan status per peran)
    routes/                definisi rute dan penjaga peran
    styles/                token desain (warna, tipografi)
    types/                 tipe domain (diturunkan dari skema zod)
  public/
```

## Rute
- Umum: `/masuk`, 403, 404.
- Satker: `/satker`, `/satker/ajukan`, `/satker/pengajuan`, `/satker/pengajuan/:id`.
- ROCAN: `/rocan`, `/rocan/pengajuan`, `/rocan/pengajuan/:id`, `/rocan/acuan`.
- Super Admin (ditambah semua rute ROCAN): `/admin/ro`, `/admin/checklist`, `/admin/kategori`,
  `/admin/pengguna`.

## Aturan
- Satu fungsi pemetaan status per peran di `lib/`, dipakai semua komponen.
- Token desain (warna, spasi, radius) terpusat, jangan nilai warna acak di komponen.
- Gaya tombol, input, judul, dan tautan memakai kelas bersama di `styles/index.css` (`btn`, `btn-primary`, `btn-secondary`, `field`, `field-label`, `page-title`, `section-title`, `link`). Jangan menyalin deret kelas Tailwind. Fokus keyboard sudah diatur global.
- Komponen demo hanya lewat `DemoOnly` (lihat demo-flagging.md).
- Fitur dikelompokkan per peran di `features/`, komponen lintas peran di `components/`.
