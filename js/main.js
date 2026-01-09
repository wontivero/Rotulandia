// js/main.js
import { CanvasRenderer } from './canvas-renderer.js';
import { PDFGenerator } from './pdf-generator.js';
import { UIManager } from './ui-manager.js';
import { AuthManager } from './auth.js';
import { StorageManager } from './storage.js';

document.addEventListener('DOMContentLoaded', () => {
    const renderer = new CanvasRenderer('canvas-rotulo', 'spinner-carga');
    const pdfGenerator = new PDFGenerator();
    const uiManager = new UIManager(renderer, pdfGenerator);
    new AuthManager();
    window.storageManager = new StorageManager(uiManager);
});
