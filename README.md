# Telaah Reborn

Frontend baru untuk sistem reviu TOR dan RAB. Lingkup lengkap ada di
`Context/FRONTEND-SCOPE.md`, konteks backend di `Context/BACKEND-APPENDIX.md`, rencana kerja
di `Context/IMPLEMENTATION-PLAN.md`.

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4, react-router-dom, zod, TanStack Query, react-pdf,
lucide-react. Pengujian: Vitest + Testing Library. Backend: FastAPI (terpisah).

## Menjalankan

```
copy .env.example .env
npm install
npm run dev
```

## Perintah

- `npm run dev`: server pengembangan.
- `npm run build`: pemeriksaan tipe lalu build.
- `npm run lint`: ESLint.
- `npm run test`: Vitest.

## Mode data

- `VITE_API_MODE=mock`: data contoh dan akun disimpan di `localStorage` (komponen demo).
- `VITE_API_MODE=real`: memakai FastAPI di `VITE_API_URL`.
- `VITE_SHOW_DEMO=true` menampilkan penanda demo. Semua item demo bisa dicari lewat `DemoOnly`
  dan `data-demo`.

Jangan menaruh rahasia di variabel `VITE_*`.
