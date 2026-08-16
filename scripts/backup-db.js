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
    
    await db.createBackup();
    
    const metrics = await db.getMetrics();
    console.log(`📊 Tamaño de la base de datos: ${(metrics.databaseSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`📋 Tablas: ${metrics.tableCount}`);
    console.log(`📌 Índices: ${metrics.indexCount}`);
    
    // Verificar backups existentes
    const backupDir = path.join(__dirname, '../database/backups');
    if (fs.existsSync(backupDir)) {
        const backups = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('cerebro_'))
            .sort();
        
        console.log(`💾 Backups disponibles: ${backups.length}`);
        backups.forEach((b, i) => {
            const stats = fs.statSync(path.join(backupDir, b));
            console.log(`   ${i + 1}. ${b} - ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
        });
    }
    
    await db.close();
    console.log('✅ Backup completado');
}

backupDatabase().catch(console.error);
