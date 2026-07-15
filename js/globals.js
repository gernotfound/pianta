function createNewGarden() {
    gardenTitle = "🌿 Il mio giardino";
    plantsDatabase = [];
    generalExpenses = [];
    wishlist = [];
    gardenNotes = "";
    dbSyncHashes = { Plants: {}, Expenses: {}, Wishlist: {} };
    
    saveToLocal().then(() => {
        const titleEl = document.getElementById('main-title');
        if(titleEl) titleEl.innerText = gardenTitle;
        
        const startScreen = document.getElementById('startup-screen');
        const navBar = document.getElementById('bottom-nav');
        
        if(startScreen) startScreen.classList.add('hidden');
        if(navBar) navBar.classList.remove('hidden-nav');
        
        // FIX: Usiamo navigateTo per forzare l'inizializzazione del DOM
        // ignorando il blocco "sono già in questa scheda"
        if(typeof navigateTo === 'function') navigateTo('home');
    });
}