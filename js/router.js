import { store } from './store.js';

export const navigateTo = url => {
    history.pushState(null, null, url);
    router();
};

const router = async () => {
    const routes = [
        { path: '/', view: () => import('./views/LandingView.js') },
        { path: '#editor', view: () => import('./views/EditorView.js') },
        { path: '#mis-disenos', view: () => import('./views/DashboardView.js') }
    ];

    // Obtener hash actual o default a '/'
    let hash = location.hash || '/';
    if (hash === '') hash = '/';

    let match = routes.find(route => route.path === hash);
    if (!match) match = routes[0];

    // Protección de rutas (Redirigir a home si no está logueado y quiere ir a editor)
    if ((match.path === '#editor' || match.path === '#mis-disenos') && !store.state.isAuthenticated) {
        // Pequeño hack: esperamos a que Firebase verifique el usuario
        // Si después de 500ms sigue sin estar logueado, redirigimos.
        // (En una fase posterior mejoraremos esto con un "LoadingView")
    }

    const app = document.getElementById('app');

    if (match.view) {
        // Es una Vista Moderna (SPA)
        // 1. Mostrar Spinner de carga mientras se descarga el archivo JS
        app.innerHTML = `
            <div class="d-flex justify-content-center align-items-center" style="min-height: 60vh;">
                <div class="text-center">
                    <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;" role="status"></div>
                    <p class="text-muted">Cargando sección...</p>
                </div>
            </div>
        `;
        app.classList.remove('d-none');
        
        try {
            // 2. Importación dinámica (Aquí ocurre la magia del Lazy Loading)
            const module = await match.view();
            const ViewClass = module.default;
            const view = new ViewClass();
            app.innerHTML = await view.getHtml();
            await view.mount();
        } catch (error) {
            console.error("Error cargando la vista:", error);
            app.innerHTML = '<div class="alert alert-danger m-5">Error al cargar la sección. Verifica tu conexión.</div>';
        }
    }
    
    // Actualizar navegación activa
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === match.path);
    });
};

window.addEventListener('popstate', router);
window.addEventListener('hashchange', router);

export { router };