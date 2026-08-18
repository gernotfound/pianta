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

        let savedPlantId = (editingMode && currentPlantIdStr !== null) ? currentPlantIdStr : (typeof generateId === 'function' ? generateId() : crypto.randomUUID());

        if (window.smartCropBlobs && window.smartCropBlobs['main']) {
            finalMainPhoto = window.smartCropBlobs['main'];
            if (window.blobToBase64 && typeof saveImageToFirestore === 'function') {
                const b64 = await window.blobToBase64(finalMainPhoto);
                await saveImageToFirestore(savedPlantId + "_main", b64);
                if (window.imageCache) window.imageCache[savedPlantId + "_main"] = b64;
            }
        } else if (existingPlant && !mainPhotoRemoved) {
            finalMainPhoto = existingPlant.photo || "";
        } else if (mainPhotoRemoved) {
            finalMainPhoto = "";
            if (typeof saveImageToFirestore === 'function') await saveImageToFirestore(savedPlantId + "_main", "");
        }
        
        if (window.smartCropBlobs && window.smartCropBlobs['fruit']) {
            finalFruitPhoto = window.smartCropBlobs['fruit'];
            if (window.blobToBase64 && typeof saveImageToFirestore === 'function') {
                const b64 = await window.blobToBase64(finalFruitPhoto);
                await saveImageToFirestore(savedPlantId + "_fruit", b64);
                if (window.imageCache) window.imageCache[savedPlantId + "_fruit"] = b64;
            }
        } else if (existingPlant && !fruitPhotoRemoved) {
            finalFruitPhoto = existingPlant.fruitPhoto || "";
        } else if (fruitPhotoRemoved) {
            finalFruitPhoto = "";
            if (typeof saveImageToFirestore === 'function') await saveImageToFirestore(savedPlantId + "_fruit", "");
        }
        
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
}