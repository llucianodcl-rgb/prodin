import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, X } from 'lucide-react';

export const UpdateManager: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [initialVersion, setInitialVersion] = useState<string | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchVersion = useCallback(async () => {
    try {
      const response = await fetch('/api/version');
      if (response.ok) {
        const data = await response.json();
        return data.version as string;
      }
    } catch (error) {
      console.error('Erro ao verificar versão:', error);
    }
    return null;
  }, []);

  useEffect(() => {
    // Check version on mount
    const init = async () => {
      const v = await fetchVersion();
      if (v) {
        setInitialVersion(v);
      }
    };
    init();

    // Poll for changes every 5 minutes
    const interval = setInterval(async () => {
      const currentVersion = await fetchVersion();
      
      // If version changed and it's not the one we just dismissed
      if (initialVersion && currentVersion && currentVersion !== initialVersion && currentVersion !== dismissedVersion) {
        setShowModal(true);
      }
    }, 1000 * 60 * 5); // 5 minutes

    // Add visibility change listener to check for updates when returning
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const currentVersion = await fetchVersion();
        if (initialVersion && currentVersion && currentVersion !== initialVersion && currentVersion !== dismissedVersion) {
          setShowModal(true);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchVersion, initialVersion, dismissedVersion]);

  const handleUpdate = () => {
    setIsUpdating(true);
    window.location.reload();
  };

  const handleClose = async () => {
    // Mark the current version as dismissed so it doesn't show up again in this session
    const currentVersion = await fetchVersion();
    if (currentVersion) {
      setDismissedVersion(currentVersion);
    }
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.95 }}
          className="bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-indigo-100 dark:border-indigo-500/20 p-6 max-w-sm w-full pointer-events-auto"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-xl text-indigo-600 dark:text-indigo-400">
              <RefreshCw className={`w-6 h-6 ${isUpdating ? 'animate-spin' : ''}`} />
            </div>
            <button 
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Nova atualização disponível
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
            Uma nova versão do Prodin está disponível com melhorias e correções. Deseja atualizar agora?
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-colors text-sm shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isUpdating ? 'Atualizando...' : 'Atualizar Agora'}
            </button>
            <button
              onClick={handleClose}
              disabled={isUpdating}
              className="px-6 py-2.5 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors text-sm"
            >
              Depois
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
