export function toTitleCase(str: string): string {
    if (!str) return "";
    return str
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

// Validaciones
export function validarDNI(dni: number): boolean {
    if (!dni || isNaN(dni)) return false;
    const dniStr = dni.toString();
    return dniStr.length >= 6 && dniStr.length <= 10;
}

export function validarTelefono(tel: number): boolean {
    if (!tel || isNaN(tel)) return false;
    const telStr = tel.toString();
    return telStr.length >= 7 && telStr.length <= 15;
}

export function validarMonto(monto: number): boolean {
    return !isNaN(monto) && monto >= 0 && monto < 1000000000;
}

export function validarEdad(edad: number): boolean {
    return !isNaN(edad) && edad > 0 && edad <= 100;
}

// Utilidades de fecha
export function obtenerFechaHoy(): string {
    // Usar fecha local para evitar problemas de zona horaria
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function formatearFechaParaDB(fecha: Date): string {
    return fecha.toISOString();
}

// Configurar input de fecha con valor por defecto y restricción de fecha máxima
export function configurarInputFecha(inputId: string, valorPorDefecto: boolean = true): void {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (input) {
        const fechaHoy = obtenerFechaHoy();
        input.setAttribute('max', fechaHoy);
        if (valorPorDefecto && !input.value) {
            input.value = fechaHoy;
        }
    }
}

// Helper compartido para modales
declare var bootstrap: any;

export class ModalHelper {
    static mostrarAlerta(titulo: string, mensaje: string): void {
        const modalEl = document.getElementById("alertModal");
        const titleEl = document.getElementById("alertModalTitle");
        const bodyEl = document.getElementById("alertModalBody");

        if (modalEl && titleEl && bodyEl) {
            titleEl.textContent = titulo;
            bodyEl.innerHTML = mensaje;
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        }
    }

    static mostrarConfirmacion(titulo: string, mensaje: string, onConfirm: () => void): void {
        const modalEl = document.getElementById("confirmModal");
        const titleEl = document.getElementById("confirmModalTitle");
        const bodyEl = document.getElementById("confirmModalBody");
        const btnEl = document.getElementById("confirmModalBtn");

        if (modalEl && titleEl && bodyEl && btnEl) {
            titleEl.textContent = titulo;
            bodyEl.innerHTML = mensaje;

            // Reemplazar el botón para limpiar listeners previos
            const newBtn = btnEl.cloneNode(true) as HTMLButtonElement;
            btnEl.parentNode?.replaceChild(newBtn, btnEl);

            newBtn.addEventListener("click", () => {
                onConfirm();
                const modal = bootstrap.Modal.getInstance(modalEl);
                modal?.hide();
            });

            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        }
    }
}
