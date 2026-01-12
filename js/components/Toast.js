export class Toast {
    static show(titulo, mensaje, tipo = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        let icon = 'ℹ️';
        let headerClass = 'text-primary';
        if (tipo === 'success') { icon = '✅'; headerClass = 'text-success'; }
        if (tipo === 'error') { icon = '❌'; headerClass = 'text-danger'; }
        if (tipo === 'warning') { icon = '⚠️'; headerClass = 'text-warning'; }

        const toastHtml = `
            <div class="toast show fade border-0 shadow-lg rounded-3 mb-3" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header border-0 bg-white rounded-top-3">
                    <span class="me-2 fs-5">${icon}</span>
                    <strong class="me-auto ${headerClass}">${titulo}</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body bg-white rounded-bottom-3 pt-0 text-secondary">
                    ${mensaje}
                </div>
            </div>
        `;
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = toastHtml.trim();
        const toastEl = tempDiv.firstChild;
        
        container.appendChild(toastEl);
        
        // Auto eliminar después de 4 segundos
        setTimeout(() => {
            toastEl.classList.remove('show');
            setTimeout(() => toastEl.remove(), 500);
        }, 4000);
    }
}
