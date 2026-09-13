// src/core/SystemCore.js
// Núcleo central que coordina todos los módulos — V4

export class SystemCore {
    constructor() {
        this.modules = new Map();
        this.isRunning = false;
        this.autoEvolution = true;
        this.characterConfig = null;
        this.systemTime = 0;
        this.cycleCount = 0;
        this.eventBus = (typeof EventTarget !== 'undefined') ? new EventTarget() : null;
        this.eventHistory = [];
        this.database = null;
        this.eventListeners = [];

        this.statistics = {
            stabilityHistory: [],
            performanceHistory: [],
            emotionalStability: [],
            cognitiveEfficiency: [],
            consciousnessLevels: [],
            patterns: { daily: {}, weekly: {}, monthly: {} },
            predictions: { nextState: {}, riskAssessment: 0.2, growthPotential: 0.7 }
        };

        this.alerts = {
            thresholds: {
                critical: {
                    oxygen: 15,
                    energy: 10,
                    cortisol: 85,
                    stability: 30
                },
                warning: {
                    oxygen: 25,
                    energy: 20,
                    cortisol: 70,
                    stability: 50
                }
            },
            history: [],
            activeAlerts: []
        };

        // El orden importa: los módulos base se inicializan primero
        this.initOrder = [
            'environment',
            'personality',
            'biochemical',
            'emotional',
            'cognitive',
            'memory',
            'motivation',
            'sleep',
            'motor',
            'visual',
            'control'
        ];

        this.initializeCore();
    }

    initializeCore() {
        this.coreConfig = {
            updateFrequency: 30,
            maxCycleHistory: 2000,
            emergencyThreshold: 0.85,
            learningRate: 0.1,
            homeostasisRate: 0.05,
            consciousnessThreshold: 0.3
        };

        this.systemState = {
            stability: 1.0,
            integrity: 1.0,
            performance: 1.0,
            emergency: false,
            consciousnessLevel: 0.0,
            lastCriticalEvent: null
        };

        this.cycleHistory = [];
        this.pendingEvents = [];

        this.humanParameters = {
            learningRate: 0.15,
            neuroplasticity: 0.8,
            consciousnessGrowth: 0.01
        };
    }

    // ==================== REGISTRO DE MÓDULOS ====================

    registerModule(name, module) {
        this.modules.set(name, module);
        this.logSystem(`Módulo registrado: ${name}`);
        return module;
    }

    setDatabase(database) {
        this.database = database;
        this.logSystem('Base de datos vinculada al núcleo');
    }

    // ==================== EVENTOS ====================

    onEvent(callback) {
        if (typeof callback === 'function') this.eventListeners.push(callback);
    }

    emitEvent(type, data) {
        const payload = { type, data, time: this.systemTime };
        this.eventListeners.forEach(cb => {
            try { cb(payload); }
            catch (err) { console.error('❌ Listener error:', err); }
        });
        if (this.eventBus?.dispatchEvent && typeof CustomEvent !== 'undefined') {
            try {
                this.eventBus.dispatchEvent(new CustomEvent(type, { detail: data }));
            } catch (_) { /* noop en Node */ }
        }
    }

    dispatchEvent(type, data) {
        this.emitEvent(type, data);
    }

    // ==================== INICIALIZACIÓN ====================

    async initializeSystem(characterConfig) {
        this.characterConfig = characterConfig || {
            nombre: 'Cerebro Digital',
            genotipo: 'humano',
            genero: 'neutro',
            edad: 0,
            experiencia: 0
        };

        try {
            const missing = this.initOrder.filter(name => !this.modules.has(name));
            if (missing.length > 0) {
                this.logSystem(`Módulos faltantes: ${missing.join(', ')}`, 'warning');
            }

            for (const moduleName of this.initOrder) {
                const module = this.modules.get(moduleName);
                if (module && typeof module.initialize === 'function') {
                    try {
                        await module.initialize(this.characterConfig);
                        this.logSystem(`Módulo inicializado: ${moduleName}`);
                    } catch (error) {
                        this.logSystem(`Error inicializando ${moduleName}: ${error.message}`, 'error');
                        console.error(error.stack);
                    }
                }
            }

            this.setupEventListeners();
            this.isRunning = true;
            this.logSystem('Sistema nervioso central V4 inicializado completamente');

            this.dispatchEvent('system_initialized', {
                config: this.characterConfig,
                modules: Array.from(this.modules.keys())
            });

            return true;
        } catch (error) {
            this.logSystem(`Error en inicialización: ${error.message}`, 'error');
            return false;
        }
    }

