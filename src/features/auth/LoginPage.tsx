import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { homePath } from "../../lib/roles";
import { DataSourceIndicator } from "../../components/DataSourceIndicator";
import { DemoRoleButtons } from "./DemoRoleButtons";
import { useAuth } from "./authState";

const inputClass =
  "mt-1 w-full rounded-control border border-line bg-white px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function LoginPage() {
  const { user, loading, login, register } = useAuth();
  const [mode, setMode] = useState<"masuk" | "daftar">("masuk");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to={homePath[user.role]} replace />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const text = (k: string) => String(form.get(k) ?? "");
    setError(null);
    setBusy(true);
    try {
      if (mode === "masuk") {
        await login({ email: text("email"), password: text("password") });
      } else {
        await register({
          name: text("name"),
          satkerName: text("satkerName"),
          email: text("email"),
          password: text("password"),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi masalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  const isLogin = mode === "masuk";
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-4">
      <h1 className="text-2xl font-bold text-brand-deep">Telaah Reborn</h1>
      <p className="mt-1 text-sm text-ink-soft">Reviu TOR dan RAB berbantuan AI, Biro Perencanaan.</p>

      <div className="mt-6 rounded-card border border-line bg-white p-6">
        <h2 className="text-xl font-bold text-brand-deep">{isLogin ? "Masuk" : "Daftar sebagai Satker"}</h2>
        <form key={mode} onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
          {!isLogin && (
            <>
              <label className="text-sm">
                Nama lengkap
                <input name="name" type="text" required autoComplete="name" className={inputClass} />
              </label>
              <label className="text-sm">
                Nama satker
                <input name="satkerName" type="text" required className={inputClass} />
              </label>
            </>
          )}
          <label className="text-sm">
            Email
            <input name="email" type="email" required autoComplete="email" className={inputClass} />
          </label>
          <label className="text-sm">
            Kata sandi
            <input
              name="password"
              type="password"
              required
              minLength={isLogin ? undefined : 8}
              autoComplete={isLogin ? "current-password" : "new-password"}
              className={inputClass}
            />
            {!isLogin && <span className="text-xs text-ink-soft">Minimal 8 karakter.</span>}
          </label>
          {error && (
            <p role="alert" className="text-sm text-bad-text">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="rounded-control bg-brand-deep px-4 py-2 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60"
          >
            {busy ? "Memproses..." : isLogin ? "Masuk" : "Daftar"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setMode(isLogin ? "daftar" : "masuk");
          }}
          className="mt-4 text-sm text-brand-deep underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {isLogin ? "Belum punya akun? Daftar sebagai Satker" : "Sudah punya akun? Masuk"}
        </button>
      </div>

      <DemoRoleButtons />
      <div className="mt-4">
        <DataSourceIndicator />
      </div>
    </main>
  );
}
