"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export default function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [brand, setBrand] = useState(searchParams.get("brand") || "");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (brand) params.set("brand", brand);
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  };

  const handleClear = () => {
    setMinPrice("");
    setMaxPrice("");
    setBrand("");
    router.push("/");
  };

  const hasFilters = minPrice || maxPrice || brand;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 bg-white border border-gray-200 rounded-lg p-4"
    >
      <div>
        <label className="block text-xs font-medium mb-1 text-gray-500">
          Min Price (R$)
        </label>
        <input
          type="number"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          className="w-28 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1 text-gray-500">
          Max Price (R$)
        </label>
        <input
          type="number"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className="w-28 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1 text-gray-500">
          Brand
        </label>
        <input
          type="text"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className="w-32 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
          placeholder="e.g. Honda"
        />
      </div>
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 transition-colors"
      >
        Filter
      </button>
      {hasFilters && (
        <button
          type="button"
          onClick={handleClear}
          className="text-gray-500 text-sm hover:text-gray-700 px-2 py-1.5"
        >
          Clear
        </button>
      )}
    </form>
  );
}
