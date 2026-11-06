import { useId, useState, type FormEvent } from "react";
import { useCreateUser, useDeactivateUser, useFiscalYears, useUnits, useUpdateUser, useUsers } from "../../api/queries";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { DataTable, type Column } from "../../components/DataTable";
import { ErrorState } from "../../components/ErrorState";
import { ActiveLabel, errorText, Feedback, Field } from "../../components/form";
import { LoadingState } from "../../components/LoadingState";
import { DashboardPage, Panel, StatCard } from "../../components/Dashboard";
import { Drawer } from "../../components/Drawer";
import { displayValue } from "../../lib/empty";
import { roleLabel } from "../../lib/roles";
import type { Role, UnitPair, User } from "../../types";

const ROLES: Role[] = ["satker", "rocan", "super_admin"];
const unitKey = (u: { code: string } | null, v: { code: string } | null) => (u && v ? `${u.code}|${v.code}` : "");

/** Daftar unit dari dataset Master RO aktif terbaru (PRD K-06). */
function useUnitOptions() {
  const years = useFiscalYears();
  const latest = years.data?.length ? years.data[years.data.length - 1].fiscal_year : null;
  return useUnits(latest);
}

function UnitSelect({ id, value, onChange, units }: { id: string; value: string; onChange: (v: string) => void; units: UnitPair[] }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="field">
      <option value="">Pilih unit</option>
      {units.map((u) => (
        <option key={unitKey(u.unit_eselon1, u.unit_eselon2)} value={unitKey(u.unit_eselon1, u.unit_eselon2)}>
          {u.unit_eselon1.name} / {u.unit_eselon2.name}
        </option>
      ))}
    </select>
  );
}

type FormState = { nip: string; nama: string; email: string; password: string; role: Role; unit: string; active: boolean };

function UserForm({ user, onDone }: { user: User | null; onDone: () => void }) {
  const create = useCreateUser();
  const update = useUpdateUser();
  const units = useUnitOptions();
  const base = useId();
  const id = (k: string) => `${base}-${k}`;
  const [form, setForm] = useState<FormState>({
    nip: user?.nip ?? "",
    nama: user?.nama ?? "",
    email: user?.email ?? "",
    password: "",
    role: user?.role ?? "satker",
    unit: unitKey(user?.unit_eselon1 ?? null, user?.unit_eselon2 ?? null),
    active: user?.is_active ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof FormState>(k: K) => (v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const busy = create.isPending || update.isPending;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.nip.trim() || !form.nama.trim()) return setError("NIP dan nama wajib diisi.");
    if (!user && (form.password.length < 8 || form.password.length > 128)) return setError("Kata sandi harus 8 sampai 128 karakter.");
    if (user && form.password && (form.password.length < 8 || form.password.length > 128)) {
      return setError("Kata sandi baru harus 8 sampai 128 karakter.");
    }
    if (form.role === "satker" && !form.unit) return setError("Akun Satker wajib memiliki Unit Eselon I dan II.");
    setError(null);
    const [e1, e2] = form.role === "satker" ? form.unit.split("|") : [undefined, undefined];
    const payload = {
      nip: form.nip.trim(),
      nama: form.nama.trim(),
      email: form.email.trim() || undefined,
      role: form.role,
      unit_eselon1_code: e1,
      unit_eselon2_code: e2,
    };
    try {
      if (user) {
        await update.mutateAsync({
          id: user.id,
          input: { ...payload, password: form.password || undefined, is_active: form.active },
        });
      } else {
        await create.mutateAsync({ ...payload, password: form.password });
      }
      onDone();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={id("nip")} label="NIP">
          <input id={id("nip")} value={form.nip} inputMode="numeric" onChange={(e) => set("nip")(e.target.value)} className="field" />
        </Field>
        <Field id={id("nama")} label="Nama">
          <input id={id("nama")} value={form.nama} onChange={(e) => set("nama")(e.target.value)} className="field" />
        </Field>
        <Field id={id("email")} label="Email (opsional)">
          <input id={id("email")} type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} className="field" />
        </Field>
        <Field id={id("password")} label={user ? "Kata sandi baru (kosongkan bila tetap)" : "Kata sandi awal"}>
          <input
            id={id("password")}
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => set("password")(e.target.value)}
            className="field"
          />
        </Field>
        <Field id={id("role")} label="Peran">
          <select id={id("role")} value={form.role} onChange={(e) => set("role")(e.target.value as Role)} className="field">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel[r]}
              </option>
            ))}
          </select>
        </Field>
        {form.role === "satker" && (
          <Field id={id("unit")} label="Unit Eselon I / II">
            {units.isPending ? (
              <p className="text-sm text-ink-soft">Memuat unit...</p>
            ) : units.error ? (
              <p className="error-text">{units.error.message}</p>
            ) : (
              <UnitSelect id={id("unit")} value={form.unit} onChange={set("unit")} units={units.data ?? []} />
            )}
          </Field>
        )}
        {user && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => set("active")(e.target.checked)} />
            Akun aktif
          </label>
        )}
      </div>
      {form.role === "satker" && (
        <p className="text-xs text-ink-soft">
          Satker tidak dapat mengubah unitnya sendiri. Perubahan unit tidak mengubah pengajuan lama.
        </p>
      )}
      <Feedback notice={null} error={error} />
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? "Menyimpan..." : user ? "Simpan perubahan" : "Buat akun"}
        </button>
        <button type="button" disabled={busy} onClick={onDone} className="btn btn-secondary">
          Batal
        </button>
      </div>
    </form>
  );
}

