const fs = require('fs');
let code = fs.readFileSync('js/io.js', 'utf8');
code = code.replace(
    /        if \(typeof Swal !== 'undefined'\) \{\s*Swal\.fire\(\{\s*icon: 'success',\s*title: 'Backup caricato',\s*text: 'I dati sono stati ripristinati correttamente\.',\s*timer: 1500,\s*showConfirmButton: false\s*\}\);\s*\}\s*setTimeout\(\(\) => window\.location\.reload\(\), 1500\);/g,
    `        // Mantieni l'alert di caricamento attivo mentre la pagina si ricarica\n        window.location.reload();`
);
fs.writeFileSync('js/io.js', code);
