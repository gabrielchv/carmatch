"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SearchableSelect, { type SelectOption } from "@/components/SearchableSelect";

interface VehicleRow {
  id: number;
  brandId: string;
  brandLabel: string;
  modelId: string;
  modelLabel: string;
  yearMin: string;
  yearMax: string;
  cashAdj: string;
  tolerance: string;
}

let rowId = 0;

function freshRow(): VehicleRow {
  return {
    id: ++rowId,
    brandId: "",
    brandLabel: "",
    modelId: "",
    modelLabel: "",
    yearMin: "",
    yearMax: "",
    cashAdj: "0",
    tolerance: "0",
  };
}

export default function PostForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ───── FIPE brands (global, carregado uma vez) ─────
  const [brands, setBrands] = useState<SelectOption[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);

  // ───── Meu Carro (cascata FIPE) ─────
  const [myBrandId, setMyBrandId] = useState("");
  const [myBrandLabel, setMyBrandLabel] = useState("");
  const [myModelId, setMyModelId] = useState("");
  const [myModelLabel, setMyModelLabel] = useState("");
  const [myYearCode, setMyYearCode] = useState("");
  const [myYearLabel, setMyYearLabel] = useState("");
  const [myYearNumber, setMyYearNumber] = useState(""); // extraído do AnoModelo

  const [myModels, setMyModels] = useState<SelectOption[]>([]);
  const [myModelsLoading, setMyModelsLoading] = useState(false);
  const [myYears, setMyYears] = useState<SelectOption[]>([]);
  const [myYearsLoading, setMyYearsLoading] = useState(false);

  const [myEstimatedValue, setMyEstimatedValue] = useState("");
  const [myEstimatedValueEdited, setMyEstimatedValueEdited] = useState(false);

  // ───── Veículos desejados ─────
  const [rows, setRows] = useState<VehicleRow[]>([freshRow()]);
  const [rowModels, setRowModels] = useState<Record<number, SelectOption[]>>({});
  const [rowModelsLoading, setRowModelsLoading] = useState<Record<number, boolean>>({});

  // ================================================================
  // BRANDS – carrega uma vez
  // ================================================================
  useEffect(() => {
    fetch("/api/fipe/brands")
      .then((r) => {
        if (!r.ok) throw new Error("Falha ao carregar marcas");
        return r.json();
      })
      .then((data: { codigo: string; nome: string }[]) => {
        setBrands(data.map((b) => ({ value: b.codigo, label: b.nome })));
      })
      .catch(() => setError("Erro ao carregar marcas da Tabela FIPE"))
      .finally(() => setBrandsLoading(false));
  }, []);

  // ================================================================
  // MEU CARRO – cascata
  // ================================================================

  // Quando marca do meu carro muda → carrega modelos
  useEffect(() => {
    if (!myBrandId) {
      setMyModels([]);
      setMyModelId("");
      setMyModelLabel("");
      setMyYears([]);
      setMyYearCode("");
      setMyYearLabel("");
      setMyYearNumber("");
      if (!myEstimatedValueEdited) setMyEstimatedValue("");
      return;
    }
    setMyModelsLoading(true);
    setMyModelId("");
    setMyModelLabel("");
    setMyYears([]);
    setMyYearCode("");
    setMyYearLabel("");
    setMyYearNumber("");
    if (!myEstimatedValueEdited) setMyEstimatedValue("");

    fetch(`/api/fipe/models?brandId=${myBrandId}`)
      .then((r) => r.json())
      .then((data: { codigo: number; nome: string }[]) => {
        setMyModels(data.map((m) => ({ value: String(m.codigo), label: m.nome })));
      })
      .finally(() => setMyModelsLoading(false));
  }, [myBrandId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Quando modelo do meu carro muda → carrega anos
  useEffect(() => {
    if (!myBrandId || !myModelId) {
      setMyYears([]);
      setMyYearCode("");
      setMyYearLabel("");
      setMyYearNumber("");
      if (!myEstimatedValueEdited) setMyEstimatedValue("");
      return;
    }
    setMyYearsLoading(true);
    setMyYearCode("");
    setMyYearLabel("");
    setMyYearNumber("");
    if (!myEstimatedValueEdited) setMyEstimatedValue("");

    fetch(`/api/fipe/years?brandId=${myBrandId}&modelId=${myModelId}`)
      .then((r) => r.json())
      .then((data: { codigo: string; nome: string }[]) => {
        setMyYears(data.map((y) => ({ value: y.codigo, label: y.nome })));
      })
      .finally(() => setMyYearsLoading(false));
  }, [myBrandId, myModelId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Quando ano do meu carro muda → busca preço FIPE
  useEffect(() => {
    if (!myBrandId || !myModelId || !myYearCode) return;
    fetch(
      `/api/fipe/price?brandId=${myBrandId}&modelId=${myModelId}&yearCode=${myYearCode}`
    )
      .then((r) => r.json())
      .then((data: { Valor: string; AnoModelo: number }) => {
        // Valor vem como "R$ 25.000,00" → extrai número
        const cleaned = data.Valor.replace(/[R$\s.]/g, "").replace(",", ".");
        const price = parseFloat(cleaned);
        if (!isNaN(price) && !myEstimatedValueEdited) {
          setMyEstimatedValue(String(Math.round(price)));
        }
        setMyYearNumber(String(data.AnoModelo));
      })
      .catch(() => {
        // Se falhar, o usuário preenche manualmente
      });
  }, [myBrandId, myModelId, myYearCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ================================================================
  // VEÍCULOS DESEJADOS – cascata por linha
  // ================================================================
  const fetchModelsForRow = useCallback((rowId: number, brandId: string) => {
    setRowModelsLoading((prev) => ({ ...prev, [rowId]: true }));
    fetch(`/api/fipe/models?brandId=${brandId}`)
      .then((r) => r.json())
      .then((data: { codigo: number; nome: string }[]) => {
        setRowModels((prev) => ({
          ...prev,
          [rowId]: data.map((m) => ({ value: String(m.codigo), label: m.nome })),
        }));
        setRowModelsLoading((prev) => ({ ...prev, [rowId]: false }));
      })
      .catch(() => setRowModelsLoading((prev) => ({ ...prev, [rowId]: false })));
  }, []);

  const handleRowBrandChange = useCallback(
    (rowId: number, opt: SelectOption | null) => {
      setRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? {
                ...r,
                brandId: opt?.value || "",
                brandLabel: opt?.label || "",
                modelId: "",
                modelLabel: "",
              }
            : r
        )
      );
      // Remove models cached da row anterior
      setRowModels((prev) => {
        const next = { ...prev };
        delete next[rowId];
        return next;
      });
      if (opt) {
        fetchModelsForRow(rowId, opt.value);
      }
    },
    [fetchModelsForRow]
  );

  const handleRowModelChange = useCallback(
    (rowId: number, opt: SelectOption | null) => {
      setRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? { ...r, modelId: opt?.value || "", modelLabel: opt?.label || "" }
            : r
        )
      );
    },
    []
  );

  const updateRowField = useCallback(
    (id: number, field: keyof VehicleRow, val: string) => {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
    },
    []
  );

  const addRow = () => setRows((prev) => [...prev, freshRow()]);
  const removeRow = (id: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // ================================================================
  // SUBMIT
  // ================================================================
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);

      // Atualiza/sobrescreve os campos com os valores selecionados via FIPE
      formData.set("brand", myBrandLabel);
      formData.set("model", myModelLabel);
      formData.set("year", myYearNumber);
      formData.set("estimatedValue", myEstimatedValue);

      // Remove fields antigos dos veículos desejados para não duplicar
      for (const key of ["vBrand", "vModel", "vYearMin", "vYearMax", "vCashAdj", "vTolerance"]) {
        formData.delete(key);
      }
      for (const r of rows) {
        if (!r.brandLabel.trim()) continue;
        formData.append("vBrand", r.brandLabel.trim());
        formData.append("vModel", r.modelLabel.trim());
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
      setSuccess("Anúncio publicado com sucesso!");
      setTimeout(() => {
        router.push("/my-posts");
        router.refresh();
      }, 800);
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  const isSubmitReady =
    myBrandLabel && myModelLabel && myYearNumber && myEstimatedValue;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ─── Título ─── */}
      <fieldset className="border border-gray-200 rounded p-4 space-y-3">
        <legend className="font-semibold text-sm px-1">Título do Anúncio</legend>
        <input
          name="title"
          required
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          placeholder="Ex: Honda Fit 2008 - Excelente estado"
        />
      </fieldset>

      {/* ─── Meu Carro ─── */}
      <fieldset className="border border-gray-200 rounded p-4 space-y-3">
        <legend className="font-semibold text-sm px-1">Meu Carro</legend>
        <p className="text-xs text-gray-500">
          Selecione os dados conforme a Tabela FIPE. O valor estimado é preenchido automaticamente.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <SearchableSelect
              label="Marca"
              placeholder="Selecione a marca..."
              value={myBrandId}
              options={brands}
              loading={brandsLoading}
              onChange={(opt) => {
                setMyBrandId(opt?.value || "");
                setMyBrandLabel(opt?.label || "");
              }}
              required
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <SearchableSelect
              label="Modelo"
              key={`my-model-${myBrandId || "none"}`}
              placeholder={
                !myBrandId
                  ? "Selecione a marca primeiro"
                  : "Selecione o modelo..."
              }
              value={myModelId}
              options={myModels}
              loading={myModelsLoading}
              onChange={(opt) => {
                setMyModelId(opt?.value || "");
                setMyModelLabel(opt?.label || "");
              }}
              required
              disabled={!myBrandId}
            />
          </div>
          <div>
            <SearchableSelect
              label="Ano"
              key={`my-year-${myModelId || "none"}`}
              placeholder={
                !myModelId
                  ? "Selecione o modelo primeiro"
                  : "Selecione o ano..."
              }
              value={myYearCode}
              options={myYears}
              loading={myYearsLoading}
              onChange={(opt) => {
                setMyYearCode(opt?.value || "");
                setMyYearLabel(opt?.label || "");
                setMyEstimatedValueEdited(false);
              }}
              required
              disabled={!myModelId}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Valor estimado (R$) *
            </label>
            <input
              name="estimatedValue"
              type="number"
              required
              value={myEstimatedValue}
              onChange={(e) => {
                setMyEstimatedValue(e.target.value);
                setMyEstimatedValueEdited(true);
              }}
              className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500
                ${myYearCode && !myEstimatedValueEdited ? "border-green-300 bg-green-50" : "border-gray-300"}`}
              placeholder="Preenchido via FIPE"
            />
            {myYearCode && !myEstimatedValueEdited && (
              <p className="text-[10px] text-green-600 mt-0.5">
                ✓ Preço FIPE preenchido automaticamente
              </p>
            )}
            {myEstimatedValueEdited && myYearCode && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                Valor editado manualmente
              </p>
            )}
          </div>
        </div>

        {/* Hidden fields para envio (preenchidos via estado) */}
        <input type="hidden" name="brand" value={myBrandLabel} />
        <input type="hidden" name="model" value={myModelLabel} />
        <input type="hidden" name="year" value={myYearNumber} />
      </fieldset>

      {/* ─── O que eu quero na troca ─── */}
      <fieldset className="border border-gray-200 rounded p-4 space-y-3">
        <legend className="font-semibold text-sm px-1">O que eu quero na troca</legend>

        <p className="text-xs text-gray-500">
          Adicione os carros que você aceitaria na troca. Selecione marca e modelo conforme a Tabela FIPE.
          Cada um pode ter seu próprio ajuste de grana, ano e tolerância.
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
                <SearchableSelect
                  label="Marca"
                  placeholder="Selecione..."
                  value={r.brandId}
                  options={brands}
                  loading={brandsLoading}
                  onChange={(opt) => handleRowBrandChange(r.id, opt)}
                  required
                />
              </div>
              <div>
                <SearchableSelect
                  label="Modelo"
                  key={`row-model-${r.id}-${r.brandId || "none"}`}
                  placeholder={
                    !r.brandId
                      ? "Marca primeiro"
                      : "Selecione..."
                  }
                  value={r.modelId}
                  options={rowModels[r.id] || []}
                  loading={rowModelsLoading[r.id] || false}
                  onChange={(opt) => handleRowModelChange(r.id, opt)}
                  disabled={!r.brandId}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1">
              <div className="min-w-0">
                <label className="block text-[10px] font-medium mb-0.5 text-gray-500 truncate">Ano min</label>
                <input
                  value={r.yearMin}
                  onChange={(e) => updateRowField(r.id, "yearMin", e.target.value)}
                  type="number"
                  className="w-full border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-[10px] font-medium mb-0.5 text-gray-500 truncate">Ano max</label>
                <input
                  value={r.yearMax}
                  onChange={(e) => updateRowField(r.id, "yearMax", e.target.value)}
                  type="number"
                  className="w-full border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-[10px] font-medium mb-0.5 text-gray-500 truncate">Grana (R$)</label>
                <input
                  value={r.cashAdj}
                  onChange={(e) => updateRowField(r.id, "cashAdj", e.target.value)}
                  type="number"
                  className="w-full border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-[10px] font-medium mb-0.5 text-gray-500 truncate">±Tolerância</label>
                <input
                  value={r.tolerance}
                  onChange={(e) => updateRowField(r.id, "tolerance", e.target.value)}
                  type="number"
                  className="w-full border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <p className="text-[10px] text-gray-400 leading-tight">
              <strong>Grana positiva</strong> = você paga esse valor. <strong>Negativa</strong> = você recebe.
            </p>
          </div>
        ))}

        <button type="button" onClick={addRow} className="text-blue-600 text-sm hover:text-blue-800">
          + Adicionar outro veículo
        </button>
      </fieldset>

      {/* ─── Contato ─── */}
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

      {/* ─── Fotos ─── */}
      <fieldset className="border border-gray-200 rounded p-4 space-y-3">
        <legend className="font-semibold text-sm px-1">Fotos</legend>
        <input name="images" type="file" multiple accept="image/*" className="text-sm" />
        <p className="text-xs text-gray-400">Uma ou mais fotos do seu carro</p>
      </fieldset>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || !isSubmitReady}
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
