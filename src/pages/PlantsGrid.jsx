import { useState } from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import PlantCard from '../components/PlantCard';

const PlantsGrid = () => {
  const navigate = useNavigate();
  const plantsDatabase = useStore(state => state.plantsDatabase);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [filterPlacement, setFilterPlacement] = useState('all');
  const [filterOrigin, setFilterOrigin] = useState('all');

  const filteredPlants = plantsDatabase
    .filter(p => p.status !== 'archived')
    .filter(p => {
        const nameMatch = p.name ? p.name.toLowerCase().includes(searchTerm.toLowerCase()) : false;
        const scientificMatch = p.species ? p.species.toLowerCase().includes(searchTerm.toLowerCase()) : false;
        if (searchTerm && !nameMatch && !scientificMatch) return false;
        
        if (filterPlacement !== 'all' && p.placement !== filterPlacement && !(p.placement == null && filterPlacement === 'Vaso' && p.potSize)) return false;
        if (filterOrigin !== 'all' && p.origin !== filterOrigin) return false;
        
        return true;
    })
    .sort((a, b) => {
        if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
        if (sortBy === 'newest') return (b.id || 0) - (a.id || 0); // fallback if no id is to just keep order
        if (sortBy === 'oldest') return (a.id || 0) - (b.id || 0);
        if (sortBy === 'last_updated') {
            let lastA = a.logs && a.logs.length > 0 ? Math.max(...a.logs.map(l => new Date(l.date).getTime() || 0)) : 0;
            let lastB = b.logs && b.logs.length > 0 ? Math.max(...b.logs.map(l => new Date(l.date).getTime() || 0)) : 0;
            return lastB - lastA;
        }
        if (sortBy === 'temp_desc') {
            let tempA = (a.minTemp !== undefined && a.minTemp !== null) ? parseFloat(a.minTemp) : -999;
            let tempB = (b.minTemp !== undefined && b.minTemp !== null) ? parseFloat(b.minTemp) : -999;
            return tempB - tempA;
        }
        if (sortBy === 'ph_desc') {
            let phA = (a.phMax !== undefined && a.phMax !== null) ? parseFloat(a.phMax) : -999;
            let phB = (b.phMax !== undefined && b.phMax !== null) ? parseFloat(b.phMax) : -999;
            return phB - phA;
        }
        return 0;
    });



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
        <button className="btn btn-blue" style={{ margin: 0, whiteSpace: 'nowrap' }} aria-label="Apri filtri" onClick={() => setIsFilterOpen(true)}>Filtri 🛠️</button>
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

      {/* Filter Sidebar Overlay */}
      {isFilterOpen && (
        <div className="sidebar-overlay" style={{ display: 'block' }} onClick={(e) => { if (e.target.className === 'sidebar-overlay') setIsFilterOpen(false); }}>
            <div className="sidebar-content" style={{ width: '380px', display: 'flex', flexDirection: 'column', padding: '0', background: 'var(--bg)' }}>
                
                <div className="sidebar-header" style={{ padding: '20px', borderBottom: '2px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '20px' }}>🛠️ Ricerca Avanzata</h3>
                    <button className="close-sidebar-btn" onClick={() => setIsFilterOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text)', fontSize: '24px', cursor: 'pointer' }}>×</button>
                </div>
                
                <div className="sidebar-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', overflowY: 'auto' }}>
                    
                    <div className="filter-group">
                        <span className="filter-group-title" style={{ display: 'block', marginBottom: '10px', color: 'var(--grey)', fontWeight: 'bold' }}>🔀 Ordina l'elenco per:</span>
                        <div className="modern-chip-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {[
                                { id: 'sort-name', value: 'name', label: '🔤 Nome (A-Z)' },
                                { id: 'sort-newest', value: 'newest', label: '🆕 Recenti' },
                                { id: 'sort-oldest', value: 'oldest', label: '🕰️ Vecchi' },
                                { id: 'sort-updated', value: 'last_updated', label: '🔄 Ultimi Eventi' },
                                { id: 'sort-temp', value: 'temp_desc', label: '🌡️ Temperatura' },
                                { id: 'sort-ph', value: 'ph_desc', label: '🧪 pH' }
                            ].map(opt => (
                                <div key={opt.id} style={{ display: 'inline-block' }}>
                                    <input type="radio" id={opt.id} name="sortBy" value={opt.value} checked={sortBy === opt.value} onChange={() => setSortBy(opt.value)} className="chip-radio" />
                                    <label htmlFor={opt.id} className="chip-label">{opt.label}</label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="filter-group">
                        <span className="filter-group-title" style={{ display: 'block', marginBottom: '10px', color: 'var(--grey)', fontWeight: 'bold' }}>🪴 Sistemazione:</span>
                        <div className="modern-chip-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {[
                                { id: 'place-all', value: 'all', label: 'Tutte' },
                                { id: 'place-vaso', value: 'Vaso', label: 'In Vaso' },
                                { id: 'place-terra', value: 'Piena terra', label: 'Piena terra' },
                                { id: 'place-idro', value: 'Idroponica', label: 'Idroponica' }
                            ].map(opt => (
                                <div key={opt.id} style={{ display: 'inline-block' }}>
                                    <input type="radio" id={opt.id} name="filterPlacement" value={opt.value} checked={filterPlacement === opt.value} onChange={() => setFilterPlacement(opt.value)} className="chip-radio" />
                                    <label htmlFor={opt.id} className="chip-label">{opt.label}</label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="filter-group">
                        <span className="filter-group-title" style={{ display: 'block', marginBottom: '10px', color: 'var(--grey)', fontWeight: 'bold' }}>🌱 Origine / Metodo:</span>
                        <div className="modern-chip-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {[
                                { id: 'orig-all', value: 'all', label: 'Tutte' },
                                { id: 'orig-seme', value: 'Da seme', label: 'Da Seme' },
                                { id: 'orig-talea', value: 'Da talea', label: 'Da Talea' },
                                { id: 'orig-innesto', value: 'Innesto', label: 'Innesto' },
                                { id: 'orig-marg', value: 'Margotta', label: 'Margotta' }
                            ].map(opt => (
                                <div key={opt.id} style={{ display: 'inline-block' }}>
                                    <input type="radio" id={opt.id} name="filterOrigin" value={opt.value} checked={filterOrigin === opt.value} onChange={() => setFilterOrigin(opt.value)} className="chip-radio" />
                                    <label htmlFor={opt.id} className="chip-label">{opt.label}</label>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                <div className="sidebar-footer" style={{ padding: '20px', borderTop: '1px solid var(--surface-border)' }}>
                    <button className="btn btn-blue" style={{ width: '100%', margin: 0, padding: '15px', fontSize: '16px' }} onClick={() => setIsFilterOpen(false)}>
                        Applica filtri e chiudi
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default PlantsGrid;
