import { useStore } from '../store';

const Settings = () => {
  const deferredPrompt = useStore(state => state.deferredPrompt);
  const setDeferredPrompt = useStore(state => state.setDeferredPrompt);

  const promptInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  return (
    <div className="section active" style={{ paddingBottom: '80px' }}>
      <h2 style={{ color: 'var(--primary)', marginTop: 0 }}>Impostazioni</h2>
      
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
