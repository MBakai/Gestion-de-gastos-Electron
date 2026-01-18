/// <reference path="../interfaces/electron.d.ts" />
import { Empleado } from "../interfaces/empleado.js";
import { validarDNI, validarTelefono, validarEdad, toTitleCase, ModalHelper } from "./utils.js";

declare var bootstrap: any;


export class EmpleadosController {

  private empleados: Empleado[] = [];

  constructor() {
    this.inicializarEscuchaDetalle();
    this.inicializarEscuchaBusqueda();
  }

  private inicializarEscuchaBusqueda(): void {
    const inputBusqueda = document.getElementById("buscarEmpleado");
    if (inputBusqueda) {
      inputBusqueda.addEventListener("input", (e) => {
        const valor = (e.target as HTMLInputElement).value;
        this.renderSelectEmpleados(valor);
      });
    }
  }

  private inicializarEscuchaDetalle(): void {
    const view = document.getElementById("viewDetalleEmpleado");
    if (view) {
      this.cargarDetalle();
    }
  }


  async cargar(): Promise<void> {
    try {
      const data = await window.electronAPI.obtenerEmpleados();
      this.empleados.length = 0; // Vaciar array manteniendo la referencia
      this.empleados.push(...data);
      this.renderSelectEmpleados();

    } catch (error) {
      console.error("Error al cargar empleados:", error);
    }
  }

  async agregarEmpleado(): Promise<void> {

    const DNI = Number(this.obtenerValorInput("DNI", "Por favor ingrese el número de identificación"));
    let nombre = this.obtenerValorInput("nombre", "Por favor ingrese un nombre");
    let apellido = this.obtenerValorInput("apellido", "Por favor ingrese un apellido");
    const tel = Number(this.obtenerValorInput("tel", "Por favor ingrese un número de teléfono"));
    let address = this.obtenerValorInput("address", "Por favor ingrese la dirección del empleado");
    const edad = Number(this.obtenerValorInput("edad", "Por favor ingrese la edad del empleado"));

    if (!DNI || !nombre || !apellido || !tel || !address || !edad) return;

    // Validaciones
    if (!validarDNI(DNI)) {
      this.mostrarAlerta("DNI No Válido", "El DNI debe tener entre 6 y 10 dígitos.");
      return;
    }

    if (!validarTelefono(tel)) {
      this.mostrarAlerta("Teléfono No Válido", "El teléfono debe tener entre 7 y 15 dígitos.");
      return;
    }

    if (!validarEdad(edad)) {
      this.mostrarAlerta("Edad No Válida", "La edad debe estar entre 1 y 100 años.");
      return;
    }

    const dniExiste = await window.electronAPI.verificarDNI(DNI);
    if (dniExiste) {
      this.mostrarAlerta("Identificación Duplicada", `Ya existe un empleado registrado con el DNI: <strong>${DNI}</strong>.`);
      return;
    }

    // Formateo
    nombre = toTitleCase(nombre);
    apellido = toTitleCase(apellido);
    address = toTitleCase(address);

    try {
      const nuevoEmpleado = await window.electronAPI.agregarEmpleado({ DNI, nombre, apellido, tel, address, edad });
      this.empleados.push(nuevoEmpleado);

      this.mostrarAlerta("Éxito", `Empleado <strong>${nombre} ${apellido}</strong> agregado correctamente.`);

      // Si estamos en la vista de registro (no en detalle), redirigir al listado
      if (!document.getElementById("viewDetalleEmpleado")) {
        setTimeout(() => {
          const btnInicio = document.querySelector('[data-view="index.html"]') as HTMLElement;
          if (btnInicio) btnInicio.click();
        }, 1500);
      } else {
        const form = document.querySelector("form");
        if (form) form.reset();
      }

    } catch (error) {
      this.mostrarAlerta("Error", "No se pudo agregar el empleado: " + error);
    }
  }

  async cargarDetalle(): Promise<void> {
    const id = (window as any).appState.currentEmpleadoId;
    if (!id) return;

    try {
      // Necesitamos una forma de obtener un solo empleado. 
      // Por ahora lo buscaremos en la lista cargada o pediremos todos.
      await this.cargar();
      const emp = this.empleados.find(e => Number(e.id) === Number(id));

      if (emp) {
        this.llenarFormularioEdicion(emp);
        const labelNombre = document.getElementById("nombreDetalleEmpleado");
        if (labelNombre) labelNombre.textContent = `${emp.nombre} ${emp.apellido}`;
      } else {
        console.warn(`No se encontró el empleado con ID: ${id}`);
        this.mostrarAlerta("Error", "No se pudo encontrar la información del empleado.");
      }
    } catch (error) {
      console.error("Error al cargar detalle de empleado:", error);
    }
  }

