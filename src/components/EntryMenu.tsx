import { useEffect, useRef, useState } from "react";
import { Ellipsis, RotateCcw, Trash2 } from "./Icons";

// "…" button that opens a small actions menu (Restore / Delete).
export function EntryMenu({ onRestore, onDelete }: { onRestore: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div className="menu-wrap" ref={ref}>
      <button className="dots-btn" title="More actions" aria-label="More actions" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Ellipsis size={18} />
      </button>
      {open && (
        <div className="menu" role="menu">
          <button role="menuitem" onClick={run(onRestore)}>
            <RotateCcw size={14} /> Restore groups
          </button>
          <button role="menuitem" className="danger" onClick={run(onDelete)}>
            <Trash2 size={14} /> Delete entry
          </button>
        </div>
      )}
    </div>
  );
}
