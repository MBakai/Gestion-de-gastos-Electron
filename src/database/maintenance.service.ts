import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import Database from 'better-sqlite3';
import { DatabaseService } from './database.service';

export class MaintenanceService {
    private db: Database.Database;

    constructor() {
        this.db = DatabaseService.getInstance().connection;
    }

    async ejecutarMantenimientoCompleto(): Promise<{ success: boolean; message: string }> {
        try {
            // 1. Crear Backup
            const backupPath = await this.backupDatabase();

            // 2. Limpiar gastos antiguos (> 1 año)
            const deletedExpenses = this.cleanupOldExpenses();

            // 3. Limpiar empleados inactivos antiguos (> 1 año)
            const deletedEmployees = this.cleanupInactiveEmployees();

            // 4. Optimizar (VACUUM)
            this.optimizeDatabase();

            return {
                success: true,
                message: `Mantenimiento exitoso. Se creó respaldo en: ${path.basename(backupPath)}. \nSe eliminaron ${deletedExpenses} gastos antiguos y ${deletedEmployees} empleados inactivos.`
            };
        } catch (error) {
            return { success: false, message: 'Falla crítica durante el proceso de mantenimiento.' };
        }
    }

    private async backupDatabase(): Promise<string> {
        const userDataPath = app.getPath('userData');
        const dbPath = path.join(userDataPath, 'recredi.db');

        const backupsDir = path.join(userDataPath, 'backups');
        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir);
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `backup-${timestamp}.db`;
        const backupPath = path.join(backupsDir, backupFileName);

        // better-sqlite3 backup es asíncrono y más seguro que copiar el archivo
        await this.db.backup(backupPath);
        return backupPath;
    }

    private cleanupOldExpenses(): number {
        const stmt = this.db.prepare("DELETE FROM gastos WHERE fecha < date('now', '-1 year')");
        const result = stmt.run();
        return result.changes;
    }

    private cleanupInactiveEmployees(): number {
        // Elimina empleados que están inactivos y su fecha de deshabilitación es mayor a 1 año.
        // Asumiendo que 'gastos' tiene ON DELETE CASCADE, esto también eliminará sus gastos asociados.
        const stmt = this.db.prepare("DELETE FROM empleados WHERE activo = 0 AND fechaDeshabilitacion < date('now', '-1 year')");
        const result = stmt.run();
        return result.changes;
    }

    private optimizeDatabase(): void {
        this.db.exec('VACUUM');
    }
}
