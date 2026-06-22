import React from "react";
import { useStore } from "../store/useStore";
import { 
  getRecipeTotalCost, 
  getActualMetrics,
  formatCurrency,
  formatNumber,
  cn
} from "../lib/utils";
import { Link } from "react-router-dom";
import { PlusCircle, TrendingUp, DollarSign, Package, PieChart, Lightbulb, CheckCircle, HeartPulse, Rocket, Info, Crown, Trophy, AlertTriangle } from "lucide-react";

export default function Dashboard() {
  const { recipes, ingredients, extras } = useStore();

  const totalRecipes = recipes.length;
  
  let totalEstimatedRevenue = 0;
  let totalEstimatedProfit = 0;
  let totalCostSum = 0;
  let highMarginCount = 0;
  let profitableRecipesCount = 0;

  const recipeStats = recipes.map(recipe => {
    const metrics = getActualMetrics(recipe, ingredients);
    
    totalEstimatedRevenue += metrics.targetTotalRevenue;
    totalEstimatedProfit += metrics.netProfitTotal;
    totalCostSum += getRecipeTotalCost(recipe, ingredients);

    if (metrics.profitMargin > 0) profitableRecipesCount++;
    if (metrics.profitMargin >= 60) highMarginCount++;

    return {
      recipe,
      metrics
    };
  });

  const sortedByMargin = [...recipeStats].sort((a, b) => b.metrics.profitMargin - a.metrics.profitMargin);
  const sortedByProfit = [...recipeStats].sort((a, b) => b.metrics.netProfitUnit - a.metrics.netProfitUnit);

  const mostProfitableRecipe = sortedByMargin.length > 0 ? sortedByMargin[0].recipe : null;

  const averageCost = totalRecipes > 0 ? totalCostSum / totalRecipes : 0;
  const averageMargin = totalEstimatedRevenue > 0 ? (totalEstimatedProfit / totalEstimatedRevenue) * 100 : 0;

  const needsAttention: { recipe: any; reason: string }[] = [];
  if (totalRecipes > 1) {
    sortedByMargin.forEach(item => {
      if (item.metrics.profitMargin < 20) {
        needsAttention.push({ recipe: item.recipe, reason: `Margem muito baixa (${formatNumber(item.metrics.profitMargin)}%). Revisar o preço de venda.`});
      } else if (item.metrics.netProfitUnit <= 0) {
         needsAttention.push({ recipe: item.recipe, reason: `Gerando prejuízo de ${formatCurrency(Math.abs(item.metrics.netProfitUnit))} por unidade.`});
      } else if (item.metrics.profitMargin < averageMargin - 15) {
        needsAttention.push({ recipe: item.recipe, reason: `Margem (${formatNumber(item.metrics.profitMargin)}%) está bem abaixo da sua média.`});
      }
    });
  }

  const getWelcomeMessage = () => {
    if (totalRecipes === 0) {
      return "Bem-vindo ao Prodin! Cadastre sua primeira receita para começar a acompanhar seus resultados.";
    }
    return `Bom trabalho! Você possui ${totalRecipes} ${totalRecipes === 1 ? 'receita cadastrada' : 'receitas cadastradas'} e uma margem média de ${formatNumber(averageMargin)}%. Continue acompanhando seus resultados para aumentar a lucratividade.`;
  };

  let healthStatus = "Sem Dados";
  let healthClassification = "Cadastre receitas";
  let healthColor = "text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400";

  if (totalRecipes > 0) {
    if (averageMargin >= 60) {
      healthStatus = "Excelente";
      healthClassification = "Negócio Saudável";
      healthColor = "text-mint-700 bg-mint/20 dark:text-mint-300 dark:bg-mint-500/20";
    } else if (averageMargin >= 40) {
      healthStatus = "Boa";
      healthClassification = "Bem Alinhado";
      healthColor = "text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-500/20";
    } else if (averageMargin >= 20) {
      healthStatus = "Atenção";
      healthClassification = "Margem Apertada";
      healthColor = "text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-500/20";
    } else {
      healthStatus = "Alerta";
      healthClassification = "Revisar Preços";
      healthColor = "text-pink-700 bg-pink-100 dark:text-pink-300 dark:bg-pink-500/20";
    }
  }

  const nextActions = [];
  if (totalRecipes === 0) {
    nextActions.push("Cadastre sua primeira receita para visualizar indicadores e análises de saúde do negócio.");
  } else if (totalRecipes === 1) {
    nextActions.push("Cadastre mais receitas para desbloquear comparativos e evoluir suas análises.");
  } else if (totalRecipes < 3) {
    nextActions.push("Amplie seu catálogo de receitas para obter insights mais precisos e globais do negócio.");
  }

  if (totalRecipes > 0 && extras.length === 0) {
    nextActions.push("Cadastre embalagens ou extras para projetar o custo final e precificar seus kits com precisão.");
  }

  if (totalRecipes > 0 && nextActions.length < 3) {
    nextActions.push("Utilize o Simulador de Kits para organizar sua produção de forma estratégica e descobrir novas oportunidades de venda.");
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-brown dark:text-white mb-2">Visão Estratégica</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            {getWelcomeMessage()}
          </p>
        </div>
        <Link 
          to="/receitas/nova"
          className="inline-flex items-center justify-center space-x-2 bg-pink hover:bg-pink-600 text-white px-5 py-3 rounded-xl font-bold shadow-soft transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <PlusCircle size={20} />
          <span>Nova Receita</span>
        </Link>
      </header>

      {/* 1. INDICADORES PRINCIPAIS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard 
          title="Lucro Total Estimado" 
          value={formatCurrency(totalEstimatedProfit)} 
          icon={<TrendingUp size={22} className="text-white" />} 
          subtitle="Projetado"
          color="mint-solid"
        />
        <MetricCard 
          title="Faturamento Total" 
          value={formatCurrency(totalEstimatedRevenue)} 
          icon={<DollarSign size={22} className="text-pink dark:text-pink-400" />} 
          subtitle="Potencial Estimado"
          color="pink"
        />
         <MetricCard 
          title="Receitas Cadastradas" 
          value={`${totalRecipes} ${totalRecipes === 1 ? 'receita' : 'receitas'}`} 
          icon={<Package size={22} className="text-yellow-600 dark:text-yellow-500" />} 
          subtitle="Ativas no sistema"
          color="yellow"
        />
        <MetricCard 
          title="Custo Médio" 
          value={formatCurrency(averageCost)} 
          icon={<PieChart size={22} className="text-brown dark:text-brown-300" />} 
          subtitle="Das receitas"
          color="brown"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SAÚDE DO NEGÓCIO */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col">
           <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest mb-5 flex items-center gap-2">
             <HeartPulse size={16} className="text-pink" /> Saúde do Negócio
           </h3>
           <div className="flex-1 space-y-5">
             <div className="flex flex-col items-center justify-center py-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
               <div className={cn("px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-2", healthColor)}>
                 {healthStatus}
               </div>
               <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{healthClassification}</span>
             </div>
             <div className="space-y-3 pt-1">
               <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800/50">
                 <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Margem Média</span>
                 <span className="text-sm font-black text-slate-800 dark:text-white">{formatNumber(averageMargin)}%</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Receitas Rentáveis</span>
                 <span className="text-sm font-black text-slate-800 dark:text-white">{profitableRecipesCount} de {totalRecipes}</span>
               </div>
             </div>
           </div>
        </div>

        {/* PRÓXIMAS AÇÕES */}
        <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
           <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
             <Rocket size={16} className="text-blue-500 dark:text-blue-400" /> Próximas Ações
           </h3>
           <div className="space-y-3">
             {nextActions.map((action, idx) => (
               <div key={idx} className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-slate-700">
                 <div className="p-1.5 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-500 dark:text-blue-400 shrink-0 mt-0.5">
                   <CheckCircle size={16} />
                 </div>
                 <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                   {action}
                 </p>
               </div>
             ))}
           </div>
        </div>
      </div>

      {/* INSIGHTS DO PRODIN */}
      <div className="bg-indigo-50/50 dark:bg-indigo-500/10 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-500/20">
         <h3 className="text-xs font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest mb-5 flex items-center gap-2">
           <Lightbulb size={16} className="text-indigo-500" /> Insights do Prodin
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {totalRecipes === 0 ? (
             <div className="md:col-span-2 lg:col-span-3 flex items-center gap-3 p-4 bg-white dark:bg-slate-900/50 rounded-xl border border-indigo-50 dark:border-indigo-500/20 shadow-sm">
               <span className="text-indigo-500 shrink-0"><Info size={18} /></span>
               <p className="text-xs font-medium text-indigo-900 dark:text-indigo-200">Você ainda não tem receitas cadastradas. Insights estratégicos aparecerão aqui após os primeiros cadastros.</p>
             </div>
           ) : (
             <>
               {totalRecipes > 1 && mostProfitableRecipe && (
                 <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-900/50 rounded-xl border border-indigo-50 dark:border-indigo-500/20 shadow-sm">
                   <span className="text-indigo-500 shrink-0 mt-0.5"><TrendingUp size={16} /></span>
                   <p className="text-xs font-medium text-indigo-900 dark:text-indigo-200 leading-relaxed">
                     Sua receita com maior margem é <strong>{mostProfitableRecipe.name}</strong> ({formatNumber(sortedByMargin[0].metrics.profitMargin)}%).
                   </p>
                 </div>
               )}
               {totalRecipes > 1 && sortedByMargin.length > 1 && sortedByMargin[0].metrics.profitMargin > sortedByMargin[sortedByMargin.length - 1].metrics.profitMargin && (
                 <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-900/50 rounded-xl border border-indigo-50 dark:border-indigo-500/20 shadow-sm">
                   <span className="text-indigo-500 shrink-0 mt-0.5"><PieChart size={16} /></span>
                   <p className="text-xs font-medium text-indigo-900 dark:text-indigo-200 leading-relaxed">
                     A diferença entre sua melhor e pior margem é de <strong>{formatNumber(sortedByMargin[0].metrics.profitMargin - sortedByMargin[sortedByMargin.length - 1].metrics.profitMargin)}%</strong>.
                   </p>
                 </div>
               )}
               {highMarginCount > 0 && (
                 <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-900/50 rounded-xl border border-indigo-50 dark:border-indigo-500/20 shadow-sm">
                   <span className="text-indigo-500 shrink-0 mt-0.5"><CheckCircle size={16} /></span>
                   <p className="text-xs font-medium text-indigo-900 dark:text-indigo-200 leading-relaxed">
                     Você possui <strong>{highMarginCount} {highMarginCount === 1 ? 'receita' : 'receitas'}</strong> com margem rentável acima de 60%.
                   </p>
                 </div>
               )}
               {averageMargin >= 50 && (
                 <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-900/50 rounded-xl border border-indigo-50 dark:border-indigo-500/20 shadow-sm">
                   <span className="text-indigo-500 shrink-0 mt-0.5"><DollarSign size={16} /></span>
                   <p className="text-xs font-medium text-indigo-900 dark:text-indigo-200 leading-relaxed">
                     Sua margem média está na faixa saudável e recomendada para o segmento.
                   </p>
                 </div>
               )}
               {totalRecipes === 1 && (
                 <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-900/50 rounded-xl border border-indigo-50 dark:border-indigo-500/20 shadow-sm">
                   <span className="text-indigo-500 shrink-0 mt-0.5"><Info size={16} /></span>
                   <p className="text-xs font-medium text-indigo-900 dark:text-indigo-200 leading-relaxed">
                     Seu catálogo ainda possui poucas receitas para análises comparativas aprofundadas.
                   </p>
                 </div>
               )}
               {totalRecipes > 0 && averageMargin < 30 && (
                 <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-900/50 rounded-xl border border-pink-100 dark:border-pink-500/20 shadow-sm">
                   <span className="text-pink shrink-0 mt-0.5"><Info size={16} /></span>
                   <p className="text-xs font-medium text-pink-700 dark:text-pink-300 leading-relaxed">
                     Sua margem média está abaixo do ideal. Considere revisar seus custos ou preços de venda.
                   </p>
                 </div>
               )}
             </>
           )}
         </div>
      </div>

      {/* RANKINGS E OPORTUNIDADES */}
      {totalRecipes > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* DESTAQUE E OPORTUNIDADES (Esquerda) */}
          <div className="lg:col-span-1 space-y-4">
             {/* 👑 RECEITA DESTAQUE */}
             {sortedByMargin[0] && (
               <div className="bg-gradient-to-br from-yellow-50 to-amber-100/50 dark:from-yellow-900/20 dark:to-amber-900/10 p-6 rounded-3xl shadow-sm border border-yellow-200/50 dark:border-yellow-700/30 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10">
                   <Trophy size={64} className="text-yellow-600 dark:text-yellow-400" />
                 </div>
                 <h3 className="text-[10px] font-black text-yellow-800 dark:text-yellow-500 mb-4 uppercase tracking-widest flex items-center gap-2">
                   <Crown size={16} className="text-yellow-500" /> Receita Destaque
                 </h3>
                 <div className="relative z-10">
                    <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2">{sortedByMargin[0].recipe.name}</h4>
                    <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium mb-4 pb-4 border-b border-yellow-200 dark:border-yellow-700/50">Esta é atualmente sua receita mais rentável.</p>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-white/50 dark:bg-black/20 p-2 rounded-lg">
                        <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Margem</span>
                        <span className="text-xs font-black text-mint-600 dark:text-mint-400">{formatNumber(sortedByMargin[0].metrics.profitMargin)}%</span>
                      </div>
                      <div className="flex justify-between items-center bg-white/50 dark:bg-black/20 p-2 rounded-lg">
                        <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Lucro (Unid.)</span>
                        <span className="text-xs font-black text-mint-600 dark:text-mint-400">{formatCurrency(sortedByMargin[0].metrics.netProfitUnit)}</span>
                      </div>
                      <div className="flex justify-between items-center bg-white/50 dark:bg-black/20 p-2 rounded-lg">
                        <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Preço (Unid.)</span>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">{formatCurrency(sortedByMargin[0].recipe.targetPricePerUnit)}</span>
                      </div>
                    </div>
                    <Link to={`/receitas/${sortedByMargin[0].recipe.id}`} className="mt-4 block text-center text-xs font-bold text-yellow-700 dark:text-yellow-400 bg-yellow-200/50 dark:bg-yellow-800/30 rounded-xl py-2 hover:bg-yellow-200 dark:hover:bg-yellow-800/50 transition-colors">
                      Ver Detalhes
                    </Link>
                 </div>
               </div>
             )}

             {/* ⚠️ OPORTUNIDADES DE MELHORIA */}
             {needsAttention.length > 0 && (
                <div className="bg-pink-50/50 dark:bg-pink-900/10 p-6 rounded-3xl border border-pink-100 dark:border-pink-500/20">
                   <h3 className="text-[10px] font-black text-pink-700 dark:text-pink-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                     <AlertTriangle size={16} /> Oportunidades de Melhoria
                   </h3>
                   <div className="space-y-3">
                     {needsAttention.slice(0,3).map(item => (
                       <div key={item.recipe.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-pink-100 dark:border-pink-500/20 shadow-sm flex flex-col gap-1">
                         <span className="font-bold text-slate-800 dark:text-white text-xs">{item.recipe.name}</span>
                         <span className="text-[10px] text-pink-600 dark:text-pink-400">{item.reason}</span>
                       </div>
                     ))}
                   </div>
                </div>
             )}
          </div>

          {/* RANKINGS (Direita) */}
          <div className="lg:col-span-2 space-y-4">
             {/* RANKING POR MARGEM */}
             <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-5">
                   <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                     <PieChart size={16} className="text-indigo-500" /> Top Receitas por Margem
                   </h3>
                </div>
                <div className="space-y-2">
                   {sortedByMargin.slice(0, 5).map((item, index) => (
                      <div key={item.recipe.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                        <div className="flex items-center gap-3">
                          <span className={cn("flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-black shrink-0", index === 0 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" : index === 1 ? "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300" : index === 2 ? "bg-brown-100 text-brown dark:bg-brown-900/30 dark:text-brown-400" : "bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500")}>
                            {index + 1}º
                          </span>
                          <Link to={`/receitas/${item.recipe.id}`} className="font-bold text-sm text-slate-700 dark:text-slate-200 hover:text-pink dark:hover:text-pink-400 transition-colors truncate max-w-[150px] sm:max-w-[200px]">
                            {item.recipe.name}
                          </Link>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden hidden sm:block shrink-0">
                            <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${Math.min(100, Math.max(0, item.metrics.profitMargin))}%` }} />
                          </div>
                          <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm min-w-[60px] text-right">{formatNumber(item.metrics.profitMargin)}%</span>
                        </div>
                      </div>
                   ))}
                </div>
                {sortedByMargin.length > 5 && (
                  <button className="w-full mt-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    [ Ver Ranking Completo ]
                  </button>
                )}
             </div>

             {/* RANKING POR LUCRO */}
             <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-5">
                   <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                     <DollarSign size={16} className="text-mint" /> Top Receitas por Lucro
                   </h3>
                </div>
                <div className="space-y-2">
                   {sortedByProfit.slice(0, 5).map((item, index) => (
                      <div key={item.recipe.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                        <div className="flex items-center gap-3">
                          <span className={cn("flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-black shrink-0", index === 0 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" : index === 1 ? "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300" : index === 2 ? "bg-brown-100 text-brown dark:bg-brown-900/30 dark:text-brown-400" : "bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500")}>
                            {index + 1}º
                          </span>
                          <Link to={`/receitas/${item.recipe.id}`} className="font-bold text-sm text-slate-700 dark:text-slate-200 hover:text-pink dark:hover:text-pink-400 transition-colors truncate max-w-[150px] sm:max-w-[200px]">
                            {item.recipe.name}
                          </Link>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase hidden sm:block">Por unidade</span>
                          <span className="font-black text-mint-600 dark:text-mint-400 text-sm min-w-[70px] text-right">{formatCurrency(item.metrics.netProfitUnit)}</span>
                        </div>
                      </div>
                   ))}
                </div>
                {sortedByProfit.length > 5 && (
                  <button className="w-full mt-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    [ Ver Ranking Completo ]
                  </button>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon, subtitle, color = 'mint' }: { title: string, value: string | number, icon: React.ReactNode, subtitle: string, color?: string }) {
  const isSolid = color === 'mint-solid';
  
  const bgClass = isSolid ? 'bg-mint dark:bg-mint-600' : {
    pink: 'bg-pink-soft/80 dark:bg-slate-900',
    mint: 'bg-mint-soft/80 dark:bg-slate-900',
    yellow: 'bg-yellow-soft/80 dark:bg-slate-900',
    brown: 'bg-brown-soft/80 dark:bg-slate-900'
  }[color] || 'bg-slate-50 dark:bg-slate-900';

  const borderColor = isSolid ? 'border-mint' : {
    pink: 'border-pink/20 dark:border-pink-500/20',
    mint: 'border-mint/20 dark:border-mint-500/20',
    yellow: 'border-yellow/20 dark:border-yellow-500/20',
    brown: 'border-brown/20 dark:border-brown-500/20'
  }[color] || 'border-slate-200 dark:border-slate-800';

  const iconBg = isSolid ? 'bg-white/20' : {
    pink: 'bg-white/60 dark:bg-pink-900/40',
    mint: 'bg-white/60 dark:bg-mint-900/40',
    yellow: 'bg-white/60 dark:bg-yellow-900/40',
    brown: 'bg-white/60 dark:bg-brown-900/40'
  }[color] || 'bg-slate-50';

  const textColor = isSolid ? 'text-white' : 'text-slate-800 dark:text-white';
  const subtitleColor = isSolid ? 'text-white/80' : 'text-slate-500 dark:text-slate-400';
  const titleColor = isSolid ? 'text-white/90' : 'text-slate-500 dark:text-slate-400';

  return (
    <div className={cn("p-4 sm:p-6 rounded-3xl shadow-sm border transition-shadow hover:shadow-md", bgClass, borderColor)}>
       <div className="flex justify-between items-start gap-2">
         <p className={cn("text-[9px] sm:text-[10px] font-black uppercase tracking-widest leading-tight mt-1", titleColor)}>{title}</p>
         <div className={cn("p-2.5 rounded-xl shrink-0", iconBg)}>{icon}</div>
       </div>
       <div className="mt-2">
         <h2 className={cn("text-xl sm:text-3xl font-black tracking-tight truncate", textColor)}>{value}</h2>
         <p className={cn("text-[10px] sm:text-[11px] mt-1.5 font-bold", subtitleColor)}>{subtitle}</p>
       </div>
    </div>
  )
}


