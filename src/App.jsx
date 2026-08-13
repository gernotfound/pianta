import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { useStore } from './store';

import Layout from './components/Layout';
import Home from './pages/Home';
import PlantsGrid from './pages/PlantsGrid';
import PlantForm from './pages/PlantForm';
import Events from './pages/Events';
import Settings from './pages/Settings';
import PlantDetail from './pages/PlantDetail';
import Tools from './pages/Tools';
import Login from './pages/Login';
import ReloadPrompt from './components/ReloadPrompt';

function App() {
  const setPlants = useStore(state => state.setPlants);
  const setDeferredPrompt = useStore(state => state.setDeferredPrompt);
  const setGardenData = useStore(state => state.setGardenData);
  const setUser = useStore(state => state.setUser);
  const authLoading = useStore(state => state.authLoading);
  const setAuthLoading = useStore(state => state.setAuthLoading);
  const user = useStore(state => state.user);

  useEffect(() => {
    // PWA Install Prompt Listener (Global)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Firebase Auth Listener
    let unsubscribePlants = null;
    let unsubscribeExpenses = null;
    let unsubscribeWishlist = null;

    const setExpenses = useStore.getState().setExpenses;
    const setWishlist = useStore.getState().setWishlist;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        console.log("Utente loggato:", currentUser.uid);
        
        try {
          const { doc, getDoc, collection, onSnapshot } = await import('firebase/firestore');
          const { db } = await import('./firebase');
          
          // 1. Fetch User Data (gardenTitle, etc)
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setGardenData(userData.gardenTitle || "🌿 Gestione Piante Tropicali - Pro", userData.gardenNotes || "");
          }
  
          // 2. Listen to Plants Collection
          const plantsColRef = collection(db, 'users', currentUser.uid, 'plants');
          unsubscribePlants = onSnapshot(plantsColRef, (snapshot) => {
            const plantsData = snapshot.docs.map(docSnap => ({
               id: docSnap.id,
               ...docSnap.data()
            }));
            setPlants(plantsData);
          }, (error) => {
            console.error("Errore lettura database piante:", error);
          });

          // 3. Listen to Expenses Collection
          const expensesColRef = collection(db, 'users', currentUser.uid, 'expenses');
          unsubscribeExpenses = onSnapshot(expensesColRef, (snapshot) => {
            const expensesData = snapshot.docs.map(docSnap => ({
               id: docSnap.id,
               ...docSnap.data()
            }));
            setExpenses(expensesData);
          }, (error) => console.error("Errore lettura spese:", error));

          // 4. Listen to Wishlist Collection
          const wishlistColRef = collection(db, 'users', currentUser.uid, 'wishlist');
          unsubscribeWishlist = onSnapshot(wishlistColRef, (snapshot) => {
            const wishlistData = snapshot.docs.map(docSnap => ({
               id: docSnap.id,
               ...docSnap.data()
            }));
            setWishlist(wishlistData);
          }, (error) => console.error("Errore lettura wishlist:", error));

        } catch(e) {
          console.error("Firebase fetch error:", e);
        }
        
      } else {
        console.log("Nessun utente loggato");
        setPlants([]); // Empty on logout
        setExpenses([]);
        setWishlist([]);
        if (unsubscribePlants) {
          unsubscribePlants();
          unsubscribePlants = null;
        }
        if (unsubscribeExpenses) {
          unsubscribeExpenses();
          unsubscribeExpenses = null;
        }
        if (unsubscribeWishlist) {
          unsubscribeWishlist();
          unsubscribeWishlist = null;
        }
      }
      
      setAuthLoading(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      unsubscribeAuth();
      if (unsubscribePlants) unsubscribePlants();
      if (unsubscribeExpenses) unsubscribeExpenses();
      if (unsubscribeWishlist) unsubscribeWishlist();
    };
  }, [setPlants, setDeferredPrompt, setGardenData, setUser, setAuthLoading]);

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg)', color: 'var(--primary)' }}>
        <h2>Caricamento...</h2>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Login />
        <ReloadPrompt />
      </>
    );
  }

  return (
    <>
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="plants" element={<PlantsGrid />} />
        <Route path="plants/:id" element={<PlantDetail />} />
        <Route path="add-plant" element={<PlantForm />} />
        <Route path="edit-plant/:id" element={<PlantForm />} />
        <Route path="events" element={<Events />} />
        <Route path="settings" element={<Settings />} />
        <Route path="tools" element={<Tools />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    <ReloadPrompt />
    </>
  );
}

export default App;
