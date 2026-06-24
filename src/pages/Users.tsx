import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { AppUser } from '../contexts/AuthContext';
import { UserCheck, UserX, Clock, CheckCircle2, XCircle, Users as UsersIcon, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

export default function Users() {
  const { appUser } = useAuth();
  const { showModal, addToast } = useStore();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab ] = useState<'pendentes' | 'aprovados' | 'cancelados'>('pendentes');

  // Proteção: apenas admin acessa esta página
  if (appUser?.role !== 'admin') {
    return <Navigate to="/" />;
  }

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData: AppUser[] = [];
      snapshot.forEach((doc) => {
        usersData.push({ uid: doc.id, ...doc.data() } as AppUser);
      });
      setUsers(usersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        status: 'ativo',
        approvedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Erro ao aprovar usuário:", error);
    }
  };

  const handleCancel = async (uid: string) => {
    const user = users.find(u => u.uid === uid);
    showModal({
      title: "Cancelar Acesso",
      message: `Deseja realmente cancelar/revogar o acesso do usuário "${user?.name || user?.email}"?`,
      confirmText: "Confirmar Cancelamento",
      type: "danger",
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'users', uid), {
            status: 'cancelado',
            canceledAt: serverTimestamp()
          });
          addToast({
            message: "Acesso revogado com sucesso.",
            type: "warning"
          });
        } catch (error) {
          console.error("Erro ao cancelar usuário:", error);
          addToast({
            message: "Erro ao revogar acesso.",
            type: "danger"
          });
        }
      }
    });
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '---';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (user.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (activeTab === 'pendentes') return user.status === 'pendente' && matchesSearch;
    if (activeTab === 'aprovados') return user.status === 'ativo' && matchesSearch;
    if (activeTab === 'cancelados') return user.status === 'cancelado' && matchesSearch;
    return matchesSearch;
  });

  const stats = {
    pendentes: users.filter(u => u.status === 'pendente').length,
    aprovados: users.filter(u => u.status === 'ativo').length,
    cancelados: users.filter(u => u.status === 'cancelado').length,
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-brown dark:text-white flex items-center gap-2">
            <UsersIcon className="text-pink" />
            Gestão de Usuários
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Controle o acesso ao sistema</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-pink/20 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink transition-all w-full md:w-64 text-sm"
          />
        </div>
      </div>

      <div className="flex p-1 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl mb-6 shadow-sm border border-pink/10">
        <button
          onClick={() => setActiveTab('pendentes')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'pendentes' 
              ? 'bg-pink text-white shadow-md shadow-pink/20' 
              : 'text-slate-500 hover:text-pink'
          }`}
        >
          Pendentes
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === 'pendentes' ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
            {stats.pendentes}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('aprovados')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'aprovados' 
              ? 'bg-pink text-white shadow-md shadow-pink/20' 
              : 'text-slate-500 hover:text-pink'
          }`}
        >
          Aprovados
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === 'aprovados' ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
            {stats.aprovados}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('cancelados')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'cancelados' 
              ? 'bg-pink text-white shadow-md shadow-pink/20' 
              : 'text-slate-500 hover:text-pink'
          }`}
        >
          Cancelados
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === 'cancelados' ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
            {stats.cancelados}
          </span>
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-pink border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-500">Carregando usuários...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-pink/10 shadow-soft">
            <div className="bg-slate-50 dark:bg-slate-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <UsersIcon className="text-slate-300" size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Nenhum usuário encontrado</h3>
            <p className="text-slate-400">Tente buscar por outro termo ou mude a aba.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredUsers.map((user) => (
              <motion.div
                key={user.uid}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-soft border border-pink/5 hover:border-pink/20 transition-all group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.name} className="w-12 h-12 rounded-2xl shadow-sm" />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-pink-soft dark:bg-pink-500/10 flex items-center justify-center text-pink font-black text-xl">
                        {(user.name || user.email).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-brown dark:text-white leading-tight">
                        {user.name || 'Sem nome'}
                      </h4>
                      <p className="text-sm text-slate-500 font-medium">{user.email}</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                        ID: <span className="font-mono">{user.uid}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {activeTab === 'pendentes' && (
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleCancel(user.uid)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl text-sm font-bold transition-all"
                        >
                          <UserX size={18} />
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleApprove(user.uid)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-pink hover:bg-pink/90 text-white rounded-xl text-sm font-bold shadow-sm shadow-pink/20 transition-all"
                        >
                          <UserCheck size={18} />
                          Aprovar
                        </button>
                      </div>
                    )}

                    {activeTab === 'aprovados' && (
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-1">
                          <CheckCircle2 size={14} />
                          Aprovado
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 text-[10px] font-medium">
                          <Clock size={12} />
                          {formatDate(user.approvedAt)}
                        </div>
                        <button
                          onClick={() => handleCancel(user.uid)}
                          className="mt-2 text-[10px] text-slate-400 hover:text-rose-500 font-bold underline decoration-dotted"
                        >
                          Revogar Acesso
                        </button>
                      </div>
                    )}

                    {activeTab === 'cancelados' && (
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 text-xs font-bold mb-1">
                          <XCircle size={14} />
                          Cancelado
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 text-[10px] font-medium">
                          <Clock size={12} />
                          {formatDate(user.canceledAt)}
                        </div>
                        <button
                          onClick={() => handleApprove(user.uid)}
                          className="mt-2 text-[10px] text-slate-400 hover:text-emerald-500 font-bold underline decoration-dotted"
                        >
                          Reaprovar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
