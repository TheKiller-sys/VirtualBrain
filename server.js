// server.js
// Cerebro Digital V4.3 — API con aprendizaje real desde el chat
//
// CAMBIOS V4.3:
//  - integrateChatIntoBrain(): cada mensaje alimenta MemorySystem,
//    EmotionalSystem, CognitiveSystem y crea conexiones sinápticas.
//  - Persistencia inmediata de cada turno (sin esperar al flush de 5s).
//  - /api/conversation/history devuelve hasta 500 turnos (antes 50).
//  - Mensajes de usuario hasta 10000 caracteres.
//  - Respuestas hasta 10000 caracteres.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { systemCore } from './src/core/SystemCore.js';
import { DatabaseManager } from './src/core/DatabaseManager.js';
import { TUNING } from './src/config/tuning.js';
import { IntentClassifier } from './src/conversation/IntentClassifier.js';
import { conversationManager } from './src/conversation/ConversationManager.js';
import { responseGenerator } from './src/conversation/ResponseGenerator.js';

import './src/modules/EnvironmentSystem.js';
import './src/modules/PersonalitySystem.js';
import './src/modules/BiochemicalSystem.js';
import './src/modules/EmotionalSystem.js';
import './src/modules/CognitiveSystem.js';
import './src/modules/MemorySystem.js';
import './src/modules/MotivationSystem.js';
import './src/modules/SleepSystem.js';
import './src/modules/MotorSystem.js';
import './src/modules/ControlSystem.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null;

if (IS_PROD && TUNING.validation.requireAdminTokenInProduction && !ADMIN_TOKEN) {
    console.error('❌ NODE_ENV=production requiere ADMIN_TOKEN configurado.');
    process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());

const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
    : null;

const corsOriginOption = allowedOrigins
    ? (origin, cb) => {
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('CORS bloqueado'));
    }
    : (IS_PROD ? ((origin, cb) => cb(null, false)) : true);

app.use(cors({
    origin: corsOriginOption,
    credentials: true,
    maxAge: 86400,
    allowedHeaders: ['Content-Type', 'X-Admin-Token', 'X-Session-Id']
}));

app.use(express.json({ limit: TUNING.chat.bodyLimit }));
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: IS_PROD ? '1h' : 0,
    etag: true
}));

function rateLimit({ windowMs = 60000, max = 120 } = {}) {
    const hits = new Map();
    const cleanup = setInterval(() => {
        const now = Date.now();
        for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
    }, windowMs);
    if (cleanup.unref) cleanup.unref();

    return (req, res, next) => {
        const key = req.ip || req.socket?.remoteAddress || 'unknown';
        const now = Date.now();
        let entry = hits.get(key);
        if (!entry || now > entry.resetAt) entry = { count: 0, resetAt: now + windowMs };
        entry.count++;
        hits.set(key, entry);
        res.set('X-RateLimit-Limit', String(max));
        res.set('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
        res.set('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));
        if (entry.count > max) {
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
            res.set('Retry-After', String(retryAfter));
            return res.status(429).json({ success: false, error: 'Demasiadas peticiones' });
        }
        next();
    };
}

function requireAdmin(req, res, next) {
    if (!ADMIN_TOKEN) {
        if (IS_PROD) return res.status(503).json({ success: false, error: 'Admin no configurado' });
        return next();
    }
    const token = req.headers['x-admin-token'] || req.query.token;
    if (token !== ADMIN_TOKEN) return res.status(401).json({ success: false, error: 'No autorizado' });
    next();
}

app.use('/api/', rateLimit(TUNING.rateLimit.global));
const chatLimiter = rateLimit(TUNING.rateLimit.chat);

function clamp01(v) { return Math.max(0, Math.min(1, v || 0)); }

function safeInt(value, fallback, min, max) {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
}

function errorResponse(res, error, status = 500) {
    const body = { success: false, error: error.message || String(error) };
    if (!IS_PROD && error.stack) body.stack = error.stack.split('\n').slice(0, 5);
    res.status(status).json(body);
}

function withTimeout(promise, ms, label = 'operation') {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms).unref?.()
        )
    ]);
}

