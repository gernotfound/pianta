import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import Swal from 'sweetalert2';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

const Home = () => {
  const navigate = useNavigate();
  const gardenTitle = useStore(state => state.gardenTitle);
  const setGardenData = useStore(state => state.setGardenData);
  const plantsDatabase = useStore(state => state.plantsDatabase);

  const editMainTitle = () => {
      Swal.fire({
          title: 'Modifica Nome Giardino',
          input: 'text',
          inputValue: gardenTitle,
          showCancelButton: true,
          confirmButtonText: 'Salva',
          cancelButtonText: 'Annulla'
      }).then((result) => {
          if (result.isConfirmed) {
              setGardenData(result.value, useStore.getState().gardenNotes);
          }
      });
  };

  // Generate statistics
  const activePlants = plantsDatabase.filter(p => p.status !== 'archived');
  const numActive = activePlants.length;
  const numArchived = plantsDatabase.length - numActive;
  const uniqueSpecies = new Set(activePlants.map(p => p.species || p.scientific).filter(Boolean)).size;

  const originCounts = activePlants.reduce((acc, p) => {
      const o = p.origin || 'Altro';
      acc[o] = (acc[o] || 0) + 1;
      return acc;
  }, {});

  const placementCounts = activePlants.reduce((acc, p) => {
      const plc = p.placement || 'Altro';
      acc[plc] = (acc[plc] || 0) + 1;
      return acc;
  }, {});

  const generateChartData = (label, dataObj) => {
      const labels = Object.keys(dataObj);
      const data = Object.values(dataObj);
      return {
          labels,
          datasets: [{
              label: label,
              data: data,
              backgroundColor: [
                  '#4caf50', '#ff9800', '#2196f3', '#9c27b0', '#f44336', '#009688', '#e91e63'
              ],
              borderWidth: 0,
              hoverOffset: 4
          }]
      };
  };

  const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
          legend: {
              position: 'bottom',
              labels: { color: 'var(--text)' }
          }
      }
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

      <h2 style={{ color: 'var(--grey)', borderBottom: '2px solid var(--surface-border)', paddingBottom: '10px', marginBottom: '20px' }}>📊 Dati e Statistiche</h2>
      
      <div id="my-data-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        
        <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--primary)', textAlign: 'center' }}>Riepilogo</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 0 0', fontSize: '16px', lineHeight: '2' }}>
                <li>🌱 <strong>Piante Attive:</strong> {numActive}</li>
                <li>🥀 <strong>Piante Archiviate:</strong> {numArchived}</li>
                <li>🌳 <strong>Specie Uniche:</strong> {uniqueSpecies}</li>
            </ul>
        </div>

        {Object.keys(originCounts).length > 0 && (
            <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <h3 style={{ marginTop: 0, color: 'var(--primary)', textAlign: 'center' }}>Origine</h3>
                <div style={{ height: '200px', position: 'relative' }}>
                    <Pie data={generateChartData('Origine', originCounts)} options={chartOptions} />
                </div>
            </div>
        )}

        {Object.keys(placementCounts).length > 0 && (
            <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <h3 style={{ marginTop: 0, color: 'var(--primary)', textAlign: 'center' }}>Sistemazione</h3>
                <div style={{ height: '200px', position: 'relative' }}>
                    <Pie data={generateChartData('Sistemazione', placementCounts)} options={chartOptions} />
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default Home;
