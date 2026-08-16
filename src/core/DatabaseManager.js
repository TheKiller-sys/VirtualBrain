// src/core/DatabaseManager.js
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseManager {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.dbPath = path.join(__dirname, '../../database/cerebro.db');
        this.backupInterval = null;
        this.cache = new Map();
        this.cacheTimeout = 300000;
        this.poolSize = 10;
        this.connectionPool = [];
        this.transactionQueue = [];
        this.isTransactionActive = false;
        this.metrics = {
            queries: 0,
            cacheHits: 0,
            cacheMisses: 0,
            avgQueryTime: 0
        };
    }

    async initialize() {
        try {
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            this.db = await open({
                filename: this.dbPath,
                driver: sqlite3.Database
            });

            // Optimizaciones extremas
            await this.db.exec('PRAGMA journal_mode = WAL');
            await this.db.exec('PRAGMA synchronous = NORMAL');
            await this.db.exec('PRAGMA cache_size = -200000'); // 200MB
            await this.db.exec('PRAGMA temp_store = MEMORY');
            await this.db.exec('PRAGMA mmap_size = 30000000000');
            await this.db.exec('PRAGMA page_size = 32768');
            await this.db.exec('PRAGMA wal_autocheckpoint = 1000');
            await this.db.exec('PRAGMA foreign_keys = ON');

            await this.createAllTables();
            await this.createAllIndexes();
            await this.createAllViews();
            await this.createAllTriggers();
            await this.createAllFunctions();
            await this.initializeData();
            
            this.isInitialized = true;
            
            // Iniciar backup automático
            this.startAutoBackup();
            
            console.log('🗄️ Base de datos ultra avanzada inicializada');
            console.log(`📊 Tamaño de caché: 200MB, Page Size: 32KB`);
            return true;
        } catch (error) {
            console.error('❌ Error inicializando base de datos:', error);
            return false;
        }
    }

    startAutoBackup() {
        const interval = parseInt(process.env.DB_BACKUP_INTERVAL) || 3600000;
        this.backupInterval = setInterval(() => {
            this.createBackup();
        }, interval);
    }

    async createBackup() {
        try {
            const backupDir = path.join(__dirname, '../../database/backups');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(backupDir, `cerebro_${timestamp}.db`);
            
            await this.db.exec(`VACUUM INTO '${backupPath}'`);
            
            // Limpiar backups antiguos
            const backups = fs.readdirSync(backupDir)
                .filter(f => f.startsWith('cerebro_'))
                .sort();
            
            while (backups.length > 10) {
                const old = backups.shift();
                fs.unlinkSync(path.join(backupDir, old));
            }
            
            console.log(`💾 Backup creado: ${path.basename(backupPath)}`);
        } catch (error) {
            console.error('❌ Error creando backup:', error);
        }
    }

    // ============ CREACIÓN DE TABLAS ============

    async createAllTables() {
        // 1. Sistema
        await this.createSystemTables();
        // 2. Bioquímica
        await this.createBiochemicalTables();
        // 3. Emociones
        await this.createEmotionalTables();
        // 4. Cognición
        await this.createCognitiveTables();
        // 5. Memoria
        await this.createMemoryTables();
        // 6. Personalidad
        await this.createPersonalityTables();
        // 7. Motivación
        await this.createMotivationTables();
        // 8. Sueño
        await this.createSleepTables();
        // 9. Motor
        await this.createMotorTables();
        // 10. Social
        await this.createSocialTables();
        // 11. Patrones
        await this.createPatternTables();
        // 12. Análisis
        await this.createAnalysisTables();
        // 13. Redes
        await this.createNetworkTables();
        // 14. Temporales
        await this.createTemporalTables();
        // 15. Configuración
        await this.createConfigTables();
    }

    // ============ TABLAS DEL SISTEMA ============

    async createSystemTables() {
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS sistema_estados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                estabilidad REAL,
                rendimiento REAL,
                nivel_consciencia REAL,
                integridad REAL,
                emergencia INTEGER,
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
        `);
    }

    // ============ TABLAS BIOQUÍMICAS ============

    async createBiochemicalTables() {
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS bioquimica_estados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                oxigeno REAL,
                energia REAL,
                toxicidad REAL,
                temperatura REAL,
                ph REAL,
                glucosa REAL,
                lactato REAL,
                creatinina REAL,
                urea REAL,
                estado_hidratacion REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS bioquimica_neurotransmisores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                dopamina REAL,
                serotonina REAL,
                noradrenalina REAL,
                cortisol REAL,
                oxitocina REAL,
                gaba REAL,
                glutamato REAL,
                endorfinas REAL,
                acetilcolina REAL,
                adrenalina REAL,
                histamina REAL,
                melatonina REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS bioquimica_hormonas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                hormona_crecimiento REAL,
                testosterona REAL,
                estradiol REAL,
                insulina REAL,
                glucagon REAL,
                leptina REAL,
                grelina REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS bioquimica_signos_vitales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                frecuencia_cardiaca REAL,
                presion_sistolica REAL,
                presion_diastolica REAL,
                saturacion_oxigeno REAL,
                ritmo_respiratorio REAL,
                variabilidad_cardiaca REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS bioquimica_metabolitos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                monoxido_carbono REAL,
                oxido_nitrico REAL,
                dioxido_carbono REAL,
                creatina_quinasa REAL,
                troponina REAL,
                potasio REAL,
                sodio REAL,
                calcio REAL,
                magnesio REAL,
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
    }

    // ============ TABLAS EMOCIONALES ============

    async createEmotionalTables() {
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS emociones_estados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                alegria REAL,
                tristeza REAL,
                miedo REAL,
                ira REAL,
                asco REAL,
                sorpresa REAL,
                confianza REAL,
                verguenza REAL,
                orgullo REAL,
                culpa REAL,
                envidia REAL,
                gratitud REAL,
                esperanza REAL,
                aceptacion REAL,
                frustracion REAL,
                nostalgia REAL,
                conexion REAL,
                soledad REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS emociones_dimensiones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                valencia REAL,
                activacion REAL,
                dominio REAL,
                intensidad REAL,
                complejidad REAL,
                polaridad REAL,
                regulacion REAL,
                bienestar REAL,
                satisfaccion REAL,
                realizacion REAL,
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
                completado INTEGER,
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
    }

    // ============ TABLAS COGNITIVAS ============

    async createCognitiveTables() {
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS cognitivo_estados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                atencion REAL,
                concentracion REAL,
                memoria_trabajo REAL,
                velocidad_procesamiento REAL,
                razonamiento REAL,
                toma_decisiones REAL,
                planificacion REAL,
                flexibilidad REAL,
                inhibicion REAL,
                creatividad REAL,
                intuicion REAL,
                curiosidad REAL,
                insight REAL,
                fluidez REAL,
                carga REAL,
                fatiga REAL,
                estres REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS cognitivo_procesos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                proceso TEXT,
                capacidad REAL,
                carga REAL,
                eficiencia REAL,
                prioridad INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS cognitivo_metas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                tipo TEXT,
                descripcion TEXT,
                prioridad INTEGER,
                progreso REAL,
                completada INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS cognitivo_planes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                goal_id INTEGER,
                pasos TEXT,
                progreso REAL,
                completado INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS cognitivo_decisiones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                decision TEXT,
                opciones TEXT,
                contexto TEXT,
                confianza REAL,
                tiempo_procesamiento REAL,
                emocion_dominante TEXT,
                resultado TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS cognitivo_pensamientos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                contenido TEXT,
                tipo TEXT,
                intensidad REAL,
                emocion_asociada TEXT,
                nivel_consciencia REAL,
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
                exito INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
    }

    // ============ TABLAS DE MEMORIA ============

    async createMemoryTables() {
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS memoria_episodica (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                contenido TEXT,
                contexto TEXT,
                fuerza REAL,
                importancia REAL,
                emocion_asociada TEXT,
                consolidada INTEGER,
                accesos INTEGER,
                ultimo_acceso INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS memoria_semantica (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                concepto TEXT UNIQUE,
                significado TEXT,
                fuerza REAL,
                contextos INTEGER,
                ultima_actualizacion INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS memoria_procedural (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                habilidad TEXT UNIQUE,
                nivel REAL,
                practicas INTEGER,
                eficiencia REAL,
                complejidad REAL,
                importancia REAL,
                ultima_practica INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS memoria_trabajo (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                contenido TEXT,
                fuerza REAL,
                tipo TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS memoria_emocional (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                contenido TEXT,
                emocion TEXT,
                intensidad REAL,
                importancia REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS memoria_espacial (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ubicacion TEXT,
                coordenadas_x REAL,
                coordenadas_y REAL,
                coordenadas_z REAL,
                precision REAL,
                importancia REAL,
                ultimo_acceso INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS memoria_social (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entidad TEXT,
                relacion TEXT,
                confianza REAL,
                conexion REAL,
                interacciones INTEGER,
                ultima_interaccion INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS memoria_asociaciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                origen_id INTEGER,
                destino_id INTEGER,
                tipo_origen TEXT,
                tipo_destino TEXT,
                fuerza REAL,
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
    }

    // ============ TABLAS DE PERSONALIDAD ============

    async createPersonalityTables() {
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS personalidad_rasgos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                apertura REAL,
                conciencia REAL,
                extraversion REAL,
                amabilidad REAL,
                neuroticismo REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS personalidad_subrasgos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                curiosidad REAL,
                creatividad REAL,
                imaginacion REAL,
                disciplina REAL,
                organizacion REAL,
                responsabilidad REAL,
                sociabilidad REAL,
                asertividad REAL,
                energia REAL,
                empatia REAL,
                cooperacion REAL,
                confianza REAL,
                ansiedad REAL,
                vulnerabilidad REAL,
                inestabilidad REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS personalidad_estados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                estabilidad REAL,
                flexibilidad REAL,
                adaptabilidad REAL,
                integridad REAL,
                madurez REAL,
                sabiduria REAL,
                autenticidad REAL,
                bienestar REAL,
                satisfaccion REAL,
                proposito REAL,
                autoconocimiento REAL,
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
    }

    // ============ TABLAS DE MOTIVACIÓN ============

    async createMotivationTables() {
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS motivacion_impulsos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                hambre REAL,
                sed REAL,
                confort REAL,
                seguridad REAL,
                curiosidad REAL,
                logro REAL,
                afiliacion REAL,
                poder REAL,
                autonomia REAL,
                competencia REAL,
                estatus REAL,
                pertenencia REAL,
                reconocimiento REAL,
                contribucion REAL,
                exploracion REAL,
                significado REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS motivacion_estados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                intensidad REAL,
                satisfaccion REAL,
                urgencia REAL,
                persistencia REAL,
                flexibilidad REAL,
                impulso_actual TEXT,
                nivel_activacion REAL,
                foco_motivacional REAL,
                frustracion REAL,
                esperanza REAL,
                determinacion REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS motivacion_metas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                tipo TEXT,
                descripcion TEXT,
                impulso_asociado TEXT,
                prioridad INTEGER,
                progreso REAL,
                completada INTEGER,
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
    }

    // ============ TABLAS DE SUEÑO ============

    async createSleepTables() {
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS sueno_estados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                estado TEXT,
                presion_sueno REAL,
                deuda_sueno REAL,
                profundidad REAL,
                calidad_sueno REAL,
                eficiencia_sueno REAL,
                despertares INTEGER,
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
                intensidad REAL,
                vividness REAL,
                duracion REAL,
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
    }

    // ============ TABLAS MOTORAS ============

    async createMotorTables() {
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS motor_estados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER UNIQUE,
                coordinacion REAL,
                fuerza REAL,
                velocidad REAL,
                precision REAL,
                agilidad REAL,
                equilibrio REAL,
                resistencia REAL,
                fatiga REAL,
                recuperacion REAL,
                control_voluntario REAL,
                control_automatico REAL,
                fluidez REAL,
                tension REAL,
                relajacion REAL,
                estabilidad REAL,
                precision_fina REAL,
                fuerza_explosiva REAL,
                tiempo_reaccion REAL,
                propiocepcion REAL,
                reflejos REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS motor_habilidades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT UNIQUE,
                tipo TEXT,
                complejidad INTEGER,
                energia_requerida REAL,
                nivel REAL,
                practicas INTEGER,
                eficiencia REAL,
                mastery REAL,
                ultimo_uso INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS motor_acciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                tipo TEXT,
                duracion REAL,
                exito INTEGER,
                calidad REAL,
                probabilidad REAL,
                es_reflejo INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS motor_reflejos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT UNIQUE,
                trigger TEXT,
                respuesta TEXT,
                velocidad REAL,
                prioridad INTEGER,
                activo INTEGER,
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
    }

    // ============ TABLAS SOCIALES ============

    async createSocialTables() {
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
                confianza REAL,
                conexion REAL,
                interacciones INTEGER,
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
    }

    // ============ TABLAS DE PATRONES ============

    async createPatternTables() {
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
                confianza REAL,
                frecuencia INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
    }

    // ============ TABLAS DE ANÁLISIS ============

    async createAnalysisTables() {
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
    }

    // ============ TABLAS DE REDES NEURONALES ============

    async createNetworkTables() {
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS redes_neuronas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT,
                tipo TEXT,
                activacion REAL,
                umbral REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS redes_conexiones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                origen_id INTEGER,
                destino_id INTEGER,
                peso REAL,
                tipo TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS redes_sinapticas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                origen TEXT,
                destino TEXT,
                fuerza REAL,
                plasticidad REAL,
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
    }

    // ============ TABLAS TEMPORALES ============

    async createTemporalTables() {
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
        `);
    }

    // ============ TABLAS DE CONFIGURACIÓN ============

    async createConfigTables() {
        await this.db.exec(`
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

    // ============ CREACIÓN DE ÍNDICES ============

    async createAllIndexes() {
        const indexes = [
            // Sistema
            'CREATE INDEX IF NOT EXISTS idx_sistema_estados_timestamp ON sistema_estados(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_sistema_metricas_timestamp ON sistema_metricas(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_sistema_eventos_timestamp ON sistema_eventos(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_sistema_alertas_resuelta ON sistema_alertas(resuelta)',
            
            // Bioquímica
            'CREATE INDEX IF NOT EXISTS idx_bioquimica_estados_timestamp ON bioquimica_estados(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_bioquimica_neurotransmisores_timestamp ON bioquimica_neurotransmisores(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_bioquimica_hormonas_timestamp ON bioquimica_hormonas(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_bioquimica_signos_vitales_timestamp ON bioquimica_signos_vitales(timestamp)',
            
            // Emociones
            'CREATE INDEX IF NOT EXISTS idx_emociones_estados_timestamp ON emociones_estados(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_emociones_dimensiones_timestamp ON emociones_dimensiones(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_emociones_historico_emocion ON emociones_historico(emocion)',
            
            // Cognición
            'CREATE INDEX IF NOT EXISTS idx_cognitivo_estados_timestamp ON cognitivo_estados(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_cognitivo_decisiones_timestamp ON cognitivo_decisiones(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_cognitivo_pensamientos_timestamp ON cognitivo_pensamientos(timestamp)',
            
            // Memoria
            'CREATE INDEX IF NOT EXISTS idx_memoria_episodica_timestamp ON memoria_episodica(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_memoria_episodica_fuerza ON memoria_episodica(fuerza)',
            'CREATE INDEX IF NOT EXISTS idx_memoria_semantica_concepto ON memoria_semantica(concepto)',
            'CREATE INDEX IF NOT EXISTS idx_memoria_procedural_habilidad ON memoria_procedural(habilidad)',
            'CREATE INDEX IF NOT EXISTS idx_memoria_asociaciones_origen ON memoria_asociaciones(origen_id)',
            
            // Personalidad
            'CREATE INDEX IF NOT EXISTS idx_personalidad_rasgos_timestamp ON personalidad_rasgos(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_personalidad_evolucion_timestamp ON personalidad_evolucion(timestamp)',
            
            // Motivación
            'CREATE INDEX IF NOT EXISTS idx_motivacion_impulsos_timestamp ON motivacion_impulsos(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_motivacion_metas_completada ON motivacion_metas(completada)',
            
            // Sueño
            'CREATE INDEX IF NOT EXISTS idx_sueno_estados_timestamp ON sueno_estados(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_sueno_sueños_timestamp ON sueno_sueños(timestamp)',
            
            // Motor
            'CREATE INDEX IF NOT EXISTS idx_motor_estados_timestamp ON motor_estados(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_motor_habilidades_nombre ON motor_habilidades(nombre)',
            
            // Social
            'CREATE INDEX IF NOT EXISTS idx_social_interacciones_timestamp ON social_interacciones(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_social_relaciones_entidad ON social_relaciones(entidad)',
            
            // Patrones
            'CREATE INDEX IF NOT EXISTS idx_patrones_detectados_timestamp ON patrones_detectados(timestamp)',
            
            // Análisis
            'CREATE INDEX IF NOT EXISTS idx_analisis_tendencias_timestamp ON analisis_tendencias(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_analisis_anomalias_timestamp ON analisis_anomalias(timestamp)',
            
            // Redes
            'CREATE INDEX IF NOT EXISTS idx_redes_conexiones_origen ON redes_conexiones(origen_id)',
            'CREATE INDEX IF NOT EXISTS idx_redes_sinapticas_origen ON redes_sinapticas(origen)',
            
            // Temporal
            'CREATE INDEX IF NOT EXISTS idx_temporal_cache_clave ON temporal_cache(clave)',
            
            // Config
            'CREATE INDEX IF NOT EXISTS idx_config_parametros_clave ON config_parametros(clave)'
        ];

        for (const index of indexes) {
            try {
                await this.db.exec(index);
            } catch (error) {
                console.warn(`⚠️ Índice no creado: ${index}`, error.message);
            }
        }
        console.log(`📊 ${indexes.length} índices creados`);
    }

    // ============ CREACIÓN DE VISTAS ============

    async createAllViews() {
        const views = [
            // Vista de estado completo del sistema
            `CREATE VIEW IF NOT EXISTS vista_estado_completo AS
            SELECT 
                s.timestamp,
                s.estabilidad,
                s.rendimiento,
                s.nivel_consciencia,
                e.alegria,
                e.tristeza,
                e.miedo,
                e.ira,
                b.oxigeno,
                b.energia,
                b.cortisol,
                b.dopamina,
                c.atencion,
                c.razonamiento,
                c.toma_decisiones,
                p.apertura,
                p.conciencia,
                p.extraversion
            FROM sistema_estados s
            LEFT JOIN emociones_estados e ON s.timestamp = e.timestamp
            LEFT JOIN bioquimica_estados b ON s.timestamp = b.timestamp
            LEFT JOIN cognitivo_estados c ON s.timestamp = c.timestamp
            LEFT JOIN personalidad_rasgos p ON s.timestamp = p.timestamp`,

            // Vista de resumen emocional
            `CREATE VIEW IF NOT EXISTS vista_resumen_emocional AS
            SELECT 
                timestamp,
                alegria,
                tristeza,
                miedo,
                ira,
                (alegria + confianza) as emociones_positivas,
                (tristeza + miedo + ira) as emociones_negativas,
                (alegria + confianza) - (tristeza + miedo + ira) as balance_emocional
            FROM emociones_estados`,

            // Vista de tendencias cognitivas
            `CREATE VIEW IF NOT EXISTS vista_tendencias_cognitivas AS
            SELECT 
                timestamp,
                atencion,
                concentracion,
                (atencion + concentracion + memoria_trabajo) / 3 as capacidad_cognitiva,
                (creatividad + flexibilidad) / 2 as flexibilidad_cognitiva
            FROM cognitivo_estados`,

            // Vista de salud del sistema
            `CREATE VIEW IF NOT EXISTS vista_salud_sistema AS
            SELECT 
                s.timestamp,
                s.estabilidad,
                s.rendimiento,
                s.nivel_consciencia,
                (s.estabilidad + s.rendimiento + s.nivel_consciencia) / 3 as salud_general,
                CASE 
                    WHEN s.estabilidad > 0.7 AND s.rendimiento > 0.6 THEN 'Óptimo'
                    WHEN s.estabilidad > 0.5 AND s.rendimiento > 0.4 THEN 'Normal'
                    ELSE 'Crítico'
                END as estado_salud
            FROM sistema_estados s`,

            // Vista de memoria
            `CREATE VIEW IF NOT EXISTS vista_memoria_resumen AS
            SELECT 
                COUNT(*) as total_memorias,
                SUM(CASE WHEN consolidada = 1 THEN 1 ELSE 0 END) as memorias_consolidadas,
                AVG(fuerza) as fuerza_promedio,
                AVG(importancia) as importancia_promedio
            FROM memoria_episodica`,

            // Vista de personalidad actual
            `CREATE VIEW IF NOT EXISTS vista_personalidad_actual AS
            SELECT 
                timestamp,
                apertura,
                conciencia,
                extraversion,
                amabilidad,
                neuroticismo,
                (apertura + conciencia + extraversion + amabilidad + (1 - neuroticismo)) / 5 as personalidad_salud
            FROM personalidad_rasgos
            ORDER BY timestamp DESC
            LIMIT 1`,

            // Vista de motivación
            `CREATE VIEW IF NOT EXISTS vista_motivacion_actual AS
            SELECT 
                timestamp,
                intensidad,
                satisfaccion,
                urgencia,
                persistencia,
                impulso_actual,
                (intensidad + satisfaccion) / 2 as motivacion_general
            FROM motivacion_estados
            ORDER BY timestamp DESC
            LIMIT 1`
        ];

        for (const view of views) {
            try {
                await this.db.exec(view);
            } catch (error) {
                console.warn(`⚠️ Vista no creada: ${view.split(' ')[2]}`, error.message);
            }
        }
        console.log(`📊 ${views.length} vistas creadas`);
    }

    // ============ CREACIÓN DE TRIGGERS ============

    async createAllTriggers() {
        const triggers = [
            // Trigger para actualizar estadísticas automáticamente
            `CREATE TRIGGER IF NOT EXISTS trigger_actualizar_metricas
            AFTER INSERT ON sistema_estados
            BEGIN
                INSERT INTO sistema_metricas (
                    timestamp,
                    query_count,
                    cache_hits,
                    cache_misses,
                    active_connections
                )
                VALUES (
                    NEW.timestamp,
                    (SELECT COUNT(*) FROM sistema_eventos),
                    (SELECT cache_hits FROM sistema_metricas ORDER BY timestamp DESC LIMIT 1),
                    (SELECT cache_misses FROM sistema_metricas ORDER BY timestamp DESC LIMIT 1),
                    (SELECT active_connections FROM sistema_metricas ORDER BY timestamp DESC LIMIT 1)
                );
            END`,

            // Trigger para detectar anomalías emocionales
            `CREATE TRIGGER IF NOT EXISTS trigger_detectar_anomalia_emocional
            AFTER INSERT ON emociones_estados
            BEGIN
                INSERT INTO analisis_anomalias (timestamp, variable, valor, esperado, desviacion, gravedad)
                SELECT 
                    NEW.timestamp,
                    'miedo',
                    NEW.miedo,
                    (SELECT AVG(miedo) FROM emociones_estados WHERE timestamp < NEW.timestamp),
                    NEW.miedo - (SELECT AVG(miedo) FROM emociones_estados WHERE timestamp < NEW.timestamp),
                    CASE 
                        WHEN NEW.miedo > 80 THEN 0.8
                        WHEN NEW.miedo > 60 THEN 0.5
                        ELSE 0.2
                    END
                WHERE NEW.miedo > (SELECT AVG(miedo) * 1.5 FROM emociones_estados WHERE timestamp < NEW.timestamp);
            END`,

            // Trigger para consolidación automática de memoria
            `CREATE TRIGGER IF NOT EXISTS trigger_consolidar_memoria
            AFTER INSERT ON memoria_trabajo
            WHEN NEW.fuerza > 0.7
            BEGIN
                INSERT INTO memoria_episodica (timestamp, contenido, contexto, fuerza, importancia, emocion_asociada)
                VALUES (NEW.timestamp, NEW.contenido, 'consolidado_auto', NEW.fuerza, 0.6, '');
            END`,

            // Trigger para registro de evolución de personalidad
            `CREATE TRIGGER IF NOT EXISTS trigger_registrar_evolucion_personalidad
            AFTER UPDATE ON personalidad_rasgos
            BEGIN
                INSERT INTO personalidad_evolucion (timestamp, rasgo, valor_anterior, valor_nuevo, delta, causa)
                SELECT 
                    NEW.timestamp,
                    'apertura',
                    OLD.apertura,
                    NEW.apertura,
                    NEW.apertura - OLD.apertura,
                    'cambio_natural'
                WHERE NEW.apertura != OLD.apertura
                UNION ALL
                SELECT 
                    NEW.timestamp,
                    'conciencia',
                    OLD.conciencia,
                    NEW.conciencia,
                    NEW.conciencia - OLD.conciencia,
                    'cambio_natural'
                WHERE NEW.conciencia != OLD.conciencia
                UNION ALL
                SELECT 
                    NEW.timestamp,
                    'extraversion',
                    OLD.extraversion,
                    NEW.extraversion,
                    NEW.extraversion - OLD.extraversion,
                    'cambio_natural'
                WHERE NEW.extraversion != OLD.extraversion
                UNION ALL
                SELECT 
                    NEW.timestamp,
                    'amabilidad',
                    OLD.amabilidad,
                    NEW.amabilidad,
                    NEW.amabilidad - OLD.amabilidad,
                    'cambio_natural'
                WHERE NEW.amabilidad != OLD.amabilidad
                UNION ALL
                SELECT 
                    NEW.timestamp,
                    'neuroticismo',
                    OLD.neuroticismo,
                    NEW.neuroticismo,
                    NEW.neuroticismo - OLD.neuroticismo,
                    'cambio_natural'
                WHERE NEW.neuroticismo != OLD.neuroticismo;
            END`,

            // Trigger para actualizar estadísticas de sueño
            `CREATE TRIGGER IF NOT EXISTS trigger_actualizar_estadisticas_sueno
            AFTER INSERT ON sueno_estados
            BEGIN
                UPDATE sistema_metricas
                SET avg_response_time = (
                    SELECT AVG(duracion) 
                    FROM sueno_ciclos 
                    WHERE timestamp > NEW.timestamp - 86400000
                )
                WHERE timestamp = NEW.timestamp;
            END`
        ];

        for (const trigger of triggers) {
            try {
                await this.db.exec(trigger);
            } catch (error) {
                console.warn(`⚠️ Trigger no creado: ${trigger.split(' ')[2]}`, error.message);
            }
        }
        console.log(`📊 ${triggers.length} triggers creados`);
    }

    // ============ FUNCIONES PERSONALIZADAS ============

    async createAllFunctions() {
        // Funciones SQLite personalizadas
        this.db.function('calcular_estabilidad', (oxigeno, energia, cortisol, toxicidad) => {
            return (oxigeno / 100 * 0.3 + energia / 100 * 0.3 + (1 - cortisol / 100) * 0.2 + (1 - toxicidad / 100) * 0.2);
        });

        this.db.function('calcular_intensidad_emocional', (alegria, tristeza, miedo, ira) => {
            return (alegria + tristeza + miedo + ira) / 4;
        });

        this.db.function('calcular_salud_cognitiva', (atencion, concentracion, razonamiento) => {
            return (atencion + concentracion + razonamiento) / 3;
        });

        this.db.function('calcular_personalidad_salud', (openness, conscientiousness, extraversion, agreeableness, neuroticism) => {
            return (openness + conscientiousness + extraversion + agreeableness + (1 - neuroticism)) / 5;
        });

        this.db.function('calcular_distancia_euclidiana', (x1, y1, x2, y2) => {
            return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        });

        console.log('📊 Funciones personalizadas registradas');
    }

    // ============ INICIALIZACIÓN DE DATOS ============

    async initializeData() {
        // Verificar si hay datos
        const count = await this.db.get('SELECT COUNT(*) as total FROM sistema_estados');
        if (count.total === 0) {
            // Datos iniciales del sistema
            await this.saveState('sistema_estados', {
                estabilidad: 0.8,
                rendimiento: 0.7,
                nivel_consciencia: 0.1,
                integridad: 0.9,
                emergencia: 0,
                datos: JSON.stringify({ initialized: true, version: '4.0.0' })
            });

            // Configuración inicial de umbrales
            const umbrales = [
                { variable: 'oxigeno', minimo: 70, maximo: 100, critico: 30, advertencia: 50 },
                { variable: 'energia', minimo: 40, maximo: 100, critico: 15, advertencia: 25 },
                { variable: 'cortisol', minimo: 0, maximo: 40, critico: 80, advertencia: 60 },
                { variable: 'toxicidad', minimo: 0, maximo: 20, critico: 70, advertencia: 50 },
                { variable: 'estabilidad', minimo: 0.6, maximo: 1.0, critico: 0.3, advertencia: 0.5 },
                { variable: 'frecuencia_cardiaca', minimo: 60, maximo: 100, critico: 150, advertencia: 120 }
            ];

            for (const u of umbrales) {
                await this.db.run(
                    `INSERT OR IGNORE INTO config_umbrales (variable, minimo, maximo, critico, advertencia)
                     VALUES (?, ?, ?, ?, ?)`,
                    [u.variable, u.minimo, u.maximo, u.critico, u.advertencia]
                );
            }

            // Parámetros de configuración inicial
            const parametros = [
                { clave: 'auto_save_interval', valor: '100', tipo: 'integer', descripcion: 'Intervalo de guardado automático' },
                { clave: 'consciousness_update_interval', valor: '10', tipo: 'integer', descripcion: 'Intervalo de actualización de consciencia' },
                { clave: 'neuroplasticity_rate', valor: '0.15', tipo: 'float', descripcion: 'Tasa de neuroplasticidad' },
                { clave: 'learning_rate', valor: '0.12', tipo: 'float', descripcion: 'Tasa de aprendizaje' },
                { clave: 'debug_mode', valor: 'false', tipo: 'boolean', descripcion: 'Modo debug' }
            ];

            for (const p of parametros) {
                await this.db.run(
                    `INSERT OR IGNORE INTO config_parametros (clave, valor, tipo, descripcion)
                     VALUES (?, ?, ?, ?)`,
                    [p.clave, p.valor, p.tipo, p.descripcion]
                );
            }
        }
        console.log('📊 Datos iniciales configurados');
    }

    // ============ MÉTODOS DE ALTO RENDIMIENTO ============

    async saveState(table, data) {
        const timestamp = Date.now();
        const columns = ['timestamp', ...Object.keys(data)];
        const placeholders = columns.map(() => '?').join(',');
        const values = [timestamp, ...Object.values(data)];

        const query = `INSERT OR REPLACE INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;
        const startTime = Date.now();
        
        try {
            const result = await this.db.run(query, values);
            this.metrics.queries++;
            this.metrics.avgQueryTime = (this.metrics.avgQueryTime * 0.9 + (Date.now() - startTime) * 0.1);
            return result;
        } catch (error) {
            console.error(`❌ Error guardando en ${table}:`, error);
            throw error;
        }
    }

    async saveMemory(memory) {
        const query = `
            INSERT INTO memoria_episodica (
                timestamp, contenido, contexto, fuerza, importancia, 
                emocion_asociada, consolidada, accesos, ultimo_acceso
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const result = await this.db.run(query, [
            Date.now(),
            memory.contenido,
            memory.contexto || '',
            memory.fuerza || 0.5,
            memory.importancia || 0.5,
            memory.emocion_asociada || 'neutral',
            memory.consolidada ? 1 : 0,
            0,
            Date.now()
        ]);
        this.cache.delete('memories');
        return result;
    }

    async saveEmotionalState(state) {
        return this.saveState('emociones_estados', {
            alegria: state.alegria || 0,
            tristeza: state.tristeza || 0,
            miedo: state.miedo || 0,
            ira: state.ira || 0,
            asco: state.asco || 0,
            sorpresa: state.sorpresa || 0,
            confianza: state.confianza || 0,
            verguenza: state.verguenza || 0,
            orgullo: state.orgullo || 0,
            culpa: state.culpa || 0,
            envidia: state.envidia || 0,
            gratitud: state.gratitud || 0,
            esperanza: state.esperanza || 0,
            aceptacion: state.aceptacion || 0,
            frustracion: state.frustracion || 0,
            nostalgia: state.nostalgia || 0,
            conexion: state.conexion || 0,
            soledad: state.soledad || 0
        });
    }

    async saveBiochemicalState(state) {
        await this.saveState('bioquimica_estados', {
            oxigeno: state.oxigeno || 0,
            energia: state.energia || 0,
            toxicidad: state.toxicidad || 0,
            temperatura: state.temperatura || 37,
            ph: state.ph || 7.4,
            glucosa: state.glucosa || 80,
            lactato: state.lactato || 10,
            creatinina: state.creatinina || 1.0,
            urea: state.urea || 20,
            estado_hidratacion: state.estadoHidratacion || 80
        });

        await this.saveState('bioquimica_neurotransmisores', {
            dopamina: state.dopamina || 0,
            serotonina: state.serotonina || 0,
            noradrenalina: state.noradrenalina || 0,
            cortisol: state.cortisol || 0,
            oxitocina: state.oxitocina || 0,
            gaba: state.gaba || 0,
            glutamato: state.glutamato || 0,
            endorfinas: state.endorfinas || 0,
            acetilcolina: state.acetilcolina || 0,
            adrenalina: state.adrenalina || 0,
            histamina: state.histamina || 0,
            melatonina: state.melatonina || 0
        });

        await this.saveState('bioquimica_signos_vitales', {
            frecuencia_cardiaca: state.frecuenciaCardiaca || 0,
            presion_sistolica: state.presionArterial?.sistolica || 0,
            presion_diastolica: state.presionArterial?.diastolica || 0,
            saturacion_oxigeno: state.saturacionOxigeno || 0,
            ritmo_respiratorio: state.ritmoRespiratorio || 0,
            variabilidad_cardiaca: state.variabilidadCardiaca || 0
        });
    }

    async saveCognitiveState(state) {
        return this.saveState('cognitivo_estados', {
            atencion: state.atencion || 0,
            concentracion: state.concentracion || 0,
            memoria_trabajo: state.memoriaTrabajo || 0,
            velocidad_procesamiento: state.velocidadProcesamiento || 0,
            razonamiento: state.razonamiento || 0,
            toma_decisiones: state.tomaDecisiones || 0,
            planificacion: state.planificacion || 0,
            flexibilidad: state.flexibilidad || 0,
            inhibicion: state.inhibicion || 0,
            creatividad: state.creatividad || 0,
            intuicion: state.intuicion || 0,
            curiosidad: state.curiosidad || 0,
            insight: state.insight || 0,
            fluidez: state.fluidez || 0,
            carga: state.carga || 0,
            fatiga: state.fatiga || 0,
            estres: state.estres || 0
        });
    }

    async savePersonality(traits) {
        return this.saveState('personalidad_rasgos', {
            apertura: traits.openness || 0.5,
            conciencia: traits.conscientiousness || 0.5,
            extraversion: traits.extraversion || 0.5,
            amabilidad: traits.agreeableness || 0.5,
            neuroticismo: traits.neuroticism || 0.5
        });
    }

    async saveMotivationState(state) {
        return this.saveState('motivacion_estados', {
            intensidad: state.intensidadMotivacional || 0,
            satisfaccion: state.satisfaccionGeneral || 0,
            urgencia: state.urgencia || 0,
            persistencia: state.persistencia || 0,
            flexibilidad: state.flexibilidadMotivacional || 0,
            impulso_actual: state.impulsoActual || '',
            nivel_activacion: state.nivelActivacion || 0,
            foco_motivacional: state.focoMotivacional || 0,
            frustracion: state.frustracion || 0,
            esperanza: state.esperanza || 0,
            determinacion: state.determinacion || 0
        });
    }

    // ============ CONSULTAS AVANZADAS ============

    async getState(table) {
        const query = `SELECT * FROM ${table} ORDER BY timestamp DESC LIMIT 1`;
        return this.db.get(query);
    }

    async getStateHistory(table, limit = 100) {
        const query = `SELECT * FROM ${table} ORDER BY timestamp DESC LIMIT ?`;
        return this.db.all(query, limit);
    }

    async getLatest(table, limit = 1) {
        const cacheKey = `${table}_latest_${limit}`;
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                this.metrics.cacheHits++;
                return cached.data;
            }
        }
        this.metrics.cacheMisses++;

        const query = `SELECT * FROM ${table} ORDER BY timestamp DESC LIMIT ?`;
        const data = await this.db.all(query, limit);
        
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
    }

    async getHistory(table, startTime, endTime, limit = 1000) {
        const query = `
            SELECT * FROM ${table} 
            WHERE timestamp BETWEEN ? AND ? 
            ORDER BY timestamp ASC 
            LIMIT ?
        `;
        return this.db.all(query, [startTime, endTime, limit]);
    }

    async getStrongestMemories(limit = 50) {
        const cacheKey = `memories_strongest_${limit}`;
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                this.metrics.cacheHits++;
                return cached.data;
            }
        }
        this.metrics.cacheMisses++;

        const query = `
            SELECT * FROM memoria_episodica 
            ORDER BY fuerza DESC, importancia DESC 
            LIMIT ?
        `;
        const data = await this.db.all(query, limit);
        
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
    }

    async searchMemories(query, limit = 20) {
        const searchQuery = `
            SELECT *, 
                (CASE 
                    WHEN contenido LIKE ? THEN 1.0 
                    ELSE 0.5 
                END) as relevancia
            FROM memoria_episodica 
            WHERE contenido LIKE ? 
            ORDER BY relevancia DESC, importancia DESC, fuerza DESC 
            LIMIT ?
        `;
        return this.db.all(searchQuery, [`%${query}%`, `%${query}%`, limit]);
    }

    // ============ ANÁLISIS DE DATOS ============

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
        
        const tables = await this.db.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `);

        for (const table of tables) {
            await this.db.exec(`ANALYZE ${table.name}`);
        }

        await this.db.exec('REINDEX');
        await this.db.exec('VACUUM');
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

    // ============ LIMPIEZA Y CIERRE ============

    async cleanup() {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        
        const tables = [
            'sistema_estados', 'sistema_metricas', 'sistema_eventos',
            'bioquimica_estados', 'bioquimica_neurotransmisores', 
            'bioquimica_hormonas', 'bioquimica_signos_vitales',
            'emociones_estados', 'emociones_dimensiones', 'emociones_historico',
            'cognitivo_estados', 'cognitivo_procesos', 'cognitivo_pensamientos',
            'motor_estados', 'motor_acciones',
            'social_interacciones'
        ];

        for (const table of tables) {
            await this.db.run(`DELETE FROM ${table} WHERE timestamp < ?`, thirtyDaysAgo);
        }

        await this.db.run(`
            DELETE FROM memoria_episodica 
            WHERE id NOT IN (
                SELECT id FROM memoria_episodica 
                ORDER BY importancia DESC, fuerza DESC 
                LIMIT 50000
            )
        `);

        await this.db.run(`
            DELETE FROM cognitivo_pensamientos 
            WHERE id NOT IN (
                SELECT id FROM cognitivo_pensamientos 
                ORDER BY timestamp DESC 
                LIMIT 10000
            )
        `);

        await this.db.exec('VACUUM');
        this.cache.clear();
        console.log('🗄️ Limpieza y optimización completadas');
    }

    async getMetrics() {
        return {
            ...this.metrics,
            cacheSize: this.cache.size,
            isInitialized: this.isInitialized,
            databaseSize: (await this.db.get('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()'))?.size || 0,
            tableCount: (await this.db.get('SELECT COUNT(*) as count FROM sqlite_master WHERE type="table"')).count,
            viewCount: (await this.db.get('SELECT COUNT(*) as count FROM sqlite_master WHERE type="view"')).count,
            triggerCount: (await this.db.get('SELECT COUNT(*) as count FROM sqlite_master WHERE type="trigger"')).count,
            indexCount: (await this.db.get('SELECT COUNT(*) as count FROM sqlite_master WHERE type="index"')).count
        };
    }

    async close() {
        if (this.backupInterval) {
            clearInterval(this.backupInterval);
        }
        if (this.db) {
            await this.db.close();
            this.isInitialized = false;
        }
    }
}

export { DatabaseManager };