function getSessionId(req) {
    const fromHeader = req.headers['x-session-id'];
    if (typeof fromHeader === 'string' && /^[a-zA-Z0-9_-]{4,64}$/.test(fromHeader)) {
        return fromHeader;
    }
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const ua = req.headers['user-agent'] || 'unknown';
    let hash = 0;
    const str = ip + '|' + ua;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return 'anon_' + Math.abs(hash).toString(36);
}

// ==================== REGIONES ====================

function computeActivatedRegions(state, analysisType = 'general') {
    const modules = state?.modules || {};
    const out = {};
    for (const [regionName, cfg] of Object.entries(TUNING.regions)) {
        out[regionName] = computeRegion(regionName, cfg, modules);
    }
    for (const [regionName, cfg] of Object.entries(TUNING.regions)) {
        if (!cfg.boost) continue;
        const boost = cfg.boost[analysisType];
        if (typeof boost === 'number') out[regionName] = clamp01(out[regionName] + boost);
    }
    return out;
}

function computeRegion(name, cfg, modules) {
    let value = 0;
    let divisor = 1;
    for (const [moduleName, weights] of Object.entries(cfg.weights || {})) {
        const mod = modules[moduleName] || {};
        if (Array.isArray(weights)) {
            let sum = 0;
            for (const field of weights) sum += Number(mod[field]) || 0;
            value += sum;
            divisor = Math.max(divisor, cfg.weights.divisor || weights.length * 100);
        } else if (typeof weights === 'object') {
            const subDivisor = weights.divisor || 1;
            for (const [field, spec] of Object.entries(weights)) {
                if (field === 'divisor') continue;
                const raw = Number(mod[spec.field || field]) || 0;
                const scaled = raw / (spec.scale || 1);
                value += scaled;
            }
            divisor = Math.max(divisor, subDivisor);
        }
    }
    for (const w of Object.values(cfg.weights || {})) {
        if (w && typeof w === 'object' && w.divisor) divisor = w.divisor;
    }
    let result = value / Math.max(1, divisor);
    if (typeof cfg.base === 'number') result += cfg.base;
    return clamp01(result);
}

function intentToRegionType(intent) {
    return TUNING.intentToRegion[intent] || 'general';
}

// ==================== V4.3: INTEGRACIÓN CHAT → CEREBRO ====================

/**
 * Alimenta el cerebro real con cada mensaje.
 * Esto hace que:
 *  - El cuerpo reaccione emocionalmente (situaciones bioquímicas).
 *  - La memoria episódica registre el turno.
 *  - El sistema cognitivo cree pensamientos y decisiones.
 *  - Se creen conexiones sinápticas entre intents y emociones.
 *  - Se aprenda la "habilidad" de conversar sobre ese tema.
 */