  private llenarFormularioEdicion(emp: Empleado): void {
    const fields = ["editId", "editDNI", "editNombre", "editApellido", "editTel", "editAddress", "editEdad"];
    const values: any = {
      editId: emp.id,
      editDNI: emp.DNI,
      editNombre: emp.nombre,
      editApellido: emp.apellido,
      editTel: emp.tel,
      editAddress: emp.address,
      editEdad: emp.edad
    };

    fields.forEach(id => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.value = values[id]?.toString() || "";
    });
  }

  async guardarCambios(): Promise<void> {
    const id = Number((document.getElementById("editId") as HTMLInputElement).value);
    const DNI = Number((document.getElementById("editDNI") as HTMLInputElement).value);
    let nombre = (document.getElementById("editNombre") as HTMLInputElement).value.trim();
    let apellido = (document.getElementById("editApellido") as HTMLInputElement).value.trim();
    const tel = Number((document.getElementById("editTel") as HTMLInputElement).value);
    let address = (document.getElementById("editAddress") as HTMLInputElement).value.trim();
    const edad = Number((document.getElementById("editEdad") as HTMLInputElement).value);

    if (!DNI || !nombre || !apellido || !tel || !address || !edad) {
      this.mostrarAlerta("Campos Incompletos", "Por favor completa todos los campos del formulario.");
      return;
    }

    if (!validarDNI(DNI)) {
      this.mostrarAlerta("DNI No Válido", "El DNI debe tener entre 6 y 10 dígitos.");
      return;
    }

    if (!validarTelefono(tel)) {
      this.mostrarAlerta("Teléfono No Válido", "El teléfono debe tener entre 7 y 15 dígitos.");
      return;
    }

    if (!validarEdad(edad)) {
      this.mostrarAlerta("Edad No Válida", "La edad debe estar entre 1 y 100 años.");
      return;
    }

    const dniExiste = await window.electronAPI.verificarDNI(DNI, id);
    if (dniExiste) {
      this.mostrarAlerta("Identificación Duplicada", `Ya existe otro empleado registrado con el DNI: <strong>${DNI}</strong>.`);
      return;
    }

    // Formateo
    nombre = toTitleCase(nombre);
    apellido = toTitleCase(apellido);
    address = toTitleCase(address);

    try {
      const ok = await window.electronAPI.actualizarEmpleado(id, { nombre, apellido, address, tel, edad, DNI });
      if (ok) {
        this.mostrarAlerta("Éxito", "Información del empleado actualizada correctamente.");
        // Actualizar el label superior
        const labelNombre = document.getElementById("nombreDetalleEmpleado");
        if (labelNombre) labelNombre.textContent = `${nombre} ${apellido}`;

        // Actualizar el formulario con los valores formateados
        this.llenarFormularioEdicion({ id, DNI, nombre, apellido, tel, address, edad } as Empleado);

        await this.cargar(); // Refrescar lista interna
      }
    } catch (error) {
      this.mostrarAlerta("Error", "Ocurrió un error al intentar guardar los cambios.");
    }
  }


  private obtenerValorInput(id: string, mensajeError: string): string | null {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (!input) return null;
    const valor = input.value.trim();
    if (!valor) {
      this.mostrarAlerta("Campo Requerido", mensajeError);
      return null;
    }
    return valor;
  }

  async eliminarEmpleado(id: number): Promise<void> {
    const ok = await window.electronAPI.eliminarEmpleado(id);
    if (ok) {
      this.empleados = this.empleados.filter((e) => e.id !== id);
      this.renderSelectEmpleados();
    }
  }

  // Estado de paginación
  private currentPage: number = 1;
  private itemsPerPage: number = 8;
  private filteredEmpleados: Empleado[] = [];

  private renderSelectEmpleados(filtro?: string): void {
    // 1. Renderizar el select (si existe en la vista actual)
    const select = document.getElementById("selectEmpleado") as HTMLSelectElement | null;
    if (select) {
      select.innerHTML = '<option value="">Seleccionar empleado</option>';
      this.empleados.forEach((emp) => {
        const option = document.createElement("option");
        option.value = emp.id.toString();
        option.textContent = `${emp.nombre} ${emp.apellido}`;
        select.appendChild(option);
      });
    }

    // 2. Filtrar lista para la tabla
    const termino = filtro?.toLowerCase().trim() || "";
    this.filteredEmpleados = termino
      ? this.empleados.filter(e =>
        e.nombre.toLowerCase().includes(termino) ||
        e.apellido.toLowerCase().includes(termino) ||
        e.DNI?.toString().includes(termino)
      )
      : [...this.empleados];

    // Reiniciar a página 1 si se busca algo nuevo
    if (filtro !== undefined) {
      this.currentPage = 1;
    }

    this.renderTablaPaginada();
    this.setupPaginationControls();
  }

  private renderTablaPaginada(): void {
    const tabla = document.getElementById("listaEmpleadosTabla") as HTMLTableSectionElement | null;
    if (!tabla) return;

    // Calcular indices
    const totalItems = this.filteredEmpleados.length;
    const totalPages = Math.ceil(totalItems / this.itemsPerPage) || 1;

    // Asegurar página válida
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    if (this.currentPage < 1) this.currentPage = 1;

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(startIndex + this.itemsPerPage, totalItems);

    const empleadosPagina = this.filteredEmpleados.slice(startIndex, endIndex);

    // Actualizar Info Paginación
    const infoLabel = document.getElementById("paginationInfo");
    if (infoLabel) {
      infoLabel.textContent = totalItems > 0
        ? `Mostrando ${startIndex + 1} - ${endIndex} de ${totalItems} empleados`
        : `Mostrando 0 - 0 de 0 empleados`;
    }

    const pageLabel = document.getElementById("labelCurrentPage");
    if (pageLabel) pageLabel.textContent = this.currentPage.toString();


    if (empleadosPagina.length === 0) {
      const termino = (document.getElementById("buscarEmpleado") as HTMLInputElement)?.value;
      tabla.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">${termino ? 'No se encontraron resultados' : 'No hay empleados registrados'}</td></tr>`;
      return;
    }

    tabla.innerHTML = "";
    empleadosPagina.forEach((emp) => {
      const tr = document.createElement("tr");
      const fechaFormateada = emp.fechaRegistro
        ? emp.fechaRegistro.split('T')[0].replace(/-/g, '/')
        : '---';

      tr.innerHTML = `
        <td class="fw-bold">${emp.DNI || '---'}</td>
        <td>${emp.nombre} ${emp.apellido}</td>
        <td>${emp.tel}</td>
        <td><small class="text-muted fw-bold">${emp.address}</small></td>
        <td>${fechaFormateada}</td>
        <td class="text-end px-4">
          <button class="btn btn-sm btn-success me-1 btn-registrar-gasto-directo" data-id="${emp.id}" title="Registrar Gasto">
            💲
          </button>
          <button class="btn btn-sm btn-outline-primary me-1 btn-ver-detalle" data-id="${emp.id}" title="Ver Detalle">
            👁️
          </button>
          <button class="btn btn-sm btn-outline-danger btn-eliminar-empleado" data-id="${emp.id}" title="Eliminar">
            🗑️
          </button>
        </td>
      `;

      // Eventos para los botones
      tr.querySelector(".btn-registrar-gasto-directo")?.addEventListener("click", () => {
        // Navegar a registrar GASTO con el ID del empleado
        (window as any).appState.currentEmpleadoId = emp.id;
        const event = new CustomEvent("navegar", {
          detail: { vista: "usuario/registrarGastos.html", id: emp.id }
        });
        document.dispatchEvent(event);
      });

      tr.querySelector(".btn-ver-detalle")?.addEventListener("click", () => {
        const event = new CustomEvent("navegar", {
          detail: { vista: "usuario/detallesUsuarios.html", id: emp.id }
        });
        document.dispatchEvent(event);
      });

      tr.querySelector(".btn-eliminar-empleado")?.addEventListener("click", () => {
        this.mostrarConfirmacion(
          "Desactivar Empleado",
          `¿Estás seguro de que deseas desactivar a <strong>${emp.nombre} ${emp.apellido}</strong>? 
           El empleado quedará como inactivo y no podrás registrarle gastos.`,
          () => this.eliminarEmpleado(emp.id)
        );
      });

      tabla.appendChild(tr);
    });
  }

  private setupPaginationControls(): void {
    const btnPrev = document.getElementById("btnPagePrev");
    const btnNext = document.getElementById("btnPageNext");
    const totalPages = Math.ceil(this.filteredEmpleados.length / this.itemsPerPage) || 1;

    // Estado botones
    if (btnPrev) {
      if (this.currentPage <= 1) btnPrev.classList.add("disabled");
      else btnPrev.classList.remove("disabled");

      // Limpiar listeners antiguos clonando
      const newBtn = btnPrev.cloneNode(true);
      btnPrev.parentNode?.replaceChild(newBtn, btnPrev);
      newBtn.addEventListener("click", () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.renderTablaPaginada();
          this.setupPaginationControls();
        }
      });
    }

    if (btnNext) {
      if (this.currentPage >= totalPages) btnNext.classList.add("disabled");
      else btnNext.classList.remove("disabled");

      const newBtn = btnNext.cloneNode(true);
      btnNext.parentNode?.replaceChild(newBtn, btnNext);
      newBtn.addEventListener("click", () => {
        if (this.currentPage < totalPages) {
          this.currentPage++;
          this.renderTablaPaginada();
          this.setupPaginationControls();
        }
      });
    }
  }

  // --- Lógica para Empleados Inactivos ---

  // Estado Inactivos
  private inactivos: Empleado[] = [];
  private filteredInactivos: Empleado[] = [];
  private currentInactivosPage: number = 1;
  private itemsPerInactivosPage: number = 5; // Menos items par modal

  async abrirModalInactivos(): Promise<void> {
    await this.cargarInactivos();

    // Configurar listener para buscar en inactivos
    const inputBuscar = document.getElementById("buscarInactivo") as HTMLInputElement;
    if (inputBuscar) {
      inputBuscar.value = ""; // Limpiar
      // Clonar para limpiar eventos previos
      const newInput = inputBuscar.cloneNode(true);
      inputBuscar.parentNode?.replaceChild(newInput, inputBuscar);
      newInput.addEventListener("input", (e) => {
        const termino = (e.target as HTMLInputElement).value;
        this.renderInactivos(termino);
      });
    }

    const modalEl = document.getElementById("inactiveEmployeesModal");
    if (modalEl) {
      // @ts-ignore
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  async cargarInactivos(): Promise<void> {
    try {
      this.inactivos = await window.electronAPI.obtenerEmpleadosInactivos();
      this.renderInactivos();
    } catch (error) {
      console.error("Error cargando inactivos:", error);
    }
  }

  private renderInactivos(filtro: string = ""): void {
    const tbody = document.getElementById("listaEmpleadosInactivos");
    const emptyState = document.getElementById("emptyStateInactivos");

    if (!tbody || !emptyState) return;

    // 1. Filtrar
    const termino = filtro.toLowerCase().trim();
    this.filteredInactivos = termino
      ? this.inactivos.filter(e =>
        e.nombre.toLowerCase().includes(termino) ||
        e.apellido.toLowerCase().includes(termino) ||
        e.DNI?.toString().includes(termino)
      )
      : [...this.inactivos];

    if (filtro !== "") this.currentInactivosPage = 1;

    // 2. Paginar
    const totalItems = this.filteredInactivos.length;
    const totalPages = Math.ceil(totalItems / this.itemsPerInactivosPage) || 1;

    if (this.currentInactivosPage > totalPages) this.currentInactivosPage = totalPages;
    if (this.currentInactivosPage < 1) this.currentInactivosPage = 1;

    const startIndex = (this.currentInactivosPage - 1) * this.itemsPerInactivosPage;
    const endIndex = Math.min(startIndex + this.itemsPerInactivosPage, totalItems);
    const inactivosPagina = this.filteredInactivos.slice(startIndex, endIndex);

    // Ajustar altura mínima del contenedor para evitar saltos (solo si hay paginación)
    const container = document.getElementById("inactivosTableContainer");
    if (container) {
      // Si el total de items supera el límite por página, fijamos altura
      if (this.filteredInactivos.length > this.itemsPerInactivosPage) {
        container.style.minHeight = "300px"; // Altura aproximada para 5 filas + header
      } else {
        container.style.minHeight = "auto";
      }
    }

    // 3. Renderizar
    tbody.innerHTML = "";

    // Info Paginación
    const infoLabel = document.getElementById("paginationInfoInactivos");
    if (infoLabel) {
      infoLabel.textContent = totalItems > 0
        ? `${startIndex + 1} - ${endIndex} de ${totalItems}`
        : `0 - 0 de 0`;
    }
    const pageLabel = document.getElementById("labelCurrentPageInactivos");
    if (pageLabel) pageLabel.textContent = this.currentInactivosPage.toString();

    // Controles
    this.setupInactivosPaginationControls();

    if (inactivosPagina.length === 0) {
      emptyState.classList.remove("d-none");
    } else {
      emptyState.classList.add("d-none");

      inactivosPagina.forEach(emp => {
        const tr = document.createElement("tr"); // Create row
        // Formatear fecha: si existe, tomar solo la parte YYYY-MM-DD y reemplazar - por /
        const fechaFormateada = emp.fechaDeshabilitacion
          ? emp.fechaDeshabilitacion.split('T')[0].replace(/-/g, '/')
          : '---';

        tr.innerHTML = `
          <td><small class="text-muted fw-bold">${emp.DNI}</small></td>
          <td>${emp.nombre}</td>
          <td>${emp.apellido}</td>
          <td>${fechaFormateada}</td>
          <td class="text-end">
             <button class="btn btn-sm btn-success btn-restaurar" data-id="${emp.id}">
               ♻️ Restaurar
             </button>
          </td>
        `;

        tr.querySelector(".btn-restaurar")?.addEventListener("click", () => {
          this.restaurarEmpleado(emp);
        });

        tbody.appendChild(tr);
      });

    }
  }

  private setupInactivosPaginationControls(): void {
    const btnPrev = document.getElementById("btnPagePrevInactivos");
    const btnNext = document.getElementById("btnPageNextInactivos");
    const totalItems = this.filteredInactivos.length;
    const totalPages = Math.ceil(totalItems / this.itemsPerInactivosPage) || 1;

    if (btnPrev) {
      if (this.currentInactivosPage <= 1) btnPrev.classList.add("disabled");
      else btnPrev.classList.remove("disabled");

      const newBtn = btnPrev.cloneNode(true);
      btnPrev.parentNode?.replaceChild(newBtn, btnPrev);
      newBtn.addEventListener("click", () => {
        if (this.currentInactivosPage > 1) {
          this.currentInactivosPage--;
          this.renderInactivos((document.getElementById("buscarInactivo") as HTMLInputElement)?.value || "");
        }
      });
    }

    if (btnNext) {
      if (this.currentInactivosPage >= totalPages) btnNext.classList.add("disabled");
      else btnNext.classList.remove("disabled");

      const newBtn = btnNext.cloneNode(true);
      btnNext.parentNode?.replaceChild(newBtn, btnNext);
      newBtn.addEventListener("click", () => {
        if (this.currentInactivosPage < totalPages) {
          this.currentInactivosPage++;
          this.renderInactivos((document.getElementById("buscarInactivo") as HTMLInputElement)?.value || "");
        }
      });
    }
  }

  private async restaurarEmpleado(emp: Empleado): Promise<void> {
    // Cerrar modal de inactivos para evitar problema de superposición (z-index)
    const modalInactivosEl = document.getElementById("inactiveEmployeesModal");
    if (modalInactivosEl) {
      // @ts-ignore
      const modalInstance = bootstrap.Modal.getInstance(modalInactivosEl);
      modalInstance?.hide();
    }

    // Esperar un momento para que termine la animación de cierre
    setTimeout(() => {
      this.mostrarConfirmacion(
        "Restaurar Empleado",
        `¿Deseas restaurar a <strong>${emp.nombre} ${emp.apellido}</strong> y recuperar su historial de gastos?`,
        async () => {
          try {
            const ok = await window.electronAPI.reactivarEmpleado(emp.id);
            if (ok) {
              this.mostrarAlerta("Éxito", "Empleado restaurado correctamente.");
              await this.cargar(); // Refrescar lista principal
              // No recargamos la modal de inactivos porque ya está cerrada, el usuario deberá abrirla de nuevo si quiere.
            }
          } catch (error) {
            this.mostrarAlerta("Error", "No se pudo restaurar el empleado.");
          }
        }
      );
    }, 300); // 300ms delay
  }

  private mostrarConfirmacion(titulo: string, mensaje: string, onConfirm: () => void): void {
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
        // @ts-ignore (Bootstrap is available globally)
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal?.hide();
      });

      // @ts-ignore
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
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



  get lista(): Empleado[] {
    return this.empleados;
  }
}
