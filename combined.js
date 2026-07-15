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

function getImageUrl(imageObj) {
    if (!imageObj) return '';
    if (typeof imageObj === 'string') return sanitizeImageSource(imageObj);
    if (imageObj instanceof Blob || imageObj instanceof File) {
        if (!imageObj._url) {
            imageObj._url = URL.createObjectURL(imageObj);
        }
        return sanitizeImageSource(imageObj._url);
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
// MOTORE DATABASE OTTIMIZZATO (INDEXEDDB)
// ==========================================
function initDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            return reject("IndexedDB non supportato");
        }
        let request;
        try {
            request = indexedDB.open(APP_CONFIG.DB_NAME, APP_CONFIG.DB_VERSION);
        } catch (e) {
            return reject("Impossibile inizializzare IndexedDB");
        }

        request.onupgradeneeded = function(e) {
            let db = e.target.result;
            if (!db.objectStoreNames.contains('System')) db.createObjectStore('System');
            if (!db.objectStoreNames.contains('Plants')) db.createObjectStore('Plants', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('Expenses')) db.createObjectStore('Expenses', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('Wishlist')) db.createObjectStore('Wishlist', { keyPath: 'id' });
        };
        request.onsuccess = function(e) {
            resolve(e.target.result);
        };
        request.onerror = function(e) {
            reject(e.target.error);
        };
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

function standardizeDatabaseIds() {
    if (Array.isArray(plantsDatabase)) {
        plantsDatabase.forEach(p => {
            if (p.id) p.id = String(p.id);
            if (p.mother) p.mother = String(p.mother);
            if (p.father) p.father = String(p.father);
            if (Array.isArray(p.logs)) {
                p.logs.forEach(l => { if (l.id) l.id = String(l.id); });
            }
        });
    }
    if (Array.isArray(generalExpenses)) {
        generalExpenses.forEach(e => { if (e.id) e.id = String(e.id); });
    }
    if (Array.isArray(wishlist)) {
        wishlist.forEach(w => { if (w.id) w.id = String(w.id); });
    }
}

async function saveToLocal() {
    if (!Array.isArray(plantsDatabase)) plantsDatabase = [];
    if (!Array.isArray(generalExpenses)) generalExpenses = [];
    if (!Array.isArray(wishlist)) wishlist = [];
    standardizeDatabaseIds();

    try {
        if (window.currentUser && window.db) {
            await window.saveToFirebase();
        } else {
            let db = await initDB();
            let tx = db.transaction(['System', 'Plants', 'Expenses', 'Wishlist'], 'readwrite');
            tx.objectStore('System').put({ title: gardenTitle, notes: gardenNotes }, 'metadata');
            syncStore(tx.objectStore('Plants'), plantsDatabase, 'Plants').catch(e => {});
            syncStore(tx.objectStore('Expenses'), generalExpenses, 'Expenses').catch(e => {});
            syncStore(tx.objectStore('Wishlist'), wishlist, 'Wishlist').catch(e => {});
            return new Promise((resolve) => {
                tx.oncomplete = function() {
                    showAutoSaveToast();
                    if (gardenSyncChannel) gardenSyncChannel.postMessage('RELOAD_DB');
                    resolve(true);
                };
                tx.onerror = function(e) { resolve(false); };
            });
        }
    } catch(e) {
        return false;
    }
}

async function loadFromLocal(isSilent = false) {
    if (window.currentUser && window.db) {
        await window.loadFromFirebase(isSilent);
        return;
    }
    try {
        let db = await initDB();
        let tx = db.transaction(['System', 'Plants', 'Expenses', 'Wishlist'], 'readonly');
        let reqSys = tx.objectStore('System').get('metadata');
        let reqPl = tx.objectStore('Plants').getAll();
        let reqExp = tx.objectStore('Expenses').getAll();
        let reqWish = tx.objectStore('Wishlist').getAll();
        
        tx.oncomplete = function() {
            let sysData = reqSys.result;
            if (sysData || (reqPl.result && reqPl.result.length > 0)) {
                gardenTitle = sysData && sysData.title ? sysData.title : "🌿 Gestione Piante Tropicali - Pro";
                gardenNotes = sysData && sysData.notes ? sysData.notes : "";
                plantsDatabase = Array.isArray(reqPl.result) ? reqPl.result : [];
                generalExpenses = Array.isArray(reqExp.result) ? reqExp.result : [];
                wishlist = Array.isArray(reqWish.result) ? reqWish.result : [];
                standardizeDatabaseIds();
                if (isSilent) finalizeSilentLoad();
                else finalizeLoad(true);
            } else {
                if (!isSilent) finalizeLoad(false);
            }
        };
        tx.onerror = function() { if (!isSilent) fallbackLoad(); };
    } catch(e) {
        if (!isSilent) fallbackLoad();
    }
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

function fallbackLoad() {
    const fallback = localStorage.getItem('garden_full_backup_v1');
    if (fallback) {
        try {
            let data = JSON.parse(fallback);
            gardenTitle = data.title || "🌿 Gestione Piante Tropicali - Pro";
            gardenNotes = data.notes || "";
            plantsDatabase = Array.isArray(data.plants) ? data.plants : [];
            generalExpenses = Array.isArray(data.expenses) ? data.expenses : [];
            wishlist = Array.isArray(data.wishlist) ? data.wishlist : [];
            
            standardizeDatabaseIds();

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
    

    // Auth Check
    if (window.fbAuth) {
        window.fbOnAuthStateChanged(window.fbAuth, (user) => {
            window.currentUser = user;

            if (user) {
                const lastGardenId = localStorage.getItem('lastGardenId');
                if (lastGardenId) {
                    window.currentGardenId = lastGardenId;
                }
                
                if (window.currentGardenId) {
                    document.getElementById('startup-screen').classList.add('hidden');
                    document.getElementById('garden-selection-screen').classList.add('hidden');
                    document.getElementById('bottom-nav').classList.remove('hidden-nav');
                    loadFromLocal();
                } else {
                    window.showGardenSelection();
                }
            } else {

                    window.showGardenSelection();
                }
            } else {
                window.currentGardenId = null;
                const selScreen = document.getElementById('garden-selection-screen');
                if (selScreen) selScreen.classList.add('hidden');
                const startScreen = document.getElementById('startup-screen');
                if (startScreen) startScreen.classList.remove('hidden');
                const navBar = document.getElementById('bottom-nav');
                if (navBar) navBar.classList.add('hidden-nav');
                finalizeLoad(false);
            }
        });
    } else {
        loadFromLocal();
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
        title: 'Sei sicuro di voler ripartire da zero?',
        text: "Tutti i dati verranno eliminati. Se non hai fatto un Backup (ZIP), li perderai per sempre.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d32f2f',
        cancelButtonColor: '#607d8b',
        confirmButtonText: 'Sì, cancella ed esci',
        cancelButtonText: 'Annulla'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                let db = await initDB();
                let tx = db.transaction(['System', 'Plants', 'Expenses', 'Wishlist'], 'readwrite');
                tx.objectStore('System').clear();
                tx.objectStore('Plants').clear();
                tx.objectStore('Expenses').clear();
                tx.objectStore('Wishlist').clear();
            } catch(e) {}
            localStorage.removeItem('garden_full_backup_v1');
            plantsDatabase = [];
            generalExpenses = [];
            wishlist = [];
            gardenTitle = "🌿 Gestione Piante Tropicali - Pro";
            gardenNotes = "";
            dbSyncHashes = { Plants: {}, Expenses: {}, Wishlist: {} };
            
            if (gardenSyncChannel) gardenSyncChannel.postMessage('RELOAD_DB');
            
            window.location.hash = '#/startup';
            window.location.reload();
        }
    });
}


window.currentGardenId = null;


window.showGardenSelection = async () => {
    localStorage.removeItem('lastGardenId');
    document.getElementById('startup-screen').classList.add('hidden');

    document.getElementById('home-view').classList.add('hidden');
    document.getElementById('bottom-nav').classList.add('hidden-nav');
    
    const selScreen = document.getElementById('garden-selection-screen');
    if (selScreen) selScreen.classList.remove('hidden');

    const container = document.getElementById('garden-list-container');
    if (container) {
        container.innerHTML = '<p>Caricamento giardini...</p>';
        try {
            const uid = window.currentUser.uid;
            const snap = await window.db.collection('users').doc(uid).collection('gardens').get();
            container.innerHTML = '';
            
            if (snap.empty) {
                container.innerHTML = '<p style="color:var(--grey);">Nessun giardino trovato. Creane uno nuovo!</p>';
            } else {
                snap.forEach(doc => {
                    const gData = doc.data();
                    const btn = document.createElement('button');
                    btn.className = 'btn';
                    btn.style.width = '100%';
                    btn.style.maxWidth = '300px';
                    btn.style.margin = '0';
                    btn.innerHTML = '🪴 ' + (gData.title || 'Giardino senza nome');
                    btn.onclick = () => window.selectGarden(doc.id);
                    container.appendChild(btn);
                });
            }
        } catch(e) {
            console.error(e);
            container.innerHTML = '<p style="color:var(--danger);">Errore nel caricamento.</p>';
        }
    }
};


window.selectGarden = (gardenId) => {
    window.currentGardenId = gardenId;
    localStorage.setItem('lastGardenId', gardenId);
    document.getElementById('garden-selection-screen').classList.add('hidden');
    document.getElementById('bottom-nav').classList.remove('hidden-nav');
    if (typeof loadFromLocal === 'function') loadFromLocal();
};


const originalCreateNewGarden = createNewGarden;
window.createNewGarden = async () => {
    if (window.currentUser && window.db) {
        const { value: name } = await Swal.fire({
            title: 'Nuovo giardino',
            input: 'text',
            inputLabel: 'Nome del giardino',
            inputPlaceholder: 'es. Giardino in terrazza',
            showCancelButton: true
        });
        if (name) {
            const newId = String(Date.now() + Math.random());
            const uid = window.currentUser.uid;
            await window.db.collection('users').doc(uid).collection('gardens').doc(newId).set({ title: name, updatedAt: Date.now() });
            window.selectGarden(newId);
        }
    } else {
        originalCreateNewGarden();
    }
};

function createNewGarden() {
    gardenTitle = "🌿 Il mio giardino";
    plantsDatabase = [];
    generalExpenses = [];
    wishlist = [];
    gardenNotes = "";
    dbSyncHashes = { Plants: {}, Expenses: {}, Wishlist: {} };
    
    saveToLocal().then(() => {
        const titleEl = document.getElementById('main-title');
        if(titleEl) titleEl.innerText = gardenTitle;
        
        const startScreen = document.getElementById('startup-screen');
        const navBar = document.getElementById('bottom-nav');
        
        if(startScreen) startScreen.classList.add('hidden');
        if(navBar) navBar.classList.remove('hidden-nav');
        
        if(typeof navigateTo === 'function') navigateTo('home');
    });
}let currentTab = 'home';
let homeTabState = { view: 'home', param: null };
let plantsTabState = { view: 'plants', param: null };
let currentAppRoute = window.location.hash || '#/home';
let plantsScrollPosition = 0;
let homeScrollPosition = 0;

function initRouter(hasData) {
    window.addEventListener('popstate', async (e) => {
        let intendedState = e.state;
        let intendedHash = window.location.hash;

        if (typeof closeCropper === 'function') closeCropper();

        const imgModal = document.getElementById('fullscreen-image-modal');
        if (imgModal && imgModal.style.display !== 'none') {
            imgModal.style.display = 'none';
            document.body.style.overflow = '';
        }

        const dupModal = document.getElementById('duplicate-modal-overlay');
        if (dupModal && dupModal.style.display !== 'none') {
            dupModal.style.display = 'none';
        }

        const sysModal = document.getElementById('system-status-modal');
        if (sysModal && sysModal.style.display !== 'none') {
            sysModal.style.display = 'none';
        }

        if (isFormDirty && currentTab === 'add-plant') {
            history.pushState({ view: 'add-plant' }, '', currentAppRoute);

            if (typeof Swal === 'undefined') return;

            const res = await Swal.fire({
                title: 'Dati non salvati!',
                text: 'Sei sicuro di voler tornare indietro e annullare l\'inserimento?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d32f2f',
                cancelButtonColor: '#607d8b',
                confirmButtonText: 'Sì, esci',
                cancelButtonText: 'Annulla'
            });

            if (!res.isConfirmed) {
                return;
            } else {
                isFormDirty = false;
                if (typeof clearForm === 'function') clearForm();

                history.replaceState(intendedState, '', intendedHash);
                if (intendedState && intendedState.view) {
                    restoreTabState(intendedState.view, intendedState.param);
                    executeTabSwitch(intendedState.view, intendedState.param);
                } else {
                    parseHashAndNavigate(hasData);
                }
                return;
            }
        }

        if (e.state && e.state.view) {
            restoreTabState(e.state.view, e.state.param);
            executeTabSwitch(e.state.view, e.state.param);
        } else {
            parseHashAndNavigate(hasData);
        }
    });

    if (!hasData) {
        history.replaceState({ view: 'startup' }, '', '#/startup');
        executeTabSwitch('startup');
        return;
    }

    if (!window.location.hash || window.location.hash === '#/' || window.location.hash === '' || window.location.hash === '#/startup') {
        history.replaceState({ view: 'home' }, '', '#/home');
        executeTabSwitch('home');
    } else {
        parseHashAndNavigate(hasData);
    }
}

function parseHashAndNavigate(hasData) {
    if (hasData === false) {
        history.replaceState({ view: 'startup' }, '', '#/startup');
        executeTabSwitch('startup');
        return;
    }

    const hash = window.location.hash.replace('#/', '');
    const parts = hash.split('/');
    const view = parts[0];
    const param = parts[1] || null;

    const validViews = ['home', 'plants', 'settings', 'expenses', 'wishlist', 'gallery', 'archive', 'add-plant', 'map', 'scanner', 'plant-detail', 'edit-plant', 'events', 'macro'];

    if (validViews.includes(view)) {
        restoreTabState(view, param);
        history.replaceState({ view, param }, '', window.location.hash);
        executeTabSwitch(view, param);
    } else {
        history.replaceState({ view: 'home' }, '', '#/home');
        executeTabSwitch('home');
    }
}

function restoreTabState(view, param) {
    if (['home', 'expenses', 'wishlist', 'gallery', 'archive', 'scanner', 'macro', 'map'].includes(view)) {
        currentTab = 'home';
        homeTabState = { view, param };
    } else if (['plants', 'plant-detail', 'edit-plant'].includes(view)) {
        currentTab = 'plants';
        plantsTabState = { view, param };
    } else if (view === 'settings') {
        currentTab = 'settings';
    } else if (view === 'add-plant') {
        currentTab = 'add-plant';
    } else if (view === 'events') {
        currentTab = 'events';
    }
}

function goBack() {
    if (currentTab === 'home') {
        homeTabState = { view: 'home', param: null };
        history.pushState(homeTabState, '', '#/home');
        executeTabSwitch('home');
    } else if (currentTab === 'plants') {
        plantsTabState = { view: 'plants', param: null };
        history.pushState(plantsTabState, '', '#/plants');
        executeTabSwitch('plants');
    } else {
        homeTabState = { view: 'home', param: null };
        history.pushState(homeTabState, '', '#/home');
        executeTabSwitch('home');
    }
}

function goToHomeTab() {
    if (currentTab === 'home') {
        if (homeTabState.view === 'home') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            homeTabState = { view: 'home', param: null };
            history.pushState({ view: 'home' }, '', '#/home');
            executeTabSwitch('home');
        }
    } else {
        currentTab = 'home';
        let targetUrl = `#/${homeTabState.view}${homeTabState.param ? '/' + homeTabState.param : ''}`;
        history.pushState(homeTabState, '', targetUrl);
        executeTabSwitch(homeTabState.view, homeTabState.param);
    }
}

function goToPlantsTab() {
    if (currentTab === 'plants') {
        if (plantsTabState.view === 'plants') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            plantsTabState = { view: 'plants', param: null };
            history.pushState({ view: 'plants' }, '', '#/plants');
            executeTabSwitch('plants');
        }
    } else {
        currentTab = 'plants';
        let targetUrl = `#/${plantsTabState.view}${plantsTabState.param ? '/' + plantsTabState.param : ''}`;
        history.pushState(plantsTabState, '', targetUrl);
        executeTabSwitch(plantsTabState.view, plantsTabState.param);
    }
}

function navigateTab(tab) {
    if (tab === 'home') {
        goToHomeTab();
    } else if (tab === 'plants') {
        goToPlantsTab();
    } else if (tab === 'add-plant') {
        currentTab = 'add-plant';
        if (!isFormDirty && !editingMode) {
            if (typeof _internalOpenPlantForm === 'function') _internalOpenPlantForm();
        }
        history.pushState({ view: 'add-plant' }, '', '#/add-plant');
        executeTabSwitch('add-plant');
    } else {
        currentTab = tab;
        history.pushState({ view: tab }, '', `#/${tab}`);
        executeTabSwitch(tab);
    }
}

function navigateTo(view, param = null) {
    const dashboardEl = document.getElementById('dashboard');
    if (dashboardEl && !dashboardEl.classList.contains('hidden')) {
        plantsScrollPosition = window.scrollY || document.documentElement.scrollTop;
    }

    const homeViewEl = document.getElementById('home-view');
    if (homeViewEl && !homeViewEl.classList.contains('hidden')) {
        homeScrollPosition = window.scrollY || document.documentElement.scrollTop;
    }

    if (['plant-detail', 'edit-plant'].includes(view)) {
        currentTab = 'plants';
        plantsTabState = { view, param };
    } else if (['expenses', 'wishlist', 'gallery', 'archive', 'scanner', 'macro', 'map'].includes(view)) {
        currentTab = 'home';
        homeTabState = { view, param };
    } else if (view === 'dashboard') {
        view = 'plants';
        currentTab = 'plants';
        plantsTabState = { view: 'plants', param: null };
    }

    history.pushState({ view, param }, '', `#/${view}${param ? '/' + param : ''}`);
    executeTabSwitch(view, param);
}

function executeTabSwitch(view, param = null) {
    window.appInitialized = true;
    currentAppRoute = window.location.hash;

    // Spegnimento forzato Scanner
    if (view !== 'scanner') {
        if (typeof html5QrcodeScanner !== 'undefined' && html5QrcodeScanner) {
            try {
                html5QrcodeScanner.clear().then(() => { html5QrcodeScanner = null; }).catch(() => { html5QrcodeScanner = null; });
            } catch (e) { html5QrcodeScanner = null; }
        }
        document.querySelectorAll('video').forEach(video => {
            if (video.srcObject) {
                const tracks = video.srcObject.getTracks();
                tracks.forEach(track => track.stop());
                video.srcObject = null;
            }
        });
    }

    // FIX MEMORY LEAK MAPPE
    if (view !== 'plant-detail' && typeof cleanupDetailMap === 'function') cleanupDetailMap();
    if (view !== 'add-plant' && view !== 'edit-plant' && typeof cleanupFormMap === 'function') cleanupFormMap();
    if (view !== 'map' && typeof cleanupGlobalMap === 'function') cleanupGlobalMap();

    // FIX MEMORY LEAK GRAFICI CHART.JS
    if (view !== 'plant-detail') {
        if (typeof growthChart !== 'undefined' && growthChart) { growthChart.destroy(); growthChart = null; }
        if (typeof eventsChart !== 'undefined' && eventsChart) { eventsChart.destroy(); eventsChart = null; }
    }
    if (view !== 'events') {
        if (typeof globalEvChart !== 'undefined' && globalEvChart) { globalEvChart.destroy(); globalEvChart = null; }
    }

    const views = [
        'startup-screen', 'home-view', 'dashboard', 'settings-view',
        'expenses-view', 'wishlist-view', 'gallery-view', 'archive-page',
        'plant-detail-view', 'form-container', 'global-map-page',
        'labels-scanner-view', 'events-view', 'macro-view'
    ];

    views.forEach(v => {
        const el = document.getElementById(v);
        if (el) el.classList.add('hidden');
    });

    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));

    if (currentTab === 'home') { document.getElementById('nav-btn-home')?.classList.add('active'); }
    else if (currentTab === 'add-plant') { document.getElementById('nav-btn-add-plant')?.classList.add('active'); }
    else if (currentTab === 'plants') { document.getElementById('nav-btn-plants')?.classList.add('active'); }
    else if (currentTab === 'events') { document.getElementById('nav-btn-events')?.classList.add('active'); }
    else if (currentTab === 'settings') { document.getElementById('nav-btn-settings')?.classList.add('active'); }

    let targetId = '';
    switch (view) {
        case 'startup': targetId = 'startup-screen'; break;
        case 'home': targetId = 'home-view'; break;
        case 'plants': targetId = 'dashboard'; break;
        case 'settings': targetId = 'settings-view'; break;
        case 'archive': targetId = 'archive-page'; break;
        case 'add-plant':
        case 'edit-plant': targetId = 'form-container'; break;
        case 'map': targetId = 'global-map-page'; break;
        case 'scanner': targetId = 'labels-scanner-view'; break;
        default: targetId = view + '-view'; break;
    }

    const targetViewEl = document.getElementById(targetId);
    if (targetViewEl) {
        targetViewEl.classList.remove('hidden');
    }

    switch (view) {
        case 'home':
            if (typeof renderMyData === 'function') renderMyData();
            setTimeout(() => { window.scrollTo({ top: homeScrollPosition || 0, behavior: 'instant' }); }, 10);
            break;

        case 'plants':
            if (typeof renderPlants === 'function') renderPlants();
            setTimeout(() => { window.scrollTo({ top: plantsScrollPosition || 0, behavior: 'instant' }); }, 10);
            break;

        case 'settings': {
            const globalNotes = document.getElementById('global-garden-notes');
            if (globalNotes && typeof gardenNotes !== 'undefined') globalNotes.value = gardenNotes || "";
            if (typeof renderMyData === 'function') renderMyData();
            window.scrollTo({ top: 0, behavior: 'instant' });
            break;
        }

        case 'events':
            if (typeof renderGlobalChart === 'function') renderGlobalChart();
            if (typeof renderWeatherDashboard === 'function') renderWeatherDashboard();
            window.scrollTo({ top: 0, behavior: 'instant' });
            break;

        case 'expenses':
            if (typeof getLocalYYYYMMDD === 'function') {
                const expDateEl = document.getElementById('exp-date');
                if (expDateEl) expDateEl.value = getLocalYYYYMMDD();
            }
            if (typeof renderExpenses === 'function') renderExpenses();
            window.scrollTo({ top: 0, behavior: 'instant' });
            break;

        case 'wishlist':
            if (typeof renderWishlist === 'function') renderWishlist();
            window.scrollTo({ top: 0, behavior: 'instant' });
            break;

        case 'gallery':
            if (typeof renderGallery === 'function') renderGallery();
            window.scrollTo({ top: 0, behavior: 'instant' });
            break;

        case 'archive':
            if (typeof renderArchive === 'function') renderArchive();
            window.scrollTo({ top: 0, behavior: 'instant' });
            break;

        case 'add-plant':
            if (!editingMode && !isFormDirty && typeof _internalOpenPlantForm === 'function') {
                _internalOpenPlantForm();
            }
            setTimeout(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, 10);
            break;

        case 'edit-plant':
            if (param && typeof _internalEditPlant === 'function') {
                _internalEditPlant(param);
            }
            setTimeout(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, 10);
            break;

        case 'map':
            if (typeof renderGlobalMapFullscreen === 'function') renderGlobalMapFullscreen();
            window.scrollTo({ top: 0, behavior: 'instant' });
            break;

        case 'macro':
            if (typeof resetMacroView === 'function') resetMacroView();
            window.scrollTo({ top: 0, behavior: 'instant' });
            break;

        case 'scanner':
            if (typeof startScanner === 'function') startScanner();
            window.scrollTo({ top: 0, behavior: 'instant' });
            break;

        case 'plant-detail':
            if (param && typeof _internalOpenPlantDetail === 'function') _internalOpenPlantDetail(param);
            setTimeout(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, 10);
            setTimeout(() => { if (typeof map !== 'undefined' && map) map.invalidateSize(); }, 450);
            break;
    }
}function toggleAccordion(headerEl) {
    if (!headerEl || !headerEl.parentElement) return;
    
    const item = headerEl.parentElement;
    item.classList.toggle('open');
    
    const content = item.querySelector('.accordion-content');
    if (content) {
        if (item.classList.contains('open')) {
            content.style.display = 'block';
            headerEl.setAttribute('aria-expanded', 'true');
            // FIX DEFINITIVO: Invece di settare "false", rimuoviamo del tutto l'attributo
            // per evitare qualsiasi blocco di accessibilità da parte di Chromium
            content.removeAttribute('aria-hidden');
        } else {
            content.style.display = 'none';
            headerEl.setAttribute('aria-expanded', 'false');
            content.setAttribute('aria-hidden', 'true');
        }
    }
}

async function editMainTitle() {
    if (typeof Swal === 'undefined') return;

    const { value: newTitle } = await Swal.fire({
        title: 'Modifica nome giardino',
        input: 'text',
        inputValue: typeof gardenTitle !== 'undefined' ? gardenTitle : "Il mio giardino",
        showCancelButton: true,
        confirmButtonColor: '#2e7d32',
        cancelButtonColor: '#607d8b',
        confirmButtonText: 'Salva',
        cancelButtonText: 'Annulla',
        inputValidator: (value) => {
            if (!value || value.trim() === '') {
                return 'Devi inserire un nome valido!';
            }
        }
    });

    if (newTitle) {
        gardenTitle = newTitle.trim();
        const titleEl = document.getElementById('main-title');
        if (titleEl) titleEl.innerText = gardenTitle;
        
        unsavedChanges = true;
        try {
            if (typeof saveToLocal === 'function') await saveToLocal();
        } catch (e) {
            console.error(e);
        }
    }
}

function cancelAddPlant() {
    if (typeof isFormDirty !== 'undefined' && isFormDirty) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Annullare inserimento?',
                text: 'Perderai i dati non salvati di questa pianta.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d32f2f',
                cancelButtonColor: '#607d8b',
                confirmButtonText: 'Sì, annulla',
                cancelButtonText: 'Continua a scrivere'
            }).then((res) => {
                if (res.isConfirmed) {
                    finalizeCancelAddPlant();
                }
            });
        } else {
            if (confirm("Vuoi annullare l'inserimento? Perderai i dati non salvati.")) {
                finalizeCancelAddPlant();
            }
        }
    } else {
        finalizeCancelAddPlant();
    }
}

function finalizeCancelAddPlant() {
    isFormDirty = false;
    
    let wasEditing = typeof editingMode !== 'undefined' ? editingMode : false;
    let savedId = typeof currentPlantId !== 'undefined' ? currentPlantId : null;
    
    editingMode = false; 
    currentPlantId = null;
    
    if (typeof clearForm === 'function') clearForm();
    
    if (wasEditing && savedId && typeof navigateTo === 'function') {
        navigateTo('plant-detail', savedId);
    } else if (typeof goBack === 'function') {
        goBack();
    } else {
        window.history.back();
    }
}

