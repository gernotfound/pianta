import { useStore } from '../store';
import { auth, provider } from '../firebase';
import { signInWithPopup, signOut } from 'firebase/auth';

const Settings = () => {
  const deferredPrompt = useStore(state => state.deferredPrompt);
  const setDeferredPrompt = useStore(state => state.setDeferredPrompt);
  const user = useStore(state => state.user);

  const promptInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Errore di login:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Errore di logout:", error);
    }
  };

  return (
    <div className="section active" style={{ paddingBottom: '80px' }}>
      <h2 style={{ color: 'var(--primary)', marginTop: 0 }}>Impostazioni</h2>
      
      <div className="card" style={{ marginTop: '20px' }}>
        <h3>Account e Sincronizzazione</h3>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '15px' }}>
          Accedi con Google per sincronizzare il tuo database delle piante nel cloud.
        </p>
        
        {user ? (
          <div>
            <div style={{ padding: '10px', background: 'var(--bg)', borderRadius: '8px', fontSize: '14px', marginBottom: '15px' }}>
              👤 Loggato come: <strong>{user.email || user.uid}</strong>
            </div>
            <button className="btn btn-outline" onClick={handleLogout} style={{ width: '100%' }}>
              Esci
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={handleLogin}>
            🔐 Accedi con Google
          </button>
        )}
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h3>App PWA</h3>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '15px' }}>
          Installa questa web-app sul tuo telefono per averla sulla schermata home, poterla usare offline e rimuovere la barra del browser.
        </p>
        
        {deferredPrompt ? (
          <button className="btn btn-primary" onClick={promptInstall}>
            📱 Installa Pianta Pro
          </button>
        ) : (
          <div style={{ padding: '10px', background: 'var(--bg)', borderRadius: '8px', fontSize: '14px', textAlign: 'center' }}>
            ✅ App già installata o non supportata dal browser.
          </div>
        )}
      </div>

    </div>
  );
};

export default Settings;
