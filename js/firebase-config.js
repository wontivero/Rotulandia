// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Tu configuración de Firebase (Reemplaza con tus datos reales de la consola)
const firebaseConfig = {
  apiKey: "AIzaSyAs1iE40YQBMR2LtGlvpDQut5nhwIUmvOI",
  authDomain: "rotulandia-7d441.firebaseapp.com",
  projectId: "rotulandia-7d441",
  storageBucket: "rotulandia-7d441.firebasestorage.app",
  messagingSenderId: "750994175684",
  appId: "1:750994175684:web:936f5fcf7621bdddcf7b91"
};


// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios para usarlos en otros módulos
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