function toggleGeneralList() {
    const el = document.getElementById('general-list-container');
    const btn = document.getElementById('btn-toggle-list');
    
    if (el) {
        el.classList.toggle('hidden');
        if (btn) {
            const isHidden = el.classList.contains('hidden');
            btn.setAttribute('aria-expanded', (!isHidden).toString());
            btn.innerHTML = isHidden ? '📋 Elenco Piante (Testo)' : '❌ Nascondi elenco';
        }
    }
}

async function openSystemStatusModal() {
    const modal = document.getElementById('system-status-modal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    const connSpan = document.getElementById('modal-conn-status');
    const isOnline = navigator.onLine;
    
    if (isOnline) {
        connSpan.innerText = 'Online';
        connSpan.style.background = '#2e7d32';
    } else {
        connSpan.innerText = 'Offline';
        connSpan.style.background = '#d32f2f';
    }

    const weatherSpan = document.getElementById('modal-weather-status');
    const weatherDesc = document.getElementById('modal-weather-desc');
    
    weatherSpan.innerText = 'In attesa...';
    weatherSpan.style.background = '#607d8b';
    weatherDesc.innerText = "Sto verificando la connessione al server meteo Open-Meteo...";

    if (!isOnline) {
        weatherSpan.innerText = 'Offline';
        weatherSpan.style.background = '#d32f2f';
        weatherDesc.innerText = "Nessuna rete. Le allerte meteo si baseranno sull'ultimo salvataggio offline locale.";
        return;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=41.90&longitude=12.49&current_weather=true", { 
            cache: "no-store",
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
            weatherSpan.innerText = 'Connesso e Attivo';
            weatherSpan.style.background = '#2e7d32';
            
            const now = new Date();
            const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
            weatherDesc.innerHTML = `L'API Meteo è in funzione. Il monitoraggio per Vento e Gelo è attivo.<br><strong>Ultimo controllo:</strong> oggi alle ${timeStr}.`;
        } else {
            throw new Error("Risposta non valida dal server");
        }
    } catch (e) {
        weatherSpan.innerText = 'Server Irraggiungibile';
        weatherSpan.style.background = '#f57f17';
        weatherDesc.innerHTML = "L'app è online ma il server meteo non risponde. Potrebbe esserci un blocco di rete aziendale, una VPN, o Open-Meteo è temporaneamente giù.";
    }
}

function handleSearchInput() {
    const input = document.getElementById('search-plant');
    const clearBtn = document.getElementById('clear-search-btn');
    
    if (input && clearBtn) {
        if (input.value.length > 0) {
            clearBtn.style.display = 'inline-block';
        } else {
            clearBtn.style.display = 'none';
        }
    }
    
    if (typeof debouncedRenderPlants === 'function') debouncedRenderPlants();
}

function clearSearch() {
    if (typeof searchDebounceTimer !== 'undefined' && searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
    }
    
    const input = document.getElementById('search-plant');
    const clearBtn = document.getElementById('clear-search-btn');
    
    if (input) input.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    
    if (typeof renderPlants === 'function') renderPlants();
}

function openFilterSidebar() {
    const sidebar = document.getElementById('filter-sidebar');
    if (sidebar) sidebar.classList.remove('hidden');
}

function closeFilterSidebar() {
    const sidebar = document.getElementById('filter-sidebar');
    if (sidebar) sidebar.classList.add('hidden');
}

function applyFiltersAndClose() {
    closeFilterSidebar();
    if (typeof renderPlants === 'function') renderPlants();
}

function resetFiltersAndSearch() {
    ['search-plant', 'filter-vuln-cold', 'filter-vuln-hot'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    const defaults = {
        'sort-name': true,
        'status-active': true,
        'photo-all': true,
        'place-all': true,
        'orig-all': true,
        'fert-all': true
    };
    
    for (const [id, checked] of Object.entries(defaults)) {
        const el = document.getElementById(id);
        if (el) el.checked = checked;
    }
}

function resetAllFilters() {
    resetFiltersAndSearch();
    if (typeof renderPlants === 'function') renderPlants();
    closeFilterSidebar();
}let cropperInstance = null;
let cropType = '';

function triggerSmartUpload(type) {
    let inputId = type === 'main' ? 'p-photo-hidden' : 'p-fruit-photo-hidden';
    const inputEl = document.getElementById(inputId);
    if (inputEl) inputEl.click();
}

function handleSmartUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({icon: 'error', title: 'File non valido', text: 'Per favore seleziona un\'immagine valida (JPG, PNG).', confirmButtonColor: '#2e7d32'});
        } else {
            alert('File non valido.');
        }
        event.target.value = '';
        return;
    }

    if (typeof Cropper === 'undefined') {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'info',
                title: 'Modalità Offline',
                text: 'Lo strumento di ritaglio avanzato non è disponibile. La foto verrà ridimensionata automaticamente.',
                toast: true,
                position: 'top-end',
                timer: 4000,
                showConfirmButton: false
            });
        }
        
        compressImageAsync(file).then(blob => {
            if (window.smartCropBlobs && window.smartCropBlobs[type] && typeof revokeBlob === 'function') {
                revokeBlob(window.smartCropBlobs[type]);
            }
            if (window.smartCropBlobs) window.smartCropBlobs[type] = blob;
            
            const preview = document.getElementById('preview-' + type);
            const placeholder = document.getElementById('placeholder-' + type);
            const removeBtn = document.getElementById('remove-btn-' + type);
            
            if (preview && placeholder && removeBtn) {
                if(preview.src && preview.src.startsWith('blob:')) {
                    URL.revokeObjectURL(preview.src);
                }
                const newUrl = URL.createObjectURL(blob);
                blob._url = newUrl;
                preview.src = newUrl;
                preview.style.display = 'block';
                placeholder.style.display = 'none';
                removeBtn.style.display = 'block';
            }
            
            if(type === 'main') mainPhotoRemoved = false;
            if(type === 'fruit') fruitPhotoRemoved = false;
            
            isFormDirty = true;
        }).catch(err => {
            console.error(err);
        });
        
        event.target.value = '';
        return;
    }

    cropType = type;
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const img = document.getElementById('cropper-img');
        if (!img) return;

        img.onload = () => {
            const modal = document.getElementById('cropper-modal');
            if (modal) modal.style.display = 'flex';
            
            document.body.style.overflow = 'hidden';

            if (cropperInstance) { cropperInstance.destroy(); }
            
            try {
                cropperInstance = new Cropper(img, {
                    aspectRatio: 1, 
                    viewMode: 1,    
                    dragMode: 'move', 
                    autoCropArea: 1,
                    cropBoxMovable: false,
                    cropBoxResizable: false,
                    guides: false,
                    center: false,
                    highlight: false,
                    background: false,
                    toggleDragModeOnDblclick: false
                });
            } catch (err) {
                console.error(err);
                closeCropper();
            }
        };

        img.onerror = () => {
            if (typeof Swal !== 'undefined') Swal.fire({icon: 'error', title: 'Errore', text: 'Impossibile leggere l\'immagine.', confirmButtonColor: '#d32f2f'});
            closeCropper();
        };

        img.src = e.target.result;
    };
    
    reader.onerror = () => {
        if (typeof Swal !== 'undefined') Swal.fire({icon: 'error', title: 'Errore di Lettura', text: 'File danneggiato o inaccessibile.', confirmButtonColor: '#d32f2f'});
        event.target.value = '';
    };

    reader.readAsDataURL(file);
}

function closeCropper() {
    const modal = document.getElementById('cropper-modal');
    if (modal) modal.style.display = 'none';
    
    document.body.style.overflow = '';

    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }
    
    const img = document.getElementById('cropper-img');
    if (img) {
        img.src = '';
        img.onload = null;
        img.onerror = null;
    }
    
    const pPhotoHidden = document.getElementById('p-photo-hidden');
    const pFruitPhotoHidden = document.getElementById('p-fruit-photo-hidden');
    if (pPhotoHidden) pPhotoHidden.value = '';
    if (pFruitPhotoHidden) pFruitPhotoHidden.value = '';
}

function confirmCropper() {
    if (!cropperInstance) return;
    
    const canvas = cropperInstance.getCroppedCanvas({
        width: typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.IMG_MAX_DIMENSION : 1200, 
        height: typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.IMG_MAX_DIMENSION : 1200,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
    });

    if (!canvas) {
        closeCropper();
        return;
    }
    
    const ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const exportQuality = typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.IMG_QUALITY_HIGH : 0.72;

    canvas.toBlob((blob) => {
        if (!blob) {
            closeCropper();
            return;
        }

        if (window.smartCropBlobs && window.smartCropBlobs[cropType] && typeof revokeBlob === 'function') {
            revokeBlob(window.smartCropBlobs[cropType]);
        }

        if (window.smartCropBlobs) window.smartCropBlobs[cropType] = blob;
        
        const preview = document.getElementById('preview-' + cropType);
        const placeholder = document.getElementById('placeholder-' + cropType);
        const removeBtn = document.getElementById('remove-btn-' + cropType);
        
        if (preview && placeholder && removeBtn) {
            if(preview.src && preview.src.startsWith('blob:')) {
                URL.revokeObjectURL(preview.src);
            }
            const newUrl = URL.createObjectURL(blob);
            blob._url = newUrl;
            preview.src = newUrl;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
            removeBtn.style.display = 'block';
        }
        
        if(cropType === 'main') mainPhotoRemoved = false;
        if(cropType === 'fruit') fruitPhotoRemoved = false;
        
        isFormDirty = true;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 0;
        canvas.height = 0;

        closeCropper();
    }, 'image/webp', exportQuality);
}

function removeSmartPhoto(event, type) {
    if (event) event.stopPropagation(); 
    
    if(window.smartCropBlobs && window.smartCropBlobs[type]) {
        if(typeof revokeBlob === 'function') revokeBlob(window.smartCropBlobs[type]);
        window.smartCropBlobs[type] = null;
    }
    
    const preview = document.getElementById('preview-' + type);
    if (preview) {
        if (preview.src && preview.src.startsWith('blob:')) {
            URL.revokeObjectURL(preview.src);
        }
        preview.src = '';
        preview.style.display = 'none';
    }
    
    const placeholder = document.getElementById('placeholder-' + type);
    const removeBtn = document.getElementById('remove-btn-' + type);
    if (placeholder) placeholder.style.display = 'flex';
    if (removeBtn) removeBtn.style.display = 'none';
    
    if(type === 'main') {
        mainPhotoRemoved = true;
        const inMain = document.getElementById('p-photo-hidden');
        if(inMain) inMain.value = '';
    }
    if(type === 'fruit') {
        fruitPhotoRemoved = true;
        const inFruit = document.getElementById('p-fruit-photo-hidden');
        if(inFruit) inFruit.value = '';
    }
    
    isFormDirty = true;
}

function openImageModal(src, label, plantId = null) {
    try { let parsedUrl = new URL(src); if (parsedUrl.hostname === 'via.placeholder.com') return; } catch (e) {}

    let modal = document.getElementById('fullscreen-image-modal');
    if (!modal) {
        modal = document.createElement('div'); 
        modal.id = 'fullscreen-image-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.95)';
        modal.style.zIndex = '100000';
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.className = 'animate__animated animate__fadeIn';
        modal.style.animationDuration = '0.3s';
        
        modal.onclick = function(e) { 
            if(e.target === modal) {
                modal.style.display = 'none'; 
                document.body.style.overflow = ''; 
            }
        };

        const img = document.createElement('img'); 
        img.id = 'fullscreen-image-element';
        img.style.maxWidth = '95%';
        img.style.maxHeight = '80%';
        img.style.borderRadius = '8px';
        img.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
        
        img.onerror = function() {
            this.onerror = null;
            this.src = typeof OFFLINE_PLACEHOLDER !== 'undefined' ? OFFLINE_PLACEHOLDER : '';
        };
        
        const title = document.createElement('div'); 
        title.id = 'fullscreen-image-title';
        title.style.color = 'white';
        title.style.marginTop = '15px';
        title.style.fontSize = '16px';
        title.style.fontWeight = 'bold';
        title.style.textAlign = 'center';
        title.style.padding = '0 15px';

        const btnContainer = document.createElement('div');
        btnContainer.style.position = 'absolute';
        btnContainer.style.top = '20px';
        btnContainer.style.right = '20px';
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '10px';

        const goToPlantBtn = document.createElement('button');
        goToPlantBtn.id = 'fullscreen-goto-btn';
        goToPlantBtn.innerText = '🌿 Vai alla pianta';
        goToPlantBtn.className = 'btn ';
        goToPlantBtn.style.margin = '0';

        const closeBtn = document.createElement('button'); 
        closeBtn.innerText = '✖ Chiudi'; 
        closeBtn.className = 'btn '; 
        closeBtn.style.margin = '0';
        closeBtn.onclick = function() { 
            modal.style.display = 'none'; 
            document.body.style.overflow = ''; 
        };

        btnContainer.appendChild(goToPlantBtn);
        btnContainer.appendChild(closeBtn);

        modal.appendChild(img); 
        modal.appendChild(title); 
        modal.appendChild(btnContainer); 
        document.body.appendChild(modal);
    }
    
    document.getElementById('fullscreen-image-element').src = src; 
    document.getElementById('fullscreen-image-title').innerText = label;
    
    const gotoBtn = document.getElementById('fullscreen-goto-btn');
    if (plantId) {
        gotoBtn.style.display = 'block';
        gotoBtn.onclick = function() {
            modal.style.display = 'none'; 
            document.body.style.overflow = ''; 
            if (typeof navigateTo === 'function') navigateTo('plant-detail', plantId); 
        };
    } else {
        gotoBtn.style.display = 'none'; 
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; 
}

function renderGallery() {
    const grid = document.getElementById('gallery-grid'); 
    if (!grid) return;
    
    grid.innerHTML = '';
    let allPhotos = [];
    
    if (typeof plantsDatabase !== 'undefined' && Array.isArray(plantsDatabase)) {
        plantsDatabase.forEach(p => {
            if(p.photo) allPhotos.push({ src: p.photo, label: p.name + " (Intera)", plantId: p.id });
            if(p.fruitPhoto) allPhotos.push({ src: p.fruitPhoto, label: p.name + " (Frutto)", plantId: p.id });
            if(p.logs && Array.isArray(p.logs)) {
                p.logs.forEach(log => {
                    if(log.photos && Array.isArray(log.photos) && log.photos.length > 0) {
                        log.photos.forEach((ph) => { 
                            let logDateStr = typeof formatDateIt === 'function' ? formatDateIt(log.date) : log.date;
                            allPhotos.push({ src: ph, label: p.name + ` (Diario: ${logDateStr})`, plantId: p.id }); 
                        });
                    }
                });
            }
        });
    }
    
    if (typeof wishlist !== 'undefined' && Array.isArray(wishlist)) {
        wishlist.forEach(w => {
            if(w.photo) allPhotos.push({ src: w.photo, label: w.name + " (Wishlist)", plantId: null });
        });
    }
    
    if(allPhotos.length === 0) {
        grid.innerHTML = '<p style="color: #555; grid-column: 1/-1; text-align:center;">Nessuna foto salvata nel database.</p>';
        return;
    }
    
    const fragment = document.createDocumentFragment();
    const fallbackSrc = typeof OFFLINE_PLACEHOLDER !== 'undefined' ? OFFLINE_PLACEHOLDER : '';

    allPhotos.forEach(photoObj => {
        const div = document.createElement('div'); 
        div.style.position = 'relative'; 
        div.style.cursor = 'pointer';
        
        let imgSrc = (typeof getImageUrl === 'function') ? getImageUrl(photoObj.src) : photoObj.src;
        let safeLabel = escapeHTML(photoObj.label);

        div.innerHTML = `
            <img src="${imgSrc}" onerror="this.onerror=null; this.src='${fallbackSrc}';" style="width:100%; height:150px; object-fit:cover; border-radius:6px; border:1px solid #ccc;" title="${safeLabel}" alt="Foto">
            <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.6); color:white; font-size:11px; padding:6px; border-bottom-left-radius:6px; border-bottom-right-radius:6px; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${safeLabel}
            </div>
        `;
        div.onclick = () => { openImageModal(imgSrc, photoObj.label.replace(/&#39;/g, "\\'"), photoObj.plantId); };
        fragment.appendChild(div);
    });
    grid.appendChild(fragment);
}

function startScanner() { 
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (typeof Swal !== 'undefined') {
            return Swal.fire({
                icon: 'error',
                title: 'Fotocamera Bloccata',
                text: 'Il tuo browser sta bloccando l\'accesso alla fotocamera. Assicurati di non essere in modalità incognito e di aver concesso i permessi.',
                confirmButtonColor: '#d32f2f'
            });
        }
        return;
    }

    if(html5QrcodeScanner) return; 
    
    try {
        if (typeof Html5QrcodeScanner !== 'undefined') {
            html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: {width: 250, height: 250} }, false); 
            html5QrcodeScanner.render(onScanSuccess, onScanFailure); 
        } else {
            throw new Error("Libreria Scanner mancante");
        }
    } catch(e) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning', 
                title: 'Scanner Offline', 
                text: 'La libreria dello Scanner QR non è stata caricata. Collegati a internet e riavvia l\'app per abilitarla.', 
                confirmButtonColor: '#f57f17'
            });
        }
    }
}

function onScanSuccess(decodedText, decodedResult) {
    try {
        let data = JSON.parse(decodedText);
        if(data && data.plant_id) {
            if (html5QrcodeScanner) {
                html5QrcodeScanner.clear().then(() => {
                    html5QrcodeScanner = null; 
                    processScanData(data.plant_id);
                }).catch(() => {
                    html5QrcodeScanner = null;
                    processScanData(data.plant_id);
                });
            } else {
                processScanData(data.plant_id);
            }
        } else { 
            throw new Error("Formato errato"); 
        }
    } catch(e) { 
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning', 
                title: 'Codice non valido', 
                text: 'Questo QR non appartiene a questo gestionale.', 
                confirmButtonColor: '#f57f17'
            });
        }
    }
}

function processScanData(plantId) {
    const exists = typeof plantsDatabase !== 'undefined' ? plantsDatabase.find(p => p.id == plantId) : null;
    if(exists) { 
        if(typeof navigateTo === 'function') navigateTo('plant-detail', plantId); 
    } else { 
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error', 
                title: 'Non trovata!', 
                text: 'Questa pianta non è presente nel database. Forse è stata eliminata o sei in un giardino diverso.', 
                confirmButtonColor: '#2e7d32'
            }).then(() => { if(typeof navigateTo === 'function') navigateTo('dashboard'); });
        }
    }
}

function onScanFailure(error) {}

window.addEventListener('popstate', () => {
    if(html5QrcodeScanner) {
        try {
            html5QrcodeScanner.clear().catch(e => {});
        } catch(e) {}
        html5QrcodeScanner = null;
    }
    // FIX BUG BATTERIA: Interruzione forzata dello stream video se la libreria non l'ha rilasciato
    document.querySelectorAll('video').forEach(video => {
        if (video.srcObject) {
            const tracks = video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            video.srcObject = null;
        }
    });
});

function compressImageAsync(file) {
    return new Promise((resolve, reject) => {
        (async () => {
        if (!file || !file.type.startsWith('image/')) {
            return reject(new Error('File non valido per la compressione'));
        }

        const MAX_DIM = typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.IMG_MAX_DIMENSION : 1200;
        const threshold = typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.IMG_COMPRESSION_THRESHOLD : 2000000;
        const qLow = typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.IMG_QUALITY_LOW : 0.60;
        const qHigh = typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.IMG_QUALITY_HIGH : 0.72;
        
        const targetQuality = file.size > threshold ? qLow : qHigh;

        try {
            if (window.createImageBitmap) {
                const bitmap = await window.createImageBitmap(file, { imageOrientation: 'from-image' });
                const imgWidth = bitmap.width;
                const imgHeight = bitmap.height;
                const ratio = Math.min(1, MAX_DIM / Math.max(imgWidth, imgHeight));
                const width = Math.max(1, Math.round(imgWidth * ratio));
                const height = Math.max(1, Math.round(imgHeight * ratio));

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    bitmap.close();
                    return reject(new Error('Impossibile creare il canvas di elaborazione'));
                }

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(bitmap, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    ctx.clearRect(0, 0, width, height);
                    canvas.width = 0;
                    canvas.height = 0;
                    bitmap.close();

                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Errore durante la creazione del WebP'));
                    }
                }, 'image/webp', targetQuality);

            } else {
                const reader = new FileReader();
                reader.onload = function (event) {
                    const img = new Image();

                    img.onload = function () {
                        const imgWidth = img.naturalWidth || img.width;
                        const imgHeight = img.naturalHeight || img.height;
                        const ratio = Math.min(1, MAX_DIM / Math.max(imgWidth, imgHeight));
                        const width = Math.max(1, Math.round(imgWidth * ratio));
                        const height = Math.max(1, Math.round(imgHeight * ratio));

                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');

                        if (!ctx) {
                            img.onload = null;
                            img.onerror = null;
                            img.src = '';
                            return reject(new Error('Impossibile creare il canvas di elaborazione'));
                        }

                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, width, height);
                        ctx.drawImage(img, 0, 0, width, height);

                        canvas.toBlob((blob) => {
                            ctx.clearRect(0, 0, width, height);
                            canvas.width = 0;
                            canvas.height = 0;

                            img.onload = null;
                            img.onerror = null;
                            img.src = '';

                            if (blob) {
                                resolve(blob);
                            } else {
                                reject(new Error('Errore durante la creazione del WebP'));
                            }
                        }, 'image/webp', targetQuality);
                    };

                    img.onerror = function () {
                        reject(new Error("L'immagine è danneggiata e non può essere ridimensionata"));
                    };

                    img.src = event.target.result;
                };

                reader.onerror = function () {
                    reject(new Error('Errore di lettura dal dispositivo'));
                };

                reader.readAsDataURL(file);
            }
        } catch (error) {
            console.error("Errore imprevisto durante la compressione:", error);
            reject(error);
        }
        })();
    });
}function toggleFidelityField() {
    const originEl = document.getElementById('p-origin');
    const container = document.getElementById('fidelity-container');
    const fidelityEl = document.getElementById('p-genetic-fidelity');
    
    if (originEl && container) {
        if (originEl.value === 'Da seme') {
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
            if (fidelityEl) fidelityEl.value = 'Non ancora valutato';
        }
    }
}

function setVendorMode(mode) {
    vendorMode = mode;
    const select = document.getElementById('p-vendor-select');
    const input = document.getElementById('p-vendor-input');
    const btn = document.getElementById('btn-toggle-vendor');
    if (!select || !input || !btn) return;
    
    if (mode === 'select') {
        input.style.display = 'none';
        select.style.display = 'block';
        btn.innerText = '➕ Nuovo';
    } else {
        select.style.display = 'none';
        input.style.display = 'block';
        btn.innerText = '🔄 Storico';
    }
}

function toggleVendorMode() {
    setVendorMode(vendorMode === 'select' ? 'input' : 'select');
}

function setSoilMode(mode) {
    soilMode = mode;
    const select = document.getElementById('p-soil-select');
    const input = document.getElementById('p-soil-input');
    const btn = document.getElementById('btn-toggle-soil');
    if (!select || !input || !btn) return;

    if (mode === 'select') {
        input.style.display = 'none';
        select.style.display = 'block';
        btn.innerText = '➕ Nuovo';
    } else {
        select.style.display = 'none';
        input.style.display = 'block';
        btn.innerText = '🔄 Storico';
    }
}

function toggleSoilMode() {
    setSoilMode(soilMode === 'select' ? 'input' : 'select');
}

function setScientificMode(mode) {
    scientificMode = mode;
    const select = document.getElementById('p-scientific-select');
    const input = document.getElementById('p-scientific-input');
    const btn = document.getElementById('btn-toggle-scientific');
    if (!select || !input || !btn) return;

    if (mode === 'select') {
        input.style.display = 'none';
        select.style.display = 'block';
        btn.innerText = '➕ Nuovo';
    } else {
        select.style.display = 'none';
        input.style.display = 'block';
        btn.innerText = '🔄 Storico';
    }
}

function toggleScientificMode() {
    setScientificMode(scientificMode === 'select' ? 'input' : 'select');
}

function setLocationMode(mode) {
    locationMode = mode;
    const select = document.getElementById('p-location-select');
    const input = document.getElementById('p-location-input');
    const btn = document.getElementById('btn-toggle-location');
    const coordsContainer = document.getElementById('coords-inputs-container');
    const mapInstructions = document.getElementById('map-instructions');

    if (!select || !input || !btn) return;

    if (mode === 'select') {
        input.style.display = 'none';
        select.style.display = 'block';
        btn.innerText = '➕ Nuovo';
        fillSavedLocation();
    } else {
        select.style.display = 'none';
        input.style.display = 'block';
        btn.innerText = '🔄 Storico';
        if (coordsContainer) coordsContainer.style.display = 'grid';
        if (mapInstructions) mapInstructions.innerText = 'Inserisci un nuovo luogo. Puoi usare i campi sopra o toccare la mappa.';
    }
}

function toggleLocationMode() {
    setLocationMode(locationMode === 'select' ? 'input' : 'select');
}

function togglePotSizeField() {
    const placementEl = document.getElementById('p-placement');
    const container = document.getElementById('pot-size-container');
    const potSizeEl = document.getElementById('p-pot-size');
    
    if (placementEl && container) {
        if (placementEl.value === 'Vaso') {
            container.style.display = 'flex';
        } else {
            container.style.display = 'none';
            if (potSizeEl) potSizeEl.value = '';
        }
    }
}

function syncSpeciesNotes() {
    const sciSel = document.getElementById('p-scientific-select');
    const sciInp = document.getElementById('p-scientific-input');
    const notesEl = document.getElementById('p-species-notes');
    
    if (!notesEl) return;
    
    let scientificName = scientificMode === 'select' && sciSel ? sciSel.value : (sciInp ? sciInp.value.trim() : '');
    
    if (!scientificName || !plantsDatabase) {
        notesEl.value = '';
        return;
    }
    
    let existingPlant = plantsDatabase.find(p => p.scientific === scientificName && p.speciesNotes);
    if (existingPlant) {
        notesEl.value = existingPlant.speciesNotes;
    } else {
        notesEl.value = '';
    }
}

