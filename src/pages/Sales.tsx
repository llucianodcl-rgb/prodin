import React, { useState, useEffect } from "react";
import { useStore } from "../store/useStore";
import { formatCurrency, getRecipeTotalCost, getQuantityProduced, getIngredientUnitCost } from "../lib/utils";
import { Calculator, Package, AlertTriangle } from "lucide-react";

export default function Sales() {
  const { recipes, ingredients, extras, salesDraft, setSalesDraft } = useStore();
  const allAvailableItems = [...ingredients, ...extras];

  const [selectedRecipeId, setSelectedRecipeId] = useState(salesDraft?.selectedRecipeId || "");
  const [selectedExtraId, setSelectedExtraId] = useState(salesDraft?.selectedExtraId || "");
  const [quantity, setQuantity] = useState(salesDraft?.quantity || 1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSalesDraft({ selectedRecipeId, selectedExtraId, quantity });
    }, 500);
    return () => clearTimeout(timer);
  }, [selectedRecipeId, selectedExtraId, quantity, setSalesDraft]);

  const selectedRecipe = recipes.find(r => r.id === selectedRecipeId);
  const selectedExtra = extras.find(e => e.id === selectedExtraId);

  let unitCost = 0;
  let finalPrice = 0;
  let extraCost = 0;
  let sweetsTotalCost = 0;
  let possibleKits = 0;
  let leftoverSweets = 0;
  let missingSweets = 0;
  let monetaryLoss = 0;
  let yieldAmount = 0;

  if (selectedRecipe) {
    unitCost = selectedRecipe.targetPricePerUnit || 0;
    
    sweetsTotalCost = unitCost * quantity;

    if (selectedExtra) {
      // Utiliza o preço de venda definido (por unidade) caso exista, senão usa o custo base (fallback)
      extraCost = selectedExtra.targetPricePerUnit || getIngredientUnitCost(selectedExtra);
    }

    finalPrice = sweetsTotalCost + extraCost;

    yieldAmount = getQuantityProduced(selectedRecipe);
    
    if (quantity > 0) {
      possibleKits = Math.floor(yieldAmount / quantity);
      leftoverSweets = yieldAmount % quantity;
      missingSweets = leftoverSweets > 0 ? (quantity - leftoverSweets) : 0;
      monetaryLoss = leftoverSweets * unitCost;
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-brown dark:text-white">Vendas</h1>
          <p className="text-slate-500 dark:text-slate-400">Monte seus kits e calcule o preço de venda dos seus doces.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-pink/10 dark:border-slate-700 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
            <div className="p-2 bg-pink-soft dark:bg-pink-500/10 rounded-xl text-pink">
              <Calculator size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Simulador de Kit</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-brown dark:text-slate-200 mb-1">Selecione uma Receita</label>
              <select 
                value={selectedRecipeId}
                onChange={(e) => setSelectedRecipeId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink dark:text-white font-medium text-slate-700 dark:text-slate-200"
              >
                <option value="">-- Selecione --</option>
                {recipes.map(recipe => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-brown dark:text-slate-200 mb-1">Quantidade de Doces no Kit</label>
              <input 
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink dark:text-white font-medium text-slate-700 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-brown dark:text-slate-200 mb-1">Selecione um Extra (Embalagem)</label>
              <select 
                value={selectedExtraId}
                onChange={(e) => setSelectedExtraId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink dark:text-white font-medium text-slate-700 dark:text-slate-200"
              >
                <option value="">-- Nenhum Selecionado --</option>
                {extras.map(extra => (
                  <option key={extra.id} value={extra.id}>
                    {extra.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-pink-soft/30 dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-pink/20 dark:border-slate-700 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-pink/10 dark:border-slate-700 pb-4">
              <div className="p-2 bg-pink dark:bg-pink-500 rounded-xl text-white shadow-soft">
                <Package size={20} />
              </div>
              <h2 className="text-xl font-bold text-brown dark:text-white">Resumo do Kit</h2>
            </div>
          
            {selectedRecipe ? (
              <div className="space-y-4">
                 <div className="flex justify-between items-center bg-white dark:bg-slate-900 px-4 py-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 font-medium text-sm">Preço Unitário (1 Doce)</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{formatCurrency(unitCost)}</span>
                 </div>
                 
                 <div className="flex justify-between items-center bg-white dark:bg-slate-900 px-4 py-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 font-medium text-sm">Valor dos Doces ({quantity} x {formatCurrency(unitCost)})</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{formatCurrency(sweetsTotalCost)}</span>
                 </div>
                 
                 <div className="flex justify-between items-center bg-white dark:bg-slate-900 px-4 py-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 font-medium text-sm">Custo da Embalagem / Extra</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{formatCurrency(extraCost)}</span>
                 </div>

                 {leftoverSweets > 0 && (
                   <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                     <div className="flex items-start gap-3">
                       <AlertTriangle className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" size={20} />
                       <div>
                         <h3 className="font-bold text-amber-900 dark:text-amber-300 text-xs uppercase tracking-wider">Atenção: Sobra de Doces</h3>
                         <p className="mt-2 text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                           A receita rende <strong>{yieldAmount.toFixed(1)} uni</strong>. Com kits de <strong>{quantity} uni</strong>, você monta <strong>{possibleKits} {possibleKits === 1 ? 'kit' : 'kits'}</strong> e sobram <strong>{leftoverSweets.toFixed(1)} uni</strong>.
                         </p>
                         <p className="mt-2 text-sm text-amber-800 dark:text-amber-200 leading-relaxed border-t border-amber-200/50 dark:border-amber-500/20 pt-2">
                           • Faltam <strong>{missingSweets.toFixed(1)} uni</strong> para fechar outro kit<br />
                           • Valor das sobras: <strong>{formatCurrency(monetaryLoss)}</strong>
                         </p>
                       </div>
                     </div>
                   </div>
                 )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <p className="text-slate-400 dark:text-slate-500 font-medium">
                  Selecione uma receita ao lado para visualizar os cálculos.
                </p>
              </div>
            )}
          </div>
          
          <div className="mt-6 pt-4 border-t border-pink/20 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-brown dark:text-slate-200 font-bold text-lg uppercase tracking-wider">Preço Sugerido do Kit:</span>
              <span className="text-3xl font-black text-pink dark:text-pink-400">{formatCurrency(finalPrice)}</span>
            </div>
            <p className="text-xs text-slate-400 mt-2 text-right">Este é o preço de venda sugerido para o kit considerando o preço de venda dos doces e o custo da embalagem.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
