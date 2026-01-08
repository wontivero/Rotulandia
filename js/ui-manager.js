// js/ui-manager.js
import { PERSONAJES, PLANTILLAS } from './config.js';

export class UIManager {
    constructor(renderer, pdfGenerator) {
        this.renderer = renderer;
        this.pdfGenerator = pdfGenerator;
        this.state = {
            imagenesEnCanvas: [],
            indiceImagenSeleccionada: -1,
            offsets: {},
            selectedTextKey: null,
            imagenFondoPropia: null
        };
        
        this.isDragging = false;
        this.isResizing = false;
        this.draggingElement = null;
        this.startX = 0;
        this.startY = 0;
        this.initialResizeDist = 0;
        this.initialScale = 1.0;

        this.initElements();
        this.initEvents();
        this.loadInitialData();
    }

    initElements() {
        // Mapeo de IDs a propiedades del estado
        this.elements = {
            inputNombre: document.getElementById('nombre'),
            inputApellido: document.getElementById('apellido'),
            inputGrado: document.getElementById('grado'),
            inputColorFondo: document.getElementById('color-fondo'),
            inputColorDegradado1: document.getElementById('color-degradado-1'),
            inputColorDegradado2: document.getElementById('color-degradado-2'),
            inputFuenteNombre: document.getElementById('fuente-nombre'),
            inputColorNombre: document.getElementById('color-nombre'),
            selectEfectoTextoNombre: document.getElementById('efecto-texto-nombre'),
            inputTamanoNombre: document.getElementById('tamano-nombre'),
            spanTamanoNombre: document.getElementById('valor-tamano-nombre'),
            inputFuenteGrado: document.getElementById('fuente-grado'),
            inputColorGrado: document.getElementById('color-grado'),
            selectEfectoTextoGrado: document.getElementById('efecto-texto-grado'),
            inputTamanoGrado: document.getElementById('tamano-grado'),
            spanTamanoGrado: document.getElementById('valor-tamano-grado'),
            selectPlantilla: document.getElementById('plantilla'),
            selectTipoPatron: document.getElementById('tipo-patron'),
            selectTipoFondo: document.getElementById('tipo-fondo'),
            selectEstiloBorde: document.getElementById('estilo-borde'),
            inputColorBorde: document.getElementById('color-borde'),
            inputGrosorBorde: document.getElementById('grosor-borde'),
            inputNuevoFondo: document.getElementById('input-nuevo-fondo'),
            inputNuevoPersonaje: document.getElementById('input-nuevo-personaje'),
            selectEfectoPersonaje: document.getElementById('efecto-personaje'),
            checkboxBorde: document.getElementById('con-borde'),
            checkboxBorde2: document.getElementById('con-borde-2'),
            grupoBorde2: document.getElementById('grupo-borde-2'),
            labelConBorde: document.getElementById('label-con-borde'),
            controlSolido: document.getElementById('control-color-solido'),
            controlDegradado: document.getElementById('control-color-degradado'),
            botonGenerar: document.getElementById('boton-generar'),
            botonDescargarPDF: document.getElementById('boton-descargar-pdf'),
            botonDescargarPNG: document.getElementById('boton-descargar-png'),
            btnRandomGradient: document.getElementById('btn-random-gradient'),
            controlImagenFondo: document.getElementById('control-imagen-fondo'),
            inputEscalaPersonaje: document.getElementById('escala-personaje'),
            panelImagenSeleccionada: document.getElementById('panel-imagen-seleccionada'),
            btnEliminarImagen: document.getElementById('btn-eliminar-imagen'),
            inputTextoQR: document.getElementById('texto-qr'),
            inputColorQR: document.getElementById('color-qr'),
            btnAgregarQR: document.getElementById('btn-agregar-qr'),
            galeria: document.getElementById('seleccion-personaje'),
            galeriaFondos: document.getElementById('galeria-fondos')
        };
    }

    getState() {
        const current = {};
        for (const key in this.elements) {
            if (this.elements[key] && (this.elements[key].type === 'checkbox')) {
                current[key] = this.elements[key].checked;
            } else if (this.elements[key] && this.elements[key].value !== undefined) {
                current[key] = this.elements[key].value;
            }
        }
        return { ...current, ...this.state };
    }

