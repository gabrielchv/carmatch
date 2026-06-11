"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function FilterBar({
  onToggleFilters,
}: {
  onToggleFilters?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showSortMenu, setShowSortMenu] = useState(false);

  const currentSortBy = searchParams.get("sortBy") || "date";
  const currentSortOrder = searchParams.get("sortOrder") || "desc";

  const handleSort = (sortBy: string, sortOrder: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);
    router.push(`/?${params.toString()}`);
    setShowSortMenu(false);
  };

  const sortOptions = [
    { label: "Data ↓", sortBy: "date", sortOrder: "desc" },
    { label: "Data ↑", sortBy: "date", sortOrder: "asc" },
    { label: "Valor ↓", sortBy: "value", sortOrder: "desc" },
    { label: "Valor ↑", sortBy: "value", sortOrder: "asc" },
  ];

  const currentSortLabel =
    sortOptions.find(
      (o) => o.sortBy === currentSortBy && o.sortOrder === currentSortOrder
    )?.label || "Data ↓";

  return (
    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-3">
      {/* Mobile filter toggle */}
      {onToggleFilters && (
        <button
          type="button"
          onClick={onToggleFilters}
          className="lg:hidden flex items-center gap-1 text-sm text-gray-600 border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Filtros
        </button>
      )}

      {/* Spacer on mobile when filter button is visible */}
      <div className="flex-1 lg:flex-none" />

      {/* Sort dropdown */}
      <div className="relative ml-auto">
        <button
          type="button"
          onClick={() => setShowSortMenu(!showSortMenu)}
          className="flex items-center gap-1 text-sm text-gray-600 border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Ordenar: {currentSortLabel}
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {showSortMenu && (
          <>
            {/* Backdrop to close menu on click outside */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowSortMenu(false)}
            />
            <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
              {sortOptions.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => handleSort(opt.sortBy, opt.sortOrder)}
                  className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer ${
                    opt.sortBy === currentSortBy &&
                    opt.sortOrder === currentSortOrder
                      ? "font-semibold text-blue-600"
                      : "text-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
