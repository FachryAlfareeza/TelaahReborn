import type { User } from "../types";

export type Role = User["role"];

export const roleLabel: Record<Role, string> = {
  SATKER: "Satker",
  ROCAN: "ROCAN",
  SUPER_ADMIN: "Super Admin",
};

export const homePath: Record<Role, string> = {
  SATKER: "/satker",
  ROCAN: "/rocan",
  SUPER_ADMIN: "/rocan",
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
  { to: "/rocan/acuan", label: "Dokumen Acuan" },
];
const adminNav: NavItem[] = [
  { to: "/admin/ro", label: "Master RO" },
  { to: "/admin/checklist", label: "Checklist" },
  { to: "/admin/kategori", label: "Kategori" },
  { to: "/admin/pengguna", label: "Akun Pengguna" },
];

/** Menu per peran. Menu pengelolaan hanya untuk Super Admin. */
export function navForRole(role: Role): NavItem[] {
  if (role === "SATKER") return satkerNav;
  if (role === "ROCAN") return rocanNav;
  return [...rocanNav, ...adminNav];
}
