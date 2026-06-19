import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { Recipe, RecipeIngredient, ExtraCost, Unit } from "../types";
import { formatCurrency, getIngredientUnitCost, getSuggestedUnitPrice, getActualMetrics, getBaseQuantity } from "../lib/utils";
import { v4 as uuidv4 } from "uuid";
import { ArrowLeft, Plus, Trash2, Save, Calculator, AlertTriangle, CheckCircle } from "lucide-react";
import { CurrencyInput } from "../components/ui/CurrencyInput";

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
      finalWeight: 0,
      weightPerUnit: 0,
      extraCosts: [],
      profitMultiplier: 3,
      targetPricePerUnit: 0,
    };
  });

  const [selectIngId, setSelectIngId] = useState(draft?.selectIngId || "");
  const [selectIngQty, setSelectIngQty] = useState(draft?.selectIngQty || "");
  const [selectIngUnit, setSelectIngUnit] = useState<Unit>(draft?.selectIngUnit || "un");

  const [extraName, setExtraName] = useState(draft?.extraName || "");
  const [extraValue, setExtraValue] = useState<number | ''>(draft?.extraValue || '');

  const [saveStatus, setSaveStatus] = useState('');

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
          selectIngUnit,
          extraName,
          extraValue
        });
        setSaveStatus('Rascunho salvo');
        setTimeout(() => { if (isMounted) setSaveStatus('') }, 2000);
      }
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [formData, selectIngId, selectIngQty, selectIngUnit, extraName, extraValue, draftKey, setRecipeDraft]);

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
    setFormData(prev => ({
      ...prev,
      ingredients: (prev.ingredients || []).filter(ri => ri.id !== riId)
    }));
  };

  const handleAddExtraCost = () => {
    if (!extraName || !extraValue) return;
    const newEc: ExtraCost = {
      id: uuidv4(),
      name: extraName,
      value: Number(extraValue)
    };
    setFormData(prev => ({
      ...prev,
      extraCosts: [...(prev.extraCosts || []), newEc]
    }));
    setExtraName("");
    setExtraValue("");
  };

  const handleRemoveExtraCost = (ecId: string) => {
    setFormData(prev => ({
      ...prev,
      extraCosts: (prev.extraCosts || []).filter(ec => ec.id !== ecId)
    }));
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
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
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

       <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Section 1: Basic Info */}
          <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
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
          <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
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
                         <button 
                           type="button" 
                           onClick={() => handleRemoveIngredient(ri.id)}
                           className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                         >
                           <Trash2 size={18} />
                         </button>
                       </li>
                     )
                   })}
                 </ul>
               )}
             </div>
          </section>

          {/* Section 3: Yield */}
          <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
             <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Rendimento e Porções</h2>
             <div className="grid sm:grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Peso Final da Produção (g/ml)*</label>
                 <div className="relative">
                   <input 
                     required
                     type="number" 
                     min="1"
                     value={formData.finalWeight || ''} 
                     onChange={e => setFormData({...formData, finalWeight: Number(e.target.value), isManualWeight: true})}
                     className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                     placeholder="Ex: 500 para 500g"
                   />
                   {formData.isManualWeight && (
                     <button
                       type="button"
                       onClick={() => setFormData(prev => ({...prev, isManualWeight: false, finalWeight: calculateAutoWeight()}))}
                       className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-1 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                     >
                       Restaurar calc. automático
                     </button>
                   )}
                 </div>
                 <p className="text-xs text-slate-500 mt-1">Soma total da massa rendida{formData.isManualWeight ? " (Ajuste manual)" : " (Automático)"}.</p>
               </div>
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
             </div>
             {(formData.finalWeight && formData.weightPerUnit) ? (
               <div className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 p-4 rounded-xl text-center">
                 Esta receita produzirá aproximadamente <strong className="text-xl">{Math.floor(formData.finalWeight / formData.weightPerUnit)}</strong> unidades.
                 <p className="text-sm mt-1 opacity-80">
                   Custo base estimado: {formatCurrency(getActualMetrics({...formData, profitMultiplier: formData.profitMultiplier || 1, targetPricePerUnit: formData.targetPricePerUnit || 0} as Recipe, ingredients).costPerUnit)} / unidade
                 </p>
               </div>
             ) : null}
          </section>

          {/* Section 4: Extra Costs */}
          <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
             <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Custos Extras</h2>
             
             <div className="flex flex-col sm:flex-row gap-2 items-end">
               <div className="flex-1 w-full">
                 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Descrição</label>
                 <input 
                   type="text"
                   value={extraName}
                   onChange={e => setExtraName(capitalize(e.target.value))}
                   className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                   placeholder="Ex: Embalagem, Energia, Taxa Cartão"
                 />
               </div>
               <div className="w-full sm:w-32">
                 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Valor (R$)</label>
                 <CurrencyInput 
                   value={extraValue === '' ? 0 : extraValue}
                   onChangeValue={value => setExtraValue(value)}
                   className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                 />
               </div>
               <button 
                 type="button"
                 onClick={handleAddExtraCost}
                 disabled={!extraName || !extraValue}
                 className="w-full sm:w-auto mt-2 sm:mt-0 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors font-medium flex items-center justify-center disabled:opacity-50"
               >
                 <Plus size={20} />
               </button>
             </div>

             <div>
               <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                 {(formData.extraCosts || []).map(ec => (
                   <li key={ec.id} className="py-2 flex justify-between items-center group">
                     <div>
                       <span className="font-medium text-slate-900 dark:text-white">{ec.name}</span>
                       <span className="ml-2 text-sm text-slate-500">{formatCurrency(ec.value)}</span>
                     </div>
                     <button 
                       type="button" 
                       onClick={() => handleRemoveExtraCost(ec.id)}
                       className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                     >
                       <Trash2 size={16} />
                     </button>
                   </li>
                 ))}
               </ul>
             </div>
          </section>

          {/* Section 5: Pricing */}
          <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
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
                         <li>• Multiplicador: <strong>{metrics.actualMultiplier.toFixed(2)}x</strong></li>
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
  )
}
