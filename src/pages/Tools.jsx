import { useSearchParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import PlantCard from '../components/PlantCard';
import MapTab from '../components/MapTab';
import ScannerTab from '../components/ScannerTab';
import GalleryTab from '../components/GalleryTab';
import ExpensesTab from '../components/ExpensesTab';
import WishlistTab from '../components/WishlistTab';
import MacroTab from '../components/MacroTab';

const Tools = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = searchParams.get('tab') || 'archive';
  const plantsDatabase = useStore(state => state.plantsDatabase);

  const renderContent = () => {
      switch (tab) {
          case 'archive':
              const archivedPlants = plantsDatabase.filter(p => p.status === 'archived');
              return (
                  <div>
                      <h3 style={{ color: 'var(--danger)', marginTop: 0 }}>🥀 Piante Perse / Archiviate</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Qui trovi lo storico delle piante che non sono più con noi.</p>
                      {archivedPlants.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--surface)', borderRadius: '12px' }}>
                              Non hai ancora archiviato nessuna pianta.
                          </div>
                      ) : (
                          <div id="plants-grid">
                              {archivedPlants.map(plant => (
                                  <PlantCard key={plant.id} plant={plant} />
                              ))}
                          </div>
                      )}
                  </div>
              );
          
          case 'map':
              return <MapTab plants={plantsDatabase} />;

          case 'scanner':
              return <ScannerTab />;

          case 'gallery':
              return <GalleryTab plants={plantsDatabase} />;

          case 'expenses':
              return <ExpensesTab />;

          case 'wishlist':
              return <WishlistTab />;

          case 'macro':
              return <MacroTab plants={plantsDatabase} />;

          default:
              return <div>Strumento non trovato.</div>;
      }
  };

  return (
    <div className="section active fade-in" style={{ paddingBottom: '100px' }}>
        <button className="btn btn-outline" style={{ padding: '8px 12px', marginBottom: '20px' }} onClick={() => navigate('/')}>⬅️ Torna alla Home</button>
        {renderContent()}
    </div>
  );
};

export default Tools;
