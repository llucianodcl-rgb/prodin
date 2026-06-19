import React from "react";
import { useStore } from "../store/useStore";
import { 
  getRecipeTotalCost, 
  getSuggestedTotalPrice, 
  getActualMetrics,
  formatCurrency,
  cn
} from "../lib/utils";
import { Link } from "react-router-dom";
import { PlusCircle, TrendingUp, DollarSign, Package } from "lucide-react";

export default function Dashboard() {
  const { recipes, ingredients } = useStore();

  const totalRecipes = recipes.length;
  
  let totalEstimatedRevenue = 0;
  let totalEstimatedProfit = 0;
  let mostProfitableRecipe = null;
  let leastProfitableRecipe = null;
  let totalCostSum = 0;

  recipes.forEach(recipe => {
    const metrics = getActualMetrics(recipe, ingredients);
    totalEstimatedRevenue += metrics.targetTotalRevenue;
    totalEstimatedProfit += metrics.netProfitTotal;
    totalCostSum += getRecipeTotalCost(recipe, ingredients);

    if (!mostProfitableRecipe || metrics.profitMargin > getActualMetrics(mostProfitableRecipe, ingredients).profitMargin) {
      mostProfitableRecipe = recipe;
    }
    if (!leastProfitableRecipe || metrics.profitMargin < getActualMetrics(leastProfitableRecipe, ingredients).profitMargin) {
      leastProfitableRecipe = recipe;
    }
  });

  const averageCost = totalRecipes > 0 ? totalCostSum / totalRecipes : 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-brown dark:text-white">Resumo Doce</h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">Visão geral do seu negócio.</p>
        </div>
        <Link 
          to="/receitas/nova"
          className="inline-flex items-center justify-center space-x-2 bg-mint hover:bg-mint/90 text-white px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold shadow-soft transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <PlusCircle size={18} className="sm:w-5 sm:h-5" />
          <span className="text-xs sm:text-base">Nova Receita</span>
        </Link>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Faturamento" 
          value={formatCurrency(totalEstimatedRevenue)} 
          icon={<DollarSign size={20} className="text-pink sm:w-6 sm:h-6" />} 
          subtitle="Estimado"
          color="pink"
        />
        <MetricCard 
          title="Lucro" 
          value={formatCurrency(totalEstimatedProfit)} 
          icon={<TrendingUp size={20} className="text-mint sm:w-6 sm:h-6" />} 
          subtitle="Projetado"
          color="mint"
        />
         <MetricCard 
          title="Receitas" 
          value={totalRecipes} 
          icon={<Package size={20} className="text-yellow sm:w-6 sm:h-6" />} 
          subtitle="Ativas"
          color="yellow"
        />
        <MetricCard 
          title="Custo" 
          value={formatCurrency(averageCost)} 
          icon={<DollarSign size={20} className="text-brown sm:w-6 sm:h-6" />} 
          subtitle="Médio"
          color="brown"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-3xl shadow-sm border border-pink/10 dark:border-slate-700">
          <h3 className="text-sm sm:text-lg font-bold text-brown dark:text-white mb-2 sm:mb-4">Mais Lucrativa</h3>
          {mostProfitableRecipe ? (
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-mint-soft/30 dark:bg-slate-900/50 p-3 sm:p-4 rounded-xl border border-mint/10 gap-2">
               <div>
                 <p className="font-bold text-brown dark:text-white text-xs sm:text-base truncate max-w-[100px] sm:max-w-none">{mostProfitableRecipe.name}</p>
                 <p className="text-[10px] sm:text-sm text-mint font-medium">{getActualMetrics(mostProfitableRecipe, ingredients).profitMargin.toFixed(1)}%</p>
               </div>
               <Link to={`/receitas/${mostProfitableRecipe.id}`} className="text-pink dark:text-pink-400 text-[10px] sm:text-sm font-bold hover:underline shrink-0">
                 Detalhes &rarr;
               </Link>
             </div>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-sm">Sem dados.</p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-3xl shadow-sm border border-pink/10 dark:border-slate-700">
          <h3 className="text-sm sm:text-lg font-bold text-brown dark:text-white mb-2 sm:mb-4">Menos Lucrativa</h3>
          {leastProfitableRecipe ? (
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-pink-soft/30 dark:bg-slate-900/50 p-3 sm:p-4 rounded-xl border border-pink/10 gap-2">
               <div>
                 <p className="font-bold text-brown dark:text-white text-xs sm:text-base truncate max-w-[100px] sm:max-w-none">{leastProfitableRecipe.name}</p>
                 <p className="text-[10px] sm:text-sm text-pink font-medium">{getActualMetrics(leastProfitableRecipe, ingredients).profitMargin.toFixed(1)}%</p>
               </div>
               <Link to={`/receitas/${leastProfitableRecipe.id}`} className="text-pink dark:text-pink-400 text-[10px] sm:text-sm font-bold hover:underline shrink-0">
                 Detalhes &rarr;
               </Link>
             </div>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-sm">Sem dados.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, subtitle, color = 'mint' }: { title: string, value: string | number, icon: React.ReactNode, subtitle: string, color?: string }) {
  const bgSoft = {
    pink: 'bg-pink-soft/80',
    mint: 'bg-mint-soft/80',
    yellow: 'bg-yellow-soft/80',
    brown: 'bg-brown-soft/80'
  }[color as keyof typeof bgSoft] || 'bg-slate-50';

  const borderColor = {
    pink: 'border-pink/20',
    mint: 'border-mint/20',
    yellow: 'border-yellow/20',
    brown: 'border-brown/20'
  }[color as keyof typeof borderColor] || 'border-slate-200';

  const iconBg = {
    pink: 'bg-white/60 dark:bg-pink-900/20',
    mint: 'bg-white/60 dark:bg-mint-900/20',
    yellow: 'bg-white/60 dark:bg-yellow-900/20',
    brown: 'bg-white/60 dark:bg-brown-900/20'
  }[color as keyof typeof iconBg] || 'bg-slate-50';

  return (
    <div className={cn("p-4 sm:p-6 rounded-3xl shadow-sm border transition-shadow hover:shadow-md", bgSoft, borderColor)}>
       <div className="flex justify-between items-start gap-1">
         <p className="text-xs sm:text-sm font-bold text-brown opacity-80 leading-tight">{title}</p>
         <div className={cn("p-2 rounded-xl shrink-0", iconBg)}>{icon}</div>
       </div>
       <div className="mt-4">
         <h2 className="text-lg sm:text-2xl font-black text-brown dark:text-white tracking-tight truncate">{value}</h2>
         <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{subtitle}</p>
       </div>
    </div>
  )
}
