import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, initializeFirebase } from '../firebase';

export interface AppUser {
  uid: string;
  email: string;
  status: 'pendente' | 'ativo';
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  loading: true,
  signInWithGoogle: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);

  useEffect(() => {
    initializeFirebase().then(() => {
        setFirebaseInitialized(true);
    });
  }, []);

  useEffect(() => {
    if (!firebaseInitialized) return;

    let unsubDoc: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      // Cleanup previous listener if it exists
      if (unsubDoc) {
          unsubDoc();
          unsubDoc = undefined;
      }

      if (currentUser) {
        if (!currentUser.email) return;
        
        try {
            // Subscribe to user document changes to update status in real-time
            const userRef = doc(db, 'users', currentUser.uid);
            
            // First check if user exists, if not create it
            const userDoc = await getDoc(userRef);
            const isAdmin = currentUser.email === 'llucianodcl@gmail.com';

            if (!userDoc.exists()) {
                const newUser: Omit<AppUser, 'uid'> & { createdAt: any } = {
                    email: currentUser.email,
                    status: isAdmin ? 'ativo' : 'pendente',
                    role: isAdmin ? 'admin' : 'user',
                    createdAt: serverTimestamp()
                };
                await setDoc(userRef, newUser);
                setAppUser({ uid: currentUser.uid, ...newUser } as AppUser);
            } else {
                // Sincronização forçada: se for o admin master e o Firestore estiver dessincronizado
                const data = userDoc.data();
                if (isAdmin && (data.role !== 'admin' || data.status !== 'ativo')) {
                    await setDoc(userRef, { role: 'admin', status: 'ativo' }, { merge: true });
                }
            }
            
            unsubDoc = onSnapshot(userRef, (docSnap) => {
                if (docSnap.exists()) {
                    setAppUser({ uid: docSnap.id, ...docSnap.data() } as AppUser);
                }
            });
            
            setLoading(false);
        } catch (error) {
            console.error("Error fetching/creating user doc", error);
            setLoading(false);
        }
      } else {
        setAppUser(null);
        setLoading(false);
      }
    });

    return () => {
        unsubscribe();
        if (unsubDoc) {
            unsubDoc();
        }
    };
  }, [firebaseInitialized]);

  const signInWithGoogle = async () => {
    if (!firebaseInitialized) return;
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const logout = async () => {
    if (!firebaseInitialized) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, appUser, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
