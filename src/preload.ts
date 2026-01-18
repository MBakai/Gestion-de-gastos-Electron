// src/preload.ts

import { contextBridge, ipcRenderer } from 'electron';
import { Empleado } from './interfaces/empleado';
import { Gasto } from './interfaces/gasto';


contextBridge.exposeInMainWorld('electronAPI', {
  // Empleados
  agregarEmpleado: (empleado: Empleado): Promise<Empleado> =>
    ipcRenderer.invoke('agregar-empleado', empleado),

  obtenerEmpleados: (): Promise<Empleado[]> =>
    ipcRenderer.invoke('obtener-empleados'),

  obtenerEmpleadoPorId: (id: number): Promise<Empleado | null> =>
    ipcRenderer.invoke('obtener-empleado-por-id', id),

  actualizarEmpleado: (id: number, empleado: any): Promise<boolean> =>
    ipcRenderer.invoke('actualizar-empleado', id, empleado),

  eliminarEmpleado: (id: number): Promise<boolean> =>
    ipcRenderer.invoke('eliminar-empleado', id),

  verificarDNI: (DNI: number, idExcluir?: number): Promise<boolean> =>
    ipcRenderer.invoke('verificar-dni', DNI, idExcluir),

  // Gastos
  agregarGasto: (empleadoId: number, monto: number, descripcion: string, fecha: string, ruta?: string): Promise<Gasto | null> =>
    ipcRenderer.invoke('agregar-gasto', empleadoId, monto, descripcion, fecha, ruta),

  obtenerGastos: (empleadoId?: number): Promise<Gasto[]> =>
    ipcRenderer.invoke('obtener-gastos', empleadoId),

  agregarGastosLote: (gastos: any[]): Promise<boolean> =>
    ipcRenderer.invoke('agregar-gastos-lote', gastos),

  actualizarGasto: (id: number, monto: number, descripcion: string, fecha: string, ruta?: string): Promise<boolean> =>
    ipcRenderer.invoke('actualizar-gasto', id, monto, descripcion, fecha, ruta),

  eliminarGasto: (id: number): Promise<boolean> =>
    ipcRenderer.invoke('eliminar-gasto', id),

  // Auth
  existeUsuario: (): Promise<boolean> => ipcRenderer.invoke('existe-usuario'),
  registrarUsuario: (nick: string, pass: string, pregunta: string, respuesta: string): Promise<boolean> =>
    ipcRenderer.invoke('registrar-usuario', nick, pass, pregunta, respuesta),
  login: (nick: string, pass: string): Promise<boolean> => ipcRenderer.invoke('login', nick, pass),
  obtenerPregunta: (): Promise<string | null> => ipcRenderer.invoke('obtener-pregunta'),
  verificarRecuperacion: (respuesta: string): Promise<boolean> => ipcRenderer.invoke('verificar-recuperacion', respuesta),
  resetPassword: (nuevaPassword: string): Promise<boolean> => ipcRenderer.invoke('reset-password', nuevaPassword),

  // Mantenimiento
  ejecutarMantenimiento: (nick: string, pass: string): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke('ejecutar-mantenimiento', nick, pass)
});