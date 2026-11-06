import { Link } from "react-router-dom";
import { useMarkNotificationRead, useNotifications } from "../../api/queries";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { formatDate } from "../../lib/date";
import { useAuth } from "../auth/authState";

/** Notifikasi in-app belum dibaca (PRD §8.13, kontrak §3.11). */
export function NotificationsPage() {
  const { user } = useAuth();
  const list = useNotifications();
  const mark = useMarkNotificationRead();
  const detailPath = (id: string) => (user?.role === "satker" ? `/satker/pengajuan/${id}` : `/rocan/pengajuan/${id}`);

  return (
    <div className="space-y-4">
      <h1 className="page-title">Notifikasi</h1>
      {list.isPending && <LoadingState />}
      {list.error && <ErrorState message={list.error.message} onRetry={() => void list.refetch()} />}
      {mark.error && <ErrorState message={mark.error.message} />}
      {list.data &&
        (list.data.length === 0 ? (
          <EmptyState title="Tidak ada notifikasi baru." />
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {list.data.map((n) => (
              <li key={n.id} className="flex flex-wrap items-start gap-x-6 gap-y-1 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{n.judul}</p>
                  <p className="text-sm">{n.pesan}</p>
                  <p className="text-xs text-ink-soft">{formatDate(n.created_at)}</p>
                </div>
                <div className="flex gap-3 text-sm">
                  {n.related_review_id && user?.role !== "super_admin" && (
                    <Link
                      to={detailPath(n.related_review_id)}
                      onClick={() => mark.mutate(n.id)}
                      className="link"
                    >
                      Buka pengajuan
                    </Link>
                  )}
                  <button type="button" className="link" onClick={() => mark.mutate(n.id)} aria-label={`Tandai dibaca: ${n.judul}`}>
                    Tandai dibaca
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
