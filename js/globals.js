// ==========================================
// CONFIGURAZIONE GLOBALE DELL'APP (APP_CONFIG)
// ==========================================
const APP_CONFIG = {
    // Database
    DB_NAME: 'TropicalGardenDB',
    DB_VERSION: 3,
    
    // UI e Tempi
    TOAST_TIMEOUT: 2200,       
    DEBOUNCE_DELAY: 300,       
    
    // Gestione Immagini e RAM
    IMG_MAX_DIMENSION: 1200,   
    IMG_QUALITY_HIGH: 0.72,    
    IMG_QUALITY_LOW: 0.60,     
    IMG_COMPRESSION_THRESHOLD: 2000000, 
    
    // Esportazione Dati
    MAX_BACKUP_WARNING_SIZE: 262144000, 
    
    // Mappe (Leaflet)
    MAP_DEFAULT_LAT: 20.0,
    MAP_DEFAULT_LNG: 0.0,
    MAP_WORLD_ZOOM: 2,         
    MAP_PLANT_ZOOM: 15,        
    
    // Meteo e Allerte (Default, modificabile in Impostazioni)
    WIND_ALERT_KMH: 40         
};

// ==========================================
// COSTANTI E VARIABILI GLOBALI DI STATO
// ==========================================
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
let currentQuickFilter = 'all';

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
let hasCheckedWeather = false;

window.smartCropBlobs = { main: null, fruit: null };
window.appInitialized = false;

// Memoria delle impronte digitali per salvataggi incrementali
let dbSyncHashes = { Plants: {}, Expenses: {}, Wishlist: {} };

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
                try { fn(data); } catch (e) { console.error(`Errore evento ${eventName}:`, e); }
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
    return str.toString().replace(/[&<>'"]/g, function(tag) {
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
    let trimmed = vendorText.trim(); 
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

// Spostato qui per funzionare in background su tutte le pagine
function updateConnectionStatusIndicator() {
    const isOnline = navigator.onLine;
    const indicator = document.getElementById('connection-status-indicator');
    if (indicator) {
        indicator.textContent = isOnline ? 'Online' : 'Offline';
        indicator.style.background = isOnline ? '#2e7d32' : '#d32f2f';
    }
}

function parseLocalFloat(value) {
    if (!value || value.toString().trim() === "") return null;
    let str = value.toString().replace(',', '.');
    let parsed = parseFloat(str);
    return isNaN(parsed) ? null : parsed;
}

function formatLocalFloat(value) {
    if (value === null || value === undefined || value === "") return "";
    return value.toString().replace('.', ',');
}

function getModernFertility(val) {
    if (!val) return 'Sconosciuta';
    if (val === 'Sì' || val === 'Autofertile') return 'Autofertile';
    if (val === 'No' || val === 'Autosterile') return 'Autosterile';
    if (val === 'Parzialmente autofertile' || val === 'Incerto') return 'Parzialmente autofertile';
    return 'Sconosciuta';
}

function safeCloneImage(img) {
    if (!img) return null;
    if (img instanceof Blob) return new Blob([img], { type: img.type });
    if (typeof img === 'string') return img; 
    return img;
}

// ==========================================
// GESTIONE ID UNIVOCI (UUID) E XSS
// ==========================================
function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function sanitizeImageSource(src) {
    if (!src || typeof src !== 'string') return OFFLINE_PLACEHOLDER;
    const s = src.trim();
    if (s.startsWith('blob:') || s.startsWith('data:image/') || s.startsWith('images/')) return s;
    if (s === OFFLINE_PLACEHOLDER) return s;
    return OFFLINE_PLACEHOLDER;
}

// ==========================================
// HASHING VELOCE (Per Salvataggio Incrementale)
// ==========================================
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

// ==========================================
// GESTIONE MEMORIA E IMMAGINI (BLOBS)
// ==========================================
function getImageUrl(imageObj) {
    if (!imageObj) return '';
    if (typeof imageObj === 'string') return sanitizeImageSource(imageObj); 
    if (imageObj instanceof Blob || imageObj instanceof File) {
        if (!imageObj._url) { imageObj._url = URL.createObjectURL(imageObj); }
        return sanitizeImageSource(imageObj._url);
    }
    return '';
}

function revokeBlob(blobObj) {
    if (!blobObj) return;
    try {
        if (typeof blobObj === 'string' && blobObj.startsWith('blob:')) { URL.revokeObjectURL(blobObj); } 
        else if (blobObj instanceof Blob && blobObj._url) { URL.revokeObjectURL(blobObj._url); delete blobObj._url; }
    } catch(e) { console.warn("Errore revoca blob", e); }
}

function cleanupPlantImages(plant) {
    if (!plant) return;
    if (plant.photo) revokeBlob(plant.photo);
    if (plant.fruitPhoto) revokeBlob(plant.fruitPhoto);
    if (plant.logs && Array.isArray(plant.logs)) {
        plant.logs.forEach(log => {
            if (log.photos && Array.isArray(log.photos)) { log.photos.forEach(ph => revokeBlob(ph)); }
        });
    }
}

// ==========================================
// MOTORE DATABASE OTTIMIZZATO (INDEXEDDB)
// ==========================================
function initDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) { return reject("IndexedDB non supportato"); }
        let request;
        try { request = indexedDB.open(APP_CONFIG.DB_NAME, APP_CONFIG.DB_VERSION); } 
        catch (e) { return reject("Impossibile inizializzare IndexedDB"); }

        request.onupgradeneeded = function(e) {
            let db = e.target.result;
            if (!db.objectStoreNames.contains('System')) db.createObjectStore('System');
            if (!db.objectStoreNames.contains('Plants')) db.createObjectStore('Plants', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('Expenses')) db.createObjectStore('Expenses', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('Wishlist')) db.createObjectStore('Wishlist', { keyPath: 'id' });
        };
        request.onsuccess = function(e) { resolve(e.target.result); };
        request.onerror = function(e) { reject(e.target.error); };
    });
}

