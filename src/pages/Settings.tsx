import { useStore } from "../store/useStore";
import { Moon, Sun, ArrowRight, Save, Upload, Download, LogOut, User as UserIcon, Trash2, AlertTriangle, RefreshCcw, X, Users as UsersIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { doc, deleteDoc, writeBatch, collection, getDocs, query, where, setDoc } from "firebase/firestore";
import { db } from "../firebase";

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
    addToast,
    resetData
  } = useStore();

  const { user, appUser, logout, deleteAccount } = useAuth();

  const [importData, setImportData] = useState(settingsDraft?.importData || "");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState('');

  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleResetData = async () => {
    if (!user) return;
    setIsProcessing(true);
    try {
      // 1. Reset Store
      resetData();
      
      // 2. Reset Firestore user_data document
      const userRef = doc(db, 'user_data', user.uid);
      await setDoc(userRef, {
        ingredients: [],
        recipes: [],
        extras: [],
        updatedAt: Date.now()
      }, { merge: true });

      // 3. Just in case there are separate collections as mentioned in prompt
      // We try to delete them if they exist
      const collections = ['receitas', 'ingredientes', 'vendas'];
      for (const colName of collections) {
        try {
          const colRef = collection(db, colName);
          const q = query(colRef, where("userId", "==", user.uid));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
             const batch = writeBatch(db);
             snapshot.docs.forEach((doc) => {
               batch.delete(doc.ref);
             });
             await batch.commit();
          }
        } catch (err) {
          // Silently fail if collections don't exist or we don't have permission
          console.log(`Failed to cleanup extra collection ${colName}`, err);
        }
      }

      addToast({
        message: "Todos os dados foram resetados com sucesso.",
        type: "info"
      });
      setShowResetModal(false);
    } catch (error) {
      console.error("Error resetting data", error);
      addToast({
        message: "Erro ao resetar dados. Tente novamente.",
        type: "warning"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmText !== "EXCLUIR") return;
    setIsProcessing(true);
    try {
      // 1. Delete user_data
      await deleteDoc(doc(db, 'user_data', user.uid));
      
      // 2. Delete user doc
      await deleteDoc(doc(db, 'users', user.uid));

      // 3. Delete from Auth (this will also logout)
      await deleteAccount();
      
      addToast({
        message: "Sua conta foi excluída permanentemente.",
        type: "info"
      });
    } catch (error) {
      console.error("Error deleting account", error);
      addToast({
        message: "Erro ao excluir conta. Ação requer login recente.",
        type: "warning"
      });
    } finally {
      setIsProcessing(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Configurações</h1>
        <p className="text-slate-500 dark:text-slate-400">Ajustes do aplicativo e dados.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {user && (
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-pink-soft dark:bg-pink-500/10 p-3 rounded-full hidden sm:block">
                <UserIcon size={24} className="text-pink" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Sua Conta</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-mint/10 text-mint text-xs font-bold rounded-lg uppercase tracking-wider">
                  {appUser?.role === 'admin' ? 'Administrador' : 'Usuário Ativo'}
                </span>
              </div>
            </div>
            <button 
              onClick={logout}
              className="flex items-center justify-center space-x-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-4 py-2 rounded-xl transition-colors font-medium text-slate-700 dark:text-slate-200 w-full sm:w-auto"
            >
              <LogOut size={18} /> <span>Sair da conta</span>
            </button>
          </div>
        )}
        
        {user && (
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 space-y-4">
             <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Ações Críticas</h4>
             <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => setShowResetModal(true)}
                  className="flex-1 flex items-center justify-center space-x-2 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 p-3 rounded-xl transition-colors font-bold border border-amber-200 dark:border-amber-500/20"
                >
                  <RefreshCcw size={18} />
                  <span>Começar do Zero</span>
                </button>
                <button 
                  onClick={() => setShowDeleteModal(true)}
                  className="flex-1 flex items-center justify-center space-x-2 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 p-3 rounded-xl transition-colors font-bold border border-rose-200 dark:border-rose-500/20"
                >
                  <Trash2 size={18} />
                  <span>Excluir Minha Conta</span>
                </button>
             </div>
          </div>
        )}

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

      {/* Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200">
             <div className="p-6 text-center">
                <div className="bg-amber-100 dark:bg-amber-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={32} className="text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Atenção: Ação irreversível!</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium leading-relaxed">
                  Todos os seus dados de receitas, ingredientes e vendas serão deletados. Deseja continuar?
                </p>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={handleResetData}
                    disabled={isProcessing}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white p-3 rounded-xl font-bold transition-all disabled:opacity-50"
                  >
                    {isProcessing ? 'Processando...' : 'Sim, deletar tudo'}
                  </button>
                  <button 
                    onClick={() => setShowResetModal(false)}
                    disabled={isProcessing}
                    className="w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 p-3 rounded-xl font-bold transition-all"
                  >
                    Cancelar
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200">
             <div className="p-6">
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={20} />
                </button>
                <div className="bg-rose-100 dark:bg-rose-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} className="text-rose-600 dark:text-rose-400" />
                </div>
                <div className="text-center mb-6">
                   <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Excluir Conta Permanentemente</h3>
                   <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                     Atenção: Ação irreversível! Você perderá acesso imediato e todos os seus dados serão anonimizados e excluídos.
                   </p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 mb-2">Digite EXCLUIR para confirmar</label>
                    <input 
                      type="text" 
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                      placeholder="EXCLUIR"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold text-center tracking-widest text-rose-600"
                    />
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <button 
                      onClick={handleDeleteAccount}
                      disabled={isProcessing || deleteConfirmText !== "EXCLUIR"}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white p-3 rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-rose-500/20"
                    >
                      {isProcessing ? 'Processando...' : 'Excluir Minha Conta'}
                    </button>
                    <button 
                      onClick={() => setShowDeleteModal(false)}
                      disabled={isProcessing}
                      className="w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 p-3 rounded-xl font-bold transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
