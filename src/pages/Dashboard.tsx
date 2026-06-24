import React, { useState } from "react";
import { useStore } from "../store/useStore";
import { 
  getRecipeTotalCost, 
  getRecipeIngredientsCost,
  getRecipeIngredientCost,
  getActualMetrics,
  formatCurrency,
  formatNumber,
  getSuggestedUnitPrice,
  cn
} from "../lib/utils";
import { Link } from "react-router-dom";
import { 
  TrendingUp, DollarSign, Package, PieChart, Lightbulb, 
  CheckCircle, HeartPulse, Rocket, Info, Crown, Trophy, AlertTriangle,
  ArrowRight, Sparkles, BarChart3, Target, Zap, TrendingDown, Eye, X
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

export default function Dashboard() {
  const { recipes, ingredients, extras } = useStore();
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulatingRecipe, setSimulatingRecipe] = useState<any>(null);
  const [simulatedMarkup, setSimulatedMarkup] = useState<number>(3);

  const totalRecipes = recipes.length;
  
  let totalEstimatedRevenue = 0;
  let totalEstimatedProfit = 0;
  let totalCostSum = 0;
  let profitableRecipesCount = 0;

  const recipeStats = recipes.map(recipe => {
    const metrics = getActualMetrics(recipe, ingredients);
    const suggestedPrice = getSuggestedUnitPrice(recipe, ingredients);
    
    totalEstimatedRevenue += metrics.targetTotalRevenue;
    totalEstimatedProfit += metrics.netProfitTotal;
    totalCostSum += getRecipeTotalCost(recipe, ingredients);

    if (metrics.profitMargin > 0) profitableRecipesCount++;

    return {
      recipe,
      metrics,
      suggestedPrice
    };
  });

  const sortedByMargin = [...recipeStats].sort((a, b) => b.metrics.profitMargin - a.metrics.profitMargin);
  const sortedByNetProfitUnit = [...recipeStats].sort((a, b) => b.metrics.netProfitUnit - a.metrics.netProfitUnit);
  const sortedByTotalProfit = [...recipeStats].sort((a, b) => b.metrics.netProfitTotal - a.metrics.netProfitTotal);

  const averageProfit = totalRecipes > 0 ? totalEstimatedProfit / totalRecipes : 0;
  const averageMargin = totalEstimatedRevenue > 0 ? (totalEstimatedProfit / totalEstimatedRevenue) * 100 : 0;

  // 1. Receita Campeã (Maior Lucro Total)
  const championRecipe = sortedByTotalProfit[0];

  // 2. Melhor Oportunidade de Reajuste
  // Receitas com margem boa mas preço abaixo do sugerido
  const readjustmentOpportunity = recipeStats
    .filter(item => item.metrics.profitMargin >= 30 && item.recipe.targetPricePerUnit < item.suggestedPrice)
    .sort((a, b) => (b.suggestedPrice - b.recipe.targetPricePerUnit) - (a.suggestedPrice - a.recipe.targetPricePerUnit))[0];

  // 3. Receita em Alerta
  const alertRecipe = recipeStats
    .filter(item => item.metrics.profitMargin < 35)
    .sort((a, b) => a.metrics.profitMargin - b.metrics.profitMargin)[0];

  // 6. Receita Subestimada (Alta margem, preço baixo)
  const medianPrice = totalRecipes > 0 ? recipeStats.map(r => r.recipe.targetPricePerUnit).sort((a, b) => a - b)[Math.floor(totalRecipes / 2)] : 0;
  const underestimatedRecipe = recipeStats
    .filter(item => item.metrics.profitMargin > 50 && item.recipe.targetPricePerUnit < medianPrice)
    .sort((a, b) => b.metrics.profitMargin - a.metrics.profitMargin)[0];

  // Insights Dinâmicos
  const insights = [];
  if (championRecipe) {
    const marginDiff = championRecipe.metrics.profitMargin - averageMargin;
    if (marginDiff > 0) {
      insights.push(`Sua receita de ${championRecipe.recipe.name} possui lucro ${formatNumber(marginDiff)}% superior à média do catálogo.`);
    }
  }

  const alertCount = recipeStats.filter(r => r.metrics.profitMargin < 40).length;
  if (alertCount > 0) {
    insights.push(`Você possui ${alertCount} ${alertCount === 1 ? 'receita' : 'receitas'} abaixo da margem de segurança desejada (40%).`);
  }

  // Find high cost ingredient contribution
  if (recipes.length > 0) {
    const firstRecipe = recipes[0];
    const totalIngredientsCost = getRecipeIngredientsCost(firstRecipe, ingredients);

    if (totalIngredientsCost > 0 && firstRecipe.ingredients.length > 0) {
      const ingredientCosts = firstRecipe.ingredients.map(ri => {
        const ing = ingredients.find(i => i.id === ri.ingredientId);
        const cost = ing ? getRecipeIngredientCost(ri, ing) : 0;
        return { name: ing?.name, cost };
      }).sort((a, b) => b.cost - a.cost);
      
      const topIngredient = ingredientCosts[0];
      if (topIngredient && topIngredient.name && topIngredient.cost > 0) {
        // Calculate percentage relative to total ingredients cost of the recipe
        // Since topIngredient is part of totalIngredientsCost, the ratio is always <= 1
        const percent = (topIngredient.cost / totalIngredientsCost) * 100;
        insights.push(`O custo do ${topIngredient.name} representa ${formatNumber(percent)}% do custo dos ingredientes da receita ${firstRecipe.name}.`);
      }
    }
  }

  if (totalRecipes > 0) {
    insights.push(`Um reajuste médio de 5% nos preços aumentaria seu lucro total estimado em aproximadamente ${formatCurrency(totalEstimatedRevenue * 0.05)}.`);
  }

  // Gráfico de Lucro
  const chartData = sortedByTotalProfit.slice(0, 8).map(item => ({
    name: item.recipe.name.length > 15 ? item.recipe.name.substring(0, 12) + '...' : item.recipe.name,
    fullName: item.recipe.name,
    lucro: item.metrics.netProfitTotal,
    faturamento: item.metrics.targetTotalRevenue
  }));

  const healthScore = averageMargin >= 60 ? "Saudável" : averageMargin >= 40 ? "Em Observação" : "Crítico";
  const healthColor = averageMargin >= 60 ? "bg-mint text-white" : averageMargin >= 40 ? "bg-amber-500 text-white" : "bg-pink text-white";

  const handleOpenSimulator = (recipe: any) => {
    setSimulatingRecipe(recipe);
    setSimulatedMarkup(recipe.profitMultiplier || 3);
    setIsSimulatorOpen(true);
  };

  const getSimulatedMetrics = () => {
    if (!simulatingRecipe) return null;
    
    const totalCost = getRecipeTotalCost(simulatingRecipe, ingredients);
    const qtyProduced = Math.max(1, (simulatingRecipe.weightPerUnit > 0 ? Math.floor(simulatingRecipe.finalWeight / simulatingRecipe.weightPerUnit) : 1));
    const costPerUnit = totalCost / qtyProduced;
    
    const currentPrice = simulatingRecipe.targetPricePerUnit;
    const newPrice = costPerUnit * simulatedMarkup;
    
    const currentProfit = currentPrice - costPerUnit;
    const newProfit = newPrice - costPerUnit;
    
    return {
      currentPrice,
      newPrice,
      currentProfit,
      newProfit,
      impact: currentProfit !== 0 ? ((newProfit / currentProfit) - 1) * 100 : 0
    };
  };

  const simulatedMetrics = getSimulatedMetrics();

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Análise Inteligente</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {totalRecipes === 0 
              ? "Bem-vindo! Cadastre receitas para gerar insights automáticos." 
              : `Consolidado de ${totalRecipes} receitas com margem média de ${formatNumber(averageMargin)}%.`}
          </p>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={() => handleOpenSimulator(recipes[0])}
             disabled={totalRecipes === 0}
             className="hidden sm:inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-sm transition-all disabled:opacity-50"
           >
             <Zap size={18} />
             <span>Simulador de Preço</span>
           </button>
        </div>
      </header>

      {/* 1. INDICADORES PRINCIPAIS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Faturamento Total" 
          value={formatCurrency(totalEstimatedRevenue)} 
          icon={<DollarSign size={20} />} 
          subtitle="Projeção Mensal"
          color="pink"
        />
        <MetricCard 
          title="Lucro Líquido" 
          value={formatCurrency(totalEstimatedProfit)} 
          icon={<TrendingUp size={20} />} 
          subtitle="Soma do Catálogo"
          color="mint"
        />
        <MetricCard 
          title="Margem Média" 
          value={`${formatNumber(averageMargin)}%`} 
          icon={<PieChart size={20} />} 
          subtitle="Rentabilidade"
          color="indigo"
        />
        <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-sm flex flex-col justify-between">
           <div className="flex justify-between items-start">
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Saúde do Catálogo</p>
             <HeartPulse size={20} className="text-pink" />
           </div>
           <div className="mt-4">
             <div className="flex items-center gap-2 mb-1">
               <div className={cn("w-3 h-3 rounded-full animate-pulse", 
                 averageMargin >= 50 ? "bg-mint" : averageMargin >= 35 ? "bg-amber-400" : "bg-pink"
               )} />
               <span className="text-lg font-black">{healthScore}</span>
             </div>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Baseado na margem média</p>
           </div>
        </div>
      </div>

      {/* 2. DASHBOARD INTELIGENTE DE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* CHAMPION */}
        {championRecipe ? (
          <DashboardCard
            type="champion"
            title="Receita Campeã"
            recipeName={championRecipe.recipe.name}
            dataLabel="Lucro Total Estimado"
            dataValue={formatCurrency(championRecipe.metrics.netProfitTotal)}
            footerLabel="Lucro por unid."
            footerValue={formatCurrency(championRecipe.metrics.netProfitUnit)}
            insight="Maior geração de lucro atual."
            icon={<Trophy className="text-yellow-500" />}
            link={`/receitas/${championRecipe.recipe.id}`}
          />
        ) : <EmptyCard title="Receita Campeã" />}

        {/* READJUSTMENT */}
        {readjustmentOpportunity ? (
          <DashboardCard
            type="opportunity"
            title="Oportunidade de Reajuste"
            recipeName={readjustmentOpportunity.recipe.name}
            dataLabel="Preço Sugerido"
            dataValue={formatCurrency(readjustmentOpportunity.suggestedPrice)}
            footerLabel="Preço Atual"
            footerValue={formatCurrency(readjustmentOpportunity.recipe.targetPricePerUnit)}
            insight="Potencial para aumento de preço."
            icon={<Target className="text-blue-500" />}
            link={`/receitas/${readjustmentOpportunity.recipe.id}`}
            onSimulate={() => handleOpenSimulator(readjustmentOpportunity.recipe)}
          />
        ) : <EmptyCard title="Oportunidades" />}

        {/* ALERT */}
        {alertRecipe ? (
          <DashboardCard
            type="alert"
            title="Atenção: Margem Baixa"
            recipeName={alertRecipe.recipe.name}
            dataLabel="Margem Atual"
            dataValue={`${formatNumber(alertRecipe.metrics.profitMargin)}%`}
            footerLabel="Meta Mínima"
            footerValue="40%"
            insight="Revisar custos e ingredientes."
            icon={<AlertTriangle className="text-pink" />}
            link={`/receitas/${alertRecipe.recipe.id}`}
            isCritical
          />
        ) : <EmptyCard title="Alertas" />}

        {/* UNDERESTIMATED */}
        {underestimatedRecipe ? (
          <DashboardCard
            type="gem"
            title="Receita Subestimada"
            recipeName={underestimatedRecipe.recipe.name}
            dataLabel="Margem Real"
            dataValue={`${formatNumber(underestimatedRecipe.metrics.profitMargin)}%`}
            footerLabel="Preço de Mercado"
            footerValue={formatCurrency(underestimatedRecipe.recipe.targetPricePerUnit)}
            insight="Alta rentabilidade com preço baixo."
            icon={<Sparkles className="text-indigo-500" />}
            link={`/receitas/${underestimatedRecipe.recipe.id}`}
          />
        ) : <EmptyCard title="Destaques" />}
      </div>

      {/* 3. GRÁFICOS E RANKINGS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRÁFICO RECEITA X LUCRO */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2">
                <BarChart3 size={18} className="text-indigo-500" /> Receitas x Lucro Total
              </h3>
              <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-indigo-500 rounded-sm" /> Lucro</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-slate-200 dark:bg-slate-700 rounded-sm" /> Faturamento</div>
              </div>
           </div>
           
           <div className="h-[300px] w-full">
             {totalRecipes > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData} layout="vertical" margin={{ left: 5, right: 30, top: 0, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                   <XAxis type="number" hide />
                   <YAxis 
                     dataKey="name" 
                     type="category" 
                     axisLine={false} 
                     tickLine={false} 
                     width={100} 
                     tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }} 
                   />
                   <Tooltip 
                     cursor={false}
                     content={({ active, payload, label }) => {
                       if (active && payload && payload.length) {
                         const fullName = payload[0].payload.fullName || label;
                         return (
                           <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 text-slate-900 dark:text-white">
                             <p className="font-black mb-2 text-[11px] truncate max-w-[200px] leading-tight">{fullName}</p>
                             <div className="space-y-1.5 min-w-[140px]">
                               {payload.map((entry: any, index: number) => {
                                 const isLucro = entry.dataKey === 'lucro';
                                 const value = Number(entry.value);
                                 const color = isLucro 
                                   ? (value > 0 ? '#10b981' : '#ef4444') 
                                   : '#3b82f6';
                                 
                                 return (
                                   <div key={index} className="flex items-center justify-between gap-2">
                                     <span className="text-[10px] font-bold" style={{ color }}>
                                       {isLucro ? 'Lucro' : 'Faturamento'}:
                                     </span>
                                     <span className="text-[10px] font-black">
                                       {formatCurrency(value)}
                                     </span>
                                   </div>
                                 );
                               })}
                             </div>
                           </div>
                         );
                       }
                       return null;
                     }}
                   />
                   <Bar dataKey="lucro" fill="#4F46E5" radius={[0, 4, 4, 0]} barSize={12} activeBar={false} />
                   <Bar dataKey="faturamento" fill="#E2E8F0" radius={[0, 4, 4, 0]} barSize={6} activeBar={false} />
                 </BarChart>
               </ResponsiveContainer>
             ) : (
               <div className="flex items-center justify-center h-full text-slate-400 text-xs font-bold uppercase tracking-widest">
                 Sem dados para gerar gráfico
               </div>
             )}
           </div>
        </div>

        {/* RANKING DE LUCRO REAL */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
           <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white mb-6 flex items-center gap-2">
             <Trophy size={18} className="text-amber-500" /> Ranking de Lucro Real
           </h3>
           <div className="space-y-3 flex-1 overflow-auto max-h-[300px] pr-2">
              {sortedByNetProfitUnit.slice(0, 10).map((item, idx) => (
                <div key={item.recipe.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors hover:border-slate-200 dark:hover:border-slate-700 group">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-black",
                      idx === 0 ? "bg-yellow-100 text-yellow-700" : idx === 1 ? "bg-slate-200 text-slate-600" : idx === 2 ? "bg-orange-100 text-orange-700" : "bg-white dark:bg-slate-900 text-slate-400"
                    )}>
                      {idx + 1}
                    </span>
                    <Link to={`/receitas/${item.recipe.id}`} className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">
                      {item.recipe.name}
                    </Link>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(item.metrics.netProfitUnit)}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lucro Unid.</p>
                  </div>
                </div>
              ))}
              {totalRecipes === 0 && (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                  Cadastre receitas
                </div>
              )}
           </div>
        </div>
      </div>

      {/* 4. INSIGHTS DINÂMICOS DO PRODIN */}
      <div className="bg-indigo-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/10 rounded-full blur-2xl -ml-10 -mb-10" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-indigo-500/30 rounded-2xl">
              <Lightbulb size={24} className="text-indigo-200" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Insights do Prodin</h3>
              <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest">Inteligência Orientada a Dados</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.length > 0 ? insights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-4 p-4 bg-white/10 hover:bg-white/15 rounded-2xl border border-white/10 backdrop-blur-sm transition-all">
                <Sparkles size={18} className="text-indigo-300 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-indigo-50 leading-relaxed">{insight}</p>
              </div>
            )) : (
              <div className="col-span-2 text-center py-6 text-indigo-300 font-bold uppercase tracking-widest text-xs">
                Aguardando mais dados para gerar novos insights
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SIMULADOR MODAL */}
      {isSimulatorOpen && simulatingRecipe && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsSimulatorOpen(false)} />
            <div className="relative bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl w-full max-w-md rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-300">
               <div className="p-6">
                  <header className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-indigo-100 dark:bg-indigo-500/10 rounded-xl text-indigo-600">
                         <Zap size={20} />
                       </div>
                       <h2 className="text-lg font-black text-slate-800 dark:text-white">Simulador de Preço</h2>
                    </div>
                    <button onClick={() => setIsSimulatorOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                      <X size={24} />
                    </button>
                  </header>

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 mb-6">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Simulando para:</p>
                     <h3 className="text-md font-bold text-slate-800 dark:text-white">{simulatingRecipe.name}</h3>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Multiplicador de Lucro</label>
                        <span className="text-sm font-black text-indigo-600">{simulatedMarkup.toFixed(1)}x</span>
                      </div>
                      <input 
                        type="range" 
                        min="1.5" 
                        max="8" 
                        step="0.1" 
                        value={simulatedMarkup} 
                        onChange={(e) => setSimulatedMarkup(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Preço Atual</p>
                         <p className="text-sm font-black text-slate-800 dark:text-white">{formatCurrency(simulatedMetrics?.currentPrice || 0)}</p>
                       </div>
                       <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/30 rounded-2xl">
                         <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Preço Simulado</p>
                         <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(simulatedMetrics?.newPrice || 0)}</p>
                       </div>
                    </div>

                    <div className="bg-indigo-600 p-6 rounded-2xl text-white">
                       <div className="flex justify-between items-center mb-4">
                         <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Impacto no Lucro</p>
                         <div className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-black">
                           {simulatedMetrics && simulatedMetrics.impact >= 0 ? '+' : ''}{formatNumber(simulatedMetrics?.impact || 0)}%
                         </div>
                       </div>
                       <div className="flex justify-between items-end">
                         <div>
                           <p className="text-xs opacity-70 mb-0.5">Lucro Anterior</p>
                           <p className="text-sm font-bold opacity-80">{formatCurrency(simulatedMetrics?.currentProfit || 0)}</p>
                         </div>
                         <ArrowRight className="opacity-50 mb-1" />
                         <div className="text-right">
                           <p className="text-xs opacity-70 mb-0.5">Novo Lucro</p>
                           <p className="text-xl font-black">{formatCurrency(simulatedMetrics?.newProfit || 0)}</p>
                         </div>
                       </div>
                    </div>

                    <button 
                      onClick={() => setIsSimulatorOpen(false)}
                      className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-black transition-transform active:scale-95"
                    >
                      Fechar Simulador
                    </button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon, subtitle, color = 'mint' }: { title: string, value: string | number, icon: React.ReactNode, subtitle: string, color?: string }) {
  const themes: Record<string, string> = {
    pink: 'bg-pink-soft/30 dark:bg-slate-900/40 border-pink-100 dark:border-pink-900/20 text-pink-700 dark:text-pink-400 icon-pink',
    mint: 'bg-mint-soft/30 dark:bg-slate-900/40 border-mint-100 dark:border-mint-900/20 text-mint-700 dark:text-mint-400 icon-mint',
    indigo: 'bg-indigo-50 dark:bg-slate-900/40 border-indigo-100 dark:border-indigo-900/20 text-indigo-700 dark:text-indigo-400 icon-indigo',
    yellow: 'bg-yellow-50 dark:bg-slate-900/40 border-yellow-100 dark:border-yellow-900/20 text-yellow-700 dark:text-yellow-400 icon-yellow'
  };

  const themeClass = themes[color] || themes.indigo;

  return (
    <div className={cn("p-5 rounded-[28px] border shadow-sm flex flex-col", themeClass)}>
       <div className="flex justify-between items-start mb-4">
         <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{title}</p>
         <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800 shadow-sm">{icon}</div>
       </div>
       <div>
         <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white truncate">{value}</h2>
         <p className="text-[10px] sm:text-[11px] mt-1 font-bold opacity-60 uppercase">{subtitle}</p>
       </div>
    </div>
  );
}

