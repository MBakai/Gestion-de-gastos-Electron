/// <reference path="../interfaces/electron.d.ts" />
import { Gasto } from "../interfaces/gasto.js";
import { ResumenSemanal } from "../interfaces/resumen-semanal.js";
import { Empleado } from "../interfaces/empleado.js";
import { toTitleCase, validarMonto, ModalHelper, configurarInputFecha, obtenerFechaHoy } from "./utils.js";

declare var bootstrap: any;
declare var jspdf: any; // Para jsPDF UMD

export class GastosController {
  private gastos: Gasto[] = [];
  private empleados: Empleado[];

  constructor(empleadosRef: Empleado[]) {
    this.empleados = empleadosRef;
    this.inicializarEscuchaDetalle();
    this.inicializarVistaRegistro();
  }

  private inicializarVistaRegistro(): void {
    // Configurar input de fecha en vista de registro de gastos
    if (document.getElementById("fechaGasto")) {
      configurarInputFecha("fechaGasto");
    }
  }

  private inicializarEscuchaDetalle(): void {
    if (document.getElementById("viewDetalleEmpleado")) {
      this.cargarGastosEmpleado();
      this.setupFiltros();

      // Configurar inputs de fecha en filtros de detalle
      configurarInputFecha("filtroFecha", false); // Sin valor por defecto aun, se pone hoy en setupFiltros
      configurarInputFecha("filtroFechaFin", false);
    }
  }

  async cargar(id?: number): Promise<void> {
    this.gastos = await window.electronAPI.obtenerGastos(id);
  }

  async registrarGasto(): Promise<void> {
    const idInput = document.getElementById("selectEmpleado") as HTMLSelectElement | null;
    const montoInput = document.getElementById("montoGasto") as HTMLInputElement | null;
    const descInput = document.getElementById("descripcionGasto") as HTMLInputElement | null;
    const fechaInput = document.getElementById("fechaGasto") as HTMLInputElement | null;
    const rutaInput = document.getElementById("rutaGasto") as HTMLInputElement | null;

    // Si estamos en la vista de detalle, el ID viene del appState
    const empleadoId = idInput ? parseInt(idInput.value) : (window as any).appState.currentEmpleadoId;
    const monto = parseFloat(montoInput?.value || "0") || 0;
    let descripcion = descInput?.value.trim() || "Sin descripción";
    const fecha = fechaInput?.value || obtenerFechaHoy();
    let ruta = rutaInput?.value.trim() || "";

    if (!empleadoId || !ruta) {
      this.mostrarAlerta("Campos Requeridos", "Por favor selecciona el empleado y especifica la <strong>Ruta</strong>.");
      return;
    }

    if (!validarMonto(monto)) {
      this.mostrarAlerta("Monto No Válido", "El monto debe ser un número positivo y menor a 1,000,000,000.");
      return;
    }

    // Formateo
    descripcion = toTitleCase(descripcion);
    ruta = toTitleCase(ruta);

    const nuevo = await window.electronAPI.agregarGasto(empleadoId, monto, descripcion, fecha, ruta);
    if (nuevo) {
      this.gastos.push(nuevo);
      if (montoInput) montoInput.value = "";
      if (descInput) descInput.value = "";
      if (rutaInput) rutaInput.value = "";

      // Si estamos en detalle, refrescar la tabla específica
      if (document.getElementById("viewDetalleEmpleado")) {
        const filtro = (document.getElementById("filtroTipo") as HTMLSelectElement)?.value || "todo";
        this.renderGastosDetalle(filtro);
        this.mostrarAlerta("Éxito", "Gasto registrado correctamente.");
      } else {
        // En la vista general de registro, preguntar si desea ir a los detalles
        this.mostrarConfirmacion(
          "Gasto Registrado",
          "¿Deseas ir a la vista de detalles para ver el historial de este empleado?",
          async () => {
            const event = new CustomEvent("navegar", {
              detail: { vista: "usuario/detallesUsuarios.html", id: empleadoId }
            });
            document.dispatchEvent(event);
          }
        );
      }
    }
  }

