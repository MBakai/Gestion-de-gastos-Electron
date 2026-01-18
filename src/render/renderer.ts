import { SistemaContable } from "./sistema-contable.js";
import { AuthController } from "./auth.controller.js";
import { MaintenanceController } from "./maintenance.controller.js";

// Estado global simple para persistencia entre vistas
(window as any).appState = {
  currentEmpleadoId: null as number | null
};

async function loadComponents() {
  const container = document.getElementById("modal-container");
  if (!container) return;

  const components = [
    "components/confirmModal.html",
    "components/alertModal.html",
    "components/editGastoModal.html",
    "components/confirmLogout.html",
    "components/maintenanceModal.html"
  ];

  try {
    for (const comp of components) {
      if (!document.getElementById(comp.split('/').pop()!.replace('.html', ''))) {
        const res = await fetch(comp);
        if (res.ok || res.status === 0) {
          const html = await res.text();
          const div = document.createElement("div");
          div.innerHTML = html.trim();
          if (div.firstElementChild) {
            container.appendChild(div.firstElementChild);
          }
        }
      }
    }
  } catch (err) {
  }
}

async function loadView(view: string, id?: number) {
  try {
    const res = await fetch(view);
    if (!res.ok && res.status !== 0) throw new Error(`HTTP error! status: ${res.status}`);

    const html = await res.text();
    const content = document.getElementById("content");
    if (!content) throw new Error("No se encontró el contenedor #content");

    content.innerHTML = html;

    // Inicializar controladores específicos
    if (view.includes("login.html")) {
      new AuthController();
    } else if (html.includes('data-controller="SistemaContable"')) {
      new SistemaContable();
    }
  } catch (err) {
    const content = document.getElementById("content");
    if (content) {
      content.innerHTML = `<div class="alert alert-danger">Error cargando vista: ${err}</div>`;
    }
  }
}

// Cargar vista inicial
window.addEventListener('DOMContentLoaded', async () => {
  await loadComponents();

  const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";
  const navbar = document.getElementById("mainNavbar");

  if (!isLoggedIn) {
    navbar?.classList.add("d-none");
    loadView("login.html");
  } else {
    navbar?.classList.remove("d-none");
    setupLogout();
    setupMantenimiento();
    loadView("index.html");
  }
});

function setupLogout() {
  const btn = document.getElementById("btnLogout");
  const confirmModalEl = document.getElementById('confirmLogout');
  const btnConfirmar = document.getElementById('btnLogoutConfirm');

  if (btn && confirmModalEl && btnConfirmar) {
    // @ts-ignore
    const modal = new bootstrap.Modal(confirmModalEl);

    btn.onclick = (e) => {
      e.preventDefault();
      modal.show();
    };

    btnConfirmar.onclick = () => {
      sessionStorage.removeItem("isLoggedIn");
      modal.hide();
      window.location.reload();
    };
  } else if (btn) {
    // Fallback si el modal no se cargó correctamente
    btn.onclick = (e) => {
      e.preventDefault();
      if (confirm("¿Cerrar sesión?")) {
        sessionStorage.removeItem("isLoggedIn");
        window.location.reload();
      }
    };
  }
}

function setupMantenimiento() {
  const lnk = document.getElementById('lnkMantenimiento');
  const modalEl = document.getElementById('maintenanceModal');
  if (lnk && modalEl) {
    new MaintenanceController();
    // @ts-ignore
    const modal = new bootstrap.Modal(modalEl);
    lnk.onclick = (e) => {
      e.preventDefault();
      modal.show();
    };
  }
}

// Manejo de navegación (clicks en enlaces)
document.addEventListener("click", (e) => {
  const target = (e.target as HTMLElement).closest("[data-view]");
  if (target) {
    const view = target.getAttribute("data-view");
    if (view) {
      e.preventDefault();
      loadView(view);

      // Cerrar el menú colapsable de Bootstrap si está abierto (móvil)
      const navbarCollapse = document.getElementById("navbarNav");
      if (navbarCollapse && navbarCollapse.classList.contains("show")) {
        // @ts-ignore
        const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
        if (bsCollapse) bsCollapse.hide();
        else navbarCollapse.classList.remove("show");
      }
    }
  }
});

// Listener para navegación programática (desde controladores)
document.addEventListener("navegar", (e: any) => {
  const { vista, id } = e.detail;
  loadView(vista, id);
});
