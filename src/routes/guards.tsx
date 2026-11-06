import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingState } from "../components/LoadingState";
import { useAuth } from "../features/auth/authState";
import { homePath, type Role } from "../lib/roles";

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingState label="Memeriksa sesi..." />;
  if (!user) return <Navigate to="/masuk" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function RequireRole({ roles }: { roles: Role[] }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <Navigate to="/403" replace />;
  return <Outlet />;
}

export function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState label="Memeriksa sesi..." />;
  return <Navigate to={user ? homePath[user.role] : "/masuk"} replace />;
}
