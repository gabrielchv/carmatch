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

export interface DesiredTrade {
  brand?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  cashAdjustment: number;
  cashAdjustmentTolerance: number;
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
  suggestedCashFromA: number;
  status: "pending" | "contacted";
  createdAt: string;
}
