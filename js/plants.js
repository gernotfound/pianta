// ==========================================
// GESTIONE FORM PIANTE (UI Dinamica)
// ==========================================
function toggleFidelityField() {
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
        input.style.display = 'none'; select.style.display = 'block'; btn.innerText = '➕ Nuovo'; 
    } else { 
        select.style.display = 'none'; input.style.display = 'block'; btn.innerText = '🔄 Storico'; 
    }
}
function toggleVendorMode() { setVendorMode(vendorMode === 'select' ? 'input' : 'select'); }

function setSoilMode(mode) {
    soilMode = mode; 
    const select = document.getElementById('p-soil-select'); 
    const input = document.getElementById('p-soil-input'); 
    const btn = document.getElementById('btn-toggle-soil');
    if (!select || !input || !btn) return;

    if (mode === 'select') { 
        input.style.display = 'none'; select.style.display = 'block'; btn.innerText = '➕ Nuovo'; 
    } else { 
        select.style.display = 'none'; input.style.display = 'block'; btn.innerText = '🔄 Storico'; 
    }
}
function toggleSoilMode() { setSoilMode(soilMode === 'select' ? 'input' : 'select'); }

function setScientificMode(mode) {
    scientificMode = mode; 
    const select = document.getElementById('p-scientific-select'); 
    const input = document.getElementById('p-scientific-input'); 
    const btn = document.getElementById('btn-toggle-scientific');
    if (!select || !input || !btn) return;

    if (mode === 'select') { 
        input.style.display = 'none'; select.style.display = 'block'; btn.innerText = '➕ Nuovo'; 
    } else { 
        select.style.display = 'none'; input.style.display = 'block'; btn.innerText = '🔄 Storico'; 
    }
}
function toggleScientificMode() { setScientificMode(scientificMode === 'select' ? 'input' : 'select'); }

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
function toggleLocationMode() { setLocationMode(locationMode === 'select' ? 'input' : 'select'); }

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

function resetFiltersAndSearch() {
    ['filter-placement', 'filter-origin', 'filter-fertility', 'filter-survival-temp', 'search-plant'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (el.tagName === 'SELECT') {
                el.value = 'all';
            } else {
                el.value = '';
            }
        }
    });
    const sortEl = document.getElementById('sort-plants');
    if (sortEl) sortEl.value = 'name';
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
    
    const availableParents = plantsDatabase.filter(p => p.id !== currentPlantId).sort((a,b) => (a.name || '').localeCompare(b.name || ''));
    availableParents.forEach(p => {
        if (motherSelect) {
            const optM = document.createElement('option'); 
            optM.value = p.id; 
            optM.innerText = escapeHTML(p.name) + (p.status === 'archived' ? ' (archiviata)' : ''); 
            motherSelect.appendChild(optM);
        }
        if (fatherSelect) {
            const optF = document.createElement('option'); 
            optF.value = p.id; 
            optF.innerText = escapeHTML(p.name) + (p.status === 'archived' ? ' (archiviata)' : ''); 
            fatherSelect.appendChild(optF);
        }
    });

    const vendorSelect = document.getElementById('p-vendor-select');
    if (vendorSelect) {
        const vendors = [...new Set(plantsDatabase.map(p => p.vendor).filter(v => v && v.trim() !== ''))];
        vendorSelect.innerHTML = '<option value="">-- Seleziona fornitore --</option>';
        if (vendors.length === 0) vendorSelect.innerHTML = '<option value="">Nessun fornitore salvato</option>';
        else vendors.forEach(v => { const opt = document.createElement('option'); opt.value = escapeHTML(v); opt.innerText = v.length > 40 ? escapeHTML(v.substring(0, 40)) + '...' : escapeHTML(v); vendorSelect.appendChild(opt); });
    }

    const soilSelect = document.getElementById('p-soil-select');
    if (soilSelect) {
        const soils = [...new Set(plantsDatabase.map(p => p.soil).filter(s => s && s.trim() !== ''))];
        soilSelect.innerHTML = '<option value="">-- Seleziona substrato --</option>';
        if (soils.length === 0) soilSelect.innerHTML = '<option value="">Nessun substrato salvato</option>';
        else soils.forEach(s => { const opt = document.createElement('option'); opt.value = escapeHTML(s); opt.innerText = s.length > 40 ? escapeHTML(s.substring(0, 40)) + '...' : escapeHTML(s); soilSelect.appendChild(opt); });
    }

    const scientificSelect = document.getElementById('p-scientific-select');
    if (scientificSelect) {
        const scientifics = [...new Set(plantsDatabase.map(p => p.scientific).filter(v => v && v.trim() !== ''))].sort();
        scientificSelect.innerHTML = '<option value="">-- Seleziona o lascia vuoto --</option>';
        if (scientifics.length === 0) scientificSelect.innerHTML = '<option value="">Nessun nome scientifico salvato</option>';
        else scientifics.forEach(s => { const opt = document.createElement('option'); opt.value = escapeHTML(s); opt.innerText = escapeHTML(s); scientificSelect.appendChild(opt); });
    }

    const locSelect = document.getElementById('p-location-select');
    if (locSelect) {
        const locs = []; const signatures = new Set();
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
        locs.forEach((l, index) => {
            const opt = document.createElement('option'); opt.value = index + 1; 
            let text = l.loc || 'Luogo senza nome'; 
            if (l.lat !== null && l.lng !== null && l.lat !== undefined && l.lng !== undefined) text += ` (${l.lat}, ${l.lng})`;
            opt.innerText = escapeHTML(text); 
            opt.dataset.loc = l.loc || ''; 
            opt.dataset.lat = l.lat !== null && l.lat !== undefined ? l.lat : ''; 
            opt.dataset.lng = l.lng !== null && l.lng !== undefined ? l.lng : ''; 
            locSelect.appendChild(opt);
        });
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

// ==========================================
// CRUD PIANTE (Crea, Leggi, Aggiorna, Elimina)
// ==========================================
function _internalOpenPlantForm() {
    editingMode = false; 
    currentPlantId = null; 
    isFormDirty = false; 
    
    const formTitle = document.getElementById('form-title');
    if(formTitle) formTitle.innerText = "Aggiungi nuova pianta";
    
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
        if(typeof initFormMap === 'function') initFormMap();
    }, 150);
}

