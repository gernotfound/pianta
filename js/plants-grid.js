let currentPlantsChunkIndex = 0;
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

        if (vulnCold !== null && !isNaN(vulnCold)) {
            if (p.minTemp === undefined || p.minTemp === null || p.minTemp <= vulnCold) return false;
        }
        
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

    if (isNewSearchOrFilter) {
        currentPlantsChunkIndex = 0;
        grid.innerHTML = '';
    } else {
        grid.innerHTML = '';
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

    grid.innerHTML = '';
    
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
}