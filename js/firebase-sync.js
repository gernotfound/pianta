window.saveToFirebase = async function() {
  if (!window.currentUser || !window.db) return;
  const uid = window.currentUser.uid;
  const db = window.db;

  try {
    const sysRef = db.collection('users').doc(uid).collection('settings').doc('metadata');
    await sysRef.set({ title: gardenTitle || '', notes: gardenNotes || '' }, { merge: true });

    for (let p of plantsDatabase) {
      if (!p.id) p.id = String(Date.now() + Math.random());
      const pRef = db.collection('users').doc(uid).collection('plants').doc(String(p.id));
      const pCopy = { ...p, ownerId: uid, updatedAt: Date.now() };
      delete pCopy.logs;

      if (pCopy.photo) pCopy.photo = await window.blobToBase64(pCopy.photo);
      if (pCopy.fruitPhoto) pCopy.fruitPhoto = await window.blobToBase64(pCopy.fruitPhoto);

      await pRef.set(pCopy, { merge: true });
      
      if (p.logs && p.logs.length > 0) {
        for (let l of p.logs) {
          if (!l.id) l.id = String(Date.now() + Math.random());
          const lRef = pRef.collection('logs').doc(String(l.id));
          const lCopy = { ...l };
          if (lCopy.photos && Array.isArray(lCopy.photos)) {
            let encodedPhotos = [];
            for (let ph of lCopy.photos) {
                encodedPhotos.push(await window.blobToBase64(ph));
            }
            lCopy.photos = encodedPhotos;
          }
          await lRef.set(lCopy, { merge: true });
        }
      }
    }

    for (let e of generalExpenses) {
      if (!e.id) e.id = String(Date.now() + Math.random());
      const eRef = db.collection('users').doc(uid).collection('expenses').doc(String(e.id));
      await eRef.set({ ...e, ownerId: uid }, { merge: true });
    }

    for (let w of wishlist) {
      if (!w.id) w.id = String(Date.now() + Math.random());
      const wRef = db.collection('users').doc(uid).collection('wishlist').doc(String(w.id));
      const wCopy = { ...w, ownerId: uid };
      if (wCopy.photo) wCopy.photo = await window.blobToBase64(wCopy.photo);
      await wRef.set(wCopy, { merge: true });
    }
    
    if (typeof showAutoSaveToast === 'function') showAutoSaveToast();
  } catch (e) {
    console.error('Firebase save error:', e);
  }
};

window.loadFromFirebase = async function(isSilent = false) {
  if (!window.currentUser || !window.db) return;
  const uid = window.currentUser.uid;
  const db = window.db;

  try {
    const sysRef = db.collection('users').doc(uid).collection('settings').doc('metadata');
    const sysDoc = await sysRef.get();
    const sysData = sysDoc.exists ? sysDoc.data() : null;

    const plRef = db.collection('users').doc(uid).collection('plants');
    const plSnap = await plRef.get();
    let loadedPlants = [];
    for (let docSnap of plSnap.docs) {
        let pData = docSnap.data();
        let logsRef = plRef.doc(docSnap.id).collection('logs');
        let logsSnap = await logsRef.get();
        pData.logs = logsSnap.docs.map(l => l.data());
        loadedPlants.push(pData);
    }

    const expRef = db.collection('users').doc(uid).collection('expenses');
    const expSnap = await expRef.get();
    let loadedExpenses = expSnap.docs.map(e => e.data());

    const wishRef = db.collection('users').doc(uid).collection('wishlist');
    const wishSnap = await wishRef.get();
    let loadedWishlist = wishSnap.docs.map(w => w.data());

    
    if (loadedPlants.length === 0 && loadedExpenses.length === 0 && loadedWishlist.length === 0) {
        // Migration from local IndexedDB
        try {
            let localDb = await typeof initDB === 'function' ? initDB() : null;
            if (localDb) {
                let tx = localDb.transaction(['System', 'Plants', 'Expenses', 'Wishlist'], 'readonly');
                let reqSys = tx.objectStore('System').get('metadata');
                let reqPl = tx.objectStore('Plants').getAll();
                let reqExp = tx.objectStore('Expenses').getAll();
                let reqWish = tx.objectStore('Wishlist').getAll();
                
                await new Promise(res => {
                    tx.oncomplete = () => {
                        let sysData = reqSys.result;
                        if (sysData || (reqPl.result && reqPl.result.length > 0)) {
                            gardenTitle = sysData && sysData.title ? sysData.title : "🌿 Gestione Piante Tropicali - Pro";
                            gardenNotes = sysData && sysData.notes ? sysData.notes : "";
                            plantsDatabase = Array.isArray(reqPl.result) ? reqPl.result : [];
                            generalExpenses = Array.isArray(reqExp.result) ? reqExp.result : [];
                            wishlist = Array.isArray(reqWish.result) ? reqWish.result : [];
                            
                            // save to firebase
                            console.log('Migrating local data to Firebase...');
                            window.saveToFirebase();
                        }
                        res();
                    };
                    tx.onerror = () => res();
                });
            }
        } catch(err) {
            console.error('Migration failed:', err);
        }
    } else {
        gardenTitle = sysData && sysData.title ? sysData.title : "🌿 Gestione Piante Tropicali - Pro";
        gardenNotes = sysData && sysData.notes ? sysData.notes : "";
        plantsDatabase = loadedPlants;
        generalExpenses = loadedExpenses;
        wishlist = loadedWishlist;
    }


    if (typeof standardizeDatabaseIds === 'function') standardizeDatabaseIds();

    if (isSilent) {
        if (typeof finalizeSilentLoad === 'function') finalizeSilentLoad();
    } else {
        if (typeof finalizeLoad === 'function') finalizeLoad(true);
    }

  } catch (e) {
    console.error('Firebase load error:', e);
    if (!isSilent && typeof finalizeLoad === 'function') finalizeLoad(false);
  }
};
