import React from "react";

/** Numeric pagination with pill page buttons, used by list/table pages. */
export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-1.5 flex-wrap py-4">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 border border-slate-200 bg-[var(--surface)] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--surface)] transition-colors"
      >
        &lt; Prev
      </button>

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={
            "min-w-[32px] px-3 py-1.5 rounded-full text-xs font-semibold transition-colors " +
            (p === page
              ? "bg-[var(--primary-strong)] text-white"
              : "text-slate-600 border border-slate-200 bg-[var(--surface)] hover:bg-slate-50")
          }
        >
          {p}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 border border-slate-200 bg-[var(--surface)] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--surface)] transition-colors"
      >
        Next &gt;
      </button>
    </div>
  );
}
