import { View } from '../core/View.js';
import { CanvasRenderer } from '../canvas-renderer.js';
import { PDFGenerator } from '../services/pdf-generator.js';
import EditorController from './editor/EditorController.js';
import { StorageManager } from '../services/storage.js';
import { store } from '../store.js';

export default class EditorView extends View {
    constructor(params) {
        super(params);
        this.setTitle('Editor');
    }

    async getHtml() {
        // Retornamos el HTML gigante del editor
        return `
        <!-- BARRA DE HERRAMIENTAS CONTEXTUAL (Sticky Top) -->
        <div id="editor-toolbar" class="editor-toolbar sticky-top shadow-sm">
            <div class="container-fluid py-2">
                
                <!-- NAVEGACIÓN POR PESTAÑAS -->
                <ul class="nav nav-pills mb-2 gap-2" id="toolbar-tabs" role="tablist" style="font-size: 0.9rem;">
                    <li class="nav-item" role="presentation"><button class="nav-link active rounded-pill px-3 py-1" id="tab-fondo-btn" data-bs-toggle="pill" data-bs-target="#panel-fondo" type="button">🎨 Fondo</button></li>
                    <li class="nav-item" role="presentation"><button class="nav-link rounded-pill px-3 py-1" id="tab-texto-btn" data-bs-toggle="pill" data-bs-target="#panel-texto" type="button">📝 Texto</button></li>
                    <li class="nav-item" role="presentation"><button class="nav-link rounded-pill px-3 py-1" id="tab-imagen-btn" data-bs-toggle="pill" data-bs-target="#panel-imagen" type="button">🦸 Personaje/Img</button></li>
                    <li class="nav-item" role="presentation"><button class="nav-link rounded-pill px-3 py-1" id="tab-formas-btn" data-bs-toggle="pill" data-bs-target="#panel-formas" type="button">🔷 Formas</button></li>
                    <li class="nav-item" role="presentation"><button class="nav-link rounded-pill px-3 py-1" id="tab-qr-btn" data-bs-toggle="pill" data-bs-target="#panel-qr" type="button">📱 QR</button></li>
                    <li class="nav-item" role="presentation"><button class="nav-link rounded-pill px-3 py-1" id="tab-borde-btn" data-bs-toggle="pill" data-bs-target="#panel-borde" type="button">🖼️ Borde</button></li>
                </ul>

                <!-- CONTENIDO DE LAS PESTAÑAS -->
                <div class="tab-content" id="toolbar-tab-content">
                    
                    <!-- PANEL 3: FONDO (General) -->
                    <div class="tab-pane fade show active" id="panel-fondo" role="tabpanel">
                        <div class="d-flex align-items-center gap-3 overflow-auto">
                            <div class="d-flex flex-column justify-content-center">
                        <label class="tool-label">🎨 Fondo</label>
                        <div class="d-flex gap-1 align-items-center">
                            <select id="tipo-fondo" class="form-select form-select-sm" style="width: 110px;">
                                <option value="solido">Sólido</option>
                                <option value="degradado">Degradado</option>
                                <option value="imagen" selected>Imagen</option>
                                <option value="transparente">Transparente</option>
                            </select>
                            <!-- Controles de color fondo -->
                            <div id="control-color-solido" style="display:none;"><input type="color" id="color-fondo" class="form-control form-control-color form-control-sm"></div>
                            <div id="control-color-degradado" style="display:none;" class="gap-1">
                                <input type="color" id="color-degradado-1" class="form-control form-control-color form-control-sm">
                                <input type="color" id="color-degradado-2" class="form-control form-control-color form-control-sm">
                                <button id="btn-random-gradient" class="btn btn-sm btn-light border">🎲</button>
                            </div>
                            <div id="control-imagen-fondo" style="display:none;" class="align-items-center gap-2">
                                <button id="btn-abrir-galeria-fondos" class="btn btn-sm btn-outline-primary d-flex align-items-center gap-1">
                                    <span>🖼️</span> Galería
                                </button>
                                <label class="btn btn-sm btn-light border" title="Subir Fondo">
                                    <input type="file" id="input-nuevo-fondo" accept="image/*, .avif" style="display: none;">➕ Subir
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="vr"></div>
                    <div class="d-flex flex-column justify-content-center">
                                <label class="tool-label">🏁 Patrón (Sobre Fondo)</label>
                        <select id="tipo-patron" class="form-select form-select-sm" style="width: 110px;">
                            <option value="ninguno">Ninguno</option>
                            <option value="puntos">Lunares</option>
                            <option value="rayas">Rayas</option>
                            <option value="cuadricula">Cuaderno</option>
                            <option value="memphis">Memphis</option>
                            <option value="zigzag">Zig-Zag</option>
                            <option value="confetti">Confeti</option>
                            <option value="holografico">Holo</option>
                        </select>
                    </div>
                        </div>
                    </div>

                    <!-- PANEL 1: TEXTO -->
                    <div class="tab-pane fade" id="panel-texto" role="tabpanel">
                        <div class="d-flex align-items-center gap-3 overflow-auto" style="white-space: nowrap;">
                        <div class="text-muted small fst-italic me-2" id="msg-no-text" style="display:none;">Selecciona un texto para editar</div>
                        <div class="d-flex flex-column justify-content-center">
                        <label class="tool-label">Fuente</label>
                        <select id="fuente-texto" class="form-select form-select-sm" style="width: 140px;">
                            <option value="'Fredoka', sans-serif">Fredoka</option>
                            <option value="'Pacifico', cursive">Pacifico</option>
                            <option value="'Bangers', cursive">Bangers</option>
                            <option value="'Quicksand', sans-serif">Quicksand</option>
                            <option value="'Lobster', cursive">Lobster</option>
                            <option value="'Abril Fatface', cursive">Abril Fatface</option>
                            <option value="'Roboto Slab', serif">Roboto Slab</option>
                            <option value="'Permanent Marker', cursive">Permanent Marker</option>
                            <option value="'Anton', sans-serif">Anton</option>
                            <option value="'Righteous', cursive">Righteous</option>
                            <option value="'Dancing Script', cursive">Dancing</option>
                            <option value="'Satisfy', cursive">Satisfy</option>
                        </select>
                    </div>
                    <div class="vr"></div>
                    <div class="d-flex flex-column justify-content-center">
                        <label class="tool-label">Tamaño</label>
                        <input type="number" id="tamano-texto-input" class="form-control form-control-sm" step="0.1" min="0.1" style="width: 70px;">
                    </div>
                    <div class="vr"></div>
                    <div class="d-flex flex-column justify-content-center">
                        <label class="tool-label">Color</label>
                        <div class="d-flex align-items-center gap-2">
                            <input type="color" id="color-texto" class="form-control form-control-color form-control-sm" title="Color de Texto">
                            <div class="form-check form-switch mb-0" title="Arcoíris">
                                <input class="form-check-input" type="checkbox" id="check-arcoiris-texto">
                                <label class="form-check-label small">🌈</label>
                            </div>
                            <div class="form-check form-switch mb-0" title="Metálico">
                                <input class="form-check-input" type="checkbox" id="check-metal-texto">
                                <label class="form-check-label small">🏆</label>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Controles dinámicos de color (Aparecen al activar switches) -->
                    <div id="control-arcoiris-texto" style="display:none !important;" class="d-flex flex-column justify-content-center">
                        <label class="tool-label">🌈 Tono</label>
                        <input type="range" id="shift-arcoiris-texto" class="form-range" min="0" max="360" value="0" style="width: 100px;">
                    </div>
                    <div id="control-metal-texto" style="display:none !important;" class="d-flex flex-column justify-content-center">
                        <label class="tool-label">🏆 Variación</label>
                        <input type="range" id="tipo-metal-texto" class="form-range" min="0" max="3" step="1" value="0" style="width: 100px;" title="Oro - Plata - Bronce - Rosa">
                    </div>

                    <div class="vr"></div>
                    <div class="d-flex flex-column justify-content-center">
                        <label class="tool-label">Efecto</label>
                        <div class="d-flex gap-2">
                            <select id="efecto-texto" class="form-select form-select-sm" style="width: 110px;">
                                <option value="moderno">Borde Blanco</option>
                                <option value="moderno_ancho">Borde Grueso</option>
                                <option value="clasico">Clásico</option>
                                <option value="neon">Neón</option>
                                <option value="retro">Retro 3D</option>
                                <option value="glitch">Glitch</option>
                                <option value="arcoiris">Arcoíris</option>
                                <option value="brillo">Resplandor</option>
                                <option value="comic">Cómic</option>
                                <option value="gold">Metálico</option>
                            </select>
                            <input type="range" id="intensidad-efecto-texto" class="form-range" min="1" max="20" style="width: 100px;" title="Intensidad">
                        </div>
                    </div>
                        </div>
                </div>

                    <!-- PANEL: FORMAS (NUEVO) -->
                    <div class="tab-pane fade" id="panel-formas" role="tabpanel">
                        <div class="d-flex align-items-center gap-3 overflow-auto">
                            <div class="d-flex align-items-center gap-2">
                                <button id="btn-abrir-galeria-formas" class="btn btn-sm btn-outline-primary d-flex align-items-center gap-1">
                                    <span>🔷</span> Galería
                                </button>
                                <label class="btn btn-sm btn-light border" title="Subir Forma">
                                    <input type="file" id="input-nuevo-forma-toolbar" accept="image/*, .avif, .svg" style="display: none;">➕ Subir
                                </label>
                            </div>
                            <div class="vr"></div>
                            <div class="d-flex flex-column justify-content-center">
                                <label class="tool-label">Agregar</label>
                                <div class="d-flex gap-1">
                                    <button class="btn btn-sm btn-outline-secondary btn-add-shape" data-shape="rectangle" title="Rectángulo">▭</button>
                                    <button class="btn btn-sm btn-outline-secondary btn-add-shape" data-shape="square" title="Cuadrado">⬜</button>
                                    <button class="btn btn-sm btn-outline-secondary btn-add-shape" data-shape="circle" title="Círculo">⚪</button>
                                    <button class="btn btn-sm btn-outline-secondary btn-add-shape" data-shape="pill" title="Píldora">💊</button>
                                </div>
                            </div>
                            <div class="vr"></div>
                            <div class="d-flex flex-column justify-content-center">
                                <label class="tool-label">Estilo</label>
                                <div class="d-flex gap-2 align-items-center">
                                    <input type="color" id="color-forma" class="form-control form-control-color form-control-sm" value="#000000">
                                    <div class="d-flex flex-column" style="width: 100px;">
                                        <label class="tool-label" style="font-size: 0.6rem;">Opacidad</label>
                                        <input type="range" id="opacidad-forma" class="form-range" min="0" max="1" step="0.1" value="1" style="margin: 0; height: 20px;">
                                    </div>
                                </div>
                            </div>
                            <div class="vr"></div>
                            <button id="btn-eliminar-forma" class="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"><span>🗑️</span> Eliminar</button>
                        </div>
                    </div>

                    <!-- PANEL 2: IMAGEN -->
                    <div class="tab-pane fade" id="panel-imagen" role="tabpanel">
                        <div class="d-flex align-items-center gap-3 overflow-auto">
                            <div class="d-flex align-items-center gap-2">
                                <button id="btn-abrir-galeria-personajes" class="btn btn-sm btn-outline-primary d-flex align-items-center gap-1">
                                    <span>🦸</span> Galería
                                </button>
                                <label class="btn btn-sm btn-light border" title="Subir Personaje">
                                    <input type="file" id="input-nuevo-personaje-toolbar" accept="image/*, .avif" style="display: none;">➕ Subir
                                </label>
                            </div>
                            <div class="vr"></div>
                            <div class="text-muted small fst-italic me-2" id="msg-no-img" style="display:none;">Selecciona una imagen para editar</div>
                            <div class="d-flex flex-column justify-content-center">
                        <label class="tool-label">Tamaño</label>
                        <input type="range" id="escala-personaje" class="form-range" min="0.2" max="3.0" step="0.1" style="width: 100px;">
                    </div>
                    <div class="vr"></div>
                    <div class="d-flex flex-column justify-content-center">
                        <label class="tool-label">Efecto</label>
                        <div class="d-flex gap-2">
                            <select id="efecto-personaje" class="form-select form-select-sm" style="width: 120px;">
                                <option value="ninguno">Ninguno</option>
                                <option value="sticker">Sticker</option>
                                <option value="sombra_pop">Sombra Pop</option>
                                <option value="glow">Resplandor</option>
                                <option value="holografico">Holográfico</option>
                                <option value="vibrante">Vibrante</option>
                                <option value="vintage">Vintage</option>
                                <option value="fantasma">Fantasma</option>
                            </select>
                            <input type="range" id="intensidad-efecto-personaje" class="form-range" min="0" max="20" style="width: 100px;" title="Intensidad">
                        </div>
                    </div>
                    <div class="vr"></div>
                    <button id="btn-eliminar-imagen" class="btn btn-sm btn-outline-danger d-flex align-items-center gap-1">
                        <span>🗑️</span> Eliminar
                    </button>
                        </div>
                </div>

                    <!-- PANEL 5: QR -->
                    <div class="tab-pane fade" id="panel-qr" role="tabpanel">
                        <div class="d-flex align-items-center gap-3 overflow-auto">
                            <div class="d-flex flex-column justify-content-center">
                                <label class="tool-label">WhatsApp / Texto</label>
                                <input type="text" id="texto-qr" placeholder="Ej: 351..." class="form-control form-control-sm" style="width: 160px;">
                            </div>
                            <div class="d-flex flex-column justify-content-center">
                                <label class="tool-label">Color</label>
                                <div class="contenedor-color"><input type="color" id="color-qr" value="#000000" class="form-control form-control-color form-control-sm"></div>
                            </div>
                            <button id="btn-agregar-qr" class="btn btn-sm btn-primary d-flex align-items-center gap-1">Generar QR</button>
                            <div class="vr"></div>
                            <button id="btn-ver-mis-qrs" class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1">📂 Mis QRs Activos</button>
                        </div>
                    </div>

                    <!-- PANEL 4: BORDE -->
                    <div class="tab-pane fade" id="panel-borde" role="tabpanel">
                        <div class="d-flex align-items-center gap-3 overflow-auto">
                            <div class="d-flex flex-column justify-content-center">
                        <label class="tool-label">🖼️ Estilo</label>
                        <div class="d-flex gap-1 align-items-center">
                            <select id="estilo-borde" class="form-select form-select-sm" style="width: 100px;">
                                <option value="simple">Sólido</option>
                                <option value="doble">Doble</option>
                                <option value="punteado">Puntos</option>
                                <option value="dashed">Línea</option>
                                <option value="sketch">Boceto</option>
                                <option value="vintage">Vintage</option>
                            </select>
                            <input type="color" id="color-borde" class="form-control form-control-color form-control-sm">
                            <input type="range" id="grosor-borde" class="form-range" min="1" max="20" style="width: 100px;" title="Grosor">
                        </div>
                    </div>

                    <div class="vr"></div>
                    <div class="d-flex flex-column justify-content-center">
                        <label class="tool-label">Efecto</label>
                        <div class="d-flex gap-2 align-items-center">
                            <div class="form-check form-switch mb-0" title="Arcoíris">
                                <input class="form-check-input" type="checkbox" id="check-arcoiris-borde">
                                <label class="form-check-label small">🌈</label>
                            </div>
                            <div class="form-check form-switch mb-0" title="Metálico">
                                <input class="form-check-input" type="checkbox" id="check-metal-borde">
                                <label class="form-check-label small">🏆</label>
                            </div>
                        </div>
                    </div>

                    <!-- Controles dinámicos de borde (Aparecen al activar switches) -->
                    <div id="control-arcoiris-borde" style="display:none !important;" class="d-flex flex-column justify-content-center">
                        <label class="tool-label">🌈 Tono</label>
                        <input type="range" id="shift-arcoiris-borde" class="form-range" min="0" max="360" value="0" style="width: 100px;">
                    </div>
                    <div id="control-metal-borde" style="display:none !important;" class="d-flex flex-column justify-content-center">
                        <label class="tool-label">🏆 Variación</label>
                        <input type="range" id="tipo-metal-borde" class="form-range" min="0" max="3" step="1" value="0" style="width: 100px;" title="Oro - Plata - Bronce - Rosa">
                    </div>

                    <div class="vr"></div>
                    <div class="d-flex flex-column justify-content-center">
                        <label class="tool-label">Redondeo</label>
                        <div class="d-flex gap-2 align-items-center">
                            <div class="form-check mb-0">
                                <input type="checkbox" id="con-borde" class="form-check-input">
                                <label for="con-borde" id="label-con-borde" class="form-check-label small" style="white-space: nowrap;">Redondear</label>
                            </div>
                            <div id="control-radio-borde" style="display: none; width: 100px;">
                                <input type="range" id="radio-borde" min="0" max="50" value="10" class="form-range" style="width: 100px;">
                            </div>
                            <div class="form-check mb-0" id="grupo-borde-2" style="display: none;">
                                <input type="checkbox" id="con-borde-2" class="form-check-input">
                                <label for="con-borde-2" class="form-check-label small" style="white-space: nowrap;">Lápiz</label>
                            </div>
                        </div>
                    </div>
                    <!-- Inputs ocultos para compatibilidad -->
                    <input type="hidden" id="efecto-borde" value="ninguno">
                    <input type="hidden" id="intensidad-efecto-borde" value="5">
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="configurador container-fluid fade-in">
        <!-- Controles para el usuario -->
        <div class="controles p-3">
            <h5 class="mb-3">⚙️ Configuración</h5>
            <label class="small fw-bold text-muted">Plantilla</label>
            <select id="plantilla" class="form-select mb-3">
                <option value="cuaderno">Cuaderno / Carpeta (6.5 x 4.5 cm)</option>
                <option value="lapiz">Lápiz (4.8 x 3 cm)</option>
                <option value="mix_cuaderno_lapiz">Combo: Cuaderno + Lápices</option>
            </select>

            <!-- GRUPO: CONTENIDO (Texto) -->
            <div id="grupo-contenido" class="mb-3">
                <label class="small fw-bold text-muted mb-2">Datos del Alumno</label>
                <div class="input-group mb-2">
                    <span class="input-group-text bg-white text-muted border-end-0"><small>👤</small></span>
                    <input type="text" id="nombre" placeholder="Nombre" class="form-control border-start-0 ps-1">
                </div>
                <div class="input-group mb-2">
                    <span class="input-group-text bg-white text-muted border-end-0"><small>👤</small></span>
                    <input type="text" id="apellido" placeholder="Apellido" class="form-control border-start-0 ps-1">
                </div>
                <div class="input-group mb-2">
                    <span class="input-group-text bg-white text-muted border-end-0"><small>🎓</small></span>
                    <input type="text" id="grado" placeholder="Grado / Curso" class="form-control border-start-0 ps-1">
                </div>
            </div>

            <button id="boton-generar" class="btn btn-primary w-100 mb-3" style="display: none;">✨ Previsualizar Rótulo</button>
            
            <!-- ACCIONES (Movido aquí para mejor UX) -->
            <div class="mt-3 pt-3 border-top">
                <label class="small fw-bold text-muted mb-2">Acciones</label>
                <div class="d-flex gap-2 mb-2">
                    <button id="boton-guardar-diseno" class="btn btn-sm btn-warning flex-grow-1 boton-descarga-oculto fw-bold shadow-sm">💾 Guardar</button>
                    <button id="boton-guardar-nuevo" class="btn btn-sm btn-outline-warning boton-descarga-oculto shadow-sm" title="Guardar como copia">➕ Copia</button>
                </div>
                <div class="d-flex gap-2 mb-2">
                    <button id="boton-descargar-pdf" class="btn btn-sm btn-success flex-grow-1 boton-descarga-oculto fw-bold shadow-sm">📄 PDF</button>
                    <button id="boton-descargar-png" class="btn btn-sm btn-purple flex-grow-1 boton-descarga-oculto fw-bold shadow-sm" style="background-color: #9b59b6; color: white;">🖼️ PNG</button>
                </div>
                <button id="boton-nuevo-diseno" class="btn btn-sm btn-outline-secondary w-100 mt-2">✨ Reiniciar / Nuevo</button>
            </div>
        </div>

        <!-- El resultado -->
        <div class="resultado">
            <div id="contenedor-canvas" class="canvas-viewport">
                <canvas id="canvas-rotulo" class="canvas-shadow"></canvas>
                <div id="spinner-carga" class="spinner-oculto"><div class="spinner"></div><p>Cargando tipografía...</p></div>
            </div>
            <!-- Controles de Zoom Flotantes (Ahora fuera del scroll) -->
            <div class="zoom-controls-floating">
                <div class="btn-group-vertical shadow-sm bg-white rounded">
                    <button id="btn-zoom-in" class="btn btn-sm btn-light border-bottom" title="Acercar">➕</button>
                    <button id="btn-zoom-fit" class="btn btn-sm btn-light border-bottom" title="Ajustar">⛶</button>
                    <button id="btn-zoom-out" class="btn btn-sm btn-light" title="Alejar">➖</button>
                </div>
                <span id="zoom-level-indicator" class="badge bg-dark text-white shadow-sm mt-2" style="opacity: 0.8; font-size: 0.7rem;">100%</span>
            </div>
            <p class="instruccion-mover">💡 Haz clic en un elemento para editarlo y arrástralo para moverlo.</p>
        </div>
        </div>

        <!-- Modal Galería de Fondos -->
        <div class="modal fade" id="modalGaleriaFondos" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">🖼️ Galería de Fondos</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <ul class="nav nav-tabs mb-3" id="fondosTabs" role="tablist">
                            <li class="nav-item" role="presentation"><button class="nav-link active" id="tab-precargados" data-bs-toggle="tab" data-bs-target="#content-precargados" type="button">🎨 Precargados</button></li>
                            <li class="nav-item" role="presentation"><button class="nav-link" id="tab-mis-fondos" data-bs-toggle="tab" data-bs-target="#content-mis-fondos" type="button">📂 Mis Fondos</button></li>
                        </ul>
                        <div class="tab-content" id="fondosTabsContent">
                            <div class="tab-pane fade show active" id="content-precargados" role="tabpanel"><div id="galeria-fondos-precargados" class="galeria-imagenes"></div></div>
                            <div class="tab-pane fade" id="content-mis-fondos" role="tabpanel">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <span class="text-muted small">Tus fondos guardados:</span>
                                    <button id="btn-subir-fondo-modal" class="btn btn-sm btn-primary">
                                        ➕ Subir Nuevo <input type="file" id="input-nuevo-fondo-modal" accept="image/*, .avif" style="display: none;">
                                    </button>
                                </div>
                                <div id="galeria-mis-fondos" class="galeria-imagenes"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Galería de Personajes -->
        <div class="modal fade" id="modalGaleriaPersonajes" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">🦸 Galería de Personajes</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <ul class="nav nav-tabs mb-3" id="personajesTabs" role="tablist">
                            <li class="nav-item" role="presentation"><button class="nav-link active" id="tab-pers-precargados" data-bs-toggle="tab" data-bs-target="#content-pers-precargados" type="button">🎨 Precargados</button></li>
                            <li class="nav-item" role="presentation"><button class="nav-link" id="tab-pers-mis" data-bs-toggle="tab" data-bs-target="#content-pers-mis" type="button">📂 Mis Subidas</button></li>
                        </ul>
                        <div class="tab-content" id="personajesTabsContent">
                            <div class="tab-pane fade show active" id="content-pers-precargados" role="tabpanel"><div id="galeria-personajes-precargados" class="galeria-imagenes"></div></div>
                            <div class="tab-pane fade" id="content-pers-mis" role="tabpanel">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <span class="text-muted small">Tus imágenes subidas:</span>
                                    <button id="btn-subir-personaje-modal" class="btn btn-sm btn-primary">
                                        ➕ Subir Nuevo <input type="file" id="input-nuevo-personaje-modal" accept="image/*, .avif" style="display: none;">
                                    </button>
                                </div>
                                <div id="galeria-mis-personajes" class="galeria-imagenes"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Mis QRs -->
        <div class="modal fade" id="modalMisQRs" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">📱 Mis Códigos QR</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div id="lista-mis-qrs" class="d-flex flex-column gap-2"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Galería de Formas -->
        <div class="modal fade" id="modalGaleriaFormas" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">🔷 Galería de Formas</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <ul class="nav nav-tabs mb-3" id="formasTabs" role="tablist">
                            <li class="nav-item" role="presentation"><button class="nav-link active" id="tab-formas-precargados" data-bs-toggle="tab" data-bs-target="#content-formas-precargados" type="button">🎨 Precargadas</button></li>
                            <li class="nav-item" role="presentation"><button class="nav-link" id="tab-formas-mis" data-bs-toggle="tab" data-bs-target="#content-formas-mis" type="button">📂 Mis Subidas</button></li>
                        </ul>
                        <div class="tab-content" id="formasTabsContent">
                            <div class="tab-pane fade show active" id="content-formas-precargados" role="tabpanel"><div id="galeria-formas-precargados" class="galeria-imagenes"></div></div>
                            <div class="tab-pane fade" id="content-formas-mis" role="tabpanel">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <span class="text-muted small">Tus formas guardadas:</span>
                                    <button id="btn-subir-forma-modal" class="btn btn-sm btn-primary">
                                        ➕ Subir Nueva <input type="file" id="input-nuevo-forma-modal" accept="image/*, .avif, .svg" style="display: none;">
                                    </button>
                                </div>
                                <div id="galeria-mis-formas" class="galeria-imagenes"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    async mount() {
        // Inicializar componentes del Editor
        const renderer = new CanvasRenderer('canvas-rotulo', 'spinner-carga');
        const pdfGenerator = new PDFGenerator();
        const controller = new EditorController(renderer, pdfGenerator);
        const storageManager = new StorageManager(controller);
        controller.setStorageManager(storageManager); // Conexión bidireccional para resetear ID

        // Inicializar listeners
        storageManager.initEditorEvents();
        
        // Inicializar pestañas de Bootstrap para asegurar estado correcto
        const tabEls = document.querySelectorAll('button[data-bs-toggle="pill"]');
        tabEls.forEach(tabEl => new bootstrap.Tab(tabEl));

        // Cargar QRs recientes si hay usuario
        if (store.state.user) {
            storageManager.cargarMisQRs(store.state.user.uid);
        }

        // Verificar si hay un diseño pendiente de carga (desde Dashboard)
        const pendingId = localStorage.getItem('pendingDesignId');
        const isDuplicate = localStorage.getItem('isDuplicate') === 'true';
        
        if (pendingId) {
            // No borramos el ID aquí para evitar problemas si la vista se monta dos veces
            await storageManager.loadDesignById(pendingId, isDuplicate);
        }
    }
}