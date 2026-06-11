"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, FormEvent } from "react";
import LocationSelect from "@/components/LocationSelect";
import type { CarPost } from "@/lib/types";

const MILEAGE_OPTIONS = [
  { value: "", label: "Km de" },
  { value: "0", label: "0" },
  { value: "5000", label: "5.000" },
  { value: "10000", label: "10.000" },
  { value: "20000", label: "20.000" },
  { value: "30000", label: "30.000" },
  { value: "40000", label: "40.000" },
  { value: "60000", label: "60.000" },
  { value: "80000", label: "80.000" },
  { value: "100000", label: "100.000" },
  { value: "120000", label: "120.000" },
  { value: "140000", label: "140.000" },
  { value: "160000", label: "160.000" },
  { value: "180000", label: "180.000" },
  { value: "200000", label: "200.000" },
  { value: "250000", label: "250.000" },
  { value: "300000", label: "300.000" },
];

const VEHICLE_TYPES = ["SUV", "Hatch", "Sedan", "Caminhonete"];

const SORT_OPTIONS = [
  { label: "Data ↓", sortBy: "date", sortOrder: "desc" },
  { label: "Data ↑", sortBy: "date", sortOrder: "asc" },
  { label: "Valor ↓", sortBy: "value", sortOrder: "desc" },
  { label: "Valor ↑", sortBy: "value", sortOrder: "asc" },
];

