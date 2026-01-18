import type Empleados = require("./empleado");
import type gastos = require("./gasto");

export interface Database {
  empleados: Empleados.Empleado[];
  gastos: gastos.Gasto[];
}