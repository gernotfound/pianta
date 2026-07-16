// ==========================================
// CONFIGURAZIONE GLOBALE DELL'APP (APP_CONFIG)
// ==========================================
const APP_CONFIG = {
    DB_NAME: 'TropicalGardenDB',
    DB_VERSION: 3,
    TOAST_TIMEOUT: 2200,
    DEBOUNCE_DELAY: 300,
    IMG_MAX_DIMENSION: 1200,
    IMG_QUALITY_HIGH: 0.72,
    IMG_QUALITY_LOW: 0.60,
    IMG_COMPRESSION_THRESHOLD: 2000000,
    MAX_BACKUP_WARNING_SIZE: 262144000,
    MAP_DEFAULT_LAT: 20.0,
    MAP_DEFAULT_LNG: 0.0,
    MAP_WORLD_ZOOM: 2,
    MAP_PLANT_ZOOM: 15,
    WIND_ALERT_KMH: 40
};

const OFFLINE_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23e0e0e0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='18' fill='%23757575'%3ENessuna Foto%3C/text%3E%3C/svg%3E";

let gardenTitle = "🌿 Gestione Piante Tropicali - Pro";
let gardenNotes = "";
let plantsDatabase = [];
let generalExpenses = [];
let wishlist = [];

let currentPlantId = null;
let map = null;
let marker = null;
let growthChart = null;
let eventsChart = null;
let globalEvChart = null;
let html5QrcodeScanner = null;
let editingMode = false;
let unsavedChanges = false;
let isFormDirty = false;

let globalMap = null;
let globalMapMarkers = null;

let isBatchMode = false;
let selectedBatchPlants = new Set();

let vendorMode = 'select';
let soilMode = 'select';
let scientificMode = 'select';
let locationMode = 'select';
let mainPhotoRemoved = false;
let fruitPhotoRemoved = false;

let searchDebounceTimer = null;

window.smartCropBlobs = { main: null, fruit: null };
window.appInitialized = false;

let dbSyncHashes = { Plants: {}, Expenses: {}, Wishlist: {} };

// ==========================================
// CANALE DI SINCRONIZZAZIONE (MULTI-TAB)
// ==========================================
let gardenSyncChannel = null;
if ('BroadcastChannel' in window) {
    gardenSyncChannel = new BroadcastChannel('garden_sync');
    gardenSyncChannel.onmessage = (event) => {
        if (event.data === 'RELOAD_DB') {
            console.log("[Sync] Rilevato salvataggio in un'altra scheda. Sincronizzazione in background...");
            loadFromLocal(true);
        }
    };
}

// ==========================================
// EVENT EMITTER PER REATTIVITÀ
// ==========================================
const AppState = {
    events: {},
    on(eventName, fn) {
        if (!this.events[eventName]) this.events[eventName] = [];
        this.events[eventName].push(fn);
    },
    off(eventName, fn) {
        if (this.events[eventName]) {
            this.events[eventName] = this.events[eventName].filter(f => f !== fn);
        }
    },
    emit(eventName, data) {
        if (this.events[eventName]) {
            this.events[eventName].forEach(fn => {
                try {
                    fn(data);
                } catch (e) {
                    console.error(`Errore evento ${eventName}:`, e);
                }
            });
        }
    }
};

// ==========================================
// HELPER E FORMATTAZIONE GLOBALI
// ==========================================
function getLocalYYYYMMDD() {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];
}

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g, function(tag) {
        const charsToReplace = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
        return charsToReplace[tag] || tag;
    });
}

function formatDateIt(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return 'N/D';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
}

function renderFornitore(vendorText) {
    if (!vendorText) return 'N/D';
    let trimmed = String(vendorText).trim();
    let displayRaw = trimmed;
    if (displayRaw.length > 35) displayRaw = displayRaw.substring(0, 35) + '...';

    let safeHref = escapeHTML(trimmed);
    let safeDisplay = escapeHTML(displayRaw);

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return `<a href="${safeHref}" target="_blank" style="color: var(--primary); font-weight:bold; text-decoration: underline;">${safeDisplay}</a>`;
    } else if (trimmed.startsWith('www.')) {
        return `<a href="https://${safeHref}" target="_blank" style="color: var(--primary); font-weight:bold; text-decoration: underline;">${safeDisplay}</a>`;
    }
    return escapeHTML(trimmed);
}

function debouncedRenderPlants() {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        if (typeof renderPlants === 'function') renderPlants();
    }, APP_CONFIG.DEBOUNCE_DELAY);
}

