import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

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
const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn("Auth persistence error:", err);
});

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export { auth, db, provider };
