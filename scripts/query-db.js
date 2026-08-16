// scripts/query-db.js
import { DatabaseManager } from '../src/core/DatabaseManager.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function queryDatabase() {
    const db = new DatabaseManager();
    await db.initialize();
    
    console.log('🔍 EJECUTANDO CONSULTAS AVANZADAS...\n');
    
    // 1. Estado completo del sistema
    console.log('📊 ESTADO COMPLETO DEL SISTEMA:');
    const fullState = await db.getState('sistema_estados');
    console.log(fullState);
    console.log('---');
    
    // 2. Resumen emocional
    console.log('😊 RESUMEN EMOCIONAL:');
    const emotionalSummary = await db.db.get(`
        SELECT 
            AVG(alegria) as alegria_promedio,
            AVG(tristeza) as tristeza_promedio,
            AVG(miedo) as miedo_promedio,
            AVG(ira) as ira_promedio,
            AVG(confianza) as confianza_promedio,
            AVG(bienestar) as bienestar_promedio,
            MAX(alegria) as alegria_max,
            MIN(alegria) as alegria_min
        FROM emociones_estados
    `);
    console.log(emotionalSummary);
    console.log('---');
    
    // 3. Rendimiento cognitivo
    console.log('🧠 RENDIMIENTO COGNITIVO:');
    const cognitivePerformance = await db.getCognitivePerformance();
    console.log(cognitivePerformance.slice(0, 5));
    console.log('---');
    
    // 4. Evolución de personalidad
    console.log('🧬 EVOLUCIÓN DE PERSONALIDAD:');
    const personalityEvo = await db.getPersonalityEvolution();
    console.log(personalityEvo.slice(-5));
    console.log('---');
    
    // 5. Memorias más fuertes
    console.log('💾 MEMORIAS MÁS FUERTES:');
    const strongMemories = await db.getStrongestMemories(5);
    console.log(strongMemories);
    console.log('---');
    
    // 6. Tendencias emocionales
    console.log('📈 TENDENCIAS EMOCIONALES:');
    const emotionalTrends = await db.getEmotionalTrends('hour');
    console.log(emotionalTrends.slice(0, 5));
    console.log('---');
    
    // 7. Salud del sistema
    console.log('🏥 SALUD DEL SISTEMA:');
    const healthReport = await db.getSystemHealthReport();
    console.log(healthReport);
    console.log('---');
    
    // 8. Estadísticas de memoria
    console.log('📚 ESTADÍSTICAS DE MEMORIA:');
    const memoryStats = await db.getMemoryStatistics();
    console.log(memoryStats);
    console.log('---');
    
    // 9. Análisis de patrones
    console.log('🔍 ANÁLISIS DE PATRONES:');
    const patternAnalysis = await db.getPatternAnalysis();
    console.log(patternAnalysis);
    console.log('---');
    
    // 10. Métricas de red neuronal
    console.log('🌐 MÉTRICAS DE RED NEURONAL:');
    const networkMetrics = await db.getNetworkMetrics();
    console.log(networkMetrics);
    console.log('---');
    
    // 11. Análisis de tendencias
    console.log('📊 ANÁLISIS DE TENDENCIAS (Oxígeno):');
    const trends = await db.analyzeTrends('oxigeno', 'day');
    console.log(trends.slice(0, 5));
    console.log('---');
    
    // 12. Correlaciones
    console.log('🔗 CORRELACIONES (Oxígeno vs Alegría):');
    const correlations = await db.findCorrelations('oxigeno', 'alegria', 'day');
    console.log(correlations);
    console.log('---');
    
    // 13. Anomalías detectadas
    console.log('⚠️ ANOMALÍAS DETECTADAS:');
    const anomalies = await db.detectAnomalies(2.5);
    console.log(anomalies.slice(0, 5));
    console.log('---');
    
    // 14. Predicciones
    console.log('🔮 PREDICCIONES (Energía, horizonte 10):');
    const prediction = await db.predictFuture('energia', 10);
    console.log(prediction);
    console.log('---');
    
    // 15. Métricas de la base de datos
    console.log('📊 MÉTRICAS DE BASE DE DATOS:');
    const metrics = await db.getMetrics();
    console.log(metrics);
    
    await db.close();
    console.log('\n✅ Consultas completadas');
}

queryDatabase().catch(console.error);
