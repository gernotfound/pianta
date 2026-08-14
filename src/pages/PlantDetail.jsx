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
import PlantCharts from '../components/PlantCharts';

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
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
      type: 'Misurazione',
      date: new Date().toISOString().slice(0, 10),
      height: '',
      ph: '',
      harvest: '',
      placement: 'Vaso',
      potSize: '',
      graftName: '',
      note: ''
  });

  const [speciesNote, setSpeciesNote] = useState('');
  const [plantNote, setPlantNote] = useState('');

  useEffect(() => {
      let isMounted = true;
      if (plant) {
          setSpeciesNote(plant.speciesNote || '');
          setPlantNote(plant.plantNote || '');

          const loadPhotos = async () => {
              if (plant.photo) {
                  const b64 = await loadImageFromFirestore(plant.photo);
                  if (isMounted && b64) setImgMain(b64);
              }
              if (plant.fruitPhoto) {
                  const b64F = await loadImageFromFirestore(plant.fruitPhoto);
                  if (isMounted && b64F) setImgFruit(b64F);
              }
          };
          loadPhotos();
      }
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
          setNewEvent({ ...newEvent, note: '', height: '', ph: '', harvest: '', potSize: '', graftName: '' });
          Swal.fire({icon: 'success', title: 'Evento aggiunto!', timer: 1000, showConfirmButton: false});
      } catch (e) {
          Swal.fire('Errore', 'Impossibile salvare l\'evento.', 'error');
      }
  };

  const autoSaveSpeciesNote = async () => {
      if (speciesNote !== (plant.speciesNote || '')) {
          await updateDoc(doc(db, 'users', user.uid, 'plants', plant.id), { speciesNote });
      }
  };

  const autoSavePlantNote = async () => {
      if (plantNote !== (plant.plantNote || '')) {
          await updateDoc(doc(db, 'users', user.uid, 'plants', plant.id), { plantNote });
      }
  };

  const sortedLogs = [...(plant.logs || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const hasMap = plant.lat && plant.lng && !isNaN(parseFloat(plant.lat)) && !isNaN(parseFloat(plant.lng));

  return (
    <div className="section active fade-in" style={{ paddingBottom: '100px' }}>
      
      {/* Detail Header from Legacy */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ margin: 0, color: 'var(--primary)' }}>{plant.name}</h2>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              <button className="btn btn-blue" style={{ margin: 0 }} onClick={() => setIsQrModalOpen(true)}>🏷️ QR</button>
              <button className="btn btn-warning" style={{ margin: 0 }} onClick={() => navigate(`/edit-plant/${plant.id}`)}>✏️ Modifica</button>
              <button className="btn btn-danger" style={{ margin: 0 }} onClick={handleDelete}>🗑️ Elimina</button>
              <button className="btn" style={{ margin: 0 }} onClick={() => navigate(-1)}>⬅️ Indietro</button>
          </div>
      </div>

      {/* Info and Map Container from Legacy */}
      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '30px' }}>
          <div style={{ flex: '3 1 300px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Plant Info block */}
              <div style={{ background: 'var(--surface)', padding: '15px', borderRadius: '5px', border: '1px solid var(--surface-border)', fontSize: '15px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
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
              </div>

              {/* Photos Container 50/50 from Legacy */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  {plant.photo && (
                      <img src={imgMain} alt="Pianta" style={{ flex: 1, height: '200px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--surface-border)' }} />
                  )}
                  {plant.fruitPhoto && (
                      <img src={imgFruit} alt="Frutto" style={{ flex: 1, height: '200px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--surface-border)' }} />
                  )}
              </div>
              
              <div style={{ marginTop: '10px' }}>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', color: 'var(--primary)' }}>📋 Note specie (condivise):</label>
                  <textarea 
                      rows="3" 
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--surface-border)', resize: 'vertical', background: 'var(--bg)', color: 'var(--text)' }} 
                      placeholder="Caratteristiche comuni alla specie (si salvano in automatico)..."
                      value={speciesNote}
                      onChange={e => setSpeciesNote(e.target.value)}
                      onBlur={autoSaveSpeciesNote}
                  ></textarea>
              </div>
          </div>

          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ background: 'var(--surface)', padding: '10px', borderRadius: '5px', border: '1px solid var(--surface-border)', display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--primary)' }}>📍 Mappa</h4>
                  <div style={{ flex: 1, minHeight: '150px', borderRadius: '5px', border: '1px solid var(--surface-border)', zIndex: 1, overflow: 'hidden' }}>
                      {hasMap ? (
                          <MapContainer center={[parseFloat(plant.lat), parseFloat(plant.lng)]} zoom={13} style={{ height: '100%', width: '100%' }}>
                              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OSM' />
                              <Marker position={[parseFloat(plant.lat), parseFloat(plant.lng)]} />
                          </MapContainer>
                      ) : (
                          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Posizione non impostata</div>
                      )}
                  </div>
              </div>
              
              <div style={{ background: 'var(--surface)', padding: '10px', borderRadius: '5px', border: '1px solid var(--surface-border)' }}>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '13px', color: 'var(--primary)' }}>📋 Note pianta:</label>
                  <textarea 
                      rows="4" 
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--surface-border)', resize: 'vertical', background: 'var(--bg)', color: 'var(--text)' }} 
                      placeholder="Appunti su questa singola pianta (si salvano in automatico)..."
                      value={plantNote}
                      onChange={e => setPlantNote(e.target.value)}
                      onBlur={autoSavePlantNote}
                  ></textarea>
              </div>
          </div>
      </div>

      {/* Detail Grid from Legacy (Diary + Charts) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div>
              <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
                  <h3 style={{ margin: '0 0 15px 0', color: 'var(--text)' }}>📝 Aggiungi evento al diario</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div>
                          <label style={{ color: 'var(--text)' }}>Data:</label>
                          <input type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} style={{ width: '100%', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--surface-border)', padding: '8px', borderRadius: '4px' }} />
                      </div>
                      <div>
                          <label style={{ color: 'var(--text)' }}>Tipo di evento:</label>
                          <select value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})} style={{ width: '100%', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--surface-border)', padding: '8px', borderRadius: '4px' }}>
                              <option value="Misurazione">📏 Misurazione altezza</option>
                              <option value="Misurazione pH">🧪 Misurazione pH</option>
                              <option value="Concimazione">🧪 Concimazione / Nutrimento</option>
                              <option value="Stato di Salute">Stato di salute</option>
                              <option value="Fioritura">🌸 Fioritura</option>
                              <option value="Fruttificazione">🍋 Fruttificazione</option>
                              <option value="Raccolto">🧺 Raccolto</option>
                              <option value="Rinvaso / Sistemazione">🪴 Rinvaso / Cambio sistemazione</option>
                              <option value="Innesto">🔪 Innesto (cambio varietà)</option>
                              <option value="Spostamento">🚚 Spostamento</option>
                              <option value="Trattamento">Trattamento</option>
                              <option value="Innaffiatura">💧 Innaffiatura</option>
                          </select>
                      </div>
                  </div>

                  {newEvent.type === 'Misurazione' && (
                      <div style={{ marginBottom: '10px' }}>
                          <label style={{ color: 'var(--text)' }}>Altezza:</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input type="number" inputMode="decimal" value={newEvent.height} onChange={e => setNewEvent({...newEvent, height: e.target.value})} style={{ flexGrow: 1, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--surface-border)', padding: '8px', borderRadius: '4px' }} />
                              <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '16px' }}>cm</span>
                          </div>
                      </div>
                  )}

                  {newEvent.type === 'Misurazione pH' && (
                      <div style={{ marginBottom: '10px' }}>
                          <label style={{ color: 'var(--text)' }}>Valore pH (da 0 a 14):</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input type="number" inputMode="decimal" value={newEvent.ph} onChange={e => setNewEvent({...newEvent, ph: e.target.value})} style={{ flexGrow: 1, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--surface-border)', padding: '8px', borderRadius: '4px' }} />
                              <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '16px' }}>pH</span>
                          </div>
                      </div>
                  )}

                  {newEvent.type === 'Raccolto' && (
                      <div style={{ marginBottom: '10px' }}>
                          <label style={{ color: 'var(--text)' }}>Quantità raccolto:</label>
                          <input type="text" value={newEvent.harvest} onChange={e => setNewEvent({...newEvent, harvest: e.target.value})} placeholder="es. 2 kg, 15 frutti..." style={{ width: '100%', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--surface-border)', padding: '8px', borderRadius: '4px' }} />
                      </div>
                  )}

                  {newEvent.type === 'Rinvaso / Sistemazione' && (
                      <div style={{ marginBottom: '10px', background: 'rgba(46, 125, 50, 0.1)', padding: '10px', borderRadius: '5px', border: '1px solid var(--primary)' }}>
                          <label style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Nuova sistemazione:</label>
                          <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                              <select value={newEvent.placement} onChange={e => setNewEvent({...newEvent, placement: e.target.value})} style={{ flex: 1, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--surface-border)', padding: '8px', borderRadius: '4px' }}>
                                  <option value="Vaso">Vaso</option>
                                  <option value="Piena terra">Piena terra</option>
                                  <option value="Idroponica">Idroponica</option>
                              </select>
                              {newEvent.placement === 'Vaso' && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
                                      <input type="number" inputMode="decimal" value={newEvent.potSize} onChange={e => setNewEvent({...newEvent, potSize: e.target.value})} placeholder="es. 20" style={{ width: '100%', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--surface-border)', padding: '8px', borderRadius: '4px' }} />
                                      <span style={{ fontSize: '14px', color: 'var(--text)' }}>Litri</span>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}

                  {newEvent.type === 'Innesto' && (
                      <div style={{ marginBottom: '10px', background: 'rgba(245, 127, 23, 0.1)', padding: '10px', borderRadius: '5px', border: '1px solid #f57f17' }}>
                          <label style={{ color: '#f57f17', fontWeight: 'bold' }}>Nuovo nome pianta:</label>
                          <input type="text" value={newEvent.graftName} onChange={e => setNewEvent({...newEvent, graftName: e.target.value})} style={{ width: '100%', marginTop: '5px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--surface-border)', padding: '8px', borderRadius: '4px' }} placeholder="es. Avocado Beacon" />
                      </div>
                  )}

                  <label style={{ color: 'var(--text)' }}>Note (opzionali):</label>
                  <textarea value={newEvent.note} onChange={e => setNewEvent({...newEvent, note: e.target.value})} rows="2" style={{ width: '100%', marginBottom: '15px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--surface-border)', padding: '8px', borderRadius: '4px' }}></textarea>

                  <button className="btn btn-primary" style={{ width: '100%', padding: '12px' }} onClick={handleSaveEvent}>Salva evento</button>
              </div>

              {/* Timeline (Legacy Diario Eventi) */}
              <div style={{ marginTop: '20px' }}>
                  <h3 style={{ color: 'var(--text)' }}>Cronologia Eventi</h3>
                  {sortedLogs.length === 0 ? (
                      <div style={{ padding: '20px', background: 'var(--surface)', borderRadius: '5px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          Nessun evento registrato.
                      </div>
                  ) : (
                      <ul className="timeline">
                          {sortedLogs.map((log, i) => (
                              <li key={i} className="timeline-item">
                                  <div className="timeline-icon">📝</div>
                                  <div className="timeline-content">
                                      <div className="timeline-date">{new Date(log.date).toLocaleDateString('it-IT')}</div>
                                      <div className="timeline-type" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{log.type}</div>
                                      {log.height && <div className="timeline-details">📏 Altezza: {log.height} cm</div>}
                                      {log.ph && <div className="timeline-details">🧪 pH: {log.ph}</div>}
                                      {log.harvest && <div className="timeline-details">🧺 Resa: {log.harvest}</div>}
                                      {log.placement && <div className="timeline-details">🪴 {log.placement} {log.potSize ? `(${log.potSize}L)` : ''}</div>}
                                      {log.graftName && <div className="timeline-details">🔪 Nome innesto: {log.graftName}</div>}
                                      {log.note && <div className="timeline-note">{log.note}</div>}
                                  </div>
                              </li>
                          ))}
                      </ul>
                  )}
              </div>
          </div>

          <div>
              <PlantCharts logs={plant.logs} />
          </div>
      </div>

      {/* Modal QR Code (mantenuto per comodità) */}
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
