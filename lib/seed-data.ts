import { addItem, clearData } from "./db";
import { generateId, nowISO } from "./utils";
import { runMatching } from "./matching";
import type { User, CarPost } from "./types";

interface SeedUserEntry {
  name: string;
  email: string;
}

interface SeedPostEntry {
  userIndex: number;
  title: string;
  description: string;
  brand: string;
  model: string;
  year: number;
  value: number;
  wantBrand?: string;
  wantModel?: string;
  wantYearMin?: number;
  wantYearMax?: number;
  cashAdj: number;
  tolerance: number;
  whatsapp?: string;
}

const MOCK_USERS: SeedUserEntry[] = [
  { name: "Carlos Silva", email: "carlos@email.com" },
  { name: "Ana Oliveira", email: "ana@email.com" },
  { name: "Roberto Santos", email: "roberto@email.com" },
  { name: "Juliana Costa", email: "juliana@email.com" },
  { name: "Fernando Lima", email: "fernando@email.com" },
  { name: "Mariana Souza", email: "mariana@email.com" },
];

const MOCK_POSTS: SeedPostEntry[] = [
  // Post 0: Honda Fit 2008 ↔ should match with Post 1 (Prius)
  {
    userIndex: 0,
    title: "Honda Fit 2008 - Excelente estado",
    description: "Honda Fit 2008 completo, ar condicionado, direção hidráulica, revisões em dia.",
    brand: "Honda",
    model: "Fit",
    year: 2008,
    value: 25000,
    wantBrand: "Toyota",
    wantModel: "Prius",
    wantYearMin: 2008,
    wantYearMax: 2011,
    cashAdj: 5000,
    tolerance: 3000,
    whatsapp: "+5511999999991",
  },
  // Post 1: Toyota Prius 2009 ↔ should match with Post 0 (Fit)
  {
    userIndex: 1,
    title: "Toyota Prius 2009 - Híbrido econômico",
    description: "Prius 2009, bateria em ótimo estado, média de 18km/l, único dono.",
    brand: "Toyota",
    model: "Prius",
    year: 2009,
    value: 35000,
    wantBrand: "Honda",
    wantModel: "Fit",
    wantYearMin: 2006,
    wantYearMax: 2010,
    cashAdj: -3000,
    tolerance: 3000,
    whatsapp: "+5511999999992",
  },
  // Post 2: Fiat Uno 2015 ↔ should match with Post 3 (Gol)
  {
    userIndex: 2,
    title: "Fiat Uno 2015 - Popular econômico",
    description: "Fiat Uno 2015, 1.0 fire, muito econômico, ideal para cidade.",
    brand: "Fiat",
    model: "Uno",
    year: 2015,
    value: 22000,
    wantBrand: "Volkswagen",
    wantModel: "Gol",
    wantYearMin: 2013,
    wantYearMax: 2017,
    cashAdj: 2000,
    tolerance: 1500,
    whatsapp: "+5511999999993",
  },
  // Post 3: VW Gol 2016 ↔ should match with Post 2 (Uno)
  {
    userIndex: 3,
    title: "VW Gol 2016 - Completo",
    description: "Gol 2016, 1.6, ar condicionado, direção elétrica, vidros e travas elétricos.",
    brand: "Volkswagen",
    model: "Gol",
    year: 2016,
    value: 25000,
    wantBrand: "Fiat",
    wantModel: "Uno",
    wantYearMin: 2014,
    wantYearMax: 2018,
    cashAdj: -1000,
    tolerance: 2000,
    whatsapp: "+5511999999994",
  },
  // Post 4: Chevrolet Onix 2020 ↔ partial match with Post 5 (same brand, different model)
  {
    userIndex: 4,
    title: "Chevrolet Onix 2020 - LTZ 1.4",
    description: "Onix 2020 LTZ, 1.4 aspirado, completo, absolutamente tudo funcionando.",
    brand: "Chevrolet",
    model: "Onix",
    year: 2020,
    value: 45000,
    wantBrand: "Chevrolet",
    wantYearMin: 2018,
    wantYearMax: 2022,
    cashAdj: 5000,
    tolerance: 5000,
    whatsapp: "+5511999999995",
  },
  // Post 5: Chevrolet Cruze 2019 ↔ partial match with Post 4 (same brand)
  {
    userIndex: 5,
    title: "Chevrolet Cruze 2019 - LTZ",
    description: "Cruze 2019, 1.4 turbo, automático, bancos em couro, teto solar.",
    brand: "Chevrolet",
    model: "Cruze",
    year: 2019,
    value: 55000,
    wantBrand: "Chevrolet",
    wantYearMin: 2018,
    wantYearMax: 2022,
    cashAdj: -5000,
    tolerance: 5000,
    whatsapp: "+5511999999996",
  },
  // Post 6: Ford Ka 2017 - no match expected (wants Jeep Compass, incompatible)
  {
    userIndex: 0,
    title: "Ford Ka 2017 - SEL 1.5",
    description: "Ford Ka SEL 2017, 1.5, completo, baixo km.",
    brand: "Ford",
    model: "Ka",
    year: 2017,
    value: 20000,
    wantBrand: "Jeep",
    wantModel: "Compass",
    wantYearMin: 2019,
    wantYearMax: 2022,
    cashAdj: 15000,
    tolerance: 5000,
    whatsapp: "+5511999999997",
  },
  // Post 7: Hyundai HB20 2021 - no match expected (wants Renault Duster, incompatible)
  {
    userIndex: 1,
    title: "Hyundai HB20 2021 - Diamond",
    description: "HB20 2021 Diamond, 1.0 turbo, automático, completo, 30mil km.",
    brand: "Hyundai",
    model: "HB20",
    year: 2021,
    value: 40000,
    wantBrand: "Renault",
    wantModel: "Duster",
    wantYearMin: 2020,
    wantYearMax: 2023,
    cashAdj: 10000,
    tolerance: 3000,
    whatsapp: "+5511999999998",
  },
];

export function seedDatabase(): {
  users: User[];
  posts: CarPost[];
  matchCount: number;
} {
  // Clear existing data
  clearData("users");
  clearData("posts");
  clearData("matches");

  // Create users
  const users: User[] = MOCK_USERS.map((u) => ({
    id: generateId(),
    name: u.name,
    email: u.email,
    createdAt: nowISO(),
  }));
  for (const user of users) {
    addItem("users", user);
  }

  // Create posts
  const posts: CarPost[] = MOCK_POSTS.map((p) => ({
    id: generateId(),
    userId: users[p.userIndex].id,
    title: p.title,
    description: p.description,
    car: {
      brand: p.brand,
      model: p.model,
      year: p.year,
      estimatedValue: p.value,
    },
    desiredTrade: {
      brand: p.wantBrand,
      model: p.wantModel,
      yearMin: p.wantYearMin,
      yearMax: p.wantYearMax,
      cashAdjustment: p.cashAdj,
      cashAdjustmentTolerance: p.tolerance,
    },
    contactInfo: {
      whatsapp: p.whatsapp,
      email: users[p.userIndex].email,
    },
    images: [],
    createdAt: nowISO(),
    isActive: true,
  }));
  for (const post of posts) {
    addItem("posts", post);
  }

  // Run matching
  const newMatches = runMatching();

  return { users, posts, matchCount: newMatches.length };
}