    async updatePreview() {
        await this.renderer.render(this.getState());
        this.elements.botonDescargarPDF.classList.remove('boton-descarga-oculto');
        this.elements.botonDescargarPNG.classList.remove('boton-descarga-oculto');
    }

    initEvents() {
        // Eventos de inputs para actualizar vista previa
        const interactiveElements = [
            'inputNombre', 'inputApellido', 'inputGrado', 'inputColorFondo', 'selectPlantilla',
            'selectTipoFondo', 'inputColorDegradado1', 'inputColorDegradado2', 'checkboxBorde', 'checkboxBorde2',
            'selectTipoPatron', 'selectEstiloBorde', 'inputColorBorde', 'inputGrosorBorde',
            'inputFuenteNombre', 'inputColorNombre', 'selectEfectoTextoNombre',
            'inputFuenteGrado', 'inputColorGrado', 'selectEfectoTextoGrado'
        ];

        interactiveElements.forEach(key => {
            if (this.elements[key]) {
                this.elements[key].addEventListener('input', () => this.updatePreview());
            }
        });

        this.elements.botonGenerar.addEventListener('click', () => this.updatePreview());
        this.elements.btnRandomGradient.addEventListener('click', () => this.generarColorRandom());
        
        this.elements.selectTipoFondo.addEventListener('input', () => {
            this.elements.controlSolido.style.display = (this.elements.selectTipoFondo.value === 'solido') ? 'block' : 'none';
            this.elements.controlDegradado.style.display = (this.elements.selectTipoFondo.value === 'degradado') ? 'flex' : 'none';
            this.elements.controlImagenFondo.style.display = (this.elements.selectTipoFondo.value === 'imagen') ? 'block' : 'none';
        });

        this.elements.selectPlantilla.addEventListener('change', () => {
            this.state.offsets = {};
            this.state.selectedTextKey = null;
            const isCombo = PLANTILLAS[this.elements.selectPlantilla.value].is_combo;
            if (isCombo) {
                this.elements.grupoBorde2.style.display = 'flex';
                this.elements.labelConBorde.textContent = 'Redondear Cuaderno';
            } else {
                this.elements.grupoBorde2.style.display = 'none';
                this.elements.labelConBorde.textContent = 'Redondear Bordes';
            }
            this.updatePreview();
        });

        // Manejo de archivos
        this.setupFileUpload(this.elements.inputNuevoFondo, false);
        this.setupFileUpload(this.elements.inputNuevoPersonaje, true);

        // Eventos de imagen seleccionada
        this.elements.inputEscalaPersonaje.addEventListener('input', (e) => {
            if (this.state.indiceImagenSeleccionada >= 0) {
                this.state.imagenesEnCanvas[this.state.indiceImagenSeleccionada].scale = parseFloat(e.target.value);
                this.updatePreview();
            }
        });

        this.elements.selectEfectoPersonaje.addEventListener('input', (e) => {
            if (this.state.indiceImagenSeleccionada >= 0) {
                this.state.imagenesEnCanvas[this.state.indiceImagenSeleccionada].effect = e.target.value;
                this.updatePreview();
            }
        });

        this.elements.btnEliminarImagen.addEventListener('click', () => {
            if (this.state.indiceImagenSeleccionada >= 0) {
                this.state.imagenesEnCanvas.splice(this.state.indiceImagenSeleccionada, 1);
                this.state.indiceImagenSeleccionada = -1;
                this.actualizarPanelImagen();
                this.updatePreview();
            }
        });

        // QR
        this.elements.btnAgregarQR.addEventListener('click', () => this.generarQR());

        // Descargas
        this.elements.botonDescargarPDF.addEventListener('click', () => this.pdfGenerator.generarPDF(this.getState(), this.renderer));
        this.elements.botonDescargarPNG.addEventListener('click', () => this.pdfGenerator.descargarPNG(this.renderer, this.getState()));

        // Canvas Interacción
        const canvas = this.renderer.canvas;
        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        canvas.addEventListener('mouseup', () => this.detenerArrastre());
        canvas.addEventListener('mouseleave', () => this.detenerArrastre());

        // Text Scale Listeners
        this.elements.inputTamanoNombre.addEventListener('input', (e) => {
            this.elements.spanTamanoNombre.textContent = e.target.value;
            this.updateTextScale('nombre', e.target.value);
            this.updateTextScale('apellido', e.target.value);
        });
        this.elements.inputTamanoGrado.addEventListener('input', (e) => {
            this.elements.spanTamanoGrado.textContent = e.target.value;
            this.updateTextScale('grado', e.target.value);
        });
    }

