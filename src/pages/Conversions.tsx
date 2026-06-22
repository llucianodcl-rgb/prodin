import { useState, useEffect } from "react";
import { ArrowRight, Calculator, Info, RefreshCw, Scale, Utensils, History, TrendingUp, PackageSearch, PlusCircle, BookPlus } from "lucide-react";
import { useStore } from "../store/useStore";
import { formatNumber } from "../lib/utils";
import { STANDARD_UNITS, getIngredientDensity, VOLUME_TO_ML, WEIGHT_TO_G } from "../lib/conversions";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { RecipeIngredient } from "../types";

interface ConversionHistoryItem {
  id: string;
  timestamp: number;
  ingredientName: string;
  value: number;
  sourceUnit: string;
  result: number;
  targetUnit: string;
}

export default function Conversions() {
  const navigate = useNavigate();
  const { ingredients, recipeDrafts, lastActiveRecipeDraftId, setRecipeDraft, addToast, conversionDraft, setConversionDraft } = useStore();
  
  const [selectedIngredientId, setSelectedIngredientId] = useState<string>(conversionDraft?.selectedIngredientId || "");
  const [inputValue, setInputValue] = useState<string>(conversionDraft?.inputValue || "1");
  const [sourceUnit, setSourceUnit] = useState<string>(conversionDraft?.sourceUnit || "xicara");
  const [targetUnit, setTargetUnit] = useState<string>(conversionDraft?.targetUnit || "g");
  const [history, setHistory] = useState<ConversionHistoryItem[]>([]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("prodin_conversion_history");
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  // Sync draft to store
  useEffect(() => {
    setConversionDraft({
      selectedIngredientId,
      inputValue,
      sourceUnit,
      targetUnit
    });
  }, [selectedIngredientId, inputValue, sourceUnit, targetUnit, setConversionDraft]);

  const saveHistory = (newItem: ConversionHistoryItem) => {
    const updated = [newItem, ...history].slice(0, 5); // Keep last 5
    setHistory(updated);
    localStorage.setItem("prodin_conversion_history", JSON.stringify(updated));
  };

  // Find active draft using the last touched draft ID
  const activeDraftId = lastActiveRecipeDraftId && recipeDrafts[lastActiveRecipeDraftId] ? lastActiveRecipeDraftId : null;
  const activeDraft = activeDraftId ? recipeDrafts[activeDraftId] : null;

  const handleAddToRecipe = () => {
    if (!selectedIngredient || isNaN(parsedValue)) return;
    
    // Determine the unit. Conversion tool target unit usually is the one the user wants.
    // However, recipes in Prodin usually use g/ml.
    // If targetUnit is "unidade", we use "un".
    const unitToUse = targetUnit === 'unidade' ? 'un' : targetUnit;
    
    if (activeDraftId) {
      // Add to existing draft
      const newIngredient: RecipeIngredient = {
        id: uuidv4(),
        ingredientId: selectedIngredient.id,
        quantityUsed: convertedResult,
        unit: unitToUse as any
      };
      
      const updatedDraft = {
        ...activeDraft,
        formData: {
          ...activeDraft.formData,
          ingredients: [...(activeDraft.formData.ingredients || []), newIngredient]
        }
      };
      
      setRecipeDraft(activeDraftId, updatedDraft);
      addToast({
        message: `Adicionado à receita "${activeDraft.formData.name || 'em rascunho'}"`,
        type: "success"
      });
      
      if (activeDraftId === 'nova') {
        navigate('/receitas/nova');
      } else {
        navigate(`/receitas/${activeDraftId}/editar`);
      }
    } else {
      // Create new draft
      const newId = 'nova';
      const newIngredient: RecipeIngredient = {
        id: uuidv4(),
        ingredientId: selectedIngredient.id,
        quantityUsed: convertedResult,
        unit: unitToUse as any
      };
      
      const newDraft = {
        formData: {
          name: "",
          category: "",
          description: "",
          ingredients: [newIngredient],
          extraCosts: [],
          finalWeight: 0,
          weightPerUnit: 0,
          profitMultiplier: 3,
          targetPricePerUnit: 0,
        },
        selectIngId: "",
        selectIngQty: "",
        selectIngUnit: "un"
      };
      
      setRecipeDraft(newId, newDraft);
      addToast({
        message: "Nova receita iniciada com este ingrediente",
        type: "success"
      });
      navigate('/receitas/nova');
    }
  };

  const getUnitName = (id: string) => {
    return STANDARD_UNITS.find(u => u.id === id)?.name || id;
  };
  
  const getShortUnit = (id: string) => {
    switch (id) {
      case 'xicara': return 'xícara(s)';
      case 'colher_sopa': return 'colher(es) de sopa';
      case 'colher_cha': return 'colher(es) de chá';
      case 'copo_americano': return 'copo(s) americano(s)';
      case 'unidade': return 'unidade(s)';
      default: return id;
    }
  };

  const selectedIngredient = ingredients.find(i => i.id === selectedIngredientId);

  // Conversion logic
  let convertedResult = 0;
  let calculationError = "";

  const parsedValue = parseFloat(inputValue.replace(',', '.'));

  if (selectedIngredient && !isNaN(parsedValue)) {
    const density = getIngredientDensity(selectedIngredient.name);
    let valueInMl = 0;
    let valueInG = 0;

    // 1. Convert to base metric (g or ml)
    if (sourceUnit === 'unidade') {
      const regQty = selectedIngredient.quantityBought || 1;
      const regUnit = selectedIngredient.unit || 'g';
      const totalAmount = parsedValue * regQty;
      
      if (regUnit === 'g' || regUnit === 'kg') {
        valueInG = totalAmount * (WEIGHT_TO_G[regUnit] || 1);
        valueInMl = valueInG / density;
      } else if (regUnit === 'ml' || regUnit === 'l') {
        valueInMl = totalAmount * (VOLUME_TO_ML[regUnit] || 1);
        valueInG = valueInMl * density;
      } else {
        valueInG = totalAmount;
        valueInMl = valueInG / density;
      }
    } else if (VOLUME_TO_ML[sourceUnit]) {
      valueInMl = parsedValue * VOLUME_TO_ML[sourceUnit];
      valueInG = valueInMl * density;
    } else if (WEIGHT_TO_G[sourceUnit]) {
      valueInG = parsedValue * WEIGHT_TO_G[sourceUnit];
      valueInMl = valueInG / density;
    }

    // 2. Convert from base metric to Target Unit
    if (targetUnit === 'unidade') {
      const regQty = selectedIngredient.quantityBought || 1;
      const regUnit = selectedIngredient.unit || 'g';
      let targetG = regQty;
      let targetMl = regQty;

      if (regUnit === 'g' || regUnit === 'kg') {
        targetG = regQty * (WEIGHT_TO_G[regUnit] || 1);
        convertedResult = valueInG / targetG;
      } else if (regUnit === 'ml' || regUnit === 'l') {
        targetMl = regQty * (VOLUME_TO_ML[regUnit] || 1);
        convertedResult = valueInMl / targetMl;
      } else {
        convertedResult = parsedValue / regQty;
      }
    } else if (VOLUME_TO_ML[targetUnit]) {
      convertedResult = valueInMl / VOLUME_TO_ML[targetUnit];
    } else if (WEIGHT_TO_G[targetUnit]) {
      convertedResult = valueInG / WEIGHT_TO_G[targetUnit];
    }
  }

  const handleConvert = () => {
    if (!selectedIngredient || isNaN(parsedValue)) return;
    saveHistory({
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      ingredientName: selectedIngredient.name,
      value: parsedValue,
      sourceUnit,
      result: convertedResult,
      targetUnit
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-3">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="bg-pink-100 dark:bg-pink-500/20 p-2.5 rounded-xl">
            <RefreshCw className="text-pink w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Conversões</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Converta medidas culinárias e planeje suas compras.</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* MAIN CONVERTER SECTION */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
              <Calculator size={18} className="text-pink" /> Selecionar Medidas
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                  Ingrediente
                </label>
                <select 
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-pink/50 transition-all"
                  value={selectedIngredientId}
                  onChange={(e) => setSelectedIngredientId(e.target.value)}
                >
                  <option value="">Selecione um ingrediente cadastrado...</option>
                  {ingredients.slice().sort((a,b) => a.name.localeCompare(b.name)).map(ing => (
                    <option key={ing.id} value={ing.id}>{ing.name}</option>
                  ))}
                </select>
                {selectedIngredient && selectedIngredient.quantityBought && selectedIngredient.unit && (
                  <p className="text-[10px] sm:text-xs text-indigo-500 font-bold mt-2 bg-indigo-50 dark:bg-indigo-500/10 inline-block px-3 py-1 rounded-lg">
                    {selectedIngredient.name} cadastrado como: {selectedIngredient.quantityBought} {selectedIngredient.unit}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                    Valor Original
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      inputMode="decimal"
                      className="w-24 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-black text-slate-700 dark:text-slate-200 text-center focus:outline-none focus:ring-2 focus:ring-pink/50 transition-all font-mono"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                    />
                    <select 
                      className="flex-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-pink/50 transition-all"
                      value={sourceUnit}
                      onChange={(e) => setSourceUnit(e.target.value)}
                    >
                      {STANDARD_UNITS.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                    Converter Para
                  </label>
                  <select 
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-pink/50 transition-all"
                    value={targetUnit}
                    onChange={(e) => setTargetUnit(e.target.value)}
                  >
                    {STANDARD_UNITS.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!selectedIngredient ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 text-center border border-slate-200 dark:border-slate-800">
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Selecione um ingrediente para ver o resultado.</p>
                </div>
              ) : isNaN(parsedValue) ? (
                <div className="p-4 rounded-2xl bg-pink-50 dark:bg-pink-900/10 text-center border border-pink-100 dark:border-pink-900/20">
                  <p className="text-pink-600 dark:text-pink-400 font-medium text-sm">Digite um valor numérico válido.</p>
                </div>
              ) : (
                <div className="relative mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center mb-4">Resultado da Conversão</h3>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-4">
                    <div className="text-center bg-slate-50 dark:bg-slate-800/50 py-4 px-6 rounded-2xl border border-slate-200 dark:border-slate-700 min-w-[140px]">
                      <span className="block text-2xl font-black text-slate-800 dark:text-white font-mono">{formatNumber(parsedValue)}</span>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">{getShortUnit(sourceUnit)}</span>
                    </div>
                    
                    <div className="text-slate-300 dark:text-slate-600">
                      <ArrowRight size={24} className="rotate-90 sm:rotate-0" />
                    </div>

                    <div className="text-center bg-mint-50 dark:bg-mint-500/10 py-5 px-8 rounded-2xl border border-mint/20 min-w-[160px] shadow-sm">
                      <span className="block text-3xl font-black text-mint-600 dark:text-mint-400 font-mono tracking-tight">{formatNumber(convertedResult)}</span>
                      <span className="text-xs font-bold text-mint-700 dark:text-mint-300 mt-1 uppercase tracking-widest">{getShortUnit(targetUnit)}</span>
                    </div>
                  </div>

                  {targetUnit === 'unidade' && convertedResult > 0 && (
                    <div className="mt-6 flex gap-3 p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                      <PackageSearch className="text-indigo-500 shrink-0 mt-0.5" size={20} />
                      <div>
                        <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200 mb-1">
                          Sugestão de Compra
                        </p>
                        <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed font-medium">
                          Você precisa de {formatNumber(convertedResult)} unidades de {selectedIngredient.quantityBought}{selectedIngredient.unit}. Recomenda-se comprar <span className="font-black bg-indigo-200/50 dark:bg-indigo-800/30 px-2 py-0.5 rounded text-indigo-800 dark:text-indigo-100">{Math.ceil(convertedResult)} unidades</span>.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-center mt-6 gap-3">
                    <button 
                      onClick={handleConvert}
                      className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                      <History size={16} /> Salvar Histórico
                    </button>
                    
                    <button 
                      onClick={handleAddToRecipe}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                      {activeDraftId ? (
                        <>
                          <PlusCircle size={16} /> Adicionar à Receita Atual
                        </>
                      ) : (
                        <>
                          <BookPlus size={16} /> Criar Nova Receita
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TABELA DE MEDIDAS (Mobile mostly, mas visível) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
             <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Utensils size={18} className="text-brown" /> Referência Rápida
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-100 dark:border-amber-500/20">
                <span className="block text/[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-1">1 Colher Chá</span>
                <span className="text-sm font-black text-amber-900 dark:text-amber-200">5 ml</span>
              </div>
              <div className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-100 dark:border-amber-500/20">
                <span className="block text/[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-1">1 Colher Sopa</span>
                <span className="text-sm font-black text-amber-900 dark:text-amber-200">15 ml</span>
              </div>
              <div className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-100 dark:border-amber-500/20">
                <span className="block text/[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-1">1 Xícara</span>
                <span className="text-sm font-black text-amber-900 dark:text-amber-200">240 ml</span>
              </div>
              <div className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-100 dark:border-amber-500/20">
                <span className="block text/[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-1">1 Copo Amer.</span>
                <span className="text-sm font-black text-amber-900 dark:text-amber-200">200 ml</span>
              </div>
              <div className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-100 dark:border-amber-500/20">
                <span className="block text/[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-1">1 Litro</span>
                <span className="text-sm font-black text-amber-900 dark:text-amber-200">1000 ml</span>
              </div>
              <div className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-100 dark:border-amber-500/20">
                <span className="block text/[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-1">1 Kg</span>
                <span className="text-sm font-black text-amber-900 dark:text-amber-200">1000 g</span>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Info size={14} className="text-slate-400 mt-0.5 shrink-0" />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Volumes baseados no padrão brasileiro. Variam conforme densidade do ingrediente (ex: 1 xícara de açúcar ≠ 1 xícara de farinha).</p>
            </div>
          </div>
        </div>

        {/* SIDE BAR (History & Features) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <History size={18} className="text-blue-500" /> Últimas Conversões
            </h2>
            
            <div className="space-y-3">
              {history.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium text-center py-6 bg-white dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                  Nenhuma conversão recente.
                </p>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 truncate">
                      {item.ingredientName}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {formatNumber(item.value)} <span className="text-xs font-semibold">{getShortUnit(item.sourceUnit)}</span>
                      </span>
                      <ArrowRight size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />
                      <span className="font-black text-mint-600 dark:text-mint-400 bg-mint-50 dark:bg-mint-500/10 px-2 py-0.5 rounded-lg border border-mint/20">
                        {formatNumber(item.result)} <span className="text-xs">{getShortUnit(item.targetUnit)}</span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
