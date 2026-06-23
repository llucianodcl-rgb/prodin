import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Ingredient, Recipe, RecipeIngredient, Unit } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  // Round to 2 decimal places to avoid R$ 45,35999999999999
  const roundedValue = Math.round((value + Number.EPSILON) * 100) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(roundedValue);
}

export function formatNumber(value: number): string {
    // Round to 2 decimal places
    const roundedValue = Math.round((value + Number.EPSILON) * 100) / 100;
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(roundedValue);
}

export function formatIngredientQuantity(quantity: number, unit: Unit): string {
  let displayQty = quantity;
  let displayUnit = unit;

  if (unit === 'kg' && quantity < 1) {
    displayQty = quantity * 1000;
    displayUnit = 'g';
  } else if (unit === 'l' && quantity < 1) {
    displayQty = quantity * 1000;
    displayUnit = 'ml';
  } else if (unit === 'g' && quantity >= 1000) {
    displayQty = quantity / 1000;
    displayUnit = 'kg';
  } else if (unit === 'ml' && quantity >= 1000) {
    displayQty = quantity / 1000;
    displayUnit = 'l';
  }

  return `${formatNumber(displayQty)} ${displayUnit}`;
}

// Convert units to base units for calculation (g, ml, un)
export function getBaseQuantity(quantity: number, unit: Unit): number {
  switch (unit) {
    case 'kg':
      return quantity * 1000;
    case 'l':
      return quantity * 1000;
    default:
      return quantity; // g, ml, un
  }
}

// Calculate the cost of an ingredient per base unit (1g, 1ml, or 1un if no weight provided)
export function getIngredientUnitCost(ingredient: Ingredient): number {
  if (!ingredient || ingredient.quantityBought <= 0) return 0;
  
  // If we have a weight/volume per unit, convert to base weight/volume
  if (ingredient.weightPerUn && ingredient.weightPerUn > 0) {
    const weightBase = getBaseQuantity(ingredient.weightPerUn, ingredient.weightPerUnUnit || 'g');
    const totalBaseQty = ingredient.quantityBought * weightBase;
    return ingredient.pricePaid / totalBaseQty; // Cost per gram/ml
  }
  
  const baseQty = getBaseQuantity(ingredient.quantityBought, ingredient.unit);
  return ingredient.pricePaid / baseQty;
}

// Calculate the total cost of an ingredient used in a recipe
export function getRecipeIngredientCost(
  recipeIngredient: RecipeIngredient,
  ingredient: Ingredient
): number {
  if (!ingredient) return 0;
  const unitCost = getIngredientUnitCost(ingredient);
  
  const usedUnit = recipeIngredient.unit || ingredient.unit;
  
  // Case A: Ingredient is defined by weight/volume per unit (e.g. 500g box)
  if (ingredient.weightPerUn && ingredient.weightPerUn > 0) {
    const weightBasePerUn = getBaseQuantity(ingredient.weightPerUn, ingredient.weightPerUnUnit || 'g');
    
    // If recipe uses 'un', multiply weight per un by quantity used
    if (usedUnit === 'un') {
      const baseUsedQty = recipeIngredient.quantityUsed * weightBasePerUn;
      return unitCost * baseUsedQty;
    }
    
    // If recipe uses 'g' or 'ml', multiply unit cost (which is per g/ml) by base quantity
    const baseUsedQty = getBaseQuantity(recipeIngredient.quantityUsed, usedUnit);
    return unitCost * baseUsedQty;
  }
  
  // Case B: Ingredient is defined by its own base unit (kg, l, un, g, ml)
  // Check for unit mismatch: e.g. ingredient in 'un' (no weight) but recipe uses 'g'
  const ingredientBaseUnit = ingredient.unit === 'kg' || ingredient.unit === 'g' ? 'weight' : 
                             ingredient.unit === 'l' || ingredient.unit === 'ml' ? 'volume' : 'unit';
  
  const usedBaseUnit = usedUnit === 'kg' || usedUnit === 'g' ? 'weight' : 
                       usedUnit === 'l' || usedUnit === 'ml' ? 'volume' : 'unit';

  // If the user tries to use mass/volume on a 'unit-only' ingredient without weight definition,
  // we cannot calculate accurately, so we fallback to a consistent but potentially wrong 1:1 ratio
  // or handle as unit error. Here we'll treat it as unit multiplier to avoid zero costs in dashboard.
  if (ingredientBaseUnit === 'unit' && usedBaseUnit !== 'unit') {
    // This is where "9.833%" likely comes from: cost per 1 unit * 500 grams = 500x cost.
    // We must normalize: if missing weight info, we assume 1 unit = 1 standard base unit of mass/volume if that's what's used.
    // However, it's safer to just return price per unit * quantity as if un were used, or a corrected ratio.
    return unitCost * recipeIngredient.quantityUsed; 
  }

  const baseUsedQty = getBaseQuantity(recipeIngredient.quantityUsed, usedUnit);
  return unitCost * baseUsedQty;
}

