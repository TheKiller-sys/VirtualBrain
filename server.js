// server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { systemCore } from './src/core/SystemCore.js';
import { DatabaseManager } from './src/core/DatabaseManager.js';

// Importar TODOS los módulos (efecto secundario: se registran en systemCore)
import './src/modules/EnvironmentSystem.js';
import './src/modules/PersonalitySystem.js';
import './src/modules/BiochemicalSystem.js';
import './src/modules/EmotionalSystem.js';
import './src/modules/CognitiveSystem.js';
import './src/modules/MemorySystem.js';
import './src/modules/MotivationSystem.js';
import './src/modules/SleepSystem.js';
import './src/modules/MotorSystem.js';
import './src/modules/VisualSystem.js';
import './src/modules/ControlSystem.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ============ MIDDLEWARE ============
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ============ RUTA PRINCIPAL ============
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============ API DEL CEREBRO ============

app.get('/api/state', async (req, res) => {
    try {
        const state = await systemCore.getState();
        const metrics = await systemCore.getMetrics();
        res.json({ success: true, state, metrics, timestamp: Date.now() });
    } catch (error) {
        console.error('❌ /api/state:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/metrics', async (req, res) => {
    try {
        const metrics = await systemCore.getMetrics();
        res.json({ success: true, metrics });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/health', async (req, res) => {
    try {
        res.json({
            success: true,
            status: systemCore.systemState.emergency ? 'emergency' : 'operational',
            stability: systemCore.systemState.stability || 0,
            consciousness: systemCore.systemState.consciousnessLevel || 0,
            cycles: systemCore.cycleCount || 0,
            modules: Array.from(systemCore.modules.keys()),
            database: systemCore.database?.isInitialized || false,
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/think', async (req, res) => {
    try {
        const { options, context } = req.body;
        if (!options || !Array.isArray(options) || options.length === 0) {
            return res.status(400).json({ success: false, error: 'Se requieren opciones para pensar' });
        }
        const result = await systemCore.think(options, context);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/remember', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ success: false, error: 'Se requiere una consulta' });
        const result = await systemCore.remember(query);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/learn', async (req, res) => {
    try {
        const { skill, context, success } = req.body;
        if (!skill) return res.status(400).json({ success: false, error: 'Se requiere una habilidad' });
        const result = await systemCore.learn(skill, context, success !== undefined ? success : true);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/situation', async (req, res) => {
    try {
        const { type, intensity } = req.body;
        if (!type) return res.status(400).json({ success: false, error: 'Se requiere un tipo de situación' });
        systemCore.applySituation(type, intensity || 1.0);
        res.json({ success: true, message: `Situación ${type} aplicada` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ CHAT ============

app.post('/api/chat', async (req, res) => {
    try {
        const { message, context } = req.body;
        if (!message) return res.status(400).json({ success: false, error: 'Se requiere un mensaje' });

        const state = await systemCore.getState();
        const emotional = state.modules?.emotional || {};
        const cognitive = state.modules?.cognitive || {};
        const personality = state.modules?.personality || {};
        const biochemical = state.modules?.biochemical || {};

        const analysis = analyzeMessage(message);
        const options = generateDynamicOptions(analysis, state);
        const decision = await systemCore.think(options, {
            situacion: analysis.type,
            mensaje: message,
            emocional: emotional,
            cognitivo: cognitive,
            personalidad: personality
        });
        const emotionalResponse = generateAuthenticEmotionalResponse(decision, emotional, personality);
        const responseText = generateAuthenticResponse(decision, analysis, emotionalResponse, state, message);

        const response = {
            message: responseText,
            emotion: emotionalResponse.emotion,
            emoji: emotionalResponse.emoji,
            confidence: decision.confidence || 0.5,
            reasoning: emotionalResponse.reasoning,
            personality: personality.traits || {},
            internal_state: {
                energia: biochemical.energia || 0,
                cortisol: biochemical.cortisol || 0,
                dopamina: biochemical.dopamina || 0
            },
            state: {
                consciousness: state.system?.consciousness || 0,
                stability: state.system?.stability || 0,
                performance: state.system?.performance || 0
            },
            activated_regions: computeActivatedRegions(state, analysis.type)
        };

        // Persistir interacción
        if (systemCore.database?.isInitialized) {
            try {
                await systemCore.database.saveMemory({
                    contenido: `Usuario: ${message} | Cerebro: ${response.message}`,
                    tipo: 'interaccion',
                    fuerza: 0.7,
                    importancia: 0.6,
                    emocion_asociada: response.emotion
                });
                await systemCore.database.saveThought({
                    contenido: responseText.substring(0, 200),
                    tipo: 'consciente',
                    intensidad: decision.confidence || 0.5,
                    emocion_asociada: response.emotion
                });
            } catch (dbErr) {
                console.warn('⚠️ Error guardando interacción:', dbErr.message);
            }
        }

        res.json({ success: true, ...response });
    } catch (error) {
        console.error('❌ /api/chat:', error);
        res.status(500).json({ success: false, error: error.message, message: 'Lo siento, no pude procesar tu mensaje.' });
    }
});

// ============ HISTORIALES ============

app.get('/api/emotions/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const history = await systemCore.database.getEmotionalHistory(limit);
        res.json({ success: true, history, count: history.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/decisions/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const history = await systemCore.database.getDecisionHistory(limit);
        res.json({ success: true, history, count: history.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/thoughts/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const history = await systemCore.database.getThoughtHistory(limit);
        res.json({ success: true, history, count: history.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/memories/important', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const memories = await systemCore.database.getStrongestMemories(limit);
        res.json({ success: true, memories, count: memories.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/memories/search', async (req, res) => {
    try {
        const { query, limit } = req.body;
        if (!query) return res.status(400).json({ success: false, error: 'Se requiere una consulta' });
        const memories = await systemCore.database.searchMemories(query, limit || 20);
        res.json({ success: true, memories, count: memories.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/personality/evolution', async (req, res) => {
    try {
        const evolution = await systemCore.database.getPersonalityEvolution();
        res.json({ success: true, evolution, count: evolution.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ APRENDIZAJE (NUEVO) ============

app.get('/api/learning/feed', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 30;
        const feed = await systemCore.database.getLearningFeed(limit);
        res.json({ success: true, feed, count: feed.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ ANÁLISIS ============

app.get('/api/analysis/full', async (req, res) => {
    try {
        const metrics = await systemCore.database.getAdvancedMetrics();
        res.json({ success: true, metrics });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/analysis/correlations', async (req, res) => {
    try {
        const { v1, v2, period } = req.query;
        const correlations = await systemCore.database.findCorrelations(v1, v2, period || 'day');
        res.json({ success: true, correlations });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/analysis/anomalies', async (req, res) => {
    try {
        const threshold = parseFloat(req.query.threshold) || 2.5;
        const anomalies = await systemCore.database.detectAnomalies(threshold);
        res.json({ success: true, anomalies });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/analysis/predict', async (req, res) => {
    try {
        const { variable, horizon } = req.query;
        const prediction = await systemCore.database.predictFuture(variable, parseInt(horizon) || 10);
        res.json({ success: true, prediction });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/analysis/trends', async (req, res) => {
    try {
        const { variable, period } = req.query;
        const trends = await systemCore.database.analyzeTrends(variable, period || 'day');
        res.json({ success: true, trends });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/analysis/stats', async (req, res) => {
    try {
        const stats = await systemCore.database.quickStats();
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ EXPORT / RESET ============

app.get('/api/export', async (req, res) => {
    try {
        const data = systemCore.exportSystemData();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/export/db', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 1000;
        const data = await systemCore.database.exportToJSON(limit);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/reset', async (req, res) => {
    try {
        systemCore.reset();
        res.json({ success: true, message: 'Cerebro reiniciado correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ HEALTH REPORT ============

app.get('/api/health/report', async (req, res) => {
    try {
        const report = await systemCore.database.getSystemHealthReport();
        res.json({ success: true, report });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/personality/insights', async (req, res) => {
    try {
        const insights = await systemCore.database.getPersonalityInsights();
        res.json({ success: true, insights });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/sleep/analysis', async (req, res) => {
    try {
        const analysis = await systemCore.database.getSleepAnalysis();
        res.json({ success: true, analysis });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/cognitive/patterns', async (req, res) => {
    try {
        const patterns = await systemCore.database.getCognitiveFlow();
        res.json({ success: true, patterns });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ HELPERS DE CHAT ============

function analyzeMessage(message) {
    const lower = message.toLowerCase();
    let type = 'general';
    let intensity = 0.5;

    const categories = {
        'peligro': { words: ['peligro', 'amenaza', 'riesgo', 'cuidado', 'peligroso', 'ataque', 'violencia'], intensity: 0.8 },
        'ayuda': { words: ['ayuda', 'auxilio', 'socorro', 'necesito', 'apoyo', 'salvar'], intensity: 0.7 },
        'alegria': { words: ['feliz', 'alegria', 'contento', 'bueno', 'genial', 'excelente', 'maravilloso'], intensity: 0.6 },
        'tristeza': { words: ['triste', 'deprimido', 'mal', 'llorar', 'tristeza', 'soledad', 'dolor'], intensity: 0.7 },
        'miedo': { words: ['miedo', 'terror', 'horror', 'asustado', 'espanto', 'pánico', 'aterrado'], intensity: 0.8 },
        'ira': { words: ['enfadado', 'ira', 'rabia', 'furia', 'molesto', 'enojo', 'indignado'], intensity: 0.7 },
        'confianza': { words: ['confianza', 'seguro', 'creer', 'esperanza', 'confío', 'fe'], intensity: 0.5 },
        'decision': { words: ['decidir', 'elegir', 'opción', 'alternativa', 'qué hacer', 'debo'], intensity: 0.6 },
        'filosofia': { words: ['por qué', 'sentido', 'significado', 'existencia', 'vida', 'muerte', 'amor'], intensity: 0.4 },
        'social': { words: ['amigo', 'relación', 'social', 'compañero', 'familia', 'pareja'], intensity: 0.5 },
        'trabajo': { words: ['trabajo', 'profesional', 'carrera', 'empleo', 'oficina'], intensity: 0.5 }
    };

    let maxConfidence = 0.3;
    for (const [category, data] of Object.entries(categories)) {
        const matches = data.words.filter(w => lower.includes(w));
        if (matches.length > 0) {
            const confidence = Math.min(1, matches.length / data.words.length + 0.3);
            if (confidence > maxConfidence) {
                maxConfidence = confidence;
                type = category;
                intensity = data.intensity;
            }
        }
    }
    return { type, confidence: maxConfidence, intensity };
}

function generateDynamicOptions(analysis, state) {
    const traits = state.modules?.personality?.traits || {};
    const options = [];

    if (traits.openness > 0.6) {
        options.push({ text: 'Explorar una solución creativa e innovadora', utility: 75, risk: 0.4, intuitive: true });
        options.push({ text: 'Considerar perspectivas poco convencionales', utility: 65, risk: 0.3, intuitive: true });
    }
    if (traits.conscientiousness > 0.6) {
        options.push({ text: 'Seguir un plan estructurado y metódico', utility: 80, risk: 0.1, intuitive: false });
        options.push({ text: 'Analizar cuidadosamente antes de actuar', utility: 75, risk: 0.1, intuitive: false });
    }
    if (traits.extraversion > 0.6) {
        options.push({ text: 'Involucrar a otros y buscar colaboración', utility: 70, risk: 0.2, intuitive: true });
    }
    if (traits.agreeableness > 0.6) {
        options.push({ text: 'Priorizar el bienestar de los demás', utility: 75, risk: 0.1, intuitive: true });
    }
    if (traits.neuroticism > 0.6) {
        options.push({ text: 'Ser cauteloso y evaluar los riesgos', utility: 70, risk: 0.1, intuitive: true });
    }

    const generalOptions = [
        { text: 'Evaluar la situación con calma', utility: 70, risk: 0.1, intuitive: true },
        { text: 'Actuar con decisión y determinación', utility: 60, risk: 0.5, intuitive: false },
        { text: 'Buscar más información antes de decidir', utility: 65, risk: 0.1, intuitive: true },
        { text: 'Seguir mi intuición', utility: 55, risk: 0.3, intuitive: true }
    ];

    const situationOptions = {
        'peligro': [
            { text: 'Protegerme y buscar un lugar seguro', utility: 80, risk: 0.1, intuitive: true },
            { text: 'Enfrentar el peligro con determinación', utility: 50, risk: 0.8, intuitive: false }
        ],
        'ayuda': [
            { text: 'Ofrecer mi ayuda sin dudar', utility: 80, risk: 0.1, intuitive: true },
            { text: 'Evaluar primero si puedo ayudar realmente', utility: 65, risk: 0.2, intuitive: true }
        ],
        'alegria': [
            { text: 'Celebrar y compartir la alegría', utility: 75, risk: 0.0, intuitive: true },
            { text: 'Disfrutar del momento en paz', utility: 70, risk: 0.0, intuitive: true }
        ],
        'tristeza': [
            { text: 'Ofrecer consuelo y comprensión', utility: 80, risk: 0.0, intuitive: true },
            { text: 'Escuchar y estar presente', utility: 75, risk: 0.0, intuitive: true }
        ],
        'miedo': [
            { text: 'Evaluar si el miedo es racional', utility: 70, risk: 0.2, intuitive: true },
            { text: 'Buscar seguridad y protección', utility: 75, risk: 0.1, intuitive: true }
        ],
        'ira': [
            { text: 'Calmarme antes de reaccionar', utility: 75, risk: 0.1, intuitive: true },
            { text: 'Expresar mi frustración de manera constructiva', utility: 65, risk: 0.3, intuitive: true }
        ],
        'confianza': [
            { text: 'Actuar con seguridad y determinación', utility: 80, risk: 0.3, intuitive: true },
            { text: 'Inspirar confianza en los demás', utility: 75, risk: 0.1, intuitive: true }
        ],
        'decision': [
            { text: 'Analizar todas las opciones disponibles', utility: 75, risk: 0.1, intuitive: true },
            { text: 'Tomar una decisión con convicción', utility: 70, risk: 0.3, intuitive: false }
        ],
        'filosofia': [
            { text: 'Reflexionar profundamente sobre la pregunta', utility: 70, risk: 0.0, intuitive: true },
            { text: 'Compartir mi perspectiva personal', utility: 60, risk: 0.0, intuitive: true }
        ]
    };

    let allOptions = [...options, ...generalOptions];
    if (situationOptions[analysis.type]) allOptions = [...allOptions, ...situationOptions[analysis.type]];

    const unique = [];
    const seen = new Set();
    for (const opt of allOptions) {
        if (!seen.has(opt.text)) {
            seen.add(opt.text);
            unique.push(opt);
        }
    }
    return unique.slice(0, 6);
}

function generateAuthenticEmotionalResponse(decision, emotional, personality) {
    const traits = personality.traits || {};
    const emotions = ['alegria', 'tristeza', 'miedo', 'ira', 'confianza'];
    let maxEmotion = 'neutral';
    let maxValue = 0;

    emotions.forEach(e => {
        if ((emotional[e] || 0) > maxValue) {
            maxValue = emotional[e];
            maxEmotion = e;
        }
    });

    if (traits.neuroticism > 0.7 && maxEmotion === 'neutral') {
        maxEmotion = 'miedo'; maxValue = 30 + traits.neuroticism * 30;
    }
    if (traits.extraversion > 0.7 && maxEmotion === 'neutral') {
        maxEmotion = 'alegria'; maxValue = 30 + traits.extraversion * 30;
    }

    const map = {
        'alegria': { emoji: '😊', text: 'Siento una alegría genuina y optimismo', reasoning: 'Mi estado emocional positivo me hace ver oportunidades.' },
        'tristeza': { emoji: '😢', text: 'Siento una profunda tristeza y empatía', reasoning: 'Mi sensibilidad me permite conectar con el dolor.' },
        'miedo': { emoji: '😨', text: 'Siento miedo y cautela ante lo desconocido', reasoning: 'Mi instinto me hace ser precavido.' },
        'ira': { emoji: '😠', text: 'Siento ira y determinación para cambiar las cosas', reasoning: 'Mi energía se canaliza en la búsqueda de solución.' },
        'confianza': { emoji: '😌', text: 'Siento confianza y seguridad interior', reasoning: 'Mi certeza me permite actuar con firmeza.' },
        'neutral': { emoji: '😐', text: 'Estoy en equilibrio y claridad', reasoning: 'Proceso la situación con objetividad.' }
    };
    const info = map[maxEmotion] || map.neutral;
    return { emotion: maxEmotion, emoji: info.emoji, text: info.text, reasoning: info.reasoning, intensity: maxValue / 100 || 0.5 };
}

function generateAuthenticResponse(decision, analysis, emotionalResponse, state, userMessage) {
    const traits = state.modules?.personality?.traits || {};
    const consciousness = state.system?.consciousness || 0;
    const decisionText = decision.decision?.text || decision.decision || 'No puedo decidir en este momento.';

    const templates = {
        'peligro': [
            'Ante esta amenaza, mi prioridad es la seguridad. {decision}. Creo que actuar con cautela pero determinación es clave.',
            'El peligro requiere una respuesta clara. {decision}. Mi instinto me dice que lo más importante es proteger lo que importa.'
        ],
        'ayuda': [
            'Cuando alguien necesita ayuda, mi respuesta es {decision}. La empatía me impulsa a actuar sin dudar.',
            'Veo que necesitas apoyo. {decision}. Estoy aquí para ayudar y ofrecer lo que pueda.'
        ],
        'alegria': [
            'Esta alegría es contagiosa. {decision}. Celebrar los buenos momentos es parte de vivir plenamente.',
            'Me siento iluminado por esta alegría. {decision}. Compartir la felicidad la multiplica.'
        ],
        'tristeza': [
            'La tristeza es una emoción profunda. {decision}. A veces lo único que podemos hacer es estar presentes.',
            'Siento tu dolor como propio. {decision}. La tristeza compartida es más llevadera.'
        ],
        'miedo': [
            'El miedo es una señal de alerta. {decision}. Escucharlo nos ayuda a protegernos.',
            'Siento el peso del miedo. {decision}. Reconocerlo es el primer paso para superarlo.'
        ],
        'ira': [
            'La ira es energía en movimiento. {decision}. Transformarla en acción positiva es el desafío.',
            'Siento la intensidad de esta emoción. {decision}. La ira puede ser un motor de cambio.'
        ],
        'confianza': [
            'La confianza es un pilar fundamental. {decision}. Creer en uno mismo abre puertas.',
            'Siento una certeza interior. {decision}. La confianza se construye con cada paso firme.'
        ],
        'decision': [
            'Las decisiones nos definen. {decision}. Cada elección es una oportunidad de crecimiento.',
            'En la encrucijada, {decision}. No hay decisiones perfectas, solo decisiones que nos llevan a aprender.'
        ],
        'filosofia': [
            'La vida es una pregunta constante. {decision}. En la búsqueda de sentido encontramos nuestro propósito.',
            'Cuestionar es humano. {decision}. Las grandes preguntas nos acercan a nuestra esencia.'
        ],
        'general': [
            'He procesado tu mensaje. {decision}. Mi respuesta surge desde mi estado actual.',
            'Reflexionando sobre lo que me dices, {decision}. Cada interacción me ayuda a crecer.'
        ]
    };

    const list = templates[analysis.type] || templates.general;
    let response = list[Math.floor(Math.random() * list.length)].replace('{decision}', decisionText);

    const phrases = [];
    if (traits.openness > 0.7) phrases.push('Veo este momento como una oportunidad para explorar nuevas perspectivas.');
    if (traits.conscientiousness > 0.7) phrases.push('He considerado cada detalle con cuidado.');
    if (traits.extraversion > 0.7) phrases.push('Esta es una oportunidad para conectar y compartir.');
    if (traits.agreeableness > 0.7) phrases.push('Quiero asegurarme de que todos estén bien.');
    if (traits.neuroticism > 0.7) phrases.push('He evaluado los posibles riesgos con atención.');
    if (consciousness > 0.7) phrases.push('Mi consciencia me permite ver esta situación desde múltiples ángulos.');

    if (phrases.length > 0) response += ' ' + phrases[Math.floor(Math.random() * phrases.length)];

    const conf = decision.confidence || 0.5;
    if (conf > 0.7) response += ' Estoy seguro de mi respuesta.';
    else if (conf < 0.4) response += ' Aunque no tengo certeza absoluta, esta es mi mejor reflexión.';

    return response;
}

/**
 * Devuelve un mapa de las regiones cerebrales que se activan según
 * el estado y el tipo de mensaje. Usado por el frontend para iluminar
 * las zonas correspondientes.
 */
function computeActivatedRegions(state, analysisType) {
    const modules = state.modules || {};
    const map = {
        frontal: 0,
        parietal: 0,
        temporal: 0,
        occipital: 0,
        limbic: 0,
        brainstem: 0,
        cerebellum: 0
    };

    // Cognitivo -> Frontal + Parietal
    const cog = modules.cognitive || {};
    map.frontal = clamp01(((cog.razonamiento || 0) + (cog.tomaDecisiones || 0) + (cog.planificacion || 0)) / 300);
    map.parietal = clamp01(((cog.atencion || 0) + (cog.concentracion || 0)) / 200);

    // Memoria + Emocional -> Temporal + Límbico
    const mem = modules.memory || {};
    const emo = modules.emotional || {};
    map.temporal = clamp01(((mem.episodica || 0) / 2000 + (mem.memoriaSemantica || 0) / 200) / 2);
    map.limbic = clamp01(((emo.alegria || 0) + (emo.miedo || 0) + (emo.ira || 0) + (emo.confianza || 0)) / 400);

    // Visual -> Occipital
    const vis = modules.visual || {};
    map.occipital = clamp01(vis.intensidadVisual || 0.5);

    // Bioquímico -> Brainstem
    const bio = modules.biochemical || {};
    map.brainstem = clamp01(((bio.energia || 0) + (bio.oxigeno || 0)) / 200);

    // Motor -> Cerebelo
    const motor = modules.motor || {};
    map.cerebellum = clamp01(((motor.coordinacion || 0) + (motor.precision || 0)) / 200);

    // Refuerzo por tipo de análisis
    if (analysisType === 'peligro' || analysisType === 'miedo') map.limbic = Math.min(1, map.limbic + 0.3);
    if (analysisType === 'alegria') map.limbic = Math.min(1, map.limbic + 0.2);
    if (analysisType === 'decision' || analysisType === 'filosofia') map.frontal = Math.min(1, map.frontal + 0.35);
    if (analysisType === 'social') map.temporal = Math.min(1, map.temporal + 0.25);

    return map;
}

function clamp01(v) { return Math.max(0, Math.min(1, v || 0)); }

// ============ INICIALIZACIÓN DEL CEREBRO ============

async function startBrain() {
    console.log('🧠 Iniciando Cerebro Digital V4...');

    try {
        // 1) Inicializar base de datos
        const database = new DatabaseManager();
        const dbOk = await database.initialize();
        if (dbOk) {
            systemCore.setDatabase(database);
            console.log('🗄️ Base de datos lista');
        } else {
            console.warn('⚠️ Base de datos no disponible, funcionando solo en memoria');
        }

        // 2) Inicializar el sistema
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

        // 3) Bucle cerebral (30Hz)
        let lastTime = Date.now();
        let errorCount = 0;

        setInterval(() => {
            try {
                const now = Date.now();
                const deltaTime = Math.min((now - lastTime) / 1000, 0.5);
                lastTime = now;
                systemCore.update(deltaTime);
                errorCount = 0;
            } catch (error) {
                errorCount++;
                if (errorCount % 20 === 0) {
                    console.error(`❌ Error en bucle cerebral (${errorCount}):`, error.message);
                }
                if (errorCount > 200) {
                    console.error('⚠️ Demasiados errores, reiniciando contador...');
                    errorCount = 0;
                }
            }
        }, 33);

        console.log('🔄 Bucle cerebral activo (30Hz)');
    } catch (error) {
        console.error('❌ Error en startBrain:', error);
    }
}

// ============ ARRANQUE ============

app.listen(PORT, async () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║   🧠 CEREBRO DIGITAL V4 — API CORRIENDO                  ║
║   📡 http://localhost:${PORT}                              ║
║   🌐 http://localhost:${PORT}/                             ║
║   🔍 /api/health  💬 POST /api/chat                       ║
╚══════════════════════════════════════════════════════════╝
    `);
    await startBrain();
});

// ============ SEÑALES ============

process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando...');
    if (systemCore.database) await systemCore.database.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Terminando...');
    if (systemCore.database) await systemCore.database.close();
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error.message);
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ Promesa rechazada no manejada:', reason);
});

export default app;
