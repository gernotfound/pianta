import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, deleteUser, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    waitForPendingWrites,
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    getDocs,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBDxLXiyuJ_bkc5Z1hkGFbuWHPLnSoM81c",
    authDomain: "pianta-db.firebaseapp.com",
    projectId: "pianta-db",
    storageBucket: "pianta-db.firebasestorage.app",
    messagingSenderId: "1079730191932",
    appId: "1:1079730191932:web:b98a5448af069d89880d39",
    measurementId: "G-CTBWXGPZKR"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn("Auth persistence error:", err);
});
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

// Inizializza Firestore con la cache offline moderna multi-tab
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Esponiamo al window object per renderli accessibili globalmente dai file non a moduli
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseProvider = provider;
window.firebaseSignIn = signInWithPopup;
window.firebaseSignInRedirect = signInWithRedirect;
window.firebaseGetRedirectResult = getRedirectResult;
window.firebaseSignOut = signOut;
window.firebaseDoc = doc;
window.firebaseSetDoc = setDoc;
window.firebaseGetDoc = getDoc;
window.firebaseCollection = collection;
window.firebaseGetDocs = getDocs;
window.firebaseOnAuthStateChanged = onAuthStateChanged;
window.firebaseWaitForPendingWrites = waitForPendingWrites;
window.firebaseDeleteUser = deleteUser;
window.firebaseDeleteDoc = deleteDoc;

console.log("[Firebase] Configured and exported to window");
