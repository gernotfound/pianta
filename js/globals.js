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
        homeIndicator.textContent = isOnline ? '🟢 Online' : '🔴 Offline';
        homeIndicator.style.background = isOnline ? '#2e7d32' : '#d32f2f';
    }
    const modalConnStatus = document.getElementById('modal-conn-status');
    if (modalConnStatus) {
        modalConnStatus.textContent = isOnline ? '🟢 Online' : '🔴 Offline';
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
                    // Ottimizzazione RAM estrema: non salviamo il lungo Base64 in RAM, 
                    // ma lo convertiamo in un ObjectURL del browser.
                    fetch(b64).then(res => res.blob()).then(blob => {
                        window.imageCache[imageObj] = URL.createObjectURL(blob);
                        triggerReRender();
                    }).catch(e => console.error("Errore blob img:", e));
                }
            });
        }
        return typeof OFFLINE_PLACEHOLDER !== 'undefined' ? OFFLINE_PLACEHOLDER : '';
    }
    
    return '';
}

function revokeBlob(imageId) {
    if (imageId && window.imageCache && window.imageCache[imageId]) {
        URL.revokeObjectURL(window.imageCache[imageId]);
        delete window.imageCache[imageId];
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
            
            const mainDocRef = window.firebaseDoc(window.firebaseDb, "users", firestoreUid);
            await window.firebaseSetDoc(mainDocRef, {
                title: gardenTitle,
                notes: gardenNotes,
                schemaVersion: 2
            }, { merge: true });

            const currentPlantIds = new Set(plantsDatabase.map(p => String(p.id)));
            const currentExpenseIds = new Set(generalExpenses.map(e => String(e.id)));
            const currentWishlistIds = new Set(wishlist.map(w => String(w.id)));

            // 1. Elimina documenti rimossi dalla memoria
            for (const id in dbSyncHashes.Plants) {
                if (!currentPlantIds.has(id)) {
                    const docRef = window.firebaseDoc(window.firebaseDb, "users", firestoreUid, "plants", id);
                    try {
                        await window.firebaseDeleteDoc(docRef);
                        delete dbSyncHashes.Plants[id];
                    } catch(e) {
                        console.warn("Rinvio eliminazione pianta offline:", e);
                    }
                }
            }
            for (const id in dbSyncHashes.Expenses) {
                if (!currentExpenseIds.has(id)) {
                    const docRef = window.firebaseDoc(window.firebaseDb, "users", firestoreUid, "expenses", id);
                    try {
                        await window.firebaseDeleteDoc(docRef);
                        delete dbSyncHashes.Expenses[id];
                    } catch(e) {
                        console.warn("Rinvio eliminazione spesa offline:", e);
                    }
                }
            }
            for (const id in dbSyncHashes.Wishlist) {
                if (!currentWishlistIds.has(id)) {
                    const docRef = window.firebaseDoc(window.firebaseDb, "users", firestoreUid, "wishlist", id);
                    try {
                        await window.firebaseDeleteDoc(docRef);
                        delete dbSyncHashes.Wishlist[id];
                    } catch(e) {
                        console.warn("Rinvio eliminazione wishlist offline:", e);
                    }
                }
            }

            // 2. Salva solo i record nuovi o modificati (delta sync)
            const promises = [];

            for (const p of plantsDatabase) {
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
                
                const hash = generateFastHash(pMeta);
                if (dbSyncHashes.Plants[p.id] !== hash) {
                    const docRef = window.firebaseDoc(window.firebaseDb, "users", firestoreUid, "plants", pMeta.id);
                    promises.push(window.firebaseSetDoc(docRef, pMeta).then(() => {
                        dbSyncHashes.Plants[p.id] = hash;
                    }));
                }
            }

            for (const e of generalExpenses) {
                const hash = generateFastHash(e);
                if (dbSyncHashes.Expenses[e.id] !== hash) {
                    const docRef = window.firebaseDoc(window.firebaseDb, "users", firestoreUid, "expenses", e.id);
                    promises.push(window.firebaseSetDoc(docRef, e).then(() => {
                        dbSyncHashes.Expenses[e.id] = hash;
                    }));
                }
            }

            for (const w of wishlist) {
                const wMeta = { ...w };
                if (w.photo) wMeta.photo = w.id + '_wishlist';
                const hash = generateFastHash(wMeta);
                if (dbSyncHashes.Wishlist[w.id] !== hash) {
                    const docRef = window.firebaseDoc(window.firebaseDb, "users", firestoreUid, "wishlist", w.id);
                    promises.push(window.firebaseSetDoc(docRef, wMeta).then(() => {
                        dbSyncHashes.Wishlist[w.id] = hash;
                    }));
                }
            }

            await Promise.all(promises);
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
        
        const fetchWithTimeout = (promise, ms) => {
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error("TIMEOUT")), ms);
                promise.then(res => { clearTimeout(timer); resolve(res); })
                       .catch(err => { clearTimeout(timer); reject(err); });
            });
        };

        let docSnap;
        try {
            if (!navigator.onLine) {
                docSnap = await window.firebaseGetDocFromCache(docRef);
            } else {
                docSnap = await fetchWithTimeout(window.firebaseGetDoc(docRef), 3000);
            }
        } catch (err) {
            console.warn("Rete lenta o offline, fallback cache per doc utente:", err);
            try {
                docSnap = await window.firebaseGetDocFromCache(docRef);
            } catch (cacheErr) {
                console.error("Cache fallita:", cacheErr);
                if (!isSilent) finalizeLoad(false);
                return;
            }
        }
        
        let schemaVersion = 1;

        if (docSnap.exists()) {
            const data = docSnap.data();
            gardenTitle = data.title || "🌿 Gestione Piante Tropicali - Pro";
            gardenNotes = data.notes || "";
            schemaVersion = data.schemaVersion || 1;
            
            if (schemaVersion === 1) {
                // Migrazione silente al nuovo schema a sottocollezioni
                plantsDatabase = Array.isArray(data.plants) ? data.plants : [];
                generalExpenses = Array.isArray(data.expenses) ? data.expenses : [];
                wishlist = Array.isArray(data.wishlist) ? data.wishlist : [];
                standardizeDatabaseIds();
                await saveToLocal(); // Salva nel nuovo formato!
            } else {
                // Caricamento nuovo schema (Subcollections)
                const plantsCol = window.firebaseCollection(window.firebaseDb, "users", firestoreUid, "plants");
                const expensesCol = window.firebaseCollection(window.firebaseDb, "users", firestoreUid, "expenses");
                const wishlistCol = window.firebaseCollection(window.firebaseDb, "users", firestoreUid, "wishlist");

                let pSnap, eSnap, wSnap;
                try {
                    if (!navigator.onLine) {
                        [pSnap, eSnap, wSnap] = await Promise.all([
                            window.firebaseGetDocsFromCache(plantsCol),
                            window.firebaseGetDocsFromCache(expensesCol),
                            window.firebaseGetDocsFromCache(wishlistCol)
                        ]);
                    } else {
                        [pSnap, eSnap, wSnap] = await fetchWithTimeout(Promise.all([
                            window.firebaseGetDocs(plantsCol),
                            window.firebaseGetDocs(expensesCol),
                            window.firebaseGetDocs(wishlistCol)
                        ]), 3000);
                    }
                } catch(err) {
                    console.warn("Rete lenta o timeout, fallback cache per collezioni...");
                    [pSnap, eSnap, wSnap] = await Promise.all([
                        window.firebaseGetDocsFromCache(plantsCol),
                        window.firebaseGetDocsFromCache(expensesCol),
                        window.firebaseGetDocsFromCache(wishlistCol)
                    ]);
                }

                plantsDatabase = [];
                dbSyncHashes.Plants = {};
                pSnap.forEach(doc => {
                    const p = doc.data();
                    plantsDatabase.push(p);
                    dbSyncHashes.Plants[p.id] = generateFastHash(p);
                });

                generalExpenses = [];
                dbSyncHashes.Expenses = {};
                eSnap.forEach(doc => {
                    const e = doc.data();
                    generalExpenses.push(e);
                    dbSyncHashes.Expenses[e.id] = generateFastHash(e);
                });

                wishlist = [];
                dbSyncHashes.Wishlist = {};
                wSnap.forEach(doc => {
                    const w = doc.data();
                    wishlist.push(w);
                    dbSyncHashes.Wishlist[w.id] = generateFastHash(w);
                });
            }

            if (isSilent) {
                finalizeSilentLoad();
            } else {
                finalizeLoad(true);
            }
        } else {
            // Nuova utenza
            gardenTitle = "🌿 Il mio giardino";
            gardenNotes = "";
            plantsDatabase = [];
            generalExpenses = [];
            wishlist = [];
            await saveToLocal(); 
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

function initAppListeners() {
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
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAppListeners);
} else {
    initAppListeners();
}

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
            Swal.fire({
                title: 'Sincronizzazione...',
                text: 'Attendere prego, stiamo salvando i tuoi dati nel cloud.',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                // Attendi al massimo 5 secondi per caricare i salvataggi offline pendenti
                if (window.firebaseWaitForPendingWrites && window.firebaseDb) {
                    const syncPromise = window.firebaseWaitForPendingWrites(window.firebaseDb);
                    const timeoutPromise = new Promise(resolve => setTimeout(resolve, 5000));
                    await Promise.race([syncPromise, timeoutPromise]);
                }
                
                if (window.firebaseSignOut && window.firebaseAuth) {
                    await window.firebaseSignOut(window.firebaseAuth);
                }
            } catch(e) {
                console.error("Errore logout:", e);
            }
            plantsDatabase = [];
            generalExpenses = [];
            wishlist = [];
            gardenTitle = "🌿 Il mio giardino";
            gardenNotes = "";
            firestoreUid = null;
            
            // Disattiva gli avvisi del browser prima di ricaricare
            isFormDirty = false;
            unsavedChanges = false;
            
            window.location.hash = '#/startup';
            window.location.reload();
        }
    });
}

