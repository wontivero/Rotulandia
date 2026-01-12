// js/services/auth.js
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth, googleProvider, db } from "../firebase-config.js";
import { Toast } from '../components/Toast.js';

export class AuthManager {
    async login() {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            console.log("Usuario logueado:", user.displayName);
            await this.saveUserToDB(user);
            Toast.show('¡Bienvenido!', `Hola ${user.displayName.split(' ')[0]}`, 'success');
        } catch (error) {
            console.error("Error al iniciar sesión:", error);
            if (error.code === 'auth/unauthorized-domain') {
                Toast.show('Error de Dominio', 'Dominio no autorizado en Firebase.', 'error');
            } else if (error.code === 'auth/popup-closed-by-user') {
                console.log("El usuario cerró la ventana de login.");
            } else {
                Toast.show('Error', error.message, 'error');
            }
        }
    }

    async logout() {
        try {
            await signOut(auth);
            Toast.show('Sesión cerrada', 'Has salido correctamente.', 'info');
            console.log("Sesión cerrada");
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
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