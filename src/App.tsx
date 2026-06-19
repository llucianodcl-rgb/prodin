/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Ingredients from './pages/Ingredients';
import Extra from './pages/Extra';
import Recipes from './pages/Recipes';
import RecipeForm from './pages/RecipeForm';
import RecipeDetails from './pages/RecipeDetails';
import Settings from './pages/Settings';
import Sales from './pages/Sales';

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
       { index: true, element: <Dashboard /> },
       { path: "ingredientes", element: <Ingredients /> },
       { path: "extra", element: <Extra /> },
       { path: "receitas", element: <Recipes /> },
       { path: "receitas/nova", element: <RecipeForm /> },
       { path: "receitas/:id/editar", element: <RecipeForm /> },
       { path: "receitas/:id", element: <RecipeDetails /> },
       { path: "vendas", element: <Sales /> },
       { path: "configuracoes", element: <Settings /> }
    ]
  }
]);

export default function App() {
  return <RouterProvider router={router} />;
}