export function UsersPage() {
  const [role, setRole] = useState<Role | "">("");
  const users = useUsers(role || undefined);
  const deactivate = useDeactivateUser();
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [confirm, setConfirm] = useState<User | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const columns: Column<User>[] = [
    { key: "nama", header: "Nama", render: (u) => u.nama, sortValue: (u) => u.nama },
    { key: "nip", header: "NIP", render: (u) => u.nip, sortValue: (u) => u.nip },
    { key: "role", header: "Peran", render: (u) => roleLabel[u.role], sortValue: (u) => u.role },
    { key: "unit", header: "Unit", render: (u) => displayValue(u.unit_eselon2?.name) },
    { key: "email", header: "Email", render: (u) => displayValue(u.email) },
    { key: "active", header: "Status", render: (u) => <ActiveLabel active={u.is_active} /> },
    {
      key: "actions",
      header: "Tindakan",
      render: (u) => (
        <span className="flex flex-wrap gap-2">
          <button type="button" className="link" onClick={() => setEditing(u)} aria-label={`Ubah akun ${u.nama}`}>
            Ubah
          </button>
          {u.is_active && (
            <button type="button" className="link" onClick={() => setConfirm(u)} aria-label={`Nonaktifkan akun ${u.nama}`}>
              Nonaktifkan
            </button>
          )}
        </span>
      ),
    },
  ];

  const all = users.data ?? [];

  return (
    <DashboardPage
      title="Akun Pengguna"
      actions={
        <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
          Tambah akun
        </button>
      }
      stats={
        <>
          <StatCard label="Akun ditampilkan" value={all.length} />
          {ROLES.map((r) => (
            <StatCard
              key={r}
              label={roleLabel[r]}
              value={role && role !== r ? "—" : all.filter((u) => u.role === r).length}
              onClick={() => setRole(role === r ? "" : r)}
              active={role === r}
            />
          ))}
          <StatCard label="Nonaktif" value={all.filter((u) => !u.is_active).length} />
        </>
      }
    >
      <Feedback notice={notice} error={deactivate.error?.message ?? null} />
      <Panel title="Daftar akun" table className="lg:flex-1">
        {users.isPending && <LoadingState />}
        {users.error && <ErrorState message={users.error.message} onRetry={() => void users.refetch()} />}
        {users.data && (
          <DataTable
            fill
            caption="Akun pengguna"
            columns={columns}
            rows={users.data}
            getRowKey={(u) => u.id}
          />
        )}
      </Panel>
      <Drawer
        open={editing !== null}
        title={editing === null || editing === "new" ? "Akun baru" : `Ubah akun ${editing.nama}`}
        onClose={() => setEditing(null)}
      >
        {editing !== null && (
          <UserForm key={editing === "new" ? "new" : editing.id} user={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
        )}
      </Drawer>
      <ConfirmDialog
        open={confirm !== null}
        title={`Nonaktifkan akun ${confirm?.nama ?? ""}?`}
        confirmLabel="Ya, nonaktifkan"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const target = confirm;
          setConfirm(null);
          if (target) {
            deactivate.mutate(target.id, { onSuccess: () => setNotice(`Akun ${target.nama} dinonaktifkan.`) });
          }
        }}
      >
        Semua sesi akun ini akan dicabut. Akun dapat diaktifkan kembali lewat Ubah.
      </ConfirmDialog>
    </DashboardPage>
  );
}
