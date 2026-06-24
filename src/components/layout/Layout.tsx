import { Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Utensils,
  BookOpen,
  Settings,
  Package,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import { useStore } from "../../store/useStore";
import { cn } from "../../lib/utils";
import ToastContainer from "./ToastContainer";
import AdminFAB from "./AdminFAB";
import SharesFAB from "../shares/SharesFAB";

import ActionFAB from "./ActionFAB";

export default function Layout() {
  const { theme } = useStore();
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", href: "/", icon: <LayoutDashboard size={20} /> },
    {
      name: "Ingredientes",
      href: "/ingredientes",
      icon: <Utensils size={20} />,
    },
    { name: "Receitas", href: "/receitas", icon: <BookOpen size={20} /> },
    { name: "Extra", href: "/extra", icon: <Package size={20} /> },
    { name: "Vendas", href: "/vendas", icon: <DollarSign size={20} /> },
    { name: "Conversões", href: "/conversoes", icon: <RefreshCw size={20} /> },
    {
      name: "Configurações",
      href: "/configuracoes",
      icon: <Settings size={20} />,
    },
  ];

  return (
    <div className="min-h-screen bg-pink-soft dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-pink/20 dark:border-slate-800/60 p-4 z-20 flex items-center justify-between">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#1F5F7A] dark:text-[#38b2d1] italic tracking-normal leading-none mb-0.5">
              PRODIN
            </h1>
            <p className="text-[9px] text-[#1F5F7A] dark:text-[#38b2d1] font-bold tracking-widest uppercase italic leading-none">
              A Produção Inteligente
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-2 md:p-6 min-h-[calc(100vh-130px)] pb-28 md:pb-32">
        <Outlet />
      </main>

      <ToastContainer />
      <AdminFAB />
      <SharesFAB />
      <ActionFAB />

      {/* Fixed Bottom Navigation for All Screens */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border-t border-pink/10 dark:border-slate-800/40 pb-safe z-10 flex justify-center py-2 px-1 sm:px-4 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
        <nav className="flex items-center w-full max-w-lg">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center p-1 rounded-xl transition-all duration-200 flex-1 relative min-w-0",
                  isActive
                    ? "text-mint font-semibold"
                    : "text-slate-400 dark:text-slate-500 hover:text-pink transition-colors",
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-lg transition-transform duration-250",
                    isActive
                      ? "bg-mint-soft dark:bg-mint/10 scale-110"
                      : "group-hover:scale-105",
                  )}
                >
                  {item.icon}
                </div>
                <span className="text-[9px] xs:text-[10px] mt-1 font-medium whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
