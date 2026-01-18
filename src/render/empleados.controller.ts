/// <reference path="../interfaces/electron.d.ts" />
import { Empleado } from "../interfaces/empleado.js";
import { toTitleCase, validarDNI, validarTelefono, validarEdad, ModalHelper } from "./utils.js";

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

    // 2. Renderizar la tabla de inicio (si existe)
    const tabla = document.getElementById("listaEmpleadosTabla") as HTMLTableSectionElement | null;
    if (tabla) {
      const termino = filtro?.toLowerCase().trim() || "";
      const listaMostrable = termino
        ? this.empleados.filter(e =>
          e.nombre.toLowerCase().includes(termino) ||
          e.apellido.toLowerCase().includes(termino) ||
          e.DNI?.toString().includes(termino)
        )
        : this.empleados;

      if (listaMostrable.length === 0) {
        tabla.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">${termino ? 'No se encontraron resultados' : 'No hay empleados registrados'}</td></tr>`;
        return;
      }

      tabla.innerHTML = "";
      listaMostrable.forEach((emp) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="fw-bold">${emp.DNI || '---'}</td>
          <td>${emp.nombre} ${emp.apellido}</td>
          <td>${emp.tel}</td>
          <td><small class="text-muted">${emp.address}</small></td>
          <td class="text-end px-4">
            <button class="btn btn-sm btn-outline-primary me-1 btn-ver-detalle" data-id="${emp.id}">
              👁️ Ver
            </button>
            <button class="btn btn-sm btn-outline-danger btn-eliminar-empleado" data-id="${emp.id}">
              🗑️
            </button>
          </td>
        `;

        // Eventos para los botones
        tr.querySelector(".btn-ver-detalle")?.addEventListener("click", () => {
          const event = new CustomEvent("navegar", {
            detail: { vista: "usuario/detallesUsuarios.html", id: emp.id }
          });
          document.dispatchEvent(event);
        });

        tr.querySelector(".btn-eliminar-empleado")?.addEventListener("click", () => {
          this.mostrarConfirmacion(
            "Eliminar Empleado",
            `¿Estás seguro de que deseas eliminar a <strong>${emp.nombre} ${emp.apellido}</strong>? Esta acción no se puede deshacer.`,
            () => this.eliminarEmpleado(emp.id)
          );
        });

        tabla.appendChild(tr);
      });
    }
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