export default function FilterSidebar({
  isOpen,
  onClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [brand, setBrand] = useState(searchParams.get("brand") || "");
  const [model, setModel] = useState(searchParams.get("model") || "");
  const [yearMin, setYearMin] = useState(searchParams.get("yearMin") || "");
  const [yearMax, setYearMax] = useState(searchParams.get("yearMax") || "");
  const [mileageMin, setMileageMin] = useState(
    searchParams.get("mileageMin") || ""
  );
  const [mileageMax, setMileageMax] = useState(
    searchParams.get("mileageMax") || ""
  );
  const [localization, setLocalization] = useState(
    searchParams.get("localization") || ""
  );
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    searchParams.get("desiredType")?.split(",").filter(Boolean) || []
  );

  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [modelsByBrand, setModelsByBrand] = useState<Record<string, string[]>>(
    {}
  );
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const currentSortBy = searchParams.get("sortBy") || "date";
  const currentSortOrder = searchParams.get("sortOrder") || "desc";

  // Lock body scroll when mobile overlay is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Load brands/models from all posts (unfiltered)
  useEffect(() => {
    fetch("/api/posts")
      .then((r) => r.json())
      .then((data) => {
        const posts: CarPost[] = data.posts || [];
        const brands = [
          ...new Set(posts.map((p) => p.car.brand).filter(Boolean)),
        ].sort();
        setAllBrands(brands);

        const map: Record<string, string[]> = {};
        for (const p of posts) {
          if (p.car.brand && p.car.model) {
            if (!map[p.car.brand]) map[p.car.brand] = [];
            if (!map[p.car.brand].includes(p.car.model)) {
              map[p.car.brand].push(p.car.model);
            }
          }
        }
        for (const key of Object.keys(map)) {
          map[key].sort();
        }
        setModelsByBrand(map);
      })
      .catch(() => {});
  }, []);

  // Update available models when brand changes
  useEffect(() => {
    if (brand && modelsByBrand[brand]) {
      setAvailableModels(modelsByBrand[brand]);
    } else {
      setAvailableModels([]);
    }
  }, [brand, modelsByBrand]);

  const handleTypeToggle = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSort = (sortBy: string, sortOrder: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);
    router.push(`/?${params.toString()}`);
    setShowSortMenu(false);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();

    if (q.trim()) params.set("q", q.trim());
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (brand) params.set("brand", brand);
    if (model) params.set("model", model);
    if (yearMin) params.set("yearMin", yearMin);
    if (yearMax) params.set("yearMax", yearMax);
    if (mileageMin) params.set("mileageMin", mileageMin);
    if (mileageMax) params.set("mileageMax", mileageMax);
    if (localization.trim()) params.set("localization", localization.trim());
    if (selectedTypes.length > 0)
      params.set("desiredType", selectedTypes.join(","));

    // Preserve sort
    params.set("sortBy", currentSortBy);
    params.set("sortOrder", currentSortOrder);

    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
    onClose?.();
  };

  const clearFilters = () => {
    setQ("");
    setMinPrice("");
    setMaxPrice("");
    setBrand("");
    setModel("");
    setYearMin("");
    setYearMax("");
    setMileageMin("");
    setMileageMax("");
    setLocalization("");
    setSelectedTypes([]);
    router.push("/");
    onClose?.();
  };

  const hasFilters =
    q ||
    minPrice ||
    maxPrice ||
    brand ||
    model ||
    yearMin ||
    yearMax ||
    mileageMin ||
    mileageMax ||
    localization ||
    selectedTypes.length > 0;

  const currentSortLabel =
    SORT_OPTIONS.find(
      (o) => o.sortBy === currentSortBy && o.sortOrder === currentSortOrder
    )?.label || "Data ↓";

  const sidebarContent = (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Sort controls (always visible) */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
          Ordenar
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="w-full flex items-center justify-between gap-1 text-sm text-gray-600 border border-gray-300 rounded px-3 py-1.5 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
          >
            {currentSortLabel}
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
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowSortMenu(false)}
              />
              <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
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

      <hr className="border-gray-200" />

      {/* Search */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
          Busca
        </label>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
          placeholder="marca, modelo, título..."
        />
      </div>

      {/* Price */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
          Preço
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
            placeholder="Min."
          />
          <span className="text-gray-400 text-xs shrink-0">—</span>
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
            placeholder="Max."
          />
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Brand */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
          Marca
        </label>
        <select
          value={brand}
          onChange={(e) => {
            setBrand(e.target.value);
            setModel("");
          }}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 bg-white"
        >
          <option value="">Todas as marcas</option>
          {allBrands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      {/* Model */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
          Modelo
        </label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={!brand}
          className={`w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 bg-white ${
            !brand ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <option value="">
            {brand ? "Todos os modelos" : "Selecione uma marca"}
          </option>
          {availableModels.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <hr className="border-gray-200" />

      {/* Year range */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
          Ano
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            value={yearMin}
            onChange={(e) => setYearMin(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
            placeholder="De"
          />
          <span className="text-gray-400 text-xs shrink-0">—</span>
          <input
            type="number"
            value={yearMax}
            onChange={(e) => setYearMax(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
            placeholder="Até"
          />
        </div>
      </div>

      {/* Mileage */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
          Quilometragem
        </label>
        <div className="flex gap-2 items-center">
          <select
            value={mileageMin}
            onChange={(e) => setMileageMin(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 bg-white"
          >
            {MILEAGE_OPTIONS.map((opt, i) => (
              <option key={i} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={mileageMax}
            onChange={(e) => setMileageMax(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 bg-white"
          >
            <option value="">Km até</option>
            {MILEAGE_OPTIONS.filter((o) => o.value).map((opt, i) => (
              <option key={i} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Location */}
      <div>
        <LocationSelect
          label="Localização"
          value={localization}
          onChange={(val) => setLocalization(val)}
        />
      </div>

      {/* Desired vehicle type */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
          Tipo desejado
        </label>
        <div className="flex flex-wrap gap-2">
          {VEHICLE_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleTypeToggle(type)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                selectedTypes.includes(type)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
        >
          Aplicar
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="px-4 py-2 rounded text-sm text-gray-500 hover:text-gray-700 border border-gray-300 hover:border-gray-400 transition-colors cursor-pointer"
          >
            Limpar
          </button>
        )}
      </div>
    </form>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <div className="sticky top-20">
          <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">
            Filtros
          </h3>
          {sidebarContent}
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white overflow-y-auto p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Filtros
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
