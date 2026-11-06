import type { Role } from "../types";

export type { Role };

export const roleLabel: Record<Role, string> = {
  satker: "Satker",
  rocan: "ROCAN",
  super_admin: "Super Admin",
};

/** Pembagian peran mengikuti PRD §5. */
export const homePath: Record<Role, string> = {
  satker: "/satker",
  rocan: "/rocan",
  super_admin: "/admin/pengguna",
};

export type NavItem = { to: string; label: string; end?: boolean };

const satkerNav: NavItem[] = [
  { to: "/satker", label: "Beranda", end: true },
  { to: "/satker/ajukan", label: "Ajukan Baru" },
  { to: "/satker/pengajuan", label: "Pengajuan Saya" },
];
const rocanNav: NavItem[] = [
  { to: "/rocan", label: "Beranda", end: true },
  { to: "/rocan/pengajuan", label: "Daftar Pengajuan" },
  { to: "/rocan/checklist", label: "Checklist" },
  { to: "/rocan/acuan", label: "Acuan" },
  { to: "/rocan/master-ro", label: "Master RO" },
  { to: "/rocan/kurasi", label: "Kurasi Data" },
];
const adminNav: NavItem[] = [{ to: "/admin/pengguna", label: "Akun Pengguna" }];

export function navForRole(role: Role): NavItem[] {
  if (role === "satker") return satkerNav;
  if (role === "rocan") return rocanNav;
  return adminNav;
}
