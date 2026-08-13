import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const MapTab = ({ plants }) => {
    const navigate = useNavigate();
    const [mapCenter, setMapCenter] = useState([41.9028, 12.4964]); // Default to Rome
    
    const mappedPlants = plants.filter(p => p.lat && p.lng && !isNaN(parseFloat(p.lat)) && !isNaN(parseFloat(p.lng)));

    useEffect(() => {
        if (mappedPlants.length > 0) {
            setMapCenter([parseFloat(mappedPlants[0].lat), parseFloat(mappedPlants[0].lng)]);
        }
    }, [mappedPlants]);

    return (
        <div>
            <h3 style={{ color: 'var(--primary)', marginTop: 0 }}>🗺️ Mappa Globale</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '15px' }}>
                Piante geolocalizzate: {mappedPlants.length} su {plants.length}
            </p>

            <div style={{ height: '70vh', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--surface-border)' }}>
                <MapContainer center={mapCenter} zoom={5} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                    />
                    {mappedPlants.map(plant => (
                        <Marker key={plant.id} position={[parseFloat(plant.lat), parseFloat(plant.lng)]}>
                            <Popup>
                                <div style={{ textAlign: 'center' }}>
                                    <h4 style={{ margin: '0 0 5px 0' }}>{plant.name}</h4>
                                    <button className="btn btn-blue" style={{ margin: 0, padding: '5px 10px', fontSize: '12px' }} onClick={() => navigate(`/plants/${plant.id}`)}>
                                        Vedi Dettaglio
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
};

export default MapTab;
