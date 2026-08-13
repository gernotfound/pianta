import { useState } from 'react';
import { useStore } from '../store';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Swal from 'sweetalert2';

const MacroTab = ({ plants }) => {
    const user = useStore(state => state.user);
    const activePlants = plants.filter(p => p.status !== 'archived');
    
    const [selectedPlants, setSelectedPlants] = useState(new Set());
    const [eventType, setEventType] = useState('Innaffiatura');
    const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
    const [eventNote, setEventNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const toggleSelection = (id) => {
        const newSet = new Set(selectedPlants);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedPlants(newSet);
    };

    const toggleAll = () => {
        if (selectedPlants.size === activePlants.length) {
            setSelectedPlants(new Set());
        } else {
            setSelectedPlants(new Set(activePlants.map(p => p.id)));
        }
    };

    const handleApplyMacro = async () => {
        if (selectedPlants.size === 0) {
            Swal.fire('Attenzione', 'Seleziona almeno una pianta.', 'warning');
            return;
        }

        const logEntry = {
            type: eventType,
            date: eventDate,
            note: eventNote || 'Azione Macro'
        };

        setIsSaving(true);
        try {
            const promises = Array.from(selectedPlants).map(async (plantId) => {
                const plant = activePlants.find(p => p.id === plantId);
                if (plant) {
                    const updatedLogs = [...(plant.logs || []), logEntry];
                    return updateDoc(doc(db, 'users', user.uid, 'plants', plantId), { logs: updatedLogs });
                }
            });

            await Promise.all(promises);
            Swal.fire('Successo', `Azione macro applicata a ${selectedPlants.size} piante!`, 'success');
            setSelectedPlants(new Set());
            setEventNote('');
        } catch (e) {
            Swal.fire('Errore', "Impossibile applicare l'azione macro.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div>
            <h3 style={{ color: 'var(--primary)', marginTop: 0 }}>☑️ Azioni Macro (Batch)</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
                Applica un evento a più piante contemporaneamente.
            </p>

            <div className="card" style={{ marginBottom: '20px', position: 'sticky', top: '10px', zIndex: 10 }}>
                <h4 style={{ margin: '0 0 10px 0' }}>Imposta Evento</h4>
                
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                        <label>Tipo Azione</label>
                        <select value={eventType} onChange={e => setEventType(e.target.value)} style={{ width: '100%' }}>
                            <option value="Innaffiatura">💧 Innaffiatura</option>
                            <option value="Concimazione">🧪 Concimazione</option>
                            <option value="Trattamento">🛡️ Trattamento</option>
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label>Data</label>
                        <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} style={{ width: '100%' }} />
                    </div>
                </div>
                
                <label>Note aggiuntive (Opzionale)</label>
                <input type="text" value={eventNote} onChange={e => setEventNote(e.target.value)} placeholder="Es. Olio di Neem" style={{ width: '100%', marginBottom: '15px' }} />

                <button className="btn btn-warning" onClick={handleApplyMacro} disabled={isSaving || selectedPlants.size === 0} style={{ width: '100%', margin: 0, fontWeight: 'bold' }}>
                    {isSaving ? 'Applicazione in corso...' : `🚀 Applica a ${selectedPlants.size} Piante`}
                </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0 }}>Seleziona Piante</h4>
                <button className="btn btn-outline" style={{ margin: 0, padding: '5px 10px' }} onClick={toggleAll}>
                    {selectedPlants.size === activePlants.length ? 'Deseleziona Tutto' : 'Seleziona Tutto'}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                {activePlants.map(plant => {
                    const isSelected = selectedPlants.has(plant.id);
                    return (
                        <div 
                            key={plant.id} 
                            onClick={() => toggleSelection(plant.id)}
                            style={{ 
                                background: isSelected ? 'var(--blue)' : 'var(--surface)', 
                                color: isSelected ? 'white' : 'var(--text)',
                                padding: '15px 10px', 
                                borderRadius: '8px', 
                                textAlign: 'center', 
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                border: isSelected ? '2px solid var(--blue)' : '2px solid transparent'
                            }}
                        >
                            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{plant.name}</div>
                            {plant.placement && <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>{plant.placement}</div>}
                        </div>
                    );
                })}
            </div>

        </div>
    );
};

export default MacroTab;
