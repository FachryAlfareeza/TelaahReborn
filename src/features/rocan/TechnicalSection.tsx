import { useId, useState } from "react";
import { saveBlob } from "../../lib/files";
import { displayValue } from "../../lib/empty";
import type { Progress, ReviewResult } from "../../types";

type Props = {
  requestId: string;
  result?: ReviewResult;
  progress?: Progress;
};

/** Hanya ROCAN; tidak dibutuhkan untuk memahami hasil. */
export function TechnicalSection({ requestId, result, progress }: Props) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const raw = JSON.stringify({ result: result ?? null, progress: progress ?? null }, null, 2);
  const p = result?.provenance;
  const rows: [string, string][] = [
    ["Run", displayValue(result?.run_id ?? progress?.run_id)],
    ["Jalur ekstraksi", displayValue(result?.extraction_path ?? progress?.extraction_path)],
    ["Versi checklist", displayValue(result?.checklist_version_id)],
    ["Versi skema ekstraksi", displayValue(p?.extraction_schema_version)],
    ["Versi aturan Lapis A", displayValue(p?.lapis_a_ruleset_version)],
    ["Tabel acuan dipakai", p?.reference_table_versions.length ? p.reference_table_versions.join(", ") : "—"],
    ["Model LLM", displayValue(p?.llm_model)],
    ["Model embedding", displayValue(p?.embedding_model)],
    ["Versi prompt", displayValue(p?.prompt_version)],
    ["Job Tim 1", displayValue(p?.team1_job_id)],
  ];

  return (
    <div>
      <button
        type="button"
        className="btn btn-secondary"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Sembunyikan bagian teknis" : "Tampilkan bagian teknis"}
      </button>
      {open && (
        <div id={panelId} className="mt-3 space-y-4 text-sm">
          <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt className="term">{k}</dt>
                <dd className="break-all tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => saveBlob(new Blob([raw], { type: "application/json" }), `hasil-${requestId}.json`)}
          >
            Unduh JSON
          </button>
          <pre className="max-h-96 overflow-auto rounded-control bg-sky-pale p-3 text-xs">{raw}</pre>
        </div>
      )}
    </div>
  );
}
