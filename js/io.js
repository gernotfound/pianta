function loadProfile(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (typeof plantsDatabase !== 'undefined' && plantsDatabase.length > 0) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Caricare il Backup?',
                text: "ATTENZIONE: Questa operazione sovrascriverà il giardino attualmente aperto. Assicurati di aver esportato il giardino attuale prima di procedere!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d32f2f',
                cancelButtonColor: '#607d8b',
                confirmButtonText: 'Sì, sovrascrivi tutto',
                cancelButtonText: 'Annulla'
            }).then((result) => {
                if (result.isConfirmed) {
                    processFile(file, event);
                } else {
                    event.target.value = '';
                }
            });
        } else {
            if (confirm("ATTENZIONE: Verrà sovrascritto tutto. Continuare?")) {
                processFile(file, event);
            } else {
                event.target.value = '';
            }
        }
    } else {
        processFile(file, event);
    }
}

function processFile(file, event) {
    if (file.name.endsWith('.zip')) {
        loadZipProfile(file);
    } else if (file.name.endsWith('.json')) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'Formato Obsoleto',
                text: 'I salvataggi in solo formato .json non sono più supportati. Carica un file .zip generato dalle nuove versioni dell\'app.',
                confirmButtonColor: '#f57f17'
            });
        } else {
            alert('Formato obsoleto. Usa un file .zip.');
        }
    } else {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'File non valido',
                text: 'Per favore, carica un file di salvataggio .zip valido.',
                confirmButtonColor: '#2e7d32'
            });
        } else {
            alert('File non valido. Richiesto .zip');
        }
    }
    event.target.value = '';
}

