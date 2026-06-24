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
  formatIngredientQuantity,
} from "../lib/utils";
import {
  ArrowLeft,
  Edit2,
  Download,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Package,
  CheckCircle,
  Trash2,
  Share2,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { CurrencyInput } from "../components/ui/CurrencyInput";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import ShareRecipeModal from "../components/shares/ShareRecipeModal";

export default function RecipeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    recipes,
    ingredients,
    updateRecipe,
    deleteRecipe,
    addRecipe,
    addToast,
    showModal,
  } = useStore();

  const recipe = recipes.find((r) => r.id === id);

  const [simulatedPrice, setSimulatedPrice] = useState(0);
  const [sharingRecipe, setSharingRecipe] = useState(false);

  useEffect(() => {
    if (recipe) {
      setSimulatedPrice(recipe.targetPricePerUnit);
    }
  }, [recipe]);

  if (!recipe) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-xl text-slate-500 dark:text-slate-400">
          Receita não encontrada.
        </p>
        <button
          onClick={() => navigate("/receitas")}
          className="mt-4 text-indigo-600 dark:text-indigo-400"
        >
          Voltar para receitas
        </button>
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
      },
    });
  };

  const pdfRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (!pdfRef.current) return;

    try {
      addToast({
        message: "Preparando documento informativo...",
        type: "info",
      });

      const element = pdfRef.current;

      const desktopWidth = 1024;
      
      // Store original inline styles
      const originalWidth = element.style.width;
      const originalMaxWidth = element.style.maxWidth;
      const originalPadding = element.style.padding;
      
      // Force desktop size
      element.style.width = `${desktopWidth}px`;
      element.style.maxWidth = `${desktopWidth}px`;
      element.style.padding = "20px";
      
      // Allow DOM to update layout before capturing
      await new Promise(resolve => setTimeout(resolve, 50));

      const filter = (node: HTMLElement) => {
        if (node.classList && node.classList.contains("no-print")) {
          return false;
        }
        if (node.hasAttribute && node.hasAttribute("data-html2canvas-ignore")) {
          return false;
        }
        return true;
      };

      const dataUrl = await toPng(element, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        filter: filter,
      });

      const pdfWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgWidth = element.offsetWidth;
      const imgHeight = element.offsetHeight;

      // Restore original styles
      element.style.width = originalWidth;
      element.style.maxWidth = originalMaxWidth;
      element.style.padding = originalPadding;

      // Calculate scaled height matching A4 width
      const scaledImgHeight = (imgHeight * pdfWidth) / imgWidth;

      const pdf = new jsPDF("p", "mm", "a4");

      let heightLeft = scaledImgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(dataUrl, "PNG", 0, position, pdfWidth, scaledImgHeight);
      heightLeft -= pageHeight;

      // Add subsequent pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - scaledImgHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, "PNG", 0, position, pdfWidth, scaledImgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Ficha_Tecnica_${recipe.name.replace(/\s+/g, "_")}.pdf`);

      addToast({ message: "Download do PDF concluído!", type: "success" });
    } catch (error) {
      console.error("PDF Export Error:", error);
      addToast({
        message:
          "Ocorreu um erro ao gerar o PDF. Tente novamente ou use o atalho de impressão (Ctrl+P).",
        type: "warning",
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

  const handleDelete = () => {
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
        navigate("/receitas");
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-3 pb-20 px-4 sm:px-6 lg:px-8 mt-4">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/receitas")}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
              {recipe.name}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 truncate">
              {recipe.category || "Sem categoria"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSharingRecipe(true)}
            className="inline-flex items-center space-x-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2 rounded-xl transition-colors font-medium border border-slate-200 dark:border-slate-700 shadow-sm grow sm:grow-0"
            title="Compartilhar"
          >
            <Share2 size={20} />
            <span className="hidden sm:inline">Compartilhar</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center space-x-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2 rounded-xl transition-colors font-medium border border-slate-200 dark:border-slate-700 shadow-sm grow sm:grow-0"
          >
            <Download size={20} />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={() => navigate(`/receitas/${recipe.id}/editar`)}
            className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm shadow-indigo-600/20 grow sm:grow-0"
          >
            <Edit2 size={20} />
            <span className="hidden sm:inline">Editar</span>
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center justify-center p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-transparent rounded-xl transition-colors"
            title="Excluir"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </header>

      {/* Recipe Capture Area */}
      <div
        ref={pdfRef}
        className="space-y-3 sm:p-8 bg-white dark:bg-transparent rounded-3xl"
      >
        <div className="hidden print:block sm:block mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {recipe.name}
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mt-2">
            Ficha Técnica e Precificação
          </p>
          <div className="h-1.5 w-24 bg-indigo-600 mt-4 rounded-full"></div>
        </div>

        {!metrics.meetsTarget && (
          <div
            className="bg-amber-50 dark:bg-amber-500/10 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-start space-x-3 no-print"
            data-html2canvas-ignore="true"
          >
            <AlertTriangle
              className="text-amber-500 mt-0.5 flex-shrink-0"
              size={20}
            />
            <div>
              <h3 className="font-medium text-amber-800 dark:text-amber-400">
                Atenção ao Lucro
              </h3>
              <p className="text-amber-700 dark:text-amber-300/80 text-sm mt-1">
                O preço de venda simulado ({formatCurrency(simulatedPrice)}) não
                atinge seu multiplicador desejado de {recipe.profitMultiplier}x.
                O multiplicador atual é de{" "}
                {formatNumber(metrics.actualMultiplier)}x.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Col - Data */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Ingredientes Utilizados
                </h3>
              </div>
              <div className="w-full text-left text-sm flex flex-col">
                {/* Header */}
                <div className="flex items-center px-4 py-3 sm:px-6 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium">
                  <div className="w-[55%] pr-2">Ingrediente</div>
                  <div className="w-[25%] pr-2">Qtd Usada</div>
                  <div className="w-[20%] text-right">Custo</div>
                </div>
                {/* Body */}
                <div className="divide-y divide-slate-200 dark:divide-slate-700 flex flex-col">
                  {recipe.ingredients.map((ri) => {
                    const ing = ingredients.find(
                      (i) => i.id === ri.ingredientId,
                    );
                    if (!ing) return null;
                    const unitCost = getIngredientUnitCost(ing);
                    const cost = unitCost * ri.quantityUsed; // Assumes units are normalized correctly via input
                    return (
                      <div
                        key={ri.id}
                        className="flex items-center px-4 py-4 sm:px-6"
                      >
                        <div
                          className="w-[55%] pr-2 font-medium text-slate-900 dark:text-white truncate"
                          title={ing.name}
                        >
                          {ing.name}
                        </div>
                        <div className="w-[25%] pr-2 text-slate-600 dark:text-slate-300 flex flex-col items-start justify-center min-w-0">
                          <span className="truncate w-full">
                            {formatIngredientQuantity(
                              ri.quantityUsed,
                              ri.unit || ing.unit,
                            )}
                          </span>
                          {ri.unit === "un" &&
                            ing.unit === "un" &&
                            ing.weightPerUn &&
                            ing.weightPerUn > 0 && (
                              <span
                                className="text-xs text-indigo-500 font-medium truncate w-full"
                                title={`(${formatIngredientQuantity(ri.quantityUsed * ing.weightPerUn, ing.weightPerUnUnit || "g")})`}
                              >
                                (
                                {formatIngredientQuantity(
                                  ri.quantityUsed * ing.weightPerUn,
                                  ing.weightPerUnUnit || "g",
                                )}
                                )
                              </span>
                            )}
                        </div>
                        <div
                          className="w-[20%] text-slate-600 dark:text-slate-300 text-right truncate"
                          title={formatCurrency(
                            getRecipeIngredientCost(ri, ing),
                          )}
                        >
                          {formatCurrency(getRecipeIngredientCost(ri, ing))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Footer */}
                <div className="flex items-center px-4 py-4 sm:px-6 bg-slate-50 dark:bg-slate-900/50">
                  <div className="w-[80%] font-bold text-slate-900 dark:text-white text-right pr-4">
                    Custo total de ingredientes:
                  </div>
                  <div
                    className="w-[20%] font-bold text-indigo-600 dark:text-indigo-400 text-right truncate"
                    title={formatCurrency(ingCost)}
                  >
                    {formatCurrency(ingCost)}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Custos Extras
                </h3>
              </div>
              <div className="w-full text-left text-sm flex flex-col">
                <div className="divide-y divide-slate-200 dark:divide-slate-700 flex flex-col">
                  {recipe.extraCosts.length === 0 ? (
                    <div className="px-4 py-4 sm:px-6 text-slate-500 dark:text-slate-400">
                      Nenhum custo extra cadastrado.
                    </div>
                  ) : (
                    recipe.extraCosts.map((ec) => (
                      <div
                        key={ec.id}
                        className="flex items-center px-4 py-4 sm:px-6"
                      >
                        <div
                          className="w-[80%] pr-4 font-medium text-slate-900 dark:text-white truncate"
                          title={ec.name}
                        >
                          {ec.name}
                        </div>
                        <div
                          className="w-[20%] text-slate-600 dark:text-slate-300 text-right truncate"
                          title={formatCurrency(ec.value)}
                        >
                          {formatCurrency(ec.value)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {/* Footer */}
                <div className="flex items-center px-4 py-4 sm:px-6 bg-slate-50 dark:bg-slate-900/50">
                  <div className="w-[80%] font-bold text-slate-900 dark:text-white text-right pr-4">
                    Custo extra total:
                  </div>
                  <div
                    className="w-[20%] font-bold text-rose-600 dark:text-rose-400 text-right truncate"
                    title={formatCurrency(extCost)}
                  >
                    {formatCurrency(extCost)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Col - Simulator & Totals */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 sm:p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                Resumo de Produção
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400 flex-1 min-w-0 break-words leading-tight mt-0.5">
                    Peso Total
                  </span>
                  <span className="font-medium text-slate-900 dark:text-white shrink-0 text-right">
                    {formatNumber(recipe.finalWeight)} g/ml
                  </span>
                </div>
                <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400 flex-1 min-w-0 break-words leading-tight mt-0.5">
                    Peso por Unidade
                  </span>
                  <span className="font-medium text-slate-900 dark:text-white shrink-0 text-right">
                    {formatNumber(recipe.weightPerUnit)} g/ml
                  </span>
                </div>
                <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-700 bg-indigo-50/50 dark:bg-indigo-500/5 p-3 rounded-lg">
                  <span className="font-medium text-indigo-900 dark:text-indigo-300 flex-1 min-w-0 break-words leading-tight mt-0.5">
                    Rendimento
                  </span>
                  <span className="font-bold text-lg text-indigo-600 dark:text-indigo-400 shrink-0 text-right">
                    {formatNumber(qtyProduced)} unidades
                  </span>
                </div>
                <div className="flex justify-between items-start gap-4 pt-2">
                  <span className="text-slate-500 dark:text-slate-400 flex-1 min-w-0 break-words leading-tight mt-0.5">
                    Custo Total da Receita
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white shrink-0 text-right">
                    {formatCurrency(totalCost)}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-4">
                  <span className="text-slate-500 dark:text-slate-400 flex-1 min-w-0 break-words leading-tight mt-0.5">
                    Custo por Unidade
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white shrink-0 text-right">
                    {formatCurrency(metrics.costPerUnit)}
                  </span>
                </div>
              </div>
            </div>

            <div
              className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl shadow-lg p-6 text-white no-print"
              data-html2canvas-ignore="true"
            >
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <TrendingUp size={20} /> Simulador de Venda
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-indigo-100 mb-2">
                    Preço de Venda (Unidade)
                  </label>
                  <div className="relative">
                    <CurrencyInput
                      value={simulatedPrice || 0}
                      onChangeValue={(val) => handleSimulatedPriceChange(val)}
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

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-black/20 rounded-xl p-3 sm:p-4 flex flex-col justify-between">
                    <p className="text-[10px] sm:text-xs text-indigo-200 uppercase tracking-wider mb-1">
                      Faturamento Est.
                    </p>
                    <p
                      className="text-lg sm:text-xl font-bold truncate"
                      title={formatCurrency(metrics.targetTotalRevenue)}
                    >
                      {formatCurrency(metrics.targetTotalRevenue)}
                    </p>
                  </div>
                  <div className="bg-black/20 rounded-xl p-3 sm:p-4 flex flex-col justify-between">
                    <p className="text-[10px] sm:text-xs text-indigo-200 uppercase tracking-wider mb-1">
                      Lucro Líquido
                    </p>
                    <p
                      className="text-lg sm:text-xl font-bold truncate"
                      title={formatCurrency(metrics.netProfitTotal)}
                    >
                      {formatCurrency(metrics.netProfitTotal)}
                    </p>
                  </div>
                  <div className="bg-black/20 rounded-xl p-3 sm:p-4 flex flex-col justify-between">
                    <p className="text-[10px] sm:text-xs text-indigo-200 uppercase tracking-wider mb-1">
                      Margem
                    </p>
                    <p
                      className="text-lg sm:text-xl font-bold truncate"
                      title={`${formatNumber(metrics.profitMargin)}%`}
                    >
                      {formatNumber(metrics.profitMargin)}%
                    </p>
                  </div>
                  <div className="bg-black/20 rounded-xl p-3 sm:p-4 flex flex-col justify-between">
                    <p className="text-[10px] sm:text-xs text-indigo-200 uppercase tracking-wider mb-1">
                      Multiplicador
                    </p>
                    <p
                      className="text-lg sm:text-xl font-bold truncate"
                      title={`${formatNumber(metrics.actualMultiplier)}x`}
                    >
                      {formatNumber(metrics.actualMultiplier)}x
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/20">
                  <p className="text-sm text-indigo-100 italic">
                    Lucro por unidade:{" "}
                    <strong className="text-white">
                      {formatCurrency(metrics.netProfitUnit)}
                    </strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Validation Alerts matching RecipeForm */}
            {(() => {
              if (!simulatedPrice || simulatedPrice <= 0) return null;

              if (metrics.isLoss) {
                return (
                  <div
                    className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 no-print"
                    data-html2canvas-ignore="true"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle
                        className="text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0"
                        size={20}
                      />
                      <div>
                        <h3 className="font-bold text-rose-900 dark:text-rose-300">
                          ATENÇÃO: O preço informado gera prejuízo.
                        </h3>
                        <p className="text-sm text-rose-800 dark:text-rose-200 mt-1">
                          Preço mínimo necessário para cobrir custos:{" "}
                          <strong>{formatCurrency(metrics.costPerUnit)}</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              if (!metrics.meetsTarget) {
                return (
                  <div
                    className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 no-print"
                    data-html2canvas-ignore="true"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle
                        className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
                        size={20}
                      />
                      <div>
                        <h3 className="font-bold text-amber-900 dark:text-amber-300">
                          Atenção ao Lucro
                        </h3>
                        <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                          Este preço não atinge o multiplicador desejado de{" "}
                          {recipe.profitMultiplier}x. Atual é de{" "}
                          {formatNumber(metrics.actualMultiplier)}x.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 no-print"
                  data-html2canvas-ignore="true"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle
                      className="text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0"
                      size={20}
                    />
                    <div>
                      <h3 className="font-bold text-emerald-900 dark:text-emerald-300">
                        Excelente!
                      </h3>
                      <p className="text-sm text-emerald-800 dark:text-emerald-200 mt-1">
                        O preço atinge a meta de lucro definida.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Static View for Printing / PDF / Tela */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 sm:p-6 mt-6">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-3 sm:pb-4 mb-4 sm:mb-6">
                Resumo de Precificação
              </h3>
              <div className="space-y-4 sm:space-y-5">
                <div className="flex justify-between items-start gap-4">
                  <span className="text-slate-600 dark:text-slate-400 font-medium flex-1 min-w-0 break-words leading-tight mt-0.5">
                    Preço de Venda Definido:
                  </span>
                  <span className="font-black text-lg text-slate-900 dark:text-white text-right shrink-0">
                    {formatCurrency(recipe.targetPricePerUnit)}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-4">
                  <span className="text-slate-600 dark:text-slate-400 font-medium flex-1 min-w-0 break-words leading-tight mt-0.5">
                    Faturamento Estimado:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-right shrink-0">
                    {formatCurrency(metrics.targetTotalRevenue)}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-4">
                  <span className="text-slate-600 dark:text-slate-400 font-medium flex-1 min-w-0 break-words leading-tight mt-0.5">
                    Lucro Líquido total:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-right shrink-0">
                    {formatCurrency(metrics.netProfitTotal)}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-4">
                  <span className="text-slate-600 dark:text-slate-400 font-medium flex-1 min-w-0 break-words leading-tight mt-0.5">
                    Margem de Lucro:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-right shrink-0">
                    {formatNumber(metrics.profitMargin)}%
                  </span>
                </div>
                <div className="flex justify-between items-start gap-4">
                  <span className="text-slate-600 dark:text-slate-400 font-medium flex-1 min-w-0 break-words leading-tight mt-0.5">
                    Multiplicador:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-right shrink-0">
                    {formatNumber(metrics.actualMultiplier)}x
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {sharingRecipe && (
        <ShareRecipeModal
          recipe={recipe}
          onClose={() => setSharingRecipe(false)}
        />
      )}
    </div>
  );
}