function populateFormHelpers() {
    if (!plantsDatabase) return;
    
    const motherSelect = document.getElementById('p-mother');
    const fatherSelect = document.getElementById('p-father');
    
    if (motherSelect) motherSelect.innerHTML = '<option value="">-- Nessuna / Sconosciuta --</option>';
    if (fatherSelect) fatherSelect.innerHTML = '<option value="">-- Nessuno / Sconosciuto --</option>';
    
    const currentPlantIdStr = currentPlantId ? String(currentPlantId) : '';
    const availableParents = plantsDatabase.filter(p => String(p.id) !== currentPlantIdStr).sort((a,b) => (a.name || '').localeCompare(b.name || ''));
    
    if (motherSelect && fatherSelect) {
        const fragM = document.createDocumentFragment();
        const fragF = document.createDocumentFragment();
        availableParents.forEach(p => {
            const optM = document.createElement('option');
            optM.value = String(p.id);
            optM.innerText = escapeHTML(p.name) + (p.status === 'archived' ? ' (archiviata)' : '');
            fragM.appendChild(optM);

            const optF = document.createElement('option');
            optF.value = String(p.id);
            optF.innerText = escapeHTML(p.name) + (p.status === 'archived' ? ' (archiviata)' : '');
            fragF.appendChild(optF);
        });
        motherSelect.appendChild(fragM);
        fatherSelect.appendChild(fragF);
    }

    const vendorSelect = document.getElementById('p-vendor-select');
    if (vendorSelect) {
        const vendors = [...new Set(plantsDatabase.map(p => p.vendor).filter(v => v && v.trim() !== ''))];
        vendorSelect.innerHTML = '<option value="">-- Seleziona fornitore --</option>';
        if (vendors.length === 0) {
            vendorSelect.innerHTML = '<option value="">Nessun fornitore salvato</option>';
        } else {
            const fragV = document.createDocumentFragment();
            vendors.forEach(v => {
                const opt = document.createElement('option');
                opt.value = escapeHTML(v);
                opt.innerText = v.length > 40 ? escapeHTML(v.substring(0, 40)) + '...' : escapeHTML(v);
                fragV.appendChild(opt);
            });
            vendorSelect.appendChild(fragV);
        }
    }

    const soilSelect = document.getElementById('p-soil-select');
    if (soilSelect) {
        const soils = [...new Set(plantsDatabase.map(p => p.soil).filter(s => s && s.trim() !== ''))];
        soilSelect.innerHTML = '<option value="">-- Seleziona substrato --</option>';
        if (soils.length === 0) {
            soilSelect.innerHTML = '<option value="">Nessun substrato salvato</option>';
        } else {
            const fragS = document.createDocumentFragment();
            soils.forEach(s => {
                const opt = document.createElement('option');
                opt.value = escapeHTML(s);
                opt.innerText = s.length > 40 ? escapeHTML(s.substring(0, 40)) + '...' : escapeHTML(s);
                fragS.appendChild(opt);
            });
            soilSelect.appendChild(fragS);
        }
    }

    const scientificSelect = document.getElementById('p-scientific-select');
    if (scientificSelect) {
        const scientifics = [...new Set(plantsDatabase.map(p => p.scientific).filter(v => v && v.trim() !== ''))].sort();
        scientificSelect.innerHTML = '<option value="">-- Seleziona o lascia vuoto --</option>';
        if (scientifics.length === 0) {
            scientificSelect.innerHTML = '<option value="">Nessun nome scientifico salvato</option>';
        } else {
            const fragSci = document.createDocumentFragment();
            scientifics.forEach(s => {
                const opt = document.createElement('option');
                opt.value = escapeHTML(s);
                opt.innerText = escapeHTML(s);
                fragSci.appendChild(opt);
            });
            scientificSelect.appendChild(fragSci);
        }
    }

    const locSelect = document.getElementById('p-location-select');
    if (locSelect) {
        const locs = [];
        const signatures = new Set();
        plantsDatabase.forEach(p => {
            if (p.location || (p.lat !== null && p.lng !== null)) {
                let sig = `${p.location}_${p.lat}_${p.lng}`;
                if (!signatures.has(sig)) {
                    signatures.add(sig);
                    locs.push({ loc: p.location, lat: p.lat, lng: p.lng });
                }
            }
        });
        locSelect.innerHTML = '<option value="">📍 Scegli da "I miei luoghi"...</option>';
        const fragL = document.createDocumentFragment();
        locs.forEach((l, index) => {
            const opt = document.createElement('option');
            opt.value = index + 1;
            let text = l.loc || 'Luogo senza nome';
            if (l.lat !== null && l.lng !== null && l.lat !== undefined && l.lng !== undefined) text += ` (${l.lat}, ${l.lng})`;
            opt.innerText = escapeHTML(text);
            opt.dataset.loc = l.loc || '';
            opt.dataset.lat = l.lat !== null && l.lat !== undefined ? l.lat : '';
            opt.dataset.lng = l.lng !== null && l.lng !== undefined ? l.lng : '';
            fragL.appendChild(opt);
        });
        locSelect.appendChild(fragL);
    }
}

function fillSavedLocation() {
    const select = document.getElementById('p-location-select');
    const coordsContainer = document.getElementById('coords-inputs-container');
    const mapInstructions = document.getElementById('map-instructions');
    const locInput = document.getElementById('p-location-input');
    const latInput = document.getElementById('p-lat');
    const lngInput = document.getElementById('p-lng');

    if (!select) return;

    if (select.selectedIndex <= 0) {
        if (coordsContainer) coordsContainer.style.display = 'grid';
        if (mapInstructions) mapInstructions.innerText = 'Tocca la mappa per impostare automaticamente le coordinate.';
        if (locInput) locInput.value = '';
        if (latInput) latInput.value = '';
        if (lngInput) lngInput.value = '';
        return;
    }

    const opt = select.options[select.selectedIndex];
    if (locInput) locInput.value = opt.dataset.loc;
    if (latInput) latInput.value = formatLocalFloat(opt.dataset.lat);
    if (lngInput) lngInput.value = formatLocalFloat(opt.dataset.lng);

    if (coordsContainer) coordsContainer.style.display = 'none';
    if (mapInstructions) mapInstructions.innerText = 'Luogo esistente selezionato. Puoi comunque toccare la mappa per aggiornarne le coordinate.';

    if (typeof updateFormMapFromInputs === 'function') updateFormMapFromInputs();
}

function _internalOpenPlantForm() {
    editingMode = false;
    currentPlantId = null;
    isFormDirty = false;
    
    const formTitle = document.getElementById('form-title');
    if (formTitle) formTitle.innerText = "Aggiungi nuova pianta";
    
    clearForm();
    populateFormHelpers();
    setVendorMode('select');
    setSoilMode('select');
    setScientificMode('select');
    setLocationMode('select');
    
    const originEl = document.getElementById('p-origin');
    if (originEl) originEl.value = 'Da seme';
    toggleFidelityField();
    
    const placementEl = document.getElementById('p-placement');
    if (placementEl) placementEl.value = 'Vaso';
    togglePotSizeField();
    
    setTimeout(() => {
        if (typeof initFormMap === 'function') initFormMap();
    }, 150);
}

function clearForm() {
    document.querySelectorAll('#form-container input, #form-container textarea, #form-container select').forEach(el => {
        if (!['p-origin', 'p-placement', 'p-genetic-fidelity', 'search-plant'].includes(el.id)) {
            el.value = '';
        }
    });
    setVendorMode('select');
    setSoilMode('select');
    setScientificMode('select');
    setLocationMode('select');
    
    const fidelityEl = document.getElementById('p-genetic-fidelity');
    if (fidelityEl) fidelityEl.value = 'Non ancora valutato';
    
    const autofertileEl = document.getElementById('p-autofertile');
    if (autofertileEl) autofertileEl.value = 'Sconosciuta';
    
    if (document.getElementById('detail-plant-notes')) document.getElementById('detail-plant-notes').value = '';
    if (document.getElementById('detail-species-notes')) document.getElementById('detail-species-notes').value = '';

    mainPhotoRemoved = false;
    fruitPhotoRemoved = false;
    
    if (window.smartCropBlobs) {
        if (window.smartCropBlobs.main && typeof revokeBlob === 'function') revokeBlob(window.smartCropBlobs.main);
        if (window.smartCropBlobs.fruit && typeof revokeBlob === 'function') revokeBlob(window.smartCropBlobs.fruit);
        window.smartCropBlobs = { main: null, fruit: null };
    }
    
    ['main', 'fruit'].forEach(type => {
        const preview = document.getElementById('preview-' + type);
        if (preview) {
            preview.src = '';
            preview.style.display = 'none';
        }
        const placeholder = document.getElementById('placeholder-' + type);
        if (placeholder) placeholder.style.display = 'flex';
        const removeBtn = document.getElementById('remove-btn-' + type);
        if (removeBtn) removeBtn.style.display = 'none';
        
        let hiddenInput = document.getElementById(type === 'main' ? 'p-photo-hidden' : 'p-fruit-photo-hidden');
        if (hiddenInput) hiddenInput.value = '';
    });

    // FIX ACCESSIBILITÀ: Rimuoviamo l'attributo aria-hidden dai pannelli aperti
    const accordions = document.querySelectorAll('#form-container .accordion-item');
    accordions.forEach((item, index) => {
        const content = item.querySelector('.accordion-content');
        const header = item.querySelector('.accordion-header');
        if (index === 0) {
            item.classList.add('open');
            if (content) {
                content.style.display = 'block';
                content.removeAttribute('aria-hidden'); // RIMOSSO
            }
            if (header) header.setAttribute('aria-expanded', 'true');
        } else {
            item.classList.remove('open');
            if (content) {
                content.style.display = 'none';
                content.setAttribute('aria-hidden', 'true');
            }
            if (header) header.setAttribute('aria-expanded', 'false');
        }
    });
}

async function savePlant() {
    const nameEl = document.getElementById('p-name');
    let newName = nameEl ? nameEl.value.trim() : '';
    
    if (!newName) {
        if (nameEl) {
            nameEl.style.borderColor = 'var(--danger)';
            setTimeout(() => nameEl.style.borderColor = '#ccc', 3000);
            nameEl.focus();
        }
        if (typeof Swal !== 'undefined') return Swal.fire({icon: 'error', title: 'Dati Mancanti', text: "Il 'Nome' della pianta è obbligatorio.", confirmButtonColor: '#2e7d32'});
        else return alert("Il 'Nome' della pianta è obbligatorio.");
    }

    if (!plantsDatabase) plantsDatabase = [];

    const currentPlantIdStr = currentPlantId ? String(currentPlantId) : null;

    let nameExists = plantsDatabase.some(p => (p.name || '').toLowerCase() === newName.toLowerCase() && String(p.id) !== currentPlantIdStr);
    if (nameExists) {
        if (typeof Swal !== 'undefined') return Swal.fire({icon: 'error', title: 'Nome Duplicato', text: `Esiste già una pianta salvata con il nome "${escapeHTML(newName)}". Scegli un nome diverso.`, confirmButtonColor: '#2e7d32'});
        else return alert(`Esiste già una pianta con il nome "${newName}".`);
    }
    
    let finalScientific = '';
    if (scientificMode === 'select' && document.getElementById('p-scientific-select')) finalScientific = document.getElementById('p-scientific-select').value;
    else if (document.getElementById('p-scientific-input')) finalScientific = document.getElementById('p-scientific-input').value.trim();
    
    let finalLocation = '';
    if (locationMode === 'select') {
        const selectLoc = document.getElementById('p-location-select');
        if (selectLoc && selectLoc.selectedIndex > 0) finalLocation = selectLoc.options[selectLoc.selectedIndex].dataset.loc;
    } else {
        const locInput = document.getElementById('p-location-input');
        if (locInput) finalLocation = locInput.value.trim();
    }
    
    let finalVendor = '';
    if (vendorMode === 'select' && document.getElementById('p-vendor-select')) finalVendor = document.getElementById('p-vendor-select').value;
    else if (document.getElementById('p-vendor-input')) finalVendor = document.getElementById('p-vendor-input').value.trim();

    let finalSoil = '';
    if (soilMode === 'select' && document.getElementById('p-soil-select')) finalSoil = document.getElementById('p-soil-select').value;
    else if (document.getElementById('p-soil-input')) finalSoil = document.getElementById('p-soil-input').value.trim();

    let autofertileVal = document.getElementById('p-autofertile') ? document.getElementById('p-autofertile').value : 'Sconosciuta';
    
    let finalPrice = document.getElementById('p-price') ? parseLocalFloat(document.getElementById('p-price').value) : null;
    let potSize = document.getElementById('p-pot-size') ? parseLocalFloat(document.getElementById('p-pot-size').value) : null;
    let minTemp = document.getElementById('p-min-temp') ? parseLocalFloat(document.getElementById('p-min-temp').value) : null;
    let maxTemp = document.getElementById('p-max-temp') ? parseLocalFloat(document.getElementById('p-max-temp').value) : null;
    
    let phMin = document.getElementById('p-ph-min') ? parseLocalFloat(document.getElementById('p-ph-min').value) : null;
    let phMax = document.getElementById('p-ph-max') ? parseLocalFloat(document.getElementById('p-ph-max').value) : null;

    if (phMin !== null && (phMin < 0 || phMin > 14)) {
        if (typeof Swal !== 'undefined') return Swal.fire({icon: 'error', title: 'Errore', text: "Il pH minimo deve essere compreso tra 0 e 14.", confirmButtonColor: '#2e7d32'});
        else return alert("pH minimo fuori range.");
    }
    if (phMax !== null && (phMax < 0 || phMax > 14)) {
        if (typeof Swal !== 'undefined') return Swal.fire({icon: 'error', title: 'Errore', text: "Il pH massimo deve essere compreso tra 0 e 14.", confirmButtonColor: '#2e7d32'});
        else return alert("pH massimo fuori range.");
    }
    if (phMin !== null && phMax !== null && phMin > phMax) {
        if (typeof Swal !== 'undefined') return Swal.fire({icon: 'error', title: 'Errore', text: "Il pH minimo non può essere maggiore del pH massimo.", confirmButtonColor: '#2e7d32'});
        else return alert("Errore intervallo pH.");
    }

    let latRaw = document.getElementById('p-lat') ? document.getElementById('p-lat').value.trim() : "";
    let lngRaw = document.getElementById('p-lng') ? document.getElementById('p-lng').value.trim() : "";
    let lat = parseLocalFloat(latRaw);
    let lng = parseLocalFloat(lngRaw);
    
    if (latRaw !== "" && lat === null) {
        if (typeof Swal !== 'undefined') return Swal.fire({icon: 'error', title: 'Coordinate non valide', text: "La latitudine inserita non è un numero valido.", confirmButtonColor: '#2e7d32'});
        else return alert("Latitudine non valida.");
    }
    if (lngRaw !== "" && lng === null) {
        if (typeof Swal !== 'undefined') return Swal.fire({icon: 'error', title: 'Coordinate non valide', text: "La longitudine inserita non è un numero valido.", confirmButtonColor: '#2e7d32'});
        else return alert("Longitudine non valida.");
    }
    if ((lat !== null && lng === null) || (lat === null && lng !== null)) {
        if (typeof Swal !== 'undefined') return Swal.fire({icon: 'error', title: 'Coordinate incomplete', text: "Devi inserire sia la latitudine che la longitudine, oppure lasciarle entrambe vuote.", confirmButtonColor: '#2e7d32'});
        else return alert("Coordinate incomplete.");
    }
    if (lat !== null && (lat < -90 || lat > 90)) {
        if (typeof Swal !== 'undefined') return Swal.fire({icon: 'error', title: 'Errore Mappa', text: "La latitudine deve essere compresa tra -90 e 90 gradi.", confirmButtonColor: '#2e7d32'});
        else return alert("Latitudine fuori range (-90, 90).");
    }
    if (lng !== null && (lng < -180 || lng > 180)) {
        if (typeof Swal !== 'undefined') return Swal.fire({icon: 'error', title: 'Errore Mappa', text: "La longitudine deve essere compresa tra -180 e 180 gradi.", confirmButtonColor: '#2e7d32'});
        else return alert("Longitudine fuori range (-180, 180).");
    }
    
    const saveBtn = document.querySelector('button[onclick="savePlant()"]');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerText = "⏳ Salvataggio...";
    }

    try {
        let finalMainPhoto = "";
        let finalFruitPhoto = "";
        let existingPlant = null;

        if (editingMode && currentPlantIdStr !== null) {
            existingPlant = plantsDatabase.find(x => String(x.id) === currentPlantIdStr);
            if (existingPlant) {
                if ((window.smartCropBlobs && window.smartCropBlobs['main']) || mainPhotoRemoved) {
                    if (existingPlant.photo && typeof revokeBlob === 'function') revokeBlob(existingPlant.photo);
                }
                if ((window.smartCropBlobs && window.smartCropBlobs['fruit']) || fruitPhotoRemoved) {
                    if (existingPlant.fruitPhoto && typeof revokeBlob === 'function') revokeBlob(existingPlant.fruitPhoto);
                }
            }
        }

        if (window.smartCropBlobs && window.smartCropBlobs['main']) {
            finalMainPhoto = window.smartCropBlobs['main'];
        } else if (existingPlant && !mainPhotoRemoved) {
            finalMainPhoto = existingPlant.photo || "";
        }
        
        if (window.smartCropBlobs && window.smartCropBlobs['fruit']) {
            finalFruitPhoto = window.smartCropBlobs['fruit'];
        } else if (existingPlant && !fruitPhotoRemoved) {
            finalFruitPhoto = existingPlant.fruitPhoto || "";
        }

        let savedPlantId = (editingMode && currentPlantIdStr !== null) ? currentPlantIdStr : (typeof generateId === 'function' ? generateId() : crypto.randomUUID());
        
        const originVal = document.getElementById('p-origin') ? document.getElementById('p-origin').value : 'Da seme';
        const fidelityVal = document.getElementById('p-genetic-fidelity') ? document.getElementById('p-genetic-fidelity').value : 'Non ancora valutato';
        const placementVal = document.getElementById('p-placement') ? document.getElementById('p-placement').value : 'Vaso';
        const sowingDateVal = document.getElementById('p-sowing-date') ? document.getElementById('p-sowing-date').value : '';
        
        const motherEl = document.getElementById('p-mother');
        let motherVal = motherEl && motherEl.value ? String(motherEl.value) : '';
        const fatherEl = document.getElementById('p-father');
        let fatherVal = fatherEl && fatherEl.value ? String(fatherEl.value) : '';

        if (editingMode && currentPlantIdStr !== null) {
            if (existingPlant) {
                existingPlant.name = newName;
                existingPlant.scientific = finalScientific;
                existingPlant.price = finalPrice;
                existingPlant.origin = originVal;
                existingPlant.autofertile = autofertileVal;
                existingPlant.sowingDate = sowingDateVal;
                existingPlant.geneticFidelity = fidelityVal;
                existingPlant.placement = placementVal;
                existingPlant.potSize = potSize;
                existingPlant.soil = finalSoil;
                existingPlant.phMin = phMin;
                existingPlant.phMax = phMax;
                existingPlant.vendor = finalVendor;
                existingPlant.location = finalLocation;
                existingPlant.lat = lat;
                existingPlant.lng = lng;
                existingPlant.photo = finalMainPhoto;
                existingPlant.fruitPhoto = finalFruitPhoto;
                existingPlant.mother = motherVal;
                existingPlant.father = fatherVal;
                existingPlant.minTemp = minTemp;
                existingPlant.maxTemp = maxTemp;
            }
        } else {
            const plantData = {
                id: savedPlantId,
                createdAt: Date.now(),
                name: newName,
                scientific: finalScientific,
                price: finalPrice,
                origin: originVal,
                autofertile: autofertileVal,
                sowingDate: sowingDateVal,
                geneticFidelity: fidelityVal,
                placement: placementVal,
                potSize: potSize,
                soil: finalSoil,
                phMin: phMin,
                phMax: phMax,
                vendor: finalVendor,
                location: finalLocation,
                notes: '',
                speciesNotes: '',
                lat: lat,
                lng: lng,
                photo: finalMainPhoto,
                fruitPhoto: finalFruitPhoto,
                status: 'active',
                logs: [],
                mother: motherVal,
                father: fatherVal,
                minTemp: minTemp,
                maxTemp: maxTemp
            };
            plantsDatabase.push(plantData);
        }
        
        unsavedChanges = true;
        if (typeof saveToLocal === 'function') await saveToLocal();
        isFormDirty = false;
        editingMode = false;
        currentPlantId = null;

        if (typeof AppState !== 'undefined') AppState.emit('plantsUpdated');
        
        if (typeof navigateTo === 'function') {
            navigateTo('plant-detail', savedPlantId);
        }
        
    } catch (err) {
        console.error("Errore nel salvataggio della pianta:", err);
        if (typeof Swal !== 'undefined') Swal.fire({icon: 'error', title: 'Errore', text: 'Impossibile salvare la pianta.', confirmButtonColor: '#d32f2f'});
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerText = "💾 Salva pianta";
        }
    }
}

function _internalEditPlant(id) {
    if (!plantsDatabase) return;
    const parsedId = String(id);
    const plant = plantsDatabase.find(p => String(p.id) === parsedId);
    if (!plant) {
        if (typeof goBack === 'function') goBack();
        else window.history.back();
        return;
    }
    
    currentPlantId = String(plant.id);
    editingMode = true;
    isFormDirty = false;
    
    const formTitle = document.getElementById('form-title');
    if (formTitle) formTitle.innerText = "Modifica dettagli pianta";

    clearForm();
    populateFormHelpers();
    
    const fields = {
        'p-name': plant.name,
        'p-price': formatLocalFloat(plant.price),
        'p-sowing-date': plant.sowingDate || '',
        'p-genetic-fidelity': plant.geneticFidelity || 'Non ancora valutato',
        'p-autofertile': getModernFertility(plant.autofertile),
        'p-mother': plant.mother !== undefined && plant.mother !== null ? String(plant.mother) : '',
        'p-father': plant.father !== undefined && plant.father !== null ? String(plant.father) : '',
        'p-min-temp': formatLocalFloat(plant.minTemp),
        'p-max-temp': formatLocalFloat(plant.maxTemp),
        'p-placement': plant.placement || 'Vaso',
        'p-pot-size': formatLocalFloat(plant.potSize),
        'p-ph-min': formatLocalFloat(plant.phMin),
        'p-ph-max': formatLocalFloat(plant.phMax),
        'p-lat': formatLocalFloat(plant.lat),
        'p-lng': formatLocalFloat(plant.lng)
    };

    for (const [key, val] of Object.entries(fields)) {
        const el = document.getElementById(key);
        if (el) el.value = val;
    }
    
    const originSelect = document.getElementById('p-origin');
    if (originSelect) {
        let oldOrigin = plant.origin || 'Da seme';
        originSelect.value = Array.from(originSelect.options).some(opt => opt.value === oldOrigin) ? oldOrigin : 'Non so / Altro';
        toggleFidelityField();
    }
    
    if (plant.vendor) {
        setVendorMode('select');
        if (document.getElementById('p-vendor-select')) document.getElementById('p-vendor-select').value = plant.vendor;
        if (document.getElementById('p-vendor-input')) document.getElementById('p-vendor-input').value = plant.vendor;
    } else {
        setVendorMode('select');
    }
    
    if (plant.soil) {
        setSoilMode('select');
        if (document.getElementById('p-soil-select')) document.getElementById('p-soil-select').value = plant.soil;
        if (document.getElementById('p-soil-input')) document.getElementById('p-soil-input').value = plant.soil;
    } else {
        setSoilMode('select');
    }
    
    if (plant.scientific) {
        setScientificMode('select');
        let sel = document.getElementById('p-scientific-select');
        if (sel) {
            let found = Array.from(sel.options).some(opt => opt.value === plant.scientific);
            if (found) {
                sel.value = plant.scientific;
                if (document.getElementById('p-scientific-input')) document.getElementById('p-scientific-input').value = plant.scientific;
            } else {
                setScientificMode('input');
                if (document.getElementById('p-scientific-input')) document.getElementById('p-scientific-input').value = plant.scientific;
            }
        }
    } else {
        setScientificMode('select');
    }

    if (plant.location || (plant.lat !== null && plant.lng !== null && plant.lat !== undefined && plant.lng !== undefined)) {
        setLocationMode('select');
        let sel = document.getElementById('p-location-select');
        if (sel) {
            let found = false;
            for (let i = 1; i < sel.options.length; i++) {
                if (sel.options[i].dataset.loc === (plant.location || '') &&
                    formatLocalFloat(sel.options[i].dataset.lat) === formatLocalFloat(plant.lat) &&
                    formatLocalFloat(sel.options[i].dataset.lng) === formatLocalFloat(plant.lng)) {
                    sel.selectedIndex = i;
                    found = true;
                    break;
                }
            }
            if (!found) {
                setLocationMode('input');
                if (document.getElementById('p-location-input')) document.getElementById('p-location-input').value = plant.location || '';
            } else {
                if (document.getElementById('p-location-input')) document.getElementById('p-location-input').value = plant.location || '';
                fillSavedLocation();
            }
        }
    } else {
        setLocationMode('select');
    }

    togglePotSizeField();

    if (plant.photo) {
        const pMain = document.getElementById('preview-main');
        if (pMain) {
            pMain.src = typeof getImageUrl === 'function' ? getImageUrl(plant.photo) : plant.photo;
            pMain.style.display = 'block';
            if (document.getElementById('placeholder-main')) document.getElementById('placeholder-main').style.display = 'none';
            if (document.getElementById('remove-btn-main')) document.getElementById('remove-btn-main').style.display = 'block';
        }
    }
    
    if (plant.fruitPhoto) {
        const pFruit = document.getElementById('preview-fruit');
        if (pFruit) {
            pFruit.src = typeof getImageUrl === 'function' ? getImageUrl(plant.fruitPhoto) : plant.fruitPhoto;
            pFruit.style.display = 'block';
            if (document.getElementById('placeholder-fruit')) document.getElementById('placeholder-fruit').style.display = 'none';
            if (document.getElementById('remove-btn-fruit')) document.getElementById('remove-btn-fruit').style.display = 'block';
        }
    }

    // FIX ACCESSIBILITÀ: Rimuoviamo aria-hidden anche quando apriamo il form in modifica
    const firstAccItem = document.querySelector('.accordion-item');
    if (firstAccItem && !firstAccItem.classList.contains('open')) {
        firstAccItem.classList.add('open');
        const content = firstAccItem.querySelector('.accordion-content');
        if (content) {
            content.style.display = 'block';
            content.removeAttribute('aria-hidden'); // RIMOSSO
        }
        const header = firstAccItem.querySelector('.accordion-header');
        if (header) header.setAttribute('aria-expanded', 'true');
    }

    setTimeout(() => {
        if (typeof initFormMap === 'function') initFormMap();
    }, 150);
}let currentPlantsChunkIndex = 0;
const PLANTS_CHUNK_SIZE = 25;
let currentFilteredPlants = [];
let plantsObserver = null;
let lastFilterStateString = "";

