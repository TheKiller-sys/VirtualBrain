// scripts/monitor-db.js
import { DatabaseManager } from '../src/core/DatabaseManager.js';

async function monitorDatabase() {
    console.log('📊 MONITOREO EN TIEMPO REAL');
    console.log('=' .repeat(50));
    console.log('Presiona Ctrl+C para salir\n');
    
    const db = new DatabaseManager();
    await db.initialize();
    
    let lastStats = null;
    
    setInterval(async () => {
        console.clear();
        console.log('📊 MONITOREO EN TIEMPO REAL');
        console.log('=' .repeat(50));
        console.log(`🕐 ${new Date().toLocaleTimeString()}\n`);
        
        // Estadísticas rápidas
        const stats = await db.quickStats();
        console.log('📈 ESTADÍSTICAS:');
        console.log(`   Estados: ${stats.states.count}`);
        console.log(`   Emociones: ${stats.emotions.count}`);
        console.log(`   Bioquímica: ${stats.biochemical.count}`);
        console.log(`   Cognitivo: ${stats.cognitive.count}`);
        console.log(`   Memorias: ${stats.memories.count}`);
        console.log(`   Decisiones: ${stats.decisions.count}`);
        console.log(`   Pensamientos: ${stats.thoughts.count}`);
        console.log(`   Patrones: ${stats.patterns.count}`);
        console.log(`   Conexiones: ${stats.connections.count}`);
        
        // Último estado
        const lastState = await db.getLastState();
        if (lastState) {
            console.log('\n🎯 ÚLTIMO ESTADO:');
            console.log(`   Estabilidad: ${(lastState.estabilidad * 100).toFixed(1)}%`);
            console.log(`   Rendimiento: ${(lastState.rendimiento * 100).toFixed(1)}%`);
            console.log(`   Consciencia: ${(lastState.nivel_consciencia * 100).toFixed(1)}%`);
        }
        
        // Última emoción
        const lastEmotion = await db.getLastEmotionalState();
        if (lastEmotion) {
            console.log('\n😊 ÚLTIMA EMOCIÓN:');
            console.log(`   Alegría: ${lastEmotion.alegria.toFixed(1)}%`);
            console.log(`   Confianza: ${lastEmotion.confianza.toFixed(1)}%`);
            console.log(`   Ansiedad: ${lastEmotion.ansiedad.toFixed(1)}%`);
            console.log(`   Bienestar: ${lastEmotion.bienestar.toFixed(1)}%`);
        }
        
        // Último pensamiento
        const thoughts = await db.getRecentThoughts(1);
        if (thoughts.length > 0) {
            console.log('\n💭 ÚLTIMO PENSAMIENTO:');
            console.log(`   ${thoughts[0].contenido}`);
        }
        
        // Métricas de la base de datos
        const metrics = await db.getMetrics();
        console.log('\n🗄️ MÉTRICAS DB:');
        console.log(`   Tamaño: ${(metrics.databaseSize / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`   Cache Hits: ${metrics.cacheHits}`);
        console.log(`   Cache Misses: ${metrics.cacheMisses}`);
        console.log(`   Avg Query: ${metrics.avgQueryTime.toFixed(2)} ms`);
        
        lastStats = stats;
        
    }, 2000);
}

monitorDatabase().catch(console.error);
