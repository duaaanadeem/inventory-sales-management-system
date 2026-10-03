import React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  limit: number;
  onLimitChange: (limit: number) => void;
  totalItems: number;
  className?: string;
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  limit,
  onLimitChange,
  totalItems,
  className = "",
}: PaginationProps) {
  // If no items at all and we're on page 1, we could just hide or show disabled state.
  if (totalItems === 0 && page === 1) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalItems);

  // Calculate page window (max 5 page buttons)
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, -1, totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, -1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, -1, page - 1, page, page + 1, -1, totalPages);
      }
    }
    return pages;
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-100 ${className}`}>
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <span className="text-sm text-slate-500 whitespace-nowrap">
          Showing {startItem}–{endItem} of {totalItems}
        </span>
        <select
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="input !py-1 !pl-2 !pr-8 w-auto text-sm"
        >
          {[10, 20, 50, 100].map((l) => (
            <option key={l} value={l}>
              {l} / page
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1 w-full sm:w-auto justify-center sm:justify-end">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, i) =>
            p === -1 ? (
              <div key={`ellipsis-${i}`} className="w-8 flex justify-center text-slate-400">
                <MoreHorizontal size={16} />
              </div>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                  page === p
                    ? "bg-primary-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
