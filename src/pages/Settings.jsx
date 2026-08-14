import { useStore } from '../store';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

import { exportToCSV } from '../utils/export';

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

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Errore di logout:", error);
    }
  };

  const handleDeleteAll = () => {
      // DANGER ZONE logic (to be implemented with Firebase later, keeping it safe for now)
      Swal.fire({
          icon: 'warning',
          title: 'Sei sicuro?',
          text: 'Questa azione eliminerà TUTTE le tue piante in modo irreversibile.',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          confirmButtonText: 'Sì, elimina tutto',
          cancelButtonText: 'Annulla'
      }).then((result) => {
          if (result.isConfirmed) {
              Swal.fire('Funzione disabilitata', 'Per sicurezza, la cancellazione globale è momentaneamente disattivata in questa versione beta.', 'info');
          }
      });
  };

  return (
    <div className="section active" style={{ paddingBottom: '80px' }}>
      <h2 style={{ color: 'var(--primary)', marginTop: 0 }}>Impostazioni</h2>
      
      <div className="card" style={{ marginTop: '20px' }}>
        <h3>Account</h3>
        <div style={{ padding: '10px', background: 'var(--bg)', borderRadius: '8px', fontSize: '14px', marginBottom: '15px' }}>
          👤 Loggato come: <strong>{user?.email || user?.uid}</strong>
        </div>
        <button className="btn btn-outline" onClick={handleLogout} style={{ width: '100%' }}>
          Esci
        </button>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h3>Dati e Backup</h3>
        <button className="btn btn-blue" onClick={exportToCSV} style={{ width: '100%', marginBottom: '15px' }}>
          📊 Esporta tutto in CSV (Excel)
        </button>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h3>App PWA</h3>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '15px' }}>
          Installa questa web-app sul tuo telefono per averla sulla schermata home, poterla usare offline e rimuovere la barra del browser.
        </p>
        
        {deferredPrompt ? (
          <button className="btn btn-primary" onClick={promptInstall} style={{ width: '100%' }}>
            📱 Installa Pianta
          </button>
        ) : (
          <div style={{ padding: '10px', background: 'var(--bg)', borderRadius: '8px', fontSize: '14px', textAlign: 'center' }}>
            ✅ App già installata o non supportata dal browser.
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '20px', border: '1px solid var(--danger)' }}>
        <h3 style={{ color: 'var(--danger)' }}>⚠️ Zona Pericolosa</h3>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '15px' }}>
          Elimina definitivamente tutti i dati del tuo account (piante, eventi, spese, foto).
        </p>
        <button className="btn btn-danger" onClick={handleDeleteAll} style={{ width: '100%', margin: 0 }}>
          Elimina Database
        </button>
      </div>

    </div>
  );
};

export default Settings;