function updateConnectionStatusIndicator() {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const homeIndicator = document.getElementById('connection-status-indicator');
    if (homeIndicator) {
        homeIndicator.textContent = isOnline ? 'Online' : 'Offline';
        homeIndicator.style.background = isOnline ? '#2e7d32' : '#d32f2f';
    }
    const modalConnStatus = document.getElementById('modal-conn-status');
    if (modalConnStatus) {
        modalConnStatus.textContent = isOnline ? 'Online' : 'Offline';
        modalConnStatus.style.background = isOnline ? '#2e7d32' : '#d32f2f';
    }
}

function parseLocalFloat(value) {
    if (!value || String(value).trim() === "") return null;
    let str = String(value).replace(',', '.');
    let parsed = parseFloat(str);
    return isNaN(parsed) ? null : parsed;
}

function formatLocalFloat(value) {
    if (value === null || value === undefined || value === "") return "";
    return String(value).replace('.', ',');
}

function getModernFertility(val) {
    if (!val) return 'Sconosciuta';
    const sVal = String(val);
    if (sVal === 'Sì' || sVal === 'Autofertile') return 'Autofertile';
    if (sVal === 'No' || sVal === 'Autosterile') return 'Autosterile';
    if (sVal === 'Parzialmente autofertile' || sVal === 'Incerto') return 'Parzialmente autofertile';
    return 'Sconosciuta';
}

function safeCloneImage(img) {
    if (!img) return null;
    if (img instanceof Blob) return new Blob([img], { type: img.type });
    if (typeof img === 'string') return img;
    return img;
}

