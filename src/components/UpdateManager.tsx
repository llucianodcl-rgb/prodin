import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const UpdateManager: React.FC = () => {
  const [isUpdating, setIsUpdating] = useState(false);

  // useRegisterSW hook from vite-plugin-pwa
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('[PWA Audit] Service Worker registrado com sucesso.', r);
      // Optional: check for updates every 5 minutes
      if (r) {
        setInterval(() => {
          console.log('[PWA Audit] Verificando se há atualizações do Service Worker...');
          r.update();
        }, 5 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('[PWA Audit] Erro ao registrar Service Worker:', error);
    },
    onNeedRefresh() {
      console.log('[PWA Audit] Nova versão detectada! Service Worker aguardando ativação (estado "waiting").');
      console.log('[PWA Audit] Evento de atualização disparado.');
      console.log('[PWA Audit] Modal solicitado.');
    }
  });

  useEffect(() => {
    if (needRefresh) {
      console.log('[PWA Audit] O modal de atualização está sendo exibido ao usuário.');
    }
  }, [needRefresh]);

  const handleUpdate = async () => {
    console.log('[PWA Audit] Usuário confirmou a atualização. Executando skipWaiting() e atualizando...');
    setIsUpdating(true);
    // This calls skipWaiting on the SW, and when the controlling SW changes, it reloads the page
    await updateServiceWorker(true);
    console.log('[PWA Audit] Atualização concluída. Recarregando a página (se não recarregar automaticamente).');
  };

  const handleClose = () => {
    console.log('[PWA Audit] Usuário optou por atualizar depois.');
    setNeedRefresh(false);
  };

  if (!needRefresh) return null;

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
            🚀 Nova versão disponível
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
            Uma nova atualização do Prodin foi encontrada. Deseja atualizar agora para acessar as melhorias mais recentes?
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
              Mais Tarde
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