function renderPlants() {
    const grid = document.getElementById('plants-grid');
    if (!grid) return;
    
    if (plantsObserver) {
        plantsObserver.disconnect();
        plantsObserver = null;
    }
    
    if (!plantsDatabase || !Array.isArray(plantsDatabase)) plantsDatabase = [];
    
    const emptyState = document.getElementById('dashboard-empty-state');
    const statsBar = document.getElementById('dashboard-stats');
    const searchBar = document.querySelector('.search-sort-bar');
    
    if (plantsDatabase.length === 0) {
        if (emptyState) {
            emptyState.innerHTML = `
                <span style="font-size: 50px;" aria-hidden="true">🌱</span>
                <h3 style="color: var(--primary); margin-bottom: 10px;">Il tuo giardino è vuoto</h3>
                <p style="color: #666; font-size: 15px; margin-bottom: 25px;">Inizia ad aggiungere le tue piante per tenere traccia della loro crescita e degli eventi.</p>
                <button class="btn" style="font-size: 16px; padding: 12px 25px;" onclick="navigateTab('add-plant')">➕ Aggiungi la prima Pianta</button>
            `;
            emptyState.classList.remove('hidden');
        }
        grid.classList.add('hidden');
        if (statsBar) statsBar.style.display = 'none';
        if (searchBar) searchBar.style.display = 'none';
        return;
    } else {
        if (emptyState) emptyState.classList.add('hidden');
        grid.classList.remove('hidden');
        if (statsBar) statsBar.style.display = 'block';
        if (searchBar) searchBar.style.display = 'flex';
    }

    const searchInput = document.getElementById('search-plant');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
    
    const sortModeEl = document.querySelector('input[name="sort-plants"]:checked');
    const sortMode = sortModeEl ? sortModeEl.value : "name";
    
    const statusModeEl = document.querySelector('input[name="filter-status"]:checked');
    const statusMode = statusModeEl ? statusModeEl.value : "active";
    
    const photoModeEl = document.querySelector('input[name="filter-photo"]:checked');
    const photoMode = photoModeEl ? photoModeEl.value : "all";
    
    const filterPlacementEl = document.querySelector('input[name="filter-placement"]:checked');
    const filterPlacement = filterPlacementEl ? filterPlacementEl.value : "all";
    
    const filterOriginEl = document.querySelector('input[name="filter-origin"]:checked');
    const filterOrigin = filterOriginEl ? filterOriginEl.value : "all";
    
    const filterFertilityEl = document.querySelector('input[name="filter-fertility"]:checked');
    const filterFertility = filterFertilityEl ? filterFertilityEl.value : "all";

    const vulnColdEl = document.getElementById('filter-vuln-cold');
    const vulnColdInputStr = vulnColdEl && vulnColdEl.value !== '' ? vulnColdEl.value : 'null';
    const vulnCold = vulnColdEl && vulnColdEl.value !== '' ? parseFloat(vulnColdEl.value.replace(',', '.')) : null;

    const vulnHotEl = document.getElementById('filter-vuln-hot');
    const vulnHotInputStr = vulnHotEl && vulnHotEl.value !== '' ? vulnHotEl.value : 'null';
    const vulnHot = vulnHotEl && vulnHotEl.value !== '' ? parseFloat(vulnHotEl.value.replace(',', '.')) : null;

    const currentFilterStateString = `${searchTerm}_${sortMode}_${statusMode}_${photoMode}_${filterPlacement}_${filterOrigin}_${filterFertility}_${vulnColdInputStr}_${vulnHotInputStr}`;
    
    let isNewSearchOrFilter = (currentFilterStateString !== lastFilterStateString);
    lastFilterStateString = currentFilterStateString;

    let filteredPlants = plantsDatabase.filter(p => {
        if (statusMode === 'active' && p.status === 'archived') return false;
        if (statusMode === 'archived' && p.status !== 'archived') return false;

        let hasPhoto = !!(p.photo || p.fruitPhoto);
        if (photoMode === 'yes' && !hasPhoto) return false;
        if (photoMode === 'no' && hasPhoto) return false;

        const nameMatch = p.name ? p.name.toLowerCase().includes(searchTerm) : false;
        const scientificMatch = p.scientific ? p.scientific.toLowerCase().includes(searchTerm) : false;
        if (searchTerm && !nameMatch && !scientificMatch) return false;

        if (filterPlacement !== 'all' && p.placement !== filterPlacement && !(p.placement == null && filterPlacement === 'Vaso' && p.potSize)) return false;
        if (filterOrigin !== 'all' && p.origin !== filterOrigin) return false;
        if (filterFertility !== 'all' && getModernFertility(p.autofertile) !== filterFertility) return false;

        // FIX LOGICA FILTRO TEMPERATURE:
        // "Muoiono sotto i X°C" significa mostrare le piante che NON resistono a X°C.
        // Se p.minTemp è <= X, la pianta resiste. Quindi la nascondiamo (ritorna false).
        if (vulnCold !== null && !isNaN(vulnCold)) {
            if (p.minTemp === undefined || p.minTemp === null || p.minTemp <= vulnCold) return false;
        }
        
        // "Muoiono sopra i Y°C" significa mostrare le piante che NON resistono a Y°C.
        // Se p.maxTemp è >= Y, la pianta resiste. Quindi la nascondiamo (ritorna false).
        if (vulnHot !== null && !isNaN(vulnHot)) {
            if (p.maxTemp === undefined || p.maxTemp === null || p.maxTemp >= vulnHot) return false;
        }

        return true;
    });

    filteredPlants.sort((a, b) => {
        if (sortMode === 'name') return (a.name || '').localeCompare(b.name || '');
        else if (sortMode === 'newest') {
            const timeA = a.createdAt || 0;
            const timeB = b.createdAt || 0;
            return timeB - timeA;
        }
        else if (sortMode === 'oldest') {
            const timeA = a.createdAt || 0;
            const timeB = b.createdAt || 0;
            return timeA - timeB;
        }
        else if (sortMode === 'last_updated') {
            let lastA = 0;
            if (a.logs && Array.isArray(a.logs) && a.logs.length > 0) {
                lastA = Math.max(...a.logs.map(l => new Date(l.date).getTime() || 0));
            }
            let lastB = 0;
            if (b.logs && Array.isArray(b.logs) && b.logs.length > 0) {
                lastB = Math.max(...b.logs.map(l => new Date(l.date).getTime() || 0));
            }
            return lastB - lastA;
        }
        else if (sortMode === 'temp_desc') {
            let tempA = (a.minTemp !== undefined && a.minTemp !== null) ? a.minTemp : -999;
            let tempB = (b.minTemp !== undefined && b.minTemp !== null) ? b.minTemp : -999;
            return tempB - tempA;
        }
        else if (sortMode === 'ph_desc') {
            let phA = (a.phMax !== undefined && a.phMax !== null) ? a.phMax : (a.phMin !== undefined && a.phMin !== null ? a.phMin : -999);
            let phB = (b.phMax !== undefined && b.phMax !== null) ? b.phMax : (b.phMin !== undefined && b.phMin !== null ? b.phMin : -999);
            return phB - phA;
        }
        else if (sortMode === 'price_desc') {
            let priceA = (a.price !== undefined && a.price !== null) ? a.price : -1;
            let priceB = (b.price !== undefined && b.price !== null) ? b.price : -1;
            return priceB - priceA;
        }
        return 0;
    });

    const validSpecies = filteredPlants.map(p => p.scientific ? p.scientific.trim().toLowerCase() : '').filter(s => s !== '');
    const countPlantsEl = document.getElementById('count-plants');
    const countSpeciesEl = document.getElementById('count-species');
    if (countPlantsEl) countPlantsEl.innerText = filteredPlants.length;
    if (countSpeciesEl) countSpeciesEl.innerText = new Set(validSpecies).size;

    currentFilteredPlants = filteredPlants;

    if (filteredPlants.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1 / -1; color: #666; text-align: center; padding: 30px; background: white; border-radius: 8px; border: 1px dashed #ccc;">Nessuna pianta trovata con questi filtri.</p>';
        return;
    }

    // FIX DOM: Evitiamo innerHTML = '' che causa pesanti ricalcoli (reflow e repaint) durante la digitazione.
    if (isNewSearchOrFilter) {
        currentPlantsChunkIndex = 0;
        while (grid.firstChild) grid.removeChild(grid.firstChild);
    } else {
        while (grid.firstChild) grid.removeChild(grid.firstChild);
    }

    let elementsToRenderNow = currentPlantsChunkIndex > 0 ? currentPlantsChunkIndex : PLANTS_CHUNK_SIZE;
    currentPlantsChunkIndex = 0;

    renderPlantsChunk(elementsToRenderNow);
}

function renderPlantsChunk(customSize = null) {
    const grid = document.getElementById('plants-grid');
    if (!grid) return;
    
    const fragment = document.createDocumentFragment();
    const fallbackSrc = typeof OFFLINE_PLACEHOLDER !== 'undefined' ? OFFLINE_PLACEHOLDER : '';

    const chunkSize = customSize !== null ? customSize : PLANTS_CHUNK_SIZE;
    const chunk = currentFilteredPlants.slice(currentPlantsChunkIndex, currentPlantsChunkIndex + chunkSize);

    chunk.forEach(plant => {
        const card = document.createElement('div');
        
        let archiveStyle = plant.status === 'archived' ? ' border-left-color: var(--danger); opacity: 0.85;' : '';
        card.className = 'plant-card animate__animated animate__fadeIn';
        card.style.animationDuration = '0.5s';
        if (archiveStyle) card.style.cssText += archiveStyle;
        
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `Vedi dettagli della pianta ${escapeHTML(plant.name)}`);
        
        const openDetail = () => { if (typeof navigateTo === 'function') navigateTo('plant-detail', plant.id); };
        card.onclick = openDetail;
        card.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openDetail();
            }
        };
        
        let rawPhoto = plant.fruitPhoto || plant.photo;
        let imgSrc = (typeof getImageUrl === 'function' && rawPhoto) ? getImageUrl(rawPhoto) : fallbackSrc;

        let basePlacement = escapeHTML(plant.placement || 'Vaso');
        let sistemazioneLabel = basePlacement;
        let vol = plant.potSize;
        if (basePlacement === 'Vaso' && vol) sistemazioneLabel += ` (${formatLocalFloat(vol)} L)`;
        
        let origLabel = plant.origin || 'Non so / Altro';
        
        let tempBadge = plant.minTemp !== undefined && plant.minTemp !== null ? `<span style="background:#e3f2fd; color:#1565c0; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:bold;">❄️ Min: ${formatLocalFloat(plant.minTemp)}°C</span>` : '';
        let maxTempBadge = plant.maxTemp !== undefined && plant.maxTemp !== null ? `<span style="background:#ffebee; color:#d32f2f; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:bold;">🔥 Max: ${formatLocalFloat(plant.maxTemp)}°C</span>` : '';
        
        let phBadge = '';
        if (plant.phMin !== null && plant.phMin !== undefined && plant.phMax !== null && plant.phMax !== undefined) {
            if (plant.phMin === plant.phMax) {
                phBadge = `<span style="background:#e8f5e9; color:#2e7d32; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:bold;">🧪 pH ${formatLocalFloat(plant.phMin)}</span>`;
            } else {
                phBadge = `<span style="background:#e8f5e9; color:#2e7d32; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:bold;">🧪 pH ${formatLocalFloat(plant.phMin)} - ${formatLocalFloat(plant.phMax)}</span>`;
            }
        } else if (plant.phMin !== null && plant.phMin !== undefined) {
            phBadge = `<span style="background:#e8f5e9; color:#2e7d32; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:bold;">🧪 pH > ${formatLocalFloat(plant.phMin)}</span>`;
        } else if (plant.phMax !== null && plant.phMax !== undefined) {
            phBadge = `<span style="background:#e8f5e9; color:#2e7d32; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:bold;">🧪 pH < ${formatLocalFloat(plant.phMax)}</span>`;
        }

        let locationText = escapeHTML(plant.location) || 'Non specificata';
        let soilText = escapeHTML(plant.soil) || 'N/D';
        let modernFertility = getModernFertility(plant.autofertile);
        let fertilityText = modernFertility !== 'Sconosciuta' ? escapeHTML(modernFertility) : 'N/D';

        let nameColor = plant.status === 'archived' ? 'var(--danger)' : 'var(--primary)';
        let archiveBadge = plant.status === 'archived' ? `<span style="background:#ffebee; color:#d32f2f; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:bold;">Archiviata</span>` : '';

        card.innerHTML = `
            <img src="${imgSrc}" onerror="this.onerror=null; this.src='${fallbackSrc}';" loading="lazy" alt="${escapeHTML(plant.name)}" class="${plant.status === 'archived' ? 'grayscale-img' : ''}">
            <h3 style="margin:0 0 2px 0; color:${nameColor}; font-size:20px; line-height:1.2;">${escapeHTML(plant.name)}</h3>
            <p style="margin:0 0 12px 0; font-size:14px; color:#666; font-style:italic;">${escapeHTML(plant.scientific) || '&nbsp;'}</p>
            
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:15px; align-items:center;">
                <span style="background:var(--secondary); color:white; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:bold;">${escapeHTML(origLabel)}</span>
                ${archiveBadge}
                ${tempBadge}
                ${maxTempBadge}
                ${phBadge}
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:14px; color:#444; margin-top:auto; padding-top:12px; border-top:1px solid rgba(46,125,50,0.15);">
                <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${locationText}">📍 ${locationText}</div>
                <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${soilText}">🪨 ${soilText}</div>
                <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${sistemazioneLabel}">🪴 <strong>${sistemazioneLabel}</strong></div>
                <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${fertilityText}">🌸 ${fertilityText}</div>
            </div>
        `;
        fragment.appendChild(card);
    });

    const oldSentinel = document.getElementById('plants-sentinel');
    if (oldSentinel) oldSentinel.remove();
    
    grid.appendChild(fragment);
    currentPlantsChunkIndex += chunkSize;

    if (currentPlantsChunkIndex < currentFilteredPlants.length) {
        const sentinel = document.createElement('div');
        sentinel.id = 'plants-sentinel';
        sentinel.style.gridColumn = '1 / -1';
        sentinel.style.height = '10px';
        grid.appendChild(sentinel);
        
        plantsObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                plantsObserver.disconnect();
                requestAnimationFrame(() => {
                    renderPlantsChunk();
                });
            }
        }, { rootMargin: '300px' });
        
        plantsObserver.observe(sentinel);
    }
}

let currentArchiveChunkIndex = 0;
const ARCHIVE_CHUNK_SIZE = 25;
let currentArchivedPlants = [];
let archiveObserver = null;

function renderArchive() {
    const grid = document.getElementById('archive-grid');
    if (!grid) return;
    
    if (archiveObserver) {
        archiveObserver.disconnect();
        archiveObserver = null;
    }
    
    if (!plantsDatabase || !Array.isArray(plantsDatabase)) plantsDatabase = [];
    
    currentArchivedPlants = plantsDatabase.filter(p => p.status === 'archived');
    currentArchivedPlants.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    if (currentArchivedPlants.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1 / -1; color: #555;">Nessuna pianta archiviata al momento.</p>';
        currentArchiveChunkIndex = 0;
        return;
    }

    while (grid.firstChild) grid.removeChild(grid.firstChild);
    
    let elementsToRenderNow = currentArchiveChunkIndex > 0 ? currentArchiveChunkIndex : ARCHIVE_CHUNK_SIZE;
    currentArchiveChunkIndex = 0;
    
    renderArchiveChunk(elementsToRenderNow);
}

function renderArchiveChunk(customSize = null) {
    const grid = document.getElementById('archive-grid');
    if (!grid) return;

    const fragment = document.createDocumentFragment();
    const fallbackSrc = typeof OFFLINE_PLACEHOLDER !== 'undefined' ? OFFLINE_PLACEHOLDER : '';

    const chunkSize = customSize !== null ? customSize : ARCHIVE_CHUNK_SIZE;
    const chunk = currentArchivedPlants.slice(currentArchiveChunkIndex, currentArchiveChunkIndex + chunkSize);

    chunk.forEach(plant => {
        const card = document.createElement('div');
        card.className = 'plant-card animate__animated animate__fadeIn';
        card.style.borderLeftColor = 'var(--danger)';
        
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `Vedi dettagli della pianta archiviata ${escapeHTML(plant.name)}`);
        
        const openDetail = () => { if (typeof navigateTo === 'function') navigateTo('plant-detail', plant.id); };
        card.onclick = openDetail;
        card.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openDetail();
            }
        };
        
        let rawPhoto = plant.fruitPhoto || plant.photo;
        let imgSrc = (typeof getImageUrl === 'function' && rawPhoto) ? getImageUrl(rawPhoto) : fallbackSrc;
        let origLabel = plant.origin || 'Non so / Altro';
        
        card.innerHTML = `
            <img src="${imgSrc}" onerror="this.onerror=null; this.src='${fallbackSrc}';" class="grayscale-img" loading="lazy" alt="${escapeHTML(plant.name)}">
            <h3 style="margin:0 0 2px 0; color:var(--danger); font-size:20px; line-height:1.2;">${escapeHTML(plant.name)}</h3>
            <p style="margin:0 0 12px 0; font-size:14px; color:#666; font-style:italic;">${escapeHTML(plant.scientific) || '&nbsp;'}</p>
            
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:15px; align-items:center;">
                <span style="background:var(--danger); color:white; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:bold;">${escapeHTML(origLabel)}</span>
                <span style="background:#ffebee; color:#d32f2f; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:bold;">Archiviata</span>
            </div>

            <div style="font-size:13px; color:#555; margin-top:auto; padding-top:10px; border-top:1px solid rgba(211,47,47,0.1);">
                Spostata da: <strong>${escapeHTML(plant.location) || 'N/D'}</strong>
            </div>
        `;
        fragment.appendChild(card);
    });
    
    const oldSentinel = document.getElementById('archive-sentinel');
    if (oldSentinel) oldSentinel.remove();
    
    grid.appendChild(fragment);
    currentArchiveChunkIndex += chunkSize;

    if (currentArchiveChunkIndex < currentArchivedPlants.length) {
        const sentinel = document.createElement('div');
        sentinel.id = 'archive-sentinel';
        sentinel.style.gridColumn = '1 / -1';
        sentinel.style.height = '10px';
        grid.appendChild(sentinel);
        
        archiveObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                archiveObserver.disconnect();
                requestAnimationFrame(() => {
                    renderArchiveChunk();
                });
            }
        }, { rootMargin: '300px' });
        
        archiveObserver.observe(sentinel);
    }
}

if (typeof AppState !== 'undefined') {
    AppState.on('plantsUpdated', renderPlants);
    AppState.on('plantsUpdated', renderArchive);
}function makeGridItem(icon, label, value) {
    if (!value || value === 'N/D') return '';
    return `
        <div style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #eaeaea; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="font-size: 11px; color: #777; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">${icon} ${label}</div>
            <div style="font-size: 14px; color: #222; font-weight: 500;">${value}</div>
        </div>
    `;
}

function _internalOpenPlantDetail(id) {
    if (!plantsDatabase) return;
    const targetId = String(id);
    const plant = plantsDatabase.find(p => String(p.id) === targetId);
    if (!plant) {
        if (typeof goBack === 'function') goBack();
        else window.history.back();
        return;
    }
    
    currentPlantId = String(plant.id);
    
    const detailTitle = document.getElementById('detail-title');
    if (detailTitle) detailTitle.innerText = escapeHTML(plant.name) + (plant.scientific ? ` (${escapeHTML(plant.scientific)})` : '');
    
    let parentStr = '';
    if (plant.mother !== undefined && plant.mother !== null && plant.mother !== '') {
        let m = plantsDatabase.find(x => String(x.id) === String(plant.mother));
        if (m) parentStr += `Madre: <a href="javascript:void(0);" style="color:var(--blue); font-weight:bold;" onclick="navigateTo('plant-detail', '${m.id}')">${escapeHTML(m.name)}</a><br>`;
    }
    if (plant.father !== undefined && plant.father !== null && plant.father !== '') {
        let f = plantsDatabase.find(x => String(x.id) === String(plant.father));
        if (f) parentStr += `Padre: <a href="javascript:void(0);" style="color:var(--blue); font-weight:bold;" onclick="navigateTo('plant-detail', '${f.id}')">${escapeHTML(f.name)}</a>`;
    }
    if (parentStr) parentStr = `<div style="background:#e3f2fd; padding:10px 12px; border-radius:6px; margin-bottom:15px; font-size:13px; border: 1px solid #bbdefb;"><span style="color:var(--blue); font-weight:bold; display:block; margin-bottom:4px;">🧬 Genealogia</span>${parentStr}</div>`;

    let origFull = escapeHTML(plant.origin || 'N/D');
    if (plant.origin === 'Da seme' && plant.geneticFidelity) {
        origFull += ` <span style="font-weight:normal; font-size:12px; color:#e65100;">(${escapeHTML(plant.geneticFidelity)})</span>`;
    }

    let basePlacement = escapeHTML(plant.placement || 'Vaso');
    let sistemazioneLabel = basePlacement;
    let vol = plant.potSize;
    if (basePlacement === 'Vaso' && vol) sistemazioneLabel += ` (${formatLocalFloat(vol)} L)`;

    // FIX: Separazione netta tra Substrato reale e pH ottimale
    let soilFull = plant.soil ? escapeHTML(plant.soil) : null;
    
    let phClean = '';
    if (plant.phMin !== null || plant.phMax !== null) {
        if (plant.phMin === plant.phMax) phClean = formatLocalFloat(plant.phMin);
        else if (plant.phMin !== null && plant.phMax !== null) phClean = `${formatLocalFloat(plant.phMin)} - ${formatLocalFloat(plant.phMax)}`;
        else if (plant.phMin !== null) phClean = `> ${formatLocalFloat(plant.phMin)}`;
        else if (plant.phMax !== null) phClean = `< ${formatLocalFloat(plant.phMax)}`;
    }

    let modernFertility = getModernFertility(plant.autofertile);

    let tempFull = '';
    if (plant.minTemp !== null && plant.minTemp !== undefined) tempFull += `<span style="color:#1976d2">Min ${formatLocalFloat(plant.minTemp)}°C</span>`;
    if (plant.maxTemp !== null && plant.maxTemp !== undefined) {
        if(tempFull) tempFull += ' / ';
        tempFull += `<span style="color:#d32f2f">Max ${formatLocalFloat(plant.maxTemp)}°C</span>`;
    }
    if (!tempFull) tempFull = 'N/D';

    let ecoFull = renderFornitore(plant.vendor);
    if (plant.price !== null && plant.price !== undefined) {
        ecoFull += ` <span style="font-weight:normal; font-size:12px; color:#555;">(${formatLocalFloat(plant.price)} €)</span>`;
    }

    const detailInfo = document.getElementById('detail-info');
    if (detailInfo) {
        let detailsHtml = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px;">';
        
        detailsHtml += makeGridItem('📅', 'Inizio / Semina', plant.sowingDate ? formatDateIt(plant.sowingDate) : null);
        detailsHtml += makeGridItem('🌱', 'Origine', origFull !== 'N/D' ? origFull : null);
        detailsHtml += makeGridItem('🪴', 'Sistemazione', sistemazioneLabel);
        
        // Nuova struttura separata
        detailsHtml += makeGridItem('🪨', 'Substrato', soilFull);
        detailsHtml += makeGridItem('🧪', 'pH Ottimale', phClean ? phClean : null);
        
        detailsHtml += makeGridItem('🌸', 'Fertilità', modernFertility !== 'Sconosciuta' ? escapeHTML(modernFertility) : null);
        detailsHtml += makeGridItem('🌡️', 'Tolleranza', tempFull !== 'N/D' ? tempFull : null);
        detailsHtml += makeGridItem('📍', 'Luogo', plant.location ? escapeHTML(plant.location) : null);
        detailsHtml += makeGridItem('🛒', 'Acquisto', plant.vendor || plant.price !== null ? ecoFull : null);

        detailsHtml += '</div>';

        detailInfo.innerHTML = parentStr + detailsHtml;
    }

    const photoContainer = document.getElementById('detail-photos-container');
    if (photoContainer) {
        photoContainer.innerHTML = '';
        let safeNameJS = escapeHTML(plant.name).replace(/&#39;/g, "\\'");

        let pMainImg = (typeof getImageUrl === 'function' && plant.photo) ? getImageUrl(plant.photo) : plant.photo;
        let pFruitImg = (typeof getImageUrl === 'function' && plant.fruitPhoto) ? getImageUrl(plant.fruitPhoto) : plant.fruitPhoto;
        const fallbackSrc = typeof OFFLINE_PLACEHOLDER !== 'undefined' ? OFFLINE_PLACEHOLDER : '';

        if (pMainImg || pFruitImg) {
            let addClass = plant.status === 'archived' ? ' grayscale-img' : '';
            
            if (pMainImg) photoContainer.innerHTML += `<img src="${pMainImg}" onerror="this.onerror=null; this.src='${fallbackSrc}';" class="plant-img${addClass}" title="Foto Pianta" style="cursor:pointer;" tabindex="0" role="button" aria-label="Ingrandisci Foto Pianta" onclick="if(typeof openImageModal === 'function') openImageModal('${pMainImg}', '${safeNameJS}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}" alt="Foto Pianta">`;
            
            if (pFruitImg) photoContainer.innerHTML += `<img src="${pFruitImg}" onerror="this.onerror=null; this.src='${fallbackSrc}';" class="plant-img${addClass}" title="Foto Frutto" style="cursor:pointer;" tabindex="0" role="button" aria-label="Ingrandisci Foto Frutto" onclick="if(typeof openImageModal === 'function') openImageModal('${pFruitImg}', 'Dettaglio Frutto')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}" alt="Foto Frutto">`;
        } else {
            photoContainer.innerHTML = `<div style="height:100px; width:100%; display:flex; align-items:center; justify-content:center; border:1px solid #ddd; border-radius:5px; color:#999;">Nessuna foto inserita</div>`;
        }
    }

    const logDateEl = document.getElementById('log-date');
    if (logDateEl) {
        if (typeof getLocalYYYYMMDD === 'function') {
            logDateEl.value = getLocalYYYYMMDD();
        } else {
            logDateEl.value = new Date().toISOString().split('T')[0];
        }
    }
    
    const logTypeEl = document.getElementById('log-type');
    const logPhotosEl = document.getElementById('log-photos');
    if (logTypeEl) logTypeEl.value = 'Misurazione';
    if (logPhotosEl) logPhotosEl.value = '';

    const detPlantNotes = document.getElementById('detail-plant-notes');
    const detSpeciesNotes = document.getElementById('detail-species-notes');
    if (detPlantNotes) detPlantNotes.value = plant.notes || '';
    if (detSpeciesNotes) detSpeciesNotes.value = plant.speciesNotes || '';
    
    setTimeout(() => {
        if (typeof toggleDynamicFields === 'function') toggleDynamicFields();
        if (typeof renderTimeline === 'function') renderTimeline(plant);
        if (typeof updateYearDropdown === 'function') updateYearDropdown(plant);
        if (typeof initMap === 'function') initMap(plant);
        if (typeof renderCharts === 'function') renderCharts(plant);
        
        const archiveBtn = document.getElementById('btn-archive-toggle');
        const archiveSec = document.getElementById('archive-section');
        
        if (archiveBtn && archiveSec) {
            if (plant.status === 'archived') {
                archiveSec.style.background = '#e8f5e9';
                archiveSec.style.borderColor = '#c8e6c9';
                archiveSec.querySelector('h4').innerText = '🌱 Pianta in archivio';
                archiveSec.querySelector('h4').style.color = 'var(--primary)';
                archiveBtn.className = 'btn';
                archiveBtn.innerText = 'Ripristina nel giardino';
            } else {
                archiveSec.style.background = '#ffebee';
                archiveSec.style.borderColor = '#ffcdd2';
                archiveSec.querySelector('h4').innerText = '🥀 Archivio storico';
                archiveSec.querySelector('h4').style.color = 'var(--danger)';
                archiveBtn.className = 'btn ';
                archiveBtn.innerText = 'Archivia pianta';
            }
        }

        const labelName = document.getElementById('label-name');
        const labelScientific = document.getElementById('label-scientific');
        const labelOrigin = document.getElementById('label-origin');
        
        if (labelName) labelName.innerText = plant.name;
        if (labelScientific) labelScientific.innerText = plant.scientific || 'Specie Sconosciuta';
        if (labelOrigin) labelOrigin.innerText = plant.origin || 'N/D';
        
        const qrContainer = document.getElementById('detail-qr-code');
        if (qrContainer && typeof QRCode !== 'undefined') {
            qrContainer.innerHTML = '';
            const qrContent = JSON.stringify({ plant_id: plant.id });
            new QRCode(qrContainer, { text: qrContent, width: 100, height: 100, colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.L });
        }
    }, 50);
}

function editCurrentPlant() {
    if (currentPlantId && typeof navigateTo === 'function') {
        navigateTo('edit-plant', currentPlantId);
    }
}

async function deleteCurrentPlant() {
    if (typeof Swal === 'undefined') return;
    
    const res = await Swal.fire({
        title: 'Sei sicuro?',
        text: "Questa azione ELIMINERÀ DEFINITIVAMENTE la pianta, distruggendo tutti i diari e le foto. L'operazione non è reversibile.",
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#d32f2f',
        cancelButtonColor: '#607d8b',
        confirmButtonText: 'Elimina per sempre',
        cancelButtonText: 'Annulla'
    });
    
    if (res.isConfirmed) {
        if (!plantsDatabase) return;
        
        const deleteBtn = document.querySelector('button[onclick="deleteCurrentPlant()"]');
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.innerText = "⏳ Cancellazione...";
        }

        try {
            const currentPlantIdStr = String(currentPlantId);
            const plantToDelete = plantsDatabase.find(p => String(p.id) === currentPlantIdStr);
            
            if (plantToDelete && typeof cleanupPlantImages === 'function') {
                cleanupPlantImages(plantToDelete);
            }

            plantsDatabase.forEach(p => {
                if (String(p.mother) === currentPlantIdStr) p.mother = '';
                if (String(p.father) === currentPlantIdStr) p.father = '';
            });

            plantsDatabase = plantsDatabase.filter(p => String(p.id) !== currentPlantIdStr);
            unsavedChanges = true;
            
            if (typeof saveToLocal === 'function') await saveToLocal();
            
            isFormDirty = false;
            
            if (typeof AppState !== 'undefined') AppState.emit('plantsUpdated');
            if (typeof goBack === 'function') goBack();
            
            Swal.fire({
                icon: 'info',
                title: 'Eliminata',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000
            });
        } catch (err) {
            console.error(err);
            Swal.fire({icon: 'error', title: 'Errore', text: 'Impossibile eliminare la pianta.', confirmButtonColor: '#d32f2f'});
        } finally {
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = "🗑️ Elimina";
            }
        }
    }
}

