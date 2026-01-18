import { PERSONAJES, FONDOS, PLANTILLAS } from '../../config.js';
import { db, auth } from '../../firebase-config.js';
import { collection, addDoc, setDoc, doc, getDoc, getDocs, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
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
        this.isUpdatingUI = false; // Bandera para evitar bucles de actualización
        this.isDragging = false;
        this.isResizing = false;
        this.draggingElement = null;
        this.startX = 0;
        this.startY = 0;
        this.initialResizeDist = 0;
        this.initialScale = 1.0;
        this.zoomLevel = 1.0; // 1.0 = 100% del tamaño visual base

        // Inicializar Toolbox con callbacks
        this.toolbox = new Toolbox({
            onUpdate: () => { this.persistTextStyles(); this.updatePreview(); },
            onRandomGradient: () => this.generarColorRandom(),
            onDownloadPDF: () => this.descargarPDF(),
            onDownloadPNG: () => this.descargarPNG(),
            onGenerateQR: () => this.generarQR(),
            onAddQRToCanvas: (qrData) => this.agregarQRGuardado(qrData),
            onImagePropChange: (prop, val) => this.updateImageProp(prop, val),
            onDeleteImage: () => this.eliminarImagenSeleccionada(),
            onTextScaleChange: (type, val) => this.updateTextScale(this.state.selectedTextKey ? this.state.selectedTextKey.split('_')[0] : 'nombre', val),
            onPlantillaChange: (val) => this.cambiarPlantilla(val),
            onAddImageToCanvas: (img) => this.agregarImagenAlCanvas(img),
            onSetBackground: (img) => this.setFondoImagen(img),
            onAddShape: (type) => this.agregarForma(type),
            onShapePropChange: (prop, val) => this.updateImageProp(prop, val), // Reutilizamos updateImageProp ya que modifica el array imagenesEnCanvas
            onNewDesign: () => this.crearNuevoDiseno(),
            onUploadFile: (file, category) => this.procesarSubidaArchivo(file, category)
        });

        this.initCanvasEvents();
        this.initZoomControls();
        this.loadInitialData();
    }

    async procesarSubidaArchivo(file, category) {
        // Si hay usuario y StorageManager, subimos a la nube para persistencia inmediata
        if (this.storageManager && auth.currentUser) {
            Toast.show('Subiendo...', 'Guardando en tu galería...', 'info');
            try {
                const url = await this.storageManager.subirArchivoInmediato(file, category);
                if (url) {
                    this.toolbox.addToGallery(url, category, true); // true = autoAssign
                }
            } catch (error) {
                console.error("Error subida inmediata:", error);
                Toast.show('Error', 'No se pudo subir la imagen.', 'error');
            }
        } else {
            // Modo invitado: Carga local (FileReader)
            const reader = new FileReader();
            reader.onload = (e) => this.toolbox.addToGallery(e.target.result, category, true);
            reader.readAsDataURL(file);
        }
    }

    persistTextStyles() {
        if (this.isUpdatingUI) return; // Si estamos actualizando la UI, no guardamos nada para evitar sobrescribir datos
        if (this.state.selectedTextKey) {
            const rawValues = this.toolbox.getValues();
            const type = this.state.selectedTextKey.split('_')[0];
            const suffix = (type === 'grado') ? 'Grado' : 'Nombre';
            
            this.state[`fuente${suffix}`] = rawValues.fuenteTexto;
            this.state[`color${suffix}`] = rawValues.colorTexto;
            this.state[`efectoTexto${suffix}`] = rawValues.efectoTexto;
            this.state[`intensidadEfecto${suffix}`] = rawValues.intensidadEfectoTexto;
            this.state[`checkArcoiris${suffix}`] = rawValues.checkArcoirisTexto;
            this.state[`shiftArcoiris${suffix}`] = rawValues.shiftArcoirisTexto;
            this.state[`checkMetal${suffix}`] = rawValues.checkMetalTexto;
            this.state[`tipoMetal${suffix}`] = rawValues.tipoMetalTexto;
        }
    }

    setStorageManager(sm) {
        this.storageManager = sm;
        
        // FIX: Cargar fondos del usuario cuando el StorageManager esté listo y Firebase confirme el usuario
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.storageManager.cargarMisFondos(user.uid);
                this.storageManager.cargarMisFormas(user.uid);
                this.storageManager.cargarMisQRs(user.uid);
            }
        });
    }

    getState() {
        // Combina el estado de los controles (Toolbox) con el estado interno (Canvas)
        const rawValues = this.toolbox.getValues();
        
        // FIX CRÍTICO: this.state va PRIMERO, rawValues (Inputs UI) va DESPUÉS.
        // Esto asegura que lo que el usuario escribe en los inputs (nombre, apellido) tenga prioridad sobre el estado interno vacío.
        const state = { ...this.state, ...rawValues };
        
        // Aplicar valores del panel de texto al elemento seleccionado
        if (this.state.selectedTextKey) {
            const type = this.state.selectedTextKey.split('_')[0]; // 'nombre', 'apellido', 'grado'
            const suffix = (type === 'grado') ? 'Grado' : 'Nombre'; // Nombre y Apellido comparten estilo
            
            // Mapear inputs genéricos a props específicas
            state[`fuente${suffix}`] = rawValues.fuenteTexto;
            state[`color${suffix}`] = rawValues.colorTexto;
            state[`efectoTexto${suffix}`] = rawValues.efectoTexto;
            state[`intensidadEfecto${suffix}`] = rawValues.intensidadEfectoTexto;
            state[`checkArcoiris${suffix}`] = rawValues.checkArcoirisTexto;
            state[`shiftArcoiris${suffix}`] = rawValues.shiftArcoirisTexto;
            state[`checkMetal${suffix}`] = rawValues.checkMetalTexto;
            state[`tipoMetal${suffix}`] = rawValues.tipoMetalTexto;
            
            // El tamaño se maneja via offsets, pero guardamos el valor base por si acaso
            state[`tamano${suffix}`] = rawValues.tamanoTextoInput;
            
            // Actualizar offsets de escala en tiempo real
            // this.updateTextScale(type, rawValues.tamanoTextoInput); // ELIMINADO: Causaba recursión infinita
        }
        
        return state;
    }

    async updatePreview() {
        if (!this.toolbox) return; // Protección contra llamadas durante la inicialización
        await this.renderer.render(this.getState());
        this.toolbox.mostrarBotonesAccion();
    }

    loadInitialData() {
        PERSONAJES.forEach(f => this.toolbox.addPrecargadoToGallery(`personajes/${f}`, 'personaje'));
        FONDOS.forEach(f => this.toolbox.addPrecargadoToGallery(`fondos/${f}`, 'fondo'));
        document.fonts.ready.then(() => this.updatePreview());
        this.toolbox.resetTextPanel(); // Mostrar mensaje inicial de "Selecciona texto"
        // Ajustar zoom inicial después de un momento para asegurar que el DOM esté listo
        setTimeout(() => this.aplicarZoom('fit'), 100);
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
        
        // Si la imagen viene de la galería de formas, aplicamos opacidad por defecto
        // Detectamos si es forma por el alt del elemento img si es posible, o simplemente aplicamos defaults generales
        const isShape = img.alt === 'forma';
        
        this.state.imagenesEnCanvas.push({
            img: img,
            x: layout.personaje.x + (Math.random() * 20),
            y: layout.personaje.y + (Math.random() * 20),
            wBase: layout.personaje.w,
            hBase: layout.personaje.h,
            scale: 1.0,
            effect: 'ninguno',
            effectIntensity: 5,
            opacity: isShape ? 0.5 : 1, // Opacidad inicial para formas subidas
            type: isShape ? 'shape' : 'image', // FIX: Identificar como forma para la UI
            shapeType: isShape ? 'uploaded' : undefined // FIX: Subtipo para el renderer
        });
        this.seleccionarImagen(this.state.imagenesEnCanvas.length - 1);
        this.updatePreview();
    }

    agregarForma(tipo) {
        const plantilla = PLANTILLAS[this.toolbox.elements.plantilla.value];
        const layout = (typeof plantilla.layout === 'function') ? plantilla.layout(this.renderer.canvas.width, this.renderer.canvas.height) : plantilla.layout;
        
        // Dimensiones base según el tipo
        let w = 100, h = 50;
        if (tipo === 'square' || tipo === 'circle') { w = 80; h = 80; }
        if (tipo === 'pill') { w = 120; h = 40; }

        this.state.imagenesEnCanvas.push({
            type: 'shape',
            shapeType: tipo,
            x: layout.personaje.x + (Math.random() * 20),
            y: layout.personaje.y + (Math.random() * 20),
            wBase: w,
            hBase: h,
            scale: 1.0,
            color: '#ffffff',
            opacity: 0.15
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
        const item = this.state.imagenesEnCanvas[index];
        
        if (item && item.type === 'shape') {
            this.toolbox.updatePanelForma(index, item);
        } else {
            this.toolbox.updatePanelImagen(index, item);
        }
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
        this.updatePreview().then(() => {
            this.aplicarZoom('fit');
        });
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

    // Función auxiliar para generar ID corto aleatorio
    generarShortId(length = 6) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    generarColorRandom() {
        const paletas = [{ c1: '#ff9a9e', c2: '#fecfef' }, { c1: '#84fab0', c2: '#8fd3f4' }]; // ... más paletas
        const random = paletas[Math.floor(Math.random() * paletas.length)];
        this.toolbox.setValues({ colorDegradado1: random.c1, colorDegradado2: random.c2, colorFondo: random.c1 });
    }

    async generarQR() {
        const texto = this.toolbox.elements.textoQr.value;
        const color = this.toolbox.elements.colorQr.value;

        if (!texto) {
            Toast.show('Falta información', 'Ingresa un teléfono o texto para el QR.', 'warning');
            return;
        }

        let qrValue = texto;
        let qrId = null;

        // Guardar en Firestore si hay usuario (QR Dinámico)
        if (auth.currentUser && this.storageManager) {
            try {
                // Usar el nombre del diseño actual o un default
                const nombreDiseno = this.state.nombre || 'Alumno';
                const apellidoDiseno = this.state.apellido || '';

                // Generar ID corto único
                let shortId = this.generarShortId();
                let isUnique = false;
                let intentos = 0;

                // Verificar unicidad (máximo 5 intentos para evitar bucles infinitos raros)
                while (!isUnique && intentos < 5) {
                    const docRefCheck = doc(db, "qrs", shortId);
                    const docSnap = await getDoc(docRefCheck);
                    if (!docSnap.exists()) isUnique = true;
                    else { shortId = this.generarShortId(); intentos++; }
                }

                // Usamos setDoc para establecer nuestro propio ID (el corto)
                await setDoc(doc(db, "qrs", shortId), {
                    uid: auth.currentUser.uid,
                    telefono: texto,
                    nombre: nombreDiseno,
                    apellido: apellidoDiseno,
                    activo: true,
                    createdAt: serverTimestamp()
                });
                qrId = shortId; // El ID del documento ES el shortId
                
                // Construir URL absoluta para el QR Dinámico
                // Detectamos la URL base actual para que funcione en local y producción
                const baseUrl = window.location.href.split('#')[0].replace('index.html', '').replace(/\/$/, '');
                qrValue = `${baseUrl}/qr.html?${qrId}`; // URL más corta (sin id=)

                this.storageManager.cargarMisQRs(auth.currentUser.uid);
                Toast.show('QR Dinámico', 'QR inteligente generado y guardado.', 'success');
            } catch (e) {
                console.error("Error guardando QR:", e);
                Toast.show('Error', 'No se pudo crear el QR dinámico. Se usará uno estático.', 'error');
                // Fallback a WhatsApp directo si falla la base de datos
                qrValue = `https://wa.me/${texto.replace(/[^0-9]/g, '')}`;
            }
        } else {
            // Modo invitado: QR Estático directo a WhatsApp
            qrValue = `https://wa.me/${texto.replace(/[^0-9]/g, '')}`;
            Toast.show('QR Estático', 'Inicia sesión para crear QRs editables.', 'info');
        }

        // Generar QR visualmente
        const qr = new window.QRious({
            value: qrValue,
            size: 500, // Alta resolución
            foreground: color,
            level: 'L' // Nivel L (Low) para menor densidad y mejor impresión en pequeño
        });
        const qrDataUrl = qr.toDataURL();

        this.agregarQRAlCanvas(qrDataUrl, color, qrId, texto);
    }

    agregarQRGuardado(qrData) {
        // Reconstruir la URL del QR dinámico usando el ID guardado
        const baseUrl = window.location.href.split('#')[0].replace('index.html', '').replace(/\/$/, '');
        // Usar shortId si existe, sino fallback al ID del documento (compatibilidad hacia atrás)
        const qrId = qrData.shortId || qrData.id;
        const qrUrl = `${baseUrl}/qr.html?${qrId}`; // URL más corta

        const qr = new window.QRious({
            value: qrUrl,
            size: 500,
            foreground: '#000000',
            level: 'L' // Nivel L para consistencia
        });
        this.agregarQRAlCanvas(qr.toDataURL(), '#000000', qrData.id, qrData.telefono);
    }

    agregarQRAlCanvas(url, color, id, content) {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = url;
        img.onload = () => {
            this.agregarImagenAlCanvas(img);
            // Ajustar propiedades del último elemento agregado (el QR)
            const index = this.state.imagenesEnCanvas.length - 1;
            const item = this.state.imagenesEnCanvas[index];
            item.isQR = true;
            item.qrId = id;
            item.qrContent = content;
            item.wBase = 100; // Tamaño base fijo para QRs
            item.hBase = 100;
            this.updatePreview();
        };
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
        
        // Guardar defaults en el estado interno también
        Object.assign(this.state, defaults);
        this.toolbox.setValues(defaults);

        // 4. Actualizar vista
        this.updatePreview();
    }

    // --- ZOOM CONTROLS ---
    initZoomControls() {
        const btnIn = document.getElementById('btn-zoom-in');
        const btnOut = document.getElementById('btn-zoom-out');
        const btnFit = document.getElementById('btn-zoom-fit');
        
        if (btnIn) btnIn.addEventListener('click', () => this.aplicarZoom('in'));
        if (btnOut) btnOut.addEventListener('click', () => this.aplicarZoom('out'));
        if (btnFit) btnFit.addEventListener('click', () => this.aplicarZoom('fit'));
    }

    aplicarZoom(action) {
        const canvas = this.renderer.canvas;
        const container = document.getElementById('contenedor-canvas');
        const indicator = document.getElementById('zoom-level-indicator');
        
        if (!canvas || !container) return;

        // Calcular el factor de ajuste para que quepa en el contenedor (Fit)
        // Usamos un margen de seguridad (padding)
        const padding = 40;
        const availableWidth = container.clientWidth - padding;
        const availableHeight = container.clientHeight - padding;
        
        // Relación de aspecto del canvas real
        const canvasRatio = canvas.width / canvas.height;
        const containerRatio = availableWidth / availableHeight;

        let fitWidth;
        if (canvasRatio > containerRatio) {
            fitWidth = availableWidth;
        } else {
            fitWidth = availableHeight * canvasRatio;
        }

        if (action === 'fit') {
            this.zoomLevel = 1.0; // Reiniciamos nivel relativo
            canvas.style.width = `${fitWidth}px`;
            canvas.style.height = `${fitWidth / canvasRatio}px`;
        } else {
            const currentWidth = parseFloat(canvas.style.width) || fitWidth;
            const factor = action === 'in' ? 1.2 : 0.8;
            const newWidth = currentWidth * factor;
            
            canvas.style.width = `${newWidth}px`;
            canvas.style.height = `${newWidth / canvasRatio}px`;
            
            // Actualizar nivel relativo para mostrar al usuario (aprox)
            // Comparamos el ancho actual con el ancho "Fit" para dar un porcentaje relativo a la pantalla
            this.zoomLevel = newWidth / fitWidth;
        }

        if (indicator) {
            indicator.textContent = `${Math.round(this.zoomLevel * 100)}%`;
        }
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

        // Evento Teclado (Delete) para eliminar elementos
        document.addEventListener('keydown', (e) => {
            // Verificar si el canvas sigue en el DOM para evitar acciones de controladores viejos
            if (!document.body.contains(canvas)) return;

            if (e.key === 'Delete') {
                // Evitar borrar si se está escribiendo en un input
                if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
                
                if (this.state.indiceImagenSeleccionada >= 0) {
                    this.eliminarImagenSeleccionada();
                }
                // Nota: Para texto fijo (Nombre/Grado) no lo eliminamos para no romper la plantilla, solo imágenes/formas.
            }
        });
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
            
            for (let i = 0; i < corners.length; i++) {
                const c = corners[i];
                if (mouseX >= c.x - handleSize/2 && mouseX <= c.x + handleSize/2 && mouseY >= c.y - handleSize/2 && mouseY <= c.y + handleSize/2) {
                    this.isResizing = true;
                    this.resizeHandle = i; // 0:TL, 1:TR, 2:BL, 3:BR
                    const centerX = sb.x + sb.w / 2;
                    const centerY = sb.y + sb.h / 2;
                    this.initialResizeDist = Math.hypot(mouseX - centerX, mouseY - centerY);
                    
                    if (sb.type === 'image') {
                        const img = this.state.imagenesEnCanvas[sb.index];
                        this.initialScale = img.scale;
                        // Guardar estado inicial para redimensionamiento libre (Formas)
                        this.resizeStartProps = {
                            x: img.x,
                            y: img.y,
                            w: img.wFinal,
                            h: img.hFinal,
                            wBase: img.wBase,
                            hBase: img.hBase,
                            scale: img.scale
                        };
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
            
            // Guardar cambios del elemento anterior antes de cambiar la selección
            this.persistTextStyles();
            
            this.draggingElement = element;
            this.startX = mouseX;
            this.startY = mouseY;
            this.renderer.canvas.style.cursor = 'grabbing';

            if (typeof element === 'number') {
                this.seleccionarImagen(element);
                this.toolbox.resetTextPanel(); // Deseleccionar texto visualmente
                this.state.selectedTextKey = null;
            } else if (typeof element === 'string') {
                this.state.selectedTextKey = element;
                this.seleccionarImagen(-1);
                
                // Actualizar Panel de Texto Unificado
                const type = element.split('_')[0];
                const suffix = (type === 'grado') ? 'Grado' : 'Nombre';
                const currentConfig = this.state; // FIX: Leer directo del estado interno para no contaminar con la toolbar vieja
                const currentScale = (this.state.offsets[element] && this.state.offsets[element].scale) ? this.state.offsets[element].scale : 1.0;
                
                // Preparar config para el panel
                const panelConfig = {
                    fuente: currentConfig[`fuente${suffix}`],
                    color: currentConfig[`color${suffix}`],
                    tamano: currentScale,
                    efecto: currentConfig[`efectoTexto${suffix}`],
                    intensidad: currentConfig[`intensidadEfecto${suffix}`],
                    arcoiris: currentConfig[`checkArcoiris${suffix}`],
                    shiftArcoiris: currentConfig[`shiftArcoiris${suffix}`],
                    metal: currentConfig[`checkMetal${suffix}`],
                    tipoMetal: currentConfig[`tipoMetal${suffix}`]
                };

                const label = type.charAt(0).toUpperCase() + type.slice(1);
                
                this.isUpdatingUI = true; // Bloquear guardado automático
                this.toolbox.updateTextPanel(panelConfig, label);
                this.isUpdatingUI = false; // Desbloquear
                
                this.toolbox.resaltarControl('texto');
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
            
            // Guardar antes de deseleccionar
            this.persistTextStyles();
            
            this.seleccionarImagen(-1);
            this.state.selectedTextKey = null;
            this.toolbox.resetTextPanel(); // Mostrar mensaje de "Selecciona texto"
            // Ocultar panel de texto si no hay nada seleccionado
            // La lógica de mostrar 'General' está en Toolbox.resaltarControl(null)
            this.toolbox.resaltarControl(null); // Limpiar resaltado visual
            this.updatePreview();
        }
    }

    handleTextFocus(id) {
        // Simular selección cuando se hace foco en el input
        // Asumimos el índice 0 por defecto para la edición desde input
        const key = `${id}_0`; 
        // Forzamos la selección visual
        this.state.selectedTextKey = key;
        this.seleccionarImagen(-1);
        
        // Reutilizamos la lógica de carga del panel
        // Necesitamos disparar la actualización del panel, similar a handleMouseDown
        // Para simplificar, llamamos a updatePreview que leerá el estado, 
        // pero necesitamos poblar el panel primero.
        
        // Mejor estrategia: Simular un click en el elemento correspondiente en el canvas si existe
        // O llamar manualmente a la lógica de población del panel.
        
        const type = id; // 'nombre', 'apellido', 'grado'
        const suffix = (type === 'grado') ? 'Grado' : 'Nombre';
        
        // Recuperar valores "reales" del estado interno o defaults, no del panel genérico que podría estar sucio
        // Accedemos a this.toolbox.elements para leer los valores "viejos" (específicos) si existieran, pero ya no existen.
        // Debemos confiar en que el estado se mantiene.
        
        // Hack: Para que funcione fluido, al hacer foco, simplemente mostramos el panel con los valores actuales del estado para ese tipo.
        // Como getState() mezcla cosas, accedemos a this.state o valores por defecto.
        
        // Nota: Al refactorizar, los valores específicos (fuenteNombre, etc.) deben persistir en this.state o en inputs ocultos si queremos mantenerlos al cambiar de selección.
        // En esta implementación simplificada, al cambiar de selección, el panel se actualiza. Al cambiar un valor del panel, updatePreview -> getState -> lee panel -> actualiza state.
        // PERO: Si cambio de Nombre a Grado, y luego vuelvo a Nombre, ¿dónde se guardó la fuente de Nombre?
        // RESPUESTA: Se guardó en this.state implícitamente si updatePreview se ejecutó.
        // PERO getState() lee del panel. Si cambio selección, el panel cambia.
        // NECESITAMOS PERSISTENCIA EXPLÍCITA.
        
        // FIX CRÍTICO: Antes de cambiar la selección (y por tanto los valores del panel), debemos guardar los valores actuales del panel en el estado del objeto anteriormente seleccionado.
        // Esto se hace automáticamente en updatePreview() si se llama antes de cambiar selectedTextKey.
        
        // Por ahora, para el foco:
        const offsetKey = `${type}_0`;
        const currentScale = (this.state.offsets[offsetKey] && this.state.offsets[offsetKey].scale) ? this.state.offsets[offsetKey].scale : 1.0;

        const panelConfig = {
            fuente: this.state[`fuente${suffix}`], // Leer del estado guardado
            color: this.state[`color${suffix}`],
            tamano: currentScale,
            efecto: this.state[`efectoTexto${suffix}`],
            intensidad: this.state[`intensidadEfecto${suffix}`],
            arcoiris: this.state[`checkArcoiris${suffix}`],
            shiftArcoiris: this.state[`shiftArcoiris${suffix}`],
            metal: this.state[`checkMetal${suffix}`],
            tipoMetal: this.state[`tipoMetal${suffix}`]
        };

        const label = type.charAt(0).toUpperCase() + type.slice(1);
        
        this.isUpdatingUI = true; // Bloquear guardado automático
        this.toolbox.updateTextPanel(panelConfig, label);
        this.isUpdatingUI = false; // Desbloquear
        
        this.toolbox.resaltarControl('texto');
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
            
            // Lógica de redimensionamiento libre para Formas
            if (sb.type === 'image') {
                const img = this.state.imagenesEnCanvas[sb.index];
                if (img.type === 'shape') {
                    const start = this.resizeStartProps;
                    const handle = this.resizeHandle;
                    
                    let newX = start.x;
                    let newY = start.y;
                    let newW = start.w;
                    let newH = start.h;

                    // Calcular nuevas dimensiones según la esquina arrastrada
                    if (handle === 0) { // TL (Arriba-Izquierda)
                        const right = start.x + start.w;
                        const bottom = start.y + start.h;
                        newX = Math.min(mouseX, right - 10);
                        newY = Math.min(mouseY, bottom - 10);
                        newW = right - newX;
                        newH = bottom - newY;

                        if (e.ctrlKey) {
                            const ratio = start.w / start.h;
                            if (newW / newH > ratio) newH = newW / ratio;
                            else newW = newH * ratio;
                            newX = right - newW;
                            newY = bottom - newH;
                        }
                    } else if (handle === 1) { // TR (Arriba-Derecha)
                        const left = start.x;
                        const bottom = start.y + start.h;
                        newY = Math.min(mouseY, bottom - 10);
                        newW = Math.max(10, mouseX - left);
                        newH = bottom - newY;

                        if (e.ctrlKey) {
                            const ratio = start.w / start.h;
                            if (newW / newH > ratio) newH = newW / ratio;
                            else newW = newH * ratio;
                            newY = bottom - newH;
                        }
                    } else if (handle === 2) { // BL (Abajo-Izquierda)
                        const right = start.x + start.w;
                        const top = start.y;
                        newX = Math.min(mouseX, right - 10);
                        newW = right - newX;
                        newH = Math.max(10, mouseY - top);

                        if (e.ctrlKey) {
                            const ratio = start.w / start.h;
                            if (newW / newH > ratio) newH = newW / ratio;
                            else newW = newH * ratio;
                            newX = right - newW;
                        }
                    } else if (handle === 3) { // BR (Abajo-Derecha)
                        const left = start.x;
                        const top = start.y;
                        newW = Math.max(10, mouseX - left);
                        newH = Math.max(10, mouseY - top);

                        if (e.ctrlKey) {
                            const ratio = start.w / start.h;
                            if (newW / newH > ratio) newH = newW / ratio;
                            else newW = newH * ratio;
                        }
                    }

                    // Aplicar cambios
                    img.x = newX;
                    img.y = newY;
                    // Ajustamos wBase/hBase manteniendo la escala actual para no romper la lógica
                    img.wBase = newW / img.scale;
                    img.hBase = newH / img.scale;
                    
                    this.updatePreview();
                    return;
                }
            }

            // Lógica de redimensionamiento uniforme (Imágenes y Texto)
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
        this.isResizing = false;
        this.renderer.canvas.style.cursor = 'grab';
    }
}
