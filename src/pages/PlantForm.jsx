import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const PlantForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    name: '',
    scientific: '',
    origin: 'Da seme',
    sowingDate: '',
    geneticFidelity: 'Non ancora valutato',
    autofertile: 'Sconosciuta',
    placement: 'Vaso',
    potSize: '',
    soil: '',
    phMin: '',
    phMax: '',
    minTemp: '',
    maxTemp: '',
    location: '',
    lat: '',
    lng: '',
    vendor: '',
    price: '',
    purchaseDate: '',
    notes: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    console.log("Saving...", formData);
    navigate('/plants');
  };

  return (
    <div className="fade-in" style={{ paddingBottom: '80px' }}>
      <h2 style={{ marginTop: 0, color: 'var(--primary)', paddingBottom: '5px' }}>
        {isEditing ? 'Modifica pianta' : 'Aggiungi nuova pianta'}
      </h2>
      
      <div className="accordion-group">
        
        {/* Dati Principali */}
        <div className="accordion-item open">
            <div className="accordion-header">
                <h3>📋 Dati principali & foto</h3>
            </div>
            <div className="accordion-content">
                <div className="form-grid">
                    <div style={{ gridColumn: 'span 2' }}>
                        <label>Nome (obbligatorio):</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="es. Yellow pitahaya 1" />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                        <label>Nome scientifico:</label>
                        <input type="text" name="scientific" value={formData.scientific} onChange={handleChange} placeholder="es. Monstera deliciosa" />
                    </div>
                </div>
            </div>
        </div>

        {/* Posizione & Ambiente */}
        <div className="accordion-item open">
            <div className="accordion-header">
                <h3>🌍 Posizione & ambiente</h3>
            </div>
            <div className="accordion-content">
                <div className="form-grid">
                    <div style={{ gridColumn: 'span 2' }}>
                        <label>Sistemazione iniziale:</label>
                        <select name="placement" value={formData.placement} onChange={handleChange}>
                            <option value="Vaso">Vaso</option>
                            <option value="Piena terra">Piena terra</option>
                            <option value="Idroponica">Idroponica</option>
                        </select>
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
                </div>
            </div>
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
