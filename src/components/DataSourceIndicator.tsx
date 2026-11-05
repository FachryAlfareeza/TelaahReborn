import { DemoOnly } from "./DemoOnly";
import { getApiClient } from "../api";

/** Penanda sumber data. Hanya tampil (sebagai demo) bila memakai data contoh. */
export function DataSourceIndicator() {
  if (getApiClient().mode !== "mock") return null;
  return (
    <DemoOnly>
      <p className="px-2 py-1 text-sm">Sumber data: contoh (mock), tersimpan di website ini.</p>
    </DemoOnly>
  );
}