function generateId() {
    if (typeof crypto !== 'undefined') {
        if (typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        if (typeof crypto.getRandomValues === 'function') {
            return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        }
    }
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
}

function sanitizeImageSource(src) {
    if (!src || typeof src !== 'string') return OFFLINE_PLACEHOLDER;
    const s = src.trim();
    if (s.startsWith('blob:') || s.startsWith('data:image/') || s.startsWith('images/')) return s;
    if (s === OFFLINE_PLACEHOLDER) return s;
    return OFFLINE_PLACEHOLDER;
}

function generateFastHash(obj) {
    const str = JSON.stringify(obj, (key, value) => {
        if (value instanceof Blob || (typeof value === 'string' && value.startsWith('blob:'))) return null;
        return value;
    });
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
}

window.imageCache = {};
window.fetchingImages = {};

let renderDebounceTimer = null;
function triggerReRender() {
    clearTimeout(renderDebounceTimer);
    renderDebounceTimer = setTimeout(() => {
        if (typeof currentTab !== 'undefined') {
            if (currentTab === 'home' && typeof renderMyData === 'function') renderMyData();
            if (currentTab === 'plants' && typeof renderPlants === 'function') renderPlants();
            if (currentTab === 'wishlist' && typeof renderWishlist === 'function') renderWishlist();
            if (currentTab === 'events' && typeof renderGlobalChart === 'function') renderGlobalChart();
        }
        if (typeof renderGallery === 'function' && document.getElementById('gallery-grid') && document.getElementById('gallery-grid').innerHTML !== '') {
            renderGallery();
        }
    }, 300);
}

function getImageUrl(imageObj) {
    if (!imageObj) return '';
    if (typeof imageObj === 'string' && imageObj.startsWith('data:')) return sanitizeImageSource(imageObj);
    if (imageObj instanceof Blob || imageObj instanceof File) {
        if (!imageObj._url) {
            imageObj._url = URL.createObjectURL(imageObj);
        }
        return sanitizeImageSource(imageObj._url);
    }
    
    if (typeof imageObj === 'string') {
        if (window.imageCache[imageObj]) {
            return window.imageCache[imageObj];
        }
        
        if (!window.fetchingImages[imageObj]) {
            window.fetchingImages[imageObj] = true;
            loadImageFromFirestore(imageObj).then(b64 => {
                if (b64) {
                    window.imageCache[imageObj] = b64;
                    triggerReRender();
                }
            });
        }
        return typeof OFFLINE_PLACEHOLDER !== 'undefined' ? OFFLINE_PLACEHOLDER : '';
    }
    
    return '';
}

function revokeBlob(blobObj) {
    if (!blobObj) return;
    try {
        if (typeof blobObj === 'string' && blobObj.startsWith('blob:')) {
            URL.revokeObjectURL(blobObj);
        } else if (blobObj instanceof Blob && blobObj._url) {
            URL.revokeObjectURL(blobObj._url);
            delete blobObj._url;
        }
    } catch(e) {
        console.warn("Errore revoca blob", e);
    }
}

function cleanupPlantImages(plant) {
    if (!plant) return;
    if (plant.photo) revokeBlob(plant.photo);
    if (plant.fruitPhoto) revokeBlob(plant.fruitPhoto);
    if (plant.logs && Array.isArray(plant.logs)) {
        plant.logs.forEach(log => {
            if (log.photos && Array.isArray(log.photos)) {
                log.photos.forEach(ph => revokeBlob(ph));
            }
        });
    }
}

// ==========================================
// MOTORE DATABASE OTTIMIZZATO (FIRESTORE)
// ==========================================
let firestoreUid = null;

function standardizeDatabaseIds() {
    if (Array.isArray(plantsDatabase)) {
        plantsDatabase.forEach(p => {
            if (p.id) p.id = String(p.id);
            if (Array.isArray(p.logs)) {
                p.logs.forEach(l => {
                    if (l.id) l.id = String(l.id);
                });
            }
        });
    }
}

async function saveToLocal() {
    return new Promise(async (resolve) => {
        if (!firestoreUid) return resolve(false);

        if (!Array.isArray(plantsDatabase)) plantsDatabase = [];
        if (!Array.isArray(generalExpenses)) generalExpenses = [];
        if (!Array.isArray(wishlist)) wishlist = [];

        try {
            standardizeDatabaseIds();
            // Rimuoviamo le immagini pesanti prima di salvare il metadata
            // Il salvataggio delle immagini avviene separatamente in media.js/plants-form.js
            const plantsMeta = plantsDatabase.map(p => {
                const pMeta = { ...p };
                if (p.photo) pMeta.photo = p.id + '_main';
                if (p.fruitPhoto) pMeta.fruitPhoto = p.id + '_fruit';
                if (pMeta.logs) {
                    pMeta.logs = pMeta.logs.map((log, idx) => {
                        const lMeta = { ...log };
                        if (lMeta.photos && lMeta.photos.length > 0) {
                            lMeta.photos = lMeta.photos.map((_, i) => `${log.id}_photo_${i}`);
                        }
                        return lMeta;
                    });
                }
                return pMeta;
            });

            const wishlistMeta = wishlist.map(w => {
                const wMeta = { ...w };
                if (w.photo) wMeta.photo = w.id + '_wishlist';
                return wMeta;
            });

            const data = {
                title: gardenTitle,
                notes: gardenNotes,
                plants: plantsMeta,
                expenses: generalExpenses,
                wishlist: wishlistMeta
            };

            const docRef = window.firebaseDoc(window.firebaseDb, "users", firestoreUid);
            await window.firebaseSetDoc(docRef, data);
            
            showAutoSaveToast();
            resolve(true);
        } catch(e) {
            console.error("[Firestore] Errore salvataggio:", e);
            resolve(false);
        }
    });
}

async function loadFromLocal(isSilent = false) {
    if (!firestoreUid) {
        if (!isSilent) finalizeLoad(false);
        return;
    }
    
    try {
        const docRef = window.firebaseDoc(window.firebaseDb, "users", firestoreUid);
        const docSnap = await window.firebaseGetDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            gardenTitle = data.title || "🌿 Gestione Piante Tropicali - Pro";
            gardenNotes = data.notes || "";
            plantsDatabase = Array.isArray(data.plants) ? data.plants : [];
            generalExpenses = Array.isArray(data.expenses) ? data.expenses : [];
            wishlist = Array.isArray(data.wishlist) ? data.wishlist : [];
            
            standardizeDatabaseIds();

            if (isSilent) {
                finalizeSilentLoad();
            } else {
                finalizeLoad(true);
            }
        } else {
            // Nuova utenza, nessun documento
            gardenTitle = "🌿 Il mio giardino";
            gardenNotes = "";
            plantsDatabase = [];
            generalExpenses = [];
            wishlist = [];
            await saveToLocal(); // Crea doc iniziale
            finalizeLoad(true);
        }
    } catch(e) {
        console.error("[Firestore] Errore caricamento:", e);
        if (!isSilent) finalizeLoad(false);
    }
}

async function saveImageToFirestore(imageId, base64String) {
    if (!firestoreUid || !imageId) return;
    try {
        const imgRef = window.firebaseDoc(window.firebaseDb, "users", firestoreUid, "images", imageId);
        await window.firebaseSetDoc(imgRef, { data: base64String });
    } catch(e) {
        console.error("Errore salvataggio immagine in Firestore:", e);
    }
}

async function loadImageFromFirestore(imageId) {
    if (!firestoreUid || !imageId) return null;
    try {
        const imgRef = window.firebaseDoc(window.firebaseDb, "users", firestoreUid, "images", imageId);
        const docSnap = await window.firebaseGetDoc(imgRef);
        if (docSnap.exists()) {
            return docSnap.data().data;
        }
    } catch(e) {
        console.warn("Impossibile caricare immagine da Firestore:", e);
    }
    return null;
}