async function loadZipProfile(file) {
    if (!file) return;

    // Funzione per far "respirare" la CPU ed evitare crash di memoria
    const yieldThread = () => new Promise(r => setTimeout(r, 15));

    let loadingText = 'Sto analizzando il Backup. Attendi...';

    const maxWarningSize = typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.MAX_BACKUP_WARNING_SIZE : 262144000;
    const maxMb = Math.round(maxWarningSize / (1024 * 1024));

    if (file.size > maxWarningSize) {
        loadingText = `File grande (>${maxMb}MB). Il ripristino procede a scaglioni. Non chiudere l'app...`;
        console.warn(`Backup > ${maxMb}MB. Thread Yielding forzato abilitato.`);
    }

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Ripristino in corso...',
            text: loadingText,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
    }

    try {
        if (file.size === 0) throw new Error('Il file ZIP è vuoto.');

        await yieldThread();

        const zip = await JSZip.loadAsync(file);
        const jsonFile = zip.file("data.json");
        if (!jsonFile) throw new Error("Il file ZIP non contiene il database (data.json).");

        const jsonString = await jsonFile.async("string");
        const loadedData = JSON.parse(jsonString);
        
        if (!loadedData || (typeof loadedData !== 'object' && !Array.isArray(loadedData))) {
            throw new Error('Il backup non contiene un formato JSON valido.');
        }

        let loadedPlants = Array.isArray(loadedData) ? loadedData : (Array.isArray(loadedData.plants) ? loadedData.plants : []);
        if (!Array.isArray(loadedPlants)) {
            throw new Error('Il backup non contiene una lista di piante valida.');
        }

        const restoreImage = async (imgPath) => {
            if (imgPath && typeof imgPath === 'string' && imgPath.startsWith('images/')) {
                const imgFile = zip.file(imgPath);
                if (imgFile) {
                    let ext = imgPath.split('.').pop().toLowerCase();
                    let mime = "image/webp";
                    if (ext === "jpeg" || ext === "jpg") mime = "image/jpeg";
                    else if (ext === "png") mime = "image/png";

                    const arrayBuffer = await imgFile.async("arraybuffer");
                    return new Blob([arrayBuffer], { type: mime });
                }
            }
            return typeof sanitizeImageSource === 'function' ? sanitizeImageSource(imgPath) : imgPath;
        }

        let count = 0;
        for (let p of loadedPlants) {
            // Facciamo respirare il browser ogni 5 piante elaborate
            if (++count % 5 === 0) {
                await yieldThread();
                if (typeof Swal !== 'undefined') Swal.update({ text: `Estrazione foto: pianta ${count} di ${loadedPlants.length}...` });
            }

            if (p.photo) p.photo = await restoreImage(p.photo);
            if (p.fruitPhoto) p.fruitPhoto = await restoreImage(p.fruitPhoto);

            if (p.logs && Array.isArray(p.logs)) {
                for (let log of p.logs) {
                    if (log.photos && Array.isArray(log.photos) && log.photos.length > 0) {
                        for (let i = 0; i < log.photos.length; i++) {
                            log.photos[i] = await restoreImage(log.photos[i]);
                        }
                    } else {
                        log.photos = [];
                    }
                    if (!log.id) log.id = typeof generateId === 'function' ? generateId() : crypto.randomUUID();
                    else log.id = String(log.id);
                }
            } else {
                p.logs = [];
            }

            if (!p.status) p.status = 'active';

            if (!p.id) p.id = typeof generateId === 'function' ? generateId() : crypto.randomUUID();
            else p.id = String(p.id);

            if (p.mother) p.mother = String(p.mother);
            if (p.father) p.father = String(p.father);
        }

        plantsDatabase = loadedPlants;

        if (!Array.isArray(loadedData)) {
            if (loadedData.title) {
                gardenTitle = escapeHTML(loadedData.title);
                const titleEl = document.getElementById('main-title');
                if (titleEl) titleEl.innerText = gardenTitle;
            }
            if (loadedData.notes) {
                gardenNotes = loadedData.notes;
            } else {
                gardenNotes = "";
            }

            generalExpenses = Array.isArray(loadedData.expenses) ? loadedData.expenses : [];
            for (let e of generalExpenses) {
                if (!e.id) e.id = typeof generateId === 'function' ? generateId() : crypto.randomUUID();
                else e.id = String(e.id);
            }

            let loadedWishlist = Array.isArray(loadedData.wishlist) ? loadedData.wishlist : [];
            for (let w of loadedWishlist) {
                if (w.photo) w.photo = await restoreImage(w.photo);
                if (!w.id) w.id = typeof generateId === 'function' ? generateId() : crypto.randomUUID();
                else w.id = String(w.id);
            }
            wishlist = loadedWishlist;

        } else {
            generalExpenses = [];
            wishlist = [];
        }

        if (typeof dbSyncHashes !== 'undefined') {
            dbSyncHashes = { Plants: {}, Expenses: {}, Wishlist: {} };
        }

        if (typeof Swal !== 'undefined') Swal.update({ text: `Salvataggio nel database in corso...` });
        await yieldThread();

        if (typeof saveToLocal === 'function') await saveToLocal();

        unsavedChanges = false;
        isFormDirty = false;

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Backup caricato',
                text: 'I dati sono stati ripristinati correttamente.',
                timer: 1500,
                showConfirmButton: false
            });
        }

        setTimeout(() => window.location.reload(), 1500);

    } catch (e) {
        const errorMessage = e && e.message ? e.message : String(e);
        console.error("Errore importazione ZIP:", e);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Errore Backup',
                text: "Errore nel caricamento del file ZIP: " + errorMessage,
                confirmButtonColor: '#d32f2f'
            });
        } else {
            alert("Errore caricamento: " + errorMessage);
        }
    }
}

