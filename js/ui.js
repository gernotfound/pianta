// ==========================================
// INTERFACCIA E MODALI BASE
// ==========================================

function toggleAccordion(headerEl) {
    if (!headerEl || !headerEl.parentElement) return;
    
    const item = headerEl.parentElement;
    item.classList.toggle('open');
    
    const content = item.querySelector('.accordion-content');
    if (content) {
        if (item.classList.contains('open')) {
            content.style.display = 'block';
            headerEl.setAttribute('aria-expanded', 'true');
        } else {
            content.style.display = 'none';
            headerEl.setAttribute('aria-expanded', 'false');
        }
    }
}

async function editMainTitle() {
    if (typeof Swal === 'undefined') return;

    const { value: newTitle } = await Swal.fire({
        title: 'Modifica nome giardino',
        input: 'text',
        inputValue: typeof gardenTitle !== 'undefined' ? gardenTitle : "Il mio giardino",
        showCancelButton: true,
        confirmButtonColor: '#2e7d32',
        cancelButtonColor: '#607d8b',
        confirmButtonText: 'Salva',
        cancelButtonText: 'Annulla',
        inputValidator: (value) => {
            if (!value || value.trim() === '') {
                return 'Devi inserire un nome valido!';
            }
        }
    });

    if (newTitle) {
        gardenTitle = newTitle.trim();
        const titleEl = document.getElementById('main-title');
        if (titleEl) titleEl.innerText = gardenTitle;
        
        unsavedChanges = true;
        try {
            // Attesa asincrona del salvataggio con protezione da errori
            if(typeof saveToLocal === 'function') await saveToLocal();
        } catch(e) {
            console.error("Errore salvataggio nuovo titolo:", e);
        }
    }
}

function cancelAddPlant() {
    if (typeof isFormDirty !== 'undefined' && isFormDirty) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Annullare inserimento?',
                text: 'Perderai i dati non salvati di questa pianta.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d32f2f',
                cancelButtonColor: '#607d8b',
                confirmButtonText: 'Sì, annulla',
                cancelButtonText: 'Continua a scrivere'
            }).then((res) => {
                if(res.isConfirmed) {
                    finalizeCancelAddPlant();
                }
            });
        } else {
            if (confirm("Vuoi annullare l'inserimento? Perderai i dati non salvati.")) {
                finalizeCancelAddPlant();
            }
        }
    } else {
        finalizeCancelAddPlant();
    }
}

function finalizeCancelAddPlant() {
    isFormDirty = false;
    
    let wasEditing = typeof editingMode !== 'undefined' ? editingMode : false;
    let savedId = typeof currentPlantId !== 'undefined' ? currentPlantId : null;
    
    editingMode = false; 
    currentPlantId = null;
    
    if(typeof clearForm === 'function') clearForm();
    
    if (wasEditing && savedId && typeof navigateTo === 'function') {
        navigateTo('plant-detail', savedId);
    } else if(typeof goToHomeTab === 'function') {
        goToHomeTab();
    } else {
        window.history.back();
    }
}

function toggleGeneralList() {
    const el = document.getElementById('general-list-container');
    const btn = document.querySelector('button[onclick="toggleGeneralList()"]');
    
    if(el) {
        el.classList.toggle('hidden');
        if (btn) {
            const isHidden = el.classList.contains('hidden');
            btn.setAttribute('aria-expanded', (!isHidden).toString());
            btn.innerHTML = isHidden ? '📋 Mostra elenco' : '❌ Nascondi elenco';
        }
    }
}

// ==========================================
// RICERCA E FILTRI
// ==========================================

function handleSearchInput() {
    const input = document.getElementById('search-plant');
    const clearBtn = document.getElementById('clear-search-btn');
    
    if (input && clearBtn) {
        if (input.value.length > 0) {
            clearBtn.style.display = 'inline-block';
        } else {
            clearBtn.style.display = 'none';
        }
    }
    
    // Scatena la ricerca con il ritardo (debounce)
    if(typeof debouncedRenderPlants === 'function') debouncedRenderPlants();
}

function clearSearch() {
    // Spegniamo il timer pendente per evitare sfarfallii doppi
    if (typeof searchDebounceTimer !== 'undefined' && searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
    }
    
    const input = document.getElementById('search-plant');
    const clearBtn = document.getElementById('clear-search-btn');
    
    if (input) input.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    
    // Aggiorna istantaneamente la griglia rimuovendo il filtro di testo
    if(typeof renderPlants === 'function') renderPlants();
}

function openFilterSidebar() {
    const sidebar = document.getElementById('filter-sidebar');
    if (sidebar) sidebar.classList.remove('hidden');
}

function closeFilterSidebar() {
    const sidebar = document.getElementById('filter-sidebar');
    if (sidebar) sidebar.classList.add('hidden');
}

function applyFiltersAndClose() {
    closeFilterSidebar();
    if(typeof renderPlants === 'function') renderPlants();
}

function resetAllFilters() {
    if(typeof resetFiltersAndSearch === 'function') resetFiltersAndSearch();
    if(typeof renderPlants === 'function') renderPlants();
    closeFilterSidebar();
}