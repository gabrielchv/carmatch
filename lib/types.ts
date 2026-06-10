export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface CarDetail {
  brand: string;
  model: string;
  year: number;
  estimatedValue: number;
}

export interface DesiredVehicle {
  brand: string;
  model: string;          // modelo geral ex: "Fit" (primeira palavra do nome FIPE)
  version?: string;       // versão específica ex: "CX 1.4 Flex 16V 5p"
  transmission?: string;  // "Automático" | "Manual"
  yearMin?: number;
  yearMax?: number;
  cashAdjustment: number;        // quanto o dono do post paga (+) ou recebe (-)
  cashAdjustmentTolerance: number; // ±tolerância
}

export interface DesiredTrade {
  vehicles: DesiredVehicle[];
}

export interface CarPost {
  id: string;
  userId: string;
  title: string;
  description: string;
  car: CarDetail;
  desiredTrade: DesiredTrade;
  contactInfo: {
    whatsapp?: string;
    email?: string;
  };
  images: string[];
  createdAt: string;
  isActive: boolean;
}

export interface Match {
  id: string;
  postAId: string;
  postBId: string;
  score: number;
  suggestedCashFromA: number; // quanto A paga pra B (negativo = B paga A)
  status: "pending" | "contacted";
  createdAt: string;
}
