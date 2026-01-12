import { View } from '../core/View.js';
import { store } from '../store.js';
import { StorageManager } from '../services/storage.js';
import { Toast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';

export default class DashboardView extends View {
    constructor(params) {
        super(params);
        this.setTitle('Mis Diseños');
    }

    async getHtml() {
        return `
            <style>
                .diseno-card {
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .diseno-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important;
                }
            </style>
            <div id="mis-disenos-container" class="container mt-5 fade-in">
                <h2 class="mb-4">📂 Mis Diseños Guardados</h2>
                <div id="lista-disenos" class="row row-cols-1 row-cols-md-3 row-cols-lg-4 g-4">
                    <!-- Aquí se cargarán las tarjetas de diseños -->
                </div>
            </div>
        `;
    }

    async mount() {
        // Limpiar cualquier estado de edición pendiente al entrar al Dashboard
        localStorage.removeItem('pendingDesignId');
        localStorage.removeItem('isDuplicate');

        // Mock de UIManager para el Dashboard (solo necesitamos lo básico)
        const mockUiManager = {
            renderQuickQRs: () => {}, // No necesario aquí
            getState: () => ({}) // Dummy
        };

        this.storageManager = new StorageManager(mockUiManager);
        this.storageManager.initDashboardEvents();

        if (store.state.user) {
            this.storageManager.cargarMisDisenos(store.state.user.uid);
        }
    }
}