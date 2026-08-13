import { useState, useEffect } from 'react';
import { loadImageFromFirestore } from '../services/imageService';
import { useNavigate } from 'react-router-dom';

const GalleryTab = ({ plants }) => {
    const navigate = useNavigate();
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchAllImages = async () => {
            const allImgs = [];
            for (const plant of plants) {
                if (plant.photo) {
                    const b64 = await loadImageFromFirestore(plant.photo);
                    if (b64) allImgs.push({ src: b64, plantId: plant.id, plantName: plant.name, type: 'Pianta' });
                }
                if (plant.fruitPhoto) {
                    const b64F = await loadImageFromFirestore(plant.fruitPhoto);
                    if (b64F) allImgs.push({ src: b64F, plantId: plant.id, plantName: plant.name, type: 'Frutto' });
                }
            }
            if (isMounted) {
                setImages(allImgs);
                setLoading(false);
            }
        };
        fetchAllImages();
        return () => { isMounted = false; };
    }, [plants]);

    return (
        <div>
            <h3 style={{ color: 'var(--primary)', marginTop: 0 }}>🖼️ Archivio Fotografico</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
                Tutte le foto scattate e salvate nel database.
            </p>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}>Caricamento foto in corso...</div>
            ) : images.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--surface)', borderRadius: '12px' }}>
                    Nessuna foto trovata nel database.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
                    {images.map((img, idx) => (
                        <div 
                            key={idx} 
                            style={{ position: 'relative', cursor: 'pointer', aspectRatio: '1/1', overflow: 'hidden', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                            onClick={() => navigate(`/plants/${img.plantId}`)}
                        >
                            <img src={img.src} alt={img.plantName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '10px', padding: '4px', textAlign: 'center', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                {img.plantName}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GalleryTab;
