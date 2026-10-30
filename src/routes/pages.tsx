import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/authState";
import { homePath } from "../lib/roles";

function Message({ title, text }: { title: string; text: string }) {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-2xl font-bold text-brand-deep">{title}</h1>
      <p className="mt-2 text-ink-soft">{text}</p>
      <Link
        to={user ? homePath[user.role] : "/masuk"}
        className="mt-4 inline-block rounded-control bg-brand-deep px-4 py-2 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {user ? "Kembali ke beranda" : "Ke halaman masuk"}
      </Link>
    </div>
  );
}

export const ForbiddenPage = () => (
  <Message title="403 - Akses ditolak" text="Anda tidak punya izin untuk membuka halaman ini." />
);
export const NotFoundPage = () => (
  <Message title="404 - Halaman tidak ditemukan" text="Alamat yang Anda buka tidak ada." />
);

/** Tempat sementara sampai layar aslinya dibuat pada tugas berikutnya. */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <section>
      <h1 className="text-2xl font-bold text-brand-deep">{title}</h1>
      <p className="mt-2 text-ink-soft">Halaman ini sedang disiapkan.</p>
    </section>
  );
}
