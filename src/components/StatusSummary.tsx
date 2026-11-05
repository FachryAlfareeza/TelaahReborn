import { Link } from "react-router-dom";
import { getStatusLabel } from "../lib/status";
import type { Role, Submission, SubmissionStatus } from "../types";
import { StatusBadge } from "./StatusBadge";

type Props = {
  submissions: Submission[];
  statuses: SubmissionStatus[];
  role: Role;
  /** Halaman daftar; tiap status menautkan ke daftar yang sudah disaring. */
  listPath: string;
};

/** Jumlah pengajuan per status dalam satu baris, tiap angka menuju daftar tersaring. */
export function StatusSummary({ submissions, statuses, role, listPath }: Props) {
  return (
    <ul aria-label="Ringkasan pengajuan" className="flex flex-wrap gap-x-8 gap-y-3 border-y border-line py-3">
      {statuses.map((status) => {
        const label = getStatusLabel(status, role);
        // Hitung per label: bagi Satker, "Pemrosesan bermasalah" ikut tampil sebagai "Terupload".
        const count = submissions.filter((s) => getStatusLabel(s.status, role) === label).length;
        return (
          <li key={status}>
            <Link
              to={`${listPath}?status=${encodeURIComponent(label)}`}
              aria-label={`${label}: ${count} pengajuan`}
              className="flex items-baseline gap-2 rounded-control hover:underline"
            >
              <span className="text-xl font-semibold tabular-nums">{count}</span>
              <StatusBadge status={status} role={role} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
