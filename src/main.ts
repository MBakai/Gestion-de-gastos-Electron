// src/main.ts

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { autoUpdater } from 'electron-updater';
import { Empleado } from './interfaces/empleado';
import { Gasto } from './interfaces/gasto';
import { DatabaseService } from './database/database.service';
import { EmpleadoService } from './database/empleado.service';
import { GastoService } from './database/gastos.service';
import { AuthService } from './database/auth.service';
import { MaintenanceService } from './database/maintenance.service';

let mainWindow: BrowserWindow | null = null;
let db: DatabaseService;
let empleadoService: EmpleadoService;
let gastoService: GastoService;
let authService: AuthService;
let maintenanceService: MaintenanceService;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../public/views/layout.html'));

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Inicializar la base de datos SQLite
  db = DatabaseService.getInstance();
  empleadoService = new EmpleadoService();
  gastoService = new GastoService();
  authService = new AuthService();
  maintenanceService = new MaintenanceService();
  createWindow();
  setupIpcHandlers();
  setupAutoUpdater();
});

function setupAutoUpdater(): void {
  // Configuración básica
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', () => {
    // Podríamos notificar al renderer aquí vía IPC if needed
  });

  autoUpdater.on('update-downloaded', async (info) => {
    const result: any = await dialog.showMessageBox({
      type: 'info',
      title: 'Actualización lista',
      message: `Una nueva versión (${info.version}) ha sido descargada. ¿Deseas reiniciar para aplicar los cambios?`,
      buttons: ['Actualizar ahora', 'Más tarde']
    });

    const response = typeof result === 'number' ? result : result.response;
    if (response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  // Solo check en producción para evitar ruidos en dev
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
      // Sileciosamente fallar si no hay internet o repo inaccesible
    });
  }
}

app.on('window-all-closed', () => {
  // Cerrar la base de datos
  if (db) {
    db.cerrar();
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

function setupIpcHandlers(): void {
  // Empleados
  ipcMain.handle('agregar-empleado', async (_event, empleado: Empleado) => {
    const { DNI, nombre, apellido, tel, address, edad } = empleado;
    return empleadoService.agregarEmpleado(DNI, nombre, apellido, address, tel, edad);
  });

  ipcMain.handle('obtener-empleados', (): Empleado[] => {
    return empleadoService.obtenerEmpleados();
  });

  ipcMain.handle('eliminar-empleado', (_event, id: number): boolean => {
    return empleadoService.eliminarEmpleado(id);
  });

  ipcMain.handle('verificar-dni', (_event, DNI: number, idExcluir?: number): boolean => {
    return empleadoService.verificarDNI(DNI, idExcluir);
  });

  // Gastos
  ipcMain.handle('agregar-gasto', async (_event, empleadoId: number, monto: number, descripcion: string, fecha: string, ruta?: string) => {
    return gastoService.agregarGasto(empleadoId, monto, descripcion, fecha, ruta);
  });

  ipcMain.handle('obtener-gastos', (_event, empleadoId?: number): Gasto[] => {
    return gastoService.obtenerGastos(empleadoId);
  });

  ipcMain.handle('agregar-gastos-lote', (_event, gastos: any[]) => {
    return gastoService.agregarGastosLote(gastos);
  });

  ipcMain.handle('actualizar-gasto', (_event, id: number, monto: number, descripcion: string, fecha: string, ruta?: string) => {
    return gastoService.actualizarGasto(id, monto, descripcion, fecha, ruta);
  });

  ipcMain.handle('actualizar-empleado', (_event, id: number, emp: any) => {
    return empleadoService.actualizarEmpleado(id, emp.nombre, emp.apellido, emp.address, emp.tel, emp.edad, emp.DNI);
  });

  ipcMain.handle('eliminar-gasto', (_event, id: number): boolean => {
    return gastoService.eliminarGasto(id);
  });

  // Auth
  ipcMain.handle('existe-usuario', () => authService.existeUsuario());
  ipcMain.handle('registrar-usuario', (_event, nick, pass, pregunta, respuesta) =>
    authService.registrarUsuario(nick, pass, pregunta, respuesta));
  ipcMain.handle('login', (_event, nick, pass) => authService.login(nick, pass));
  ipcMain.handle('obtener-pregunta', () => authService.obtenerPreguntaSeguridad());
  ipcMain.handle('verificar-recuperacion', (_event, resp) => authService.verificarRecuperacion(resp));
  ipcMain.handle('reset-password', (_event, pass) => authService.resetPassword(pass));

  // Mantenimiento
  ipcMain.handle('ejecutar-mantenimiento', async (_event, nick, pass) => {
    const isValid = authService.login(nick, pass);
    if (!isValid) return { success: false, message: 'Credenciales inválidas.' };
    return await maintenanceService.ejecutarMantenimientoCompleto();
  });
}