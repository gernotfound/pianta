function makeGridItem(icon, label, value) {
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

    let soilFull = escapeHTML(plant.soil || 'N/D');
    let phClean = '';
    if (plant.phMin !== null || plant.phMax !== null) {
        if (plant.phMin === plant.phMax) phClean = formatLocalFloat(plant.phMin);
        else if (plant.phMin !== null && plant.phMax !== null) phClean = `${formatLocalFloat(plant.phMin)} - ${formatLocalFloat(plant.phMax)}`;
        else if (plant.phMin !== null) phClean = `> ${formatLocalFloat(plant.phMin)}`;
        else if (plant.phMax !== null) phClean = `< ${formatLocalFloat(plant.phMax)}`;
    }
    if (phClean) soilFull += ` <span style="font-weight:normal; font-size:12px; color:#2e7d32;">(pH ${phClean})</span>`;

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
        detailsHtml += makeGridItem('🪨', 'Substrato', plant.soil || phClean ? soilFull : null);
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
                archiveBtn.className = 'btn btn-danger';
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
            console.error("Errore cancellazione:", err);
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
                console.error("Errore ripristino:", err);
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
                console.error("Errore archiviazione:", err);
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

    const btnContainer = document.querySelector('#duplicate-modal-overlay .btn-blue');
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
            Swal.fire({icon: 'success', title: 'Piante clonate', text: `Hai clonato con successo ${qty} piante.`, timer: 2000, showConfirmButton: false});
        }
    } catch (err) {
        console.error("Errore clonazione:", err);
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
        if (typeof showAutoSaveToast === 'function') showAutoSaveToast('Nota salvata');
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
        if (typeof showAutoSaveToast === 'function') showAutoSaveToast('Nota specie salvata');
    }
}