function DashboardCard({ type, title, recipeName, dataLabel, dataValue, footerLabel, footerValue, insight, icon, link, isCritical = false, onSimulate }: any) {
  const cardThemes: Record<string, string> = {
    champion: "border-yellow-200 dark:border-yellow-900/30 bg-yellow-50/50 dark:bg-slate-900 shadow-sm",
    opportunity: "border-blue-200 dark:border-blue-900/30 bg-blue-50/50 dark:bg-slate-900 shadow-sm",
    alert: "border-pink-200 dark:border-pink-900/30 bg-pink-50/50 dark:bg-slate-900 shadow-sm",
    gem: "border-indigo-200 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-slate-900 shadow-sm"
  };

  return (
    <div className={cn("p-6 rounded-[32px] border flex flex-col justify-between h-full group transition-all hover:shadow-lg", cardThemes[type])}>
       <div>
         <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
              {title}
            </h3>
            <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm">{icon}</div>
         </div>
         
         <Link to={link} className="block group-hover:transform group-hover:translate-x-1 transition-transform">
           <h4 className="text-lg font-black text-slate-800 dark:text-white leading-tight mb-4">{recipeName}</h4>
         </Link>

         <div className="space-y-3 mb-6">
            <div className="flex justify-between items-end border-b border-white/50 dark:border-slate-800/50 pb-2">
               <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{dataLabel}</span>
               <span className={cn("text-md font-black", isCritical ? "text-pink" : "text-slate-800 dark:text-white")}>{dataValue}</span>
            </div>
            <div className="flex justify-between items-end">
               <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{footerLabel}</span>
               <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{footerValue}</span>
            </div>
         </div>
       </div>

       <div>
         <div className={cn("p-3 rounded-2xl flex items-center gap-2 mb-4", isCritical ? "bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400" : "bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300")}>
            <Info size={14} className="shrink-0" />
            <p className="text-[10px] font-bold leading-tight">{insight}</p>
         </div>

         {onSimulate ? (
           <button 
             onClick={onSimulate}
             className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-colors"
           >
             <Zap size={14} /> Simular Preço
           </button>
         ) : (
           <Link to={link} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black hover:opacity-90 transition-opacity">
             Ver Detalhes <ArrowRight size={14} />
           </Link>
         )}
       </div>
    </div>
  );
}

function EmptyCard({ title }: { title: string }) {
  return (
    <div className="p-6 rounded-[32px] border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-center">
       <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
         <Info size={20} />
       </div>
       <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{title}</h3>
       <p className="text-[10px] text-slate-400">Aguardando dados</p>
    </div>
  );
}