    setupEventListeners() {
        this.modules.forEach((module, name) => {
            if (module && typeof module.onEvent === 'function') {
                module.onEvent((event) => this.handleModuleEvent(name, event));
            }
        });
    }

    handleModuleEvent(moduleName, event) {
        const record = { module: moduleName, event, timestamp: this.systemTime };
        this.eventHistory.push(record);
        if (this.eventHistory.length > 1000) this.eventHistory.shift();

        if (event?.type === 'critical') {
            this.handleCriticalEvent(moduleName, event);
        }
    }

    handleCriticalEvent(moduleName, event) {
        this.systemState.lastCriticalEvent = {
            module: moduleName,
            event,
            time: this.systemTime
        };
        this.dispatchEvent('critical_event', { module: moduleName, event });
        if ((event?.severity || 0) > 0.8) this.triggerEmergencyProtocol();
    }

    // ==================== BUCLE PRINCIPAL ====================

    update(deltaTime) {
        if (!this.isRunning || this.systemState.emergency) return;

        this.systemTime += deltaTime;
        this.cycleCount++;

        try {
            const input = this.collectSystemInput();
            const results = this.processCascade(input, deltaTime);

            this.applyGlobalHomeostasis(deltaTime);
            this.checkSystemHealth(results);
            if (this.autoEvolution) this.autoEvolve(results);

            this.updateStatistics(results);
            this.checkAlerts(results);
            this.updateConsciousness(results);
            this.recordCycle(results);
        } catch (error) {
            this.logSystem(`Error en ciclo de actualización: ${error.message}`, 'error');
            console.error(error.stack);
            this.triggerEmergencyProtocol();
        }
    }

    collectSystemInput() {
        return {
            biochemical: this.modules.get('biochemical')?.getState() || {},
            emotional: this.modules.get('emotional')?.getState() || {},
            cognitive: this.modules.get('cognitive')?.getState() || {},
            personality: this.modules.get('personality')?.getState() || {},
            environmental: this.modules.get('environment')?.getState() || {},
            motivation: this.modules.get('motivation')?.getState() || {},
            memory: this.modules.get('memory')?.getState() || {},
            motor: this.modules.get('motor')?.getState() || {},
            sleep: this.modules.get('sleep')?.getState() || {},
            visual: this.modules.get('visual')?.getState() || {},
            time: this.systemTime,
            cycle: this.cycleCount
        };
    }

    processCascade(input, deltaTime) {
        const results = {};
        const M = this.modules;

        const env = M.get('environment');
        if (env) results.environment = env.update(input, deltaTime);

        const personality = M.get('personality');
        if (personality) results.personality = personality.update(input, deltaTime);

        const bio = M.get('biochemical');
        if (bio) {
            results.biochemical = bio.update(
                { ...input, environmental: results.environment },
                deltaTime
            );
        }

        const emo = M.get('emotional');
        if (emo) {
            results.emotional = emo.update(
                { ...input, biochemical: results.biochemical, personality: results.personality },
                deltaTime
            );
        }

        const cog = M.get('cognitive');
        if (cog) {
            results.cognitive = cog.update(
                { ...input, biochemical: results.biochemical, emotional: results.emotional, personality: results.personality },
                deltaTime
            );
        }

        const mem = M.get('memory');
        if (mem) {
            results.memory = mem.update(
                { ...input, biochemical: results.biochemical, emotional: results.emotional, cognitive: results.cognitive },
                deltaTime
            );
        }

        const mot = M.get('motivation');
        if (mot) {
            results.motivation = mot.update(
                { ...input, biochemical: results.biochemical, emotional: results.emotional, cognitive: results.cognitive },
                deltaTime
            );
        }

        const sleep = M.get('sleep');
        if (sleep) {
            results.sleep = sleep.update(
                { ...input, biochemical: results.biochemical, emotional: results.emotional, cognitive: results.cognitive },
                deltaTime
            );
        }

        const motor = M.get('motor');
        if (motor) {
            results.motor = motor.update(
                {
                    ...input,
                    biochemical: results.biochemical,
                    emotional: results.emotional,
                    cognitive: results.cognitive,
                    motivation: results.motivation
                },
                deltaTime
            );
        }

        const visual = M.get('visual');
        if (visual) {
            results.visual = visual.update({
                biochemical: results.biochemical,
                emotional: results.emotional,
                cognitive: results.cognitive,
                motor: results.motor,
                sleep: results.sleep
            });
        }

        return results;
    }

