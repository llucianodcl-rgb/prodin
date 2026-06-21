import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Ingredient, Recipe, RecipeIngredient, Unit } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatNumber(value: number): string {
    if (Number.isInteger(value)) {
        return value.toString();
    }
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(value);
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
  
  // If the recipe uses 'un' of an ingredient that has weight definition, 
  // we must normalize to base units (g/ml) to use with unitCost (which is cost per g/ml)
  if (usedUnit === 'un' && ingredient.weightPerUn && ingredient.weightPerUn > 0) {
    const weightBase = getBaseQuantity(ingredient.weightPerUn, ingredient.weightPerUnUnit || 'g');
    const baseUsedQty = recipeIngredient.quantityUsed * weightBase;
    return unitCost * baseUsedQty;
  }
  
  const baseUsedQty = getBaseQuantity(recipeIngredient.quantityUsed, usedUnit);
  return unitCost * baseUsedQty;
}

// Calculate total ingredients cost
export function getRecipeIngredientsCost(recipe: Recipe, allIngredients: Ingredient[]): number {
  return recipe.ingredients.reduce((total, ri) => {
    const ing = allIngredients.find(i => i.id === ri.ingredientId);
    return total + (ing ? getRecipeIngredientCost(ri, ing) : 0);
  }, 0);
}

// Calculate total extra costs
export function getRecipeExtraCosts(recipe: Recipe): number {
  return recipe.extraCosts.reduce((total, ec) => total + ec.value, 0);
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
