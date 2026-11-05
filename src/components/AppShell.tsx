import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { KeyRound, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../features/auth/authState";
import { ChangePasswordDialog } from "../features/auth/ChangePasswordDialog";
import { navForRole, roleLabel } from "../lib/roles";
import { DataSourceIndicator } from "./DataSourceIndicator";

const sideButton = "flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-sm text-ink-soft hover:bg-sky-soft hover:text-ink";

/** Kerangka aplikasi: navigasi menurut peran, nama pengguna, ganti kata sandi, keluar. */
export function AppShell() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  if (!user) return null;
  const items = navForRole(user.role);

  return (
    <div className="min-h-screen lg:flex">
      <aside className="bg-sky-pale lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="font-semibold text-brand-deep">Telaah Reborn</p>
            <p className="text-xs text-ink-soft">{roleLabel[user.role]}</p>
          </div>
          <button
            type="button"
            className="rounded-control p-2 hover:bg-sky-soft lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="menu-utama"
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X aria-hidden size={20} /> : <Menu aria-hidden size={20} />}
          </button>
        </div>

        <div id="menu-utama" className={`${menuOpen ? "flex" : "hidden"} flex-1 flex-col px-3 pb-4 lg:flex`}>
          <nav aria-label="Menu utama">
            <ul className="flex flex-col gap-0.5">
              {items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `block rounded-control px-3 py-2 text-sm ${
                        isActive ? "bg-white font-medium text-brand-deep shadow-xs" : "text-ink hover:bg-sky-soft"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-6 border-t border-sky-soft pt-4 lg:mt-auto">
            <p className="truncate px-3 pb-2 text-sm font-medium">{user.name}</p>
            <button type="button" onClick={() => setPasswordOpen(true)} className={sideButton}>
              <KeyRound aria-hidden size={16} /> Ganti kata sandi
            </button>
            <button type="button" onClick={() => void logout()} className={sideButton}>
              <LogOut aria-hidden size={16} /> Keluar
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-[1120px] px-4 py-6 lg:px-10 lg:py-8">
          <Outlet />
        </main>
        <div className="px-4 pb-6 lg:px-10">
          <DataSourceIndicator />
        </div>
      </div>
      {passwordOpen && <ChangePasswordDialog onClose={() => setPasswordOpen(false)} />}
    </div>
  );
}
