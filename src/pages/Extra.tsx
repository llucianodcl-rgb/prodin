import React, { useState, useEffect } from "react";
import { useStore } from "../store/useStore";
import { Ingredient, Unit } from "../types";
import { formatCurrency, normalizeString } from "../lib/utils";
import { Plus, Search, Edit2, Trash2, X, Copy, AlertTriangle, CheckCircle, Calculator, ChevronRight, ChevronDown } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { cn } from "../lib/utils";
import { CurrencyInput } from "../components/ui/CurrencyInput";
import { useNavigate } from "react-router-dom";

export default function Extra() {
  const navigate = useNavigate();
  const { extras, addExtra, updateExtra, deleteExtra, duplicateExtra, addToast, ingredientDrafts, setIngredientDraft, clearIngredientDraft } = useStore();
  
  // Reusing ingredientDrafts for simplicity or could create extraDrafts
  const draftId = 'extra-modal';
  const draft = ingredientDrafts[draftId];

  const capitalize = (val: string) => {
    if (!val) return val;
    return val.charAt(0).toUpperCase() + val.slice(1);
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(draft?.isModalOpen || false);
  const [editingId, setEditingId] = useState<string | null>(draft?.editingId || null);
  const [showCategories, setShowCategories] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);

  const [formData, setFormData] = useState<Partial<Ingredient> & { totalWeight?: number }>(draft?.formData || {
    name: "",
    brand: "",
    category: "",
    quantityBought: 0,
    unit: 'un',
    pricePaid: 0,
    weightPerUn: undefined,
    weightPerUnUnit: 'g',
    notes: "",
    totalWeight: 0
  });

  const categories = Array.from(new Set(extras.map(i => i.category).filter(Boolean)));

  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);

  const handleEditCategory = (cat: string) => {
    setEditingCategory(cat);
    setNewCategoryName(cat);
  };

  const handleDeleteCategory = (cat: string) => {
    setDeletingCategory(cat);
  };

  const handleSaveCategoryUpdate = () => {
    if (!editingCategory || !newCategoryName.trim()) return;
    const oldCat = editingCategory;
    const newCat = newCategoryName.trim();
    
    extras.forEach(ex => {
      if (ex.category === oldCat) {
        updateExtra(ex.id, { category: newCat });
      }
    });

    addToast({
      message: `Categoria alterada de "${oldCat}" para "${newCat}"`,
      type: "success"
    });
    setEditingCategory(null);
  };

  const handleConfirmDeleteCategory = () => {
    if (!deletingCategory) return;
    const oldCat = deletingCategory;
    
    extras.forEach(ex => {
      if (ex.category === oldCat) {
        updateExtra(ex.id, { category: "" });
      }
    });

    addToast({
      message: `Categoria "${oldCat}" removida.`,
      type: "warning"
    });
    setDeletingCategory(null);
  };

  const [saveStatus, setSaveStatus] = useState('');

  // Auto-save draft effect
  useEffect(() => {
    let isMounted = true;
    if (isModalOpen) setSaveStatus('Salvando...');
    
    const timer = setTimeout(() => {
      if (isMounted) {
        setIngredientDraft(draftId, { isModalOpen, editingId, formData });
        if (isModalOpen) {
          setSaveStatus('Rascunho salvo');
          setTimeout(() => { if (isMounted) setSaveStatus('') }, 2000);
        }
      }
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isModalOpen, editingId, formData, setIngredientDraft, draftId]);

  const filteredExtras = extras
    .filter(i => {
      const search = normalizeString(searchTerm);
      const name = normalizeString(i.name);
      const brand = normalizeString(i.brand || "");
      const category = normalizeString(i.category);
      const price = i.pricePaid.toString();
      const qty = i.quantityBought.toString();

      return name.includes(search) || 
             brand.includes(search) || 
             category.includes(search) ||
             price.includes(search) ||
             qty.includes(search);
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleOpenModal = (extra?: Ingredient) => {
    if (extra) {
      setEditingId(extra.id);
      setFormData({
        ...extra,
        totalWeight: (extra.weightPerUn || 0) * (extra.quantityBought || 1)
      });
      setIsViewMode(true);
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        brand: "",
        category: "",
        quantityBought: 0,
        unit: 'un',
        pricePaid: 0,
        weightPerUn: undefined,
        weightPerUnUnit: 'g',
        notes: "",
        totalWeight: 0
      });
      setIsViewMode(false);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    clearIngredientDraft(draftId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const calculatedWeightPerUn = (formData.totalWeight || 0) / (formData.quantityBought || 1);
    
    const finalFormData = {
      ...formData,
      weightPerUn: calculatedWeightPerUn
    };
    delete (finalFormData as any).totalWeight;

    if (editingId) {
      const originalExtra = extras.find(i => i.id === editingId);
      if (originalExtra) {
        updateExtra(editingId, finalFormData as Ingredient);
        addToast({
          message: "Item Extra atualizado com sucesso!",
          type: "success",
          onUndo: () => updateExtra(editingId, originalExtra)
        });
      }
    } else {
      const newExtra = {
        ...finalFormData,
        id: uuidv4(),
        createdAt: new Date().toISOString()
      } as Ingredient;
      addExtra(newExtra);
      addToast({
        message: "Item Extra criado!",
        type: "success",
        onUndo: () => deleteExtra(newExtra.id)
      });
    }
    setIsModalOpen(false);
    clearIngredientDraft(draftId);
  };

  useEffect(() => {
    const handleOpenNew = () => handleOpenModal();
    window.addEventListener('openNewExtraModal', handleOpenNew);
    return () => window.removeEventListener('openNewExtraModal', handleOpenNew);
  }, []);

  return (
    <div className="space-y-3">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-brown dark:text-white">Extras</h1>
          <p className="text-slate-500 dark:text-slate-400">Embalagens, adornos e outros custos fixos.</p>
        </div>
      </header>

      {categories.length > 0 && (
        <section className="bg-white dark:bg-slate-800 rounded-3xl border border-pink/10 dark:border-slate-700 shadow-sm overflow-hidden transition-all duration-300">
          <button 
            onClick={() => setShowCategories(!showCategories)}
            className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
          >
            <div className="flex flex-col items-start">
              <h2 className="text-sm font-bold text-pink dark:text-pink-400 uppercase tracking-wide">Categorias de Extras</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">Toque para ver e editar suas categorias.</p>
            </div>
            {showCategories ? <ChevronDown size={20} className="text-pink" /> : <ChevronRight size={20} className="text-slate-300 group-hover:text-pink" />}
          </button>

          {showCategories && (
            <div className="p-5 pt-0 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex flex-wrap gap-2 pt-1 border-t border-pink/5 dark:border-slate-700 mt-2">
                {categories.map(cat => (
                  <span key={cat} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 bg-mint-soft dark:bg-slate-900 border border-mint/10 dark:border-slate-700 rounded-xl transition-colors">
                    <span className="text-sm font-medium text-mint dark:text-mint-400">{cat}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleEditCategory(cat); }}
                      className="p-1 text-slate-400 hover:text-pink transition-colors cursor-pointer"
                      title="Editar Categoria"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Excluir Categoria"
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-pink/10 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-pink/10 bg-pink-soft/20 dark:bg-slate-800/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Buscar itens extras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-mint/20 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint dark:text-white transition-shadow"
            />
          </div>
        </div>

        {/* Responsive Extras Grid */}
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filteredExtras.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400">
              Nenhum item extra encontrado.
            </div>
          ) : (
            filteredExtras.map(ex => (
              <div 
                key={ex.id} 
                onClick={() => handleOpenModal(ex)}
                className="group relative bg-white dark:bg-slate-900 p-3 rounded-2xl border border-pink/10 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-pink/30 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white uppercase truncate group-hover:text-pink transition-colors text-[17px] tracking-tight leading-tight">
                      {ex.name}
                    </h3>
                    {ex.brand && (
                      <p className="text-[11px] text-slate-400 font-medium italic mt-1 truncate uppercase tracking-wider">
                        {ex.brand}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-pink transition-colors shrink-0 ml-2" />
                </div>

                <div className="flex items-center justify-end pt-2 mt-1 border-t border-slate-50 dark:border-slate-800">
                  <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                    <button 
                      type="button"
                      onClick={() => {
                        duplicateExtra(ex.id);
                        addToast({
                          message: `Item "${ex.name}" duplicado!`,
                          type: 'success'
                        });
                      }}
                      className="p-1.5 text-slate-400 hover:text-pink hover:bg-pink-soft dark:hover:bg-pink-500/10 rounded-lg transition-colors"
                      title="Duplicar"
                    >
                      <Copy size={15} />
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleOpenModal(ex)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        if(window.confirm('Tem certeza que deseja excluir o item "' + ex.name + '"?')) {
                          deleteExtra(ex.id);
                          addToast({
                            message: `Item "${ex.name}" excluído.`,
                            type: "warning",
                            onUndo: () => addExtra(ex)
                          });
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brown/20 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-pink/10">
             <div className="flex items-center justify-between p-6 border-b border-pink/10 bg-pink-soft/30 shrink-0">
               <h3 className="text-xl font-bold text-brown dark:text-white">
                 {editingId ? 'Editar Extra' : 'Novo Extra'}
               </h3>
               <button onClick={handleCloseModal} className="text-brown/40 hover:text-brown transition-colors">
                 <X size={24} />
               </button>
             </div>
             <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
               <div>
                 <label className="block text-sm font-bold text-brown mb-1 capitalize">Item</label>
                 <input 
                   required
                   disabled={isViewMode}
                   type="text" 
                   value={formData.name || ''} 
                   onChange={e => setFormData({...formData, name: capitalize(e.target.value)})}
                   className="w-full px-4 py-2 bg-pink-soft/30 border border-pink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink dark:text-white disabled:opacity-75 disabled:cursor-not-allowed"
                 />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-bold text-brown mb-1 capitalize">Marca</label>
                   <input 
                     type="text" 
                     value={formData.brand || ''} 
                     onChange={e => setFormData({...formData, brand: capitalize(e.target.value)})}
                     className="w-full px-4 py-2 bg-yellow-soft/30 border border-yellow/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow dark:text-white disabled:opacity-75 disabled:cursor-not-allowed"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-brown mb-1 capitalize">Categoria</label>
                   <input 
                     type="text" 
                     list="categories-list-extra"
                     value={formData.category || ''} 
                     onChange={e => setFormData({...formData, category: capitalize(e.target.value)})}
                     className="w-full px-4 py-2 bg-mint-soft/30 border border-mint/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint dark:text-white disabled:opacity-75 disabled:cursor-not-allowed"
                   />
                   <datalist id="categories-list-extra">
                     {categories.map(cat => (
                       <option key={cat} value={cat} />
                     ))}
                   </datalist>
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-bold text-brown mb-1 capitalize">Quantidade</label>
                   <input 
                     required
                     disabled={isViewMode}
                     type="number" 
                     step="any"
                     min="0.01"
                     value={formData.quantityBought || ''} 
                     onChange={e => setFormData({...formData, quantityBought: Number(e.target.value)})}
                     className="w-full px-4 py-2 bg-brown-soft border border-brown/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brown dark:text-white disabled:opacity-75 disabled:cursor-not-allowed"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-brown mb-1 capitalize">Unidade</label>
                   <select 
                     disabled={isViewMode}
                     value={formData.unit} 
                     onChange={e => setFormData({...formData, unit: e.target.value as Unit})}
                     className="w-full px-4 py-2 bg-brown-soft border border-brown/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brown dark:text-white disabled:opacity-75 disabled:cursor-not-allowed"
                   >
                     <option value="un">Unidades (un)</option>
                   </select>
                 </div>
               </div>

               <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-bold text-brown mb-1 capitalize">Peso Total</label>
                     <input 
                       required
                       disabled={isViewMode}
                       type="number" 
                       step="any"
                       min="0.01"
                       value={formData.totalWeight || ''} 
                       onChange={e => setFormData({...formData, totalWeight: Number(e.target.value)})}
                       className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint dark:text-white disabled:opacity-75 disabled:cursor-not-allowed"
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-brown mb-1 capitalize">Unidade Conteúdo</label>
                     <select 
                       disabled={isViewMode}
                       value={formData.weightPerUnUnit || 'g'} 
                       onChange={e => setFormData({...formData, weightPerUnUnit: e.target.value as Unit})}
                       className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint dark:text-white disabled:opacity-75 disabled:cursor-not-allowed"
                     >
                       <option value="g">Gramas (g)</option>
                       <option value="kg">Quilos (kg)</option>
                       <option value="ml">Mililitros (ml)</option>
                       <option value="l">Litros (l)</option>
                     </select>
                   </div>
                 </div>
                 
                 <div>
                   <label className="block text-sm font-bold text-brown mb-1 capitalize text-opacity-70">Peso p/ Un.</label>
                   <div className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl text-slate-500 font-medium">
                     {((formData.totalWeight || 0) / (formData.quantityBought || 1)).toFixed(2)} {formData.weightPerUnUnit}
                   </div>
                 </div>
               </div>

               <div>
                 <label className="block text-sm font-bold text-brown mb-1 capitalize">Valor Pago (R$)</label>
                 <CurrencyInput 
                   required
                   value={formData.pricePaid || 0} 
                   onChangeValue={value => setFormData({...formData, pricePaid: value})}
                   className="w-full px-4 py-2 bg-mint-soft/30 border border-mint/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint dark:text-white"
                 />
               </div>
               <div>
                  <label className="block text-sm font-bold text-brown mb-1 capitalize text-opacity-70">Valor por unidade (R$)</label>
                  <div className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl text-slate-500 font-medium">
                    {formatCurrency((formData.pricePaid || 0) / (formData.quantityBought || 1))}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
                  <h4 className="text-md font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Precificação Final</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Multiplicador de Lucro Desejado</label>
                    <div className="flex gap-2">
                      {[2, 3, 4, 5].map(mult => (
                        <button
                          key={mult}
                          type="button"
                          disabled={isViewMode}
                          onClick={() => setFormData(prev => ({ ...prev, profitMultiplier: mult }))}
                          className={`flex-1 py-1 rounded-lg font-medium transition-colors text-sm ${
                            formData.profitMultiplier === mult 
                              ? "bg-indigo-600 text-white" 
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                          } disabled:opacity-50`}
                        >
                          {mult}x
                        </button>
                      ))}
                      <input
                        type="number"
                        disabled={isViewMode}
                        step="0.5"
                        min="1.1"
                        value={formData.profitMultiplier !== 2 && formData.profitMultiplier !== 3 && formData.profitMultiplier !== 4 && formData.profitMultiplier !== 5 ? (formData.profitMultiplier || '') : ''}
                        onChange={e => setFormData(prev => ({ ...prev, profitMultiplier: Number(e.target.value) || 2 }))}
                        placeholder="Outro"
                        className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Preço de Venda Definido (Por Unidade)</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <CurrencyInput 
                          disabled={isViewMode}
                          value={formData.targetPricePerUnit || 0} 
                          onChangeValue={value => setFormData({...formData, targetPricePerUnit: value})}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold text-lg disabled:opacity-50"
                        />
                      </div>
                      <button 
                        type="button"
                        disabled={isViewMode}
                        onClick={() => {
                          const cost = (formData.pricePaid || 0) / (formData.quantityBought || 1);
                          const mult = formData.profitMultiplier || 2;
                          setFormData(prev => ({ ...prev, targetPricePerUnit: cost * mult }));
                        }}
                        className="px-3 py-2 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors flex flex-col items-center justify-center text-xs font-medium disabled:opacity-50"
                        title="Calcular preço usando o multiplicador"
                      >
                        <Calculator size={16} className="mb-0.5" />
                        Sugerir
                      </button>
                    </div>
                  </div>

                  {(() => {
                    if (!formData.targetPricePerUnit || formData.targetPricePerUnit <= 0) return null;
                    
                    const unitCost = (formData.pricePaid || 0) / (formData.quantityBought || 1);
                    const unitPrice = formData.targetPricePerUnit;
                    const targetMult = formData.profitMultiplier || 2;
                    const actualMultiplier = unitCost > 0 ? unitPrice / unitCost : 0;
                    const netProfitUnit = unitPrice - unitCost;
                    const profitMargin = unitPrice > 0 ? (netProfitUnit / unitPrice) * 100 : 0;
                    
                    if (unitPrice < unitCost) {
                      return (
                        <div className="mt-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0" size={20} />
                            <div>
                              <h3 className="font-bold text-rose-900 dark:text-rose-300 text-xs uppercase tracking-wider">ATENÇÃO: O preço informado gera prejuízo.</h3>
                              <ul className="mt-2 text-sm text-rose-800 dark:text-rose-200 space-y-1">
                                <li>• Custo unitário: <strong>{formatCurrency(unitCost)}</strong></li>
                                <li>• Perda por unidade: <strong>{formatCurrency(Math.abs(netProfitUnit))}</strong></li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (unitPrice < unitCost * targetMult) {
                       return (
                          <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" size={20} />
                              <div>
                                <h3 className="font-bold text-amber-900 dark:text-amber-300 text-xs uppercase tracking-wider">O preço informado não atinge o lucro desejado.</h3>
                                <ul className="mt-2 text-sm text-amber-800 dark:text-amber-200 space-y-1">
                                  <li>• Multiplicador alcançado: <strong>{actualMultiplier.toFixed(2)}x</strong></li>
                                  <li>• Recomendado ({targetMult}x): <strong>{formatCurrency(unitCost * targetMult)}</strong></li>
                                </ul>
                              </div>
                            </div>
                          </div>
                       );
                    }

                    return (
                      <div className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" size={20} />
                          <div>
                            <h3 className="font-bold text-emerald-900 dark:text-emerald-300 text-xs uppercase tracking-wider">Excelente! O preço informado atinge a meta de lucro definida.</h3>
                            <ul className="mt-2 text-sm text-emerald-800 dark:text-emerald-200 space-y-1">
                              <li>• Multiplicador alcançado: <strong>{actualMultiplier.toFixed(2)}x</strong></li>
                              <li>• Multiplicador desejado: <strong>{targetMult}x</strong></li>
                              <li>• Lucro unitário: <strong>{formatCurrency(netProfitUnit)}</strong></li>
                              <li>• Margem: <strong>{profitMargin.toFixed(1)}%</strong></li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

               <div className="pt-4 flex items-center justify-end space-x-3">
                 {saveStatus && <span className="text-xs text-slate-500 animate-pulse mr-auto">{saveStatus}</span>}
                 {editingId && (
                    <button 
                      type="button" 
                      onClick={() => setIsViewMode(!isViewMode)}
                      className={cn(
                        "p-3 rounded-xl transition-colors",
                        isViewMode ? "text-indigo-500 hover:bg-indigo-50" : "text-pink bg-pink-soft"
                      )}
                      title={isViewMode ? "Editar" : "Parar Edição"}
                    >
                      <Edit2 size={24} />
                    </button>
                  )}
                 <button 
                   type="button" 
                   onClick={handleCloseModal}
                   className="px-4 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                 >
                   {isViewMode ? 'Fechar' : 'Cancelar'}
                 </button>
                 {!isViewMode && (
                  <button 
                    type="submit" 
                    className="px-6 py-3 bg-mint text-white rounded-xl transition-all transform hover:scale-105 active:scale-95 font-bold shadow-soft"
                  >
                    Salvar
                  </button>
                 )}
               </div>
             </form>
          </div>
        </div>
      )}

      {/* Categories modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brown/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4 border border-pink/10">
            <h3 className="text-xl font-bold text-pink dark:text-pink-400">Editar Categoria</h3>
            <div>
              <label className="block text-xs font-bold text-brown uppercase tracking-wider mb-2">Nome da Categoria</label>
              <input
                type="text"
                value={newCategoryName}
                onChange={e => setNewCategoryName(capitalize(e.target.value))}
                className="w-full px-4 py-2 bg-pink-soft/30 border border-pink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCategoryUpdate}
                disabled={!newCategoryName.trim()}
                className="px-5 py-2 bg-pink text-white rounded-xl font-bold shadow-soft transition-all transform hover:scale-105 disabled:opacity-50 cursor-pointer"
              >
                Atualizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete category modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 space-y-4">
             <h3 className="text-lg font-bold text-slate-900 dark:text-white">Excluir Categoria</h3>
             <p className="text-sm text-slate-500 dark:text-slate-400">
               Tem certeza que deseja excluir a categoria <strong>"{deletingCategory}"</strong>? Todos os extras associados a ela terão sua categoria redefinida.
             </p>
             <div className="flex justify-end gap-2 pt-2">
               <button
                 type="button"
                 onClick={() => setDeletingCategory(null)}
                 className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-sm font-medium transition-colors cursor-pointer"
               >
                 Cancelar
               </button>
               <button
                 type="button"
                 onClick={handleConfirmDeleteCategory}
                 className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
               >
                 Confirmar Exclusão
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