    applyGlobalHomeostasis(deltaTime) {
        const biochemical = this.modules.get('biochemical');
        if (!biochemical) return;
        const bioState = biochemical.getState();
        const rate = this.coreConfig.homeostasisRate * deltaTime;

        const adjustments = {
            cortisol: bioState.cortisol > 70 ? -0.5 : (bioState.cortisol < 20 ? 0.3 : 0),
            energia: bioState.energia < 25 ? 0.3 : (bioState.energia > 80 ? -0.1 : 0),
            oxigeno: bioState.oxigeno < 30 ? 0.5 : 0,
            toxicidad: bioState.toxicidad > 60 ? -0.4 : 0
        };

        Object.entries(adjustments).forEach(([key, val]) => {
            const adjustment = val * rate;
            if (adjustment !== 0) {
                try { biochemical.applyModulation({ [key]: adjustment }); }
                catch (_) { /* noop */ }
            }
        });

        const stabilityTrend = (bioState.oxigeno / 100 + bioState.energia / 100 + (1 - bioState.toxicidad / 100)) / 3;
        this.systemState.stability = this.systemState.stability * 0.95 + stabilityTrend * 0.05;
    }

    checkSystemHealth(results) {
        const bio = results.biochemical || this.modules.get('biochemical')?.getState() || {};
        const emo = results.emotional || this.modules.get('emotional')?.getState() || {};

        const criticals = [
            { c: bio.oxigeno < 10, m: 'Oxígeno crítico' },
            { c: bio.toxicidad > 90, m: 'Toxicidad crítica' },
            { c: bio.energia < 5, m: 'Energía crítica' },
            { c: bio.cortisol > 95, m: 'Estrés crítico' },
            { c: emo.miedo > 90, m: 'Miedo extremo' },
            { c: this.systemState.stability < 0.2, m: 'Sistema inestable' }
        ];

        if (criticals.some(x => x.c)) {
            const msgs = criticals.filter(x => x.c).map(x => x.m).join(', ');
            this.logSystem(`Condiciones críticas: ${msgs}`, 'error');
            this.triggerEmergencyProtocol();
        }

        const warnings = [
            { c: bio.oxigeno < 25, m: 'Oxígeno bajo' },
            { c: bio.toxicidad > 70, m: 'Toxicidad elevada' },
            { c: bio.energia < 20, m: 'Energía baja' },
            { c: bio.cortisol > 70, m: 'Estrés elevado' },
            { c: this.systemState.stability < 0.5, m: 'Estabilidad disminuida' }
        ];

        warnings.forEach(w => {
            if (w.c) this.dispatchEvent('warning', { message: w.m, type: 'warning' });
        });
    }

    updateStatistics(results) {
        const emo = results.emotional || {};
        const cog = results.cognitive || {};

        this.statistics.stabilityHistory.push(this.systemState.stability);
        this.statistics.performanceHistory.push(this.systemState.performance);
        this.statistics.emotionalStability.push(emo.estabilidad || 50);
        this.statistics.cognitiveEfficiency.push(cog.fluidez || 50);

        const max = 1000;
        ['stabilityHistory', 'performanceHistory', 'emotionalStability', 'cognitiveEfficiency']
            .forEach(k => {
                if (this.statistics[k].length > max) this.statistics[k] = this.statistics[k].slice(-max);
            });
    }