// Calculate total ingredients cost
export function getRecipeIngredientsCost(recipe: Recipe, allIngredients: Ingredient[]): number {
  return (recipe.ingredients || []).reduce((total, ri) => {
    const ing = allIngredients.find(i => i.id === ri.ingredientId);
    return total + (ing ? getRecipeIngredientCost(ri, ing) : 0);
  }, 0);
}

// Calculate total extra costs
export function getRecipeExtraCosts(recipe: Recipe): number {
  return (recipe.extraCosts || []).reduce((total, ec) => total + ec.value, 0);
}

// Calculate total recipe cost
export function getRecipeTotalCost(recipe: Recipe, allIngredients: Ingredient[]): number {
  return getRecipeIngredientsCost(recipe, allIngredients) + getRecipeExtraCosts(recipe);
}

// Calculate quantity produced
export function getQuantityProduced(recipe: Recipe): number {
  if (recipe.weightPerUnit && recipe.weightPerUnit > 0) {
    return Math.floor(recipe.finalWeight / recipe.weightPerUnit);
  }
  return 1; // Produce 1 whole unit if weightPerUnit is 0
}

// Calculate suggested price total
export function getSuggestedTotalPrice(recipe: Recipe, allIngredients: Ingredient[]): number {
  const totalCost = getRecipeTotalCost(recipe, allIngredients);
  return totalCost * recipe.profitMultiplier;
}

// Calculate suggested price per unit
export function getSuggestedUnitPrice(recipe: Recipe, allIngredients: Ingredient[]): number {
  const suggestedTotal = getSuggestedTotalPrice(recipe, allIngredients);
  const qty = getQuantityProduced(recipe);
  return qty > 0 ? suggestedTotal / qty : suggestedTotal;
}

// Calculate actual metrics based on target price
export function getActualMetrics(recipe: Recipe, allIngredients: Ingredient[]) {
  const totalCost = getRecipeTotalCost(recipe, allIngredients);
  const qtyProduced = getQuantityProduced(recipe);
  const costPerUnit = qtyProduced > 0 ? totalCost / qtyProduced : totalCost;
  
  const targetTotalRevenue = recipe.targetPricePerUnit * qtyProduced;
  const netProfitTotal = targetTotalRevenue - totalCost;
  const netProfitUnit = recipe.targetPricePerUnit - costPerUnit;
  
  const actualMultiplier = totalCost > 0 ? targetTotalRevenue / totalCost : 0;
  const profitMargin = targetTotalRevenue > 0 ? (netProfitTotal / targetTotalRevenue) * 100 : 0;

  return {
    costPerUnit,
    targetTotalRevenue,
    netProfitTotal,
    netProfitUnit,
    actualMultiplier,
    profitMargin,
    meetsTarget: actualMultiplier >= recipe.profitMultiplier,
    isLoss: costPerUnit > recipe.targetPricePerUnit
  };
}

export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ç/g, 'c');
}
