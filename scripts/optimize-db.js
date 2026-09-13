// scripts/optimize-db.js
import { DatabaseManager } from '../src/core/DatabaseManager.js';

async function optimizeDatabase() {
    console.log('🔧 Optimizando base de datos...');
    console.log('=' .repeat(50));

    const db = new DatabaseManager();
    await db.initialize();

    // 1. Integridad
    console.log('\n📋 Verificando integridad...');
    const integrity = await db.checkIntegrity();
    console.log(`   Integridad: ${integrity.integrity ? '✅ OK' : '❌ ERROR'}`);
    console.log(`   Foreign Keys: ${integrity.foreignKeys ? '✅ OK' : '❌ ERROR'}`);

    // 2. Optimizar
    console.log('\n⚡ Optimizando (ANALYZE + REINDEX + VACUUM)...');
    await db.optimize();

    // 3. Estadísticas
    console.log('\n📊 Estadísticas post-optimización:');
    const stats = await db.getDatabaseStats();
    console.log(`   Tamaño: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   Tablas: ${stats.tables.length}`);
    console.log(`   Índices: ${stats.indexes.length}`);
    console.log(`   Triggers: ${stats.triggers.length}`);
    console.log(`   Vistas: ${stats.views.length}`);

    // 4. Métricas
    const metrics = await db.getMetrics();
    console.log('\n📈 Métricas:');
    console.log(`   Consultas: ${metrics.queries}`);
    console.log(`   Cache Hits: ${metrics.cacheHits}`);
    console.log(`   Cache Misses: ${metrics.cacheMisses}`);
    console.log(`   Cache Size: ${metrics.cacheSize}`);
    console.log(`   Tiempo promedio: ${metrics.avgQueryTime.toFixed(2)} ms`);

    await db.close();
    console.log('\n✅ Optimización completada');
}

optimizeDatabase().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
