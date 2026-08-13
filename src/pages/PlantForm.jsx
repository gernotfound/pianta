import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store';
import { compressImage, saveImageToFirestore } from '../services/imageService';
import { v4 as uuidv4 } from 'uuid';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Swal from 'sweetalert2';

const PlantForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const user = useStore(state => state.user);
  const plantsDatabase = useStore(state => state.plantsDatabase);
  
  const existingPlant = isEditing ? plantsDatabase.find(p => p.id === id) : null;

  const [formData, setFormData] = useState({
    name: existingPlant?.name || '',
    scientific: existingPlant?.scientific || '',
    speciesNotes: existingPlant?.speciesNotes || '',
    origin: existingPlant?.origin || 'Da seme',
    sowingDate: existingPlant?.sowingDate || '',
    geneticFidelity: existingPlant?.geneticFidelity || 'Non ancora valutato',
    mother: existingPlant?.mother || '',
    father: existingPlant?.father || '',
    autofertile: existingPlant?.autofertile || 'Sconosciuta',
    placement: existingPlant?.placement || 'Vaso',
    potSize: existingPlant?.potSize || '',
    soil: existingPlant?.soil || '',
    phMin: existingPlant?.phMin || '',
    phMax: existingPlant?.phMax || '',
    minTemp: existingPlant?.minTemp || '',
    maxTemp: existingPlant?.maxTemp || '',
    location: existingPlant?.location || '',
    lat: existingPlant?.lat || '',
    lng: existingPlant?.lng || '',
    vendor: existingPlant?.vendor || '',
    price: existingPlant?.price || '',
    purchaseDate: existingPlant?.purchaseDate || '',
    notes: existingPlant?.notes || '',
    status: existingPlant?.status || 'active',
    photo: existingPlant?.photo || '',
    fruitPhoto: existingPlant?.fruitPhoto || ''
  });

  const [previewMain, setPreviewMain] = useState(null);
  const [previewFruit, setPreviewFruit] = useState(null);
  const [photoMainB64, setPhotoMainB64] = useState(null);
  const [photoFruitB64, setPhotoFruitB64] = useState(null);

  const mainFileInput = useRef(null);
  const fruitFileInput = useRef(null);

  const [accordions, setAccordions] = useState({
      main: true,
      genetics: false,
      environment: false,
      purchase: false
  });

  const toggleAccordion = (key) => setAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = async (e, type) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
          const b64 = await compressImage(file);
          if (type === 'main') {
              setPreviewMain(b64);
              setPhotoMainB64(b64);
          } else {
              setPreviewFruit(b64);
              setPhotoFruitB64(b64);
          }
      } catch (err) {
          Swal.fire({icon: 'error', title: 'Errore', text: 'Impossibile elaborare l\'immagine.'});
      }
  };

  const handleSave = async () => {
    if (!formData.name) {
        Swal.fire({icon: 'error', title: 'Attenzione', text: 'Il nome è obbligatorio!'});
        return;
    }
    
    const plantId = isEditing ? id : uuidv4();
    let photoMainId = formData.photo;
    let photoFruitId = formData.fruitPhoto;

    // Upload nuove foto se selezionate
    if (photoMainB64) {
        photoMainId = 'img_' + uuidv4();
        await saveImageToFirestore(photoMainId, photoMainB64);
    }
    if (photoFruitB64) {
        photoFruitId = 'img_' + uuidv4();
        await saveImageToFirestore(photoFruitId, photoFruitB64);
    }

    const payload = {
        ...formData,
        id: plantId,
        photo: photoMainId,
        fruitPhoto: photoFruitId,
        updatedAt: new Date().toISOString()
    };
    
    if (!isEditing) payload.createdAt = new Date().toISOString();

    try {
        const ref = doc(db, 'users', user.uid, 'plants', plantId);
        if (isEditing) {
            await updateDoc(ref, payload);
        } else {
            await setDoc(ref, payload);
        }
        Swal.fire({icon: 'success', title: 'Salvata!', timer: 1500, showConfirmButton: false});
        navigate(-1);
    } catch (e) {
        Swal.fire({icon: 'error', title: 'Errore', text: e.message});
    }
  };

  return (
    <div className="fade-in" style={{ paddingBottom: '80px' }}>
      <h2 style={{ marginTop: 0, color: 'var(--primary)', paddingBottom: '5px' }}>
        {isEditing ? 'Modifica pianta' : 'Aggiungi nuova pianta'}
      </h2>
      
      <div className="accordion-group">
        
        {/* Dati Principali & Foto */}
        <div className={`accordion-item ${accordions.main ? 'open' : ''}`}>
            <div className="accordion-header" onClick={() => toggleAccordion('main')}>
                <h3>📋 Dati principali & foto</h3>
                <span className="acc-icon" style={{ transform: accordions.main ? 'rotate(180deg)' : 'none' }}>▼</span>
            </div>
            {accordions.main && (
                <div className="accordion-content">
                    <div className="form-grid">
                        <div style={{ gridColumn: 'span 2', display: 'flex', gap: '15px' }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <label style={{ alignSelf: 'flex-start', marginBottom: '5px' }}>Foto della pianta:</label>
                                <div className="smart-upload-container" onClick={() => mainFileInput.current.click()}>
                                    {previewMain ? (
                                        <img src={previewMain} className="smart-preview" alt="Anteprima" style={{ display: 'block' }}/>
                                    ) : (
                                        <div className="upload-placeholder">📸 Tocca per foto</div>
                                    )}
                                </div>
                                <input type="file" ref={mainFileInput} accept="image/*" style={{ display:'none' }} onChange={(e) => handleImageSelect(e, 'main')} />
                            </div>
                            
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <label style={{ alignSelf: 'flex-start', marginBottom: '5px' }}>Foto frutto:</label>
                                <div className="smart-upload-container" onClick={() => fruitFileInput.current.click()}>
                                    {previewFruit ? (
                                        <img src={previewFruit} className="smart-preview" alt="Anteprima" style={{ display: 'block' }}/>
                                    ) : (
                                        <div className="upload-placeholder">🍋 Tocca per dettaglio</div>
                                    )}
                                </div>
                                <input type="file" ref={fruitFileInput} accept="image/*" style={{ display:'none' }} onChange={(e) => handleImageSelect(e, 'fruit')} />
                            </div>
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <label>Nome (obbligatorio):</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="es. Yellow pitahaya 1" />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label>Nome scientifico:</label>
                            <input type="text" name="scientific" value={formData.scientific} onChange={handleChange} placeholder="es. Monstera deliciosa" />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label>Note sulla specie (per tutte le piante di questa specie):</label>
                            <textarea name="speciesNotes" value={formData.speciesNotes} onChange={handleChange} rows="2" placeholder="Note botaniche o di cura per questa specie..."></textarea>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Genetica & Origine */}
        <div className={`accordion-item ${accordions.genetics ? 'open' : ''}`}>
            <div className="accordion-header" onClick={() => toggleAccordion('genetics')}>
                <h3>🌱 Genetica & Origine</h3>
                <span className="acc-icon" style={{ transform: accordions.genetics ? 'rotate(180deg)' : 'none' }}>▼</span>
            </div>
            {accordions.genetics && (
                <div className="accordion-content">
                    <div className="form-grid">
                        <div>
                            <label>Origine / Propagazione:</label>
                            <select name="origin" value={formData.origin} onChange={handleChange}>
                                <option value="Da seme">Da seme</option>
                                <option value="Da talea">Da talea</option>
                                <option value="Innesto">Innesto</option>
                                <option value="Margotta">Margotta</option>
                                <option value="Non so / Altro">Non so / Altro</option>
                            </select>
                        </div>
                        <div>
                            <label>Data semina / Inizio:</label>
                            <input type="date" name="sowingDate" value={formData.sowingDate} onChange={handleChange} />
                        </div>
                        {formData.origin === 'Da seme' && (
                            <div style={{ gridColumn: 'span 2' }}>
                                <label>🧬 Fedeltà al seme:</label>
                                <select name="geneticFidelity" value={formData.geneticFidelity} onChange={handleChange}>
                                    <option value="Non ancora valutato">Non ancora valutato</option>
                                    <option value="Identico alla madre">Identico alla madre</option>
                                    <option value="Molto simile">Molto simile</option>
                                    <option value="Diverso">Diverso</option>
                                </select>
                            </div>
                        )}
                        <div style={{ gridColumn: 'span 2', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                                <label>Pianta madre:</label>
                                <select name="mother" value={formData.mother} onChange={handleChange}>
                                    <option value="">- Nessuna -</option>
                                    {plantsDatabase.map(p => <option key={`m_${p.id}`} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                                <label>Pianta padre:</label>
                                <select name="father" value={formData.father} onChange={handleChange}>
                                    <option value="">- Nessuna -</option>
                                    {plantsDatabase.map(p => <option key={`f_${p.id}`} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label>🌸 Fertilità:</label>
                            <select name="autofertile" value={formData.autofertile} onChange={handleChange}>
                                <option value="Sconosciuta">Sconosciuta</option>
                                <option value="Autofertile">Autofertile</option>
                                <option value="Parzialmente autofertile">Parzialmente autofertile</option>
                                <option value="Autosterile">Autosterile</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Posizione & Ambiente */}
        <div className={`accordion-item ${accordions.environment ? 'open' : ''}`}>
            <div className="accordion-header" onClick={() => toggleAccordion('environment')}>
                <h3>🌍 Posizione & ambiente</h3>
                <span className="acc-icon" style={{ transform: accordions.environment ? 'rotate(180deg)' : 'none' }}>▼</span>
            </div>
            {accordions.environment && (
                <div className="accordion-content">
                    <div className="form-grid">
                        <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <label>Sistemazione:</label>
                                <select name="placement" value={formData.placement} onChange={handleChange}>
                                    <option value="Vaso">Vaso</option>
                                    <option value="Piena terra">Piena terra</option>
                                    <option value="Idroponica">Idroponica</option>
                                </select>
                            </div>
                            {formData.placement === 'Vaso' && (
                                <div style={{ flex: 1 }}>
                                    <label>Litri:</label>
                                    <input type="text" inputMode="decimal" name="potSize" value={formData.potSize} onChange={handleChange} placeholder="es. 15" />
                                </div>
                            )}
                        </div>
                        
                        <div style={{ gridColumn: 'span 2' }}>
                            <label>Substrato / Terriccio:</label>
                            <input type="text" name="soil" value={formData.soil} onChange={handleChange} placeholder="es. Torba e perlite" />
                        </div>

                        <div style={{ gridColumn: 'span 2', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                                <label>🧪 pH Minimo:</label>
                                <input type="text" inputMode="decimal" name="phMin" value={formData.phMin} onChange={handleChange} placeholder="es. 5.5" />
                            </div>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                                <label>🧪 pH Massimo:</label>
                                <input type="text" inputMode="decimal" name="phMax" value={formData.phMax} onChange={handleChange} placeholder="es. 6.5" />
                            </div>
                        </div>

                        <div style={{ gridColumn: 'span 2', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                                <label>🌡️ Temp. minima (°C):</label>
                                <input type="number" inputMode="decimal" name="minTemp" value={formData.minTemp} onChange={handleChange} placeholder="es. 5" />
                            </div>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                                <label>🌡️ Temp. massima (°C):</label>
                                <input type="number" inputMode="decimal" name="maxTemp" value={formData.maxTemp} onChange={handleChange} placeholder="es. 38" />
                            </div>
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <label>📍 Luogo testuale:</label>
                            <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="es. Serra sud" />
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Acquisto & Note */}
        <div className={`accordion-item ${accordions.purchase ? 'open' : ''}`}>
            <div className="accordion-header" onClick={() => toggleAccordion('purchase')}>
                <h3>🛒 Acquisto & Note Specifiche</h3>
                <span className="acc-icon" style={{ transform: accordions.purchase ? 'rotate(180deg)' : 'none' }}>▼</span>
            </div>
            {accordions.purchase && (
                <div className="accordion-content">
                    <div className="form-grid">
                        <div>
                            <label>Fornitore:</label>
                            <input type="text" name="vendor" value={formData.vendor} onChange={handleChange} />
                        </div>
                        <div>
                            <label>Data acquisto:</label>
                            <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleChange} />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label>Prezzo d'acquisto (€):</label>
                            <input type="number" inputMode="decimal" name="price" value={formData.price} onChange={handleChange} />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label>Stato Pianta:</label>
                            <select name="status" value={formData.status} onChange={handleChange}>
                                <option value="active">🟢 Attiva e In Salute</option>
                                <option value="archived">🔴 Archiviata / Persa</option>
                            </select>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label>Note aggiuntive su questa specifica pianta:</label>
                            <textarea name="notes" value={formData.notes} onChange={handleChange} rows="3" placeholder="Scrivi qui eventuali note..."></textarea>
                        </div>
                    </div>
                </div>
            )}
        </div>

      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button className="btn btn-primary" style={{ flex: 2, padding: '15px' }} onClick={handleSave}>
            💾 Salva {isEditing ? 'Modifiche' : 'Pianta'}
          </button>
          <button className="btn btn-warning" style={{ flex: 1, padding: '15px' }} onClick={() => navigate(-1)}>
            Annulla
          </button>
      </div>

    </div>
  );
};

export default PlantForm;
