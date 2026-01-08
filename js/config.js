// js/config.js
export const DPI = 300;

export const mmToPx = (mm) => (mm / 25.4) * DPI;

export const PLANTILLAS = {
    'cuaderno': {
        nombre: 'Cuaderno / Carpeta',
        width_mm: 65,  // 6.5 cm de ancho
        height_mm: 45, // 4.5 cm de alto
        margin_mm: 5,  // Margen reducido para que entren 3 por fila
        layout: (w, h) => ({
            personaje: { x: w * 0.02, y: h * 0.1, w: h * 0.8, h: h * 0.8 },
            nombre: { x: w * 0.42, y: h * 0.35, fontSizeBase: h * 0.22 },
            apellido: { x: w * 0.42, y: h * 0.55, fontSizeBase: h * 0.22 },
            grado: { x: w * 0.42, y: h * 0.75, fontSizeBase: h * 0.18 }
        })
    },
    'lapiz': {
        nombre: 'Lápiz',
        width_mm: 48, // 4.8 cm para que entren 4 columnas
        height_mm: 30, // 3 cm de alto
        margin_mm: 5,
        layout: (w, h) => ({
            personaje: { x: w * 0.05, y: h * 0.1, w: h * 0.8, h: h * 0.8 },
            nombre: { x: w * 0.4, y: h * 0.35, fontSizeBase: h * 0.2 },
            apellido: { x: w * 0.4, y: h * 0.55, fontSizeBase: h * 0.2 },
            grado: { x: w * 0.4, y: h * 0.75, fontSizeBase: h * 0.15 }
        })
    },
    'mix_cuaderno_lapiz': {
        nombre: 'Combo: Cuaderno + Lápices',
        width_mm: 80,
        height_mm: 90,
        is_combo: true,
        pdf_rows: 3,
        pdf_cols: 3,
        areas: [
            { type: 'cuaderno', x_mm: 5, y_mm: 5, w_mm: 65, h_mm: 45 },
            { type: 'lapiz', x_mm: 15, y_mm: 55, w_mm: 48, h_mm: 30 }
        ],
        layout: (w, h) => {
            return {
                personaje: { x: w * 0.05, y: h * 0.05, w: h * 0.2, h: h * 0.2 },
                nombre: [
                    { x: mmToPx(5 + 65 * 0.42), y: mmToPx(5 + 45 * 0.35), fontSizeBase: mmToPx(45 * 0.22) },
                    { x: mmToPx(15 + 48 * 0.4), y: mmToPx(55 + 30 * 0.35), fontSizeBase: mmToPx(30 * 0.2) }
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

export const PERSONAJES = ['laBubu.png', 'stitch.png', 'spiderman.png'];
