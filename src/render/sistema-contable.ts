import { EmpleadosController } from "./empleados.controller.js";
import { GastosController } from "./gastos.controller.js";

export class SistemaContable {
  private empleadosCtrl: EmpleadosController;
  private gastosCtrl: GastosController;

  constructor() {
    this.empleadosCtrl = new EmpleadosController();
    this.gastosCtrl = new GastosController(this.empleadosCtrl.lista);
    this.inicializar();
  }

  private async inicializar(): Promise<void> {
    await this.empleadosCtrl.cargar();
    const currentId = (window as any).appState.currentEmpleadoId;
    await this.gastosCtrl.cargar(currentId);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const btnAdd = document.getElementById("btnAgregarEmpleado");
    const btnReg = document.getElementById("btnRegistrarGasto");
    const btnCalc = document.getElementById("btnCalcularSemanal");
    const btnBatch = document.getElementById("btnProcesarLote");
    const btnSaveEmp = document.getElementById("btnGuardarEmpleado");

    if (btnAdd) {
      btnAdd.addEventListener("click", () => this.empleadosCtrl.agregarEmpleado());
      console.log("🔗 Evento btnAgregarEmpleado conectado");
    }
    if (btnReg) {
      btnReg.addEventListener("click", () => this.gastosCtrl.registrarGasto());
      console.log("🔗 Evento btnRegistrarGasto conectado");
    }
    if (btnCalc) {
      btnCalc.addEventListener("click", () => this.gastosCtrl.calcularResumen());
      console.log("🔗 Evento btnCalcularSemanal conectado");
    }
    if (btnBatch) {
      btnBatch.addEventListener("click", () => this.gastosCtrl.procesarGastosLote());
      console.log("🔗 Evento btnProcesarLote conectado");
    }
    if (btnSaveEmp) {
      btnSaveEmp.addEventListener("click", () => this.empleadosCtrl.guardarCambios());
      console.log("🔗 Evento btnGuardarEmpleado conectado");
    }
  }
}
