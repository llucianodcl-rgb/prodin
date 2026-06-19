import React, { useEffect, useState } from "react";
import { useStore, Toast } from "../../store/useStore";
import { X, RotateCcw, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";

export default function ToastContainer() {
  const { toasts, removeToast } = useStore();

  return (
    <div className="fixed bottom-20 md:bottom-8 right-4 z-[100] flex flex-col items-end gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

const ToastItem: React.FC<{ toast: Toast; onRemove: () => void }> = ({ toast, onRemove }) => {
  const [progress, setProgress] = useState(100);
  const duration = toast.duration || 5000;
  
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
        onRemove();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, onRemove]);

  const icons = {
    success: <CheckCircle className="text-emerald-500" size={20} />,
    warning: <AlertTriangle className="text-amber-500" size={20} />,
    info: <Info className="text-indigo-500" size={20} />,
  };

  const colors = {
    success: "border-emerald-100 bg-white dark:bg-slate-800 dark:border-emerald-500/20",
    warning: "border-amber-100 bg-white dark:bg-slate-800 dark:border-amber-500/20",
    info: "border-indigo-100 bg-white dark:bg-slate-800 dark:border-indigo-500/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={cn(
        "pointer-events-auto flex flex-col min-w-[300px] max-w-sm rounded-2xl shadow-xl border overflow-hidden",
        colors[toast.type]
      )}
    >
      <div className="flex items-center p-4 gap-3">
        <div className="flex-shrink-0">{icons[toast.type]}</div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {toast.message}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {toast.onUndo && (
            <button
              onClick={() => {
                toast.onUndo?.();
                onRemove();
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
            >
              <RotateCcw size={14} />
              <span>DESFAZER</span>
            </button>
          )}
          <button
            onClick={onRemove}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="h-1 bg-slate-100 dark:bg-slate-700 w-full overflow-hidden">
        <motion.div 
          className={cn(
            "h-full",
            toast.type === 'success' ? 'bg-emerald-500' : 
            toast.type === 'warning' ? 'bg-amber-500' : 'bg-indigo-500'
          )}
          initial={{ width: "100%" }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "linear" }}
        />
      </div>
    </motion.div>
  );
}