  async procesarGastosLote(): Promise<void> {
    const selectEmpleado = document.getElementById("selectEmpleado") as HTMLSelectElement | null;
    const textarea = document.getElementById("inputGastosLote") as HTMLTextAreaElement | null;
    const inputFecha = document.getElementById("fechaGasto") as HTMLInputElement | null;

    if (!selectEmpleado || !textarea || !inputFecha) return;

    const empleadoId = parseInt(selectEmpleado.value);
    const texto = textarea.value.trim();
    const fecha = inputFecha.value || obtenerFechaHoy();


    const inputRuta = document.getElementById("rutaGasto") as HTMLInputElement | null;
    const rutaGlobal = inputRuta?.value.trim() || "";

    if (!empleadoId || !texto || !rutaGlobal) {
      this.mostrarAlerta("Información Faltante", "Por favor selecciona un empleado, ingresa la <strong>Ruta</strong> global y pega la lista de gastos.");
      return;
    }

    const lineas = texto.split(/[,\n;]+/).filter(l => l.trim() !== "");
    const gastosParaGuardar: any[] = [];

    for (const linea of lineas) {
      // Formato: "Concepto: Valor"
      const match = linea.match(/([^:]+):\s*([\d.]+)/);
      if (match) {
        let descripcion = match[1].trim();
        const monto = parseFloat(match[2].trim());
        const ruta = toTitleCase(rutaGlobal);

        if (descripcion && !isNaN(monto)) {
          descripcion = toTitleCase(descripcion);
          gastosParaGuardar.push({ empleadoId, monto, descripcion, fecha, ruta });
        }
      }
    }

    if (gastosParaGuardar.length === 0) {
      this.mostrarAlerta("Formato No Válido", "No se encontró ningún gasto. Asegúrate de usar el formato: <strong>Concepto: Valor - Ruta (opcional)</strong>");
      return;
    }

    try {
      const ok = await window.electronAPI.agregarGastosLote(gastosParaGuardar);
      if (ok) {
        textarea.value = "";

        this.mostrarConfirmacion(
          "Lote Procesado",
          `Se han procesado <strong>${gastosParaGuardar.length}</strong> gastos con éxito. ¿Deseas ir a la vista de detalles para ver el historial de este empleado?`,
          async () => {
            const event = new CustomEvent("navegar", {
              detail: { vista: "usuario/detallesUsuarios.html", id: empleadoId }
            });
            document.dispatchEvent(event);
          }
        );
      }
    } catch (error) {
    }
  }

  private async cargarGastosEmpleado(): Promise<void> {
    const id = (window as any).appState.currentEmpleadoId;
    if (!id) {
      this.mostrarAlerta("Error", "No se pudo identificar el empleado. Por favor regresa al listado y selecciona un empleado.");
      return;
    }
    this.gastos = await window.electronAPI.obtenerGastos(id);
    this.renderGastosDetalle();
  }

  private setupFiltros(): void {
    const selectTipo = document.getElementById("filtroTipo") as HTMLSelectElement | null;
    const inputFecha = document.getElementById("filtroFecha") as HTMLInputElement | null;
    const inputFechaFin = document.getElementById("filtroFechaFin") as HTMLInputElement | null;
    const inputMes = document.getElementById("filtroMes") as HTMLInputElement | null;
    const btnAplicar = document.getElementById("btnAplicarFiltro");

    const labelDesde = document.getElementById("labelFiltroDesde");
    const labelHasta = document.getElementById("labelFiltroHasta");

    if (!selectTipo || !btnAplicar) return;

    // Cambiar visibilidad de inputs según tipo
    selectTipo.addEventListener("change", () => {
      const val = selectTipo.value;
      // Inputs
      if (inputFecha) inputFecha.classList.toggle("d-none", val === "mes" || val === "todo");
      if (inputFechaFin) inputFechaFin.classList.toggle("d-none", val !== "rango");
      if (inputMes) inputMes.classList.toggle("d-none", val !== "mes");

      // Labels
      if (labelDesde) labelDesde.classList.toggle("d-none", val !== "rango");
      if (labelHasta) labelHasta.classList.toggle("d-none", val !== "rango");
    });

    // Valor por defecto hoy
    // Valor por defecto hoy
    const hoy = obtenerFechaHoy();
    if (inputFecha) inputFecha.value = hoy;
    if (inputFechaFin) inputFechaFin.value = hoy;
    if (inputMes) inputMes.value = hoy.slice(0, 7);

    btnAplicar.addEventListener("click", () => {
      this.renderGastosDetalle(selectTipo.value);
    });

    // Inicializar visibilidad según valor inicial (que ahora es 'todo')
    if (inputFecha) inputFecha.classList.add("d-none");
    if (inputFechaFin) inputFechaFin.classList.add("d-none");
    if (inputMes) inputMes.classList.add("d-none");
    if (labelDesde) labelDesde.classList.add("d-none");
    if (labelHasta) labelHasta.classList.add("d-none");

    const btnExportar = document.getElementById("btnExportarPDF");
    if (btnExportar) {
      btnExportar.addEventListener("click", () => {
        this.exportarPDF(selectTipo.value);
      });
    }
  }

