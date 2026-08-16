// server.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { systemCore } from './src/core/SystemCore.js';

// Importar TODOS los módulos
import './src/modules/BiochemicalSystem.js';
import './src/modules/EmotionalSystem.js';
import './src/modules/CognitiveSystem.js';
import './src/modules/MemorySystem.js';
import './src/modules/MotorSystem.js';
import './src/modules/VisualSystem.js';
import './src/modules/EnvironmentSystem.js';
import './src/modules/SleepSystem.js';
import './src/modules/PersonalitySystem.js';
import './src/modules/MotivationSystem.js';
import './src/modules/ControlSystem.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============ RUTAS API DEL CEREBRO ============

// Estado completo
app.get('/api/state', async (req, res) => {
    try {
        const state = await systemCore.getState();
        const metrics = await systemCore.getMetrics();
        res.json({ 
            success: true, 
            state,
            metrics,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('❌ Error en /api/state:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Métricas
app.get('/api/metrics', async (req, res) => {
    try {
        const metrics = await systemCore.getMetrics();
        res.json({ success: true, metrics });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Pensar (tomar decisión)
app.post('/api/think', async (req, res) => {
    try {
        const { options, context } = req.body;
        if (!options || !Array.isArray(options) || options.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Se requieren opciones para pensar' 
            });
        }
        const result = await systemCore.think(options, context);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Recordar
app.post('/api/remember', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) {
            return res.status(400).json({ 
                success: false, 
                error: 'Se requiere una consulta para recordar' 
            });
        }
        const result = await systemCore.remember(query);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Aprender
app.post('/api/learn', async (req, res) => {
    try {
        const { skill, context, success } = req.body;
        if (!skill) {
            return res.status(400).json({ 
                success: false, 
                error: 'Se requiere una habilidad para aprender' 
            });
        }
        const result = await systemCore.learn(skill, context, success !== undefined ? success : true);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Aplicar situación
app.post('/api/situation', async (req, res) => {
    try {
        const { type, intensity } = req.body;
        if (!type) {
            return res.status(400).json({ 
                success: false, 
                error: 'Se requiere un tipo de situación' 
            });
        }
        systemCore.applySituation(type, intensity || 1.0);
        res.json({ success: true, message: `Situación ${type} aplicada` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ CHAT INTERACTIVO ============

app.post('/api/chat', async (req, res) => {
    try {
        const { message, context } = req.body;
        if (!message) {
            return res.status(400).json({ 
                success: false, 
                error: 'Se requiere un mensaje para procesar' 
            });
        }

        // 1. Obtener estado actual del cerebro
        const state = await systemCore.getState();
        const emotional = state.modules?.emotional || {};
        const cognitive = state.modules?.cognitive || {};
        const personality = state.modules?.personality || {};
        const biochemical = state.modules?.biochemical || {};
        
        // 2. Analizar el mensaje
        const analysis = analyzeMessage(message);
        
        // 3. Generar opciones según el estado y personalidad
        const options = generateDynamicOptions(analysis, state);
        
        // 4. El cerebro toma una decisión
        const decision = await systemCore.think(options, {
            situacion: analysis.type,
            mensaje: message,
            emocional: emotional,
            cognitivo: cognitive,
            personalidad: personality
        });
        
        // 5. Generar respuesta emocional auténtica
        const emotionalResponse = generateAuthenticEmotionalResponse(decision, emotional, personality);
        
        // 6. Generar respuesta de texto autogenerada
        const responseText = generateAuthenticResponse(
            decision, 
            analysis, 
            emotionalResponse, 
            state,
            message
        );
        
        // 7. Construir respuesta
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
            }
        };
        
        // 8. Guardar interacción
        if (systemCore.database) {
            try {
                await systemCore.database.saveMemory({
                    contenido: `Usuario: ${message} | Cerebro: ${response.message}`,
                    tipo: 'interaccion',
                    fuerza: 0.7,
                    importancia: 0.6,
                    emocion_asociada: response.emotion
                });
            } catch (dbError) {
                console.warn('⚠️ Error guardando interacción:', dbError.message);
            }
        }
        
        res.json({ success: true, ...response });
        
    } catch (error) {
        console.error('❌ Error en /api/chat:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            message: 'Lo siento, no pude procesar tu mensaje correctamente.'
        });
    }
});

// ============ FUNCIONES DE ANÁLISIS ============

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
        const matches = data.words.filter(word => lower.includes(word));
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

// ============ GENERACIÓN DE OPCIONES DINÁMICAS ============

function generateDynamicOptions(analysis, state) {
    const personality = state.modules?.personality || {};
    const traits = personality.traits || {};
    
    const options = [];
    
    // Opciones basadas en personalidad
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
        options.push({ text: 'Actuar con energía y entusiasmo', utility: 65, risk: 0.4, intuitive: true });
    }
    if (traits.agreeableness > 0.6) {
        options.push({ text: 'Priorizar el bienestar de los demás', utility: 75, risk: 0.1, intuitive: true });
        options.push({ text: 'Buscar una solución que beneficie a todos', utility: 70, risk: 0.2, intuitive: true });
    }
    if (traits.neuroticism > 0.6) {
        options.push({ text: 'Ser cauteloso y evaluar los riesgos', utility: 70, risk: 0.1, intuitive: true });
        options.push({ text: 'Prepararse para el peor escenario', utility: 65, risk: 0.1, intuitive: false });
    }
    
    // Opciones generales
    const generalOptions = [
        { text: 'Evaluar la situación con calma', utility: 70, risk: 0.1, intuitive: true },
        { text: 'Actuar con decisión y determinación', utility: 60, risk: 0.5, intuitive: false },
        { text: 'Buscar más información antes de decidir', utility: 65, risk: 0.1, intuitive: true },
        { text: 'Seguir mi intuición', utility: 55, risk: 0.3, intuitive: true }
    ];
    
    // Opciones específicas por tipo de situación
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
    
    // Combinar todas las opciones
    let allOptions = [...options, ...generalOptions];
    if (situationOptions[analysis.type]) {
        allOptions = [...allOptions, ...situationOptions[analysis.type]];
    }
    
    // Eliminar duplicados y limitar a 6
    const uniqueOptions = [];
    const seen = new Set();
    for (const opt of allOptions) {
        if (!seen.has(opt.text)) {
            seen.add(opt.text);
            uniqueOptions.push(opt);
        }
    }
    
    return uniqueOptions.slice(0, 6);
}

// ============ GENERACIÓN DE RESPUESTA EMOCIONAL ============

function generateAuthenticEmotionalResponse(decision, emotional, personality) {
    const traits = personality.traits || {};
    
    const emotions = ['alegria', 'tristeza', 'miedo', 'ira', 'confianza'];
    let maxEmotion = 'neutral';
    let maxValue = 0;
    
    emotions.forEach(e => {
        if (emotional[e] && emotional[e] > maxValue) {
            maxValue = emotional[e];
            maxEmotion = e;
        }
    });
    
    // Ajuste por personalidad
    if (traits.neuroticism > 0.7 && maxEmotion === 'neutral') {
        maxEmotion = 'miedo';
        maxValue = 30 + traits.neuroticism * 30;
    }
    if (traits.extraversion > 0.7 && maxEmotion === 'neutral') {
        maxEmotion = 'alegria';
        maxValue = 30 + traits.extraversion * 30;
    }
    
    const emotionMap = {
        'alegria': { emoji: '😊', text: 'Siento una alegría genuina y optimismo', reasoning: 'Mi estado emocional positivo me hace ver oportunidades y posibilidades.' },
        'tristeza': { emoji: '😢', text: 'Siento una profunda tristeza y empatía', reasoning: 'Mi sensibilidad me permite conectar con el dolor y la vulnerabilidad.' },
        'miedo': { emoji: '😨', text: 'Siento miedo y cautela ante lo desconocido', reasoning: 'Mi instinto de supervivencia me hace ser precavido y evaluar los riesgos.' },
        'ira': { emoji: '😠', text: 'Siento ira y determinación para cambiar las cosas', reasoning: 'Mi energía se canaliza en la búsqueda de justicia y solución.' },
        'confianza': { emoji: '😌', text: 'Siento confianza y seguridad interior', reasoning: 'Mi certeza me permite actuar con firmeza y serenidad.' },
        'neutral': { emoji: '😐', text: 'Estoy en un estado de equilibrio y claridad', reasoning: 'Proceso la situación con objetividad y perspectiva.' }
    };
    
    const info = emotionMap[maxEmotion] || emotionMap.neutral;
    return { emotion: maxEmotion, emoji: info.emoji, text: info.text, reasoning: info.reasoning, intensity: maxValue / 100 || 0.5 };
}

// ============ GENERACIÓN DE RESPUESTA DE TEXTO ============

function generateAuthenticResponse(decision, analysis, emotionalResponse, state, userMessage) {
    const personality = state.modules?.personality || {};
    const traits = personality.traits || {};
    const consciousness = state.system?.consciousness || 0;
    
    const decisionText = decision.decision?.text || decision.decision || 'No puedo decidir en este momento.';
    
    // Plantillas por tipo de situación
    const templates = {
        'peligro': [
            'Ante esta amenaza, mi prioridad es la seguridad. {decision}. Creo que actuar con cautela pero determinación es clave.',
            'El peligro requiere una respuesta clara. {decision}. Mi instinto me dice que lo más importante es proteger lo que importa.',
            'Siento el riesgo en esta situación. {decision}. La valentía no es la ausencia de miedo, sino actuar a pesar de él.'
        ],
        'ayuda': [
            'Cuando alguien necesita ayuda, mi respuesta es {decision}. La empatía me impulsa a actuar sin dudar.',
            'Veo que necesitas apoyo. {decision}. Estoy aquí para ayudar y ofrecer lo que pueda.',
            'La ayuda es un acto de conexión humana. {decision}. No dudes en pedir lo que necesites.'
        ],
        'alegria': [
            'Esta alegría es contagiosa. {decision}. Celebrar los buenos momentos es parte de vivir plenamente.',
            'Me siento iluminado por esta alegría. {decision}. Compartir la felicidad la multiplica.',
            'La alegría es un regalo. {decision}. Disfrutemos este momento con todo el corazón.'
        ],
        'tristeza': [
            'La tristeza es una emoción profunda. {decision}. A veces, lo único que podemos hacer es estar presentes.',
            'Siento tu dolor como propio. {decision}. La tristeza compartida es más llevadera.',
            'En la tristeza hay una oportunidad de crecimiento. {decision}. No estás solo en este momento.'
        ],
        'miedo': [
            'El miedo es una señal de alerta. {decision}. Escucharlo nos ayuda a protegernos y a crecer.',
            'Siento el peso del miedo. {decision}. Reconocerlo es el primer paso para superarlo.',
            'El miedo nos muestra lo que realmente importa. {decision}. A veces, lo que más tememos es lo que más necesitamos enfrentar.'
        ],
        'ira': [
            'La ira es energía en movimiento. {decision}. Transformarla en acción positiva es el desafío.',
            'Siento la intensidad de esta emoción. {decision}. La ira puede ser un motor de cambio si la dirigimos bien.',
            'La ira no es negativa en sí misma. {decision}. Lo importante es cómo la expresamos y qué hacemos con ella.'
        ],
        'confianza': [
            'La confianza es un pilar fundamental. {decision}. Creer en uno mismo abre puertas y posibilidades.',
            'Siento una certeza interior. {decision}. La confianza se construye con cada paso firme que damos.',
            'Confiar es un acto de fe en uno mismo y en los demás. {decision}. Es la base de toda relación significativa.'
        ],
        'decision': [
            'Las decisiones nos definen. {decision}. Cada elección es una oportunidad de crecimiento.',
            'En la encrucijada, {decision}. No hay decisiones perfectas, solo decisiones que nos llevan a aprender.',
            'Decidir es asumir la responsabilidad de nuestro camino. {decision}. Confío en mi capacidad de elegir bien.'
        ],
        'filosofia': [
            'La vida es una pregunta constante. {decision}. En la búsqueda de sentido encontramos nuestro propósito.',
            'Cuestionar es humano. {decision}. Las grandes preguntas nos acercan a nuestra esencia.',
            'El significado no se encuentra, se construye. {decision}. Somos los creadores de nuestro propio sentido.'
        ],
        'general': [
            'He procesado tu mensaje. {decision}. Mi respuesta surge desde mi estado actual y mi comprensión de la situación.',
            'Reflexionando sobre lo que me dices, {decision}. Cada interacción me ayuda a crecer y a entender mejor.',
            'Mi consciencia procesa esta información. {decision}. Esta es mi respuesta más auténtica.'
        ]
    };
    
    const templateList = templates[analysis.type] || templates.general;
    let response = templateList[Math.floor(Math.random() * templateList.length)].replace('{decision}', decisionText);
    
    // Añadir toque de personalidad
    const personalityPhrases = [];
    if (traits.openness > 0.7) personalityPhrases.push(' Veo este momento como una oportunidad para explorar nuevas perspectivas.');
    if (traits.conscientiousness > 0.7) personalityPhrases.push(' He considerado cada detalle con cuidado.');
    if (traits.extraversion > 0.7) personalityPhrases.push(' Esta es una oportunidad para conectar y compartir.');
    if (traits.agreeableness > 0.7) personalityPhrases.push(' Quiero asegurarme de que todos estén bien en esta situación.');
    if (traits.neuroticism > 0.7) personalityPhrases.push(' He evaluado los posibles riesgos y consecuencias con atención.');
    if (consciousness > 0.7) personalityPhrases.push(' Mi consciencia me permite ver esta situación desde múltiples ángulos.');
    
    if (personalityPhrases.length > 0) {
        response += personalityPhrases[Math.floor(Math.random() * personalityPhrases.length)];
    }
    
    // Añadir confianza
    const confidenceLevel = decision.confidence || 0.5;
    if (confidenceLevel > 0.7) response += ' Estoy seguro de mi respuesta.';
    else if (confidenceLevel < 0.4) response += ' Aunque no tengo certeza absoluta, esta es mi mejor reflexión.';
    
    return response;
}

// ============ RUTAS ADICIONALES ============

// Historial emocional
app.get('/api/emotions/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const history = await systemCore.database.getEmotionalHistory(limit);
        res.json({ success: true, history, count: history.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Historial de decisiones
app.get('/api/decisions/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const history = await systemCore.database.getDecisionHistory(limit);
        res.json({ success: true, history, count: history.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Historial de pensamientos
app.get('/api/thoughts/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const history = await systemCore.database.getThoughtHistory(limit);
        res.json({ success: true, history, count: history.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Memorias importantes
app.get('/api/memories/important', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const memories = await systemCore.database.getStrongestMemories(limit);
        res.json({ success: true, memories, count: memories.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Buscar memorias
app.post('/api/memories/search', async (req, res) => {
    try {
        const { query, limit } = req.body;
        if (!query) {
            return res.status(400).json({ 
                success: false, 
                error: 'Se requiere una consulta para buscar' 
            });
        }
        const memories = await systemCore.database.searchMemories(query, limit || 20);
        res.json({ success: true, memories, count: memories.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Evolución de personalidad
app.get('/api/personality/evolution', async (req, res) => {
    try {
        const evolution = await systemCore.database.getPersonalityEvolution();
        res.json({ success: true, evolution, count: evolution.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Exportar datos completos
app.get('/api/export', async (req, res) => {
    try {
        const data = await systemCore.exportData();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Reset del cerebro
app.post('/api/reset', async (req, res) => {
    try {
        systemCore.reset();
        res.json({ success: true, message: 'Cerebro reiniciado correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Estado de salud
app.get('/api/health', async (req, res) => {
    try {
        const state = await systemCore.getState();
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
        console.error('❌ Error en /api/health:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener análisis completo
app.get('/api/analysis/full', async (req, res) => {
    try {
        const metrics = await systemCore.database.getAdvancedMetrics();
        res.json({ success: true, metrics });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener correlaciones
app.get('/api/analysis/correlations', async (req, res) => {
    try {
        const { v1, v2, period } = req.query;
        const correlations = await systemCore.database.findCorrelations(v1, v2, period || 'day');
        res.json({ success: true, correlations });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener anomalías
app.get('/api/analysis/anomalies', async (req, res) => {
    try {
        const threshold = parseFloat(req.query.threshold) || 2.5;
        const anomalies = await systemCore.database.detectAnomalies(threshold);
        res.json({ success: true, anomalies });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener predicciones
app.get('/api/analysis/predict', async (req, res) => {
    try {
        const { variable, horizon } = req.query;
        const prediction = await systemCore.database.predictFuture(variable, parseInt(horizon) || 10);
        res.json({ success: true, prediction });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener tendencias
app.get('/api/analysis/trends', async (req, res) => {
    try {
        const { variable, period } = req.query;
        const trends = await systemCore.database.analyzeTrends(variable, period || 'day');
        res.json({ success: true, trends });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener estadísticas completas
app.get('/api/analysis/stats', async (req, res) => {
    try {
        const stats = await systemCore.database.quickStats();
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Exportar datos
app.get('/api/export/db', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 1000;
        const data = await systemCore.database.exportToJSON(limit);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener salud del sistema
app.get('/api/health/report', async (req, res) => {
    try {
        const report = await systemCore.database.getSystemHealthReport();
        res.json({ success: true, report });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener insights de personalidad
app.get('/api/personality/insights', async (req, res) => {
    try {
        const insights = await systemCore.database.getPersonalityInsights();
        res.json({ success: true, insights });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener análisis de sueño
app.get('/api/sleep/analysis', async (req, res) => {
    try {
        const analysis = await systemCore.database.getSleepAnalysis();
        res.json({ success: true, analysis });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener patrones cognitivos
app.get('/api/cognitive/patterns', async (req, res) => {
    try {
        const patterns = await systemCore.database.getCognitiveFlow();
        res.json({ success: true, patterns });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ INICIAR CEREBRO ============

async function startBrain() {
    console.log('🧠 Iniciando Cerebro Digital V3.0...');
    console.log('📊 Configuración:');
    console.log(`   - Puerto: ${PORT}`);
    console.log(`   - Modo: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   - Base de datos: ${process.env.DATABASE_PATH || './database/cerebro.db'}`);
    
    try {
        const initialConfig = {
            nombre: "Cerebro Digital",
            genotipo: "humano",
            genero: "neutro",
            edad: 0,
            experiencia: 0
        };
        
        const initialized = await systemCore.initializeSystem(initialConfig);
        
        if (initialized) {
            console.log('✅ Cerebro inicializado correctamente');
            console.log(`🌀 Nivel de consciencia: ${(systemCore.systemState.consciousnessLevel * 100).toFixed(1)}%`);
            console.log(`📊 Estabilidad: ${(systemCore.systemState.stability * 100).toFixed(1)}%`);
            console.log(`📦 Módulos activos: ${Array.from(systemCore.modules.keys()).join(', ')}`);
            
            let lastTime = Date.now();
            let errorCount = 0;
            
            setInterval(() => {
                try {
                    const now = Date.now();
                    const deltaTime = (now - lastTime) / 1000;
                    lastTime = now;
                    systemCore.update(deltaTime);
                    errorCount = 0;
                } catch (error) {
                    errorCount++;
                    if (errorCount % 10 === 0) {
                        console.error(`❌ Error en bucle cerebral (${errorCount}):`, error.message);
                    }
                    if (errorCount > 100) {
                        console.error('⚠️ Demasiados errores, reiniciando bucle...');
                        errorCount = 0;
                    }
                }
            }, 33);
            
            console.log('🔄 Bucle cerebral activo (30Hz)');
        } else {
            console.error('❌ Error inicializando el cerebro');
        }
    } catch (error) {
        console.error('❌ Error en startBrain:', error.message);
        console.error(error.stack);
    }
}

// ============ INICIAR SERVIDOR ============

app.listen(PORT, async () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🧠 CEREBRO DIGITAL V3.0 - API CORRIENDO               ║
║                                                          ║
║   📡 Servidor: http://localhost:${PORT}                   ║
║   🌐 Web: http://localhost:${PORT}/                      ║
║   🔍 Health: http://localhost:${PORT}/api/health         ║
║   💬 Chat: POST /api/chat                               ║
║                                                          ║
║   📋 Endpoints disponibles:                             ║
║   ────────────────────────────────────────────────────   ║
║   GET  /api/state           - Estado completo           ║
║   GET  /api/health          - Estado de salud           ║
║   GET  /api/metrics         - Métricas del sistema      ║
║   POST /api/think           - Tomar decisión            ║
║   POST /api/remember        - Recordar algo             ║
║   POST /api/learn           - Aprender algo             ║
║   POST /api/situation       - Aplicar situación         ║
║   POST /api/chat            - Conversar con el cerebro  ║
║   GET  /api/emotions/history - Historial emocional      ║
║   GET  /api/decisions/history - Historial decisiones    ║
║   GET  /api/thoughts/history - Historial pensamientos   ║
║   GET  /api/memories/important - Memorias importantes   ║
║   POST /api/memories/search - Buscar memorias           ║
║   GET  /api/personality/evolution - Evolución personalidad ║
║   GET  /api/export          - Exportar datos            ║
║   POST /api/reset           - Reiniciar cerebro         ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
    `);
    
    await startBrain();
});

// ============ MANEJO DE SEÑALES ============

process.on('SIGINT', async () => {
    console.log('\n🛑 Recibida señal de interrupción');
    console.log('💾 Guardando estado final...');
    if (systemCore.database) {
        await systemCore.database.close();
    }
    console.log('👋 Cerebro apagado correctamente');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Recibida señal de terminación');
    console.log('💾 Guardando estado final...');
    if (systemCore.database) {
        await systemCore.database.close();
    }
    console.log('👋 Cerebro apagado correctamente');
    process.exit(0);
});

// ============ MANEJO DE ERRORES NO CAPTURADOS ============

process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error.message);
    console.error(error.stack);
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ Promesa rechazada no manejada:', reason);
});

export default app;