async function toggleArchiveStatus() {
    if (typeof Swal === 'undefined' || !plantsDatabase) return;
    const parsedId = String(currentPlantId);
    const plant = plantsDatabase.find(p => String(p.id) === parsedId);
    if (!plant) return;
    
    const btn = document.getElementById('btn-archive-toggle');
    
    if (plant.status === 'archived') {
        const res = await Swal.fire({ title: 'Ripristinare?', text: "La pianta tornerà visibile nel tuo giardino principale.", icon: 'question', showCancelButton: true, confirmButtonColor: '#2e7d32', cancelButtonColor: '#607d8b', confirmButtonText: 'Sì, ripristina', cancelButtonText: 'Annulla' });
        if (res.isConfirmed) {
            if (btn) { btn.disabled = true; btn.innerText = "⏳ Attendere..."; }
            
            try {
                plant.status = 'active';
                unsavedChanges = true;
                if (typeof saveToLocal === 'function') await saveToLocal();
                
                if (typeof AppState !== 'undefined') AppState.emit('plantsUpdated');
                if (typeof goBack === 'function') goBack();
                else window.history.back();
            } catch (err) {
                console.error(err);
            } finally {
                if (btn) btn.disabled = false;
            }
        }
    } else {
        const res = await Swal.fire({ title: 'Archiviare?', text: "Scomparirà dalla vista principale ma tutti i dati verranno conservati nell'archivio storico.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d32f2f', cancelButtonColor: '#607d8b', confirmButtonText: 'Sì, archivia', cancelButtonText: 'Annulla' });
        if (res.isConfirmed) {
            if (btn) { btn.disabled = true; btn.innerText = "⏳ Attendere..."; }
            
            try {
                plant.status = 'archived';
                unsavedChanges = true;
                if (typeof saveToLocal === 'function') await saveToLocal();
                
                if (typeof AppState !== 'undefined') AppState.emit('plantsUpdated');
                if (typeof goBack === 'function') goBack();
                else window.history.back();
            } catch (err) {
                console.error(err);
            } finally {
                if (btn) btn.disabled = false;
            }
        }
    }
}

function openDuplicateModal() {
    if (!plantsDatabase) return;
    const parsedId = String(currentPlantId);
    const plantToCopy = plantsDatabase.find(p => String(p.id) === parsedId);
    if (!plantToCopy) return;
    
    const baseNameEl = document.getElementById('dup-base-name');
    const qtyEl = document.getElementById('dup-qty');
    const diaryCheckEl = document.getElementById('dup-copy-diary');
    const overlay = document.getElementById('duplicate-modal-overlay');
    
    if (baseNameEl) baseNameEl.value = plantToCopy.name;
    if (qtyEl) qtyEl.value = 1;
    if (diaryCheckEl) diaryCheckEl.checked = false;
    
    if (overlay) overlay.style.display = 'flex';
}

function closeDuplicateModal() {
    const overlay = document.getElementById('duplicate-modal-overlay');
    if (overlay) overlay.style.display = 'none';
}

async function confirmDuplicate() {
    if (!plantsDatabase) return;
    const parsedId = String(currentPlantId);
    const plantToCopy = plantsDatabase.find(p => String(p.id) === parsedId);
    if (!plantToCopy) return;
    
    const baseNameEl = document.getElementById('dup-base-name');
    let baseName = baseNameEl ? baseNameEl.value.trim() : '';
    if (!baseName) baseName = plantToCopy.name;
    
    const qtyEl = document.getElementById('dup-qty');
    let qty = qtyEl ? parseInt(qtyEl.value, 10) : 1;
    
    if (isNaN(qty) || qty < 1) {
        if (typeof Swal !== 'undefined') return Swal.fire({icon: 'error', title: 'Errore', text: 'Inserisci una quantità valida (minimo 1).', confirmButtonColor: '#2e7d32'});
        else return alert("Quantità non valida");
    }

    const diaryCheckEl = document.getElementById('dup-copy-diary');
    const copyDiary = diaryCheckEl ? diaryCheckEl.checked : false;

    const btnContainer = document.querySelector('#duplicate-modal-overlay .');
    if (btnContainer) {
        btnContainer.disabled = true;
        btnContainer.innerText = "⏳ Clonazione...";
    }

    try {
        for (let i = 0; i < qty; i++) {
            let newName = baseName;
            let suffixCounter = 1;
            if (qty > 1 || plantsDatabase.some(p => (p.name || '').toLowerCase() === baseName.toLowerCase())) {
                newName = `${baseName} - ${suffixCounter}`;
                while (plantsDatabase.some(p => (p.name || '').toLowerCase() === newName.toLowerCase())) {
                    suffixCounter++;
                    newName = `${baseName} - ${suffixCounter}`;
                }
            }
            
            let clonedLogs = [];
            if (copyDiary && plantToCopy.logs && Array.isArray(plantToCopy.logs)) {
                clonedLogs = plantToCopy.logs.map((log) => {
                    return {
                        id: typeof generateId === 'function' ? generateId() : crypto.randomUUID(),
                        date: log.date,
                        type: log.type,
                        height: log.height,
                        harvest: log.harvest,
                        ph: log.ph,
                        placement: log.placement,
                        potSize: log.potSize,
                        graftName: log.graftName,
                        note: log.note,
                        photo: safeCloneImage(log.photo),
                        photos: log.photos && Array.isArray(log.photos) ? log.photos.map(ph => safeCloneImage(ph)) : []
                    };
                });
            }

            const newPlantId = typeof generateId === 'function' ? generateId() : crypto.randomUUID();

            const newPlant = {
                id: newPlantId,
                createdAt: Date.now(),
                name: newName,
                scientific: plantToCopy.scientific,
                price: plantToCopy.price,
                origin: plantToCopy.origin,
                autofertile: getModernFertility(plantToCopy.autofertile),
                sowingDate: plantToCopy.sowingDate,
                geneticFidelity: plantToCopy.geneticFidelity,
                placement: plantToCopy.placement,
                potSize: plantToCopy.potSize,
                soil: plantToCopy.soil,
                phMin: plantToCopy.phMin,
                phMax: plantToCopy.phMax,
                vendor: plantToCopy.vendor,
                location: plantToCopy.location,
                notes: '',
                speciesNotes: plantToCopy.speciesNotes,
                lat: plantToCopy.lat,
                lng: plantToCopy.lng,
                photo: safeCloneImage(plantToCopy.photo),
                fruitPhoto: safeCloneImage(plantToCopy.fruitPhoto),
                status: 'active',
                logs: clonedLogs,
                mother: plantToCopy.mother !== undefined && plantToCopy.mother !== null ? String(plantToCopy.mother) : '',
                father: plantToCopy.father !== undefined && plantToCopy.father !== null ? String(plantToCopy.father) : '',
                minTemp: plantToCopy.minTemp,
                maxTemp: plantToCopy.maxTemp
            };
            plantsDatabase.push(newPlant);
        }
        
        unsavedChanges = true;
        if (typeof saveToLocal === 'function') await saveToLocal();
        
        closeDuplicateModal();
        
        if (typeof AppState !== 'undefined') AppState.emit('plantsUpdated');
        if (typeof goBack === 'function') goBack();
        
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success', 
                title: 'Piante clonate', 
                text: `Create ${qty} copie.`,
                toast: true,
                position: 'top-end',
                timer: 2000, 
                showConfirmButton: false
            });
        }
    } catch (err) {
        console.error(err);
        if (typeof Swal !== 'undefined') Swal.fire({icon: 'error', title: 'Errore', text: 'Impossibile clonare le piante.', confirmButtonColor: '#d32f2f'});
    } finally {
        if (btnContainer) {
            btnContainer.disabled = false;
            btnContainer.innerText = "Clona piante";
        }
    }
}

async function autoSavePlantNote() {
    if (!currentPlantId || !plantsDatabase) return;
    const parsedId = String(currentPlantId);
    const plant = plantsDatabase.find(p => String(p.id) === parsedId);
    if (!plant) return;

    const plantNotesEl = document.getElementById('detail-plant-notes');
    if (!plantNotesEl) return;

    const newPlantNotes = plantNotesEl.value.trim();
    if (plant.notes !== newPlantNotes) {
        plant.notes = newPlantNotes;
        unsavedChanges = true;
        if (typeof saveToLocal === 'function') await saveToLocal();
    }
}

async function autoSaveSpeciesNote() {
    if (!currentPlantId || !plantsDatabase) return;
    const parsedId = String(currentPlantId);
    const plant = plantsDatabase.find(p => String(p.id) === parsedId);
    if (!plant) return;

    const specNotesEl = document.getElementById('detail-species-notes');
    if (!specNotesEl) return;

    const newSpeciesNotes = specNotesEl.value.trim();
    if (plant.speciesNotes !== newSpeciesNotes) {
        plant.speciesNotes = newSpeciesNotes;

        if (plant.scientific) {
            for (let i = 0; i < plantsDatabase.length; i++) {
                if (plantsDatabase[i].scientific === plant.scientific) {
                    plantsDatabase[i].speciesNotes = newSpeciesNotes;
                }
            }
        }

        unsavedChanges = true;
        if (typeof saveToLocal === 'function') await saveToLocal();
    }
}function toggleLogPotSize() {
    const placementEl = document.getElementById('log-placement');
    const container = document.getElementById('log-pot-container');
    const potSizeEl = document.getElementById('log-pot-size');
    if (placementEl && container) {
        if (placementEl.value === 'Vaso') {
            container.style.display = 'flex';
        } else {
            container.style.display = 'none';
            if (potSizeEl) potSizeEl.value = '';
        }
    }
}

function toggleDynamicFields() {
    const typeEl = document.getElementById('log-type');
    if (!typeEl) return;
    const type = typeEl.value;
    const heightCont = document.getElementById('height-container');
    if (heightCont) {
        heightCont.style.display = (type === 'Misurazione') ? 'block' : 'none';
        if (type !== 'Misurazione') {
            const hEl = document.getElementById('log-height');
            if (hEl) hEl.value = '';
        }
    }
    const phCont = document.getElementById('ph-container');
    if (phCont) {
        phCont.style.display = (type === 'Misurazione pH') ? 'block' : 'none';
        if (type !== 'Misurazione pH') {
            const phEl = document.getElementById('log-ph');
            if (phEl) phEl.value = '';
        }
    }
    const harvestCont = document.getElementById('harvest-container');
    if (harvestCont) {
        harvestCont.style.display = (type === 'Raccolto') ? 'block' : 'none';
        if (type !== 'Raccolto') {
            const hvEl = document.getElementById('log-harvest');
            if (hvEl) hvEl.value = '';
        }
    }
    const repotCont = document.getElementById('repot-container');
    if (repotCont) {
        repotCont.style.display = (type === 'Rinvaso / Sistemazione') ? 'block' : 'none';
        if (type !== 'Rinvaso / Sistemazione') {
            const potEl = document.getElementById('log-pot-size');
            if (potEl) potEl.value = '';
            toggleLogPotSize();
        }
    }
    const graftCont = document.getElementById('graft-container');
    if (graftCont) {
        graftCont.style.display = (type === 'Innesto') ? 'block' : 'none';
        if (type !== 'Innesto') {
            const graftEl = document.getElementById('log-graft-name');
            if (graftEl) graftEl.value = '';
        }
    }
}

async function addDiaryLog() {
    const dateEl = document.getElementById('log-date');
    const typeEl = document.getElementById('log-type');
    const noteEl = document.getElementById('log-note');
    const date = dateEl ? dateEl.value : '';
    const type = typeEl ? typeEl.value : 'Misurazione';
    const note = noteEl ? noteEl.value.trim() : '';
    let height = null;
    let harvest = null;
    let ph = null;
    let newPlacement = null;
    let newPotSize = null;
    let graftName = null;

    if (!date) {
        if (typeof Swal !== 'undefined') return Swal.fire({icon: 'error', title: 'Dati mancanti', text: "Inserisci la data!", confirmButtonColor: '#2e7d32'});
        return alert("Inserisci la data!");
    }

    if (type === 'Misurazione') {
        const hVal = document.getElementById('log-height') ? document.getElementById('log-height').value : '';
        height = typeof parseLocalFloat === 'function' ? parseLocalFloat(hVal) : parseFloat(hVal);
        if (height === null || isNaN(height) || height < 0) {
            if (typeof Swal !== 'undefined') return Swal.fire({icon: 'error', title: 'Errore', text: "Inserisci un'altezza valida in cm.", confirmButtonColor: '#2e7d32'});
            return;
        }
    }

    if (type === 'Misurazione pH') {
        const phVal = document.getElementById('log-ph') ? document.getElementById('log-ph').value : '';
        ph = typeof parseLocalFloat === 'function' ? parseLocalFloat(phVal) : parseFloat(phVal);
        if (ph === null || isNaN(ph) || ph < 0 || ph > 14) {
            if (typeof Swal !== 'undefined') return Swal.fire({icon: 'error', title: 'Errore', text: "Inserisci un valore di pH valido (tra 0 e 14).", confirmButtonColor: '#2e7d32'});
            return;
        }
    }

    if (type === 'Raccolto') {
        harvest = document.getElementById('log-harvest') ? document.getElementById('log-harvest').value.trim() : '';
        if (harvest === '' && note === '') {
            if (typeof Swal !== 'undefined') return Swal.fire({icon: 'error', title: 'Errore', text: "Inserisci la quantità raccolta o una nota.", confirmButtonColor: '#2e7d32'});
            return;
        }
    }

    const currentPlantIdStr = String(currentPlantId);

    if (type === 'Innesto') {
        graftName = document.getElementById('log-graft-name') ? document.getElementById('log-graft-name').value.trim() : '';
        if (graftName === '') {
            if (typeof Swal !== 'undefined') return Swal.fire({icon: 'error', title: 'Errore', text: "Inserisci il nuovo nome della pianta innestata.", confirmButtonColor: '#2e7d32'});
            return;
        }
        let nameExists = plantsDatabase.some(p => (p.name || '').toLowerCase() === graftName.toLowerCase() && String(p.id) !== currentPlantIdStr);
        if (nameExists) {
            if (typeof Swal !== 'undefined') return Swal.fire({icon: 'error', title: 'Errore', text: `Esiste già una pianta salvata con il nome "${escapeHTML(graftName)}".`, confirmButtonColor: '#2e7d32'});
            return;
        }
        const plant = plantsDatabase.find(p => String(p.id) === currentPlantIdStr);
        if (plant) {
            plant.name = graftName;
            plant.origin = 'Innesto';
        }
    }

    if (type === 'Rinvaso / Sistemazione') {
        newPlacement = document.getElementById('log-placement') ? document.getElementById('log-placement').value : 'Vaso';
        const potVal = document.getElementById('log-pot-size') ? document.getElementById('log-pot-size').value : '';
        newPotSize = typeof parseLocalFloat === 'function' ? parseLocalFloat(potVal) : parseFloat(potVal);
        const plant = plantsDatabase.find(p => String(p.id) === currentPlantIdStr);
        if (plant) {
            plant.placement = newPlacement;
            plant.potSize = newPotSize;
        }
    }

    if (!note && type !== 'Misurazione' && type !== 'Raccolto' && type !== 'Misurazione pH' && type !== 'Rinvaso / Sistemazione' && type !== 'Innesto') {
        if (typeof Swal !== 'undefined') return Swal.fire({icon: 'error', title: 'Dati mancanti', text: "Inserisci una nota descrittiva dell'evento.", confirmButtonColor: '#2e7d32'});
        return;
    }

    const saveBtn = document.querySelector('.diary-section button[onclick="addDiaryLog()"]');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerText = "⏳ Preparazione...";
    }

    try {
        const photoInput = document.getElementById('log-photos');
        let photosArray = [];
        
        // FIX UI THREAD BLOCK: Compressione sequenziale con feedback per foto multiple
        if (photoInput && photoInput.files && photoInput.files.length > 0) {
            const yieldThread = () => new Promise(r => setTimeout(r, 15));
            let total = photoInput.files.length;
            
            for (let i = 0; i < total; i++) {
                if (saveBtn) saveBtn.innerText = `⏳ Compressione foto ${i+1}/${total}...`;
                await yieldThread(); // Lascia respirare l'interfaccia
                
                if (typeof compressImageAsync === 'function') {
                    try {
                        const blob = await compressImageAsync(photoInput.files[i]);
                        if (blob) photosArray.push(blob);
                    } catch (err) {
                        console.error(`Errore compressione foto ${i+1}`, err);
                    }
                } else {
                    photosArray.push(photoInput.files[i]);
                }
            }
            if (saveBtn) saveBtn.innerText = `⏳ Salvataggio finale...`;
            await yieldThread();
        }
        
        await finalizeDiaryLog(date, type, note, height, harvest, ph, newPlacement, newPotSize, graftName, photosArray);
    } catch (err) {
        console.error(err);
        if (typeof Swal !== 'undefined') Swal.fire({icon: 'error', title: 'Errore', text: "Impossibile salvare l'evento.", confirmButtonColor: '#d32f2f'});
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerText = "➕ Salva nel diario";
        }
    }
}

async function finalizeDiaryLog(date, type, note, height, harvest, ph, placement, potSize, graftName, photosArray) {
    if (!plantsDatabase) return;
    const currentPlantIdStr = String(currentPlantId);
    const plant = plantsDatabase.find(p => String(p.id) === currentPlantIdStr);
    if (!plant) return;
    if (!Array.isArray(plant.logs)) plant.logs = [];

    plant.logs.push({
        id: typeof generateId === 'function' ? generateId() : crypto.randomUUID(),
        date: date,
        type: type,
        height: height,
        harvest: harvest,
        ph: ph,
        placement: placement,
        potSize: potSize,
        graftName: graftName,
        note: note,
        photos: photosArray
    });

    unsavedChanges = true;
    if (typeof saveToLocal === 'function') await saveToLocal();
    isFormDirty = false;

    const fieldsToClear = ['log-height', 'log-ph', 'log-harvest', 'log-note', 'log-photos', 'log-graft-name', 'log-pot-size'];
    fieldsToClear.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    if (document.getElementById('log-placement')) {
        document.getElementById('log-placement').value = 'Vaso';
        toggleLogPotSize();
    }

    if (type === 'Innesto' || type === 'Rinvaso / Sistemazione') {
        if (typeof _internalOpenPlantDetail === 'function') _internalOpenPlantDetail(currentPlantIdStr);
    } else {
        if (typeof renderTimeline === 'function') renderTimeline(plant);
        if (typeof updateYearDropdown === 'function') updateYearDropdown(plant);
        if (typeof renderCharts === 'function') renderCharts(plant);
    }

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'success',
            title: 'Evento Aggiunto',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 1500
        });
    }
}

async function deleteLog(logId) {
    if (typeof Swal === 'undefined') return;
    const res = await Swal.fire({
        title: 'Eliminare evento?',
        text: "L'evento verrà cancellato. Se si tratta di un rinvaso o di un innesto, i dati base della pianta NON torneranno automaticamente allo stato precedente.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d32f2f',
        cancelButtonColor: '#607d8b',
        confirmButtonText: 'Sì, elimina',
        cancelButtonText: 'Annulla'
    });

    if (res.isConfirmed) {
        if (!plantsDatabase) return;
        const currentPlantIdStr = String(currentPlantId);
        const plant = plantsDatabase.find(p => String(p.id) === currentPlantIdStr);
        if (!plant || !plant.logs) return;

        const targetLogId = String(logId);
        const logToDelete = plant.logs.find(l => String(l.id) === targetLogId);
        
        if (logToDelete && typeof revokeBlob === 'function') {
            if (logToDelete.photos && Array.isArray(logToDelete.photos)) {
                logToDelete.photos.forEach(ph => revokeBlob(ph));
            }
        }

        plant.logs = plant.logs.filter(l => String(l.id) !== targetLogId);
        unsavedChanges = true;
        if (typeof saveToLocal === 'function') await saveToLocal();
        if (typeof renderTimeline === 'function') renderTimeline(plant);
        if (typeof updateYearDropdown === 'function') updateYearDropdown(plant);
        if (typeof renderCharts === 'function') renderCharts(plant);
    }
}

