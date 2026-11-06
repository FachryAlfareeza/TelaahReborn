import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Bell, LogOut, Menu, X } from "lucide-react";
import { useUnreadCount } from "../api/queries";
import { useAuth } from "../features/auth/authState";
import { navForRole, roleLabel } from "../lib/roles";
import { DataSourceIndicator } from "./DataSourceIndicator";

const sideButton =
  "flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-sm text-ink-soft hover:bg-sky-soft hover:text-ink";
const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-control px-3 py-2 text-sm ${
    isActive ? "bg-white font-medium text-brand-deep shadow-xs" : "text-ink hover:bg-sky-soft"
  }`;

export function AppShell() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const unread = useUnreadCount();
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  // Di layar besar <main> yang menggulir, bukan jendela; mulai dari atas setiap pindah halaman.
  useEffect(() => {
    mainRef.current?.scrollTo?.(0, 0);
  }, [pathname]);
  if (!user) return null;
  const items = navForRole(user.role);
  const count = unread.data ?? 0;

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
                  <NavLink to={item.to} end={item.end} onClick={() => setMenuOpen(false)} className={navClass}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
              <li>
                <NavLink
                  to="/notifikasi"
                  onClick={() => setMenuOpen(false)}
                  className={navClass}
                  aria-label={count > 0 ? `Notifikasi, ${count} belum dibaca` : "Notifikasi"}
                >
                  <Bell aria-hidden size={16} />
                  Notifikasi
                  {count > 0 && (
                    <span className="ml-auto rounded-full bg-brand px-1.5 text-xs font-semibold text-white tabular-nums">
                      {count}
                    </span>
                  )}
                </NavLink>
              </li>
            </ul>
          </nav>

          <div className="mt-6 border-t border-sky-soft pt-4 lg:mt-auto">
            <p className="truncate px-3 text-sm font-medium">{user.nama}</p>
            <p className="truncate px-3 pb-2 text-xs text-ink-soft tabular-nums">NIP {user.nip}</p>
            {user.unit_eselon2 && <p className="px-3 pb-2 text-xs text-ink-soft">{user.unit_eselon2.name}</p>}
            <button type="button" onClick={() => void logout()} className={sideButton}>
              <LogOut aria-hidden size={16} /> Keluar
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:h-screen">
        <main ref={mainRef} className="mx-auto w-full max-w-[1600px] px-4 py-5 lg:min-h-0 lg:flex-1 lg:overflow-auto lg:px-8">
          <Outlet />
        </main>
        <div className="px-4 py-2 lg:px-8">
          <DataSourceIndicator />
        </div>
      </div>
    </div>
  );
}
