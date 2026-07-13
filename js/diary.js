// ==========================================
// GESTIONE FORM DIARIO (UI Dinamica)
// ==========================================

function toggleLogPotSize() {
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

// ==========================================
// LOGICA EVENTI DEL DIARIO
// ==========================================

async function addDiaryLog() {
    const dateEl = document.getElementById('log-date');
    const typeEl = document.getElementById('log-type');
    const noteEl = document.getElementById('log-note');

    const date = dateEl ? dateEl.value : ''; 
    const type = typeEl ? typeEl.value : 'Misurazione'; 
    const note = noteEl ? noteEl.value.trim() : '';

    let height = null; let harvest = null; let ph = null; let newPlacement = null; let newPotSize = null; let graftName = null;

    if(!date) {
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

    if (type === 'Innesto') {
        graftName = document.getElementById('log-graft-name') ? document.getElementById('log-graft-name').value.trim() : ''; 
        if (graftName === '') {
            if (typeof Swal !== 'undefined') return Swal.fire({icon: 'error', title: 'Errore', text: "Inserisci il nuovo nome della pianta innestata.", confirmButtonColor: '#2e7d32'});
            return;
        }
        
        // Strict Comparison (UUID)
        let nameExists = plantsDatabase.some(p => (p.name || '').toLowerCase() === graftName.toLowerCase() && p.id !== currentPlantId); 
        if (nameExists) {
            if (typeof Swal !== 'undefined') return Swal.fire({icon: 'error', title: 'Errore', text: `Esiste già una pianta salvata con il nome "${escapeHTML(graftName)}".`, confirmButtonColor: '#2e7d32'});
            return;
        }
        
        const plant = plantsDatabase.find(p => p.id === currentPlantId); 
        if(plant) {
            plant.name = graftName; 
            plant.origin = 'Innesto';
        }
    }
    
    if (type === 'Rinvaso / Sistemazione') { 
        newPlacement = document.getElementById('log-placement') ? document.getElementById('log-placement').value : 'Vaso'; 
        const potVal = document.getElementById('log-pot-size') ? document.getElementById('log-pot-size').value : '';
        newPotSize = typeof parseLocalFloat === 'function' ? parseLocalFloat(potVal) : parseFloat(potVal); 
        
        const plant = plantsDatabase.find(p => p.id === currentPlantId); 
        if(plant) {
            plant.placement = newPlacement; 
            plant.potSize = newPotSize; 
        }
    }
    
    if(!note && type !== 'Misurazione' && type !== 'Raccolto' && type !== 'Misurazione pH' && type !== 'Rinvaso / Sistemazione' && type !== 'Innesto') { 
        if (typeof Swal !== 'undefined') return Swal.fire({icon: 'error', title: 'Dati mancanti', text: "Inserisci una nota descrittiva dell'evento.", confirmButtonColor: '#2e7d32'}); 
        return;
    }

    const saveBtn = document.querySelector('.diary-section button[onclick="addDiaryLog()"]');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerText = "⏳ Salvataggio...";
    }

    try {
        const photoInput = document.getElementById('log-photos'); 
        let photosArray = [];
        
        if (photoInput && photoInput.files && photoInput.files.length > 0) { 
            let compressionPromises = []; 
            for(let i = 0; i < photoInput.files.length; i++) { 
                if(typeof compressImageAsync === 'function') {
                    compressionPromises.push(compressImageAsync(photoInput.files[i]).catch(err => {
                        console.error("Errore compressione foto log:", err);
                        return null;
                    }));
                } else {
                    compressionPromises.push(Promise.resolve(photoInput.files[i]));
                }
            } 
            let results = await Promise.all(compressionPromises); 
            photosArray = results.filter(r => r !== null);
        } 
        
        await finalizeDiaryLog(date, type, note, height, harvest, ph, newPlacement, newPotSize, graftName, photosArray); 
        
    } catch (err) {
        console.error("Errore salvataggio diario:", err);
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
    const plant = plantsDatabase.find(p => p.id === currentPlantId);
    if (!plant) return;
    
    if (!Array.isArray(plant.logs)) plant.logs = [];

    plant.logs.push({ 
        // L'ID del diario diventa ora un UUID sicuro
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
    
    if(typeof saveToLocal === 'function') await saveToLocal(); 
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
        if(typeof _internalOpenPlantDetail === 'function') _internalOpenPlantDetail(currentPlantId); 
    } else {
        if(typeof renderTimeline === 'function') renderTimeline(plant); 
        if(typeof updateYearDropdown === 'function') updateYearDropdown(plant); 
        if(typeof renderCharts === 'function') renderCharts(plant);
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
    
    if(res.isConfirmed) {
        if (!plantsDatabase) return;
        const plant = plantsDatabase.find(p => p.id === currentPlantId); 
        if (!plant || !plant.logs) return;

        // Strict Comparison (UUID come stringhe, addio parseInt)
        const logToDelete = plant.logs.find(l => l.id === logId);
        
        if (logToDelete && typeof revokeBlob === 'function') {
            if (logToDelete.photos && Array.isArray(logToDelete.photos)) {
                logToDelete.photos.forEach(ph => revokeBlob(ph));
            }
        }

        plant.logs = plant.logs.filter(l => l.id !== logId); 
        unsavedChanges = true; 
        
        if(typeof saveToLocal === 'function') await saveToLocal(); 
        
        if(typeof renderTimeline === 'function') renderTimeline(plant); 
        if(typeof updateYearDropdown === 'function') updateYearDropdown(plant); 
        if(typeof renderCharts === 'function') renderCharts(plant);
    }
}

// ==========================================
// RENDERIZZAZIONE TIMELINE
// ==========================================

function renderTimeline(plant) {
    const ul = document.getElementById('detail-timeline'); 
    if (!ul) return;
    ul.innerHTML = '';
    
    if (!plant || !plant.logs || !Array.isArray(plant.logs)) return;
    
    const sortedLogs = [...plant.logs].sort((a,b) => new Date(b.date) - new Date(a.date));
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

        // Niente più fallback a vecchie `log.photo`, lavoriamo solo con l'architettura pura
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
        
        // FIX CRITICO PER GLI UUID: Aggiunti gli apici singoli all'id nel bottone onclick ('${log.id}')
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
}