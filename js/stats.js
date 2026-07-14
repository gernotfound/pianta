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

function initMap(plant) {
    if (typeof L === 'undefined') {
        const container = document.getElementById('map-container');
        if (container) container.innerHTML = '<div style="padding:20px;text-align:center;color:#666;font-size:14px;">Mappa offline o non disponibile.</div>';
        return;
    }
    
    if (!plant) return;

    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) return;

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
            console.error(e);
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
    if (typeof L === 'undefined') {
        const container = document.getElementById('form-map-container');
        if (container) container.innerHTML = '<div style="padding:20px;text-align:center;color:#666;font-size:14px;">Mappa offline o non disponibile.</div>';
        return;
    }

    const formMapContainer = document.getElementById('form-map-container');
    if (!formMapContainer) return;

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
        }
    } else {
        formMap.setView([lat, lng], zoom);
    }
    
    if (formMarker) formMap.removeLayer(formMarker);
    if (latInput && lngInput && !isNaN(lat) && !isNaN(lng)) {
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
    if (typeof L === 'undefined' || typeof L.markerClusterGroup === 'undefined') {
        const container = document.getElementById('global-map-fullscreen');
        if (container) container.innerHTML = '<div style="padding:40px;text-align:center;color:#666;font-size:16px;">Mappa globale offline o file dipendenze non caricati.</div>';
        return;
    }

    const container = document.getElementById('global-map-fullscreen');
    if (!container) return;

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