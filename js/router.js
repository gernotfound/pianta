let currentTab = 'home';
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
        currentTab = 'home';
        homeTabState = { view: 'home', param: null };
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
        currentTab = 'plants';
        plantsTabState = { view: 'plants', param: null };
        history.replaceState({ view: 'plants' }, '', '#/plants');
        executeTabSwitch('plants');
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
        'startup-screen', 'garden-selection-screen', 'home-view', 'dashboard', 'settings-view',
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
}