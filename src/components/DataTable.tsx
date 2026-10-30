import { useId, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { EmptyState } from "./EmptyState";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Bila ada, kolom bisa diurutkan. */
  sortValue?: (row: T) => string | number;
  numeric?: boolean;
};

type Props<T> = {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  pageSize?: number;
  emptyTitle?: string;
};

/** Tabel semantik: caption, header berlingkup, urutan, dan halaman. */
export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowKey,
  pageSize = 10,
  emptyTitle = "Belum ada data",
}: Props<T>) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const liveId = useId();

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort?.key);
    if (!col?.sortValue || !sort) return rows;
    const get = col.sortValue;
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      if (typeof x === "number" && typeof y === "number") return (x - y) * factor;
      return String(x).localeCompare(String(y), "id") * factor;
    });
  }, [rows, columns, sort]);

  if (rows.length === 0) return <EmptyState title={emptyTitle} />;

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = sorted.slice((current - 1) * pageSize, current * pageSize);

  function toggleSort(key: string) {
    setSort((prev) =>
      prev?.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  }

  return (
    <div className="rounded-card border border-line bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="p-4 text-left text-base font-semibold text-brand-deep">{caption}</caption>
          <thead className="bg-sky-pale text-brand-deep">
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                const ariaSort = active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined;
                const SortIcon = !active ? ChevronsUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={c.sortValue ? (ariaSort ?? "none") : undefined}
                    className={`px-4 py-2 font-semibold ${c.numeric ? "text-right" : ""}`}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className="inline-flex items-center gap-1 rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                      >
                        {c.header}
                        <SortIcon aria-hidden="true" size={14} />
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={getRowKey(row)} className="border-t border-line">
                {columns.map((c, i) =>
                  i === 0 ? (
                    <th key={c.key} scope="row" className="px-4 py-2 font-medium">
                      {c.render(row)}
                    </th>
                  ) : (
                    <td key={c.key} className={`px-4 py-2 tabular-nums ${c.numeric ? "text-right" : ""}`}>
                      {c.render(row)}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <nav aria-label="Halaman tabel" className="flex items-center justify-between gap-2 border-t border-line p-4 text-sm">
          <span id={liveId} aria-live="polite">
            Halaman {current} dari {pageCount}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={current <= 1}
              onClick={() => setPage(current - 1)}
              className="rounded-control border border-line px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              disabled={current >= pageCount}
              onClick={() => setPage(current + 1)}
              className="rounded-control border border-line px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50"
            >
              Berikutnya
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
