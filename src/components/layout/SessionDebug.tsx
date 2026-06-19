import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function SessionDebug() {
  const { user, appUser } = useAuth();
  
  if (!user) return null;

  return (
    <div className="fixed top-4 left-4 z-50 bg-black/80 text-mint p-4 rounded-xl text-xs font-mono max-w-xs break-all shadow-lg border border-mint/20 pointer-events-none">
      <div className="font-bold text-white mb-2 text-sm">🛠 Debug de Sessão</div>
      <div className="mb-1"><span className="text-slate-400">Email:</span> {user.email}</div>
      <div className="mb-1"><span className="text-slate-400">UID:</span> {user.uid}</div>
      <div className="mb-1"><span className="text-slate-400">App Role:</span> {appUser?.role || 'null'}</div>
      <div className="mb-1"><span className="text-slate-400">App Status:</span> {appUser?.status || 'null'}</div>
      <div>
        <span className="text-slate-400">Master Admin?</span>{' '}
        {user.email === 'llucianodcl@gmail.com' ? '✅ Sim' : '❌ Não'}
      </div>
    </div>
  );
}
