// scripts/backup-db.js
import { DatabaseManager } from '../src/core/DatabaseManager.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function backupDatabase() {
    console.log('💾 Iniciando backup de la base de datos...');

    const db = new DatabaseManager();
    await db.initialize();

    const backupPath = await db.createBackup();

    const metrics = await db.getMetrics();
    console.log(`📊 Tamaño de la BD: ${(metrics.databaseSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`📋 Tablas: ${metrics.tableCount}`);
    console.log(`📌 Índices: ${metrics.indexCount}`);

    if (backupPath) console.log(`✅ Backup creado: ${backupPath}`);
    else console.log('⚠️ No se pudo crear el backup');

    // Listar backups existentes
    const backupDir = path.join(path.dirname(db.dbPath), 'backups');
    if (fs.existsSync(backupDir)) {
        const backups = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('cerebro_'))
            .sort();
        console.log(`\n💾 Backups disponibles: ${backups.length}`);
        backups.forEach((b, i) => {
            const stats = fs.statSync(path.join(backupDir, b));
            console.log(`   ${i + 1}. ${b} - ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
        });
    }

    await db.close();
    console.log('\n✅ Backup completado');
}

backupDatabase().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
