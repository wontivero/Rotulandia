// js/main.js
import { CanvasRenderer } from './canvas-renderer.js';
import { PDFGenerator } from './pdf-generator.js';
import { UIManager } from './ui-manager.js';

document.addEventListener('DOMContentLoaded', () => {
    const renderer = new CanvasRenderer('canvas-rotulo', 'spinner-carga');
    const pdfGenerator = new PDFGenerator();
    new UIManager(renderer, pdfGenerator);
});
