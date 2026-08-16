// ============ CONSULTAS AVANZADAS ============

    async getState(table) {
        const query = `SELECT * FROM ${table} ORDER BY timestamp DESC LIMIT 1`;
        return this.db.get(query);
    }

    async getStateHistory(table, limit = 100) {
        const query = `SELECT * FROM ${table} ORDER BY timestamp DESC LIMIT ?`;
        return this.db.all(query, limit);
    }

    async getEmotionalTrends(period = 'day') {
        const periodMap = {
            'hour': 3600000,
            'day': 86400000,
            'week': 604800000,
            'month': 2592000000
        };
        const interval = periodMap[period] || 86400000;
        const since = Date.now() - interval;

        const query = `
            SELECT 
                timestamp,
                alegria,
                tristeza,
                miedo,
                ira,
                confianza,
                ansiedad,
                bienestar,
                (alegria + confianza) as emociones_positivas,
                (tristeza + miedo + ira) as emociones_negativas,
                CASE 
                    WHEN (alegria + confianza) > (tristeza + miedo + ira) THEN 'positivo'
                    ELSE 'negativo'
                END as tendencia_emocional
            FROM emociones_estados
            WHERE timestamp > ?
            ORDER BY timestamp ASC
        `;
        return this.db.all(query, since);
    }

    async getCognitivePerformance() {
        const query = `
            SELECT 
                timestamp,
                atencion,
                concentracion,
                razonamiento,
                toma_decisiones,
                (atencion + concentracion + razonamiento + toma_decisiones) / 4 as rendimiento_cognitivo,
                fatiga,
                carga,
                CASE 
                    WHEN (atencion + concentracion + razonamiento) / 3 > 70 THEN 'alto'
                    WHEN (atencion + concentracion + razonamiento) / 3 > 50 THEN 'medio'
                    ELSE 'bajo'
                END as nivel_cognitivo
            FROM cognitivo_estados
            ORDER BY timestamp DESC
            LIMIT 100
        `;
        return this.db.all(query);
    }

    async getPersonalityEvolution() {
        const query = `
            SELECT 
                timestamp,
                apertura,
                conciencia,
                extraversion,
                amabilidad,
                neuroticismo,
                (apertura + conciencia + extraversion + amabilidad + (1 - neuroticismo)) / 5 as salud_personalidad
            FROM personalidad_rasgos
            ORDER BY timestamp ASC
        `;
        return this.db.all(query);
    }

    async getSystemHealthReport() {
        const query = `
            SELECT 
                s.estabilidad,
                s.rendimiento,
                s.nivel_consciencia,
                e.bienestar,
                e.ansiedad,
                b.oxigeno,
                b.energia,
                b.cortisol,
                c.atencion,
                c.carga,
                p.apertura,
                p.conciencia,
                (s.estabilidad + s.rendimiento + s.nivel_consciencia + e.bienestar/100) / 4 as salud_general,
                CASE 
                    WHEN s.estabilidad > 0.7 AND e.bienestar > 50 THEN 'EXCELENTE'
                    WHEN s.estabilidad > 0.5 AND e.bienestar > 30 THEN 'BUENO'
                    WHEN s.estabilidad > 0.3 AND e.bienestar > 20 THEN 'REGULAR'
                    ELSE 'CRÍTICO'
                END as estado_general
            FROM sistema_estados s
            LEFT JOIN emociones_estados e ON s.timestamp = e.timestamp
            LEFT JOIN bioquimica_estados b ON s.timestamp = b.timestamp
            LEFT JOIN cognitivo_estados c ON s.timestamp = c.timestamp
            LEFT JOIN personalidad_rasgos p ON s.timestamp = p.timestamp
            ORDER BY s.timestamp DESC
            LIMIT 1
        `;
        return this.db.get(query);
    }

    async getMemoryStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_memorias,
                SUM(CASE WHEN consolidada = 1 THEN 1 ELSE 0 END) as consolidadas,
                AVG(fuerza) as fuerza_promedio,
                AVG(importancia) as importancia_promedio,
                MAX(fuerza) as fuerza_maxima,
                MIN(fuerza) as fuerza_minima,
                AVG(accesos) as accesos_promedio,
                COUNT(DISTINCT emocion_asociada) as emociones_distintas,
                GROUP_CONCAT(DISTINCT emocion_asociada) as emociones_presentes
            FROM memoria_episodica
        `;
        return this.db.get(query);
    }

    async getPatternAnalysis() {
        const query = `
            SELECT 
                tipo,
                COUNT(*) as frecuencia,
                AVG(confianza) as confianza_promedio,
                MAX(timestamp) as ultima_deteccion,
                MIN(timestamp) as primera_deteccion
            FROM patrones_detectados
            GROUP BY tipo
            ORDER BY frecuencia DESC
        `;
        return this.db.all(query);
    }

    async getNetworkMetrics() {
        const query = `
            SELECT 
                COUNT(*) as total_neuronas,
                AVG(activacion) as activacion_promedio,
                AVG(umbral) as umbral_promedio,
                COUNT(DISTINCT tipo) as tipos_neuronas,
                (SELECT COUNT(*) FROM redes_conexiones) as total_conexiones,
                (SELECT AVG(peso) FROM redes_conexiones) as peso_promedio
            FROM redes_neuronas
        `;
        return this.db.get(query);
    }

    // ============ ANÁLISIS AVANZADO ============

    async analyzeTrends(variable, period = 'hour') {
        const periodMap = {
            'hour': 3600000,
            'day': 86400000,
            'week': 604800000,
            'month': 2592000000
        };
        const interval = periodMap[period] || 86400000;
        const since = Date.now() - interval;

        const tableMap = {
            'oxigeno': 'bioquimica_estados',
            'energia': 'bioquimica_estados',
            'alegria': 'emociones_estados',
            'tristeza': 'emociones_estados',
            'miedo': 'emociones_estados',
            'ira': 'emociones_estados',
            'atencion': 'cognitivo_estados',
            'concentracion': 'cognitivo_estados',
            'estabilidad': 'sistema_estados',
            'nivel_consciencia': 'sistema_estados'
        };

        const table = tableMap[variable];
        if (!table) throw new Error(`Variable ${variable} no encontrada`);

        const query = `
            SELECT 
                timestamp,
                ${variable} as valor,
                AVG(${variable}) OVER (ORDER BY timestamp ROWS BETWEEN 5 PRECEDING AND 5 FOLLOWING) as media_movil,
                ${variable} - AVG(${variable}) OVER (ORDER BY timestamp ROWS BETWEEN 5 PRECEDING AND 5 FOLLOWING) as desviacion,
                CASE 
                    WHEN ${variable} > AVG(${variable}) OVER (ORDER BY timestamp ROWS BETWEEN 5 PRECEDING AND 5 FOLLOWING) * 1.2 THEN 'ALZA'
                    WHEN ${variable} < AVG(${variable}) OVER (ORDER BY timestamp ROWS BETWEEN 5 PRECEDING AND 5 FOLLOWING) * 0.8 THEN 'BAJA'
                    ELSE 'ESTABLE'
                END as tendencia
            FROM ${table}
            WHERE timestamp > ?
            ORDER BY timestamp ASC
        `;

        return this.db.all(query, since);
    }

    async findCorrelations(variable1, variable2, period = 'day') {
        const periodMap = {
            'day': 86400000,
            'week': 604800000,
            'month': 2592000000
        };
        const interval = periodMap[period] || 86400000;
        const since = Date.now() - interval;

        const query = `
            WITH datos AS (
                SELECT 
                    a.timestamp,
                    a.${variable1} as v1,
                    b.${variable2} as v2
                FROM bioquimica_estados a
                JOIN emociones_estados b ON a.timestamp = b.timestamp
                WHERE a.timestamp > ?
                AND b.timestamp > ?
            )
            SELECT 
                CORR(v1, v2) as correlacion,
                COUNT(*) as muestras,
                AVG(v1) as media_v1,
                AVG(v2) as media_v2,
                STDDEV(v1) as std_v1,
                STDDEV(v2) as std_v2
            FROM datos
        `;

        return this.db.get(query, [since, since]);
    }

    async detectAnomalies(threshold = 2.5) {
        const query = `
            WITH stats AS (
                SELECT 
                    variable,
                    AVG(valor) as media,
                    STDDEV(valor) as desviacion
                FROM analisis_anomalias
                GROUP BY variable
            )
            SELECT 
                a.*,
                s.media,
                s.desviacion,
                (a.valor - s.media) / s.desviacion as z_score,
                CASE 
                    WHEN ABS((a.valor - s.media) / s.desviacion) > ? THEN 'CRÍTICA'
                    WHEN ABS((a.valor - s.media) / s.desviacion) > 2 THEN 'ALTA'
                    WHEN ABS((a.valor - s.media) / s.desviacion) > 1.5 THEN 'MEDIA'
                    ELSE 'BAJA'
                END as severidad
            FROM analisis_anomalias a
            JOIN stats s ON a.variable = s.variable
            WHERE a.timestamp > ?
            ORDER BY a.timestamp DESC
        `;

        const since = Date.now() - 86400000 * 7;
        return this.db.all(query, [threshold, since]);
    }

    async predictFuture(variable, horizon = 10) {
        const query = `
            WITH datos AS (
                SELECT 
                    timestamp,
                    ${variable} as valor,
                    ROW_NUMBER() OVER (ORDER BY timestamp) as idx
                FROM bioquimica_estados
                WHERE ${variable} IS NOT NULL
                ORDER BY timestamp DESC
                LIMIT 100
            ),
            tendencia AS (
                SELECT 
                    AVG(valor) as media,
                    AVG(idx) as media_idx,
                    (SUM(idx * valor) - SUM(idx) * SUM(valor) / COUNT(*)) / 
                    (SUM(idx * idx) - SUM(idx) * SUM(idx) / COUNT(*)) as pendiente
                FROM datos
            )
            SELECT 
                media + pendiente * (idx + ?) as prediccion,
                media,
                pendiente,
                COUNT(*) as muestras
            FROM datos, tendencia
            GROUP BY idx
            ORDER BY idx DESC
            LIMIT 1
        `;

        return this.db.get(query, [horizon]);
    }

    async getDecisionPatterns() {
        const query = `
            SELECT 
                decision,
                COUNT(*) as frecuencia,
                AVG(confianza) as confianza_promedio,
                AVG(tiempo_procesamiento) as tiempo_promedio,
                SUM(CASE WHEN resultado = 'exito' THEN 1 ELSE 0 END) as exitos,
                SUM(CASE WHEN resultado = 'fallo' THEN 1 ELSE 0 END) as fallos,
                emocion_dominante,
                GROUP_CONCAT(contexto) as contextos
            FROM cognitivo_decisiones
            GROUP BY decision
            ORDER BY frecuencia DESC
            LIMIT 20
        `;
        return this.db.all(query);
    }

    async getThoughtPatterns() {
        const query = `
            SELECT 
                tipo,
                COUNT(*) as frecuencia,
                AVG(intensidad) as intensidad_promedio,
                AVG(nivel_consciencia) as consciencia_promedio,
                emocion_asociada,
                GROUP_CONCAT(contenido) as ejemplos
            FROM cognitivo_pensamientos
            GROUP BY tipo
            ORDER BY frecuencia DESC
        `;
        return this.db.all(query);
    }

    async getMotorSkillReport() {
        const query = `
            SELECT 
                nombre,
                tipo,
                nivel,
                practicas,
                eficiencia,
                mastery,
                complejidad,
                CASE 
                    WHEN mastery > 80 THEN 'experto'
                    WHEN mastery > 60 THEN 'avanzado'
                    WHEN mastery > 40 THEN 'intermedio'
                    ELSE 'principiante'
                END as nivel_habilidad
            FROM motor_habilidades
            ORDER BY mastery DESC
        `;
        return this.db.all(query);
    }

    async getSocialNetwork() {
        const query = `
            SELECT 
                entidad,
                tipo_relacion,
                confianza,
                conexion,
                interacciones,
                CASE 
                    WHEN confianza > 70 AND conexion > 70 THEN 'fuerte'
                    WHEN confianza > 50 AND conexion > 50 THEN 'media'
                    ELSE 'débil'
                END as calidad_relacion
            FROM social_relaciones
            ORDER BY conexion DESC
        `;
        return this.db.all(query);
    }

    async getSleepAnalysis() {
        const query = `
            SELECT 
                estado,
                COUNT(*) as frecuencia,
                AVG(presion_sueno) as presion_promedio,
                AVG(profundidad) as profundidad_promedio,
                AVG(calidad_sueno) as calidad_promedio,
                MIN(timestamp) as primera_vez,
                MAX(timestamp) as ultima_vez
            FROM sueno_estados
            GROUP BY estado
            ORDER BY frecuencia DESC
        `;
        return this.db.all(query);
    }

    async getNeurotransmitterBalance() {
        const query = `
            SELECT 
                AVG(dopamina) as dopamina_promedio,
                AVG(serotonina) as serotonina_promedio,
                AVG(noradrenalina) as noradrenalina_promedio,
                AVG(cortisol) as cortisol_promedio,
                AVG(oxitocina) as oxitocina_promedio,
                AVG(gaba) as gaba_promedio,
                AVG(glutamato) as glutamato_promedio,
                AVG(dopamina) / AVG(cortisol) as ratio_dopamina_cortisol,
                AVG(serotonina) / AVG(cortisol) as ratio_serotonina_cortisol
            FROM bioquimica_neurotransmisores
        `;
        return this.db.get(query);
    }

    async getSystemPerformance() {
        const query = `
            SELECT 
                AVG(estabilidad) as estabilidad_promedio,
                AVG(rendimiento) as rendimiento_promedio,
                AVG(nivel_consciencia) as consciencia_promedio,
                MAX(estabilidad) as estabilidad_max,
                MIN(estabilidad) as estabilidad_min,
                (SELECT AVG(estabilidad) FROM sistema_estados WHERE timestamp > ?) as estabilidad_reciente,
                (SELECT AVG(estabilidad) FROM sistema_estados WHERE timestamp < ?) as estabilidad_anterior
            FROM sistema_estados
        `;
        const now = Date.now();
        return this.db.get(query, [now - 3600000, now - 3600000]);
    }

    async getEmotionalRegulation() {
        const query = `
            SELECT 
                estrategia,
                COUNT(*) as usos,
                AVG(efectividad) as efectividad_promedio,
                AVG(duracion) as duracion_promedio,
                emocion_inicial,
                emocion_final,
                CASE 
                    WHEN AVG(efectividad) > 0.7 THEN 'alta'
                    WHEN AVG(efectividad) > 0.4 THEN 'media'
                    ELSE 'baja'
                END as efectividad_nivel
            FROM emociones_regulacion
            GROUP BY estrategia
            ORDER BY usos DESC
        `;
        return this.db.all(query);
    }

    async getPatternCorrelations() {
        const query = `
            SELECT 
                p1.patron as patron_1,
                p2.patron as patron_2,
                COUNT(*) as co_ocurrencias,
                (COUNT(*) * 1.0 / (SELECT COUNT(*) FROM patrones_detectados)) as frecuencia_relativa
            FROM patrones_detectados p1
            JOIN patrones_detectados p2 ON p1.timestamp = p2.timestamp AND p1.id < p2.id
            GROUP BY p1.patron, p2.patron
            HAVING co_ocurrencias > 1
            ORDER BY co_ocurrencias DESC
            LIMIT 20
        `;
        return this.db.all(query);
    }

    async getCognitiveFlow() {
        const query = `
            SELECT 
                timestamp,
                atencion,
                concentracion,
                razonamiento,
                creatividad,
                (atencion + concentracion + razonamiento + creatividad) / 4 as estado_flow,
                CASE 
                    WHEN (atencion + concentracion + razonamiento + creatividad) / 4 > 70 
                    AND carga < 50 THEN 'FLOW'
                    WHEN (atencion + concentracion + razonamiento + creatividad) / 4 < 30 
                    OR carga > 70 THEN 'ESTRES'
                    ELSE 'NEUTRAL'
                END as estado_cognitivo
            FROM cognitivo_estados
            ORDER BY timestamp DESC
            LIMIT 100
        `;
        return this.db.all(query);
    }

    async getPersonalityInsights() {
        const query = `
            SELECT 
                r.*,
                s.estabilidad,
                s.adaptabilidad,
                (r.apertura + r.conciencia + r.extraversion + r.amabilidad + (1 - r.neuroticismo)) / 5 as salud_personalidad,
                CASE 
                    WHEN r.apertura > 0.7 AND r.conciencia > 0.7 THEN 'VISIONARIO'
                    WHEN r.apertura > 0.7 AND r.extraversion > 0.7 THEN 'CREATIVO_SOCIAL'
                    WHEN r.conciencia > 0.7 AND r.amabilidad > 0.7 THEN 'ORGANIZADO_EMPATICO'
                    WHEN r.neuroticismo > 0.7 THEN 'SENSIBLE'
                    ELSE 'BALANCEADO'
                END as perfil_personalidad
            FROM personalidad_rasgos r
            JOIN personalidad_estados s ON r.timestamp = s.timestamp
            ORDER BY r.timestamp DESC
            LIMIT 1
        `;
        return this.db.get(query);
    }

    async getAdvancedMetrics() {
        const metrics = {
            system: await this.getSystemPerformance(),
            emotional: await this.getEmotionalTrends('day'),
            cognitive: await this.getCognitivePerformance(),
            personality: await this.getPersonalityEvolution(),
            memory: await this.getMemoryStatistics(),
            sleep: await this.getSleepAnalysis(),
            motor: await this.getMotorSkillReport(),
            social: await this.getSocialNetwork(),
            neurotransmitters: await this.getNeurotransmitterBalance(),
            patterns: await this.getPatternAnalysis(),
            decisions: await this.getDecisionPatterns(),
            thoughts: await this.getThoughtPatterns()
        };
        return metrics;
    }

    // ============ EXPORTACIÓN E IMPORTACIÓN ============

    async exportToJSON(limit = 100) {
        const data = {
            timestamp: Date.now(),
            version: '4.0.0',
            tables: {}
        };

        const tables = await this.db.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' 
            AND name NOT LIKE 'sqlite_%'
            AND name NOT LIKE 'temporal_%'
        `);

        for (const table of tables) {
            const query = `SELECT * FROM ${table.name} ORDER BY timestamp DESC LIMIT ?`;
            data.tables[table.name] = await this.db.all(query, limit);
        }

        return data;
    }

    async importFromJSON(data) {
        const tables = Object.keys(data.tables);
        
        for (const table of tables) {
            const rows = data.tables[table];
            if (rows.length === 0) continue;

            // Obtener columnas
            const columns = Object.keys(rows[0]);
            const placeholders = columns.map(() => '?').join(',');
            
            for (const row of rows) {
                const values = columns.map(col => row[col]);
                const query = `INSERT OR IGNORE INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;
                await this.db.run(query, values);
            }
        }

        console.log(`✅ Importados datos de ${tables.length} tablas`);
    }

    // ============ MANTENIMIENTO AVANZADO ============

    async optimize() {
        console.log('🔧 Optimizando base de datos...');
        
        // Analizar tablas
        const tables = await this.db.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `);

        for (const table of tables) {
            await this.db.exec(`ANALYZE ${table.name}`);
        }

        // Reconstruir índices
        await this.db.exec('REINDEX');

        // Vacuum
        await this.db.exec('VACUUM');

        // Limpiar caché
        this.cache.clear();

        console.log('✅ Optimización completada');
    }

    async checkIntegrity() {
        const results = await this.db.exec('PRAGMA integrity_check');
        const foreignKeys = await this.db.exec('PRAGMA foreign_key_check');
        
        return {
            integrity: results[0]?.integrity_check === 'ok',
            foreignKeys: foreignKeys.length === 0,
            details: results,
            foreignKeyDetails: foreignKeys
        };
    }

    async getDatabaseStats() {
        const stats = {
            size: await this.db.get('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()'),
            tables: await this.db.all("SELECT name FROM sqlite_master WHERE type='table'"),
            indexes: await this.db.all("SELECT name FROM sqlite_master WHERE type='index'"),
            triggers: await this.db.all("SELECT name FROM sqlite_master WHERE type='trigger'"),
            views: await this.db.all("SELECT name FROM sqlite_master WHERE type='view'"),
            wal: await this.db.get('PRAGMA wal_checkpoint')
        };
        return stats;
    }

    async beginTransaction() {
        if (this.isTransactionActive) return;
        this.isTransactionActive = true;
        await this.db.exec('BEGIN TRANSACTION');
    }

    async commitTransaction() {
        if (!this.isTransactionActive) return;
        await this.db.exec('COMMIT');
        this.isTransactionActive = false;
    }

    async rollbackTransaction() {
        if (!this.isTransactionActive) return;
        await this.db.exec('ROLLBACK');
        this.isTransactionActive = false;
    }

    // ============ MÉTODOS DE CONSULTA RÁPIDA ============

    async quickStats() {
        return {
            states: await this.db.get('SELECT COUNT(*) as count FROM sistema_estados'),
            emotions: await this.db.get('SELECT COUNT(*) as count FROM emociones_estados'),
            biochemical: await this.db.get('SELECT COUNT(*) as count FROM bioquimica_estados'),
            cognitive: await this.db.get('SELECT COUNT(*) as count FROM cognitivo_estados'),
            memories: await this.db.get('SELECT COUNT(*) as count FROM memoria_episodica'),
            decisions: await this.db.get('SELECT COUNT(*) as count FROM cognitivo_decisiones'),
            thoughts: await this.db.get('SELECT COUNT(*) as count FROM cognitivo_pensamientos'),
            patterns: await this.db.get('SELECT COUNT(*) as count FROM patrones_detectados'),
            connections: await this.db.get('SELECT COUNT(*) as count FROM redes_conexiones')
        };
    }

    async getLastState() {
        return this.getState('sistema_estados');
    }

    async getLastEmotionalState() {
        return this.getState('emociones_estados');
    }

    async getLastBiochemicalState() {
        return this.getState('bioquimica_estados');
    }

    async getLastCognitiveState() {
        return this.getState('cognitivo_estados');
    }

    async getCurrentPersonality() {
        return this.getState('personalidad_rasgos');
    }

    async getRecentThoughts(limit = 10) {
        const query = `
            SELECT * FROM cognitivo_pensamientos 
            ORDER BY timestamp DESC 
            LIMIT ?
        `;
        return this.db.all(query, limit);
    }

    async getRecentDecisions(limit = 10) {
        const query = `
            SELECT * FROM cognitivo_decisiones 
            ORDER BY timestamp DESC 
            LIMIT ?
        `;
        return this.db.all(query, limit);
    }

    async getRecentMemories(limit = 10) {
        const query = `
            SELECT * FROM memoria_episodica 
            ORDER BY timestamp DESC 
            LIMIT ?
        `;
        return this.db.all(query, limit);
    }

    async getSleepHistory(limit = 100) {
        const query = `
            SELECT * FROM sueno_estados 
            ORDER BY timestamp DESC 
            LIMIT ?
        `;
        return this.db.all(query, limit);
    }

    async getMotorSkills() {
        const query = `
            SELECT * FROM motor_habilidades 
            ORDER BY nivel DESC
        `;
        return this.db.all(query);
    }

    async getSocialConnections() {
        const query = `
            SELECT * FROM social_relaciones 
            ORDER BY conexion DESC
        `;
        return this.db.all(query);
    }
}

export { DatabaseManager };
