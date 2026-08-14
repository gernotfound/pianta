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
    <div style={{ position: 'fixed', bottom: '85px', left: '50%', transform: 'translateX(-50%)', zIndex: 10000, padding: '0 20px', width: '100%', maxWidth: '400px' }}>
      <div style={{ 
        background: 'rgba(30, 30, 30, 0.95)', 
        backdropFilter: 'blur(10px)', 
        border: '1px solid rgba(0, 230, 118, 0.3)', 
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)', 
        borderRadius: '16px', 
        padding: '20px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '15px',
        animation: 'slideUp 0.4s ease-out forwards'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(0, 230, 118, 0.1)', padding: '10px', borderRadius: '50%', color: 'var(--primary)', fontSize: '20px', display: 'flex' }}>
            🚀
          </div>
          <div>
            <h4 style={{ margin: '0 0 4px 0', color: 'var(--text)', fontSize: '16px' }}>Nuova versione disponibile!</h4>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.4' }}>Abbiamo pubblicato dei miglioramenti. Aggiorna per caricare le novità.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <button 
            style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'var(--surface-border)', color: 'var(--text)', border: 'none', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }} 
            onClick={() => setNeedRefresh(false)}>
            Ignora
          </button>
          <button 
            style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'var(--primary)', color: '#000', border: 'none', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0, 230, 118, 0.4)' }} 
            onClick={() => updateServiceWorker(true)}>
            Aggiorna ora
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default ReloadPrompt;
