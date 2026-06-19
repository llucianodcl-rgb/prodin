import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Ingredient, Recipe } from '../types';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'info';
  duration?: number;
  onUndo?: () => void;
}

interface AppState {
  ingredients: Ingredient[];
  extras: Ingredient[];
  recipes: Recipe[];
  addIngredient: (ingredient: Ingredient) => void;
  updateIngredient: (id: string, ingredient: Partial<Ingredient>) => void;
  deleteIngredient: (id: string) => void;
  duplicateIngredient: (id: string) => void;
  addExtra: (extra: Ingredient) => void;
  updateExtra: (id: string, extra: Partial<Ingredient>) => void;
  deleteExtra: (id: string) => void;
  duplicateExtra: (id: string) => void;
  addRecipe: (recipe: Recipe) => void;
  updateRecipe: (id: string, recipe: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  duplicateRecipe: (id: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  
  // UI State (Not persisted)
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  // Drafts
  ingredientDrafts: Record<string, any>;
  setIngredientDraft: (id: string, draft: any) => void;
  clearIngredientDraft: (id: string) => void;

  recipeDrafts: Record<string, any>;
  setRecipeDraft: (id: string, draft: any) => void;
  clearRecipeDraft: (id: string) => void;

  settingsDraft: any;
  setSettingsDraft: (draft: any) => void;
  clearSettingsDraft: () => void;
  
  salesDraft: any;
  setSalesDraft: (draft: any) => void;
  clearSalesDraft: () => void;
  resetData: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      ingredients: [],
      extras: [],
      recipes: [],
      toasts: [],
      
      // Ingredients
      addIngredient: (ingredient) =>
        set((state) => ({ ingredients: [...state.ingredients, ingredient] })),
      updateIngredient: (id, updatedIng) =>
        set((state) => ({
          ingredients: state.ingredients.map((ing) =>
            ing.id === id ? { ...ing, ...updatedIng } : ing
          ),
        })),
      deleteIngredient: (id) =>
        set((state) => ({
          ingredients: state.ingredients.filter((ing) => ing.id !== id),
        })),
      duplicateIngredient: (id) =>
        set((state) => {
          const ingToDup = state.ingredients.find(i => i.id === id);
          if (!ingToDup) return state;
          const newIng = {
            ...ingToDup,
            id: Math.random().toString(36).substring(2, 9),
            name: `${ingToDup.name} (Cópia)`
          };
          return { ingredients: [...state.ingredients, newIng] };
        }),
      
      // Extras
      addExtra: (extra) =>
        set((state) => ({ extras: [...state.extras, extra] })),
      updateExtra: (id, updatedExtra) =>
        set((state) => ({
          extras: state.extras.map((ex) =>
            ex.id === id ? { ...ex, ...updatedExtra } : ex
          ),
        })),
      deleteExtra: (id) =>
        set((state) => ({
          extras: state.extras.filter((ex) => ex.id !== id),
        })),
      duplicateExtra: (id) =>
        set((state) => {
          const exToDup = state.extras.find(e => e.id === id);
          if (!exToDup) return state;
          const newEx = {
            ...exToDup,
            id: Math.random().toString(36).substring(2, 9),
            name: `${exToDup.name} (Cópia)`
          };
          return { extras: [...state.extras, newEx] };
        }),
      
      // Recipes
      addRecipe: (recipe) =>
        set((state) => ({ recipes: [...state.recipes, recipe] })),
      updateRecipe: (id, updatedRec) =>
        set((state) => ({
          recipes: state.recipes.map((rec) =>
            rec.id === id ? { ...rec, ...updatedRec } : rec
          ),
        })),
      deleteRecipe: (id) =>
        set((state) => ({
          recipes: state.recipes.filter((rec) => rec.id !== id),
        })),
      duplicateRecipe: (id) =>
        set((state) => {
          const recToDup = state.recipes.find(r => r.id === id);
          if (!recToDup) return state;
          const newRec = {
            ...recToDup,
            id: Math.random().toString(36).substring(2, 9),
            name: `${recToDup.name} (Cópia)`
          };
          return { recipes: [...state.recipes, newRec] };
        }),
        
      // Theme
      theme: 'light',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

      // Toasts
      addToast: (toast) => set((state) => ({
        toasts: [...state.toasts, { ...toast, id: Math.random().toString(36).substring(2, 9) }]
      })),
      removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      })),
      
      // Drafts
      ingredientDrafts: {},
      setIngredientDraft: (id, draft) => set((state) => ({ ingredientDrafts: { ...state.ingredientDrafts, [id]: draft } })),
      clearIngredientDraft: (id) => set((state) => {
        const { [id]: _, ...rest } = state.ingredientDrafts;
        return { ingredientDrafts: rest };
      }),

      recipeDrafts: {},
      setRecipeDraft: (id, draft) => set((state) => ({ recipeDrafts: { ...state.recipeDrafts, [id]: draft } })),
      clearRecipeDraft: (id) => set((state) => {
        const { [id]: _, ...rest } = state.recipeDrafts;
        return { recipeDrafts: rest };
      }),

      settingsDraft: null,
      setSettingsDraft: (draft) => set({ settingsDraft: draft }),
      clearSettingsDraft: () => set({ settingsDraft: null }),

      salesDraft: null,
      setSalesDraft: (draft) => set({ salesDraft: draft }),
      clearSalesDraft: () => set({ salesDraft: null }),
      resetData: () => set({
        ingredients: [],
        extras: [],
        recipes: [],
        ingredientDrafts: {},
        recipeDrafts: {},
        settingsDraft: null,
        salesDraft: null
      }),
    }),
    {
      name: 'prodin-storage',
      // Persist data and drafts
      partialize: (state) => ({ 
        ingredients: state.ingredients, 
        extras: state.extras,
        recipes: state.recipes, 
        theme: state.theme,
        ingredientDrafts: state.ingredientDrafts,
        recipeDrafts: state.recipeDrafts,
        settingsDraft: state.settingsDraft,
        salesDraft: state.salesDraft
      }),
    }
  )
);
