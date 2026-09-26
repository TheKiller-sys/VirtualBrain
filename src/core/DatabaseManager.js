// src/core/DatabaseManager.js
// Base de datos ultra avanzada con funciones SQLite personalizadas — V4.3
//
// CAMBIOS CLAVE V4.3:
//  - saveConversationBatch ya NO trunca a 2000 chars. Usa
//    TUNING.chat.maxMessageLength (10000). Antes se perdía el 80%
//    de los mensajes largos en el histórico.
//
// CAMBIOS CLAVE V4.2:
//  - Tablas conversaciones + conversacion_temas (sesiones)
//  - Índices para historial de conversación por sesión
//  - saveConversationBatch, getConversationHistory, getRecentConversations
//
// CAMBIOS CLAVE V4.1:
//  - timestamp (ms reales) + sim_time (segundos simulados) en toda tabla persistible
//  - JOINs por buckets temporales (no por igualdad exacta)
//  - savePersonality() inserta historial real
//  - _countCache invalidada en TODAS las escrituras
//  - _columnCache con TTL
//  - saveState() usa ?? en vez de ||

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { TUNING } from '../config/tuning.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DatabaseManager {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.dbPath = process.env.DATABASE_PATH ||
            path.join(__dirname, '../../database/cerebro.db');
        this.backupInterval = null;

        // Caches con TTL
        this.cache = new Map();
        this.cacheTimeout = TUNING.historicalCacheTTL;
        this._columnCache = new Map();
        this._columnCacheTTL = TUNING.columnCacheTTL;

        // Cache separada para counts (evita 6 COUNT(*) por /api/state)
        this._countCache = { data: null, at: 0, ttl: TUNING.metricsCacheTTL };

        this.metrics = {
            queries: 0,
            cacheHits: 0,
            cacheMisses: 0,
            avgQueryTime: 0,
            errors: 0
        };

        // Definición de tablas que tienen columnas timestamp + sim_time.
        // saveState() las añade automáticamente si faltan.
        this._timestampedTables = new Set([
            'sistema_estados', 'sistema_metricas', 'sistema_eventos',
            'bioquimica_estados', 'bioquimica_neurotransmisores',
            'bioquimica_hormonas', 'bioquimica_signos_vitales',
            'emociones_estados', 'emociones_dimensiones',
            'cognitivo_estados', 'cognitivo_decisiones', 'cognitivo_pensamientos',
            'cognitivo_aprendizaje',
            'memoria_episodica', 'memoria_trabajo',
            'personalidad_rasgos', 'personalidad_subrasgos', 'personalidad_estados',
            'motivacion_impulsos', 'motivacion_estados',
            'sueno_estados', 'motor_estados', 'motor_acciones',
            'social_interacciones', 'patrones_detectados',
            // V4.2
            'conversaciones'
        ]);
    }

    // ============================================================
    // INICIALIZACIÓN
    // ============================================================

    async initialize() {
        try {
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

            this.db = await open({
                filename: this.dbPath,
                driver: sqlite3.Database
            });

            // PRAGMAs (page_size solo aplica en BD nuevas)
            await this.db.exec('PRAGMA journal_mode = WAL');
            await this.db.exec('PRAGMA synchronous = NORMAL');
            await this.db.exec('PRAGMA cache_size = -200000');
            await this.db.exec('PRAGMA temp_store = MEMORY');
            await this.db.exec('PRAGMA mmap_size = 268435456');
            await this.db.exec('PRAGMA wal_autocheckpoint = 1000');
            await this.db.exec('PRAGMA foreign_keys = ON');
            await this.db.exec('PRAGMA busy_timeout = 5000');

            await this.createAllTables();
            await this.ensureTimestampColumns();
            await this.createAllIndexes();
            await this.createAllViews();
            await this.createAllTriggers();
            await this.migrateTriggers();
            await this.createAllFunctions();
            await this.initializeData();

            this.isInitialized = true;
            this.startAutoBackup();

            console.log('🗄️ Base de datos V4.3 inicializada');
            return true;
        } catch (error) {
            console.error('❌ Error inicializando DB:', error.message);
            try {
                if (this.backupInterval) clearInterval(this.backupInterval);
                if (this.db) { try { await this.db.close(); } catch (_) {} this.db = null; }
            } catch (_) {}
            this.isInitialized = false;
            return false;
        }
    }

    /**
     * Garantiza que todas las tablas timestamped tengan columnas timestamp + sim_time.
     * Se ejecuta en cada arranque; es idempotente.
     */
    async ensureTimestampColumns() {
        for (const table of this._timestampedTables) {
            const cols = await this.db.all(`PRAGMA table_info(${table})`);
            const names = cols.map(c => c.name);
            if (!names.includes('sim_time')) {
                try {
                    await this.db.exec(`ALTER TABLE ${table} ADD COLUMN sim_time REAL DEFAULT 0`);
                } catch (err) {
                    console.warn(`⚠️ No se pudo añadir sim_time a ${table}: ${err.message}`);
                }
            }
        }
        // Invalidar cache de columnas
        this._columnCache.clear();
    }

    startAutoBackup() {
        const interval = parseInt(process.env.DB_BACKUP_INTERVAL) || 3600000;
        this.backupInterval = setInterval(() => {
            this.createBackup().catch(err => console.error('Backup error:', err.message));
        }, interval);
        if (this.backupInterval.unref) this.backupInterval.unref();
    }

    async createBackup() {
        try {
            if (fs.existsSync(this.dbPath)) {
                const stat = fs.statSync(this.dbPath);
                if (stat.size < TUNING.autoBackupMinSizeKb * 1024) return null;
            }
            const backupDir = path.join(path.dirname(this.dbPath), 'backups');
            if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(backupDir, `cerebro_${timestamp}.db`);

            try { await this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); } catch (_) {}
            fs.copyFileSync(this.dbPath, backupPath);

            const backups = fs.readdirSync(backupDir)
                .filter(f => f.startsWith('cerebro_') && f.endsWith('.db'))
                .sort();
            while (backups.length > TUNING.autoBackupMaxFiles) {
                const old = backups.shift();
                try { fs.unlinkSync(path.join(backupDir, old)); } catch (_) {}
            }
            return backupPath;
        } catch (error) {
            console.error('❌ Error creando backup:', error.message);
            return null;
        }
    }

    // ============================================================
    // UTILIDADES INTERNAS
    // ============================================================

    _invalidateCache(prefix = null) {
        if (prefix === null) {
            this.cache.clear();
        } else {
            for (const key of this.cache.keys()) {
                if (key.startsWith(prefix)) this.cache.delete(key);
            }
        }
        // Toda escritura invalida los counts
        this._countCache.at = 0;
    }

    async _getTableColumns(table) {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
            throw new Error(`Nombre de tabla inválido: ${table}`);
        }
        const cached = this._columnCache.get(table);
        if (cached && (Date.now() - cached.at) < this._columnCacheTTL) {
            return cached.cols;
        }
        const cols = await this.db.all(`PRAGMA table_info(${table})`);
        const names = cols.map(c => c.name);
        this._columnCache.set(table, { cols: names, at: Date.now() });
        return names;
    }

    _trackQuery(startTime) {
        const dt = Date.now() - startTime;
        this.metrics.queries++;
        this.metrics.avgQueryTime = this.metrics.avgQueryTime * 0.9 + dt * 0.1;
    }

    // ============================================================
    // CREACIÓN DE TABLAS
    // ============================================================

    async createAllTables() {
        // Sistema
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS sistema_estados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                sim_time REAL DEFAULT 0,
                estabilidad REAL DEFAULT 0,
                rendimiento REAL DEFAULT 0,
                nivel_consciencia REAL DEFAULT 0,
                integridad REAL DEFAULT 1,
                emergencia INTEGER DEFAULT 0,
                alertas_activas INTEGER DEFAULT 0,
                datos TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS sistema_metricas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                sim_time REAL DEFAULT 0,
                cpu_usage REAL,
                memory_usage REAL,
                query_count INTEGER,
                cache_hits INTEGER,
                cache_misses INTEGER,
                avg_response_time REAL,
                active_connections INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS sistema_eventos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                sim_time REAL DEFAULT 0,
                tipo TEXT,
                fuente TEXT,
                datos TEXT,
                importancia INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS sistema_alertas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                sim_time REAL DEFAULT 0,
                nivel TEXT,
                mensaje TEXT,
                modulo TEXT,
                resuelta INTEGER DEFAULT 0,
                tiempo_resolucion INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS sistema_backups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                ruta TEXT,
                tamaño INTEGER,
                tipo TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS sistema_metricas_avanzadas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                sim_time REAL DEFAULT 0,
                clave TEXT,
                valor TEXT,
                categoria TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Bioquímica
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS bioquimica_estados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                sim_time REAL DEFAULT 0,
                oxigeno REAL DEFAULT 0, energia REAL DEFAULT 0, toxicidad REAL DEFAULT 0,
                temperatura REAL DEFAULT 37, ph REAL DEFAULT 7.4, glucosa REAL DEFAULT 80,
                lactato REAL DEFAULT 10, creatinina REAL DEFAULT 1, urea REAL DEFAULT 20,
                estado_hidratacion REAL DEFAULT 80, dioxido_carbono REAL DEFAULT 0,
                monoxido_carbono REAL DEFAULT 0, oxido_nitrico REAL DEFAULT 5,
                recuperacion REAL DEFAULT 75, fatiga_acumulada REAL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS bioquimica_neurotransmisores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                sim_time REAL DEFAULT 0,
                dopamina REAL DEFAULT 50, serotonina REAL DEFAULT 50, noradrenalina REAL DEFAULT 50,
                cortisol REAL DEFAULT 20, oxitocina REAL DEFAULT 30, gaba REAL DEFAULT 50,
                glutamato REAL DEFAULT 50, endorfinas REAL DEFAULT 30, acetilcolina REAL DEFAULT 50,
                adrenalina REAL DEFAULT 10, histamina REAL DEFAULT 20, melatonina REAL DEFAULT 20,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS bioquimica_hormonas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE, sim_time REAL DEFAULT 0,
                hormona_crecimiento REAL DEFAULT 25, testosterona REAL DEFAULT 30,
                estradiol REAL DEFAULT 20, insulina REAL DEFAULT 15, glucagon REAL DEFAULT 10,
                leptina REAL DEFAULT 20, grelina REAL DEFAULT 20,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS bioquimica_signos_vitales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE, sim_time REAL DEFAULT 0,
                frecuencia_cardiaca REAL DEFAULT 72, presion_sistolica REAL DEFAULT 120,
                presion_diastolica REAL DEFAULT 80, saturacion_oxigeno REAL DEFAULT 98,
                ritmo_respiratorio REAL DEFAULT 16, variabilidad_cardiaca REAL DEFAULT 50,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Emociones
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS emociones_estados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE, sim_time REAL DEFAULT 0,
                alegria REAL DEFAULT 20, tristeza REAL DEFAULT 10, miedo REAL DEFAULT 5,
                ira REAL DEFAULT 5, asco REAL DEFAULT 3, sorpresa REAL DEFAULT 8,
                confianza REAL DEFAULT 50, verguenza REAL DEFAULT 5, orgullo REAL DEFAULT 15,
                culpa REAL DEFAULT 5, envidia REAL DEFAULT 3, gratitud REAL DEFAULT 20,
                esperanza REAL DEFAULT 30, aceptacion REAL DEFAULT 40, frustracion REAL DEFAULT 20,
                nostalgia REAL DEFAULT 15, conexion REAL DEFAULT 45, soledad REAL DEFAULT 10,
                ansiedad REAL DEFAULT 20, bienestar REAL DEFAULT 65, depresion REAL DEFAULT 10,
                euforia REAL DEFAULT 5,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS emociones_dimensiones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE, sim_time REAL DEFAULT 0,
                valencia REAL DEFAULT 0.6, activacion REAL DEFAULT 0.5, dominio REAL DEFAULT 0.7,
                intensidad REAL DEFAULT 0.5, complejidad REAL DEFAULT 0.3, polaridad REAL DEFAULT 0.6,
                regulacion REAL DEFAULT 0.7, estabilidad REAL DEFAULT 80, resiliencia REAL DEFAULT 75,
                sensibilidad REAL DEFAULT 50, humor REAL DEFAULT 60,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Cognitivo
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS cognitivo_estados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE, sim_time REAL DEFAULT 0,
                atencion REAL DEFAULT 80, concentracion REAL DEFAULT 75,
                memoria_trabajo REAL DEFAULT 70, velocidad_procesamiento REAL DEFAULT 65,
                razonamiento REAL DEFAULT 70, toma_decisiones REAL DEFAULT 75,
                planificacion REAL DEFAULT 65, flexibilidad REAL DEFAULT 60,
                inhibicion REAL DEFAULT 70, creatividad REAL DEFAULT 40,
                intuicion REAL DEFAULT 45, curiosidad REAL DEFAULT 50,
                insight REAL DEFAULT 30, fluidez REAL DEFAULT 65,
                carga REAL DEFAULT 30, fatiga REAL DEFAULT 20, estres REAL DEFAULT 25,
                autoconciencia REAL DEFAULT 65, monitoreo REAL DEFAULT 70,
                regulacion REAL DEFAULT 60, aprendizaje REAL DEFAULT 70,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS cognitivo_decisiones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER, sim_time REAL DEFAULT 0,
                decision TEXT, opciones TEXT, contexto TEXT,
                confianza REAL DEFAULT 0.5, tiempo_procesamiento REAL DEFAULT 0,
                emocion_dominante TEXT, resultado TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS cognitivo_pensamientos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER, sim_time REAL DEFAULT 0,
                contenido TEXT, tipo TEXT DEFAULT 'consciente',
                intensidad REAL DEFAULT 0.5, emocion_asociada TEXT,
                nivel_consciencia REAL DEFAULT 0.5,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS cognitivo_aprendizaje (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER, sim_time REAL DEFAULT 0,
                habilidad TEXT, nivel_anterior REAL, nivel_nuevo REAL,
                ganancia REAL, metodo TEXT, exito INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Memoria
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS memoria_episodica (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER, sim_time REAL DEFAULT 0,
                contenido TEXT, contexto TEXT,
                fuerza REAL DEFAULT 0.5, importancia REAL DEFAULT 0.5,
                emocion_asociada TEXT DEFAULT 'neutral',
                consolidada INTEGER DEFAULT 0, accesos INTEGER DEFAULT 0,
                ultimo_acceso INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS memoria_semantica (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                concepto TEXT UNIQUE, significado TEXT,
                fuerza REAL DEFAULT 0.3, contextos INTEGER DEFAULT 1,
                ultima_actualizacion INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS memoria_procedural (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                habilidad TEXT UNIQUE, nivel REAL DEFAULT 0, practicas INTEGER DEFAULT 0,
                eficiencia REAL DEFAULT 0.5, complejidad REAL DEFAULT 5,
                importancia REAL DEFAULT 0.5, ultima_practica INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS memoria_trabajo (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER, sim_time REAL DEFAULT 0,
                contenido TEXT, fuerza REAL DEFAULT 0.5, tipo TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS memoria_emocional (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER, sim_time REAL DEFAULT 0,
                contenido TEXT, emocion TEXT,
                intensidad REAL DEFAULT 0.5, importancia REAL DEFAULT 0.5,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS memoria_espacial (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ubicacion TEXT UNIQUE, coordenadas_x REAL DEFAULT 0,
                coordenadas_y REAL DEFAULT 0, coordenadas_z REAL DEFAULT 0,
                precision REAL DEFAULT 0.5, importancia REAL DEFAULT 0.5,
                ultimo_acceso INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS memoria_social (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entidad TEXT UNIQUE, relacion TEXT,
                confianza REAL DEFAULT 0.5, conexion REAL DEFAULT 0.5,
                interacciones INTEGER DEFAULT 0, ultima_interaccion INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Personalidad
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS personalidad_rasgos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE, sim_time REAL DEFAULT 0,
                apertura REAL DEFAULT 0.5, conciencia REAL DEFAULT 0.5,
                extraversion REAL DEFAULT 0.5, amabilidad REAL DEFAULT 0.5,
                neuroticismo REAL DEFAULT 0.5,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS personalidad_subrasgos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE, sim_time REAL DEFAULT 0,
                curiosidad REAL DEFAULT 0.5, creatividad REAL DEFAULT 0.5,
                imaginacion REAL DEFAULT 0.5, disciplina REAL DEFAULT 0.5,
                organizacion REAL DEFAULT 0.5, responsabilidad REAL DEFAULT 0.5,
                sociabilidad REAL DEFAULT 0.5, asertividad REAL DEFAULT 0.5,
                energia REAL DEFAULT 0.5, empatia REAL DEFAULT 0.5,
                cooperacion REAL DEFAULT 0.5, confianza REAL DEFAULT 0.5,
                ansiedad REAL DEFAULT 0.5, vulnerabilidad REAL DEFAULT 0.5,
                inestabilidad REAL DEFAULT 0.5,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS personalidad_estados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE, sim_time REAL DEFAULT 0,
                estabilidad REAL DEFAULT 0.7, flexibilidad REAL DEFAULT 0.5,
                adaptabilidad REAL DEFAULT 0.6, integridad REAL DEFAULT 0.8,
                madurez REAL DEFAULT 0.4, sabiduria REAL DEFAULT 0.3,
                autenticidad REAL DEFAULT 0.6, bienestar REAL DEFAULT 0.6,
                satisfaccion REAL DEFAULT 0.5, proposito REAL DEFAULT 0.4,
                autoconocimiento REAL DEFAULT 0.5,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS personalidad_evolucion (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER, sim_time REAL DEFAULT 0,
                rasgo TEXT, valor_anterior REAL, valor_nuevo REAL,
                delta REAL, causa TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Motivación
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS motivacion_impulsos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE, sim_time REAL DEFAULT 0,
                hambre REAL DEFAULT 0.3, sed REAL DEFAULT 0.2, confort REAL DEFAULT 0.4,
                seguridad REAL DEFAULT 0.6, curiosidad REAL DEFAULT 0.5, logro REAL DEFAULT 0.4,
                afiliacion REAL DEFAULT 0.5, poder REAL DEFAULT 0.3, autonomia REAL DEFAULT 0.6,
                competencia REAL DEFAULT 0.4, estatus REAL DEFAULT 0.3, pertenencia REAL DEFAULT 0.5,
                reconocimiento REAL DEFAULT 0.4, contribucion REAL DEFAULT 0.3,
                exploracion REAL DEFAULT 0.5, significado REAL DEFAULT 0.3,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS motivacion_estados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE, sim_time REAL DEFAULT 0,
                intensidad REAL DEFAULT 0.5, satisfaccion REAL DEFAULT 0.6,
                urgencia REAL DEFAULT 0.3, persistencia REAL DEFAULT 0.5,
                flexibilidad REAL DEFAULT 0.4, impulso_actual TEXT,
                nivel_activacion REAL DEFAULT 0.5, foco_motivacional REAL DEFAULT 0.6,
                frustracion REAL DEFAULT 0.2, esperanza REAL DEFAULT 0.6,
                determinacion REAL DEFAULT 0.5,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS motivacion_metas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER, sim_time REAL DEFAULT 0,
                tipo TEXT, descripcion TEXT, impulso_asociado TEXT,
                prioridad INTEGER DEFAULT 5, progreso REAL DEFAULT 0,
                completada INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Sueño
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS sueno_estados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE, sim_time REAL DEFAULT 0,
                estado TEXT DEFAULT 'despierto', presion_sueno REAL DEFAULT 0,
                deuda_sueno REAL DEFAULT 0, profundidad REAL DEFAULT 0,
                calidad_sueno REAL DEFAULT 0.8, eficiencia_sueno REAL DEFAULT 0.7,
                tiempo_dormido REAL DEFAULT 0, ciclos_completos INTEGER DEFAULT 0,
                despertares INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS sueno_sueños (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER, sim_time REAL DEFAULT 0,
                contenido TEXT, tipo TEXT, emocion TEXT, tema TEXT,
                intensidad REAL DEFAULT 0.5, vividness REAL DEFAULT 0.5,
                duracion REAL DEFAULT 10,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Motor
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS motor_estados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE, sim_time REAL DEFAULT 0,
                coordinacion REAL DEFAULT 80, fuerza REAL DEFAULT 75,
                velocidad REAL DEFAULT 70, precision REAL DEFAULT 72,
                agilidad REAL DEFAULT 65, equilibrio REAL DEFAULT 68,
                resistencia REAL DEFAULT 75, fatiga REAL DEFAULT 20,
                recuperacion REAL DEFAULT 70, control_voluntario REAL DEFAULT 78,
                control_automatico REAL DEFAULT 82, fluidez REAL DEFAULT 74,
                tension REAL DEFAULT 25, relajacion REAL DEFAULT 60,
                estabilidad REAL DEFAULT 76, precision_fina REAL DEFAULT 70,
                fuerza_explosiva REAL DEFAULT 65, tiempo_reaccion REAL DEFAULT 60,
                propiocepcion REAL DEFAULT 65, reflejos REAL DEFAULT 75,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS motor_habilidades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT UNIQUE, tipo TEXT, complejidad INTEGER DEFAULT 5,
                energia_requerida REAL DEFAULT 1, nivel REAL DEFAULT 70,
                practicas INTEGER DEFAULT 0, eficiencia REAL DEFAULT 0.8,
                mastery REAL DEFAULT 0, ultimo_uso INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS motor_acciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER, sim_time REAL DEFAULT 0,
                tipo TEXT, duracion REAL, exito INTEGER DEFAULT 1,
                calidad REAL DEFAULT 0.7, probabilidad REAL DEFAULT 0.7,
                es_reflejo INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Social
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS social_interacciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER, sim_time REAL DEFAULT 0,
                con_quien TEXT, tipo TEXT, duracion REAL,
                calidad REAL, emocion_dominante TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS social_relaciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entidad TEXT UNIQUE, tipo_relacion TEXT,
                confianza REAL DEFAULT 0.5, conexion REAL DEFAULT 0.5,
                interacciones INTEGER DEFAULT 0, ultima_interaccion INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Patrones y análisis
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS patrones_detectados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER, sim_time REAL DEFAULT 0,
                tipo TEXT, patron TEXT,
                confianza REAL DEFAULT 0.5, frecuencia INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS analisis_anomalias (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER, sim_time REAL DEFAULT 0,
                variable TEXT, valor REAL, esperado REAL,
                desviacion REAL, gravedad REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS analisis_predicciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER, sim_time REAL DEFAULT 0,
                variable TEXT, valor_actual REAL, valor_predicho REAL,
                horizonte INTEGER, confianza REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Redes
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS redes_sinapticas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                origen TEXT, destino TEXT, fuerza REAL DEFAULT 0.5,
                plasticidad REAL DEFAULT 0.5, ultima_actualizacion INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Config
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS config_parametros (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                clave TEXT UNIQUE, valor TEXT, tipo TEXT, descripcion TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS config_umbrales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                variable TEXT UNIQUE, minimo REAL, maximo REAL,
                critico REAL, advertencia REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Conversación (V4.2)
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS conversaciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                timestamp INTEGER,
                sim_time REAL DEFAULT 0,
                rol TEXT NOT NULL,
                contenido TEXT,
                intent TEXT,
                emocion TEXT,
                sentimiento REAL DEFAULT 0,
                confianza REAL DEFAULT 0,
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS conversacion_temas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                tema TEXT NOT NULL,
                frecuencia INTEGER DEFAULT 1,
                ultima_mencion INTEGER,
                sentimiento REAL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(session_id, tema)
            );
        `);
    }

    // ============================================================
    // ÍNDICES
    // ============================================================

    async createAllIndexes() {
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_sistema_estados_ts ON sistema_estados(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_sistema_estados_sim ON sistema_estados(sim_time)',
            'CREATE INDEX IF NOT EXISTS idx_sistema_eventos_ts ON sistema_eventos(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_sistema_eventos_tipo ON sistema_eventos(tipo)',

            'CREATE INDEX IF NOT EXISTS idx_bio_estados_ts ON bioquimica_estados(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_bio_estados_sim ON bioquimica_estados(sim_time)',
            'CREATE INDEX IF NOT EXISTS idx_bio_nt_ts ON bioquimica_neurotransmisores(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_bio_nt_sim ON bioquimica_neurotransmisores(sim_time)',
            'CREATE INDEX IF NOT EXISTS idx_bio_signos_ts ON bioquimica_signos_vitales(timestamp)',

            'CREATE INDEX IF NOT EXISTS idx_emo_estados_ts ON emociones_estados(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_emo_estados_sim ON emociones_estados(sim_time)',

            'CREATE INDEX IF NOT EXISTS idx_cog_estados_ts ON cognitivo_estados(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_cog_estados_sim ON cognitivo_estados(sim_time)',
            'CREATE INDEX IF NOT EXISTS idx_cog_dec_ts ON cognitivo_decisiones(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_cog_pens_ts ON cognitivo_pensamientos(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_cog_pens_tipo ON cognitivo_pensamientos(tipo)',

            'CREATE INDEX IF NOT EXISTS idx_mem_epi_ts ON memoria_episodica(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_mem_epi_fuerza ON memoria_episodica(fuerza)',
            'CREATE INDEX IF NOT EXISTS idx_mem_epi_consolidada ON memoria_episodica(consolidada)',
            'CREATE INDEX IF NOT EXISTS idx_mem_sem_concepto ON memoria_semantica(concepto)',
            'CREATE INDEX IF NOT EXISTS idx_mem_proc_habilidad ON memoria_procedural(habilidad)',

            'CREATE INDEX IF NOT EXISTS idx_pers_rasgos_ts ON personalidad_rasgos(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_pers_evo_ts ON personalidad_evolucion(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_pers_evo_rasgo ON personalidad_evolucion(rasgo)',

            'CREATE INDEX IF NOT EXISTS idx_mot_estados_ts ON motivacion_estados(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_mot_metas_compl ON motivacion_metas(completada)',

            'CREATE INDEX IF NOT EXISTS idx_sueno_estados_ts ON sueno_estados(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_sueno_suenos_ts ON sueno_sueños(timestamp)',

            'CREATE INDEX IF NOT EXISTS idx_motor_estados_ts ON motor_estados(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_motor_habilidades_nombre ON motor_habilidades(nombre)',

            'CREATE INDEX IF NOT EXISTS idx_social_inter_ts ON social_interacciones(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_patrones_det_ts ON patrones_detectados(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_analisis_anom_ts ON analisis_anomalias(timestamp)',

            'CREATE UNIQUE INDEX IF NOT EXISTS idx_redes_sinap_unique ON redes_sinapticas(origen, destino)',

            // V4.2 — Conversación
            'CREATE INDEX IF NOT EXISTS idx_conv_session_ts ON conversaciones(session_id, timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_conv_ts ON conversaciones(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_conv_intent ON conversaciones(intent)',
            'CREATE INDEX IF NOT EXISTS idx_conv_temas_session ON conversacion_temas(session_id, tema)',
            'CREATE INDEX IF NOT EXISTS idx_conv_temas_freq ON conversacion_temas(frecuencia DESC)'
        ];

        for (const idx of indexes) {
            try { await this.db.exec(idx); }
            catch (err) { console.warn(`⚠️ ${idx.substring(0, 60)}…`, err.message); }
        }
    }

    // ============================================================
    // VISTAS
    // ============================================================

    async createAllViews() {
        const views = [
            `CREATE VIEW IF NOT EXISTS vista_salud_sistema AS
             SELECT timestamp,
                    estabilidad, rendimiento, nivel_consciencia,
                    (estabilidad + rendimiento + nivel_consciencia) / 3 AS salud_general,
                    CASE
                        WHEN estabilidad > 0.7 AND rendimiento > 0.6 THEN 'Óptimo'
                        WHEN estabilidad > 0.5 AND rendimiento > 0.4 THEN 'Normal'
                        ELSE 'Crítico'
                    END AS estado_salud
             FROM sistema_estados`,

            `CREATE VIEW IF NOT EXISTS vista_resumen_emocional AS
             SELECT timestamp,
                    alegria, tristeza, miedo, ira, confianza, ansiedad, bienestar,
                    (alegria + confianza) AS emociones_positivas,
                    (tristeza + miedo + ira + ansiedad) AS emociones_negativas,
                    (alegria + confianza) - (tristeza + miedo + ira + ansiedad) AS balance_emocional
             FROM emociones_estados`,

            // V4.2
            `CREATE VIEW IF NOT EXISTS vista_conversacion_resumen AS
             SELECT session_id,
                    COUNT(*) AS total_turnos,
                    MIN(timestamp) AS primera_interaccion,
                    MAX(timestamp) AS ultima_interaccion,
                    AVG(sentimiento) AS sentimiento_medio,
                    SUM(CASE WHEN rol = 'usuario' THEN 1 ELSE 0 END) AS turnos_usuario,
                    SUM(CASE WHEN rol = 'cerebro' THEN 1 ELSE 0 END) AS turnos_cerebro
             FROM conversaciones
             GROUP BY session_id`
        ];

        for (const v of views) {
            try { await this.db.exec(v); }
            catch (err) { console.warn('⚠️ Vista:', err.message); }
        }
    }

    // ============================================================
    // TRIGGERS
    // ============================================================

    async createAllTriggers() {
        const triggers = [
            `CREATE TRIGGER IF NOT EXISTS trigger_anomalia_miedo
             AFTER INSERT ON emociones_estados
             WHEN NEW.miedo > 70
             BEGIN
                INSERT INTO analisis_anomalias (timestamp, sim_time, variable, valor, esperado, desviacion, gravedad)
                VALUES (NEW.timestamp, NEW.sim_time, 'miedo', NEW.miedo, 20, NEW.miedo - 20,
                        CASE WHEN NEW.miedo > 85 THEN 0.9 ELSE 0.5 END);
             END`,

            // V4.2: agregar tema a conversacion_temas cuando se inserta una fila con intent
            `CREATE TRIGGER IF NOT EXISTS trigger_conversacion_tema
             AFTER INSERT ON conversaciones
             WHEN NEW.rol = 'usuario' AND NEW.intent IS NOT NULL
             BEGIN
                INSERT INTO conversacion_temas (session_id, tema, frecuencia, ultima_mencion, sentimiento)
                VALUES (NEW.session_id, NEW.intent, 1, NEW.timestamp, NEW.sentimiento)
                ON CONFLICT(session_id, tema) DO UPDATE SET
                    frecuencia = frecuencia + 1,
                    ultima_mencion = NEW.timestamp,
                    sentimiento = (sentimiento * frecuencia + NEW.sentimiento) / (frecuencia + 1);
             END`
        ];

        for (const t of triggers) {
            try { await this.db.exec(t); }
            catch (err) { console.warn('⚠️ Trigger:', err.message); }
        }
    }

    async migrateTriggers() {
        try {
            await this.db.exec('DROP TRIGGER IF EXISTS trigger_evolucion_personalidad');
            await this.db.exec(`
                CREATE TRIGGER trigger_evolucion_personalidad
                AFTER UPDATE ON personalidad_rasgos
                WHEN ABS(NEW.apertura - OLD.apertura) > 0.02
                   OR ABS(NEW.conciencia - OLD.conciencia) > 0.02
                   OR ABS(NEW.extraversion - OLD.extraversion) > 0.02
                   OR ABS(NEW.amabilidad - OLD.amabilidad) > 0.02
                   OR ABS(NEW.neuroticismo - OLD.neuroticismo) > 0.02
                BEGIN
                    INSERT INTO personalidad_evolucion (timestamp, sim_time, rasgo, valor_anterior, valor_nuevo, delta, causa)
                    SELECT NEW.timestamp, NEW.sim_time, 'apertura', OLD.apertura, NEW.apertura, NEW.apertura - OLD.apertura, 'cambio_natural'
                    WHERE ABS(NEW.apertura - OLD.apertura) > 0.02
                    UNION ALL
                    SELECT NEW.timestamp, NEW.sim_time, 'conciencia', OLD.conciencia, NEW.conciencia, NEW.conciencia - OLD.conciencia, 'cambio_natural'
                    WHERE ABS(NEW.conciencia - OLD.conciencia) > 0.02
                    UNION ALL
                    SELECT NEW.timestamp, NEW.sim_time, 'extraversion', OLD.extraversion, NEW.extraversion, NEW.extraversion - OLD.extraversion, 'cambio_natural'
                    WHERE ABS(NEW.extraversion - OLD.extraversion) > 0.02
                    UNION ALL
                    SELECT NEW.timestamp, NEW.sim_time, 'amabilidad', OLD.amabilidad, NEW.amabilidad, NEW.amabilidad - OLD.amabilidad, 'cambio_natural'
                    WHERE ABS(NEW.amabilidad - OLD.amabilidad) > 0.02
                    UNION ALL
                    SELECT NEW.timestamp, NEW.sim_time, 'neuroticismo', OLD.neuroticismo, NEW.neuroticismo, NEW.neuroticismo - OLD.neuroticismo, 'cambio_natural'
                    WHERE ABS(NEW.neuroticismo - OLD.neuroticismo) > 0.02;
                END
            `);
        } catch (err) {
            console.warn('⚠️ Migración trigger personalidad:', err.message);
        }
    }

    // ============================================================
    // FUNCIONES SQLITE PERSONALIZADAS
    // ============================================================

    async createAllFunctions() {
        const driver = this.db.driver || (this.db.config && this.db.config.driver);
        const raw = this.db.db || driver;
        if (!raw || typeof raw.aggregate !== 'function') {
            console.error('❌ No se pudieron registrar funciones SQLite (MEDIAN/STDDEV/CORR). Las queries analíticas fallarán.');
            return false;
        }

        raw.aggregate('MEDIAN', {
            start: [],
            step: function (arr, value) {
                if (value !== null && value !== undefined) arr.push(value);
            },
            result: function (arr) {
                if (!arr || arr.length === 0) return null;
                const sorted = arr.slice().sort((a, b) => a - b);
                const mid = Math.floor(sorted.length / 2);
                return sorted.length % 2 === 0
                    ? (sorted[mid - 1] + sorted[mid]) / 2
                    : sorted[mid];
            }
        });

        raw.aggregate('STDDEV', {
            start: { n: 0, sum: 0, sumSq: 0 },
            step: function (state, value) {
                if (value !== null && value !== undefined) {
                    state.n += 1;
                    state.sum += value;
                    state.sumSq += value * value;
                }
            },
            result: function (state) {
                if (state.n < 2) return 0;
                const mean = state.sum / state.n;
                const variance = (state.sumSq / state.n) - mean * mean;
                return Math.sqrt(Math.max(0, variance));
            }
        });

        raw.aggregate('CORR', {
            start: { n: 0, sumX: 0, sumY: 0, sumXY: 0, sumX2: 0, sumY2: 0 },
            step: function (state, x, y) {
                if (x === null || x === undefined || y === null || y === undefined) return;
                state.n += 1;
                state.sumX += x;
                state.sumY += y;
                state.sumXY += x * y;
                state.sumX2 += x * x;
                state.sumY2 += y * y;
            },
            result: function (state) {
                if (state.n < 2) return 0;
                const n = state.n;
                const num = n * state.sumXY - state.sumX * state.sumY;
                const den = Math.sqrt(
                    (n * state.sumX2 - state.sumX * state.sumX) *
                    (n * state.sumY2 - state.sumY * state.sumY)
                );
                if (den === 0) return 0;
                return num / den;
            }
        });

        console.log('📊 Funciones personalizadas registradas: MEDIAN, STDDEV, CORR');
        return true;
    }

    // ============================================================
    // DATOS INICIALES
    // ============================================================

    async initializeData() {
        const count = await this.db.get('SELECT COUNT(*) AS c FROM sistema_estados');
        if (count.c === 0) {
            await this.saveState('sistema_estados', {
                estabilidad: 0.8, rendimiento: 0.7, nivel_consciencia: 0.1,
                integridad: 0.9, emergencia: 0, alertas_activas: 0,
                datos: JSON.stringify({ initialized: true, version: '4.3.0' })
            });

            const umbrales = [
                { v: 'oxigeno', min: 70, max: 100, cri: 30, adv: 50 },
                { v: 'energia', min: 40, max: 100, cri: 15, adv: 25 },
                { v: 'cortisol', min: 0, max: 40, cri: 80, adv: 60 },
                { v: 'toxicidad', min: 0, max: 20, cri: 70, adv: 50 },
                { v: 'estabilidad', min: 0.6, max: 1.0, cri: 0.3, adv: 0.5 }
            ];
            for (const u of umbrales) {
                await this.db.run(
                    `INSERT OR IGNORE INTO config_umbrales (variable, minimo, maximo, critico, advertencia)
                     VALUES (?, ?, ?, ?, ?)`,
                    [u.v, u.min, u.max, u.cri, u.adv]
                );
            }

            const params = [
                { k: 'auto_save_interval', v: '100', t: 'integer', d: 'Intervalo de guardado automático' },
                { k: 'neuroplasticity_rate', v: '0.15', t: 'float', d: 'Tasa de neuroplasticidad' },
                { k: 'learning_rate', v: '0.12', t: 'float', d: 'Tasa de aprendizaje' }
            ];
            for (const p of params) {
                await this.db.run(
                    `INSERT OR IGNORE INTO config_parametros (clave, valor, tipo, descripcion)
                     VALUES (?, ?, ?, ?)`,
                    [p.k, p.v, p.t, p.d]
                );
            }
        }
    }

    // ============================================================
    // SAVE STATE GENÉRICO
    // ============================================================

    /**
     * Guarda un estado en cualquier tabla timestamped.
     *
     * Comportamiento:
     *  - `timestamp` siempre = Date.now() si no se especifica. Nunca 0.
     *  - `sim_time` se propaga desde el payload si existe, si no se deja.
     *  - Solo guarda columnas presentes en la tabla (whitelist).
     *  - Usa INSERT OR REPLACE (las tablas tienen UNIQUE en timestamp).
     *  - Invalida _countCache.
     */
    async saveState(table, data) {
        if (!this._timestampedTables.has(table)) {
            throw new Error(`saveState: tabla no timestamped o desconocida: ${table}`);
        }
        const payload = { ...data };
        payload.timestamp = payload.timestamp ?? Date.now();

        const validColumns = await this._getTableColumns(table);
        if (!validColumns.length) throw new Error(`Tabla sin columnas: ${table}`);

        const columns = Object.keys(payload).filter(c => validColumns.includes(c));
        if (columns.length === 0) {
            throw new Error(`Ninguna columna válida para ${table}. Recibidas: ${Object.keys(payload).join(',')}`);
        }

        const placeholders = columns.map(() => '?').join(',');
        const values = columns.map(k => payload[k]);
        const query = `INSERT OR REPLACE INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;

        const startTime = Date.now();
        try {
            const result = await this.db.run(query, values);
            this._trackQuery(startTime);
            this._countCache.at = 0;
            return result;
        } catch (error) {
            this.metrics.errors++;
            console.error(`❌ Error guardando en ${table}:`, error.message);
            throw error;
        }
    }

    // ============================================================
    // MÉTODOS DE GUARDADO ESPECÍFICOS
    // ============================================================

    async saveSystemState(state) {
        return this.saveState('sistema_estados', {
            estabilidad: state.stability ?? 0,
            rendimiento: state.performance ?? 0,
            nivel_consciencia: state.consciousnessLevel ?? 0,
            integridad: state.integrity ?? 1,
            emergencia: state.emergency ? 1 : 0,
            alertas_activas: state.activeAlerts ?? 0,
            datos: JSON.stringify({ time: state.systemTime, cycles: state.cycleCount })
        });
    }

    async saveMemory(memory) {
        const query = `
            INSERT INTO memoria_episodica
                (timestamp, sim_time, contenido, contexto, fuerza, importancia,
                 emocion_asociada, consolidada, accesos, ultimo_acceso)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const now = Date.now();
        const result = await this.db.run(query, [
            memory.timestamp ?? now,
            memory.sim_time ?? 0,
            memory.contenido || '',
            memory.contexto || '',
            memory.fuerza ?? 0.5,
            memory.importancia ?? 0.5,
            memory.emocion_asociada || 'neutral',
            memory.consolidada ? 1 : 0,
            memory.accesos ?? 0,
            now
        ]);
        this._invalidateCache('memories');
        this._invalidateCache('memory_');
        this._countCache.at = 0;
        return result;
    }

    async saveEmotionalState(state) {
        return this.saveState('emociones_estados', {
            sim_time: state.sim_time ?? 0,
            alegria: state.alegria ?? 20, tristeza: state.tristeza ?? 10,
            miedo: state.miedo ?? 5, ira: state.ira ?? 5, asco: state.asco ?? 3,
            sorpresa: state.sorpresa ?? 8, confianza: state.confianza ?? 50,
            verguenza: state.verguenza ?? 5, orgullo: state.orgullo ?? 15,
            culpa: state.culpa ?? 5, envidia: state.envidia ?? 3,
            gratitud: state.gratitud ?? 20, esperanza: state.esperanza ?? 30,
            aceptacion: state.aceptacion ?? 40, frustracion: state.frustracion ?? 20,
            nostalgia: state.nostalgia ?? 15, conexion: state.conexion ?? 45,
            soledad: state.soledad ?? 10, ansiedad: state.ansiedad ?? 20,
            bienestar: state.bienestar ?? 65, depresion: state.depresion ?? 10,
            euforia: state.euforia ?? 5
        });
    }

    async saveBiochemicalState(state) {
        await this.saveState('bioquimica_estados', {
            sim_time: state.sim_time ?? 0,
            oxigeno: state.oxigeno ?? 0, energia: state.energia ?? 0,
            toxicidad: state.toxicidad ?? 0, temperatura: state.temperatura ?? 37,
            ph: state.ph ?? 7.4, glucosa: state.glucosa ?? 80,
            lactato: state.lactato ?? 10, creatinina: state.creatinina ?? 1,
            urea: state.urea ?? 20, estado_hidratacion: state.estadoHidratacion ?? 80,
            dioxido_carbono: state.dioxidoCarbono ?? 0,
            monoxido_carbono: state.monoxidoCarbono ?? 0,
            oxido_nitrico: state.oxidoNitrico ?? 5,
            recuperacion: state.recuperacion ?? 75,
            fatiga_acumulada: state.fatigaAcumulada ?? 0
        });
        await this.saveState('bioquimica_neurotransmisores', {
            sim_time: state.sim_time ?? 0,
            dopamina: state.dopamina ?? 50, serotonina: state.serotonina ?? 50,
            noradrenalina: state.noradrenalina ?? 50, cortisol: state.cortisol ?? 20,
            oxitocina: state.oxitocina ?? 30, gaba: state.gaba ?? 50,
            glutamato: state.glutamato ?? 50, endorfinas: state.endorfinas ?? 30,
            acetilcolina: state.acetilcolina ?? 50, adrenalina: state.adrenalina ?? 10,
            histamina: state.histamina ?? 20, melatonina: state.melatonina ?? 20
        });
        await this.saveState('bioquimica_signos_vitales', {
            sim_time: state.sim_time ?? 0,
            frecuencia_cardiaca: state.frecuenciaCardiaca ?? 72,
            presion_sistolica: state.presionArterial?.sistolica ?? 120,
            presion_diastolica: state.presionArterial?.diastolica ?? 80,
            saturacion_oxigeno: state.saturacionOxigeno ?? 98,
            ritmo_respiratorio: state.ritmoRespiratorio ?? 16,
            variabilidad_cardiaca: state.variabilidadCardiaca ?? 50
        });
    }

    async saveCognitiveState(state) {
        return this.saveState('cognitivo_estados', {
            sim_time: state.sim_time ?? 0,
            atencion: state.atencion ?? 0, concentracion: state.concentracion ?? 0,
            memoria_trabajo: state.memoriaTrabajo ?? 0,
            velocidad_procesamiento: state.velocidadProcesamiento ?? 0,
            razonamiento: state.razonamiento ?? 0,
            toma_decisiones: state.tomaDecisiones ?? 0,
            planificacion: state.planificacion ?? 0,
            flexibilidad: state.flexibilidad ?? 0,
            inhibicion: state.inhibicion ?? 0,
            creatividad: state.creatividad ?? 0,
            intuicion: state.intuicion ?? 0,
            curiosidad: state.curiosidad ?? 0,
            insight: state.insight ?? 0, fluidez: state.fluidez ?? 0,
            carga: state.carga ?? 0, fatiga: state.fatiga ?? 0,
            estres: state.estres ?? 0, autoconciencia: state.autoconciencia ?? 0,
            monitoreo: state.monitoreo ?? 0, regulacion: state.regulacion ?? 0,
            aprendizaje: state.aprendizaje ?? 0
        });
    }

    /**
     * FIX V4.1: ahora INSERTA historial real (con UNIQUE en timestamp).
     * Antes siempre actualizaba la misma fila → sin evolución.
     */
    async savePersonality(traits, simTime = 0) {
        const now = Date.now();
        return this.saveState('personalidad_rasgos', {
            timestamp: now,
            sim_time: simTime,
            apertura: traits.openness ?? 0.5,
            conciencia: traits.conscientiousness ?? 0.5,
            extraversion: traits.extraversion ?? 0.5,
            amabilidad: traits.agreeableness ?? 0.5,
            neuroticismo: traits.neuroticism ?? 0.5
        });
    }

    async saveMotivationState(state) {
        return this.saveState('motivacion_estados', {
            sim_time: state.sim_time ?? 0,
            intensidad: state.intensidadMotivacional ?? 0,
            satisfaccion: state.satisfaccionGeneral ?? 0,
            urgencia: state.urgencia ?? 0,
            persistencia: state.persistencia ?? 0,
            flexibilidad: state.flexibilidadMotivacional ?? 0,
            impulso_actual: state.impulsoActual || '',
            nivel_activacion: state.nivelActivacion ?? 0,
            foco_motivacional: state.focoMotivacional ?? 0,
            frustracion: state.frustracion ?? 0,
            esperanza: state.esperanza ?? 0,
            determinacion: state.determinacion ?? 0
        });
    }

    async saveDecision(decision) {
        const query = `
            INSERT INTO cognitivo_decisiones
                (timestamp, sim_time, decision, opciones, contexto, confianza,
                 tiempo_procesamiento, emocion_dominante, resultado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const result = await this.db.run(query, [
            decision.timestamp ?? Date.now(),
            decision.sim_time ?? 0,
            typeof decision.decision === 'object' ? JSON.stringify(decision.decision) : String(decision.decision || ''),
            JSON.stringify(decision.opciones || []).substring(0, 2000),
            JSON.stringify(decision.contexto || {}).substring(0, 2000),
            decision.confianza ?? decision.confidence ?? 0.5,
            decision.tiempo_procesamiento ?? decision.processingTime ?? 0,
            decision.emocion_dominante || decision.emocion || 'neutral',
            decision.resultado || 'pendiente'
        ]);
        this._countCache.at = 0;
        return result;
    }

    async saveThought(thought) {
        const query = `
            INSERT INTO cognitivo_pensamientos
                (timestamp, sim_time, contenido, tipo, intensidad, emocion_asociada, nivel_consciencia)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const result = await this.db.run(query, [
            thought.timestamp ?? Date.now(),
            thought.sim_time ?? 0,
            thought.contenido || '',
            thought.tipo || 'consciente',
            thought.intensidad ?? 0.5,
            thought.emocion_asociada || 'neutral',
            thought.nivel_consciencia ?? 0.5
        ]);
        this._countCache.at = 0;
        return result;
    }

    async saveConnection(origin, destination, strength = 0.5, tipo = 'sináptica') {
        const existing = await this.db.get(
            'SELECT id FROM redes_sinapticas WHERE origen = ? AND destino = ?',
            [origin, destination]
        );
        if (existing) {
            await this.db.run(
                'UPDATE redes_sinapticas SET fuerza = ?, ultima_actualizacion = ? WHERE id = ?',
                [strength, Date.now(), existing.id]
            );
        } else {
            await this.db.run(
                `INSERT INTO redes_sinapticas (origen, destino, fuerza, plasticidad, ultima_actualizacion)
                 VALUES (?, ?, ?, ?, ?)`,
                [origin, destination, strength, 0.5, Date.now()]
            );
        }
    }

    async saveSleepState(state) {
        return this.saveState('sueno_estados', {
            sim_time: state.sim_time ?? 0,
            estado: state.estado || 'despierto',
            presion_sueno: state.presionSueño ?? state.presion_sueno ?? 0,
            deuda_sueno: state.deudaSueño ?? state.deuda_sueno ?? 0,
            profundidad: state.profundidad ?? 0,
            calidad_sueno: state.calidadSueño ?? state.calidad_sueno ?? 0.8,
            eficiencia_sueno: state.eficienciaSueño ?? state.eficiencia_sueno ?? 0.7,
            tiempo_dormido: state.tiempoDormido ?? state.tiempo_dormido ?? 0,
            ciclos_completos: state.ciclosCompletos ?? state.ciclos_completos ?? 0,
            despertares: state.despertares ?? 0
        });
    }

    async saveDream(dream) {
        return this.db.run(
            `INSERT INTO sueno_sueños
                (timestamp, sim_time, contenido, tipo, emocion, tema, intensidad, vividness, duracion)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                dream.timestamp ?? Date.now(),
                dream.sim_time ?? 0,
                dream.contenido || dream.tema || '',
                dream.tipo || 'narrativo',
                dream.emocion || 'neutral',
                dream.tema || '',
                dream.intensidad ?? 0.5,
                dream.vividness ?? 0.5,
                dream.duracion ?? 10
            ]
        );
    }

    async saveMotorState(state) {
        return this.saveState('motor_estados', {
            sim_time: state.sim_time ?? 0,
            coordinacion: state.coordinacion ?? 80, fuerza: state.fuerza ?? 75,
            velocidad: state.velocidad ?? 70, precision: state.precision ?? 72,
            agilidad: state.agilidad ?? 65, equilibrio: state.equilibrio ?? 68,
            resistencia: state.resistencia ?? 75, fatiga: state.fatiga ?? 20,
            recuperacion: state.recuperacion ?? 70,
            control_voluntario: state.controlVoluntario ?? 78,
            control_automatico: state.controlAutomatico ?? 82,
            fluidez: state.fluidez ?? 74, tension: state.tension ?? 25,
            relajacion: state.relajacion ?? 60, estabilidad: state.estabilidad ?? 76,
            precision_fina: state.precisionFina ?? 70,
            fuerza_explosiva: state.fuerzaExplosiva ?? 65,
            tiempo_reaccion: state.tiempoReaccion ?? 60,
            propiocepcion: state.propiocepcion ?? 65,
            reflejos: state.reflejos ?? 75
        });
    }

    async saveSkill(skill) {
        const existing = await this.db.get(
            'SELECT id FROM memoria_procedural WHERE habilidad = ?',
            [skill.habilidad || skill.nombre]
        );
        const now = Date.now();
        if (existing) {
            await this.db.run(
                `UPDATE memoria_procedural
                 SET nivel = ?, practicas = ?, eficiencia = ?, importancia = ?, ultima_practica = ?
                 WHERE id = ?`,
                [
                    skill.nivel ?? 0, skill.practicas ?? 0,
                    skill.eficiencia ?? 0.5, skill.importancia ?? 0.5,
                    now, existing.id
                ]
            );
        } else {
            await this.db.run(
                `INSERT INTO memoria_procedural
                    (habilidad, nivel, practicas, eficiencia, complejidad, importancia, ultima_practica)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    skill.habilidad || skill.nombre || 'desconocida',
                    skill.nivel ?? 0, skill.practicas ?? 0,
                    skill.eficiencia ?? 0.5, skill.complejidad ?? 5,
                    skill.importancia ?? 0.5, now
                ]
            );
        }
        this._invalidateCache('memories');
    }

    async saveMotorAction(action) {
        const result = await this.db.run(
            `INSERT INTO motor_acciones
                (timestamp, sim_time, tipo, duracion, exito, calidad, probabilidad, es_reflejo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                action.timestamp ?? Date.now(),
                action.sim_time ?? 0,
                action.tipo || 'desconocida',
                action.duracion ?? 0,
                action.exito ? 1 : 0,
                action.calidad ?? 0.7,
                action.probabilidad ?? 0.7,
                action.esReflejo ? 1 : 0
            ]
        );
        this._countCache.at = 0;
        return result;
    }

    async saveLearningEvent(event) {
        const result = await this.db.run(
            `INSERT INTO cognitivo_aprendizaje
                (timestamp, sim_time, habilidad, nivel_anterior, nivel_nuevo, ganancia, metodo, exito)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                event.timestamp ?? Date.now(),
                event.sim_time ?? 0,
                event.habilidad || 'general',
                event.nivel_anterior ?? 0,
                event.nivel_nuevo ?? 0,
                event.ganancia ?? 0,
                event.metodo || 'interacción',
                event.exito === false ? 0 : 1
            ]
        );
        this._invalidateCache('learning');
        this._countCache.at = 0;
        return result;
    }

    async saveSituationEvent(type, intensity, source = 'api') {
        const result = await this.db.run(
            `INSERT INTO sistema_eventos (timestamp, sim_time, tipo, fuente, datos, importancia)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                Date.now(), 0,
                'situation', source,
                JSON.stringify({ type, intensity }),
                Math.round(intensity * 5)
            ]
        );
        this._countCache.at = 0;
        return result;
    }

    // ============================================================
    // CONVERSACIÓN (V4.2 / V4.3)
    // ============================================================

    /**
     * Guarda un batch de mensajes de conversación.
     *
     * FIX V4.3: antes truncaba contenido a 2000 chars, pero la API y el
     * ConversationManager permitían 10000. Se perdía el 80% de los
     * mensajes largos. Ahora usa TUNING.chat.maxMessageLength.
     *
     * @param {Array<{sessionId, timestamp, simTime, role, content, intent, emotion, sentiment, confidence, metadata}>} messages
     * @returns {Promise<number>} número de filas insertadas
     */
    async saveConversationBatch(messages) {
        if (!Array.isArray(messages) || messages.length === 0) return 0;

        const maxContent = TUNING.chat.maxMessageLength;

        const stmt = `INSERT INTO conversaciones
            (session_id, timestamp, sim_time, rol, contenido, intent, emocion, sentimiento, confianza, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        let count = 0;
        for (const m of messages) {
            try {
                await this.db.run(stmt, [
                    m.sessionId,
                    m.timestamp ?? Date.now(),
                    m.simTime ?? m.sim_time ?? 0,
                    m.role ?? m.rol ?? 'usuario',
                    (m.content || '').substring(0, maxContent),
                    m.intent || null,
                    m.emotion || m.emocion || null,
                    m.sentiment ?? m.sentimiento ?? 0,
                    m.confidence ?? m.confianza ?? 0,
                    m.metadata || '{}'
                ]);
                count++;
            } catch (err) {
                // Fallo individual no rompe el batch
                console.warn(`⚠️ Error guardando mensaje: ${err.message}`);
            }
        }

        this._countCache.at = 0;
        return count;
    }

    /**
     * Devuelve el historial de conversación de una sesión.
     * Ordenado por timestamp DESC (más reciente primero).
     */
    async getConversationHistory(sessionId, limit = 50) {
        const safeLimit = Math.max(1, Math.min(500, limit));
        return this.db.all(
            `SELECT id, session_id, timestamp, sim_time, rol, contenido, intent,
                    emocion, sentimiento, confianza, metadata
             FROM conversaciones
             WHERE session_id = ?
             ORDER BY timestamp DESC
             LIMIT ?`,
            [sessionId, safeLimit]
        );
    }

    /**
     * Devuelve las sesiones recientes con agregados.
     */
    async getRecentConversations(limit = 50) {
        const safeLimit = Math.max(1, Math.min(200, limit));
        return this.db.all(
            `SELECT session_id,
                    MAX(timestamp) AS last_ts,
                    MIN(timestamp) AS first_ts,
                    COUNT(*) AS turns,
                    AVG(sentimiento) AS avg_sentiment
             FROM conversaciones
             GROUP BY session_id
             ORDER BY last_ts DESC
             LIMIT ?`,
            [safeLimit]
        );
    }

    /**
     * Devuelve los temas principales de una sesión desde conversacion_temas.
     */
    async getConversationTopics(sessionId, limit = 10) {
        const safeLimit = Math.max(1, Math.min(100, limit));
        return this.db.all(
            `SELECT tema, frecuencia, ultima_mencion, sentimiento
             FROM conversacion_temas
             WHERE session_id = ?
             ORDER BY frecuencia DESC, ultima_mencion DESC
             LIMIT ?`,
            [sessionId, safeLimit]
        );
    }

    /**
     * Elimina todas las conversaciones de una sesión.
     */
    async deleteConversationSession(sessionId) {
        const r1 = await this.db.run('DELETE FROM conversaciones WHERE session_id = ?', [sessionId]);
        const r2 = await this.db.run('DELETE FROM conversacion_temas WHERE session_id = ?', [sessionId]);
        this._countCache.at = 0;
        return { messages: r1.changes || 0, topics: r2.changes || 0 };
    }

    /**
     * Devuelve las últimas N conversaciones globales (todas las sesiones).
     */
    async getGlobalConversationHistory(limit = 100) {
        const safeLimit = Math.max(1, Math.min(500, limit));
        return this.db.all(
            `SELECT id, session_id, timestamp, sim_time, rol, contenido, intent,
                    emocion, sentimiento, confianza
             FROM conversaciones
             ORDER BY timestamp DESC
             LIMIT ?`,
            [safeLimit]
        );
    }

    // ============================================================
    // CONSULTAS BÁSICAS
    // ============================================================

    async getState(table) {
        return this.db.get(`SELECT * FROM ${table} ORDER BY timestamp DESC LIMIT 1`);
    }

    async getStateHistory(table, limit = 100) {
        return this.db.all(`SELECT * FROM ${table} ORDER BY timestamp DESC LIMIT ?`, limit);
    }

    async getLatest(table, limit = 1) {
        const key = `${table}_latest_${limit}`;
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            this.metrics.cacheHits++;
            return cached.data;
        }
        this.metrics.cacheMisses++;
        const data = await this.db.all(
            `SELECT * FROM ${table} ORDER BY timestamp DESC LIMIT ?`, limit
        );
        this.cache.set(key, { data, timestamp: Date.now() });
        return data;
    }

    async getHistory(table, startTime, endTime, limit = 1000) {
        return this.db.all(
            `SELECT * FROM ${table} WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp ASC LIMIT ?`,
            [startTime, endTime, limit]
        );
    }

    async getStrongestMemories(limit = 50) {
        const key = `memories_strongest_${limit}`;
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            this.metrics.cacheHits++;
            return cached.data;
        }
        this.metrics.cacheMisses++;
        const data = await this.db.all(
            `SELECT * FROM memoria_episodica ORDER BY fuerza DESC, importancia DESC LIMIT ?`,
            limit
        );
        this.cache.set(key, { data, timestamp: Date.now() });
        return data;
    }

    async searchMemories(query, limit = 20) {
        const safeQuery = String(query).substring(0, 200);
        return this.db.all(
            `SELECT *,
                    (CASE WHEN contenido LIKE ? THEN 1.0 ELSE 0.5 END) AS relevancia
             FROM memoria_episodica
             WHERE contenido LIKE ?
             ORDER BY relevancia DESC, importancia DESC, fuerza DESC
             LIMIT ?`,
            [`%${safeQuery}%`, `%${safeQuery}%`, limit]
        );
    }

    async getEmotionalHistory(limit = 100) {
        return this.db.all(
            `SELECT * FROM emociones_estados ORDER BY timestamp DESC LIMIT ?`, limit
        );
    }

    async getDecisionHistory(limit = 50) {
        return this.db.all(
            `SELECT * FROM cognitivo_decisiones ORDER BY timestamp DESC LIMIT ?`, limit
        );
    }

    async getThoughtHistory(limit = 50) {
        return this.db.all(
            `SELECT * FROM cognitivo_pensamientos ORDER BY timestamp DESC LIMIT ?`, limit
        );
    }

    async getRecentThoughts(limit = 10) { return this.getThoughtHistory(limit); }
    async getRecentMemories(limit = 10) {
        return this.db.all(
            `SELECT * FROM memoria_episodica ORDER BY timestamp DESC LIMIT ?`, limit
        );
    }

    async getLastState() { return this.getState('sistema_estados'); }
    async getLastEmotionalState() { return this.getState('emociones_estados'); }
    async getLastBiochemicalState() { return this.getState('bioquimica_estados'); }
    async getLastCognitiveState() { return this.getState('cognitivo_estados'); }
    async getCurrentPersonality() { return this.getState('personalidad_rasgos'); }

    // ============================================================
    // FEED DE APRENDIZAJE
    // ============================================================

    async getLearningFeed(limit = 30) {
        const events = [];
        const safeLimit = Math.min(limit, 200);

        try {
            const learning = await this.db.all(
                `SELECT timestamp, habilidad, nivel_anterior, nivel_nuevo, ganancia, metodo, exito
                 FROM cognitivo_aprendizaje ORDER BY timestamp DESC LIMIT ?`, [safeLimit]
            );
            learning.forEach(l => {
                events.push({
                    kind: 'skill', timestamp: l.timestamp,
                    icon: l.exito ? '📚' : '⚠️',
                    title: `Aprendizaje: ${l.habilidad} (${Math.round(l.nivel_anterior)}→${Math.round(l.nivel_nuevo)})`,
                    meta: `método: ${l.metodo || 'interacción'}, ganancia: ${(l.ganancia || 0).toFixed(2)}`
                });
            });
        } catch (_) {}

        try {
            const memories = await this.db.all(
                `SELECT timestamp, contenido, emocion_asociada, fuerza
                 FROM memoria_episodica WHERE consolidada = 1
                 ORDER BY timestamp DESC LIMIT ?`, [safeLimit]
            );
            memories.forEach(m => {
                events.push({
                    kind: 'memory', timestamp: m.timestamp, icon: '💾',
                    title: `Memoria: ${(m.contenido || '').substring(0, 60)}`,
                    meta: `emoción: ${m.emocion_asociada || 'neutral'}, fuerza: ${(m.fuerza || 0).toFixed(2)}`
                });
            });
        } catch (_) {}

        try {
            const evol = await this.db.all(
                `SELECT timestamp, rasgo, valor_anterior, valor_nuevo, delta
                 FROM personalidad_evolucion ORDER BY timestamp DESC LIMIT ?`, [Math.floor(safeLimit / 2)]
            );
            evol.forEach(e => {
                if (Math.abs(e.delta || 0) < 0.01) return;
                events.push({
                    kind: 'personality', timestamp: e.timestamp,
                    icon: e.delta > 0 ? '🧬' : '🔻',
                    title: `Rasgo "${e.rasgo}" ${e.delta > 0 ? 'aumentó' : 'disminuyó'}`,
                    meta: `${(e.valor_anterior || 0).toFixed(2)} → ${(e.valor_nuevo || 0).toFixed(2)}`
                });
            });
        } catch (_) {}

        try {
            const patrones = await this.db.all(
                `SELECT timestamp, tipo, patron, confianza
                 FROM patrones_detectados ORDER BY timestamp DESC LIMIT ?`, [Math.floor(safeLimit / 2)]
            );
            patrones.forEach(p => {
                events.push({
                    kind: 'pattern', timestamp: p.timestamp, icon: '🔍',
                    title: `Patrón: ${p.patron} (${p.tipo})`,
                    meta: `confianza: ${(p.confianza || 0).toFixed(2)}`
                });
            });
        } catch (_) {}

        events.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        return events.slice(0, safeLimit);
    }

    // ============================================================
    // ALINEACIÓN DE SERIES TEMPORALES
    // ============================================================

    async getAlignedSeries(tableA, colA, tableB, colB, periodMs = 60000, sinceMs = null) {
        const since = sinceMs ?? (Date.now() - 86400000);
        const bucketExprA = `CAST(timestamp / ${periodMs} AS INTEGER) * ${periodMs}`;
        const bucketExprB = `CAST(timestamp / ${periodMs} AS INTEGER) * ${periodMs}`;

        const [rowsA, rowsB] = await Promise.all([
            this.db.all(
                `SELECT ${bucketExprA} AS bucket, AVG(${colA}) AS value
                 FROM ${tableA}
                 WHERE timestamp > ? AND ${colA} IS NOT NULL
                 GROUP BY bucket ORDER BY bucket`,
                since
            ),
            this.db.all(
                `SELECT ${bucketExprB} AS bucket, AVG(${colB}) AS value
                 FROM ${tableB}
                 WHERE timestamp > ? AND ${colB} IS NOT NULL
                 GROUP BY bucket ORDER BY bucket`,
                since
            )
        ]);

        const mapB = new Map(rowsB.map(r => [r.bucket, r.value]));
        const aligned = [];
        for (const a of rowsA) {
            if (mapB.has(a.bucket)) {
                aligned.push({ bucket: a.bucket, x: a.value, y: mapB.get(a.bucket) });
            }
        }
        return aligned;
    }

    // ============================================================
    // ANÁLISIS Y TENDENCIAS
    // ============================================================

    async getEmotionalTrends(period = 'day') {
        const periodMap = { hour: 3600000, day: 86400000, week: 604800000, month: 2592000000 };
        const interval = periodMap[period] ?? 86400000;
        const since = Date.now() - interval;

        return this.db.all(
            `SELECT timestamp, alegria, tristeza, miedo, ira, confianza, ansiedad, bienestar,
                    (alegria + confianza) AS emociones_positivas,
                    (tristeza + miedo + ira + ansiedad) AS emociones_negativas,
                    CASE WHEN (alegria + confianza) > (tristeza + miedo + ira + ansiedad)
                         THEN 'positivo' ELSE 'negativo' END AS tendencia_emocional
             FROM emociones_estados
             WHERE timestamp > ? ORDER BY timestamp ASC LIMIT 1000`,
            since
        );
    }

    async getCognitivePerformance() {
        return this.db.all(
            `SELECT timestamp, atencion, concentracion, razonamiento, toma_decisiones,
                    (atencion + concentracion + razonamiento + toma_decisiones) / 4 AS rendimiento_cognitivo,
                    fatiga, carga
             FROM cognitivo_estados
             ORDER BY timestamp DESC LIMIT 100`
        );
    }

    async getPersonalityEvolution() {
        return this.db.all(
            `SELECT timestamp, apertura, conciencia, extraversion, amabilidad, neuroticismo,
                    (apertura + conciencia + extraversion + amabilidad + (1 - neuroticismo)) / 5 AS salud_personalidad
             FROM personalidad_rasgos ORDER BY timestamp ASC LIMIT 500`
        );
    }

    async getSystemHealthReport() {
        const last = await this.db.get(
            `SELECT timestamp, sim_time FROM sistema_estados ORDER BY timestamp DESC LIMIT 1`
        );
        if (!last) return null;

        const tolerance = 5000;
        const [sys, emo, bio, nt, cog, pers] = await Promise.all([
            this.db.get(`SELECT * FROM sistema_estados WHERE timestamp BETWEEN ? AND ? ORDER BY ABS(timestamp - ?) LIMIT 1`,
                last.timestamp - tolerance, last.timestamp + tolerance, last.timestamp),
            this.db.get(`SELECT * FROM emociones_estados WHERE timestamp BETWEEN ? AND ? ORDER BY ABS(timestamp - ?) LIMIT 1`,
                last.timestamp - tolerance, last.timestamp + tolerance, last.timestamp),
            this.db.get(`SELECT * FROM bioquimica_estados WHERE timestamp BETWEEN ? AND ? ORDER BY ABS(timestamp - ?) LIMIT 1`,
                last.timestamp - tolerance, last.timestamp + tolerance, last.timestamp),
            this.db.get(`SELECT * FROM bioquimica_neurotransmisores WHERE timestamp BETWEEN ? AND ? ORDER BY ABS(timestamp - ?) LIMIT 1`,
                last.timestamp - tolerance, last.timestamp + tolerance, last.timestamp),
            this.db.get(`SELECT * FROM cognitivo_estados WHERE timestamp BETWEEN ? AND ? ORDER BY ABS(timestamp - ?) LIMIT 1`,
                last.timestamp - tolerance, last.timestamp + tolerance, last.timestamp),
            this.db.get(`SELECT * FROM personalidad_rasgos WHERE timestamp BETWEEN ? AND ? ORDER BY ABS(timestamp - ?) LIMIT 1`,
                last.timestamp - tolerance, last.timestamp + tolerance, last.timestamp)
        ]);

        const stability = sys?.estabilidad ?? 0;
        const bienestar = emo?.bienestar ?? 50;
        let estado = 'CRÍTICO';
        if (stability > 0.7 && bienestar > 50) estado = 'EXCELENTE';
        else if (stability > 0.5 && bienestar > 30) estado = 'BUENO';
        else if (stability > 0.3 && bienestar > 20) estado = 'REGULAR';

        return {
            timestamp: last.timestamp,
            estabilidad: stability,
            rendimiento: sys?.rendimiento ?? 0,
            nivel_consciencia: sys?.nivel_consciencia ?? 0,
            bienestar,
            ansiedad: emo?.ansiedad ?? 0,
            oxigeno: bio?.oxigeno ?? 0,
            energia: bio?.energia ?? 0,
            cortisol: nt?.cortisol ?? 0,
            atencion: cog?.atencion ?? 0,
            carga: cog?.carga ?? 0,
            apertura: pers?.apertura ?? 0,
            conciencia: pers?.conciencia ?? 0,
            salud_general: (stability + (sys?.rendimiento ?? 0) + (sys?.nivel_consciencia ?? 0) + bienestar / 100) / 4,
            estado_general: estado
        };
    }

    async getMemoryStatistics() {
        return this.db.get(
            `SELECT COUNT(*) AS total_memorias,
                    SUM(CASE WHEN consolidada = 1 THEN 1 ELSE 0 END) AS consolidadas,
                    AVG(fuerza) AS fuerza_promedio,
                    AVG(importancia) AS importancia_promedio,
                    MAX(fuerza) AS fuerza_maxima,
                    MIN(fuerza) AS fuerza_minima,
                    AVG(accesos) AS accesos_promedio,
                    COUNT(DISTINCT emocion_asociada) AS emociones_distintas
             FROM memoria_episodica`
        );
    }

    async getPatternAnalysis() {
        return this.db.all(
            `SELECT tipo, COUNT(*) AS frecuencia,
                    AVG(confianza) AS confianza_promedio,
                    MAX(timestamp) AS ultima_deteccion
             FROM patrones_detectados
             GROUP BY tipo ORDER BY frecuencia DESC`
        );
    }

    async getNetworkMetrics() {
        return this.db.get(
            `SELECT (SELECT COUNT(*) FROM redes_sinapticas) AS total_conexiones,
                    (SELECT AVG(fuerza) FROM redes_sinapticas) AS fuerza_promedio,
                    (SELECT COUNT(*) FROM memoria_semantica) AS conceptos,
                    (SELECT COUNT(*) FROM memoria_procedural) AS habilidades`
        );
    }

    async getSystemMetrics() {
        const now = Date.now();
        if (this._countCache.data && (now - this._countCache.at) < this._countCache.ttl) {
            return this._countCache.data;
        }
        const [states, emotions, memories, decisions, thoughts, skills, conversations] = await Promise.all([
            this.db.get('SELECT COUNT(*) AS c FROM sistema_estados'),
            this.db.get('SELECT COUNT(*) AS c FROM emociones_estados'),
            this.db.get('SELECT COUNT(*) AS c FROM memoria_episodica'),
            this.db.get('SELECT COUNT(*) AS c FROM cognitivo_decisiones'),
            this.db.get('SELECT COUNT(*) AS c FROM cognitivo_pensamientos'),
            this.db.get('SELECT COUNT(*) AS c FROM memoria_procedural'),
            this.db.get('SELECT COUNT(*) AS c FROM conversaciones').catch(() => ({ c: 0 }))
        ]);
        const data = {
            totalStates: states.c,
            totalEmotions: emotions.c,
            totalMemories: memories.c,
            totalDecisions: decisions.c,
            totalThoughts: thoughts.c,
            totalSkills: skills.c,
            totalConversations: conversations.c
        };
        this._countCache.data = data;
        this._countCache.at = now;
        return data;
    }

    async analyzeTrends(variable, period = 'hour') {
        const periodMap = { hour: 3600000, day: 86400000, week: 604800000, month: 2592000000 };
        const interval = periodMap[period] ?? 86400000;
        const since = Date.now() - interval;

        const tableMap = {
            oxigeno: 'bioquimica_estados', energia: 'bioquimica_estados',
            toxicidad: 'bioquimica_estados', temperatura: 'bioquimica_estados',
            glucosa: 'bioquimica_estados',
            alegria: 'emociones_estados', tristeza: 'emociones_estados',
            miedo: 'emociones_estados', ira: 'emociones_estados',
            ansiedad: 'emociones_estados', bienestar: 'emociones_estados',
            atencion: 'cognitivo_estados', concentracion: 'cognitivo_estados',
            estabilidad: 'sistema_estados', nivel_consciencia: 'sistema_estados'
        };
        const table = tableMap[variable];
        if (!table) throw new Error(`Variable ${variable} no soportada`);
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable)) {
            throw new Error(`Variable inválida: ${variable}`);
        }

        return this.db.all(
            `SELECT timestamp, ${variable} AS valor
             FROM ${table}
             WHERE timestamp > ? AND ${variable} IS NOT NULL
             ORDER BY timestamp ASC LIMIT 2000`,
            since
        );
    }

    /**
     * Correlaciones con alineación por buckets. Antes usaba JOIN por igualdad exacta.
     */
    async findCorrelations(v1, v2, period = 'day') {
        const periodMap = { hour: 3600000, day: 86400000, week: 604800000, month: 2592000000 };
        const interval = periodMap[period] ?? 86400000;
        const since = Date.now() - interval;

        const pairs = [
            { t1: 'bioquimica_estados', c1: 'oxigeno', t2: 'emociones_estados', c2: 'alegria' },
            { t1: 'bioquimica_estados', c1: 'energia', t2: 'emociones_estados', c2: 'confianza' },
            { t1: 'bioquimica_neurotransmisores', c1: 'cortisol', t2: 'emociones_estados', c2: 'miedo' },
            { t1: 'bioquimica_neurotransmisores', c1: 'dopamina', t2: 'emociones_estados', c2: 'alegria' },
            { t1: 'cognitivo_estados', c1: 'atencion', t2: 'bioquimica_estados', c2: 'energia' },
            { t1: 'cognitivo_estados', c1: 'razonamiento', t2: 'emociones_estados', c2: 'confianza' }
        ];

        const pair = pairs.find(p =>
            (p.c1 === v1 && p.c2 === v2) || (p.c1 === v2 && p.c2 === v1)
        );
        if (!pair) {
            return { correlacion: 0, muestras: 0, error: 'Par de variables no soportado' };
        }

        const bucketMs = period === 'hour' ? 10000 : period === 'week' || period === 'month' ? 3600000 : 300000;

        try {
            const aligned = await this.getAlignedSeries(
                pair.t1, pair.c1, pair.t2, pair.c2, bucketMs, since
            );
            return this._computeCorrelation(aligned, v1, v2);
        } catch (err) {
            return { correlacion: 0, muestras: 0, error: err.message };
        }
    }

    _computeCorrelation(aligned, v1, v2) {
        const n = aligned.length;
        if (n < 2) return { correlacion: 0, muestras: n, variable1: v1, variable2: v2 };

        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
        for (const r of aligned) {
            const x = r.x, y = r.y;
            sumX += x; sumY += y;
            sumXY += x * y;
            sumX2 += x * x; sumY2 += y * y;
        }
        const num = n * sumXY - sumX * sumY;
        const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        const correlacion = den === 0 ? 0 : num / den;

        return {
            variable1: v1, variable2: v2,
            correlacion,
            muestras: n,
            media_v1: sumX / n,
            media_v2: sumY / n,
            significancia: Math.abs(correlacion) * Math.sqrt(n)
        };
    }

    async detectAnomalies(threshold = 2.5) {
        const since = Date.now() - 86400000 * 7;
        try {
            return await this.db.all(
                `WITH stats AS (
                    SELECT variable, AVG(valor) AS media, STDDEV(valor) AS desviacion
                    FROM analisis_anomalias GROUP BY variable
                 )
                 SELECT a.*, s.media, s.desviacion,
                        CASE WHEN s.desviacion = 0 THEN 0
                             ELSE (a.valor - s.media) / s.desviacion END AS z_score,
                        CASE
                            WHEN s.desviacion = 0 THEN 'BAJA'
                            WHEN ABS((a.valor - s.media) / s.desviacion) > ? THEN 'CRÍTICA'
                            WHEN ABS((a.valor - s.media) / s.desviacion) > 2 THEN 'ALTA'
                            WHEN ABS((a.valor - s.media) / s.desviacion) > 1.5 THEN 'MEDIA'
                            ELSE 'BAJA'
                        END AS severidad
                 FROM analisis_anomalias a
                 JOIN stats s ON a.variable = s.variable
                 WHERE a.timestamp > ?
                 ORDER BY a.timestamp DESC LIMIT 500`,
                [threshold, since]
            );
        } catch (err) {
            return this.db.all(
                `SELECT * FROM analisis_anomalias WHERE timestamp > ? ORDER BY timestamp DESC LIMIT 500`,
                since
            );
        }
    }

    async predictFuture(variable, horizon = 10) {
        const tableMap = {
            oxigeno: 'bioquimica_estados', energia: 'bioquimica_estados',
            alegria: 'emociones_estados', tristeza: 'emociones_estados',
            miedo: 'emociones_estados', confianza: 'emociones_estados',
            atencion: 'cognitivo_estados', razonamiento: 'cognitivo_estados'
        };
        const table = tableMap[variable];
        if (!table) return { error: `Variable ${variable} no soportada` };
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable)) {
            return { error: `Variable inválida: ${variable}` };
        }

        const rows = await this.db.all(
            `SELECT ${variable} AS v, timestamp
             FROM ${table}
             WHERE ${variable} IS NOT NULL
             ORDER BY timestamp DESC LIMIT 60`
        );
        if (rows.length < 5) return { error: 'Datos insuficientes', muestras: rows.length };

        const n = rows.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        rows.forEach((r, i) => {
            const x = i + 1, y = r.v ?? 0;
            sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x;
        });
        const denom = (n * sumX2 - sumX * sumX);
        const pendiente = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
        const intercepto = (sumY - pendiente * sumX) / n;
        const prediccion = intercepto + pendiente * (n + horizon);

        return {
            variable,
            valor_actual: rows[0].v,
            valor_predicho: prediccion,
            pendiente,
            horizonte: horizon,
            muestras: n,
            confianza: Math.min(0.95, 0.4 + n / 100)
        };
    }

    async getDecisionPatterns() {
        return this.db.all(
            `SELECT decision, COUNT(*) AS frecuencia,
                    AVG(confianza) AS confianza_promedio,
                    AVG(tiempo_procesamiento) AS tiempo_promedio,
                    SUM(CASE WHEN resultado = 'exito' THEN 1 ELSE 0 END) AS exitos,
                    SUM(CASE WHEN resultado = 'fallo' THEN 1 ELSE 0 END) AS fallos
             FROM cognitivo_decisiones GROUP BY decision
             ORDER BY frecuencia DESC LIMIT 20`
        );
    }

    async getThoughtPatterns() {
        return this.db.all(
            `SELECT tipo, COUNT(*) AS frecuencia,
                    AVG(intensidad) AS intensidad_promedio,
                    AVG(nivel_consciencia) AS consciencia_promedio
             FROM cognitivo_pensamientos GROUP BY tipo
             ORDER BY frecuencia DESC`
        );
    }

    async getMotorSkillReport() {
        return this.db.all(
            `SELECT nombre, tipo, nivel, practicas, eficiencia, mastery, complejidad,
                    CASE
                        WHEN mastery > 80 THEN 'experto'
                        WHEN mastery > 60 THEN 'avanzado'
                        WHEN mastery > 40 THEN 'intermedio'
                        ELSE 'principiante'
                    END AS nivel_habilidad
             FROM motor_habilidades ORDER BY mastery DESC`
        );
    }

    async getSocialNetwork() {
        return this.db.all(
            `SELECT entidad, tipo_relacion, confianza, conexion, interacciones,
                    CASE
                        WHEN confianza > 0.7 AND conexion > 0.7 THEN 'fuerte'
                        WHEN confianza > 0.5 AND conexion > 0.5 THEN 'media'
                        ELSE 'débil'
                    END AS calidad_relacion
             FROM social_relaciones ORDER BY conexion DESC`
        );
    }

    async getSleepAnalysis() {
        return this.db.all(
            `SELECT estado, COUNT(*) AS frecuencia,
                    AVG(presion_sueno) AS presion_promedio,
                    AVG(profundidad) AS profundidad_promedio,
                    AVG(calidad_sueno) AS calidad_promedio
             FROM sueno_estados GROUP BY estado ORDER BY frecuencia DESC`
        );
    }

    async getNeurotransmitterBalance() {
        return this.db.get(
            `SELECT AVG(dopamina) AS dopamina, AVG(serotonina) AS serotonina,
                    AVG(noradrenalina) AS noradrenalina, AVG(cortisol) AS cortisol,
                    AVG(oxitocina) AS oxitocina, AVG(gaba) AS gaba,
                    AVG(glutamato) AS glutamato,
                    AVG(dopamina) / NULLIF(AVG(cortisol), 0) AS ratio_dopa_cort,
                    AVG(serotonina) / NULLIF(AVG(cortisol), 0) AS ratio_sero_cort
             FROM bioquimica_neurotransmisores`
        );
    }

    async getSystemPerformance() {
        return this.db.get(
            `SELECT AVG(estabilidad) AS estabilidad_promedio,
                    AVG(rendimiento) AS rendimiento_promedio,
                    AVG(nivel_consciencia) AS consciencia_promedio,
                    MAX(estabilidad) AS estabilidad_max,
                    MIN(estabilidad) AS estabilidad_min,
                    COUNT(*) AS muestras
             FROM sistema_estados`
        );
    }

    async getPersonalityInsights() {
        const r = await this.db.get(
            `SELECT * FROM personalidad_rasgos ORDER BY timestamp DESC LIMIT 1`
        );
        if (!r) return null;
        const health = (r.apertura + r.conciencia + r.extraversion + r.amabilidad + (1 - r.neuroticismo)) / 5;
        let perfil = 'BALANCEADO';
        if (r.apertura > 0.7 && r.conciencia > 0.7) perfil = 'VISIONARIO';
        else if (r.apertura > 0.7 && r.extraversion > 0.7) perfil = 'CREATIVO_SOCIAL';
        else if (r.conciencia > 0.7 && r.amabilidad > 0.7) perfil = 'ORGANIZADO_EMPATICO';
        else if (r.neuroticismo > 0.7) perfil = 'SENSIBLE';
        return { ...r, salud_personalidad: health, perfil_personalidad: perfil };
    }

    async getCognitiveFlow() {
        return this.db.all(
            `SELECT timestamp, atencion, concentracion, razonamiento, creatividad,
                    (atencion + concentracion + razonamiento + creatividad) / 4 AS estado_flow,
                    CASE
                        WHEN (atencion + concentracion + razonamiento + creatividad) / 4 > 70
                            AND carga < 50 THEN 'FLOW'
                        WHEN (atencion + concentracion + razonamiento + creatividad) / 4 < 30
                            OR carga > 70 THEN 'ESTRES'
                        ELSE 'NEUTRAL'
                    END AS estado_cognitivo
             FROM cognitivo_estados ORDER BY timestamp DESC LIMIT 100`
        );
    }

    async getAdvancedMetrics() {
        return {
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
    }

    // ============================================================
    // EXPORT / IMPORT
    // ============================================================

    async exportToJSON(limit = 100) {
        const data = { timestamp: Date.now(), version: '4.3.0', tables: {} };
        const tables = await this.db.all(
            `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
        );

        for (const t of tables) {
            try {
                const cols = await this._getTableColumns(t.name);
                const hasTimestamp = cols.includes('timestamp');
                const hasId = cols.includes('id');
                let query;
                if (hasTimestamp) query = `SELECT * FROM ${t.name} ORDER BY timestamp DESC LIMIT ?`;
                else if (hasId) query = `SELECT * FROM ${t.name} ORDER BY id DESC LIMIT ?`;
                else query = `SELECT * FROM ${t.name} LIMIT ?`;
                data.tables[t.name] = await this.db.all(query, limit);
            } catch (err) {
                data.tables[t.name] = { error: err.message };
            }
        }
        return data;
    }

    async importFromJSON(data) {
        if (!data || !data.tables) return { imported: 0, skipped: 0, errors: [] };
        const stats = { imported: 0, skipped: 0, errors: [] };

        for (const table of Object.keys(data.tables)) {
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) continue;
            const rows = data.tables[table];
            if (!Array.isArray(rows) || rows.length === 0) continue;

            const validColumns = await this._getTableColumns(table);
            if (!validColumns.length) {
                stats.errors.push(`Tabla desconocida: ${table}`);
                continue;
            }

            for (const row of rows) {
                const columns = Object.keys(row).filter(c => validColumns.includes(c));
                if (columns.length === 0) { stats.skipped++; continue; }
                const placeholders = columns.map(() => '?').join(',');
                const values = columns.map(c => row[c]);
                try {
                    await this.db.run(
                        `INSERT OR IGNORE INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`,
                        values
                    );
                    stats.imported++;
                } catch (err) {
                    stats.skipped++;
                    if (stats.errors.length < 20) stats.errors.push(`${table}: ${err.message}`);
                }
            }
        }
        this._invalidateCache(null);
        return stats;
    }

    // ============================================================
    // MANTENIMIENTO
    // ============================================================

    async optimize() {
        try { await this.db.exec('ANALYZE'); } catch (_) {}
        await this.db.exec('REINDEX');
        await this.db.exec('VACUUM');
        this._invalidateCache(null);
        this._columnCache.clear();
        return true;
    }

    async checkIntegrity() {
        const integrity = await this.db.all('PRAGMA integrity_check');
        const fk = await this.db.all('PRAGMA foreign_key_check');
        return {
            integrity: integrity[0]?.integrity_check === 'ok',
            foreignKeys: fk.length === 0,
            details: integrity,
            foreignKeyDetails: fk
        };
    }

    async getDatabaseStats() {
        const sizeRow = await this.db.get(
            'SELECT page_count * page_size AS size FROM pragma_page_count(), pragma_page_size()'
        );
        return {
            size: sizeRow?.size ?? 0,
            tables: await this.db.all("SELECT name FROM sqlite_master WHERE type='table'"),
            indexes: await this.db.all("SELECT name FROM sqlite_master WHERE type='index'"),
            triggers: await this.db.all("SELECT name FROM sqlite_master WHERE type='trigger'"),
            views: await this.db.all("SELECT name FROM sqlite_master WHERE type='view'")
        };
    }

    async quickStats() {
        const count = async (t) => {
            try { return (await this.db.get(`SELECT COUNT(*) AS c FROM ${t}`)).c; }
            catch (_) { return 0; }
        };
        return {
            states: { count: await count('sistema_estados') },
            emotions: { count: await count('emociones_estados') },
            biochemical: { count: await count('bioquimica_estados') },
            cognitive: { count: await count('cognitivo_estados') },
            memories: { count: await count('memoria_episodica') },
            decisions: { count: await count('cognitivo_decisiones') },
            thoughts: { count: await count('cognitivo_pensamientos') },
            patterns: { count: await count('patrones_detectados') },
            connections: { count: await count('redes_sinapticas') },
            conversations: { count: await count('conversaciones') }
        };
    }

    async cleanup(daysToKeep = 30) {
        const cutoff = Date.now() - daysToKeep * 86400000;
        const tables = [
            'sistema_estados', 'sistema_metricas', 'sistema_eventos',
            'bioquimica_estados', 'bioquimica_neurotransmisores',
            'bioquimica_hormonas', 'bioquimica_signos_vitales',
            'emociones_estados', 'emociones_dimensiones',
            'cognitivo_estados', 'cognitivo_pensamientos',
            'motor_estados', 'motor_acciones', 'social_interacciones',
            // V4.2: limpiar conversaciones antiguas
            'conversaciones'
        ];
        let totalDeleted = 0;
        for (const t of tables) {
            try {
                const r = await this.db.run(`DELETE FROM ${t} WHERE timestamp < ?`, cutoff);
                totalDeleted += r.changes || 0;
            } catch (_) {}
        }
        await this.db.exec('VACUUM');
        this._invalidateCache(null);
        return totalDeleted;
    }

    async getMetrics() {
        const sizeRow = await this.db.get(
            'SELECT page_count * page_size AS size FROM pragma_page_count(), pragma_page_size()'
        );
        const count = async (type) =>
            (await this.db.get(
                `SELECT COUNT(*) AS c FROM sqlite_master WHERE type=?`, type
            )).c;

        return {
            ...this.metrics,
            cacheSize: this.cache.size,
            isInitialized: this.isInitialized,
            databaseSize: sizeRow?.size ?? 0,
            tableCount: await count('table'),
            viewCount: await count('view'),
            triggerCount: await count('trigger'),
            indexCount: await count('index')
        };
    }

    async close() {
        if (this.backupInterval) clearInterval(this.backupInterval);
        if (this.db) {
            try { await this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); } catch (_) {}
            try { await this.db.close(); } catch (_) {}
            this.isInitialized = false;
        }
    }
}