    loadInitialData() {
        PERSONAJES.forEach((nombreArchivo) => {
            this.agregarImagenAGaleria(`personajes/${nombreArchivo}`, this.elements.galeria, true);
        });
        document.fonts.ready.then(() => this.updatePreview());
    }

    setupFileUpload(input, esPersonaje) {
        input.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const src = event.target.result;
                        const contenedor = esPersonaje ? this.elements.galeria : this.elements.galeriaFondos;
                        this.agregarImagenAGaleria(src, contenedor, esPersonaje);
                    };
                    reader.readAsDataURL(file);
                }
            });
        });
    }

    agregarImagenAGaleria(src, contenedor, esPersonaje = true) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = esPersonaje ? 'Personaje' : 'Fondo';
        img.addEventListener('click', () => {
            if (esPersonaje) {
                const plantilla = PLANTILLAS[this.elements.selectPlantilla.value];
                const layout = (typeof plantilla.layout === 'function') ? plantilla.layout(this.renderer.canvas.width, this.renderer.canvas.height) : plantilla.layout;
                this.state.imagenesEnCanvas.push({
                    img: img,
                    x: layout.personaje.x + (Math.random() * 20),
                    y: layout.personaje.y + (Math.random() * 20),
                    wBase: layout.personaje.w,
                    hBase: layout.personaje.h,
                    scale: 1.0,
                    effect: 'ninguno'
                });
                this.state.indiceImagenSeleccionada = this.state.imagenesEnCanvas.length - 1;
                this.actualizarPanelImagen();
            } else {
                document.querySelectorAll('#galeria-fondos img').forEach(el => el.classList.remove('seleccionado'));
                img.classList.add('seleccionado');
                this.state.imagenFondoPropia = img;
            }
            this.updatePreview();
        });
        const botonSubir = contenedor.querySelector('.boton-subir-imagen');
        contenedor.insertBefore(img, botonSubir);
    }

    generarColorRandom() {
        const paletas = [
            { c1: '#ff9a9e', c2: '#fecfef' }, { c1: '#a18cd1', c2: '#fbc2eb' },
            { c1: '#84fab0', c2: '#8fd3f4' }, { c1: '#fccb90', c2: '#d57eeb' },
            { c1: '#e0c3fc', c2: '#8ec5fc' }, { c1: '#f093fb', c2: '#f5576c' },
            { c1: '#4facfe', c2: '#00f2fe' }
        ];
        const randomPalette = paletas[Math.floor(Math.random() * paletas.length)];
        this.elements.inputColorDegradado1.value = randomPalette.c1;
        this.elements.inputColorDegradado2.value = randomPalette.c2;
        this.elements.inputColorFondo.value = randomPalette.c1;
        this.updatePreview();
    }

    generarQR() {
        if (!this.elements.inputTextoQR.value) {
            alert('Por favor, escribe un teléfono o texto para el QR.');
            return;
        }
        const textoIngresado = this.elements.inputTextoQR.value.trim();
        const telefonoLimpio = textoIngresado.replace(/\D/g, '');
        let valorFinalQR = textoIngresado;

        if (telefonoLimpio.length >= 7) {
            const nombre = encodeURIComponent(this.elements.inputNombre.value.trim());
            const apellido = encodeURIComponent(this.elements.inputApellido.value.trim());
            let baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
            valorFinalQR = `contacto.html?t=`;
            if (nombre) valorFinalQR += `&n=`;
            if (apellido) valorFinalQR += `&a=`;
        }

        const qr = new QRious({
            value: valorFinalQR,
            foreground: this.elements.inputColorQR.value,
            size: 500,
            level: 'L'
        });

        const img = new Image();
        img.src = qr.toDataURL();
        img.onload = () => {
            const plantilla = PLANTILLAS[this.elements.selectPlantilla.value];
            const layout = (typeof plantilla.layout === 'function') ? plantilla.layout(this.renderer.canvas.width, this.renderer.canvas.height) : plantilla.layout;
            this.state.imagenesEnCanvas.push({
                img: img,
                x: layout.personaje.x + 50,
                y: layout.personaje.y + 50,
                wBase: 100,
                hBase: 100,
                scale: 1.0,
                effect: 'ninguno'
            });
            this.state.indiceImagenSeleccionada = this.state.imagenesEnCanvas.length - 1;
            this.actualizarPanelImagen();
            this.updatePreview();
        };
    }

    actualizarPanelImagen() {
        if (this.state.indiceImagenSeleccionada >= 0 && this.state.imagenesEnCanvas[this.state.indiceImagenSeleccionada]) {
            this.elements.panelImagenSeleccionada.style.display = 'block';
            const imgData = this.state.imagenesEnCanvas[this.state.indiceImagenSeleccionada];
            this.elements.inputEscalaPersonaje.value = imgData.scale;
            this.elements.selectEfectoPersonaje.value = imgData.effect;
        } else {
            this.elements.panelImagenSeleccionada.style.display = 'none';
        }
    }

    resaltarControles(tipo) {
        document.getElementById('grupo-nombre').classList.remove('grupo-destacado');
        document.getElementById('grupo-grado').classList.remove('grupo-destacado');
        document.getElementById('panel-imagen-seleccionada').classList.remove('grupo-destacado');
        let elementoDestino = null;
        if (tipo === 'nombre') elementoDestino = document.getElementById('grupo-nombre');
        else if (tipo === 'grado') elementoDestino = document.getElementById('grupo-grado');
        else if (tipo === 'imagen') elementoDestino = document.getElementById('panel-imagen-seleccionada');
        if (elementoDestino) {
            elementoDestino.classList.add('grupo-destacado');
            elementoDestino.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    updateTextScale(type, value) {
        const scale = parseFloat(value);
        let targetIndex = null;
        if (this.state.selectedTextKey) {
            const parts = this.state.selectedTextKey.split('_');
            targetIndex = parts[1];
        }
        if (targetIndex !== null) {
            const key = `${type}_${targetIndex}`;
            if (!this.state.offsets[key]) this.state.offsets[key] = { x: 0, y: 0, scale: 1.0 };
            this.state.offsets[key].scale = scale;
        } else {
            // Fallback robusto: Usar la plantilla para saber qué actualizar
            // Esto funciona incluso si el canvas aún no ha generado boundingBoxes
            const plantilla = PLANTILLAS[this.elements.selectPlantilla.value];
            const layout = (typeof plantilla.layout === 'function') ? plantilla.layout(this.renderer.canvas.width, this.renderer.canvas.height) : plantilla.layout;
            
            const items = Array.isArray(layout[type]) ? layout[type] : [layout[type]];
            items.forEach((_, index) => {
                const key = `${type}_${index}`;
                if (!this.state.offsets[key]) this.state.offsets[key] = { x: 0, y: 0, scale: 1.0 };
                this.state.offsets[key].scale = scale;
            });
        }
        this.updatePreview();
    }

    // --- MOUSE EVENTS ---
    handleMouseDown(e) {
        const rect = this.renderer.canvas.getBoundingClientRect();
        const scaleX = this.renderer.canvas.width / rect.width;
        const scaleY = this.renderer.canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

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
                    if (sb.type === 'image') this.initialScale = this.state.imagenesEnCanvas[sb.index].scale;
                    else this.initialScale = this.state.offsets[sb.key].scale || 1.0;
                    return;
                }
            }
        }

        const element = this.getElementAtPosition(mouseX, mouseY);
        if (element !== null) {
            this.isDragging = true;
            this.draggingElement = element;
            this.startX = mouseX;
            this.startY = mouseY;
            this.renderer.canvas.style.cursor = 'grabbing';

            if (typeof element === 'number') {
                this.state.indiceImagenSeleccionada = element;
                this.state.selectedTextKey = null;
                this.actualizarPanelImagen();
                this.resaltarControles('imagen');
            } else if (typeof element === 'string') {
                this.state.selectedTextKey = element;
                this.state.indiceImagenSeleccionada = -1;
                this.actualizarPanelImagen();
                const type = element.split('_')[0];
                const currentScale = this.state.offsets[element] && this.state.offsets[element].scale ? this.state.offsets[element].scale : 1.0;
                if (type === 'nombre' || type === 'apellido') {
                    this.elements.inputTamanoNombre.value = currentScale;
                    this.elements.spanTamanoNombre.textContent = currentScale;
                } else if (type === 'grado') {
                    this.elements.inputTamanoGrado.value = currentScale;
                    this.elements.spanTamanoGrado.textContent = currentScale;
                }
                if (type === 'nombre' || type === 'apellido') this.resaltarControles('nombre');
                else if (type === 'grado') this.resaltarControles('grado');
            }
            this.updatePreview();
        } else {
            this.state.indiceImagenSeleccionada = -1;
            this.state.selectedTextKey = null;
            this.actualizarPanelImagen();
            this.resaltarControles(null);
            this.updatePreview();
        }
    }

    handleMouseMove(e) {
        const rect = this.renderer.canvas.getBoundingClientRect();
        const scaleX = this.renderer.canvas.width / rect.width;
        const scaleY = this.renderer.canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        if (this.isResizing && this.renderer.selectionBox) {
            const sb = this.renderer.selectionBox;
            const centerX = sb.x + sb.w / 2;
            const centerY = sb.y + sb.h / 2;
            const currentDist = Math.hypot(mouseX - centerX, mouseY - centerY);
            if (this.initialResizeDist < 1) return;
            const newScale = Math.max(0.1, this.initialScale * (currentDist / this.initialResizeDist));
            if (sb.type === 'image') {
                this.state.imagenesEnCanvas[sb.index].scale = newScale;
                this.elements.inputEscalaPersonaje.value = newScale;
            } else {
                this.state.offsets[sb.key].scale = newScale;
                const type = sb.key.split('_')[0];
                if (type === 'nombre' || type === 'apellido') {
                    this.elements.inputTamanoNombre.value = newScale;
                    this.elements.spanTamanoNombre.textContent = newScale.toFixed(1);
                } else if (type === 'grado') {
                    this.elements.inputTamanoGrado.value = newScale;
                    this.elements.spanTamanoGrado.textContent = newScale.toFixed(1);
                }
            }
            this.updatePreview();
            return;
        }

        if (!this.isDragging) return;
        const dx = mouseX - this.startX;
        const dy = mouseY - this.startY;

        if (typeof this.draggingElement === 'string') {
            if (!this.state.offsets[this.draggingElement]) this.state.offsets[this.draggingElement] = { x: 0, y: 0, scale: 1.0 };
            this.state.offsets[this.draggingElement].x += dx;
            this.state.offsets[this.draggingElement].y += dy;
        } else {
            this.state.imagenesEnCanvas[this.draggingElement].x += dx;
            this.state.imagenesEnCanvas[this.draggingElement].y += dy;
        }
        this.startX = mouseX;
        this.startY = mouseY;
        this.updatePreview();
    }

    detenerArrastre() {
        this.isDragging = false;
        this.isResizing = false;
        this.draggingElement = null;
        this.renderer.canvas.style.cursor = 'grab';
    }

    getElementAtPosition(x, y) {
        for (const key in this.renderer.boundingBoxes) {
            const box = this.renderer.boundingBoxes[key];
            if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) return key;
        }
        for (let i = this.state.imagenesEnCanvas.length - 1; i >= 0; i--) {
            const img = this.state.imagenesEnCanvas[i];
            if (x >= img.x && x <= img.x + img.wFinal && y >= img.y && y <= img.y + img.hFinal) return i;
        }
        return null;
    }
}
