export class Modal {
    static confirm(titulo, mensaje, icono = '❓', textoConfirmar = 'Sí, continuar') {
        return new Promise((resolve) => {
            const modalEl = document.getElementById('confirmationModal');
            if (!modalEl) {
                // Fallback si no existe el modal en el HTML
                resolve(confirm(mensaje.replace(/<[^>]*>?/gm, ''))); 
                return;
            }
            const modal = new bootstrap.Modal(modalEl);
            
            document.getElementById('confirmTitle').textContent = titulo;
            document.getElementById('confirmMessage').innerHTML = mensaje;
            document.getElementById('confirmIcon').textContent = icono;
            
            document.getElementById('confirmButtons').style.display = 'grid';
            document.getElementById('alertButtons').style.display = 'none';
            
            const btnConfirm = document.getElementById('btnConfirmAction');
            btnConfirm.textContent = textoConfirmar;
            
            // Clonar botón para eliminar listeners viejos
            const newBtn = btnConfirm.cloneNode(true);
            btnConfirm.parentNode.replaceChild(newBtn, btnConfirm);
            
            newBtn.addEventListener('click', () => {
                modal.hide();
                resolve(true);
            });
            
            modalEl.addEventListener('hidden.bs.modal', () => {
                resolve(false);
            }, { once: true });
            
            modal.show();
        });
    }

    static alert(titulo, mensaje, icono = 'ℹ️') {
        const modalEl = document.getElementById('confirmationModal');
        if (!modalEl) {
            alert(mensaje.replace(/<[^>]*>?/gm, ''));
            return;
        }
        const modal = new bootstrap.Modal(modalEl);
        document.getElementById('confirmTitle').textContent = titulo;
        document.getElementById('confirmMessage').innerHTML = mensaje;
        document.getElementById('confirmIcon').textContent = icono;
        document.getElementById('confirmButtons').style.display = 'none';
        document.getElementById('alertButtons').style.display = 'grid';
        modal.show();
    }
}
