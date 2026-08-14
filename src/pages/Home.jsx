import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import Swal from 'sweetalert2';

ChartJS.register(ArcElement, Tooltip, Legend, Title);
ChartJS.defaults.color = '#e8f5e9'; // Set global text color to white/light green to prevent black text

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
                  '#81c784', '#4db6ac', '#64b5f6', '#ba68c8', '#ffb74d', '#e57373', '#90a4ae'
              ],
              borderWidth: 0,
              hoverOffset: 4
          }]
      };
  };

  const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
          legend: {
              position: 'bottom',
              labels: { 
                  color: '#e8f5e9',
                  padding: 20,
                  font: { family: 'Segoe UI', size: 12 }
              }
          },
          tooltip: {
              backgroundColor: 'rgba(30,30,30,0.9)',
              titleColor: '#fff',
              bodyColor: '#fff',
              borderColor: '#333',
              borderWidth: 1
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
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '35px' }}>
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

      <div style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--surface-border)' }}></div>
          <h2 style={{ margin: 0, color: 'var(--primary)', fontSize: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>Dati e Statistiche</h2>
          <div style={{ flex: 1, height: '1px', background: 'var(--surface-border)' }}></div>
      </div>
      
      {/* 3 KPI Cards for Riepilogo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div style={{ background: 'var(--surface)', padding: '15px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
              <div style={{ fontSize: '24px', marginBottom: '5px' }}>🌱</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--primary)' }}>{numActive}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Piante Attive</div>
          </div>
          <div style={{ background: 'var(--surface)', padding: '15px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
              <div style={{ fontSize: '24px', marginBottom: '5px' }}>🥀</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--danger)' }}>{numArchived}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Archiviate</div>
          </div>
          <div style={{ background: 'var(--surface)', padding: '15px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
              <div style={{ fontSize: '24px', marginBottom: '5px' }}>🌳</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--blue)' }}>{uniqueSpecies}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Specie Uniche</div>
          </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {Object.keys(originCounts).length > 0 && (
            <div style={{ background: 'var(--surface)', padding: '25px 20px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h3 style={{ margin: '0 0 20px 0', color: 'var(--text)', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Origine</h3>
                <div style={{ height: '220px', width: '100%', position: 'relative' }}>
                    <Doughnut data={generateChartData('Origine', originCounts)} options={chartOptions} />
                </div>
            </div>
        )}

        {Object.keys(placementCounts).length > 0 && (
            <div style={{ background: 'var(--surface)', padding: '25px 20px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h3 style={{ margin: '0 0 20px 0', color: 'var(--text)', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Sistemazione</h3>
                <div style={{ height: '220px', width: '100%', position: 'relative' }}>
                    <Doughnut data={generateChartData('Sistemazione', placementCounts)} options={chartOptions} />
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Home;
