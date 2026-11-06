import { categoryLabel } from "../lib/verdict";
import type { CodeLabel, ReviewRequest } from "../types";

const codeAndName = (v: CodeLabel) => `${v.code} - ${v.name}`;

/**
 * Hierarki anggaran pengajuan: snapshot saat diajukan (PRD FR-REQ-02). Kode tetap string.
 */
export function ProgramContextPanel({ request }: { request: ReviewRequest }) {
  const rows: [string, string][] = [
    ["Tahun anggaran", String(request.fiscal_year)],
    ["Unit Eselon I", codeAndName(request.unit_eselon1)],
    ["Unit Eselon II", codeAndName(request.unit_eselon2)],
    ["Program", codeAndName(request.program)],
    ["Kegiatan", codeAndName(request.activity)],
    ["KRO", codeAndName(request.kro)],
    ["RO", codeAndName(request.ro)],
    ["Prioritas", request.priority],
    ["Kategori usulan (klaim)", categoryLabel[request.proposal_category]],
  ];
  return (
    <div className="space-y-3">
      <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="term">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="text-sm">
        <p className="term">Deskripsi</p>
        <p className="whitespace-pre-wrap">{request.description}</p>
      </div>
    </div>
  );
}
