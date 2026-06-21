import React, { useState, useEffect } from "react";
import { useStore } from "../store/useStore";
import { formatCurrency, getRecipeTotalCost, getQuantityProduced, getIngredientUnitCost, formatNumber, formatIngredientQuantity } from "../lib/utils";
import { Calculator, Package, AlertTriangle, TrendingUp, CheckCircle, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";

export default function Sales() {
  const { recipes, ingredients, extras, salesDraft, setSalesDraft } = useStore();
  const allAvailableItems = [...ingredients, ...extras];

  const [selectedRecipeId, setSelectedRecipeId] = useState(salesDraft?.selectedRecipeId || "");
  const [selectedExtraId, setSelectedExtraId] = useState(salesDraft?.selectedExtraId || "");
  const [quantity, setQuantity] = useState(salesDraft?.quantity || 1);
  const [showComplementary, setShowComplementary] = useState(false);

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

  const calcularReforcoProducao = (
    rendimentoTotal: number,
    listaDeIngredientes: any[],
    deficit: number
  ) => {
    if (rendimentoTotal <= 0) return [];
    const fatorDeEscala = deficit / rendimentoTotal;

    return listaDeIngredientes.map(item => {
      const ing = ingredients.find((i) => i.id === item.ingredientId);
      const name = ing ? ing.name : "Ingrediente Desconhecido";
      const baseUnit = item.unit || ing?.unit || "g";
      const quantity = item.quantityUsed * fatorDeEscala;
      
      if (baseUnit === 'un') {
        const display = `${formatNumber(quantity)} un`;
        let weightStr = "";
        if (ing?.weightPerUn && ing.weightPerUn > 0) {
          const totalWeight = quantity * ing.weightPerUn;
          weightStr = ` (${formatIngredientQuantity(totalWeight, ing.weightPerUnUnit || 'g')})`;
        }
        return { name, display: `${display}${weightStr}` };
      }

      return { 
        name, 
        display: formatIngredientQuantity(quantity, baseUnit)
      };
    }).filter(i => i.display !== "");
  };

  if (selectedRecipe) {
    const recipeCost = getRecipeTotalCost(selectedRecipe, ingredients);
    yieldAmount = getQuantityProduced(selectedRecipe);
    const costPerUnit = yieldAmount > 0 ? recipeCost / yieldAmount : 0;
    
    unitCost = selectedRecipe.targetPricePerUnit || 0; // Preço de Venda Unitário
    sweetsTotalCost = unitCost * quantity; // Preço de Venda total dos doces no kit

    const sweetsTotalProductionCost = costPerUnit * quantity;

    if (selectedExtra) {
      extraCost = selectedExtra.targetPricePerUnit || getIngredientUnitCost(selectedExtra);
    }
    const extraProductionCost = selectedExtra ? getIngredientUnitCost(selectedExtra) : 0;

    finalPrice = sweetsTotalCost + extraCost;
    const totalProductionCost = sweetsTotalProductionCost + extraProductionCost;
    
    // Lucro e Margem
    const kitProfit = finalPrice - totalProductionCost;
    const kitMultiplier = totalProductionCost > 0 ? finalPrice / totalProductionCost : 0;
    const kitMargin = finalPrice > 0 ? (kitProfit / finalPrice) * 100 : 0;

    if (quantity > 0) {
      possibleKits = Math.floor(yieldAmount / quantity);
      leftoverSweets = yieldAmount % quantity;
      missingSweets = leftoverSweets > 0 ? (quantity - leftoverSweets) : 0;
      monetaryLoss = leftoverSweets * unitCost;
    }

    // Métricas de Produção Total
    const totalRevenue = possibleKits * finalPrice;
    const totalPotentialProfit = possibleKits * kitProfit;
    const utilizationPercentage = yieldAmount > 0 ? ((possibleKits * quantity) / yieldAmount) * 100 : 0;

    // Sugestões de Otimização
    const optimizationSuggestions = [];
    if (yieldAmount > 0 && yieldAmount <= 100) { // Limitamos para evitar loops excessivos em rendimentos gigantes
      for (let i = Math.max(1, quantity - 3); i <= Math.min(yieldAmount, quantity + 5); i++) {
        if (yieldAmount % i === 0 && i !== quantity) {
          optimizationSuggestions.push(i);
        }
      }
    }

    if (selectedRecipe) {
      const summaryItems = (
        <div className="space-y-5">
          {/* 1. RESUMO FINANCEIRO */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink/5 rounded-full -mr-12 -mt-12 transition-all group-hover:scale-110" />
            <div className="p-8 text-center border-b border-slate-100 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Preço do Kit</p>
              <h3 className="text-5xl font-black text-brown dark:text-pink-400 mb-3 tracking-tight">{formatCurrency(finalPrice)}</h3>
              <div className="flex items-center justify-center gap-3 text-[10px] font-bold text-slate-400 uppercase">
                 <span>Doces: {formatCurrency(sweetsTotalCost)}</span>
                 <span className="w-1 h-1 bg-slate-300 rounded-full" />
                 <span>Extra: {formatCurrency(extraCost)}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 relative z-10">
              <div className="p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Custo do Kit</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatCurrency(totalProductionCost)}</p>
              </div>
              <div className="p-4 text-center hover:bg-mint/5 transition-colors">
                <p className="text-[9px] font-black uppercase tracking-widest text-mint/70 mb-1.5">Lucro do Kit</p>
                <p className="text-sm font-bold text-mint">{formatCurrency(kitProfit)}</p>
              </div>
              <div className="p-4 text-center hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 transition-colors">
                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500/70 mb-1.5">Margem</p>
                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{formatNumber(kitMargin)}%</p>
              </div>
            </div>
          </div>

          {/* 2. POTENCIAL DA PRODUÇÃO E APROVEITAMENTO */}
          {utilizationPercentage === 100 ? (
            <div className="p-5 rounded-2xl bg-mint/10 border border-mint/20 flex flex-col justify-between">
               <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-mint rounded-xl text-white shadow-sm">
                     <CheckCircle size={18} />
                   </div>
                   <div>
                     <h3 className="font-black text-mint-700 dark:text-mint-400 text-xs uppercase tracking-widest">✓ Aproveitamento Total</h3>
                     <p className="text-xs text-mint-800 dark:text-mint-300 mt-0.5">Toda a produção foi utilizada. Nenhuma sobra gerada.</p>
                   </div>
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4 border-t border-mint/20 pt-4 mt-2">
                 <div>
                   <p className="text-[10px] font-bold text-mint-700/60 dark:text-mint-500/60 uppercase mb-1">Faturamento Total ({possibleKits} {possibleKits === 1 ? 'kit' : 'kits'})</p>
                   <p className="text-xl font-black text-mint-800 dark:text-mint-300">{formatCurrency(totalRevenue)}</p>
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-mint-700/60 dark:text-mint-500/60 uppercase mb-1">Lucro Total</p>
                   <p className="text-xl font-black text-mint">{formatCurrency(totalPotentialProfit)}</p>
                 </div>
               </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
               <div className="flex items-center gap-2 mb-5">
                 <TrendingUp size={16} className="text-slate-400" />
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Potencial da Produção Completa</h4>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Faturamento Total ({possibleKits} {possibleKits === 1 ? 'kit' : 'kits'})</p>
                    <p className="text-xl font-black text-slate-700 dark:text-slate-200">{formatCurrency(totalRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Lucro Total</p>
                    <p className="text-xl font-black text-mint">{formatCurrency(totalPotentialProfit)}</p>
                  </div>
               </div>
               <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                    Aproveitamento da Receita
                  </span>
                  <div className="flex items-center gap-2">
                     <div className="w-32 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-pink transition-all duration-500" style={{ width: `${utilizationPercentage}%` }} />
                     </div>
                     <span className="text-xs font-black text-pink">{formatNumber(utilizationPercentage)}%</span>
                  </div>
               </div>
            </div>
          )}

          {/* 3. DICAS DO PRODIN */}
          <div className="p-5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
             <div className="flex items-center gap-3 mb-4">
               <div className="p-1.5 bg-indigo-500 rounded-lg text-white shadow-sm">
                 <Lightbulb size={16} />
               </div>
               <h3 className="font-black text-indigo-900 dark:text-indigo-300 text-[11px] uppercase tracking-widest">Dicas do Prodin</h3>
             </div>
             
             <ul className="space-y-3 text-xs text-indigo-800 dark:text-indigo-200 leading-relaxed">
                {utilizationPercentage === 100 ? (
                  <li className="flex items-start gap-2.5">
                    <span className="mt-1 text-indigo-500 flex-shrink-0">•</span>
                    <span><strong>Excelente!</strong> A configuração atual é ideal e não gera desperdícios ou sobras não aproveitadas.</span>
                  </li>
                ) : (
                  <li className="flex items-start gap-2.5">
                    <span className="mt-1 text-indigo-500 flex-shrink-0">•</span>
                    <span>Seu aproveitamento atual é de <strong>{formatNumber(utilizationPercentage)}%</strong>. Há oportunidades de otimização.</span>
                  </li>
                )}

                {optimizationSuggestions.length > 0 && utilizationPercentage < 100 && (
                  <li className="flex items-start gap-2.5">
                    <span className="mt-1 text-indigo-500 flex-shrink-0">•</span>
                    <span>
                      Kits com {optimizationSuggestions.map((s, i) => (
                        <span key={s}>
                          <strong>{s} unidades</strong>
                          {i < optimizationSuggestions.length - 2 ? ', ' : i === optimizationSuggestions.length - 2 ? ' ou ' : ''}
                        </span>
                      ))} permitem aproveitamento total (eliminam sobras).
                    </span>
                  </li>
                )}
             </ul>
          </div>

          {/* 4. OPORTUNIDADE IDENTIFICADA */}
          {leftoverSweets > 0 && (
             <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-l-4 border-l-amber-400 border-y border-y-amber-100 border-r border-r-amber-100 dark:border-y-amber-500/20 dark:border-r-amber-500/20">
               <h3 className="font-black text-amber-900 dark:text-amber-300 text-[11px] uppercase tracking-widest mb-3 flex items-center gap-2">
                 🚀 Oportunidade Identificada
               </h3>
               <div className="space-y-2.5 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                 <p>Você possui <strong>{formatNumber(leftoverSweets)} doces</strong> disponíveis para venda ou novos kits (valor de <strong>{formatCurrency(monetaryLoss)}</strong>).</p>
                 <p>Faltam apenas <strong>{formatNumber(missingSweets)} {missingSweets === 1 ? 'unidade' : 'unidades'}</strong> para completar mais 1 kit.</p>
                 <p className="font-bold bg-amber-100/60 dark:bg-amber-900/40 p-2.5 rounded-xl mt-3 inline-block">
                   Produzindo essas unidades será possível montar {possibleKits + 1} {possibleKits + 1 === 1 ? 'kit completo' : 'kits completos'}.
                 </p>
               </div>
             </div>
          )}

          {/* 5. PRODUÇÃO COMPLEMENTAR */}
          {leftoverSweets > 0 && (
             <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
               <div className="flex items-start gap-4">
                 <Package className="text-slate-400 mt-0.5 flex-shrink-0" size={18} />
                 <div className="flex-1">
                   <h3 className="font-bold text-slate-700 dark:text-slate-300 text-[10px] uppercase tracking-widest mb-1">Produção Complementar</h3>
                   
                   {!showComplementary ? (
                     <div className="text-xs text-slate-500 dark:text-slate-400">
                       <p className="mb-2.5">Ingredientes necessários para as {formatNumber(missingSweets)} unidades restantes.</p>
                       <button 
                         onClick={() => setShowComplementary(true)}
                         className="flex items-center gap-1.5 text-[10px] font-bold text-pink hover:text-pink-600 uppercase tracking-wider transition-colors"
                       >
                         [ Mostrar Ingredientes ]
                       </button>
                     </div>
                   ) : (
                     <div className="mt-3 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700/50">
                       <p className="font-bold uppercase tracking-tight flex items-center gap-1.5 mb-3">
                         <ChevronDown size={14} className="text-slate-400"/> Ingredientes para completar o kit:
                       </p>
                       <ul className="space-y-1 mb-4">
                         {calcularReforcoProducao(yieldAmount, selectedRecipe.ingredients, missingSweets).map((item, idx) => (
                           <li key={idx} className="flex justify-between items-center border-b border-slate-200/50 dark:border-slate-700/50 py-1.5 last:border-0 hover:bg-white/50 dark:hover:bg-slate-800 transition-colors px-2 rounded -mx-2">
                             <span>{item.name}</span>
                             <span className="font-bold text-slate-800 dark:text-slate-200">{item.display}</span>
                           </li>
                         ))}
                       </ul>
                       <button 
                         onClick={() => setShowComplementary(false)}
                         className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 uppercase tracking-wider transition-colors"
                       >
                         <ChevronUp size={14} /> [ Ocultar Ingredientes ]
                       </button>
                     </div>
                   )}
                 </div>
               </div>
             </div>
          )}

          {/* 6. INFORMAÇÕES TÉCNICAS */}
          <div className="space-y-2 pt-2">
             <div className="flex justify-between items-center px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <span className="text-slate-500 dark:text-slate-400 font-bold text-[9px] uppercase tracking-wider">Custo de produção por kit</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">{formatCurrency(totalProductionCost)}</span>
             </div>
             <div className="flex justify-between items-center px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <span className="text-slate-500 dark:text-slate-400 font-bold text-[9px] uppercase tracking-wider">Valor de venda (1 Doce)</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">{formatCurrency(unitCost)}</span>
             </div>
             {selectedExtra && (
               <div className="flex justify-between items-center px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <span className="text-slate-500 dark:text-slate-400 font-bold text-[9px] uppercase tracking-wider">Custo da Embalagem / Extra</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">{formatCurrency(extraCost)}</span>
               </div>
             )}
          </div>
        </div>
      );

      return (
        <div className="space-y-6">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-brown dark:text-white">Vendas</h1>
              <p className="text-slate-500 dark:text-slate-400">Monte seus kits e calcule o preço de venda dos seus doces.</p>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* CONFIGURAÇÃO DO KIT */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-pink/10 dark:border-slate-700 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
                  <div className="p-2 bg-pink-soft dark:bg-pink-500/10 rounded-xl text-pink">
                    <Calculator size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">Configuração do Kit</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-brown dark:text-slate-200 mb-2 uppercase tracking-widest">Receita Base</label>
                    <select 
                      value={selectedRecipeId}
                      onChange={(e) => setSelectedRecipeId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink dark:text-white font-bold text-slate-700"
                    >
                      <option value="">-- Selecione a Receita --</option>
                      {recipes.map(recipe => (
                        <option key={recipe.id} value={recipe.id}>
                          {recipe.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-brown dark:text-slate-200 mb-2 uppercase tracking-widest">Quantidade de Doces no Kit</label>
                    <input 
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink dark:text-white font-bold text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-brown dark:text-slate-200 mb-2 uppercase tracking-widest">Embalagem / Itens Extras</label>
                    <select 
                      value={selectedExtraId}
                      onChange={(e) => setSelectedExtraId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink dark:text-white font-bold text-slate-700"
                    >
                      <option value="">-- Nenhuma Embalagem --</option>
                      {extras.map(extra => (
                        <option key={extra.id} value={extra.id}>
                          {extra.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* RESUMO FINANCEIRO */}
            <div className="lg:col-span-7">
               <div className="bg-pink-soft/30 dark:bg-slate-800/80 rounded-3xl p-6 shadow-sm border border-pink/20 dark:border-slate-700 h-full backdrop-blur-sm">
                  <div className="flex items-center gap-3 border-b border-pink/10 dark:border-slate-700 pb-4 mb-6">
                    <div className="p-2 bg-pink dark:bg-pink-500 rounded-xl text-white shadow-soft">
                      <Package size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-brown dark:text-white">Relatório de Kit</h2>
                  </div>
                
                  {summaryItems}
               </div>
            </div>
          </div>
        </div>
      );
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-pink/10 dark:border-slate-700 space-y-6 text-center">
            <div className="w-16 h-16 bg-pink-soft dark:bg-pink-500/10 rounded-full flex items-center justify-center mx-auto text-pink mb-4">
              <Calculator size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Simulador de Kit</h2>
            <div className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-black text-brown dark:text-slate-200 mb-2 uppercase tracking-widest">Selecione uma Receita</label>
                <select 
                  value={selectedRecipeId}
                  onChange={(e) => setSelectedRecipeId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink dark:text-white font-bold text-slate-700"
                >
                  <option value="">-- Selecione --</option>
                  {recipes.map(recipe => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-sm text-slate-400 text-center">Comece selecionando uma receita para montar seu kit personalizado.</p>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-7">
          <div className="bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center h-full">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm mb-4">
              <Package size={40} className="text-slate-300" />
            </div>
            <h3 className="text-slate-400 dark:text-slate-500 font-bold">Resumo Financeiro Bloqueado</h3>
            <p className="text-xs text-slate-400 dark:text-slate-600 max-w-xs mt-2">Os cálculos aparecerão aqui assim que você selecionar uma receita e definir os itens do kit.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
