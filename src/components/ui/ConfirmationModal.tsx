import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, AlertTriangle, Info, CheckCircle, Trash2, AlertCircle } from "lucide-react";
import { cn } from "../../lib/utils";

export type ModalType = 'danger' | 'info' | 'success' | 'warning';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: ModalType;
}

const typeConfigs = {
  danger: {
    icon: Trash2,
    iconBg: "bg-rose-100 dark:bg-rose-500/20",
    iconColor: "text-rose-600 dark:text-rose-400",
    confirmBtn: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200 dark:shadow-none",
    titleColor: "text-rose-600 dark:text-rose-400"
  },
  info: {
    icon: Info,
    iconBg: "bg-blue-100 dark:bg-blue-500/20",
    iconColor: "text-blue-600 dark:text-blue-400",
    confirmBtn: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 dark:shadow-none",
    titleColor: "text-blue-600 dark:text-blue-400"
  },
  success: {
    icon: CheckCircle,
    iconBg: "bg-emerald-100 dark:bg-emerald-500/20",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    confirmBtn: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 dark:shadow-none",
    titleColor: "text-emerald-600 dark:text-emerald-400"
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "bg-amber-100 dark:bg-amber-500/20",
    iconColor: "text-amber-600 dark:text-amber-400",
    confirmBtn: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200 dark:shadow-none",
    titleColor: "text-amber-600 dark:text-amber-400"
  }
};

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = "info"
}: ConfirmationModalProps) {
  const config = typeConfigs[type];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
          >
            <div className="p-8">
              <div className="flex flex-col items-center text-center">
                <div className={cn("p-4 rounded-2xl mb-6", config.iconBg)}>
                  <Icon className={config.iconColor} size={32} />
                </div>
                
                <h3 className={cn("text-2xl font-bold mb-3", config.titleColor)}>
                  {title}
                </h3>
                
                <div className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-8">
                  {message}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={onClose}
                  className="px-6 py-4 rounded-2xl font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-all border border-slate-100 dark:border-slate-800"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={cn(
                    "px-6 py-4 rounded-2xl font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg",
                    config.confirmBtn
                  )}
                >
                  {confirmText}
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={20} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
