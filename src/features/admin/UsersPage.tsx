import { useId, useState, type FormEvent } from "react";
import { DataTable, type Column } from "../../components/DataTable";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { roleLabel, type Role } from "../../lib/roles";
import type { User } from "../../types";
import { useAuth } from "../auth/authState";
import { useCreateUser, useResetUserPassword, useUpdateUser, useUsers } from "./hooks";
import { ActiveLabel, errorText, Feedback, Field } from "./ui";

const roles: Role[] = ["SATKER", "ROCAN", "SUPER_ADMIN"];

export function UsersPage() {
  const { user: me } = useAuth();
  const users = useUsers();
  const create = useCreateUser();
  const update = useUpdateUser();
  const reset = useResetUserPassword();

  const [form, setForm] = useState({ name: "", email: "", password: "", role: "ROCAN" as Role, satkerName: "" });
  const [resetFor, setResetFor] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const ids = { name: useId(), email: useId(), pass: useId(), role: useId(), satker: useId(), reset: useId() };

  async function run(action: () => Promise<unknown>, done: string) {
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(done);
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    }
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      return setError("Isi nama, email, dan kata sandi terlebih dahulu.");
    }
    const ok = await run(
      () =>
        create.mutateAsync({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          satkerName: form.role === "SATKER" ? form.satkerName : null,
        }),
      `Akun ${form.email.trim()} sudah ditambahkan.`,
    );
    if (ok) setForm({ ...form, name: "", email: "", password: "", satkerName: "" });
  }

  async function onReset(e: FormEvent) {
    e.preventDefault();
    if (!resetFor) return;
    const target = resetFor;
    const ok = await run(
      () => reset.mutateAsync({ id: target.id, password: newPassword }),
      `Kata sandi ${target.name} sudah diatur ulang.`,
    );
    if (ok) {
      setResetFor(null);
      setNewPassword("");
    }
  }

  const columns: Column<User>[] = [
    { key: "name", header: "Nama", render: (u) => u.name, sortValue: (u) => u.name },
    { key: "email", header: "Email", render: (u) => u.email, sortValue: (u) => u.email },
    {
      key: "role",
      header: "Peran",
      render: (u) => (
        <select
          aria-label={`Peran ${u.name}`}
          value={u.role}
          disabled={u.id === me?.id || update.isPending}
          onChange={(e) =>
            void run(
              () => update.mutateAsync({ id: u.id, patch: { role: e.target.value as Role } }),
              `Peran ${u.name} sekarang ${roleLabel[e.target.value as Role]}.`,
            )
          }
          className="field w-auto py-1"
        >
          {roles.map((r) => (
            <option key={r} value={r}>
              {roleLabel[r]}
            </option>
          ))}
        </select>
      ),
    },
    { key: "status", header: "Status", render: (u) => <ActiveLabel active={u.active} /> },
    {
      key: "actions",
      header: "Tindakan",
      render: (u) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-label={`${u.active ? "Nonaktifkan" : "Aktifkan"} akun ${u.name}`}
            disabled={u.id === me?.id || update.isPending}
            className="btn btn-secondary btn-sm"
            onClick={() =>
              void run(
                () => update.mutateAsync({ id: u.id, patch: { active: !u.active } }),
                `Akun ${u.name} sekarang ${u.active ? "nonaktif" : "aktif"}.`,
              )
            }
          >
            {u.active ? "Nonaktifkan" : "Aktifkan"}
          </button>
          <button
            type="button"
            aria-label={`Atur ulang kata sandi ${u.name}`}
            className="btn btn-secondary btn-sm"
            onClick={() => setResetFor(u)}
          >
            Atur ulang kata sandi
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="page-title">Akun Pengguna</h1>
      <p className="text-sm text-ink-soft">Akun Satker dibuat lewat pendaftaran. Peran dan status akun Anda sendiri tidak bisa diubah.</p>

      <form aria-label="Tambah akun" onSubmit={(e) => void onAdd(e)} className="space-y-4 border-t border-line pt-6">
        <h2 className="section-title">Tambah akun</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={ids.name} label="Nama">
            <input id={ids.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field" />
          </Field>
          <Field id={ids.email} label="Email">
            <input id={ids.email} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field" />
          </Field>
          <Field id={ids.pass} label="Kata sandi awal (minimal 8 karakter)">
            <input id={ids.pass} type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="field" />
          </Field>
          <Field id={ids.role} label="Peran">
            <select id={ids.role} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className="field">
              {roles.map((r) => (
                <option key={r} value={r}>
                  {roleLabel[r]}
                </option>
              ))}
            </select>
          </Field>
          {form.role === "SATKER" && (
            <Field id={ids.satker} label="Nama satker">
              <input id={ids.satker} value={form.satkerName} onChange={(e) => setForm({ ...form, satkerName: e.target.value })} className="field" />
            </Field>
          )}
        </div>
        <button type="submit" disabled={create.isPending} className="btn btn-primary">
          Tambah akun
        </button>
      </form>

      {resetFor && (
        <form aria-label="Atur ulang kata sandi" onSubmit={(e) => void onReset(e)} className="space-y-4 border-t border-line pt-6">
          <h2 className="section-title">Atur ulang kata sandi {resetFor.name}</h2>
          <Field id={ids.reset} label="Kata sandi baru (minimal 8 karakter)">
            <input id={ids.reset} type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="field" />
          </Field>
          <div className="flex gap-2">
            <button type="submit" disabled={reset.isPending} className="btn btn-primary">
              Simpan kata sandi
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setResetFor(null)}>
              Batal atur ulang
            </button>
          </div>
        </form>
      )}

      <Feedback notice={notice} error={error} />

      {users.isPending && <LoadingState label="Memuat akun pengguna..." />}
      {users.error && <ErrorState message={users.error.message} onRetry={() => void users.refetch()} />}
      {users.data && (
        <DataTable caption="Daftar akun pengguna" columns={columns} rows={users.data} getRowKey={(u) => u.id} emptyTitle="Belum ada akun" />
      )}
    </div>
  );
}
