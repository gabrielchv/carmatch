"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export default function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  };

  const clearFilters = () => {
    setQ("");
    setMinPrice("");
    setMaxPrice("");
    router.push("/");
  };

  const hasFilters = q || minPrice || maxPrice;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-2 bg-white border border-gray-200 rounded-lg p-3"
    >
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-medium mb-1 text-gray-500">
          Buscar
        </label>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
          placeholder="marca, modelo, título..."
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1 text-gray-500">
          Preço min
        </label>
        <input
          type="number"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          className="w-24 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1 text-gray-500">
          Preço max
        </label>
        <input
          type="number"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className="w-24 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 transition-colors"
      >
        Filtrar
      </button>
      {hasFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="text-gray-500 text-sm hover:text-gray-700 px-2 py-1.5"
        >
          Limpar
        </button>
      )}
    </form>
  );
}