async function integrateChatIntoBrain({ sessionId, userMessage, analysis, generated, stateBefore }) {
    try {
        // 1. Aplicar situación emocional según intent
        const sit = TUNING.intentToSituation[analysis.intent];
        if (sit && !systemCore.systemState.emergency) {
            systemCore.applySituation(sit.tipo, sit.intensidad);
        }

        // 2. Registrar memoria episódica del turno
        if (systemCore.database?.isInitialized) {
            const emocionAsociada = generated.emotion || 'neutral';
            const fuerza = Math.min(1, 0.55 + (analysis.intensity || 0.3) * 0.4);
            const importancia = Math.min(1, 0.5 + (analysis.confidence || 0.5) * 0.3 + (analysis.intensity || 0.3) * 0.2);

            await systemCore.database.saveMemory({
                contenido: `[${analysis.intent}] Usuario: ${userMessage.substring(0, 500)} || Cerebro: ${generated.text.substring(0, 500)}`,
                tipo: 'interaccion',
                fuerza,
                importancia,
                emocion_asociada: emocionAsociada,
                consolidada: true,
                sim_time: systemCore.systemTime,
                timestamp: Date.now()
            });
        }

        // 3. Registrar pensamiento del cerebro
        if (systemCore.database?.isInitialized && generated.text.length > 0) {
            await systemCore.database.saveThought({
                contenido: generated.text.substring(0, 1000),
                tipo: 'consciente',
                intensidad: generated.confidence ?? 0.5,
                emocion_asociada: generated.emotion,
                nivel_consciencia: stateBefore?.system?.consciousness ?? 0.5,
                sim_time: systemCore.systemTime,
                timestamp: Date.now()
            });
        }

        // 4. Aprender la habilidad de conversar sobre ese tema
        try {
            const skillName = `dialogo_${analysis.intent}`;
            systemCore.learn(skillName, {
                cognitive: stateBefore?.modules?.cognitive,
                biochemical: stateBefore?.modules?.biochemical,
                emotional: stateBefore?.modules?.emotional,
                metodo: 'conversacion'
            }, true);
        } catch (_) {}

        // 5. Crear conexiones sinápticas entre intent y emoción dominante
        if (generated.emotion && systemCore.database?.isInitialized) {
            try {
                await systemCore.database.saveConnection(
                    `intent_${analysis.intent}`,
                    `emotion_${generated.emotion}`,
                    0.5 + (analysis.confidence || 0.5) * 0.3
                );
                // Y entre emoción detectada y memoria
                if (analysis.sentiment !== 0) {
                    const pole = analysis.sentiment > 0 ? 'positivo' : 'negativo';
                    await systemCore.database.saveConnection(
                        `intent_${analysis.intent}`,
                        `sentimiento_${pole}`,
                        0.4 + Math.abs(analysis.sentiment) * 0.4
                    );
                }
            } catch (_) {}
        }

        // 6. Enriquecer la memoria semántica con las entidades detectadas
        if (analysis.entities && analysis.entities.length > 0 && systemCore.database?.isInitialized) {
            for (const ent of analysis.entities.slice(0, 5)) {
                try {
                    await systemCore.database.db.run(
                        `INSERT INTO memoria_semantica (concepto, significado, fuerza, contextos, ultima_actualizacion)
                         VALUES (?, ?, 0.4, 1, ?)
                         ON CONFLICT(concepto) DO UPDATE SET
                            fuerza = MIN(1.0, fuerza + 0.05),
                            contextos = contextos + 1,
                            ultima_actualizacion = ?`,
                        [ent, `Mencionado en conversación: ${analysis.intent}`, Date.now(), Date.now()]
                    );
                } catch (_) {}
            }
        }
    } catch (err) {
        console.warn('⚠️ integrateChatIntoBrain falló:', err.message);
    }
}

// ==================== RUTAS ====================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/state', async (req, res) => {
    try {
        const state = await withTimeout(systemCore.getState(), TUNING.chat.stateTimeoutMs, 'getState');
        const metrics = await systemCore.getMetrics();
        const regions = computeActivatedRegions(state, 'general');
        res.json({ success: true, state, metrics, regions, timestamp: Date.now() });
    } catch (error) {
        console.error('❌ /api/state:', error.message);
        errorResponse(res, error);
    }
});

app.get('/api/metrics', async (req, res) => {
    try {
        const metrics = await systemCore.getMetrics();
        res.json({ success: true, metrics });
    } catch (error) { errorResponse(res, error); }
});

app.get('/api/health', async (req, res) => {
    try {
        res.json({
            success: true,
            status: systemCore.systemState.emergency ? 'emergency' : 'operational',
            stability: systemCore.systemState.stability || 0,
            consciousness: systemCore.systemState.consciousnessLevel || 0,
            cycles: systemCore.cycleCount || 0,
            slowCycles: systemCore.slowCycleCount || 0,
            simTime: systemCore.systemTime || 0,
            modules: Array.from(systemCore.modules.keys()),
            database: systemCore.database?.isInitialized || false,
            environment: NODE_ENV,
            conversation: conversationManager.getStats(),
            llm: responseGenerator.llm.isConfigured() ? responseGenerator.llm.provider : null,
            llmCloud: responseGenerator.llm.isCloud || false,
            timestamp: Date.now()
        });
    } catch (error) { errorResponse(res, error); }
});

app.post('/api/think', async (req, res) => {
    try {
        const { options, context } = req.body || {};
        if (!Array.isArray(options) || options.length === 0) {
            return res.status(400).json({ success: false, error: 'Se requieren opciones para pensar' });
        }
        const result = await withTimeout(systemCore.think(options, context), 10000, 'think');
        res.json({ success: true, ...result });
    } catch (error) { errorResponse(res, error); }
});

