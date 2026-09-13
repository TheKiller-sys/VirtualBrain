// scripts/query-db.js
import { DatabaseManager } from '../src/core/DatabaseManager.js';

async function queryDatabase() {
    const db = new DatabaseManager();
    await db.initialize();

    console.log('🔍 CONSULTAS AVANZADAS V4\n');
    console.log('=' .repeat(60));

    // 1. Estado actual
    console.log('\n📊 ESTADO DEL SISTEMA:');
    const state = await db.getLastState();
    console.log(state);

    // 2. Resumen emocional
    console.log('\n😊 RESUMEN EMOCIONAL:');
    const emo = await db.db.get(`
        SELECT AVG(alegria) AS alegria_prom,
               AVG(tristeza) AS tristeza_prom,
               AVG(miedo) AS miedo_prom,
               AVG(ira) AS ira_prom,
               AVG(confianza) AS confianza_prom,
               AVG(ansiedad) AS ansiedad_prom,
               AVG(bienestar) AS bienestar_prom,
               MAX(alegria) AS alegria_max,
               MIN(alegria) AS alegria_min
        FROM emociones_estados
    `);
    console.log(emo);

    // 3. Rendimiento cognitivo
    console.log('\n🧠 RENDIMIENTO COGNITIVO:');
    const cog = await db.getCognitivePerformance();
    console.log(cog.slice(0, 5));

    // 4. Evolución de personalidad
    console.log('\n🧬 EVOLUCIÓN DE PERSONALIDAD:');
    const pers = await db.getPersonalityEvolution();
    console.log(pers.slice(-5));

    // 5. Memorias más fuertes
    console.log('\n💾 MEMORIAS MÁS FUERTES:');
    const mem = await db.getStrongestMemories(5);
    console.log(mem);

    // 6. Tendencias emocionales
    console.log('\n📈 TENDENCIAS EMOCIONALES:');
    const trends = await db.getEmotionalTrends('day');
    console.log(trends.slice(0, 5));

    // 7. Salud del sistema
    console.log('\n🏥 SALUD DEL SISTEMA:');
    const health = await db.getSystemHealthReport();
    console.log(health);

    // 8. Estadísticas de memoria
    console.log('\n📚 ESTADÍSTICAS DE MEMORIA:');
    const memStats = await db.getMemoryStatistics();
    console.log(memStats);

    // 9. Patrones
    console.log('\n🔍 ANÁLISIS DE PATRONES:');
    const pat = await db.getPatternAnalysis();
    console.log(pat);

    // 10. Feed de aprendizaje
    console.log('\n📖 FEED DE APRENDIZAJE (últimos 5):');
    const feed = await db.getLearningFeed(5);
    console.log(feed);

    // 11. Métricas de red
    console.log('\n🌐 MÉTRICAS DE RED:');
    const net = await db.getNetworkMetrics();
    console.log(net);

    // 12. Correlaciones
    console.log('\n🔗 CORRELACIÓN oxígeno ↔ alegría:');
    const corr = await db.findCorrelations('oxigeno', 'alegria', 'day');
    console.log(corr);

    // 13. Anomalías
    console.log('\n⚠️ ANOMALÍAS DETECTADAS:');
    const anom = await db.detectAnomalies(2.5);
    console.log(anom.slice(0, 5));

    // 14. Predicciones
    console.log('\n🔮 PREDICCIÓN energía (horizonte 10):');
    const pred = await db.predictFuture('energia', 10);
    console.log(pred);

    // 15. Métricas DB
    console.log('\n📊 MÉTRICAS DE BD:');
    const metrics = await db.getMetrics();
    console.log(metrics);

    await db.close();
    console.log('\n✅ Consultas completadas');
}

queryDatabase().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
