// js/storage.js
import { db, auth, storage } from "./firebase-config.js";
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc, deleteDoc, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

export class StorageManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.btnGuardar = document.getElementById('boton-guardar-diseno');
        this.btnGuardarNuevo = document.getElementById('boton-guardar-nuevo');
        this.listaDisenos = document.getElementById('lista-disenos');
        this.contenedorMisDisenos = document.getElementById('mis-disenos-container');
        
        // Elementos del Modal
        this.modalElement = document.getElementById('modalEditarQR');
        this.modal = new bootstrap.Modal(this.modalElement);
        this.btnModalGuardar = document.getElementById('btn-modal-guardar');
        this.btnModalEliminar = document.getElementById('btn-modal-eliminar');
        this.btnModalToggle = document.getElementById('btn-modal-toggle');
        
        this.currentDesignId = null; // Para saber si estamos editando uno existente
        this.qrsCache = []; // Inicializar caché para evitar errores

        this.initEvents();
    }

    initEvents() {
        if (this.btnGuardar) {
            this.btnGuardar.addEventListener('click', () => this.guardarDiseno(false));
        }
        if (this.btnGuardarNuevo) {
            this.btnGuardarNuevo.addEventListener('click', () => this.guardarDiseno(true));
        }
        
        // Escuchar cambios de autenticación para mostrar/ocultar diseños
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.contenedorMisDisenos.classList.remove('d-none');
                await this.cargarMisQRs(user.uid); // Cargar QRs primero para saber cuáles existen
                this.cargarMisDisenos(user.uid);   // Luego cargar diseños
            } else {
                this.contenedorMisDisenos.classList.add('d-none');
                this.listaDisenos.innerHTML = '';
            }
        });
    }

    async guardarDiseno(comoNuevo = false) {
        const user = auth.currentUser;
        if (!user) {
            this.uiManager.showToast('Inicia sesión', 'Debes ingresar con Google para guardar tus diseños.', 'warning');
            return;
        }

        const state = this.uiManager.getState();
        
        this.btnGuardar.disabled = true;
        this.btnGuardarNuevo.disabled = true;
        this.btnGuardar.textContent = "Subiendo imágenes...";

        // Limpiamos el estado de cosas que no necesitamos guardar o que son referencias al DOM
        const disenoData = {
            uid: user.uid,
            nombreDiseno: `${state.inputNombre || ''} ${state.inputApellido || ''}`.trim() || 'Diseño sin nombre',
            createdAt: serverTimestamp(),
            plantilla: state.selectPlantilla,
            config: {
                nombre: state.inputNombre,
                apellido: state.inputApellido,
                grado: state.inputGrado,
                colorFondo: state.inputColorFondo,
                tipoFondo: state.selectTipoFondo,
                tipoPatron: state.selectTipoPatron,
                estiloBorde: state.selectEstiloBorde,
                colorBorde: state.inputColorBorde,
                grosorBorde: state.inputGrosorBorde,
                arcoirisBorde: state.checkArcoirisBorde,
                shiftArcoirisBorde: state.inputShiftArcoirisBorde,
                metalBorde: state.checkMetalBorde,
                tipoMetalBorde: state.inputTipoMetalBorde,
                efectoBorde: state.selectEfectoBorde,
                intensidadEfectoBorde: state.inputIntensidadEfectoBorde,
                radioBorde: state.inputRadioBorde,
                fuenteNombre: state.inputFuenteNombre,
                colorNombre: state.inputColorNombre,
                arcoirisNombre: state.checkArcoirisNombre,
                shiftArcoirisNombre: state.inputShiftArcoirisNombre,
                metalNombre: state.checkMetalNombre,
                tipoMetalNombre: state.inputTipoMetalNombre,
                efectoTextoNombre: state.selectEfectoTextoNombre,
                intensidadEfectoNombre: state.inputIntensidadEfectoNombre,
                tamanoNombre: state.inputTamanoNombre,
                fuenteGrado: state.inputFuenteGrado,
                colorGrado: state.inputColorGrado,
                arcoirisGrado: state.checkArcoirisGrado,
                shiftArcoirisGrado: state.inputShiftArcoirisGrado,
                metalGrado: state.checkMetalGrado,
                tipoMetalGrado: state.inputTipoMetalGrado,
                efectoTextoGrado: state.selectEfectoTextoGrado,
                intensidadEfectoGrado: state.inputIntensidadEfectoGrado,
                tamanoGrado: state.inputTamanoGrado,
                colorDegradado1: state.inputColorDegradado1,
                colorDegradado2: state.inputColorDegradado2,
                conBorde: state.checkboxBorde,
                conBorde2: state.checkboxBorde2,
                offsets: state.offsets,
                fondoProps: state.fondoProps,
            }
        };

        try {
            // Generar miniatura (Thumbnail)
            const thumbnailBase64 = this.uiManager.renderer.canvas.toDataURL('image/jpeg', 0.5); // Calidad media
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
                    effect: img.effect,
                    wBase: img.wBase,
                    hBase: img.hBase
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
            }
            disenoData.config.bgImageSrc = bgSrc;

            // --- GUARDADO EN FIRESTORE ---
            this.btnGuardar.textContent = "Guardando diseño...";
            
            if (this.currentDesignId && !comoNuevo) {
                // Actualizar existente
                await updateDoc(doc(db, "disenos", this.currentDesignId), disenoData);
                this.uiManager.showToast('¡Guardado!', 'Tu diseño se ha actualizado correctamente.', 'success');
            } else {
                // Crear nuevo
                const docRef = await addDoc(collection(db, "disenos"), disenoData);
                this.currentDesignId = docRef.id; // Ahora estamos trabajando sobre este
                this.uiManager.showToast('¡Creado!', 'Diseño guardado como nuevo en tu colección.', 'success');
            }
            
            this.cargarMisDisenos(user.uid); // Recargar lista
            this.cargarMisQRs(user.uid); // Por si se generaron QRs nuevos
        } catch (error) {
            console.error("Error al guardar diseño:", error);
            this.uiManager.showToast('Error', 'Hubo un problema al guardar el diseño.', 'error');
        } finally {
            this.btnGuardar.disabled = false;
            this.btnGuardarNuevo.disabled = false;
            this.btnGuardar.textContent = "💾 Guardar Diseño";
        }
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

    async cargarMisDisenos(uid) {
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
                
                // Usar thumbnail si existe, sino un placeholder
                const thumbHtml = data.thumbnailUrl 
                    ? `<img src="${data.thumbnailUrl}" class="card-img-top" alt="Vista previa" style="height: 150px; object-fit: contain; background-color: #f8f9fa; padding: 5px;">`
                    : `<div class="card-img-top bg-light d-flex align-items-center justify-content-center" style="height: 150px;"><span class="text-muted">Sin vista previa</span></div>`;

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
                    <div class="card h-100 shadow-sm diseno-card" style="cursor: pointer;">
                        ${thumbHtml}
                        <div class="card-body">
                            <h5 class="card-title text-truncate fw-bold text-primary" title="${nombreMostrar}">${nombreMostrar}</h5>
                            <div class="d-flex justify-content-between align-items-center mt-2">
                                <small class="text-muted">${data.plantilla}</small>
                                <small class="text-muted">${data.createdAt ? data.createdAt.toDate().toLocaleDateString() : 'Hoy'}</small>
                            </div>
                            
                            <div class="mt-3 pt-2 border-top d-flex justify-content-between align-items-center">
                                ${qrStatusHtml}
                            </div>
                        </div>
                        <div class="card-footer bg-transparent border-top-0 d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary flex-grow-1 btn-cargar" data-id="${docSnap.id}">✏️ Editar</button>
                            <button class="btn btn-sm btn-outline-secondary btn-duplicar" data-id="${docSnap.id}" title="Crear copia">📑 Duplicar</button>
                            <button class="btn btn-sm btn-outline-danger btn-eliminar" data-id="${docSnap.id}" title="Eliminar">🗑️</button>
                        </div>
                    </div>
                `;
                
                // Evento para cargar
                card.querySelector('.btn-cargar').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.cargarDisenoEnCanvas(data.config, docSnap.id);
                });

                // Evento para duplicar (Cargar como nuevo)
                card.querySelector('.btn-duplicar').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.cargarDisenoEnCanvas(data.config, null); // null ID = Nuevo diseño
                    this.uiManager.showToast('Duplicado', 'Diseño cargado como copia. Al guardar se creará uno nuevo.', 'info');
                });

                // Evento para eliminar
                card.querySelector('.btn-eliminar').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const confirmado = await this.uiManager.showConfirm(
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
                            this.uiManager.showToast('Eliminado', 'El diseño ha sido eliminado.', 'success');
                        } catch (err) {
                            console.error("Error al eliminar:", err);
                            this.uiManager.showToast('Error', 'No se pudo eliminar el diseño.', 'error');
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
                        this.uiManager.showAlert(
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
                this.uiManager.renderQuickQRs([]);
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
            this.uiManager.renderQuickQRs(qrsList);

        } catch (error) {
            console.error("Error al cargar QRs:", error);
        }
    }

    abrirModalQR(qrData) {
        const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
        const qrUrl = `${baseUrl}qr.html?id=${qrData.id}`;
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
            this.uiManager.showToast('Actualizado', 'El teléfono del QR ha sido actualizado.', 'success');
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
                this.uiManager.showAlert('No se puede eliminar', '⛔ Este QR está siendo utilizado en uno de tus diseños guardados.<br><br>Si realmente quieres borrarlo, primero elimina el diseño que lo contiene.', '🚫');
            } else {
                const confirmado = await this.uiManager.showConfirm(
                    'Eliminar QR',
                    '⚠️ <b>¿Estás seguro?</b><br>Si ya has impreso etiquetas con este código, dejarán de funcionar y no podrán ser escaneadas por nadie.',
                    '🗑️', 'Sí, eliminar QR'
                );
                
                if (confirmado) {
                await deleteDoc(doc(db, "qrs", qrData.id));
                this.modal.hide();
                this.cargarMisQRs(auth.currentUser.uid);
                this.cargarMisDisenos(auth.currentUser.uid); // Refrescar diseños para actualizar estado
                this.uiManager.showToast('QR Eliminado', 'El código QR ha sido borrado permanentemente.', 'success');
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
                this.uiManager.showToast('QR Activado', 'Ahora redirigirá a WhatsApp correctamente.', 'success');
            } else {
                this.uiManager.showToast('QR Pausado', 'Al escanearlo se mostrará un mensaje de inactivo.', 'warning');
            }
            this.modal.hide();
            this.cargarMisQRs(auth.currentUser.uid);
            this.cargarMisDisenos(auth.currentUser.uid);
        });

        this.modal.show();
    }

    cargarDisenoEnCanvas(config, docId) {
        this.currentDesignId = docId; // Establecer como diseño actual para actualizaciones
        
        // Restaurar valores en inputs
        const elements = this.uiManager.elements;
        
        elements.inputNombre.value = config.nombre || '';
        elements.inputApellido.value = config.apellido || '';
        elements.inputGrado.value = config.grado || '';
        elements.inputColorFondo.value = config.colorFondo || '#E0F7FA';
        elements.selectTipoFondo.value = config.tipoFondo || 'solido';
        elements.selectTipoPatron.value = config.tipoPatron || 'ninguno';
        elements.selectEstiloBorde.value = config.estiloBorde || 'simple';
        elements.inputColorBorde.value = config.colorBorde || '#004D40';
        elements.inputGrosorBorde.value = config.grosorBorde || 5;
        elements.checkArcoirisBorde.checked = config.arcoirisBorde || false;
        elements.inputShiftArcoirisBorde.value = config.shiftArcoirisBorde || 0;
        elements.checkMetalBorde.checked = config.metalBorde || false;
        elements.inputTipoMetalBorde.value = config.tipoMetalBorde || 0;
        elements.selectEfectoBorde.value = config.efectoBorde || 'ninguno';
        elements.inputIntensidadEfectoBorde.value = config.intensidadEfectoBorde || 5;
        elements.inputRadioBorde.value = config.radioBorde || 10;
        
        elements.inputFuenteNombre.value = config.fuenteNombre;
        elements.inputColorNombre.value = config.colorNombre;
        elements.checkArcoirisNombre.checked = config.arcoirisNombre || false;
        elements.inputShiftArcoirisNombre.value = config.shiftArcoirisNombre || 0;
        elements.checkMetalNombre.checked = config.metalNombre || false;
        elements.inputTipoMetalNombre.value = config.tipoMetalNombre || 0;
        elements.selectEfectoTextoNombre.value = config.efectoTextoNombre;
        elements.inputIntensidadEfectoNombre.value = config.intensidadEfectoNombre || 5;
        elements.inputTamanoNombre.value = config.tamanoNombre || 1.0;
        
        elements.inputFuenteGrado.value = config.fuenteGrado;
        elements.inputColorGrado.value = config.colorGrado;
        elements.checkArcoirisGrado.checked = config.arcoirisGrado || false;
        elements.inputShiftArcoirisGrado.value = config.shiftArcoirisGrado || 0;
        elements.checkMetalGrado.checked = config.metalGrado || false;
        elements.inputTipoMetalGrado.value = config.tipoMetalGrado || 0;
        elements.selectEfectoTextoGrado.value = config.efectoTextoGrado;
        elements.inputIntensidadEfectoGrado.value = config.intensidadEfectoGrado || 5;
        elements.inputTamanoGrado.value = config.tamanoGrado || 1.0;
        
        elements.inputColorDegradado1.value = config.colorDegradado1;
        elements.inputColorDegradado2.value = config.colorDegradado2;
        
        elements.checkboxBorde.checked = config.conBorde;
        if (config.conBorde2 !== undefined) elements.checkboxBorde2.checked = config.conBorde2;
        
        // Actualizar visibilidad del control de radio
        elements.checkboxBorde.dispatchEvent(new Event('change'));
        
        // Restaurar plantilla (dispara evento change, así que cuidado con resetear estado)
        // Usamos un valor por defecto si viene vacío para evitar errores
        const plantillaToLoad = config.plantilla || 'cuaderno';
        elements.selectPlantilla.value = plantillaToLoad;
        // Disparamos evento manualmente para que se ajuste la UI (bordes combo, etc)
        // IMPORTANTE: Esto resetea offsets en ui-manager, por eso restauramos offsets DESPUÉS
        elements.selectPlantilla.dispatchEvent(new Event('change'));

        // Restaurar estado interno (offsets y fondo) DESPUÉS del cambio de plantilla
        this.uiManager.state.offsets = config.offsets || {};
        this.uiManager.state.fondoProps = config.fondoProps || { x: 0, y: 0, scale: 1 };

        // Restaurar imágenes
        this.uiManager.state.imagenesEnCanvas = [];
        if (config.imagenes && config.imagenes.length > 0) {
            config.imagenes.forEach(imgConfig => {
                const img = new Image();
                img.crossOrigin = "Anonymous"; // IMPORTANTE: Evita el error "Tainted canvases"
                img.src = imgConfig.src;
                img.onload = () => {
                    this.uiManager.state.imagenesEnCanvas.push({
                        img: img,
                        x: imgConfig.x,
                        y: imgConfig.y,
                        scale: imgConfig.scale,
                        effect: imgConfig.effect,
                        wBase: imgConfig.wBase,
                        hBase: imgConfig.hBase
                    });
                    this.uiManager.updatePreview();
                };
            });
        }

        // Restaurar fondo si es imagen
        if (config.tipoFondo === 'imagen' && config.bgImageSrc) {
            const bgImg = new Image();
            bgImg.crossOrigin = "Anonymous";
            bgImg.src = config.bgImageSrc;
            bgImg.onload = () => {
                this.uiManager.state.imagenFondoPropia = bgImg;
                this.uiManager.updatePreview();
            };
        }

        // Disparar eventos para actualizar UI visualmente (mostrar/ocultar paneles)
        elements.selectTipoFondo.dispatchEvent(new Event('input'));
        
        // Actualizar visibilidad de controles arcoíris
        this.uiManager.toggleColorControls();

        // Actualizar vista previa final
        setTimeout(() => this.uiManager.updatePreview(), 100); // Pequeño delay para asegurar carga
        
        // Scroll arriba para ver el resultado
        document.querySelector('.configurador').scrollIntoView({ behavior: 'smooth' });
        
        this.uiManager.showToast('Cargado', 'Diseño listo para editar.', 'success');
    }
}
