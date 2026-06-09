import { readData, addItem, writeData, deleteItem } from "./db";
import { generateId, nowISO } from "./utils";
import type { CarPost, Match } from "./types";

/**
 * Checks if a desired trade matches an offered car.
 */
function carMatchesCriteria(
  car: CarPost["car"],
  desired: CarPost["desiredTrade"]
): boolean {
  if (desired.brand && car.brand.toLowerCase() !== desired.brand.toLowerCase()) {
    return false;
  }
  if (
    desired.model &&
    car.model.toLowerCase() !== desired.model.toLowerCase()
  ) {
    return false;
  }
  if (desired.yearMin && car.year < desired.yearMin) return false;
  if (desired.yearMax && car.year > desired.yearMax) return false;
  return true;
}

interface CashRange {
  min: number; // poster will pay at least this much (negative = wants to receive)
  max: number; // poster will pay at most this much (negative = wants to receive)
}

/**
 * Convert a cash adjustment + tolerance into a payable range.
 * Positive cashAdjustment = poster pays.
 * Negative cashAdjustment = poster receives.
 */
function getCashRange(adjustment: number, tolerance: number): CashRange {
  return {
    min: adjustment - tolerance,
    max: adjustment + tolerance,
  };
}

/**
 * Check if two cash ranges are compatible and return the suggested transfer.
 *
 * @returns null if incompatible, or the optimal cash amount A should pay B
 *          (negative means B pays A)
 */
function cashCompatible(
  rangeA: CashRange,
  rangeB: CashRange
): number | null {
  // Case 1: A pays, B receives (A.adj >= 0, B.adj <= 0)
  // A can pay between minA and maxA (both positive or zero)
  // B wants to receive (their adjustment is negative or zero)
  // B's perspective: they receive between -maxB and -minB (positive amounts)
  if (rangeA.min >= 0 && rangeB.max <= 0) {
    // A pays in [minA, maxA], B receives in [-maxB, -minB]
    const minA = rangeA.min;
    const maxA = rangeA.max;
    const bReceiveMin = -rangeB.max;
    const bReceiveMax = -rangeB.min;
    // Overlap check: A can pay at least what B minimally wants to receive
    if (maxA >= bReceiveMin && minA <= bReceiveMax) {
      return Math.round((Math.max(minA, bReceiveMin) + Math.min(maxA, bReceiveMax)) / 2);
    }
    return null;
  }

  // Case 2: A receives, B pays (A.adj <= 0, B.adj >= 0)
  if (rangeA.max <= 0 && rangeB.min >= 0) {
    const aReceiveMin = -rangeA.max;
    const aReceiveMax = -rangeA.min;
    if (rangeB.max >= aReceiveMin && rangeB.min <= aReceiveMax) {
      // B pays A
      const suggested = Math.round(
        (Math.max(rangeB.min, aReceiveMin) + Math.min(rangeB.max, aReceiveMax)) / 2
      );
      return -suggested; // negative = B pays A
    }
    return null;
  }

  // Case 3: Both want to pay (both adjustments >= 0)
  // Not compatible - both expect the other to receive cash
  // But can make it work if ranges cross (one pays, other also pays = no match)
  if (rangeA.min >= 0 && rangeB.min >= 0) {
    return null;
  }

  // Case 4: Both want to receive (both adjustments <= 0)
  // Not compatible - both expect the other to pay
  if (rangeA.max <= 0 && rangeB.max <= 0) {
    return null;
  }

  // Case 5: A pays, B pays not enough / mixed ranges crossing zero
  // This is complex for v0 - treat as no match
  return null;
}

