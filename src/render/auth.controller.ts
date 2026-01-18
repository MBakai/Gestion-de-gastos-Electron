/// <reference path="../interfaces/electron.d.ts" />
// src/render/auth.controller.ts
declare var bootstrap: any;

export class AuthController {
    constructor() {
        this.init();
    }

    private async init() {
        const existe = await window.electronAPI.existeUsuario();
        const loginForm = document.getElementById("loginForm");
        const registerForm = document.getElementById("registerForm");
        const authSubtitle = document.getElementById("authSubtitle");

        if (!existe) {
            loginForm?.classList.add("d-none");
            registerForm?.classList.remove("d-none");
            if (authSubtitle) authSubtitle.textContent = "Configura tu acceso inicial";
            this.setupRegister();
        } else {
            this.setupLogin();
            this.setupRecovery();
        }
    }

    private setupRegister() {
        const btn = document.getElementById("btnRegistrarAdmin");
        btn?.addEventListener("click", async () => {
            const nick = (document.getElementById("regNick") as HTMLInputElement).value.trim();
            const pass = (document.getElementById("regPass") as HTMLInputElement).value.trim();
            const pregunta = (document.getElementById("regPregunta") as HTMLSelectElement).value;
            const respuesta = (document.getElementById("regRespuesta") as HTMLInputElement).value.trim();

            if (nick.length < 3 || pass.length < 8 || !pregunta || !respuesta) {
                this.mostrarAlerta("Campos Requeridos", "Por favor completa todos los campos. La contraseña debe tener al menos 8 caracteres.");
                return;
            }

            const ok = await window.electronAPI.registrarUsuario(nick, pass, pregunta, respuesta);
            if (ok) {
                sessionStorage.setItem("isLoggedIn", "true");
                window.location.reload();
            }
        });
    }

    private setupLogin() {
        const btn = document.getElementById("btnEntrar");
        const inputPass = document.getElementById("loginPass") as HTMLInputElement;

        const handleLogin = async () => {
            const nick = (document.getElementById("loginNick") as HTMLInputElement).value.trim();
            const pass = inputPass.value.trim();

            if (!nick || !pass) return;

            const ok = await window.electronAPI.login(nick, pass);
            if (ok) {
                sessionStorage.setItem("isLoggedIn", "true");
                window.location.reload();
            } else {
                this.mostrarAlerta("Acceso Denegado", "Usuario o contraseña incorrectos.");
            }
        };

        btn?.addEventListener("click", handleLogin);
        inputPass?.addEventListener("keypress", (e) => {
            if (e.key === "Enter") handleLogin();
        });
    }

    private setupRecovery() {
        const lnk = document.getElementById("lnkRecuperar");
        const btnBack = document.getElementById("btnBackToLogin");
        const loginForm = document.getElementById("loginForm");
        const recoveryForm = document.getElementById("recoveryForm");
        const txtPregunta = document.getElementById("txtPregunta");

        lnk?.addEventListener("click", async () => {
            const pregunta = await window.electronAPI.obtenerPregunta();
            if (pregunta && txtPregunta) {
                txtPregunta.textContent = pregunta;
                loginForm?.classList.add("d-none");
                recoveryForm?.classList.remove("d-none");
            }
        });

        btnBack?.addEventListener("click", () => {
            recoveryForm?.classList.add("d-none");
            loginForm?.classList.remove("d-none");
        });

        // Verificar respuesta
        const btnVerificar = document.getElementById("btnVerificarRespuesta");
        btnVerificar?.addEventListener("click", async () => {
            const resp = (document.getElementById("recoveryAnswer") as HTMLInputElement).value.trim();
            const ok = await window.electronAPI.verificarRecuperacion(resp);

            if (ok) {
                document.getElementById("step1Recovery")?.classList.add("d-none");
                document.getElementById("step2Recovery")?.classList.remove("d-none");
            } else {
                this.mostrarAlerta("Validación Fallida", "La respuesta no es correcta. Inténtalo de nuevo.");
            }
        });

        // Reset password
        const btnReset = document.getElementById("btnResetPass");
        btnReset?.addEventListener("click", async () => {
            const nuevaPass = (document.getElementById("newPass") as HTMLInputElement).value.trim();
            if (nuevaPass.length < 8) {
                this.mostrarAlerta("Error", "La nueva contraseña debe tener al menos 8 caracteres.");
                return;
            }

            const ok = await window.electronAPI.resetPassword(nuevaPass);
            if (ok) {
                sessionStorage.setItem("isLoggedIn", "true");
                window.location.reload();
            }
        });
    }

    private mostrarAlerta(titulo: string, mensaje: string): void {
        const modalEl = document.getElementById("alertModal");
        const titleEl = document.getElementById("alertModalTitle");
        const bodyEl = document.getElementById("alertModalBody");

        if (modalEl && titleEl && bodyEl) {
            titleEl.textContent = titulo;
            bodyEl.innerHTML = mensaje;
            // @ts-ignore
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        }
    }
}
