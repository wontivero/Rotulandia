document.addEventListener('DOMContentLoaded', () => { // Asegúrate de que el nombre de este archivo sea script.js
    // --- FUNCIÓN PARA CONVERTIR MM A PÍXELES ---
    // Definida al inicio para usarla en las plantillas si fuera necesario
    const DPI = 300;
    const mmToPx = (mm) => (mm / 25.4) * DPI;

    // --- DEFINICIÓN DE PLANTILLAS ---
    // Medidas en mm para el PDF. DPI (puntos por pulgada) para el canvas.
    const PLANTILLAS = {
        'cuaderno': {
            nombre: 'Cuaderno / Carpeta',
            width_mm: 65,  // 6.5 cm de ancho
            height_mm: 45, // 4.5 cm de alto
            margin_mm: 5,  // Margen reducido para que entren 3 por fila (65*3 = 195mm < 200mm util)
            // Posiciones y tamaños relativos al canvas
            layout: (w, h) => ({ // w = width, h = height
                personaje: { x: w * 0.02, y: h * 0.1, w: h * 0.8, h: h * 0.8 },
                nombre: { x: w * 0.42, y: h * 0.35, fontSizeBase: h * 0.22 },
                apellido: { x: w * 0.42, y: h * 0.55, fontSizeBase: h * 0.22 },
                grado: { x: w * 0.42, y: h * 0.75, fontSizeBase: h * 0.18 }
            })
        },
        'lapiz': {
            nombre: 'Lápiz',
            width_mm: 48, // 4.8 cm para que entren 4 columnas
            height_mm: 30, // 3 cm de alto (para rodear)
            margin_mm: 5,  // Margen de 5mm para aprovechar la hoja
            layout: (w, h) => ({
                personaje: { x: w * 0.05, y: h * 0.1, w: h * 0.8, h: h * 0.8 },
                nombre: { x: w * 0.4, y: h * 0.35, fontSizeBase: h * 0.2 },
                apellido: { x: w * 0.4, y: h * 0.55, fontSizeBase: h * 0.2 },
                grado: { x: w * 0.4, y: h * 0.75, fontSizeBase: h * 0.15 }
            })
        },
        'mix_cuaderno_lapiz': {
            nombre: 'Combo: Cuaderno + Lápices',
            width_mm: 80, // Ancho del canvas para mostrar ambos
            height_mm: 90, // Alto del canvas
            is_combo: true,
            pdf_rows: 3, // 3 filas de etiquetas principales
            pdf_cols: 3, // 3 por fila
            // Definimos las áreas relativas en mm para recorte y PDF
            areas: [
                { type: 'cuaderno', x_mm: 5, y_mm: 5, w_mm: 65, h_mm: 45 },
                { type: 'lapiz', x_mm: 15, y_mm: 55, w_mm: 48, h_mm: 30 }
            ],
            layout: (w, h) => {
                // w y h son el tamaño del canvas en px.
                // Calculamos posiciones absolutas para los textos en ambas etiquetas
                return {
                    personaje: { x: w * 0.05, y: h * 0.05, w: h * 0.2, h: h * 0.2 }, // Posición por defecto imagen
                    // Arrays de posiciones para los textos (uno para cada etiqueta)
                    nombre: [
                        { x: mmToPx(5 + 65 * 0.42), y: mmToPx(5 + 45 * 0.35), fontSizeBase: mmToPx(45 * 0.22) }, // Cuaderno
                        { x: mmToPx(15 + 48 * 0.4), y: mmToPx(55 + 30 * 0.35), fontSizeBase: mmToPx(30 * 0.2) }   // Lápiz
                    ],
                    apellido: [
                        { x: mmToPx(5 + 65 * 0.42), y: mmToPx(5 + 45 * 0.55), fontSizeBase: mmToPx(45 * 0.22) },
                        { x: mmToPx(15 + 48 * 0.4), y: mmToPx(55 + 30 * 0.55), fontSizeBase: mmToPx(30 * 0.2) }
                    ],
                    grado: [
                        { x: mmToPx(5 + 65 * 0.42), y: mmToPx(5 + 45 * 0.75), fontSizeBase: mmToPx(45 * 0.18) },
                        { x: mmToPx(15 + 48 * 0.4), y: mmToPx(55 + 30 * 0.75), fontSizeBase: mmToPx(30 * 0.15) }
                    ]
                };
            }
        }
    };

    // --- CONFIGURACIÓN DE PERSONAJES ---
    // Para agregar un nuevo personaje:
    // 1. Guarda la imagen en la carpeta "personajes".
    // 2. Agrega el nombre del archivo a esta lista.
    // ¡El resto es automático!
    const personajes = ['laBubu.png', 'stitch.png', 'spiderman.png'];

    // --- Carga dinámica de la galería ---
    const galeria = document.getElementById('seleccion-personaje');
    const galeriaFondos = document.getElementById('galeria-fondos');
    
    // --- ESTADO DE LA APLICACIÓN ---
    // Lista de imágenes activas en el canvas
    let imagenesEnCanvas = []; // Array de objetos { img, x, y, scale, effect, width, height }
    let indiceImagenSeleccionada = -1; // -1 significa ninguna seleccionada

    // Offsets para textos (Nombre y Grado son únicos)
    let offsets = {};
    let selectedTextKey = null; // Para saber qué texto estamos editando (ej: 'nombre_0')
    
    let draggingElement = null; // 'nombre', 'grado', o index de imagen (0, 1, 2...)
    let isDragging = false;
    let startX, startY;
    let imagenFondoPropia = null; // Variable para guardar la imagen subida
    
    // Variables para redimensionar (Resize)
    let isResizing = false;
    let initialResizeDist = 0;
    let initialScale = 1.0;

    // --- FUNCIÓN PARA AGREGAR IMAGEN A GALERÍA ---
    function agregarImagenAGaleria(src, contenedor, esPersonaje = true) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = esPersonaje ? 'Personaje' : 'Fondo';
        
        img.addEventListener('click', () => {
            if (esPersonaje) {
                // AGREGAR NUEVA IMAGEN AL CANVAS
                // Obtenemos la posición base de la plantilla actual
                const plantilla = PLANTILLAS[selectPlantilla.value];
                const layout = (typeof plantilla.layout === 'function') ? plantilla.layout(canvas.width, canvas.height) : plantilla.layout;
                
                // Agregamos un nuevo objeto a la lista
                imagenesEnCanvas.push({
                    img: img,
                    x: layout.personaje.x + (Math.random() * 20), // Un poco de aleatoriedad para que no se encimen
                    y: layout.personaje.y + (Math.random() * 20),
                    wBase: layout.personaje.w, // Guardamos tamaño base
                    hBase: layout.personaje.h,
                    scale: 1.0,
                    effect: 'ninguno'
                });
                
                // Seleccionamos la nueva imagen automáticamente
                indiceImagenSeleccionada = imagenesEnCanvas.length - 1;
                actualizarPanelImagen();
            } else {
                // Lógica de fondo (solo uno)
                document.querySelectorAll('#galeria-fondos img').forEach(el => el.classList.remove('seleccionado'));
                img.classList.add('seleccionado');
                imagenFondoPropia = img; // Guardamos la referencia a la imagen de fondo
            }
            generarPrevisualizacion(); // Actualizar al instante
        });
        
        // Insertar antes del botón de subir (que es el último hijo o tiene clase especial)
        // Buscamos el botón de subir dentro del contenedor
        const botonSubir = contenedor.querySelector('.boton-subir-imagen');
        contenedor.insertBefore(img, botonSubir);
    }

    // Cargar personajes iniciales
    personajes.forEach((nombreArchivo) => {
        agregarImagenAGaleria(`personajes/${nombreArchivo}`, galeria, true);
    });
    
    // Cargar algunos fondos de ejemplo (colores/texturas simuladas o imágenes si existieran)
    // Como no tenemos archivos de fondo, dejamos la galería vacía lista para subir.

    // --- REFERENCIAS A ELEMENTOS DEL DOM ---
    const canvas = document.getElementById('canvas-rotulo');
    const ctx = canvas.getContext('2d');
    const inputNombre = document.getElementById('nombre');
    const inputApellido = document.getElementById('apellido');
    const inputGrado = document.getElementById('grado');
    const inputColorFondo = document.getElementById('color-fondo');
    const inputColorDegradado1 = document.getElementById('color-degradado-1');
    const inputColorDegradado2 = document.getElementById('color-degradado-2');
    
    // Nuevos controles específicos
    const inputFuenteNombre = document.getElementById('fuente-nombre');
    const inputColorNombre = document.getElementById('color-nombre');
    const selectEfectoTextoNombre = document.getElementById('efecto-texto-nombre');
    const inputTamanoNombre = document.getElementById('tamano-nombre');
    const spanTamanoNombre = document.getElementById('valor-tamano-nombre');
    const inputFuenteGrado = document.getElementById('fuente-grado');
    const inputColorGrado = document.getElementById('color-grado');
    const selectEfectoTextoGrado = document.getElementById('efecto-texto-grado');
    const inputTamanoGrado = document.getElementById('tamano-grado');
    const spanTamanoGrado = document.getElementById('valor-tamano-grado');

    const selectPlantilla = document.getElementById('plantilla');
    const selectTipoPatron = document.getElementById('tipo-patron');
    const selectTipoFondo = document.getElementById('tipo-fondo');
    const selectEstiloBorde = document.getElementById('estilo-borde');
    const inputColorBorde = document.getElementById('color-borde');
    const inputGrosorBorde = document.getElementById('grosor-borde');
    const inputNuevoFondo = document.getElementById('input-nuevo-fondo');
    const inputNuevoPersonaje = document.getElementById('input-nuevo-personaje');
    const selectEfectoPersonaje = document.getElementById('efecto-personaje');
    const checkboxBorde = document.getElementById('con-borde');
    const checkboxBorde2 = document.getElementById('con-borde-2');
    const grupoBorde2 = document.getElementById('grupo-borde-2');
    const labelConBorde = document.getElementById('label-con-borde');
    const controlSolido = document.getElementById('control-color-solido');
    const controlDegradado = document.getElementById('control-color-degradado');
    const botonGenerar = document.getElementById('boton-generar');
    const botonDescargarPDF = document.getElementById('boton-descargar-pdf');
    const botonDescargarPNG = document.getElementById('boton-descargar-png');
    const btnRandomGradient = document.getElementById('btn-random-gradient');
    const controlImagenFondo = document.getElementById('control-imagen-fondo');
    const inputEscalaPersonaje = document.getElementById('escala-personaje');
    const panelImagenSeleccionada = document.getElementById('panel-imagen-seleccionada');
    const btnEliminarImagen = document.getElementById('btn-eliminar-imagen');
    const inputTextoQR = document.getElementById('texto-qr');
    const inputColorQR = document.getElementById('color-qr');
    const btnAgregarQR = document.getElementById('btn-agregar-qr');
    const spinnerCarga = document.getElementById('spinner-carga');

    // --- FUNCIÓN PARA RESALTAR CONTROLES ---
    function resaltarControles(tipo) {
        // Remover clase de todos los grupos
        document.getElementById('grupo-nombre').classList.remove('grupo-destacado');
        document.getElementById('grupo-grado').classList.remove('grupo-destacado');
        document.getElementById('panel-imagen-seleccionada').classList.remove('grupo-destacado');

        let elementoDestino = null;

        // Agregar al seleccionado
        if (tipo === 'nombre') {
            elementoDestino = document.getElementById('grupo-nombre');
        } else if (tipo === 'grado') {
            elementoDestino = document.getElementById('grupo-grado');
        } else if (tipo === 'imagen') {
            elementoDestino = document.getElementById('panel-imagen-seleccionada');
        }

        if (elementoDestino) {
            elementoDestino.classList.add('grupo-destacado');
            // Scroll suave para enfocar los controles
            elementoDestino.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // --- FUNCIÓN INTELIGENTE: AJUSTAR TEXTO ---
    // Reduce el tamaño de la fuente hasta que el texto quepa en el ancho disponible
    function ajustarTexto(ctx, texto, maxWidth, fontSizeInicial, fontFamily) {
        let fontSize = fontSizeInicial;
        // Configuramos la fuente
        ctx.font = `${fontSize}px ${fontFamily}`;
        
        // Mientras el texto sea más ancho que el espacio disponible y la fuente sea legible (>5px)
        while (ctx.measureText(texto).width > maxWidth && fontSize > 5) {
            fontSize -= 1;
            ctx.font = `${fontSize}px ${fontFamily}`;
        }
        return fontSize;
    }

    // --- ACTUALIZAR PANEL DE IMAGEN ---
    function actualizarPanelImagen() {
        if (indiceImagenSeleccionada >= 0 && imagenesEnCanvas[indiceImagenSeleccionada]) {
            panelImagenSeleccionada.style.display = 'block';
            const imgData = imagenesEnCanvas[indiceImagenSeleccionada];
            // Sincronizar controles con los datos de la imagen
            inputEscalaPersonaje.value = imgData.scale;
            selectEfectoPersonaje.value = imgData.effect;
        } else {
            panelImagenSeleccionada.style.display = 'none';
        }
    }

    // --- DETECTAR CLICK EN ELEMENTOS ---
    function getElementAtPosition(x, y) {
        // 1. Revisar Textos (Bounding Boxes calculados en el último draw)
        // Necesitamos recalcular o guardar las cajas. Simplificaremos recalculando aprox.
        // Para simplificar, usaremos las variables globales de boundingBoxes que llenamos en generarPrevisualizacion
        
        // Revisamos en orden inverso de dibujo (lo que está arriba primero)
        // Ahora boundingBoxes puede tener claves como 'nombre_0', 'nombre_1', etc.
        for (const key in boundingBoxes) {
            const box = boundingBoxes[key];
            if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
                // Devolvemos la clave completa (ej: 'nombre_0') para que el movimiento sea individual
                return key; 
            }
        }

        // 2. Revisar Imágenes (en orden inverso, la última dibujada está arriba)
        for (let i = imagenesEnCanvas.length - 1; i >= 0; i--) {
            const img = imagenesEnCanvas[i];
            // img tiene x, y, wFinal, hFinal (que guardaremos en el draw)
            if (x >= img.x && x <= img.x + img.wFinal && y >= img.y && y <= img.y + img.hFinal) {
                return i; // Retornamos el índice numérico
            }
        }
        return null; // Nada seleccionado
    }

    // --- LÓGICA DE ARRASTRE (DRAG & DROP) ---
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        // Coordenadas del mouse relativas al canvas (escaladas por CSS vs tamaño real)
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        // 1. Verificar si clicamos en un manejador de redimensionamiento (Esquinas)
        if (window.selectionBox) {
            const sb = window.selectionBox;
            const handleSize = 15; // Área de click un poco más grande para facilitar
            const corners = [
                {x: sb.x, y: sb.y},
                {x: sb.x + sb.w, y: sb.y},
                {x: sb.x, y: sb.y + sb.h},
                {x: sb.x + sb.w, y: sb.y + sb.h}
            ];
            
            for (const c of corners) {
                if (mouseX >= c.x - handleSize/2 && mouseX <= c.x + handleSize/2 &&
                    mouseY >= c.y - handleSize/2 && mouseY <= c.y + handleSize/2) {
                    
                    isResizing = true;
                    const centerX = sb.x + sb.w / 2;
                    const centerY = sb.y + sb.h / 2;
                    initialResizeDist = Math.hypot(mouseX - centerX, mouseY - centerY);
                    
                    if (sb.type === 'image') {
                        initialScale = imagenesEnCanvas[sb.index].scale;
                    } else {
                        initialScale = offsets[sb.key].scale || 1.0;
                    }
                    return; // Detener aquí, estamos redimensionando, no arrastrando
                }
            }
        }

        const element = getElementAtPosition(mouseX, mouseY);
        
        if (element !== null) {
            isDragging = true;
            draggingElement = element;
            startX = mouseX;
            startY = mouseY;
            canvas.style.cursor = 'grabbing';

            // Si es una imagen, la seleccionamos
            if (typeof element === 'number') {
                indiceImagenSeleccionada = element;
                selectedTextKey = null; // Deseleccionar texto
                actualizarPanelImagen();
                resaltarControles('imagen');
            } else if (typeof element === 'string') {
                // Es texto (ej: 'nombre_0')
                selectedTextKey = element;
                indiceImagenSeleccionada = -1; // Deseleccionar imagen
                actualizarPanelImagen();
                
                // Actualizar el slider correspondiente al tamaño actual de este texto
                const type = element.split('_')[0]; // 'nombre', 'apellido', 'grado'
                const currentScale = offsets[element] && offsets[element].scale ? offsets[element].scale : 1.0;
                
                if (type === 'nombre' || type === 'apellido') {
                    inputTamanoNombre.value = currentScale;
                    spanTamanoNombre.textContent = currentScale;
                } else if (type === 'grado') {
                    inputTamanoGrado.value = currentScale;
                    spanTamanoGrado.textContent = currentScale;
                }

                // Resaltar el grupo correspondiente
                if (type === 'nombre' || type === 'apellido') resaltarControles('nombre');
                else if (type === 'grado') resaltarControles('grado');
            }
            generarPrevisualizacion(); // Redibujar para mostrar selección
        } else {
            // 3. Deseleccionar todo si clicamos fuera
            indiceImagenSeleccionada = -1;
            selectedTextKey = null;
            actualizarPanelImagen();
            resaltarControles(null); // Apagar luces
            generarPrevisualizacion();
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        // Lógica de redimensionamiento
        if (isResizing && window.selectionBox) {
            const sb = window.selectionBox;
            const centerX = sb.x + sb.w / 2;
            const centerY = sb.y + sb.h / 2;
            const currentDist = Math.hypot(mouseX - centerX, mouseY - centerY);
            
            if (initialResizeDist < 1) return;

            // Calcular nueva escala basada en la distancia del mouse al centro
            const newScale = Math.max(0.1, initialScale * (currentDist / initialResizeDist));
            
            if (sb.type === 'image') {
                imagenesEnCanvas[sb.index].scale = newScale;
                inputEscalaPersonaje.value = newScale;
            } else {
                offsets[sb.key].scale = newScale;
                // Actualizar sliders UI
                const type = sb.key.split('_')[0];
                if (type === 'nombre' || type === 'apellido') {
                    inputTamanoNombre.value = newScale;
                    spanTamanoNombre.textContent = newScale.toFixed(1);
                } else if (type === 'grado') {
                    inputTamanoGrado.value = newScale;
                    spanTamanoGrado.textContent = newScale.toFixed(1);
                }
            }
            generarPrevisualizacion();
            return;
        }

        if (!isDragging) return;

        const dx = mouseX - startX;
        const dy = mouseY - startY;

        if (typeof draggingElement === 'string') {
            // Es texto
            offsets[draggingElement].x += dx;
            offsets[draggingElement].y += dy;
        } else {
            // Es imagen (índice)
            imagenesEnCanvas[draggingElement].x += dx;
            imagenesEnCanvas[draggingElement].y += dy;
        }

        startX = mouseX;
        startY = mouseY;

        generarPrevisualizacion();
    });

    const detenerArrastre = () => {
        isDragging = false;
        isResizing = false;
        draggingElement = null;
        canvas.style.cursor = 'grab';
    };
    canvas.addEventListener('mouseup', detenerArrastre);
    canvas.addEventListener('mouseleave', detenerArrastre);

    // --- DIBUJAR PATRONES (Moderno) ---
    function dibujarPatron(ctx, tipo, width, height) {
        ctx.save();
        ctx.globalAlpha = 0.15; // Transparencia sutil para que no moleste al texto
        ctx.fillStyle = '#ffffff'; // Patrones blancos por defecto (quedan bien sobre color)
        
        if (tipo === 'puntos') {
            const radio = 3;
            const espacio = 20;
            for (let x = 0; x < width; x += espacio) {
                for (let y = 0; y < height; y += espacio) {
                    ctx.beginPath();
                    // Desplazar filas alternas para efecto "tresbolillo"
                    const offsetX = (y / espacio) % 2 === 0 ? 0 : espacio / 2;
                    ctx.arc(x + offsetX, y, radio, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else if (tipo === 'rayas') {
            const anchoRaya = 5;
            const espacio = 20;
            ctx.beginPath();
            for (let x = -height; x < width; x += espacio) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x + height, height); // Diagonales
            }
            ctx.lineWidth = anchoRaya;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
        } else if (tipo === 'cuadricula') {
            const tamanoCuadro = 25;
            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff';
            for (let x = 0; x < width; x += tamanoCuadro) {
                ctx.moveTo(x, 0); ctx.lineTo(x, height);
            }
            for (let y = 0; y < height; y += tamanoCuadro) {
                ctx.moveTo(0, y); ctx.lineTo(width, y);
            }
            ctx.stroke();
        } else if (tipo === 'memphis') {
            // Patrón moderno aleatorio (formas geométricas)
            const colores = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#ffffff'];
            for (let i = 0; i < 40; i++) {
                ctx.fillStyle = colores[Math.floor(Math.random() * colores.length)];
                const x = Math.random() * width;
                const y = Math.random() * height;
                const size = Math.random() * 15 + 5;
                const shape = Math.random();
                
                ctx.beginPath();
                if (shape < 0.33) { // Círculo
                    ctx.arc(x, y, size/2, 0, Math.PI*2);
                } else if (shape < 0.66) { // Triángulo
                    ctx.moveTo(x, y); ctx.lineTo(x+size, y+size); ctx.lineTo(x-size, y+size);
                } else { // Cuadrado
                    ctx.rect(x, y, size, size);
                }
                ctx.fill();
            }
        } else if (tipo === 'zigzag') {
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#ffffff';
            const step = 20;
            const heightZig = 10;
            ctx.beginPath();
            for (let y = 0; y < height + step; y += step) {
                ctx.moveTo(0, y);
                for (let x = 0; x < width; x += step) {
                    ctx.lineTo(x + step / 2, y - heightZig);
                    ctx.lineTo(x + step, y);
                }
            }
            ctx.stroke();
        } else if (tipo === 'confetti') {
            ctx.globalAlpha = 0.5; // Un poco más visible que los patrones blancos
            const colors = ['#FFC107', '#FF5722', '#4CAF50', '#03A9F4', '#E91E63', '#9C27B0'];
            for (let i = 0; i < 60; i++) {
                ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                const x = Math.random() * width;
                const y = Math.random() * height;
                const size = Math.random() * 8 + 2;
                
                ctx.beginPath();
                // Mezcla de círculos y rectángulos
                if (Math.random() > 0.5) ctx.arc(x, y, size/2, 0, Math.PI*2);
                else ctx.rect(x, y, size, size);
                ctx.fill();
            }
        } else if (tipo === 'holografico') {
            // Efecto iridiscente moderno
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, 'rgba(255, 0, 0, 0.1)');
            gradient.addColorStop(0.2, 'rgba(255, 154, 158, 0.2)');
            gradient.addColorStop(0.4, 'rgba(254, 207, 239, 0.2)');
            gradient.addColorStop(0.6, 'rgba(161, 140, 209, 0.2)');
            gradient.addColorStop(0.8, 'rgba(132, 250, 176, 0.2)');
            gradient.addColorStop(1, 'rgba(143, 211, 244, 0.2)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            
            // Brillos diagonales
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 40;
            for (let i = -height; i < width; i += 100) {
                ctx.moveTo(i, 0);
                ctx.lineTo(i + height, height);
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    // --- FUNCIÓN PRINCIPAL DE DIBUJO ---
    async function generarPrevisualizacion(isExporting) {
        const exportMode = (isExporting === true);

        // 1. Obtener todos los valores
        const nombre = inputNombre.value;
        const apellido = inputApellido.value;
        const grado = inputGrado.value;
        const colorFondo = inputColorFondo.value;
        const tipoPatron = selectTipoPatron.value;
        const estiloBorde = selectEstiloBorde.value;
        const tipoFondo = selectTipoFondo.value;
        const idPlantilla = selectPlantilla.value;
        const plantilla = PLANTILLAS[idPlantilla];
        const colorBorde = inputColorBorde.value;
        const grosorBorde = parseInt(inputGrosorBorde.value, 10);

        // --- VERIFICACIÓN DE FUENTES ---
        // Comprobamos si las fuentes seleccionadas están cargadas
        const fontStringNombre = `20px ${inputFuenteNombre.value}`; // Tamaño dummy para checkear
        const fontStringGrado = `20px ${inputFuenteGrado.value}`;
        const fontsToLoad = [];

        if (!document.fonts.check(fontStringNombre)) fontsToLoad.push(document.fonts.load(fontStringNombre));
        if (!document.fonts.check(fontStringGrado)) fontsToLoad.push(document.fonts.load(fontStringGrado));

        if (fontsToLoad.length > 0) {
            // Si falta alguna fuente, mostramos spinner y esperamos
            spinnerCarga.classList.remove('spinner-oculto');
            await Promise.all(fontsToLoad);
            spinnerCarga.classList.add('spinner-oculto');
        }
        // -------------------------------

        // Reiniciar bounding boxes globales
        window.boundingBoxes = {};
        window.selectionBox = null;
        
        // 2. Ajustar el canvas a las dimensiones de la plantilla
        canvas.width = mmToPx(plantilla.width_mm);
        canvas.height = mmToPx(plantilla.height_mm);

        // 3. Dibujar en el Canvas
        // Limpiar el canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // --- 1. DEFINIR FORMA Y RECORTAR (CLIPPING) ---
        // Esto asegura que el fondo no se pase del borde redondeado
        const radio = canvas.height * 0.1; // Radio proporcional
        
        // AJUSTE: Pequeño margen para que el fondo no sobresalga visualmente del borde
        const margenClip = 3;

        ctx.save(); // Guardar estado antes de recortar
        ctx.beginPath();
        
        if (plantilla.is_combo) {
            // Si es combo, definimos múltiples áreas de recorte
            plantilla.areas.forEach((area, index) => {
                // Verificar qué checkbox usar para el radio
                const usarRedondeo = index === 0 ? checkboxBorde.checked : checkboxBorde2.checked;
                const currentRadio = usarRedondeo ? radio : 0;

                const x = mmToPx(area.x_mm) + margenClip;
                const y = mmToPx(area.y_mm) + margenClip;
                const w = mmToPx(area.w_mm) - margenClip * 2;
                const h = mmToPx(area.h_mm) - margenClip * 2;
                ctx.roundRect(x, y, w, h, [currentRadio]);
            });
        } else {
            const currentRadio = checkboxBorde.checked ? radio : 0;
            ctx.roundRect(margenClip, margenClip, canvas.width - margenClip * 2, canvas.height - margenClip * 2, [currentRadio]);
        }
        ctx.clip(); // ¡Aquí ocurre la magia! Todo lo que dibujemos después se recorta.

        // Dibujar fondo (sólido o degradado)
        if (tipoFondo === 'solido') {
            ctx.fillStyle = colorFondo;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (tipoFondo === 'degradado') {
            const degradado = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            degradado.addColorStop(0, inputColorDegradado1.value);
            degradado.addColorStop(1, inputColorDegradado2.value);
            ctx.fillStyle = degradado;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (tipoFondo === 'imagen' && imagenFondoPropia) {
            // Dibujar imagen subida ajustada al canvas (cover)
            const scale = Math.max(canvas.width / imagenFondoPropia.width, canvas.height / imagenFondoPropia.height);
            const x = (canvas.width / 2) - (imagenFondoPropia.width / 2) * scale;
            const y = (canvas.height / 2) - (imagenFondoPropia.height / 2) * scale;
            ctx.drawImage(imagenFondoPropia, x, y, imagenFondoPropia.width * scale, imagenFondoPropia.height * scale);
        }

        // Dibujar Patrón (Textura)
        dibujarPatron(ctx, tipoPatron, canvas.width, canvas.height);

        // Obtener el layout. Si es una función, la ejecutamos para obtener las coords dinámicas
        const layout = (typeof plantilla.layout === 'function')
            ? plantilla.layout(canvas.width, canvas.height)
            : plantilla.layout;
        
        // --- DIBUJAR IMÁGENES (PERSONAJES) ---
        imagenesEnCanvas.forEach((imgData, index) => {
            const wFinal = imgData.wBase * imgData.scale;
            const hFinal = imgData.hBase * imgData.scale;
            
            // Guardamos dimensiones finales para detección de clicks
            imgData.wFinal = wFinal;
            imgData.hFinal = hFinal;

            ctx.save();
            
            // Lógica para limitar la imagen al área correspondiente en modo Combo
            if (plantilla.is_combo) {
                const cx = imgData.x + wFinal / 2;
                const cy = imgData.y + hFinal / 2;
                
                // Buscar en qué área cae el centro de la imagen
                const areaIndex = plantilla.areas.findIndex(a => {
                    const ax = mmToPx(a.x_mm);
                    const ay = mmToPx(a.y_mm);
                    const aw = mmToPx(a.w_mm);
                    const ah = mmToPx(a.h_mm);
                    return cx >= ax && cx <= ax + aw && cy >= ay && cy <= ay + ah;
                });

                if (areaIndex !== -1) {
                    const area = plantilla.areas[areaIndex];
                    const usarRedondeo = areaIndex === 0 ? checkboxBorde.checked : checkboxBorde2.checked;
                    const currentRadio = usarRedondeo ? radio : 0;
                    
                    // Aplicar recorte específico para esta área
                    ctx.beginPath();
                    const ax = mmToPx(area.x_mm) + margenClip;
                    const ay = mmToPx(area.y_mm) + margenClip;
                    const aw = mmToPx(area.w_mm) - margenClip * 2;
                    const ah = mmToPx(area.h_mm) - margenClip * 2;
                    ctx.roundRect(ax, ay, aw, ah, [currentRadio]);
                    ctx.clip();
                }
            }
            
            // Efectos por imagen
            if (imgData.effect === 'sticker') {
                const s = 3;
                ctx.filter = `drop-shadow(${s}px 0 0 white) drop-shadow(-${s}px 0 0 white) drop-shadow(0 ${s}px 0 white) drop-shadow(0 -${s}px 0 white)`;
            } else if (imgData.effect === 'sombra') {
                ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 5;
                ctx.shadowOffsetY = 5;
            } else if (imgData.effect === 'brillo') {
                ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
                ctx.shadowBlur = 25;
            } else if (imgData.effect === 'byn') {
                ctx.filter = 'grayscale(100%)';
            } else if (imgData.effect === 'sepia') {
                ctx.filter = 'sepia(100%)';
            } else if (imgData.effect === 'fantasma') {
                ctx.globalAlpha = 0.6;
            }

            // Si está seleccionada, dibujamos un recuadro sutil para indicar selección
            if (index === indiceImagenSeleccionada) {
                // Dibujamos el recuadro ANTES de la imagen (o después si queremos que se vea encima)
                // Lo haremos con un borde azul sutil
                // Pero el filter puede afectar el borde. Mejor dibujarlo aparte o asumir que el usuario ve los controles.
            }

            ctx.drawImage(imgData.img, imgData.x, imgData.y, wFinal, hFinal);
            ctx.restore();

            // Si está seleccionada, dibujamos un recuadro profesional para indicar selección
            if (!exportMode && index === indiceImagenSeleccionada) {
                ctx.save();
                ctx.strokeStyle = '#3498db';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 3]); // Línea punteada
                ctx.strokeRect(imgData.x, imgData.y, wFinal, hFinal);
                
                // Guardar caja de selección para eventos
                window.selectionBox = { x: imgData.x, y: imgData.y, w: wFinal, h: hFinal, type: 'image', index: index };
                
                // Dibujar manejadores en las esquinas (Handles)
                const handleSize = 8;
                ctx.fillStyle = '#fff';
                ctx.setLineDash([]); // Línea sólida para los cuadraditos
                const corners = [
                    {x: imgData.x, y: imgData.y}, // Arriba Izq
                    {x: imgData.x + wFinal, y: imgData.y}, // Arriba Der
                    {x: imgData.x, y: imgData.y + hFinal}, // Abajo Izq
                    {x: imgData.x + wFinal, y: imgData.y + hFinal} // Abajo Der
                ];
                
                corners.forEach(c => {
                    ctx.fillRect(c.x - handleSize/2, c.y - handleSize/2, handleSize, handleSize);
                    ctx.strokeRect(c.x - handleSize/2, c.y - handleSize/2, handleSize, handleSize);
                });
                ctx.restore();
            }
        });

        // --- DIBUJAR TEXTO ---
        ctx.textBaseline = 'middle'; // Alinea el texto verticalmente
        
        // Eliminamos la restricción de ancho para que el usuario tenga control total con el slider
        const maxTextWidth = 10000; 

        // Función auxiliar para dibujar texto (maneja arrays o objetos simples)
        const dibujarElementoTexto = (key, texto, inputColor, inputFuente, inputTamano, selectEfecto, isGrado = false) => {
            const items = Array.isArray(layout[key]) ? layout[key] : [layout[key]];
            
            items.forEach((item, index) => {
                ctx.fillStyle = inputColor.value;
                const scaleFactor = (isGrado && inputFuente.value.includes('Bangers')) ? 0.8 : 1;
                
                // Generamos una clave única para cada instancia (ej: nombre_0, nombre_1)
                const offsetKey = `${key}_${index}`;
                if (!offsets[offsetKey]) offsets[offsetKey] = { x: 0, y: 0, scale: 1.0 };

                const itemX = item.x + offsets[offsetKey].x;
                const itemY = item.y + offsets[offsetKey].y;
                
                // Usamos la escala guardada en el offset en lugar del slider global directamente
                const scale = offsets[offsetKey].scale || 1.0;
                
                const fontSize = ajustarTexto(ctx, texto, maxTextWidth, item.fontSizeBase * scaleFactor * scale, inputFuente.value);
                
                const efecto = selectEfecto.value;

                ctx.save();
                if (efecto === 'moderno') {
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 4;
                    ctx.lineJoin = 'round';
                    ctx.strokeText(texto, itemX, itemY);
                    ctx.fillText(texto, itemX, itemY);
                } else if (efecto === 'moderno_ancho') {
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 10; // Borde mucho más ancho
                    ctx.lineJoin = 'round';
                    ctx.strokeText(texto, itemX, itemY);
                    ctx.fillText(texto, itemX, itemY);
                } else if (efecto === 'neon') {
                    ctx.shadowColor = inputColor.value;
                    ctx.shadowBlur = 15;
                    ctx.fillStyle = '#ffffff'; // Centro blanco
                    ctx.fillText(texto, itemX, itemY);
                    ctx.shadowBlur = 0; // Reset para el borde
                    ctx.strokeStyle = inputColor.value;
                    ctx.lineWidth = 2;
                    ctx.strokeText(texto, itemX, itemY);
                } else if (efecto === 'retro') {
                    ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    ctx.fillText(texto, itemX + 3, itemY + 3); // Sombra desplazada
                    ctx.fillStyle = inputColor.value;
                    ctx.fillText(texto, itemX, itemY);
                } else if (efecto === 'glitch') {
                    ctx.fillStyle = 'cyan';
                    ctx.fillText(texto, itemX - 2, itemY);
                    ctx.fillStyle = 'magenta';
                    ctx.fillText(texto, itemX + 2, itemY);
                    ctx.fillStyle = inputColor.value;
                    ctx.fillText(texto, itemX, itemY);
                } else if (efecto === 'arcoiris') {
                    const gradient = ctx.createLinearGradient(itemX, 0, itemX + ctx.measureText(texto).width, 0);
                    gradient.addColorStop(0, "red");
                    gradient.addColorStop(0.2, "orange");
                    gradient.addColorStop(0.4, "yellow");
                    gradient.addColorStop(0.6, "green");
                    gradient.addColorStop(0.8, "blue");
                    gradient.addColorStop(1, "violet");
                    ctx.fillStyle = gradient;
                    ctx.fillText(texto, itemX, itemY);
                    // Opcional: un borde fino negro o blanco para que se lea mejor
                    ctx.lineWidth = 0.5;
                    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                    ctx.strokeText(texto, itemX, itemY);
                } else {
                    // Clásico
                    ctx.fillText(texto, itemX, itemY);
                }
                ctx.restore();
                
                const width = ctx.measureText(texto).width;

                // Dibujar indicador de selección si corresponde
                if (!exportMode && offsetKey === selectedTextKey) {
                    ctx.save();
                    ctx.strokeStyle = '#3498db';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 3]);
                    
                    const padding = 4;
                    const boxX = itemX - padding;
                    const boxY = itemY - fontSize/2 - padding;
                    const boxW = width + padding*2;
                    const boxH = fontSize + padding*2;

                    ctx.strokeRect(boxX, boxY, boxW, boxH);

                    // Guardar caja de selección para eventos
                    window.selectionBox = { x: boxX, y: boxY, w: boxW, h: boxH, type: 'text', key: offsetKey };

                    // Manejadores para texto
                    const handleSize = 8;
                    ctx.fillStyle = '#fff';
                    ctx.setLineDash([]);
                    const corners = [
                        {x: boxX, y: boxY},
                        {x: boxX + boxW, y: boxY},
                        {x: boxX, y: boxY + boxH},
                        {x: boxX + boxW, y: boxY + boxH}
                    ];
                    corners.forEach(c => {
                        ctx.fillRect(c.x - handleSize/2, c.y - handleSize/2, handleSize, handleSize);
                        ctx.strokeRect(c.x - handleSize/2, c.y - handleSize/2, handleSize, handleSize);
                    });

                    ctx.restore();
                }
                
                // Guardamos con índice para hit testing
                window.boundingBoxes[offsetKey] = { x: itemX, y: itemY - fontSize/2, w: width, h: fontSize };
            });
        };

        dibujarElementoTexto('nombre', nombre, inputColorNombre, inputFuenteNombre, inputTamanoNombre, selectEfectoTextoNombre);
        dibujarElementoTexto('apellido', apellido, inputColorNombre, inputFuenteNombre, inputTamanoNombre, selectEfectoTextoNombre);
        dibujarElementoTexto('grado', grado, inputColorGrado, inputFuenteGrado, inputTamanoGrado, selectEfectoTextoGrado, true);

        // Restaurar el recorte (para que el borde se dibuje completo y nítido encima)
        ctx.restore();

        // 4. Dibujar el borde (si está seleccionado)
        ctx.save();
        ctx.strokeStyle = colorBorde; // Usamos el color seleccionado
        ctx.lineWidth = grosorBorde;
        
        // Ajustamos el rectángulo del borde para que no se corte por fuera del canvas si es muy grueso
        const inset = grosorBorde / 2;
        
        ctx.beginPath();

        // Función para trazar el rectángulo (simple o múltiple)
        const trazarRectangulos = (insetVal) => {
            if (plantilla.is_combo) {
                plantilla.areas.forEach((area, index) => {
                    // Verificar qué checkbox usar para el radio
                    const usarRedondeo = index === 0 ? checkboxBorde.checked : checkboxBorde2.checked;
                    const currentRadio = usarRedondeo ? radio : 0;

                    const x = mmToPx(area.x_mm) + insetVal;
                    const y = mmToPx(area.y_mm) + insetVal;
                    const w = mmToPx(area.w_mm) - insetVal * 2;
                    const h = mmToPx(area.h_mm) - insetVal * 2;
                    ctx.roundRect(x, y, w, h, [currentRadio]);
                });
            } else {
                const wBorde = canvas.width - insetVal * 2;
                const hBorde = canvas.height - insetVal * 2;
                // Si no es combo, usamos el checkbox principal
                const currentRadio = checkboxBorde.checked ? radio : 0;
                ctx.roundRect(insetVal, insetVal, wBorde, hBorde, [currentRadio]);
            }
        };
        
        if (estiloBorde === 'punteado') {
            ctx.setLineDash([grosorBorde * 2, grosorBorde * 1.5]); // Patrón de costura
            trazarRectangulos(inset);
            ctx.stroke();
        } else if (estiloBorde === 'doble') {
            // Borde externo
            trazarRectangulos(inset);
            ctx.stroke();
            // Borde interno fino
            ctx.beginPath();
            ctx.lineWidth = 1;
            const margenInt = grosorBorde * 3;
            trazarRectangulos(margenInt);
            ctx.stroke();
        } else if (estiloBorde === 'neon') {
            ctx.shadowColor = colorBorde;
            ctx.shadowBlur = 15;
            ctx.strokeStyle = '#fff'; // El centro del neón es blanco
            ctx.lineWidth = grosorBorde;
            trazarRectangulos(inset);
            ctx.stroke();
        } else if (estiloBorde === '3d') {
            // Sombra sólida desplazada
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            // Hack para sombra: desplazamos el context
            ctx.save();
            ctx.translate(4, 4);
            ctx.beginPath();
            trazarRectangulos(inset);
            ctx.fill();
            ctx.restore();
            
            // Borde normal arriba
            ctx.beginPath();
            trazarRectangulos(inset);
            ctx.stroke();
        } else if (estiloBorde === 'arcoiris') {
            // Crear degradado arcoíris
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, 'red');
            gradient.addColorStop(0.2, 'orange');
            gradient.addColorStop(0.4, 'yellow');
            gradient.addColorStop(0.6, 'green');
            gradient.addColorStop(0.8, 'blue');
            gradient.addColorStop(1, 'violet');
            
            ctx.strokeStyle = gradient;
            trazarRectangulos(inset);
            ctx.stroke();
        } else if (estiloBorde === 'dashed-color') {
            ctx.strokeStyle = colorBorde;
            ctx.setLineDash([15, 10]); // Guiones largos
            ctx.lineCap = 'round'; // Bordes redondeados en los guiones
            trazarRectangulos(inset);
            ctx.stroke();
        } else {
            // Simple
            trazarRectangulos(inset);
            ctx.stroke();
        }
        ctx.restore();

        // 5. Habilitar el botón de descarga de PDF
        botonDescargarPDF.classList.remove('boton-descarga-oculto');
        botonDescargarPNG.classList.remove('boton-descarga-oculto');
    }

    // --- GENERADOR DE COLORES RANDOM ---
    function generarColorRandom() {
        // Paletas modernas predefinidas (Hex)
        const paletas = [
            { c1: '#ff9a9e', c2: '#fecfef' }, // Rosa Pastel
            { c1: '#a18cd1', c2: '#fbc2eb' }, // Lavanda
            { c1: '#84fab0', c2: '#8fd3f4' }, // Menta y Azul
            { c1: '#fccb90', c2: '#d57eeb' }, // Atardecer
            { c1: '#e0c3fc', c2: '#8ec5fc' }, // Lila y Azul
            { c1: '#f093fb', c2: '#f5576c' }, // Fresa
            { c1: '#4facfe', c2: '#00f2fe' }  // Azul Eléctrico
        ];

        const randomPalette = paletas[Math.floor(Math.random() * paletas.length)];
        
        inputColorDegradado1.value = randomPalette.c1;
        inputColorDegradado2.value = randomPalette.c2;
        
        // También cambiamos el color sólido por si el usuario cambia de modo
        inputColorFondo.value = randomPalette.c1;
        
        generarPrevisualizacion();
    }

    // --- FUNCIÓN PARA GENERAR EL PDF ---
    async function generarPDF() {
        // Forzar la actualización de la previsualización SIN bordes de selección
        await generarPrevisualizacion(true);

        if (!inputNombre.value && !inputApellido.value) {
            alert('Por favor, elige un personaje y escribe un nombre antes de generar el PDF.');
            return;
        }

        // Mostrar un mensaje de "cargando"
        const textoOriginalBoton = botonDescargarPDF.textContent;
        botonDescargarPDF.textContent = 'Generando PDF...';
        botonDescargarPDF.disabled = true;

        const idPlantilla = selectPlantilla.value;
        const plantilla = PLANTILLAS[idPlantilla];
        const dataURL = canvas.toDataURL('image/png');

        // Usar la librería jsPDF que cargamos en el HTML
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait', // vertical
            unit: 'mm',
            format: 'a4' // Hoja A4 (210 x 297 mm)
        });

        // Margen reducido (5mm) para el combo o si la plantilla lo especifica (para que entren 3 por fila)
        const margen_mm = (plantilla.is_combo || plantilla.margin_mm) ? (plantilla.margin_mm || 5) : 10;
        const anchoPagina_mm = 210;
        const altoPagina_mm = 297;
        const anchoUtil_mm = anchoPagina_mm - (margen_mm * 2);

        let x = margen_mm;
        let y = margen_mm;

        if (plantilla.is_combo) {
            // Lógica especial para el combo: Extraer y repetir
            // 1. Crear canvas temporales para recortar cada etiqueta
            const areaCuaderno = plantilla.areas[0];
            const areaLapiz = plantilla.areas[1];

            const recortarEtiqueta = (area) => {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = mmToPx(area.w_mm);
                tempCanvas.height = mmToPx(area.h_mm);
                const tCtx = tempCanvas.getContext('2d');
                // Dibujamos la parte del canvas original que corresponde a esta etiqueta
                tCtx.drawImage(canvas, 
                    mmToPx(area.x_mm), mmToPx(area.y_mm), mmToPx(area.w_mm), mmToPx(area.h_mm), 
                    0, 0, tempCanvas.width, tempCanvas.height
                );
                return tempCanvas.toDataURL('image/png');
            };

            const imgCuaderno = recortarEtiqueta(areaCuaderno);
            const imgLapiz = recortarEtiqueta(areaLapiz);

            const espaciado = 0.5; // Espaciado reducido a 0.5mm para que entren más

            // 2. Llenar con Etiquetas Principales (Cuadernos o Carpetas)
            // Usamos la configuración de la plantilla o por defecto 4 filas x 3 columnas
            const rowsMain = plantilla.pdf_rows || 4;
            const colsMain = plantilla.pdf_cols || 3;

            for (let row = 0; row < rowsMain; row++) {
                for (let col = 0; col < colsMain; col++) {
                    if (y + areaCuaderno.h_mm > altoPagina_mm) break; // Seguridad por si se pasa
                    doc.addImage(imgCuaderno, 'PNG', x, y, areaCuaderno.w_mm, areaCuaderno.h_mm);
                    x += areaCuaderno.w_mm + espaciado;
                }
                x = margen_mm;
                y += areaCuaderno.h_mm + espaciado;
            }

            // 3. Llenar el resto con Lápices
            y += 1; // Separación mínima entre grupos
            while (y < altoPagina_mm - areaLapiz.h_mm) {
                // CORRECCIÓN: Usar el ancho total disponible hasta el margen derecho
                while (x + areaLapiz.w_mm <= anchoPagina_mm - margen_mm) {
                    doc.addImage(imgLapiz, 'PNG', x, y, areaLapiz.w_mm, areaLapiz.h_mm);
                    x += areaLapiz.w_mm + espaciado;
                }
                x = margen_mm;
                y += areaLapiz.h_mm + espaciado;
            }
        } else {
            // Bucle estándar para plantillas simples
            while (y < altoPagina_mm - plantilla.height_mm) {
                // CORRECCIÓN: Permitir llegar hasta el borde derecho real (205mm)
                while (x + plantilla.width_mm <= anchoPagina_mm - margen_mm) {
                    doc.addImage(dataURL, 'PNG', x, y, plantilla.width_mm, plantilla.height_mm);
                    x += plantilla.width_mm + 2; // +2mm de espacio entre rótulos
                }
                x = margen_mm; // Reiniciar X para la siguiente fila
                y += plantilla.height_mm + 2; // +2mm de espacio
            }
        }

        doc.save(`Rotulandia - Hoja de ${plantilla.nombre}.pdf`);

        // Restaurar el botón
        botonDescargarPDF.textContent = textoOriginalBoton;
        botonDescargarPDF.disabled = false;
        
        // Restaurar vista previa con selección
        await generarPrevisualizacion(false);
    }

    // --- FUNCIÓN PARA DESCARGAR PNG ---
    async function descargarPNG() {
        await generarPrevisualizacion(true); // Limpiar selección
        const link = document.createElement('a');
        link.download = `Rotulo_${selectPlantilla.value}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        await generarPrevisualizacion(false); // Restaurar selección
    }

    // --- EVENT LISTENERS ---
    botonGenerar.addEventListener('click', generarPrevisualizacion);
    botonDescargarPDF.addEventListener('click', generarPDF);
    botonDescargarPNG.addEventListener('click', descargarPNG);

    btnRandomGradient.addEventListener('click', generarColorRandom);

    selectTipoFondo.addEventListener('input', () => {
        controlSolido.style.display = (selectTipoFondo.value === 'solido') ? 'block' : 'none';
        controlDegradado.style.display = (selectTipoFondo.value === 'degradado') ? 'flex' : 'none';
        controlImagenFondo.style.display = (selectTipoFondo.value === 'imagen') ? 'block' : 'none';
    });

    selectPlantilla.addEventListener('change', () => {
        offsets = {}; // Reseteamos todos los movimientos al cambiar de plantilla
        selectedTextKey = null; // Deseleccionar texto
        // Podríamos reposicionar las imágenes si quisiéramos, pero dejémoslas donde están por libertad
        
        // Mostrar/Ocultar controles de borde extra
        const isCombo = PLANTILLAS[selectPlantilla.value].is_combo;
        if (isCombo) {
            grupoBorde2.style.display = 'flex';
            labelConBorde.textContent = 'Redondear Cuaderno';
        } else {
            grupoBorde2.style.display = 'none';
            labelConBorde.textContent = 'Redondear Bordes';
        }
    });

    // --- MANEJO DE SUBIDA DE ARCHIVOS (GENÉRICO) ---
    function manejarSubidaArchivo(input, esPersonaje) {
        input.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const src = event.target.result;
                        const contenedor = esPersonaje ? galeria : galeriaFondos;
                        agregarImagenAGaleria(src, contenedor, esPersonaje);
                    };
                    reader.readAsDataURL(file);
                }
            });
        });
    }

    manejarSubidaArchivo(inputNuevoFondo, false);
    manejarSubidaArchivo(inputNuevoPersonaje, true);

    // --- EVENTOS DE IMAGEN SELECCIONADA ---
    inputEscalaPersonaje.addEventListener('input', (e) => {
        if (indiceImagenSeleccionada >= 0) {
            imagenesEnCanvas[indiceImagenSeleccionada].scale = parseFloat(e.target.value);
            generarPrevisualizacion();
        }
    });

    selectEfectoPersonaje.addEventListener('input', (e) => {
        if (indiceImagenSeleccionada >= 0) {
            imagenesEnCanvas[indiceImagenSeleccionada].effect = e.target.value;
            generarPrevisualizacion();
        }
    });

    btnEliminarImagen.addEventListener('click', () => {
        if (indiceImagenSeleccionada >= 0) {
            imagenesEnCanvas.splice(indiceImagenSeleccionada, 1);
            indiceImagenSeleccionada = -1;
            actualizarPanelImagen();
            generarPrevisualizacion();
        }
    });

    // --- GENERAR CÓDIGO QR ---
    btnAgregarQR.addEventListener('click', () => {
        if (!inputTextoQR.value) {
            alert('Por favor, escribe un teléfono o texto para el QR.');
            return;
        }

        // --- LÓGICA WHATSAPP INTELIGENTE ---
        const textoIngresado = inputTextoQR.value.trim();
        // Limpiamos el teléfono (dejamos solo números)
        const telefonoLimpio = textoIngresado.replace(/\D/g, '');
        
        let valorFinalQR = textoIngresado;

        // Si parece un teléfono (tiene al menos 7 números), creamos el link de WhatsApp
        if (telefonoLimpio.length >= 7) {
            const nombre = encodeURIComponent(inputNombre.value.trim());
            const apellido = encodeURIComponent(inputApellido.value.trim());
            
            // Construimos la URL absoluta a contacto.html basada en la ubicación actual
            // Esto funciona tanto en localhost como en GitHub Pages
            let baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
            
            // OPTIMIZACIÓN: Usamos parámetros cortos (t, n, a) para reducir el tamaño del QR
            // y solo agregamos nombre/apellido si tienen valor para ahorrar caracteres
            valorFinalQR = `${baseUrl}contacto.html?t=${telefonoLimpio}`;
            if (nombre) valorFinalQR += `&n=${nombre}`;
            if (apellido) valorFinalQR += `&a=${apellido}`;
        }

        // Usamos la librería QRious
        const qr = new QRious({
            value: valorFinalQR,
            foreground: inputColorQR.value,
            size: 500, // Alta resolución para que se vea bien al imprimir
            level: 'L' // Nivel de corrección bajo (menos densidad de puntos, ideal para imprimir chico)
        });

        const img = new Image();
        img.src = qr.toDataURL();
        img.onload = () => {
            // Agregamos el QR como si fuera un personaje más
            const plantilla = PLANTILLAS[selectPlantilla.value];
            const layout = (typeof plantilla.layout === 'function') ? plantilla.layout(canvas.width, canvas.height) : plantilla.layout;

            imagenesEnCanvas.push({
                img: img,
                x: layout.personaje.x + 50, // Un poco desplazado
                y: layout.personaje.y + 50,
                wBase: 100, // Tamaño base del QR
                hBase: 100,
                scale: 1.0,
                effect: 'ninguno'
            });
            
            // Seleccionar el nuevo QR
            indiceImagenSeleccionada = imagenesEnCanvas.length - 1;
            actualizarPanelImagen();
            generarPrevisualizacion();
        };
    });

    // Para una experiencia más fluida, actualizamos la previsualización al cambiar cualquier cosa
    const elementosInteractivos = [
        inputNombre, inputApellido, inputGrado, inputColorFondo, selectPlantilla,
        selectTipoFondo, inputColorDegradado1, inputColorDegradado2, checkboxBorde, checkboxBorde2,
        selectTipoPatron, selectEstiloBorde,
        inputColorBorde, inputGrosorBorde,
        inputFuenteNombre, inputColorNombre, selectEfectoTextoNombre,
        inputFuenteGrado, inputColorGrado, selectEfectoTextoGrado
    ];
    elementosInteractivos.forEach(el => {
        el.addEventListener('input', generarPrevisualizacion);
    });

    // Listeners específicos para tamaño (independencia)
    const updateTextScale = (type, value) => {
        const scale = parseFloat(value);
        let targetIndex = null;
        if (selectedTextKey) {
            const parts = selectedTextKey.split('_');
            targetIndex = parts[1]; // '0' or '1'
        }

        if (targetIndex !== null) {
            // Si hay un texto seleccionado, actualizamos solo ese (y su pareja nombre/apellido si aplica)
            const key = `${type}_${targetIndex}`;
            if (!offsets[key]) offsets[key] = { x: 0, y: 0, scale: 1.0 };
            offsets[key].scale = scale;
        } else {
            // Si no hay nada seleccionado, actualizamos todos los de ese tipo (comportamiento default)
            Object.keys(window.boundingBoxes || {}).forEach(key => {
                if (key.startsWith(type)) {
                    if (!offsets[key]) offsets[key] = { x: 0, y: 0, scale: 1.0 };
                    offsets[key].scale = scale;
                }
            });
        }
        generarPrevisualizacion();
    };

    inputTamanoNombre.addEventListener('input', (e) => {
        spanTamanoNombre.textContent = e.target.value;
        updateTextScale('nombre', e.target.value);
        updateTextScale('apellido', e.target.value);
    });
    
    inputTamanoGrado.addEventListener('input', (e) => {
        spanTamanoGrado.textContent = e.target.value;
        updateTextScale('grado', e.target.value);
    });
    
    // Iniciar con una previsualización en blanco al cargar la página
    generarPrevisualizacion();
});
