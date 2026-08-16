// server.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { brain } from './src/core/SystemCore.js';

// Importar todos los módulos
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ============ RUTAS API DEL CEREBRO ============

// Estado completo
app.get('/api/state', async (req, res) => {
    try {
        const state = await brain.getState();
        const metrics = await brain.getMetrics();
        res.json({ 
            success: true, 
            state,
            metrics,
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Métricas
app.get('/api/metrics', async (req, res) => {
    try {
        const metrics = await brain.getMetrics();
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
        const result = await brain.think(options, context);
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
        const result = await brain.remember(query);
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
        const result = await brain.learn(skill, context, success !== undefined ? success : true);
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
        brain.applySituation(type, intensity || 1.0);
        res.json({ success: true, message: `Situación ${type} aplicada` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Historial emocional
app.get('/api/emotions/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const history = await brain.database.getEmotionalHistory(limit);
        res.json({ success: true, history, count: history.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Historial de decisiones
app.get('/api/decisions/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const history = await brain.database.getDecisionHistory(limit);
        res.json({ success: true, history, count: history.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Historial de pensamientos
app.get('/api/thoughts/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const history = await brain.database.getThoughtHistory(limit);
        res.json({ success: true, history, count: history.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Memorias importantes
app.get('/api/memories/important', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const memories = await brain.database.getStrongestMemories(limit);
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
        const memories = await brain.database.searchMemories(query, limit || 20);
        res.json({ success: true, memories, count: memories.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Evolución de personalidad
app.get('/api/personality/evolution', async (req, res) => {
    try {
        const evolution = await brain.database.getPersonalityEvolution();
        res.json({ success: true, evolution, count: evolution.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Exportar datos completos
app.get('/api/export', async (req, res) => {
    try {
        const data = await brain.exportData();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Reset del cerebro
app.post('/api/reset', async (req, res) => {
    try {
        brain.reset();
        res.json({ success: true, message: 'Cerebro reiniciado correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Estado de salud
app.get('/api/health', async (req, res) => {
    try {
        const state = await brain.getState();
        res.json({
            success: true,
            status: brain.systemState.emergency ? 'emergency' : 'operational',
            stability: brain.systemState.stability,
            consciousness: brain.systemState.consciousnessLevel,
            cycles: brain.cycleCount,
            modules: Array.from(brain.modules.keys()),
            database: brain.database.isInitialized
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener análisis completo
app.get('/api/analysis/full', async (req, res) => {
    try {
        const metrics = await brain.database.getAdvancedMetrics();
        res.json({ success: true, metrics });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener correlaciones
app.get('/api/analysis/correlations', async (req, res) => {
    try {
        const { v1, v2, period } = req.query;
        const correlations = await brain.database.findCorrelations(v1, v2, period || 'day');
        res.json({ success: true, correlations });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener anomalías
app.get('/api/analysis/anomalies', async (req, res) => {
    try {
        const threshold = parseFloat(req.query.threshold) || 2.5;
        const anomalies = await brain.database.detectAnomalies(threshold);
        res.json({ success: true, anomalies });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener predicciones
app.get('/api/analysis/predict', async (req, res) => {
    try {
        const { variable, horizon } = req.query;
        const prediction = await brain.database.predictFuture(variable, parseInt(horizon) || 10);
        res.json({ success: true, prediction });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener tendencias
app.get('/api/analysis/trends', async (req, res) => {
    try {
        const { variable, period } = req.query;
        const trends = await brain.database.analyzeTrends(variable, period || 'day');
        res.json({ success: true, trends });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener estadísticas completas
app.get('/api/analysis/stats', async (req, res) => {
    try {
        const stats = await brain.database.quickStats();
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Exportar datos
app.get('/api/export/db', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 1000;
        const data = await brain.database.exportToJSON(limit);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener salud del sistema
app.get('/api/health/report', async (req, res) => {
    try {
        const report = await brain.database.getSystemHealthReport();
        res.json({ success: true, report });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener insights de personalidad
app.get('/api/personality/insights', async (req, res) => {
    try {
        const insights = await brain.database.getPersonalityInsights();
        res.json({ success: true, insights });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener análisis de sueño
app.get('/api/sleep/analysis', async (req, res) => {
    try {
        const analysis = await brain.database.getSleepAnalysis();
        res.json({ success: true, analysis });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener patrones cognitivos
app.get('/api/cognitive/patterns', async (req, res) => {
    try {
        const patterns = await brain.database.getCognitiveFlow();
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
    
    const initialized = await brain.initializeSystem();
    if (initialized) {
        console.log('✅ Cerebro inicializado correctamente');
        console.log(`🌀 Nivel de consciencia: ${(brain.systemState.consciousnessLevel * 100).toFixed(1)}%`);
        console.log(`📊 Estabilidad: ${(brain.systemState.stability * 100).toFixed(1)}%`);
        
        // Iniciar el bucle cerebral
        let lastTime = Date.now();
        setInterval(() => {
            const now = Date.now();
            const deltaTime = (now - lastTime) / 1000;
            lastTime = now;
            brain.update(deltaTime);
        }, 33); // ~30Hz
        
        console.log('🔄 Bucle cerebral activo (30Hz)');
    } else {
        console.error('❌ Error inicializando el cerebro');
        process.exit(1);
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
║   📊 Estado: Inicializando...                           ║
║                                                          ║
║   📋 Endpoints disponibles:                             ║
║   ────────────────────────────────────────────────────   ║
║   GET  /api/state           - Estado completo           ║
║   GET  /api/metrics         - Métricas del sistema      ║
║   POST /api/think           - Tomar decisión            ║
║   POST /api/remember        - Recordar algo             ║
║   POST /api/learn           - Aprender algo             ║
║   POST /api/situation       - Aplicar situación         ║
║   GET  /api/emotions/history - Historial emocional      ║
║   GET  /api/decisions/history - Historial decisiones    ║
║   GET  /api/thoughts/history - Historial pensamientos   ║
║   GET  /api/memories/important - Memorias importantes   ║
║   POST /api/memories/search - Buscar memorias           ║
║   GET  /api/personality/evolution - Evolución personalidad ║
║   GET  /api/export          - Exportar datos            ║
║   POST /api/reset           - Reiniciar cerebro         ║
║   GET  /api/health          - Estado de salud           ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
    `);
    
    await startBrain();
});

// ============ MANEJO DE SEÑALES ============

process.on('SIGINT', async () => {
    console.log('\n🛑 Recibida señal de interrupción');
    console.log('💾 Guardando estado final...');
    await brain.database.close();
    console.log('👋 Cerebro apagado correctamente');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Recibida señal de terminación');
    console.log('💾 Guardando estado final...');
    await brain.database.close();
    console.log('👋 Cerebro apagado correctamente');
    process.exit(0);
});
