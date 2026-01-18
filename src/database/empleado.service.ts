// src/database/empleado.service.ts
import { DatabaseService } from './database.service';
import { Empleado } from '../interfaces/empleado';

export class EmpleadoService {

  private db = DatabaseService.getInstance().connection;

  agregarEmpleado(DNI: number, nombre: string, apellido: string, address: string, tel: number, edad: number): Empleado {
    const fechaRegistro = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO empleados (DNI, nombre, apellido, address, tel, edad, fechaRegistro)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);


    const result = stmt.run(DNI, nombre, apellido, address, tel, edad, fechaRegistro);

    return {
      id: result.lastInsertRowid as number,
      DNI,
      nombre,
      apellido,
      address,
      tel,
      edad,
      fechaRegistro,
    };
  }

  obtenerEmpleados(): Empleado[] {
    const stmt = this.db.prepare(`
      SELECT * FROM empleados WHERE activo = 1 ORDER BY nombre ASC
    `);
    return stmt.all() as Empleado[];
  }

  obtenerEmpleadoPorId(id: number): Empleado | null {
    const stmt = this.db.prepare(`SELECT * FROM empleados WHERE id = ? AND activo = 1`);
    return stmt.get(id) as Empleado | null;
  }

  actualizarEmpleado(id: number, nombre: string, apellido: string, address: string, tel: number, edad: number, DNI: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE empleados 
      SET nombre = ?, apellido = ?, address = ?, tel = ?, edad = ?, DNI = ?
      WHERE id = ?
    `);
    const result = stmt.run(nombre, apellido, address, tel, edad, DNI, id);
    return result.changes > 0;
  }

  eliminarEmpleado(id: number): boolean {
    const fecha = new Date().toISOString();
    const stmt = this.db.prepare(`UPDATE empleados SET activo = 0, fechaDeshabilitacion = ? WHERE id = ?`);
    const result = stmt.run(fecha, id);
    return result.changes > 0;
  }

  obtenerEmpleadosInactivos(): Empleado[] {
    const stmt = this.db.prepare(`
      SELECT * FROM empleados WHERE activo = 0 ORDER BY nombre ASC
    `);
    return stmt.all() as Empleado[];
  }

  reactivarEmpleado(id: number): boolean {
    const stmt = this.db.prepare(`UPDATE empleados SET activo = 1, fechaDeshabilitacion = NULL WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  verificarDNI(DNI: number, idExcluir: number | null = null): boolean {
    if (idExcluir) {
      const stmt = this.db.prepare(`SELECT count(*) as count FROM empleados WHERE DNI = ? AND id != ?`);
      const res = stmt.get(DNI, idExcluir) as { count: number };
      return res.count > 0;
    } else {
      const stmt = this.db.prepare(`SELECT count(*) as count FROM empleados WHERE DNI = ?`);
      const res = stmt.get(DNI) as { count: number };
      return res.count > 0;
    }
  }
}
