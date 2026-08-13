# Regole di Progetto, Architettura e Linee Guida per AI (Pianta)

Questo file è la "Bibbia" architetturale dell'app **Pianta**. Ogni sessione AI deve leggere, assimilare e rispettare *rigorosamente* questo documento prima di scrivere una sola riga di codice.

---

## 1. Stack Tecnologico & Strumenti
- **Core:** React, Vite (Single Page Application).
- **State Management:** Zustand (Store globale centralizzato in `src/store.js`).
- **Backend & Database:** Firebase V10 (Firestore per i dati con cache offline moderna multi-tab, Auth per Google Login).
- **Styling:** CSS nativo (Vanilla CSS) importato globalmente (`style.css`). Assolutamente **NO Tailwind** o framework CSS.
- **PWA:** `vite-plugin-pwa` per la gestione del service worker e manifest, offline first.

## 2. Architettura (Offline-First)
- **Local Cache:** L'app utilizza estesamente la cache offline di Firestore (`persistentLocalCache` con `persistentMultipleTabManager`) per garantire che l'app funzioni sempre offline e si sincronizzi al ripristino della rete.
- **Sincronizzazione:** Se avvengono cambiamenti offline, Firebase gestirà la coda di scrittura automaticamente in background.

## 3. Gestione dello Stato e Persistenza
- **Single Source of Truth:** L'intera app attinge dallo store globale Zustand (`useStore`).
- **Integrità dei Dati:** Tutti gli aggiornamenti al database delle piante o al diario devono riflettersi immediatamente nello stato Zustand locale per evitare delay nella UI.

## 4. Vincoli Firebase
- Firebase SDK crascia miseramente se gli viene passato un valore `undefined` in qualsiasi punto dell'albero JSON.
- Prima di serializzare e salvare lo stato (specialmente nei form complessi come quello della pianta), assicurati che i campi vuoti siano rigorosamente trasformati in `null` oppure che la chiave venga omessa.

## 5. UX Mobile, iOS e PWA Constraints
- **Finestre Modali Proibite:** Vietato usare `<dialog>` o modali assolute che oscurano lo schermo, a meno che non siano strettamente necessarie e progettate per mobile (es. popup SweetAlert2). Prediligi render condizionali inline a tutto schermo (`if (isEditing) return <EditView />`).
- **Prevenzione Zoom Safari:** Qualsiasi `input`, `select`, o `textarea` DEVE avere `font-size: 16px !important` nel CSS, altrimenti Safari farà uno zoom fastidioso alla pressione.
- **CSS Flexbox Mobile:** Inserisci sempre `min-width: 0` nei figli di un container `display: flex` per prevenire overflow orizzontali del testo su schermi stretti.
- **Input Numerici:** Nei form usa sempre `<input type="number" inputMode="decimal" />` per favorire il tastierino numerico su smartphone.

## 6. Design System e UI
- Il tema richiama i colori della natura e del verde (`--primary: #2e7d32`, sfondo `.main-content-padding`).
- Tutte le metriche CSS, i colori e le distanze sono governate dal `style.css` legacy che è stato portato nel progetto React.
- Usa sempre le classi standard esistenti: `.btn`, `.btn-primary`, `.btn-warning`, `.plant-card`.
- Quando aggiungi un elemento di UI, domandati: *"Rispetta la densità, il contrasto e la semplicità del resto dell'app?"*

## 7. Stile Testuale (Sentence Case Italiano)
- Ogni testo rivolto all'utente (label, bottoni, placeholder, alert) DEVE rispettare la convenzione italiana **Sentence case**: *Solo ed esclusivamente la primissima lettera della frase va in maiuscolo*. Le parole successive sono minuscole, salvo nomi propri o marchi.
- ❌ **Sbagliato (Title Case):** "Aggiungi Nuova Pianta", "Salva Modifiche".
- ✅ **Corretto:** "Aggiungi nuova pianta", "Salva modifiche".

## 8. Feedback Immediato e Mental Model
- Nessuna azione deve essere "cieca". Se l'utente clicca "Aggiungi", deve esserci un riscontro visivo istantaneo (es. comparsa di un toast, ritorno alla lista con la pianta visibile). Non costringere l'utente a chiedersi se il salvataggio è andato a buon fine.

## 9. Git Workflow & Rule of Thumb
- **Vietato Teorizzare:** Usa i comandi `grep` e `view_file` per capire come è fatto un componente prima di suggerire o applicare refactoring.
- **Chiedere prima di presumere:** Se non conosci una logica (es. come funziona il vecchio scanner QR o il cropper), non darla per scontata. Esplora la cartella `legacy/` o chiedi allucidazioni.
- **Build Obbligatoria:** Prima di considerare completo un task strutturale, avvia SEMPRE `npm run build` per assicurarti di non aver introdotto errori bloccanti di Vite.
