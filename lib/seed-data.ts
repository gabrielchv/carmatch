import { addItem, clearData } from "./db";
import { generateId, nowISO } from "./utils";
import { runMatching } from "./matching";
import { fetchFipeBrands, fetchFipeModels, fetchFipeYears, fetchFipePrice } from "./fipe-api";
import { parseFipeModels } from "./fipe-utils";
import type { User, CarPost, DesiredVehicle } from "./types";
import type { FipeBrand } from "./fipe-api";

// ──────────────────────────────────────────────
// Users — hardcoded (people, not car data)
// FIPE doesn't have user data.
// ──────────────────────────────────────────────

const MOCK_USERS: { name: string; email: string }[] = [
  { name: "Carlos Silva", email: "carlos@email.com" },
  { name: "Ana Oliveira", email: "ana@email.com" },
  { name: "Roberto Santos", email: "roberto@email.com" },
  { name: "Juliana Costa", email: "juliana@email.com" },
  { name: "Fernando Lima", email: "fernando@email.com" },
  { name: "Mariana Souza", email: "mariana@email.com" },
];

// ──────────────────────────────────────────────
// Lookup config — search params for the FIPE API.
// These tell the seed WHAT to fetch. They are search
// parameters, not seed output — no hardcoded years,
// titles, descriptions, cash, or WhatsApp here.
// ──────────────────────────────────────────────

interface LookupEntry {
  brand: string;
  model: string;       // General model name (first word of FIPE name)
  preferAuto: boolean; // Prefer automatic transmission version
}

const SEED_LOOKUPS: LookupEntry[] = [
  // 0-7: Primary cars — each produces one post
  { brand: "Honda",           model: "Fit",     preferAuto: true  },
  { brand: "Toyota",          model: "Prius",   preferAuto: true  },
  { brand: "Fiat",            model: "Uno",     preferAuto: false },
  { brand: "VW - VolksWagen", model: "Gol",     preferAuto: false },
  { brand: "GM - Chevrolet",  model: "Onix",    preferAuto: true  },
  { brand: "GM - Chevrolet",  model: "Cruze",   preferAuto: true  },
  { brand: "Ford",            model: "Ka",      preferAuto: false },
  { brand: "Hyundai",         model: "HB20",    preferAuto: true  },
  // 8-9: Reference cars — fetched for desired-vehicle data, no post created
  { brand: "Jeep",            model: "Compass", preferAuto: true  },
  { brand: "Renault",         model: "Duster",  preferAuto: true  },
];

// Which lookup indices produce actual posts — these become CarPosts
const POST_LOOKUP_INDICES = [0, 1, 2, 3, 4, 5, 6, 7];

// Map post index (position in POST_LOOKUP_INDICES) → user index
const POST_USER_INDICES = [0, 1, 2, 3, 4, 5, 0, 1];

// Each entry: [postIndex, desiredCarLookupIndex]
// The post at postIndex wants a car matching the FIPE data at desiredCarLookupIndex.
// Everything is derived from the resolved FIPE data — no hardcoded model strings.
const SEED_WANTS: [number, number][] = [
  [0, 1], // Honda Fit     → wants a car like the Toyota Prius
  [1, 0], // Toyota Prius  → wants a car like the Honda Fit
  [2, 3], // Fiat Uno      → wants a car like the VW Gol
  [3, 2], // VW Gol        → wants a car like the Fiat Uno
  [4, 5], // Chevy Onix    → wants any Chevy (model stripped → brand-only match)
  [5, 4], // Chevy Cruze   → wants any Chevy (model stripped → brand-only match)
  [6, 8], // Ford Ka       → wants a car like the Jeep Compass
  [7, 9], // Hyundai HB20  → wants a car like the Renault Duster
];

// ──────────────────────────────────────────────
// Cache helpers
// ──────────────────────────────────────────────

let _brandsCache: FipeBrand[] | null = null;

async function findBrandCode(name: string): Promise<string> {
  if (!_brandsCache) _brandsCache = await fetchFipeBrands();
  const match = _brandsCache.find((b) => b.nome.toLowerCase() === name.toLowerCase());
  if (!match) throw new Error(`Marca "${name}" não encontrada na Tabela FIPE`);
  return match.codigo;
}

const parsedCache = new Map<string, ReturnType<typeof parseFipeModels>>();

async function getParsedModels(brandCode: string) {
  if (parsedCache.has(brandCode)) return parsedCache.get(brandCode)!;
  const raw = await fetchFipeModels(brandCode);
  const parsed = parseFipeModels(raw);
  parsedCache.set(brandCode, parsed);
  return parsed;
}

const yearsCache = new Map<string, { value: string; yearNum: number }[]>();

async function getYearOptions(brandCode: string, modelCode: string) {
  const key = `${brandCode}-${modelCode}`;
  if (yearsCache.has(key)) return yearsCache.get(key)!;
  const raw = await fetchFipeYears(brandCode, modelCode);
  const mapped = raw.map((y) => ({
    value: y.codigo,
    yearNum: parseInt(y.codigo.split("-")[0], 10),
  }));
  yearsCache.set(key, mapped);
  return mapped;
}

// ──────────────────────────────────────────────
// Resolve one car from FIPE
// ──────────────────────────────────────────────