    updateConsciousness(results) {
        const emotional = results.emotional || {};
        const cognitive = results.cognitive || {};
        const sleep = results.sleep || {};

        let consciousness = 0.1;
        consciousness += (emotional.bienestar || 0) / 100 * 0.2;
        consciousness += (cognitive.autoconciencia || 0) / 100 * 0.3;
        consciousness += (cognitive.fluidez || 0) / 100 * 0.15;
        consciousness += this.systemState.stability * 0.2;

        if (sleep.estado && sleep.estado !== 'despierto') consciousness *= 0.3;

        this.systemState.consciousnessLevel = Math.min(1, consciousness);
        this.systemState.performance = this.systemState.stability * 0.6 + consciousness * 0.4;

        if (this.cycleCount % 10 === 0) {
            this.dispatchEvent('consciousness_update', {
                level: this.systemState.consciousnessLevel,
                time: this.systemTime
            });
        }
    }

    recordCycle(results) {
        this.cycleHistory.push({
            timestamp: this.systemTime,
            cycle: this.cycleCount,
            stability: this.systemState.stability,
            performance: this.systemState.performance,
            consciousness: this.systemState.consciousnessLevel,
            alerts: this.alerts.activeAlerts.length
        });
        if (this.cycleHistory.length > this.coreConfig.maxCycleHistory) {
            this.cycleHistory.shift();
        }
    }

    autoEvolve(results) {
        if (this.cycleCount % 100 !== 0) return;
        const performance = this.systemState.performance;
        const consciousness = this.systemState.consciousnessLevel;
        const personality = this.modules.get('personality');

        if (personality && typeof personality.applyModulation === 'function') {
            try {
                if (performance < 0.6) {
                    personality.applyModulation({ madurez: 0.01, desarrollo: 0.005 });
                } else if (consciousness > 0.5) {
                    personality.applyModulation({ apertura: 0.01, creatividad: 0.01 });
                }
            } catch (err) {
                if (this.cycleCount % 500 === 0) {
                    this.logSystem(`Advertencia evolución: ${err.message}`, 'warning');
                }
            }
        }
        this.humanParameters.learningRate = 0.1 + consciousness * 0.1;
    }

    checkAlerts(results) {
        const bio = results.biochemical || {};
        const thresholds = this.alerts.thresholds;

        // ✅ Cortisol: valores ALTOS son malos → usar ">"
        const criticalChecks = [
            { value: bio.oxigeno ?? 100, threshold: thresholds.critical.oxygen, m: 'Oxígeno crítico', invert: false },
            { value: bio.energia ?? 100, threshold: thresholds.critical.energy, m: 'Energía crítica', invert: false },
            { value: bio.cortisol ?? 0, threshold: thresholds.critical.cortisol, m: 'Estrés crítico', invert: true },
            { value: this.systemState.stability * 100, threshold: thresholds.critical.stability, m: 'Estabilidad crítica', invert: false }
        ];

        criticalChecks.forEach(c => {
            const triggered = c.invert ? c.value > c.threshold : c.value < c.threshold;
            if (triggered) this.addAlert('critical', c.m, { value: c.value, threshold: c.threshold });
        });

        const warningChecks = [
            { value: bio.oxigeno ?? 100, threshold: thresholds.warning.oxygen, m: 'Oxígeno bajo', invert: false },
            { value: bio.energia ?? 100, threshold: thresholds.warning.energy, m: 'Energía baja', invert: false },
            { value: bio.cortisol ?? 0, threshold: thresholds.warning.cortisol, m: 'Estrés elevado', invert: true },
            { value: this.systemState.stability * 100, threshold: thresholds.warning.stability, m: 'Estabilidad disminuida', invert: false }
        ];

        warningChecks.forEach(c => {
            const triggered = c.invert ? c.value > c.threshold : c.value < c.threshold;
            if (triggered) this.addAlert('warning', c.m, { value: c.value, threshold: c.threshold });
        });

        // Limpiar alertas que ya no aplican
        this.alerts.activeAlerts = this.alerts.activeAlerts.filter(alert => {
            const all = criticalChecks.concat(warningChecks);
            const check = all.find(c => c.m === alert.message);
            if (!check) return true;
            return check.invert ? check.value > check.threshold : check.value < check.threshold;
        });
    }