function renderTimeline(plant) {
    const ul = document.getElementById('detail-timeline');
    if (!ul) return;
    ul.innerHTML = '';
    if (!plant || !plant.logs || !Array.isArray(plant.logs)) return;

    const sortedLogs = [...plant.logs].sort((a, b) => new Date(b.date) - new Date(a.date));
    const fragment = document.createDocumentFragment();

    sortedLogs.forEach(log => {
        const li = document.createElement('li');
        let displayDate = typeof formatDateIt === 'function' ? formatDateIt(log.date) : escapeHTML(log.date);
        let heightStr = (log.type === 'Misurazione' && log.height !== null && log.height !== undefined) ? `<br>📏 <strong>Altezza:</strong> ${typeof formatLocalFloat === 'function' ? formatLocalFloat(log.height) : escapeHTML(log.height)} cm` : '';
        let phStr = (log.type === 'Misurazione pH' && log.ph !== null && log.ph !== undefined) ? `<br>🧪 <strong>pH misurato:</strong> ${typeof formatLocalFloat === 'function' ? formatLocalFloat(log.ph) : escapeHTML(log.ph)}` : '';
        let harvestStr = (log.type === 'Raccolto' && log.harvest) ? `<br>🧺 <strong>Resa:</strong> ${escapeHTML(log.harvest)}` : '';
        let repotStr = '';
        if (log.type === 'Rinvaso / Sistemazione' && log.placement) {
            repotStr = `<br>🪴 <strong>Nuova sistemazione:</strong> ${escapeHTML(log.placement)}`;
            if (log.placement === 'Vaso' && log.potSize) {
                repotStr += ` (${typeof formatLocalFloat === 'function' ? formatLocalFloat(log.potSize) : escapeHTML(log.potSize)} L)`;
            }
        }
        let graftStr = '';
        if (log.type === 'Innesto' && log.graftName) {
            graftStr = `<br>🔪 <strong>Nuovo nome pianta:</strong> ${escapeHTML(log.graftName)}`;
        }

        let imgStr = '';
        const fallbackSrc = typeof OFFLINE_PLACEHOLDER !== 'undefined' ? OFFLINE_PLACEHOLDER : '';
        const validPhotos = (log.photos && Array.isArray(log.photos)) ? log.photos : [];

        if (validPhotos.length > 0) {
            imgStr = '<div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">';
            validPhotos.forEach(ph => {
                let phSrc = typeof getImageUrl === 'function' ? getImageUrl(ph) : fallbackSrc;
                let safeLabel = escapeHTML(`Foto Diario (${displayDate})`).replace(/&#39;/g, "\\'");
                imgStr += `<img src="${phSrc}" onerror="this.onerror=null; this.src='${fallbackSrc}';" class="timeline-photo" alt="Foto Evento" tabindex="0" role="button" aria-label="Espandi foto evento" style="flex: 1; min-width: 120px; max-width: 100%; object-fit: cover; cursor: pointer;" onclick="if(typeof openImageModal === 'function') openImageModal('${phSrc}', '${safeLabel}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}">`;
            });
            imgStr += '</div>';
        }

        li.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div><span class="timeline-date">${displayDate}</span><span class="timeline-type">${escapeHTML(log.type)}</span></div>
                <button style="color:red; background:none; border:none; cursor:pointer; font-size: 16px; padding: 0 0 0 10px;" onclick="deleteLog('${log.id}')" aria-label="Elimina evento">✖</button>
            </div>
            <p style="margin: 8px 0 0 0; font-size: 14px;">${escapeHTML(log.note)}${heightStr}${phStr}${harvestStr}${repotStr}${graftStr}</p>
            ${imgStr}
        `;
        fragment.appendChild(li);
    });

    ul.appendChild(fragment);
}let formMap = null;
let formMarker = null;

function cleanupDetailMap() {
    if (typeof map !== 'undefined' && map) {
        map.remove();
        map = null;
        marker = null;
    }
}

function cleanupFormMap() {
    if (typeof formMap !== 'undefined' && formMap) {
        formMap.remove();
        formMap = null;
        formMarker = null;
    }
}

function cleanupGlobalMap() {
    if (typeof globalMap !== 'undefined' && globalMap) {
        globalMap.remove();
        globalMap = null;
        globalMapMarkers = null;
    }
}

// Generatore per il blocco visivo di Mappa Offline
function getOfflineMapPlaceholder() {
    return `<div style="padding:40px 20px; text-align:center; background:#f5f5f5; border-radius:8px; border:2px dashed #ccc; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                <h3 style="color:#666; margin-top:0; margin-bottom:10px;">📡 Mappa Offline</h3>
                <p style="font-size:14px; color:#777; margin:0;">Le mappe interattive richiedono una connessione a Internet per scaricare la cartografia.</p>
            </div>`;
}

function initMap(plant) {
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) return;

    if (!navigator.onLine || typeof L === 'undefined') {
        mapContainer.innerHTML = getOfflineMapPlaceholder();
        return;
    }
    
    if (!plant) return;

    let lat = plant.lat !== null && plant.lat !== undefined ? (typeof parseLocalFloat === 'function' ? parseLocalFloat(plant.lat) : parseFloat(String(plant.lat).replace(',', '.'))) : APP_CONFIG.MAP_DEFAULT_LAT; 
    let lng = plant.lng !== null && plant.lng !== undefined ? (typeof parseLocalFloat === 'function' ? parseLocalFloat(plant.lng) : parseFloat(String(plant.lng).replace(',', '.'))) : APP_CONFIG.MAP_DEFAULT_LNG; 
    
    if (isNaN(lat) || lat < -90 || lat > 90) lat = APP_CONFIG.MAP_DEFAULT_LAT;
    if (isNaN(lng) || lng < -180 || lng > 180) lng = APP_CONFIG.MAP_DEFAULT_LNG;

    let zoom = (plant.lat !== null && plant.lat !== undefined && !isNaN(plant.lat)) ? APP_CONFIG.MAP_PLANT_ZOOM : APP_CONFIG.MAP_WORLD_ZOOM;
    
    if (!map) {
        try {
            map = L.map('map-container').setView([lat, lng], zoom); 
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
        } catch (e) {
            console.error("Errore inizializzazione mappa:", e);
            mapContainer.innerHTML = getOfflineMapPlaceholder();
            return;
        }
    } else { 
        map.setView([lat, lng], zoom); 
    }
    updateMapMarker(lat, lng, plant.lat !== null && plant.lat !== undefined && !isNaN(plant.lat));
}

function updateMapMarker(lat, lng, hasLocation = true) { 
    if(!map || typeof L === 'undefined') return;
    if(marker) map.removeLayer(marker); 
    if(hasLocation && !isNaN(lat) && !isNaN(lng)) {
        marker = L.marker([lat, lng]).addTo(map); 
    }
}

function initFormMap() {
    const formMapContainer = document.getElementById('form-map-container');
    if (!formMapContainer) return;

    if (!navigator.onLine || typeof L === 'undefined') {
        formMapContainer.innerHTML = getOfflineMapPlaceholder();
        return;
    }

    const latInputEl = document.getElementById('p-lat');
    const lngInputEl = document.getElementById('p-lng');
    
    let latInput = latInputEl ? latInputEl.value : '';
    let lngInput = lngInputEl ? lngInputEl.value : '';
    
    let lat = latInput ? (typeof parseLocalFloat === 'function' ? parseLocalFloat(latInput) : parseFloat(latInput.replace(',', '.'))) : APP_CONFIG.MAP_DEFAULT_LAT;
    let lng = lngInput ? (typeof parseLocalFloat === 'function' ? parseLocalFloat(lngInput) : parseFloat(lngInput.replace(',', '.'))) : APP_CONFIG.MAP_DEFAULT_LNG;
    
    if (isNaN(lat) || lat < -90 || lat > 90) lat = APP_CONFIG.MAP_DEFAULT_LAT;
    if (isNaN(lng) || lng < -180 || lng > 180) lng = APP_CONFIG.MAP_DEFAULT_LNG;

    let zoom = latInput && lngInput && !isNaN(lat) && !isNaN(lng) ? APP_CONFIG.MAP_PLANT_ZOOM : APP_CONFIG.MAP_WORLD_ZOOM;

    if (!formMap) {
        try {
            formMap = L.map('form-map-container').setView([lat, lng], zoom);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(formMap);
            
            const GpsControl = L.Control.extend({
                options: { position: 'topright' },
                onAdd: function (mapInstance) {
                    var btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control');
                    btn.innerHTML = '📍 Usa GPS';
                    btn.style.backgroundColor = 'white';
                    btn.style.border = '2px solid rgba(0,0,0,0.2)';
                    btn.style.borderRadius = '4px';
                    btn.style.padding = '5px 8px';
                    btn.style.cursor = 'pointer';
                    btn.style.fontWeight = 'bold';
                    btn.style.fontSize = '12px';
                    btn.style.color = 'var(--primary)';
                    
                    btn.onclick = function(e){
                        e.preventDefault();
                        if (navigator.geolocation) {
                            btn.innerHTML = '⏳ Cerco...';
                            navigator.geolocation.getCurrentPosition(function(position) {
                                let clat = parseFloat(position.coords.latitude.toFixed(5));
                                let clng = parseFloat(position.coords.longitude.toFixed(5));
                                
                                const pLat = document.getElementById('p-lat');
                                const pLng = document.getElementById('p-lng');
                                if(pLat) pLat.value = typeof formatLocalFloat === 'function' ? formatLocalFloat(clat) : clat;
                                if(pLng) pLng.value = typeof formatLocalFloat === 'function' ? formatLocalFloat(clng) : clng;
                                
                                if (typeof locationMode !== 'undefined' && locationMode === 'select') {
                                    if (typeof setLocationMode === 'function') {
                                        setLocationMode('input');
                                        const locInput = document.getElementById('p-location-input');
                                        if (locInput) locInput.value = 'Posizione GPS';
                                    }
                                }
                                
                                mapInstance.setView([clat, clng], 16);
                                if (formMarker) mapInstance.removeLayer(formMarker);
                                formMarker = L.marker([clat, clng]).addTo(mapInstance);
                                
                                btn.innerHTML = '📍 Usa GPS';
                            }, function(error) {
                                btn.innerHTML = '📍 Usa GPS';
                                if (typeof Swal !== 'undefined') {
                                    let msg = 'Assicurati di aver dato i permessi di localizzazione al browser o di avere il GPS attivo.';
                                    if (error.code === 3) msg = 'Timeout: la rete o il GPS sono troppo lenti.';
                                    Swal.fire({
                                        icon: 'error',
                                        title: 'Errore GPS',
                                        text: msg,
                                        confirmButtonColor: '#d32f2f'
                                    });
                                }
                            }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
                        } else {
                            if (typeof Swal !== 'undefined') {
                                Swal.fire('Errore', 'Geolocalizzazione non supportata dal tuo dispositivo.', 'error');
                            }
                        }
                    };
                    return btn;
                }
            });
            formMap.addControl(new GpsControl());
            
            formMap.on('click', function(e) {
                let clat = parseFloat(e.latlng.lat.toFixed(5));
                let clng = parseFloat(e.latlng.lng.toFixed(5));
                
                const pLat = document.getElementById('p-lat');
                const pLng = document.getElementById('p-lng');
                if(pLat) pLat.value = typeof formatLocalFloat === 'function' ? formatLocalFloat(clat) : clat;
                if(pLng) pLng.value = typeof formatLocalFloat === 'function' ? formatLocalFloat(clng) : clng;
                
                if (typeof locationMode !== 'undefined' && locationMode === 'select') {
                    if (typeof setLocationMode === 'function') {
                        setLocationMode('input');
                        const locInput = document.getElementById('p-location-input');
                        if (locInput) locInput.value = ''; 
                    }
                }

                if (formMarker) formMap.removeLayer(formMarker);
                formMarker = L.marker([clat, clng]).addTo(formMap);
            });
        } catch (e) {
            console.error(e);
            formMapContainer.innerHTML = getOfflineMapPlaceholder();
        }
    } else {
        formMap.setView([lat, lng], zoom);
    }
    
    if (formMarker && formMap) formMap.removeLayer(formMarker);
    if (latInput && lngInput && !isNaN(lat) && !isNaN(lng) && formMap) {
        formMarker = L.marker([lat, lng]).addTo(formMap);
    }
}

function updateFormMapFromInputs() {
    if (!formMap || typeof L === 'undefined') return;
    
    const latInputEl = document.getElementById('p-lat');
    const lngInputEl = document.getElementById('p-lng');
    if (!latInputEl || !lngInputEl) return;
    
    let latInput = latInputEl.value;
    let lngInput = lngInputEl.value;
    
    let lat = typeof parseLocalFloat === 'function' ? parseLocalFloat(latInput) : parseFloat(latInput.replace(',', '.'));
    let lng = typeof parseLocalFloat === 'function' ? parseLocalFloat(lngInput) : parseFloat(lngInput.replace(',', '.'));
    
    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        formMap.setView([lat, lng], APP_CONFIG.MAP_PLANT_ZOOM);
        if (formMarker) formMap.removeLayer(formMarker);
        formMarker = L.marker([lat, lng]).addTo(formMap);
    }
}

document.addEventListener('click', function(e) {
    if (e.target && typeof e.target.closest === 'function' && e.target.closest('.accordion-header')) {
        setTimeout(() => {
            if (formMap) formMap.invalidateSize();
        }, 350); 
    }
});

function renderGlobalMapFullscreen() {
    const container = document.getElementById('global-map-fullscreen');
    if (!container) return;

    if (!navigator.onLine || typeof L === 'undefined' || typeof L.markerClusterGroup === 'undefined') {
        container.innerHTML = getOfflineMapPlaceholder();
        return;
    }

    if (!globalMap) {
        try {
            globalMap = L.map('global-map-fullscreen').setView([APP_CONFIG.MAP_DEFAULT_LAT, APP_CONFIG.MAP_DEFAULT_LNG], APP_CONFIG.MAP_WORLD_ZOOM);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(globalMap);
            
            globalMapMarkers = L.markerClusterGroup({
                chunkedLoading: true,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                zoomToBoundsOnClick: true,
                maxClusterRadius: 50
            });
            globalMap.addLayer(globalMapMarkers);
        } catch (e) {
            console.error(e);
            container.innerHTML = getOfflineMapPlaceholder();
            return;
        }
    }
    
    if (globalMapMarkers) globalMapMarkers.clearLayers();
    let bounds = [];
    let locationGroups = {};

    if (!plantsDatabase || !Array.isArray(plantsDatabase)) plantsDatabase = [];

    plantsDatabase.filter(p => p.status !== 'archived').forEach(p => {
        let pLat = typeof parseLocalFloat === 'function' ? parseLocalFloat(p.lat) : parseFloat(String(p.lat).replace(',', '.'));
        let pLng = typeof parseLocalFloat === 'function' ? parseLocalFloat(p.lng) : parseFloat(String(p.lng).replace(',', '.'));
        
        if (pLat !== null && pLng !== null && !isNaN(pLat) && !isNaN(pLng) && pLat >= -90 && pLat <= 90 && pLng >= -180 && pLng <= 180) {
            let key = `${pLat.toFixed(5)}_${pLng.toFixed(5)}`;
            if (!locationGroups[key]) locationGroups[key] = [];
            locationGroups[key].push({...p, _safeLat: pLat, _safeLng: pLng});
        }
    });

    const fallbackSrc = typeof OFFLINE_PLACEHOLDER !== 'undefined' ? OFFLINE_PLACEHOLDER : '';

    for (let key in locationGroups) {
        let plantsGroup = locationGroups[key];
        if (!plantsGroup || plantsGroup.length === 0) continue;
        
        let lat = plantsGroup[0]._safeLat;
        let lng = plantsGroup[0]._safeLng;
        let marker = L.marker([lat, lng]);
        
        let title = plantsGroup.length === 1 ? escapeHTML(plantsGroup[0].name) : `📍 ${plantsGroup.length} piante in questa posizione`;
        
        let rawPhoto = plantsGroup[0].fruitPhoto || plantsGroup[0].photo;
        let imgSrc = (typeof getImageUrl === 'function' && rawPhoto) ? getImageUrl(rawPhoto) : fallbackSrc;

        marker.bindPopup(`
            <img src="${imgSrc}" onerror="this.onerror=null; this.src='${fallbackSrc}';" style="width:120px; height:90px; object-fit:cover; border-radius:5px; margin-bottom:5px;" alt="Anteprima">
            <h4 style="margin: 0;">${title}</h4>
        `);

        marker.on('click', () => { if(typeof showMapPlantsList === 'function') showMapPlantsList(plantsGroup); });
        
        if (globalMapMarkers) globalMapMarkers.addLayer(marker);
        bounds.push([lat, lng]);
    }

    setTimeout(() => { 
        if (globalMap) {
            globalMap.invalidateSize(); 
            if(bounds.length > 0) globalMap.fitBounds(bounds, {padding: [30, 30], maxZoom: 16});
            else globalMap.setView([APP_CONFIG.MAP_DEFAULT_LAT, APP_CONFIG.MAP_DEFAULT_LNG], APP_CONFIG.MAP_WORLD_ZOOM);
        }
    }, 450);
}

function showMapPlantsList(plantsList) {
    const container = document.getElementById('map-plants-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!plantsList || !Array.isArray(plantsList)) return;
    
    const fragment = document.createDocumentFragment();
    const fallbackSrc = typeof OFFLINE_PLACEHOLDER !== 'undefined' ? OFFLINE_PLACEHOLDER : '';
    
    plantsList.forEach(plant => {
        const card = document.createElement('div');
        card.className = 'plant-card animate__animated animate__fadeIn';
        card.onclick = () => { if(typeof navigateTo === 'function') navigateTo('plant-detail', plant.id); };
        
        let rawPhoto = plant.fruitPhoto || plant.photo;
        let imgSrc = (typeof getImageUrl === 'function' && rawPhoto) ? getImageUrl(rawPhoto) : fallbackSrc;

        let sistemazioneLabel = plant.placement || 'Vaso'; 
        let vol = plant.potSize || plant.pot; 
        if (sistemazioneLabel === 'Vaso' && vol) sistemazioneLabel += ` (${typeof formatLocalFloat === 'function' ? formatLocalFloat(vol) : vol} L)`;
        
        card.innerHTML = `
            <img src="${imgSrc}" onerror="this.onerror=null; this.src='${fallbackSrc}';" alt="${escapeHTML(plant.name)}">
            <h3 style="margin-bottom:5px; margin-top:0;">${escapeHTML(plant.name)}</h3>
            <p style="margin-top:0; font-size:14px;"><em>${escapeHTML(plant.scientific)}</em></p>
            <p style="margin:5px 0;">🪴 <strong>${escapeHTML(sistemazioneLabel)}</strong></p>
        `;
        fragment.appendChild(card);
    });
    
    container.appendChild(fragment);
}

function updateYearDropdown(plant) {
    const select = document.getElementById('chart-year-filter'); 
    if(!select) return;
    
    if (!plant || !Array.isArray(plant.logs)) {
        select.innerHTML = '<option value="all">Tutti gli anni</option>';
        return;
    }
    
    const currentSelection = select.value;
    const years = new Set(plant.logs.map(l => l.date ? l.date.substring(0, 4) : 'N/D')); 
    const sortedYears = Array.from(years).sort().reverse();
    
    select.innerHTML = '<option value="all">Tutti gli anni</option>'; 
    sortedYears.forEach(year => { 
        if (year !== 'N/D') {
            const opt = document.createElement('option'); 
            opt.value = escapeHTML(year); 
            opt.innerText = escapeHTML(year); 
            select.appendChild(opt); 
        }
    });
    
    if (sortedYears.includes(currentSelection)) select.value = currentSelection;
}

function updateChartsFromDropdown() { 
    if (typeof plantsDatabase === 'undefined' || typeof currentPlantId === 'undefined' || currentPlantId === null) return;
    
    const plant = plantsDatabase.find(p => String(p.id) === String(currentPlantId)); 
    if(plant) renderCharts(plant); 
}

function renderCharts(plant) {
    if (typeof Chart === 'undefined') return;

    if (!plant || !Array.isArray(plant.logs)) return;

    const selectEl = document.getElementById('chart-year-filter');
    const selectedYear = selectEl ? selectEl.value : 'all'; 
    let filteredLogs = selectedYear !== 'all' ? plant.logs.filter(l => l.date && l.date.startsWith(selectedYear)) : plant.logs;
    
    const heightLogs = filteredLogs.filter(l => l.type === 'Misurazione' && l.height !== null && !isNaN(l.height)); 
    heightLogs.sort((a,b) => new Date(a.date) - new Date(b.date));
    
    const growthCanvas = document.getElementById('growthChart');
    if(growthCanvas) {
        if(growthChart) { 
            growthChart.destroy(); 
            growthChart = null; 
        }
        growthChart = new Chart(growthCanvas, { 
            type: 'line', 
            data: { 
                labels: heightLogs.map(l => typeof formatDateIt === 'function' ? formatDateIt(l.date) : l.date), 
                datasets: [{ label: 'Altezza Pianta (cm)', data: heightLogs.map(l => l.height), borderColor: '#2e7d32', backgroundColor: 'rgba(46, 125, 50, 0.2)', borderWidth: 2, pointBackgroundColor: '#2e7d32', pointRadius: 5, fill: true, tension: 0.3 }] 
            }, 
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { title: { display: true, text: `📈 Curva di crescita${selectedYear !== 'all' ? ' - '+selectedYear : ''}` } }, 
                scales: { y: { beginAtZero: true } } 
            } 
        });
    }

    const eventLogs = filteredLogs.filter(l => l.type !== 'Misurazione'); 
    eventLogs.sort((a,b) => new Date(a.date) - new Date(b.date));
    
    const eventsCanvas = document.getElementById('eventsChart');
    if(eventsCanvas) {
        if(eventsChart) { 
            eventsChart.destroy(); 
            eventsChart = null; 
        }
        const rawEventLabels = [...new Set(eventLogs.map(l => l.date))]; 
        const eventLabels = rawEventLabels.map(d => typeof formatDateIt === 'function' ? formatDateIt(d) : d);
        const yCategories = ['Innesto', 'Rinvaso / Sistemazione', 'Misurazione pH', 'Raccolto', 'Fruttificazione', 'Fioritura', 'Stato di Salute', 'Spostamento', 'Concimazione', 'Trattamento', 'Irrigazione'];

        eventsChart = new Chart(eventsCanvas, {
            type: 'line', 
            data: { 
                datasets: [{ 
                    label: 'Eventi', 
                    data: eventLogs.map(l => {
                        let text = l.note || ''; 
                        if (l.type === 'Misurazione pH' && l.ph) text = `pH: ${typeof formatLocalFloat === 'function' ? formatLocalFloat(l.ph) : l.ph}` + (text ? ` (${text})` : ''); 
                        if (l.type === 'Raccolto' && l.harvest) text = `Resa: ${l.harvest}` + (text ? ` (${text})` : ''); 
                        if (l.type === 'Rinvaso / Sistemazione' && l.placement) text = `Nuovo: ${l.placement} ${l.potSize ? '('+(typeof formatLocalFloat === 'function' ? formatLocalFloat(l.potSize) : l.potSize)+'L)' : ''}` + (text ? ` (${text})` : ''); 
                        if (l.type === 'Innesto' && l.graftName) text = `Nuovo: ${l.graftName}` + (text ? ` (${text})` : ''); 
                        
                        let displayDate = typeof formatDateIt === 'function' ? formatDateIt(l.date) : l.date;
                        return { x: displayDate, y: l.type, note: text };
                    }), 
                    backgroundColor: '#f57f17', borderColor: '#f57f17', pointRadius: 8, pointHoverRadius: 12, showLine: false 
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                    title: { display: true, text: `🌸 Fasi fenologiche ed eventi${selectedYear !== 'all' ? ' - '+selectedYear : ''}` }, 
                    legend: { display: false }, 
                    tooltip: { callbacks: { label: function(context) { return `Nota: ${context.raw.note ? context.raw.note : 'Nessuna nota aggiuntiva'}`; } } } 
                }, 
                scales: { x: { type: 'category', labels: eventLabels }, y: { type: 'category', labels: yCategories } } 
            }
        });
    }
}

function renderGlobalChart() {
    if (typeof Chart === 'undefined') {
        const container = document.getElementById('events-chart-container');
        if (container) container.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">Libreria Grafici offline.</div>';
        return;
    }

    const canvas = document.getElementById('globalEventsChart');
    if(!canvas) return;
    
    if(globalEvChart) { 
        globalEvChart.destroy(); 
        globalEvChart = null; 
    }
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let allEvents = [];
    if (typeof plantsDatabase !== 'undefined' && Array.isArray(plantsDatabase)) {
        plantsDatabase.forEach(plant => {
            if(plant.logs && Array.isArray(plant.logs)) {
                plant.logs.forEach(log => {
                    if (log.type === 'Fioritura' || log.type === 'Raccolto' || log.type === 'Fruttificazione') { 
                        allEvents.push({ plantName: plant.name, date: log.date, type: log.type, note: log.note }); 
                    }
                });
            }
        });
    }
    
    const emptyStateEl = document.getElementById('events-empty-state');
    const chartContainerEl = document.getElementById('events-chart-container');
    
    if (allEvents.length === 0) { 
        if (emptyStateEl) emptyStateEl.classList.remove('hidden');
        if (chartContainerEl) chartContainerEl.classList.add('hidden');
        return; 
    } else {
        if (emptyStateEl) emptyStateEl.classList.add('hidden');
        if (chartContainerEl) chartContainerEl.classList.remove('hidden');
    }
    
    allEvents.sort((a,b) => new Date(a.date) - new Date(b.date));
    const rawDateLabels = [...new Set(allEvents.map(e => e.date))].sort((a,b) => new Date(a) - new Date(b));
    const dateLabels = rawDateLabels.map(d => typeof formatDateIt === 'function' ? formatDateIt(d) : d);
    const plantLabels = [...new Set(allEvents.map(e => e.plantName))];
    
    const fioriture = allEvents.filter(e => e.type === 'Fioritura').map(e => ({ x: typeof formatDateIt === 'function' ? formatDateIt(e.date) : e.date, y: e.plantName, note: e.note }));
    const raccolti = allEvents.filter(e => e.type === 'Raccolto' || e.type === 'Fruttificazione').map(e => ({ x: typeof formatDateIt === 'function' ? formatDateIt(e.date) : e.date, y: e.plantName, note: e.note }));
    
    globalEvChart = new Chart(canvas, { 
        type: 'scatter', 
        data: { 
            datasets: [ 
                { label: '🌸 Fioriture', data: fioriture, backgroundColor: '#f06292', pointRadius: 8, pointHoverRadius: 12 }, 
                { label: '🍋/🧺 Raccolti e Frutti', data: raccolti, backgroundColor: '#f57f17', pointRadius: 8, pointHoverRadius: 12 } 
            ] 
        }, 
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { tooltip: { callbacks: { label: function(context) { return `${context.raw.y} - Nota: ${context.raw.note ? context.raw.note : 'Nessuna nota aggiuntiva'}`; } } } }, 
            scales: { x: { type: 'category', labels: dateLabels, title: { display: true, text: 'Data' } }, y: { type: 'category', labels: plantLabels } } 
        } 
    });
}

let weatherCache = new Map(); 

function saveWindThreshold() {
    const input = document.getElementById('wind-threshold-input');
    if (input) {
        let val = parseFloat(input.value);
        if (!isNaN(val) && val >= 0) {
            localStorage.setItem('windAlertThreshold', val);
            const confirmSpan = document.getElementById('wind-save-confirm');
            if (confirmSpan) {
                confirmSpan.style.display = 'inline';
                setTimeout(() => confirmSpan.style.display = 'none', 2000);
            }
            renderWeatherDashboard();
        } else {
            if (typeof Swal !== 'undefined') Swal.fire('Errore', 'Inserisci un valore numerico valido e positivo.', 'error');
        }
    }
}

async function fetchWeatherData(lat, lng) {
    const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    if (weatherCache.has(cacheKey)) return weatherCache.get(cacheKey);

    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_min,wind_speed_10m_max,weathercode&timezone=auto`);
        const data = await response.json();
        if (data && data.daily) {
            weatherCache.set(cacheKey, data.daily);
            return data.daily;
        }
    } catch (e) {
        console.error("Errore fetch meteo:", e);
    }
    return null;
}

async function checkWeatherAlert() {
    renderWeatherDashboard();
}

async function renderWeatherDashboard() {
    const container = document.getElementById('weather-alerts-container');
    if (!container) return;

    if (!plantsDatabase) plantsDatabase = [];
    const activePlants = plantsDatabase.filter(p => p.status !== 'archived');
    if (activePlants.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    const savedWindThreshold = localStorage.getItem('windAlertThreshold');
    const activeWindThreshold = savedWindThreshold !== null ? parseFloat(savedWindThreshold) : (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.WIND_ALERT_KMH : 40);

    const locations = [];
    activePlants.forEach(p => {
        if (p.lat !== null && p.lng !== null && p.lat !== undefined && p.lng !== undefined) {
            const lat = parseFloat(p.lat.toString().replace(',', '.'));
            const lng = parseFloat(p.lng.toString().replace(',', '.'));
            if (!isNaN(lat) && !isNaN(lng)) {
                if (!locations.find(l => Math.abs(l.lat - lat) < 0.05 && Math.abs(l.lng - lng) < 0.05)) {
                    locations.push({ lat, lng, name: p.location || `Lat: ${lat.toFixed(2)}, Lng: ${lng.toFixed(2)}` });
                }
            }
        }
    });

    if (locations.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    
    if (!navigator.onLine) {
        container.innerHTML = `<div style="text-align:center; padding:15px; background:#fff3e0; border-radius:8px; border:1px solid #ffcc80; color:#e65100; font-size:14px;"><strong>Attenzione:</strong> Sei offline. Le allerte meteo non sono aggiornate.</div>`;
        return;
    }

    container.innerHTML = `<div style="text-align:center; padding:20px;"><div class="spinner"></div> Caricamento dati meteo...</div>`;

    let windAlerts = [];
    let frostAlerts = []; 
    let hailAlerts = [];

    for (const loc of locations) {
        const weather = await fetchWeatherData(loc.lat, loc.lng);
        if (!weather) continue;

        if (weather.time) {
            for (let i = 0; i < weather.time.length; i++) {
                const dateStr = weather.time[i];
                const windSpeed = weather.wind_speed_10m_max ? weather.wind_speed_10m_max[i] : 0;
                const minTemp = weather.temperature_2m_min ? weather.temperature_2m_min[i] : 99;
                const wCode = weather.weathercode ? weather.weathercode[i] : 0;

                if (windSpeed > activeWindThreshold) {
                    const alreadyHasWindAlert = windAlerts.some(wa => wa.locationName === loc.name && wa.date === dateStr);
                    if (!alreadyHasWindAlert) {
                        windAlerts.push({ locationName: loc.name, date: dateStr, speed: windSpeed });
                    }
                }

                if (wCode === 96 || wCode === 99) {
                    const alreadyHasHailAlert = hailAlerts.some(ha => ha.locationName === loc.name && ha.date === dateStr);
                    if (!alreadyHasHailAlert) {
                        hailAlerts.push({ locationName: loc.name, date: dateStr });
                    }
                }

                activePlants.forEach(p => {
                    if (p.lat !== null && p.lng !== null && p.lat !== undefined && p.lng !== undefined) {
                        const pLat = parseFloat(p.lat.toString().replace(',', '.'));
                        const pLng = parseFloat(p.lng.toString().replace(',', '.'));
                        if (!isNaN(pLat) && !isNaN(pLng) && Math.abs(pLat - loc.lat) < 0.05 && Math.abs(pLng - loc.lng) < 0.05) {
                            if (p.minTemp !== null && p.minTemp !== undefined) {
                                const plantMin = parseFloat(p.minTemp.toString().replace(',', '.'));
                                if (!isNaN(plantMin) && minTemp < plantMin) {
                                    const existingAlert = frostAlerts.find(a => String(a.plant.id) === String(p.id));
                                    if (!existingAlert) {
                                        frostAlerts.push({ plant: p, forecast: minTemp, date: dateStr });
                                    } else if (minTemp < existingAlert.forecast) {
                                        existingAlert.forecast = minTemp;
                                        existingAlert.date = dateStr;
                                    }
                                }
                            }
                        }
                    }
                });
            }
        }
    }

    let html = `
    <div style="background: #fff; padding: 20px; border-radius: 12px; border: 1px solid #e0e0e0; margin-bottom: 25px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e8f5e9; padding-bottom: 10px; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
            <h3 style="margin: 0; color: #2e7d32; display:flex; align-items:center; gap:8px;">🌤️ Allerta meteo</h3>
            <div style="display: flex; gap: 10px; align-items: center; background: #e3f2fd; padding: 6px 12px; border-radius: 20px; font-size: 13px;">
                <label for="wind-threshold-input" style="color: #1565c0; margin:0; font-weight: bold;">Soglia Vento (km/h):</label>
                <input type="number" id="wind-threshold-input" value="${activeWindThreshold}" style="width: 50px; padding: 4px; font-size: 13px; border: 1px solid #90caf9; border-radius: 4px; text-align: center; background: white;" onchange="saveWindThreshold()">
                <span id="wind-save-confirm" style="color: #2e7d32; display: none; font-weight: bold;">✔️</span>
            </div>
        </div>`;

    if (windAlerts.length > 0) {
        html += `<div style="background:#fff3e0; padding:15px; border-radius:8px; border-left: 5px solid #ff9800; margin-bottom:15px; color:#e65100;">
                    <strong style="font-size: 16px;">🌬️ Allerta Vento:</strong> 
                    <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px;">`;
        windAlerts.forEach(wa => {
            html += `<li>Previste raffiche di <strong>${wa.speed.toFixed(1)} km/h</strong> in data <strong>${typeof formatDateIt === 'function' ? formatDateIt(wa.date) : wa.date}</strong> presso <em>${escapeHTML(wa.locationName)}</em>.</li>`;
        });
        html += `   </ul>
                 </div>`;
    }

    if (hailAlerts.length > 0) {
        html += `<div style="background:#f3e5f5; padding:15px; border-radius:8px; border-left: 5px solid #8e24aa; margin-bottom:15px; color:#6a1b9a;">
                    <strong style="font-size: 16px;">🌩️ Allerta Grandine:</strong> 
                    <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px;">`;
        hailAlerts.forEach(ha => {
            html += `<li>Rischio temporali con grandine in data <strong>${typeof formatDateIt === 'function' ? formatDateIt(ha.date) : ha.date}</strong> presso <em>${escapeHTML(ha.locationName)}</em>. Valuta di proteggere le piante!</li>`;
        });
        html += `   </ul>
                 </div>`;
    }

    if (frostAlerts.length > 0) {
        html += `<h4 style="margin:15px 0 10px 0; color:#d32f2f; font-size: 16px; display: flex; align-items: center; gap: 6px;">❄️ Piante a rischio freddo (Temperatura < tolleranza):</h4>
                 <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px;">`;
        
        const fallbackSrc = typeof OFFLINE_PLACEHOLDER !== 'undefined' ? OFFLINE_PLACEHOLDER : '';

        frostAlerts.forEach(item => {
            const p = item.plant;
            let rawPhoto = p.fruitPhoto || p.photo;
            let imgSrc = (typeof getImageUrl === 'function' && rawPhoto) ? getImageUrl(rawPhoto) : fallbackSrc;
            
            html += `
                <div class="weather-plant-card" onclick="if(typeof navigateTo === 'function') navigateTo('plant-detail', '${p.id}')" style="cursor:pointer; background:white; border-radius:10px; border:1px solid #ffcdd2; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06); transition:transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column;">
                    <img src="${imgSrc}" onerror="this.onerror=null; this.src='${fallbackSrc}';" style="width:100%; height:90px; object-fit:cover;" alt="Foto pianta">
                    <div style="padding:10px; text-align:center; display: flex; flex-direction: column; justify-content: space-between; flex-grow: 1;">
                        <div style="font-weight:bold; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--primary);">${escapeHTML(p.name)}</div>
                        <div style="font-size:12px; color:#555; margin-top:4px;">Tollerata: <strong>${typeof formatLocalFloat === 'function' ? formatLocalFloat(p.minTemp) : p.minTemp}°C</strong></div>
                        <div style="font-size:12px; color:#d32f2f; margin-top:4px; background: #ffebee; padding: 4px; border-radius: 4px; font-weight: bold;">Previsto: ${typeof formatLocalFloat === 'function' ? formatLocalFloat(item.forecast) : item.forecast}°C<br><span style="font-size: 10px; font-weight: normal; color: #777;">il ${typeof formatDateIt === 'function' ? formatDateIt(item.date) : item.date}</span></div>
                    </div>
                </div>`;
        });
        html += `</div>`;
    }

    if (windAlerts.length === 0 && frostAlerts.length === 0 && hailAlerts.length === 0) {
        html += `<div style="color:#2e7d32; font-weight:bold; font-size:14px; padding:12px; background:#e8f5e9; border-radius:8px; border-left: 5px solid #2e7d32; display: flex; align-items: center; gap: 8px;">
                    <span>✅ Nessun rischio rilevato per vento, gelo o grandine nei prossimi 7 giorni.</span>
                 </div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
}function resetMacroView() {
    const step1 = document.getElementById('macro-step-1');
    const step2 = document.getElementById('macro-step-2');
    const step3 = document.getElementById('macro-step-3');
    
    if (step1) step1.classList.remove('hidden');
    if (step2) step2.classList.add('hidden');
    if (step3) step3.classList.add('hidden');
    
    const typeSelect = document.getElementById('macro-type-select');
    if (typeSelect) typeSelect.value = 'Concimazione';
    
    selectedBatchPlants.clear();
    
    const countEl = document.getElementById('macro-selected-count');
    if (countEl) countEl.innerText = "0";
    
    if (typeof getLocalYYYYMMDD === 'function') {
        const globalDate = document.getElementById('macro-global-date');
        if (globalDate) globalDate.value = getLocalYYYYMMDD();
    }
}

function goToMacroStep2() {
    document.getElementById('macro-step-1').classList.add('hidden');
    document.getElementById('macro-step-2').classList.remove('hidden');
    const searchEl = document.getElementById('macro-search');
    if (searchEl) searchEl.value = "";
    renderMacroSelectionGrid();
}

function backToMacroStep1() {
    document.getElementById('macro-step-2').classList.add('hidden');
    document.getElementById('macro-step-1').classList.remove('hidden');
}

function renderMacroSelectionGrid() {
    const grid = document.getElementById('macro-selection-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const searchEl = document.getElementById('macro-search');
    const searchTerm = searchEl ? searchEl.value.toLowerCase() : '';
    
    if (!plantsDatabase) plantsDatabase = [];
    let activePlants = plantsDatabase.filter(p => p.status !== 'archived' && (p.name.toLowerCase().includes(searchTerm) || (p.scientific && p.scientific.toLowerCase().includes(searchTerm))));

    activePlants.sort((a,b) => (a.name || '').localeCompare(b.name || ''));

    const fragment = document.createDocumentFragment();
    const fallbackSrc = typeof OFFLINE_PLACEHOLDER !== 'undefined' ? OFFLINE_PLACEHOLDER : '';

    activePlants.forEach(p => {
        const pIdStr = String(p.id);
        const card = document.createElement('div');
        card.className = `macro-mini-card ${selectedBatchPlants.has(pIdStr) ? 'selected' : ''}`;
        
        card.setAttribute('role', 'option');
        card.setAttribute('aria-selected', selectedBatchPlants.has(pIdStr).toString());
        card.setAttribute('tabindex', '0');
        
        const toggleSelection = () => {
            if (selectedBatchPlants.has(pIdStr)) {
                selectedBatchPlants.delete(pIdStr);
                card.classList.remove('selected');
                card.setAttribute('aria-selected', 'false');
            } else {
                selectedBatchPlants.add(pIdStr);
                card.classList.add('selected');
                card.setAttribute('aria-selected', 'true');
            }
            const countEl = document.getElementById('macro-selected-count');
            if (countEl) countEl.innerText = selectedBatchPlants.size;
        };

        card.onclick = toggleSelection;
        card.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSelection();
            }
        };

        let rawPhoto = p.fruitPhoto || p.photo;
        let imgSrc = (typeof getImageUrl === 'function' && rawPhoto) ? getImageUrl(rawPhoto) : fallbackSrc;

        card.innerHTML = `
            <img src="${imgSrc}" onerror="this.onerror=null; this.src='${fallbackSrc}';" loading="lazy" alt="Miniatura">
            <h4>${escapeHTML(p.name)}</h4>
        `;
        fragment.appendChild(card);
    });
    grid.appendChild(fragment);
}

function goToMacroStep3() {
    if (selectedBatchPlants.size === 0) {
        if (typeof Swal !== 'undefined') return Swal.fire({icon: 'warning', title: 'Seleziona piante', text: 'Seleziona almeno una pianta!', confirmButtonColor: '#f57f17'});
        else return alert('Seleziona almeno una pianta');
    }
    document.getElementById('macro-step-2').classList.add('hidden');
    document.getElementById('macro-step-3').classList.remove('hidden');
    renderMacroInputs();
}

function backToMacroStep2() {
    document.getElementById('macro-step-3').classList.add('hidden');
    document.getElementById('macro-step-2').classList.remove('hidden');
}

function renderMacroInputs() {
    const container = document.getElementById('macro-inputs-container');
    if (!container) return;
    container.innerHTML = '';
    
    const typeSelect = document.getElementById('macro-type-select');
    const type = typeSelect ? typeSelect.value : 'Concimazione';
    const fragment = document.createDocumentFragment();
    const fallbackSrc = typeof OFFLINE_PLACEHOLDER !== 'undefined' ? OFFLINE_PLACEHOLDER : '';

    selectedBatchPlants.forEach(pid => {
        const p = plantsDatabase.find(x => String(x.id) === String(pid));
        if (!p) return;

        let specificInput = '';
        if (type === 'Misurazione') {
            specificInput = `<input type="text" inputmode="decimal" class="m-val" placeholder="Altezza (cm)" aria-label="Altezza" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px;">`;
        } else if (type === 'Misurazione pH') {
            specificInput = `<input type="text" inputmode="decimal" class="m-val" placeholder="pH (0-14)" aria-label="pH" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px;">`;
        } else if (type === 'Raccolto') {
            specificInput = `<input type="text" class="m-val" placeholder="Quantità (es. 2kg)" aria-label="Quantità" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px;">`;
        } else if (type === 'Innesto') {
            specificInput = `<input type="text" class="m-val" placeholder="Nuova varietà" aria-label="Nome innesto" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px;">`;
        } else if (type === 'Rinvaso / Sistemazione') {
            specificInput = `
                <select class="m-placement" aria-label="Sistemazione" style="flex:1; padding:8px; border:1px solid #ccc; border-radius:6px;"><option value="Vaso">Vaso</option><option value="Piena terra">Piena terra</option><option value="Idroponica">Idroponica</option></select>
                <input type="text" inputmode="decimal" class="m-pot" placeholder="Litri (es. 20)" aria-label="Litri" style="flex:1; padding:8px; border:1px solid #ccc; border-radius:6px;">
            `;
        }

        let rawPhoto = p.fruitPhoto || p.photo;
        let imgSrc = (typeof getImageUrl === 'function' && rawPhoto) ? getImageUrl(rawPhoto) : fallbackSrc;

        const row = document.createElement('div');
        row.className = 'macro-input-row';
        row.dataset.id = String(p.id);
        
        row.style.display = 'flex';
        row.style.flexDirection = 'column';
        row.style.gap = '8px';
        row.style.padding = '12px';
        row.style.background = '#fff';
        row.style.borderRadius = '8px';
        row.style.border = '1px solid #ddd';
        row.style.marginBottom = '10px';

        row.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <img src="${imgSrc}" onerror="this.onerror=null; this.src='${fallbackSrc}';" style="width: 50px; height: 50px; border-radius: 6px; object-fit: cover;" alt="Miniatura">
                <div style="font-weight:bold; color:var(--primary); font-size:15px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(p.name)}</div>
            </div>
            ${specificInput ? `<div style="display:flex; gap:8px; width:100%;">${specificInput}</div>` : ''}
            <input type="text" class="m-note" placeholder="Nota opzionale..." aria-label="Nota" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px;">
        `;

        fragment.appendChild(row);
    });
    container.appendChild(fragment);
}

async function saveMacroV2() {
    const dateEl = document.getElementById('macro-global-date');
    const date = dateEl ? dateEl.value : '';
    const typeEl = document.getElementById('macro-type-select');
    const type = typeEl ? typeEl.value : 'Concimazione';
    
    if (!date) {
        if (typeof Swal !== 'undefined') return Swal.fire({icon: 'error', title: 'Data mancante', text: "Inserisci la data dell'evento.", confirmButtonColor: '#2e7d32'});
        return;
    }

    const saveBtn = document.querySelector('#macro-step-3 button.btn:not(.)');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerText = "⏳ Salvataggio...";
    }

    try {
        const rows = document.querySelectorAll('.macro-input-row');
        let successCount = 0;
        let errors = 0;

        rows.forEach((row) => {
            const pid = String(row.dataset.id);
            const p = plantsDatabase.find(x => String(x.id) === pid);
            if (!p) return;

            const noteEl = row.querySelector('.m-note');
            let note = noteEl ? noteEl.value.trim() : '';

            let height = null, ph = null, harvest = null, graftName = null, newPlacement = null, newPotSize = null;
            let isRowValid = true;

            const valEl = row.querySelector('.m-val');
            
            if (type === 'Misurazione') { 
                height = typeof parseLocalFloat === 'function' ? parseLocalFloat(valEl.value) : parseFloat(valEl.value); 
                if ((height === null || isNaN(height)) && !note) isRowValid = false; 
                else if (height !== null && height < 0) isRowValid = false; 
            } else if (type === 'Misurazione pH') { 
                ph = typeof parseLocalFloat === 'function' ? parseLocalFloat(valEl.value) : parseFloat(valEl.value); 
                if ((ph === null || isNaN(ph)) && !note) isRowValid = false; 
                else if (ph !== null && (ph < 0 || ph > 14)) isRowValid = false; 
            } else if (type === 'Raccolto') { 
                harvest = valEl.value.trim(); 
                if (!harvest && !note) isRowValid = false; 
            } else if (type === 'Innesto') { 
                graftName = valEl.value.trim(); 
                if (!graftName) isRowValid = false; 
                else { p.name = graftName; p.origin = 'Innesto'; } 
            } else if (type === 'Rinvaso / Sistemazione') {
                const plEl = row.querySelector('.m-placement');
                const ptEl = row.querySelector('.m-pot');
                newPlacement = plEl ? plEl.value : 'Vaso';
                newPotSize = typeof parseLocalFloat === 'function' ? parseLocalFloat(ptEl.value) : parseFloat(ptEl.value);
                
                if (newPlacement === 'Vaso' && newPotSize !== null && newPotSize <= 0) isRowValid = false;
                else { p.placement = newPlacement; p.potSize = newPotSize; }
            } else {
                if (!note && type !== 'Stato di Salute') isRowValid = false; 
            }

            if (isRowValid) {
                if (!Array.isArray(p.logs)) p.logs = [];
                p.logs.push({
                    id: typeof generateId === 'function' ? generateId() : crypto.randomUUID(),
                    date: date, type: type, note: note, height: height, harvest: harvest, ph: ph, placement: newPlacement, potSize: newPotSize, graftName: graftName, photos: []
                });
                successCount++;
            } else {
                errors++;
            }
        });

        if (errors > 0 && successCount === 0) {
            if (typeof Swal !== 'undefined') return Swal.fire({icon: 'error', title: 'Dati Non Validi', text: 'Non hai inserito dati validi per nessuna delle piante selezionate (controlla numeri e note).', confirmButtonColor: '#d32f2f'});
            return;
        }

        unsavedChanges = true;
        
        if (typeof saveToLocal === 'function') await saveToLocal();

        let msg = `Evento salvato con successo per ${successCount} piante!`;
        if (errors > 0) msg += ` (Ignorate ${errors} piante con dati incompleti o non validi)`;

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success', 
                title: 'Operazione Completata', 
                text: msg, 
                confirmButtonColor: '#2e7d32'
            }).then(() => {
                if(typeof navigateTab === 'function') navigateTab('home');
            });
        }
    } catch (err) {
        console.error("Errore Macro:", err);
        if (typeof Swal !== 'undefined') Swal.fire({icon: 'error', title: 'Errore', text: 'Si è verificato un errore durante il salvataggio.', confirmButtonColor: '#d32f2f'});
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerText = "💾 Salva Eventi";
        }
    }
}

function renderMyData() {
    const container = document.getElementById('my-data-content');
    if (!container) return;
    
    if (!plantsDatabase) plantsDatabase = [];
    
    const totalPlants = plantsDatabase.filter(p => p.status !== 'archived').length;
    const archivedPlants = plantsDatabase.filter(p => p.status === 'archived').length;
    
    let totalValue = 0;
    let fertilityCounts = { 'Autofertile': 0, 'Autosterile': 0, 'Parzialmente autofertile': 0, 'Sconosciuta': 0 };
    
    plantsDatabase.forEach(p => {
        if (p.price) totalValue += p.price;
        let f = typeof getModernFertility === 'function' ? getModernFertility(p.autofertile) : p.autofertile;
        if(fertilityCounts[f] !== undefined) fertilityCounts[f]++;
    });

    container.innerHTML = `
        <div class="my-data-grid" style="margin-top:0;">
            <div class="data-card">
                <h4>🌱 Statistiche Collezione</h4>
                <ul>
                    <li>Piante Attive: <strong>${totalPlants}</strong></li>
                    <li>Piante Archiviate: <strong>${archivedPlants}</strong></li>
                    <li>Valore Stimato: <strong style="color:var(--primary);">${typeof formatLocalFloat === 'function' ? formatLocalFloat(totalValue) : totalValue} €</strong></li>
                </ul>
            </div>
            <div class="data-card">
                <h4>🌸 Livelli di Fertilità</h4>
                <ul>
                    <li>Autofertili: <strong>${fertilityCounts['Autofertile']}</strong></li>
                    <li>Parz. Autofertili: <strong>${fertilityCounts['Parzialmente autofertile']}</strong></li>
                    <li>Autosterili: <strong>${fertilityCounts['Autosterile']}</strong></li>
                    <li>Sconosciuta: <strong>${fertilityCounts['Sconosciuta']}</strong></li>
                </ul>
            </div>
        </div>
    `;
    
    const listTextarea = document.getElementById('general-list-textarea');
    if (listTextarea) {
        const listText = plantsDatabase.filter(p => p.status !== 'archived')
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
            .map(p => `- ${p.name} ${p.scientific ? '('+p.scientific+')' : ''}`)
            .join('\n');
        listTextarea.value = listText || "Nessuna pianta presente.";
    }
}

function renderExpenses() {
    const ul = document.getElementById('expenses-list');
    if (!ul) return;
    ul.innerHTML = '';
    
    if (!generalExpenses) generalExpenses = [];
    if (!plantsDatabase) plantsDatabase = [];
    
    let total = 0;
    const sortedExp = [...generalExpenses].sort((a,b) => new Date(b.date) - new Date(a.date));
    
    sortedExp.forEach(exp => {
        total += (exp.cost || 0);
        const li = document.createElement('li');
        li.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span class="timeline-date">${typeof formatDateIt === 'function' ? formatDateIt(exp.date) : escapeHTML(exp.date)}</span>
                    <span class="timeline-type" style="background:var(--purple);">${escapeHTML(exp.category)}</span>
                </div>
                <button class="btn-text btn-text-danger" aria-label="Elimina spesa" style="padding:0; font-size:16px;" onclick="deleteExpense('${exp.id}')">✖</button>
            </div>
            <p style="margin: 8px 0 0 0; font-size: 14px;">
                <strong>${escapeHTML(exp.desc)}</strong> 
                <br>💰 Costo: <span style="color:var(--danger); font-weight:bold;">${typeof formatLocalFloat === 'function' ? formatLocalFloat(exp.cost) : escapeHTML(exp.cost)} €</span>
            </p>
        `;
        ul.appendChild(li);
    });

    let totalPlantsCost = 0;
    plantsDatabase.forEach(p => { if (p.price) totalPlantsCost += p.price; });

    const tecEl = document.getElementById('total-expenses-cost');
    const tpcEl = document.getElementById('total-plants-cost');
    if (tecEl) tecEl.innerText = (typeof formatLocalFloat === 'function' ? formatLocalFloat(total) : total) + ' €';
    if (tpcEl) tpcEl.innerText = (typeof formatLocalFloat === 'function' ? formatLocalFloat(totalPlantsCost) : totalPlantsCost) + ' €';
}

async function addExpense() {
    const dateEl = document.getElementById('exp-date');
    const catEl = document.getElementById('exp-category');
    const descEl = document.getElementById('exp-desc');
    const costEl = document.getElementById('exp-cost');
    
    const date = dateEl ? dateEl.value : '';
    const category = catEl ? catEl.value : 'Altro';
    const desc = descEl ? descEl.value.trim() : '';
    const cost = costEl ? (typeof parseLocalFloat === 'function' ? parseLocalFloat(costEl.value) : parseFloat(costEl.value)) : null;

    if (!date || !desc || cost === null || isNaN(cost) || cost < 0) {
        if (typeof Swal !== 'undefined') return Swal.fire({icon: 'error', title: 'Errore', text: 'Compila tutti i campi correttamente e inserisci un costo numerico valido.', confirmButtonColor: '#2e7d32'});
        return;
    }

    const addBtn = document.querySelector('#expenses-view .');
    if (addBtn) { addBtn.disabled = true; addBtn.innerText = "⏳ Attendere..."; }

    try {
        if (!generalExpenses) generalExpenses = [];
        generalExpenses.push({ 
            id: typeof generateId === 'function' ? generateId() : crypto.randomUUID(), 
            date, category, desc, cost 
        });
        
        unsavedChanges = true;
        if (typeof saveToLocal === 'function') await saveToLocal();
        
        isFormDirty = false;
        
        if (descEl) descEl.value = '';
        if (costEl) costEl.value = '';
        
        renderExpenses();
    } catch (err) {
        console.error("Errore aggiunta spesa:", err);
    } finally {
        if (addBtn) { addBtn.disabled = false; addBtn.innerText = "➕ Aggiungi spesa"; }
    }
}

async function deleteExpense(id) {
    if (!generalExpenses) return;
    const targetId = String(id);
    generalExpenses = generalExpenses.filter(e => String(e.id) !== targetId);
    unsavedChanges = true;
    
    if (typeof saveToLocal === 'function') await saveToLocal();
    renderExpenses();
}

function initWishlistPreview() {
    const wlPhoto = document.getElementById('wl-photo');
    if (wlPhoto && !document.getElementById('wl-preview-container')) {
        let previewContainer = document.createElement('div');
        previewContainer.id = 'wl-preview-container';
        previewContainer.style.display = 'none';
        previewContainer.style.marginTop = '15px';
        previewContainer.innerHTML = `
            <img id="wl-preview-img" style="max-width:100%; height:180px; object-fit:cover; border-radius:8px; border:1px solid #ccc; display:block; margin: 0 auto;">
            <button type="button" class="btn" style="display:block; margin: 10px auto 0 auto; width:100%;" onclick="clearWishlistPhoto()">✖ Rimuovi foto</button>
        `;
        wlPhoto.parentNode.appendChild(previewContainer);

        wlPhoto.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    document.getElementById('wl-preview-img').src = ev.target.result;
                    document.getElementById('wl-preview-container').style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                clearWishlistPhoto();
            }
        });
    }
}

