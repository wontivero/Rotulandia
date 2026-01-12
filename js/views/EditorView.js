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
        <div class="container mb-3 fade-in">
            <div class="d-flex align-items-center gap-3">
                <h2>Panel de Diseño</h2>
                <button class="btn btn-sm btn-info text-white rounded-pill" data-bs-toggle="modal" data-bs-target="#modalTutorial">❓ ¿Cómo funciona?</button>
            </div>
            <p class="text-muted">Crea y edita tus rótulos a continuación.</p>
        </div>
        <div class="configurador container-fluid fade-in">
        <!-- Controles para el usuario -->
        <div class="controles p-4">
            <h2>1. Elige tus opciones:</h2>
            <label for="plantilla">Tipo de Rótulo:</label>
            <select id="plantilla" class="form-select mb-3">
                <option value="cuaderno">Cuaderno / Carpeta (6.5 x 4.5 cm)</option>
                <option value="lapiz">Lápiz (4.8 x 3 cm)</option>
                <option value="mix_cuaderno_lapiz">Combo: Cuaderno + Lápices</option>
            </select>

            <div class="opcion-grupo">
                <div class="row mb-3">
                    <div class="col">
                        <label>Estilo de Fondo:</label>
                        <select id="tipo-fondo" class="form-select">
                            <option value="solido">Color Sólido</option>
                            <option value="degradado">Degradado</option>
                            <option value="imagen" selected>Subir Imagen (Web/PC)</option>
                            <option value="transparente">Transparente</option>
                        </select>
                    </div>
                    <div class="col">
                        <label for="tipo-patron">Estampado de Fondo:</label>
                        <select id="tipo-patron" class="form-select">
                            <option value="ninguno">Liso (Sin estampado)</option>
                            <option value="puntos">Lunares (Polka Dots)</option>
                            <option value="rayas">Rayas Diagonales</option>
                            <option value="cuadricula">Cuaderno (Grid)</option>
                            <option value="memphis">Memphis (Abstracto Moderno)</option>
                            <option value="zigzag">Zig-Zag (Divertido)</option>
                            <option value="confetti">Confeti (Fiesta)</option>
                            <option value="holografico">Holográfico (Aesthetic)</option>
                        </select>
                    </div>
                </div>

                <div id="control-color-solido">
                    <label>Color de Fondo:</label>
                    <div class="contenedor-color">
                        <input type="color" id="color-fondo" value="#E0F7FA" class="form-control form-control-color">
                    </div>
                </div>
                <div id="control-color-degradado" style="display: none;">
                    <div class="contenedor-color">
                        <input type="color" id="color-degradado-1" value="#84FAB0" class="form-control form-control-color">
                    </div>
                    <div class="contenedor-color">
                        <input type="color" id="color-degradado-2" value="#8FD3F4" class="form-control form-control-color">
                    </div>
                    <button id="btn-random-gradient" title="Generar colores aleatorios" type="button" class="btn btn-info text-white">🎲 Magia</button>
                </div>
                <div id="control-imagen-fondo">
                    <div id="galeria-fondos" class="galeria-imagenes">
                        <label class="boton-subir-imagen" title="Subir nuevo fondo"><input type="file" id="input-nuevo-fondo" accept="image/*, .avif" multiple style="display: none;">➕ Subir</label>
                    </div>
                </div>
            </div>

            <!-- GRUPO: NOMBRE -->
            <div id="grupo-nombre" class="opcion-grupo componente-grupo">
                <h3>🅰️ Nombre y Apellido</h3>
                <div class="row mb-3">
                    <div class="col"><input type="text" id="nombre" placeholder="Nombre (Ej: Ana)" class="form-control"></div>
                    <div class="col"><input type="text" id="apellido" placeholder="Apellido (Ej: Pérez)" class="form-control"></div>
                </div>
                
                <div class="row mb-3">
                    <div class="col">
                        <label>Fuente:</label>
                        <select id="fuente-nombre" class="form-select">
                            <option value="'Fredoka', sans-serif">Fredoka</option>
                            <option value="'Pacifico', cursive">Pacifico</option>
                            <option value="'Bangers', cursive">Bangers</option>
                            <option value="'Quicksand', sans-serif">Quicksand</option>
                            <option value="'Lobster', cursive">Lobster</option>
                            <option value="'Abril Fatface', cursive">Abril Fatface</option>
                            <option value="'Roboto Slab', serif">Roboto Slab</option>
                            <option value="'Permanent Marker', cursive">Permanent Marker</option>
                            <option value="'Anton', sans-serif">Anton (Impacto)</option>
                            <option value="'Righteous', cursive">Righteous (Gamer)</option>
                            <option value="'Dancing Script', cursive">Dancing Script</option>
                            <option value="'Satisfy', cursive">Satisfy (Brush)</option>
                        </select>
                    </div>
                    <div class="col">
                        <label>Tamaño: <span id="valor-tamano-nombre">1.0</span></label>
                        <input type="range" id="tamano-nombre" min="0.5" max="2.0" step="0.1" value="1.0" class="form-range">
                    </div>
                </div>
                
                <div class="row mb-3">
                    <div class="col">
                        <label>Color / Relleno:</label>
                        <div class="d-flex align-items-center gap-2">
                            <input type="color" id="color-nombre" value="#004D40" class="form-control form-control-color flex-grow-1" title="Color Sólido">
                            <div class="form-check form-switch mb-0" title="Modo Arcoíris">
                                <input class="form-check-input" type="checkbox" id="check-arcoiris-nombre">
                                <label class="form-check-label small" for="check-arcoiris-nombre">🌈</label>
                            </div>
                            <div class="form-check form-switch mb-0" title="Modo Metálico">
                                <input class="form-check-input" type="checkbox" id="check-metal-nombre">
                                <label class="form-check-label small" for="check-metal-nombre">🏆</label>
                            </div>
                        </div>
                        <div id="control-arcoiris-nombre" style="display: none; margin-top: 5px;">
                            <input type="range" id="shift-arcoiris-nombre" min="0" max="360" value="0" class="form-range" style="height: 5px;" title="Cambiar tonos del arcoíris">
                        </div>
                        <div id="control-metal-nombre" style="display: none; margin-top: 5px;">
                            <input type="range" id="tipo-metal-nombre" min="0" max="3" step="1" value="0" class="form-range" style="height: 5px;" title="Tipo: Oro, Plata, Bronce, Rosa">
                            <div class="d-flex justify-content-between px-1" style="font-size: 0.6em; color: #666;">
                                <span>Oro</span><span>Plata</span><span>Bronce</span><span>Rosa</span>
                            </div>
                        </div>
                    </div>
                    <div class="col">
                        <label>Efecto:</label>
                        <select id="efecto-texto-nombre" class="form-select">
                            <option value="moderno">Moderno (Borde Blanco)</option>
                            <option value="moderno_ancho">Moderno (Borde Extra Ancho)</option>
                            <option value="clasico">Clásico (Plano)</option>
                            <option value="neon">Neón Brillante</option>
                            <option value="retro">Retro 3D</option>
                            <option value="glitch">Glitch (Distorsión)</option>
                            <option value="arcoiris">Arcoíris (Multicolor)</option>
                            <option value="brillo">✨ Resplandor Mágico</option>
                            <option value="comic">💥 Cómic (Borde Negro)</option>
                            <option value="gold">🏆 Metálico (Oro/Plata/Bronce)</option>
                        </select>
                        <div class="mt-2">
                            <label class="small text-muted">Intensidad:</label>
                            <input type="range" id="intensidad-efecto-nombre" min="1" max="20" value="5" class="form-range" title="Ajusta la intensidad del efecto">
                        </div>
                    </div>
                </div>
            </div>

            <!-- GRUPO: GRADO -->
            <div id="grupo-grado" class="opcion-grupo componente-grupo">
                <h3>🅱️ Grado</h3>
                <input type="text" id="grado" placeholder="Ej: 4to 'A'" class="form-control mb-3">
                
                <div class="row mb-3">
                    <div class="col">
                        <label>Fuente:</label>
                        <select id="fuente-grado" class="form-select">
                            <option value="'Fredoka', sans-serif">Fredoka</option>
                            <option value="'Pacifico', cursive">Pacifico</option>
                            <option value="'Bangers', cursive">Bangers</option>
                            <option value="'Quicksand', sans-serif" selected>Quicksand</option>
                            <option value="'Lobster', cursive">Lobster</option>
                            <option value="'Abril Fatface', cursive">Abril Fatface</option>
                            <option value="'Roboto Slab', serif">Roboto Slab</option>
                            <option value="'Permanent Marker', cursive">Permanent Marker</option>
                            <option value="'Anton', sans-serif">Anton (Impacto)</option>
                            <option value="'Righteous', cursive">Righteous (Gamer)</option>
                            <option value="'Dancing Script', cursive">Dancing Script</option>
                            <option value="'Satisfy', cursive">Satisfy (Brush)</option>
                        </select>
                    </div>
                    <div class="col">
                        <label>Tamaño: <span id="valor-tamano-grado">1.0</span></label>
                        <input type="range" id="tamano-grado" min="0.5" max="2.0" step="0.1" value="1.0" class="form-range">
                    </div>
                </div>
                
                <div class="row mb-3">
                    <div class="col">
                        <label>Color / Relleno:</label>
                        <div class="d-flex align-items-center gap-2">
                            <input type="color" id="color-grado" value="#004D40" class="form-control form-control-color flex-grow-1" title="Color Sólido">
                            <div class="form-check form-switch mb-0" title="Modo Arcoíris">
                                <input class="form-check-input" type="checkbox" id="check-arcoiris-grado">
                                <label class="form-check-label small" for="check-arcoiris-grado">🌈</label>
                            </div>
                            <div class="form-check form-switch mb-0" title="Modo Metálico">
                                <input class="form-check-input" type="checkbox" id="check-metal-grado">
                                <label class="form-check-label small" for="check-metal-grado">🏆</label>
                            </div>
                        </div>
                        <div id="control-arcoiris-grado" style="display: none; margin-top: 5px;">
                            <input type="range" id="shift-arcoiris-grado" min="0" max="360" value="0" class="form-range" style="height: 5px;" title="Cambiar tonos del arcoíris">
                        </div>
                        <div id="control-metal-grado" style="display: none; margin-top: 5px;">
                            <input type="range" id="tipo-metal-grado" min="0" max="3" step="1" value="0" class="form-range" style="height: 5px;" title="Tipo: Oro, Plata, Bronce, Rosa">
                            <div class="d-flex justify-content-between px-1" style="font-size: 0.6em; color: #666;">
                                <span>Oro</span><span>Plata</span><span>Bronce</span><span>Rosa</span>
                            </div>
                        </div>
                    </div>
                    <div class="col">
                        <label>Efecto:</label>
                        <select id="efecto-texto-grado" class="form-select">
                            <option value="moderno">Moderno (Borde Blanco)</option>
                            <option value="moderno_ancho">Moderno (Borde Extra Ancho)</option>
                            <option value="clasico">Clásico (Plano)</option>
                            <option value="neon">Neón Brillante</option>
                            <option value="retro">Retro 3D</option>
                            <option value="glitch">Glitch (Distorsión)</option>
                            <option value="arcoiris">Arcoíris (Multicolor)</option>
                            <option value="brillo">✨ Resplandor Mágico</option>
                            <option value="comic">💥 Cómic (Borde Negro)</option>
                            <option value="gold">🏆 Metálico (Oro/Plata/Bronce)</option>
                        </select>
                        <div class="mt-2">
                            <label class="small text-muted">Intensidad:</label>
                            <input type="range" id="intensidad-efecto-grado" min="1" max="20" value="5" class="form-range" title="Ajusta la intensidad del efecto">
                        </div>
                    </div>
                </div>
            </div>

            <div class="opcion-grupo">
                <h3>🖼️ Borde</h3>
                <div class="row mb-3">
                    <div class="col">
                        <label>Estilo (Forma):</label>
                        <select id="estilo-borde" class="form-select">
                            <option value="simple">Línea Sólida</option>
                            <option value="doble">Doble Línea (Elegante)</option>
                            <option value="punteado">Puntos (Dots)</option>
                            <option value="dashed">Línea Discontinua</option>
                            <option value="sketch">Boceto (Sketch)</option>
                            <option value="vintage">Vintage (Marco)</option>
                        </select>
                    </div>
                    <div class="col">
                        <label>Grosor:</label>
                        <input type="range" id="grosor-borde" min="1" max="20" value="5" class="form-range">
                    </div>
                </div>

                <div class="row mb-3">
                    <div class="col">
                        <label>Color / Relleno:</label>
                        <div class="d-flex align-items-center gap-2">
                            <input type="color" id="color-borde" value="#004D40" class="form-control form-control-color flex-grow-1" title="Color Sólido">
                            <div class="form-check form-switch mb-0" title="Modo Arcoíris">
                                <input class="form-check-input" type="checkbox" id="check-arcoiris-borde">
                                <label class="form-check-label small" for="check-arcoiris-borde">🌈</label>
                            </div>
                            <div class="form-check form-switch mb-0" title="Modo Metálico">
                                <input class="form-check-input" type="checkbox" id="check-metal-borde">
                                <label class="form-check-label small" for="check-metal-borde">🏆</label>
                            </div>
                        </div>
                        <div id="control-arcoiris-borde" style="display: none; margin-top: 5px;">
                            <input type="range" id="shift-arcoiris-borde" min="0" max="360" value="0" class="form-range" style="height: 5px;" title="Cambiar tonos del arcoíris">
                        </div>
                        <div id="control-metal-borde" style="display: none; margin-top: 5px;">
                            <input type="range" id="tipo-metal-borde" min="0" max="3" step="1" value="0" class="form-range" style="height: 5px;" title="Tipo: Oro, Plata, Bronce, Rosa">
                            <div class="d-flex justify-content-between px-1" style="font-size: 0.6em; color: #666;">
                                <span>Oro</span><span>Plata</span><span>Bronce</span><span>Rosa</span>
                            </div>
                        </div>
                    </div>
                    <div class="col">
                        <label>Efecto Especial:</label>
                        <select id="efecto-borde" class="form-select">
                            <option value="ninguno">Ninguno</option>
                            <option value="sombra_hard">Sombra Pop (Hard)</option>
                            <option value="sombra_soft">Sombra Suave</option>
                            <option value="neon">Neón / Luz</option>
                            <option value="glow">Resplandor Mágico</option>
                        </select>
                        <div class="mt-2">
                            <label class="small text-muted">Intensidad:</label>
                            <input type="range" id="intensidad-efecto-borde" min="1" max="20" value="5" class="form-range" title="Ajusta la intensidad del efecto">
                        </div>
                    </div>
                </div>
                
                <div class="border-top pt-2 mt-2">
                    <div class="form-check mb-2">
                        <input type="checkbox" id="con-borde" class="form-check-input">
                        <label for="con-borde" id="label-con-borde" class="form-check-label">Añadir borde redondeado</label>
                    </div>
                    <div id="control-radio-borde" style="display: none; margin-left: 25px; margin-bottom: 10px;">
                        <label class="small text-muted">Redondez:</label>
                        <input type="range" id="radio-borde" min="0" max="50" value="10" class="form-range" style="height: 10px;">
                    </div>
                    <div class="form-check mb-3" id="grupo-borde-2" style="display: none;">
                        <input type="checkbox" id="con-borde-2" class="form-check-input">
                        <label for="con-borde-2" class="form-check-label">Redondear Lápiz</label>
                    </div>
                </div>
            </div>

            <h3>🎨 Gráficos: Personajes y QR</h3>
            
            <div class="opcion-grupo componente-grupo" style="margin-bottom: 15px;">
                <label>Generar QR de Contacto:</label>
                <div class="d-flex gap-3">
                    <div style="flex: 1; min-width: 0;">
                        <input type="text" id="texto-qr" placeholder="WhatsApp (Ej: 351...)" class="form-control mb-2 form-control-sm">
                        <div class="d-flex gap-2 align-items-center mb-2">
                            <div class="contenedor-color flex-grow-1"><input type="color" id="color-qr" value="#000000" class="form-control form-control-color form-control-sm"></div>
                            <button id="btn-agregar-qr" type="button" class="btn btn-secondary btn-sm">Generar</button>
                        </div>
                    </div>
                    <div id="quick-qrs-wrapper" style="flex: 1; border-left: 1px solid #ddd; padding-left: 10px; display: none; min-width: 0;">
                        <label style="font-size: 0.75em; color: #777; display: block; margin-bottom: 5px; font-weight: bold;">Reutilizar Recientes:</label>
                        <div id="quick-qrs-list" style="max-height: 100px; overflow-y: auto; display: flex; flex-direction: column; gap: 5px;"></div>
                    </div>
                </div>
            </div>

            <div id="seleccion-personaje" class="galeria-imagenes">
                <label class="boton-subir-imagen" title="Subir nuevo personaje"><input type="file" id="input-nuevo-personaje" accept="image/*, .avif" style="display: none;">➕</label>
            </div>

            <div id="panel-imagen-seleccionada" class="opcion-grupo componente-grupo" style="display: none; border-color: #3498db;">
                <h3 style="color: #3498db;">⚙️ Editar Personaje</h3>
                <label>Efecto:</label>
                <select id="efecto-personaje" class="form-select mb-3">
                    <option value="ninguno">Natural</option>
                    <option value="sticker">✨ Sticker (Borde Blanco)</option>
                    <option value="sombra_pop">🌑 Sombra Pop (Hard)</option>
                    <option value="glow">🌟 Resplandor (Glow)</option>
                    <option value="holografico">🌈 Holográfico (Color)</option>
                    <option value="vibrante">🎨 Vibrante (Saturación)</option>
                    <option value="vintage">🎞️ Vintage (Sepia)</option>
                    <option value="fantasma">👻 Fantasma (Opacidad)</option>
                </select>
                
                <label class="small text-muted">Intensidad del Efecto:</label>
                <input type="range" id="intensidad-efecto-personaje" min="0" max="20" value="5" class="form-range mb-3">

                <label>Tamaño:</label><input type="range" id="escala-personaje" min="0.2" max="3.0" step="0.1" value="1.0" class="form-range mb-3">
                <button id="btn-eliminar-imagen" class="btn btn-danger w-100">🗑️ Eliminar</button>
            </div>

            <button id="boton-generar" class="btn btn-primary w-100 mb-3" style="display: none;">✨ Previsualizar Rótulo</button>
        </div>

        <!-- El resultado -->
        <div class="resultado">
            <h2>2. Previsualización:</h2>
            <div id="contenedor-canvas" style="position: relative;">
                <canvas id="canvas-rotulo"></canvas>
                <div id="spinner-carga" class="spinner-oculto"><div class="spinner"></div><p>Cargando tipografía...</p></div>
            </div>
            <p class="instruccion-mover">💡 Haz clic en un elemento para editarlo y arrástralo para moverlo.</p>
            <div class="acciones-descarga">
                <button id="boton-descargar-pdf" class="btn btn-success boton-descarga-oculto">📄 Descargar PDF</button>
                <button id="boton-descargar-png" class="btn btn-purple boton-descarga-oculto" style="background-color: #9b59b6; color: white;">🖼️ Descargar PNG</button>
            </div>
            <div class="mt-3">
                <button id="boton-nuevo-diseno" class="btn btn-outline-secondary w-100">✨ Crear Nuevo Diseño</button>
            </div>
            <div class="acciones-descarga mt-2">
                <button id="boton-guardar-diseno" class="btn btn-warning boton-descarga-oculto">💾 Guardar</button>
                <button id="boton-guardar-nuevo" class="btn btn-outline-warning boton-descarga-oculto">➕ Guardar como Nuevo</button>
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