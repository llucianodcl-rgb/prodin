import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Link, useLocation } from 'react-router-dom';

export default function AdminFAB() {
  const { appUser } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    if (appUser?.role !== 'admin') return;

    const q = query(collection(db, 'users'), where('status', '==', 'pendente'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [appUser]);

  // Não mostrar o FAB se não for admin ou se já estiver na página de usuários
  if (appUser?.role !== 'admin' || location.pathname === '/usuarios') return null;

  return (
    <div className="fixed bottom-28 right-6 z-50">
      <Link
        to="/usuarios"
        className="relative bg-brown dark:bg-slate-700 hover:bg-brown/90 text-white p-4 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 flex items-center justify-center group"
        title="Gerenciar Usuários"
      >
        <Users size={24} />
        
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-pink text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-brown dark:border-slate-700 animate-bounce">
            {pendingCount}
          </span>
        )}
        
        <span className="absolute right-full mr-3 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
          Gerenciar Usuários
        </span>
      </Link>
    </div>
  );
}
