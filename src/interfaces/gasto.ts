export interface Gasto {
  id: number;
  empleadoId: number;
  monto: number;
  descripcion: string;
  fecha: string;
  ruta?: string;
  categoria?: string;
}