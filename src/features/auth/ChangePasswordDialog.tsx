import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useAuth } from "./authState";

const FOCUSABLE = "button:not([disabled]), input:not([disabled])";
const inputClass =
  "mt-1 w-full rounded-control border border-line px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

/** Dialog ganti kata sandi dengan jebakan fokus. Esc menutup. */
export function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const { changePassword } = useAuth();
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    firstRef.current?.focus();
    return () => previous?.focus();
  }, []);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const items = ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!items || items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const next = String(form.get("newPassword") ?? "");
    if (next !== String(form.get("confirm") ?? "")) {
      setError("Kata sandi baru dan konfirmasinya belum sama.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await changePassword({ currentPassword: String(form.get("currentPassword") ?? ""), newPassword: next });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi masalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className="w-full max-w-md rounded-card bg-white p-6 shadow-lg"
      >
        <h2 id={titleId} className="text-xl font-bold text-brand-deep">
          Ganti kata sandi
        </h2>
        {done ? (
          <>
            <p role="status" className="mt-4 text-sm">
              Kata sandi sudah diganti.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-control bg-brand-deep px-4 py-2 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Tutup
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
            <label className="text-sm">
              Kata sandi saat ini
              <input ref={firstRef} name="currentPassword" type="password" required autoComplete="current-password" className={inputClass} />
            </label>
            <label className="text-sm">
              Kata sandi baru (minimal 8 karakter)
              <input name="newPassword" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
            </label>
            <label className="text-sm">
              Ulangi kata sandi baru
              <input name="confirm" type="password" required autoComplete="new-password" className={inputClass} />
            </label>
            {error && (
              <p role="alert" className="text-sm text-bad-text">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-control border border-line px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-control bg-brand-deep px-4 py-2 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60"
              >
                {busy ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
