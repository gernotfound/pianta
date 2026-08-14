import { useState } from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import WeatherAlerts from '../components/WeatherAlerts';

const Events = () => {
  const navigate = useNavigate();
  const plantsDatabase = useStore(state => state.plantsDatabase);
  const [filterType, setFilterType] = useState('');

  // Extract all logs and sort them by date descending
  let allLogs = [];
  plantsDatabase.forEach(plant => {
      if (plant.logs && Array.isArray(plant.logs)) {
          plant.logs.forEach(log => {
              allLogs.push({
                  ...log,
                  plantId: plant.id,
                  plantName: plant.name
              });
          });
      }
  });

  allLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (filterType) {
      allLogs = allLogs.filter(log => log.type === filterType);
  }

  const getTypeIcon = (type) => {
    switch (type) {
        case 'Innaffiatura': return '💧';
        case 'Concimazione': return '🧪';
        case 'Rinvaso / Sistemazione': return '🪴';
        case 'Misurazione': return '📏';
        case 'Misurazione pH': return '🧪';
        case 'Problema / Malattia': return '⚠️';
        case 'Raccolto': return '🧺';
        case 'Innesto': return '🔪';
        default: return '📝';
    }
  };

  return (
    <div className="fade-in section active" style={{ paddingBottom: '100px' }}>
      <WeatherAlerts />
      <h2 style={{ marginTop: 0, color: 'var(--primary)', paddingBottom: '5px' }}>Timeline Eventi Globali</h2>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--surface)', padding: '15px', borderRadius: '8px' }}>
          <label style={{ margin: 0, fontWeight: 'bold' }}>Filtra:</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ flex: 1, margin: 0 }}>
              <option value="">Tutti gli eventi</option>
              <option value="Innaffiatura">💧 Innaffiatura</option>
              <option value="Concimazione">🧪 Concimazione</option>
              <option value="Rinvaso / Sistemazione">🪴 Rinvaso / Sistemazione</option>
              <option value="Misurazione">📏 Misurazione (Altezza)</option>
              <option value="Misurazione pH">🧪 Misurazione pH</option>
              <option value="Problema / Malattia">⚠️ Problemi / Malattie</option>
              <option value="Raccolto">🧺 Raccolto</option>
              <option value="Innesto">🔪 Innesto</option>
              <option value="Generico">📝 Generico</option>
          </select>
      </div>

      {allLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--surface)', borderRadius: '12px', border: '2px dashed var(--surface-border)', opacity: 0.8 }}>
              <span style={{ fontSize: '40px' }}>🗓️</span>
              <h3 style={{ color: 'var(--text-muted)' }}>Nessun evento registrato</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Aggiungi eventi dal dettaglio della pianta per vederli qui.</p>
          </div>
      ) : (
          <ul className="timeline">
              {allLogs.map((log, index) => (
                  <li key={`${log.plantId}_${index}`} className="timeline-item" onClick={() => navigate(`/plant/${log.plantId}`)} style={{ cursor: 'pointer' }}>
                      <div className="timeline-icon">{getTypeIcon(log.type)}</div>
                      <div className="timeline-content">
                          <div className="timeline-date">
                              {new Date(log.date).toLocaleDateString('it-IT')} 
                              <span style={{ color: 'var(--primary)', marginLeft: '8px', fontWeight: 'bold' }}>• {log.plantName}</span>
                          </div>
                          <div className="timeline-type">{log.type}</div>
                          
                          {log.type === 'Misurazione' && log.height && (
                              <div className="timeline-details">📏 Altezza: {log.height} cm</div>
                          )}
                          {log.type === 'Misurazione pH' && log.ph && (
                              <div className="timeline-details">🧪 pH misurato: {log.ph}</div>
                          )}
                          {log.type === 'Raccolto' && log.harvest && (
                              <div className="timeline-details">🧺 Resa: {log.harvest}</div>
                          )}
                          {log.type === 'Rinvaso / Sistemazione' && log.placement && (
                              <div className="timeline-details">🪴 Nuova sistemazione: {log.placement} {log.potSize ? `(${log.potSize} L)` : ''}</div>
                          )}
                          {log.type === 'Innesto' && log.graftName && (
                              <div className="timeline-details">🔪 Nuovo nome: {log.graftName}</div>
                          )}
                          
                          {log.note && <div className="timeline-note">{log.note}</div>}
                      </div>
                  </li>
              ))}
          </ul>
      )}
    </div>
  );
};

export default Events;
