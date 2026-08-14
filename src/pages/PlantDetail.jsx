import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { loadImageFromFirestore } from '../services/imageService';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Swal from 'sweetalert2';
import { QRCodeSVG } from 'qrcode.react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const OFFLINE_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23e0e0e0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='18' fill='%23757575'%3ENessuna Foto%3C/text%3E%3C/svg%3E";

const PlantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useStore(state => state.user);
  const plantsDatabase = useStore(state => state.plantsDatabase);
  const plant = plantsDatabase.find(p => p.id === id);

  const [imgMain, setImgMain] = useState(OFFLINE_PLACEHOLDER);
  const [imgFruit, setImgFruit] = useState(OFFLINE_PLACEHOLDER);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
      type: 'Innaffiatura',
      date: new Date().toISOString().slice(0, 10),
      height: '',
      ph: '',
      harvest: '',
      placement: '',
      potSize: '',
      graftName: '',
      note: ''
  });

  useEffect(() => {
      let isMounted = true;
      const loadPhotos = async () => {
          if (plant?.photo) {
              const b64 = await loadImageFromFirestore(plant.photo);
              if (isMounted && b64) setImgMain(b64);
          }
          if (plant?.fruitPhoto) {
              const b64F = await loadImageFromFirestore(plant.fruitPhoto);
              if (isMounted && b64F) setImgFruit(b64F);
          }
      };
      if (plant) loadPhotos();
      return () => { isMounted = false; };
  }, [plant]);

  if (!plant) {
      return (
          <div className="section active" style={{ textAlign: 'center', marginTop: '50px' }}>
              <h2>Pianta non trovata</h2>
              <button className="btn btn-primary" onClick={() => navigate(-1)}>Torna indietro</button>
          </div>
      );
  }

  const handleDelete = async () => {
      const res = await Swal.fire({
          title: 'Sei sicuro?',
          text: `Vuoi eliminare definitivamente ${plant.name}?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          cancelButtonColor: '#3085d6',
          confirmButtonText: 'Sì, elimina'
      });

      if (res.isConfirmed) {
          try {
              await deleteDoc(doc(db, 'users', user.uid, 'plants', plant.id));
              Swal.fire({icon: 'success', title: 'Eliminata', timer: 1000, showConfirmButton: false});
              navigate('/plants');
          } catch (e) {
              Swal.fire('Errore', 'Impossibile eliminare la pianta.', 'error');
          }
      }
  };

  const handleSaveEvent = async () => {
      if (!newEvent.date) return;
      const logEntry = {
          type: newEvent.type,
          date: newEvent.date,
          note: newEvent.note
      };
      if (newEvent.type === 'Misurazione') logEntry.height = parseFloat(newEvent.height) || null;
      if (newEvent.type === 'Misurazione pH') logEntry.ph = parseFloat(newEvent.ph) || null;
      if (newEvent.type === 'Raccolto') logEntry.harvest = newEvent.harvest;
      if (newEvent.type === 'Rinvaso / Sistemazione') {
          logEntry.placement = newEvent.placement;
          logEntry.potSize = parseFloat(newEvent.potSize) || null;
      }
      if (newEvent.type === 'Innesto') logEntry.graftName = newEvent.graftName;

      const updatedLogs = [...(plant.logs || []), logEntry];
      
      try {
          await updateDoc(doc(db, 'users', user.uid, 'plants', plant.id), { logs: updatedLogs });
          setIsEventModalOpen(false);
          setNewEvent({ ...newEvent, note: '', height: '', ph: '', harvest: '', potSize: '', graftName: '' });
          Swal.fire({icon: 'success', title: 'Evento aggiunto!', timer: 1000, showConfirmButton: false});
      } catch (e) {
          Swal.fire('Errore', 'Impossibile salvare l\'evento.', 'error');
      }
  };

  const sortedLogs = [...(plant.logs || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

  const hasMap = plant.lat && plant.lng && !isNaN(parseFloat(plant.lat)) && !isNaN(parseFloat(plant.lng));

  return (
    <div className="section active fade-in" style={{ paddingBottom: '100px' }}>
      
      {/* Hero Header */}
      <div style={{ position: 'relative', margin: '-20px -20px 20px -20px', height: '320px', background: 'var(--surface)' }}>
          {plant.photo ? (
              <img src={imgMain} alt="Pianta" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Nessuna Foto</div>
          )}
          
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 40%, rgba(0,0,0,0.9) 100%)' }}></div>

          <button 
              style={{ position: 'absolute', top: '20px', left: '20px', background: 'rgba(30, 30, 30, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px 15px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }} 
              onClick={() => navigate(-1)}
          >
              ⬅️ Indietro
          </button>

          {plant.fruitPhoto && (
              <div style={{ position: 'absolute', top: '20px', right: '20px', width: '80px', height: '80px', borderRadius: '16px', overflow: 'hidden', border: '2px solid var(--primary)', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
                  <img src={imgFruit} alt="Frutto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
          )}

          <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px' }}>
              <h1 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '28px', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>{plant.name}</h1>
              {plant.scientific && <h3 style={{ margin: 0, color: 'var(--primary)', fontStyle: 'italic', fontWeight: '500', fontSize: '16px' }}>{plant.scientific}</h3>}
          </div>
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
          <button style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setIsQrModalOpen(true)}>
              🏷️ QR Code
          </button>
          <button style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => navigate(`/edit-plant/${plant.id}`)}>
              ✏️ Modifica
          </button>
          <button style={{ padding: '12px 20px', borderRadius: '12px', background: 'rgba(255, 82, 82, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={handleDelete} aria-label="Elimina pianta">
              🗑️
          </button>
      </div>

      {/* Info Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '30px', padding: '0 5px' }}>
          <div className="info-widget">
              <div className="widget-label" style={{ fontSize: '13px', color: 'var(--grey)', marginBottom: '4px' }}>🌱 Origine</div>
              <div className="widget-value" style={{ fontSize: '15px', color: 'var(--text)' }}>{plant.origin || 'N/D'}</div>
          </div>
          <div className="info-widget">
              <div className="widget-label" style={{ fontSize: '13px', color: 'var(--grey)', marginBottom: '4px' }}>🪴 Sistemazione</div>
              <div className="widget-value" style={{ fontSize: '15px', color: 'var(--text)' }}>{plant.placement || 'N/D'} {plant.potSize ? `(${plant.potSize}L)` : ''}</div>
          </div>
          <div className="info-widget">
              <div className="widget-label" style={{ fontSize: '13px', color: 'var(--grey)', marginBottom: '4px' }}>🪨 Substrato</div>
              <div className="widget-value" style={{ fontSize: '15px', color: 'var(--text)' }}>{plant.soil || 'N/D'}</div>
          </div>
          <div className="info-widget">
              <div className="widget-label" style={{ fontSize: '13px', color: 'var(--grey)', marginBottom: '4px' }}>🧪 pH Ottimale</div>
              <div className="widget-value" style={{ fontSize: '15px', color: 'var(--text)' }}>{plant.phMin || '?'} - {plant.phMax || '?'}</div>
          </div>
          <div className="info-widget">
              <div className="widget-label" style={{ fontSize: '13px', color: 'var(--grey)', marginBottom: '4px' }}>🌡️ Temperature</div>
              <div className="widget-value" style={{ fontSize: '15px', color: 'var(--text)' }}>{plant.minTemp || '?'}°C / {plant.maxTemp || '?'}°C</div>
          </div>
      </div>

      {/* Map */}
      {hasMap && (
          <div style={{ marginBottom: '30px' }}>
              <h3 style={{ margin: '0 0 15px 0', color: 'var(--primary)', fontSize: '18px' }}>📍 Posizione</h3>
              <div style={{ height: '220px', width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--surface-border)', zIndex: 1 }}>
                  <MapContainer center={[parseFloat(plant.lat), parseFloat(plant.lng)]} zoom={15} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                      <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                      />
                      <Marker position={[parseFloat(plant.lat), parseFloat(plant.lng)]} />
                  </MapContainer>
              </div>
          </div>
      )}

      {/* Events Timeline */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '18px' }}>Diario Eventi</h3>
          <button className="btn btn-blue" style={{ margin: 0, padding: '8px 15px', borderRadius: '20px', fontSize: '13px' }} onClick={() => setIsEventModalOpen(true)}>➕ Aggiungi</button>
      </div>

      {sortedLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--surface)', borderRadius: '16px', border: '1px dashed var(--surface-border)' }}>
              <span style={{ fontSize: '40px' }} aria-hidden="true">📓</span>
              <p style={{ color: 'var(--text-muted)', margin: '10px 0 0 0' }}>Nessun evento registrato. Inizia a tracciare innaffiature e rinvasi!</p>
          </div>
      ) : (
          <ul className="timeline">
              {sortedLogs.map((log, i) => (
                  <li key={i} className="timeline-item" style={{ paddingBottom: '25px' }}>
                      <div className="timeline-icon" style={{ width: '36px', height: '36px', fontSize: '16px', top: '0', boxShadow: '0 0 0 4px var(--bg)' }}>📝</div>
                      <div className="timeline-content" style={{ background: 'var(--surface)', padding: '15px', borderRadius: '16px', border: '1px solid var(--surface-border)', marginLeft: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <div className="timeline-type" style={{ margin: 0, fontSize: '15px', color: 'var(--primary)' }}>{log.type}</div>
                              <div className="timeline-date" style={{ color: 'var(--grey)', fontSize: '12px', fontWeight: 'normal' }}>{new Date(log.date).toLocaleDateString('it-IT')}</div>
                          </div>
                          
                          {log.height && <div className="timeline-details" style={{ fontSize: '14px', color: 'var(--text)' }}>📏 Altezza: <strong>{log.height} cm</strong></div>}
                          {log.ph && <div className="timeline-details" style={{ fontSize: '14px', color: 'var(--text)' }}>🧪 pH: <strong>{log.ph}</strong></div>}
                          {log.harvest && <div className="timeline-details" style={{ fontSize: '14px', color: 'var(--text)' }}>🧺 Resa: <strong>{log.harvest}</strong></div>}
                          {log.placement && <div className="timeline-details" style={{ fontSize: '14px', color: 'var(--text)' }}>🪴 <strong>{log.placement}</strong> {log.potSize ? `(${log.potSize}L)` : ''}</div>}
                          {log.graftName && <div className="timeline-details" style={{ fontSize: '14px', color: 'var(--text)' }}>🔪 Innesto: <strong>{log.graftName}</strong></div>}
                          
                          {log.note && (
                              <div className="timeline-note" style={{ marginTop: '10px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                                  "{log.note}"
                              </div>
                          )}
                      </div>
                  </li>
              ))}
          </ul>
      )}

      {/* Modal Aggiungi Evento */}
      {isEventModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="card" style={{ width: '90%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
                  <h3 style={{ marginTop: 0, color: 'var(--primary)' }}>Nuovo Evento</h3>
                  
                  <label>Tipo di Evento:</label>
                  <select value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})} style={{ width: '100%', marginBottom: '15px' }}>
                      <option value="Innaffiatura">Innaffiatura</option>
                      <option value="Concimazione">Concimazione</option>
                      <option value="Misurazione">Misurazione (Altezza)</option>
                      <option value="Misurazione pH">Misurazione pH</option>
                      <option value="Rinvaso / Sistemazione">Rinvaso / Sistemazione</option>
                      <option value="Trattamento">Trattamento</option>
                      <option value="Problema / Malattia">Problema / Malattia</option>
                      <option value="Raccolto">Raccolto</option>
                      <option value="Fioritura">Fioritura</option>
                      <option value="Innesto">Innesto</option>
                      <option value="Generico">Nota Generica</option>
                  </select>

                  <label>Data:</label>
                  <input type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} style={{ width: '100%', marginBottom: '15px' }} />

                  {newEvent.type === 'Misurazione' && (
                      <div>
                          <label>Altezza (cm):</label>
                          <input type="number" inputMode="decimal" value={newEvent.height} onChange={e => setNewEvent({...newEvent, height: e.target.value})} style={{ width: '100%', marginBottom: '15px' }} />
                      </div>
                  )}

                  {newEvent.type === 'Misurazione pH' && (
                      <div>
                          <label>Valore pH:</label>
                          <input type="number" inputMode="decimal" value={newEvent.ph} onChange={e => setNewEvent({...newEvent, ph: e.target.value})} style={{ width: '100%', marginBottom: '15px' }} />
                      </div>
                  )}

                  {newEvent.type === 'Raccolto' && (
                      <div>
                          <label>Resa / Quantità:</label>
                          <input type="text" value={newEvent.harvest} onChange={e => setNewEvent({...newEvent, harvest: e.target.value})} placeholder="es. 3 frutti, 500g" style={{ width: '100%', marginBottom: '15px' }} />
                      </div>
                  )}

                  {newEvent.type === 'Rinvaso / Sistemazione' && (
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                          <div style={{ flex: 1 }}>
                              <label>Nuova Sist.:</label>
                              <select value={newEvent.placement} onChange={e => setNewEvent({...newEvent, placement: e.target.value})} style={{ width: '100%' }}>
                                  <option value="">Seleziona...</option>
                                  <option value="Vaso">Vaso</option>
                                  <option value="Piena terra">Piena terra</option>
                                  <option value="Idroponica">Idroponica</option>
                              </select>
                          </div>
                          {newEvent.placement === 'Vaso' && (
                              <div style={{ flex: 1 }}>
                                  <label>Litri:</label>
                                  <input type="number" inputMode="decimal" value={newEvent.potSize} onChange={e => setNewEvent({...newEvent, potSize: e.target.value})} style={{ width: '100%' }} />
                              </div>
                          )}
                      </div>
                  )}

                  {newEvent.type === 'Innesto' && (
                      <div>
                          <label>Nuovo Nome/Varietà:</label>
                          <input type="text" value={newEvent.graftName} onChange={e => setNewEvent({...newEvent, graftName: e.target.value})} style={{ width: '100%', marginBottom: '15px' }} />
                      </div>
                  )}

                  <label>Note aggiuntive:</label>
                  <textarea value={newEvent.note} onChange={e => setNewEvent({...newEvent, note: e.target.value})} rows="3" style={{ width: '100%', marginBottom: '20px' }}></textarea>

                  <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="btn btn-primary" style={{ flex: 1, margin: 0 }} onClick={handleSaveEvent}>Salva</button>
                      <button className="btn btn-outline" style={{ flex: 1, margin: 0 }} onClick={() => setIsEventModalOpen(false)}>Annulla</button>
                  </div>
              </div>
          </div>
      )}

      {/* Modal QR Code */}
      {isQrModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="card" style={{ width: '90%', maxWidth: '300px', textAlign: 'center' }}>
                  <h3 style={{ marginTop: 0, color: 'var(--primary)' }}>Etichetta QR</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{plant.name}</p>
                  
                  <div style={{ background: 'white', padding: '20px', borderRadius: '8px', display: 'inline-block', margin: '20px 0' }}>
                      <QRCodeSVG value={plant.id} size={200} />
                  </div>
                  
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>Stampa questo codice o fai uno screenshot per attaccarlo al vaso.</p>
                  
                  <button className="btn btn-outline" style={{ width: '100%', margin: 0 }} onClick={() => setIsQrModalOpen(false)}>Chiudi</button>
              </div>
          </div>
      )}

    </div>
  );
};

export default PlantDetail;
