import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

class Store {
    constructor() {
        this.state = {
            user: null,
            isAuthenticated: false
        };
        this.listeners = [];
        
        // Escuchar cambios de autenticación de Firebase centralizadamente
        onAuthStateChanged(auth, (user) => {
            this.state.user = user;
            this.state.isAuthenticated = !!user;
            this.notify();
        });
    }

    subscribe(listener) {
        this.listeners.push(listener);
        listener(this.state); // Ejecutar inmediatamente con el estado actual
        return () => { this.listeners = this.listeners.filter(l => l !== listener); };
    }

    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }
}

export const store = new Store();