function calculateScore(
  postA: CarPost,
  postB: CarPost,
  suggestedCash: number | null
): number {
  let score = 0;

  // Car match score (max 40)
  const aBrand = postA.desiredTrade.brand?.toLowerCase();
  const bBrand = postB.desiredTrade.brand?.toLowerCase();
  const aModel = postA.desiredTrade.model?.toLowerCase();
  const bModel = postB.desiredTrade.model?.toLowerCase();

  // Check A's desired vs B's offered
  const aDesiresExact =
    aBrand === postB.car.brand.toLowerCase() &&
    (!aModel || aModel === postB.car.model.toLowerCase());
  const aDesiresBrand = aBrand === postB.car.brand.toLowerCase();

  // Check B's desired vs A's offered
  const bDesiresExact =
    bBrand === postA.car.brand.toLowerCase() &&
    (!bModel || bModel === postA.car.model.toLowerCase());
  const bDesiresBrand = bBrand === postA.car.brand.toLowerCase();

  // Both sides want exact match
  if (aDesiresExact && bDesiresExact) score += 40;
  // Both sides want at least brand match
  else if (aDesiresBrand && bDesiresBrand) score += 20;
  // Only one side matches
  else if (aDesiresExact || bDesiresExact) score += 15;
  else if (aDesiresBrand || bDesiresBrand) score += 10;

  // Year proximity (max 20)
  const yearDiffA = postB.car.year - (postA.desiredTrade.yearMin ?? 0) +
    (postA.desiredTrade.yearMax ?? 9999) - postB.car.year; // simplified: mid-range proximity
  const yearDiffB = postA.car.year - (postB.desiredTrade.yearMin ?? 0) +
    (postB.desiredTrade.yearMax ?? 9999) - postA.car.year;

  // Use range center proximity
  const centerA = postA.desiredTrade.yearMin && postA.desiredTrade.yearMax
    ? (postA.desiredTrade.yearMin + postA.desiredTrade.yearMax) / 2
    : null;
  const centerB = postB.desiredTrade.yearMin && postB.desiredTrade.yearMax
    ? (postB.desiredTrade.yearMin + postB.desiredTrade.yearMax) / 2
    : null;

  if (centerA !== null && centerB !== null) {
    const diff = Math.abs(centerA - centerB);
    if (diff <= 2) score += 20;
    else if (diff <= 5) score += 10;
    else if (diff <= 10) score += 5;
  } else {
    score += 10; // no year constraints = partial benefit
  }

  // Cash alignment (max 40)
  if (suggestedCash !== null) {
    // Smaller cash = more aligned
    const absCash = Math.abs(suggestedCash);
    if (absCash <= 1000) score += 40;
    else if (absCash <= 5000) score += 30;
    else if (absCash <= 15000) score += 20;
    else if (absCash <= 30000) score += 10;
    else score += 5;
  }

  return Math.min(score, 100);
}

/**
 * Run matching across all active posts.
 * For every unique pair, checks compatibility and creates/updates Match records.
 */
export function runMatching(): Match[] {
  const posts = readData<CarPost>("posts").filter((p) => p.isActive);
  let matches = readData<Match>("matches");
  const newMatches: Match[] = [];

  for (let i = 0; i < posts.length; i++) {
    for (let j = i + 1; j < posts.length; j++) {
      const postA = posts[i];
      const postB = posts[j];

      // Check mutual car compatibility
      const aDesiresB = carMatchesCriteria(postB.car, postA.desiredTrade);
      const bDesiresA = carMatchesCriteria(postA.car, postB.desiredTrade);

      if (!aDesiresB || !bDesiresA) continue;

      // Check cash compatibility
      const rangeA = getCashRange(
        postA.desiredTrade.cashAdjustment,
        postA.desiredTrade.cashAdjustmentTolerance
      );
      const rangeB = getCashRange(
        postB.desiredTrade.cashAdjustment,
        postB.desiredTrade.cashAdjustmentTolerance
      );

      const suggestedCash = cashCompatible(rangeA, rangeB);
      if (suggestedCash === null) continue;

      const score = calculateScore(postA, postB, suggestedCash);

      // Check if match already exists
      const existingIndex = matches.findIndex(
        (m) =>
          (m.postAId === postA.id && m.postBId === postB.id) ||
          (m.postAId === postB.id && m.postBId === postA.id)
      );

      const match: Match = {
        id: existingIndex >= 0 ? matches[existingIndex].id : generateId(),
        postAId: postA.id,
        postBId: postB.id,
        score,
        suggestedCashFromA: suggestedCash,
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

  // Remove stale matches for posts that no longer exist
  const activePostIds = new Set(posts.map((p) => p.id));
  matches = matches.filter(
    (m) => activePostIds.has(m.postAId) && activePostIds.has(m.postBId)
  );

  writeData("matches", matches);
  return newMatches;
}
