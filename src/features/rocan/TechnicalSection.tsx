import { useId, useState } from "react";
import { technicalStatusLabel } from "../../lib/verdict";
import type { Role, Screening1Node, Screening1Result, Screening2Result } from "../../types";

type Props = {
  role: Role;
  submissionId: string;
  screening1?: Screening1Result;
  screening2?: Screening2Result;
};

function collectNodes(items: Screening1Node[]): Screening1Node[] {
  return items.flatMap((n) => [n, ...collectNodes(n.children)]);
}

/** Bagian belakang: hanya ROCAN dan Super Admin, tersembunyi di balik tombol. */
export function TechnicalSection({ role, submissionId, screening1, screening2 }: Props) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  if (role === "SATKER") return null;

  const nodes = screening1 ? collectNodes(screening1.items) : [];
  const evidenceIds = [
    ...nodes.flatMap((n) => n.evidence.map((e) => e.id)),
    ...(screening2?.questions.flatMap((q) => q.evidence.map((e) => e.id)) ?? []),
  ];
  const problems = [
    ...nodes.filter((n) => n.technicalStatus !== "NORMAL").map((n) => ({ code: n.code, status: n.technicalStatus })),
    ...(screening2?.questions
      .filter((q) => q.technicalStatus !== "NORMAL")
      .map((q) => ({ code: q.code, status: q.technicalStatus })) ?? []),
  ];
  const raw = JSON.stringify({ screening1: screening1 ?? null, screening2: screening2 ?? null }, null, 2);

  function download() {
    const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `hasil-${submissionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <button type="button" className="btn btn-secondary" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)}>
        {open ? "Sembunyikan bagian teknis" : "Tampilkan bagian teknis"}
      </button>
      {open && (
        <div id={panelId} className="mt-3 space-y-4 rounded-card border border-line bg-white p-4 text-sm">
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-ink-soft">Versi checklist</dt>
              <dd className="font-medium">{screening1?.checklistVersion ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Model</dt>
              <dd className="font-medium">{screening1?.model ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Skor kemiripan</dt>
              <dd className="font-medium">—</dd>
            </div>
          </dl>
          <div>
            <h3 className="font-medium">Status teknis</h3>
            {problems.length === 0 ? (
              <p className="text-ink-soft">Semua butir normal.</p>
            ) : (
              <ul className="list-disc pl-5">
                {problems.map((p) => (
                  <li key={p.code}>
                    {p.code}: {technicalStatusLabel[p.status]}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="font-medium">ID bukti</h3>
            {evidenceIds.length === 0 ? (
              <p className="text-ink-soft">—</p>
            ) : (
              <p className="break-all">{evidenceIds.join(", ")}</p>
            )}
          </div>
          <div>
            <h3 className="font-medium">JSON mentah</h3>
            <pre tabIndex={0} className="max-h-80 overflow-auto rounded-control bg-sky-pale p-3 text-xs">
              {raw}
            </pre>
          </div>
          <button type="button" className="btn btn-secondary" onClick={download}>
            Unduh JSON
          </button>
        </div>
      )}
    </div>
  );
}
