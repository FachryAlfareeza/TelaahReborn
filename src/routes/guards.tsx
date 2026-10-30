import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingState } from "../components/LoadingState";
import { useAuth } from "../features/auth/authState";
import { homePath, type Role } from "../lib/roles";

/** Harus sudah masuk. Bila belum, arahkan ke /masuk. */
export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingState label="Memeriksa sesi..." />;
  if (!user) return <Navigate to="/masuk" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Hanya peran yang diizinkan. Peran lain diarahkan ke 403. */
export function RequireRole({ roles }: { roles: Role[] }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <Navigate to="/403" replace />;
  return <Outlet />;
}

/** Alihkan "/" ke beranda sesuai peran. */
export function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState label="Memeriksa sesi..." />;
  return <Navigate to={user ? homePath[user.role] : "/masuk"} replace />;
}
