import { Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";

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

  const getButtonStyles = () => {
    if (isIngredients) {
      return "bg-pink dark:bg-pink-500 border-pink/20 hover:bg-pink-hover";
    }
    if (isRecipes) {
      return "bg-[#675ab6] dark:bg-[#675ab6] border-[#675ab6]/20 hover:bg-[#5a4ea8]";
    }
    if (isExtra) {
      return "bg-[#115463] dark:bg-[#115463] border-[#115463]/20 hover:bg-[#0e4652]";
    }
    return "bg-pink dark:bg-pink-500 border-pink/20 hover:bg-pink-hover";
  };

  return (
    <div className="fixed bottom-24 right-4 sm:bottom-8 sm:right-8 z-50">
      <button
        onClick={handleClick}
        className={cn(
          "relative p-4 rounded-full shadow-lg border transition-all hover:scale-105 text-white",
          getButtonStyles()
        )}
      >
        <Plus size={24} />
      </button>
    </div>
  );
}
