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
            const deletedCount = this.cleanupOldExpenses();

            // 3. Optimizar (VACUUM)
            this.optimizeDatabase();

            return {
                success: true,
                message: `Mantenimiento exitoso. Se creó respaldo en: ${path.basename(backupPath)}. Se eliminaron ${deletedCount} registros antiguos y se optimizó el almacenamiento.`
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

    private optimizeDatabase(): void {
        this.db.exec('VACUUM');
    }
}
