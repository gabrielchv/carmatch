import { readData, writeData } from "./db";
import { generateId, nowISO } from "./utils";
import type { CarPost, Match, DesiredVehicle } from "./types";

/**
 * Infers the vehicle body type from a FIPE model name by checking for
 * common keywords. Returns null when no body type can be inferred.
 */
function inferVehicleType(fipeName: string): string | null {
  const lower = fipeName.toLowerCase();
  if (lower.includes("hatchback") || lower.includes(" hatch")) return "Hatch";
  if (lower.includes("sedan") || lower.includes(" sd.") || lower.includes(" sda")) return "Sedan";
  if (lower.includes("suv")) return "SUV";
  if (lower.includes("pick-up") || lower.includes("pickup") || lower.includes("caminhonete")) return "Caminhonete";
  return null;
}

/**
 * Checks if a single DesiredVehicle matches an offered car.
 *
 * Regras de matching:
 * - Tipo de veículo: se want.vehicleType está definido, verifica se o nome
 *   FIPE do carro contém keywords que correspondem ao tipo desejado.
 *   Se não for possível inferir o tipo, permite o match (permissivo).
 * - Marca: igualdade exata (case-insensitive)
 * - Modelo (geral): car.model DEVE COMEÇAR COM want.model
 *   Ex: want "Fit" casa com "Fit CX 1.4 Flex 16V 5p Aut."
 * - Versão: car.model DEVE CONTER want.version (substring)
 *   Ex: want "CX 1.4" casa com "Fit CX 1.4 Flex 16V 5p Aut."
 * - Transmissão: car.model deve conter "Aut." ou "Mec." conforme
 * - Ano: bounds (unchanged)
 */
function vehicleMatchesCar(
  car: CarPost["car"],
  want: DesiredVehicle
): boolean {
  // Vehicle type mode: check body type keywords in the offered car's FIPE name
  if (want.vehicleType) {
    const inferred = inferVehicleType(car.model);
    // If we can infer the type and it doesn't match, reject
    if (inferred && inferred !== want.vehicleType) return false;
    // If we can't infer or it matches, fall through to year check
  } else {
    // Marca
    if (want.brand && car.brand.toLowerCase() !== want.brand.toLowerCase()) {
      return false;
    }

    const carModelLower = car.model.toLowerCase();

    // Modelo geral: car.model deve COMEÇAR com o modelo geral
    if (want.model) {
      const wantModel = want.model.toLowerCase().trim();
      if (!carModelLower.startsWith(wantModel)) {
        if (!carModelLower.includes(wantModel)) {
          return false;
        }
      }
    }

    // Versão específica: car.model deve conter a versão
    if (want.version) {
      if (!carModelLower.includes(want.version.toLowerCase().trim())) {
        return false;
      }
    }

    // Transmissão
    if (want.transmission) {
      const hasAuto = carModelLower.includes("aut.");
      const hasManual = carModelLower.includes("mec.");
      if (want.transmission === "Automático" && !hasAuto) {
        return false;
      }
      if (want.transmission === "Manual" && !hasManual) {
        return false;
      }
    }
  }

  // Ano
  if (want.yearMin && car.year < want.yearMin) return false;
  if (want.yearMax && car.year > want.yearMax) return false;
  return true;
}

interface CashRange {
  min: number;
  max: number;
}

function getCashRange(adjustment: number, tolerance: number): CashRange {
  return {
    min: adjustment - tolerance,
    max: adjustment + tolerance,
  };
}

/**
 * @returns null if incompatível, ou o valor sugerido que A paga para B
 *          (negativo = B paga A)
 */
function cashCompatible(
  rangeA: CashRange,
  rangeB: CashRange
): number | null {
  // Caso 1: A paga (rangeA >= 0), B recebe (rangeB <= 0)
  if (rangeA.min >= 0 && rangeB.max <= 0) {
    const bReceiveMin = -rangeB.max;
    const bReceiveMax = -rangeB.min;
    if (rangeA.max >= bReceiveMin && rangeA.min <= bReceiveMax) {
      return Math.round(
        (Math.max(rangeA.min, bReceiveMin) +
          Math.min(rangeA.max, bReceiveMax)) /
          2
      );
    }
    return null;
  }

  // Caso 2: A recebe (rangeA <= 0), B paga (rangeB >= 0)
  if (rangeA.max <= 0 && rangeB.min >= 0) {
    const aReceiveMin = -rangeA.max;
    const aReceiveMax = -rangeA.min;
    if (rangeB.max >= aReceiveMin && rangeB.min <= aReceiveMax) {
      const suggested = Math.round(
        (Math.max(rangeB.min, aReceiveMin) +
          Math.min(rangeB.max, aReceiveMax)) /
          2
      );
      return -suggested;
    }
    return null;
  }

  // Ambos querem pagar ou ambos querem receber — incompatível
  return null;
}

/**
 * Verifica se um DesiredVehicle "encaixa" no carro oferecido,
 * considerando os critérios de marca, modelo, versão e transmissão.
 * Retorna quantos critérios foram atendidos (0-3) para pontuação.
 */