function finalizeSilentLoad() {
    const titleEl = document.getElementById('main-title');
    if (titleEl) titleEl.innerText = gardenTitle;
    
    if (typeof AppState !== 'undefined') AppState.emit('plantsUpdated');

    if (typeof currentTab !== 'undefined') {
        if (currentTab === 'home' && typeof renderMyData === 'function') renderMyData();
        if (currentTab === 'plants' && typeof renderPlants === 'function') renderPlants();
        if (currentTab === 'events' && typeof renderGlobalChart === 'function') renderGlobalChart();
        if (currentTab === 'expenses' && typeof renderExpenses === 'function') renderExpenses();
        if (currentTab === 'wishlist' && typeof renderWishlist === 'function') renderWishlist();
        if (currentTab === 'settings') {
            const globalNotes = document.getElementById('global-garden-notes');
            if (globalNotes) globalNotes.value = gardenNotes || "";
        }
        if (typeof currentPlantId !== 'undefined' && currentPlantId && typeof _internalOpenPlantDetail === 'function') {
            _internalOpenPlantDetail(currentPlantId);
        }
    }
}

function finalizeLoad(hasData = true) {
    const titleEl = document.getElementById('main-title');
    if(titleEl) titleEl.innerText = gardenTitle;
    window.appInitialized = true;
    
    const startScreen = document.getElementById('startup-screen');
    const navBar = document.getElementById('bottom-nav');
    
    if (hasData) {
        if(startScreen) startScreen.classList.add('hidden');
        if(navBar) navBar.classList.remove('hidden-nav');
    } else {
        if(startScreen) startScreen.classList.remove('hidden');
        if(navBar) navBar.classList.add('hidden-nav');
    }
    
    if(typeof initRouter === 'function') initRouter(hasData);
}

// FIX UI: La funzione è stata svuotata per non mostrare più il popup
function showAutoSaveToast(message = 'Salvato') {
    return;
}

async function saveGardenNotes() {
    const notesArea = document.getElementById('global-garden-notes');
    if (notesArea) {
        gardenNotes = notesArea.value;
        await saveToLocal();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    if (window.appInitialized) return;
    updateConnectionStatusIndicator();
    window.addEventListener('online', updateConnectionStatusIndicator);
    window.addEventListener('offline', updateConnectionStatusIndicator);

    const loginBtn = document.getElementById('btn-google-login');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            if (window.firebaseSignIn && window.firebaseAuth && window.firebaseProvider) {
                window.firebaseSignIn(window.firebaseAuth, window.firebaseProvider)
                    .catch(err => {
                        console.error("Login fallito:", err);
                        if (typeof Swal !== 'undefined') Swal.fire('Errore', 'Login fallito: ' + err.message, 'error');
                    });
            }
        });
    }

    if (window.firebaseOnAuthStateChanged) {
        window.firebaseOnAuthStateChanged(window.firebaseAuth, (user) => {
            if (user) {
                firestoreUid = user.uid;
                loadFromLocal();
            } else {
                firestoreUid = null;
                finalizeLoad(false);
            }
        });
    }

    const notesArea = document.getElementById('global-garden-notes');
    if (notesArea) {
        notesArea.addEventListener('blur', async () => {
            if (notesArea.value !== gardenNotes) await saveGardenNotes();
        });
    }
});

['input', 'change'].forEach(evt => {
    document.addEventListener(evt, (e) => {
        if (!e.target || typeof e.target.closest !== 'function') return;
        if (e.target.closest('#form-container') || e.target.closest('#expenses-view') || e.target.closest('#wishlist-view') || e.target.closest('.diary-section')) {
            isFormDirty = true;
        }
    });
});

document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'hidden') {
        const notesArea = document.getElementById('global-garden-notes');
        if (notesArea && notesArea.value !== gardenNotes) await saveGardenNotes();
    }
});

window.addEventListener('beforeunload', function (e) {
    if (isFormDirty) {
        e.preventDefault();
        e.returnValue = 'Hai dati non salvati nel modulo! Sei sicuro di voler uscire?';
    } else if (unsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Hai delle modifiche non salvate in ZIP!';
    }
});

function logout() {
    if (typeof Swal === 'undefined') return;
    Swal.fire({
        title: 'Sei sicuro di voler uscire?',
        text: "Verrai disconnesso dal tuo account Google.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d32f2f',
        cancelButtonColor: '#607d8b',
        confirmButtonText: 'Sì, esci',
        cancelButtonText: 'Annulla'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                if (window.firebaseSignOut && window.firebaseAuth) {
                    await window.firebaseSignOut(window.firebaseAuth);
                }
            } catch(e) {
                console.error("Errore logout:", e);
            }
            plantsDatabase = [];
            generalExpenses = [];
            wishlist = [];
            gardenTitle = "🌿 Gestione Piante Tropicali - Pro";
            gardenNotes = "";
            firestoreUid = null;
            
            window.location.hash = '#/startup';
            window.location.reload();
        }
    });
}

function createNewGarden() {
    // Funzione deprecata: Firebase creerà il giardino vuoto al login
}