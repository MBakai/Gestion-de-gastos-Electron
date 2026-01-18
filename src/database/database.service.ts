// src/database/database.service.ts
import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: Database.Database;

  private constructor() {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'recredi.db');

    this.db = new Database(dbPath);
    this.inicializarTablas();
  }

  // Patrón Singleton: una sola conexión compartida
  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  get connection(): Database.Database {
    return this.db;
  }

  private inicializarTablas(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS empleados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        DNI INTEGER,
        nombre TEXT NOT NULL,
        apellido TEXT,
        address TEXT,
        tel INTEGER,
        edad INTEGER,
        fechaRegistro TEXT NOT NULL,
        activo INTEGER DEFAULT 1
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS gastos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empleadoId INTEGER NOT NULL,
        monto REAL NOT NULL,
        descripcion TEXT NOT NULL,
        fecha TEXT NOT NULL,
        categoria TEXT,
        ruta TEXT,
        FOREIGN KEY (empleadoId) REFERENCES empleados(id) ON DELETE CASCADE
      )
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_gastos_empleadoId ON gastos(empleadoId);
      CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha);
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nickname TEXT NOT NULL,
        password TEXT NOT NULL,
        pregunta_seguridad TEXT,
        respuesta_seguridad TEXT
      )
    `);

    this.asegurarColumnas();
  }

  private asegurarColumnas(): void {
    // Verificar y agregar columnas faltantes en empleados
    const infoEmpleados = this.db.pragma('table_info(empleados)') as any[];
    const columnasEmpleados = infoEmpleados.map(c => c.name);

    if (!columnasEmpleados.includes('apellido')) {
      this.db.exec('ALTER TABLE empleados ADD COLUMN apellido TEXT');
    }
    if (!columnasEmpleados.includes('address')) {
      this.db.exec('ALTER TABLE empleados ADD COLUMN address TEXT');
    }
    if (!columnasEmpleados.includes('tel')) {
      this.db.exec('ALTER TABLE empleados ADD COLUMN tel INTEGER');
    }
    if (!columnasEmpleados.includes('edad')) {
      this.db.exec('ALTER TABLE empleados ADD COLUMN edad INTEGER');
    }
    if (!columnasEmpleados.includes('DNI')) {
      this.db.exec('ALTER TABLE empleados ADD COLUMN DNI INTEGER');
    }

    // Verificar y agregar columnas faltantes en gastos
    const infoGastos = this.db.pragma('table_info(gastos)') as any[];
    const columnasGastos = infoGastos.map(c => c.name);

    if (!columnasGastos.includes('ruta')) {
      this.db.exec('ALTER TABLE gastos ADD COLUMN ruta TEXT');
    }

    // Verificar usuarios
    const infoUsuarios = this.db.pragma('table_info(usuarios)') as any[];
    const columnasUsuarios = infoUsuarios.map(c => c.name);
    if (!columnasUsuarios.includes('pregunta_seguridad')) {
      this.db.exec('ALTER TABLE usuarios ADD COLUMN pregunta_seguridad TEXT');
      this.db.exec('ALTER TABLE usuarios ADD COLUMN respuesta_seguridad TEXT');
    }
  }


  cerrar(): void {
    this.db.close();
  }
}