app.post('/api/remember', async (req, res) => {
    try {
        const { query } = req.body || {};
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ success: false, error: 'Se requiere una consulta' });
        }
        if (query.length > TUNING.limits.maxQueryLength) {
            return res.status(400).json({ success: false, error: `Consulta máx ${TUNING.limits.maxQueryLength} caracteres` });
        }
        const result = await systemCore.remember(query);
        res.json({ success: true, ...result });
    } catch (error) { errorResponse(res, error); }
});

app.post('/api/learn', async (req, res) => {
    try {
        const { skill, context, success } = req.body || {};
        if (!skill || typeof skill !== 'string') {
            return res.status(400).json({ success: false, error: 'Se requiere una habilidad' });
        }
        const result = await systemCore.learn(skill, context, success !== false);
        res.json({ success: true, ...result });
    } catch (error) { errorResponse(res, error); }
});

const VALID_SITUATIONS = new Set([
    'oxigeno_alto', 'oxigeno_bajo', 'toxinas', 'limpiar_toxinas',
    'temperatura_alta', 'temperatura_baja',
    'amenaza', 'recompensa', 'actividad_alta', 'reposo',
    'interaccion_social', 'alegria', 'tristeza', 'miedo', 'ira',
    'confianza', 'sorpresa', 'estres_alto', 'recuperacion',
    'aprendizaje_intenso', 'insight', 'descanso',
    'lesion', 'entrenamiento', 'logro', 'fracaso', 'desafio',
    'inspiracion', 'tormenta', 'desastre', 'amanecer', 'anochecer',
    'fatiga', 'nostalgia'
]);

app.post('/api/situation', async (req, res) => {
    try {
        const { type, intensity } = req.body || {};
        if (!type || typeof type !== 'string') {
            return res.status(400).json({ success: false, error: 'Se requiere un tipo de situación' });
        }
        if (!VALID_SITUATIONS.has(type)) {
            return res.status(400).json({ success: false, error: `Situación desconocida: ${type}` });
        }
        const result = systemCore.applySituation(type, intensity ?? TUNING.situations.defaultIntensity);
        res.json({ success: true, ...result, type });
    } catch (error) { errorResponse(res, error); }
});

// ==================== CHAT V4.3 ====================

