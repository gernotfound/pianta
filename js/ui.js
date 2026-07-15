function toggleAccordion(headerEl) {
    if (!headerEl || !headerEl.parentElement) return;
    
    const item = headerEl.parentElement;
    item.classList.toggle('open');
    
    const content = item.querySelector('.accordion-content');
    if (content) {
        if (item.classList.contains('open')) {
            content.style.display = 'block';
            headerEl.setAttribute('aria-expanded', 'true');
            // FIX: Diciamo al browser che il contenuto ora è visibile e cliccabile
            content.setAttribute('aria-hidden', 'false');
        } else {
            content.style.display = 'none';
            headerEl.setAttribute('aria-expanded', 'false');
            // FIX: Diciamo al browser che il contenuto è nascosto
            content.setAttribute('aria-hidden', 'true');
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
            if (typeof saveToLocal === 'function') await saveToLocal();
        } catch (e) {
            console.error(e);
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
                if (res.isConfirmed) {
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
    
    if (typeof clearForm === 'function') clearForm();
    
    if (wasEditing && savedId && typeof navigateTo === 'function') {
        navigateTo('plant-detail', savedId);
    } else if (typeof goBack === 'function') {
        goBack();
    } else {
        window.history.back();
    }
}

function toggleGeneralList() {
    const el = document.getElementById('general-list-container');
    const btn = document.getElementById('btn-toggle-list');
    
    if (el) {
        el.classList.toggle('hidden');
        if (btn) {
            const isHidden = el.classList.contains('hidden');
            btn.setAttribute('aria-expanded', (!isHidden).toString());
            btn.innerHTML = isHidden ? '📋 Elenco Piante (Testo)' : '❌ Nascondi elenco';
        }
    }
}

async function openSystemStatusModal() {
    const modal = document.getElementById('system-status-modal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    const connSpan = document.getElementById('modal-conn-status');
    const isOnline = navigator.onLine;
    
    if (isOnline) {
        connSpan.innerText = 'Online';
        connSpan.style.background = '#2e7d32';
    } else {
        connSpan.innerText = 'Offline';
        connSpan.style.background = '#d32f2f';
    }

    const weatherSpan = document.getElementById('modal-weather-status');
    const weatherDesc = document.getElementById('modal-weather-desc');
    
    weatherSpan.innerText = 'In attesa...';
    weatherSpan.style.background = '#607d8b';
    weatherDesc.innerText = "Sto verificando la connessione al server meteo Open-Meteo...";

    if (!isOnline) {
        weatherSpan.innerText = 'Offline';
        weatherSpan.style.background = '#d32f2f';
        weatherDesc.innerText = "Nessuna rete. Le allerte meteo si baseranno sull'ultimo salvataggio offline locale.";
        return;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=41.90&longitude=12.49&current_weather=true", { 
            cache: "no-store",
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
            weatherSpan.innerText = 'Connesso e Attivo';
            weatherSpan.style.background = '#2e7d32';
            
            const now = new Date();
            const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
            weatherDesc.innerHTML = `L'API Meteo è in funzione. Il monitoraggio per Vento e Gelo è attivo.<br><strong>Ultimo controllo:</strong> oggi alle ${timeStr}.`;
        } else {
            throw new Error("Risposta non valida dal server");
        }
    } catch (e) {
        weatherSpan.innerText = 'Server Irraggiungibile';
        weatherSpan.style.background = '#f57f17';
        weatherDesc.innerHTML = "L'app è online ma il server meteo non risponde. Potrebbe esserci un blocco di rete aziendale, una VPN, o Open-Meteo è temporaneamente giù.";
    }
}

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
    
    if (typeof debouncedRenderPlants === 'function') debouncedRenderPlants();
}

function clearSearch() {
    if (typeof searchDebounceTimer !== 'undefined' && searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
    }
    
    const input = document.getElementById('search-plant');
    const clearBtn = document.getElementById('clear-search-btn');
    
    if (input) input.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    
    if (typeof renderPlants === 'function') renderPlants();
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
    if (typeof renderPlants === 'function') renderPlants();
}

function resetFiltersAndSearch() {
    ['search-plant', 'filter-vuln-cold', 'filter-vuln-hot'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    const defaults = {
        'sort-name': true,
        'status-active': true,
        'photo-all': true,
        'place-all': true,
        'orig-all': true,
        'fert-all': true
    };
    
    for (const [id, checked] of Object.entries(defaults)) {
        const el = document.getElementById(id);
        if (el) el.checked = checked;
    }
}

function resetAllFilters() {
    resetFiltersAndSearch();
    if (typeof renderPlants === 'function') renderPlants();
    closeFilterSidebar();
}