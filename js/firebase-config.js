import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, 
    enableMultiTabIndexedDbPersistence, 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    getDocs 
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
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
const db = getFirestore(app);

// Abilita la persistenza offline multi-tab per le PWA
enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn("Multiple tabs open, persistence can only be enabled in one tab at a a time.");
    } else if (err.code == 'unimplemented') {
        console.warn("The current browser does not support all of the features required to enable persistence");
    }
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

console.log("[Firebase] Configured and exported to window");