function clearWishlistPhoto() {
    const wlPhoto = document.getElementById('wl-photo');
    if (wlPhoto) wlPhoto.value = '';
    const container = document.getElementById('wl-preview-container');
    if (container) container.style.display = 'none';
    const img = document.getElementById('wl-preview-img');
    if (img) img.src = '';
}

document.addEventListener('DOMContentLoaded', initWishlistPreview);

function renderWishlist() {
    const grid = document.getElementById('wishlist-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    if (!wishlist) wishlist = [];
    
    if (wishlist.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1 / -1; color: #555;">Nessuna pianta desiderata al momento.</p>';
        return;
    }

    const fragment = document.createDocumentFragment();
    const fallbackSrc = typeof OFFLINE_PLACEHOLDER !== 'undefined' ? OFFLINE_PLACEHOLDER : '';

    wishlist.forEach(item => {
        const card = document.createElement('div');
        card.className = 'plant-card animate__animated animate__fadeIn';
        
        let imgSrc = (typeof getImageUrl === 'function' && item.photo) ? getImageUrl(item.photo) : fallbackSrc;
        let priceStr = item.price ? (typeof formatLocalFloat === 'function' ? formatLocalFloat(item.price) : item.price) + ' €' : 'N/D';

        card.innerHTML = `
            <img src="${imgSrc}" onerror="this.onerror=null; this.src='${fallbackSrc}';" loading="lazy" alt="Foto Desiderio">
            <h3 style="margin:0 0 5px 0; color:var(--accent); font-size:18px;">${escapeHTML(item.name)}</h3>
            <p style="margin:0; font-size:14px; color:#555;">💰 Prezzo stimato: <strong>${priceStr}</strong></p>
            <p style="margin:5px 0 10px 0; font-size:13px; color:#666;">📝 ${escapeHTML(item.notes) || 'Nessuna nota aggiuntiva'}</p>
            <div style="margin-top:auto;">
                <button class="btn" style="width:100%; padding:8px;" onclick="deleteWishlistItem('${item.id}')">🗑️ Rimuovi</button>
            </div>
        `;
        fragment.appendChild(card);
    });
    grid.appendChild(fragment);
}

async function addWishlistItem() {
    const nameEl = document.getElementById('wl-name');
    const priceEl = document.getElementById('wl-price');
    const notesEl = document.getElementById('wl-notes');
    const photoInput = document.getElementById('wl-photo');

    const name = nameEl ? nameEl.value.trim() : '';
    const price = priceEl ? (typeof parseLocalFloat === 'function' ? parseLocalFloat(priceEl.value) : parseFloat(priceEl.value)) : null;
    const notes = notesEl ? notesEl.value.trim() : '';

    if (!name) {
        if (typeof Swal !== 'undefined') return Swal.fire({icon: 'error', title: 'Errore', text: 'Inserisci il nome della pianta da aggiungere.', confirmButtonColor: '#2e7d32'});
        return;
    }

    const addBtn = document.querySelector('#wishlist-view .');
    if (addBtn) { addBtn.disabled = true; addBtn.innerText = "⏳ Attendere..."; }

    try {
        let photoBlob = null;
        if (photoInput && photoInput.files && photoInput.files.length > 0) {
            try {
                if (typeof compressImageAsync === 'function') {
                    photoBlob = await compressImageAsync(photoInput.files[0]);
                } else {
                    photoBlob = photoInput.files[0];
                }
            } catch(e) {
                console.error("Errore compressione foto wishlist", e);
            }
        }

        if (!wishlist) wishlist = [];
        wishlist.push({ 
            id: typeof generateId === 'function' ? generateId() : crypto.randomUUID(), 
            name, price, notes, photo: photoBlob 
        });
        
        unsavedChanges = true;
        if (typeof saveToLocal === 'function') await saveToLocal();

        isFormDirty = false;

        if (nameEl) nameEl.value = '';
        if (priceEl) priceEl.value = '';
        if (notesEl) notesEl.value = '';
        
        clearWishlistPhoto();
        
        renderWishlist();
    } catch(err) {
        console.error("Errore in wishlist:", err);
    } finally {
        if (addBtn) { addBtn.disabled = false; addBtn.innerText = "➕ Aggiungi"; }
    }
}

async function deleteWishlistItem(id) {
    if (!wishlist) return;
    const targetId = String(id);
    const item = wishlist.find(w => String(w.id) === targetId);
    if (item && item.photo && typeof revokeBlob === 'function') revokeBlob(item.photo);
    wishlist = wishlist.filter(w => String(w.id) !== targetId);
    unsavedChanges = true;
    
    if (typeof saveToLocal === 'function') await saveToLocal();
    renderWishlist();
}function loadProfile(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (typeof plantsDatabase !== 'undefined' && plantsDatabase.length > 0) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Caricare il Backup?',
                text: "ATTENZIONE: Questa operazione sovrascriverà il giardino attualmente aperto. Assicurati di aver esportato il giardino attuale prima di procedere!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d32f2f',
                cancelButtonColor: '#607d8b',
                confirmButtonText: 'Sì, sovrascrivi tutto',
                cancelButtonText: 'Annulla'
            }).then((result) => {
                if (result.isConfirmed) {
                    processFile(file, event);
                } else {
                    event.target.value = '';
                }
            });
        } else {
            if (confirm("ATTENZIONE: Verrà sovrascritto tutto. Continuare?")) {
                processFile(file, event);
            } else {
                event.target.value = '';
            }
        }
    } else {
        processFile(file, event);
    }
}

