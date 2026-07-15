// File di gestione IO (esportazione CSV)

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