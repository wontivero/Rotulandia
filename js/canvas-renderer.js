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
            checkArcoirisNombre, checkArcoirisGrado,
            checkMetalNombre, checkMetalGrado, inputTipoMetalNombre, inputTipoMetalGrado,
            inputShiftArcoirisNombre, inputShiftArcoirisGrado,
            inputIntensidadEfectoNombre, inputIntensidadEfectoGrado,
            inputColorDegradado1, inputColorDegradado2, imagenFondoPropia,
            fondoProps, imagenesEnCanvas, offsets, indiceImagenSeleccionada, selectedTextKey,
            checkboxBorde, checkboxBorde2,
            checkArcoirisBorde, inputShiftArcoirisBorde, checkMetalBorde, inputTipoMetalBorde,
            selectEfectoBorde, inputIntensidadEfectoBorde,
            inputRadioBorde
        } = state;

        // Protección contra plantilla indefinida (fallback a 'cuaderno')
        const plantilla = PLANTILLAS[idPlantilla] || PLANTILLAS['cuaderno'];
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

        // Calcular radio basado en el slider (0-50%)
        const radioFactor = parseInt(inputRadioBorde || 10, 10) / 100;
        const radio = Math.min(this.canvas.width, this.canvas.height) * radioFactor;
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
            // Lógica "Cover" profesional: Ajustar sin deformar
            const canvasRatio = this.canvas.width / this.canvas.height;
            // CORRECCIÓN: Usar naturalWidth/Height para obtener las dimensiones reales de la imagen, no las de la miniatura CSS
            const imgRatio = imagenFondoPropia.naturalWidth / imagenFondoPropia.naturalHeight;
            
            let renderW, renderH;
            
            if (canvasRatio > imgRatio) {
                // El canvas es más ancho que la imagen (ajustar al ancho)
                renderW = this.canvas.width;
                renderH = renderW / imgRatio;
            } else {
                // El canvas es más alto que la imagen (ajustar al alto)
                renderH = this.canvas.height;
                renderW = renderH * imgRatio;
            }

            // Centrar inicialmente + desplazamiento del usuario
            const x = (this.canvas.width - renderW) / 2 + (fondoProps ? fondoProps.x : 0);
            const y = (this.canvas.height - renderH) / 2 + (fondoProps ? fondoProps.y : 0);
            
            ctx.drawImage(imagenFondoPropia, x, y, renderW, renderH);
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

            const intensity = imgData.effectIntensity !== undefined ? imgData.effectIntensity : 5;

            if (imgData.effect === 'sticker') {
                const s = Math.max(1, intensity * 0.8);
                ctx.filter = `drop-shadow(${s}px 0 0 white) drop-shadow(-${s}px 0 0 white) drop-shadow(0 ${s}px 0 white) drop-shadow(0 -${s}px 0 white)`;
            } else if (imgData.effect === 'sombra_pop') {
                ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = intensity;
                ctx.shadowOffsetY = intensity;
            } else if (imgData.effect === 'glow') {
                ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
                ctx.shadowBlur = intensity * 3;
            } else if (imgData.effect === 'holografico') {
                ctx.filter = `hue-rotate(${intensity * 18}deg)`;
            } else if (imgData.effect === 'vibrante') {
                ctx.filter = `saturate(${100 + (intensity * 10)}%)`;
            } else if (imgData.effect === 'vintage') {
                ctx.filter = `sepia(${intensity * 5}%)`;
            } else if (imgData.effect === 'fantasma') {
                ctx.globalAlpha = Math.max(0.1, 1 - (intensity / 25));
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

        const dibujarElementoTexto = (key, texto, inputColor, inputFuente, inputTamano, selectEfecto, intensidadInput, isArcoirisColor, arcoirisShiftInput, isMetalColor, metalTypeInput, isGrado = false) => {
            const items = Array.isArray(layout[key]) ? layout[key] : [layout[key]];
            items.forEach((item, index) => {
                // ctx.fillStyle se define más abajo dependiendo del modo arcoíris
                const scaleFactor = (isGrado && inputFuente.includes('Bangers')) ? 0.8 : 1;
                const offsetKey = `${key}_${index}`;
                if (!offsets[offsetKey]) offsets[offsetKey] = { x: 0, y: 0, scale: 1.0 };

                const itemX = item.x + offsets[offsetKey].x;
                const itemY = item.y + offsets[offsetKey].y;
                const scale = offsets[offsetKey].scale || 1.0;
                const fontSize = this.ajustarTexto(texto, maxTextWidth, item.fontSizeBase * scaleFactor * scale, inputFuente);
                const efecto = selectEfecto;
                // Intensidad base 5. Normalizamos para que sea un multiplicador útil
                const intensidad = parseInt(intensidadInput || 5, 10);
                
                // Definir el estilo de relleno base (Color sólido o Arcoíris estático)
                let baseFillStyle = inputColor;
                if (isArcoirisColor) {
                    const width = ctx.measureText(texto).width;
                    const gradient = ctx.createLinearGradient(itemX, 0, itemX + width, 0);
                    // Rotación de colores basada en el slider (0 a 360)
                    const shift = parseInt(arcoirisShiftInput || 0, 10);
                    for (let i = 0; i <= 10; i++) {
                        const p = i / 10;
                        const hue = (p * 360 + shift) % 360;
                        gradient.addColorStop(p, `hsl(${hue}, 100%, 50%)`);
                    }
                    baseFillStyle = gradient;
                } else if (isMetalColor) {
                    // Modo Metálico
                    const fontSize = item.fontSizeBase * scaleFactor * scale;
                    const gradient = ctx.createLinearGradient(itemX, itemY - fontSize/2, itemX, itemY + fontSize/2);
                    const type = parseInt(metalTypeInput || 0, 10);
                    
                    if (type === 0) { // Oro
                        gradient.addColorStop(0, "#FDB931"); gradient.addColorStop(0.3, "#FFFFAC");
                        gradient.addColorStop(0.6, "#D19C1D"); gradient.addColorStop(1, "#C58808");
                    } else if (type === 1) { // Plata
                        gradient.addColorStop(0, "#E0E0E0"); gradient.addColorStop(0.3, "#FFFFFF");
                        gradient.addColorStop(0.6, "#A0A0A0"); gradient.addColorStop(1, "#505050");
                    } else if (type === 2) { // Bronce
                        gradient.addColorStop(0, "#e8c39e"); gradient.addColorStop(0.3, "#ffdfc4");
                        gradient.addColorStop(0.6, "#cd7f32"); gradient.addColorStop(1, "#8c5620");
                    } else { // Rosa
                        gradient.addColorStop(0, "#F6D3C5"); gradient.addColorStop(0.3, "#FFF0E8");
                        gradient.addColorStop(0.6, "#D69E8E"); gradient.addColorStop(1, "#B57B6A");
                    }
                    baseFillStyle = gradient;
                }

                ctx.save();
                if (efecto === 'moderno') {
                    ctx.strokeStyle = 'white'; ctx.lineWidth = Math.max(1, intensidad); ctx.lineJoin = 'round';
                    ctx.strokeText(texto, itemX, itemY); 
                    ctx.fillStyle = baseFillStyle; ctx.fillText(texto, itemX, itemY);
                } else if (efecto === 'moderno_ancho') {
                    ctx.strokeStyle = 'white'; ctx.lineWidth = Math.max(2, intensidad * 2.5); ctx.lineJoin = 'round';
                    ctx.strokeText(texto, itemX, itemY); 
                    ctx.fillStyle = baseFillStyle; ctx.fillText(texto, itemX, itemY);
                } else if (efecto === 'neon') {
                    ctx.shadowColor = inputColor; ctx.shadowBlur = intensidad * 3; ctx.fillStyle = '#ffffff';
                    ctx.fillText(texto, itemX, itemY);
                    ctx.shadowBlur = 0; ctx.strokeStyle = inputColor; ctx.lineWidth = 2;
                    ctx.strokeText(texto, itemX, itemY);
                } else if (efecto === 'retro') {
                    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillText(texto, itemX + (intensidad * 0.6), itemY + (intensidad * 0.6));
                    ctx.fillStyle = baseFillStyle; ctx.fillText(texto, itemX, itemY);
                } else if (efecto === 'glitch') {
                    ctx.fillStyle = 'cyan'; ctx.fillText(texto, itemX - (intensidad * 0.4), itemY);
                    ctx.fillStyle = 'magenta'; ctx.fillText(texto, itemX + (intensidad * 0.4), itemY);
                    ctx.fillStyle = baseFillStyle; ctx.fillText(texto, itemX, itemY);
                } else if (efecto === 'arcoiris') {
                    // Efecto Arcoíris con ROTACIÓN de colores basada en intensidad
                    const gradient = ctx.createLinearGradient(itemX, 0, itemX + ctx.measureText(texto).width, 0);
                    // Usamos HSL para rotar el matiz (hue) según la intensidad (0 a 360 grados)
                    const shift = (intensidad - 1) * 18; // 20 pasos * 18 = 360 grados aprox
                    for (let i = 0; i <= 10; i++) {
                        const p = i / 10;
                        const hue = (p * 360 + shift) % 360;
                        gradient.addColorStop(p, `hsl(${hue}, 100%, 50%)`);
                    }
                    ctx.fillStyle = gradient; ctx.fillText(texto, itemX, itemY);
                    ctx.lineWidth = 0.5; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.strokeText(texto, itemX, itemY);
                } else if (efecto === 'brillo') {
                    // Resplandor Mágico (Blanco/Dorado exterior)
                    ctx.shadowColor = "white"; ctx.shadowBlur = intensidad * 2; 
                    ctx.fillStyle = baseFillStyle; ctx.fillText(texto, itemX, itemY);
                    // Reforzar el texto encima
                    ctx.shadowBlur = 0; ctx.fillText(texto, itemX, itemY);
                } else if (efecto === 'comic') {
                    ctx.strokeStyle = 'black'; ctx.lineWidth = Math.max(1, intensidad); ctx.lineJoin = 'round';
                    ctx.strokeText(texto, itemX, itemY); 
                    ctx.fillStyle = baseFillStyle; ctx.fillText(texto, itemX, itemY);
                } else if (efecto === 'gold') {
                    // Efecto Metálico Variable según Intensidad
                    const gradient = ctx.createLinearGradient(itemX, itemY - fontSize/2, itemX, itemY + fontSize/2);
                    
                    if (intensidad <= 5) {
                        // Oro Clásico
                        gradient.addColorStop(0, "#FDB931"); gradient.addColorStop(0.3, "#FFFFAC");
                        gradient.addColorStop(0.6, "#D19C1D"); gradient.addColorStop(1, "#C58808");
                        ctx.strokeStyle = '#8a6e2f';
                    } else if (intensidad <= 10) {
                        // Plata / Acero
                        gradient.addColorStop(0, "#E0E0E0"); gradient.addColorStop(0.3, "#FFFFFF");
                        gradient.addColorStop(0.6, "#A0A0A0"); gradient.addColorStop(1, "#505050");
                        ctx.strokeStyle = '#404040';
                    } else if (intensidad <= 15) {
                        // Bronce / Cobre
                        gradient.addColorStop(0, "#e8c39e"); gradient.addColorStop(0.3, "#ffdfc4");
                        gradient.addColorStop(0.6, "#cd7f32"); gradient.addColorStop(1, "#8c5620");
                        ctx.strokeStyle = '#6e4115';
                    } else {
                        // Oro Rosa
                        gradient.addColorStop(0, "#F6D3C5"); gradient.addColorStop(0.3, "#FFF0E8");
                        gradient.addColorStop(0.6, "#D69E8E"); gradient.addColorStop(1, "#B57B6A");
                        ctx.strokeStyle = '#8a5a4a';
                    }

                    ctx.fillStyle = gradient; ctx.fillText(texto, itemX, itemY);
                    ctx.lineWidth = 1; ctx.strokeText(texto, itemX, itemY);
                } else {
                    ctx.fillStyle = baseFillStyle;
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

        dibujarElementoTexto('nombre', nombre, inputColorNombre, fuenteNombre, inputTamanoNombre, selectEfectoTextoNombre, inputIntensidadEfectoNombre, checkArcoirisNombre, inputShiftArcoirisNombre, checkMetalNombre, inputTipoMetalNombre);
        dibujarElementoTexto('apellido', apellido, inputColorNombre, fuenteNombre, inputTamanoNombre, selectEfectoTextoNombre, inputIntensidadEfectoNombre, checkArcoirisNombre, inputShiftArcoirisNombre, checkMetalNombre, inputTipoMetalNombre);
        dibujarElementoTexto('grado', grado, inputColorGrado, fuenteGrado, inputTamanoGrado, selectEfectoTextoGrado, inputIntensidadEfectoGrado, checkArcoirisGrado, inputShiftArcoirisGrado, checkMetalGrado, inputTipoMetalGrado, true);

        ctx.restore();

        // Dibujar Borde
        ctx.save();
        
        // 1. Determinar Color/Relleno del Borde
        let strokeStyle = colorBorde;
        if (checkArcoirisBorde) {
             const gradient = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
             const shift = parseInt(inputShiftArcoirisBorde || 0, 10);
             for (let i = 0; i <= 10; i++) {
                const p = i / 10;
                const hue = (p * 360 + shift) % 360;
                gradient.addColorStop(p, `hsl(${hue}, 100%, 50%)`);
             }
             strokeStyle = gradient;
        } else if (checkMetalBorde) {
             const gradient = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
             const type = parseInt(inputTipoMetalBorde || 0, 10);
             if (type === 0) { // Oro
                gradient.addColorStop(0, "#FDB931"); gradient.addColorStop(0.3, "#FFFFAC"); gradient.addColorStop(0.6, "#D19C1D"); gradient.addColorStop(1, "#C58808");
            } else if (type === 1) { // Plata
                gradient.addColorStop(0, "#E0E0E0"); gradient.addColorStop(0.3, "#FFFFFF"); gradient.addColorStop(0.6, "#A0A0A0"); gradient.addColorStop(1, "#505050");
            } else if (type === 2) { // Bronce
                gradient.addColorStop(0, "#e8c39e"); gradient.addColorStop(0.3, "#ffdfc4"); gradient.addColorStop(0.6, "#cd7f32"); gradient.addColorStop(1, "#8c5620");
            } else { // Rosa
                gradient.addColorStop(0, "#F6D3C5"); gradient.addColorStop(0.3, "#FFF0E8"); gradient.addColorStop(0.6, "#D69E8E"); gradient.addColorStop(1, "#B57B6A");
            }
             strokeStyle = gradient;
        }

        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = grosorBorde;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const inset = grosorBorde / 2;
        
        const trazarPath = (insetVal) => {
            ctx.beginPath();
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

        // Función auxiliar para dibujar el estilo (Forma)
        const dibujarEstilo = (baseInset, baseWidth, colorOverride = null) => {
            ctx.save();
            if (colorOverride) ctx.strokeStyle = colorOverride;
            ctx.lineWidth = baseWidth;
            
            if (estiloBorde === 'punteado') {
                ctx.setLineDash([0, baseWidth * 2]);
                ctx.lineCap = 'round';
                trazarPath(baseInset);
                ctx.stroke();
            } else if (estiloBorde === 'dashed') {
                ctx.setLineDash([baseWidth * 3, baseWidth * 2]);
                ctx.lineCap = 'butt';
                trazarPath(baseInset);
                ctx.stroke();
            } else if (estiloBorde === 'doble') {
                ctx.setLineDash([]);
                trazarPath(baseInset);
                ctx.stroke();
                // Línea interna
                const inset2 = baseInset + baseWidth * 1.5;
                ctx.lineWidth = baseWidth * 0.5;
                trazarPath(inset2);
                ctx.stroke();
            } else if (estiloBorde === 'sketch') {
                ctx.setLineDash([]);
                // Línea principal
                trazarPath(baseInset);
                ctx.stroke();
                // Líneas "mal dibujadas" para efecto boceto
                ctx.lineWidth = baseWidth * 0.5;
                ctx.translate(1.5, 1.5);
                trazarPath(baseInset);
                ctx.stroke();
                ctx.translate(-3, -1);
                trazarPath(baseInset);
                ctx.stroke();
            } else if (estiloBorde === 'vintage') {
                ctx.setLineDash([]);
                // Marco grueso
                trazarPath(baseInset);
                ctx.stroke();
                // Línea fina interna decorativa
                ctx.lineWidth = 1;
                const insetInner = baseInset + baseWidth + 2;
                trazarPath(insetInner);
                ctx.stroke();
            } else {
                // Simple
                ctx.setLineDash([]);
                trazarPath(baseInset);
                ctx.stroke();
            }
            ctx.restore();
        };

        // 2. Aplicar Efectos (que llaman a dibujarEstilo)
        const efecto = selectEfectoBorde || 'ninguno';
        const intensidadBorde = parseInt(inputIntensidadEfectoBorde || 5, 10);

        if (efecto === 'sombra_hard') {
            // Sombra sólida desplazada (Pop Art)
            ctx.save();
            ctx.translate(intensidadBorde, intensidadBorde);
            dibujarEstilo(inset, grosorBorde, 'rgba(0,0,0,0.3)'); 
            ctx.restore();
            dibujarEstilo(inset, grosorBorde);
        } else if (efecto === 'sombra_soft') {
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = intensidadBorde * 2;
            ctx.shadowOffsetX = 5;
            ctx.shadowOffsetY = 5;
            dibujarEstilo(inset, grosorBorde);
            ctx.restore();
        } else if (efecto === 'neon') {
            ctx.save();
            ctx.shadowColor = (checkArcoirisBorde || checkMetalBorde) ? '#ffffff' : colorBorde;
            ctx.shadowBlur = 15 + intensidadBorde;
            dibujarEstilo(inset, grosorBorde);
            // Núcleo blanco
            ctx.shadowBlur = 0;
            dibujarEstilo(inset, grosorBorde * 0.3, 'rgba(255,255,255,0.8)');
            ctx.restore();
        } else if (efecto === 'glow') {
            ctx.save();
            ctx.shadowColor = (checkArcoirisBorde || checkMetalBorde) ? '#ffffff' : colorBorde;
            ctx.shadowBlur = intensidadBorde * 3;
            dibujarEstilo(inset, grosorBorde);
            ctx.restore();
        } else {
            dibujarEstilo(inset, grosorBorde);
        }

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