function clearForm() {
    document.querySelectorAll('#form-container input, #form-container textarea, #form-container select').forEach(el => { 
        if (!['p-origin', 'p-placement', 'p-genetic-fidelity', 'search-plant', 'filter-survival-temp'].includes(el.id)) { 
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
    if(autofertileEl) autofertileEl.value = 'Sconosciuta';
    
    if(document.getElementById('detail-plant-notes')) document.getElementById('detail-plant-notes').value = '';
    if(document.getElementById('detail-species-notes')) document.getElementById('detail-species-notes').value = '';

    mainPhotoRemoved = false; 
    fruitPhotoRemoved = false; 
    
    if (window.smartCropBlobs) { 
        if (window.smartCropBlobs.main && typeof revokeBlob === 'function') revokeBlob(window.smartCropBlobs.main);
        if (window.smartCropBlobs.fruit && typeof revokeBlob === 'function') revokeBlob(window.smartCropBlobs.fruit);
        window.smartCropBlobs = { main: null, fruit: null }; 
    }
    
    ['main', 'fruit'].forEach(type => {
        const preview = document.getElementById('preview-' + type);
        if(preview) { 
            preview.src = ''; 
            preview.style.display = 'none'; 
        }
        const placeholder = document.getElementById('placeholder-' + type);
        if(placeholder) placeholder.style.display = 'flex';
        const removeBtn = document.getElementById('remove-btn-' + type);
        if(removeBtn) removeBtn.style.display = 'none';
        
        let hiddenInput = document.getElementById(type === 'main' ? 'p-photo-hidden' : 'p-fruit-photo-hidden');
        if(hiddenInput) hiddenInput.value = '';
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

    const currentPlantIdNum = currentPlantId ? parseInt(currentPlantId, 10) : null;

    let nameExists = plantsDatabase.some(p => p.name.toLowerCase() === newName.toLowerCase() && p.id !== currentPlantIdNum);
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
    let phOttimale = document.getElementById('p-ph') ? parseLocalFloat(document.getElementById('p-ph').value) : null;
    let potSize = document.getElementById('p-pot-size') ? parseLocalFloat(document.getElementById('p-pot-size').value) : null;
    let minTemp = document.getElementById('p-min-temp') ? parseLocalFloat(document.getElementById('p-min-temp').value) : null;
    let maxTemp = document.getElementById('p-max-temp') ? parseLocalFloat(document.getElementById('p-max-temp').value) : null;
    
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
        let finalMainPhoto = ""; let finalFruitPhoto = "";

        if (editingMode && currentPlantIdNum !== null) {
            let plantToClean = plantsDatabase.find(x => x.id === currentPlantIdNum);
            if (plantToClean) {
                if ((window.smartCropBlobs && window.smartCropBlobs['main']) || mainPhotoRemoved) {
                    if (plantToClean.photo && typeof revokeBlob === 'function') revokeBlob(plantToClean.photo);
                }
                if ((window.smartCropBlobs && window.smartCropBlobs['fruit']) || fruitPhotoRemoved) {
                    if (plantToClean.fruitPhoto && typeof revokeBlob === 'function') revokeBlob(plantToClean.fruitPhoto);
                }
            }
        }

        if (window.smartCropBlobs && window.smartCropBlobs['main']) { 
            finalMainPhoto = window.smartCropBlobs['main']; 
        } else if (editingMode && currentPlantIdNum !== null && !mainPhotoRemoved) { 
            let p = plantsDatabase.find(x => x.id === currentPlantIdNum);
            finalMainPhoto = p ? p.photo || "" : ""; 
        }
        
        if (window.smartCropBlobs && window.smartCropBlobs['fruit']) { 
            finalFruitPhoto = window.smartCropBlobs['fruit']; 
        } else if (editingMode && currentPlantIdNum !== null && !fruitPhotoRemoved) { 
            let p = plantsDatabase.find(x => x.id === currentPlantIdNum);
            finalFruitPhoto = p ? p.fruitPhoto || "" : ""; 
        }

        let savedPlantId = (editingMode && currentPlantIdNum !== null) ? currentPlantIdNum : (typeof generateNumericId === 'function' ? generateNumericId() : Date.now());
        
        const originVal = document.getElementById('p-origin') ? document.getElementById('p-origin').value : 'Da seme';
        const fidelityVal = document.getElementById('p-genetic-fidelity') ? document.getElementById('p-genetic-fidelity').value : 'Non ancora valutato';
        const placementVal = document.getElementById('p-placement') ? document.getElementById('p-placement').value : 'Vaso';
        const sowingDateVal = document.getElementById('p-sowing-date') ? document.getElementById('p-sowing-date').value : '';
        
        const motherEl = document.getElementById('p-mother');
        let motherVal = motherEl && motherEl.value ? parseInt(motherEl.value, 10) : '';
        const fatherEl = document.getElementById('p-father');
        let fatherVal = fatherEl && fatherEl.value ? parseInt(fatherEl.value, 10) : '';

        if (editingMode && currentPlantIdNum !== null) {
            let index = plantsDatabase.findIndex(p => p.id === currentPlantIdNum);
            if (index > -1) {
                plantsDatabase[index].name = newName; 
                plantsDatabase[index].scientific = finalScientific; 
                plantsDatabase[index].price = finalPrice;
                plantsDatabase[index].origin = originVal; 
                plantsDatabase[index].autofertile = autofertileVal;
                plantsDatabase[index].sowingDate = sowingDateVal; 
                plantsDatabase[index].geneticFidelity = fidelityVal; 
                plantsDatabase[index].placement = placementVal; 
                plantsDatabase[index].potSize = potSize; 
                plantsDatabase[index].soil = finalSoil; 
                plantsDatabase[index].phOttimale = phOttimale; 
                plantsDatabase[index].vendor = finalVendor; 
                plantsDatabase[index].location = finalLocation; 
                plantsDatabase[index].lat = lat; 
                plantsDatabase[index].lng = lng; 
                plantsDatabase[index].photo = finalMainPhoto; 
                plantsDatabase[index].fruitPhoto = finalFruitPhoto; 
                plantsDatabase[index].mother = motherVal; 
                plantsDatabase[index].father = fatherVal; 
                plantsDatabase[index].minTemp = minTemp; 
                plantsDatabase[index].maxTemp = maxTemp;
            }
        } else {
            const plantData = {
                id: savedPlantId, name: newName, scientific: finalScientific, price: finalPrice, origin: originVal, autofertile: autofertileVal,
                sowingDate: sowingDateVal, geneticFidelity: fidelityVal, placement: placementVal, 
                potSize: potSize, soil: finalSoil, phOttimale: phOttimale, vendor: finalVendor, location: finalLocation, notes: '', speciesNotes: '', 
                lat: lat, lng: lng, photo: finalMainPhoto, fruitPhoto: finalFruitPhoto, status: 'active', logs: [], mother: motherVal, father: fatherVal, minTemp: minTemp, maxTemp: maxTemp
            };
            plantsDatabase.push(plantData);
        }
        
        unsavedChanges = true; 
        
        if(typeof saveToLocal === 'function') await saveToLocal(); 
        isFormDirty = false; 
        
        let wasEditing = editingMode;
        editingMode = false;
        currentPlantId = null;

        if(typeof AppState !== 'undefined') AppState.emit('plantsUpdated');
        
        // IL POPUP SWEETALERT DI SUCCESSO È STATO RIMOSSO PER EVITARE DUPLICATI
        // CI PENSERÀ IL TOAST PWA "SALVATO" A DARE IL FEEDBACK!
        
        if(typeof navigateTo === 'function') {
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

function editCurrentPlant() { navigateTo('edit-plant', currentPlantId); }

function _internalEditPlant(id) {
    if (!plantsDatabase) return;
    const parsedId = parseInt(id, 10);
    const plant = plantsDatabase.find(p => p.id === parsedId);
    if(!plant) { 
        if(typeof goToHomeTab === 'function') goToHomeTab(); 
        else window.history.back(); 
        return; 
    }
    
    currentPlantId = plant.id; 
    editingMode = true; 
    isFormDirty = false; 
    
    const formTitle = document.getElementById('form-title');
    if(formTitle) formTitle.innerText = "Modifica dettagli pianta";

    clearForm(); 
    populateFormHelpers();
    
    const fields = {
        'p-name': plant.name,
        'p-price': formatLocalFloat(plant.price),
        'p-sowing-date': plant.sowingDate || '',
        'p-genetic-fidelity': plant.geneticFidelity || 'Non ancora valutato',
        'p-autofertile': getModernFertility(plant.autofertile),
        'p-mother': plant.mother !== undefined && plant.mother !== null ? plant.mother : '',
        'p-father': plant.father !== undefined && plant.father !== null ? plant.father : '',
        'p-min-temp': formatLocalFloat(plant.minTemp),
        'p-max-temp': formatLocalFloat(plant.maxTemp),
        'p-placement': plant.placement || 'Vaso',
        'p-pot-size': formatLocalFloat(plant.potSize),
        'p-ph': formatLocalFloat(plant.phOttimale),
        'p-lat': formatLocalFloat(plant.lat),
        'p-lng': formatLocalFloat(plant.lng)
    };

    for (const [key, val] of Object.entries(fields)) {
        const el = document.getElementById(key);
        if (el) el.value = val;
    }
    
    const originSelect = document.getElementById('p-origin'); 
    if (originSelect) {
        let oldOrigin = plant.origin || plant.type || 'Da seme'; 
        originSelect.value = Array.from(originSelect.options).some(opt => opt.value === oldOrigin) ? oldOrigin : 'Non so / Altro'; 
        toggleFidelityField();
    }
    
    if(plant.vendor) { 
        setVendorMode('select'); 
        if (document.getElementById('p-vendor-select')) document.getElementById('p-vendor-select').value = plant.vendor; 
        if (document.getElementById('p-vendor-input')) document.getElementById('p-vendor-input').value = plant.vendor; 
    } else { setVendorMode('select'); }
    
    if(plant.soil) { 
        setSoilMode('select'); 
        if (document.getElementById('p-soil-select')) document.getElementById('p-soil-select').value = plant.soil; 
        if (document.getElementById('p-soil-input')) document.getElementById('p-soil-input').value = plant.soil; 
    } else { setSoilMode('select'); }
    
    if (plant.scientific) { 
        setScientificMode('select'); 
        let sel = document.getElementById('p-scientific-select');
        if (sel) {
            let found = Array.from(sel.options).some(opt => opt.value === plant.scientific);
            if(found) {
                sel.value = plant.scientific;
                if(document.getElementById('p-scientific-input')) document.getElementById('p-scientific-input').value = plant.scientific; 
            } else {
                setScientificMode('input');
                if(document.getElementById('p-scientific-input')) document.getElementById('p-scientific-input').value = plant.scientific;
            }
        }
    } else { setScientificMode('select'); }

    if (plant.location || (plant.lat !== null && plant.lng !== null && plant.lat !== undefined && plant.lng !== undefined)) {
        setLocationMode('select');
        let sel = document.getElementById('p-location-select');
        if (sel) {
            let found = false;
            for(let i=1; i<sel.options.length; i++) {
                if(sel.options[i].dataset.loc === (plant.location || '') && 
                   formatLocalFloat(sel.options[i].dataset.lat) === formatLocalFloat(plant.lat) && 
                   formatLocalFloat(sel.options[i].dataset.lng) === formatLocalFloat(plant.lng)) {
                    sel.selectedIndex = i;
                    found = true;
                    break;
                }
            }
            if(!found) {
                setLocationMode('input');
                if(document.getElementById('p-location-input')) document.getElementById('p-location-input').value = plant.location || '';
            } else {
                if(document.getElementById('p-location-input')) document.getElementById('p-location-input').value = plant.location || '';
                fillSavedLocation(); 
            }
        }
    } else { setLocationMode('select'); }

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
    
    const firstAccItem = document.querySelector('.accordion-item');
    if (firstAccItem && !firstAccItem.classList.contains('open')) {
        firstAccItem.classList.add('open');
        const content = firstAccItem.querySelector('.accordion-content');
        if (content) content.style.display = 'block';
    }

    setTimeout(() => {
        if(typeof initFormMap === 'function') initFormMap();
    }, 150);
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
    
    if(res.isConfirmed) {
        if (!plantsDatabase) return;
        
        const deleteBtn = document.querySelector('button[onclick="deleteCurrentPlant()"]');
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.innerText = "⏳ Cancellazione...";
        }

        try {
            const currentPlantIdNum = parseInt(currentPlantId, 10);
            const plantToDelete = plantsDatabase.find(p => p.id === currentPlantIdNum);
            
            if (plantToDelete && typeof cleanupPlantImages === 'function') {
                cleanupPlantImages(plantToDelete); 
            }

            plantsDatabase.forEach(p => {
                if (p.mother === currentPlantIdNum) p.mother = '';
                if (p.father === currentPlantIdNum) p.father = '';
            });

            plantsDatabase = plantsDatabase.filter(p => p.id !== currentPlantIdNum); 
            unsavedChanges = true; 
            
            if(typeof saveToLocal === 'function') await saveToLocal(); 
            
            isFormDirty = false; 
            
            if(typeof AppState !== 'undefined') AppState.emit('plantsUpdated'); 
            if(typeof goToHomeTab === 'function') goToHomeTab(); 
            
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

// ==========================================
// ARCHIVIAZIONE E DUPLICAZIONE
// ==========================================
async function toggleArchiveStatus() {
    if (typeof Swal === 'undefined' || !plantsDatabase) return;
    const parsedId = parseInt(currentPlantId, 10);
    const plant = plantsDatabase.find(p => p.id === parsedId);
    if (!plant) return;
    
    const btn = document.getElementById('btn-archive-toggle');
    
    if (plant.status === 'archived') { 
        const res = await Swal.fire({ title: 'Ripristinare?', text: "La pianta tornerà visibile nel tuo giardino principale.", icon: 'question', showCancelButton: true, confirmButtonColor: '#2e7d32', cancelButtonColor: '#607d8b', confirmButtonText: 'Sì, ripristina', cancelButtonText: 'Annulla' });
        if(res.isConfirmed) { 
            if(btn) { btn.disabled = true; btn.innerText = "⏳ Attendere..."; }
            
            try {
                plant.status = 'active'; 
                unsavedChanges = true; 
                if(typeof saveToLocal === 'function') await saveToLocal(); 
                
                if(typeof AppState !== 'undefined') AppState.emit('plantsUpdated'); 
                if(typeof goToHomeTab === 'function') goToHomeTab(); 
                else window.history.back(); 
            } catch (err) {
                console.error("Errore ripristino:", err);
            } finally {
                if(btn) btn.disabled = false;
            }
        } 
    } else { 
        const res = await Swal.fire({ title: 'Archiviare?', text: "Scomparirà dalla vista principale ma tutti i dati verranno conservati nell'archivio storico.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d32f2f', cancelButtonColor: '#607d8b', confirmButtonText: 'Sì, archivia', cancelButtonText: 'Annulla' });
        if(res.isConfirmed) { 
            if(btn) { btn.disabled = true; btn.innerText = "⏳ Attendere..."; }
            
            try {
                plant.status = 'archived'; 
                unsavedChanges = true; 
                if(typeof saveToLocal === 'function') await saveToLocal(); 
                
                if(typeof AppState !== 'undefined') AppState.emit('plantsUpdated'); 
                if(typeof goToHomeTab === 'function') goToHomeTab(); 
                else window.history.back(); 
            } catch (err) {
                console.error("Errore archiviazione:", err);
            } finally {
                if(btn) btn.disabled = false;
            }
        } 
    }
}

function openDuplicateModal() {
    if (!plantsDatabase) return;
    const parsedId = parseInt(currentPlantId, 10);
    const plantToCopy = plantsDatabase.find(p => p.id === parsedId); 
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
    const parsedId = parseInt(currentPlantId, 10);
    const plantToCopy = plantsDatabase.find(p => p.id === parsedId); 
    if (!plantToCopy) return;
    
    const baseNameEl = document.getElementById('dup-base-name');
    let baseName = baseNameEl ? baseNameEl.value.trim() : ''; 
    if (!baseName) baseName = plantToCopy.name;
    
    const qtyEl = document.getElementById('dup-qty');
    let qty = qtyEl ? parseInt(qtyEl.value) : 1; 
    
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
            let newName = baseName; let suffixCounter = 1;
            if (qty > 1 || plantsDatabase.some(p => (p.name || '').toLowerCase() === baseName.toLowerCase())) {
                newName = `${baseName} - ${suffixCounter}`;
                while (plantsDatabase.some(p => (p.name || '').toLowerCase() === newName.toLowerCase())) { 
                    suffixCounter++; 
                    newName = `${baseName} - ${suffixCounter}`; 
                }
            }
            
            let clonedLogs = [];
            if (copyDiary && plantToCopy.logs && Array.isArray(plantToCopy.logs)) { 
                clonedLogs = plantToCopy.logs.map((log, logIdx) => {
                    return {
                        id: typeof generateNumericId === 'function' ? generateNumericId() + logIdx : Date.now() + Math.floor(Math.random() * 1000000),
                        date: log.date, type: log.type, height: log.height, harvest: log.harvest, ph: log.ph, placement: log.placement, potSize: log.potSize, graftName: log.graftName, note: log.note,
                        photo: safeCloneImage(log.photo), 
                        photos: log.photos && Array.isArray(log.photos) ? log.photos.map(ph => safeCloneImage(ph)) : [] 
                    };
                });
            }

            const newPlantId = typeof generateNumericId === 'function' ? generateNumericId() : Date.now() + i;

            const newPlant = {
                id: newPlantId, 
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
                phOttimale: plantToCopy.phOttimale, 
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
                mother: plantToCopy.mother !== undefined && plantToCopy.mother !== null ? plantToCopy.mother : '', 
                father: plantToCopy.father !== undefined && plantToCopy.father !== null ? plantToCopy.father : '', 
                minTemp: plantToCopy.minTemp, 
                maxTemp: plantToCopy.maxTemp          
            };
            plantsDatabase.push(newPlant);
        }
        
        unsavedChanges = true; 
        if(typeof saveToLocal === 'function') await saveToLocal(); 
        
        closeDuplicateModal(); 
        
        if(typeof AppState !== 'undefined') AppState.emit('plantsUpdated');
        if(typeof goToHomeTab === 'function') goToHomeTab(); 
        
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

// ==========================================
// RENDERIZZAZIONE GRIGLIE ED ELENCHI (INFINITE SCROLL)
// ==========================================
let currentPlantsChunkIndex = 0;
const PLANTS_CHUNK_SIZE = 25;
let currentFilteredPlants = [];
let plantsObserver = null;
let lastFilterStateString = "";

function renderPlants() {
    const grid = document.getElementById('plants-grid'); 
    if(!grid) return;
    
    if (plantsObserver) {
        plantsObserver.disconnect();
        plantsObserver = null;
    }
    
    if (!plantsDatabase || !Array.isArray(plantsDatabase)) plantsDatabase = [];
    
    const emptyState = document.getElementById('dashboard-empty-state');
    const statsBar = document.getElementById('dashboard-stats');
    const searchBar = document.querySelector('.search-sort-bar');
    
    const totalActive = plantsDatabase.filter(p => p.status !== 'archived').length;
    if (totalActive === 0) {
        if(emptyState) emptyState.classList.remove('hidden');
        grid.classList.add('hidden');
        if(statsBar) statsBar.style.display = 'none';
        if(searchBar) searchBar.style.display = 'none';
        return;
    } else {
        if(emptyState) emptyState.classList.add('hidden');
        grid.classList.remove('hidden');
        if(statsBar) statsBar.style.display = 'block';
        if(searchBar) searchBar.style.display = 'flex';
    }

    const searchInput = document.getElementById('search-plant');
    const sortSelect = document.getElementById('sort-plants');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
    const sortMode = sortSelect ? sortSelect.value : "name";
    
    const fp = document.getElementById('filter-placement');
    const fo = document.getElementById('filter-origin');
    const ff = document.getElementById('filter-fertility');
    const filterPlacement = fp ? fp.value : 'all';
    const filterOrigin = fo ? fo.value : 'all';
    const filterFertility = ff ? ff.value : 'all';
    
    const filterSurvivalEl = document.getElementById('filter-survival-temp');
    const filterSurvivalInputStr = filterSurvivalEl && filterSurvivalEl.value !== '' ? filterSurvivalEl.value : 'null';
    const filterSurvival = filterSurvivalEl && filterSurvivalEl.value !== '' ? parseFloat(filterSurvivalEl.value.replace(',','.')) : null;

    const currentFilterStateString = `${searchTerm}_${sortMode}_${filterPlacement}_${filterOrigin}_${filterFertility}_${filterSurvivalInputStr}`;
    
    let isNewSearchOrFilter = (currentFilterStateString !== lastFilterStateString);
    lastFilterStateString = currentFilterStateString;

    let filteredPlants = plantsDatabase.filter(p => p.status !== 'archived').filter(p => {
        const nameMatch = p.name ? p.name.toLowerCase().includes(searchTerm) : false;
        const scientificMatch = p.scientific ? p.scientific.toLowerCase().includes(searchTerm) : false;
        return nameMatch || scientificMatch;
    });
    
    if (filterPlacement !== 'all') {
        filteredPlants = filteredPlants.filter(p => p.placement === filterPlacement || (!p.placement && filterPlacement==='Vaso' && p.potSize));
    }
    if (filterOrigin !== 'all') {
        filteredPlants = filteredPlants.filter(p => p.origin === filterOrigin || p.type === filterOrigin);
    }
    if (filterFertility !== 'all') {
        filteredPlants = filteredPlants.filter(p => getModernFertility(p.autofertile) === filterFertility);
    }
    
    if (filterSurvival !== null && !isNaN(filterSurvival)) {
        filteredPlants = filteredPlants.filter(p => {
            let survives = true;
            if (p.minTemp !== undefined && p.minTemp !== null && filterSurvival < p.minTemp) survives = false; 
            if (p.maxTemp !== undefined && p.maxTemp !== null && filterSurvival > p.maxTemp) survives = false; 
            return survives;
        });
    }

    filteredPlants.sort((a, b) => {
        if (sortMode === 'name') return (a.name || '').localeCompare(b.name || '');
        else if (sortMode === 'newest') return b.id - a.id;
        else if (sortMode === 'oldest') return a.id - b.id;
        else if (sortMode === 'last_updated') {
            let lastA = a.id; 
            if (a.logs && Array.isArray(a.logs) && a.logs.length > 0) { 
                lastA = Math.max(...a.logs.map(l => new Date(l.date).getTime() || 0)); 
            }
            let lastB = b.id; 
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
            let phA = (a.phOttimale !== undefined && a.phOttimale !== null) ? a.phOttimale : -999;
            let phB = (b.phOttimale !== undefined && b.phOttimale !== null) ? b.phOttimale : -999;
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
    if(countPlantsEl) countPlantsEl.innerText = filteredPlants.length; 
    if(countSpeciesEl) countSpeciesEl.innerText = new Set(validSpecies).size;

    currentFilteredPlants = filteredPlants;

    if (filteredPlants.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1 / -1; color: #666; text-align: center; padding: 20px;">Nessuna pianta corrisponde ai filtri o alla ricerca.</p>';
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
    if(!grid) return;
    
    const fragment = document.createDocumentFragment();
    const fallbackSrc = typeof OFFLINE_PLACEHOLDER !== 'undefined' ? OFFLINE_PLACEHOLDER : '';

    const chunkSize = customSize !== null ? customSize : PLANTS_CHUNK_SIZE;
    const chunk = currentFilteredPlants.slice(currentPlantsChunkIndex, currentPlantsChunkIndex + chunkSize);

    chunk.forEach(plant => {
        const card = document.createElement('div');
        card.className = 'plant-card animate__animated animate__fadeIn'; 
        card.style.animationDuration = '0.5s';
        
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `Vedi dettagli della pianta ${escapeHTML(plant.name)}`);
        
        const openDetail = () => { if(typeof navigateTo === 'function') navigateTo('plant-detail', plant.id); };
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
        
        let origLabel = plant.origin || plant.type || 'Non so / Altro';
        
        let tempBadge = plant.minTemp !== undefined && plant.minTemp !== null ? `<span style="background:#e3f2fd; color:#1565c0; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:bold;">❄️ Min: ${formatLocalFloat(plant.minTemp)}°C</span>` : '';
        let maxTempBadge = plant.maxTemp !== undefined && plant.maxTemp !== null ? `<span style="background:#ffebee; color:#d32f2f; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:bold;">🔥 Max: ${formatLocalFloat(plant.maxTemp)}°C</span>` : '';
        let phBadge = plant.phOttimale !== undefined && plant.phOttimale !== null ? `<span style="background:#e8f5e9; color:#2e7d32; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:bold;">🧪 pH ${formatLocalFloat(plant.phOttimale)}</span>` : '';

        let locationText = escapeHTML(plant.location) || 'Non specificata';
        let soilText = escapeHTML(plant.soil) || 'N/D';
        let modernFertility = getModernFertility(plant.autofertile);
        let fertilityText = modernFertility !== 'Sconosciuta' ? escapeHTML(modernFertility) : 'N/D';

        card.innerHTML = `
            <img src="${imgSrc}" onerror="this.onerror=null; this.src='${fallbackSrc}';" loading="lazy" alt="${escapeHTML(plant.name)}">
            <h3 style="margin:0 0 2px 0; color:var(--primary); font-size:20px; line-height:1.2;">${escapeHTML(plant.name)}</h3>
            <p style="margin:0 0 12px 0; font-size:14px; color:#666; font-style:italic;">${escapeHTML(plant.scientific) || '&nbsp;'}</p>
            
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:15px; align-items:center;">
                <span style="background:var(--secondary); color:white; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:bold;">${escapeHTML(origLabel)}</span>
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

// Stessa ottimizzazione per l'Archivio Storico
let currentArchiveChunkIndex = 0;
const ARCHIVE_CHUNK_SIZE = 25;
let currentArchivedPlants = [];
let archiveObserver = null;
let isArchiveInitialized = false;

function renderArchive() {
    const grid = document.getElementById('archive-grid'); 
    if(!grid) return;
    
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
    if(!grid) return;

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
        
        const openDetail = () => { if(typeof navigateTo === 'function') navigateTo('plant-detail', plant.id); };
        card.onclick = openDetail;
        card.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openDetail();
            }
        };
        
        let rawPhoto = plant.fruitPhoto || plant.photo;
        let imgSrc = (typeof getImageUrl === 'function' && rawPhoto) ? getImageUrl(rawPhoto) : fallbackSrc;
        let origLabel = plant.origin || plant.type || 'Non so / Altro';
        
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

if(typeof AppState !== 'undefined') { 
    AppState.on('plantsUpdated', renderPlants); 
    AppState.on('plantsUpdated', renderArchive); 
}

// ==========================================
// SCHEDA DETTAGLIO PIANTA
// ==========================================
function _internalOpenPlantDetail(id) {
    if (!plantsDatabase) return;
    const parsedId = parseInt(id, 10);
    const plant = plantsDatabase.find(p => p.id === parsedId);
    if(!plant) { 
        if(typeof goToHomeTab === 'function') goToHomeTab(); 
        else window.history.back(); 
        return; 
    }
    
    currentPlantId = plant.id; 
    
    const detailTitle = document.getElementById('detail-title');
    if (detailTitle) detailTitle.innerText = escapeHTML(plant.name) + (plant.scientific ? ` (${escapeHTML(plant.scientific)})` : '');
    
    let basePlacement = escapeHTML(plant.placement || 'Vaso');
    let sistemazioneLabel = basePlacement; 
    let vol = plant.potSize; 
    if (basePlacement === 'Vaso' && vol) sistemazioneLabel += ` (${formatLocalFloat(vol)} L)`;
    let origLabel = escapeHTML(plant.origin || plant.type || 'N/D');

    let fidelityHtml = '';
    if (plant.origin === 'Da seme' || plant.type === 'Pianta da seme') { 
        let fidelityLabel = plant.geneticFidelity || 'Non ancora valutato'; 
        fidelityHtml = `<p><strong>🧬 Fedeltà varietale:</strong> <span style="color:#e65100; font-weight:bold;">${escapeHTML(fidelityLabel)}</span></p>`; 
    }

    let autofertileHtml = '';
    let modernFertility = getModernFertility(plant.autofertile);
    if (modernFertility !== 'Sconosciuta') {
        autofertileHtml = ` | <strong>🐝 Fertilità:</strong> ${escapeHTML(modernFertility)}`;
    }

    let parentStr = '';
    if(plant.mother !== undefined && plant.mother !== null && plant.mother !== '') { 
        let m = plantsDatabase.find(x => x.id === parseInt(plant.mother, 10)); 
        if(m) parentStr += `Madre: <a href="javascript:void(0);" style="color:var(--blue); font-weight:bold;" onclick="navigateTo('plant-detail', ${m.id})">${escapeHTML(m.name)}</a><br>`; 
    }
    if(plant.father !== undefined && plant.father !== null && plant.father !== '') { 
        let f = plantsDatabase.find(x => x.id === parseInt(plant.father, 10)); 
        if(f) parentStr += `Padre: <a href="javascript:void(0);" style="color:var(--blue); font-weight:bold;" onclick="navigateTo('plant-detail', ${f.id})">${escapeHTML(f.name)}</a>`; 
    }
    if(parentStr) parentStr = `<div style="background:#e3f2fd; padding:10px; border-radius:5px; margin-bottom:10px; font-size:14px;"><strong>🧬 Genealogia:</strong><br>${parentStr}</div>`;

    let tempStr = '';
    if (plant.minTemp !== undefined && plant.minTemp !== null) tempStr += `<span style="color: #1976d2; font-weight:bold;">❄️ Minima tollerata: ${formatLocalFloat(plant.minTemp)}°C</span>`;
    if (plant.maxTemp !== undefined && plant.maxTemp !== null) {
        if (tempStr) tempStr += '<br>';
        tempStr += `<span style="color: #d32f2f; font-weight:bold;">🔥 Massima tollerata: ${formatLocalFloat(plant.maxTemp)}°C</span>`;
    }

    let priceStr = plant.price !== undefined && plant.price !== null ? `<br>💰 <strong>Costo:</strong> ${formatLocalFloat(plant.price)} €` : '';

    let notesHtml = '';
    if (plant.notes) notesHtml += `<p style="margin-bottom:8px;"><strong>📝 Note Pianta:</strong> ${escapeHTML(plant.notes)}</p>`;
    if (plant.speciesNotes) notesHtml += `<p style="margin-bottom:0;"><strong>🧬 Note Specie:</strong> ${escapeHTML(plant.speciesNotes)}</p>`;
    if (!plant.notes && !plant.speciesNotes) notesHtml += `<p style="margin-bottom:0;"><strong>📝 Note:</strong> Nessuna nota inserita.</p>`;

    const detailInfo = document.getElementById('detail-info');
    if (detailInfo) {
        detailInfo.innerHTML = `
            ${parentStr}
            <p style="margin-top:0;"><strong>📅 Data semina/inizio:</strong> ${formatDateIt(plant.sowingDate)}</p>
            <p><strong>🪴 Sistemazione:</strong> ${sistemazioneLabel}</p>
            <p><strong>🪨 Substrato:</strong> ${escapeHTML(plant.soil) || 'N/D'} ${plant.phOttimale !== null && plant.phOttimale !== undefined ? `| <strong>pH ottimale:</strong> ${formatLocalFloat(plant.phOttimale)}` : ''}</p>
            <p><strong>🌱 Origine:</strong> ${origLabel}${autofertileHtml} | <strong>🛒 Fornitore:</strong> ${renderFornitore(plant.vendor)} ${priceStr}</p>
            <p><strong>📍 Luogo:</strong> ${escapeHTML(plant.location) || 'N/D'} ${tempStr ? '<br>'+tempStr : ''}</p>
            <hr style="border:0.5px solid #ddd; margin:10px 0;">
            ${fidelityHtml}
            ${notesHtml}
        `;
    }

    const photoContainer = document.getElementById('detail-photos-container'); 
    if (photoContainer) {
        photoContainer.innerHTML = '';
        let safeNameJS = escapeHTML(plant.name).replace(/&#39;/g, "\\'");

        let pMainImg = (typeof getImageUrl === 'function' && plant.photo) ? getImageUrl(plant.photo) : plant.photo;
        let pFruitImg = (typeof getImageUrl === 'function' && plant.fruitPhoto) ? getImageUrl(plant.fruitPhoto) : plant.fruitPhoto;
        const fallbackSrc = typeof OFFLINE_PLACEHOLDER !== 'undefined' ? OFFLINE_PLACEHOLDER : '';

        if(pMainImg || pFruitImg) {
            let addClass = plant.status === 'archived' ? ' grayscale-img' : ''; 
            
            if(pMainImg) photoContainer.innerHTML += `<img src="${pMainImg}" onerror="this.onerror=null; this.src='${fallbackSrc}';" class="plant-img${addClass}" title="Foto Pianta" style="cursor:pointer;" tabindex="0" role="button" aria-label="Ingrandisci Foto Pianta" onclick="if(typeof openImageModal === 'function') openImageModal('${pMainImg}', '${safeNameJS}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}" alt="Foto Pianta">`;
            
            if(pFruitImg) photoContainer.innerHTML += `<img src="${pFruitImg}" onerror="this.onerror=null; this.src='${fallbackSrc}';" class="plant-img${addClass}" title="Foto Frutto" style="cursor:pointer;" tabindex="0" role="button" aria-label="Ingrandisci Foto Frutto" onclick="if(typeof openImageModal === 'function') openImageModal('${pFruitImg}', 'Dettaglio Frutto')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}" alt="Foto Frutto">`;
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
        if(typeof toggleDynamicFields === 'function') toggleDynamicFields();
        if(typeof renderTimeline === 'function') renderTimeline(plant); 
        if(typeof updateYearDropdown === 'function') updateYearDropdown(plant); 
        if(typeof initMap === 'function') initMap(plant); 
        if(typeof renderCharts === 'function') renderCharts(plant);
        
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
        if (labelOrigin) labelOrigin.innerText = plant.origin || plant.type || 'N/D';
        
        const qrContainer = document.getElementById('detail-qr-code'); 
        if (qrContainer && typeof QRCode !== 'undefined') {
            qrContainer.innerHTML = ''; 
            const qrContent = JSON.stringify({ plant_id: plant.id }); 
            new QRCode(qrContainer, { text: qrContent, width: 100, height: 100, colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.L });
        }
    }, 50);
}

async function saveNotesFromDetail() {
    if (!currentPlantId || !plantsDatabase) return;
    const parsedId = parseInt(currentPlantId, 10);
    const plant = plantsDatabase.find(p => p.id === parsedId);
    if (!plant) return;

    const plantNotesEl = document.getElementById('detail-plant-notes');
    const specNotesEl = document.getElementById('detail-species-notes');
    
    const newPlantNotes = plantNotesEl ? plantNotesEl.value.trim() : '';
    const newSpeciesNotes = specNotesEl ? specNotesEl.value.trim() : '';

    const notesBtn = document.querySelector('#notes-section button');
    if (notesBtn) {
        notesBtn.disabled = true;
        notesBtn.innerText = "⏳ Salvataggio...";
    }

    try {
        plant.notes = newPlantNotes;
        plant.speciesNotes = newSpeciesNotes;

        if (plant.scientific) {
            plantsDatabase.forEach(p => {
                if (p.scientific === plant.scientific) {
                    p.speciesNotes = newSpeciesNotes;
                }
            });
        }

        unsavedChanges = true;
        if (typeof saveToLocal === 'function') await saveToLocal();
        
        _internalOpenPlantDetail(currentPlantId);

        // IL POPUP SWEETALERT DI SUCCESSO È STATO RIMOSSO PER EVITARE DUPLICATI
        // CI PENSERÀ IL TOAST PWA "SALVATO" A DARE IL FEEDBACK!

    } catch (err) {
        console.error("Errore salvataggio note:", err);
        if (typeof Swal !== 'undefined') Swal.fire({icon: 'error', title: 'Errore', text: 'Impossibile salvare le note.', confirmButtonColor: '#d32f2f'});
    } finally {
        if (notesBtn) {
            notesBtn.disabled = false;
            notesBtn.innerText = "💾 Salva Note";
        }
    }
}