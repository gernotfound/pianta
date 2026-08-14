import { useState, useEffect } from 'react';
import { useStore } from '../store';

const WeatherAlerts = () => {
    const plantsDatabase = useStore(state => state.plantsDatabase);
    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchWeather = async () => {
            const plantsWithLocation = plantsDatabase.filter(p => p.lat && p.lng);
            if (plantsWithLocation.length === 0) {
                setError('Nessuna pianta ha una posizione sulla mappa. Modifica una pianta e imposta le coordinate per attivare le allerte meteo localizzate.');
                setLoading(false);
                return;
            }

            const lat = plantsWithLocation[0].lat;
            const lng = plantsWithLocation[0].lng;

            try {
                const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_min,wind_speed_10m_max,weathercode&timezone=auto`);
                if (!response.ok) throw new Error('Errore API meteo');
                
                const data = await response.json();
                const newAlerts = [];
                
                if (data.daily) {
                    for (let i = 0; i < 3; i++) {
                        const dateStr = data.daily.time[i];
                        const minTemp = data.daily.temperature_2m_min[i];
                        const maxWind = data.daily.wind_speed_10m_max[i];
                        const code = data.daily.weathercode[i];
                        
                        let dateObj = new Date(dateStr);
                        let dayName = dateObj.toLocaleDateString('it-IT', { weekday: 'long' });
                        
                        // Gelo
                        if (minTemp <= 2) {
                            newAlerts.push({ icon: '❄️', title: `Allerta Gelo (${dayName})`, text: `Temperatura minima prevista: ${minTemp}°C` });
                        }
                        // Vento
                        if (maxWind >= 45) {
                            newAlerts.push({ icon: '💨', title: `Allerta Vento Forte (${dayName})`, text: `Raffica massima prevista: ${maxWind} km/h` });
                        }
                        // Grandine (weather codes per grandine/temporali forti)
                        if ([96, 99].includes(code)) {
                            newAlerts.push({ icon: '⛈️', title: `Possibile Grandine (${dayName})`, text: `Previsto forte temporale con rischio grandine.` });
                        }
                    }
                }
                
                setAlerts(newAlerts);
            } catch (e) {
                console.error("Errore fetch meteo:", e);
                setError('Sei offline o il server meteo non risponde. Impossibile aggiornare le allerte meteo.');
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();
    }, [plantsDatabase]);

    if (loading) {
        return (
            <div style={{ background: 'var(--surface)', padding: '15px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
                <span className="spinner" style={{ display: 'inline-block', width: '20px', height: '20px', border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                <span style={{ marginLeft: '10px' }}>Caricamento dati meteo...</span>
            </div>
        );
    }

    return (
        <div style={{ background: 'var(--surface)', padding: '15px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
                🌤️ Allerta Meteo
            </h3>
            
            {error ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>{error}</p>
            ) : alerts.length === 0 ? (
                <p style={{ color: 'var(--primary)', fontSize: '14px', margin: 0 }}>Nessuna allerta meteo critica prevista nei prossimi giorni per le tue piante. Tutto tranquillo! ☀️</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {alerts.map((alert, idx) => (
                        <div key={idx} style={{ background: 'rgba(255, 82, 82, 0.1)', border: '1px solid var(--danger)', padding: '10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '24px' }}>{alert.icon}</span>
                            <div>
                                <div style={{ color: 'var(--danger)', fontWeight: 'bold', fontSize: '14px' }}>{alert.title}</div>
                                <div style={{ color: 'var(--text)', fontSize: '13px' }}>{alert.text}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default WeatherAlerts;
