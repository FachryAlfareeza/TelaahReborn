import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { homePath } from "../../lib/roles";
import { DataSourceIndicator } from "../../components/DataSourceIndicator";
import { DemoRoleButtons } from "./DemoRoleButtons";
import { useAuth } from "./authState";

/** Tidak ada pendaftaran mandiri: akun dibuat Super Admin (PRD §7.2). */
export function LoginPage() {
  const { user, loading, login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to={homePath[user.role]} replace />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    setBusy(true);
    try {
      await login({ nip: String(form.get("nip") ?? "").trim(), password: String(form.get("password") ?? "") });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi masalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[2fr_3fr]">
      <header className="bg-sky-pale px-6 py-8 lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-12">
        <p className="font-semibold text-brand-deep">Telaah Reborn</p>
        <p className="mt-2 max-w-xs text-sm text-ink-soft lg:mt-0">Reviu TOR dan RAB, Biro Perencanaan.</p>
      </header>
      <main className="mx-auto flex max-w-sm flex-col justify-center px-6 py-10 lg:min-h-screen">
        <h1 className="page-title">Masuk</h1>
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            NIP
            <input name="nip" type="text" inputMode="numeric" required autoComplete="username" className="field" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Kata sandi
            <input name="password" type="password" required autoComplete="current-password" className="field" />
          </label>
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className="btn btn-primary">
            {busy ? "Memproses..." : "Masuk"}
          </button>
        </form>
        <p className="mt-4 text-sm text-ink-soft">Belum punya akun? Hubungi Super Admin.</p>

        <DemoRoleButtons />
        <div className="mt-4">
          <DataSourceIndicator />
        </div>
      </main>
    </div>
  );
}
