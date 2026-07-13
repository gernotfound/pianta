// ==========================================
// VARIABILI DI STATO DEL ROUTER
// ==========================================
let currentTab = 'home';
let homeTabState = { view: 'dashboard', param: null };
let dataTabState = { view: 'data', param: null };
let currentAppRoute = window.location.hash || '#/dashboard'; 

// ==========================================
// ROUTER MULTITASKING (Vera App Nativa)
// ==========================================
function initRouter(hasData) {
    window.addEventListener('popstate', async (e) => {
        let intendedState = e.state;
        let intendedHash = window.location.hash;

        // FIX FASE 3: Pulizia modali bloccanti.
        // Se l'utente usa la gesture "indietro" del telefono, dobbiamo assicurarci
        // di distruggere i popup (Cropper, Immagini Fullscreen) liberando la UI e la RAM.
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
                if(typeof clearForm === 'function') clearForm();
                
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
        history.replaceState({ view: 'dashboard' }, '', '#/dashboard');
        executeTabSwitch('dashboard');
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
    
    const validViews = ['dashboard', 'data', 'expenses', 'wishlist', 'gallery', 'archive', 'add-plant', 'map', 'scanner', 'plant-detail', 'edit-plant', 'events', 'macro'];
    
    if (validViews.includes(view)) {
        restoreTabState(view, param);
        history.replaceState({ view, param }, '', window.location.hash);
        executeTabSwitch(view, param);
    } else {
        history.replaceState({ view: 'dashboard' }, '', '#/dashboard');
        executeTabSwitch('dashboard');
    }
}

function restoreTabState(view, param) {
    if (['dashboard', 'plant-detail'].includes(view)) {
        currentTab = 'home';
        homeTabState = { view, param };
    } else if (['data', 'expenses', 'wishlist', 'gallery', 'archive', 'scanner'].includes(view)) {
        currentTab = 'data';
        dataTabState = { view, param };
    } else if (view === 'add-plant' || view === 'edit-plant') {
        currentTab = 'add-plant';
    } else if (view === 'events') {
        currentTab = 'events';
    } else if (view === 'map') {
        currentTab = 'map';
    } else if (view === 'macro') {
        currentTab = 'macro';
    }
}

function goToHomeTab() {
    if (currentTab === 'home') {
        if (homeTabState.view === 'dashboard') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            homeTabState = { view: 'dashboard', param: null };
            history.pushState({ view: 'dashboard' }, '', '#/dashboard');
            executeTabSwitch('dashboard');
        }
    } else {
        currentTab = 'home';
        let targetUrl = `#/${homeTabState.view}${homeTabState.param ? '/' + homeTabState.param : ''}`;
        history.pushState(homeTabState, '', targetUrl);
        executeTabSwitch(homeTabState.view, homeTabState.param);
    }
}

function navigateTab(tab) {
    if (tab === 'home') {
        goToHomeTab();
    } else if (tab === 'add-plant') {
        currentTab = 'add-plant';
        if (!isFormDirty && !editingMode) {
            if(typeof _internalOpenPlantForm === 'function') _internalOpenPlantForm();
        }
        history.pushState({ view: 'add-plant' }, '', '#/add-plant');
        executeTabSwitch('add-plant');
    } else if (tab === 'data') {
        currentTab = 'data';
        let targetUrl = `#/${dataTabState.view}${dataTabState.param ? '/' + dataTabState.param : ''}`;
        history.pushState(dataTabState, '', targetUrl);
        executeTabSwitch(dataTabState.view, dataTabState.param);
    } else {
        currentTab = tab;
        history.pushState({ view: tab }, '', `#/${tab}`);
        executeTabSwitch(tab);
    }
}

function navigateTo(view, param = null) {
    const dashboardEl = document.getElementById('dashboard');
    if (dashboardEl && !dashboardEl.classList.contains('hidden')) {
        lastScrollPosition = window.scrollY || document.documentElement.scrollTop;
    }
    
    const myDataPageEl = document.getElementById('my-data-page');
    if (myDataPageEl && !myDataPageEl.classList.contains('hidden')) {
        dataScrollPosition = window.scrollY || document.documentElement.scrollTop;
    }
    
    if (['plant-detail', 'edit-plant'].includes(view)) {
        currentTab = 'home';
        homeTabState = { view, param };
    } else if (['expenses', 'wishlist', 'gallery', 'archive', 'scanner'].includes(view)) {
        currentTab = 'data';
        dataTabState = { view, param };
    }

    history.pushState({ view, param }, '', `#/${view}${param ? '/' + param : ''}`);
    executeTabSwitch(view, param);
}

function goBack() {
    if (currentTab === 'home') {
        homeTabState = { view: 'dashboard', param: null };
        history.pushState(homeTabState, '', '#/dashboard');
        executeTabSwitch('dashboard');
    } else if (currentTab === 'data') {
        dataTabState = { view: 'data', param: null };
        history.pushState(dataTabState, '', '#/data');
        executeTabSwitch('data');
    } else {
        goToHomeTab(); 
    }
}

function executeTabSwitch(view, param = null) {
    window.appInitialized = true; 
    currentAppRoute = window.location.hash; 

    const views = [
        'startup-screen', 'dashboard', 'my-data-page', 'expenses-view', 'wishlist-view', 
        'gallery-view', 'archive-page', 'plant-detail-view',
        'form-container', 'global-map-page', 'labels-scanner-view', 'events-view', 'macro-view'
    ];
    
    views.forEach(v => {
        const el = document.getElementById(v);
        if(el) el.classList.add('hidden');
    });

    if (view !== 'scanner' && typeof html5QrcodeScanner !== 'undefined' && html5QrcodeScanner) {
        try {
            if (html5QrcodeScanner.getState && html5QrcodeScanner.getState() !== 1) { 
                html5QrcodeScanner.clear().then(() => {
                    html5QrcodeScanner = null;
                }).catch(e => {
                    console.warn("Spegnimento hardware forzato fotocamera ignorato", e);
                    html5QrcodeScanner = null;
                });
            } else {
                html5QrcodeScanner = null;
            }
        } catch (e) {
            html5QrcodeScanner = null;
        }
    }

    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    if (currentTab === 'home') { document.getElementById('nav-btn-dashboard')?.classList.add('active'); }
    else if (currentTab === 'add-plant') { document.getElementById('nav-btn-add-plant')?.classList.add('active'); }
    else if (currentTab === 'data') { document.getElementById('nav-btn-data')?.classList.add('active'); }
    else if (currentTab === 'events') { document.getElementById('nav-btn-events')?.classList.add('active'); }
    else if (currentTab === 'map') { document.getElementById('nav-btn-map')?.classList.add('active'); }
    else if (currentTab === 'macro') { document.getElementById('nav-btn-macro')?.classList.add('active'); }

    let targetId = '';
    switch (view) {
        case 'startup': targetId = 'startup-screen'; break;
        case 'dashboard': targetId = 'dashboard'; break;
        case 'data': targetId = 'my-data-page'; break;
        case 'archive': targetId = 'archive-page'; break;
        case 'add-plant': 
        case 'edit-plant': targetId = 'form-container'; break;
        case 'map': targetId = 'global-map-page'; break;
        case 'scanner': targetId = 'labels-scanner-view'; break;
        default: 
            targetId = view + '-view'; 
            break;
    }

    const targetViewEl = document.getElementById(targetId);
    if (targetViewEl) {
        targetViewEl.classList.remove('hidden');
    }

    switch(view) {
        case 'dashboard':
            if (typeof renderPlants === 'function') renderPlants();
            setTimeout(() => { window.scrollTo({ top: lastScrollPosition || 0, behavior: 'instant' }); }, 10);
            break;
            
        case 'events':
            if(typeof renderGlobalChart === 'function') renderGlobalChart();
            if(typeof renderWeatherDashboard === 'function') renderWeatherDashboard();
            window.scrollTo({ top: 0, behavior: 'instant' });
            break;

        case 'data':
            const globalNotes = document.getElementById('global-garden-notes');
            if(globalNotes && typeof gardenNotes !== 'undefined') globalNotes.value = gardenNotes || ""; 
            if(typeof renderMyData === 'function') renderMyData();
            setTimeout(() => { window.scrollTo({ top: dataScrollPosition || 0, behavior: 'instant' }); }, 10);
            break;

        case 'expenses':
            if (typeof getLocalYYYYMMDD === 'function') { 
                const expDateEl = document.getElementById('exp-date');
                if (expDateEl) expDateEl.value = getLocalYYYYMMDD(); 
            } 
            if(typeof renderExpenses === 'function') renderExpenses();
            window.scrollTo({ top: 0, behavior: 'instant' });
            break;

        case 'wishlist':
            if(typeof renderWishlist === 'function') renderWishlist();
            window.scrollTo({ top: 0, behavior: 'instant' });
            break;

        case 'gallery':
            if(typeof renderGallery === 'function') renderGallery();
            window.scrollTo({ top: 0, behavior: 'instant' });
            break;

        case 'archive':
            if(typeof renderArchive === 'function') renderArchive();
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
            if(typeof renderGlobalMapFullscreen === 'function') renderGlobalMapFullscreen();
            window.scrollTo({ top: 0, behavior: 'instant' });
            break;

        case 'macro':
            if(typeof resetMacroView === 'function') resetMacroView();
            window.scrollTo({ top: 0, behavior: 'instant' });
            break;

        case 'scanner':
            if(typeof startScanner === 'function') startScanner();
            window.scrollTo({ top: 0, behavior: 'instant' });
            break;
            
        case 'plant-detail':
            if(param && typeof _internalOpenPlantDetail === 'function') _internalOpenPlantDetail(param);
            setTimeout(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, 10);
            setTimeout(() => { if (typeof map !== 'undefined' && map) map.invalidateSize(); }, 450);
            break;
    }
}