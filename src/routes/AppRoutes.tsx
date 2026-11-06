import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { UsersPage } from "../features/admin/UsersPage";
import { LoginPage } from "../features/auth/LoginPage";
import { NotificationsPage } from "../features/notifications/NotificationsPage";
import { ChecklistPage } from "../features/rocan/ChecklistPage";
import { CurationPage } from "../features/rocan/CurationPage";
import { MasterRoPage } from "../features/rocan/MasterRoPage";
import { ReferencePage } from "../features/rocan/ReferencePage";
import { RocanHomePage } from "../features/rocan/RocanHomePage";
import { RocanReviewPage } from "../features/rocan/RocanReviewPage";
import { RocanSubmissionsPage } from "../features/rocan/RocanSubmissionsPage";
import { SatkerHomePage } from "../features/satker/SatkerHomePage";
import { SubmissionDetailPage } from "../features/satker/SubmissionDetailPage";
import { SubmissionsPage } from "../features/satker/SubmissionsPage";
import { SubmitPage } from "../features/satker/SubmitPage";
import { HomeRedirect, RequireAuth, RequireRole } from "./guards";
import { ForbiddenPage, NotFoundPage } from "./pages";

/** Penjaga rute hanya untuk tampilan; backend tetap memeriksa peran dan kepemilikan. */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/masuk" element={<LoginPage />} />
      <Route path="/403" element={<ForbiddenPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/notifikasi" element={<NotificationsPage />} />
          <Route element={<RequireRole roles={["satker"]} />}>
            <Route path="/satker" element={<SatkerHomePage />} />
            <Route path="/satker/ajukan" element={<SubmitPage />} />
            <Route path="/satker/pengajuan" element={<SubmissionsPage />} />
            <Route path="/satker/pengajuan/:id" element={<SubmissionDetailPage />} />
          </Route>
          <Route element={<RequireRole roles={["rocan"]} />}>
            <Route path="/rocan" element={<RocanHomePage />} />
            <Route path="/rocan/pengajuan" element={<RocanSubmissionsPage />} />
            <Route path="/rocan/pengajuan/:id" element={<RocanReviewPage />} />
            <Route path="/rocan/checklist" element={<ChecklistPage />} />
            <Route path="/rocan/acuan" element={<ReferencePage />} />
            {/* Tabel acuan digabung ke halaman Acuan. */}
            <Route path="/rocan/tabel-acuan" element={<Navigate to="/rocan/acuan" replace />} />
            <Route path="/rocan/master-ro" element={<MasterRoPage />} />
            <Route path="/rocan/kurasi" element={<CurationPage />} />
          </Route>
          <Route element={<RequireRole roles={["super_admin"]} />}>
            <Route path="/admin/pengguna" element={<UsersPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