function deleteAccount() {
    if (typeof Swal === 'undefined') return;
    Swal.fire({
        title: 'ELIMINAZIONE DEFINITIVA',
        text: "Vuoi davvero eliminare il tuo account, il tuo giardino e tutti i tuoi dati dal Cloud? Questa azione è IRREVERSIBILE.",
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#d32f2f',
        cancelButtonColor: '#607d8b',
        confirmButtonText: 'Sì, elimina tutto',
        cancelButtonText: 'Annulla'
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Eliminazione in corso...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                if (window.firebaseAuth && window.firebaseAuth.currentUser && window.firebaseDb && firestoreUid) {
                    // 1. Elimina i dati da Firestore
                    const userDocRef = window.firebaseDoc(window.firebaseDb, "users", firestoreUid);
                    await window.firebaseDeleteDoc(userDocRef);
                    
                    // 2. Elimina l'utente dall'Auth
                    await window.firebaseDeleteUser(window.firebaseAuth.currentUser);
                }
            } catch(e) {
                console.error("Errore eliminazione account:", e);
                // Se l'errore è auth/requires-recent-login
                if (e.code === 'auth/requires-recent-login') {
                    Swal.fire('Sicurezza Google', 'Per motivi di sicurezza, Google richiede un accesso recente per poter eliminare l\'account. Fai Log Out, accedi di nuovo e riprova l\'eliminazione.', 'warning');
                    return;
                } else {
                    Swal.fire('Errore', 'Impossibile eliminare l\'account: ' + e.message, 'error');
                    return;
                }
            }
            plantsDatabase = [];
            generalExpenses = [];
            wishlist = [];
            gardenTitle = "🌿 Il mio giardino";
            gardenNotes = "";
            firestoreUid = null;
            isFormDirty = false;
            unsavedChanges = false;
            
            window.location.hash = '#/startup';
            window.location.reload();
        }
    });
}

function createNewGarden() {
    // Funzione deprecata: Firebase creerà il giardino vuoto al login
}