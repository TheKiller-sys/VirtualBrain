// scripts/monitor-db.js
import { DatabaseManager } from '../src/core/DatabaseManager.js';

async function monitorDatabase() {
    console.log('📊 MONITOREO EN TIEMPO REAL V4');
    console.log('Presiona Ctrl+C para salir\n');

    const db = new DatabaseManager();
    await db.initialize();

    let tick = 0;

    const interval = setInterval(async () => {
        tick++;
        console.clear();
        console.log('📊 MONITOREO EN TIEMPO REAL');
        console.log('=' .repeat(50));
        console.log(`🕐 ${new Date().toLocaleTimeString()}  (tick #${tick})\n`);

        try {
            const stats = await db.quickStats();
            console.log('📈 ESTADÍSTICAS:');
            console.log(`   Estados:      ${stats.states.count}`);
            console.log(`   Emociones:    ${stats.emotions.count}`);
            console.log(`   Bioquímica:   ${stats.biochemical.count}`);
            console.log(`   Cognitivo:    ${stats.cognitive.count}`);
            console.log(`   Memorias:     ${stats.memories.count}`);
            console.log(`   Decisiones:   ${stats.decisions.count}`);
            console.log(`   Pensamientos: ${stats.thoughts.count}`);
            console.log(`   Patrones:     ${stats.patterns.count}`);
            console.log(`   Conexiones:   ${stats.connections.count}`);

            const lastState = await db.getLastState();
            if (lastState) {
                console.log('\n🎯 ÚLTIMO ESTADO:');
                console.log(`   Estabilidad:  ${((lastState.estabilidad || 0) * 100).toFixed(1)}%`);
                console.log(`   Rendimiento:  ${((lastState.rendimiento || 0) * 100).toFixed(1)}%`);
                console.log(`   Consciencia:  ${((lastState.nivel_consciencia || 0) * 100).toFixed(1)}%`);
            }

            const lastEmo = await db.getLastEmotionalState();
            if (lastEmo) {
                console.log('\n😊 ÚLTIMA EMOCIÓN:');
                console.log(`   Alegría:    ${(lastEmo.alegria || 0).toFixed(1)}%`);
                console.log(`   Confianza:  ${(lastEmo.confianza || 0).toFixed(1)}%`);
                console.log(`   Ansiedad:   ${(lastEmo.ansiedad || 0).toFixed(1)}%`);
                console.log(`   Bienestar:  ${(lastEmo.bienestar || 0).toFixed(1)}%`);
            }

            const thoughts = await db.getRecentThoughts(1);
            if (thoughts.length > 0) {
                console.log('\n💭 ÚLTIMO PENSAMIENTO:');
                console.log(`   ${thoughts[0].contenido}`);
            }

            const feed = await db.getLearningFeed(3);
            if (feed.length > 0) {
                console.log('\n📖 FEED DE APRENDIZAJE (últimos 3):');
                feed.forEach(f => {
                    console.log(`   ${f.icon} ${f.title}`);
                });
            }

            const metrics = await db.getMetrics();
            console.log('\n🗄️ MÉTRICAS DB:');
            console.log(`   Tamaño:       ${(metrics.databaseSize / (1024 * 1024)).toFixed(2)} MB`);
            console.log(`   Cache Hits:   ${metrics.cacheHits}`);
            console.log(`   Cache Misses: ${metrics.cacheMisses}`);
            console.log(`   Avg Query:    ${metrics.avgQueryTime.toFixed(2)} ms`);
        } catch (err) {
            console.error('❌ Error en ciclo de monitoreo:', err.message);
        }
    }, 2000);

    process.on('SIGINT', async () => {
        console.log('\n🛑 Deteniendo monitor...');
        clearInterval(interval);
        await db.close();
        process.exit(0);
    });
}

monitorDatabase().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
