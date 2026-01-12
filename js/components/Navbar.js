import { store } from '../store.js';

export class Navbar {
    constructor(authManager) {
        this.authManager = authManager;
        this.elements = {
            btnLogin: document.getElementById('btn-login'),
            btnLogout: document.getElementById('btn-logout'),
            userInfo: document.getElementById('user-info'),
            userPhoto: document.getElementById('user-photo'),
            userName: document.getElementById('user-name'),
            navEditor: document.getElementById('nav-editor'),
            navMisDisenos: document.getElementById('nav-mis-disenos'),
            brandLink: document.getElementById('brand-link'),
            btnTutorialFinalizar: document.getElementById('btn-tutorial-finalizar')
        };

        this.initEvents();
        
        // Suscribirse al estado global para actualizar la UI automáticamente
        store.subscribe((state) => this.render(state));
    }

    initEvents() {
        // Botones de Login/Logout
        if (this.elements.btnLogin) {
            this.elements.btnLogin.addEventListener('click', () => this.authManager.login());
        }
        if (this.elements.btnLogout) {
            this.elements.btnLogout.addEventListener('click', () => this.authManager.logout());
        }

        // Protección de navegación (Interceptar clics)
        const protectRoute = (e) => {
            if (!store.state.isAuthenticated) {
                e.preventDefault();
                this.authManager.login();
            }
        };

        if (this.elements.navEditor) this.elements.navEditor.addEventListener('click', protectRoute);
        if (this.elements.navMisDisenos) this.elements.navMisDisenos.addEventListener('click', protectRoute);

        // Links Globales
        if (this.elements.brandLink) {
            this.elements.brandLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.hash = '/';
            });
        }
    }

    render(state) {
        if (state.isAuthenticated && state.user) {
            if(this.elements.btnLogin) this.elements.btnLogin.classList.add('d-none');
            if(this.elements.userInfo) this.elements.userInfo.classList.remove('d-none');
            if(this.elements.userPhoto) this.elements.userPhoto.src = state.user.photoURL;
            if(this.elements.userName) this.elements.userName.textContent = state.user.displayName.split(' ')[0];
        } else {
            if(this.elements.btnLogin) this.elements.btnLogin.classList.remove('d-none');
            if(this.elements.userInfo) this.elements.userInfo.classList.add('d-none');
            if(this.elements.userPhoto) this.elements.userPhoto.src = '';
            if(this.elements.userName) this.elements.userName.textContent = '';
        }
    }
}