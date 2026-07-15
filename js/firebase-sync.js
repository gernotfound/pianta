
function cleanForFirestore(obj) {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanForFirestore(item)).filter(item => item !== undefined);
  }
  if (typeof obj === 'object') {
    const cleaned = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = cleanForFirestore(obj[key]);
      }
    }
    return cleaned;
  }
  return obj;
}

function handleFirestoreSaveError(e) {
  console.error('Firestore save operation failed:', e);
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      icon: 'error',
      title: 'Errore Sincronizzazione',
      text: e.message && e.message.includes('permission') ? 'Permessi Firebase insufficienti. Controlla le regole del database.' : 'Impossibile salvare sul cloud.',
      toast: true,
      position: 'bottom-end',
      showConfirmButton: false,
      timer: 5000
    });
  }
}

window.saveToFirebase = async function() {
  if (!window.currentUser || !window.db || !window.currentGardenId) return;
  const uid = window.currentUser.uid;
  const db = window.db;
  const gId = window.currentGardenId;

  window.isSyncing = true;
  const syncToast = document.getElementById('sync-toast');
  if (syncToast) syncToast.classList.remove('hidden');

  try {
    const gardenRef = db.collection('users').doc(uid).collection('gardens').doc(gId);
    
    // settings
    const promises = [];
    promises.push(gardenRef.collection('settings').doc('metadata').set(cleanForFirestore({ title: gardenTitle || '', notes: gardenNotes || '' }), { merge: true }).catch(handleFirestoreSaveError));
    promises.push(gardenRef.set(cleanForFirestore({ title: gardenTitle || '', updatedAt: Date.now() }), { merge: true }).catch(handleFirestoreSaveError));

    for (let p of plantsDatabase) {
      if (!p.id) p.id = String(Date.now() + Math.random());
      const pRef = gardenRef.collection('plants').doc(String(p.id));
      const pCopy = { ...p, ownerId: uid, updatedAt: Date.now() };
      delete pCopy.logs;

      if (pCopy.photo) pCopy.photo = await window.blobToBase64(pCopy.photo);
      if (pCopy.fruitPhoto) pCopy.fruitPhoto = await window.blobToBase64(pCopy.fruitPhoto);

      promises.push(pRef.set(cleanForFirestore(pCopy), { merge: true }).catch(handleFirestoreSaveError));
      
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
          promises.push(lRef.set(cleanForFirestore(lCopy), { merge: true }).catch(handleFirestoreSaveError));
        }
      }
    }

    for (let e of generalExpenses) {
      if (!e.id) e.id = String(Date.now() + Math.random());
      const eRef = gardenRef.collection('expenses').doc(String(e.id));
      const eCopy = { ...e, ownerId: uid };
      promises.push(eRef.set(cleanForFirestore(eCopy), { merge: true }).catch(handleFirestoreSaveError));
    }

    for (let w of wishlist) {
      if (!w.id) w.id = String(Date.now() + Math.random());
      const wRef = gardenRef.collection('wishlist').doc(String(w.id));
      const wCopy = { ...w, ownerId: uid };
      if (wCopy.photo) wCopy.photo = await window.blobToBase64(wCopy.photo);
      promises.push(wRef.set(cleanForFirestore(wCopy), { merge: true }).catch(handleFirestoreSaveError));
    }

    await Promise.all(promises);
    if (typeof showAutoSaveToast === 'function') showAutoSaveToast();
  } catch (e) {
    console.error('Firebase save error:', e);
  } finally {
    window.isSyncing = false;
    if (syncToast) syncToast.classList.add('hidden');
  }
};

window.loadFromFirebase = async function(isSilent = false) {
  if (!window.currentUser || !window.db || !window.currentGardenId) {
      if (!isSilent && typeof finalizeLoad === 'function') finalizeLoad(false);
      return;
  }
  const uid = window.currentUser.uid;
  const db = window.db;
  const gId = window.currentGardenId;

  try {
    const gardenRef = db.collection('users').doc(uid).collection('gardens').doc(gId);
    
    const sysRef = gardenRef.collection('settings').doc('metadata');
    const sysDoc = await sysRef.get();
    const sysData = sysDoc.exists ? sysDoc.data() : null;

    const plRef = gardenRef.collection('plants');
    const plSnap = await plRef.get();
    let loadedPlants = [];
    for (let docSnap of plSnap.docs) {
        let pData = docSnap.data();
        let logsRef = plRef.doc(docSnap.id).collection('logs');
        let logsSnap = await logsRef.get();
        pData.logs = logsSnap.docs.map(l => l.data());
        loadedPlants.push(pData);
    }

    const expRef = gardenRef.collection('expenses');
    const expSnap = await expRef.get();
    let loadedExpenses = expSnap.docs.map(e => e.data());

    const wishRef = gardenRef.collection('wishlist');
    const wishSnap = await wishRef.get();
    let loadedWishlist = wishSnap.docs.map(w => w.data());

    gardenTitle = sysData && sysData.title ? sysData.title : "🌿 Il mio giardino";
    gardenNotes = sysData && sysData.notes ? sysData.notes : "";
    plantsDatabase = loadedPlants;
    generalExpenses = loadedExpenses;
    wishlist = loadedWishlist;

    if (typeof standardizeDatabaseIds === 'function') standardizeDatabaseIds();

    if (isSilent) {
        if (typeof finalizeSilentLoad === 'function') finalizeSilentLoad();
    } else {
        if (typeof finalizeLoad === 'function') finalizeLoad(true);
    }

  } catch (e) {
    console.error('Firebase load error:', e);
    if (!isSilent && typeof finalizeLoad === 'function') {
        // If an offline error occurs, we are still logged in, so we just finish load
        // with empty data instead of kicking the user to the startup screen.
        finalizeLoad(true);
    }
  }
};