  private renderGastosDetalle(filtro: string = "todo"): void {
    const tabla = document.getElementById("listaGastosEmpleadoDetalle");
    const totalLabel = document.getElementById("totalGastosDetalle");
    if (!tabla || !totalLabel) return;

    const gastosFiltrados = this.filtrarGastos(this.gastos, filtro);

    tabla.innerHTML = "";
    let total = 0;

    gastosFiltrados.forEach(g => {
      total += g.monto;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${g.fecha}</td>
        <td>${g.descripcion}</td>
        <td><small>${g.ruta || '-'}</small></td>
        <td class="fw-bold">$${g.monto.toLocaleString()}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary btn-editar-gasto me-1" data-id="${g.id}">✏️</button>
          <button class="btn btn-sm btn-outline-danger btn-eliminar-gasto" data-id="${g.id}">🗑️</button>
        </td>
      `;

      tr.querySelector(".btn-editar-gasto")?.addEventListener("click", () => {
        this.abrirModalEdicion(g);
      });

      tr.querySelector(".btn-eliminar-gasto")?.addEventListener("click", () => {
        this.mostrarConfirmacion(
          "Eliminar Gasto",
          `¿Estás seguro de que deseas eliminar el gasto por <strong>$${g.monto.toLocaleString()}</strong> (${g.descripcion})?`,
          async () => {
            const ok = await window.electronAPI.eliminarGasto(g.id);
            if (ok) {
              this.gastos = this.gastos.filter(x => x.id !== g.id);
              this.renderGastosDetalle(filtro);
            }
          }
        );
      });

      tabla.appendChild(tr);
    });

    totalLabel.textContent = `$${total.toLocaleString()}`;
  }

  private filtrarGastos(gastos: Gasto[], filtro: string): Gasto[] {
    const currentId = (window as any).appState.currentEmpleadoId;

    // Si estamos en la vista de detalle, primero filtramos por el empleado actual
    let list = gastos;
    if (document.getElementById("viewDetalleEmpleado") && currentId) {
      list = gastos.filter(g => Number(g.empleadoId) === Number(currentId));
    }

    if (filtro === "todo") return list;

    const inputFecha = document.getElementById("filtroFecha") as HTMLInputElement | null;
    const inputFechaFin = document.getElementById("filtroFechaFin") as HTMLInputElement | null;
    const inputMes = document.getElementById("filtroMes") as HTMLInputElement | null;

    const fechaInicioStr = inputFecha?.value || "";
    const fechaFinStr = inputFechaFin?.value || "";
    const mesSeleccionado = inputMes?.value || "";

    return list.filter(g => {
      if (filtro === "dia") {
        return g.fecha === fechaInicioStr;
      }
      if (filtro === "rango") {
        return g.fecha >= fechaInicioStr && g.fecha <= fechaFinStr;
      }
      if (filtro === "mes") {
        return g.fecha.startsWith(mesSeleccionado);
      }
      return true;
    });
  }


  async calcularResumen(): Promise<void> {
    const resumenDiv = document.getElementById("resumenEmpleados") as HTMLDivElement | null;
    if (!resumenDiv) return;

    this.gastos = await window.electronAPI.obtenerGastos();
    const resumenes: ResumenSemanal[] = this.empleados.map((empleado) => {
      const gastosEmp = this.gastos.filter((g) => g.empleadoId === empleado.id);
      const total = gastosEmp.reduce((sum, g) => sum + g.monto, 0);
      return {
        empleado,
        gastos: gastosEmp,
        totalGastos: total,
        cantidadGastos: gastosEmp.length,
      };
    });

    this.renderizarResumen(resumenes);
  }

  private renderizarResumen(resumenes: ResumenSemanal[]): void {
    const resumenDiv = document.getElementById("resumenEmpleados") as HTMLDivElement | null;
    if (!resumenDiv) return;

    resumenDiv.innerHTML = resumenes
      .map(
        (r) => `
      <div class="empleado-item">
        <h3>${r.empleado.nombre}</h3>
        <p><strong>Total de gastos:</strong> $${r.totalGastos.toFixed(2)}</p>
        <p><strong>Cantidad de gastos:</strong> ${r.cantidadGastos}</p>
        ${r.gastos
            .map(
              (g) => `
          <div class="gasto-item">
            📅 ${g.fecha} - ${g.descripcion}: $${g.monto.toFixed(2)}
          </div>`
            )
            .join("")}
      </div>`
      )
      .join("");
  }

  private abrirModalEdicion(gasto: Gasto): void {
    const modalEl = document.getElementById("editGastoModal");
    if (!modalEl) return;

    // Configurar restricción de fecha antes de establecer el valor
    configurarInputFecha("editGastoFecha", false);

    (document.getElementById("editGastoId") as HTMLInputElement).value = gasto.id.toString();
    (document.getElementById("editGastoFecha") as HTMLInputElement).value = gasto.fecha;
    (document.getElementById("editGastoDescripcion") as HTMLInputElement).value = gasto.descripcion;
    (document.getElementById("editGastoRuta") as HTMLInputElement).value = gasto.ruta || "";
    (document.getElementById("editGastoMonto") as HTMLInputElement).value = gasto.monto.toString();

    const btnGuardar = document.getElementById("btnGuardarGastoEditado");
    if (btnGuardar) {
      // Reemplazar para limpiar listeners
      const newBtn = btnGuardar.cloneNode(true);
      btnGuardar.parentNode?.replaceChild(newBtn, btnGuardar);
      newBtn.addEventListener("click", () => this.guardarCambiosGasto());
    }

    // @ts-ignore
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }

  private async guardarCambiosGasto(): Promise<void> {
    const id = parseInt((document.getElementById("editGastoId") as HTMLInputElement).value);
    const fecha = (document.getElementById("editGastoFecha") as HTMLInputElement).value;
    let descripcion = (document.getElementById("editGastoDescripcion") as HTMLInputElement).value.trim();
    let ruta = (document.getElementById("editGastoRuta") as HTMLInputElement).value.trim();
    const monto = parseFloat((document.getElementById("editGastoMonto") as HTMLInputElement).value);

    if (!descripcion || !ruta || isNaN(monto)) {
      this.mostrarAlerta("Campos Incompletos", "Por favor completa todos los campos para guardar los cambios.");
      return;
    }

    // Formateo
    descripcion = toTitleCase(descripcion);
    ruta = toTitleCase(ruta);

    // Cerrar la modal de edición antes de mostrar la confirmación
    // @ts-ignore
    const modalEditEl = document.getElementById("editGastoModal");
    const modalEdit = bootstrap.Modal.getInstance(modalEditEl);
    modalEdit?.hide();

    // Esperar un poco para que la modal se cierre completamente
    setTimeout(() => {
      // Mostrar confirmación después de cerrar la modal de edición
      this.mostrarConfirmacion(
        "Actualizar Gasto",
        `¿Estás seguro de que deseas actualizar este gasto?<br><br>
         <strong>Fecha:</strong> ${fecha}<br>
         <strong>Concepto:</strong> ${descripcion}<br>
         <strong>Ruta:</strong> ${ruta}<br>
         <strong>Monto:</strong> $${monto.toLocaleString()}`,
        async () => {
          try {
            const ok = await window.electronAPI.actualizarGasto(id, monto, descripcion, fecha, ruta);
            if (ok) {
              // Actualizar en el array local
              const idx = this.gastos.findIndex(x => x.id === id);
              if (idx !== -1) {
                this.gastos[idx] = { ...this.gastos[idx], monto, descripcion, fecha, ruta };
              }

              const filtro = (document.getElementById("filtroTipo") as HTMLSelectElement)?.value || "todo";
              this.renderGastosDetalle(filtro);

              // Mostrar mensaje de éxito
              this.mostrarAlerta("Éxito", "El gasto ha sido actualizado correctamente.");
            }
          } catch (error) {
            this.mostrarAlerta("Error", "No se pudo guardar el cambio del gasto.");
          }
        }
      );
    }, 300); // Esperar 300ms para que la animación de cierre termine
  }

  private async exportarPDF(filtro: string): Promise<void> {
    const currentId = (window as any).appState.currentEmpleadoId;
    const emp = this.empleados.find(e => e.id === currentId);
    if (!emp) return;

    const gastosFiltrados = this.filtrarGastos(this.gastos, filtro);
    if (gastosFiltrados.length === 0) {
      this.mostrarAlerta("Sin Datos", "No hay gastos en el periodo seleccionado para exportar.");
      return;
    }

    // @ts-ignore
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    const tituloReporte = "REPORTE DE GASTOS DETALLADO";
    const subTitulo = `Empleado: ${emp.nombre} ${emp.apellido} (DNI: ${emp.DNI})`;

    let periodo = "Todo el historial";
    if (filtro === "dia") periodo = `Día: ${(document.getElementById("filtroFecha") as HTMLInputElement).value}`;
    if (filtro === "rango") periodo = `Rango: ${(document.getElementById("filtroFecha") as HTMLInputElement).value} al ${(document.getElementById("filtroFechaFin") as HTMLInputElement).value}`;
    if (filtro === "mes") periodo = `Mes: ${(document.getElementById("filtroMes") as HTMLInputElement).value}`;

    // Encabezado
    doc.setFontSize(18);
    doc.setTextColor(41, 128, 185);
    doc.text(tituloReporte, 105, 15, { align: "center" });
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text(subTitulo, 105, 25, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Periodo: ${periodo}`, 105, 30, { align: "center" });
    doc.text(`Fecha de exportación: ${new Date().toLocaleDateString()}`, 105, 35, { align: "center" });

    // Agrupar gastos por fecha
    const gastosPorFecha: { [key: string]: Gasto[] } = {};
    gastosFiltrados.forEach(g => {
      if (!gastosPorFecha[g.fecha]) gastosPorFecha[g.fecha] = [];
      gastosPorFecha[g.fecha].push(g);
    });

    const fechas = Object.keys(gastosPorFecha).sort();
    let yPos = 45;
    let granTotal = 0;

    fechas.forEach((fecha) => {
      const gastosDelDia = gastosPorFecha[fecha];
      let subtotalDia = 0;

      const body = gastosDelDia.map(g => {
        subtotalDia += g.monto;
        return [
          g.descripcion,
          g.ruta || "-",
          `$${g.monto.toLocaleString()}`
        ];
      });

      granTotal += subtotalDia;

      // Dibujar título de la fecha
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`Fecha: ${fecha}`, 14, yPos);
      yPos += 5;

      // @ts-ignore
      doc.autoTable({
        startY: yPos,
        head: [["Concepto", "Ruta", "Monto"]],
        body: body,
        theme: "grid",
        headStyles: { fillColor: [52, 73, 94], textColor: 255 },
        columnStyles: {
          2: { fontStyle: "bold", halign: "right", cellWidth: 40 }
        },
        margin: { top: 10 },
        didDrawPage: (data: any) => {
          yPos = data.cursor.y;
        }
      });

      // Subtotal del día
      yPos += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Subtotal: $${subtotalDia.toLocaleString()}`, 196, yPos, { align: "right" });
      yPos += 12;

      // Verificar si necesitamos nueva página para el siguiente bloque
      if (yPos > 270 && fecha !== fechas[fechas.length - 1]) {
        doc.addPage();
        yPos = 20;
      }
    });

    // Gran Total Final - Verificar espacio
    if (yPos > 270) {
      doc.addPage();
      yPos = 25;
    }

    yPos += 5;
    doc.setDrawColor(41, 128, 185);
    doc.setLineWidth(1);
    doc.line(14, yPos, 196, yPos);
    yPos += 10;
    doc.setFontSize(14);
    doc.setTextColor(41, 128, 185);
    doc.text(`TOTAL GENERAL: $${granTotal.toLocaleString()}`, 196, yPos, { align: "right" });

    const fileName = `Reporte_Gastos_${emp.apellido}_${new Date().getTime()}.pdf`;
    doc.save(fileName);
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
        // @ts-ignore
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
}
