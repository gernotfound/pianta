import { useRegisterSW } from 'virtual:pwa-register/react';

function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="pwa-toast-container">
      <div className="pwa-toast">
        <div className="pwa-message">
          <span>🔄 Nuovo aggiornamento dell'app disponibile!</span>
        </div>
        <div className="pwa-buttons">
          <button className="btn btn-primary" style={{ padding: '8px 15px', fontSize: '13px' }} onClick={() => updateServiceWorker(true)}>
            Aggiorna ora
          </button>
          <button className="btn btn-grey" style={{ padding: '8px 15px', fontSize: '13px', margin: 0 }} onClick={() => setNeedRefresh(false)}>
            Ignora
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReloadPrompt;
