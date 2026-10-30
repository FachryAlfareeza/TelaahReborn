import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { KeyRound, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../features/auth/authState";
import { ChangePasswordDialog } from "../features/auth/ChangePasswordDialog";
import { navForRole, roleLabel } from "../lib/roles";
import { DataSourceIndicator } from "./DataSourceIndicator";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

/** Kerangka aplikasi: navigasi menurut peran, nama pengguna, ganti kata sandi, keluar. */
export function AppShell() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  if (!user) return null;
  const items = navForRole(user.role);

  return (
    <div className="min-h-screen lg:flex">
      <aside className="border-b border-line bg-white lg:min-h-screen lg:w-64 lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between p-4">
          <span className="text-xl font-bold text-brand-deep">Telaah Reborn</span>
          <button
            type="button"
            className={`rounded-control border border-line p-2 lg:hidden ${focus}`}
            aria-expanded={menuOpen}
            aria-controls="menu-utama"
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X aria-hidden size={20} /> : <Menu aria-hidden size={20} />}
          </button>
        </div>
        <nav id="menu-utama" aria-label="Menu utama" className={`${menuOpen ? "block" : "hidden"} px-2 pb-4 lg:block`}>
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-control px-3 py-2 text-sm ${focus} ${
                      isActive ? "bg-sky-soft font-bold text-brand-deep" : "text-ink hover:bg-sky-pale"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="flex-1">
        <header className="flex flex-wrap items-center justify-end gap-2 border-b border-line bg-white px-4 py-2">
          <p className="mr-auto text-sm">
            <span className="font-medium">{user.name}</span>{" "}
            <span className="text-ink-soft">({roleLabel[user.role]})</span>
          </p>
          <button
            type="button"
            onClick={() => setPasswordOpen(true)}
            className={`inline-flex items-center gap-1 rounded-control border border-line px-3 py-2 text-sm ${focus}`}
          >
            <KeyRound aria-hidden size={16} /> Ganti kata sandi
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className={`inline-flex items-center gap-1 rounded-control border border-line px-3 py-2 text-sm ${focus}`}
          >
            <LogOut aria-hidden size={16} /> Keluar
          </button>
        </header>
        <main className="mx-auto max-w-[1280px] p-4 lg:p-6">
          <Outlet />
        </main>
        <div className="p-4">
          <DataSourceIndicator />
        </div>
      </div>
      {passwordOpen && <ChangePasswordDialog onClose={() => setPasswordOpen(false)} />}
    </div>
  );
}