function matchLevel(
  car: CarPost["car"],
  want: DesiredVehicle
): number {
  let level = 0;

  // Vehicle type mode: return 1 (basic level) if compatible
  if (want.vehicleType) {
    const inferred = inferVehicleType(car.model);
    if (inferred === want.vehicleType) return 1;
    // If can't infer, permissive — assume it could match
    if (inferred === null) return 1;
    return 0; // type mismatch
  }

  // Marca (básico)
  if (
    want.brand &&
    car.brand.toLowerCase() === want.brand.toLowerCase()
  ) {
    level++;
  }

  // Modelo geral
  if (want.model) {
    const carModelLower = car.model.toLowerCase();
    const wantModel = want.model.toLowerCase().trim();
    if (
      carModelLower.startsWith(wantModel) ||
      carModelLower.includes(` ${wantModel}`)
    ) {
      level++;
    }
  }

  // Versão + Transmissão (detalhes)
  if (want.version || want.transmission) {
    let detailMatch = true;
    if (want.version && !car.model.toLowerCase().includes(want.version.toLowerCase())) {
      detailMatch = false;
    }
    if (detailMatch && want.transmission) {
      const hasAuto = car.model.toLowerCase().includes("aut.");
      const hasManual = car.model.toLowerCase().includes("mec.");
      if (want.transmission === "Automático" && !hasAuto) detailMatch = false;
      if (want.transmission === "Manual" && !hasManual) detailMatch = false;
    }
    if (detailMatch) level++;
  }

  return level;
}

/**
 * Calcula a pontuação de um match entre dois vehicles desejados específicos.
 * Retorna score 0–100.
 */
function calculateVehicleScore(
  carA: CarPost["car"],
  carB: CarPost["car"],
  wantA: DesiredVehicle,  // A deseja B
  wantB: DesiredVehicle,  // B deseja A
  suggestedCash: number | null
): number {
  let score = 0;

  // Car match (max 40) — baseado no nível de detalhe do match de cada lado
  const levelA = matchLevel(carB, wantA);
  const levelB = matchLevel(carA, wantB);
  const avgLevel = (levelA + levelB) / 2;

  if (avgLevel >= 2.5) score += 40;      // ambos com detalhes
  else if (avgLevel >= 1.5) score += 30; // um detalha, outro não
  else if (avgLevel >= 0.5) score += 20; // só marca
  else score += 10;                       // fallback

  // Year proximity (max 20)
  const centerA =
    wantA.yearMin && wantA.yearMax
      ? (wantA.yearMin + wantA.yearMax) / 2
      : null;
  const centerB =
    wantB.yearMin && wantB.yearMax
      ? (wantB.yearMin + wantB.yearMax) / 2
      : null;

  if (centerA !== null && centerB !== null) {
    const diff = Math.abs(centerA - centerB);
    if (diff <= 2) score += 20;
    else if (diff <= 5) score += 10;
    else if (diff <= 10) score += 5;
  } else {
    score += 10;
  }

  // Cash alignment (max 40)
  if (suggestedCash !== null) {
    const absCash = Math.abs(suggestedCash);
    if (absCash <= 1000) score += 40;
    else if (absCash <= 5000) score += 30;
    else if (absCash <= 15000) score += 20;
    else if (absCash <= 30000) score += 10;
    else score += 5;
  }

  return Math.min(score, 100);
}

interface VehicleMatchResult {
  wantA: DesiredVehicle;
  wantB: DesiredVehicle;
  score: number;
  suggestedCash: number;
}

/**
 * Para um par de posts (A, B), encontra a melhor combinação de veículos.
 */
function findBestVehicleMatch(
  postA: CarPost,
  postB: CarPost
): VehicleMatchResult | null {
  const aVehicles = postA.desiredTrade.vehicles || [];
  const bVehicles = postB.desiredTrade.vehicles || [];

  let best: VehicleMatchResult | null = null;

  for (const wantA of aVehicles) {
    if (!vehicleMatchesCar(postB.car, wantA)) continue;

    for (const wantB of bVehicles) {
      if (!vehicleMatchesCar(postA.car, wantB)) continue;

      const rangeA = getCashRange(
        wantA.cashAdjustment,
        wantA.cashAdjustmentTolerance
      );
      const rangeB = getCashRange(
        wantB.cashAdjustment,
        wantB.cashAdjustmentTolerance
      );

      const suggestedCash = cashCompatible(rangeA, rangeB);
      if (suggestedCash === null) continue;

      const score = calculateVehicleScore(
        postA.car,
        postB.car,
        wantA,
        wantB,
        suggestedCash
      );

      if (!best || score > best.score) {
        best = { wantA, wantB, score, suggestedCash };
      }
    }
  }

  return best;
}

/**
 * Roda o matching entre todos os posts ativos.
 * Match é criado quando dois posts têm pelo menos um veículo compatível
 * cada um com o carro do outro, E a grana é compatível.
 */
export function runMatching(): Match[] {
  const posts = readData<CarPost>("posts").filter((p) => p.isActive);
  let matches = readData<Match>("matches");
  const newMatches: Match[] = [];

  for (let i = 0; i < posts.length; i++) {
    for (let j = i + 1; j < posts.length; j++) {
      const postA = posts[i];
      const postB = posts[j];

      const best = findBestVehicleMatch(postA, postB);
      if (!best) continue;

      const existingIndex = matches.findIndex(
        (m) =>
          (m.postAId === postA.id && m.postBId === postB.id) ||
          (m.postAId === postB.id && m.postBId === postA.id)
      );

      const match: Match = {
        id: existingIndex >= 0 ? matches[existingIndex].id : generateId(),
        postAId: postA.id,
        postBId: postB.id,
        score: best.score,
        suggestedCashFromA: best.suggestedCash,
        status: "pending",
        createdAt: nowISO(),
      };

      if (existingIndex >= 0) {
        matches[existingIndex] = match;
      } else {
        matches.push(match);
        newMatches.push(match);
      }
    }
  }

  // Remove matches órfãos
  const activePostIds = new Set(posts.map((p) => p.id));
  matches = matches.filter(
    (m) => activePostIds.has(m.postAId) && activePostIds.has(m.postBId)
  );

  writeData("matches", matches);
  return newMatches;
}