app.post('/api/chat', chatLimiter, async (req, res) => {
    try {
        const { message } = req.body || {};
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ success: false, error: 'Mensaje inválido' });
        }
        if (message.length > TUNING.chat.maxMessageLength) {
            return res.status(400).json({
                success: false,
                error: `Mensaje máx ${TUNING.chat.maxMessageLength} caracteres`
            });
        }

        const sessionId = getSessionId(req);
        const trimmedMessage = message.trim();

        // 1. Clasificar
        const analysis = IntentClassifier.classify(trimmedMessage);

        // 2. Contexto
        const context = conversationManager.getContext(sessionId);
        const isRepeating = conversationManager.detectRepetition(sessionId, analysis.intent);

        // 3. Estado del cerebro ANTES de reaccionar
        const stateBefore = await systemCore.getState();
        const emotional = stateBefore.modules?.emotional || {};
        const cognitive = stateBefore.modules?.cognitive || {};
        const personality = stateBefore.modules?.personality || {};
        const biochemical = stateBefore.modules?.biochemical || {};

        // 4. Memoria (búsqueda semántica)
        let memoryContext = null;
        try {
            memoryContext = await systemCore.remember(trimmedMessage);
        } catch (_) {}

        // 5. Registrar turno del usuario INMEDIATAMENTE (memoria + cola DB)
        conversationManager.recordTurn(sessionId, {
            role: 'usuario',
            content: trimmedMessage,
            intent: analysis.intent,
            sentiment: analysis.sentiment,
            entities: analysis.entities
        });

        // 5b. Persistir el turno del usuario a DB de inmediato (no esperar flush)
        if (systemCore.database?.isInitialized) {
            try {
                const pending = conversationManager.drainPendingMessages();
                if (pending.length > 0) {
                    await systemCore.database.saveConversationBatch(pending);
                }
            } catch (err) {
                console.warn('⚠️ Error persistiendo turno usuario:', err.message);
            }
        }

        // 6. Generar respuesta
        const generated = await responseGenerator.generate({
            userMessage: trimmedMessage,
            analysis,
            context,
            emotionalState: emotional,
            cognitiveState: cognitive,
            personality,
            memoryContext
        });

        // 7. Registrar respuesta del cerebro
        conversationManager.recordTurn(sessionId, {
            role: 'cerebro',
            content: generated.text,
            intent: null,
            emotion: generated.emotion,
            sentiment: 0,
            entities: []
        });

        // 7b. Persistir respuesta a DB de inmediato
        if (systemCore.database?.isInitialized) {
            try {
                const pending = conversationManager.drainPendingMessages();
                if (pending.length > 0) {
                    await systemCore.database.saveConversationBatch(pending);
                }
            } catch (err) {
                console.warn('⚠️ Error persistiendo respuesta:', err.message);
            }
        }

        // 8. Integrar el chat en el cerebro (aprendizaje real)
        await integrateChatIntoBrain({
            sessionId,
            userMessage: trimmedMessage,
            analysis,
            generated,
            stateBefore
        });

        // 9. Regiones activadas
        const regionAnalysisType = intentToRegionType(analysis.intent);
        const stateAfter = await systemCore.getState();
        const regions = computeActivatedRegions(stateAfter, regionAnalysisType);

        // 10. Respuesta
        res.json({
            success: true,
            message: generated.text,
            emotion: generated.emotion,
            emoji: generated.emoji,
            confidence: generated.confidence,
            reasoning: generated.reasoning,
            personality: personality.traits || {},
            internal_state: {
                energia: biochemical.energia ?? 0,
                cortisol: biochemical.cortisol ?? 0,
                dopamina: biochemical.dopamina ?? 0
            },
            state: {
                consciousness: stateAfter.system?.consciousness ?? 0,
                stability: stateAfter.system?.stability ?? 0,
                performance: stateAfter.system?.performance ?? 0,
                simTime: stateAfter.system?.simTime ?? 0
            },
            activated_regions: regions,
            session_id: sessionId,
            analysis: {
                intent: analysis.intent,
                secondary_intents: analysis.secondaryIntents,
                confidence: analysis.confidence,
                sentiment: analysis.sentiment,
                intensity: analysis.intensity,
                negated: analysis.negated,
                question_type: analysis.questionType,
                entities: analysis.entities
            },
            context: {
                turn_count: context.turnCount + 1,
                dominant_topic: context.dominantTopic,
                avg_sentiment: context.avgSentiment,
                is_repeating: isRepeating
            },
            source: generated.source,
            context_used: generated.usedContext,
            learned: true
        });
    } catch (error) {
        console.error('❌ /api/chat:', error);
        errorResponse(res, error);
    }
});

// ==================== CONVERSACIÓN ====================

app.get('/api/conversation/history', async (req, res) => {
    try {
        const sessionId = getSessionId(req);
        const limit = safeInt(req.query.limit, TUNING.limits.defaultHistoryLimit, 1, TUNING.limits.maxConversationHistory);

        // 1) Turnos en memoria
        let turns = conversationManager.getFullHistory(sessionId).slice(-limit);

        // 2) Si hay menos en memoria que el límite, completar con DB
        if (turns.length < limit && systemCore.database?.isInitialized) {
            try {
                const dbTurns = await systemCore.database.getConversationHistory(sessionId, limit);
                const mapped = dbTurns.reverse().map(t => ({
                    role: t.rol,
                    content: t.contenido,
                    intent: t.intent,
                    emotion: t.emocion,
                    sentiment: t.sentimiento,
                    timestamp: t.timestamp,
                    simTime: t.sim_time
                }));
                // Si DB tiene más, priorizar DB (más completo)
                if (mapped.length > turns.length) turns = mapped;
            } catch (_) {}
        }

        res.json({
            success: true,
            session_id: sessionId,
            turns,
            count: turns.length
        });
    } catch (error) { errorResponse(res, error); }
});

app.get('/api/conversation/topics', async (req, res) => {
    try {
        const sessionId = getSessionId(req);
        const topics = conversationManager.getTopTopics(sessionId, 15);
        res.json({ success: true, session_id: sessionId, topics });
    } catch (error) { errorResponse(res, error); }
});

