import { View } from '../core/View.js';
import { store } from '../store.js';
import { auth, googleProvider } from '../firebase-config.js';
import { signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export default class LandingView extends View {
    constructor(params) {
        super(params);
        this.setTitle('Inicio');
    }

    async getHtml() {
        return `
            <div class="container fade-in">
                <div class="row align-items-center py-5 min-vh-50">
                    <div class="col-lg-6 order-lg-1 order-2">
                        <h1 class="display-4 fw-bold lh-1 mb-3">Etiquetas escolares <span class="text-primary">únicas</span> y divertidas</h1>
                        <p class="lead text-muted mb-4">Diseña rótulos personalizados para cuadernos, lápices y útiles. Incluye códigos QR inteligentes para recuperar objetos perdidos. ¡Fácil, rápido y gratis!</p>
                        <div class="d-grid gap-2 d-md-flex justify-content-md-start">
                            <button id="btn-login-hero-view" class="btn btn-primary btn-lg px-5 rounded-pill shadow-sm">Comenzar Ahora 🚀</button>
                        </div>
                    </div>
                    <div class="col-lg-6 order-lg-2 order-1 mb-5 mb-lg-0 text-center">
                        <div class="p-5 bg-light rounded-4 border shadow-sm position-relative overflow-hidden">
                            <div style="font-size: 6rem; animation: float 3s ease-in-out infinite;">🎒</div>
                            <div style="font-size: 4rem; position: absolute; top: 20px; right: 20px; animation: float 4s ease-in-out infinite;">✏️</div>
                            <div style="font-size: 4rem; position: absolute; bottom: 20px; left: 20px; animation: float 3.5s ease-in-out infinite;">📏</div>
                            <h3 class="mt-3 text-primary">Tus diseños aquí</h3>
                        </div>
                    </div>
                </div>
                <!-- Features -->
                <div class="row g-4 py-5 row-cols-1 row-cols-md-3 text-center border-top">
                    <div class="col"><div class="fs-1 mb-3">🎨</div><h3>100% Personalizable</h3><p class="text-muted">Elige entre cientos de combinaciones.</p></div>
                    <div class="col"><div class="fs-1 mb-3">📱</div><h3>QR Dinámico</h3><p class="text-muted">Actualiza tu contacto sin reimprimir.</p></div>
                    <div class="col"><div class="fs-1 mb-3">🖨️</div><h3>PDF Optimizado</h3><p class="text-muted">Listos para imprimir en casa.</p></div>
                </div>
            </div>
        `;
    }

    async mount() {
        const btn = document.getElementById('btn-login-hero-view');
        if (btn) {
            btn.addEventListener('click', async () => {
                if (store.state.isAuthenticated) {
                    window.location.hash = '#editor';
                } else {
                    // Login simple directo desde la vista
                    try { await signInWithPopup(auth, googleProvider); } 
                    catch (e) { console.error(e); }
                }
            });
        }
    }
}