
import type Empleados = require("./empleado");
import type Gastos = require("./gasto");

export interface ResumenSemanal {
  empleado: Empleados.Empleado;
  gastos: Gastos.Gasto[];
  totalGastos: number;
  cantidadGastos: number;
}