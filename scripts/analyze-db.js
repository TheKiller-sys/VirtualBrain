// scripts/analyze-db.js
import { DatabaseManager } from '../src/core/DatabaseManager.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzeDatabase() {
    console.log('🔬 ANÁLISIS PROFUNDO DE BD V4');
    console.log('=' .repeat(60));

    const db = new DatabaseManager();
    await db.initialize();

    // 1. Crecimiento
    console.log('\n📈 CRECIMIENTO (últimos 30 días):');
    const growth = await db.db.all(`
        SELECT date(created_at) AS fecha,
               COUNT(*) AS registros,
               COUNT(DISTINCT tipo) AS tipos
        FROM sistema_eventos
        GROUP BY date(created_at)
        ORDER BY fecha DESC
        LIMIT 30
    `);
    console.log(growth.length ? growth : '(sin datos)');

    // 2. Distribución de emociones
    console.log('\n😊 DISTRIBUCIÓN DE EMOCIONES:');
    const emoDist = await db.db.all(`
        SELECT 'alegria' AS emocion, AVG(alegria) AS promedio, MAX(alegria) AS maximo, MIN(alegria) AS minimo FROM emociones_estados
        UNION ALL
        SELECT 'tristeza', AVG(tristeza), MAX(tristeza), MIN(tristeza) FROM emociones_estados
        UNION ALL
        SELECT 'miedo', AVG(miedo), MAX(miedo), MIN(miedo) FROM emociones_estados
        UNION ALL
        SELECT 'ira', AVG(ira), MAX(ira), MIN(ira) FROM emociones_estados
        UNION ALL
        SELECT 'ansiedad', AVG(ansiedad), MAX(ansiedad), MIN(ansiedad) FROM emociones_estados
        UNION ALL
        SELECT 'bienestar', AVG(bienestar), MAX(bienestar), MIN(bienestar) FROM emociones_estados
    `);
    console.log(emoDist);

    // 3. Correlaciones (usando función custom CORR)
    console.log('\n🔗 CORRELACIONES (con función custom SQLite):');
    const correlations = [
        { nombre: 'oxigeno-alegria', t1: 'bioquimica_estados', c1: 'oxigeno', t2: 'emociones_estados', c2: 'alegria' },
        { nombre: 'energia-confianza', t1: 'bioquimica_estados', c1: 'energia', t2: 'emociones_estados', c2: 'confianza' },
        { nombre: 'cortisol-miedo', t1: 'bioquimica_neurotransmisores', c1: 'cortisol', t2: 'emociones_estados', c2: 'miedo' },
        { nombre: 'dopamina-alegria', t1: 'bioquimica_neurotransmisores', c1: 'dopamina', t2: 'emociones_estados', c2: 'alegria' }
    ];
    for (const c of correlations) {
        try {
            const r = await db.db.get(`
                SELECT CORR(a.${c.c1}, b.${c.c2}) AS correlacion, COUNT(*) AS muestras
                FROM ${c.t1} a
                JOIN ${c.t2} b ON a.timestamp = b.timestamp
            `);
            console.log(`   ${c.nombre}: r=${(r?.correlacion || 0).toFixed(3)} (n=${r?.muestras || 0})`);
        } catch (err) {
            console.log(`   ${c.nombre}: error ${err.message}`);
        }
    }

    // 4. Patrones temporales
    console.log('\n🕐 PATRONES TEMPORALES:');
    const temporal = await db.db.all(`
        SELECT strftime('%H', datetime(timestamp / 1000, 'unixepoch')) AS hora,
               AVG(alegria) AS alegria_prom,
               AVG(miedo) AS miedo_prom,
               AVG(confianza) AS confianza_prom,
               COUNT(*) AS muestras
        FROM emociones_estados
        GROUP BY hora
        ORDER BY hora
    `);
    console.log(temporal.length ? temporal : '(sin datos)');

    // 5. Eficiencia del sistema
    console.log('\n⚡ EFICIENCIA DEL SISTEMA:');
    const eff = await db.db.get(`
        SELECT AVG(estabilidad) AS estabilidad_prom,
               AVG(rendimiento) AS rendimiento_prom,
               AVG(nivel_consciencia) AS consciencia_prom,
               MAX(estabilidad) AS estabilidad_max,
               MIN(estabilidad) AS estabilidad_min,
               COUNT(*) AS muestras
        FROM sistema_estados
    `);
    console.log(eff);

    // 6. Análisis de memoria
    console.log('\n💾 ANÁLISIS DE MEMORIA:');
    const mem = await db.db.all(`
        SELECT tipo,
               COUNT(*) AS cantidad,
               AVG(fuerza) AS fuerza_prom,
               AVG(importancia) AS imp_prom,
               SUM(CASE WHEN consolidada = 1 THEN 1 ELSE 0 END) AS consolidadas
        FROM memoria_episodica
        GROUP BY tipo
        ORDER BY cantidad DESC
    `);
    console.log(mem);

    // 7. Evolución de personalidad
    console.log('\n🧬 EVOLUCIÓN DE PERSONALIDAD:');
    const pers = await db.db.all(`
        SELECT timestamp, apertura, conciencia, extraversion, amabilidad, neuroticismo,
               (apertura + conciencia + extraversion + amabilidad + (1 - neuroticismo)) / 5 AS salud
        FROM personalidad_rasgos
        ORDER BY timestamp ASC
    `);
    console.log(`   Muestras: ${pers.length}`);
    if (pers.length > 0) {
        const first = pers[0];
        const last = pers[pers.length - 1];
        console.log(`   Primera: salud=${(first.salud || 0).toFixed(3)}`);
        console.log(`   Última:  salud=${(last.salud || 0).toFixed(3)}`);
        console.log(`   Cambio:  ${(((last.salud || 0) - (first.salud || 0)) * 100).toFixed(2)}%`);
    }

    // 8. Decisiones
    console.log('\n🎯 ANÁLISIS DE DECISIONES:');
    const dec = await db.db.all(`
        SELECT resultado,
               COUNT(*) AS cantidad,
               AVG(confianza) AS confianza_prom,
               AVG(tiempo_procesamiento) AS tiempo_prom
        FROM cognitivo_decisiones
        GROUP BY resultado
    `);
    console.log(dec);

    // 9. Sueño
    console.log('\n😴 ESTADÍSTICAS DE SUEÑO:');
    const sleep = await db.db.get(`
        SELECT AVG(calidad_sueno) AS calidad_prom,
               AVG(eficiencia_sueno) AS eficiencia_prom,
               AVG(presion_sueno) AS presion_prom,
               MAX(calidad_sueno) AS calidad_max,
               MIN(calidad_sueno) AS calidad_min,
               COUNT(*) AS muestras
        FROM sueno_estados
    `);
    console.log(sleep);

    // 10. Resumen general
    console.log('\n📊 RESUMEN GENERAL:');
    const summary = await db.db.get(`
        SELECT
            (SELECT COUNT(*) FROM sistema_estados) AS estados,
            (SELECT COUNT(*) FROM emociones_estados) AS emociones,
            (SELECT COUNT(*) FROM bioquimica_estados) AS bioquimica,
            (SELECT COUNT(*) FROM cognitivo_estados) AS cognitivo,
            (SELECT COUNT(*) FROM memoria_episodica) AS memorias,
            (SELECT COUNT(*) FROM cognitivo_decisiones) AS decisiones,
            (SELECT COUNT(*) FROM cognitivo_pensamientos) AS pensamientos,
            (SELECT COUNT(*) FROM motor_habilidades) AS habilidades,
            (SELECT COUNT(*) FROM cognitivo_aprendizaje) AS eventos_aprendizaje
    `);
    console.log(summary);

    await db.close();
    console.log('\n✅ Análisis completado');
}

analyzeDatabase().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
