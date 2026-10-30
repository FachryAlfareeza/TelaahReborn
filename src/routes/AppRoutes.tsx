import { Route, Routes } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { CategoryPage } from "../features/admin/CategoryPage";
import { ChecklistPage } from "../features/admin/ChecklistPage";
import { RoPage } from "../features/admin/RoPage";
import { UsersPage } from "../features/admin/UsersPage";
import { LoginPage } from "../features/auth/LoginPage";
import { RocanHomePage } from "../features/rocan/RocanHomePage";
import { ReferenceDocumentsPage } from "../features/rocan/ReferenceDocumentsPage";
import { RocanReviewPage } from "../features/rocan/RocanReviewPage";
import { RocanSubmissionsPage } from "../features/rocan/RocanSubmissionsPage";
import { SatkerHomePage } from "../features/satker/SatkerHomePage";
import { SubmissionDetailPage } from "../features/satker/SubmissionDetailPage";
import { SubmissionsPage } from "../features/satker/SubmissionsPage";
import { SubmitPage } from "../features/satker/SubmitPage";
import { HomeRedirect, RequireAuth, RequireRole } from "./guards";
import { ForbiddenPage, NotFoundPage } from "./pages";

/** Definisi rute. Menu pengelolaan (/admin) hanya untuk Super Admin. */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/masuk" element={<LoginPage />} />
      <Route path="/403" element={<ForbiddenPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route element={<RequireRole roles={["SATKER"]} />}>
            <Route path="/satker" element={<SatkerHomePage />} />
            <Route path="/satker/ajukan" element={<SubmitPage />} />
            <Route path="/satker/pengajuan" element={<SubmissionsPage />} />
            <Route path="/satker/pengajuan/:id" element={<SubmissionDetailPage />} />
          </Route>
          <Route element={<RequireRole roles={["ROCAN", "SUPER_ADMIN"]} />}>
            <Route path="/rocan" element={<RocanHomePage />} />
            <Route path="/rocan/pengajuan" element={<RocanSubmissionsPage />} />
            <Route path="/rocan/pengajuan/:id" element={<RocanReviewPage />} />
            <Route path="/rocan/acuan" element={<ReferenceDocumentsPage />} />
          </Route>
          <Route element={<RequireRole roles={["SUPER_ADMIN"]} />}>
            <Route path="/admin/ro" element={<RoPage />} />
            <Route path="/admin/checklist" element={<ChecklistPage />} />
            <Route path="/admin/kategori" element={<CategoryPage />} />
            <Route path="/admin/pengguna" element={<UsersPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
