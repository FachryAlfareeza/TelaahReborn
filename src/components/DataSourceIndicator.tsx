import { DemoOnly } from "./DemoOnly";
import { getApiClient } from "../api";

/** Penanda sumber data. Hanya tampil (sebagai demo) bila memakai data contoh. */
export function DataSourceIndicator() {
  if (getApiClient().mode !== "mock") return null;
  return (
    <DemoOnly className="inline-block">
      <p className="px-3 py-1.5 pr-14 text-sm">Data contoh (mock), disimpan di peramban ini.</p>
    </DemoOnly>
  );
}
