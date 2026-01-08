// js/canvas-renderer.js
import { mmToPx, PLANTILLAS } from './config.js';

export class CanvasRenderer {
    constructor(canvasId, spinnerId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.spinner = document.getElementById(spinnerId);
        this.boundingBoxes = {};
        this.selectionBox = null;
    }

    // --- FUNCIÓN INTELIGENTE: AJUSTAR TEXTO ---
    ajustarTexto(texto, maxWidth, fontSizeInicial, fontFamily) {
        let fontSize = fontSizeInicial;
        this.ctx.font = `${fontSize}px ${fontFamily}`;
        while (this.ctx.measureText(texto).width > maxWidth && fontSize > 5) {
            fontSize -= 1;
            this.ctx.font = `${fontSize}px ${fontFamily}`;
        }
        return fontSize;
    }

    dibujarPatron(tipo, width, height) {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#ffffff';
        
        if (tipo === 'puntos') {
            const radio = 3;
            const espacio = 20;
            for (let x = 0; x < width; x += espacio) {
                for (let y = 0; y < height; y += espacio) {
                    ctx.beginPath();
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
                ctx.lineTo(x + height, height);
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
            const colores = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#ffffff'];
            for (let i = 0; i < 40; i++) {
                ctx.fillStyle = colores[Math.floor(Math.random() * colores.length)];
                const x = Math.random() * width;
                const y = Math.random() * height;
                const size = Math.random() * 15 + 5;
                const shape = Math.random();
                ctx.beginPath();
                if (shape < 0.33) ctx.arc(x, y, size/2, 0, Math.PI*2);
                else if (shape < 0.66) { ctx.moveTo(x, y); ctx.lineTo(x+size, y+size); ctx.lineTo(x-size, y+size); }
                else ctx.rect(x, y, size, size);
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
            ctx.globalAlpha = 0.5;
            const colors = ['#FFC107', '#FF5722', '#4CAF50', '#03A9F4', '#E91E63', '#9C27B0'];
            for (let i = 0; i < 60; i++) {
                ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                const x = Math.random() * width;
                const y = Math.random() * height;
                const size = Math.random() * 8 + 2;
                ctx.beginPath();
                if (Math.random() > 0.5) ctx.arc(x, y, size/2, 0, Math.PI*2);
                else ctx.rect(x, y, size, size);
                ctx.fill();
            }
        } else if (tipo === 'holografico') {
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, 'rgba(255, 0, 0, 0.1)');
            gradient.addColorStop(0.2, 'rgba(255, 154, 158, 0.2)');
            gradient.addColorStop(0.4, 'rgba(254, 207, 239, 0.2)');
            gradient.addColorStop(0.6, 'rgba(161, 140, 209, 0.2)');
            gradient.addColorStop(0.8, 'rgba(132, 250, 176, 0.2)');
            gradient.addColorStop(1, 'rgba(143, 211, 244, 0.2)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 40;
            for (let i = -height; i < width; i += 100) {
                ctx.moveTo(i, 0); ctx.lineTo(i + height, height);
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    async render(state, isExporting = false) {
        // Mapeo de variables del estado (UIManager) a variables locales
        const nombre = state.inputNombre;
        const apellido = state.inputApellido;
        const grado = state.inputGrado;
        const colorFondo = state.inputColorFondo;
        const tipoPatron = state.selectTipoPatron;
        const estiloBorde = state.selectEstiloBorde;
        const tipoFondo = state.selectTipoFondo;
        const idPlantilla = state.selectPlantilla;
        const colorBorde = state.inputColorBorde;
        const grosorBorde = parseInt(state.inputGrosorBorde, 10);

        const {
            inputFuenteNombre, inputFuenteGrado,
            inputColorNombre, inputColorGrado, inputTamanoNombre, inputTamanoGrado,
            selectEfectoTextoNombre, selectEfectoTextoGrado,
            inputColorDegradado1, inputColorDegradado2, imagenFondoPropia,
            imagenesEnCanvas, offsets, indiceImagenSeleccionada, selectedTextKey,
            checkboxBorde, checkboxBorde2
        } = state;

        const plantilla = PLANTILLAS[idPlantilla];
        const exportMode = isExporting;

        // Verificación de fuentes
        // Aseguramos un valor por defecto si inputFuenteNombre es undefined o vacío
        const fuenteNombre = inputFuenteNombre || "'Fredoka', sans-serif";
        const fuenteGrado = inputFuenteGrado || "'Fredoka', sans-serif";
        const fontStringNombre = `20px ${fuenteNombre}`;
        const fontStringGrado = `20px ${fuenteGrado}`;
        const fontsToLoad = [];
        if (!document.fonts.check(fontStringNombre)) fontsToLoad.push(document.fonts.load(fontStringNombre));
        if (!document.fonts.check(fontStringGrado)) fontsToLoad.push(document.fonts.load(fontStringGrado));

        if (fontsToLoad.length > 0) {
            this.spinner.classList.remove('spinner-oculto');
            await Promise.all(fontsToLoad);
            this.spinner.classList.add('spinner-oculto');
        }

        this.boundingBoxes = {};
        this.selectionBox = null;

        this.canvas.width = mmToPx(plantilla.width_mm);
        this.canvas.height = mmToPx(plantilla.height_mm);
        const ctx = this.ctx;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const radio = this.canvas.height * 0.1;
        const margenClip = 3;

        ctx.save();
        ctx.beginPath();
        if (plantilla.is_combo) {
            plantilla.areas.forEach((area, index) => {
                const usarRedondeo = index === 0 ? checkboxBorde : checkboxBorde2;
                const currentRadio = usarRedondeo ? radio : 0;
                const x = mmToPx(area.x_mm) + margenClip;
                const y = mmToPx(area.y_mm) + margenClip;
                const w = mmToPx(area.w_mm) - margenClip * 2;
                const h = mmToPx(area.h_mm) - margenClip * 2;
                ctx.roundRect(x, y, w, h, [currentRadio]);
            });
        } else {
            const currentRadio = checkboxBorde ? radio : 0;
            ctx.roundRect(margenClip, margenClip, this.canvas.width - margenClip * 2, this.canvas.height - margenClip * 2, [currentRadio]);
        }
        ctx.clip();

        if (tipoFondo === 'solido') {
            ctx.fillStyle = colorFondo;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else if (tipoFondo === 'degradado') {
            const degradado = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
            degradado.addColorStop(0, inputColorDegradado1);
            degradado.addColorStop(1, inputColorDegradado2);
            ctx.fillStyle = degradado;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else if (tipoFondo === 'imagen' && imagenFondoPropia) {
            const scale = Math.max(this.canvas.width / imagenFondoPropia.width, this.canvas.height / imagenFondoPropia.height);
            const x = (this.canvas.width / 2) - (imagenFondoPropia.width / 2) * scale;
            const y = (this.canvas.height / 2) - (imagenFondoPropia.height / 2) * scale;
            ctx.drawImage(imagenFondoPropia, x, y, imagenFondoPropia.width * scale, imagenFondoPropia.height * scale);
        }

        this.dibujarPatron(tipoPatron, this.canvas.width, this.canvas.height);

        const layout = (typeof plantilla.layout === 'function') ? plantilla.layout(this.canvas.width, this.canvas.height) : plantilla.layout;

        // Dibujar Imágenes
        imagenesEnCanvas.forEach((imgData, index) => {
            const wFinal = imgData.wBase * imgData.scale;
            const hFinal = imgData.hBase * imgData.scale;
            imgData.wFinal = wFinal;
            imgData.hFinal = hFinal;

            ctx.save();
            if (plantilla.is_combo) {
                const cx = imgData.x + wFinal / 2;
                const cy = imgData.y + hFinal / 2;
                const areaIndex = plantilla.areas.findIndex(a => {
                    const ax = mmToPx(a.x_mm);
                    const ay = mmToPx(a.y_mm);
                    const aw = mmToPx(a.w_mm);
                    const ah = mmToPx(a.h_mm);
                    return cx >= ax && cx <= ax + aw && cy >= ay && cy <= ay + ah;
                });
                if (areaIndex !== -1) {
                    const area = plantilla.areas[areaIndex];
                    const usarRedondeo = areaIndex === 0 ? checkboxBorde : checkboxBorde2;
                    const currentRadio = usarRedondeo ? radio : 0;
                    ctx.beginPath();
                    const ax = mmToPx(area.x_mm) + margenClip;
                    const ay = mmToPx(area.y_mm) + margenClip;
                    const aw = mmToPx(area.w_mm) - margenClip * 2;
                    const ah = mmToPx(area.h_mm) - margenClip * 2;
                    ctx.roundRect(ax, ay, aw, ah, [currentRadio]);
                    ctx.clip();
                }
            }

            if (imgData.effect === 'sticker') {
                const s = 3;
                ctx.filter = `drop-shadow(px 0 0 white) drop-shadow(-px 0 0 white) drop-shadow(0 px 0 white) drop-shadow(0 -px 0 white)`;
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

            ctx.drawImage(imgData.img, imgData.x, imgData.y, wFinal, hFinal);
            ctx.restore();

            if (!exportMode && index === indiceImagenSeleccionada) {
                this.dibujarSeleccion(imgData.x, imgData.y, wFinal, hFinal, 'image', index);
            }
        });

        // Dibujar Texto
        ctx.textBaseline = 'middle';
        const maxTextWidth = 10000;

        const dibujarElementoTexto = (key, texto, inputColor, inputFuente, inputTamano, selectEfecto, isGrado = false) => {
            const items = Array.isArray(layout[key]) ? layout[key] : [layout[key]];
            items.forEach((item, index) => {
                ctx.fillStyle = inputColor;
                const scaleFactor = (isGrado && inputFuente.includes('Bangers')) ? 0.8 : 1;
                const offsetKey = `${key}_${index}`;
                if (!offsets[offsetKey]) offsets[offsetKey] = { x: 0, y: 0, scale: 1.0 };

                const itemX = item.x + offsets[offsetKey].x;
                const itemY = item.y + offsets[offsetKey].y;
                const scale = offsets[offsetKey].scale || 1.0;
                const fontSize = this.ajustarTexto(texto, maxTextWidth, item.fontSizeBase * scaleFactor * scale, inputFuente);
                const efecto = selectEfecto;

                ctx.save();
                if (efecto === 'moderno') {
                    ctx.strokeStyle = 'white'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
                    ctx.strokeText(texto, itemX, itemY); ctx.fillText(texto, itemX, itemY);
                } else if (efecto === 'moderno_ancho') {
                    ctx.strokeStyle = 'white'; ctx.lineWidth = 10; ctx.lineJoin = 'round';
                    ctx.strokeText(texto, itemX, itemY); ctx.fillText(texto, itemX, itemY);
                } else if (efecto === 'neon') {
                    ctx.shadowColor = inputColor; ctx.shadowBlur = 15; ctx.fillStyle = '#ffffff';
                    ctx.fillText(texto, itemX, itemY);
                    ctx.shadowBlur = 0; ctx.strokeStyle = inputColor; ctx.lineWidth = 2;
                    ctx.strokeText(texto, itemX, itemY);
                } else if (efecto === 'retro') {
                    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillText(texto, itemX + 3, itemY + 3);
                    ctx.fillStyle = inputColor; ctx.fillText(texto, itemX, itemY);
                } else if (efecto === 'glitch') {
                    ctx.fillStyle = 'cyan'; ctx.fillText(texto, itemX - 2, itemY);
                    ctx.fillStyle = 'magenta'; ctx.fillText(texto, itemX + 2, itemY);
                    ctx.fillStyle = inputColor; ctx.fillText(texto, itemX, itemY);
                } else if (efecto === 'arcoiris') {
                    const gradient = ctx.createLinearGradient(itemX, 0, itemX + ctx.measureText(texto).width, 0);
                    gradient.addColorStop(0, "red"); gradient.addColorStop(0.2, "orange");
                    gradient.addColorStop(0.4, "yellow"); gradient.addColorStop(0.6, "green");
                    gradient.addColorStop(0.8, "blue"); gradient.addColorStop(1, "violet");
                    ctx.fillStyle = gradient; ctx.fillText(texto, itemX, itemY);
                    ctx.lineWidth = 0.5; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.strokeText(texto, itemX, itemY);
                } else {
                    ctx.fillText(texto, itemX, itemY);
                }
                ctx.restore();

                const width = ctx.measureText(texto).width;
                if (!exportMode && offsetKey === selectedTextKey) {
                    const padding = 4;
                    this.dibujarSeleccion(itemX - padding, itemY - fontSize/2 - padding, width + padding*2, fontSize + padding*2, 'text', offsetKey);
                }
                this.boundingBoxes[offsetKey] = { x: itemX, y: itemY - fontSize/2, w: width, h: fontSize };
            });
        };

        dibujarElementoTexto('nombre', nombre, inputColorNombre, fuenteNombre, inputTamanoNombre, selectEfectoTextoNombre);
        dibujarElementoTexto('apellido', apellido, inputColorNombre, fuenteNombre, inputTamanoNombre, selectEfectoTextoNombre);
        dibujarElementoTexto('grado', grado, inputColorGrado, fuenteGrado, inputTamanoGrado, selectEfectoTextoGrado, true);

        ctx.restore();

        // Dibujar Borde
        ctx.save();
        ctx.strokeStyle = colorBorde;
        ctx.lineWidth = grosorBorde;
        const inset = grosorBorde / 2;
        ctx.beginPath();

        const trazarRectangulos = (insetVal) => {
            if (plantilla.is_combo) {
                plantilla.areas.forEach((area, index) => {
                    const usarRedondeo = index === 0 ? checkboxBorde : checkboxBorde2;
                    const currentRadio = usarRedondeo ? radio : 0;
                    const x = mmToPx(area.x_mm) + insetVal;
                    const y = mmToPx(area.y_mm) + insetVal;
                    const w = mmToPx(area.w_mm) - insetVal * 2;
                    const h = mmToPx(area.h_mm) - insetVal * 2;
                    ctx.roundRect(x, y, w, h, [currentRadio]);
                });
            } else {
                const wBorde = this.canvas.width - insetVal * 2;
                const hBorde = this.canvas.height - insetVal * 2;
                const currentRadio = checkboxBorde ? radio : 0;
                ctx.roundRect(insetVal, insetVal, wBorde, hBorde, [currentRadio]);
            }
        };

        if (estiloBorde === 'punteado') { ctx.setLineDash([grosorBorde * 2, grosorBorde * 1.5]); trazarRectangulos(inset); ctx.stroke(); }
        else if (estiloBorde === 'doble') { trazarRectangulos(inset); ctx.stroke(); ctx.beginPath(); ctx.lineWidth = 1; const margenInt = grosorBorde * 3; trazarRectangulos(margenInt); ctx.stroke(); }
        else if (estiloBorde === 'neon') { ctx.shadowColor = colorBorde; ctx.shadowBlur = 15; ctx.strokeStyle = '#fff'; ctx.lineWidth = grosorBorde; trazarRectangulos(inset); ctx.stroke(); }
        else if (estiloBorde === '3d') { ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.save(); ctx.translate(4, 4); ctx.beginPath(); trazarRectangulos(inset); ctx.fill(); ctx.restore(); ctx.beginPath(); trazarRectangulos(inset); ctx.stroke(); }
        else if (estiloBorde === 'arcoiris') { const gradient = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height); gradient.addColorStop(0, 'red'); gradient.addColorStop(0.2, 'orange'); gradient.addColorStop(0.4, 'yellow'); gradient.addColorStop(0.6, 'green'); gradient.addColorStop(0.8, 'blue'); gradient.addColorStop(1, 'violet'); ctx.strokeStyle = gradient; trazarRectangulos(inset); ctx.stroke(); }
        else if (estiloBorde === 'dashed-color') { ctx.strokeStyle = colorBorde; ctx.setLineDash([15, 10]); ctx.lineCap = 'round'; trazarRectangulos(inset); ctx.stroke(); }
        else { trazarRectangulos(inset); ctx.stroke(); }
        ctx.restore();
    }

    dibujarSeleccion(x, y, w, h, type, keyOrIndex) {
        const ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(x, y, w, h);
        
        this.selectionBox = { x, y, w, h, type, [type === 'image' ? 'index' : 'key']: keyOrIndex };

        const handleSize = 8;
        ctx.fillStyle = '#fff';
        ctx.setLineDash([]);
        const corners = [{x, y}, {x: x + w, y}, {x, y: y + h}, {x: x + w, y: y + h}];
        corners.forEach(c => {
            ctx.fillRect(c.x - handleSize/2, c.y - handleSize/2, handleSize, handleSize);
            ctx.strokeRect(c.x - handleSize/2, c.y - handleSize/2, handleSize, handleSize);
        });
        ctx.restore();
    }
}
