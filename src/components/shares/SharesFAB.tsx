import { useState, useEffect } from "react";
import { Bell, Inbox, Send, Check, X, Clock, FileWarning } from "lucide-react";
import { collection, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useStore } from "../../store/useStore";
import { RecipeShare, RecipeIngredient, Ingredient } from "../../types";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";
import { formatNumber } from "../../lib/utils";

export default function SharesFAB() {
  const { user } = useAuth();
  const { ingredients, recipes, addRecipe, addIngredient, addToast } = useStore();
  const navigate = useNavigate();
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  
  const [receivedShares, setReceivedShares] = useState<RecipeShare[]>([]);
  const [sentShares, setSentShares] = useState<RecipeShare[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const [importing, setImporting] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !user.email) return;

    // Listen for received shares
    const receivedQuery = query(
      collection(db, "recipeShares"),
      where("receiverEmail", "==", user.email)
    );

    const unsubReceived = onSnapshot(receivedQuery, (snapshot) => {
      const shares: RecipeShare[] = [];
      let pending = 0;
      snapshot.forEach((doc) => {
        const data = doc.data() as RecipeShare;
        shares.push({ ...data, id: doc.id });
        if (data.status === 'pending') pending++;
      });
      shares.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setReceivedShares(shares);
      setPendingCount(pending);
    });

    // Listen for sent shares
    const sentQuery = query(
      collection(db, "recipeShares"),
      where("senderId", "==", user.uid)
    );

    const unsubSent = onSnapshot(sentQuery, (snapshot) => {
      const shares: RecipeShare[] = [];
      snapshot.forEach((doc) => {
        shares.push({ ...doc.data(), id: doc.id } as RecipeShare);
      });
      shares.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setSentShares(shares);
    });

    return () => {
      unsubReceived();
      unsubSent();
    };
  }, [user]);

  const handleAccept = async (share: RecipeShare) => {
    if (!user) return;
    
    // Auto import missing ingredients
    let hasMissing = false;
    for (const ri of share.recipeData.ingredients) {
      const existing = ingredients.find(i => i.name.toLowerCase() === share.originalIngredients.find(oi => oi.id === ri.ingredientId)?.name.toLowerCase());
      if (!existing) {
        hasMissing = true;
        break;
      }
    }

    if (hasMissing) {
      if (!window.confirm("Esta receita utiliza ingredientes que ainda não existem no seu cadastro.\nDeseja importar automaticamente?")) {
        return;
      }
    }

    setImporting(share.id);
    
    try {
      const newRecipeIngredients: RecipeIngredient[] = [];
      
      for (const ri of share.recipeData.ingredients) {
        const originalIng = share.originalIngredients.find(oi => oi.id === ri.ingredientId);
        if (!originalIng) continue;

        let targetId = "";
        const existingIng = ingredients.find(i => i.name.toLowerCase() === originalIng.name.toLowerCase());
        
        if (existingIng) {
          targetId = existingIng.id;
        } else {
          // Create new ingredient
          const newIngId = uuidv4();
          targetId = newIngId;
          const newIngredient: Ingredient = {
            ...originalIng,
            id: newIngId,
            createdAt: new Date().toISOString()
          };
          addIngredient(newIngredient);
        }

        newRecipeIngredients.push({
          ...ri,
          id: uuidv4(),
          ingredientId: targetId
        });
      }

      const importedRecipe = {
        ...share.recipeData,
        id: uuidv4(),
        ingredients: newRecipeIngredients,
        name: share.recipeData.name + " (Importada)",
        sharedBy: share.senderName,
        importedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      addRecipe(importedRecipe);

      await updateDoc(doc(db, "recipeShares", share.id), {
        status: "accepted",
        updatedAt: new Date().toISOString()
      });
      
      addToast({
        message: `Receita "${share.recipeName}" importada com sucesso!`,
        type: 'success'
      });

      setIsOpen(false);
      navigate(`/receitas/${importedRecipe.id}/editar`);
      
    } catch (e) {
      console.error(e);
      addToast({ message: "Erro ao aceitar receita", type: "warning" });
    } finally {
      setImporting(null);
    }
  };

  const handleReject = async (share: RecipeShare) => {
    try {
      await updateDoc(doc(db, "recipeShares", share.id), {
        status: "rejected",
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) return null;

  return (
    <>
      <div className="fixed bottom-24 left-4 sm:bottom-8 sm:left-8 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="relative bg-white dark:bg-slate-800 p-4 rounded-full shadow-lg border border-pink/20 dark:border-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Bell className="text-pink dark:text-pink-400" size={24} />
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[80vh] sm:h-auto sm:max-h-[85vh]">
            
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-xl font-bold text-brown dark:text-white flex items-center gap-2">
                <Bell className="text-pink" size={24} />
                Central de Compartilhamentos
              </h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex border-b border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setActiveTab('received')}
                className={`flex-1 py-4 font-bold text-sm tracking-wide transition-colors flex justify-center items-center gap-2 ${
                  activeTab === 'received' 
                    ? 'text-pink border-b-2 border-pink bg-pink-50 dark:bg-slate-800' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Inbox size={18} />
                RECEBIDAS
                {pendingCount > 0 && (
                  <span className="bg-rose-500 text-white px-2 py-0.5 rounded-full text-[10px]">{pendingCount}</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`flex-1 py-4 font-bold text-sm tracking-wide transition-colors flex justify-center items-center gap-2 ${
                  activeTab === 'sent' 
                    ? 'text-pink border-b-2 border-pink bg-pink-50 dark:bg-slate-800' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Send size={18} />
                ENVIADAS
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900 border-t border-white dark:border-transparent">
              {activeTab === 'received' && (
                <div className="space-y-4">
                  {receivedShares.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <Inbox size={48} className="mx-auto mb-4 opacity-20" />
                      <p>Nenhuma receita recebida.</p>
                    </div>
                  ) : (
                    receivedShares.map(share => (
                      <div key={share.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white uppercase">{share.recipeName}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Shared by: <span className="font-semibold text-slate-700 dark:text-slate-300">{share.senderName} ({share.senderEmail})</span></p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              {new Date(share.createdAt).toLocaleString()}
                            </p>
                          </div>
                          
                          {share.status === 'pending' && <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1.5"><Clock size={12} /> Pendente</span>}
                          {share.status === 'accepted' && <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1.5"><Check size={12} /> Aceita</span>}
                          {share.status === 'rejected' && <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1.5"><X size={12} /> Recusada</span>}
                        </div>
                        
                        {share.status === 'pending' && (
                          <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <button
                              onClick={() => handleAccept(share)}
                              disabled={importing === share.id}
                              className="flex-1 bg-mint hover:bg-mint/90 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                            >
                              <Check size={18} /> Aceitar
                            </button>
                            <button
                              onClick={() => handleReject(share)}
                              disabled={importing === share.id}
                              className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700"
                            >
                              <X size={18} /> Recusar
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'sent' && (
                <div className="space-y-4">
                  {sentShares.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <Send size={48} className="mx-auto mb-4 opacity-20" />
                      <p>Você ainda não compartilhou nenhuma receita.</p>
                    </div>
                  ) : (
                    sentShares.map(share => (
                      <div key={share.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-slate-800 dark:text-white uppercase text-sm">{share.recipeName}</h3>
                          <p className="text-xs text-slate-500 mt-1">Para: {share.receiverEmail}</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {new Date(share.createdAt).toLocaleString()}
                          </p>
                        </div>
                        
                        <div>
                          {share.status === 'pending' && <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">⏳ Aguardando</span>}
                          {share.status === 'accepted' && <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">✓ Aceita</span>}
                          {share.status === 'rejected' && <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">✖ Recusada</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
