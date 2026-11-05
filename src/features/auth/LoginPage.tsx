import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { homePath } from "../../lib/roles";
import { DataSourceIndicator } from "../../components/DataSourceIndicator";
import { DemoRoleButtons } from "./DemoRoleButtons";
import { useAuth } from "./authState";


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
    <div className="min-h-screen lg:grid lg:grid-cols-[2fr_3fr]">
      <header className="bg-sky-pale px-6 py-8 lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-12">
        <p className="font-semibold text-brand-deep">Telaah Reborn</p>
        <p className="mt-2 max-w-xs text-sm text-ink-soft lg:mt-0">Reviu TOR dan RAB, Biro Perencanaan.</p>
      </header>
    <main className="mx-auto flex max-w-sm flex-col justify-center px-6 py-10 lg:min-h-screen">
      <div>
        <h1 className="page-title">{isLogin ? "Masuk" : "Daftar sebagai Satker"}</h1>
        <form key={mode} onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
          {!isLogin && (
            <>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Nama lengkap
                <input name="name" type="text" required autoComplete="name" className="field" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Nama satker
                <input name="satkerName" type="text" required className="field" />
              </label>
            </>
          )}
          <label className="flex flex-col gap-1 text-sm font-medium">
            Email
            <input name="email" type="email" required autoComplete="email" className="field" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Kata sandi
            <input
              name="password"
              type="password"
              required
              minLength={isLogin ? undefined : 8}
              autoComplete={isLogin ? "current-password" : "new-password"}
              className="field"
            />
            {!isLogin && <span className="text-xs text-ink-soft">Minimal 8 karakter.</span>}
          </label>
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="btn btn-primary"
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
          className="mt-4 link text-sm"
        >
          {isLogin ? "Belum punya akun? Daftar sebagai Satker" : "Sudah punya akun? Masuk"}
        </button>
      </div>

      <DemoRoleButtons />
      <div className="mt-4">
        <DataSourceIndicator />
      </div>
    </main>
    </div>
  );
}
