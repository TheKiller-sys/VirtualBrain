// scripts/init-db.js
import { DatabaseManager } from '../src/core/DatabaseManager.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initializeDatabase() {
    console.log('🧠 Inicializando Base de Datos Ultra Avanzada V4...');
    console.log('=' .repeat(60));

    const db = new DatabaseManager();
    const ok = await db.initialize();

    if (!ok) {
        console.error('❌ Error inicializando base de datos');
        process.exit(1);
    }

    console.log('✅ Base de datos inicializada correctamente\n');

    // Estructura
    const tables = await db.db.all(
        `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
    );
    console.log(`📊 ${tables.length} tablas creadas`);

    const views = await db.db.all(
        `SELECT name FROM sqlite_master WHERE type='view' ORDER BY name`
    );
    console.log(`👁️  ${views.length} vistas creadas`);

    const triggers = await db.db.all(
        `SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name`
    );
    console.log(`⚡ ${triggers.length} triggers creados`);

    const indexes = await db.db.all(
        `SELECT name FROM sqlite_master WHERE type='index' ORDER BY name`
    );
    console.log(`📌 ${indexes.length} índices creados\n`);

    // Datos de ejemplo
    console.log('📝 Insertando datos de ejemplo...');
    await insertSampleData(db);

    // Backup inicial
    console.log('\n💾 Creando backup inicial...');
    await db.createBackup();

    // Métricas finales
    const metrics = await db.getMetrics();
    console.log('\n📊 Métricas finales:');
    console.log(`   - Tamaño: ${(metrics.databaseSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   - Tablas: ${metrics.tableCount}`);
    console.log(`   - Vistas: ${metrics.viewCount}`);
    console.log(`   - Triggers: ${metrics.triggerCount}`);
    console.log(`   - Índices: ${metrics.indexCount}`);

    await db.close();
    console.log('\n✅ Inicialización completada con éxito');
}

async function insertSampleData(db) {
    // 1. Estados del sistema
    const states = [
        { estabilidad: 0.85, rendimiento: 0.75, nivel_consciencia: 0.15, integridad: 0.95, emergencia: 0 },
        { estabilidad: 0.82, rendimiento: 0.78, nivel_consciencia: 0.18, integridad: 0.93, emergencia: 0 },
        { estabilidad: 0.88, rendimiento: 0.80, nivel_consciencia: 0.22, integridad: 0.96, emergencia: 0 }
    ];
    for (const s of states) {
        await db.saveState('sistema_estados', {
            ...s,
            datos: JSON.stringify({ sample: true, timestamp: Date.now() })
        });
    }

    // 2. Bioquímica
    const bioSamples = [
        { oxigeno: 95, energia: 80, toxicidad: 5, cortisol: 25, dopamina: 55, serotonina: 60 },
        { oxigeno: 92, energia: 75, toxicidad: 8, cortisol: 35, dopamina: 50, serotonina: 55 },
        { oxigeno: 97, energia: 85, toxicidad: 3, cortisol: 20, dopamina: 60, serotonina: 65 }
    ];
    for (const s of bioSamples) await db.saveBiochemicalState(s);

    // 3. Emociones
    const emoSamples = [
        { alegria: 30, tristeza: 10, miedo: 5, ira: 5, confianza: 60, ansiedad: 15, bienestar: 70 },
        { alegria: 25, tristeza: 15, miedo: 8, ira: 7, confianza: 55, ansiedad: 20, bienestar: 65 },
        { alegria: 35, tristeza: 8, miedo: 3, ira: 4, confianza: 65, ansiedad: 12, bienestar: 75 }
    ];
    for (const s of emoSamples) await db.saveEmotionalState(s);

    // 4. Cognitivo
    const cogSamples = [
        { atencion: 80, concentracion: 75, razonamiento: 70, tomaDecisiones: 75, creatividad: 45, curiosidad: 55 },
        { atencion: 75, concentracion: 70, razonamiento: 68, tomaDecisiones: 72, creatividad: 48, curiosidad: 60 },
        { atencion: 85, concentracion: 80, razonamiento: 75, tomaDecisiones: 78, creatividad: 42, curiosidad: 50 }
    ];
    for (const s of cogSamples) await db.saveCognitiveState(s);

    // 5. Personalidad
    const persSamples = [
        { openness: 0.6, conscientiousness: 0.7, extraversion: 0.5, agreeableness: 0.7, neuroticism: 0.3 },
        { openness: 0.62, conscientiousness: 0.72, extraversion: 0.52, agreeableness: 0.68, neuroticism: 0.28 },
        { openness: 0.58, conscientiousness: 0.68, extraversion: 0.48, agreeableness: 0.72, neuroticism: 0.32 }
    ];
    for (const s of persSamples) await db.savePersonality(s);

    // 6. Memorias
    const memories = [
        { contenido: 'Primera experiencia de aprendizaje', tipo: 'aprendizaje', fuerza: 0.8, importancia: 0.9, emocion_asociada: 'curiosidad', consolidada: true },
        { contenido: 'Momento de alegría intensa', tipo: 'emocional', fuerza: 0.9, importancia: 0.85, emocion_asociada: 'alegria', consolidada: true },
        { contenido: 'Aprendiendo a meditar', tipo: 'aprendizaje', fuerza: 0.7, importancia: 0.75, emocion_asociada: 'tranquilidad', consolidada: true },
        { contenido: 'Interacción social significativa', tipo: 'social', fuerza: 0.75, importancia: 0.8, emocion_asociada: 'confianza', consolidada: true },
        { contenido: 'Momento de miedo', tipo: 'emocional', fuerza: 0.85, importancia: 0.7, emocion_asociada: 'miedo', consolidada: true },
        { contenido: 'Descubrimiento creativo', tipo: 'aprendizaje', fuerza: 0.6, importancia: 0.65, emocion_asociada: 'sorpresa', consolidada: true }
    ];
    for (const m of memories) await db.saveMemory(m);

    // 7. Decisiones
    const decisions = [
        { decision: 'Explorar entorno', confianza: 0.8, contexto: { situacion: 'nueva' }, resultado: 'exito', emocion_dominante: 'curiosidad' },
        { decision: 'Analizar situación', confianza: 0.9, contexto: { situacion: 'evaluacion' }, resultado: 'exito', emocion_dominante: 'confianza' },
        { decision: 'Buscar ayuda', confianza: 0.7, contexto: { situacion: 'compleja' }, resultado: 'pendiente', emocion_dominante: 'confianza' }
    ];
    for (const d of decisions) await db.saveDecision(d);

    // 8. Pensamientos
    const thoughts = [
        { contenido: 'Estoy aprendiendo algo nuevo', tipo: 'consciente', intensidad: 0.7, emocion_asociada: 'curiosidad' },
        { contenido: 'Siento que estoy creciendo', tipo: 'reflexivo', intensidad: 0.6, emocion_asociada: 'orgullo' },
        { contenido: 'Me pregunto qué hay más allá', tipo: 'creativo', intensidad: 0.8, emocion_asociada: 'sorpresa' },
        { contenido: 'Confío en mis capacidades', tipo: 'consciente', intensidad: 0.75, emocion_asociada: 'confianza' }
    ];
    for (const t of thoughts) await db.saveThought(t);

    // 9. Conexiones neuronales
    const connections = [
        { origin: 'experiencia', destination: 'aprendizaje', strength: 0.8 },
        { origin: 'aprendizaje', destination: 'crecimiento', strength: 0.7 },
        { origin: 'emocion', destination: 'memoria', strength: 0.9 },
        { origin: 'memoria', destination: 'decision', strength: 0.6 },
        { origin: 'pensamiento', destination: 'accion', strength: 0.5 }
    ];
    for (const c of connections) {
        await db.saveConnection(c.origin, c.destination, c.strength);
    }

    // 10. Metas de motivación
    const goals = [
        { tipo: 'aprendizaje', descripcion: 'Explorar nuevos conceptos', impulso: 'curiosidad', prioridad: 8, progreso: 30 },
        { tipo: 'crecimiento', descripcion: 'Desarrollar habilidades', impulso: 'logro', prioridad: 7, progreso: 50 },
        { tipo: 'social', descripcion: 'Conectar con otros', impulso: 'afiliacion', prioridad: 6, progreso: 20 }
    ];
    for (const g of goals) {
        await db.db.run(
            `INSERT INTO motivacion_metas (timestamp, tipo, descripcion, impulso_asociado, prioridad, progreso, completada)
             VALUES (?, ?, ?, ?, ?, ?, 0)`,
            [Date.now(), g.tipo, g.descripcion, g.impulso, g.prioridad, g.progreso]
        );
    }

    // 11. Patrones
    const patterns = [
        { tipo: 'emocional', patron: 'ciclo_ansiedad', confianza: 0.85, frecuencia: 3 },
        { tipo: 'cognitivo', patron: 'pensamiento_creativo', confianza: 0.75, frecuencia: 5 },
        { tipo: 'conductual', patron: 'aprendizaje_activo', confianza: 0.9, frecuencia: 4 }
    ];
    for (const p of patterns) {
        await db.db.run(
            `INSERT INTO patrones_detectados (timestamp, tipo, patron, confianza, frecuencia)
             VALUES (?, ?, ?, ?, ?)`,
            [Date.now(), p.tipo, p.patron, p.confianza, p.frecuencia]
        );
    }

    // 12. Sueño
    const sleepStates = [
        { estado: 'despierto', presion_sueno: 30, profundidad: 0.1, calidad_sueno: 0.8 },
        { estado: 'somnoliento', presion_sueno: 60, profundidad: 0.3, calidad_sueno: 0.7 },
        { estado: 'dormido', presion_sueno: 80, profundidad: 0.5, calidad_sueno: 0.85 }
    ];
    for (const s of sleepStates) await db.saveSleepState(s);

    // 13. Habilidades motoras
    const skills = [
        { nombre: 'caminar', tipo: 'locomocion', complejidad: 2, nivel: 85, practicas: 150, eficiencia: 0.9, mastery: 80 },
        { nombre: 'correr', tipo: 'locomocion', complejidad: 4, nivel: 70, practicas: 80, eficiencia: 0.75, mastery: 60 },
        { nombre: 'meditar', tipo: 'habilidad', complejidad: 6, nivel: 65, practicas: 40, eficiencia: 0.7, mastery: 55 }
    ];
    for (const s of skills) {
        await db.db.run(
            `INSERT OR IGNORE INTO motor_habilidades
                (nombre, tipo, complejidad, nivel, practicas, eficiencia, mastery, ultimo_uso)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [s.nombre, s.tipo, s.complejidad, s.nivel, s.practicas, s.eficiencia, s.mastery, Date.now()]
        );
    }

    // 14. Eventos de aprendizaje (feed)
    const learnings = [
        { habilidad: 'explorar_entorno', nivel_anterior: 20, nivel_nuevo: 45, ganancia: 25, metodo: 'interacción', exito: 1 },
        { habilidad: 'gestionar_emociones', nivel_anterior: 10, nivel_nuevo: 38, ganancia: 28, metodo: 'reflexión', exito: 1 },
        { habilidad: 'tomar_decisiones', nivel_anterior: 30, nivel_nuevo: 52, ganancia: 22, metodo: 'simulación', exito: 1 }
    ];
    for (const l of learnings) await db.saveLearningEvent(l);

    console.log('✅ Datos de ejemplo insertados:');
    console.log(`   - ${states.length} estados del sistema`);
    console.log(`   - ${bioSamples.length} muestras bioquímicas`);
    console.log(`   - ${emoSamples.length} muestras emocionales`);
    console.log(`   - ${cogSamples.length} muestras cognitivas`);
    console.log(`   - ${persSamples.length} muestras de personalidad`);
    console.log(`   - ${memories.length} memorias`);
    console.log(`   - ${decisions.length} decisiones`);
    console.log(`   - ${thoughts.length} pensamientos`);
    console.log(`   - ${connections.length} conexiones`);
    console.log(`   - ${goals.length} metas`);
    console.log(`   - ${patterns.length} patrones`);
    console.log(`   - ${sleepStates.length} estados de sueño`);
    console.log(`   - ${skills.length} habilidades motoras`);
    console.log(`   - ${learnings.length} eventos de aprendizaje`);
}

initializeDatabase().catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