app.post('/api/conversation/reset', async (req, res) => {
    try {
        const sessionId = getSessionId(req);
        const existed = conversationManager.sessions.has(sessionId);
        if (existed) {
            conversationManager.sessions.delete(sessionId);
        }
        // Borrar también en DB si existe
        if (systemCore.database?.isInitialized) {
            try { await systemCore.database.deleteConversationSession(sessionId); } catch (_) {}
        }
        res.json({
            success: true,
            session_id: sessionId,
            message: existed ? 'Sesión reiniciada' : 'No había sesión activa'
        });
    } catch (error) { errorResponse(res, error); }
});

app.get('/api/conversation/stats', async (req, res) => {
    try {
        const stats = conversationManager.getStats();
        const sessionId = getSessionId(req);
        const session = conversationManager.getSession(sessionId);
        res.json({
            success: true,
            global: stats,
            current_session: {
                session_id: sessionId,
                turn_count: session.turnCount,
                topics_count: session.topics.size,
                sentiment_trend: session.sentimentTrend.slice(-10)
            }
        });
    } catch (error) { errorResponse(res, error); }
});

app.get('/api/conversation/sessions', requireAdmin, async (req, res) => {
    try {
        const sessions = [];
        for (const [id, s] of conversationManager.sessions) {
            sessions.push({
                session_id: id,
                turn_count: s.turnCount,
                created_at: s.createdAt,
                last_activity_at: s.lastActivityAt,
                topics_count: s.topics.size
            });
        }
        sessions.sort((a, b) => b.last_activity_at - a.last_activity_at);
        res.json({ success: true, sessions, count: sessions.length });
    } catch (error) { errorResponse(res, error); }
});

// ==================== HISTORIALES ====================

app.get('/api/emotions/history', async (req, res) => {
    try {
        const limit = safeInt(req.query.limit, 100, 1, TUNING.limits.maxLimitParam);
        const history = await systemCore.database.getEmotionalHistory(limit);
        res.json({ success: true, history, count: history.length });
    } catch (error) { errorResponse(res, error); }
});

app.get('/api/decisions/history', async (req, res) => {
    try {
        const limit = safeInt(req.query.limit, TUNING.limits.defaultHistoryLimit, 1, 500);
        const history = await systemCore.database.getDecisionHistory(limit);
        res.json({ success: true, history, count: history.length });
    } catch (error) { errorResponse(res, error); }
});

app.get('/api/thoughts/history', async (req, res) => {
    try {
        const limit = safeInt(req.query.limit, TUNING.limits.defaultHistoryLimit, 1, 500);
        const history = await systemCore.database.getThoughtHistory(limit);
        res.json({ success: true, history, count: history.length });
    } catch (error) { errorResponse(res, error); }
});

app.get('/api/memories/important', async (req, res) => {
    try {
        const limit = safeInt(req.query.limit, 30, 1, 200);
        const memories = await systemCore.database.getStrongestMemories(limit);
        res.json({ success: true, memories, count: memories.length });
    } catch (error) { errorResponse(res, error); }
});

app.post('/api/memories/search', async (req, res) => {
    try {
        const { query, limit } = req.body || {};
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ success: false, error: 'Se requiere una consulta' });
        }
        if (query.length > TUNING.limits.maxQueryLength) {
            return res.status(400).json({ success: false, error: 'Consulta demasiado larga' });
        }
        const safeLimit = safeInt(limit, 20, 1, 200);
        const memories = await systemCore.database.searchMemories(query, safeLimit);
        res.json({ success: true, memories, count: memories.length });
    } catch (error) { errorResponse(res, error); }
});

app.get('/api/personality/evolution', async (req, res) => {
    try {
        const evolution = await systemCore.database.getPersonalityEvolution();
        res.json({ success: true, evolution, count: evolution.length });
    } catch (error) { errorResponse(res, error); }
});

app.get('/api/learning/feed', async (req, res) => {
    try {
        const limit = safeInt(req.query.limit, TUNING.limits.defaultFeedLimit, 1, 200);
        const feed = await systemCore.database.getLearningFeed(limit);
        res.json({ success: true, feed, count: feed.length });
    } catch (error) { errorResponse(res, error); }
});

app.get('/api/analysis/full', async (req, res) => {
    try {
        const metrics = await systemCore.database.getAdvancedMetrics();
        res.json({ success: true, metrics });
    } catch (error) { errorResponse(res, error); }
});

