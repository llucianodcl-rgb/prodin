import { useState } from "react";
import { useStore } from "../store/useStore";
import { Link, useNavigate } from "react-router-dom";
import { formatCurrency, getActualMetrics, normalizeString, formatNumber } from "../lib/utils";
import { Plus, Search, Edit2, Trash2, ChevronRight, Copy, Share2 } from "lucide-react";
import ShareRecipeModal from "../components/shares/ShareRecipeModal";

export default function Recipes() {
  const { recipes, ingredients, deleteRecipe, duplicateRecipe, addRecipe, addToast, showModal } = useStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [sharingRecipe, setSharingRecipe] = useState<any>(null);
  const navigate = useNavigate();

  const filteredRecipes = recipes
    .filter(r => {
      const search = normalizeString(searchTerm);
      const name = normalizeString(r.name);
      const category = normalizeString(r.category);
      const targetPrice = r.targetPricePerUnit.toString();
      
      return name.includes(search) || 
             category.includes(search) ||
             targetPrice.includes(search);
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-3">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-brown dark:text-white">Suas Receitas</h1>
          <p className="text-slate-500 dark:text-slate-400">Cartão de ponto das suas delícias.</p>
        </div>
      </header>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-pink/10 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-pink/10 bg-pink-soft/20 dark:bg-slate-800/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Buscar receitas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-mint/20 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint dark:text-white transition-shadow"
            />
          </div>
        </div>

        {/* Responsive Recipes Grid */}
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filteredRecipes.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400">
              Nenhuma receita encontrada.
            </div>
          ) : (
            filteredRecipes.map(recipe => {
              const metrics = getActualMetrics(recipe, ingredients);
              return (
                <div 
                  key={recipe.id} 
                  onClick={() => navigate(`/receitas/${recipe.id}`)}
                  className="group relative bg-white dark:bg-slate-900 p-3 rounded-2xl border border-pink/10 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-pink/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-white uppercase truncate group-hover:text-pink transition-colors text-[17px] tracking-tight leading-tight">
                        {recipe.name}
                      </h3>
                      {recipe.category && (
                        <p className="text-[11px] text-slate-400 font-medium italic mt-1 truncate uppercase tracking-wider">
                          {recipe.category}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-pink transition-colors shrink-0 ml-2" />
                  </div>

                  <div className="flex items-center justify-end pt-2 mt-1 border-t border-slate-50 dark:border-slate-800">
                    <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                      <button 
                        type="button"
                        onClick={() => setSharingRecipe(recipe)}
                        className="p-1.5 text-slate-400 hover:text-pink hover:bg-pink-soft dark:hover:bg-pink-500/10 rounded-lg transition-colors"
                        title="Compartilhar"
                      >
                        <Share2 size={15} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          duplicateRecipe(recipe.id);
                          addToast({
                            message: `Receita "${recipe.name}" duplicada!`,
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
                        onClick={() => navigate(`/receitas/${recipe.id}/editar`)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          showModal({
                            title: "Excluir Receita",
                            message: `Tem certeza que deseja excluir a receita "${recipe.name}"? Esta ação não poderá ser desfeita.`,
                            confirmText: "Excluir Receita",
                            type: "danger",
                            onConfirm: () => {
                              deleteRecipe(recipe.id);
                              addToast({
                                message: `Receita "${recipe.name}" excluída com sucesso.`,
                                type: "success"
                              });
                            }
                          });
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
      
      {sharingRecipe && (
        <ShareRecipeModal 
          recipe={sharingRecipe} 
          onClose={() => setSharingRecipe(null)} 
        />
      )}
    </div>
  );
}
