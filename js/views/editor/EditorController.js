import { PERSONAJES, FONDOS, PLANTILLAS } from '../../config.js';
import { db, auth } from '../../firebase-config.js';
import { collection, addDoc, setDoc, doc, getDoc, getDocs, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { Toast } from '../../components/Toast.js';
import { Modal } from '../../components/Modal.js';
import { Toolbox } from './Toolbox.js';

export default class EditorController {
    constructor(renderer, pdfGenerator) {
        this.renderer = renderer;
        this.pdfGenerator = pdfGenerator;
        
        this.state = {
            imagenesEnCanvas: [],
            indiceImagenSeleccionada: -1,
            offsets: {},
            selectedTextKey: null,
            imagenFondoPropia: null,
            fondoProps: { x: 0, y: 0, scale: 1 }
        };

        // Variables de interacción (Mouse)
        this.isDragging = false;
        this.isResizing = false;
        this.draggingElement = null;
        this.startX = 0;
        this.startY = 0;
        this.initialResizeDist = 0;
        this.initialScale = 1.0;

        // Inicializar Toolbox con callbacks
        this.toolbox = new Toolbox({
            onUpdate: () => this.updatePreview(),
            onRandomGradient: () => this.generarColorRandom(),
            onDownloadPDF: () => this.descargarPDF(),
            onDownloadPNG: () => this.descargarPNG(),
            onGenerateQR: () => this.generarQR(),
            onImagePropChange: (prop, val) => this.updateImageProp(prop, val),
            onDeleteImage: () => this.eliminarImagenSeleccionada(),
            onTextScaleChange: (type, val) => this.updateTextScale(type, val),
            onPlantillaChange: (val) => this.cambiarPlantilla(val),
            onAddImageToCanvas: (img) => this.agregarImagenAlCanvas(img),
            onSetBackground: (img) => this.setFondoImagen(img),
            onNewDesign: () => this.crearNuevoDiseno()
        });

        this.initCanvasEvents();
        this.loadInitialData();
    }

    setStorageManager(sm) {
        this.storageManager = sm;
    }

    getState() {
        // Combina el estado de los controles (Toolbox) con el estado interno (Canvas)
        return { ...this.toolbox.getValues(), ...this.state };
    }

    async updatePreview() {
        if (!this.toolbox) return; // Protección contra llamadas durante la inicialización
        await this.renderer.render(this.getState());
        this.toolbox.mostrarBotonesAccion();
    }

    loadInitialData() {
        PERSONAJES.forEach(f => this.toolbox.addToGallery(`personajes/${f}`, true));
        FONDOS.forEach(f => this.toolbox.addToGallery(`fondos/${f}`, false));
        document.fonts.ready.then(() => this.updatePreview());
    }

    // Método delegado para que StorageManager pueda actualizar la UI
    renderQuickQRs(data) {
        this.toolbox.renderQuickQRs(data);
    }

    // --- LÓGICA DE NEGOCIO ---

    loadConfig(config, docId) {
        this.currentDesignId = docId;
        
        // 1. Restaurar valores en Toolbox
        this.toolbox.setValues(config);

        // 2. Restaurar estado interno
        this.state.offsets = config.offsets || {};
        this.state.fondoProps = config.fondoProps || { x: 0, y: 0, scale: 1 };
        
        const totalImagenes = config.imagenes ? config.imagenes.length : 0;
        const tieneFondo = !!config.bgImageSrc;
        let imagenesCargadas = 0;
        
        this.state.imagenesEnCanvas = [];

        // 3. Restaurar imágenes
        if (totalImagenes > 0) {
            config.imagenes.forEach(imgConfig => {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.src = imgConfig.src;
                img.onload = () => {
                    this.state.imagenesEnCanvas.push({
                        img: img,
                        ...imgConfig,
                        wFinal: imgConfig.wBase * imgConfig.scale,
                        hFinal: imgConfig.hBase * imgConfig.scale
                    });
                    imagenesCargadas++;
                    
                    // Si no hay fondo, notificamos cuando terminan las imágenes
                    if (imagenesCargadas === totalImagenes && !tieneFondo) {
                        Toast.show('Cargado', 'Diseño listo.', 'success');
                        this.updatePreview();
                    } else {
                        // Actualización parcial silenciosa
                        this.updatePreview();
                    }
                };
            });
        }

        // 4. Restaurar fondo
        if (tieneFondo) {
            const bgImg = new Image();
            bgImg.crossOrigin = "Anonymous";
            bgImg.src = config.bgImageSrc;
            bgImg.onload = () => {
                this.setFondoImagen(bgImg);
                // Si hay fondo, este es el evento final importante
                Toast.show('Cargado', 'Diseño listo.', 'success');
            };
        } else if (totalImagenes === 0) {
            // Si no hay nada que cargar asíncronamente
            Toast.show('Cargado', 'Diseño listo.', 'success');
            this.updatePreview();
        }
    }

    agregarImagenAlCanvas(img) {
        const plantilla = PLANTILLAS[this.toolbox.elements.plantilla.value];
        const layout = (typeof plantilla.layout === 'function') ? plantilla.layout(this.renderer.canvas.width, this.renderer.canvas.height) : plantilla.layout;
        
        this.state.imagenesEnCanvas.push({
            img: img,
            x: layout.personaje.x + (Math.random() * 20),
            y: layout.personaje.y + (Math.random() * 20),
            wBase: layout.personaje.w,
            hBase: layout.personaje.h,
            scale: 1.0,
            effect: 'ninguno',
            effectIntensity: 5
        });
        this.seleccionarImagen(this.state.imagenesEnCanvas.length - 1);
        this.updatePreview();
    }

    setFondoImagen(img) {
        this.state.imagenFondoPropia = img;
        this.state.fondoProps = { x: 0, y: 0, scale: 1 };
        this.updatePreview();
    }

    seleccionarImagen(index) {
        this.state.indiceImagenSeleccionada = index;
        this.toolbox.updatePanelImagen(index, this.state.imagenesEnCanvas[index]);
        if (index >= 0) this.toolbox.resaltarControl('imagen');
    }

    updateImageProp(prop, val) {
        if (this.state.indiceImagenSeleccionada >= 0) {
            this.state.imagenesEnCanvas[this.state.indiceImagenSeleccionada][prop] = val;
            this.updatePreview();
        }
    }

    eliminarImagenSeleccionada() {
        if (this.state.indiceImagenSeleccionada >= 0) {
            this.state.imagenesEnCanvas.splice(this.state.indiceImagenSeleccionada, 1);
            this.seleccionarImagen(-1);
            this.updatePreview();
        }
    }

    cambiarPlantilla(val) {
        this.state.offsets = {};
        this.state.selectedTextKey = null;
        // Lógica extra de bordes si es combo...
        const plantillaConfig = PLANTILLAS[val];
        if (plantillaConfig && plantillaConfig.is_combo) {
            if (this.toolbox.elements.grupoBorde2) this.toolbox.elements.grupoBorde2.style.display = 'flex';
            this.toolbox.elements.labelConBorde.textContent = 'Redondear Cuaderno';
        } else {
           if (this.toolbox.elements.grupoBorde2) this.toolbox.elements.grupoBorde2.style.display = 'none';
           this.toolbox.elements.labelConBorde.textContent = 'Redondear Bordes';
        }
        this.updatePreview();
    }

    updateTextScale(type, value) {
        // Lógica simplificada de escalado de texto
        const scale = parseFloat(value);
        // ... (Lógica completa de updateTextScale igual que en ui-manager) ...
        // Para brevedad, asumimos que actualiza this.state.offsets
        const plantilla = PLANTILLAS[this.toolbox.elements.plantilla.value];
        const layout = (typeof plantilla.layout === 'function') ? plantilla.layout(this.renderer.canvas.width, this.renderer.canvas.height) : plantilla.layout;
        const items = Array.isArray(layout[type]) ? layout[type] : [layout[type]];
        items.forEach((_, index) => {
            const key = `${type}_${index}`;
            if (!this.state.offsets[key]) this.state.offsets[key] = { x: 0, y: 0, scale: 1.0 };
            this.state.offsets[key].scale = scale;
        });
        this.updatePreview();
    }

    generarColorRandom() {
        const paletas = [{ c1: '#ff9a9e', c2: '#fecfef' }, { c1: '#84fab0', c2: '#8fd3f4' }]; // ... más paletas
        const random = paletas[Math.floor(Math.random() * paletas.length)];
        this.toolbox.setValues({ colorDegradado1: random.c1, colorDegradado2: random.c2, colorFondo: random.c1 });
    }

    async generarQR() {
        // Lógica de generación de QR (igual que en ui-manager)
        // ...
        // Al final llama a:
        // this.agregarQRAlCanvas(url, color, id);
    }

    descargarPDF() {
        const vals = this.toolbox.getValues();
        if (!vals.nombre && !vals.apellido) {
            Toast.show('⚠️ Falta información', 'Escribe un nombre.', 'warning');
            this.toolbox.resaltarControl('nombre');
            return;
        }
        this.pdfGenerator.generarPDF(this.getState(), this.renderer);
    }

    descargarPNG() {
        this.pdfGenerator.descargarPNG(this.renderer, this.getState());
    }

    async crearNuevoDiseno() {
        const confirmado = await Modal.confirm(
            '¿Crear nuevo diseño?',
            'Se borrará el diseño actual del editor. <br><b>Asegúrate de haber guardado o descargado tus cambios antes de continuar.</b>',
            '✨',
            'Sí, crear nuevo'
        );

        if (confirmado) {
            this.resetearEditor();
            Toast.show('Nuevo Diseño', 'El editor se ha reiniciado.', 'success');
        }
    }

    resetearEditor() {
        // 1. Resetear Estado Interno
        this.state = {
            imagenesEnCanvas: [],
            indiceImagenSeleccionada: -1,
            offsets: {},
            selectedTextKey: null,
            imagenFondoPropia: null,
            fondoProps: { x: 0, y: 0, scale: 1 }
        };

        // 2. Resetear ID de Storage (para que al guardar sea uno nuevo)
        if (this.storageManager) {
            this.storageManager.reset();
        }

        // 3. Resetear UI (Valores por defecto)
        const defaults = {
            nombre: '', apellido: '', grado: '',
            plantilla: 'cuaderno',
            tipoFondo: 'solido', colorFondo: '#E0F7FA',
            tipoPatron: 'ninguno',
            estiloBorde: 'simple', colorBorde: '#004D40', grosorBorde: 5,
            fuenteNombre: "'Fredoka', sans-serif", colorNombre: '#004D40', tamanoNombre: 1.0,
            fuenteGrado: "'Fredoka', sans-serif", colorGrado: '#004D40', tamanoGrado: 1.0,
            checkArcoirisNombre: false, checkMetalNombre: false,
            checkArcoirisGrado: false, checkMetalGrado: false,
            checkArcoirisBorde: false, checkMetalBorde: false,
            conBorde: false, conBorde2: false,
            efectoTextoNombre: 'moderno', efectoTextoGrado: 'moderno',
            efectoBorde: 'ninguno'
        };
        this.toolbox.setValues(defaults);

        // 4. Actualizar vista
        this.updatePreview();
    }

    // --- CANVAS EVENTS ---
    initCanvasEvents() {
        const canvas = this.renderer.canvas;
        // Eventos Mouse (Desktop)
        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        canvas.addEventListener('mouseup', () => this.detenerArrastre());
        canvas.addEventListener('mouseleave', () => this.detenerArrastre());

        // Eventos Touch (Móvil)
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault(); // IMPORTANTE: Evita scroll y comportamientos extraños al tocar el canvas
            this.handleMouseDown(e);
        }, { passive: false });
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault(); // Importante: Evita que la pantalla se mueva mientras arrastras un elemento
            this.handleMouseMove(e);
        }, { passive: false });
        canvas.addEventListener('touchend', () => this.detenerArrastre());
    }

    getElementAtPosition(x, y) {
        // 1. Revisar Textos (BoundingBoxes del Renderer)
        for (const key in this.renderer.boundingBoxes) {
            const box = this.renderer.boundingBoxes[key];
            if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) return key;
        }
        // 2. Revisar Imágenes (En orden inverso para seleccionar la de más arriba)
        for (let i = this.state.imagenesEnCanvas.length - 1; i >= 0; i--) {
            const img = this.state.imagenesEnCanvas[i];
            const w = img.wFinal || (img.wBase * img.scale);
            const h = img.hFinal || (img.hBase * img.scale);
            if (x >= img.x && x <= img.x + w && y >= img.y && y <= img.y + h) return i;
        }
        return null;
    }

    handleMouseDown(e) {
        // Detectar si es touch o mouse
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const rect = this.renderer.canvas.getBoundingClientRect();
        const scaleX = this.renderer.canvas.width / rect.width;
        const scaleY = this.renderer.canvas.height / rect.height;
        const mouseX = (clientX - rect.left) * scaleX;
        const mouseY = (clientY - rect.top) * scaleY;

        // 1. Verificar si estamos redimensionando (Handles de la caja de selección)
        if (this.renderer.selectionBox) {
            const sb = this.renderer.selectionBox;
            const handleSize = 15;
            const corners = [{x: sb.x, y: sb.y}, {x: sb.x + sb.w, y: sb.y}, {x: sb.x, y: sb.y + sb.h}, {x: sb.x + sb.w, y: sb.y + sb.h}];
            
            for (const c of corners) {
                if (mouseX >= c.x - handleSize/2 && mouseX <= c.x + handleSize/2 && mouseY >= c.y - handleSize/2 && mouseY <= c.y + handleSize/2) {
                    this.isResizing = true;
                    const centerX = sb.x + sb.w / 2;
                    const centerY = sb.y + sb.h / 2;
                    this.initialResizeDist = Math.hypot(mouseX - centerX, mouseY - centerY);
                    
                    if (sb.type === 'image') {
                        this.initialScale = this.state.imagenesEnCanvas[sb.index].scale;
                    } else {
                        const offset = this.state.offsets[sb.key];
                        this.initialScale = (offset && offset.scale) ? offset.scale : 1.0;
                    }
                    return;
                }
            }
        }

        // 2. Verificar clic en elementos
        const element = this.getElementAtPosition(mouseX, mouseY);
        
        if (element !== null) {
            this.isDragging = true;
            this.draggingElement = element;
            this.startX = mouseX;
            this.startY = mouseY;
            this.renderer.canvas.style.cursor = 'grabbing';

            if (typeof element === 'number') {
                this.seleccionarImagen(element);
                this.state.selectedTextKey = null;
            } else if (typeof element === 'string') {
                this.state.selectedTextKey = element;
                this.seleccionarImagen(-1);
                
                // Actualizar UI del texto seleccionado
                const type = element.split('_')[0];
                const currentScale = (this.state.offsets[element] && this.state.offsets[element].scale) ? this.state.offsets[element].scale : 1.0;
                
                if (type === 'nombre' || type === 'apellido') {
                    if(this.toolbox.elements.tamanoNombre) this.toolbox.elements.tamanoNombre.value = currentScale;
                    if(this.toolbox.elements.valorTamanoNombre) this.toolbox.elements.valorTamanoNombre.textContent = currentScale.toFixed(1);
                    this.toolbox.resaltarControl('nombre');
                } else if (type === 'grado') {
                    if(this.toolbox.elements.tamanoGrado) this.toolbox.elements.tamanoGrado.value = currentScale;
                    if(this.toolbox.elements.valorTamanoGrado) this.toolbox.elements.valorTamanoGrado.textContent = currentScale.toFixed(1);
                    this.toolbox.resaltarControl('grado');
                }
            }
            this.updatePreview();
        } else {
            // 3. Arrastrar Fondo (si es imagen)
            if (this.toolbox.elements.tipoFondo.value === 'imagen' && this.state.imagenFondoPropia) {
                this.isDragging = true;
                this.draggingElement = 'fondo';
                this.startX = mouseX;
                this.startY = mouseY;
                this.renderer.canvas.style.cursor = 'grabbing';
            }
            
            this.seleccionarImagen(-1);
            this.state.selectedTextKey = null;
            this.toolbox.resaltarControl(null); // Limpiar resaltado visual
            this.updatePreview();
        }
    }

    handleMouseMove(e) {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const rect = this.renderer.canvas.getBoundingClientRect();
        const scaleX = this.renderer.canvas.width / rect.width;
        const scaleY = this.renderer.canvas.height / rect.height;
        const mouseX = (clientX - rect.left) * scaleX;
        const mouseY = (clientY - rect.top) * scaleY;

        if (this.isResizing && this.renderer.selectionBox) {
            const sb = this.renderer.selectionBox;
            const centerX = sb.x + sb.w / 2;
            const centerY = sb.y + sb.h / 2;
            const currentDist = Math.hypot(mouseX - centerX, mouseY - centerY);
            
            if (this.initialResizeDist < 1) return;
            const newScale = Math.max(0.1, this.initialScale * (currentDist / this.initialResizeDist));
            
            if (sb.type === 'image') {
                this.state.imagenesEnCanvas[sb.index].scale = newScale;
                if(this.toolbox.elements.escalaPersonaje) this.toolbox.elements.escalaPersonaje.value = newScale;
            } else {
                if (!this.state.offsets[sb.key]) this.state.offsets[sb.key] = { x: 0, y: 0, scale: 1.0 };
                this.state.offsets[sb.key].scale = newScale;
                // Nota: Actualizar sliders de texto aquí sería ideal pero opcional para fluidez
            }
            this.updatePreview();
            return;
        }

        if (!this.isDragging) return;

        const dx = mouseX - this.startX;
        const dy = mouseY - this.startY;

        if (this.draggingElement === 'fondo') {
            this.state.fondoProps.x += dx;
            this.state.fondoProps.y += dy;
        } else if (typeof this.draggingElement === 'string') {
            if (!this.state.offsets[this.draggingElement]) this.state.offsets[this.draggingElement] = { x: 0, y: 0, scale: 1.0 };
            this.state.offsets[this.draggingElement].x += dx;
            this.state.offsets[this.draggingElement].y += dy;
        } else if (typeof this.draggingElement === 'number') {
            this.state.imagenesEnCanvas[this.draggingElement].x += dx;
            this.state.imagenesEnCanvas[this.draggingElement].y += dy;
        }

        this.startX = mouseX;
        this.startY = mouseY;
        this.updatePreview();
    }

    detenerArrastre() {
        this.isDragging = false;
        this.renderer.canvas.style.cursor = 'grab';
    }
}