async function exportData() {
    const btn = document.getElementById('btn-export');
    if (btn) {
        btn.innerHTML = '⏳ Preparazione...';
        btn.disabled = true;
    }

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Creazione Backup in corso...',
            text: 'Sto raggruppando i dati. Potrebbe volerci qualche istante, non chiudere la pagina.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
    }

    try {
        const yieldThread = () => new Promise(r => setTimeout(r, 15));
        const zip = new JSZip();
        const imgFolder = zip.folder("images");

        const processImage = (imgData, filenameBase) => {
            if (!imgData) return imgData;
            let ext = "webp";

            if (typeof imgData === 'string' && imgData.startsWith('data:image')) {
                const parts = imgData.split(',');
                if (parts.length < 2) return imgData;
                if (parts[0].includes("jpeg")) ext = "jpeg";
                else if (parts[0].includes("png")) ext = "png";

                const filename = `${filenameBase}.${ext}`;
                imgFolder.file(filename, parts[1], { base64: true });
                return `images/${filename}`;
            } else if (imgData instanceof Blob) {
                if (imgData.type === 'image/jpeg') ext = "jpeg";
                else if (imgData.type === 'image/png') ext = "png";

                const filename = `${filenameBase}.${ext}`;
                imgFolder.file(filename, imgData);
                return `images/${filename}`;
            }
            return imgData;
        }

        if (!plantsDatabase) plantsDatabase = [];
        if (!wishlist) wishlist = [];
        if (!generalExpenses) generalExpenses = [];

        await yieldThread();

        let clonedPlants = [];
        let count = 0;
        
        for (let p of plantsDatabase) {
            if (++count % 5 === 0) {
                await yieldThread();
                if (typeof Swal !== 'undefined') Swal.update({ text: `Elaborazione foto: pianta ${count} di ${plantsDatabase.length}...` });
            }

            let cp = { ...p };
            if (cp.photo) cp.photo = processImage(cp.photo, `plant_${cp.id}_main`);
            if (cp.fruitPhoto) cp.fruitPhoto = processImage(cp.fruitPhoto, `plant_${cp.id}_fruit`);

            if (cp.logs && Array.isArray(cp.logs)) {
                cp.logs = cp.logs.map(log => {
                    let clog = { ...log };
                    if (clog.photos && Array.isArray(clog.photos) && clog.photos.length > 0) {
                        clog.photos = clog.photos.map((ph, idx) => processImage(ph, `log_${clog.id}_${idx}`));
                    } else {
                        clog.photos = [];
                    }
                    return clog;
                });
            } else {
                cp.logs = [];
            }
            clonedPlants.push(cp);
        }

        let clonedWishlist = [];
        for (let w of wishlist) {
            let cw = { ...w };
            if (cw.photo) cw.photo = processImage(cw.photo, `wishlist_${cw.id}`);
            clonedWishlist.push(cw);
        }

        const exportObj = {
            schemaVersion: 1,
            title: gardenTitle || "Il mio giardino",
            notes: gardenNotes || "",
            plants: clonedPlants,
            expenses: generalExpenses,
            wishlist: clonedWishlist
        };

        const jsonString = JSON.stringify(exportObj, function(key, value) {
            if (value === "" || value === null || (Array.isArray(value) && value.length === 0)) return undefined;
            return value;
        });

        zip.file("data.json", jsonString);

        if (typeof Swal !== 'undefined') Swal.update({ text: `Compressione archivio in corso. Attendere...` });
        await yieldThread();

        let lastUpdatePercent = 0;
        const content = await zip.generateAsync({
            type: "blob",
            compression: "STORE" // Evitiamo compressione DEFLATE per risparmiare moltissima RAM su smartphone
        }, function updateCallback(metadata) {
            if (metadata.percent && typeof Swal !== 'undefined') {
                let currentPercent = Math.round(metadata.percent);
                // Aggiorniamo l'interfaccia solo ogni 10% per non causare lag
                if (currentPercent >= lastUpdatePercent + 10) {
                    lastUpdatePercent = currentPercent;
                    Swal.update({ text: `Assemblaggio file ZIP: ${currentPercent}%` });
                }
            }
        });

        const a = document.createElement('a');
        a.href = URL.createObjectURL(content);

        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;

        let safeTitle = (gardenTitle || "Giardino").replace('🌿', '').trim().replace(/[^a-zA-Z0-9 àèìòùÀÈÌÒÙ-]/g, '').replace(/\s+/g, '-');
        if (!safeTitle) safeTitle = "Giardino";

        a.download = `${safeTitle}-${dateStr}-${timeStr}.zip`;
        a.click();

        setTimeout(() => URL.revokeObjectURL(a.href), 1500);

        unsavedChanges = false;
        if (typeof Swal !== 'undefined') Swal.close();

    } catch (err) {
        console.error("Errore export ZIP:", err);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Errore Esportazione',
                text: "Si è verificato un errore, probabilmente la memoria RAM del dispositivo è piena. Chiudi altre app e riprova.",
                confirmButtonColor: '#d32f2f'
            });
        } else {
            alert("Errore ZIP: " + err);
        }
    } finally {
        if (btn) {
            btn.innerHTML = "💾 Backup ZIP";
            btn.disabled = false;
        }
    }
}

