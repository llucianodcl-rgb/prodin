/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  RouterProvider,
  createBrowserRouter,
  Outlet,
  Navigate,
} from "react-router-dom";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Ingredients from "./pages/Ingredients";
import Extra from "./pages/Extra";
import ExtraDetails from "./pages/ExtraDetails";
import Recipes from "./pages/Recipes";
import RecipeForm from "./pages/RecipeForm";
import RecipeDetails from "./pages/RecipeDetails";
import Settings from "./pages/Settings";
import Sales from "./pages/Sales";
import Users from "./pages/Users";
import Login from "./pages/Login";
import { useAuth } from "./contexts/AuthContext";
import { ChefHat, Loader2 } from "lucide-react";
import FirestoreSync from "./components/layout/FirestoreSync";
import { UpdateManager } from "./components/UpdateManager";

import Conversions from "./pages/Conversions";

import { ThemeManager } from "./components/ThemeManager";

function ProtectedRoute() {
  const { user, appUser, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="flex flex-col items-center animate-in fade-in duration-500">
          <img
            src="/icon-192.png"
            alt="Prodin Logo"
            className="w-32 h-32 mb-6"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-5xl font-black text-[#1F5F7A] dark:text-[#38b2d1] mb-2 italic tracking-normal">
            PRODIN
          </h1>
          <p className="text-[#1F5F7A] dark:text-[#38b2d1] font-bold text-xs tracking-widest uppercase italic">
            A Produção Inteligente
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (appUser && appUser.status === "pendente") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-soft max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-amber-100 dark:bg-amber-500/20 p-4 rounded-full">
              <ChefHat
                size={48}
                className="text-amber-600 dark:text-amber-400 font-light"
              />
            </div>
          </div>
          <h1 className="text-2xl font-black text-brown dark:text-white mb-4">
            Aprovação Pendente
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">
            Sua conta está aguardando a aprovação do administrador. Por favor,
            aguarde.
          </p>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 p-3 rounded-xl font-bold transition-all"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <FirestoreSync>
      <Outlet />
    </FirestoreSync>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: "ingredientes", element: <Ingredients /> },
          { path: "extra", element: <Extra /> },
          { path: "extra/:id", element: <ExtraDetails /> },
          { path: "receitas", element: <Recipes /> },
          { path: "receitas/nova", element: <RecipeForm /> },
          { path: "receitas/:id/editar", element: <RecipeForm /> },
          { path: "receitas/:id", element: <RecipeDetails /> },
          { path: "vendas", element: <Sales /> },
          { path: "conversoes", element: <Conversions /> },
          { path: "configuracoes", element: <Settings /> },
          { path: "usuarios", element: <Users /> },
        ],
      },
    ],
  },
]);

export default function App() {
  return (
    <>
      <ThemeManager />
      <UpdateManager />
      <RouterProvider router={router} />
    </>
  );
}