function syncStore(store, ramArray, storeName) {
    return new Promise((resolve, reject) => {
        if (!Array.isArray(ramArray)) return resolve();
        
        let reqKeys = store.getAllKeys();
        reqKeys.onsuccess = function() {
            let dbKeys = reqKeys.result;
            let ramKeys = ramArray.map(item => String(item.id));
            
            dbKeys.forEach(key => { 
                if (!ramKeys.includes(String(key))) {
                    store.delete(key); 
                    delete dbSyncHashes[storeName][key];
                }
            });
            
            ramArray.forEach(item => { 
                let currentHash = generateFastHash(item);
                if (dbSyncHashes[storeName][item.id] !== currentHash) {
                    store.put(item); 
                    dbSyncHashes[storeName][item.id] = currentHash;
                }
            });
            
            resolve();
        };
        reqKeys.onerror = (e) => reject(e.target.error);
    });
}

function getSerializableFallbackData() {
    const stripPhotos = (obj) => {
        if (!obj) return obj;
        let copy = { ...obj };
        copy.photo = null; copy.fruitPhoto = null;
        if (copy.logs && Array.isArray(copy.logs)) { copy.logs = copy.logs.map(l => ({ ...l, photos: [] })); }
        return copy;
    };
    const wStrip = (w) => {
        if (!w) return w;
        let copy = { ...w };
        copy.photo = null;
        return copy;
    };
    return {
        title: gardenTitle, notes: gardenNotes,
        plants: plantsDatabase.map(stripPhotos),
        expenses: generalExpenses, wishlist: wishlist.map(wStrip)
    };
}

