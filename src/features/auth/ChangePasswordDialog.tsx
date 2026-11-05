import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useAuth } from "./authState";

const FOCUSABLE = "button:not([disabled]), input:not([disabled])";

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
        <h2 id={titleId} className="section-title">
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
                className="btn btn-primary"
              >
                Tutup
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Kata sandi saat ini
              <input ref={firstRef} name="currentPassword" type="password" required autoComplete="current-password" className="field" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Kata sandi baru (min. 8 karakter)
              <input name="newPassword" type="password" required minLength={8} autoComplete="new-password" className="field" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Ulangi kata sandi baru
              <input name="confirm" type="password" required autoComplete="new-password" className="field" />
            </label>
            {error && (
              <p role="alert" className="error-text">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={busy}
                className="btn btn-primary"
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
