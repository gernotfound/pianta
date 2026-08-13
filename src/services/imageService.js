import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from '../store';

/**
 * Ridimensiona e comprime un file immagine in Base64 (WebP) usando un Canvas.
 * @param {File} file Il file immagine selezionato
 * @param {number} maxDimension Dimensione massima (lato lungo)
 * @param {number} quality Qualità WebP (0.0 - 1.0)
 * @returns {Promise<string>} Base64 data URL
 */
export const compressImage = (file, maxDimension = 1200, quality = 0.72) => {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            reject(new Error('Il file non è un\'immagine valida.'));
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxDimension) {
                        height *= maxDimension / width;
                        width = maxDimension;
                    }
                } else {
                    if (height > maxDimension) {
                        width *= maxDimension / height;
                        height = maxDimension;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff'; // Sfondo bianco nel caso di PNG trasparenti
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/webp', quality);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

/**
 * Salva l'immagine in Firestore nella sottocollezione "images" dell'utente.
 * Grazie alla persistentLocalCache di Firebase, funzionerà anche offline.
 */
export const saveImageToFirestore = async (imageId, base64String) => {
    const user = useStore.getState().user;
    if (!user || !imageId || !base64String) return;

    try {
        const imgRef = doc(db, 'users', user.uid, 'images', imageId);
        await setDoc(imgRef, { data: base64String });
        console.log(`Foto salvata: ${imageId}`);
    } catch (e) {
        console.error("Errore salvataggio immagine in Firestore:", e);
    }
};

/**
 * Carica l'immagine (Base64) da Firestore / Cache locale.
 */
export const loadImageFromFirestore = async (imageId) => {
    const user = useStore.getState().user;
    if (!user || !imageId) return null;

    // Controllo sicurezza rapido (se l'URL inizia con http o data, è già pronto)
    if (imageId.startsWith('http') || imageId.startsWith('data:')) {
        return imageId;
    }

    try {
        const imgRef = doc(db, 'users', user.uid, 'images', imageId);
        const docSnap = await getDoc(imgRef);
        if (docSnap.exists()) {
            return docSnap.data().data;
        }
    } catch (e) {
        console.warn("Impossibile caricare immagine da Firestore:", e);
    }
    return null;
};
