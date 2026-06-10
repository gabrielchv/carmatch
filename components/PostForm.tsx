"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SearchableSelect, { type SelectOption } from "@/components/SearchableSelect";
import { parseFipeModels, type VersionOption } from "@/lib/fipe-utils";

interface VehicleRow {
  id: number;
  brandId: string;
  brandLabel: string;
  // Modelo geral (primeira palavra FIPE, ex: "Fit")
  generalModel: string;
  // Código FIPE da versão selecionada (usado como valor único no Select)
  versionCode: string;
  // Versão específica (ex: "CX 1.4 Flex 16V 5p")
  version: string;
  versionLabel: string;
  // Transmissão
  transmission: string;
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
    generalModel: "",
    versionCode: "",
    version: "",
    versionLabel: "",
    transmission: "",
    yearMin: "",
    yearMax: "",
    cashAdj: "0",
    tolerance: "0",
  };
}

// Cache de dados FIPE parseados por brandId
const fipeParsedCache = new Map<string, ReturnType<typeof parseFipeModels>>();

export default function PostForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ───── FIPE brands (global) ─────
  const [brands, setBrands] = useState<SelectOption[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);

  // ───── Meu Carro ─────
  const [myBrandId, setMyBrandId] = useState("");
  const [myBrandLabel, setMyBrandLabel] = useState("");
  const [myGeneralModel, setMyGeneralModel] = useState("");            // ex: "Fit"
  const [myVersion, setMyVersion] = useState("");                       // ex: "CX 1.4 Flex 16V 5p"
  const [myVersionFullName, setMyVersionFullName] = useState("");       // nome FIPE completo p/ submit
  const [myVersionModelCode, setMyVersionModelCode] = useState("");     // código FIPE p/ ano/preço
  const [myYearCode, setMyYearCode] = useState("");
  const [myYearNumber, setMyYearNumber] = useState("");

  // Dados FIPE parseados para "Meu Carro"
  const [myParsed, setMyParsed] = useState<{
    generalModels: string[];
    versionsByGeneralModel: Record<string, VersionOption[]>;
  } | null>(null);
  const [myParsedLoading, setMyParsedLoading] = useState(false);
  const [myYears, setMyYears] = useState<SelectOption[]>([]);
  const [myYearsLoading, setMyYearsLoading] = useState(false);

  const [myEstimatedValue, setMyEstimatedValue] = useState("");
  const [myEstimatedValueEdited, setMyEstimatedValueEdited] = useState(false);

  // ───── Veículos desejados ─────
  const [rows, setRows] = useState<VehicleRow[]>([freshRow()]);

  // Dados FIPE parseados por rowId: { generalModels, versionsByGeneralModel }
  const [rowParsed, setRowParsed] = useState<
    Record<number, { generalModels: string[]; versionsByGeneralModel: Record<string, VersionOption[]> }>
  >({});
  const [rowParsedLoading, setRowParsedLoading] = useState<Record<number, boolean>>({});
  const loadingRef = useRef<Record<number, boolean>>({});

  // ================================================================
  // BRANDS
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
  // MEU CARRO – cascata (marca → modelo geral → versão → ano → preço)
  // ================================================================

  // 1. Quando marca muda → busca e parseia modelos FIPE
  useEffect(() => {
    setError("");
    if (!myBrandId) {
      setMyParsed(null);
      setMyGeneralModel("");
      setMyVersion("");
      setMyVersionFullName("");
      setMyVersionModelCode("");
      setMyYears([]);
      setMyYearCode("");
      setMyYearNumber("");
      if (!myEstimatedValueEdited) setMyEstimatedValue("");
      return;
    }
    setMyParsedLoading(true);
    setMyGeneralModel("");
    setMyVersion("");
    setMyVersionFullName("");
    setMyVersionModelCode("");
    setMyYears([]);
    setMyYearCode("");
    setMyYearNumber("");
    if (!myEstimatedValueEdited) setMyEstimatedValue("");

    const cached = fipeParsedCache.get(myBrandId);
    if (cached) {
      setMyParsed(cached);
      setMyParsedLoading(false);
      return;
    }

    fetch(`/api/fipe/models?brandId=${myBrandId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Falha ao carregar modelos");
        return r.json();
      })
      .then((data: { codigo: number; nome: string }[]) => {
        const parsed = parseFipeModels(data);
        fipeParsedCache.set(myBrandId, parsed);
        setMyParsed(parsed);
      })
      .catch(() => setError("Erro ao carregar modelos da Tabela FIPE"))
      .finally(() => setMyParsedLoading(false));
  }, [myBrandId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Quando versão selecionada → busca anos usando modelCode
  useEffect(() => {
    setError("");
    if (!myBrandId || !myVersionModelCode) {
      setMyYears([]);
      setMyYearCode("");
      setMyYearNumber("");
      if (!myEstimatedValueEdited) setMyEstimatedValue("");
      return;
    }
    setMyYearsLoading(true);
    setMyYearCode("");
    setMyYearNumber("");
    if (!myEstimatedValueEdited) setMyEstimatedValue("");

    fetch(`/api/fipe/years?brandId=${myBrandId}&modelId=${myVersionModelCode}`)
      .then((r) => {
        if (!r.ok) throw new Error("Falha ao carregar anos");
        return r.json();
      })
      .then((data: { codigo: string; nome: string }[]) => {
        setMyYears(data.map((y) => ({ value: y.codigo, label: y.nome })));
      })
      .catch(() => setError("Erro ao carregar anos da Tabela FIPE"))
      .finally(() => setMyYearsLoading(false));
  }, [myBrandId, myVersionModelCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3. Quando ano selecionado → busca preço FIPE
  useEffect(() => {
    setError("");
    if (!myBrandId || !myVersionModelCode || !myYearCode) return;
    fetch(
      `/api/fipe/price?brandId=${myBrandId}&modelId=${myVersionModelCode}&yearCode=${myYearCode}`
    )
      .then((r) => {
        if (!r.ok) throw new Error("Falha ao carregar preço");
        return r.json();
      })
      .then((data: { Valor: string; AnoModelo: number }) => {
        const cleaned = data.Valor.replace(/[R$\s.]/g, "").replace(",", ".");
        const price = parseFloat(cleaned);
        if (!isNaN(price) && !myEstimatedValueEdited) {
          setMyEstimatedValue(String(Math.round(price)));
        }
        setMyYearNumber(String(data.AnoModelo));
      })
      .catch(() => setError("Erro ao buscar preço na Tabela FIPE"));
  }, [myBrandId, myVersionModelCode, myYearCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ================================================================
  // VEÍCULOS DESEJADOS – cascata com modelo geral + versão + transmissão
  // ================================================================

  // Busca dados FIPE e parseia para uma row
  const fetchAndParseForRow = useCallback(async (rowId: number, brandId: string) => {
    // Evita fetch duplicado
    if (loadingRef.current[rowId]) return;
    loadingRef.current[rowId] = true;
    setRowParsedLoading((prev) => ({ ...prev, [rowId]: true }));

    try {
      const cached = fipeParsedCache.get(brandId);
      if (cached) {
        setRowParsed((prev) => ({ ...prev, [rowId]: cached }));
        return;
      }

      const res = await fetch(`/api/fipe/models?brandId=${brandId}`);
      const data: { codigo: number; nome: string }[] = await res.json();
      const parsed = parseFipeModels(data);
      fipeParsedCache.set(brandId, parsed);
      setRowParsed((prev) => ({ ...prev, [rowId]: parsed }));
    } finally {
      loadingRef.current[rowId] = false;
      setRowParsedLoading((prev) => ({ ...prev, [rowId]: false }));
    }
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
                generalModel: "",
                versionCode: "",
                version: "",
                versionLabel: "",
                transmission: "",
              }
            : r
        )
      );
      // Limpa dados parseados da row
      setRowParsed((prev) => {
        const next = { ...prev };
        delete next[rowId];
        return next;
      });
      if (opt) {
        fetchAndParseForRow(rowId, opt.value);
      }
    },
    [fetchAndParseForRow]
  );

  const handleRowGeneralModelChange = useCallback(
    (rowId: number, opt: SelectOption | null) => {
      setRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? { ...r, generalModel: opt?.label || "", versionCode: "", version: "", versionLabel: "", transmission: "" }
            : r
        )
      );
    },
    []
  );

  const handleRowVersionChange = useCallback(
    (rowId: number, opt: SelectOption | null) => {
      // opt.value = FIPE modelCode (único), opt.label = version + trans display
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== rowId) return r;
          // Busca a VersionOption pelo modelCode para extrair version e transmission
          const parsed = rowParsed[rowId];
          const versions = parsed?.versionsByGeneralModel[r.generalModel] || [];
          const matched = versions.find((v) => v.modelCode === opt?.value);
          return {
            ...r,
            versionCode: matched?.modelCode || "",
            version: matched?.version || "",
            versionLabel: opt?.label || "",
            transmission: matched?.transmission || "",
          };
        })
      );
    },
    [rowParsed]
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

      // Meu Carro
      formData.set("brand", myBrandLabel);
      formData.set("model", myVersionFullName);
      formData.set("year", myYearNumber);
      formData.set("estimatedValue", myEstimatedValue);

      // Veículos desejados – limpa e recria
      for (const key of [
        "vBrand", "vModel", "vVersion", "vTransmission",
        "vYearMin", "vYearMax", "vCashAdj", "vTolerance",
      ]) {
        formData.delete(key);
      }
      for (const r of rows) {
        if (!r.brandLabel.trim()) continue;
        formData.append("vBrand", r.brandLabel.trim());
        formData.append("vModel", r.generalModel.trim());
        formData.append("vVersion", r.version);
        formData.append("vTransmission", r.transmission);
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
    myBrandLabel && myGeneralModel && myVersion && myYearNumber && myEstimatedValue;

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
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3 sm:col-span-1">
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
          <div className="col-span-3 sm:col-span-1">
            <SearchableSelect
              label="Modelo"
              key={`my-model-${myBrandId || "none"}`}
              placeholder={
                !myBrandId
                  ? "Selecione a marca primeiro"
                  : "Selecione..."
              }
              value={myGeneralModel}
              options={myParsed?.generalModels.map((gm) => ({ value: gm, label: gm })) || []}
              loading={myParsedLoading}
              onChange={(opt) => {
                setMyGeneralModel(opt?.label || "");
                setMyVersion("");
                setMyVersionFullName("");
                setMyVersionModelCode("");
                setMyYears([]);
                setMyYearCode("");
                setMyYearNumber("");
                if (!myEstimatedValueEdited) setMyEstimatedValue("");
              }}
              required
              disabled={!myBrandId}
            />
          </div>
          <div className="col-span-3 sm:col-span-1">
            <SearchableSelect
              label="Versão"
              key={`my-version-${myGeneralModel || "none"}`}
              placeholder={
                !myGeneralModel
                  ? "Modelo primeiro"
                  : "Selecione a versão..."
              }
              value={myVersionModelCode}
              options={(myParsed?.versionsByGeneralModel[myGeneralModel] || []).map((v) => ({
                value: v.modelCode,
                label: v.transmission
                  ? `${v.version} · ${v.transmission}`
                  : v.version,
              }))}
              loading={false}
              onChange={(opt) => {
                const parsed = myParsed;
                const versions = parsed?.versionsByGeneralModel[myGeneralModel] || [];
                const matched = versions.find((vv) => vv.modelCode === opt?.value);
                setMyVersion(matched?.version || "");
                setMyVersionFullName(matched?.fullName || "");
                setMyVersionModelCode(matched?.modelCode || "");
                setMyEstimatedValueEdited(false);
              }}
              required
              disabled={!myGeneralModel}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <SearchableSelect
              label="Ano"
              key={`my-year-${myVersionModelCode || "none"}`}
              placeholder={
                !myVersionModelCode
                  ? "Selecione a versão primeiro"
                  : "Selecione o ano..."
              }
              value={myYearCode}
              options={myYears}
              loading={myYearsLoading}
              onChange={(opt) => {
                setMyYearCode(opt?.value || "");
                setMyEstimatedValueEdited(false);
              }}
              required
              disabled={!myVersionModelCode}
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

        <input type="hidden" name="brand" value={myBrandLabel} />
        <input type="hidden" name="model" value={myVersionFullName} />
        <input type="hidden" name="year" value={myYearNumber} />
      </fieldset>

      {/* ─── O que eu quero na troca ─── */}
      <fieldset className="border border-gray-200 rounded p-4 space-y-3">
        <legend className="font-semibold text-sm px-1">O que eu quero na troca</legend>

        <p className="text-xs text-gray-500">
          Adicione os carros que você aceitaria na troca. Selecione marca, modelo, versão e transmissão conforme a Tabela FIPE.
          Cada um pode ter seu próprio ajuste de grana, ano e tolerância.
        </p>

        {rows.map((r, idx) => {
          const parsed = rowParsed[r.id];
          const generalModels: SelectOption[] = (parsed?.generalModels || []).map((gm) => ({
            value: gm,
            label: gm,
          }));
          const versions: SelectOption[] = (
            parsed?.versionsByGeneralModel[r.generalModel] || []
          ).map((v) => ({
            value: v.modelCode,
            label: v.transmission
              ? `${v.version} · ${v.transmission}`
              : v.version,
          }));

          return (
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

              {/* Marca + Modelo Geral + Versão */}
              <div className="grid grid-cols-3 gap-2">
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
                    key={`row-modelo-${r.id}-${r.brandId || "none"}`}
                    placeholder={
                      !r.brandId
                        ? "Marca primeiro"
                        : "Selecione..."
                    }
                    value={r.generalModel}
                    options={generalModels}
                    loading={rowParsedLoading[r.id] || false}
                    onChange={(opt) => handleRowGeneralModelChange(r.id, opt)}
                    disabled={!r.brandId}
                  />
                </div>
                <div>
                  <SearchableSelect
                    label="Versão"
                    key={`row-version-${r.id}-${r.generalModel || "none"}`}
                    placeholder={
                      !r.generalModel
                        ? "Modelo primeiro"
                        : "Selecione..."
                    }
                    value={r.versionCode}
                    options={versions}
                    loading={false}
                    onChange={(opt) => handleRowVersionChange(r.id, opt)}
                    disabled={!r.generalModel}
                  />
                </div>
              </div>

              {/* Transmissão + Ano + Grana */}
              <div className="grid grid-cols-5 gap-1">
                <div className="min-w-0">
                  <label className="block text-[10px] font-medium mb-0.5 text-gray-500">
                    Transmissão
                  </label>
                  <select
                    value={r.transmission}
                    onChange={(e) => updateRowField(r.id, "transmission", e.target.value)}
                    className="w-full border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="">Indiferente</option>
                    <option value="Automático">Automático</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>
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
          );
        })}

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
