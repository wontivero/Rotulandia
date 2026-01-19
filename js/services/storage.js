import { db, auth, storage } from "../firebase-config.js";
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc, deleteDoc, serverTimestamp, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { Toast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';

export class StorageManager {
    constructor(controller) {
        this.controller = controller; // Antes uiManager, ahora controller
        this.currentDesignId = null;
        this.qrsCache = [];
    }

    reset() {
        this.currentDesignId = null;
    }

    // Método llamado por EditorView
    initEditorEvents() {
        // Inicializar elementos del modal QR (ahora presentes en EditorView)
        this.initQRModalElements();

        // Escuchar evento custom para editar QR desde el panel rápido (desacople)
        document.addEventListener('editar-qr', (e) => {
            this.abrirModalQR(e.detail);
        });

        this.btnGuardar = document.getElementById('boton-guardar-diseno');
        this.btnGuardarNuevo = document.getElementById('boton-guardar-nuevo');
        
        if (this.btnGuardar) {
            this.btnGuardar.addEventListener('click', () => this.guardarDiseno(false));
        }
        if (this.btnGuardarNuevo) {
            this.btnGuardarNuevo.addEventListener('click', () => this.guardarDiseno(true));
        }
    }

    // Método llamado por DashboardView
    initDashboardEvents() {
        this.listaDisenos = document.getElementById('lista-disenos');
        this.contenedorMisDisenos = document.getElementById('mis-disenos-container');
        
        this.initQRModalElements();

        // Cargar datos si hay usuario
        const user = auth.currentUser;
        if (user && this.contenedorMisDisenos) {
            this.contenedorMisDisenos.classList.remove('d-none');
            this.cargarMisQRs(user.uid).then(() => this.cargarMisDisenos(user.uid));
        } else if (this.contenedorMisDisenos) {
            this.contenedorMisDisenos.classList.add('d-none');
            if (this.listaDisenos) this.listaDisenos.innerHTML = '';
        }
    }

    initQRModalElements() {
        this.modalElement = document.getElementById('modalEditarQR');
        if (this.modalElement) {
            this.modal = bootstrap.Modal.getOrCreateInstance(this.modalElement);
            this.btnModalGuardar = document.getElementById('btn-modal-guardar');
            this.btnModalEliminar = document.getElementById('btn-modal-eliminar');
            this.btnModalToggle = document.getElementById('btn-modal-toggle');
        }
    }

    async guardarDiseno(comoNuevo = false) {
        const user = auth.currentUser;
        if (!user) {
            Toast.show('Inicia sesión', 'Debes ingresar con Google para guardar tus diseños.', 'warning');
            return;
        }

        const state = this.controller.getState();
        
        this.btnGuardar.disabled = true;
        this.btnGuardarNuevo.disabled = true;
        this.btnGuardar.textContent = "Subiendo imágenes...";

        // Limpiamos el estado de cosas que no necesitamos guardar o que son referencias al DOM
        const disenoData = {
            uid: user.uid,
            nombreDiseno: `${state.nombre || ''} ${state.apellido || ''}`.trim() || 'Diseño sin nombre',
            createdAt: serverTimestamp(),
            plantilla: state.plantilla,
            config: {
                nombre: state.nombre || '',
                apellido: state.apellido || '',
                grado: state.grado || '',
                colorFondo: state.colorFondo || '#E0F7FA',
                tipoFondo: state.tipoFondo || 'solido',
                tipoPatron: state.tipoPatron || 'ninguno',
                estiloBorde: state.estiloBorde || 'simple',
                colorBorde: state.colorBorde || '#004D40',
                grosorBorde: state.grosorBorde || 5,
                arcoirisBorde: state.checkArcoirisBorde || false,
                shiftArcoirisBorde: state.shiftArcoirisBorde || 0,
                metalBorde: state.checkMetalBorde || false,
                tipoMetalBorde: state.tipoMetalBorde || 0,
                efectoBorde: state.efectoBorde || 'ninguno',
                intensidadEfectoBorde: state.intensidadEfectoBorde || 5,
                radioBorde: state.radioBorde || 10,
                fuenteNombre: state.fuenteNombre || "'Fredoka', sans-serif",
                colorNombre: state.colorNombre || '#000000',
                arcoirisNombre: state.checkArcoirisNombre || false,
                shiftArcoirisNombre: state.shiftArcoirisNombre || 0,
                metalNombre: state.checkMetalNombre || false,
                tipoMetalNombre: state.tipoMetalNombre || 0,
                efectoTextoNombre: state.efectoTextoNombre || 'moderno',
                intensidadEfectoNombre: state.intensidadEfectoNombre || 5,
                tamanoNombre: state.tamanoNombre || 1.0,
                fuenteGrado: state.fuenteGrado || "'Fredoka', sans-serif",
                colorGrado: state.colorGrado || '#000000',
                arcoirisGrado: state.checkArcoirisGrado || false,
                shiftArcoirisGrado: state.shiftArcoirisGrado || 0,
                metalGrado: state.checkMetalGrado || false,
                tipoMetalGrado: state.tipoMetalGrado || 0,
                efectoTextoGrado: state.efectoTextoGrado || 'moderno',
                intensidadEfectoGrado: state.intensidadEfectoGrado || 5,
                tamanoGrado: state.tamanoGrado || 1.0,
                colorDegradado1: state.colorDegradado1 || '#ffffff',
                colorDegradado2: state.colorDegradado2 || '#000000',
                conBorde: state.conBorde || false,
                conBorde2: state.conBorde2 || false,
                offsets: state.offsets || {},
                fondoProps: state.fondoProps || { x: 0, y: 0, scale: 1 },
            }
        };

        try {
            // Generar miniatura (Thumbnail)
            const thumbnailBase64 = this.controller.renderer.canvas.toDataURL('image/jpeg', 0.5); // Calidad media
            const thumbnailPath = `usuarios/${user.uid}/thumbnails/${Date.now()}_thumb.jpg`;
            disenoData.thumbnailUrl = await this.subirImagenBase64(thumbnailBase64, thumbnailPath);

            // --- PROCESAMIENTO DE IMÁGENES (SUBIDA A STORAGE) ---
            
            // 1. Procesar Personajes/QR
            const imagenesProcesadas = await Promise.all(state.imagenesEnCanvas.map(async (img, index) => {
                let src = img.img.src;
                
                // Si es base64 (imagen subida o QR generado), subirla a Storage
                if (src.startsWith('data:image')) {
                    const path = `usuarios/${user.uid}/imagenes/${Date.now()}_img_${index}.png`;
                    src = await this.subirImagenBase64(src, path);
                }

                return {
                    src: src,
                    x: img.x,
                    y: img.y,
                    scale: img.scale,
                    effect: img.effect || 'ninguno', // FIX: Evitar undefined
                    wBase: img.wBase,
                    hBase: img.hBase,
                    type: img.type || 'image',
                    shapeType: img.shapeType || null, // FIX: Evitar undefined
                    opacity: img.opacity !== undefined ? img.opacity : 1,
                    color: img.color || null // FIX: Evitar undefined
                };
            }));
            disenoData.config.imagenes = imagenesProcesadas;

            // 2. Procesar Fondo Propio
            let bgSrc = null;
            if (state.imagenFondoPropia) {
                let src = state.imagenFondoPropia.src;
                if (src.startsWith('data:image')) {
                    const path = `usuarios/${user.uid}/fondos/${Date.now()}_bg.png`;
                    src = await this.subirImagenBase64(src, path);
                }
                bgSrc = src;
                
                // Guardar referencia del fondo en colección 'mis_fondos' para reutilizar
                // Solo si es una imagen nueva (base64) o si queremos asegurar que esté en la lista
                // Para simplificar, guardamos la URL final
                if (bgSrc) {
                    await this.guardarFondoUsuario(user.uid, bgSrc);
                }
            }
            disenoData.config.bgImageSrc = bgSrc;

            // --- GUARDADO EN FIRESTORE ---
            this.btnGuardar.textContent = "Guardando diseño...";
            
            if (this.currentDesignId && !comoNuevo) {
                // Actualizar existente
                await updateDoc(doc(db, "disenos", this.currentDesignId), disenoData);
                Toast.show('¡Guardado!', 'Tu diseño se ha actualizado correctamente.', 'success');
            } else {
                // Crear nuevo
                const docRef = await addDoc(collection(db, "disenos"), disenoData);
                this.currentDesignId = docRef.id; // Ahora estamos trabajando sobre este
                Toast.show('¡Creado!', 'Diseño guardado como nuevo en tu colección.', 'success');
            }
            
            this.cargarMisDisenos(user.uid); // Recargar lista
            this.cargarMisQRs(user.uid); // Por si se generaron QRs nuevos
        } catch (error) {
            console.error("Error al guardar diseño:", error);
            Toast.show('Error', 'Hubo un problema al guardar el diseño.', 'error');
        } finally {
            this.btnGuardar.disabled = false;
            this.btnGuardarNuevo.disabled = false;
            this.btnGuardar.textContent = "💾 Guardar Diseño";
        }
    }

    async guardarFondoUsuario(uid, url) {
        try {
            // Verificar si ya existe para no duplicar
            const q = query(collection(db, "mis_fondos"), where("uid", "==", uid), where("url", "==", url));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) return;

            await addDoc(collection(db, "mis_fondos"), {
                uid: uid,
                url: url,
                createdAt: serverTimestamp()
            });
        } catch (e) {
            console.error("Error guardando fondo usuario:", e);
        }
    }

    async cargarMisFondos(uid) {
        try {
            const q = query(collection(db, "mis_fondos"), where("uid", "==", uid), orderBy("createdAt", "desc"), limit(20));
            const querySnapshot = await getDocs(q);
            
            // Limpiar galería de usuario en toolbox antes de agregar (si fuera necesario, pero addToGallery agrega)
            this.controller.toolbox.clearUserGallery();
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                this.controller.toolbox.addToGallery(data.url, false);
            });
        } catch (error) {
            console.error("Error cargando mis fondos:", error);
        }
    }

    async cargarMisFormas(uid) {
        try {
            const q = query(collection(db, "mis_formas"), where("uid", "==", uid), orderBy("createdAt", "desc"), limit(20));
            const querySnapshot = await getDocs(q);
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                this.controller.toolbox.addToGallery(data.url, 'forma', false);
            });
        } catch (error) {
            console.error("Error cargando mis formas:", error);
        }
    }

    async cargarMisPersonajes(uid) {
        try {
            const q = query(collection(db, "mis_personajes"), where("uid", "==", uid), orderBy("createdAt", "desc"), limit(20));
            const querySnapshot = await getDocs(q);
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                this.controller.toolbox.addToGallery(data.url, 'personaje', false);
            });
        } catch (error) {
            console.error("Error cargando mis personajes:", error);
        }
    }

    async subirArchivoInmediato(file, category) {
        // category: 'fondo', 'personaje', 'forma'
        const user = auth.currentUser;
        if (!user) return null;

        let folder = 'fondos';
        if (category === 'personaje' || category === 'forma') folder = 'imagenes';
        
        const path = `usuarios/${user.uid}/${folder}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, path);
        
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        // Si es fondo, lo guardamos en la colección para que aparezca en "Mis Fondos"
        if (category === 'fondo') {
            await addDoc(collection(db, "mis_fondos"), {
                uid: user.uid,
                url: url,
                createdAt: serverTimestamp()
            });
        } else if (category === 'forma') {
            await addDoc(collection(db, "mis_formas"), {
                uid: user.uid,
                url: url,
                createdAt: serverTimestamp()
            });
        } else if (category === 'personaje') {
            await addDoc(collection(db, "mis_personajes"), {
                uid: user.uid,
                url: url,
                createdAt: serverTimestamp()
            });
        }
        return url;
    }

    async subirImagenBase64(base64String, path) {
        const storageRef = ref(storage, path);
        
        // Convertir Base64 a Blob para evitar problemas de CORS con uploadString y ser más eficiente
        const response = await fetch(base64String);
        const blob = await response.blob();
        
        await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(storageRef);
        return url;
    }

    async loadDesignById(docId, isDuplicate = false) {
        try {
            const docRef = doc(db, "disenos", docId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Si es duplicado, pasamos null como ID para que se guarde como nuevo
                this.cargarDisenoEnCanvas(data.config, isDuplicate ? null : docId);
                
                if (isDuplicate) {
                    Toast.show('Copia lista', 'Diseño duplicado correctamente. Se guardará como uno nuevo.', 'success');
                }
            } else {
                Toast.show('Error', 'El diseño no existe.', 'error');
            }
        } catch (error) {
            console.error("Error al cargar diseño por ID:", error);
            Toast.show('Error', 'No se pudo cargar el diseño.', 'error');
        }
    }

    async cargarMisDisenos(uid) {
        if (!this.listaDisenos) return;

        this.listaDisenos.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div></div>';
        
        try {
            const q = query(collection(db, "disenos"), where("uid", "==", uid));
            const querySnapshot = await getDocs(q);
            
            this.listaDisenos.innerHTML = '';
            
            if (querySnapshot.empty) {
                this.listaDisenos.innerHTML = '<p class="text-muted text-center">No tienes diseños guardados aún.</p>';
                return;
            }

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const card = document.createElement('div');
                card.className = 'col-md-4 mb-3';
                
                // Thumbnail mejorado con contenedor de relación de aspecto
                const thumbHtml = data.thumbnailUrl 
                    ? `<div class="position-relative" style="height: 180px; background-color: #f8f9fa; overflow: hidden;">
                         <img src="${data.thumbnailUrl}" alt="Vista previa" style="width: 100%; height: 100%; object-fit: contain; padding: 10px;">
                       </div>`
                    : `<div class="d-flex align-items-center justify-content-center bg-light text-muted" style="height: 180px;">
                         <div class="text-center"><span style="font-size: 2rem;">🖼️</span><br><small>Sin vista previa</small></div>
                       </div>`;

                // Buscar si hay un QR en la configuración de este diseño
                // Buscamos en las imágenes guardadas alguna que sea un QR (data:image) y que tenga un ID asociado si lo guardamos
                // Como no guardamos el ID del QR en el diseño explícitamente, podemos inferirlo o simplemente agregar un botón genérico de "Ver QRs"
                // O mejor, si el diseño tiene nombre/apellido, buscamos el QR que coincida.
                
                // Para simplificar y ser robustos: Agregamos un botón "Ver QRs" que lleva a la sección de QRs
                // Si quisiéramos ser más específicos, tendríamos que guardar el ID del QR en el diseño al momento de crear.
                
                const nombreMostrar = `${data.config.nombre || ''} ${data.config.apellido || ''}`.trim() || 'Diseño sin nombre';

                // Verificar si existe un QR para este alumno
                const nombreBusqueda = nombreMostrar.toLowerCase();
                const qrEncontrado = this.qrsCache.find(q => 
                    `${q.nombre || ''} ${q.apellido || ''}`.trim().toLowerCase() === nombreBusqueda
                );

                // Verificar si el diseño REALMENTE tiene un QR en el canvas
                // 1. Chequeamos la propiedad isQR (para diseños nuevos)
                // 2. O si es un diseño viejo (isQR undefined), chequeamos si tiene tamaño 100x100 (heurística)
                const tieneQrEnDiseno = data.config.imagenes && data.config.imagenes.some(img => 
                    img.isQR === true || (img.isQR === undefined && img.wBase === 100 && img.hBase === 100)
                );

                let qrStatusHtml = '';
                if (qrEncontrado && tieneQrEnDiseno) {
                    const isActivo = qrEncontrado.activo !== false; // Por defecto true
                    if (isActivo) {
                        qrStatusHtml = `
                            <div class="text-success d-flex align-items-center gap-1" title="QR Dinámico activo">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-qr-code" viewBox="0 0 16 16"><path d="M2 2h2v2H2V2Z"/><path d="M6 0v6H0V0h6ZM5 1H1v4h4V1ZM4 12H2v2h2v-2Z"/><path d="M6 10v6H0v-6h6ZM5 11H1v4h4v-4ZM11 2H9v2h2V2Z"/><path d="M8 0v6h6V0H8Zm5 1H9v4h4V1ZM8 1v1h1V1H8ZM13 6v1h1V6h-1ZM9 6v1h1V6H9ZM12 8V6h1v2h-1ZM8 8V6h1v2H8ZM14 2h1v1h-1V2ZM2 13h2v1H2v-1Z"/><path d="M10 8h1v2h-1V8ZM13 8h1v2h-1V8ZM8 10h1v2H8v-2ZM14 10h1v2h-1v-2ZM10 12h1v2h-1v-2ZM13 12h1v2h-1v-2ZM8 14h1v2H8v-2ZM14 14h1v2h-1v-2ZM11 14h1v1h-1v-1h1ZM11 11h1v1h-1v-1ZM12 13h1v1h-1v-1ZM11 9h1v1h-1V9Z"/></svg>
                                <span style="font-size: 0.8em; font-weight: bold;">QR Activo</span>
                            </div>
                            <button class="btn btn-sm btn-link text-decoration-none p-0 btn-ir-qr" title="Ir a QRs de este alumno">Ver/Editar ✏️</button>
                        `;
                    } else {
                        qrStatusHtml = `
                            <div class="text-warning d-flex align-items-center gap-1" title="QR Pausado (No redirige)">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-pause-circle-fill" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM6.25 5C5.56 5 5 5.56 5 6.25v3.5a1.25 1.25 0 1 0 2.5 0v-3.5C7.5 5.56 6.94 5 6.25 5zm3.5 0c-.69 0-1.25.56-1.25 1.25v3.5a1.25 1.25 0 1 0 2.5 0v-3.5C11 5.56 10.44 5 9.75 5z"/></svg>
                                <span style="font-size: 0.8em; font-weight: bold;">QR Pausado</span>
                            </div>
                            <button class="btn btn-sm btn-link text-decoration-none p-0 btn-ir-qr" title="Ir a QRs de este alumno">Activar ✏️</button>
                        `;
                    }
                } else {
                    qrStatusHtml = `
                        <div class="text-muted d-flex align-items-center gap-1" title="Sin QR asociado">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-qr-code-scan" viewBox="0 0 16 16"><path d="M0 .5A.5.5 0 0 1 .5 0h3a.5.5 0 0 1 0 1H1v2.5a.5.5 0 0 1-1 0v-3Zm12 0a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0V1h-2.5a.5.5 0 0 1-.5-.5ZM.5 12a.5.5 0 0 1 .5.5V15h2.5a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5v-3a.5.5 0 0 1 .5-.5Zm15 0a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1 0-1H15v-2.5a.5.5 0 0 1 .5-.5ZM4 4h1v1H4V4Z"/><path d="M7 2H2v5h5V2ZM3 3h3v3H3V3Zm2 8H4v1h1v-1Z"/><path d="M7 9H2v5h5V9ZM3 10h3v3H3v-3Zm8.5 2h1.5v1h-1.5v-1Zm1.5-1v1h1v-1h-1Z"/><path d="M6.5 14H6v1h1v-1h-.5Z"/><path d="M9.5 15h1v1h-1v-1Z"/><path d="M12.5 14H12v1h1v-1h-.5Z"/><path d="M12 5v1h1V5h-1Zm-1 1h-1v1h1V6Zm1-1V4h1v1h-1Zm-1 0h-1v1h1V5Z"/><path d="M9 2H8v1h1V2Zm1 1V2h1v1h-1Zm-1 1H8v1h1V4Zm1 1V4h1v1h-1Zm-1 1H8v1h1V6Zm1 1V6h1v1h-1Z"/><path d="M10.5 1h-.5v1h1V1h-.5Z"/><path d="M13.5 1H13v1h1V1h-.5Z"/><path d="M10.5 14h-.5v1h1V14h-.5Z"/></svg>
                            <span style="font-size: 0.8em;">Sin QR</span>
                            <button class="btn btn-sm p-0 ms-1 btn-info-qr text-primary" title="¿Por qué usar QR?">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-info-circle-fill" viewBox="0 0 16 16"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>
                            </button>
                        </div>
                    `;
                }

                card.innerHTML = `
                    <div class="card h-100 border-0 shadow-sm diseno-card" style="border-radius: 12px; overflow: hidden; cursor: pointer;">
                        ${thumbHtml}
                        <div class="card-body d-flex flex-column p-3">
                            <div class="mb-2">
                                <h5 class="card-title fw-bold text-dark text-truncate mb-1" title="${nombreMostrar}">${nombreMostrar}</h5>
                                <div class="d-flex gap-2">
                                    <span class="badge bg-light text-secondary border fw-normal">${data.plantilla}</span>
                                    <span class="badge bg-light text-secondary border fw-normal">📅 ${data.createdAt ? data.createdAt.toDate().toLocaleDateString() : 'Hoy'}</span>
                                </div>
                            </div>
                            
                            <div class="mt-auto">
                                <div class="bg-light rounded p-2 mb-3 d-flex justify-content-between align-items-center" style="font-size: 0.9rem;">
                                    ${qrStatusHtml}
                                </div>

                                <div class="d-grid gap-2">
                                    <button class="btn btn-primary rounded-pill fw-bold btn-sm btn-cargar" data-id="${docSnap.id}">✏️ Editar Diseño</button>
                                    <div class="row g-2">
                                        <div class="col-6"><button class="btn btn-outline-secondary rounded-pill btn-sm w-100 btn-duplicar" data-id="${docSnap.id}">📑 Copiar</button></div>
                                        <div class="col-6"><button class="btn btn-outline-danger rounded-pill btn-sm w-100 btn-eliminar" data-id="${docSnap.id}">🗑️ Borrar</button></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Evento para cargar
                card.querySelector('.btn-cargar').addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Guardar ID y redirigir al editor
                    localStorage.setItem('pendingDesignId', docSnap.id);
                    window.location.hash = '#editor';
                });

                // Evento para duplicar (Cargar como nuevo)
                card.querySelector('.btn-duplicar').addEventListener('click', (e) => {
                    e.stopPropagation();
                    localStorage.setItem('pendingDesignId', docSnap.id);
                    localStorage.setItem('isDuplicate', 'true');
                    window.location.hash = '#editor';
                    Toast.show('Duplicado', 'Diseño cargado como copia. Al guardar se creará uno nuevo.', 'info');
                });

                // Evento para eliminar
                card.querySelector('.btn-eliminar').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const confirmado = await Modal.confirm(
                        'Eliminar Diseño', 
                        '¿Estás seguro de que quieres eliminar este diseño? <b>Esta acción no se puede deshacer.</b>',
                        '🗑️',
                        'Sí, eliminar'
                    );
                    
                    if (confirmado) {
                        try {
                            await deleteDoc(doc(db, "disenos", docSnap.id)); // Eliminar de Firestore
                            // Nota: Las imágenes en Storage quedan huérfanas por ahora (se puede limpiar con Cloud Functions en un futuro)
                            this.cargarMisDisenos(uid); // Recargar lista
                            if (this.currentDesignId === docSnap.id) this.currentDesignId = null; // Resetear si era el actual
                            Toast.show('Eliminado', 'El diseño ha sido eliminado.', 'success');
                        } catch (err) {
                            console.error("Error al eliminar:", err);
                            Toast.show('Error', 'No se pudo eliminar el diseño.', 'error');
                        }
                    }
                });

                // Evento para ir a QRs
                const btnIrQr = card.querySelector('.btn-ir-qr');
                if (btnIrQr) {
                    btnIrQr.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (qrEncontrado) {
                            this.abrirModalQR(qrEncontrado);
                        }
                    });
                }

                // Evento para info QR (Explicación)
                const btnInfoQr = card.querySelector('.btn-info-qr');
                if (btnInfoQr) {
                    btnInfoQr.addEventListener('click', (e) => {
                        e.stopPropagation();
                        Modal.alert(
                            '💡 ¿Para qué sirve el QR?',
                            'Si agregas un código QR a tu diseño, quien encuentre los útiles perdidos podrá escanearlo y contactarte por WhatsApp para devolverlos.<br><br><b>¡Es gratis y muy seguro!</b> Edita este diseño y agrega un QR desde el panel.',
                            '📱'
                        );
                    });
                }
                
                this.listaDisenos.appendChild(card);
            });
        } catch (error) {
            console.error("Error al cargar diseños:", error);
            this.listaDisenos.innerHTML = '<p class="text-danger text-center">Error al cargar tus diseños.</p>';
        }
    }

    async cargarMisQRs(uid) {
        try {
            const q = query(collection(db, "qrs"), where("uid", "==", uid), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            
            const qrsList = []; // Para la lista rápida
            this.qrsCache = []; // Cache para búsqueda rápida
            
            if (querySnapshot.empty) {
                this.controller.renderQuickQRs([]);
                return;
            }

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const qrObj = { id: docSnap.id, ...data };
                
                // Guardar para lista rápida
                qrsList.push(qrObj);
                this.qrsCache.push(qrObj);
            });

            // Actualizar la lista rápida en el panel de control
            this.controller.renderQuickQRs(qrsList);

        } catch (error) {
            console.error("Error al cargar QRs:", error);
        }
    }

    abrirModalQR(qrData) {
        const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
        const qrUrl = `${baseUrl}qr.html?${qrData.id}`;
        const qr = new QRious({ value: qrUrl, size: 150, level: 'L' });

        document.getElementById('modal-qr-img').src = qr.toDataURL();
        document.getElementById('modal-qr-nombre').textContent = `${qrData.nombre} ${qrData.apellido}`;
        document.getElementById('modal-qr-telefono').value = qrData.telefono;

        // Configurar botones (clonamos para eliminar listeners anteriores)
        const btnGuardar = this.btnModalGuardar.cloneNode(true);
        this.btnModalGuardar.parentNode.replaceChild(btnGuardar, this.btnModalGuardar);
        this.btnModalGuardar = btnGuardar;

        const btnEliminar = this.btnModalEliminar.cloneNode(true);
        this.btnModalEliminar.parentNode.replaceChild(btnEliminar, this.btnModalEliminar);
        this.btnModalEliminar = btnEliminar;

        const btnToggle = this.btnModalToggle.cloneNode(true);
        this.btnModalToggle.parentNode.replaceChild(btnToggle, this.btnModalToggle);
        this.btnModalToggle = btnToggle;

        this.btnModalGuardar.addEventListener('click', async () => {
            const nuevoTel = document.getElementById('modal-qr-telefono').value.trim();
            await updateDoc(doc(db, "qrs", qrData.id), { telefono: nuevoTel });
            Toast.show('Actualizado', 'El teléfono del QR ha sido actualizado.', 'success');
            this.modal.hide();
            this.cargarMisQRs(auth.currentUser.uid);
            this.cargarMisDisenos(auth.currentUser.uid); // Refrescar diseños para actualizar estado
        });

        this.btnModalEliminar.addEventListener('click', async () => {
            // 1. Verificar si el QR está en uso en algún diseño
            const uid = auth.currentUser.uid;
            const q = query(collection(db, "disenos"), where("uid", "==", uid));
            const querySnapshot = await getDocs(q);
            let estaEnUso = false;

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.config && data.config.imagenes) {
                    if (data.config.imagenes.some(img => img.qrId === qrData.id)) {
                        estaEnUso = true;
                    }
                }
            });

            if (estaEnUso) {
                Modal.alert('No se puede eliminar', '⛔ Este QR está siendo utilizado en uno de tus diseños guardados.<br><br>Si realmente quieres borrarlo, primero elimina el diseño que lo contiene.', '🚫');
            } else {
                const confirmado = await Modal.confirm(
                    'Eliminar QR',
                    '⚠️ <b>¿Estás seguro?</b><br>Si ya has impreso etiquetas con este código, dejarán de funcionar y no podrán ser escaneadas por nadie.',
                    '🗑️', 'Sí, eliminar QR'
                );
                
                if (confirmado) {
                await deleteDoc(doc(db, "qrs", qrData.id));
                this.modal.hide();
                this.cargarMisQRs(auth.currentUser.uid);
                this.cargarMisDisenos(auth.currentUser.uid); // Refrescar diseños para actualizar estado
                Toast.show('QR Eliminado', 'El código QR ha sido borrado permanentemente.', 'success');
                }
            }
        });

        // Configurar botón de Pausar/Activar
        const isActivo = qrData.activo !== false;
        this.btnModalToggle.textContent = isActivo ? "⏸️ Pausar" : "▶️ Activar";
        this.btnModalToggle.className = isActivo ? "btn btn-outline-warning" : "btn btn-outline-success";
        
        this.btnModalToggle.addEventListener('click', async () => {
            const newState = !isActivo;
            await updateDoc(doc(db, "qrs", qrData.id), { activo: newState });
            
            if (newState) {
                Toast.show('QR Activado', 'Ahora redirigirá a WhatsApp correctamente.', 'success');
            } else {
                Toast.show('QR Pausado', 'Al escanearlo se mostrará un mensaje de inactivo.', 'warning');
            }
            this.modal.hide();
            this.cargarMisQRs(auth.currentUser.uid);
            this.cargarMisDisenos(auth.currentUser.uid);
        });

        this.modal.show();
    }

    cargarDisenoEnCanvas(config, docId) {
        this.currentDesignId = docId;
        // Delegamos toda la lógica de restauración al controlador
        this.controller.loadConfig(config, docId);
    }
}