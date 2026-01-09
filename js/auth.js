// js/auth.js
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth, googleProvider, db } from "./firebase-config.js";

export class AuthManager {
    constructor() {
        this.btnLogin = document.getElementById('btn-login');
        this.btnLogout = document.getElementById('btn-logout');
        this.userInfo = document.getElementById('user-info');
        this.userPhoto = document.getElementById('user-photo');
        this.userName = document.getElementById('user-name');
        this.loginContainer = document.getElementById('login-container');
        this.landingPage = document.getElementById('landing-page');
        this.appContainer = document.getElementById('app-container');
        this.btnLoginHero = document.getElementById('btn-login-hero');

        this.initEvents();
        this.monitorAuthState();
    }

    initEvents() {
        if (this.btnLogin) {
            this.btnLogin.addEventListener('click', () => this.login());
        }
        if (this.btnLogout) {
            this.btnLogout.addEventListener('click', () => this.logout());
        }
        if (this.btnLoginHero) {
            this.btnLoginHero.addEventListener('click', () => this.login());
        }
    }

    async login() {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            console.log("Usuario logueado:", user.displayName);
            await this.saveUserToDB(user);
        } catch (error) {
            console.error("Error al iniciar sesión:", error);
            if (error.code === 'auth/unauthorized-domain') {
                alert(`Dominio no autorizado: ${window.location.hostname}\n\n1. Ve a Firebase Console -> Authentication -> Settings -> Authorized domains.\n2. Agrega este dominio: ${window.location.hostname}\n3. Verifica que estés editando el proyecto: ${auth.app.options.projectId}`);
            } else if (error.code === 'auth/popup-closed-by-user') {
                console.log("El usuario cerró la ventana de login.");
            } else {
                alert("Error al iniciar sesión: " + error.message);
            }
        }
    }

    async logout() {
        try {
            await signOut(auth);
            console.log("Sesión cerrada");
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    }

    monitorAuthState() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // Usuario logueado
                this.btnLogin.classList.add('d-none');
                this.userInfo.classList.remove('d-none');
                this.userPhoto.src = user.photoURL;
                this.userName.textContent = user.displayName.split(' ')[0]; // Solo el primer nombre
                this.landingPage.classList.add('d-none');
                this.appContainer.classList.remove('d-none');
            } else {
                // Usuario no logueado
                this.btnLogin.classList.remove('d-none');
                this.userInfo.classList.add('d-none');
                this.userPhoto.src = '';
                this.userName.textContent = '';
                this.landingPage.classList.remove('d-none');
                this.appContainer.classList.add('d-none');
            }
        });
    }

    // Función para guardar/actualizar el usuario en Firestore
    async saveUserToDB(user) {
        const userRef = doc(db, "usuarios", user.uid);
        
        try {
            // Verificamos si ya existe para no sobrescribir datos importantes si los hubiera
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                // Crear nuevo documento de usuario
                await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp()
                });
                console.log("Usuario nuevo guardado en DB");
            } else {
                // Actualizar última conexión
                await setDoc(userRef, {
                    lastLogin: serverTimestamp()
                }, { merge: true });
                console.log("Usuario existente actualizado en DB");
            }
        } catch (error) {
            console.error("Error al guardar usuario en DB:", error);
        }
    }
}
