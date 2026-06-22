import { useParams, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { formatCurrency, formatNumber } from "../lib/utils";
import { ArrowLeft, Edit2, Download, AlertTriangle, TrendingUp, DollarSign, Package, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { CurrencyInput } from "../components/ui/CurrencyInput";

export default function ExtraDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { extras, updateExtra, addToast } = useStore();
  
  const extra = extras.find(e => e.id === id);

  const [simulatedPrice, setSimulatedPrice] = useState(0);

  useEffect(() => {
    if (extra && extra.targetPricePerUnit) {
      setSimulatedPrice(extra.targetPricePerUnit);
    }
  }, [extra]);

  if (!extra) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-xl text-slate-500 dark:text-slate-400">Item extra não encontrado.</p>
        <button onClick={() => navigate('/extra')} className="mt-4 text-indigo-600 dark:text-indigo-400">Voltar para extras</button>
      </div>
    );
  }

  const unitCost = (extra.pricePaid || 0) / (extra.quantityBought || 1);
  const targetMult = extra.profitMultiplier || 2;
  const actualMultiplier = unitCost > 0 ? simulatedPrice / unitCost : 0;
  const netProfitUnit = simulatedPrice - unitCost;
  const profitMargin = simulatedPrice > 0 ? (netProfitUnit / simulatedPrice) * 100 : 0;
  const meetsTarget = simulatedPrice >= unitCost * targetMult;
  const isLoss = simulatedPrice < unitCost;

  const handleSavePrice = () => {
    const originalPrice = extra.targetPricePerUnit;
    updateExtra(extra.id, { targetPricePerUnit: simulatedPrice });
    addToast({
      message: "Preço de venda atualizado!",
      type: "success",
      onUndo: () => {
        updateExtra(extra.id, { targetPricePerUnit: originalPrice });
        setSimulatedPrice(originalPrice || 0);
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-3 pb-20">
      <header className="flex items-center justify-between no-print">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/extra')} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">{extra.name}</h1>
            <p className="text-slate-500 dark:text-slate-400">{extra.category || 'Sem categoria'}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button 
             onClick={handlePrint}
             className="inline-flex items-center space-x-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2 rounded-xl transition-colors font-medium border border-slate-200 dark:border-slate-700"
          >
            <Download size={20} />
            <span className="hidden sm:inline">Exportar PDF</span>
          </button>
          <button 
             onClick={() => navigate('/extra')} // We'll handle editing by going back to list and opening modal if needed, or implement separate edit route
             className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
          >
            <Edit2 size={20} />
            <span className="hidden sm:inline">Gerenciar Item</span>
          </button>
        </div>
      </header>

      {/* Print header visible only on print */}
      <div className="hidden print:block mb-8">
        <h1 className="text-4xl font-bold text-slate-900">{extra.name}</h1>
        <p className="text-lg text-slate-600">Ficha de Custo e Precificação de Item Extra</p>
      </div>

      {!meetsTarget && !isLoss && (
         <div className="bg-amber-50 dark:bg-amber-500/10 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-start space-x-3 no-print">
            <AlertTriangle className="text-amber-500 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <h3 className="font-medium text-amber-800 dark:text-amber-400">Atenção ao Lucro</h3>
              <p className="text-amber-700 dark:text-amber-300/80 text-sm mt-1">
                O preço de venda simulado ({formatCurrency(simulatedPrice)}) não atinge seu multiplicador desejado de {targetMult}x. 
                O multiplicador atual é de {formatNumber(actualMultiplier)}x.
              </p>
            </div>
         </div>
      )}

      {isLoss && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border-l-4 border-rose-500 p-4 rounded-r-xl flex items-start space-x-3 no-print">
          <AlertTriangle className="text-rose-500 mt-0.5 flex-shrink-0" size={20} />
          <div>
            <h3 className="font-medium text-rose-800 dark:text-rose-400">Prejuízo Detectado!</h3>
            <p className="text-rose-700 dark:text-rose-300/80 text-sm mt-1">
              O preço de venda ({formatCurrency(simulatedPrice)}) é inferior ao custo de aquisição ({formatCurrency(unitCost)}).
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left Col - Data */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
               <h3 className="text-lg font-bold text-slate-900 dark:text-white">Dados da Compra</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                 <div>
                   <p className="text-xs text-slate-500 dark:text-slate-500 uppercase font-black mb-1">Marca</p>
                   <p className="font-bold text-slate-900 dark:text-white">{extra.brand || 'N/A'}</p>
                 </div>
                 <div>
                   <p className="text-xs text-slate-500 dark:text-slate-500 uppercase font-black mb-1">Quantidade Adquirida</p>
                   <p className="font-bold text-slate-900 dark:text-white">{formatNumber(extra.quantityBought)} {extra.unit}</p>
                 </div>
                 <div>
                   <p className="text-xs text-slate-500 dark:text-slate-500 uppercase font-black mb-1">Conteúdo por Unidade</p>
                   <p className="font-bold text-slate-900 dark:text-white">{extra.weightPerUn ? formatNumber(extra.weightPerUn) : '-'}{extra.weightPerUnUnit}</p>
                 </div>
                 <div>
                   <p className="text-xs text-slate-500 dark:text-slate-500 uppercase font-black mb-1">Preço Total Pago</p>
                   <p className="font-bold text-rose-600 dark:text-rose-400 text-lg">{formatCurrency(extra.pricePaid)}</p>
                 </div>
                 <div>
                   <p className="text-xs text-slate-500 dark:text-slate-500 uppercase font-black mb-1">Custo por Unidade</p>
                   <p className="font-bold text-rose-600 dark:text-rose-400 text-lg">{formatCurrency(unitCost)}</p>
                 </div>
              </div>
              
              {extra.notes && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-500 uppercase font-black mb-1">Observações</p>
                  <p className="text-slate-700 dark:text-slate-300 italic">{extra.notes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 no-print">
            <div className="flex items-center gap-2 mb-6">
              <Package size={20} className="text-indigo-600" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Resumo e Escala</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                 <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Rendimento (Estoque)</p>
                 <p className="text-2xl font-black text-slate-900 dark:text-white">{extra.quantityBought} <span className="text-sm font-normal text-slate-500">un</span></p>
               </div>
               <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                 <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Custo Conteúdo (Total)</p>
                 <p className="text-2xl font-black text-slate-900 dark:text-white">{((extra.weightPerUn || 0) * extra.quantityBought).toFixed(0)} <span className="text-sm font-normal text-slate-500">{extra.weightPerUnUnit}</span></p>
               </div>
            </div>
          </div>
        </div>

        {/* Right Col - Simulator & Totals */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-pink to-pink-soft rounded-2xl shadow-lg p-6 text-white no-print">
             <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><TrendingUp size={20}/> Simulador de Venda</h3>
             
             <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-pink-100 mb-2">Preço de Venda Definido</label>
                  <div className="relative">
                    <CurrencyInput 
                      value={simulatedPrice || 0}
                      onChangeValue={val => setSimulatedPrice(val)}
                      className="w-full pl-4 pr-4 py-3 bg-white/10 border border-white/20 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-lg font-bold transition-shadow"
                    />
                  </div>
                  {simulatedPrice !== extra.targetPricePerUnit && (
                    <button 
                      onClick={handleSavePrice}
                      className="mt-2 w-full py-2 bg-white text-pink rounded-lg font-medium text-sm hover:bg-pink-soft/20 transition-colors"
                    >
                      Salvar Novo Preço
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/10 rounded-xl p-4">
                    <p className="text-[10px] text-pink-100 uppercase font-bold">Faturamento Est.</p>
                    <p className="text-xl font-bold mt-1">{formatCurrency(simulatedPrice * extra.quantityBought)}</p>
                  </div>
                  <div className="bg-black/10 rounded-xl p-4">
                    <p className="text-[10px] text-pink-100 uppercase font-bold">Lucro Líquido</p>
                    <p className="text-xl font-bold mt-1">{formatCurrency(netProfitUnit * extra.quantityBought)}</p>
                  </div>
                  <div className="bg-black/10 rounded-xl p-4">
                    <p className="text-[10px] text-pink-100 uppercase font-bold">Margem</p>
                    <p className="text-xl font-bold mt-1">{formatNumber(profitMargin)}%</p>
                  </div>
                  <div className="bg-black/10 rounded-xl p-4">
                    <p className="text-[10px] text-pink-100 uppercase font-bold">Multiplicador</p>
                    <p className="text-xl font-bold mt-1">{formatNumber(actualMultiplier)}x</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/20">
                  <p className="text-sm text-pink-100 italic">
                    Lucro por unidade: <strong className="text-white">{formatCurrency(netProfitUnit)}</strong>
                  </p>
                </div>
             </div>
          </div>

          {/* Validation Alerts matching RecipeDetails */}
          <div className="no-print">
            {isLoss ? (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    <h3 className="font-bold text-rose-900 dark:text-rose-300">Preço gera prejuízo.</h3>
                    <p className="text-sm text-rose-800 dark:text-rose-200 mt-1">
                      Você está perdendo <strong>{formatCurrency(Math.abs(netProfitUnit))}</strong> por unidade.
                    </p>
                  </div>
                </div>
              </div>
            ) : !meetsTarget ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    <h3 className="font-bold text-amber-900 dark:text-amber-300">Atenção ao Lucro</h3>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                      Este preço não atinge o multiplicador desejado de {targetMult}x. Recomendado: <strong>{formatCurrency(unitCost * targetMult)}</strong>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                <div className="flex items-start gap-3">
                  <CheckCircle className="text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    <h3 className="font-bold text-emerald-900 dark:text-emerald-300">Excelente!</h3>
                    <p className="text-sm text-emerald-800 dark:text-emerald-200 mt-1">
                      O preço atinge a meta de lucro definida para este item.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

           {/* Static View for Printing */}
           <div className="hidden print:block space-y-4">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-300 pb-2">Precificação</h3>
              <div className="flex justify-between"><span className="text-slate-600">Preço de Venda Definido (Unidade):</span> <span className="font-bold">{formatCurrency(simulatedPrice)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Lucro por Unidade:</span> <span>{formatCurrency(netProfitUnit)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Margem de Lucro:</span> <span>{profitMargin.toFixed(1)}%</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Faturamento Estimado (Total Estoque):</span> <span>{formatCurrency(simulatedPrice * extra.quantityBought)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Lucro Total Estimado:</span> <span>{formatCurrency(netProfitUnit * extra.quantityBought)}</span></div>
           </div>

        </div>
      </div>
    </div>
  )
}
