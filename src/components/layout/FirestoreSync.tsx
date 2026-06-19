import React, { useEffect, useRef, useState } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useStore } from '../../store/useStore';
import { Loader2 } from 'lucide-react';

export default function FirestoreSync({ children }: { children: React.ReactNode }) {
  const { user, appUser } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const syncing = useRef(false);

  useEffect(() => {
    // Only attempt to sync if the user is fully logged in and approved
    if (!user || !appUser || appUser.status === 'pendente') {
      setIsReady(true);
      return;
    }

    let unsubSnapshot: (() => void) | undefined;

    const syncData = async () => {
      try {
        const userRef = doc(db, 'user_data', user.uid);
        const snapshot = await getDoc(userRef);
        
        const localState = useStore.getState();
        
        if (!snapshot.exists()) {
          // Migration: Firestore doesn't have data, push current local data to Firestore
          const { ingredients, recipes, sales, extras, categories, settings } = localState;
          
          await setDoc(userRef, {
            ingredients,
            recipes,
            sales,
            extras,
            categories,
            settings,
            updatedAt: Date.now()
          });
          setIsReady(true);
        } else {
          // Load data from Firestore to local
          const data = snapshot.data();
          syncing.current = true;
          useStore.setState({
            ingredients: data.ingredients || [],
            recipes: data.recipes || [],
            sales: data.sales || [],
            extras: data.extras || [],
            categories: data.categories || localState.categories,
            settings: data.settings || localState.settings,
          });
          syncing.current = false;
          setIsReady(true);
        }

        // Set up listener for remote changes (e.g., from PWA or other tabs)
        unsubSnapshot = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            // Ignore events that are our own pending local writes
            if (docSnap.metadata.hasPendingWrites) {
              return;
            }
            
            const data = docSnap.data();
            syncing.current = true;
            useStore.setState({
              ingredients: data.ingredients || [],
              recipes: data.recipes || [],
              sales: data.sales || [],
              extras: data.extras || [],
              categories: data.categories || useStore.getState().categories,
              settings: data.settings || useStore.getState().settings,
            });
            // Allow synchronous listeners to fire before clearing the flag
            setTimeout(() => {
              syncing.current = false;
            }, 0);
          }
        });
      } catch (error) {
        console.error("Error setting up Firestore sync:", error);
        setIsReady(true); // Don't block the app completely on error
      }
    };

    syncData();

    return () => {
      if (unsubSnapshot) unsubSnapshot();
    };
  }, [user, appUser]);

  // Sync local changes to Firestore
  useEffect(() => {
    if (!user || !appUser || appUser.status === 'pendente' || !isReady) return;
    
    let timeout: NodeJS.Timeout;
    
    // Subscribe to Zustand state changes to write to Firestore
    const unsubStore = useStore.subscribe((state) => {
      // If the change came from Firestore, don't write it back
      if (syncing.current) return;
      
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        try {
          await setDoc(doc(db, 'user_data', user.uid), {
            ingredients: state.ingredients,
            recipes: state.recipes,
            sales: state.sales,
            extras: state.extras,
            categories: state.categories,
            settings: state.settings,
            updatedAt: Date.now()
          }, { merge: true });
        } catch (e) {
          console.error("Error syncing to Firestore", e);
        }
      }, 1500); // 1.5s debounce to batch quick local writes together
    });
    
    return () => {
      unsubStore();
      clearTimeout(timeout);
    };
  }, [user, appUser, isReady]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4 text-slate-500">
           <Loader2 className="w-8 h-8 animate-spin text-pink" />
           <p className="font-medium animate-pulse">Sincronizando Nuvem...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
