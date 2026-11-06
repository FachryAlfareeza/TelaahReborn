import { useId, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from "lucide-react";
import { EmptyState } from "./EmptyState";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  /** Teks pencarian bila berbeda dari sortValue. */
  searchValue?: (row: T) => string;
  numeric?: boolean;
  width?: string;
};

type Props<T> = {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  pageSize?: number;
  emptyTitle?: string;
  toolbar?: ReactNode;
  onRowClick?: (row: T) => void;
  selectedKey?: string | null;
  /** Mengisi tinggi induk: kepala tabel lengket dan badan menggulir di dalam. */
  fill?: boolean;
};

const PAGE_SIZES = [10, 25, 50, 100];
const collator = new Intl.Collator("id");
/** Klik pada kontrol di dalam baris tidak memilih baris, kecuali tombol pemilih baris itu sendiri. */
const INTERACTIVE = "a, button:not([data-row-activator]), input, select, textarea";

/** Kolom dengan sortValue atau searchValue ikut dicari. */
export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowKey,
  pageSize: initialPageSize = 25,
  emptyTitle = "Belum ada data",
  toolbar,
  onRowClick,
  selectedKey,
  fill = false,
}: Props<T>) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [query, setQuery] = useState("");
  const searchId = useId();
  const sizeId = useId();

  const searchable = columns.some((c) => c.searchValue || c.sortValue);

  const haystacks = useMemo(() => {
    const getters = columns.flatMap((c) => {
      if (c.searchValue) return [c.searchValue];
      const sortValue = c.sortValue;
      return sortValue ? [(r: T) => String(sortValue(r))] : [];
    });
    return new Map(rows.map((r) => [r, getters.map((g) => g(r)).join(" ").toLocaleLowerCase("id")]));
  }, [rows, columns]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("id");
    const filtered = q ? rows.filter((r) => haystacks.get(r)!.includes(q)) : rows;
    const get = columns.find((c) => c.key === sort?.key)?.sortValue;
    if (!get || !sort) return filtered;
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      return (typeof x === "number" && typeof y === "number" ? x - y : collator.compare(String(x), String(y))) * factor;
    });
  }, [rows, haystacks, query, columns, sort]);

  const pageCount = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = visibleRows.slice((current - 1) * pageSize, current * pageSize);

  function toggleSort(key: string) {
    setSort((prev) => (prev?.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  return (
    <div className={`flex flex-col gap-2 ${fill ? "lg:min-h-0 lg:flex-1" : ""}`}>
      {(searchable || toolbar) && (
        <div className="flex flex-wrap items-end gap-2">
          {searchable && (
            <div className="relative">
              <label htmlFor={searchId} className="sr-only">
                Cari di {caption.toLowerCase()}
              </label>
              <Search aria-hidden size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-soft" />
              <input
                id={searchId}
                type="search"
                value={query}
                placeholder="Cari..."
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                className="field w-56 py-1.5 pl-8"
              />
            </div>
          )}
          {toolbar}
          <span className="ml-auto text-xs text-ink-soft tabular-nums">
            {visibleRows.length === rows.length ? `${rows.length} baris` : `${visibleRows.length} dari ${rows.length} baris`}
          </span>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState title={emptyTitle} />
      ) : (
        <div className={`sheet-frame ${fill ? "lg:min-h-0 lg:flex-1" : ""}`}>
          <table className="sheet">
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr>
                {columns.map((c) => {
                  const active = sort?.key === c.key;
                  const SortIcon = !active ? ChevronsUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={c.sortValue ? (active ? (sort.dir === "asc" ? "ascending" : "descending") : "none") : undefined}
                      style={c.width ? { minWidth: c.width } : undefined}
                      className={c.numeric ? "text-right" : ""}
                    >
                      {c.sortValue ? (
                        <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 rounded-control">
                          {c.header}
                          <SortIcon aria-hidden="true" size={12} />
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
              {visible.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="py-6 text-center text-ink-soft">
                    Tidak ada baris yang cocok dengan pencarian.
                  </td>
                </tr>
              )}
              {visible.map((row) => {
                const key = getRowKey(row);
                const selected = selectedKey === key;
                return (
                  <tr
                    key={key}
                    data-selected={selected || undefined}
                    onClick={onRowClick && ((e) => !(e.target as HTMLElement).closest(INTERACTIVE) && onRowClick(row))}
                    className={onRowClick ? "cursor-pointer" : undefined}
                  >
                    {columns.map((c, i) =>
                      i === 0 ? (
                        <th key={c.key} scope="row" className="font-medium">
                          {onRowClick ? (
                            // Tombol pemilih agar baris bisa dipilih dengan papan ketik; kliknya diteruskan ke baris.
                            <button type="button" data-row-activator aria-current={selected || undefined} className="text-left hover:text-brand-deep">
                              {c.render(row)}
                            </button>
                          ) : (
                            c.render(row)
                          )}
                        </th>
                      ) : (
                        <td key={c.key} className={`tabular-nums ${c.numeric ? "text-right" : ""}`}>
                          {c.render(row)}
                        </td>
                      ),
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && visibleRows.length > PAGE_SIZES[0] && (
        <nav aria-label="Halaman tabel" className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-soft">
          <span className="flex items-center gap-2">
            <label htmlFor={sizeId}>Baris per halaman</label>
            <select
              id={sizeId}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="field w-auto py-1"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </span>
          <span className="flex items-center gap-2">
            <span aria-live="polite">
              Halaman {current} dari {pageCount}
            </span>
            <button type="button" disabled={current <= 1} onClick={() => setPage(current - 1)} className="btn btn-secondary btn-sm">
              Sebelumnya
            </button>
            <button type="button" disabled={current >= pageCount} onClick={() => setPage(current + 1)} className="btn btn-secondary btn-sm">
              Berikutnya
            </button>
          </span>
        </nav>
      )}
    </div>
  );
}
