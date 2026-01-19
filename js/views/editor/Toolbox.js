export class Toolbox {
    constructor(callbacks) {
        this.callbacks = callbacks || {};
        this.elements = {};
        this.initElements();
        this.initEvents();
    }

    initElements() {
        // Mapeo de todos los elementos del DOM
        const ids = [
            'nombre', 'apellido', 'grado', 'color-fondo', 'color-degradado-1', 'color-degradado-2',
            // Nuevos controles unificados de texto y pestañas
            'tab-fondo-btn', 'tab-texto-btn', 'tab-imagen-btn', 'tab-formas-btn', 'tab-qr-btn', 'tab-borde-btn',
            'msg-no-img', 'msg-no-text',
            'fuente-texto', 'color-texto', 'tamano-texto-input', 'efecto-texto', 'intensidad-efecto-texto',
            'check-arcoiris-texto', 'shift-arcoiris-texto', 'control-arcoiris-texto',
            'check-metal-texto', 'tipo-metal-texto', 'control-metal-texto',
            
            'plantilla', 'tipo-patron', 'tipo-fondo',
            'estilo-borde', 'color-borde', 'grosor-borde', 'check-arcoiris-borde', 'shift-arcoiris-borde', 'control-arcoiris-borde',
            'check-metal-borde', 'tipo-metal-borde', 'control-metal-borde', 'efecto-borde', 'intensidad-efecto-borde',
            'input-nuevo-fondo', 'efecto-personaje', 'intensidad-efecto-personaje',
            'con-borde', 'con-borde-2', 'radio-borde', 'control-radio-borde', 'grupo-borde-2', 'label-con-borde',
            'control-color-solido', 'control-color-degradado', 'control-imagen-fondo',
            'btn-abrir-galeria-fondos', 'galeria-fondos-precargados', 'galeria-mis-fondos',
            'btn-subir-fondo-modal', 'input-nuevo-fondo-modal', 'boton-generar', 'boton-descargar-pdf', 'boton-descargar-png', 'boton-guardar-diseno', 'boton-guardar-nuevo', 'boton-nuevo-diseno',
            'btn-random-gradient', 'escala-personaje', 'panel-imagen-seleccionada', 'btn-eliminar-imagen',
            'texto-qr', 'color-qr', 'btn-agregar-qr', 'btn-ver-mis-qrs', 'lista-mis-qrs',
            'btn-abrir-galeria-personajes', 'galeria-personajes-precargados', 'galeria-mis-personajes',
            'btn-subir-personaje-modal', 'input-nuevo-personaje-modal', 'input-nuevo-personaje-toolbar',
            'btn-abrir-galeria-formas', 'galeria-formas-precargados', 'galeria-mis-formas',
            'btn-subir-forma-modal', 'input-nuevo-forma-modal', 'input-nuevo-forma-toolbar',
            'modal-galeria-fondos', 'modal-galeria-personajes', 'modal-mis-qrs', 'modal-galeria-formas', 'color-forma', 'opacidad-forma', 'btn-eliminar-forma',
            'tab-precargados', 'tab-mis-fondos', 'tab-pers-precargados', 'tab-pers-mis', 'tab-formas-precargados', 'tab-formas-mis'
        ];

        ids.forEach(id => {
            const key = this.toCamelCase(id);
            this.elements[key] = document.getElementById(id);
        });
    }

    toCamelCase(str) {
        // Convierte 'boton-descargar-pdf' -> 'botonDescargarPdf'
        // FIX: Agregar 0-9 a la expresión regular para que 'color-degradado-1' se convierta correctamente en 'colorDegradado1'
        return str.replace(/-([a-z0-9])/g, (g) => g[1].toUpperCase()).replace(/^input-/, '').replace(/^select-/, '');
    }

    initEvents() {
        const els = this.elements;

        // Eventos de inputs que actualizan la vista previa
        const inputEvents = [
            'nombre', 'apellido', 'grado', 'colorFondo', 'plantilla', 'tipoFondo', 
            'colorDegradado1', 'colorDegradado2', 'conBorde', 'conBorde2', 'tipoPatron',
            'estiloBorde', 'colorBorde', 'grosorBorde', 
            // Eventos de texto unificados
            'fuenteTexto', 'colorTexto', 'efectoTexto', 'intensidadEfectoTexto', 'tamanoTexto',
            'checkArcoirisTexto', 'shiftArcoirisTexto', 'checkMetalTexto', 'tipoMetalTexto',
            
            'checkArcoirisBorde', 'shiftArcoirisBorde', 'checkMetalBorde', 'tipoMetalBorde',
            'efectoBorde', 'intensidadEfectoBorde', 'radioBorde'
        ];

        inputEvents.forEach(key => {
            if (els[key]) {
                els[key].addEventListener('input', () => this.notifyChange());
                // FIX: Escuchar 'change' también para asegurar que los selectores de color externos funcionen
                els[key].addEventListener('change', () => this.notifyChange());
            }
        });

        // Eventos específicos de UI (Mostrar/Ocultar paneles)
        this.setupVisibilityLogic();

        // Botones de acción
        if (els.botonGenerar) els.botonGenerar.addEventListener('click', () => this.notifyChange());
        if (els.btnRandomGradient) els.btnRandomGradient.addEventListener('click', () => this.callbacks.onRandomGradient?.());
        
        if (els.botonDescargarPdf) els.botonDescargarPdf.addEventListener('click', () => this.callbacks.onDownloadPDF?.());
        if (els.botonDescargarPng) els.botonDescargarPng.addEventListener('click', () => this.callbacks.onDownloadPNG?.());
        
        if (els.btnAgregarQr) els.btnAgregarQr.addEventListener('click', () => this.callbacks.onGenerateQR?.());
        if (els.botonNuevoDiseno) els.botonNuevoDiseno.addEventListener('click', () => this.callbacks.onNewDesign?.());
        
        // Imagen seleccionada
        if (els.escalaPersonaje) els.escalaPersonaje.addEventListener('input', (e) => this.callbacks.onImagePropChange?.('scale', parseFloat(e.target.value)));
        if (els.efectoPersonaje) els.efectoPersonaje.addEventListener('input', (e) => this.callbacks.onImagePropChange?.('effect', e.target.value));
        if (els.intensidadEfectoPersonaje) els.intensidadEfectoPersonaje.addEventListener('input', (e) => this.callbacks.onImagePropChange?.('effectIntensity', parseInt(e.target.value, 10)));
        if (els.btnEliminarImagen) els.btnEliminarImagen.addEventListener('click', () => this.callbacks.onDeleteImage?.());

        // Text Scale UI Sync (Unificado)
        if (els.tamanoTextoInput) els.tamanoTextoInput.addEventListener('input', (e) => {
            this.callbacks.onTextScaleChange?.(null, e.target.value);
        });
        
        // Eventos de foco para inputs de texto (para seleccionar automáticamente)
        ['nombre', 'apellido', 'grado'].forEach(id => {
            if (els[id]) els[id].addEventListener('focus', () => this.callbacks.onTextFocus?.(id));
        });

        // FIX: Listeners para pestañas para asegurar que se oculten los otros paneles al hacer clic manual
        ['tabFondoBtn', 'tabTextoBtn', 'tabImagenBtn', 'tabFormasBtn', 'tabQrBtn', 'tabBordeBtn'].forEach(key => {
            if (els[key]) {
                els[key].addEventListener('click', () => {
                    const targetId = els[key].getAttribute('data-bs-target');
                    const container = document.getElementById('toolbar-tab-content');
                    if (container) {
                        container.querySelectorAll('.tab-pane').forEach(pane => {
                            if ('#' + pane.id !== targetId) {
                                pane.classList.remove('show', 'active');
                            }
                        });
                    }
                });
            }
        });

        // Eventos de Formas
        document.querySelectorAll('.btn-add-shape').forEach(btn => {
            btn.addEventListener('click', () => {
                const shapeType = btn.getAttribute('data-shape');
                this.callbacks.onAddShape?.(shapeType);
            });
        });

        if (els.colorForma) {
            els.colorForma.addEventListener('input', (e) => this.callbacks.onShapePropChange?.('color', e.target.value));
            els.colorForma.addEventListener('change', (e) => this.callbacks.onShapePropChange?.('color', e.target.value));
        }
        if (els.opacidadForma) els.opacidadForma.addEventListener('input', (e) => this.callbacks.onShapePropChange?.('opacity', parseFloat(e.target.value)));
        if (els.btnEliminarForma) els.btnEliminarForma.addEventListener('click', () => this.callbacks.onDeleteImage?.()); // Reutilizamos delete image ya que funciona por índice

        // Archivos
        this.setupFileUpload(els.inputNuevoFondo, false);
        this.setupFileUpload(els.inputNuevoFondoModal, false);
        this.setupFileUpload(els.inputNuevoPersonajeToolbar, true);
        this.setupFileUpload(els.inputNuevoPersonajeModal, true);
        this.setupFileUpload(els.inputNuevoFormaToolbar, 'forma');
        this.setupFileUpload(els.inputNuevoFormaModal, 'forma');

        // Inicializar Cuentagotas Nativo
        this.initEyeDropper();
    }

    setupVisibilityLogic() {
        const els = this.elements;
        
        const toggleColors = () => {
            if (els.controlArcoirisTexto) els.controlArcoirisTexto.style.setProperty('display', els.checkArcoirisTexto.checked ? 'flex' : 'none', 'important');
            if (els.controlMetalTexto) els.controlMetalTexto.style.setProperty('display', els.checkMetalTexto.checked ? 'flex' : 'none', 'important');
            if (els.controlArcoirisBorde) els.controlArcoirisBorde.style.setProperty('display', els.checkArcoirisBorde.checked ? 'flex' : 'none', 'important');
            if (els.controlMetalBorde) els.controlMetalBorde.style.setProperty('display', els.checkMetalBorde.checked ? 'flex' : 'none', 'important');
        };

        // Listeners para toggles
        // Lógica de exclusión mutua: Si activas uno, se desactiva el otro
        if (els.checkArcoirisTexto && els.checkMetalTexto) {
            els.checkArcoirisTexto.addEventListener('change', () => {
                if (els.checkArcoirisTexto.checked) els.checkMetalTexto.checked = false;
                toggleColors();
                this.notifyChange();
            });
            els.checkMetalTexto.addEventListener('change', () => {
                if (els.checkMetalTexto.checked) els.checkArcoirisTexto.checked = false;
                toggleColors();
                this.notifyChange();
            });
        }

        if (els.checkArcoirisBorde && els.checkMetalBorde) {
            els.checkArcoirisBorde.addEventListener('change', () => {
                if (els.checkArcoirisBorde.checked) els.checkMetalBorde.checked = false;
                toggleColors();
                this.notifyChange();
            });
            els.checkMetalBorde.addEventListener('change', () => {
                if (els.checkMetalBorde.checked) els.checkArcoirisBorde.checked = false;
                toggleColors();
                this.notifyChange();
            });
        }

        // Tipo Fondo
        if (els.tipoFondo) {
            els.tipoFondo.addEventListener('input', () => {
                els.controlColorSolido.style.display = (els.tipoFondo.value === 'solido') ? 'block' : 'none'; 
                els.controlColorDegradado.style.display = (els.tipoFondo.value === 'degradado') ? 'flex' : 'none';
                els.controlImagenFondo.style.display = (els.tipoFondo.value === 'imagen') ? 'flex' : 'none'; 
            });
            els.tipoFondo.dispatchEvent(new Event('input'));
        }

        // Plantilla
        if (els.plantilla) {
            els.plantilla.addEventListener('change', () => {   
                this.callbacks.onPlantillaChange?.(els.plantilla.value);
            });
        }

        // Borde Radio
        if (els.conBorde) {
            els.conBorde.addEventListener('change', () => {
                if (els.controlRadioBorde) {
                    els.controlRadioBorde.style.display = els.conBorde.checked ? 'block' : 'none';
                }
            });
        }

        // Botón Galería Fondos
        if (els.btnAbrirGaleriaFondos) {
            els.btnAbrirGaleriaFondos.addEventListener('click', () => {
                bootstrap.Modal.getOrCreateInstance(document.getElementById('modalGaleriaFondos')).show();
            });
        }

        // Botón Subir Fondo desde Modal
        if (els.btnSubirFondoModal) {
            els.btnSubirFondoModal.addEventListener('click', (e) => {
                if (els.inputNuevoFondoModal && e.target !== els.inputNuevoFondoModal) {
                    els.inputNuevoFondoModal.click();
                }
            });
        }

        // Botón Galería Personajes
        if (els.btnAbrirGaleriaPersonajes) {
            els.btnAbrirGaleriaPersonajes.addEventListener('click', () => {
                bootstrap.Modal.getOrCreateInstance(document.getElementById('modalGaleriaPersonajes')).show();
            });
        }

        // Botón Subir Personaje desde Modal
        if (els.btnSubirPersonajeModal) {
            els.btnSubirPersonajeModal.addEventListener('click', (e) => {
                if (els.inputNuevoPersonajeModal && e.target !== els.inputNuevoPersonajeModal) {
                    els.inputNuevoPersonajeModal.click();
                }
            });
        }

        // Botón Galería Formas
        if (els.btnAbrirGaleriaFormas) {
            els.btnAbrirGaleriaFormas.addEventListener('click', () => {
                bootstrap.Modal.getOrCreateInstance(document.getElementById('modalGaleriaFormas')).show();
            });
        }

        // Botón Subir Forma desde Modal
        if (els.btnSubirFormaModal) {
            els.btnSubirFormaModal.addEventListener('click', (e) => {
                if (els.inputNuevoFormaModal && e.target !== els.inputNuevoFormaModal) {
                    els.inputNuevoFormaModal.click();
                }
            });
        }

        // Botón Ver Mis QRs
        if (els.btnVerMisQrs) {
            els.btnVerMisQrs.addEventListener('click', () => {
                bootstrap.Modal.getOrCreateInstance(document.getElementById('modalMisQRs')).show();
            });
        }

        // FIX: Inicializar pestañas de los modales para asegurar que funcionen
        ['tabPrecargados', 'tabMisFondos', 'tabPersPrecargados', 'tabPersMis', 'tabFormasPrecargados', 'tabFormasMis'].forEach(key => {
            if (els[key]) {
                els[key].addEventListener('click', (e) => {
                    e.preventDefault();
                    const tab = new bootstrap.Tab(els[key]);
                    tab.show();
                    
                    // FIX MANUAL: Forzar ocultamiento de los otros paneles del modal
                    const targetId = els[key].getAttribute('data-bs-target');
                    const tabContent = els[key].closest('.modal-body').querySelector('.tab-content');
                    if (tabContent) {
                        tabContent.querySelectorAll('.tab-pane').forEach(pane => {
                            if ('#' + pane.id === targetId) {
                                pane.classList.add('show', 'active');
                            } else {
                                pane.classList.remove('show', 'active');
                            }
                        });
                    }
                    // Asegurar que el botón se vea activo
                    const nav = els[key].closest('.nav');
                    if (nav) {
                        nav.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
                        els[key].classList.add('active');
                    }
                });
            }
        });
    }

    setupFileUpload(input, category) {
        // category puede ser: boolean (legacy) o string ('forma', 'personaje', 'fondo')
        // Normalizamos: si es true -> 'personaje', false -> 'fondo'
        let cat = category;
        if (typeof category === 'boolean') cat = category ? 'personaje' : 'fondo';

        if (!input) return;
        input.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                if (file) {
                    // Cerrar modal si la subida viene desde ahí
                    let modalId = 'modalGaleriaFondos';
                    if (cat === 'personaje') modalId = 'modalGaleriaPersonajes';
                    if (cat === 'forma') modalId = 'modalGaleriaFormas';
                    
                    const modalEl = document.getElementById(modalId);
                    if (modalEl) {
                        const modal = bootstrap.Modal.getInstance(modalEl); // Aquí getInstance está bien porque queremos cerrar uno existente
                        if (modal) modal.hide();
                    }

                    // Delegar la subida al controlador para manejar persistencia en la nube
                    this.callbacks.onUploadFile?.(file, cat);
                }
            });
        });
    }

    initEyeDropper() {
        const buttons = document.querySelectorAll('.btn-eyedropper');

        buttons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault(); // Evitar cualquier comportamiento extraño del botón
                
                const targetId = btn.getAttribute('data-target');
                const input = document.getElementById(targetId);
                
                if (!input) return;

                if (window.EyeDropper) {
                    try {
                        const eyeDropper = new EyeDropper();
                        const result = await eyeDropper.open();
                        input.value = result.sRGBHex;
                        // Disparar eventos para que el canvas se actualice
                        input.dispatchEvent(new Event('input'));
                        input.dispatchEvent(new Event('change'));
                    } catch (e) {
                        // El usuario canceló (presionó Esc), no hacemos nada
                    }
                } else {
                    // Fallback para Firefox/Safari: Abrir el selector de color nativo del sistema
                    input.click();
                }
            });
        });
    }

    addToGallery(src, category, autoAssign = false) {
        // Normalizar categoría
        let cat = category;
        if (typeof category === 'boolean') cat = category ? 'personaje' : 'fondo';

        let container = this.elements.galeriaMisFondos;
        if (cat === 'personaje') container = this.elements.galeriaMisPersonajes;
        if (cat === 'forma') container = this.elements.galeriaMisFormas;

        if (!container) return;

        const img = document.createElement('img');
        img.crossOrigin = "Anonymous"; // FIX: Evitar error de seguridad al guardar
        img.alt = cat;
        img.addEventListener('click', () => {
            // Cerrar el modal correspondiente
            let modalId = 'modalGaleriaFondos';
            if (cat === 'personaje') modalId = 'modalGaleriaPersonajes';
            if (cat === 'forma') modalId = 'modalGaleriaFormas';
            
            const modalEl = document.getElementById(modalId);
            if (modalEl) {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            }

            if (cat === 'personaje' || cat === 'forma') {
                this.callbacks.onAddImageToCanvas?.(img);
            } else {
                this.elements.tipoFondo.value = 'imagen';
                this.elements.tipoFondo.dispatchEvent(new Event('input'));
                this.callbacks.onSetBackground?.(img);
            }
        });
        
        if (cat === 'personaje' || cat === 'forma') {
            const btnSubir = container.querySelector('.boton-subir-imagen');
            if (btnSubir) container.insertBefore(img, btnSubir);
            else container.appendChild(img);
        } else {
            container.appendChild(img);
        }

        // Asignación automática al subir (UX Improvement)
        // FIX: Esperar a que la imagen cargue para asegurar que tenga dimensiones antes de asignarla al canvas
        img.onload = () => {
            if (autoAssign) {
                img.click(); 
            }
        };
        img.src = src; // Asignar src al final para disparar onload
    }
    
    addPrecargadoToGallery(src, category = 'fondo') {
        let cat = category;
        if (typeof category === 'boolean') cat = category ? 'personaje' : 'fondo';

        let container = this.elements.galeriaFondosPrecargados;
        if (cat === 'personaje') container = this.elements.galeriaPersonajesPrecargados;
        if (cat === 'forma') container = this.elements.galeriaFormasPrecargados;

        if (!container) return;
        
        const img = document.createElement('img');
        img.crossOrigin = "Anonymous"; // FIX: Evitar error de seguridad al guardar
        img.src = src;
        img.alt = cat === 'forma' ? 'forma' : 'Precargado';
        img.addEventListener('click', () => {
            let modalId = 'modalGaleriaFondos';
            if (cat === 'personaje') modalId = 'modalGaleriaPersonajes';
            if (cat === 'forma') modalId = 'modalGaleriaFormas';

            const modalEl = document.getElementById(modalId);
            if (modalEl) {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            }

            if (cat === 'personaje' || cat === 'forma') {
                this.callbacks.onAddImageToCanvas?.(img);
            } else {
                this.elements.tipoFondo.value = 'imagen';
                this.elements.tipoFondo.dispatchEvent(new Event('input'));
                this.callbacks.onSetBackground?.(img);
            }
        });
        container.appendChild(img);
    }
    
    // Método auxiliar para limpiar la galería de usuario antes de recargar (evita duplicados visuales)
    clearUserGallery() {
        if (this.elements.galeriaMisFondos) this.elements.galeriaMisFondos.innerHTML = '';
        if (this.elements.galeriaMisFormas) this.elements.galeriaMisFormas.innerHTML = '';
    }

    notifyChange() {
        this.callbacks.onUpdate?.();
    }

    getValues() {
        const values = {};
        for (const key in this.elements) {
            const el = this.elements[key];
            if (el) {
                if (el.type === 'checkbox') values[key] = el.checked;
                else if (el.value !== undefined) values[key] = el.value;
            }
        }
        return values;
    }

    // Método para actualizar el panel de texto con los valores del elemento seleccionado
    updateTextPanel(config, label) {
        const els = this.elements;
        
        // Activar pestaña de Texto
        this.activarPestana('tab-texto-btn');
        if (els.msgNoText) els.msgNoText.style.display = 'none';

        // Setear valores
        if (els.fuenteTexto) els.fuenteTexto.value = config.fuente || "'Fredoka', sans-serif";
        if (els.colorTexto) els.colorTexto.value = config.color || '#000000';
        if (els.tamanoTextoInput) els.tamanoTextoInput.value = config.tamano || 1.0;
        if (els.efectoTexto) els.efectoTexto.value = config.efecto || 'ninguno';
        if (els.intensidadEfectoTexto) els.intensidadEfectoTexto.value = config.intensidad || 5;
        if (els.checkArcoirisTexto) els.checkArcoirisTexto.checked = config.arcoiris || false;
        if (els.shiftArcoirisTexto) els.shiftArcoirisTexto.value = config.shiftArcoiris || 0;
        if (els.checkMetalTexto) els.checkMetalTexto.checked = config.metal || false;
        if (els.tipoMetalTexto) els.tipoMetalTexto.value = config.tipoMetal || 0;

        // Actualizar visibilidad de sub-controles
        if (els.checkArcoirisTexto) {
            els.checkArcoirisTexto.dispatchEvent(new Event('input'));
        }
    }

    resetTextPanel() {
        const els = this.elements;
        if (els.msgNoText) els.msgNoText.style.display = 'block';
    }

    setValues(config) {
        for (const key in config) {
            // Mapeo inverso simple: config.nombre -> elements.nombre
            // config.arcoirisNombre -> elements.checkArcoirisNombre
            let elKey = key;
            if (key.startsWith('arcoiris')) elKey = 'check' + key.charAt(0).toUpperCase() + key.slice(1);
            // ... (lógica simplificada, en un caso real se haría un mapeo más robusto)
            
            // Intentamos encontrar el elemento por ID directo o camelCase
            const el = this.elements[key] || this.elements['input' + key.charAt(0).toUpperCase() + key.slice(1)] || this.elements['select' + key.charAt(0).toUpperCase() + key.slice(1)] || this.elements['check' + key.charAt(0).toUpperCase() + key.slice(1)];
            
            if (el) {
                if (el.type === 'checkbox') el.checked = config[key];
                else el.value = config[key];
                
                // Disparar eventos para actualizar UI dependiente
                el.dispatchEvent(new Event('input'));
                el.dispatchEvent(new Event('change'));
            }
        }
        // Forzar actualización de visibilidad
        this.elements.tipoFondo.dispatchEvent(new Event('input'));
        this.elements.conBorde.dispatchEvent(new Event('change'));
    }

    updatePanelForma(index, shapeData) {
        const els = this.elements;
        if (index >= 0 && shapeData) {
            this.activarPestana('tab-formas-btn');
            
            if (els.colorForma) els.colorForma.value = shapeData.color || '#000000';
            if (els.opacidadForma) els.opacidadForma.value = shapeData.opacity !== undefined ? shapeData.opacity : 1;
        }
    }

    updatePanelImagen(index, imgData) {
        const els = this.elements;
        if (index >= 0 && imgData) {
            // Activar pestaña Imagen
            this.activarPestana('tab-imagen-btn');

            if (els.msgNoImg) els.msgNoImg.style.display = 'none';
            els.escalaPersonaje.value = imgData.scale;
            els.efectoPersonaje.value = imgData.effect;
            els.intensidadEfectoPersonaje.value = imgData.effectIntensity !== undefined ? imgData.effectIntensity : 5;
        } else {
            // Volver a general si se deselecciona
            if (els.toolbarTexto) els.toolbarTexto.style.display = 'none';
            if (els.toolbarImagen) els.toolbarImagen.style.display = 'none';
            // No forzamos cambio de pestaña al deseleccionar imagen para no ser molestos, o volvemos a fondo
            if (els.msgNoImg) els.msgNoImg.style.display = 'block';
        }
    }

    renderQuickQRs(qrsData) {
        const list = this.elements.listaMisQrs;
        if (!list) return;
        
        if (!qrsData || qrsData.length === 0) {
            list.innerHTML = '<p class="text-muted text-center small">No tienes QRs activos.</p>';
            return;
        }
        list.innerHTML = '<p class="text-muted small mb-2 text-center">💡 Haz clic en un QR para agregarlo al diseño</p>';
        
        qrsData.forEach(qr => {
            const item = document.createElement('div');
            item.className = 'd-flex align-items-center justify-content-between p-2 border rounded bg-light';
            item.innerHTML = `
                <div class="d-flex align-items-center gap-2 flex-grow-1" style="cursor:pointer;" title="Click para agregar al diseño">
                    <span class="badge ${qr.activo !== false ? 'bg-success' : 'bg-warning'}">${qr.activo !== false ? 'Activo' : 'Pausado'}</span>
                    <span class="fw-bold small">${qr.nombre} ${qr.apellido}</span>
                    <span class="text-muted small">(${qr.telefono})</span>
                </div>
                <button class="btn btn-sm btn-outline-primary btn-editar-qr" data-id="${qr.id}">✏️</button>
            `;
            
            // Click en el texto para agregar al canvas
            item.querySelector('div').addEventListener('click', () => {
                this.callbacks.onAddQRToCanvas?.(qr);
                
                // Cerrar modal de lista para mejor UX
                const modalEl = document.getElementById('modalMisQRs');
                if (modalEl) {
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                }
            });

            item.querySelector('.btn-editar-qr').addEventListener('click', () => {
                // Disparar evento global para que StorageManager lo capture (ya que él tiene la lógica del modal de edición)
                document.dispatchEvent(new CustomEvent('editar-qr', { detail: qr }));
                // Cerrar modal de lista
                const modalEl = document.getElementById('modalMisQRs');
                if (modalEl) {
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                }
            });
            
            list.appendChild(item);
        });
    }

    resaltarControl(tipo) {
        // Cambiar de pestaña automáticamente según lo que se seleccione
        if (tipo === 'texto') {
            this.activarPestana('tab-texto-btn');
        } else if (tipo === 'imagen') {
            this.activarPestana('tab-imagen-btn');
        } else if (tipo === 'forma') {
            this.activarPestana('tab-formas-btn');
        } else {
            // Si se deselecciona todo, volver a Fondo
            this.activarPestana('tab-fondo-btn');
        }
    }

    activarPestana(btnId) {
        const btn = this.elements[this.toCamelCase(btnId)];
        if (btn) {
            const tab = new bootstrap.Tab(btn);
            tab.show();
            
            // FIX EXTRA: Asegurar que los otros paneles se oculten (por si Bootstrap falla)
            const targetId = btn.getAttribute('data-bs-target');
            const container = document.getElementById('toolbar-tab-content');
            if (container) {
                container.querySelectorAll('.tab-pane').forEach(pane => {
                    if ('#' + pane.id !== targetId) {
                        pane.classList.remove('show', 'active');
                    }
                });
            }
        }
    }

    mostrarBotonesAccion() {
        const btns = [
            this.elements.botonDescargarPdf,
            this.elements.botonDescargarPng,
            this.elements.botonGuardarDiseno,
            this.elements.botonGuardarNuevo
        ];
        
        btns.forEach(btn => {
            if (btn) btn.classList.remove('boton-descarga-oculto');
        });
    }
}
