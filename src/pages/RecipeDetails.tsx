import { useParams, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { 
  formatCurrency, 
  getActualMetrics, 
  getQuantityProduced,
  getRecipeTotalCost,
  getRecipeIngredientsCost,
  getRecipeIngredientCost,
  getRecipeExtraCosts,
  getIngredientUnitCost,
  formatNumber,
  formatIngredientQuantity
} from "../lib/utils";
import { ArrowLeft, Edit2, Download, AlertTriangle, TrendingUp, DollarSign, Package, CheckCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { CurrencyInput } from "../components/ui/CurrencyInput";
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

export default function RecipeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { recipes, ingredients, updateRecipe, addToast } = useStore();
  
  const recipe = recipes.find(r => r.id === id);

  const [simulatedPrice, setSimulatedPrice] = useState(0);

  useEffect(() => {
    if (recipe) {
      setSimulatedPrice(recipe.targetPricePerUnit);
    }
  }, [recipe]);

  if (!recipe) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-xl text-slate-500 dark:text-slate-400">Receita não encontrada.</p>
        <button onClick={() => navigate('/receitas')} className="mt-4 text-indigo-600 dark:text-indigo-400">Voltar para receitas</button>
      </div>
    );
  }

  const handleSimulatedPriceChange = (val: number) => {
    setSimulatedPrice(val);
  };

  const handleSavePrice = () => {
    const originalPrice = recipe.targetPricePerUnit;
    updateRecipe(recipe.id, { targetPricePerUnit: simulatedPrice });
    addToast({
      message: "Preço de venda atualizado!",
      type: "success",
      onUndo: () => {
        updateRecipe(recipe.id, { targetPricePerUnit: originalPrice });
        setSimulatedPrice(originalPrice);
      }
    });
  };

  const pdfRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (!pdfRef.current) return;

    try {
      addToast({ message: "Preparando documento informativo...", type: "info" });
      
      const element = pdfRef.current;
      
      // Select elements to ignore entirely
      const filter = (node: HTMLElement) => {
        const exclusionClasses = ['no-print'];
        if (node.classList && exclusionClasses.some(cls => node.classList.contains(cls))) {
          return false;
        }
        if (node.hasAttribute && node.hasAttribute('data-html2canvas-ignore')) {
          return false;
        }
        return true;
      };

      const dataUrl = await toPng(element, { 
        quality: 0.98,
        pixelRatio: 2, 
        backgroundColor: '#ffffff',
        filter: filter,
        style: {
          padding: '20px' // Add some padding inside the image
        }
      });
      
      const pdfWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgWidth = element.offsetWidth;
      const imgHeight = element.offsetHeight;
      
      // Calculate scaled height matching A4 width
      const scaledImgHeight = (imgHeight * pdfWidth) / imgWidth;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      let heightLeft = scaledImgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, scaledImgHeight);
      heightLeft -= pageHeight;

      // Add subsequent pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - scaledImgHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, scaledImgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`Ficha_Tecnica_${recipe.name.replace(/\s+/g, '_')}.pdf`);
      
      addToast({ message: "Download do PDF concluído!", type: "success" });
    } catch (error) {
      console.error("PDF Export Error:", error);
      addToast({ 
        message: "Ocorreu um erro ao gerar o PDF. Tente novamente ou use o atalho de impressão (Ctrl+P).", 
        type: "warning" 
      });
    }
  };

  const simulatedRecipe = { ...recipe, targetPricePerUnit: simulatedPrice };
  const metrics = getActualMetrics(simulatedRecipe, ingredients);
  const totalCost = getRecipeTotalCost(recipe, ingredients);
  const qtyProduced = getQuantityProduced(recipe);
  const ingCost = getRecipeIngredientsCost(recipe, ingredients);
  const extCost = getRecipeExtraCosts(recipe);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 px-4 sm:px-6 lg:px-8 mt-4">
      <header className="flex items-center justify-between no-print mb-6">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/receitas')} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{recipe.name}</h1>
            <p className="text-slate-500 dark:text-slate-400">{recipe.category || 'Sem categoria'}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button 
             onClick={handleExportPDF}
             className="inline-flex items-center space-x-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2 rounded-xl transition-colors font-medium border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <Download size={20} />
            <span className="hidden sm:inline">Exportar PDF</span>
          </button>
          <button 
             onClick={() => navigate(`/receitas/${recipe.id}/editar`)}
             className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm shadow-indigo-600/20"
          >
            <Edit2 size={20} />
            <span className="hidden sm:inline">Editar Receita</span>
          </button>
        </div>
      </header>

      {/* Recipe Capture Area */}
      <div ref={pdfRef} className="space-y-6 sm:p-8 bg-white dark:bg-transparent rounded-3xl">
        <div className="hidden print:block sm:block mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">{recipe.name}</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mt-2">Ficha Técnica e Precificação</p>
          <div className="h-1.5 w-24 bg-indigo-600 mt-4 rounded-full"></div>
        </div>

        {!metrics.meetsTarget && (
           <div className="bg-amber-50 dark:bg-amber-500/10 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-start space-x-3 no-print" data-html2canvas-ignore="true">
            <AlertTriangle className="text-amber-500 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <h3 className="font-medium text-amber-800 dark:text-amber-400">Atenção ao Lucro</h3>
              <p className="text-amber-700 dark:text-amber-300/80 text-sm mt-1">
                O preço de venda simulado ({formatCurrency(simulatedPrice)}) não atinge seu multiplicador desejado de {recipe.profitMultiplier}x. 
                O multiplicador atual é de {formatNumber(metrics.actualMultiplier)}x.
              </p>
            </div>
         </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col - Data */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
               <h3 className="text-lg font-bold text-slate-900 dark:text-white">Ingredientes Utilizados</h3>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Ingrediente</th>
                  <th className="px-6 py-3 font-medium">Qtd Usada</th>
                  <th className="px-6 py-3 font-medium text-right">Custo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                 {recipe.ingredients.map(ri => {
                    const ing = ingredients.find(i => i.id === ri.ingredientId);
                    if (!ing) return null;
                    const unitCost = getIngredientUnitCost(ing);
                    const cost = unitCost * ri.quantityUsed; // Assumes units are normalized correctly via input
                    return (
                      <tr key={ri.id}>
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{ing.name}</td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                            <div className="flex items-center gap-1">
                              {formatIngredientQuantity(ri.quantityUsed, ri.unit || ing.unit)}
                              {ri.unit === 'un' && ing.unit === 'un' && ing.weightPerUn && ing.weightPerUn > 0 && (
                                <span className="text-xs text-indigo-500 font-medium">
                                  ({formatIngredientQuantity(ri.quantityUsed * ing.weightPerUn, ing.weightPerUnUnit || 'g')})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-right">{formatCurrency(getRecipeIngredientCost(ri, ing))}</td>
                      </tr>
                    )
                 })}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-900/50">
                 <tr>
                   <td colSpan={2} className="px-6 py-4 font-bold text-slate-900 dark:text-white text-right">Custo total de ingredientes:</td>
                   <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400 text-right">{formatCurrency(ingCost)}</td>
                 </tr>
              </tfoot>
            </table>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
               <h3 className="text-lg font-bold text-slate-900 dark:text-white">Custos Extras</h3>
            </div>
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                 {recipe.extraCosts.length === 0 ? (
                   <tr>
                     <td className="px-6 py-4 text-slate-500 dark:text-slate-400">Nenhum custo extra cadastrado.</td>
                   </tr>
                 ) : (
                   recipe.extraCosts.map(ec => (
                      <tr key={ec.id}>
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{ec.name}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-right">{formatCurrency(ec.value)}</td>
                      </tr>
                   ))
                 )}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-900/50">
                 <tr>
                   <td className="px-6 py-4 font-bold text-slate-900 dark:text-white text-right">Custo extra total:</td>
                   <td className="px-6 py-4 font-bold text-rose-600 dark:text-rose-400 text-right">{formatCurrency(extCost)}</td>
                 </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Right Col - Simulator & Totals */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
             <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Resumo de Produção</h3>
             
             <div className="space-y-4">
               <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-700">
                 <span className="text-slate-500 dark:text-slate-400">Peso Total</span>
                 <span className="font-medium text-slate-900 dark:text-white">{formatNumber(recipe.finalWeight)} g/ml</span>
               </div>
               <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-700">
                 <span className="text-slate-500 dark:text-slate-400">Peso por Unidade</span>
                 <span className="font-medium text-slate-900 dark:text-white">{formatNumber(recipe.weightPerUnit)} g/ml</span>
               </div>
               <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-700 bg-indigo-50/50 dark:bg-indigo-500/5 p-3 rounded-lg">
                 <span className="font-medium text-indigo-900 dark:text-indigo-300">Rendimento</span>
                 <span className="font-bold text-lg text-indigo-600 dark:text-indigo-400">{formatNumber(qtyProduced)} unidades</span>
               </div>
               <div className="flex justify-between items-center pt-2">
                 <span className="text-slate-500 dark:text-slate-400">Custo Total da Receita</span>
                 <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(totalCost)}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-slate-500 dark:text-slate-400">Custo por Unidade</span>
                 <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(metrics.costPerUnit)}</span>
               </div>
             </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl shadow-lg p-6 text-white no-print" data-html2canvas-ignore="true">
             <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><TrendingUp size={20}/> Simulador de Venda</h3>
             
             <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-indigo-100 mb-2">Preço de Venda (Unidade)</label>
                  <div className="relative">
                    <CurrencyInput 
                      value={simulatedPrice || 0}
                      onChangeValue={val => handleSimulatedPriceChange(val)}
                      className="w-full pl-4 pr-4 py-3 bg-white/10 border border-white/20 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-lg font-bold transition-shadow"
                    />
                  </div>
                  {simulatedPrice !== recipe.targetPricePerUnit && (
                    <button 
                      onClick={handleSavePrice}
                      className="mt-2 w-full py-2 bg-white text-indigo-600 rounded-lg font-medium text-sm hover:bg-indigo-50 transition-colors"
                    >
                      Salvar Novo Preço
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/20 rounded-xl p-4">
                    <p className="text-xs text-indigo-200">Faturamento Est.</p>
                    <p className="text-xl font-bold mt-1">{formatCurrency(metrics.targetTotalRevenue)}</p>
                  </div>
                  <div className="bg-black/20 rounded-xl p-4">
                    <p className="text-xs text-indigo-200">Lucro Líquido</p>
                    <p className="text-xl font-bold mt-1">{formatCurrency(metrics.netProfitTotal)}</p>
                  </div>
                  <div className="bg-black/20 rounded-xl p-4">
                    <p className="text-xs text-indigo-200">Margem</p>
                    <p className="text-xl font-bold mt-1">{formatNumber(metrics.profitMargin)}%</p>
                  </div>
                  <div className="bg-black/20 rounded-xl p-4">
                    <p className="text-xs text-indigo-200">Multiplicador</p>
                    <p className="text-xl font-bold mt-1">{formatNumber(metrics.actualMultiplier)}x</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/20">
                  <p className="text-sm text-indigo-100 italic">
                    Lucro por unidade: <strong className="text-white">{formatCurrency(metrics.netProfitUnit)}</strong>
                  </p>
                </div>
             </div>
          </div>

          {/* Validation Alerts matching RecipeForm */}
          {(() => {
            if (!simulatedPrice || simulatedPrice <= 0) return null;

            if (metrics.isLoss) {
              return (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 no-print" data-html2canvas-ignore="true">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0" size={20} />
                    <div>
                      <h3 className="font-bold text-rose-900 dark:text-rose-300">ATENÇÃO: O preço informado gera prejuízo.</h3>
                      <p className="text-sm text-rose-800 dark:text-rose-200 mt-1">
                        Preço mínimo necessário para cobrir custos: <strong>{formatCurrency(metrics.costPerUnit)}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            if (!metrics.meetsTarget) {
              return (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 no-print" data-html2canvas-ignore="true">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" size={20} />
                    <div>
                      <h3 className="font-bold text-amber-900 dark:text-amber-300">Atenção ao Lucro</h3>
                      <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                        Este preço não atinge o multiplicador desejado de {recipe.profitMultiplier}x. Atual é de {formatNumber(metrics.actualMultiplier)}x.
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 no-print" data-html2canvas-ignore="true">
                <div className="flex items-start gap-3">
                  <CheckCircle className="text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    <h3 className="font-bold text-emerald-900 dark:text-emerald-300">Excelente!</h3>
                    <p className="text-sm text-emerald-800 dark:text-emerald-200 mt-1">
                      O preço atinge a meta de lucro definida.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

           {/* Static View for Printing / PDF */}
           <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-700 mt-10">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-300 dark:border-slate-600 pb-2">Resumo de Precificação</h3>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600 dark:text-slate-400">Preço de Venda Definido:</span> 
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(recipe.targetPricePerUnit)}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600 dark:text-slate-400">Faturamento Estimado:</span> 
                <span className="text-slate-900 dark:text-white">{formatCurrency(metrics.targetTotalRevenue)}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600 dark:text-slate-400">Lucro Líquido total:</span> 
                <span className="text-slate-900 dark:text-white">{formatCurrency(metrics.netProfitTotal)}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600 dark:text-slate-400">Margem de Lucro:</span> 
                <span className="text-slate-900 dark:text-white">{formatNumber(metrics.profitMargin)}%</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600 dark:text-slate-400">Multiplicador:</span> 
                <span className="text-slate-900 dark:text-white">{formatNumber(metrics.actualMultiplier)}x</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  </div>
  )
}