function processFile(file, event) {
    if (file.name.endsWith('.zip')) {
        loadZipProfile(file);
    } else if (file.name.endsWith('.json')) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'Formato Obsoleto',
                text: 'I salvataggi in solo formato .json non sono più supportati. Carica un file .zip generato dalle nuove versioni dell\'app.',
                confirmButtonColor: '#f57f17'
            });
        } else {
            alert('Formato obsoleto. Usa un file .zip.');
        }
    } else {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'File non valido',
                text: 'Per favore, carica un file di salvataggio .zip valido.',
                confirmButtonColor: '#2e7d32'
            });
        } else {
            alert('File non valido. Richiesto .zip');
        }
    }
    event.target.value = '';
}

async function loadZipProfile(file) {
    if (!file) return;

    // Funzione per far "respirare" la CPU ed evitare crash di memoria
    const yieldThread = () => new Promise(r => setTimeout(r, 15));

    let loadingText = 'Sto analizzando il Backup. Attendi...';

    const maxWarningSize = typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.MAX_BACKUP_WARNING_SIZE : 262144000;
    const maxMb = Math.round(maxWarningSize / (1024 * 1024));

    if (file.size > maxWarningSize) {
        loadingText = `File grande (>${maxMb}MB). Il ripristino procede a scaglioni. Non chiudere l'app...`;
        console.warn(`Backup > ${maxMb}MB. Thread Yielding forzato abilitato.`);
    }

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Ripristino in corso...',
            text: loadingText,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
    }

    try {
        if (file.size === 0) throw new Error('Il file ZIP è vuoto.');

        await yieldThread();

        const zip = await JSZip.loadAsync(file);
        const jsonFile = zip.file("data.json");
        if (!jsonFile) throw new Error("Il file ZIP non contiene il database (data.json).");

        const jsonString = await jsonFile.async("string");
        const loadedData = JSON.parse(jsonString);
        
        if (!loadedData || (typeof loadedData !== 'object' && !Array.isArray(loadedData))) {
            throw new Error('Il backup non contiene un formato JSON valido.');
        }

        let loadedPlants = Array.isArray(loadedData) ? loadedData : (Array.isArray(loadedData.plants) ? loadedData.plants : []);
        if (!Array.isArray(loadedPlants)) {
            throw new Error('Il backup non contiene una lista di piante valida.');
        }

        const restoreImage = async (imgPath) => {
            if (imgPath && typeof imgPath === 'string' && imgPath.startsWith('images/')) {
                const imgFile = zip.file(imgPath);
                if (imgFile) {
                    let ext = imgPath.split('.').pop().toLowerCase();
                    let mime = "image/webp";
                    if (ext === "jpeg" || ext === "jpg") mime = "image/jpeg";
                    else if (ext === "png") mime = "image/png";

                    const arrayBuffer = await imgFile.async("arraybuffer");
                    return new Blob([arrayBuffer], { type: mime });
                }
            }
            return typeof sanitizeImageSource === 'function' ? sanitizeImageSource(imgPath) : imgPath;
        }

        let count = 0;
        for (let p of loadedPlants) {
            // Facciamo respirare il browser ogni 5 piante elaborate
            if (++count % 5 === 0) {
                await yieldThread();
                if (typeof Swal !== 'undefined') Swal.update({ text: `Estrazione foto: pianta ${count} di ${loadedPlants.length}...` });
            }

            if (p.photo) p.photo = await restoreImage(p.photo);
            if (p.fruitPhoto) p.fruitPhoto = await restoreImage(p.fruitPhoto);

            if (p.logs && Array.isArray(p.logs)) {
                for (let log of p.logs) {
                    if (log.photos && Array.isArray(log.photos) && log.photos.length > 0) {
                        for (let i = 0; i < log.photos.length; i++) {
                            log.photos[i] = await restoreImage(log.photos[i]);
                        }
                    } else {
                        log.photos = [];
                    }
                    if (!log.id) log.id = typeof generateId === 'function' ? generateId() : crypto.randomUUID();
                    else log.id = String(log.id);
                }
            } else {
                p.logs = [];
            }

            if (!p.status) p.status = 'active';

            if (!p.id) p.id = typeof generateId === 'function' ? generateId() : crypto.randomUUID();
            else p.id = String(p.id);

            if (p.mother) p.mother = String(p.mother);
            if (p.father) p.father = String(p.father);
        }

        plantsDatabase = loadedPlants;

        if (!Array.isArray(loadedData)) {
            if (loadedData.title) {
                gardenTitle = escapeHTML(loadedData.title);
                const titleEl = document.getElementById('main-title');
                if (titleEl) titleEl.innerText = gardenTitle;
            }
            if (loadedData.notes) {
                gardenNotes = loadedData.notes;
            } else {
                gardenNotes = "";
            }

            generalExpenses = Array.isArray(loadedData.expenses) ? loadedData.expenses : [];
            for (let e of generalExpenses) {
                if (!e.id) e.id = typeof generateId === 'function' ? generateId() : crypto.randomUUID();
                else e.id = String(e.id);
            }

            let loadedWishlist = Array.isArray(loadedData.wishlist) ? loadedData.wishlist : [];
            for (let w of loadedWishlist) {
                if (w.photo) w.photo = await restoreImage(w.photo);
                if (!w.id) w.id = typeof generateId === 'function' ? generateId() : crypto.randomUUID();
                else w.id = String(w.id);
            }
            wishlist = loadedWishlist;

        } else {
            generalExpenses = [];
            wishlist = [];
        }

        if (typeof dbSyncHashes !== 'undefined') {
            dbSyncHashes = { Plants: {}, Expenses: {}, Wishlist: {} };
        }

        
        if (typeof Swal !== 'undefined') Swal.update({ text: `Salvataggio nel database in corso...` });
        await yieldThread();
        

        if (!window.currentGardenId && window.currentUser && window.db) {
            window.currentGardenId = String(Date.now() + Math.random());
            localStorage.setItem('lastGardenId', window.currentGardenId);
        }


        if (typeof saveToLocal === 'function') await saveToLocal();


        unsavedChanges = false;
        isFormDirty = false;

        // Mantieni l'alert di caricamento attivo mentre la pagina si ricarica
        window.location.reload();

    } catch (e) {
        const errorMessage = e && e.message ? e.message : String(e);
        console.error("Errore importazione ZIP:", e);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Errore Backup',
                text: "Errore nel caricamento del file ZIP: " + errorMessage,
                confirmButtonColor: '#d32f2f'
            });
        } else {
            alert("Errore caricamento: " + errorMessage);
        }
    }
}

async function exportData() {
    const btn = document.getElementById('btn-export');
    if (btn) {
        btn.innerHTML = '⏳ Preparazione...';
        btn.disabled = true;
    }

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Creazione Backup in corso...',
            text: 'Sto raggruppando i dati. Potrebbe volerci qualche istante, non chiudere la pagina.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
    }

    try {
        const yieldThread = () => new Promise(r => setTimeout(r, 15));
        const zip = new JSZip();
        const imgFolder = zip.folder("images");

        const processImage = (imgData, filenameBase) => {
            if (!imgData) return imgData;
            let ext = "webp";

            if (typeof imgData === 'string' && imgData.startsWith('data:image')) {
                const parts = imgData.split(',');
                if (parts.length < 2) return imgData;
                if (parts[0].includes("jpeg")) ext = "jpeg";
                else if (parts[0].includes("png")) ext = "png";

                const filename = `${filenameBase}.${ext}`;
                imgFolder.file(filename, parts[1], { base64: true });
                return `images/${filename}`;
            } else if (imgData instanceof Blob) {
                if (imgData.type === 'image/jpeg') ext = "jpeg";
                else if (imgData.type === 'image/png') ext = "png";

                const filename = `${filenameBase}.${ext}`;
                imgFolder.file(filename, imgData);
                return `images/${filename}`;
            }
            return imgData;
        }

        if (!plantsDatabase) plantsDatabase = [];
        if (!wishlist) wishlist = [];
        if (!generalExpenses) generalExpenses = [];

        await yieldThread();

        let clonedPlants = [];
        let count = 0;
        
        for (let p of plantsDatabase) {
            if (++count % 5 === 0) {
                await yieldThread();
                if (typeof Swal !== 'undefined') Swal.update({ text: `Elaborazione foto: pianta ${count} di ${plantsDatabase.length}...` });
            }

            let cp = { ...p };
            if (cp.photo) cp.photo = processImage(cp.photo, `plant_${cp.id}_main`);
            if (cp.fruitPhoto) cp.fruitPhoto = processImage(cp.fruitPhoto, `plant_${cp.id}_fruit`);

            if (cp.logs && Array.isArray(cp.logs)) {
                cp.logs = cp.logs.map(log => {
                    let clog = { ...log };
                    if (clog.photos && Array.isArray(clog.photos) && clog.photos.length > 0) {
                        clog.photos = clog.photos.map((ph, idx) => processImage(ph, `log_${clog.id}_${idx}`));
                    } else {
                        clog.photos = [];
                    }
                    return clog;
                });
            } else {
                cp.logs = [];
            }
            clonedPlants.push(cp);
        }

        let clonedWishlist = [];
        for (let w of wishlist) {
            let cw = { ...w };
            if (cw.photo) cw.photo = processImage(cw.photo, `wishlist_${cw.id}`);
            clonedWishlist.push(cw);
        }

        const exportObj = {
            schemaVersion: 1,
            title: gardenTitle || "Il mio giardino",
            notes: gardenNotes || "",
            plants: clonedPlants,
            expenses: generalExpenses,
            wishlist: clonedWishlist
        };

        const jsonString = JSON.stringify(exportObj, function(key, value) {
            if (value === "" || value === null || (Array.isArray(value) && value.length === 0)) return undefined;
            return value;
        });

        zip.file("data.json", jsonString);

        if (typeof Swal !== 'undefined') Swal.update({ text: `Compressione archivio in corso. Attendere...` });
        await yieldThread();

        let lastUpdatePercent = 0;
        const content = await zip.generateAsync({
            type: "blob",
            compression: "STORE" // Evitiamo compressione DEFLATE per risparmiare moltissima RAM su smartphone
        }, function updateCallback(metadata) {
            if (metadata.percent && typeof Swal !== 'undefined') {
                let currentPercent = Math.round(metadata.percent);
                // Aggiorniamo l'interfaccia solo ogni 10% per non causare lag
                if (currentPercent >= lastUpdatePercent + 10) {
                    lastUpdatePercent = currentPercent;
                    Swal.update({ text: `Assemblaggio file ZIP: ${currentPercent}%` });
                }
            }
        });

        const a = document.createElement('a');
        a.href = URL.createObjectURL(content);

        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;

        let safeTitle = (gardenTitle || "Giardino").replace('🌿', '').trim().replace(/[^a-zA-Z0-9 àèìòùÀÈÌÒÙ-]/g, '').replace(/\s+/g, '-');
        if (!safeTitle) safeTitle = "Giardino";

        a.download = `${safeTitle}-${dateStr}-${timeStr}.zip`;
        a.click();

        setTimeout(() => URL.revokeObjectURL(a.href), 1500);

        unsavedChanges = false;
        if (typeof Swal !== 'undefined') Swal.close();

    } catch (err) {
        console.error("Errore export ZIP:", err);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Errore Esportazione',
                text: "Si è verificato un errore, probabilmente la memoria RAM del dispositivo è piena. Chiudi altre app e riprova.",
                confirmButtonColor: '#d32f2f'
            });
        } else {
            alert("Errore ZIP: " + err);
        }
    } finally {
        if (btn) {
            btn.innerHTML = "💾 Backup ZIP";
            btn.disabled = false;
        }
    }
}

function exportToCSV() {
    if (!plantsDatabase || plantsDatabase.length === 0) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'info',
                title: 'Nessun Dato',
                text: 'Non c\'è nessuna pianta da esportare nel file Excel!',
                confirmButtonColor: '#1976d2'
            });
        }
        return;
    }

    const headers = [
        "Nome", "Nome Scientifico", "Costo (€)", "Origine/Propagazione", "Madre", "Padre", "Fertilità", "Data Semina/Inizio",
        "Fedeltà Varietale", "Sistemazione", "Litri Vaso", "Substrato", "pH Minimo", "pH Massimo",
        "Temp. Minima", "Temp. Massima", "Fornitore", "Luogo", "Latitudine", "Longitudine",
        "Stato", "Ultima Altezza (cm)", "Ultimo pH Misurato", "Cronologia Eventi", "Note Pianta", "Note Specie"
    ];

    let csvContent = headers.join(";") + "\n";

    plantsDatabase.forEach(p => {
        let latestHeight = "";
        let latestPh = "";

        if (p.logs && Array.isArray(p.logs)) {
            let heightLogs = p.logs.filter(l => l.type === 'Misurazione' && l.height !== null && !isNaN(l.height)).sort((a, b) => new Date(b.date) - new Date(a.date));
            if (heightLogs.length > 0) latestHeight = heightLogs[0].height;

            let phLogs = p.logs.filter(l => l.type === 'Misurazione pH' && l.ph !== null && !isNaN(l.ph)).sort((a, b) => new Date(b.date) - new Date(a.date));
            if (phLogs.length > 0) latestPh = phLogs[0].ph;
        }

        let motherName = "";
        if (p.mother !== undefined && p.mother !== null && p.mother !== "") {
            let m = plantsDatabase.find(x => String(x.id) === String(p.mother));
            if (m) motherName = m.name;
        }

        let fatherName = "";
        if (p.father !== undefined && p.father !== null && p.father !== "") {
            let f = plantsDatabase.find(x => String(x.id) === String(p.father));
            if (f) fatherName = f.name;
        }

        let eventsStr = "";
        if (p.logs && Array.isArray(p.logs) && p.logs.length > 0) {
            let sortedLogs = [...p.logs].sort((a, b) => new Date(a.date) - new Date(b.date));
            eventsStr = sortedLogs.map(l => {
                let detail = "";
                if (l.type === 'Misurazione' && l.height !== null) detail = ` (${typeof formatLocalFloat === 'function' ? formatLocalFloat(l.height) : l.height}cm)`;
                else if (l.type === 'Misurazione pH' && l.ph !== null) detail = ` (pH ${typeof formatLocalFloat === 'function' ? formatLocalFloat(l.ph) : l.ph})`;
                else if (l.type === 'Raccolto' && l.harvest) detail = ` (Resa: ${l.harvest})`;
                else if (l.type === 'Rinvaso / Sistemazione' && l.placement) detail = ` (${l.placement} ${l.potSize ? l.potSize + 'L' : ''})`;
                else if (l.type === 'Innesto' && l.graftName) detail = ` (Nuovo nome: ${l.graftName})`;

                let noteStr = l.note ? ` - ${l.note}` : "";
                let displayDate = typeof formatDateIt === 'function' ? formatDateIt(l.date) : l.date;
                return `[${displayDate}] ${l.type}${detail}${noteStr}`;
            }).join("\n");
        }

        let safePotSize = p.potSize || "";
        let safePrice = p.price !== undefined && p.price !== null ? p.price.toFixed(2).replace('.', ',') : "";
        let safeFertility = typeof getModernFertility === 'function' ? getModernFertility(p.autofertile) : (p.autofertile || "Sconosciuta");
        let safeMin = p.minTemp !== null && p.minTemp !== undefined ? p.minTemp.toString().replace('.', ',') : "";
        let safeMax = p.maxTemp !== null && p.maxTemp !== undefined ? p.maxTemp.toString().replace('.', ',') : "";

        let safePhMin = p.phMin !== null && p.phMin !== undefined ? p.phMin.toString().replace('.', ',') : "";
        let safePhMax = p.phMax !== null && p.phMax !== undefined ? p.phMax.toString().replace('.', ',') : "";

        let row = [
            p.name, p.scientific, safePrice, p.origin, motherName, fatherName, safeFertility, p.sowingDate,
            p.geneticFidelity, p.placement, safePotSize, p.soil,
            safePhMin, safePhMax,
            safeMin, safeMax, p.vendor, p.location, p.lat, p.lng,
            p.status === 'archived' ? 'Archiviata' : 'Attiva',
            latestHeight !== "" ? latestHeight.toString().replace('.', ',') : "",
            latestPh !== "" ? latestPh.toString().replace('.', ',') : "",
            eventsStr,
            p.notes, p.speciesNotes
        ];

        let formattedRow = row.map(field => {
            let val = field === null || field === undefined ? "" : String(field);
            if (val.search(/("|,|;|\n)/g) >= 0) {
                val = `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        }).join(";");

        csvContent += formattedRow + "\n";
    });

    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    let safeTitle = (gardenTitle || "Giardino").replace('🌿', '').trim().replace(/[^a-zA-Z0-9]/g, '_');
    
    link.setAttribute("download", `Inventario_Piante_${safeTitle}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}const firebaseConfig = {
  projectId: "gen-lang-client-0305062869",
  appId: "1:18821225703:web:037be76f6e9ebbff7c1642",
  apiKey: "AIzaSyDoQpPTgyzxcOTSlMzu3aGyPVNso6w0v1w",
  authDomain: "gen-lang-client-0305062869.firebaseapp.com",
  storageBucket: "gen-lang-client-0305062869.firebasestorage.app",
  messagingSenderId: "18821225703"
};

// Initialize Firebase
if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
  window.db = firebase.firestore();
  window.db.enablePersistence({synchronizeTabs:true}).catch(err => console.error('Persistence err:', err));
  
  window.auth = firebase.auth();
  window.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(err => console.error(err));

}

window.blobToBase64 = function(blob) {
  return new Promise((resolve, reject) => {
    if (!blob) return resolve("");
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

window.base64ToBlob = async function(base64) {
  if (!base64 || !base64.startsWith('data:')) return base64;
  try {
    const res = await fetch(base64);
    return await res.blob();
  } catch (e) {
    return null;
  }
};


window.fbSignIn = () => {
    if (window.auth) {
        const provider = new firebase.auth.GoogleAuthProvider();
        window.auth.signInWithPopup(provider).catch(err => {
            console.error(err);
            if(typeof Swal !== 'undefined') Swal.fire('Errore di accesso', err.message, 'error');
        });
    }
};

window.fbSignOut = () => {
    if (window.auth) {
        return window.auth.signOut();
    }
};

window.fbOnAuthStateChanged = (authObj, cb) => {
    if (window.auth) {
        window.auth.onAuthStateChanged(cb);
    }
};

window.fbAuth = true; // flag to let globals know

window.saveToFirebase = async function() {
  if (!window.currentUser || !window.db || !window.currentGardenId) return;
  const uid = window.currentUser.uid;
  const db = window.db;
  const gId = window.currentGardenId;

  try {
    const gardenRef = db.collection('users').doc(uid).collection('gardens').doc(gId);
    
    // settings
    await gardenRef.collection('settings').doc('metadata').set({ title: gardenTitle || '', notes: gardenNotes || '' }, { merge: true });
    await gardenRef.set({ title: gardenTitle || '', updatedAt: Date.now() }, { merge: true });

    for (let p of plantsDatabase) {
      if (!p.id) p.id = String(Date.now() + Math.random());
      const pRef = gardenRef.collection('plants').doc(String(p.id));
      const pCopy = { ...p, ownerId: uid, updatedAt: Date.now() };
      delete pCopy.logs;

      if (pCopy.photo) pCopy.photo = await window.blobToBase64(pCopy.photo);
      if (pCopy.fruitPhoto) pCopy.fruitPhoto = await window.blobToBase64(pCopy.fruitPhoto);

      await pRef.set(pCopy, { merge: true });
      
      if (p.logs && p.logs.length > 0) {
        for (let l of p.logs) {
          if (!l.id) l.id = String(Date.now() + Math.random());
          const lRef = pRef.collection('logs').doc(String(l.id));
          const lCopy = { ...l };
          if (lCopy.photos && Array.isArray(lCopy.photos)) {
            let encodedPhotos = [];
            for (let ph of lCopy.photos) {
                encodedPhotos.push(await window.blobToBase64(ph));
            }
            lCopy.photos = encodedPhotos;
          }
          await lRef.set(lCopy, { merge: true });
        }
      }
    }

    for (let e of generalExpenses) {
      if (!e.id) e.id = String(Date.now() + Math.random());
      const eRef = gardenRef.collection('expenses').doc(String(e.id));
      await eRef.set({ ...e, ownerId: uid }, { merge: true });
    }

    for (let w of wishlist) {
      if (!w.id) w.id = String(Date.now() + Math.random());
      const wRef = gardenRef.collection('wishlist').doc(String(w.id));
      const wCopy = { ...w, ownerId: uid };
      if (wCopy.photo) wCopy.photo = await window.blobToBase64(wCopy.photo);
      await wRef.set(wCopy, { merge: true });
    }
    
    if (typeof showAutoSaveToast === 'function') showAutoSaveToast();
  } catch (e) {
    console.error('Firebase save error:', e);
  }
};

window.loadFromFirebase = async function(isSilent = false) {
  if (!window.currentUser || !window.db || !window.currentGardenId) return;
  const uid = window.currentUser.uid;
  const db = window.db;
  const gId = window.currentGardenId;

  try {
    const gardenRef = db.collection('users').doc(uid).collection('gardens').doc(gId);
    
    const sysRef = gardenRef.collection('settings').doc('metadata');
    const sysDoc = await sysRef.get();
    const sysData = sysDoc.exists ? sysDoc.data() : null;

    const plRef = gardenRef.collection('plants');
    const plSnap = await plRef.get();
    let loadedPlants = [];
    for (let docSnap of plSnap.docs) {
        let pData = docSnap.data();
        let logsRef = plRef.doc(docSnap.id).collection('logs');
        let logsSnap = await logsRef.get();
        pData.logs = logsSnap.docs.map(l => l.data());
        loadedPlants.push(pData);
    }

    const expRef = gardenRef.collection('expenses');
    const expSnap = await expRef.get();
    let loadedExpenses = expSnap.docs.map(e => e.data());

    const wishRef = gardenRef.collection('wishlist');
    const wishSnap = await wishRef.get();
    let loadedWishlist = wishSnap.docs.map(w => w.data());

    gardenTitle = sysData && sysData.title ? sysData.title : "🌿 Il mio giardino";
    gardenNotes = sysData && sysData.notes ? sysData.notes : "";
    plantsDatabase = loadedPlants;
    generalExpenses = loadedExpenses;
    wishlist = loadedWishlist;

    if (typeof standardizeDatabaseIds === 'function') standardizeDatabaseIds();

    if (isSilent) {
        if (typeof finalizeSilentLoad === 'function') finalizeSilentLoad();
    } else {
        if (typeof finalizeLoad === 'function') finalizeLoad(true);
    }

  } catch (e) {
    console.error('Firebase load error:', e);
    if (!isSilent && typeof finalizeLoad === 'function') finalizeLoad(false);
  }
};
