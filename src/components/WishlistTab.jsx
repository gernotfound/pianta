import { useState } from 'react';
import { useStore } from '../store';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { compressImage } from '../services/imageService';
import Swal from 'sweetalert2';

const WishlistTab = () => {
    const user = useStore(state => state.user);
    const wishlist = useStore(state => state.wishlist);
    
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [notes, setNotes] = useState('');
    const [photoData, setPhotoData] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const b64 = await compressImage(file, 600);
            setPhotoData(b64);
        } catch (err) {
            Swal.fire('Errore', 'Impossibile comprimere la foto', 'error');
        }
    };

    const handleAddWishlist = async () => {
        if (!name) {
            Swal.fire('Errore', 'Inserisci almeno il nome della pianta.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            await addDoc(collection(db, 'users', user.uid, 'wishlist'), {
                name,
                price: parseFloat(price) || null,
                notes,
                photo: photoData,
                dateAdded: new Date().toISOString()
            });
            Swal.fire({ icon: 'success', title: 'Aggiunta alla wishlist!', timer: 1000, showConfirmButton: false });
            setName('');
            setPrice('');
            setNotes('');
            setPhotoData(null);
            document.getElementById('wishlist-photo-upload').value = '';
        } catch (e) {
            Swal.fire('Errore', 'Impossibile salvare.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        const res = await Swal.fire({
            title: 'Rimuovere dalla wishlist?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33'
        });
        if (res.isConfirmed) {
            try {
                await deleteDoc(doc(db, 'users', user.uid, 'wishlist', id));
            } catch (e) {
                Swal.fire('Errore', 'Impossibile eliminare.', 'error');
            }
        }
    };

    return (
        <div>
            <h3 style={{ color: 'var(--primary)', marginTop: 0 }}>🛒 Wishlist Piante</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
                Piante che desideri acquistare in futuro.
            </p>

            <div className="card" style={{ marginBottom: '25px' }}>
                <h4 style={{ margin: '0 0 15px 0' }}>Nuovo Desiderio</h4>
                
                <label>Nome Pianta *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', marginBottom: '10px' }} />
                
                <label>Prezzo stimato (€)</label>
                <input type="number" inputMode="decimal" step="0.01" value={price} onChange={e => setPrice(e.target.value)} style={{ width: '100%', marginBottom: '10px' }} />
                
                <label>Note / Dove comprarla</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} style={{ width: '100%', marginBottom: '10px' }} />
                
                <label>Foto di riferimento (Opzionale)</label>
                <input type="file" accept="image/*" id="wishlist-photo-upload" onChange={handlePhotoChange} style={{ width: '100%', marginBottom: '10px' }} />
                
                {photoData && (
                    <div style={{ marginBottom: '15px' }}>
                        <img src={photoData} alt="Preview" style={{ width: '100%', maxHeight: '150px', objectFit: 'contain', borderRadius: '8px' }} />
                        <button className="btn btn-danger" style={{ display: 'block', width: '100%', marginTop: '5px' }} onClick={() => { setPhotoData(null); document.getElementById('wishlist-photo-upload').value = ''; }}>Rimuovi foto</button>
                    </div>
                )}

                <button className="btn btn-warning" onClick={handleAddWishlist} disabled={isSaving} style={{ width: '100%', margin: '10px 0 0 0' }}>
                    {isSaving ? 'Salvataggio...' : '➕ Aggiungi a Wishlist'}
                </button>
            </div>

            {wishlist.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', background: 'var(--surface)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                    La tua wishlist è vuota.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
                    {wishlist.map(item => (
                        <div key={item.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            {item.photo ? (
                                <img src={item.photo} alt={item.name} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '120px', background: 'var(--surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Nessuna Foto</div>
                            )}
                            <div style={{ padding: '10px' }}>
                                <h4 style={{ margin: '0 0 5px 0' }}>{item.name}</h4>
                                {item.price && <div style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '14px', marginBottom: '5px' }}>{item.price} €</div>}
                                {item.notes && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>{item.notes}</div>}
                                <button className="btn btn-danger" style={{ width: '100%', padding: '5px', fontSize: '12px', margin: 0 }} onClick={() => handleDelete(item.id)}>🗑️ Rimuovi</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WishlistTab;
