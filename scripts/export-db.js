// scripts/export-db.js
import { DatabaseManager } from '../src/core/DatabaseManager.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function exportDatabase() {
    console.log('📤 Exportando base de datos...');
    console.log('=' .repeat(50));

    const db = new DatabaseManager();
    await db.initialize();

    const limit = parseInt(process.argv[2]) || 1000;
    console.log(`📊 Exportando últimos ${limit} registros por tabla...`);

    const data = await db.exportToJSON(limit);

    const exportPath = path.join(__dirname, '../exports');
    if (!fs.existsSync(exportPath)) fs.mkdirSync(exportPath, { recursive: true });

    const filename = `cerebro_export_${Date.now()}.json`;
    const filepath = path.join(exportPath, filename);

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

    console.log(`✅ Exportado a: ${filepath}`);
    console.log(`📦 Tamaño: ${(fs.statSync(filepath).size / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`📋 Tablas exportadas: ${Object.keys(data.tables).length}`);

    await db.close();
}

exportDatabase().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