async function saveToLocal() {
    return new Promise(async (resolve) => {
        if (!Array.isArray(plantsDatabase)) plantsDatabase = [];
        if (!Array.isArray(generalExpenses)) generalExpenses = [];
        if (!Array.isArray(wishlist)) wishlist = [];

        try {
            const liteData = getSerializableFallbackData();
            localStorage.setItem('garden_full_backup_v1', JSON.stringify(liteData));
        } catch(e) {
            console.warn("[Backup] Salvataggio fallback su localStorage fallito.");
        }

        try {
            let db = await initDB();
            let tx = db.transaction(['System', 'Plants', 'Expenses', 'Wishlist'], 'readwrite');
            
            tx.objectStore('System').put({ title: gardenTitle, notes: gardenNotes }, 'metadata');
            
            syncStore(tx.objectStore('Plants'), plantsDatabase, 'Plants').catch(e => {});
            syncStore(tx.objectStore('Expenses'), generalExpenses, 'Expenses').catch(e => {});
            syncStore(tx.objectStore('Wishlist'), wishlist, 'Wishlist').catch(e => {});
            
            tx.oncomplete = function() { showAutoSaveToast(); resolve(true); };
            tx.onerror = function(e) { 
                console.error("[DB] Transazione fallita:", e.target.error);
                if (e.target.error && e.target.error.name === 'QuotaExceededError') {
                    if (typeof Swal !== 'undefined') Swal.fire({icon: 'error', title: 'Memoria Piena!', text: 'Spazio esaurito nel browser. Elimina foto vecchie o archivia piante.', confirmButtonColor: '#d32f2f'});
                }
                resolve(false); 
            };
        } catch(e) {
            showAutoSaveToast(); 
            resolve(false);
        }
    });
}

async function loadFromLocal() {
    try {
        let db = await initDB();
        
        let tx = db.transaction(['System', 'Plants', 'Expenses', 'Wishlist'], 'readonly');
        let reqSys = tx.objectStore('System').get('metadata');
        let reqPl = tx.objectStore('Plants').getAll();
        let reqExp = tx.objectStore('Expenses').getAll();
        let reqWish = tx.objectStore('Wishlist').getAll();
        
        tx.oncomplete = function() {
            let sysData = reqSys.result;
            if (!sysData && (!reqPl.result || reqPl.result.length === 0)) {
                const fallback = localStorage.getItem('garden_full_backup_v1');
                if (fallback) {
                    try { 
                        let fd = JSON.parse(fallback);
                        sysData = { title: fd.title, notes: fd.notes };
                        if (fd.plants) reqPl.result = Array.isArray(fd.plants) ? fd.plants : [];
                        if (fd.expenses) reqExp.result = Array.isArray(fd.expenses) ? fd.expenses : [];
                        if (fd.wishlist) reqWish.result = Array.isArray(fd.wishlist) ? fd.wishlist : [];
                    } catch(e) {}
                }
            }
            
            if (sysData || (reqPl.result && reqPl.result.length > 0)) {
                gardenTitle = sysData && sysData.title ? sysData.title : "🌿 Gestione Piante Tropicali - Pro";
                gardenNotes = sysData && sysData.notes ? sysData.notes : "";
                plantsDatabase = Array.isArray(reqPl.result) ? reqPl.result : [];
                generalExpenses = Array.isArray(reqExp.result) ? reqExp.result : [];
                wishlist = Array.isArray(reqWish.result) ? reqWish.result : [];
                
                plantsDatabase.forEach(p => dbSyncHashes.Plants[p.id] = generateFastHash(p));
                generalExpenses.forEach(e => dbSyncHashes.Expenses[e.id] = generateFastHash(e));
                wishlist.forEach(w => dbSyncHashes.Wishlist[w.id] = generateFastHash(w));

                finalizeLoad(true);
            } else { finalizeLoad(false); }
        };
        tx.onerror = function() { fallbackLoad(); };

    } catch(e) { fallbackLoad(); }
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

function fallbackLoad() {
    console.warn("[Recupero] Esecuzione fallback Load. IndexedDB non disponibile.");
    const fallback = localStorage.getItem('garden_full_backup_v1');
    if (fallback) {
        try {
            let data = JSON.parse(fallback);
            gardenTitle = data.title || "🌿 Gestione Piante Tropicali - Pro";
            gardenNotes = data.notes || "";
            plantsDatabase = Array.isArray(data.plants) ? data.plants : [];
            generalExpenses = Array.isArray(data.expenses) ? data.expenses : [];
            wishlist = Array.isArray(data.wishlist) ? data.wishlist : [];
            
            plantsDatabase.forEach(p => dbSyncHashes.Plants[p.id] = generateFastHash(p));
            generalExpenses.forEach(e => dbSyncHashes.Expenses[e.id] = generateFastHash(e));
            wishlist.forEach(w => dbSyncHashes.Wishlist[w.id] = generateFastHash(w));

            finalizeLoad(true);
            return;
        } catch(e) {
            console.error("[Recupero] Errore critico nel parsing dei dati di fallback:", e);
        }
    }
    finalizeLoad(false);
}

function showAutoSaveToast(message = 'Salvato') {
    const toast = document.getElementById('autosave-toast');
    if(toast) {
        const label = toast.querySelector('.toast-label');
        if (label) label.textContent = message;
        toast.classList.remove('hidden');
        clearTimeout(toast._hideTimer);
        toast._hideTimer = setTimeout(() => { toast.classList.add('hidden'); }, APP_CONFIG.TOAST_TIMEOUT);
    }
}

async function saveGardenNotes() {
    const notesArea = document.getElementById('global-garden-notes');
    if (notesArea) { gardenNotes = notesArea.value; await saveToLocal(); }
}

// ==========================================
// EVENT LISTENERS GLOBALI
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    if (window.appInitialized) return;
    updateConnectionStatusIndicator();
    window.addEventListener('online', updateConnectionStatusIndicator); 
    window.addEventListener('offline', updateConnectionStatusIndicator);

    loadFromLocal();
    
    const notesArea = document.getElementById('global-garden-notes');
    if (notesArea) { notesArea.addEventListener('blur', async () => { if (notesArea.value !== gardenNotes) await saveGardenNotes(); }); }
});

