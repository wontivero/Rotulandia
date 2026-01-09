// js/ui-manager.js
import { PERSONAJES, FONDOS, PLANTILLAS } from './config.js';
import { db, auth } from './firebase-config.js';
import { collection, addDoc, setDoc, doc, getDoc, getDocs, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export class UIManager {
    constructor(renderer, pdfGenerator) {
        this.renderer = renderer;
        this.pdfGenerator = pdfGenerator;
        this.state = {
            imagenesEnCanvas: [],
            indiceImagenSeleccionada: -1,
            offsets: {},
            selectedTextKey: null,
            imagenFondoPropia: null,
            fondoProps: { // Propiedades para manejar la posición y escala del fondo
                x: 0,
                y: 0,
                scale: 1
            }
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
            checkArcoirisNombre: document.getElementById('check-arcoiris-nombre'),
            inputShiftArcoirisNombre: document.getElementById('shift-arcoiris-nombre'),
            controlArcoirisNombre: document.getElementById('control-arcoiris-nombre'),
            checkMetalNombre: document.getElementById('check-metal-nombre'),
            inputTipoMetalNombre: document.getElementById('tipo-metal-nombre'),
            controlMetalNombre: document.getElementById('control-metal-nombre'),
            selectEfectoTextoNombre: document.getElementById('efecto-texto-nombre'),
            inputIntensidadEfectoNombre: document.getElementById('intensidad-efecto-nombre'),
            inputTamanoNombre: document.getElementById('tamano-nombre'),
            spanTamanoNombre: document.getElementById('valor-tamano-nombre'),
            inputFuenteGrado: document.getElementById('fuente-grado'),
            inputColorGrado: document.getElementById('color-grado'),
            selectEfectoTextoGrado: document.getElementById('efecto-texto-grado'),
            checkArcoirisGrado: document.getElementById('check-arcoiris-grado'),
            inputShiftArcoirisGrado: document.getElementById('shift-arcoiris-grado'),
            controlArcoirisGrado: document.getElementById('control-arcoiris-grado'),
            checkMetalGrado: document.getElementById('check-metal-grado'),
            inputTipoMetalGrado: document.getElementById('tipo-metal-grado'),
            controlMetalGrado: document.getElementById('control-metal-grado'),
            inputIntensidadEfectoGrado: document.getElementById('intensidad-efecto-grado'),
            inputTamanoGrado: document.getElementById('tamano-grado'),
            spanTamanoGrado: document.getElementById('valor-tamano-grado'),
            selectPlantilla: document.getElementById('plantilla'),
            selectTipoPatron: document.getElementById('tipo-patron'),
            selectTipoFondo: document.getElementById('tipo-fondo'),
            selectEstiloBorde: document.getElementById('estilo-borde'),
            inputColorBorde: document.getElementById('color-borde'),
            inputGrosorBorde: document.getElementById('grosor-borde'),
            checkArcoirisBorde: document.getElementById('check-arcoiris-borde'),
            inputShiftArcoirisBorde: document.getElementById('shift-arcoiris-borde'),
            controlArcoirisBorde: document.getElementById('control-arcoiris-borde'),
            checkMetalBorde: document.getElementById('check-metal-borde'),
            inputTipoMetalBorde: document.getElementById('tipo-metal-borde'),
            controlMetalBorde: document.getElementById('control-metal-borde'),
            selectEfectoBorde: document.getElementById('efecto-borde'),
            inputIntensidadEfectoBorde: document.getElementById('intensidad-efecto-borde'),
            inputNuevoFondo: document.getElementById('input-nuevo-fondo'),
            inputNuevoPersonaje: document.getElementById('input-nuevo-personaje'),
            selectEfectoPersonaje: document.getElementById('efecto-personaje'),
            inputIntensidadEfectoPersonaje: document.getElementById('intensidad-efecto-personaje'),
            checkboxBorde: document.getElementById('con-borde'),
            checkboxBorde2: document.getElementById('con-borde-2'),
            inputRadioBorde: document.getElementById('radio-borde'),
            controlRadioBorde: document.getElementById('control-radio-borde'),
            grupoBorde2: document.getElementById('grupo-borde-2'),
            labelConBorde: document.getElementById('label-con-borde'),
            controlSolido: document.getElementById('control-color-solido'),
            controlDegradado: document.getElementById('control-color-degradado'),
            botonGenerar: document.getElementById('boton-generar'),
            botonDescargarPDF: document.getElementById('boton-descargar-pdf'),
            botonDescargarPNG: document.getElementById('boton-descargar-png'),
            botonGuardarDiseno: document.getElementById('boton-guardar-diseno'),
            botonGuardarNuevo: document.getElementById('boton-guardar-nuevo'),
            btnRandomGradient: document.getElementById('btn-random-gradient'),
            controlImagenFondo: document.getElementById('control-imagen-fondo'),
            inputEscalaPersonaje: document.getElementById('escala-personaje'),
            panelImagenSeleccionada: document.getElementById('panel-imagen-seleccionada'),
            btnEliminarImagen: document.getElementById('btn-eliminar-imagen'),
            inputTextoQR: document.getElementById('texto-qr'),
            inputColorQR: document.getElementById('color-qr'),
            btnAgregarQR: document.getElementById('btn-agregar-qr'),
            quickQRsWrapper: document.getElementById('quick-qrs-wrapper'),
            quickQRsList: document.getElementById('quick-qrs-list'),
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
        this.elements.botonGuardarDiseno.classList.remove('boton-descarga-oculto');
        this.elements.botonGuardarNuevo.classList.remove('boton-descarga-oculto');
    }

    initEvents() {
        // Eventos de inputs para actualizar vista previa
        const interactiveElements = [
            'inputNombre', 'inputApellido', 'inputGrado', 'inputColorFondo', 'selectPlantilla',
            'selectTipoFondo', 'inputColorDegradado1', 'inputColorDegradado2', 'checkboxBorde', 'checkboxBorde2',
            'selectTipoPatron', 'selectEstiloBorde', 'inputColorBorde', 'inputGrosorBorde',
            'inputFuenteNombre', 'inputColorNombre', 'selectEfectoTextoNombre',
            'inputFuenteGrado', 'inputColorGrado', 'selectEfectoTextoGrado',
            'inputIntensidadEfectoNombre', 'inputIntensidadEfectoGrado',
            'checkArcoirisNombre', 'checkArcoirisGrado',
            'inputShiftArcoirisNombre', 'inputShiftArcoirisGrado',
            'checkMetalNombre', 'checkMetalGrado', 'inputTipoMetalNombre', 'inputTipoMetalGrado',
            'checkArcoirisBorde', 'inputShiftArcoirisBorde', 'checkMetalBorde', 'inputTipoMetalBorde',
            'selectEfectoBorde', 'inputIntensidadEfectoBorde',
            'inputRadioBorde'
        ];

        interactiveElements.forEach(key => {
            if (this.elements[key]) {
                this.elements[key].addEventListener('input', () => this.updatePreview());
            }
        });

        this.elements.botonGenerar.addEventListener('click', () => this.updatePreview());
        
        // Lógica para mostrar/ocultar controles de arcoíris
        this.elements.checkArcoirisNombre.addEventListener('input', () => {
            if (this.elements.checkArcoirisNombre.checked) this.elements.checkMetalNombre.checked = false;
            this.toggleColorControls();
            this.updatePreview();
        });
        this.elements.checkArcoirisGrado.addEventListener('input', () => {
            if (this.elements.checkArcoirisGrado.checked) this.elements.checkMetalGrado.checked = false;
            this.toggleColorControls();
            this.updatePreview();
        });

        // Lógica para mostrar/ocultar controles de metal
        this.elements.checkMetalNombre.addEventListener('input', () => {
            if (this.elements.checkMetalNombre.checked) this.elements.checkArcoirisNombre.checked = false;
            this.toggleColorControls();
            this.updatePreview();
        });
        this.elements.checkMetalGrado.addEventListener('input', () => {
            if (this.elements.checkMetalGrado.checked) this.elements.checkArcoirisGrado.checked = false;
            this.toggleColorControls();
            this.updatePreview();
        });

        // Lógica para borde
        this.elements.checkArcoirisBorde.addEventListener('input', () => {
            if (this.elements.checkArcoirisBorde.checked) this.elements.checkMetalBorde.checked = false;
            this.toggleColorControls();
            this.updatePreview();
        });
        this.elements.checkMetalBorde.addEventListener('input', () => {
            if (this.elements.checkMetalBorde.checked) this.elements.checkArcoirisBorde.checked = false;
            this.toggleColorControls();
            this.updatePreview();
        });
        
        // Lógica para mostrar/ocultar control de radio de borde
        this.elements.checkboxBorde.addEventListener('change', () => {
            this.elements.controlRadioBorde.style.display = this.elements.checkboxBorde.checked ? 'block' : 'none';
            this.updatePreview();
        });

        this.elements.btnRandomGradient.addEventListener('click', () => this.generarColorRandom());
        
        this.elements.selectTipoFondo.addEventListener('input', () => {
            this.elements.controlSolido.style.display = (this.elements.selectTipoFondo.value === 'solido') ? 'block' : 'none';
            this.elements.controlDegradado.style.display = (this.elements.selectTipoFondo.value === 'degradado') ? 'flex' : 'none';
            this.elements.controlImagenFondo.style.display = (this.elements.selectTipoFondo.value === 'imagen') ? 'block' : 'none';
        });
        
        // Disparar evento inicial para configurar la vista correcta (ya que cambiamos el default a 'imagen')
        this.elements.selectTipoFondo.dispatchEvent(new Event('input'));

        this.elements.selectPlantilla.addEventListener('change', () => {
            this.state.offsets = {};
            this.state.selectedTextKey = null;
            const plantillaConfig = PLANTILLAS[this.elements.selectPlantilla.value];
            
            if (plantillaConfig) {
                const isCombo = plantillaConfig.is_combo;
                if (isCombo) {
                    this.elements.grupoBorde2.style.display = 'flex';
                    this.elements.labelConBorde.textContent = 'Redondear Cuaderno';
                } else {
                    this.elements.grupoBorde2.style.display = 'none';
                    this.elements.labelConBorde.textContent = 'Redondear Bordes';
                }
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

        this.elements.inputIntensidadEfectoPersonaje.addEventListener('input', (e) => {
            if (this.state.indiceImagenSeleccionada >= 0) {
                this.state.imagenesEnCanvas[this.state.indiceImagenSeleccionada].effectIntensity = parseInt(e.target.value, 10);
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
        this.elements.botonDescargarPDF.addEventListener('click', () => {
            if (!this.elements.inputNombre.value && !this.elements.inputApellido.value) {
                this.showToast('⚠️ Falta información', 'Por favor, escribe al menos un nombre o apellido antes de generar el PDF.', 'warning');
                this.resaltarControles('nombre');
                return;
            }
            this.pdfGenerator.generarPDF(this.getState(), this.renderer);
        });
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

        FONDOS.forEach((nombreArchivo) => {
            this.agregarImagenAGaleria(`fondos/${nombreArchivo}`, this.elements.galeriaFondos, false);
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
                    effect: 'ninguno',
                    effectIntensity: 5
                });
                this.state.indiceImagenSeleccionada = this.state.imagenesEnCanvas.length - 1;
                this.actualizarPanelImagen();
            } else {
                document.querySelectorAll('#galeria-fondos img').forEach(el => el.classList.remove('seleccionado'));
                img.classList.add('seleccionado');
                this.state.imagenFondoPropia = img;
                // Resetear posición del fondo al cambiarlo
                this.state.fondoProps = { x: 0, y: 0, scale: 1 };
                // Cambiar a modo imagen automáticamente si no lo estaba
                this.elements.selectTipoFondo.value = 'imagen';
                this.elements.selectTipoFondo.dispatchEvent(new Event('input'));
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

    toggleColorControls() {
        this.elements.controlArcoirisNombre.style.display = this.elements.checkArcoirisNombre.checked ? 'block' : 'none';
        this.elements.controlArcoirisGrado.style.display = this.elements.checkArcoirisGrado.checked ? 'block' : 'none';
        this.elements.controlMetalNombre.style.display = this.elements.checkMetalNombre.checked ? 'block' : 'none';
        this.elements.controlMetalGrado.style.display = this.elements.checkMetalGrado.checked ? 'block' : 'none';
        this.elements.controlArcoirisBorde.style.display = this.elements.checkArcoirisBorde.checked ? 'block' : 'none';
        this.elements.controlMetalBorde.style.display = this.elements.checkMetalBorde.checked ? 'block' : 'none';
    }

    // --- SISTEMA DE NOTIFICACIONES MODERNO ---
    
    showToast(titulo, mensaje, tipo = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        let icon = 'ℹ️';
        let headerClass = 'text-primary';
        if (tipo === 'success') { icon = '✅'; headerClass = 'text-success'; }
        if (tipo === 'error') { icon = '❌'; headerClass = 'text-danger'; }
        if (tipo === 'warning') { icon = '⚠️'; headerClass = 'text-warning'; }

        const toastHtml = `
            <div class="toast show fade border-0 shadow-lg rounded-3 mb-3" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header border-0 bg-white rounded-top-3">
                    <span class="me-2 fs-5">${icon}</span>
                    <strong class="me-auto ${headerClass}">${titulo}</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body bg-white rounded-bottom-3 pt-0 text-secondary">
                    ${mensaje}
                </div>
            </div>
        `;
        
        // Crear elemento temporal
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = toastHtml.trim();
        const toastEl = tempDiv.firstChild;
        
        container.appendChild(toastEl);
        
        // Auto eliminar después de 4 segundos
        setTimeout(() => {
            toastEl.classList.remove('show');
            setTimeout(() => toastEl.remove(), 500);
        }, 4000);
    }

    showConfirm(titulo, mensaje, icono = '❓', textoConfirmar = 'Sí, continuar') {
        return new Promise((resolve) => {
            const modalEl = document.getElementById('confirmationModal');
            if (!modalEl) {
                // Fallback si no existe el modal en el HTML
                resolve(confirm(mensaje.replace(/<[^>]*>?/gm, ''))); 
                return;
            }
            const modal = new bootstrap.Modal(modalEl);
            
            document.getElementById('confirmTitle').textContent = titulo;
            document.getElementById('confirmMessage').innerHTML = mensaje;
            document.getElementById('confirmIcon').textContent = icono;
            
            document.getElementById('confirmButtons').style.display = 'grid';
            document.getElementById('alertButtons').style.display = 'none';
            
            const btnConfirm = document.getElementById('btnConfirmAction');
            btnConfirm.textContent = textoConfirmar;
            
            // Clonar botón para eliminar listeners viejos
            const newBtn = btnConfirm.cloneNode(true);
            btnConfirm.parentNode.replaceChild(newBtn, btnConfirm);
            
            newBtn.addEventListener('click', () => {
                modal.hide();
                resolve(true);
            });
            
            modalEl.addEventListener('hidden.bs.modal', () => {
                resolve(false);
            }, { once: true });
            
            modal.show();
        });
    }

    showAlert(titulo, mensaje, icono = 'ℹ️') {
        const modalEl = document.getElementById('confirmationModal');
        if (!modalEl) {
            alert(mensaje.replace(/<[^>]*>?/gm, ''));
            return;
        }
        const modal = new bootstrap.Modal(modalEl);
        document.getElementById('confirmTitle').textContent = titulo;
        document.getElementById('confirmMessage').innerHTML = mensaje;
        document.getElementById('confirmIcon').textContent = icono;
        document.getElementById('confirmButtons').style.display = 'none';
        document.getElementById('alertButtons').style.display = 'grid';
        modal.show();
    }

    generateShortId(length = 6) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    async generarQR() {
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
            
            // --- LÓGICA QR DINÁMICO (PREMIUM) ---
            const user = auth.currentUser;
            if (user) {
                // Si está logueado, creamos un registro dinámico
                try {
                    this.elements.btnAgregarQR.disabled = true;
                    this.elements.btnAgregarQR.textContent = "Creando...";

                    // 1. Verificar si ya existe un QR igual para este usuario (Evitar duplicados)
                    const q = query(collection(db, "qrs"), 
                        where("uid", "==", user.uid),
                        where("telefono", "==", telefonoLimpio),
                        where("nombre", "==", this.elements.inputNombre.value.trim()),
                        where("apellido", "==", this.elements.inputApellido.value.trim())
                    );
                    
                    const querySnapshot = await getDocs(q);
                    let docId;

                    if (!querySnapshot.empty) {
                        // Ya existe, usamos el primero que encontramos
                        docId = querySnapshot.docs[0].id;
                        console.log("QR existente reutilizado:", docId);
                    } else {
                        // No existe, creamos uno nuevo
                        // Intentamos generar un ID corto (6 caracteres) para simplificar el QR
                        let unique = false;
                        let shortId = '';
                        let attempts = 0;

                        while (!unique && attempts < 3) {
                            shortId = this.generateShortId(6);
                            const docRef = doc(db, "qrs", shortId);
                            const docSnap = await getDoc(docRef);
                            if (!docSnap.exists()) unique = true;
                            attempts++;
                        }

                        const qrData = {
                            uid: user.uid,
                            telefono: telefonoLimpio,
                            nombre: this.elements.inputNombre.value.trim(),
                            apellido: this.elements.inputApellido.value.trim(),
                            createdAt: serverTimestamp()
                        };

                        if (unique) {
                            await setDoc(doc(db, "qrs", shortId), qrData);
                            docId = shortId;
                        } else {
                            // Fallback a ID largo si hay colisión (muy raro)
                            const docRef = await addDoc(collection(db, "qrs"), qrData);
                            docId = docRef.id;
                        }
                    }
                    
                    valorFinalQR = `${baseUrl}qr.html?id=${docId}`;
                } catch (error) {
                    console.error("Error creando QR dinámico:", error);
                    this.showToast('Error de conexión', 'No se pudo crear el QR dinámico. Se usará uno estático.', 'error');
                    // Fallback a estático si falla la DB
                    valorFinalQR = `${baseUrl}contacto.html?t=${telefonoLimpio}&n=${nombre}&a=${apellido}`;
                } finally {
                    this.elements.btnAgregarQR.disabled = false;
                    this.elements.btnAgregarQR.textContent = "Generar QR";
                }
            } else {
                // Si NO está logueado, usamos el QR estático (Legacy)
                valorFinalQR = `${baseUrl}contacto.html?t=${telefonoLimpio}`;
                if (nombre) valorFinalQR += `&n=${nombre}`;
                if (apellido) valorFinalQR += `&a=${apellido}`;
            }
        }

        this.agregarQRAlCanvas(valorFinalQR, this.elements.inputColorQR.value, docId);
    }

    agregarQRAlCanvas(valorQR, color, qrId = null) {
        const qr = new QRious({
            value: valorQR,
            foreground: color,
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
                effect: 'ninguno',
                effectIntensity: 5,
                isQR: true, // Marcamos esta imagen como un QR
                qrId: qrId // Guardamos el ID de Firestore para validaciones
            });
            this.state.indiceImagenSeleccionada = this.state.imagenesEnCanvas.length - 1;
            this.actualizarPanelImagen();
            this.updatePreview();
        };
    }

    renderQuickQRs(qrsData) {
        if (!qrsData || qrsData.length === 0) {
            this.elements.quickQRsWrapper.style.display = 'none';
            return;
        }

        this.elements.quickQRsWrapper.style.display = 'block';
        this.elements.quickQRsList.innerHTML = '';
        
        let baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);

        qrsData.forEach(qrInfo => {
            const item = document.createElement('div');
            item.style.cursor = 'pointer';
            item.title = `Usar QR de ${qrInfo.nombre} (${qrInfo.telefono})`;
            item.className = 'd-flex align-items-center gap-2 p-1 border rounded bg-light';
            
            // Generar miniatura visual
            const qrUrl = `${baseUrl}qr.html?id=${qrInfo.id}`;
            const qrMini = new QRious({ value: qrUrl, size: 30, level: 'L' });
            
            item.innerHTML = `
                <div class="d-flex align-items-center gap-2 flex-grow-1" style="cursor: pointer;" id="qr-thumb-${qrInfo.id}">
                    <img src="${qrMini.toDataURL()}" style="width: 30px; height: 30px;">
                    <div style="font-size: 0.7em; line-height: 1.1; overflow: hidden;">
                        <div class="fw-bold text-truncate" style="max-width: 55px;">${qrInfo.nombre}</div>
                        <div class="text-muted">${qrInfo.telefono}</div>
                    </div>
                </div>
                <button class="btn btn-sm btn-link p-0 text-primary btn-goto-qr" title="Editar / Ver en lista" style="text-decoration: none;">✏️</button>
            `;

            // Click en la miniatura -> Agregar al canvas
            item.querySelector(`#qr-thumb-${qrInfo.id}`).addEventListener('click', () => {
                this.agregarQRAlCanvas(qrUrl, this.elements.inputColorQR.value, qrInfo.id);
            });

            // Click en el lápiz -> Ir a la tarjeta de edición
            item.querySelector('.btn-goto-qr').addEventListener('click', (e) => {
                e.stopPropagation();
                // Llamamos al método del StorageManager para abrir el modal
                window.storageManager.abrirModalQR(qrInfo);
            });

            this.elements.quickQRsList.appendChild(item);
        });
    }

    actualizarPanelImagen() {
        if (this.state.indiceImagenSeleccionada >= 0 && this.state.imagenesEnCanvas[this.state.indiceImagenSeleccionada]) {
            this.elements.panelImagenSeleccionada.style.display = 'block';
            const imgData = this.state.imagenesEnCanvas[this.state.indiceImagenSeleccionada];
            this.elements.inputEscalaPersonaje.value = imgData.scale;
            this.elements.selectEfectoPersonaje.value = imgData.effect;
            this.elements.inputIntensidadEfectoPersonaje.value = imgData.effectIntensity !== undefined ? imgData.effectIntensity : 5;

            if (imgData.isQR) {
                this.elements.btnEliminarImagen.textContent = "🗑️ Eliminar QR del diseño";
            } else {
                this.elements.btnEliminarImagen.textContent = "🗑️ Eliminar este personaje";
            }
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

        // 2. Verificar si estamos arrastrando el fondo (si está en modo imagen)
        if (this.elements.selectTipoFondo.value === 'imagen' && this.state.imagenFondoPropia) {
            // Si no clicamos en nada más, asumimos que queremos mover el fondo
            // Pero solo si no hay otro elemento seleccionado o clicamos fuera de él
            // Para simplificar: si getElementAtPosition devuelve null, movemos el fondo
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
            // Si no clicamos en ningún elemento y estamos en modo imagen, arrastramos el fondo
            if (this.elements.selectTipoFondo.value === 'imagen' && this.state.imagenFondoPropia) {
                this.isDragging = true;
                this.draggingElement = 'fondo'; // Identificador especial
                this.startX = mouseX;
                this.startY = mouseY;
                this.renderer.canvas.style.cursor = 'grabbing';
            }
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

        if (this.draggingElement === 'fondo') {
            this.state.fondoProps.x += dx;
            this.state.fondoProps.y += dy;
        } else if (typeof this.draggingElement === 'string') {
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