function exportToCSV() {
    if (!plantsDatabase || plantsDatabase.length === 0) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'info',
                title: 'Nessun Dato',
                text: 'Non c\'è nessuna pianta da esportare nel file Excel!',
                confirmButtonColor: '#1976d2'
            });
        }
        return;
    }

    const headers = [
        "Nome", "Nome Scientifico", "Costo (€)", "Origine/Propagazione", "Madre", "Padre", "Fertilità", "Data Semina/Inizio",
        "Fedeltà Varietale", "Sistemazione", "Litri Vaso", "Substrato", "pH Minimo", "pH Massimo",
        "Temp. Minima", "Temp. Massima", "Fornitore", "Luogo", "Latitudine", "Longitudine",
        "Stato", "Ultima Altezza (cm)", "Ultimo pH Misurato", "Cronologia Eventi", "Note Pianta", "Note Specie"
    ];

    let csvContent = headers.join(";") + "\n";

    plantsDatabase.forEach(p => {
        let latestHeight = "";
        let latestPh = "";

        if (p.logs && Array.isArray(p.logs)) {
            let heightLogs = p.logs.filter(l => l.type === 'Misurazione' && l.height !== null && !isNaN(l.height)).sort((a, b) => new Date(b.date) - new Date(a.date));
            if (heightLogs.length > 0) latestHeight = heightLogs[0].height;

            let phLogs = p.logs.filter(l => l.type === 'Misurazione pH' && l.ph !== null && !isNaN(l.ph)).sort((a, b) => new Date(b.date) - new Date(a.date));
            if (phLogs.length > 0) latestPh = phLogs[0].ph;
        }

        let motherName = "";
        if (p.mother !== undefined && p.mother !== null && p.mother !== "") {
            let m = plantsDatabase.find(x => String(x.id) === String(p.mother));
            if (m) motherName = m.name;
        }

        let fatherName = "";
        if (p.father !== undefined && p.father !== null && p.father !== "") {
            let f = plantsDatabase.find(x => String(x.id) === String(p.father));
            if (f) fatherName = f.name;
        }

        let eventsStr = "";
        if (p.logs && Array.isArray(p.logs) && p.logs.length > 0) {
            let sortedLogs = [...p.logs].sort((a, b) => new Date(a.date) - new Date(b.date));
            eventsStr = sortedLogs.map(l => {
                let detail = "";
                if (l.type === 'Misurazione' && l.height !== null) detail = ` (${typeof formatLocalFloat === 'function' ? formatLocalFloat(l.height) : l.height}cm)`;
                else if (l.type === 'Misurazione pH' && l.ph !== null) detail = ` (pH ${typeof formatLocalFloat === 'function' ? formatLocalFloat(l.ph) : l.ph})`;
                else if (l.type === 'Raccolto' && l.harvest) detail = ` (Resa: ${l.harvest})`;
                else if (l.type === 'Rinvaso / Sistemazione' && l.placement) detail = ` (${l.placement} ${l.potSize ? l.potSize + 'L' : ''})`;
                else if (l.type === 'Innesto' && l.graftName) detail = ` (Nuovo nome: ${l.graftName})`;

                let noteStr = l.note ? ` - ${l.note}` : "";
                let displayDate = typeof formatDateIt === 'function' ? formatDateIt(l.date) : l.date;
                return `[${displayDate}] ${l.type}${detail}${noteStr}`;
            }).join("\n");
        }

        let safePotSize = p.potSize || "";
        let safePrice = p.price !== undefined && p.price !== null ? p.price.toFixed(2).replace('.', ',') : "";
        let safeFertility = typeof getModernFertility === 'function' ? getModernFertility(p.autofertile) : (p.autofertile || "Sconosciuta");
        let safeMin = p.minTemp !== null && p.minTemp !== undefined ? p.minTemp.toString().replace('.', ',') : "";
        let safeMax = p.maxTemp !== null && p.maxTemp !== undefined ? p.maxTemp.toString().replace('.', ',') : "";

        let safePhMin = p.phMin !== null && p.phMin !== undefined ? p.phMin.toString().replace('.', ',') : "";
        let safePhMax = p.phMax !== null && p.phMax !== undefined ? p.phMax.toString().replace('.', ',') : "";

        let row = [
            p.name, p.scientific, safePrice, p.origin, motherName, fatherName, safeFertility, p.sowingDate,
            p.geneticFidelity, p.placement, safePotSize, p.soil,
            safePhMin, safePhMax,
            safeMin, safeMax, p.vendor, p.location, p.lat, p.lng,
            p.status === 'archived' ? 'Archiviata' : 'Attiva',
            latestHeight !== "" ? latestHeight.toString().replace('.', ',') : "",
            latestPh !== "" ? latestPh.toString().replace('.', ',') : "",
            eventsStr,
            p.notes, p.speciesNotes
        ];

        let formattedRow = row.map(field => {
            let val = field === null || field === undefined ? "" : String(field);
            if (val.search(/("|,|;|\n)/g) >= 0) {
                val = `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        }).join(";");

        csvContent += formattedRow + "\n";
    });

    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    let safeTitle = (gardenTitle || "Giardino").replace('🌿', '').trim().replace(/[^a-zA-Z0-9]/g, '_');
    
    link.setAttribute("download", `Inventario_Piante_${safeTitle}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}