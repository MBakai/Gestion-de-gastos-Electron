declare var bootstrap: any;

export class MaintenanceController {
    constructor() {
        this.setupListeners();
    }

    private setupListeners(): void {
        const btnEjecutar = document.getElementById('btnEjecutarMantenimiento');
        if (btnEjecutar) {
            btnEjecutar.addEventListener('click', () => this.ejecutarMantenimiento());
        }
    }

    private async ejecutarMantenimiento(): Promise<void> {
        const nickInput = document.getElementById('maintNickname') as HTMLInputElement;
        const passInput = document.getElementById('maintPassword') as HTMLInputElement;
        const statusEl = document.getElementById('maintStatus');
        const btnEjecutar = document.getElementById('btnEjecutarMantenimiento') as HTMLButtonElement;

        if (!nickInput || !passInput || !statusEl || !btnEjecutar) return;

        const nickname = nickInput.value.trim();
        const password = passInput.value.trim();

        if (!nickname || !password) {
            this.showStatus('Por favor ingresa nickname y contraseña.', 'alert-danger');
            return;
        }

        try {
            btnEjecutar.disabled = true;
            btnEjecutar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Procesando...';

            this.showStatus('Iniciando mantenimiento (respaldo, limpieza y optimización)...', 'alert-info');

            const result = await window.electronAPI.ejecutarMantenimiento(nickname, password);

            if (result.success) {
                this.showStatus(result.message, 'alert-success');
                nickInput.value = '';
                passInput.value = '';
                // @ts-ignore
                setTimeout(() => {
                    const modalEl = document.getElementById('maintenanceModal');
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    modal?.hide();
                }, 5000);
            } else {
                this.showStatus(result.message, 'alert-danger');
            }
        } catch (error: any) {
            console.error('❌ Error mantenimiento UI:', error);
            this.showStatus('Error de comunicación con el sistema.', 'alert-danger');
        } finally {
            btnEjecutar.disabled = false;
            btnEjecutar.innerHTML = '🚀 Iniciar Limpieza';
        }
    }

    private showStatus(msg: string, cls: string): void {
        const statusEl = document.getElementById('maintStatus');
        if (!statusEl) return;
        statusEl.className = `alert py-2 small border-0 mb-0 ${cls}`;
        statusEl.innerHTML = msg;
        statusEl.classList.remove('d-none');
    }
}
