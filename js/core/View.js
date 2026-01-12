export class View {
    constructor(params) {
        this.params = params;
    }

    setTitle(title) {
        document.title = `${title} - Rotulandia`;
    }

    async getHtml() { return ""; }

    async mount() { } // Se llama al entrar

    async unmount() { } // Se llama al salir (limpieza)
}