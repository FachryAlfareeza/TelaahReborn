import type { ReactNode } from "react";

type Props = {
  title: string;
  /** Di samping judul, mis. penanda hasil AI atau tombol. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Bagian halaman: judul dan isi, dipisah garis tipis dari bagian sebelumnya. Tanpa kotak. */
export function Section({ title, aside, children, className = "" }: Props) {
  return (
    <section className={`border-t border-line pt-6 ${className}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="section-title">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