    addAlert(type, message, data) {
        const existing = this.alerts.activeAlerts.find(a => a.message === message);
        if (existing) {
            existing.count++;
            existing.lastOccurrence = this.systemTime;
            return;
        }
        const alert = {
            id: Date.now() + Math.random(),
            type, message, data,
            timestamp: this.systemTime,
            count: 1,
            lastOccurrence: this.systemTime
        };
        this.alerts.activeAlerts.push(alert);
        this.alerts.history.push(alert);
        if (this.alerts.history.length > 500) this.alerts.history.shift();

        this.dispatchEvent('alert', alert);
        if (type === 'critical') this.logSystem(`ALERTA CRÍTICA: ${message}`, 'error');
        else this.logSystem(`ADVERTENCIA: ${message}`, 'warning');
    }

    triggerEmergencyProtocol() {
        if (this.systemState.emergency) return;
        this.systemState.emergency = true;
        this.logSystem('⚠️ PROTOCOLO DE EMERGENCIA ACTIVADO', 'error');
        this.dispatchEvent('emergency', { time: this.systemTime, state: { ...this.systemState } });

        this.modules.forEach(module => {
            if (module && typeof module.emergencyProtocol === 'function') {
                try { module.emergencyProtocol(); } catch (_) { /* noop */ }
            }
        });

        setTimeout(() => this.resolveEmergency(), 5000);
    }

    resolveEmergency() {
        const biochemical = this.modules.get('biochemical');
        const bio = biochemical?.getState();
        if (!bio) return;

        const ok = bio.oxigeno > 20 && bio.toxicidad < 80 && bio.energia > 15 && bio.cortisol < 80;
        if (ok) {
            this.systemState.emergency = false;
            this.logSystem('✅ Emergencia resuelta', 'system');
            this.dispatchEvent('emergency_resolved', { time: this.systemTime });
        } else {
            setTimeout(() => this.resolveEmergency(), 5000);
        }
    }

    // ==================== SITUACIONES / CONFIG ====================

    applySituation(situationType, intensity = 1.0) {
        if (!this.isRunning) return;
        this.logSystem(`Aplicando situación: ${situationType} (intensidad: ${intensity})`);
        this.modules.forEach(module => {
            if (module && typeof module.handleSituation === 'function') {
                try { module.handleSituation(situationType, intensity); }
                catch (err) { this.logSystem(`Error aplicando situación en módulo: ${err.message}`, 'error'); }
            }
        });
        this.dispatchEvent('situation_applied', { situation: situationType, intensity, time: this.systemTime });
    }

    changeCharacter(config) {
        if (!config) return;
        this.characterConfig = { ...this.characterConfig, ...config };
        this.logSystem(`Personaje cambiado a: ${this.characterConfig.genotipo}`);

        // Re-inicializar módulos con la nueva config
        for (const [name, module] of this.modules) {
            if (module && typeof module.initialize === 'function') {
                try { module.initialize(this.characterConfig); }
                catch (err) { this.logSystem(`Error reconfigurando ${name}: ${err.message}`, 'warning'); }
            }
        }
        this.dispatchEvent('character_changed', this.characterConfig);
    }

    // ==================== EXPORT / RESET ====================

    exportSystemData() {
        const modulesData = {};
        this.modules.forEach((module, name) => {
            if (module && typeof module.exportData === 'function') {
                try { modulesData[name] = module.exportData(); }
                catch (err) { modulesData[name] = { error: err.message }; }
            }
        });

        return {
            version: '4.0.0',
            timestamp: Date.now(),
            systemState: { ...this.systemState, time: this.systemTime, cycles: this.cycleCount },
            characterConfig: this.characterConfig,
            statistics: this.statistics,
            alerts: {
                active: this.alerts.activeAlerts,
                history: this.alerts.history.slice(-100)
            },
            cycleHistory: this.cycleHistory.slice(-100),
            modules: modulesData
        };
    }

    // Alias para la ruta /api/export
    exportData() {
        return this.exportSystemData();
    }

