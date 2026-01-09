// js/pdf-generator.js
import { mmToPx, PLANTILLAS } from './config.js';

export class PDFGenerator {
    async generarPDF(state, renderer) {
        await renderer.render(state, true);

        const boton = document.getElementById('boton-descargar-pdf');
        const textoOriginal = boton.textContent;
        boton.textContent = 'Generando PDF...';
        boton.disabled = true;

        const plantilla = PLANTILLAS[state.selectPlantilla];
        const dataURL = renderer.canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        const margen_mm = (plantilla.is_combo || plantilla.margin_mm) ? (plantilla.margin_mm || 5) : 10;
        const anchoPagina_mm = 210;
        const altoPagina_mm = 297;
        
        let x = margen_mm;
        let y = margen_mm;

        if (plantilla.is_combo) {
            const areaCuaderno = plantilla.areas[0];
            const areaLapiz = plantilla.areas[1];

            const recortarEtiqueta = (area) => {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = mmToPx(area.w_mm);
                tempCanvas.height = mmToPx(area.h_mm);
                const tCtx = tempCanvas.getContext('2d');
                tCtx.drawImage(renderer.canvas, 
                    mmToPx(area.x_mm), mmToPx(area.y_mm), mmToPx(area.w_mm), mmToPx(area.h_mm), 
                    0, 0, tempCanvas.width, tempCanvas.height
                );
                return tempCanvas.toDataURL('image/png');
            };

            const imgCuaderno = recortarEtiqueta(areaCuaderno);
            const imgLapiz = recortarEtiqueta(areaLapiz);
            const espaciado = 0.5;

            const rowsMain = plantilla.pdf_rows || 4;
            const colsMain = plantilla.pdf_cols || 3;

            for (let row = 0; row < rowsMain; row++) {
                for (let col = 0; col < colsMain; col++) {
                    if (y + areaCuaderno.h_mm > altoPagina_mm) break;
                    doc.addImage(imgCuaderno, 'PNG', x, y, areaCuaderno.w_mm, areaCuaderno.h_mm);
                    x += areaCuaderno.w_mm + espaciado;
                }
                x = margen_mm;
                y += areaCuaderno.h_mm + espaciado;
            }

            y += 1;
            while (y < altoPagina_mm - areaLapiz.h_mm) {
                while (x + areaLapiz.w_mm <= anchoPagina_mm - margen_mm) {
                    doc.addImage(imgLapiz, 'PNG', x, y, areaLapiz.w_mm, areaLapiz.h_mm);
                    x += areaLapiz.w_mm + espaciado;
                }
                x = margen_mm;
                y += areaLapiz.h_mm + espaciado;
            }
        } else {
            while (y < altoPagina_mm - plantilla.height_mm) {
                while (x + plantilla.width_mm <= anchoPagina_mm - margen_mm) {
                    doc.addImage(dataURL, 'PNG', x, y, plantilla.width_mm, plantilla.height_mm);
                    x += plantilla.width_mm + 2;
                }
                x = margen_mm;
                y += plantilla.height_mm + 2;
            }
        }

        // Construir nombre de archivo personalizado
        const nombreArchivo = state.inputNombre ? `${state.inputNombre}-${state.inputApellido || ''}` : 'Rotulandia';
        // Limpiar caracteres no válidos para nombres de archivo y agregar marca
        doc.save(`${nombreArchivo.replace(/[^a-z0-9]/gi, '_')}-Rotulandia.com.ar.pdf`);
        boton.textContent = textoOriginal;
        boton.disabled = false;
        await renderer.render(state, false);
    }

    async descargarPNG(renderer, state) {
        await renderer.render(state, true);
        const link = document.createElement('a');
        
        // Construir nombre de archivo personalizado
        const nombreArchivo = state.inputNombre ? `${state.inputNombre}-${state.inputApellido || ''}` : 'Rotulandia';
        link.download = `${nombreArchivo.replace(/[^a-z0-9]/gi, '_')}-Rotulandia.com.ar.png`;
        link.href = renderer.canvas.toDataURL('image/png');
        link.click();
        await renderer.render(state, false);
    }
}
