import React, { useState } from "react";
import { X, Send, AlertCircle, Loader2 } from "lucide-react";
import { Recipe, Ingredient } from "../../types";
import { collection, addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useStore } from "../../store/useStore";

interface ShareRecipeModalProps {
  recipe: Recipe;
  onClose: () => void;
}

export default function ShareRecipeModal({ recipe, onClose }: ShareRecipeModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { user } = useAuth();
  const { ingredients, addToast } = useStore();

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !user || !user.email) return;

    if (email.toLowerCase() === user.email.toLowerCase()) {
      setError("Você não pode compartilhar uma receita para si mesmo.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Validate that target user exists and is active
      const q = query(collection(db, "users"), where("email", "==", email.toLowerCase().trim()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setError("Este e-mail não pertence a um usuário cadastrado no Prodin.");
        setLoading(false);
        return;
      }

      const targetUser = snap.docs[0].data();
      if (targetUser.status !== "ativo") {
        setError("O usuário de destino ainda não foi aprovado na plataforma.");
        setLoading(false);
        return;
      }
      
      // Get the full ingredient objects needed by this recipe
      const originalIngredients = ingredients.filter(i => 
        recipe.ingredients.some(ri => ri.ingredientId === i.id)
      );

      await addDoc(collection(db, "recipeShares"), {
        senderId: user.uid,
        senderName: user.displayName || "Usuário Prodin",
        senderEmail: user.email,
        receiverEmail: email.toLowerCase().trim(),
        recipeName: recipe.name,
        recipeData: recipe,
        originalIngredients: originalIngredients,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      addToast({
        message: `Receita compartilhada com sucesso!`,
        type: 'success'
      });
      onClose();
      
    } catch (e: any) {
      console.error(e);
      if (e.message?.includes('Missing or insufficient permissions')) {
        setError("Erro de permissão ou e-mail inválido.");
      } else {
        setError("Erro ao compartilhar a receita. Verifique o servidor.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-xl font-bold text-brown dark:text-white flex items-center gap-2">
            <Send className="text-pink" size={24} />
            Compartilhar Receita
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleShare} className="p-6">
          <div className="mb-6 space-y-4">
            <div>
              <p className="text-[10px] font-bold text-pink uppercase tracking-wider mb-1">Receita selecionada</p>
              <p className="font-bold text-lg dark:text-white">{recipe.name}</p>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">E-mail do usuário Prodin</label>
              <input 
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint dark:text-white transition-all shadow-sm"
              />
            </div>

            {error && (
              <div className="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 p-3 rounded-xl text-sm font-medium flex items-start gap-2">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-3 rounded-xl font-bold transition-all dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-pink hover:bg-pink/90 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:bg-pink/50"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              Compartilhar
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