    resetSystem() {
        this.isRunning = false;
        this.systemTime = 0;
        this.cycleCount = 0;
        this.cycleHistory = [];
        this.eventHistory = [];
        this.systemState.emergency = false;
        this.alerts.activeAlerts = [];
        this.statistics = {
            stabilityHistory: [],
            performanceHistory: [],
            emotionalStability: [],
            cognitiveEfficiency: [],
            consciousnessLevels: [],
            patterns: { daily: {}, weekly: {}, monthly: {} },
            predictions: { nextState: {}, riskAssessment: 0.2, growthPotential: 0.7 }
        };

        this.modules.forEach(module => {
            if (module && typeof module.reset === 'function') {
                try { module.reset(); } catch (_) { /* noop */ }
            }
        });

        this.logSystem('Sistema reiniciado completamente');
        this.isRunning = true;
    }

    reset() { this.resetSystem(); }

    // ==================== LOG ====================

    logSystem(message, type = 'system') {
        const timestamp = new Date().toLocaleTimeString();
        const entry = { timestamp, message, type, cycle: this.cycleCount, time: this.systemTime };

        if (typeof window !== 'undefined' && window.dispatchEvent) {
            try {
                window.dispatchEvent(new CustomEvent('systemLog', { detail: entry }));
            } catch (_) { /* noop */ }
        }

        const prefix = type === 'error' ? '❌' :
                       type === 'warning' ? '⚠️' :
                       type === 'debug' ? '🔍' : '📌';

        // Solo imprimimos warnings/errors o mensajes explícitos
        if (type === 'error' || type === 'warning' || process.env.VERBOSE_LOGS === 'true') {
            console.log(`${prefix} [${timestamp}] ${message}`);
        }
    }

    // ==================== GETTERS ====================

    getSystemState() {
        return {
            ...this.systemState,
            time: this.systemTime,
            cycles: this.cycleCount,
            character: this.characterConfig,
            modules: Array.from(this.modules.keys()),
            activeAlerts: this.alerts.activeAlerts.length
        };
    }

    isSystemStable() {
        return this.systemState.stability > 0.6 &&
               !this.systemState.emergency &&
               this.alerts.activeAlerts.length === 0;
    }

    getEvents() { return this.eventHistory.slice(-100); }

    // ==================== API ====================

    async getState() {
        const modulesState = {};
        for (const [name, module] of this.modules) {
            if (module && typeof module.getState === 'function') {
                try { modulesState[name] = module.getState(); }
                catch (err) { modulesState[name] = { error: err.message }; }
            }
        }

        return {
            system: {
                stability: this.systemState.stability || 0,
                performance: this.systemState.performance || 0,
                consciousness: this.systemState.consciousnessLevel || 0,
                emergency: this.systemState.emergency || false,
                time: this.systemTime || 0,
                cycles: this.cycleCount || 0
            },
            modules: modulesState,
            timestamp: Date.now()
        };
    }

    async getMetrics() {
        const metrics = {
            stability: this.systemState.stability || 0,
            performance: this.systemState.performance || 0,
            consciousness: this.systemState.consciousnessLevel || 0,
            cycles: this.cycleCount || 0,
            modules: Array.from(this.modules.keys()),
            alerts: this.alerts?.activeAlerts?.length || 0,
            timestamp: Date.now()
        };

        if (this.database && typeof this.database.getSystemMetrics === 'function') {
            try {
                metrics.database = await this.database.getSystemMetrics();
            } catch (err) {
                metrics.databaseError = err.message;
            }
        }
        return metrics;
    }

    async think(options, context) {
        const cognitive = this.modules.get('cognitive');
        if (!cognitive) return { decision: null, confidence: 0, error: 'Cognitive module not available' };
        try { return cognitive.processDecision(context || {}, options || []); }
        catch (err) { return { decision: null, confidence: 0, error: err.message }; }
    }

    async remember(query) {
        const memory = this.modules.get('memory');
        if (!memory) return { memories: [], confidence: 0, error: 'Memory module not available' };
        try { return memory.retrieveMemory(query, this.collectSystemInput()); }
        catch (err) { return { memories: [], confidence: 0, error: err.message }; }
    }

    async learn(skill, context, success) {
        const memory = this.modules.get('memory');
        if (!memory) return { success: false, error: 'Memory module not available' };
        try {
            return memory.learnSkill(skill, context || this.collectSystemInput(), success !== false);
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
}

export const systemCore = new SystemCore();
export const brain = systemCore;
