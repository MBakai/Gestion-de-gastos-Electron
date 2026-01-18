export interface Empleado {
  id: number;
  DNI: number;
  nombre: string;
  apellido: string;
  address: string;
  tel: number;
  edad: number;
  fechaRegistro: string;
  fechaDeshabilitacion?: string;
}