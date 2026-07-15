let formMap = null;
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
}