import React, { useState, useEffect } from 'react';
import { useAuth, AppUser } from '../../contexts/AuthContext';
import { Users, X, CheckCircle, Clock } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export default function AdminFAB() {
  const { appUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<AppUser[]>([]);

  useEffect(() => {
    if (appUser?.role !== 'admin') return;

    const q = query(collection(db, 'users'), where('status', '==', 'pendente'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: AppUser[] = [];
      snapshot.forEach((doc) => {
        users.push({ uid: doc.id, ...doc.data() } as AppUser);
      });
      setPendingUsers(users);
    });

    return () => unsubscribe();
  }, [appUser]);

  const handleApprove = async (userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        status: 'ativo'
      });
    } catch (error) {
      console.error("Error approving user:", error);
    }
  };

  if (appUser?.role !== 'admin') {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-brown dark:bg-slate-700 hover:bg-brown/90 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center justify-center"
      >
        <div className="relative">
          <Users size={24} />
          {pendingUsers.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-pink text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-brown">
              {pendingUsers.length}
            </span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-brown dark:text-white flex items-center gap-2">
                <Users size={24} className="text-pink" />
                Usuários Pendentes
              </h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto">
              {pendingUsers.length === 0 ? (
                <div className="text-center text-slate-500 py-8 flex flex-col items-center">
                  <CheckCircle size={48} className="text-mint mx-auto mb-4 opacity-50" />
                  <p>Não há usuários pendentes de aprovação.</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {pendingUsers.map((user) => (
                    <li key={user.uid} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-800">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{user.email}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <Clock size={12} />
                          Aguardando aprovação
                        </p>
                      </div>
                      <button
                        onClick={() => handleApprove(user.uid)}
                        className="bg-mint hover:bg-mint/90 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all"
                      >
                        Aceitar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
