import { auth, provider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { useState } from 'react';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Errore di login:", err);
      setError("Impossibile effettuare l'accesso. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      textAlign: 'center',
      background: 'var(--bg)'
    }}>
      <div style={{
        background: 'var(--surface)',
        padding: '40px 20px',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        border: '1px solid var(--surface-border)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>🥑</div>
        <h1 style={{ color: 'var(--primary)', marginBottom: '10px', marginTop: 0 }}>Pianta</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '15px' }}>
          Pianta nel cloud. Accedi per gestire le tue piante da qualsiasi dispositivo.
        </p>

        {error && (
          <div style={{
            background: 'rgba(244, 67, 54, 0.1)',
            color: '#f44336',
            padding: '10px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            border: '1px solid rgba(244, 67, 54, 0.3)'
          }}>
            {error}
          </div>
        )}

        <button 
          className="btn btn-primary" 
          onClick={handleLogin} 
          disabled={loading}
          style={{ width: '100%', padding: '15px', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
        >
          {loading ? 'Accesso in corso...' : '🔐 Accedi con Google'}
        </button>
      </div>
    </div>
  );
};

export default Login;