['input', 'change'].forEach(evt => {
    document.addEventListener(evt, (e) => {
        if (!e.target || typeof e.target.closest !== 'function') return;
        if (e.target.closest('#form-container') || e.target.closest('#expenses-view') || e.target.closest('#wishlist-view') || e.target.closest('.diary-section')) { isFormDirty = true; }
    });
});

document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'hidden') {
        const notesArea = document.getElementById('global-garden-notes');
        if (notesArea && notesArea.value !== gardenNotes) await saveGardenNotes();
    }
});

window.addEventListener('beforeunload', function (e) {
    if (isFormDirty) { e.preventDefault(); e.returnValue = 'Hai dati non salvati nel modulo! Sei sicuro di voler uscire?'; } 
    else if (unsavedChanges) { e.preventDefault(); e.returnValue = 'Hai delle modifiche non salvate in ZIP!'; }
});

function logout() {
    if (typeof Swal === 'undefined') return;
    Swal.fire({
        title: 'Sei sicuro di voler ripartire da zero?',
        text: "Tutti i dati verranno eliminati. Se non hai fatto un Backup (ZIP), li perderai per sempre.",
        icon: 'warning', showCancelButton: true, confirmButtonColor: '#d32f2f', cancelButtonColor: '#607d8b', confirmButtonText: 'Sì, cancella ed esci', cancelButtonText: 'Annulla'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                let db = await initDB();
                let tx = db.transaction(['System', 'Plants', 'Expenses', 'Wishlist'], 'readwrite');
                tx.objectStore('System').clear(); tx.objectStore('Plants').clear();
                tx.objectStore('Expenses').clear(); tx.objectStore('Wishlist').clear();
            } catch(e) {}
            localStorage.removeItem('garden_full_backup_v1'); 
            plantsDatabase = []; generalExpenses = []; wishlist = []; gardenTitle = "🌿 Gestione Piante Tropicali - Pro"; gardenNotes = "";
            dbSyncHashes = { Plants: {}, Expenses: {}, Wishlist: {} }; 
            window.location.hash = '#/startup'; window.location.reload();
        }
    });
}

function createNewGarden() {
    gardenTitle = "🌿 Il mio giardino"; plantsDatabase = []; generalExpenses = []; wishlist = []; gardenNotes = "";
    dbSyncHashes = { Plants: {}, Expenses: {}, Wishlist: {} }; 
    saveToLocal().then(() => {
        const titleEl = document.getElementById('main-title'); if(titleEl) titleEl.innerText = gardenTitle;
        const startScreen = document.getElementById('startup-screen'); const navBar = document.getElementById('bottom-nav');
        if(startScreen) startScreen.classList.add('hidden'); if(navBar) navBar.classList.remove('hidden-nav');
        if(typeof navigateTab === 'function') navigateTab('home');
    });
}