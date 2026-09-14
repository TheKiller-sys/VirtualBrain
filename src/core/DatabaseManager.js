// src/core/DatabaseManager.js
// Base de datos ultra avanzada con funciones SQLite personalizadas — V4

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DatabaseManager {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.dbPath = process.env.DATABASE_PATH ||
            path.join(__dirname, '../../database/cerebro.db');
        this.backupInterval = null;
        this.cache = new Map();
        this.cacheTimeout = 300000; // 5 min para históricos
        this._columnCache = new Map();
        this.metrics = {
            queries: 0,
            cacheHits: 0,
            cacheMisses: 0,
            avgQueryTime: 0
        };
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

            // PRAGMAs de rendimiento (mmap reducido a 256MB, seguro para dev)
            await this.db.exec('PRAGMA journal_mode = WAL');
            await this.db.exec('PRAGMA synchronous = NORMAL');
            await this.db.exec('PRAGMA cache_size = -200000');
            await this.db.exec('PRAGMA temp_store = MEMORY');
            await this.db.exec('PRAGMA mmap_size = 268435456'); // 256 MB
            await this.db.exec('PRAGMA page_size = 32768');
            await this.db.exec('PRAGMA wal_autocheckpoint = 1000');
            await this.db.exec('PRAGMA foreign_keys = ON');
            await this.db.exec('PRAGMA busy_timeout = 5000');

            await this.createAllTables();
            await this.createAllIndexes();
            await this.createAllViews();
            await this.createAllTriggers();
            await this.migrateTriggers();
            await this.createAllFunctions();
            await this.initializeData();

            this.isInitialized = true;
            this.startAutoBackup();

            console.log('🗄️ Base de datos V4 inicializada');
            return true;
        } catch (error) {
            console.error('❌ Error inicializando DB:', error.message);
            return false;
        }
    }

    startAutoBackup() {
        const interval = parseInt(process.env.DB_BACKUP_INTERVAL) || 3600000;
        this.backupInterval = setInterval(() => {
            this.createBackup().catch(err => console.error('Backup error:', err.message));
        }, interval);
        if (this.backupInterval.unref) this.backupInterval.unref();
    }

    /**
     * Backup sin bloquear: checkpoint WAL + copia de archivos.
     * Mucho más rápido que VACUUM INTO y no bloquea el bucle de 30Hz.
     */
    async createBackup() {
        try {
            const backupDir = path.join(path.dirname(this.dbPath), 'backups');
            if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(backupDir, `cerebro_${timestamp}.db`);

            // Forzar checkpoint para que el .db contenga todos los datos
            try { await this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); } catch (_) { /* noop */ }

            fs.copyFileSync(this.dbPath, backupPath);

            // Rotación: mantener solo los 10 más recientes
            const backups = fs.readdirSync(backupDir)
                .filter(f => f.startsWith('cerebro_') && f.endsWith('.db'))
                .sort();
            while (backups.length > 10) {
                const old = backups.shift();
                try { fs.unlinkSync(path.join(backupDir, old)); } catch (_) { /* noop */ }
            }
            return backupPath;
        } catch (error) {
            console.error('❌ Error creando backup:', error.message);
            return null;
        }
    }

    // ============================================================
    // CREACIÓN DE TABLAS
    // ============================================================

    async createAllTables() {
        // ============ SISTEMA ============
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS sistema_estados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                estabilidad REAL DEFAULT 0,
                rendimiento REAL DEFAULT 0,
                nivel_consciencia REAL DEFAULT 0,
                integridad REAL DEFAULT 1,
                emergencia INTEGER DEFAULT 0,
                datos TEXT,
                checksum TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sistema_metricas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
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
                tipo TEXT,
                fuente TEXT,
                datos TEXT,
                importancia INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sistema_alertas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
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
                clave TEXT,
                valor TEXT,
                categoria TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ============ BIOQUÍMICA ============
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS bioquimica_estados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                oxigeno REAL DEFAULT 0,
                energia REAL DEFAULT 0,
                toxicidad REAL DEFAULT 0,
                temperatura REAL DEFAULT 37,
                ph REAL DEFAULT 7.4,
                glucosa REAL DEFAULT 80,
                lactato REAL DEFAULT 10,
                creatinina REAL DEFAULT 1,
                urea REAL DEFAULT 20,
                estado_hidratacion REAL DEFAULT 80,
                dioxido_carbono REAL DEFAULT 0,
                monoxido_carbono REAL DEFAULT 0,
                oxido_nitrico REAL DEFAULT 5,
                recuperacion REAL DEFAULT 75,
                fatiga_acumulada REAL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS bioquimica_neurotransmisores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                dopamina REAL DEFAULT 50,
                serotonina REAL DEFAULT 50,
                noradrenalina REAL DEFAULT 50,
                cortisol REAL DEFAULT 20,
                oxitocina REAL DEFAULT 30,
                gaba REAL DEFAULT 50,
                glutamato REAL DEFAULT 50,
                endorfinas REAL DEFAULT 30,
                acetilcolina REAL DEFAULT 50,
                adrenalina REAL DEFAULT 10,
                histamina REAL DEFAULT 20,
                melatonina REAL DEFAULT 20,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS bioquimica_hormonas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                hormona_crecimiento REAL DEFAULT 25,
                testosterona REAL DEFAULT 30,
                estradiol REAL DEFAULT 20,
                insulina REAL DEFAULT 15,
                glucagon REAL DEFAULT 10,
                leptina REAL DEFAULT 20,
                grelina REAL DEFAULT 20,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS bioquimica_signos_vitales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                frecuencia_cardiaca REAL DEFAULT 72,
                presion_sistolica REAL DEFAULT 120,
                presion_diastolica REAL DEFAULT 80,
                saturacion_oxigeno REAL DEFAULT 98,
                ritmo_respiratorio REAL DEFAULT 16,
                variabilidad_cardiaca REAL DEFAULT 50,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS bioquimica_historico (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                variable TEXT,
                valor REAL,
                delta REAL,
                tendencia TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ============ EMOCIONES ============
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS emociones_estados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                alegria REAL DEFAULT 20,
                tristeza REAL DEFAULT 10,
                miedo REAL DEFAULT 5,
                ira REAL DEFAULT 5,
                asco REAL DEFAULT 3,
                sorpresa REAL DEFAULT 8,
                confianza REAL DEFAULT 50,
                verguenza REAL DEFAULT 5,
                orgullo REAL DEFAULT 15,
                culpa REAL DEFAULT 5,
                envidia REAL DEFAULT 3,
                gratitud REAL DEFAULT 20,
                esperanza REAL DEFAULT 30,
                aceptacion REAL DEFAULT 40,
                frustracion REAL DEFAULT 20,
                nostalgia REAL DEFAULT 15,
                conexion REAL DEFAULT 45,
                soledad REAL DEFAULT 10,
                ansiedad REAL DEFAULT 20,
                bienestar REAL DEFAULT 65,
                depresion REAL DEFAULT 10,
                euforia REAL DEFAULT 5,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS emociones_dimensiones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                valencia REAL DEFAULT 0.6,
                activacion REAL DEFAULT 0.5,
                dominio REAL DEFAULT 0.7,
                intensidad REAL DEFAULT 0.5,
                complejidad REAL DEFAULT 0.3,
                polaridad REAL DEFAULT 0.6,
                regulacion REAL DEFAULT 0.7,
                estabilidad REAL DEFAULT 80,
                resiliencia REAL DEFAULT 75,
                sensibilidad REAL DEFAULT 50,
                humor REAL DEFAULT 60,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS emociones_patrones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                nombre TEXT,
                emocion_principal TEXT,
                intensidad REAL,
                duracion REAL,
                progreso REAL,
                completado INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS emociones_regulacion (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                estrategia TEXT,
                efectividad REAL,
                duracion REAL,
                emocion_inicial TEXT,
                emocion_final TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS emociones_historico (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                emocion TEXT,
                nivel REAL,
                contexto TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ============ COGNITIVO ============
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS cognitivo_estados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                atencion REAL DEFAULT 80,
                concentracion REAL DEFAULT 75,
                memoria_trabajo REAL DEFAULT 70,
                velocidad_procesamiento REAL DEFAULT 65,
                razonamiento REAL DEFAULT 70,
                toma_decisiones REAL DEFAULT 75,
                planificacion REAL DEFAULT 65,
                flexibilidad REAL DEFAULT 60,
                inhibicion REAL DEFAULT 70,
                creatividad REAL DEFAULT 40,
                intuicion REAL DEFAULT 45,
                curiosidad REAL DEFAULT 50,
                insight REAL DEFAULT 30,
                fluidez REAL DEFAULT 65,
                carga REAL DEFAULT 30,
                fatiga REAL DEFAULT 20,
                estres REAL DEFAULT 25,
                autoconciencia REAL DEFAULT 65,
                monitoreo REAL DEFAULT 70,
                regulacion REAL DEFAULT 60,
                aprendizaje REAL DEFAULT 70,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS cognitivo_procesos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                proceso TEXT,
                capacidad REAL,
                carga REAL,
                eficiencia REAL,
                prioridad INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS cognitivo_metas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                tipo TEXT,
                descripcion TEXT,
                prioridad INTEGER DEFAULT 1,
                progreso REAL DEFAULT 0,
                completada INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS cognitivo_planes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                goal_id INTEGER,
                pasos TEXT,
                progreso REAL,
                completado INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS cognitivo_decisiones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                decision TEXT,
                opciones TEXT,
                contexto TEXT,
                confianza REAL DEFAULT 0.5,
                tiempo_procesamiento REAL DEFAULT 0,
                emocion_dominante TEXT,
                resultado TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS cognitivo_pensamientos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                contenido TEXT,
                tipo TEXT DEFAULT 'consciente',
                intensidad REAL DEFAULT 0.5,
                emocion_asociada TEXT,
                nivel_consciencia REAL DEFAULT 0.5,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS cognitivo_aprendizaje (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                habilidad TEXT,
                nivel_anterior REAL,
                nivel_nuevo REAL,
                ganancia REAL,
                metodo TEXT,
                exito INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ============ MEMORIA ============
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS memoria_episodica (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                contenido TEXT,
                contexto TEXT,
                fuerza REAL DEFAULT 0.5,
                importancia REAL DEFAULT 0.5,
                emocion_asociada TEXT DEFAULT 'neutral',
                consolidada INTEGER DEFAULT 0,
                accesos INTEGER DEFAULT 0,
                ultimo_acceso INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS memoria_semantica (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                concepto TEXT UNIQUE,
                significado TEXT,
                fuerza REAL DEFAULT 0.3,
                contextos INTEGER DEFAULT 1,
                ultima_actualizacion INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS memoria_procedural (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                habilidad TEXT UNIQUE,
                nivel REAL DEFAULT 0,
                practicas INTEGER DEFAULT 0,
                eficiencia REAL DEFAULT 0.5,
                complejidad REAL DEFAULT 5,
                importancia REAL DEFAULT 0.5,
                ultima_practica INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS memoria_trabajo (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                contenido TEXT,
                fuerza REAL DEFAULT 0.5,
                tipo TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS memoria_emocional (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                contenido TEXT,
                emocion TEXT,
                intensidad REAL DEFAULT 0.5,
                importancia REAL DEFAULT 0.5,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS memoria_espacial (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ubicacion TEXT UNIQUE,
                coordenadas_x REAL DEFAULT 0,
                coordenadas_y REAL DEFAULT 0,
                coordenadas_z REAL DEFAULT 0,
                precision REAL DEFAULT 0.5,
                importancia REAL DEFAULT 0.5,
                ultimo_acceso INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS memoria_social (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entidad TEXT UNIQUE,
                relacion TEXT,
                confianza REAL DEFAULT 0.5,
                conexion REAL DEFAULT 0.5,
                interacciones INTEGER DEFAULT 0,
                ultima_interaccion INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS memoria_asociaciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                origen_id INTEGER,
                destino_id INTEGER,
                tipo_origen TEXT,
                tipo_destino TEXT,
                fuerza REAL DEFAULT 0.5,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS memoria_consolidacion (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                memoria_id INTEGER,
                tipo TEXT,
                fuerza_inicial REAL,
                fuerza_final REAL,
                tiempo_procesamiento REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ============ PERSONALIDAD ============
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS personalidad_rasgos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                apertura REAL DEFAULT 0.5,
                conciencia REAL DEFAULT 0.5,
                extraversion REAL DEFAULT 0.5,
                amabilidad REAL DEFAULT 0.5,
                neuroticismo REAL DEFAULT 0.5,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS personalidad_subrasgos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                curiosidad REAL DEFAULT 0.5,
                creatividad REAL DEFAULT 0.5,
                imaginacion REAL DEFAULT 0.5,
                disciplina REAL DEFAULT 0.5,
                organizacion REAL DEFAULT 0.5,
                responsabilidad REAL DEFAULT 0.5,
                sociabilidad REAL DEFAULT 0.5,
                asertividad REAL DEFAULT 0.5,
                energia REAL DEFAULT 0.5,
                empatia REAL DEFAULT 0.5,
                cooperacion REAL DEFAULT 0.5,
                confianza REAL DEFAULT 0.5,
                ansiedad REAL DEFAULT 0.5,
                vulnerabilidad REAL DEFAULT 0.5,
                inestabilidad REAL DEFAULT 0.5,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS personalidad_estados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                estabilidad REAL DEFAULT 0.7,
                flexibilidad REAL DEFAULT 0.5,
                adaptabilidad REAL DEFAULT 0.6,
                integridad REAL DEFAULT 0.8,
                madurez REAL DEFAULT 0.4,
                sabiduria REAL DEFAULT 0.3,
                autenticidad REAL DEFAULT 0.6,
                bienestar REAL DEFAULT 0.6,
                satisfaccion REAL DEFAULT 0.5,
                proposito REAL DEFAULT 0.4,
                autoconocimiento REAL DEFAULT 0.5,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS personalidad_evolucion (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                rasgo TEXT,
                valor_anterior REAL,
                valor_nuevo REAL,
                delta REAL,
                causa TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS personalidad_influencia (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                sistema TEXT,
                dimension TEXT,
                factor REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ============ MOTIVACIÓN ============
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS motivacion_impulsos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                hambre REAL DEFAULT 0.3,
                sed REAL DEFAULT 0.2,
                confort REAL DEFAULT 0.4,
                seguridad REAL DEFAULT 0.6,
                curiosidad REAL DEFAULT 0.5,
                logro REAL DEFAULT 0.4,
                afiliacion REAL DEFAULT 0.5,
                poder REAL DEFAULT 0.3,
                autonomia REAL DEFAULT 0.6,
                competencia REAL DEFAULT 0.4,
                estatus REAL DEFAULT 0.3,
                pertenencia REAL DEFAULT 0.5,
                reconocimiento REAL DEFAULT 0.4,
                contribucion REAL DEFAULT 0.3,
                exploracion REAL DEFAULT 0.5,
                significado REAL DEFAULT 0.3,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS motivacion_estados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                intensidad REAL DEFAULT 0.5,
                satisfaccion REAL DEFAULT 0.6,
                urgencia REAL DEFAULT 0.3,
                persistencia REAL DEFAULT 0.5,
                flexibilidad REAL DEFAULT 0.4,
                impulso_actual TEXT,
                nivel_activacion REAL DEFAULT 0.5,
                foco_motivacional REAL DEFAULT 0.6,
                frustracion REAL DEFAULT 0.2,
                esperanza REAL DEFAULT 0.6,
                determinacion REAL DEFAULT 0.5,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS motivacion_metas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                tipo TEXT,
                descripcion TEXT,
                impulso_asociado TEXT,
                prioridad INTEGER DEFAULT 5,
                progreso REAL DEFAULT 0,
                completada INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS motivacion_recompensas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                tipo TEXT,
                intensidad REAL,
                duracion REAL,
                efecto TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ============ SUEÑO ============
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS sueno_estados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                estado TEXT DEFAULT 'despierto',
                presion_sueno REAL DEFAULT 0,
                deuda_sueno REAL DEFAULT 0,
                profundidad REAL DEFAULT 0,
                calidad_sueno REAL DEFAULT 0.8,
                eficiencia_sueno REAL DEFAULT 0.7,
                tiempo_dormido REAL DEFAULT 0,
                ciclos_completos INTEGER DEFAULT 0,
                despertares INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sueno_ciclos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                fase TEXT,
                duracion REAL,
                profundidad_promedio REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sueno_sueños (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                contenido TEXT,
                tipo TEXT,
                emocion TEXT,
                tema TEXT,
                intensidad REAL DEFAULT 0.5,
                vividness REAL DEFAULT 0.5,
                duracion REAL DEFAULT 10,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sueno_ritmo_circadiano (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                fase REAL,
                melatonina REAL,
                cortisol REAL,
                temperatura REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ============ MOTOR ============
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS motor_estados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                coordinacion REAL DEFAULT 80,
                fuerza REAL DEFAULT 75,
                velocidad REAL DEFAULT 70,
                precision REAL DEFAULT 72,
                agilidad REAL DEFAULT 65,
                equilibrio REAL DEFAULT 68,
                resistencia REAL DEFAULT 75,
                fatiga REAL DEFAULT 20,
                recuperacion REAL DEFAULT 70,
                control_voluntario REAL DEFAULT 78,
                control_automatico REAL DEFAULT 82,
                fluidez REAL DEFAULT 74,
                tension REAL DEFAULT 25,
                relajacion REAL DEFAULT 60,
                estabilidad REAL DEFAULT 76,
                precision_fina REAL DEFAULT 70,
                fuerza_explosiva REAL DEFAULT 65,
                tiempo_reaccion REAL DEFAULT 60,
                propiocepcion REAL DEFAULT 65,
                reflejos REAL DEFAULT 75,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS motor_habilidades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT UNIQUE,
                tipo TEXT,
                complejidad INTEGER DEFAULT 5,
                energia_requerida REAL DEFAULT 1,
                nivel REAL DEFAULT 70,
                practicas INTEGER DEFAULT 0,
                eficiencia REAL DEFAULT 0.8,
                mastery REAL DEFAULT 0,
                ultimo_uso INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS motor_acciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                tipo TEXT,
                duracion REAL,
                exito INTEGER DEFAULT 1,
                calidad REAL DEFAULT 0.7,
                probabilidad REAL DEFAULT 0.7,
                es_reflejo INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS motor_reflejos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT UNIQUE,
                trigger TEXT,
                respuesta TEXT,
                velocidad REAL DEFAULT 0.15,
                prioridad INTEGER DEFAULT 5,
                activo INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS motor_patrones_movimiento (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                tipo TEXT,
                duracion REAL,
                intensidad REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ============ SOCIAL ============
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS social_interacciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                con_quien TEXT,
                tipo TEXT,
                duracion REAL,
                calidad REAL,
                emocion_dominante TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS social_relaciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entidad TEXT UNIQUE,
                tipo_relacion TEXT,
                confianza REAL DEFAULT 0.5,
                conexion REAL DEFAULT 0.5,
                interacciones INTEGER DEFAULT 0,
                ultima_interaccion INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS social_empatia (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                cognitiva REAL,
                afectiva REAL,
                compasiva REAL,
                contagio REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ============ PATRONES ============
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS patrones_emocionales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT UNIQUE,
                descripcion TEXT,
                trigger TEXT,
                progresion TEXT,
                duracion REAL,
                intensidad_base REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS patrones_conductuales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT UNIQUE,
                descripcion TEXT,
                condiciones TEXT,
                acciones TEXT,
                frecuencia REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS patrones_cognitivos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT UNIQUE,
                descripcion TEXT,
                tipo TEXT,
                patron TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS patrones_detectados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                tipo TEXT,
                patron TEXT,
                confianza REAL DEFAULT 0.5,
                frecuencia INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ============ ANÁLISIS ============
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS analisis_tendencias (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                variable TEXT,
                tendencia TEXT,
                intensidad REAL,
                confianza REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS analisis_correlaciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                variable1 TEXT,
                variable2 TEXT,
                correlacion REAL,
                significancia REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS analisis_anomalias (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                variable TEXT,
                valor REAL,
                esperado REAL,
                desviacion REAL,
                gravedad REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS analisis_predicciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                variable TEXT,
                valor_actual REAL,
                valor_predicho REAL,
                horizonte INTEGER,
                confianza REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS analisis_clustering (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                cluster_id INTEGER,
                centroides TEXT,
                miembros TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ============ REDES ============
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS redes_neuronas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT,
                tipo TEXT,
                activacion REAL DEFAULT 0.5,
                umbral REAL DEFAULT 0.5,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS redes_conexiones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                origen_id INTEGER,
                destino_id INTEGER,
                peso REAL DEFAULT 0.5,
                tipo TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS redes_sinapticas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                origen TEXT,
                destino TEXT,
                fuerza REAL DEFAULT 0.5,
                plasticidad REAL DEFAULT 0.5,
                ultima_actualizacion INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS redes_estados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                red TEXT,
                patron_activacion TEXT,
                energia REAL,
                entropia REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ============ TEMPORAL Y CONFIG ============
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS temporal_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                clave TEXT UNIQUE,
                valor TEXT,
                expira INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS temporal_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                tipo TEXT,
                datos TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS config_parametros (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                clave TEXT UNIQUE,
                valor TEXT,
                tipo TEXT,
                descripcion TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS config_umbrales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                variable TEXT UNIQUE,
                minimo REAL,
                maximo REAL,
                critico REAL,
                advertencia REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS config_preferencias (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario TEXT,
                clave TEXT,
                valor TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
    }

    // ============================================================
    // ÍNDICES
    // ============================================================

    async createAllIndexes() {
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_sistema_estados_ts ON sistema_estados(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_sistema_metricas_ts ON sistema_metricas(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_sistema_eventos_ts ON sistema_eventos(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_sistema_eventos_tipo ON sistema_eventos(tipo)',
            'CREATE INDEX IF NOT EXISTS idx_sistema_alertas_resuelta ON sistema_alertas(resuelta)',

            'CREATE INDEX IF NOT EXISTS idx_bio_estados_ts ON bioquimica_estados(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_bio_nt_ts ON bioquimica_neurotransmisores(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_bio_hormonas_ts ON bioquimica_hormonas(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_bio_signos_ts ON bioquimica_signos_vitales(timestamp)',

            'CREATE INDEX IF NOT EXISTS idx_emo_estados_ts ON emociones_estados(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_emo_dim_ts ON emociones_dimensiones(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_emo_hist_emocion ON emociones_historico(emocion)',

            'CREATE INDEX IF NOT EXISTS idx_cog_estados_ts ON cognitivo_estados(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_cog_dec_ts ON cognitivo_decisiones(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_cog_pens_ts ON cognitivo_pensamientos(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_cog_pens_tipo ON cognitivo_pensamientos(tipo)',

            'CREATE INDEX IF NOT EXISTS idx_mem_epi_ts ON memoria_episodica(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_mem_epi_fuerza ON memoria_episodica(fuerza)',
            'CREATE INDEX IF NOT EXISTS idx_mem_sem_concepto ON memoria_semantica(concepto)',
            'CREATE INDEX IF NOT EXISTS idx_mem_proc_habilidad ON memoria_procedural(habilidad)',
            'CREATE INDEX IF NOT EXISTS idx_mem_asoc_origen ON memoria_asociaciones(origen_id)',

            'CREATE INDEX IF NOT EXISTS idx_pers_rasgos_ts ON personalidad_rasgos(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_pers_evo_ts ON personalidad_evolucion(timestamp)',

            'CREATE INDEX IF NOT EXISTS idx_mot_impulsos_ts ON motivacion_impulsos(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_mot_metas_compl ON motivacion_metas(completada)',

            'CREATE INDEX IF NOT EXISTS idx_sueno_estados_ts ON sueno_estados(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_sueno_suenos_ts ON sueno_sueños(timestamp)',

            'CREATE INDEX IF NOT EXISTS idx_motor_estados_ts ON motor_estados(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_motor_habilidades_nombre ON motor_habilidades(nombre)',

            'CREATE INDEX IF NOT EXISTS idx_social_inter_ts ON social_interacciones(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_social_rel_entidad ON social_relaciones(entidad)',

            'CREATE INDEX IF NOT EXISTS idx_patrones_det_ts ON patrones_detectados(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_analisis_tend_ts ON analisis_tendencias(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_analisis_anom_ts ON analisis_anomalias(timestamp)',

            'CREATE INDEX IF NOT EXISTS idx_redes_conex_origen ON redes_conexiones(origen_id)',
            'CREATE INDEX IF NOT EXISTS idx_redes_sinap_origen ON redes_sinapticas(origen)',

            'CREATE INDEX IF NOT EXISTS idx_temporal_cache_clave ON temporal_cache(clave)',
            'CREATE INDEX IF NOT EXISTS idx_config_param_clave ON config_parametros(clave)',

            // Índices UNIQUE que faltaban para ON CONFLICT
            'CREATE UNIQUE INDEX IF NOT EXISTS idx_redes_sinap_unique ON redes_sinapticas(origen, destino)'
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
            `CREATE VIEW IF NOT EXISTS vista_estado_completo AS
             SELECT s.timestamp,
                    s.estabilidad, s.rendimiento, s.nivel_consciencia,
                    e.alegria, e.tristeza, e.miedo, e.ira, e.ansiedad, e.bienestar,
                    b.oxigeno, b.energia, b.cortisol,
                    n.dopamina, n.serotonina,
                    c.atencion, c.razonamiento, c.toma_decisiones,
                    p.apertura, p.conciencia, p.extraversion
             FROM sistema_estados s
             LEFT JOIN emociones_estados e ON s.timestamp = e.timestamp
             LEFT JOIN bioquimica_estados b ON s.timestamp = b.timestamp
             LEFT JOIN bioquimica_neurotransmisores n ON s.timestamp = n.timestamp
             LEFT JOIN cognitivo_estados c ON s.timestamp = c.timestamp
             LEFT JOIN personalidad_rasgos p ON s.timestamp = p.timestamp`,

            `CREATE VIEW IF NOT EXISTS vista_resumen_emocional AS
             SELECT timestamp,
                    alegria, tristeza, miedo, ira, confianza, ansiedad, bienestar,
                    (alegria + confianza) AS emociones_positivas,
                    (tristeza + miedo + ira + ansiedad) AS emociones_negativas,
                    (alegria + confianza) - (tristeza + miedo + ira + ansiedad) AS balance_emocional
             FROM emociones_estados`,

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

            `CREATE VIEW IF NOT EXISTS vista_memoria_resumen AS
             SELECT COUNT(*) AS total_memorias,
                    SUM(CASE WHEN consolidada = 1 THEN 1 ELSE 0 END) AS consolidadas,
                    AVG(fuerza) AS fuerza_promedio,
                    AVG(importancia) AS importancia_promedio
             FROM memoria_episodica`,

            `CREATE VIEW IF NOT EXISTS vista_personalidad_actual AS
             SELECT timestamp, apertura, conciencia, extraversion, amabilidad, neuroticismo,
                    (apertura + conciencia + extraversion + amabilidad + (1 - neuroticismo)) / 5 AS salud
             FROM personalidad_rasgos
             ORDER BY timestamp DESC LIMIT 1`
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
                INSERT INTO analisis_anomalias (timestamp, variable, valor, esperado, desviacion, gravedad)
                VALUES (NEW.timestamp, 'miedo', NEW.miedo, 20, NEW.miedo - 20,
                        CASE WHEN NEW.miedo > 85 THEN 0.9 ELSE 0.5 END);
             END`,

            `CREATE TRIGGER IF NOT EXISTS trigger_consolidar_memoria
             AFTER INSERT ON memoria_trabajo
             WHEN NEW.fuerza > 0.7
             BEGIN
                INSERT INTO memoria_episodica
                    (timestamp, contenido, contexto, fuerza, importancia, emocion_asociada, consolidada)
                VALUES
                    (NEW.timestamp, NEW.contenido, 'consolidado_auto', NEW.fuerza, 0.6, 'neutral', 1);
             END`
        ];

        for (const t of triggers) {
            try { await this.db.exec(t); }
            catch (err) { console.warn('⚠️ Trigger:', err.message); }
        }
    }

    /**
     * Migración: recrea triggers que cambiaron de lógica.
     * Ejecuta DROP + CREATE para asegurar la versión correcta en BDs existentes.
     */
    async migrateTriggers() {
        try {
            await this.db.exec('DROP TRIGGER IF EXISTS trigger_evolucion_personalidad');
            await this.db.exec(`
                CREATE TRIGGER trigger_evolucion_personalidad
                AFTER UPDATE ON personalidad_rasgos
                WHEN ABS(NEW.apertura - OLD.apertura) > 0.005
                   OR ABS(NEW.conciencia - OLD.conciencia) > 0.005
                   OR ABS(NEW.extraversion - OLD.extraversion) > 0.005
                   OR ABS(NEW.amabilidad - OLD.amabilidad) > 0.005
                   OR ABS(NEW.neuroticismo - OLD.neuroticismo) > 0.005
                BEGIN
                    INSERT INTO personalidad_evolucion (timestamp, rasgo, valor_anterior, valor_nuevo, delta, causa)
                    VALUES
                        (NEW.timestamp, 'apertura', OLD.apertura, NEW.apertura, NEW.apertura - OLD.apertura, 'cambio_natural'),
                        (NEW.timestamp, 'conciencia', OLD.conciencia, NEW.conciencia, NEW.conciencia - OLD.conciencia, 'cambio_natural'),
                        (NEW.timestamp, 'extraversion', OLD.extraversion, NEW.extraversion, NEW.extraversion - OLD.extraversion, 'cambio_natural'),
                        (NEW.timestamp, 'amabilidad', OLD.amabilidad, NEW.amabilidad, NEW.amabilidad - OLD.amabilidad, 'cambio_natural'),
                        (NEW.timestamp, 'neuroticismo', OLD.neuroticismo, NEW.neuroticismo, NEW.neuroticismo - OLD.neuroticismo, 'cambio_natural');
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
        if (!raw || typeof raw.aggregate !== 'function') return;

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
    }

    // ============================================================
    // DATOS INICIALES
    // ============================================================

    async initializeData() {
        const count = await this.db.get('SELECT COUNT(*) AS c FROM sistema_estados');
        if (count.c === 0) {
            await this.saveState('sistema_estados', {
                estabilidad: 0.8,
                rendimiento: 0.7,
                nivel_consciencia: 0.1,
                integridad: 0.9,
                emergencia: 0,
                datos: JSON.stringify({ initialized: true, version: '4.0.0' })
            });

            const umbrales = [
                { v: 'oxigeno', min: 70, max: 100, cri: 30, adv: 50 },
                { v: 'energia', min: 40, max: 100, cri: 15, adv: 25 },
                { v: 'cortisol', min: 0, max: 40, cri: 80, adv: 60 },
                { v: 'toxicidad', min: 0, max: 20, cri: 70, adv: 50 },
                { v: 'estabilidad', min: 0.6, max: 1.0, cri: 0.3, adv: 0.5 },
                { v: 'frecuencia_cardiaca', min: 60, max: 100, cri: 150, adv: 120 }
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
                { k: 'consciousness_update_interval', v: '10', t: 'integer', d: 'Intervalo de actualización de consciencia' },
                { k: 'neuroplasticity_rate', v: '0.15', t: 'float', d: 'Tasa de neuroplasticidad' },
                { k: 'learning_rate', v: '0.12', t: 'float', d: 'Tasa de aprendizaje' },
                { k: 'debug_mode', v: 'false', t: 'boolean', d: 'Modo debug' }
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
    // COLUMNAS: whitelist con cache
    // ============================================================

    async _getTableColumns(table) {
        if (this._columnCache.has(table)) return this._columnCache.get(table);
        // Validar nombre de tabla contra caracteres seguros (defensa adicional)
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
            throw new Error(`Nombre de tabla inválido: ${table}`);
        }
        const cols = await this.db.all(`PRAGMA table_info(${table})`);
        const names = cols.map(c => c.name);
        this._columnCache.set(table, names);
        return names;
    }

    // ============================================================
    // SAVE STATE GENÉRICO (con whitelist de columnas)
    // ============================================================

    async saveState(table, data) {
        const timestamp = data.timestamp || Date.now();
        const payload = { ...data, timestamp };

        const validColumns = await this._getTableColumns(table);
        if (!validColumns.length) {
            throw new Error(`Tabla desconocida o sin columnas: ${table}`);
        }

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
            this.metrics.queries++;
            const dt = Date.now() - startTime;
            this.metrics.avgQueryTime = this.metrics.avgQueryTime * 0.9 + dt * 0.1;
            return result;
        } catch (error) {
            console.error(`❌ Error guardando en ${table}:`, error.message);
            throw error;
        }
    }

    // ============================================================
    // MÉTODOS DE GUARDADO ESPECÍFICOS
    // ============================================================

    async saveMemory(memory) {
        const query = `
            INSERT INTO memoria_episodica
                (timestamp, contenido, contexto, fuerza, importancia,
                 emocion_asociada, consolidada, accesos, ultimo_acceso)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const now = Date.now();
        const result = await this.db.run(query, [
            now,
            memory.contenido || '',
            memory.contexto || '',
            memory.fuerza ?? 0.5,
            memory.importancia ?? 0.5,
            memory.emocion_asociada || 'neutral',
            memory.consolidada ? 1 : 0,
            0,
            now
        ]);
        this.cache.delete('memories');
        return result;
    }

    async saveEmotionalState(state) {
        return this.saveState('emociones_estados', {
            alegria: state.alegria ?? 20,
            tristeza: state.tristeza ?? 10,
            miedo: state.miedo ?? 5,
            ira: state.ira ?? 5,
            asco: state.asco ?? 3,
            sorpresa: state.sorpresa ?? 8,
            confianza: state.confianza ?? 50,
            verguenza: state.verguenza ?? 5,
            orgullo: state.orgullo ?? 15,
            culpa: state.culpa ?? 5,
            envidia: state.envidia ?? 3,
            gratitud: state.gratitud ?? 20,
            esperanza: state.esperanza ?? 30,
            aceptacion: state.aceptacion ?? 40,
            frustracion: state.frustracion ?? 20,
            nostalgia: state.nostalgia ?? 15,
            conexion: state.conexion ?? 45,
            soledad: state.soledad ?? 10,
            ansiedad: state.ansiedad ?? 20,
            bienestar: state.bienestar ?? 65,
            depresion: state.depresion ?? 10,
            euforia: state.euforia ?? 5
        });
    }

    async saveBiochemicalState(state) {
        await this.saveState('bioquimica_estados', {
            oxigeno: state.oxigeno ?? 0,
            energia: state.energia ?? 0,
            toxicidad: state.toxicidad ?? 0,
            temperatura: state.temperatura ?? 37,
            ph: state.ph ?? 7.4,
            glucosa: state.glucosa ?? 80,
            lactato: state.lactato ?? 10,
            creatinina: state.creatinina ?? 1,
            urea: state.urea ?? 20,
            estado_hidratacion: state.estadoHidratacion ?? 80,
            dioxido_carbono: state.dioxidoCarbono ?? 0,
            monoxido_carbono: state.monoxidoCarbono ?? 0,
            oxido_nitrico: state.oxidoNitrico ?? 5,
            recuperacion: state.recuperacion ?? 75,
            fatiga_acumulada: state.fatigaAcumulada ?? 0
        });

        await this.saveState('bioquimica_neurotransmisores', {
            dopamina: state.dopamina ?? 50,
            serotonina: state.serotonina ?? 50,
            noradrenalina: state.noradrenalina ?? 50,
            cortisol: state.cortisol ?? 20,
            oxitocina: state.oxitocina ?? 30,
            gaba: state.gaba ?? 50,
            glutamato: state.glutamato ?? 50,
            endorfinas: state.endorfinas ?? 30,
            acetilcolina: state.acetilcolina ?? 50,
            adrenalina: state.adrenalina ?? 10,
            histamina: state.histamina ?? 20,
            melatonina: state.melatonina ?? 20
        });

        await this.saveState('bioquimica_signos_vitales', {
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
            atencion: state.atencion ?? 0,
            concentracion: state.concentracion ?? 0,
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
            insight: state.insight ?? 0,
            fluidez: state.fluidez ?? 0,
            carga: state.carga ?? 0,
            fatiga: state.fatiga ?? 0,
            estres: state.estres ?? 0,
            autoconciencia: state.autoconciencia ?? 0,
            monitoreo: state.monitoreo ?? 0,
            regulacion: state.regulacion ?? 0,
            aprendizaje: state.aprendizaje ?? 0
        });
    }

    async savePersonality(traits) {
        const now = Date.now();
        const existing = await this.db.get(
            'SELECT id FROM personalidad_rasgos ORDER BY timestamp DESC LIMIT 1'
        );

        const data = {
            apertura: traits.openness ?? 0.5,
            conciencia: traits.conscientiousness ?? 0.5,
            extraversion: traits.extraversion ?? 0.5,
            amabilidad: traits.agreeableness ?? 0.5,
            neuroticismo: traits.neuroticism ?? 0.5
        };

        if (existing) {
            await this.db.run(
                `UPDATE personalidad_rasgos
                 SET timestamp = ?, apertura = ?, conciencia = ?, extraversion = ?, amabilidad = ?, neuroticismo = ?
                 WHERE id = ?`,
                [now, data.apertura, data.conciencia, data.extraversion, data.amabilidad, data.neuroticismo, existing.id]
            );
            return { changes: 1, lastID: existing.id };
        } else {
            return this.saveState('personalidad_rasgos', data);
        }
    }

    async saveMotivationState(state) {
        return this.saveState('motivacion_estados', {
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
                (timestamp, decision, opciones, contexto, confianza,
                 tiempo_procesamiento, emocion_dominante, resultado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        return this.db.run(query, [
            Date.now(),
            typeof decision.decision === 'object' ? JSON.stringify(decision.decision) : String(decision.decision || ''),
            JSON.stringify(decision.opciones || []),
            JSON.stringify(decision.contexto || {}),
            decision.confianza ?? decision.confidence ?? 0.5,
            decision.tiempo_procesamiento ?? decision.processingTime ?? 0,
            decision.emocion_dominante || decision.emocion || 'neutral',
            decision.resultado || 'pendiente'
        ]);
    }

    async saveThought(thought) {
        const query = `
            INSERT INTO cognitivo_pensamientos
                (timestamp, contenido, tipo, intensidad, emocion_asociada, nivel_consciencia)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        return this.db.run(query, [
            Date.now(),
            thought.contenido || '',
            thought.tipo || 'consciente',
            thought.intensidad ?? 0.5,
            thought.emocion_asociada || 'neutral',
            thought.nivel_consciencia ?? 0.5
        ]);
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
            estado: state.estado || 'despierto',
            presion_sueno: state.presionSueño ?? 0,
            deuda_sueno: state.deudaSueño ?? 0,
            profundidad: state.profundidad ?? 0,
            calidad_sueno: state.calidadSueño ?? 0.8,
            eficiencia_sueno: state.eficienciaSueño ?? 0.7,
            tiempo_dormido: state.tiempoDormido ?? 0,
            ciclos_completos: state.ciclosCompletos ?? 0,
            despertares: state.despertares ?? 0
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
                    skill.nivel ?? 0,
                    skill.practicas ?? 0,
                    skill.eficiencia ?? 0.5,
                    skill.importancia ?? 0.5,
                    now,
                    existing.id
                ]
            );
        } else {
            await this.db.run(
                `INSERT INTO memoria_procedural
                    (habilidad, nivel, practicas, eficiencia, complejidad, importancia, ultima_practica)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    skill.habilidad || skill.nombre || 'desconocida',
                    skill.nivel ?? 0,
                    skill.practicas ?? 0,
                    skill.eficiencia ?? 0.5,
                    skill.complejidad ?? 5,
                    skill.importancia ?? 0.5,
                    now
                ]
            );
        }
    }

    async saveMotorAction(action) {
        return this.db.run(
            `INSERT INTO motor_acciones
                (timestamp, tipo, duracion, exito, calidad, probabilidad, es_reflejo)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                Date.now(),
                action.tipo || 'desconocida',
                action.duracion ?? 0,
                action.exito ? 1 : 0,
                action.calidad ?? 0.7,
                action.probabilidad ?? 0.7,
                action.esReflejo ? 1 : 0
            ]
        );
    }

    async saveLearningEvent(event) {
        return this.db.run(
            `INSERT INTO cognitivo_aprendizaje
                (timestamp, habilidad, nivel_anterior, nivel_nuevo, ganancia, metodo, exito)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                Date.now(),
                event.habilidad || 'general',
                event.nivel_anterior ?? 0,
                event.nivel_nuevo ?? 0,
                event.ganancia ?? 0,
                event.metodo || 'interacción',
                event.exito === false ? 0 : 1
            ]
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
        const data = await this.db.all(`SELECT * FROM ${table} ORDER BY timestamp DESC LIMIT ?`, limit);
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
        return this.db.all(
            `SELECT *,
                    (CASE WHEN contenido LIKE ? THEN 1.0 ELSE 0.5 END) AS relevancia
             FROM memoria_episodica
             WHERE contenido LIKE ?
             ORDER BY relevancia DESC, importancia DESC, fuerza DESC
             LIMIT ?`,
            [`%${query}%`, `%${query}%`, limit]
        );
    }

    async getEmotionalHistory(limit = 100) {
        return this.db.all(
            `SELECT * FROM emociones_estados ORDER BY timestamp DESC LIMIT ?`,
            limit
        );
    }

    async getDecisionHistory(limit = 50) {
        return this.db.all(
            `SELECT * FROM cognitivo_decisiones ORDER BY timestamp DESC LIMIT ?`,
            limit
        );
    }

    async getThoughtHistory(limit = 50) {
        return this.db.all(
            `SELECT * FROM cognitivo_pensamientos ORDER BY timestamp DESC LIMIT ?`,
            limit
        );
    }

    async getRecentThoughts(limit = 10) { return this.getThoughtHistory(limit); }
    async getRecentDecisions(limit = 10) { return this.getDecisionHistory(limit); }

    async getRecentMemories(limit = 10) {
        return this.db.all(
            `SELECT * FROM memoria_episodica ORDER BY timestamp DESC LIMIT ?`,
            limit
        );
    }

    async getSleepHistory(limit = 100) {
        return this.db.all(
            `SELECT * FROM sueno_estados ORDER BY timestamp DESC LIMIT ?`,
            limit
        );
    }

    async getMotorSkills() {
        return this.db.all(`SELECT * FROM motor_habilidades ORDER BY nivel DESC`);
    }

    async getSocialConnections() {
        return this.db.all(`SELECT * FROM social_relaciones ORDER BY conexion DESC`);
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

        try {
            const learning = await this.db.all(
                `SELECT timestamp, habilidad, nivel_anterior, nivel_nuevo, ganancia, metodo, exito
                 FROM cognitivo_aprendizaje
                 ORDER BY timestamp DESC LIMIT ?`, [limit]
            );
            learning.forEach(l => {
                events.push({
                    kind: 'skill',
                    timestamp: l.timestamp,
                    icon: l.exito ? '📚' : '⚠️',
                    title: `Aprendizaje: ${l.habilidad} (${Math.round(l.nivel_anterior)}→${Math.round(l.nivel_nuevo)})`,
                    meta: `método: ${l.metodo || 'interacción'}, ganancia: ${(l.ganancia || 0).toFixed(2)}`
                });
            });
        } catch (_) { /* noop */ }

        try {
            const memories = await this.db.all(
                `SELECT timestamp, contenido, emocion_asociada, fuerza, importancia
                 FROM memoria_episodica
                 WHERE consolidada = 1
                 ORDER BY timestamp DESC LIMIT ?`, [limit]
            );
            memories.forEach(m => {
                events.push({
                    kind: 'memory',
                    timestamp: m.timestamp,
                    icon: '💾',
                    title: `Memoria consolidada: ${(m.contenido || '').substring(0, 60)}`,
                    meta: `emoción: ${m.emocion_asociada || 'neutral'}, fuerza: ${(m.fuerza || 0).toFixed(2)}`
                });
            });
        } catch (_) { /* noop */ }

        try {
            const evol = await this.db.all(
                `SELECT timestamp, rasgo, valor_anterior, valor_nuevo, delta
                 FROM personalidad_evolucion
                 ORDER BY timestamp DESC LIMIT ?`, [Math.floor(limit / 2)]
            );
            evol.forEach(e => {
                if (Math.abs(e.delta || 0) < 0.01) return;
                events.push({
                    kind: 'personality',
                    timestamp: e.timestamp,
                    icon: e.delta > 0 ? '🧬' : '🔻',
                    title: `Rasgo "${e.rasgo}" ${e.delta > 0 ? 'aumentó' : 'disminuyó'} (${(e.valor_anterior || 0).toFixed(2)}→${(e.valor_nuevo || 0).toFixed(2)})`,
                    meta: `delta: ${(e.delta || 0).toFixed(3)}`
                });
            });
        } catch (_) { /* noop */ }

        try {
            const patrones = await this.db.all(
                `SELECT timestamp, tipo, patron, confianza
                 FROM patrones_detectados
                 ORDER BY timestamp DESC LIMIT ?`, [Math.floor(limit / 2)]
            );
            patrones.forEach(p => {
                events.push({
                    kind: 'pattern',
                    timestamp: p.timestamp,
                    icon: '🔍',
                    title: `Patrón detectado: ${p.patron} (${p.tipo})`,
                    meta: `confianza: ${(p.confianza || 0).toFixed(2)}`
                });
            });
        } catch (_) { /* noop */ }

        events.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        return events.slice(0, limit);
    }

    // ============================================================
    // ANÁLISIS Y TENDENCIAS
    // ============================================================

    async getEmotionalTrends(period = 'day') {
        const periodMap = { hour: 3600000, day: 86400000, week: 604800000, month: 2592000000 };
        const interval = periodMap[period] || 86400000;
        const since = Date.now() - interval;

        return this.db.all(
            `SELECT timestamp, alegria, tristeza, miedo, ira, confianza, ansiedad, bienestar,
                    (alegria + confianza) AS emociones_positivas,
                    (tristeza + miedo + ira + ansiedad) AS emociones_negativas,
                    CASE WHEN (alegria + confianza) > (tristeza + miedo + ira + ansiedad)
                         THEN 'positivo' ELSE 'negativo' END AS tendencia_emocional
             FROM emociones_estados
             WHERE timestamp > ?
             ORDER BY timestamp ASC`,
            since
        );
    }

    async getCognitivePerformance() {
        return this.db.all(
            `SELECT timestamp, atencion, concentracion, razonamiento, toma_decisiones,
                    (atencion + concentracion + razonamiento + toma_decisiones) / 4 AS rendimiento_cognitivo,
                    fatiga, carga,
                    CASE WHEN (atencion + concentracion + razonamiento) / 3 > 70 THEN 'alto'
                         WHEN (atencion + concentracion + razonamiento) / 3 > 50 THEN 'medio'
                         ELSE 'bajo' END AS nivel_cognitivo
             FROM cognitivo_estados
             ORDER BY timestamp DESC LIMIT 100`
        );
    }

    async getPersonalityEvolution() {
        return this.db.all(
            `SELECT timestamp, apertura, conciencia, extraversion, amabilidad, neuroticismo,
                    (apertura + conciencia + extraversion + amabilidad + (1 - neuroticismo)) / 5 AS salud_personalidad
             FROM personalidad_rasgos
             ORDER BY timestamp ASC`
        );
    }

    async getSystemHealthReport() {
        const last = await this.db.get(
            `SELECT timestamp FROM sistema_estados ORDER BY timestamp DESC LIMIT 1`
        );
        if (!last) return null;

        return this.db.get(
            `SELECT s.estabilidad, s.rendimiento, s.nivel_consciencia,
                    e.bienestar, e.ansiedad,
                    b.oxigeno, b.energia,
                    n.cortisol,
                    c.atencion, c.carga,
                    p.apertura, p.conciencia,
                    (s.estabilidad + s.rendimiento + s.nivel_consciencia + COALESCE(e.bienestar, 50) / 100) / 4 AS salud_general,
                    CASE
                        WHEN s.estabilidad > 0.7 AND COALESCE(e.bienestar, 0) > 50 THEN 'EXCELENTE'
                        WHEN s.estabilidad > 0.5 AND COALESCE(e.bienestar, 0) > 30 THEN 'BUENO'
                        WHEN s.estabilidad > 0.3 AND COALESCE(e.bienestar, 0) > 20 THEN 'REGULAR'
                        ELSE 'CRÍTICO'
                    END AS estado_general
             FROM sistema_estados s
             LEFT JOIN emociones_estados e ON s.timestamp = e.timestamp
             LEFT JOIN bioquimica_estados b ON s.timestamp = b.timestamp
             LEFT JOIN bioquimica_neurotransmisores n ON s.timestamp = n.timestamp
             LEFT JOIN cognitivo_estados c ON s.timestamp = c.timestamp
             LEFT JOIN personalidad_rasgos p ON s.timestamp = p.timestamp
             ORDER BY s.timestamp DESC LIMIT 1`
        );
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
                    MAX(timestamp) AS ultima_deteccion,
                    MIN(timestamp) AS primera_deteccion
             FROM patrones_detectados
             GROUP BY tipo
             ORDER BY frecuencia DESC`
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
        return {
            totalStates: (await this.db.get('SELECT COUNT(*) AS c FROM sistema_estados')).c,
            totalEmotions: (await this.db.get('SELECT COUNT(*) AS c FROM emociones_estados')).c,
            totalMemories: (await this.db.get('SELECT COUNT(*) AS c FROM memoria_episodica')).c,
            totalDecisions: (await this.db.get('SELECT COUNT(*) AS c FROM cognitivo_decisiones')).c,
            totalThoughts: (await this.db.get('SELECT COUNT(*) AS c FROM cognitivo_pensamientos')).c,
            totalSkills: (await this.db.get('SELECT COUNT(*) AS c FROM memoria_procedural')).c
        };
    }

    async analyzeTrends(variable, period = 'hour') {
        const periodMap = { hour: 3600000, day: 86400000, week: 604800000, month: 2592000000 };
        const interval = periodMap[period] || 86400000;
        const since = Date.now() - interval;

        const tableMap = {
            oxigeno: 'bioquimica_estados',
            energia: 'bioquimica_estados',
            toxicidad: 'bioquimica_estados',
            temperatura: 'bioquimica_estados',
            glucosa: 'bioquimica_estados',
            alegria: 'emociones_estados',
            tristeza: 'emociones_estados',
            miedo: 'emociones_estados',
            ira: 'emociones_estados',
            ansiedad: 'emociones_estados',
            bienestar: 'emociones_estados',
            atencion: 'cognitivo_estados',
            concentracion: 'cognitivo_estados',
            estabilidad: 'sistema_estados',
            nivel_consciencia: 'sistema_estados'
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
             ORDER BY timestamp ASC`,
            since
        );
    }

    async findCorrelations(v1, v2, period = 'day') {
        const periodMap = { day: 86400000, week: 604800000, month: 2592000000 };
        const interval = periodMap[period] || 86400000;
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

        try {
            const result = await this.db.get(
                `SELECT CORR(a.${pair.c1}, b.${pair.c2}) AS correlacion,
                        COUNT(*) AS muestras,
                        AVG(a.${pair.c1}) AS media_v1,
                        AVG(b.${pair.c2}) AS media_v2
                 FROM ${pair.t1} a
                 JOIN ${pair.t2} b ON a.timestamp = b.timestamp
                 WHERE a.timestamp > ?`,
                since
            );
            return result || { correlacion: 0, muestras: 0 };
        } catch (err) {
            return this._findCorrelationJS(pair, since);
        }
    }

    async _findCorrelationJS(pair, since) {
        try {
            const rows = await this.db.all(
                `SELECT a.${pair.c1} AS x, b.${pair.c2} AS y
                 FROM ${pair.t1} a
                 JOIN ${pair.t2} b ON a.timestamp = b.timestamp
                 WHERE a.timestamp > ?`,
                since
            );
            if (rows.length < 2) return { correlacion: 0, muestras: rows.length };

            const n = rows.length;
            let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
            for (const r of rows) {
                const x = r.x || 0, y = r.y || 0;
                sumX += x; sumY += y; sumXY += x * y;
                sumX2 += x * x; sumY2 += y * y;
            }
            const num = n * sumXY - sumX * sumY;
            const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
            const correlacion = den === 0 ? 0 : num / den;
            return {
                correlacion,
                muestras: n,
                media_v1: sumX / n,
                media_v2: sumY / n
            };
        } catch (err) {
            return { correlacion: 0, muestras: 0, error: err.message };
        }
    }

    async detectAnomalies(threshold = 2.5) {
        const since = Date.now() - 86400000 * 7;
        try {
            return await this.db.all(
                `WITH stats AS (
                    SELECT variable, AVG(valor) AS media, STDDEV(valor) AS desviacion
                    FROM analisis_anomalias
                    GROUP BY variable
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
                 ORDER BY a.timestamp DESC`,
                [threshold, since]
            );
        } catch (err) {
            return this.db.all(
                `SELECT * FROM analisis_anomalias WHERE timestamp > ? ORDER BY timestamp DESC`,
                since
            );
        }
    }

    async predictFuture(variable, horizon = 10) {
        const tableMap = {
            oxigeno: 'bioquimica_estados',
            energia: 'bioquimica_estados',
            alegria: 'emociones_estados',
            tristeza: 'emociones_estados',
            miedo: 'emociones_estados',
            confianza: 'emociones_estados',
            atencion: 'cognitivo_estados',
            razonamiento: 'cognitivo_estados'
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
            const x = i + 1;
            const y = r.v || 0;
            sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x;
        });
        const pendiente = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
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
             FROM cognitivo_decisiones
             GROUP BY decision
             ORDER BY frecuencia DESC LIMIT 20`
        );
    }

    async getThoughtPatterns() {
        return this.db.all(
            `SELECT tipo, COUNT(*) AS frecuencia,
                    AVG(intensidad) AS intensidad_promedio,
                    AVG(nivel_consciencia) AS consciencia_promedio
             FROM cognitivo_pensamientos
             GROUP BY tipo
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
             FROM motor_habilidades
             ORDER BY mastery DESC`
        );
    }

    async getSocialNetwork() {
        return this.db.all(
            `SELECT entidad, tipo_relacion, confianza, conexion, interacciones,
                    CASE
                        WHEN confianza > 70 AND conexion > 70 THEN 'fuerte'
                        WHEN confianza > 50 AND conexion > 50 THEN 'media'
                        ELSE 'débil'
                    END AS calidad_relacion
             FROM social_relaciones
             ORDER BY conexion DESC`
        );
    }

    async getSleepAnalysis() {
        return this.db.all(
            `SELECT estado, COUNT(*) AS frecuencia,
                    AVG(presion_sueno) AS presion_promedio,
                    AVG(profundidad) AS profundidad_promedio,
                    AVG(calidad_sueno) AS calidad_promedio
             FROM sueno_estados
             GROUP BY estado
             ORDER BY frecuencia DESC`
        );
    }

    async getNeurotransmitterBalance() {
        return this.db.get(
            `SELECT AVG(dopamina) AS dopamina,
                    AVG(serotonina) AS serotonina,
                    AVG(noradrenalina) AS noradrenalina,
                    AVG(cortisol) AS cortisol,
                    AVG(oxitocina) AS oxitocina,
                    AVG(gaba) AS gaba,
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
                    MIN(estabilidad) AS estabilidad_min
             FROM sistema_estados`
        );
    }

    async getEmotionalRegulation() {
        return this.db.all(
            `SELECT estrategia, COUNT(*) AS usos,
                    AVG(efectividad) AS efectividad_promedio
             FROM emociones_regulacion
             GROUP BY estrategia
             ORDER BY usos DESC`
        );
    }

    async getPatternCorrelations() {
        return this.db.all(
            `SELECT p1.patron AS patron_1, p2.patron AS patron_2,
                    COUNT(*) AS co_ocurrencias
             FROM patrones_detectados p1
             JOIN patrones_detectados p2
                ON ABS(p1.timestamp - p2.timestamp) < 60000 AND p1.id < p2.id
             GROUP BY p1.patron, p2.patron
             HAVING co_ocurrencias > 1
             ORDER BY co_ocurrencias DESC LIMIT 20`
        );
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
             FROM cognitivo_estados
             ORDER BY timestamp DESC LIMIT 100`
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
        const data = {
            timestamp: Date.now(),
            version: '4.0.0',
            tables: {}
        };

        const tables = await this.db.all(
            `SELECT name FROM sqlite_master
             WHERE type='table'
             AND name NOT LIKE 'sqlite_%'
             AND name NOT LIKE 'temporal_%'`
        );

        for (const t of tables) {
            try {
                const cols = await this.db.all(`PRAGMA table_info(${t.name})`);
                const hasTimestamp = cols.some(c => c.name === 'timestamp');
                const query = hasTimestamp
                    ? `SELECT * FROM ${t.name} ORDER BY timestamp DESC LIMIT ?`
                    : `SELECT * FROM ${t.name} LIMIT ?`;
                data.tables[t.name] = await this.db.all(query, limit);
            } catch (err) {
                data.tables[t.name] = { error: err.message };
            }
        }
        return data;
    }

    async importFromJSON(data) {
        if (!data || !data.tables) return;
        const tables = Object.keys(data.tables);
        for (const table of tables) {
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) continue;
            const rows = data.tables[table];
            if (!Array.isArray(rows) || rows.length === 0) continue;
            const validColumns = await this._getTableColumns(table);
            if (!validColumns.length) continue;

            for (const row of rows) {
                const columns = Object.keys(row).filter(c => validColumns.includes(c));
                if (columns.length === 0) continue;
                const placeholders = columns.map(() => '?').join(',');
                const values = columns.map(c => row[c]);
                try {
                    await this.db.run(
                        `INSERT OR IGNORE INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`,
                        values
                    );
                } catch (_) { /* conflicto, ignorar */ }
            }
        }
        console.log(`✅ Importadas ${tables.length} tablas`);
    }

    // ============================================================
    // MANTENIMIENTO
    // ============================================================

    async optimize() {
        const tables = await this.db.all(
            `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
        );
        for (const t of tables) {
            try { await this.db.exec(`ANALYZE ${t.name}`); } catch (_) { /* noop */ }
        }
        await this.db.exec('REINDEX');
        await this.db.exec('VACUUM');
        this.cache.clear();
        this._columnCache.clear();
        console.log('✅ Optimización completada');
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
            size: sizeRow?.size || 0,
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
            connections: { count: await count('redes_sinapticas') }
        };
    }

    async cleanup() {
        const thirtyDaysAgo = Date.now() - 30 * 86400000;
        const tables = [
            'sistema_estados', 'sistema_metricas', 'sistema_eventos',
            'bioquimica_estados', 'bioquimica_neurotransmisores',
            'bioquimica_hormonas', 'bioquimica_signos_vitales',
            'emociones_estados', 'emociones_dimensiones', 'emociones_historico',
            'cognitivo_estados', 'cognitivo_procesos', 'cognitivo_pensamientos',
            'motor_estados', 'motor_acciones', 'social_interacciones'
        ];
        for (const t of tables) {
            try { await this.db.run(`DELETE FROM ${t} WHERE timestamp < ?`, thirtyDaysAgo); }
            catch (_) { /* noop */ }
        }
        await this.db.exec('VACUUM');
        this.cache.clear();
        console.log('🗄️ Limpieza completada');
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
            databaseSize: sizeRow?.size || 0,
            tableCount: await count('table'),
            viewCount: await count('view'),
            triggerCount: await count('trigger'),
            indexCount: await count('index')
        };
    }

    async close() {
        if (this.backupInterval) clearInterval(this.backupInterval);
        if (this.db) {
            try {
                // Checkpoint final antes de cerrar
                await this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
            } catch (_) { /* noop */ }
            try { await this.db.close(); } catch (_) { /* noop */ }
            this.isInitialized = false;
        }
    }
}
