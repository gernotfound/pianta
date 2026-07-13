// ==========================================
// AZIONI DI MASSA (MACRO V2)
// ==========================================

function resetMacroView() {
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
        // FIX CRITICO: Strict comparison con stringhe UUID
        const p = plantsDatabase.find(x => String(x.id) === String(pid));
        if (!p) return;

        let specificInput = '';
        if (type === 'Misurazione') specificInput = `<input type="text" inputmode="decimal" class="m-val" placeholder="Altezza (cm)" aria-label="Altezza" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px;">`;
        else if (type === 'Misurazione pH') specificInput = `<input type="text" inputmode="decimal" class="m-val" placeholder="pH (0-14)" aria-label="pH" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px;">`;
        else if (type === 'Raccolto') specificInput = `<input type="text" class="m-val" placeholder="Quantità (es. 2kg)" aria-label="Quantità" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px;">`;
        else if (type === 'Innesto') specificInput = `<input type="text" class="m-val" placeholder="Nuova varietà" aria-label="Nome innesto" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px;">`;
        else if (type === 'Rinvaso / Sistemazione') {
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
    
    if(!date) {
        if (typeof Swal !== 'undefined') return Swal.fire({icon: 'error', title: 'Data mancante', text: "Inserisci la data dell'evento.", confirmButtonColor: '#2e7d32'});
        return;
    }

    const saveBtn = document.querySelector('#macro-step-3 button.btn:not(.btn-grey)');
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
            }
            else if (type === 'Misurazione pH') { 
                ph = typeof parseLocalFloat === 'function' ? parseLocalFloat(valEl.value) : parseFloat(valEl.value); 
                if ((ph === null || isNaN(ph)) && !note) isRowValid = false; 
                else if (ph !== null && (ph < 0 || ph > 14)) isRowValid = false; 
            }
            else if (type === 'Raccolto') { 
                harvest = valEl.value.trim(); 
                if (!harvest && !note) isRowValid = false; 
            }
            else if (type === 'Innesto') { 
                graftName = valEl.value.trim(); 
                if (!graftName) isRowValid = false; 
                else { p.name = graftName; p.origin = 'Innesto'; } 
            }
            else if (type === 'Rinvaso / Sistemazione') {
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
        
        if(typeof saveToLocal === 'function') await saveToLocal();

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

// ==========================================
// SEZIONE "I MIEI DATI" E STATISTICHE
// ==========================================

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

// ==========================================
// TRACCIAMENTO SPESE
// ==========================================

function renderExpenses() {
    const ul = document.getElementById('expenses-list');
    if(!ul) return;
    ul.innerHTML = '';
    
    if (!generalExpenses) generalExpenses = [];
    if (!plantsDatabase) plantsDatabase = [];
    
    let total = 0;
    const sortedExp = [...generalExpenses].sort((a,b) => new Date(b.date) - new Date(a.date));
    
    sortedExp.forEach(exp => {
        total += (exp.cost || 0);
        const li = document.createElement('li');
        // FIX CRITICO: Apici singoli per l'ID in formato stringa
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

    const addBtn = document.querySelector('#expenses-view .btn-purple');
    if (addBtn) { addBtn.disabled = true; addBtn.innerText = "⏳ Attendere..."; }

    try {
        if (!generalExpenses) generalExpenses = [];
        generalExpenses.push({ 
            id: typeof generateId === 'function' ? generateId() : crypto.randomUUID(), 
            date, category, desc, cost 
        });
        
        unsavedChanges = true;
        
        if(typeof saveToLocal === 'function') await saveToLocal();
        
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
    
    if(typeof saveToLocal === 'function') await saveToLocal();
    renderExpenses();
}

// ==========================================
// WISHLIST (PIANTE DESIDERATE)
// ==========================================

function initWishlistPreview() {
    const wlPhoto = document.getElementById('wl-photo');
    if (wlPhoto && !document.getElementById('wl-preview-container')) {
        let previewContainer = document.createElement('div');
        previewContainer.id = 'wl-preview-container';
        previewContainer.style.display = 'none';
        previewContainer.style.marginTop = '15px';
        previewContainer.innerHTML = `
            <img id="wl-preview-img" style="max-width:100%; height:180px; object-fit:cover; border-radius:8px; border:1px solid #ccc; display:block; margin: 0 auto;">
            <button type="button" class="btn btn-danger" style="display:block; margin: 10px auto 0 auto; width:100%;" onclick="clearWishlistPhoto()">✖ Rimuovi foto</button>
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
    if(!grid) return;
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

        // FIX CRITICO: Apici singoli per l'ID in formato stringa
        card.innerHTML = `
            <img src="${imgSrc}" onerror="this.onerror=null; this.src='${fallbackSrc}';" loading="lazy" alt="Foto Desiderio">
            <h3 style="margin:0 0 5px 0; color:var(--accent); font-size:18px;">${escapeHTML(item.name)}</h3>
            <p style="margin:0; font-size:14px; color:#555;">💰 Prezzo stimato: <strong>${priceStr}</strong></p>
            <p style="margin:5px 0 10px 0; font-size:13px; color:#666;">📝 ${escapeHTML(item.notes) || 'Nessuna nota aggiuntiva'}</p>
            <div style="margin-top:auto;">
                <button class="btn btn-danger" style="width:100%; padding:8px;" onclick="deleteWishlistItem('${item.id}')">🗑️ Rimuovi</button>
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

    const addBtn = document.querySelector('#wishlist-view .btn-warning');
    if (addBtn) { addBtn.disabled = true; addBtn.innerText = "⏳ Attendere..."; }

    try {
        let photoBlob = null;
        if (photoInput && photoInput.files && photoInput.files.length > 0) {
            try {
                if(typeof compressImageAsync === 'function') {
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
        
        if(typeof saveToLocal === 'function') await saveToLocal();

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
    
    if(typeof saveToLocal === 'function') await saveToLocal();
    renderWishlist();
}

// ==========================================
// ALLERTA METEO AUTOMATICA (DASHBOARD EVENTI)
// ==========================================

let weatherCache = new Map(); 

async function fetchWeatherData(lat, lng) {
    const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    if (weatherCache.has(cacheKey)) return weatherCache.get(cacheKey);

    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_min,wind_speed_10m_max&timezone=auto`);
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
    container.innerHTML = `<div style="text-align:center; padding:20px;"><div class="spinner"></div> Caricamento dati meteo...</div>`;

    let windAlerts = [];
    let frostAlerts = []; 

    for (const loc of locations) {
        const weather = await fetchWeatherData(loc.lat, loc.lng);
        if (!weather) continue;

        if (weather.time) {
            for (let i = 0; i < weather.time.length; i++) {
                const dateStr = weather.time[i];
                const windSpeed = weather.wind_speed_10m_max ? weather.wind_speed_10m_max[i] : 0;
                const minTemp = weather.temperature_2m_min ? weather.temperature_2m_min[i] : 99;

                const windThreshold = typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.WIND_ALERT_KMH : 40;

                if (windSpeed > windThreshold) {
                    const alreadyHasWindAlert = windAlerts.some(wa => wa.locationName === loc.name && wa.date === dateStr);
                    if (!alreadyHasWindAlert) {
                        windAlerts.push({
                            locationName: loc.name,
                            date: dateStr,
                            speed: windSpeed
                        });
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

    let html = `<div style="background: #fff; padding: 20px; border-radius: 12px; border: 1px solid #e0e0e0; margin-bottom: 25px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <h3 style="margin-top:0; color: #2e7d32; display:flex; align-items:center; gap:8px; border-bottom: 2px solid #e8f5e9; padding-bottom: 10px;">🌤️ Allerta Meteo Automatica</h3>`;

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

    if (windAlerts.length === 0 && frostAlerts.length === 0) {
        html += `<div style="color:#2e7d32; font-weight:bold; font-size:14px; padding:12px; background:#e8f5e9; border-radius:8px; border-left: 5px solid #2e7d32; display: flex; align-items: center; gap: 8px;">
                    <span>✅ Nessun rischio rilevato per vento forte (> 40 km/h) o temperature inferiori alla tolleranza delle tue piante per i prossimi 7 giorni.</span>
                 </div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
}