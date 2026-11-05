import { useState } from "react";
import { DemoOnly } from "../../components/DemoOnly";
import { seedUsers } from "../../api/mockData";
import { roleLabel } from "../../lib/roles";
import { useAuth } from "./authState";

/** DEMO: masuk cepat satu klik per peran. Hapus komponen ini tanpa mengubah formulir masuk. */
export function DemoRoleButtons() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  async function enter(email: string, password: string) {
    setError(null);
    try {
      await login({ email, password });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal masuk.");
    }
  }

  return (
    <DemoOnly className="mt-8 p-4">
      <p className="mb-2 text-sm font-medium">Masuk cepat</p>
      <div className="flex flex-wrap gap-2">
        {seedUsers.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => enter(u.email, u.password)}
            className="btn btn-secondary"
          >
            Masuk sebagai {roleLabel[u.role]}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-2 error-text">
          {error}
        </p>
      )}
    </DemoOnly>
  );
}
