// src/config/tuning.js
// Configuración central de todo el sistema. Único punto de verdad.

export const TUNING = {
    // ==================== BUCLE PRINCIPAL ====================
    updateHz: 4,                    // ticks por segundo del bucle central
    slowTickHz: 0.5,                // módulos pesados corren a esta frecuencia
    deltaTimeCap: 1.0,              // máximo deltaTime aceptado (segundos)
    maxCycleHistory: 1000,
    maxEventHistory: 500,
    maxStabilityHistory: 500,

    // ==================== PERSISTENCIA ====================
    persistFlushInterval: 5,        // segundos entre flushes
    persistBatchCap: 500,           // máximo de items por buffer antes de descartar
    autoBackupMinSizeKb: 100,       // no crear backup si la BD pesa menos
    autoBackupMaxFiles: 10,

    // ==================== CACHES ====================
    stateCacheTTL: 150,             // ms de vida del cache de getState
    metricsCacheTTL: 5000,          // ms de vida del cache de counts
    columnCacheTTL: 3600000,        // ms de vida del cache de columnas SQLite
    historicalCacheTTL: 300000,     // ms para consultas históricas

    // ==================== FISIOLOGÍA ====================
    homeostasisRate: 0.05,
    consciousnessThreshold: 0.15,
    emergencyThreshold: 0.8,
    emergencyRetryLimit: 12,
    emergencyRetryDelayMs: 5000,

    // ==================== CIRCADIANO ====================
    circadian: {
        msPerDay: 86400000,
        useLocalTime: true,         // si true, usa hora local; false = UTC
        timezone: null              // null = local del sistema; o ej "Europe/Madrid"
    },

    // ==================== ALERTAS ====================
    alerts: {
        critical: {
            oxygen: 15,
            energy: 10,
            cortisol: 85,
            toxicity: 85,
            stability: 20
        },
        warning: {
            oxygen: 25,
            energy: 20,
            cortisol: 70,
            toxicity: 70,
            stability: 50
        }
    },

    // ==================== RATE LIMITING ====================
    rateLimit: {
        global: { windowMs: 60000, max: 180 },
        chat: { windowMs: 60000, max: 40 },
        auth: { windowMs: 300000, max: 10 }
    },

    // ==================== CHAT ====================
    chat: {
        bodyLimit: '100kb',
        maxMessageLength: 2000,
        fetchTimeoutMs: 20000,
        stateTimeoutMs: 8000
    },

    // ==================== REGIONES CEREBRALES ====================
    // Fuente única de verdad para /api/state y /api/chat.
    // Cada entrada describe cómo derivar una región a partir de módulos.
    //
    // FIX V4.2.1:
    //  - temporal: `divisor` movido DENTRO de `memory` para que
    //    computeRegion() realmente lo lea y normalice la suma.
    //  - boost ampliado para cubrir TODOS los tipos devueltos por
    //    intentToRegion (antes la mitad de los intents no activaban nada).
    regions: {
        frontal: {
            label: 'Frontal · Decisión',
            weights: { cognitive: ['razonamiento', 'tomaDecisiones', 'planificacion'], divisor: 300 },
            boost: {
                decision: 0.35,
                filosofia: 0.35,
                trabajo: 0.20,
                consejo: 0.25
            }
        },
        parietal: {
            label: 'Parietal · Atención',
            weights: { cognitive: ['atencion', 'concentracion'], divisor: 200 },
            boost: {}
        },
        temporal: {
            label: 'Temporal · Memoria',
            weights: {
                memory: {
                    episodica: { field: 'episodica', scale: 1500 },
                    semantica: { field: 'semantic', scale: 400 },
                    // divisor DENTRO de memory → computeRegion lo lee como subDivisor
                    divisor: 2
                }
            },
            boost: { social: 0.25 }
        },
        limbic: {
            label: 'Límbico · Emoción',
            weights: { emotional: ['alegria', 'miedo', 'ira', 'confianza'], divisor: 400 },
            boost: {
                peligro: 0.30,
                miedo: 0.30,
                alegria: 0.20,
                tristeza: 0.25,
                ira: 0.25,
                ansiedad: 0.30,
                ayuda: 0.20
            }
        },
        occipital: {
            label: 'Occipital · Visual',
            weights: { cognitive: ['curiosidad'], emotional: ['sorpresa'], divisor: 200 },
            base: 0.15,
            boost: {}
        },
        brainstem: {
            label: 'Tallo · Homeostasis',
            weights: { biochemical: ['oxigeno', 'energia'], divisor: 200 },
            boost: {
                cansancio: 0.20,
                salud: 0.20
            }
        },
        cerebellum: {
            label: 'Cerebelo · Motor',
            weights: { motor: ['coordinacion', 'precision'], divisor: 200 },
            boost: {}
        }
    },

    // ==================== MAPEO INTENT → REGIÓN ====================
    // Fuente única de verdad. server.js consulta este mapa para saber qué
    // "tipo de análisis" pasarle a computeActivatedRegions().
    // Cada valor DEBE existir como clave en regions.*.boost.
    intentToRegion: {
        // --- Sociales ---
        saludo: 'social',
        despedida: 'social',
        agradecimiento: 'social',
        disculpa: 'social',

        // --- Preguntas sobre el cerebro ---
        pregunta_estado: 'general',
        pregunta_identidad: 'general',
        pregunta_capacidad: 'general',
        pregunta_opinion: 'filosofia',
        pregunta_generica: 'general',

        // --- Estados emocionales ---
        expresion_tristeza: 'tristeza',
        expresion_ansiedad: 'ansiedad',
        expresion_ira: 'ira',
        expresion_alegria: 'alegria',
        expresion_cansancio: 'cansancio',
        expresion_confusion: 'general',

        // --- Solicitudes ---
        solicitud_ayuda: 'ayuda',
        solicitud_consejo: 'consejo',
        peticion_escucha: 'general',

        // --- Temas ---
        tema_relaciones: 'social',
        tema_trabajo: 'trabajo',
        tema_estudio: 'general',
        tema_salud: 'salud',
        tema_muerte: 'filosofia',

        // --- Filosofía / profundas ---
        filosofia: 'filosofia',
        decision: 'decision',

        // --- Peligro / urgente ---
        peligro: 'peligro',

        // --- Fallback ---
        charla: 'general'
    },

    // ==================== SITUACIONES ====================
    // Intensidad por defecto cuando /api/situation no la especifica.
    situations: {
        defaultIntensity: 1.0,
        maxIntensity: 2.0,
        minIntensity: 0.1
    },

    // ==================== LÍMITES DE ENTRADA ====================
    limits: {
        maxQueryLength: 500,
        maxLimitParam: 1000,
        defaultHistoryLimit: 50,
        defaultFeedLimit: 30
    },

    // ==================== VALIDACIÓN ====================
    validation: {
        // Si NODE_ENV=production y no hay ADMIN_TOKEN, se rechaza el arranque.
        requireAdminTokenInProduction: true,
        // Si NODE_ENV=production y CORS_ORIGIN vacío, se bloquea cross-origin
        // (same-origin sigue funcionando). Ver server.js para el detalle.
        requireCorsOriginInProduction: false
    }
};

// Congelar en desarrollo para detectar mutaciones accidentales
if (process.env.NODE_ENV !== 'production') {
    const deepFreeze = (obj) => {
        Object.keys(obj).forEach(k => {
            const v = obj[k];
            if (v && typeof v === 'object' && !Object.isFrozen(v)) {
                deepFreeze(v);
            }
        });
        return Object.freeze(obj);
    };
    deepFreeze(TUNING);
                 }
