const firebaseConfig = {
  projectId: "gen-lang-client-0305062869",
  appId: "1:18821225703:web:037be76f6e9ebbff7c1642",
  apiKey: "AIzaSyDoQpPTgyzxcOTSlMzu3aGyPVNso6w0v1w",
  authDomain: "gen-lang-client-0305062869.firebaseapp.com",
  storageBucket: "gen-lang-client-0305062869.firebasestorage.app",
  messagingSenderId: "18821225703"
};

// Initialize Firebase
if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
  window.db = firebase.firestore();
  window.db.enablePersistence({synchronizeTabs:true}).catch(err => console.error('Persistence err:', err));
  
  window.auth = firebase.auth();
  window.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(err => console.error(err));

}

window.blobToBase64 = function(blob) {
  return new Promise((resolve, reject) => {
    if (!blob) return resolve("");
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

window.base64ToBlob = async function(base64) {
  if (!base64 || !base64.startsWith('data:')) return base64;
  try {
    const res = await fetch(base64);
    return await res.blob();
  } catch (e) {
    return null;
  }
};


window.fbSignIn = () => {
    if (window.auth) {
        const provider = new firebase.auth.GoogleAuthProvider();
        window.auth.signInWithPopup(provider).catch(err => {
            console.error(err);
            if(typeof Swal !== 'undefined') Swal.fire('Errore di accesso', err.message, 'error');
        });
    }
};

window.fbSignOut = () => {
    if (window.auth) {
        return window.auth.signOut();
    }
};

window.fbOnAuthStateChanged = (authObj, cb) => {
    if (window.auth) {
        window.auth.onAuthStateChanged(cb);
    }
};

window.fbAuth = true; // flag to let globals know
