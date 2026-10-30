import type { ReactNode } from "react";

export const isDemoShown = () => import.meta.env.VITE_SHOW_DEMO === "true";

/** Pembungkus semua komponen yang hanya untuk demo. Lihat steering demo-flagging.md. */
export function DemoOnly({ children, className = "" }: { children: ReactNode; className?: string }) {
  if (!isDemoShown()) return null;
  return (
    <div data-demo="true" className={`demo-flag ${className}`}>
      {children}
    </div>
  );
}
