// src/config/tuning.js
// Configuración central de todo el sistema. Único punto de verdad.

export const TUNING = {
    // ==================== BUCLE PRINCIPAL ====================
    updateHz: 4,
    slowTickHz: 0.5,
    deltaTimeCap: 1.0,
    maxCycleHistory: 1000,
    maxEventHistory: 500,
    maxStabilityHistory: 500,

    // ==================== PERSISTENCIA ====================
    persistFlushInterval: 5,
    persistBatchCap: 500,
    autoBackupMinSizeKb: 100,
    autoBackupMaxFiles: 10,

    // ==================== CACHES ====================
    stateCacheTTL: 150,
    metricsCacheTTL: 5000,
    columnCacheTTL: 3600000,
    historicalCacheTTL: 300000,

    // ==================== FISIOLOGÍA ====================
    homeostasisRate: 0.05,
    consciousnessThreshold: 0.15,
    emergencyThreshold: 0.8,
    emergencyRetryLimit: 12,
    emergencyRetryDelayMs: 5000,

    // ==================== CIRCADIANO ====================
    circadian: {
        msPerDay: 86400000,
        useLocalTime: true,
        timezone: null
    },

    // ==================== ALERTAS ====================
    alerts: {
        critical: { oxygen: 15, energy: 10, cortisol: 85, toxicity: 85, stability: 20 },
        warning: { oxygen: 25, energy: 20, cortisol: 70, toxicity: 70, stability: 50 }
    },

    // ==================== RATE LIMITING ====================
    rateLimit: {
        global: { windowMs: 60000, max: 180 },
        chat: { windowMs: 60000, max: 40 },
        auth: { windowMs: 300000, max: 10 }
    },

    // ==================== CHAT ====================
    // V4.3: mensajes y respuestas hasta 10000 caracteres.
    chat: {
        bodyLimit: '200kb',            // 10000 chars * ~10 bytes para UTF-8 con margen
        maxMessageLength: 10000,        // entrada del usuario
        maxResponseChars: 10000,        // salida del cerebro (post-proceso)
        maxResponseTokens: 2600,        // ~10000 chars / 4 en español
        fetchTimeoutMs: 60000,          // LLM Cloud puede tardar con respuestas largas
        stateTimeoutMs: 8000
    },

    // ==================== REGIONES CEREBRALES ====================
    regions: {
        frontal: {
            label: 'Frontal · Decisión',
            weights: { cognitive: ['razonamiento', 'tomaDecisiones', 'planificacion'], divisor: 300 },
            boost: { decision: 0.35, filosofia: 0.35, trabajo: 0.20, consejo: 0.25 }
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
                    divisor: 2
                }
            },
            boost: { social: 0.25 }
        },
        limbic: {
            label: 'Límbico · Emoción',
            weights: { emotional: ['alegria', 'miedo', 'ira', 'confianza'], divisor: 400 },
            boost: {
                peligro: 0.30, miedo: 0.30, alegria: 0.20,
                tristeza: 0.25, ira: 0.25, ansiedad: 0.30, ayuda: 0.20
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
            boost: { cansancio: 0.20, salud: 0.20 }
        },
        cerebellum: {
            label: 'Cerebelo · Motor',
            weights: { motor: ['coordinacion', 'precision'], divisor: 200 },
            boost: {}
        }
    },

    // ==================== MAPEO INTENT → REGIÓN ====================
    intentToRegion: {
        saludo: 'social', despedida: 'social', agradecimiento: 'social', disculpa: 'social',
        pregunta_estado: 'general', pregunta_identidad: 'general',
        pregunta_capacidad: 'general', pregunta_opinion: 'filosofia', pregunta_generica: 'general',
        pregunta_aprendizaje: 'filosofia',
        expresion_tristeza: 'tristeza', expresion_ansiedad: 'ansiedad',
        expresion_ira: 'ira', expresion_alegria: 'alegria',
        expresion_cansancio: 'cansancio', expresion_confusion: 'general',
        solicitud_ayuda: 'ayuda', solicitud_consejo: 'consejo', peticion_escucha: 'general',
        tema_relaciones: 'social', tema_trabajo: 'trabajo',
        tema_estudio: 'general', tema_salud: 'salud', tema_muerte: 'filosofia',
        filosofia: 'filosofia', decision: 'decision', peligro: 'peligro',
        charla: 'general'
    },

    // ==================== INTENT → SITUACIÓN BIOLÓGICA ====================
    // Cuando llega un mensaje con este intent, se aplica esta situación al
    // cuerpo (bioquímica + emoción + cognición). Así el cerebro reacciona
    // de verdad a lo que se habla.
    intentToSituation: {
        expresion_tristeza: { tipo: 'tristeza', intensidad: 0.7 },
        expresion_ansiedad: { tipo: 'estres_alto', intensidad: 0.7 },
        expresion_ira: { tipo: 'ira', intensidad: 0.7 },
        expresion_alegria: { tipo: 'alegria', intensidad: 0.8 },
        expresion_cansancio: { tipo: 'fatiga', intensidad: 0.6 },
        expresion_confusion: { tipo: 'estres_alto', intensidad: 0.4 },
        solicitud_ayuda: { tipo: 'amenaza', intensidad: 0.5 },
        peligro: { tipo: 'amenaza', intensidad: 0.9 },
        agradecimiento: { tipo: 'recompensa', intensidad: 0.5 },
        logro: { tipo: 'logro', intensidad: 0.7 },
        filosofia: { tipo: 'insight', intensidad: 0.4 },
        decision: { tipo: 'desafio', intensidad: 0.3 },
        tema_muerte: { tipo: 'nostalgia', intensidad: 0.5 },
        tema_relaciones: { tipo: 'interaccion_social', intensidad: 0.4 },
        saludo: { tipo: 'interaccion_social', intensidad: 0.3 }
    },

    // ==================== SITUACIONES ====================
    situations: {
        defaultIntensity: 1.0,
        maxIntensity: 2.0,
        minIntensity: 0.1
    },

    // ==================== LÍMITES DE ENTRADA ====================
    limits: {
        maxQueryLength: 10000,
        maxLimitParam: 1000,
        defaultHistoryLimit: 200,
        defaultFeedLimit: 30,
        maxConversationHistory: 500
    },

    // ==================== VALIDACIÓN ====================
    validation: {
        requireAdminTokenInProduction: true,
        requireCorsOriginInProduction: false
    }
};

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
