import { addItem, clearData } from "./db";
import { generateId, nowISO } from "./utils";
import { runMatching } from "./matching";
import type { User, CarPost } from "./types";

interface SeedUserEntry {
  name: string;
  email: string;
}

interface SeedVehicle {
  brand: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  cashAdjustment: number;
  tolerance: number;
}

interface SeedPostEntry {
  userIndex: number;
  title: string;
  description: string;
  brand: string;
  model: string;
  year: number;
  value: number;
  vehicles: SeedVehicle[];
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
  {
    userIndex: 0,
    title: "Honda Fit 2008 - Excelente estado",
    description: "Completo, ar condicionado, direção hidráulica, revisões em dia.",
    brand: "Honda",
    model: "Fit",
    year: 2008,
    value: 25000,
    vehicles: [
      { brand: "Toyota", model: "Prius", yearMin: 2008, yearMax: 2011, cashAdjustment: 5000, tolerance: 3000 },
    ],
    whatsapp: "+5511999999991",
  },
  {
    userIndex: 1,
    title: "Toyota Prius 2009 - Híbrido econômico",
    description: "Bateria em ótimo estado, média de 18km/l, único dono.",
    brand: "Toyota",
    model: "Prius",
    year: 2009,
    value: 35000,
    vehicles: [
      { brand: "Honda", model: "Fit", yearMin: 2006, yearMax: 2010, cashAdjustment: -3000, tolerance: 3000 },
    ],
    whatsapp: "+5511999999992",
  },
  {
    userIndex: 2,
    title: "Fiat Uno 2015 - Popular econômico",
    description: "1.0 fire, muito econômico, ideal pra cidade.",
    brand: "Fiat",
    model: "Uno",
    year: 2015,
    value: 22000,
    vehicles: [
      { brand: "Volkswagen", model: "Gol", yearMin: 2013, yearMax: 2017, cashAdjustment: 2000, tolerance: 1500 },
    ],
    whatsapp: "+5511999999993",
  },
  {
    userIndex: 3,
    title: "VW Gol 2016 - Completo",
    description: "1.6, ar condicionado, direção elétrica, vidros e travas elétricos.",
    brand: "Volkswagen",
    model: "Gol",
    year: 2016,
    value: 25000,
    vehicles: [
      { brand: "Fiat", model: "Uno", yearMin: 2014, yearMax: 2018, cashAdjustment: -1000, tolerance: 2000 },
    ],
    whatsapp: "+5511999999994",
  },
  {
    userIndex: 4,
    title: "Chevrolet Onix 2020 - LTZ 1.4",
    description: "Completo, tudo funcionando, único dono.",
    brand: "Chevrolet",
    model: "Onix",
    year: 2020,
    value: 45000,
    vehicles: [
      { brand: "Chevrolet", yearMin: 2018, yearMax: 2022, cashAdjustment: 5000, tolerance: 5000 },
    ],
    whatsapp: "+5511999999995",
  },
  {
    userIndex: 5,
    title: "Chevrolet Cruze 2019 - LTZ",
    description: "1.4 turbo, automático, bancos em couro, teto solar.",
    brand: "Chevrolet",
    model: "Cruze",
    year: 2019,
    value: 55000,
    vehicles: [
      { brand: "Chevrolet", yearMin: 2018, yearMax: 2022, cashAdjustment: -5000, tolerance: 5000 },
    ],
    whatsapp: "+5511999999996",
  },
  {
    userIndex: 0,
    title: "Ford Ka 2017 - SEL 1.5",
    description: "Completo, baixo km, ótimo estado de conservação.",
    brand: "Ford",
    model: "Ka",
    year: 2017,
    value: 20000,
    vehicles: [
      { brand: "Jeep", model: "Compass", yearMin: 2019, yearMax: 2022, cashAdjustment: 15000, tolerance: 5000 },
    ],
    whatsapp: "+5511999999997",
  },
  {
    userIndex: 1,
    title: "Hyundai HB20 2021 - Diamond",
    description: "1.0 turbo, automático, completo, 30mil km.",
    brand: "Hyundai",
    model: "HB20",
    year: 2021,
    value: 40000,
    vehicles: [
      { brand: "Renault", model: "Duster", yearMin: 2020, yearMax: 2023, cashAdjustment: 10000, tolerance: 3000 },
    ],
    whatsapp: "+5511999999998",
  },
];

export function seedDatabase(): {
  users: User[];
  posts: CarPost[];
  matchCount: number;
} {
  clearData("users");
  clearData("posts");
  clearData("matches");

  const users: User[] = MOCK_USERS.map((u) => ({
    id: generateId(),
    name: u.name,
    email: u.email,
    createdAt: nowISO(),
  }));
  for (const user of users) {
    addItem("users", user);
  }

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
      vehicles: p.vehicles.map((v) => ({
        brand: v.brand,
        model: v.model || "",
        yearMin: v.yearMin,
        yearMax: v.yearMax,
        cashAdjustment: v.cashAdjustment,
        cashAdjustmentTolerance: v.tolerance,
      })),
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

  const newMatches = runMatching();

  return { users, posts, matchCount: newMatches.length };
}
