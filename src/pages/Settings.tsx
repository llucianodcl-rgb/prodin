import { useStore } from "../store/useStore";
import { Moon, Sun, ArrowRight, Save, Upload, Download } from "lucide-react";
import { useState, useEffect } from "react";

export default function Settings() {
  const { 
    theme, 
    toggleTheme, 
    ingredients, 
    recipes, 
    addIngredient, 
    addRecipe, 
    settingsDraft, 
    setSettingsDraft, 
    clearSettingsDraft,
    addToast
  } = useStore();

  const [importData, setImportData] = useState(settingsDraft?.importData || "");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState('');

  // Auto-save effect
  useEffect(() => {
    let isMounted = true;
    if (importData) setSaveStatus('Salvando...');
    
    const timer = setTimeout(() => {
      if (isMounted) {
        setSettingsDraft({ importData });
        if (importData) {
          setSaveStatus('Rascunho salvo');
          setTimeout(() => { if (isMounted) setSaveStatus('') }, 2000);
        }
      }
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [importData, setSettingsDraft]);

  const handleExport = () => {
    const data = JSON.stringify({ ingredients, recipes }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "prodin-backup.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Simple import to merge data
  const handleImport = () => {
    try {
      const parsed = JSON.parse(importData);
      if (parsed.ingredients && Array.isArray(parsed.ingredients)) {
        parsed.ingredients.forEach((ing: any) => addIngredient(ing));
      }
      if (parsed.recipes && Array.isArray(parsed.recipes)) {
        parsed.recipes.forEach((rec: any) => addRecipe(rec));
      }
      setImportStatus("Dados importados com sucesso!");
      setImportData("");
      clearSettingsDraft();
      setTimeout(() => setImportStatus(null), 3000);
    } catch (e) {
      setImportStatus("Erro ao importar dados. Verifique o formato JSON.");
      setTimeout(() => setImportStatus(null), 3000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Configurações</h1>
        <p className="text-slate-500 dark:text-slate-400">Ajustes do aplicativo e dados.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Aparência</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Alterne entre tema claro e escuro</p>
          </div>
          <button 
            onClick={toggleTheme}
            className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-4 py-2 rounded-xl transition-colors font-medium text-slate-700 dark:text-slate-200"
          >
            {theme === 'light' ? (
              <><Moon size={20} /> <span>Modo Escuro</span></>
            ) : (
              <><Sun size={20} /> <span>Modo Claro</span></>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Download size={20} /> Exportar Dados
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">
            Faça um backup de todas as suas receitas e ingredientes em um arquivo JSON.
          </p>
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400 rounded-xl font-medium transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-500/20 flex items-center gap-2"
          >
            Fazer Backup Local
          </button>
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload size={20} /> Importar Dados
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Cole o conteúdo do backup JSON para restaurar seus dados.
              </p>
            </div>
            {saveStatus && <span className="text-xs text-slate-500 animate-pulse">{saveStatus}</span>}
          </div>
          <textarea 
            value={importData}
            onChange={e => setImportData(e.target.value)}
            className="w-full h-32 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs dark:text-slate-300 mb-4"
            placeholder="{ ... }"
          />
          <div className="flex items-center gap-4">
            <button 
              onClick={handleImport}
              disabled={!importData}
              className="px-4 py-2 bg-slate-900 hover:bg-black text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              Restaurar
            </button>
            {importStatus && (
              <span className={`text-sm font-medium ${importStatus.includes('Erro') ? 'text-rose-500' : 'text-emerald-500'}`}>
                {importStatus}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
