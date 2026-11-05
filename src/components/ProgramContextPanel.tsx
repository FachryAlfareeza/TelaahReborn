import { displayValue } from "../lib/empty";
import type { Submission } from "../types";

type Context = Submission["context"];

/** Gabungan kode dan nama. Kode tetap string; bila keduanya kosong tampil "—". */
function codeAndName(code: string | null, name: string | null): string {
  if (code === null && name === null) return displayValue(null);
  return [code, name].filter((v) => v !== null && v.trim() !== "").join(" - ") || displayValue(null);
}

/** Konteks program: tahun anggaran sampai RO. Nilai kosong tampil "—". */
export function ProgramContextPanel({ context }: { context: Context }) {
  const rows: [string, string][] = [
    ["Tahun anggaran", displayValue(context.fiscalYear)],
    ["Kementerian", displayValue(context.ministry)],
    ["Unit", displayValue(context.unit)],
    ["Program", codeAndName(context.programCode, context.programName)],
    ["Kegiatan", codeAndName(context.activityCode, context.activityName)],
    ["KRO", codeAndName(context.kroCode, context.kroName)],
    ["RO", codeAndName(context.roCode, context.roName)],
  ];
  return (
    <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="term">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
