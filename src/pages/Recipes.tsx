import { useState } from "react";
import { useStore } from "../store/useStore";
import { Link, useNavigate } from "react-router-dom";
import { formatCurrency, getActualMetrics } from "../lib/utils";
import { Plus, Search, Edit2, Trash2, ChevronRight, Copy } from "lucide-react";

export default function Recipes() {
  const { recipes, ingredients, deleteRecipe, duplicateRecipe, addRecipe, addToast } = useStore();
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const filteredRecipes = recipes.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-brown dark:text-white">Suas Receitas</h1>
          <p className="text-slate-500 dark:text-slate-400">Cartão de ponto das suas delícias.</p>
        </div>
        <Link 
          to="/receitas/nova"
          className="inline-flex items-center justify-center space-x-2 bg-pink hover:bg-pink/90 text-white px-5 py-2.5 rounded-xl font-bold shadow-soft transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={20} />
          <span>Nova Receita</span>
        </Link>
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

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-mint-soft/30 dark:bg-slate-900/50 text-brown font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Custo Unit.</th>
                <th className="px-6 py-4">Preço Venda</th>
                <th className="px-6 py-4">Margem</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink/5 dark:divide-slate-700">
              {filteredRecipes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    Nenhuma receita encontrada.
                  </td>
                </tr>
              ) : (
                filteredRecipes.map(recipe => {
                  const metrics = getActualMetrics(recipe, ingredients);
                  return (
                    <tr 
                      key={recipe.id} 
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/receitas/${recipe.id}`)}
                    >
                      <td className="px-6 py-4 font-bold text-brown dark:text-white uppercase tracking-wide text-xs">{recipe.name}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        <span className="inline-flex px-2 py-1 rounded-md bg-yellow-soft dark:bg-slate-800 text-yellow text-[10px] font-black border border-yellow/20">
                          {recipe.category || 'Geral'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {formatCurrency(metrics.costPerUnit)}
                      </td>
                      <td className="px-6 py-4 text-brown dark:text-slate-300 font-bold">
                        {formatCurrency(recipe.targetPricePerUnit)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={metrics.meetsTarget ? "text-mint font-black" : "text-pink font-black"}>
                          {metrics.profitMargin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2" onClick={e => e.stopPropagation()}>
                         <button 
                           type="button"
                           onClick={(e) => {
                             e.stopPropagation();
                             duplicateRecipe(recipe.id);
                             addToast({
                               message: `Receita "${recipe.name}" duplicada com sucesso!`,
                               type: 'success'
                             });
                           }}
                           className="p-2 text-slate-400 hover:text-pink hover:bg-pink-soft dark:hover:bg-pink-500/10 rounded-lg transition-colors"
                           title="Duplicar Receita"
                         >
                           <Copy size={18} />
                         </button>
                         <button 
                           type="button"
                           onClick={(e) => {
                             e.stopPropagation();
                             navigate(`/receitas/${recipe.id}/editar`);
                           }}
                           className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                         >
                           <Edit2 size={18} />
                         </button>
                         <button 
                           type="button"
                           onClick={(e) => {
                             e.stopPropagation();
                             if(window.confirm('Tem certeza que deseja excluir a receita "' + recipe.name + '"?')) {
                               deleteRecipe(recipe.id);
                               addToast({
                                 message: `Receita "${recipe.name}" excluída.`,
                                 type: "warning",
                                 onUndo: () => addRecipe(recipe)
                               });
                             }
                           }}
                           className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                         >
                           <Trash2 size={18} />
                         </button>
                         <button 
                           type="button"
                           onClick={(e) => {
                             e.stopPropagation();
                             navigate(`/receitas/${recipe.id}`);
                           }}
                           className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                         >
                           <ChevronRight size={18} />
                         </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
