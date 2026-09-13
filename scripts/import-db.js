// scripts/import-db.js
import { DatabaseManager } from '../src/core/DatabaseManager.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importDatabase() {
    console.log('📥 Importando base de datos...');
    console.log('=' .repeat(50));

    const filepath = process.argv[2];
    if (!filepath) {
        console.error('❌ Uso: node scripts/import-db.js archivo.json');
        process.exit(1);
    }

    const resolved = path.isAbsolute(filepath) ? filepath : path.resolve(process.cwd(), filepath);
    if (!fs.existsSync(resolved)) {
        console.error(`❌ Archivo no encontrado: ${resolved}`);
        process.exit(1);
    }

    const db = new DatabaseManager();
    await db.initialize();

    console.log(`📂 Leyendo archivo: ${resolved}`);
    const data = JSON.parse(fs.readFileSync(resolved, 'utf8'));

    const tableCount = Object.keys(data.tables || {}).length;
    console.log(`📋 Importando ${tableCount} tablas...`);

    await db.importFromJSON(data);

    const metrics = await db.getMetrics();
    console.log(`\n📊 Métricas después de importación:`);
    console.log(`   - Tablas: ${metrics.tableCount}`);
    console.log(`   - Tamaño: ${(metrics.databaseSize / (1024 * 1024)).toFixed(2)} MB`);

    await db.close();
    console.log('\n✅ Importación completada');
}

importDatabase().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
