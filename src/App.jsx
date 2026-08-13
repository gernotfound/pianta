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

  useEffect(() => {
    // PWA Install Prompt Listener (Global)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Firebase Auth Listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("Utente loggato:", user.uid);
        // Here we would normally fetch the user's document from Firestore
        // For now, let's load some mock data to test the UI
        setPlants([
          { id: '1', name: 'Monstera', scientific: 'Monstera deliciosa', status: 'active', placement: 'Vaso' },
          { id: '2', name: 'Pothos', scientific: 'Epipremnum aureum', status: 'active', placement: 'Vaso' },
          { id: '3', name: 'Ficus (Morto)', scientific: 'Ficus elastica', status: 'archived', placement: 'Piena terra' }
        ]);
      } else {
        console.log("Nessun utente loggato");
        setPlants([]); // Empty on logout
      }
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      unsubscribe();
    };
  }, [setPlants, setDeferredPrompt]);

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
