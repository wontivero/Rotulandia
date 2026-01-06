document.addEventListener('DOMContentLoaded', () => { // Asegúrate de que el nombre de este archivo sea script.js
    // --- FUNCIÓN PARA CONVERTIR MM A PÍXELES ---
    // Definida al inicio para usarla en las plantillas si fuera necesario
    const DPI = 300;
    const mmToPx = (mm) => (mm / 25.4) * DPI;

    // --- DEFINICIÓN DE PLANTILLAS ---
    // Medidas en mm para el PDF. DPI (puntos por pulgada) para el canvas.
    const PLANTILLAS = {
        'cuaderno': {
            nombre: 'Cuaderno',
            width_mm: 60,  // 6 cm de ancho
            height_mm: 40, // 4 cm de alto
            // Posiciones y tamaños relativos al canvas
            layout: (w, h) => ({ // w = width, h = height
                personaje: { x: w * 0.02, y: h * 0.1, w: h * 0.8, h: h * 0.8 }, // Un poco más a la izquierda
                nombre: { x: w * 0.42, y: h * 0.35, fontSizeBase: h * 0.22 }, // Usamos fontSizeBase para escalar
                apellido: { x: w * 0.42, y: h * 0.55, fontSizeBase: h * 0.22 },
                grado: { x: w * 0.42, y: h * 0.75, fontSizeBase: h * 0.18 }
            })
        },
        'lapiz': {
            nombre: 'Lápiz',
            width_mm: 50,
            height_mm: 10,
            layout: (w, h) => ({ // Este es muy pequeño, lo dejamos con valores fijos por ahora
                personaje: { x: w * 0.05, y: h * 0.1, w: h * 0.8, h: h * 0.8 },
                nombre: { x: w * 0.25, y: h * 0.8, fontSizeBase: h * 0.6 },
                apellido: { x: w * 0.45, y: h * 0.8, fontSizeBase: h * 0.6 },
                grado: { x: w * 0.7, y: h * 0.8, fontSizeBase: h * 0.6 }
            })
        },
        'carpeta': {
            nombre: 'Carpeta',
            width_mm: 100,
            height_mm: 60,
            layout: (w, h) => ({
                personaje: { x: w * 0.05, y: h * 0.1, w: h * 0.8, h: h * 0.8 },
                nombre: { x: w * 0.4, y: h * 0.40, fontSizeBase: h * 0.25 },
                apellido: { x: w * 0.4, y: h * 0.60, fontSizeBase: h * 0.25 },
                grado: { x: w * 0.4, y: h * 0.80, fontSizeBase: h * 0.2 }
            })
        },
        'mix_cuaderno_lapiz': {
            nombre: 'Combo: Cuaderno + Lápiz',
            width_mm: 70, // Ancho del canvas para mostrar ambos
            height_mm: 70, // Alto del canvas
            is_combo: true,
            // Definimos las áreas relativas en mm para recorte y PDF
            areas: [
                { type: 'cuaderno', x_mm: 5, y_mm: 5, w_mm: 60, h_mm: 40 },
                { type: 'lapiz', x_mm: 10, y_mm: 50, w_mm: 50, h_mm: 10 }
            ],
            layout: (w, h) => {
                // w y h son el tamaño del canvas en px.
                // Calculamos posiciones absolutas para los textos en ambas etiquetas
                return {
                    personaje: { x: w * 0.05, y: h * 0.1, w: h * 0.3, h: h * 0.3 }, // Posición por defecto imagen
                    // Arrays de posiciones para los textos (uno para cada etiqueta)
                    nombre: [
                        { x: mmToPx(5 + 60 * 0.42), y: mmToPx(5 + 40 * 0.35), fontSizeBase: mmToPx(40 * 0.22) }, // Cuaderno
                        { x: mmToPx(10 + 50 * 0.25), y: mmToPx(50 + 10 * 0.8), fontSizeBase: mmToPx(10 * 0.6) }   // Lápiz
                    ],
                    apellido: [
                        { x: mmToPx(5 + 60 * 0.42), y: mmToPx(5 + 40 * 0.55), fontSizeBase: mmToPx(40 * 0.22) },
                        { x: mmToPx(10 + 50 * 0.45), y: mmToPx(50 + 10 * 0.8), fontSizeBase: mmToPx(10 * 0.6) }
                    ],
                    grado: [
                        { x: mmToPx(5 + 60 * 0.42), y: mmToPx(5 + 40 * 0.75), fontSizeBase: mmToPx(40 * 0.18) },
                        { x: mmToPx(10 + 50 * 0.7), y: mmToPx(50 + 10 * 0.8), fontSizeBase: mmToPx(10 * 0.6) }
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
                actualizarPanelImagen();
            } else if (typeof element === 'string') {
                // Es texto (ej: 'nombre_0')
                selectedTextKey = element;
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
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

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
    function generarPrevisualizacion() {
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

        // Reiniciar bounding boxes globales
        window.boundingBoxes = {};
        
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

                // Dibujar indicador de selección si corresponde
                if (offsetKey === selectedTextKey) {
                    ctx.save();
                    ctx.strokeStyle = '#3498db';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([4, 2]);
                    const width = ctx.measureText(texto).width;
                    ctx.strokeRect(itemX, itemY - fontSize/2, width, fontSize);
                    ctx.restore();
                }
                
                const width = ctx.measureText(texto).width;
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
        // Forzar la actualización de la previsualización para tener la última versión
        generarPrevisualizacion();

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

        // Margen reducido (5mm) para el combo para aprovechar espacio, 10mm para el resto
        const margen_mm = plantilla.is_combo ? 5 : 10;
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

            const espaciado = 1; // Espaciado reducido a 1mm para que entren más

            // 2. Llenar con Cuadernos (aprox 12)
            // 3 columnas x 4 filas = 12 etiquetas
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 3; col++) {
                    if (y + areaCuaderno.h_mm > altoPagina_mm) break;
                    doc.addImage(imgCuaderno, 'PNG', x, y, areaCuaderno.w_mm, areaCuaderno.h_mm);
                    x += areaCuaderno.w_mm + espaciado;
                }
                x = margen_mm;
                y += areaCuaderno.h_mm + espaciado;
            }

            // 3. Llenar el resto con Lápices
            y += 2; // Separación mínima entre grupos
            while (y < altoPagina_mm - areaLapiz.h_mm) {
                while (x < anchoUtil_mm - areaLapiz.w_mm) {
                    doc.addImage(imgLapiz, 'PNG', x, y, areaLapiz.w_mm, areaLapiz.h_mm);
                    x += areaLapiz.w_mm + espaciado;
                }
                x = margen_mm;
                y += areaLapiz.h_mm + espaciado;
            }
        } else {
            // Bucle estándar para plantillas simples
            while (y < altoPagina_mm - plantilla.height_mm) {
                while (x < anchoUtil_mm - plantilla.width_mm) {
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
    }

    // --- FUNCIÓN PARA DESCARGAR PNG ---
    function descargarPNG() {
        const link = document.createElement('a');
        link.download = `Rotulo_${selectPlantilla.value}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
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
