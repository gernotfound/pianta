import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';

const Home = () => {
  const navigate = useNavigate();
  const gardenTitle = useStore(state => state.gardenTitle);

  const editMainTitle = () => {
    // This will be implemented using SweetAlert2 later
    console.log("Edit title");
  };

  return (
    <div className="fade-in" style={{ paddingBottom: '20px' }}>
      <div className="dashboard-panel" style={{ padding: '20px 25px', marginBottom: '20px', textAlign: 'center' }}>
        <h1 className="garden-title" style={{ justifyContent: 'center', fontSize: '28px' }}>
          <span id="main-title">{gardenTitle}</span>
          <button className="edit-title-btn" onClick={editMainTitle} title="Modifica il nome" aria-label="Modifica nome giardino">✏️</button>
        </h1>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '25px' }}>
        <button className="btn btn-purple" style={{ margin:0, padding:'10px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', fontWeight: 'bold', fontSize: '14px' }} onClick={() => navigate('/tools?tab=expenses')}>
          <span style={{ fontSize:'22px' }}>💰</span> Spese
        </button>
        <button className="btn btn-warning" style={{ margin:0, padding:'10px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', fontWeight: 'bold', fontSize: '14px' }} onClick={() => navigate('/tools?tab=wishlist')}>
          <span style={{ fontSize:'22px' }}>🛒</span> Wishlist
        </button>
        <button className="btn btn-blue" style={{ margin:0, padding:'10px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', fontWeight: 'bold', fontSize: '14px' }} onClick={() => navigate('/tools?tab=gallery')}>
          <span style={{ fontSize:'22px' }}>🖼️</span> Archivio Foto
        </button>
        <button className="btn" style={{ margin:0, padding:'10px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', fontWeight: 'bold', fontSize: '14px' }} onClick={() => navigate('/tools?tab=scanner')}>
          <span style={{ fontSize:'22px' }}>🏷️</span> Scanner QR
        </button>
        <button className="btn" style={{ margin:0, padding:'10px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', fontWeight: 'bold', fontSize: '14px' }} onClick={() => navigate('/tools?tab=macro')}>
          <span style={{ fontSize:'22px' }}>☑️</span> Azioni Macro
        </button>
        <button className="btn" style={{ margin:0, padding:'10px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', fontWeight: 'bold', fontSize: '14px' }} onClick={() => navigate('/tools?tab=archive')}>
          <span style={{ fontSize:'22px' }}>🥀</span> Piante Perse
        </button>
        <button className="btn" style={{ margin:0, padding:'10px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', fontWeight: 'bold', fontSize: '14px', gridColumn: 'span 2' }} onClick={() => navigate('/tools?tab=map')}>
          <span style={{ fontSize:'22px' }}>🗺️</span> Mappa Globale
        </button>
      </div>

      <h2 style={{ color: 'var(--grey)', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>📊 Dati e Statistiche</h2>
      <div id="my-data-content">
        {/* Statistics will be rendered here */}
        <p>Statistiche in arrivo...</p>
      </div>
    </div>
  );
};

export default Home;