app.get('/api/analysis/correlations', async (req, res) => {
    try {
        const { v1, v2, period } = req.query;
        if (!v1 || !v2) return res.status(400).json({ success: false, error: 'v1 y v2 requeridos' });
        const correlations = await systemCore.database.findCorrelations(v1, v2, period || 'day');
        res.json({ success: true, correlations });
    } catch (error) { errorResponse(res, error); }
});

app.get('/api/analysis/anomalies', async (req, res) => {
    try {
        const threshold = parseFloat(req.query.threshold);
        const safeThreshold = Number.isFinite(threshold) ? Math.max(0.5, Math.min(10, threshold)) : 2.5;
        const anomalies = await systemCore.database.detectAnomalies(safeThreshold);
        res.json({ success: true, anomalies });
    } catch (error) { errorResponse(res, error); }
});

app.get('/api/analysis/predict', async (req, res) => {
    try {
        const { variable, horizon } = req.query;
        if (!variable) return res.status(400).json({ success: false, error: 'variable requerida' });
        const safeHorizon = safeInt(horizon, 10, 1, 100);
        const prediction = await systemCore.database.predictFuture(variable, safeHorizon);
        res.json({ success: true, prediction });
    } catch (error) { errorResponse(res, error); }
});

app.get('/api/analysis/trends', async (req, res) => {
    try {
        const { variable, period } = req.query;
        if (!variable) return res.status(400).json({ success: false, error: 'variable requerida' });
        const trends = await systemCore.database.analyzeTrends(variable, period || 'day');
        res.json({ success: true, trends });
    } catch (error) { errorResponse(res, error); }
});

app.get('/api/analysis/stats', async (req, res) => {
    try {
        const stats = await systemCore.database.quickStats();
        res.json({ success: true, stats });
    } catch (error) { errorResponse(res, error); }
});

app.get('/api/export', requireAdmin, async (req, res) => {
    try {
        const data = systemCore.exportSystemData();
        res.json({ success: true, data });
    } catch (error) { errorResponse(res, error); }
});

app.get('/api/export/db', requireAdmin, async (req, res) => {
    try {
        const limit = safeInt(req.query.limit, 1000, 1, 10000);
        const data = await systemCore.database.exportToJSON(limit);
        res.json({ success: true, data });
    } catch (error) { errorResponse(res, error); }
});

app.post('/api/reset', requireAdmin, async (req, res) => {
    try {
        systemCore.reset();
        conversationManager.reset();
        res.json({ success: true, message: 'Cerebro reiniciado correctamente' });
    } catch (error) { errorResponse(res, error); }
});

app.post('/api/emergency/reset', requireAdmin, async (req, res) => {
    try {
        const wasEmergency = systemCore.systemState.emergency;
        systemCore.resetEmergency();
        res.json({
            success: true,
            message: wasEmergency ? 'Emergencia reiniciada manualmente' : 'Sistema no estaba en emergencia',
            emergency: systemCore.systemState.emergency
        });
    } catch (error) { errorResponse(res, error); }
});

app.get('/api/health/report', async (req, res) => {
    try {
        const report = await systemCore.database.getSystemHealthReport();
        res.json({ success: true, report });
    } catch (error) { errorResponse(res, error); }
});

app.get('/api/personality/insights', async (req, res) => {
    try {
        const insights = await systemCore.database.getPersonalityInsights();
        res.json({ success: true, insights });
    } catch (error) { errorResponse(res, error); }
});

app.get('/api/sleep/analysis', async (req, res) => {
    try {
        const analysis = await systemCore.database.getSleepAnalysis();
        res.json({ success: true, analysis });
    } catch (error) { errorResponse(res, error); }
});

app.get('/api/cognitive/patterns', async (req, res) => {
    try {
        const patterns = await systemCore.database.getCognitiveFlow();
        res.json({ success: true, patterns });
    } catch (error) { errorResponse(res, error); }
});

// ==================== ERROR HANDLER ====================

app.use((err, req, res, next) => {
    console.error('❌ Express error:', err.message);
    if (res.headersSent) return next(err);
    errorResponse(res, err, err.status || 500);
});

app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint no encontrado' });
});

// ==================== INICIALIZACIÓN ====================

