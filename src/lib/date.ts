import { EMPTY_VALUE } from "./empty";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const dateTimeFormat = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Jakarta",
});

/**
 * Satu-satunya tempat menampilkan tanggal. Menerima teks ISO 8601.
 * "2025-03-05" menjadi "5 Maret 2025". Dengan jam, ditampilkan dalam WIB.
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return EMPTY_VALUE;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return EMPTY_VALUE;
  if (DATE_ONLY.test(iso)) return dateFormat.format(date);
  return `${dateTimeFormat.format(date).replace(" pukul ", ", ").replace(".", ":")} WIB`;
}
