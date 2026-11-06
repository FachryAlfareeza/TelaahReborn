import { useEffect, useRef, type KeyboardEvent, type RefObject } from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Jebakan terdalam memegang Tab, sehingga dialog di dalam laci tidak ikut diputar laci. */
export function useFocusTrap<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
): { ref: RefObject<T | null>; onKeyDown: (e: KeyboardEvent<T>) => void } {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? ref.current)?.focus();
    return () => previous?.focus();
  }, [open]);

  function onKeyDown(e: KeyboardEvent<T>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    e.stopPropagation();
    const items = ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!items || items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return { ref, onKeyDown };
}
