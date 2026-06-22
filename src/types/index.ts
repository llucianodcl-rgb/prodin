export type Unit = 'g' | 'kg' | 'ml' | 'l' | 'un';

export interface Ingredient {
  id: string;
  name: string;
  brand?: string;
  category: string;
  quantityBought: number;
  unit: Unit;
  pricePaid: number;
  weightPerUn?: number; // Weight/volume per single unit when unit is 'un'
  weightPerUnUnit?: Unit; // Unit of the weightPerUn (g, kg, ml, l)
  notes?: string;
  profitMultiplier?: number;
  targetPricePerUnit?: number;
  createdAt: string;
}

export interface RecipeIngredient {
  id: string;
  ingredientId: string;
  quantityUsed: number;
  unit?: Unit;
}

export interface ExtraCost {
  id: string;
  name: string;
  value: number;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  description: string;
  photoUrl?: string;
  ingredients: RecipeIngredient[];
  finalWeight: number; // in grams/ml
  isManualWeight?: boolean;
  weightPerUnit: number; // in grams/ml
  extraCosts: ExtraCost[];
  profitMultiplier: number; // 2, 3, 4, 5, etc.
  targetPricePerUnit: number;
  createdAt: string;
  sharedBy?: string; // Optional: name of the user who shared it
  importedAt?: string; // Optional: when it was imported
}

export type ShareStatus = 'pending' | 'accepted' | 'rejected' | 'canceled';

export interface RecipeShare {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  receiverEmail: string;
  recipeName: string;
  recipeData: Recipe;
  originalIngredients: Ingredient[]; // Added to allow receiver to recreate missing ingredients
  status: ShareStatus;
  createdAt: string;
  updatedAt: string;
}
