// src/database/gasto.service.ts
import { DatabaseService } from './database.service';
import { Gasto } from '../interfaces/gasto';
import { EmpleadoService } from './empleado.service';

export class GastoService {
  private db = DatabaseService.getInstance().connection;
  private empleadoService = new EmpleadoService();

  agregarGasto(empleadoId: number, monto: number, descripcion: string, fecha: string, ruta: string = ''): Gasto | null {
    // Validar que el empleado existe
    const empleado = this.empleadoService.obtenerEmpleados().find(e => e.id === empleadoId);
    if (!empleado) return null;

    const stmt = this.db.prepare(`
      INSERT INTO gastos (empleadoId, monto, descripcion, fecha, ruta)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(empleadoId, monto, descripcion, fecha, ruta);
    return { id: result.lastInsertRowid as number, empleadoId, monto, descripcion, fecha, ruta };
  }

  agregarGastosLote(gastos: { empleadoId: number, monto: number, descripcion: string, fecha: string, ruta?: string }[]): boolean {
    const insert = this.db.prepare(`
      INSERT INTO gastos (empleadoId, monto, descripcion, fecha, ruta)
      VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((gastosList: any[]) => {
      for (const gasto of gastosList) {
        insert.run(gasto.empleadoId, gasto.monto, gasto.descripcion, gasto.fecha, gasto.ruta || '');
      }
    });

    transaction(gastos);
    return true;
  }

  actualizarGasto(id: number, monto: number, descripcion: string, fecha: string, ruta: string = ''): boolean {
    const stmt = this.db.prepare(`
      UPDATE gastos 
      SET monto = ?, descripcion = ?, fecha = ?, ruta = ?
      WHERE id = ?
    `);
    const result = stmt.run(monto, descripcion, fecha, ruta, id);
    return result.changes > 0;
  }


  obtenerGastos(empleadoId?: number): Gasto[] {
    let query = 'SELECT * FROM gastos';
    const params: any[] = [];

    if (empleadoId) {
      query += ' WHERE empleadoId = ?';
      params.push(empleadoId);
    }

    query += ' ORDER BY fecha DESC';
    const stmt = this.db.prepare(query);
    return stmt.all(...params) as Gasto[];
  }


  eliminarGasto(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM gastos WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  obtenerTotalGastosPorEmpleado(empleadoId: number): number {
    const stmt = this.db.prepare(`SELECT COALESCE(SUM(monto), 0) as total FROM gastos WHERE empleadoId = ?`);
    const result = stmt.get(empleadoId) as { total: number };
    return result.total;
  }
}
