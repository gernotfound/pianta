import { useNavigate } from 'react-router-dom';

const OFFLINE_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23e0e0e0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='18' fill='%23757575'%3ENessuna Foto%3C/text%3E%3C/svg%3E";

const PlantCard = ({ plant }) => {
  const navigate = useNavigate();
  
  const archiveStyle = plant.status === 'archived' ? { borderLeftColor: 'var(--danger)', opacity: 0.85 } : {};
  const nameColor = plant.status === 'archived' ? 'var(--danger)' : 'var(--primary)';
  const rawPhoto = plant.fruitPhoto || plant.photo;
  const imgSrc = rawPhoto ? rawPhoto : OFFLINE_PLACEHOLDER; // For now we assume rawPhoto is URL. We'll handle IndexedDB later.
  const origLabel = plant.origin || 'Non so / Altro';

  return (
    <div 
      className={`plant-card animate__animated animate__fadeIn`} 
      style={{ animationDuration: '0.5s', ...archiveStyle }}
      role="button"
      tabIndex="0"
      aria-label={`Vedi dettagli della pianta ${plant.name}`}
      onClick={() => navigate(`/plants/${plant.id}`)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/plants/${plant.id}`); } }}
    >
      <img 
        src={imgSrc} 
        onError={(e) => { e.target.onerror = null; e.target.src = OFFLINE_PLACEHOLDER; }} 
        loading="lazy" 
        alt={plant.name} 
        className={plant.status === 'archived' ? 'grayscale-img' : ''} 
      />
      
      <h3 style={{ margin: '0 0 2px 0', color: nameColor, fontSize: '20px', lineHeight: '1.2' }}>{plant.name}</h3>
      <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-muted)', fontStyle: 'italic' }}>{plant.scientific || '\u00A0'}</p>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '15px', alignItems: 'center' }}>
        <span style={{ background: 'var(--secondary)', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
          {origLabel}
        </span>
        {plant.status === 'archived' && (
          <span style={{ background: 'rgba(211, 47, 47, 0.2)', color: '#ff8a80', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
            Archiviata
          </span>
        )}
        {plant.minTemp !== undefined && plant.minTemp !== null && (
          <span style={{ background: 'rgba(21, 101, 192, 0.2)', color: '#82b1ff', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
            ❄️ Min: {plant.minTemp}°C
          </span>
        )}
        {plant.maxTemp !== undefined && plant.maxTemp !== null && (
          <span style={{ background: 'rgba(211, 47, 47, 0.2)', color: '#ff8a80', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
            🔥 Max: {plant.maxTemp}°C
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
        <div><strong>📍 Posizione:</strong><br/>{plant.location || 'Non specificata'}</div>
        <div><strong>🪴 Vaso/Terra:</strong><br/>{plant.placement || 'Vaso'}</div>
      </div>
    </div>
  );
};

export default PlantCard;
