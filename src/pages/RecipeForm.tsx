import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { Recipe, RecipeIngredient, Unit } from "../types";
import { formatCurrency, getIngredientUnitCost, getSuggestedUnitPrice, getActualMetrics, getBaseQuantity } from "../lib/utils";
import { v4 as uuidv4 } from "uuid";
import { ArrowLeft, Plus, Trash2, Save, Calculator, AlertTriangle, CheckCircle, Edit2, Copy, Package, ChevronDown, ChevronUp } from "lucide-react";
import { CurrencyInput } from "../components/ui/CurrencyInput";
import { formatNumber, formatIngredientQuantity } from "../lib/utils";

export default function RecipeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { recipes, ingredients, extras, addRecipe, updateRecipe, deleteRecipe, addToast, recipeDrafts, setRecipeDraft, clearRecipeDraft } = useStore();
  
  const allAvailableItems = [...ingredients, ...extras];
  
  const capitalize = (val: string) => {
    if (!val) return val;
    return val.charAt(0).toUpperCase() + val.slice(1);
  };
  
  const recipeCategories = Array.from(new Set(recipes.map(r => r.category).filter(Boolean)));
  
  const draftKey = id || 'nova';
  const draft = recipeDrafts[draftKey];

  const isEditing = !!id;
  const existingRecipe = recipes.find(r => r.id === id);

  const [formData, setFormData] = useState<Partial<Recipe>>(() => {
    if (draft?.formData) return draft.formData;
    if (isEditing && existingRecipe) return existingRecipe;
    return {
      name: "",
      category: "",
      description: "",
      ingredients: [],
      extraCosts: [],
      finalWeight: 0,
      weightPerUnit: 0,
      profitMultiplier: 3,
      targetPricePerUnit: 0,
    };
  });

  const [selectIngId, setSelectIngId] = useState(draft?.selectIngId || "");
  const [selectIngQty, setSelectIngQty] = useState(draft?.selectIngQty || "");
  const [selectIngUnit, setSelectIngUnit] = useState<Unit>(draft?.selectIngUnit || "un");

  const [saveStatus, setSaveStatus] = useState('');
  const [calcMode, setCalcMode] = useState<'produced' | 'unitWeight'>('produced');
  const [targetQty, setTargetQty] = useState<number>(0);
  const [showComplementary, setShowComplementary] = useState(false);

  const calcularReforcoProducao = (
    finalWeight: number,
    recipeIngredients: RecipeIngredient[],
    weightDeficit: number
  ) => {
    if (finalWeight <= 0 || weightDeficit <= 0) return [];
    const fatorDeEscala = weightDeficit / finalWeight;

    return recipeIngredients.map(item => {
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

  // Auto-save effect
  useEffect(() => {
    let isMounted = true;
    setSaveStatus('Salvando...');
    
    const timer = setTimeout(() => {
      if (isMounted) {
        setRecipeDraft(draftKey, {
          formData,
          selectIngId,
          selectIngQty,
          selectIngUnit
        });
        setSaveStatus('Rascunho salvo');
        setTimeout(() => { if (isMounted) setSaveStatus('') }, 2000);
      }
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [formData, selectIngId, selectIngQty, selectIngUnit, draftKey, setRecipeDraft]);

  const calculateAutoWeight = () => {
    return (formData.ingredients || []).reduce((sum, ri) => {
      const ing = allAvailableItems.find(i => i.id === ri.ingredientId);
      if (!ing) return sum;
      const unit = ri.unit || ing.unit;
      
      if (unit === 'un' && ing.weightPerUn && ing.weightPerUn > 0) {
        const weightBase = getBaseQuantity(ing.weightPerUn, ing.weightPerUnUnit || 'g');
        return sum + (ri.quantityUsed * weightBase);
      }
      
      const baseQty = getBaseQuantity(ri.quantityUsed, unit);
      return sum + (['g', 'kg', 'ml', 'l'].includes(unit) ? baseQty : 0);
    }, 0);
  };

  // Recalculate automatic weight only when ingredients change and if not manually overridden
  useEffect(() => {
    if (!formData.isManualWeight) {
      setFormData(prev => ({ ...prev, finalWeight: calculateAutoWeight() }));
    }
  }, [formData.ingredients, formData.isManualWeight]);

  const handleAddIngredient = () => {
    if (!selectIngId || !selectIngQty) return;
    const ing = allAvailableItems.find(i => i.id === selectIngId);
    if (!ing) return;

    const newRi: RecipeIngredient = {
      id: uuidv4(),
      ingredientId: selectIngId,
      quantityUsed: Number(selectIngQty),
      unit: selectIngUnit
    };

    setFormData(prev => ({
      ...prev,
      ingredients: [...(prev.ingredients || []), newRi]
    }));
    setSelectIngId("");
    setSelectIngQty("");
  };

  const handleRemoveIngredient = (riId: string) => {
    if (window.confirm("Deseja remover este ingrediente da receita?")) {
      setFormData(prev => ({
        ...prev,
        ingredients: (prev.ingredients || []).filter(ri => ri.id !== riId)
      }));
    }
  };

  const handleEditIngredient = (riId: string) => {
    const ingredientToRestore = (selectIngId && selectIngQty) ? {
      id: uuidv4(),
      ingredientId: selectIngId,
      quantityUsed: Number(selectIngQty),
      unit: selectIngUnit
    } : null;

    const ri = formData.ingredients?.find(i => i.id === riId);
    if (!ri) return;

    setSelectIngId(ri.ingredientId);
    setSelectIngQty(ri.quantityUsed.toString());
    setSelectIngUnit(ri.unit || "un");

    setFormData(prev => {
      const newList = (prev.ingredients || []).filter(i => i.id !== riId);
      if (ingredientToRestore) {
        newList.push(ingredientToRestore);
      }
      return { ...prev, ingredients: newList };
    });
  };

  const handleDuplicateIngredient = (riId: string) => {
    const ri = formData.ingredients.find(i => i.id === riId);
    if (ri) {
      const newRi = { ...ri, id: uuidv4() };
      setFormData(prev => ({
        ...prev,
        ingredients: [...prev.ingredients, newRi]
      }));
    }
  };

  const handleSuggestPrice = () => {
     // Create a temporary recipe object to calculate suggested price
     const tempRecipe = { ...formData } as Recipe;
     const suggested = getSuggestedUnitPrice(tempRecipe, allAvailableItems);
     setFormData(prev => ({ ...prev, targetPricePerUnit: suggested }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearRecipeDraft(draftKey);
    if (isEditing && existingRecipe) {
      updateRecipe(id, formData);
      addToast({
        message: "Receita atualizada com sucesso!",
        type: "success",
        onUndo: () => updateRecipe(id, existingRecipe)
      });
      navigate(`/receitas/${id}`);
    } else {
      const newId = uuidv4();
      const newRecipe = {
        ...formData,
        id: newId,
        createdAt: new Date().toISOString()
      } as Recipe;
      addRecipe(newRecipe);
      addToast({
        message: "Nova receita criada!",
        type: "success",
        onUndo: () => deleteRecipe(newId)
      });
      navigate(`/receitas/${newId}`);
    }
  };

  return (
    <div className="space-y-3 max-w-4xl mx-auto pb-20">
       <header className="flex items-center space-x-4">
          <button onClick={() => navigate('/receitas')} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isEditing ? 'Editar Receita' : 'Nova Receita'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">Preencha os dados e ingredientes da receita.</p>
          </div>
          {saveStatus && <span className="text-sm font-medium text-slate-500 animate-pulse">{saveStatus}</span>}
       </header>

       <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Section 1: Basic Info */}
          <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-3">
             <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Informações Básicas</h2>
             <div className="grid sm:grid-cols-2 gap-4">
               <div className="sm:col-span-2">
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da Receita</label>
                 <input 
                   required
                   type="text" 
                   value={formData.name || ''} 
                   onChange={e => setFormData({...formData, name: capitalize(e.target.value)})}
                   className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                   placeholder="Ex: Bolo de Chocolate com Morango"
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                 <input 
                   type="text" 
                   list="recipe-categories-list"
                   value={formData.category || ''} 
                   onChange={e => setFormData({...formData, category: capitalize(e.target.value)})}
                   className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                   placeholder="Ex: Bolos, Doces Finos..."
                 />
                 <datalist id="recipe-categories-list">
                   {recipeCategories.map(cat => (
                     <option key={cat} value={cat} />
                   ))}
                 </datalist>
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                 <input 
                   type="text" 
                   value={formData.description || ''} 
                   onChange={e => setFormData({...formData, description: capitalize(e.target.value)})}
                   className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                   placeholder="Opcional"
                 />
               </div>
             </div>
          </section>

          {/* Section 2: Ingredients */}
          <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-3">
             <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Ingredientes Utilizados</h2>
             
             <div className="flex flex-col sm:flex-row gap-2 items-end bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
               <div className="flex-1 w-full">
                 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Ingrediente</label>
                 <select 
                   value={selectIngId}
                   onChange={e => {
                     setSelectIngId(e.target.value);
                     const ing = ingredients.find(i => i.id === e.target.value);
                     if (ing) setSelectIngUnit(ing.unit);
                   }}
                   className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                 >
                   <option value="">Selecione...</option>
                   {ingredients.map(ing => (
                     <option key={ing.id} value={ing.id}>{ing.name}</option>
                   ))}
                 </select>
               </div>
               <div className="w-full sm:w-24">
                 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Qtd</label>
                 <input 
                   type="number" 
                   step="any"
                   min="0.01"
                   value={selectIngQty}
                   onChange={e => setSelectIngQty(e.target.value)}
                   className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                 />
               </div>
               <div className="w-full sm:w-24">
                 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Unidade</label>
                 <select 
                   value={selectIngUnit}
                   onChange={e => setSelectIngUnit(e.target.value as Unit)}
                   className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                 >
                   <option value="g">g</option>
                   <option value="kg">kg</option>
                   <option value="ml">ml</option>
                   <option value="l">l</option>
                   <option value="un">un</option>
                 </select>
               </div>
               <button 
                 type="button"
                 onClick={handleAddIngredient}
                 disabled={!selectIngId || !selectIngQty}
                 className="w-full sm:w-auto mt-2 sm:mt-0 px-4 py-2 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-500/20 dark:hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 rounded-lg transition-colors font-medium flex items-center justify-center disabled:opacity-50"
               >
                 <Plus size={20} />
               </button>
             </div>

             <div className="mt-4">
               {(!formData.ingredients || formData.ingredients.length === 0) ? (
                 <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Nenhum ingrediente adicionado ainda.</p>
               ) : (
                 <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                   {formData.ingredients.map(ri => {
                     const ing = ingredients.find(i => i.id === ri.ingredientId);
                     return (
                       <li key={ri.id} className="py-3 flex justify-between items-center group">
                         <div>
                           <p className="font-medium text-slate-900 dark:text-white">{ing?.name || 'Ingrediente removido'}</p>
                           <div className="flex items-center gap-2">
                             <p className="text-sm text-slate-500 dark:text-slate-400">{ri.quantityUsed} {ri.unit}</p>
                             {ri.unit === 'un' && ing.weightPerUn && ing.weightPerUn > 0 && (
                               <p className="text-xs text-indigo-500 font-medium whitespace-nowrap">
                                 (= {(ri.quantityUsed * ing.weightPerUn).toFixed(2)}{ing.weightPerUnUnit})
                               </p>
                             )}
                           </div>
                         </div>
                         <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                           <button 
                             type="button" 
                             onClick={() => handleEditIngredient(ri.id)}
                             className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                             title="Editar"
                           >
                             <Edit2 size={18} />
                           </button>
                           <button 
                             type="button" 
                             onClick={() => handleDuplicateIngredient(ri.id)}
                             className="p-2 text-slate-400 hover:text-green-600 transition-colors"
                             title="Duplicar"
                           >
                             <Copy size={18} />
                           </button>
                           <button 
                             type="button" 
                             onClick={() => handleRemoveIngredient(ri.id)}
                             className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                             title="Excluir"
                           >
                             <Trash2 size={18} />
                           </button>
                         </div>
                       </li>
                     )
                   })}
                 </ul>
               )}
             </div>
          </section>

          {/* Section 3: Yield */}
          <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2 gap-4">
               <h2 className="text-xl font-bold text-slate-900 dark:text-white">Rendimento e Porções</h2>
               
               <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-fit">
                 <button
                   type="button"
                   onClick={() => setCalcMode('produced')}
                   className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                     calcMode === 'produced' 
                       ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-sm" 
                       : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                   }`}
                 >
                   Qtd. Produzida
                 </button>
                 <button
                   type="button"
                   onClick={() => setCalcMode('unitWeight')}
                   className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                     calcMode === 'unitWeight' 
                       ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-sm" 
                       : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                   }`}
                 >
                   Peso Unitário
                 </button>
               </div>
             </div>

             <div className="grid sm:grid-cols-2 gap-4 pt-2">
               <div>
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Peso Final da Produção (g/ml)*</label>
                 <div className="relative">
                   <input 
                     required
                     type="number" 
                     min="1"
                     value={formData.finalWeight || ''} 
                     onChange={e => {
                       const val = Number(e.target.value);
                       setFormData({...formData, finalWeight: val, isManualWeight: true});
                       if (calcMode === 'unitWeight' && targetQty > 0) {
                         setFormData(prev => ({...prev, finalWeight: val, weightPerUnit: Math.round(val / targetQty)}));
                       }
                     }}
                     className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                     placeholder="Ex: 500 para 500g"
                   />
                   {formData.isManualWeight && (
                     <button
                       type="button"
                       onClick={() => {
                         const autoW = calculateAutoWeight();
                         setFormData(prev => ({...prev, isManualWeight: false, finalWeight: autoW}));
                         if (calcMode === 'unitWeight' && targetQty > 0) {
                           setFormData(prev => ({...prev, weightPerUnit: Math.round(autoW / targetQty)}));
                         }
                       }}
                       className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-1 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                     >
                       Restaurar calc. automático
                     </button>
                   )}
                 </div>
                 <p className="text-xs text-slate-500 mt-1">Soma total da massa rendida{formData.isManualWeight ? " (Ajuste manual)" : " (Automático)"}.</p>
               </div>

               {calcMode === 'produced' ? (
                 <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Peso por Unidade (g/ml)*</label>
                   <input 
                     required
                     type="number" 
                     min="1"
                     value={formData.weightPerUnit || ''} 
                     onChange={e => setFormData({...formData, weightPerUnit: Number(e.target.value)})}
                     className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                     placeholder="Ex: 20 para brigadeiros de 20g"
                   />
                 </div>
               ) : (
                 <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quantidade Desejada (unidades)*</label>
                   <input 
                     required
                     type="number" 
                     min="1"
                     value={targetQty || ''} 
                     onChange={e => {
                       const qty = Number(e.target.value);
                       setTargetQty(qty);
                       if (formData.finalWeight && qty > 0) {
                         setFormData({...formData, weightPerUnit: Math.round(formData.finalWeight / qty)});
                       }
                     }}
                     className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold"
                     placeholder="Ex: 50 unidades"
                   />
                 </div>
               )}
             </div>

             {calcMode === 'unitWeight' && targetQty > 0 && formData.finalWeight && (
               <div className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-xl">
                 <Calculator size={14} />
                 <span>Peso estimado por unidade: <span className="text-sm font-black">{formData.weightPerUnit}g/ml</span></span>
               </div>
             )}

             {/* RESULTADO E VALIDAÇÕES */}
             {(formData.finalWeight && formData.weightPerUnit) ? (
               <div className="space-y-4">
                 <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl text-center border border-slate-200 dark:border-slate-800">
                   <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                     {calcMode === 'produced' ? "Capacidade da Receita" : "Rendimento Estimado"}
                   </p>
                   <div className="flex items-center justify-center gap-2">
                     <strong className="text-2xl font-black text-slate-800 dark:text-white">
                        {Math.floor(formData.finalWeight / formData.weightPerUnit)}
                     </strong>
                     <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">unidades</span>
                   </div>
                   <p className="text-xs mt-2 text-slate-400">
                     Custo base estimado: {formatCurrency(getActualMetrics({...formData, profitMultiplier: formData.profitMultiplier || 1, targetPricePerUnit: formData.targetPricePerUnit || 0} as Recipe, ingredients).costPerUnit)} / unidade
                   </p>
                 </div>

                 {/* PRODUÇÃO COMPLEMENTAR CARD */}
                 {((calcMode === 'produced' && (targetQty > 0 || formData.weightPerUnit > formData.finalWeight)) || (calcMode === 'unitWeight' && targetQty > 0)) && 
                  (Math.max(1, targetQty) * formData.weightPerUnit > formData.finalWeight) && (
                   <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                     <div className="flex items-start gap-4">
                       <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600 shrink-0">
                         <Package size={18} />
                       </div>
                       <div className="flex-1">
                         <h3 className="font-bold text-amber-800 dark:text-amber-200 text-[10px] uppercase tracking-widest mb-2">Produção Complementar</h3>
                         
                         <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                           <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-1.5">
                             <span>Quantidade excedente:</span>
                             <span className="font-bold text-amber-600">
                               {Math.max(1, targetQty) - Math.floor(formData.finalWeight / formData.weightPerUnit)} unidades
                             </span>
                           </div>
                           <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-1.5">
                             <span>Peso adicional necessário:</span>
                             <span className="font-bold text-amber-600">
                               {(Math.max(1, targetQty) * formData.weightPerUnit - formData.finalWeight).toLocaleString()} g/ml
                             </span>
                           </div>
                           <div className="flex justify-between items-center pt-1 mt-1 font-bold text-slate-800 dark:text-slate-200">
                             <span>Produção total necessária:</span>
                             <span className="bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded text-amber-800 dark:text-amber-200">
                               {(Math.max(1, targetQty) * formData.weightPerUnit).toLocaleString()} g/ml
                             </span>
                           </div>
                         </div>

                         {/* Ingredients Section - same as Sales.tsx style */}
                         <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            {!showComplementary ? (
                              <button 
                                type="button"
                                onClick={() => setShowComplementary(true)}
                                className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider transition-colors"
                              >
                                [ Mostrar Ingredientes Complementares ]
                              </button>
                            ) : (
                              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                  <ChevronDown size={14} /> Ingredientes para o adicional:
                                </p>
                                <ul className="space-y-1.5 mb-4">
                                  {calcularReforcoProducao(
                                    formData.finalWeight, 
                                    formData.ingredients as RecipeIngredient[], 
                                    Math.max(0, (Math.max(1, targetQty) * formData.weightPerUnit) - formData.finalWeight)
                                  ).map((item, idx) => (
                                    <li key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                      <span className="text-slate-700 dark:text-slate-300 font-medium">{item.name}</span>
                                      <span className="font-bold text-slate-900 dark:text-white px-2 py-0.5 bg-white dark:bg-slate-800 rounded shadow-sm text-[11px]">{item.display}</span>
                                    </li>
                                  ))}
                                </ul>
                                <button 
                                  type="button"
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
                   </div>
                 )}

                 {/* IF Mode is produced, show an optional target quantity field if not already in unitWeight mode */}
                 {calcMode === 'produced' && (
                    <div className="pt-2">
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Validar para Demanda Específica (Opcional)</label>
                       <input 
                         type="number" 
                         min="0"
                         value={targetQty || ''} 
                         onChange={e => setTargetQty(Number(e.target.value))}
                         className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                         placeholder="Ex: Você precisa de 100 unidades?"
                       />
                    </div>
                 )}
               </div>
             ) : null}
          </section>

          {/* Section 4: Pricing */}
          <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-3">
             <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Precificação Final</h2>
             
             <div className="grid sm:grid-cols-2 gap-6">
               <div>
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Multiplicador de Lucro Desejado</label>
                 <div className="flex gap-2">
                   {[2, 3, 4, 5].map(mult => (
                     <button
                       key={mult}
                       type="button"
                       onClick={() => setFormData(prev => ({ ...prev, profitMultiplier: mult }))}
                       className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                         formData.profitMultiplier === mult 
                           ? "bg-indigo-600 text-white" 
                           : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                       }`}
                     >
                       {mult}x
                     </button>
                   ))}
                   <input
                     type="number"
                     step="0.5"
                     min="1.1"
                     value={formData.profitMultiplier !== 2 && formData.profitMultiplier !== 3 && formData.profitMultiplier !== 4 && formData.profitMultiplier !== 5 ? (formData.profitMultiplier || '') : ''}
                     onChange={e => setFormData(prev => ({ ...prev, profitMultiplier: Number(e.target.value) || 2 }))}
                     placeholder="Outro"
                     className="w-20 px-2 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                   />
                 </div>
               </div>

               <div>
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Preço de Venda Definido (Por Unidade)</label>
                 <div className="flex gap-2">
                   <div className="relative flex-1">
                     <CurrencyInput 
                       required
                       value={formData.targetPricePerUnit || 0} 
                       onChangeValue={value => setFormData({...formData, targetPricePerUnit: value})}
                       className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold text-lg"
                     />
                   </div>
                   <button 
                     type="button"
                     onClick={handleSuggestPrice}
                     className="px-3 py-2 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors flex flex-col items-center justify-center text-xs font-medium"
                     title="Calcular preço usando o multiplicador"
                   >
                     <Calculator size={16} className="mb-0.5" />
                     Sugerir
                   </button>
                 </div>
               </div>
             </div>

             {/* Live Validation Logic */}
             {(() => {
               const targetMult = formData.profitMultiplier || 1;
               const tempRecipe = { ...formData, profitMultiplier: targetMult, targetPricePerUnit: formData.targetPricePerUnit || 0 } as Recipe;
               const metrics = getActualMetrics(tempRecipe, ingredients);

               if (!formData.targetPricePerUnit || formData.targetPricePerUnit <= 0) return null;

               if (metrics.isLoss) {
                 return (
                   <div className="mt-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
                     <div className="flex items-start gap-3">
                       <AlertTriangle className="text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0" size={20} />
                       <div>
                         <h3 className="font-bold text-rose-900 dark:text-rose-300">ATENÇÃO: O preço informado gera prejuízo.</h3>
                         <ul className="mt-2 text-sm text-rose-800 dark:text-rose-200 space-y-1">
                           <li>• Custo por unidade: <strong>{formatCurrency(metrics.costPerUnit)}</strong></li>
                           <li>• Valor perdido por unidade: <strong>{formatCurrency(Math.abs(metrics.netProfitUnit))}</strong></li>
                           <li>• Prejuízo total estimado: <strong>{formatCurrency(Math.abs(metrics.netProfitTotal))}</strong></li>
                           <li>• Preço mínimo para não ter prejuízo: <strong>{formatCurrency(metrics.costPerUnit)}</strong></li>
                         </ul>
                       </div>
                     </div>
                   </div>
                 );
               }

               if (!metrics.meetsTarget) {
                 return (
                   <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                     <div className="flex items-start gap-3">
                       <AlertTriangle className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" size={20} />
                       <div>
                         <h3 className="font-bold text-amber-900 dark:text-amber-300">O preço informado cobre os custos, porém não atinge o lucro desejado.</h3>
                         <ul className="mt-2 text-sm text-amber-800 dark:text-amber-200 space-y-1">
                           <li>• Multiplicador atual alcançado: <strong>{metrics.actualMultiplier.toFixed(2)}x</strong></li>
                           <li>• Multiplicador desejado: <strong>{targetMult}x</strong></li>
                           <li>• Preço recomendado para atingir a meta: <strong>{formatCurrency(getSuggestedUnitPrice(tempRecipe, ingredients))}</strong></li>
                         </ul>
                       </div>
                     </div>
                   </div>
                 );
               }

               return (
                 <div className="mt-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                   <div className="flex items-start gap-3">
                     <CheckCircle className="text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" size={20} />
                     <div>
                       <h3 className="font-bold text-emerald-900 dark:text-emerald-300">Excelente! O preço informado atinge a meta de lucro definida.</h3>
                       <ul className="mt-2 text-sm text-emerald-800 dark:text-emerald-200 flex flex-wrap gap-4">
                         <li>• Multiplicador alcançado: <strong>{metrics.actualMultiplier.toFixed(2)}x</strong></li>
                         <li>• Multiplicador desejado: <strong>{targetMult}x</strong></li>
                         <li>• Lucro unitário: <strong>{formatCurrency(metrics.netProfitUnit)}</strong></li>
                         <li>• Margem: <strong>{metrics.profitMargin.toFixed(1)}%</strong></li>
                       </ul>
                     </div>
                   </div>
                 </div>
               );
             })()}

          </section>

          <div className="pt-4 flex justify-end">
             <button 
               type="submit"
               className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-sm"
             >
               <Save size={20} />
               <span>{isEditing ? 'Salvar Alterações' : 'Salvar Receita'}</span>
             </button>
          </div>

       </form>
    </div>
  );
}
