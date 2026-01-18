// scripts/reset-users.js
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// En Electron, app.getPath('userData') suele apuntar a:
// Windows: AppData/Roaming/sistema-contable
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'sistema-contable', 'sistema-contable.db');

try {
    const db = new Database(dbPath);
    console.log('📦 Conectado a la base de datos en:', dbPath);

    const result = db.prepare('DELETE FROM usuarios').run();
    console.log('✅ Tabla de usuarios limpiada correctamente.');
    console.log(`🧹 Se eliminaron ${result.changes} registros antiguos.`);
    console.log('\n🚀 Ahora puedes reiniciar la aplicación y configurar tu nuevo acceso seguro.');

    db.close();
} catch (err) {
    console.error('❌ Error al intentar limpiar usuarios:', err.message);
    console.log('\n💡 Tip: Asegúrate de que la aplicación esté CERRADA antes de correr este script.');
}
