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
import ReloadPrompt from './components/ReloadPrompt';

function App() {
  const setPlants = useStore(state => state.setPlants);
  const setDeferredPrompt = useStore(state => state.setDeferredPrompt);
  const setGardenData = useStore(state => state.setGardenData);
  const setUser = useStore(state => state.setUser);

  useEffect(() => {
    // PWA Install Prompt Listener (Global)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Firebase Auth Listener
    let unsubscribePlants = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        console.log("Utente loggato:", user.uid);
        
        try {
          const { doc, getDoc, collection, onSnapshot } = await import('firebase/firestore');
          const { db } = await import('./firebase');
          
          // 1. Fetch User Data (gardenTitle, etc)
          const userDocRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setGardenData(userData.gardenTitle || "🌿 Gestione Piante Tropicali - Pro", userData.gardenNotes || "");
          }
  
          // 2. Listen to Plants Collection
          const plantsColRef = collection(db, 'users', user.uid, 'plants');
          unsubscribePlants = onSnapshot(plantsColRef, (snapshot) => {
            const plantsData = snapshot.docs.map(docSnap => ({
               id: docSnap.id,
               ...docSnap.data()
            }));
            setPlants(plantsData);
          }, (error) => {
            console.error("Errore lettura database piante:", error);
          });
        } catch(e) {
          console.error("Firebase fetch error:", e);
        }
        
      } else {
        console.log("Nessun utente loggato");
        setPlants([]); // Empty on logout
        if (unsubscribePlants) {
          unsubscribePlants();
          unsubscribePlants = null;
        }
      }
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      unsubscribeAuth();
      if (unsubscribePlants) unsubscribePlants();
    };
  }, [setPlants, setDeferredPrompt, setGardenData, setUser]);

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
