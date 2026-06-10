import { readData, writeData } from "./db";
import { generateId, nowISO } from "./utils";
import type { CarPost, Match, DesiredVehicle } from "./types";

/**
 * Checks if a single DesiredVehicle matches an offered car.
 */
function vehicleMatchesCar(
  car: CarPost["car"],
  want: DesiredVehicle
): boolean {
  if (want.brand && car.brand.toLowerCase() !== want.brand.toLowerCase()) {
    return false;
  }
  if (want.model && car.model.toLowerCase() !== want.model.toLowerCase()) {
    return false;
  }
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

  // Car match (max 40)
  const aExact =
    wantA.brand.toLowerCase() === carB.brand.toLowerCase() &&
    (!wantA.model ||
      wantA.model.toLowerCase() === carB.model.toLowerCase());
  const aBrand =
    wantA.brand.toLowerCase() === carB.brand.toLowerCase();
  const bExact =
    wantB.brand.toLowerCase() === carA.brand.toLowerCase() &&
    (!wantB.model ||
      wantB.model.toLowerCase() === carA.model.toLowerCase());
  const bBrand =
    wantB.brand.toLowerCase() === carA.brand.toLowerCase();

  if (aExact && bExact) score += 40;
  else if (aExact && bBrand) score += 30;
  else if (bExact && aBrand) score += 30;
  else if (aBrand && bBrand) score += 20;
  else if (aExact || bExact) score += 15;
  else if (aBrand || bBrand) score += 10;

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
    // A deseja B? O veículo que A quer equivale ao carro que B oferece?
    if (!vehicleMatchesCar(postB.car, wantA)) continue;

    for (const wantB of bVehicles) {
      // B deseja A?
      if (!vehicleMatchesCar(postA.car, wantB)) continue;

      // Compatibilidade de grana
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
