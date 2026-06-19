import React, { useState, useEffect } from "react";
import { useStore } from "../store/useStore";
import { Ingredient, Unit } from "../types";
import { formatCurrency, getIngredientUnitCost } from "../lib/utils";
import { Plus, Search, Edit2, Trash2, X, Copy } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { cn } from "../lib/utils";
import { CurrencyInput } from "../components/ui/CurrencyInput";

export default function Ingredients() {
  const { ingredients, addIngredient, updateIngredient, deleteIngredient, duplicateIngredient, addToast, ingredientDrafts, setIngredientDraft, clearIngredientDraft } = useStore();
  
  const draft = ingredientDrafts['modal'];

  const capitalize = (val: string) => {
    if (!val) return val;
    return val.charAt(0).toUpperCase() + val.slice(1);
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(draft?.isModalOpen || false);
  const [editingId, setEditingId] = useState<string | null>(draft?.editingId || null);

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

  const categories = Array.from(new Set(ingredients.map(i => i.category).filter(Boolean)));

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
    
    ingredients.forEach(ing => {
      if (ing.category === oldCat) {
        updateIngredient(ing.id, { category: newCat });
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
    
    ingredients.forEach(ing => {
      if (ing.category === oldCat) {
        updateIngredient(ing.id, { category: "" });
      }
    });

    addToast({
      message: `Categoria "${oldCat}" removida dos ingredientes.`,
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
        setIngredientDraft('modal', { isModalOpen, editingId, formData });
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
  }, [isModalOpen, editingId, formData, setIngredientDraft]);

  const filteredIngredients = ingredients.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (i.brand?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
    i.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (ingredient?: Ingredient) => {
    if (ingredient) {
      setEditingId(ingredient.id);
      setFormData({
        ...ingredient,
        totalWeight: (ingredient.weightPerUn || 0) * (ingredient.quantityBought || 1)
      });
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
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    clearIngredientDraft('modal');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate weight per unit from total weight
    const calculatedWeightPerUn = (formData.totalWeight || 0) / (formData.quantityBought || 1);
    
    const finalFormData = {
      ...formData,
      weightPerUn: calculatedWeightPerUn
    };
    // Remove transient field before saving
    delete (finalFormData as any).totalWeight;

    if (editingId) {
      const originalIngredient = ingredients.find(i => i.id === editingId);
      if (originalIngredient) {
        updateIngredient(editingId, finalFormData as Ingredient);
        addToast({
          message: "Ingrediente atualizado com sucesso!",
          type: "success",
          onUndo: () => updateIngredient(editingId, originalIngredient)
        });
      }
    } else {
      const newIngredient = {
        ...finalFormData,
        id: uuidv4(),
        createdAt: new Date().toISOString()
      } as Ingredient;
      addIngredient(newIngredient);
      addToast({
        message: "Ingrediente criado!",
        type: "success",
        onUndo: () => deleteIngredient(newIngredient.id)
      });
    }
    setIsModalOpen(false);
    clearIngredientDraft('modal');
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-brown dark:text-white">Ingredientes</h1>
          <p className="text-slate-500 dark:text-slate-400">Gerencie seu estoque interno.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="inline-flex items-center justify-center space-x-2 bg-pink hover:bg-pink/90 text-white px-5 py-2.5 rounded-xl font-bold shadow-soft transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={20} />
          <span>Novo Produto</span>
        </button>
      </header>

      {categories.length > 0 && (
        <section className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-pink/10 dark:border-slate-700 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-pink dark:text-pink-400 uppercase tracking-wide">Categorias Salvas</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 italic">Toque para organizar seus doces e massas.</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {categories.map(cat => (
              <span key={cat} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 bg-mint-soft dark:bg-slate-900 border border-mint/10 dark:border-slate-700 rounded-xl transition-colors">
                <span className="text-sm font-medium text-mint dark:text-mint-400">{cat}</span>
                <button
                  type="button"
                  onClick={() => handleEditCategory(cat)}
                  className="p-1 text-slate-400 hover:text-pink transition-colors cursor-pointer"
                  title="Editar Categoria"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(cat)}
                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Excluir Categoria"
                >
                  <Trash2 size={13} />
                </button>
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-pink/10 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-pink/10 bg-pink-soft/20 dark:bg-slate-800/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Buscar ingredientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-mint/20 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint dark:text-white transition-shadow"
            />
          </div>
        </div>

        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-mint-soft/30 dark:bg-slate-900/50 text-brown font-bold">
              <tr>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Produto</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Marca</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Categoria</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Qtd</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Valor Pago</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink/5 dark:divide-slate-700">
              {filteredIngredients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    Nenhum ingrediente encontrado.
                  </td>
                </tr>
              ) : (
                filteredIngredients.map(ing => (
                  <tr key={ing.id} className="hover:bg-pink-soft/20 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white uppercase tracking-wide text-xs">{ing.name}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium italic text-xs">{ing.brand || '-'}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                      <span className="inline-flex px-2 py-1 rounded-md bg-yellow-soft dark:bg-slate-800 text-yellow text-xs font-bold border border-yellow/20">
                        {ing.category || 'Geral'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      <div>{ing.quantityBought} {ing.unit}</div>
                      {ing.weightPerUn && ing.weightPerUn > 0 && (
                        <div className="text-xs text-slate-400 font-medium">
                          ({ing.weightPerUn}{ing.weightPerUnUnit} cada)
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {formatCurrency(ing.pricePaid)}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                       <button 
                         type="button"
                         onClick={(e) => {
                           e.stopPropagation();
                           duplicateIngredient(ing.id);
                           addToast({
                             message: `Ingrediente "${ing.name}" duplicado com sucesso!`,
                             type: 'success'
                           });
                         }}
                         className="p-2 text-slate-400 hover:text-pink hover:bg-pink-soft dark:hover:bg-pink-500/10 rounded-lg transition-colors"
                         title="Duplicar Ingrediente"
                       >
                         <Copy size={18} />
                       </button>
                       <button 
                         type="button"
                         onClick={(e) => {
                           e.stopPropagation();
                           handleOpenModal(ing);
                         }}
                         className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                         title="Editar Ingrediente"
                       >
                         <Edit2 size={18} />
                       </button>
                       <button 
                         type="button"
                         onClick={(e) => {
                           e.stopPropagation();
                           if(window.confirm('Tem certeza que deseja excluir o ingrediente "' + ing.name + '"?')) {
                             deleteIngredient(ing.id);
                             addToast({
                               message: `Ingrediente "${ing.name}" excluído.`,
                               type: "warning",
                               onUndo: () => addIngredient(ing)
                             });
                           }
                         }}
                         className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                       >
                         <Trash2 size={18} />
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="sm:hidden divide-y divide-pink/5 dark:divide-slate-700">
          {filteredIngredients.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
              Nenhum ingrediente encontrado.
            </div>
          ) : (
            filteredIngredients.map(ing => (
              <div key={ing.id} className="p-4 flex justify-between items-start hover:bg-pink-soft/10 dark:hover:bg-slate-800/50 transition-colors">
                <div className="space-y-1.5 text-xs flex-1 pr-2">
                  <div className="flex flex-col">
                    <span className="font-bold text-pink dark:text-pink-400 text-[10px] uppercase">Produto:</span>
                    <span className="font-bold text-slate-900 dark:text-white uppercase truncate">{ing.name}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-pink dark:text-pink-400 text-[10px] uppercase">Marca:</span>
                    <span className="text-slate-600 dark:text-slate-400 italic">{ing.brand || '-'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-pink dark:text-pink-400 text-[10px] uppercase">Categoria:</span>
                    <span className="text-slate-600 dark:text-slate-400">{ing.category || 'Geral'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-pink dark:text-pink-400 text-[10px] uppercase">QTD:</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {ing.quantityBought} {ing.unit}
                      {ing.weightPerUn && ing.weightPerUn > 0 && ` (${ing.weightPerUn}${ing.weightPerUnUnit} cada)`}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-pink dark:text-pink-400 text-[10px] uppercase">Valor pago:</span>
                    <span className="text-slate-600 dark:text-slate-400 font-bold">{formatCurrency(ing.pricePaid)}</span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 shrink-0 border-l border-pink/5 dark:border-slate-700 pl-3">
                  <button 
                    type="button"
                    onClick={() => {
                      duplicateIngredient(ing.id);
                      addToast({
                        message: `Ingrediente "${ing.name}" duplicado com sucesso!`,
                        type: 'success'
                      });
                    }}
                    className="p-2.5 text-slate-400 hover:text-pink hover:bg-pink-soft dark:hover:bg-pink-500/10 rounded-xl transition-colors bg-slate-50 dark:bg-slate-900"
                  >
                    <Copy size={18} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleOpenModal(ing)}
                    className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-colors bg-slate-50 dark:bg-slate-900"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      if(window.confirm('Tem certeza que deseja excluir o ingrediente "' + ing.name + '"?')) {
                        deleteIngredient(ing.id);
                        addToast({
                          message: `Ingrediente "${ing.name}" excluído.`,
                          type: "warning",
                          onUndo: () => addIngredient(ing)
                        });
                      }
                    }}
                    className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors bg-slate-50 dark:bg-slate-900"
                  >
                    <Trash2 size={18} />
                  </button>
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
                 {editingId ? 'Editar produto' : 'Novo Produto'}
               </h3>
               <button onClick={handleCloseModal} className="text-brown/40 hover:text-brown transition-colors">
                 <X size={24} />
               </button>
             </div>
             <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
               <div>
                 <label className="block text-sm font-bold text-brown mb-1 capitalize">Produto</label>
                 <input 
                   required
                   type="text" 
                   value={formData.name || ''} 
                   onChange={e => setFormData({...formData, name: capitalize(e.target.value)})}
                   className="w-full px-4 py-2 bg-pink-soft/30 border border-pink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink dark:text-white"
                 />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-bold text-brown mb-1 capitalize">Marca</label>
                   <input 
                     type="text" 
                     value={formData.brand || ''} 
                     onChange={e => setFormData({...formData, brand: capitalize(e.target.value)})}
                     className="w-full px-4 py-2 bg-yellow-soft/30 border border-yellow/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow dark:text-white"
                     placeholder="Ex: Moça"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-brown mb-1 capitalize">Categoria</label>
                   <input 
                     type="text" 
                     list="categories-list"
                     value={formData.category || ''} 
                     onChange={e => setFormData({...formData, category: capitalize(e.target.value)})}
                     className="w-full px-4 py-2 bg-mint-soft/30 border border-mint/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint dark:text-white"
                     placeholder="Ex: Laticínios"
                   />
                   <datalist id="categories-list">
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
                     type="number" 
                     step="any"
                     min="0.01"
                     value={formData.quantityBought || ''} 
                     onChange={e => setFormData({...formData, quantityBought: Number(e.target.value)})}
                     className="w-full px-4 py-2 bg-brown-soft border border-brown/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brown dark:text-white"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-brown mb-1 capitalize">Unidade</label>
                   <select 
                     value={formData.unit} 
                     onChange={e => setFormData({...formData, unit: e.target.value as Unit})}
                     className="w-full px-4 py-2 bg-brown-soft border border-brown/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brown dark:text-white"
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
                       type="number" 
                       step="any"
                       min="0.01"
                       value={formData.totalWeight || ''} 
                       onChange={e => setFormData({...formData, totalWeight: Number(e.target.value)})}
                       className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint dark:text-white"
                       placeholder="Ex: 1000"
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-brown mb-1 capitalize">Unidade Conteúdo</label>
                     <select 
                       value={formData.weightPerUnUnit || 'g'} 
                       onChange={e => setFormData({...formData, weightPerUnUnit: e.target.value as Unit})}
                       className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint dark:text-white"
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
               <div className="pt-4 flex items-center justify-end space-x-3">
                 {saveStatus && <span className="text-xs text-slate-500 animate-pulse mr-auto">{saveStatus}</span>}
                 <button 
                   type="button" 
                   onClick={handleCloseModal}
                   className="px-4 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                 >
                   Cancelar
                 </button>
                 <button 
                   type="submit" 
                   className="px-6 py-3 bg-mint text-white rounded-xl transition-all transform hover:scale-105 active:scale-95 font-bold shadow-soft"
                 >
                   Salvar
                 </button>
               </div>
             </form>
          </div>
        </div>
      )}

      {/* Modal para Editar Categoria */}
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

      {/* Modal para Confirmar Exclusão de Categoria */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Excluir Categoria</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Tem certeza que deseja excluir a categoria <strong className="text-slate-800 dark:text-white">"{deletingCategory}"</strong>? Todos os ingredientes associados a ela terão sua categoria redefinida para vazia/geral.
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