let brainInterval = null;

async function startBrain() {
    console.log('🧠 Iniciando Cerebro Digital V4.3...');

    try {
        const database = new DatabaseManager();
        const dbOk = await database.initialize();
        if (dbOk) {
            systemCore.setDatabase(database);
            console.log('🗄️ Base de datos lista');
        } else {
            console.warn('⚠️ Base de datos no disponible, funcionando solo en memoria');
        }

        const initialized = await systemCore.initializeSystem({
            nombre: 'Cerebro Digital',
            genotipo: 'humano',
            genero: 'neutro',
            edad: 0,
            experiencia: 0
        });

        if (!initialized) {
            console.error('❌ Error inicializando el cerebro');
            return;
        }

        console.log(`🌀 Consciencia: ${(systemCore.systemState.consciousnessLevel * 100).toFixed(1)}%`);
        console.log(`📊 Estabilidad: ${(systemCore.systemState.stability * 100).toFixed(1)}%`);
        console.log(`📦 Módulos activos: ${Array.from(systemCore.modules.keys()).join(', ')}`);

        if (responseGenerator.llm.isConfigured()) {
            const mode = responseGenerator.llm.isCloud ? ' [cloud]' : ' [local]';
            console.log(`🤖 LLM configurado: ${responseGenerator.llm.provider} (${responseGenerator.llm.model})${mode}`);
        } else {
            console.log('📝 Modo composer (sin LLM configurado)');
        }

        let lastTime = Date.now();
        let errorCount = 0;

        brainInterval = setInterval(() => {
            try {
                const now = Date.now();
                const deltaTime = Math.min((now - lastTime) / 1000, TUNING.deltaTimeCap);
                lastTime = now;
                systemCore.update(deltaTime);
                errorCount = 0;
            } catch (error) {
                errorCount++;
                if (errorCount % 20 === 0) {
                    console.error(`❌ Error en bucle cerebral (${errorCount}):`, error.message);
                }
                if (errorCount > 200) errorCount = 0;
            }
        }, Math.round(1000 / TUNING.updateHz));
        if (brainInterval.unref) brainInterval.unref();

        console.log(`🔄 Bucle cerebral activo (${TUNING.updateHz}Hz fast / ${TUNING.slowTickHz}Hz slow)`);
    } catch (error) {
        console.error('❌ Error en startBrain:', error);
    }
}

const server = app.listen(PORT, async () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║   🧠 CEREBRO DIGITAL V4.3 — API CORRIENDO                ║
║   📡 http://localhost:${String(PORT).padEnd(5)}                              ║
║   🌐 http://localhost:${String(PORT).padEnd(5)}/                             ║
║   🔍 /api/health  💬 POST /api/chat                       ║
║   Env: ${NODE_ENV.padEnd(48)}║
║   ${ADMIN_TOKEN ? '🔒 Rutas admin protegidas' : '⚠️  ADMIN_TOKEN no configurado (modo dev)'}                          ║
╚══════════════════════════════════════════════════════════╝
    `);
    await startBrain();
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Puerto ${PORT} en uso.`);
    } else {
        console.error('❌ Error del servidor:', err);
    }
    process.exit(1);
});

let shuttingDown = false;

async function shutdown(reason, exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n🛑 Cerrando (${reason})...`);

    if (brainInterval) clearInterval(brainInterval);

    try {
        await Promise.race([
            systemCore.flushPendingPersistence(),
            new Promise(r => setTimeout(r, 3000).unref?.())
        ]);
    } catch (err) {
        console.error('Error flush final:', err.message);
    }

    try {
        if (systemCore.database?.isInitialized) {
            const messages = conversationManager.drainPendingMessages();
            if (messages.length > 0) {
                await systemCore.database.saveConversationBatch(messages);
            }
        }
    } catch (err) {
        console.error('Error flush conversaciones:', err.message);
    }

    try {
        if (systemCore.database) await systemCore.database.close();
    } catch (err) {
        console.error('Error cerrando BD:', err.message);
    }

    server.close(() => process.exit(exitCode));
    setTimeout(() => process.exit(exitCode), 3000).unref?.();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error);
    shutdown('uncaughtException', 1);
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ Promesa rechazada no manejada:', reason);
});

export default app;
