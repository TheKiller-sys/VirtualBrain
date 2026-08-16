// scripts/analyze-db.js
import { DatabaseManager } from '../src/core/DatabaseManager.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzeDatabase() {
    console.log('🔬 ANÁLISIS PROFUNDO DE BASE DE DATOS\n');
    console.log('=' .repeat(60));
    
    const db = new DatabaseManager();
    await db.initialize();
    
    // 1. Análisis de crecimiento
    console.log('\n📈 ANÁLISIS DE CRECIMIENTO:');
    const growth = await db.db.all(`
        SELECT 
            date(created_at) as fecha,
            COUNT(*) as registros,
            COUNT(DISTINCT tipo) as tipos
        FROM sistema_eventos
        GROUP BY date(created_at)
        ORDER BY fecha DESC
        LIMIT 30
    `);
    console.log(growth);
    
    // 2. Distribución de emociones
    console.log('\n😊 DISTRIBUCIÓN DE EMOCIONES:');
    const emotionDist = await db.db.all(`
        SELECT 
            'alegria' as emocion,
            AVG(alegria) as promedio,
            MAX(alegria) as maximo,
            MIN(alegria) as minimo
        FROM emociones_estados
        UNION ALL
        SELECT 
            'tristeza',
            AVG(tristeza),
            MAX(tristeza),
            MIN(tristeza)
        FROM emociones_estados
        UNION ALL
        SELECT 
            'miedo',
            AVG(miedo),
            MAX(miedo),
            MIN(miedo)
        FROM emociones_estados
        UNION ALL
        SELECT 
            'ira',
            AVG(ira),
            MAX(ira),
            MIN(ira)
        FROM emociones_estados
    `);
    console.log(emotionDist);
    
    // 3. Análisis de correlaciones
    console.log('\n🔗 CORRELACIONES SIGNIFICATIVAS:');
    const correlations = await db.db.all(`
        SELECT 
            'oxigeno-alegria' as par,
            (AVG(oxigeno * alegria) - AVG(oxigeno) * AVG(alegria)) / 
            (STDDEV(oxigeno) * STDDEV(alegria)) as correlacion
        FROM bioquimica_estados b
        JOIN emociones_estados e ON b.timestamp = e.timestamp
        UNION ALL
        SELECT 
            'energia-confianza',
            (AVG(energia * confianza) - AVG(energia) * AVG(confianza)) / 
            (STDDEV(energia) * STDDEV(confianza))
        FROM bioquimica_estados b
        JOIN emociones_estados e ON b.timestamp = e.timestamp
        UNION ALL
        SELECT 
            'cortisol-miedo',
            (AVG(cortisol * miedo) - AVG(cortisol) * AVG(miedo)) / 
            (STDDEV(cortisol) * STDDEV(miedo))
        FROM bioquimica_estados b
        JOIN emociones_estados e ON b.timestamp = e.timestamp
        UNION ALL
        SELECT 
            'dopamina-alegria',
            (AVG(dopamina * alegria) - AVG(dopamina) * AVG(alegria)) / 
            (STDDEV(dopamina) * STDDEV(alegria))
        FROM bioquimica_estados b
        JOIN emociones_estados e ON b.timestamp = e.timestamp
    `);
    console.log(correlations);
    
    // 4. Patrones temporales
    console.log('\n🕐 PATRONES TEMPORALES:');
    const temporalPatterns = await db.db.all(`
        SELECT 
            strftime('%H', datetime(timestamp/1000, 'unixepoch')) as hora,
            AVG(alegria) as alegria_promedio,
            AVG(miedo) as miedo_promedio,
            AVG(confianza) as confianza_promedio,
            COUNT(*) as muestras
        FROM emociones_estados
        GROUP BY hora
        ORDER BY hora
    `);
    console.log(temporalPatterns);
    
    // 5. Eficiencia del sistema
    console.log('\n⚡ EFICIENCIA DEL SISTEMA:');
    const efficiency = await db.db.get(`
        SELECT 
            AVG(estabilidad) as estabilidad_promedio,
            AVG(rendimiento) as rendimiento_promedio,
            AVG(nivel_consciencia) as consciencia_promedio,
            MAX(estabilidad) as estabilidad_maxima,
            MIN(estabilidad) as estabilidad_minima,
            COUNT(*) as muestras
        FROM sistema_estados
    `);
    console.log(efficiency);
    
    // 6. Análisis de memoria
    console.log('\n💾 ANÁLISIS DE MEMORIA:');
    const memoryAnalysis = await db.db.all(`
        SELECT 
            tipo,
            COUNT(*) as cantidad,
            AVG(fuerza) as fuerza_promedio,
            AVG(importancia) as importancia_promedio,
            SUM(CASE WHEN consolidada = 1 THEN 1 ELSE 0 END) as consolidadas
        FROM memoria_episodica
        GROUP BY tipo
        ORDER BY cantidad DESC
    `);
    console.log(memoryAnalysis);
    
    // 7. Evolución de personalidad
    console.log('\n🧬 EVOLUCIÓN DE PERSONALIDAD:');
    const personalityEvo = await db.db.all(`
        SELECT 
            timestamp,
            apertura,
            conciencia,
            extraversion,
            amabilidad,
            neuroticismo,
            (apertura + conciencia + extraversion + amabilidad + (1 - neuroticismo)) / 5 as salud
        FROM personalidad_rasgos
        ORDER BY timestamp ASC
    `);
    console.log(`Muestras: ${personalityEvo.length}`);
    if (personalityEvo.length > 0) {
        const first = personalityEvo[0];
        const last = personalityEvo[personalityEvo.length - 1];
        console.log('Primera muestra:', first);
        console.log('Última muestra:', last);
        console.log(`Cambio en salud: ${((last.salud - first.salud) * 100).toFixed(2)}%`);
    }
    
    // 8. Análisis de decisiones
    console.log('\n🎯 ANÁLISIS DE DECISIONES:');
    const decisionAnalysis = await db.db.all(`
        SELECT 
            resultado,
            COUNT(*) as cantidad,
            AVG(confianza) as confianza_promedio,
            AVG(tiempo_procesamiento) as tiempo_promedio
        FROM cognitivo_decisiones
        GROUP BY resultado
    `);
    console.log(decisionAnalysis);
    
    // 9. Estadísticas de sueño
    console.log('\n😴 ESTADÍSTICAS DE SUEÑO:');
    const sleepStats = await db.db.get(`
        SELECT 
            AVG(calidad_sueno) as calidad_promedio,
            AVG(eficiencia_sueno) as eficiencia_promedio,
            AVG(presion_sueno) as presion_promedio,
            MAX(calidad_sueno) as calidad_maxima,
            MIN(calidad_sueno) as calidad_minima,
            COUNT(*) as muestras
        FROM sueno_estados
    `);
    console.log(sleepStats);
    
    // 10. Resumen general
    console.log('\n📊 RESUMEN GENERAL:');
    const summary = await db.db.get(`
        SELECT 
            (SELECT COUNT(*) FROM sistema_estados) as estados,
            (SELECT COUNT(*) FROM emociones_estados) as emociones,
            (SELECT COUNT(*) FROM bioquimica_estados) as bioquimica,
            (SELECT COUNT(*) FROM cognitivo_estados) as cognitivo,
            (SELECT COUNT(*) FROM memoria_episodica) as memorias,
            (SELECT COUNT(*) FROM cognitivo_decisiones) as decisiones,
            (SELECT COUNT(*) FROM cognitivo_pensamientos) as pensamientos,
            (SELECT COUNT(*) FROM motor_acciones) as acciones
    `);
    console.log(summary);
    
    await db.close();
    console.log('\n✅ Análisis completado');
}

analyzeDatabase().catch(console.error);
