"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface VehicleRow {
  id: number;
  brand: string;
  model: string;
  yearMin: string;
  yearMax: string;
  cashAdj: string;
  tolerance: string;
}

let rowId = 0;

function freshRow(): VehicleRow {
  return { id: ++rowId, brand: "", model: "", yearMin: "", yearMax: "", cashAdj: "0", tolerance: "0" };
}

export default function PostForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<VehicleRow[]>([freshRow()]);

  const addRow = () => setRows([...rows, freshRow()]);
  const removeRow = (id: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((r) => r.id !== id));
  };
  const updateRow = (id: number, field: keyof VehicleRow, value: string) =>
    setRows(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      // Monta os arrays de vehicle no formData
      // (os inputs já têm name=vBrand, vModel, etc.)
      // Mas o React não gerencia bem fields dinâmicos com name repetido,
      // então vamos limpar e readicionar manualmente
      // Remove fields antigos pra não duplicar
      for (const key of ["vBrand","vModel","vYearMin","vYearMax","vCashAdj","vTolerance"]) {
        formData.delete(key);
      }
      for (const r of rows) {
        if (!r.brand.trim()) continue;
        formData.append("vBrand", r.brand.trim());
        formData.append("vModel", r.model.trim());
        formData.append("vYearMin", r.yearMin);
        formData.append("vYearMax", r.yearMax);
        formData.append("vCashAdj", r.cashAdj);
        formData.append("vTolerance", r.tolerance);
      }

      const res = await fetch("/api/posts", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao criar anúncio");
        return;
      }
      router.push("/my-posts");
      router.refresh();
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Título */}
      <fieldset className="border border-gray-200 rounded p-4 space-y-3">
        <legend className="font-semibold text-sm px-1">Título do Anúncio</legend>
        <input
          name="title"
          required
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          placeholder="Ex: Honda Fit 2008 - Excelente estado"
        />
      </fieldset>

      {/* Meu Carro */}
      <fieldset className="border border-gray-200 rounded p-4 space-y-3">
        <legend className="font-semibold text-sm px-1">Meu Carro</legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium mb-1">Marca *</label>
            <input name="brand" required className="input-field" placeholder="Ex: Honda" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium mb-1">Modelo *</label>
            <input name="model" required className="input-field" placeholder="Ex: Fit" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ano *</label>
            <input name="year" type="number" required className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Valor estimado (R$) *</label>
            <input name="estimatedValue" type="number" required className="input-field" />
          </div>
        </div>
      </fieldset>

      {/* O que eu quero na troca */}
      <fieldset className="border border-gray-200 rounded p-4 space-y-3">
        <legend className="font-semibold text-sm px-1">O que eu quero na troca</legend>

        <p className="text-xs text-gray-500">
          Adicione os carros que você aceitaria na troca. Cada um pode ter seu próprio ajuste de grana, ano e tolerância.
        </p>

        {rows.map((r, idx) => (
          <div key={r.id} className="border border-gray-100 rounded p-3 space-y-2 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">Veículo {idx + 1}</span>
              <button
                type="button"
                onClick={() => removeRow(r.id)}
                disabled={rows.length <= 1}
                className="text-red-400 hover:text-red-600 disabled:opacity-30 text-sm px-1"
              >
                ✕ remover
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-0.5 text-gray-500">Marca</label>
                <input
                  value={r.brand}
                  onChange={(e) => updateRow(r.id, "brand", e.target.value)}
                  className="input-field"
                  placeholder="Ex: Toyota"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-0.5 text-gray-500">Modelo</label>
                <input
                  value={r.model}
                  onChange={(e) => updateRow(r.id, "model", e.target.value)}
                  className="input-field"
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1">
              <div className="min-w-0">
                <label className="block text-[10px] font-medium mb-0.5 text-gray-500 truncate">Ano min</label>
                <input
                  value={r.yearMin}
                  onChange={(e) => updateRow(r.id, "yearMin", e.target.value)}
                  type="number"
                  className="w-full border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-[10px] font-medium mb-0.5 text-gray-500 truncate">Ano max</label>
                <input
                  value={r.yearMax}
                  onChange={(e) => updateRow(r.id, "yearMax", e.target.value)}
                  type="number"
                  className="w-full border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-[10px] font-medium mb-0.5 text-gray-500 truncate">Grania (R$)</label>
                <input
                  value={r.cashAdj}
                  onChange={(e) => updateRow(r.id, "cashAdj", e.target.value)}
                  type="number"
                  className="w-full border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-[10px] font-medium mb-0.5 text-gray-500 truncate">±Tolerância</label>
                <input
                  value={r.tolerance}
                  onChange={(e) => updateRow(r.id, "tolerance", e.target.value)}
                  type="number"
                  className="w-full border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <p className="text-[10px] text-gray-400 leading-tight">
              <strong>Grania positiva</strong> = você paga esse valor. <strong>Negativa</strong> = você recebe.
            </p>
          </div>
        ))}

        <button type="button" onClick={addRow} className="text-blue-600 text-sm hover:text-blue-800">
          + Adicionar outro veículo
        </button>
      </fieldset>

      {/* Contato */}
      <fieldset className="border border-gray-200 rounded p-4 space-y-3">
        <legend className="font-semibold text-sm px-1">Contato</legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">WhatsApp (com código do país)</label>
            <input name="whatsapp" className="input-field" placeholder="+5511999999999" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input name="email" type="email" className="input-field" />
          </div>
        </div>
      </fieldset>

      {/* Fotos */}
      <fieldset className="border border-gray-200 rounded p-4 space-y-3">
        <legend className="font-semibold text-sm px-1">Fotos</legend>
        <input name="images" type="file" multiple accept="image/*" className="text-sm" />
        <p className="text-xs text-gray-400">Uma ou mais fotos do seu carro</p>
      </fieldset>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
        >
          {loading ? "Publicando..." : "Publicar Anúncio"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-gray-300 px-6 py-2 rounded hover:bg-gray-50 transition-colors text-sm"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
