import { DemoOnly } from "./DemoOnly";
import { formatDate } from "../lib/date";
import { displayValue } from "../lib/empty";
import { formatIdr } from "../lib/money";

const colors = [
  { name: "Biru muda dasar", cls: "bg-sky-soft" },
  { name: "Biru muda pucat", cls: "bg-sky-pale border border-line" },
  { name: "Biru utama", cls: "bg-brand" },
  { name: "Biru tua", cls: "bg-brand-deep" },
  { name: "Teks", cls: "bg-ink" },
  { name: "Teks sekunder", cls: "bg-ink-soft" },
  { name: "Garis", cls: "bg-line" },
  { name: "Sukses", cls: "bg-ok" },
  { name: "Peringatan", cls: "bg-warn" },
  { name: "Galat", cls: "bg-bad" },
];

const sizes = [
  { label: "12", cls: "text-xs" },
  { label: "14", cls: "text-sm" },
  { label: "16", cls: "text-base" },
  { label: "20", cls: "text-xl" },
  { label: "24", cls: "text-2xl" },
  { label: "32", cls: "text-3xl" },
];

/** Halaman contoh token desain dan utilitas. Hanya untuk memeriksa tampilan. */
export function TokenShowcase() {
  return (
    <main className="mx-auto max-w-5xl space-y-8 p-8">
      <header>
        <h1 className="text-3xl font-bold text-brand-deep">Telaah TOR dan RAB</h1>
        <p className="mt-2 text-ink-soft">Contoh warna, huruf, dan format. Halaman masuk menyusul.</p>
      </header>

      <section aria-labelledby="judul-warna" className="rounded-card bg-white p-6 shadow-sm">
        <h2 id="judul-warna" className="text-xl font-bold text-brand-deep">
          Warna
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {colors.map((c) => (
            <li key={c.name} className="space-y-2">
              <div className={`h-12 rounded-control ${c.cls}`} aria-hidden="true" />
              <span className="text-sm">{c.name}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="judul-huruf" className="rounded-card bg-white p-6 shadow-sm">
        <h2 id="judul-huruf" className="text-xl font-bold text-brand-deep">
          Ukuran huruf
        </h2>
        <ul className="mt-4 space-y-2">
          {sizes.map((s) => (
            <li key={s.label} className={s.cls}>
              {s.label} px: Pengajuan TOR dan RAB
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="judul-format" className="rounded-card bg-white p-6 shadow-sm">
        <h2 id="judul-format" className="text-xl font-bold text-brand-deep">
          Format nilai
        </h2>
        <table className="mt-4 w-full text-left text-sm">
          <caption className="sr-only">Contoh format nilai</caption>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="py-2">Jenis</th>
              <th scope="col" className="py-2 text-right">Tampilan</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            <tr className="border-b border-line">
              <th scope="row" className="py-2 font-normal">Rupiah</th>
              <td className="py-2 text-right">{formatIdr(1500000)}</td>
            </tr>
            <tr className="border-b border-line">
              <th scope="row" className="py-2 font-normal">Tanggal</th>
              <td className="py-2 text-right">{formatDate("2025-03-05")}</td>
            </tr>
            <tr className="border-b border-line">
              <th scope="row" className="py-2 font-normal">Kode (nol di depan tetap)</th>
              <td className="py-2 text-right">{displayValue("007")}</td>
            </tr>
            <tr>
              <th scope="row" className="py-2 font-normal">Nilai tidak diketahui</th>
              <td className="py-2 text-right">{displayValue(null)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <DemoOnly className="inline-block rounded-control p-3">
        <span>Contoh penanda demo</span>
      </DemoOnly>
    </main>
  );
}