interface ResolvedCar {
  brand: string;
  generalModel: string;        // First word of FIPE name
  version: string;             // Version string (transmission suffix stripped)
  transmission: string | null; // "Automático" | "Manual" | null
  fullModelName: string;       // Full FIPE name
  year: number;
  estimatedValue: number;
}

async function resolveCarFromFipe(lookup: LookupEntry): Promise<ResolvedCar> {
  const brandCode = await findBrandCode(lookup.brand);
  const parsed = await getParsedModels(brandCode);

  const match = parsed.generalModels.find(
    (gm) => gm.toLowerCase() === lookup.model.toLowerCase()
  );
  if (!match) {
    throw new Error(
      `Modelo "${lookup.model}" da marca "${lookup.brand}" não encontrado. ` +
      `Disponíveis: ${parsed.generalModels.join(", ")}`
    );
  }

  const versions = parsed.versionsByGeneralModel[match]
    // Sort by modelCode descending — higher codes tend to be newer FIPE entries
    .sort((a, b) => parseInt(b.modelCode) - parseInt(a.modelCode));
  let chosenVersion = versions[0];
  if (lookup.preferAuto) {
    const auto = versions.find((v) => v.transmission === "Automático");
    if (auto) chosenVersion = auto;
  }

  const yearOpts = await getYearOptions(brandCode, chosenVersion.modelCode);
  // Pick the latest available year — no hardcoded target.
  const latestYear = yearOpts[yearOpts.length - 1];
  if (!latestYear) {
    throw new Error(`Nenhum ano para ${lookup.brand} ${chosenVersion.fullName}`);
  }

  const priceData = await fetchFipePrice(brandCode, chosenVersion.modelCode, latestYear.value);
  const cleaned = priceData.Valor.replace(/[R$\s.]/g, "").replace(",", ".");
  const price = parseFloat(cleaned);
  if (isNaN(price)) throw new Error(`Preço FIPE inválido: "${priceData.Valor}"`);

  return {
    brand: lookup.brand,
    generalModel: match,
    version: chosenVersion.version,
    transmission: chosenVersion.transmission,
    fullModelName: chosenVersion.fullName,
    year: priceData.AnoModelo,
    estimatedValue: Math.round(price),
  };
}

// ──────────────────────────────────────────────
// Main seed function
// ──────────────────────────────────────────────

export async function seedDatabase(): Promise<{
  users: User[];
  posts: CarPost[];
  matchCount: number;
}> {
  clearData("users");
  clearData("posts");
  clearData("matches");

  // Users
  const users: User[] = MOCK_USERS.map((u) => ({
    id: generateId(),
    name: u.name,
    email: u.email,
    createdAt: nowISO(),
  }));
  for (const user of users) addItem("users", user);

  // Reset caches so each seed run fetches fresh FIPE data
  _brandsCache = null;
  parsedCache.clear();
  yearsCache.clear();

  // ── Pass 1: resolve ALL lookups from FIPE ──
  const resolved: ResolvedCar[] = [];
  for (const lookup of SEED_LOOKUPS) {
    resolved.push(await resolveCarFromFipe(lookup));
  }

  // ── Pass 2: build posts with everything derived from FIPE ──
  const posts: CarPost[] = POST_LOOKUP_INDICES.map((lookupIndex, postIndex) => {
    const car = resolved[lookupIndex];

    // Find what this post wants
    const want = SEED_WANTS.find((w) => w[0] === postIndex)!;
    const targetIndex = want[1];
    const targetCar = resolved[targetIndex];

    // Chevrolet pair (4↔5) is brand-only — strip model/version/transmission
    const isBrandOnly =
      (postIndex === 4 && targetIndex === 5) ||
      (postIndex === 5 && targetIndex === 4);

    // Cash derived from FIPE price difference between the two cars.
    // Positive = this post pays cash on top; negative = receives cash.
    const cashAdjustment = targetCar.estimatedValue - car.estimatedValue;
    const tolerance = Math.max(1, Math.round(0.2 * Math.abs(cashAdjustment)));

    // Year range centered on the target car's actual FIPE year
    const yearMin = targetCar.year - 3;
    const yearMax = targetCar.year + 3;

    const desiredVehicle: DesiredVehicle = {
      brand: targetCar.brand,
      model: isBrandOnly ? "" : targetCar.generalModel,
      version: isBrandOnly ? undefined : targetCar.version,
      transmission: isBrandOnly ? undefined : (targetCar.transmission ?? undefined),
      yearMin,
      yearMax,
      cashAdjustment,
      cashAdjustmentTolerance: tolerance,
    };

    // Title auto-generated from FIPE data — never a hardcoded year.
    const title = `${car.brand} ${car.fullModelName} ${car.year}`;

    return {
      id: generateId(),
      userId: users[POST_USER_INDICES[postIndex]].id,
      title,
      description: "",
      car: {
        brand: car.brand,
        model: car.fullModelName,
        year: car.year,
        estimatedValue: car.estimatedValue,
      },
      desiredTrade: { vehicles: [desiredVehicle] },
      contactInfo: {
        whatsapp: undefined,
        email: users[POST_USER_INDICES[postIndex]].email,
      },
      images: [],
      createdAt: nowISO(),
      isActive: true,
    };
  });

  for (const post of posts) addItem("posts", post);

  const newMatches = runMatching();
  return { users, posts, matchCount: newMatches.length };
}
