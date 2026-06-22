import { Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

export default function ActionFAB() {
  const location = useLocation();
  const navigate = useNavigate();

  const isIngredients = location.pathname.startsWith('/ingredientes');
  const isRecipes = location.pathname.startsWith('/receitas');
  const isExtra = location.pathname.startsWith('/extra');

  if (!isIngredients && !isRecipes && !isExtra) return null;

  const handleClick = () => {
    if (isIngredients) {
      window.dispatchEvent(new CustomEvent('openNewIngredientModal'));
    } else if (isExtra) {
      window.dispatchEvent(new CustomEvent('openNewExtraModal'));
    } else if (isRecipes) {
      navigate('/receitas/nova');
    }
  };

  return (
    <div className="fixed bottom-24 right-4 sm:bottom-8 sm:right-8 z-50">
      <button
        onClick={handleClick}
        className="relative bg-pink dark:bg-pink-500 p-4 rounded-full shadow-lg border border-pink/20 dark:border-slate-700 hover:bg-pink-hover hover:scale-105 text-white transition-all"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}
