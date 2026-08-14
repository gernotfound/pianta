import { useState } from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import PlantCard from '../components/PlantCard';

const PlantsGrid = () => {
  const navigate = useNavigate();
  const plantsDatabase = useStore(state => state.plantsDatabase);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPlants = plantsDatabase
    .filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (p.species && p.species.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const uniqueSpecies = new Set(filteredPlants.map(p => p.species).filter(Boolean)).size;

  return (
    <div className="fade-in">
      <div className="search-sort-bar" style={{ borderRadius: '8px', marginBottom: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '15px', background: 'var(--surface)' }}>
        <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Cerca pianta o specie..." 
              aria-label="Cerca pianta"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <span 
                role="button" 
                tabIndex="0" 
                aria-label="Cancella ricerca" 
                onClick={() => setSearchTerm('')} 
                style={{ position:'absolute', right:'15px', top:'50%', transform:'translateY(-50%)', background:'var(--surface-border)', color:'var(--text)', borderRadius:'50%', width:'22px', height:'22px', textAlign:'center', lineHeight:'22px', fontSize:'12px', cursor:'pointer', fontWeight:'bold' }}
              >✖</span>
            )}
        </div>
        <button className="btn btn-blue" style={{ margin: 0, whiteSpace: 'nowrap' }} aria-label="Apri filtri">Filtri 🛠️</button>
      </div>

      <div id="dashboard-stats" aria-live="polite">
          Piante mostrate: <span>{filteredPlants.length}</span> | Specie uniche: <span>{uniqueSpecies}</span>
      </div>

      {filteredPlants.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--surface)', borderRadius: '12px', border: '2px dashed var(--surface-border)', marginTop: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '50px' }} aria-hidden="true">🌱</span>
            <h3 style={{ color: 'var(--primary)', marginBottom: '10px' }}>Il tuo giardino è vuoto</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '25px' }}>Inizia ad aggiungere le tue piante per tenere traccia della loro crescita e degli eventi.</p>
            <button className="btn" style={{ fontSize: '16px', padding: '12px 25px' }} onClick={() => navigate('/add-plant')}>➕ Aggiungi la prima Pianta</button>
        </div>
      ) : (
        <div id="plants-grid">
          {filteredPlants.map(plant => (
            <PlantCard key={plant.id} plant={plant} />
          ))}
        </div>
      )}
    </div>
  );
};

export default PlantsGrid;
