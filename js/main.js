// js/main.js
import { AuthManager } from './services/auth.js';
import { Navbar } from './components/Navbar.js';
import { router } from './router.js';
import { store } from './store.js';

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar Router
    router();

    // Suscribirse al store para actualizar UI global si es necesario
    store.subscribe((state) => {
        // Aquí podríamos actualizar el navbar automáticamente
    });

    const authManager = new AuthManager();
    new Navbar(authManager);
});
