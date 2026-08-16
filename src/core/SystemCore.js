// src/core/SystemCore.js
// Sistema Central que coordina todos los módulos - V2.0

export class SystemCore {
    constructor() {
        this.modules = new Map();
        this.isRunning = false;
        this.autoEvolution = true;
        this.characterConfig = null;
        this.systemTime = 0;
        this.cycleCount = 0;
        this.eventBus = new EventTarget();
        this.eventHistory = [];
        this.database = null;
        
        // Sistema de estadísticas
        this.statistics = {
            stabilityHistory: [],
            performanceHistory: [],
            emotionalStability: [],
            cognitiveEfficiency: [],
            consciousnessLevels: [],
            patterns: {
                daily: {},
                weekly: {},
                monthly: {}
            },
            predictions: {
                nextState: {},
                riskAssessment: 0.2,
                growthPotential: 0.7
            }
        };
        
        // Sistema de alertas
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
        
        // Orden de inicialización
        this.initOrder = [
            'environment',
            'personality',
            'biochemical',
            'emotional',
            'cognitive',
            'memory',
            'motor',
            'visual',
            'sleep',
            'motivation',
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
        
        // Parámetros humanos
        this.humanParameters = {
            learningRate: 0.15,
            neuroplasticity: 0.8,
            consciousnessGrowth: 0.01
        };
    }

    registerModule(name, module) {
        this.modules.set(name, module);
        this.logSystem(`Módulo registrado: ${name}`);
    }

    setDatabase(database) {
        this.database = database;
    }

    async initializeSystem(characterConfig) {
        this.characterConfig = characterConfig;
        
        try {
            const initOrder = this.initOrder;
            const missingModules = initOrder.filter(name => !this.modules.has(name));
            
            if (missingModules.length > 0) {
                this.logSystem(`Módulos faltantes: ${missingModules.join(', ')}`, 'warning');
            }

            for (const moduleName of initOrder) {
                const module = this.modules.get(moduleName);
                if (module && module.initialize) {
                    await module.initialize(characterConfig);
                    this.logSystem(`Módulo inicializado: ${moduleName}`);
                }
            }

            this.setupEventListeners();
            
            this.isRunning = true;
            this.logSystem('Sistema nervioso central V2.0 inicializado completamente');
            
            this.dispatchEvent('system_initialized', {
                config: characterConfig,
                modules: Array.from(this.modules.keys())
            });
            
        } catch (error) {
            this.logSystem(`Error en inicialización: ${error.message}`, 'error');
            throw error;
        }
    }

    setupEventListeners() {
        this.modules.forEach((module, name) => {
            if (module.onEvent) {
                module.onEvent((event) => {
                    this.handleModuleEvent(name, event);
                });
            }
        });
    }

    handleModuleEvent(moduleName, event) {
        this.eventHistory.push({
            module: moduleName,
            event: event,
            timestamp: this.systemTime
        });
        
        if (this.eventHistory.length > 1000) {
            this.eventHistory.shift();
        }
        
        if (event.type === 'critical') {
            this.handleCriticalEvent(moduleName, event);
        }
    }

    handleCriticalEvent(moduleName, event) {
        this.systemState.lastCriticalEvent = {
            module: moduleName,
            event: event,
            time: this.systemTime
        };
        
        this.dispatchEvent('critical_event', {
            module: moduleName,
            event: event
        });
        
        if (event.severity > 0.8) {
            this.triggerEmergencyProtocol();
        }
    }

    update(deltaTime) {
        if (!this.isRunning || this.systemState.emergency) {
            return;
        }

        this.systemTime += deltaTime;
        this.cycleCount++;

        try {
            const systemInput = this.collectSystemInput();
            const results = this.processCascade(systemInput, deltaTime);
            
            this.applyGlobalHomeostasis(deltaTime);
            this.checkSystemHealth();
            
            if (this.autoEvolution) {
                this.autoEvolve();
            }
            
            this.updateStatistics(results);
            this.checkAlerts(results);
            this.updateConsciousness(results);
            this.recordCycle(results);

        } catch (error) {
            this.logSystem(`Error en ciclo de actualización: ${error.message}`, 'error');
            this.triggerEmergencyProtocol();
        }
    }

    collectSystemInput() {
        const input = {
            biochemical: this.modules.get('biochemical')?.getState() || {},
            emotional: this.modules.get('emotional')?.getState() || {},
            cognitive: this.modules.get('cognitive')?.getState() || {},
            personality: this.modules.get('personality')?.getState() || {},
            environmental: this.modules.get('environment')?.getState() || {},
            motivation: this.modules.get('motivation')?.getState() || {},
            time: this.systemTime,
            cycle: this.cycleCount
        };
        
        return input;
    }

    processCascade(input, deltaTime) {
        const results = {};
        const modules = this.modules;
        
        const env = modules.get('environment');
        if (env) {
            results.environment = env.update(input, deltaTime);
        }
        
        const personality = modules.get('personality');
        if (personality) {
            results.personality = personality.update(input, deltaTime);
        }
        
        const biochemical = modules.get('biochemical');
        const bioInput = { ...input, environmental: results.environment };
        results.biochemical = biochemical.update(bioInput, deltaTime);
        
        const emotional = modules.get('emotional');
        const emoInput = { ...input, biochemical: results.biochemical, personality: results.personality };
        results.emotional = emotional.update(emoInput, deltaTime);
        
        const cognitive = modules.get('cognitive');
        const cogInput = { 
            ...input, 
            biochemical: results.biochemical, 
            emotional: results.emotional,
            personality: results.personality
        };
        results.cognitive = cognitive.update(cogInput, deltaTime);
        
        const memory = modules.get('memory');
        const memInput = {
            ...input,
            biochemical: results.biochemical,
            emotional: results.emotional,
            cognitive: results.cognitive
        };
        results.memory = memory.update(memInput, deltaTime);
        
        const motivation = modules.get('motivation');
        if (motivation) {
            const motInput = {
                ...input,
                biochemical: results.biochemical,
                emotional: results.emotional,
                cognitive: results.cognitive
            };
            results.motivation = motivation.update(motInput, deltaTime);
        }
        
        const sleep = modules.get('sleep');
        if (sleep) {
            const sleepInput = {
                ...input,
                biochemical: results.biochemical,
                emotional: results.emotional,
                cognitive: results.cognitive
            };
            results.sleep = sleep.update(sleepInput, deltaTime);
        }
        
        const motor = modules.get('motor');
        const motInput = {
            ...input,
            biochemical: results.biochemical,
            emotional: results.emotional,
            cognitive: results.cognitive,
            motivation: results.motivation
        };
        results.motor = motor.update(motInput, deltaTime);
        
        const visual = modules.get('visual');
        const visInput = {
            biochemical: results.biochemical,
            emotional: results.emotional,
            cognitive: results.cognitive,
            motor: results.motor
        };
        results.visual = visual.update(visInput);

        return results;
    }

    applyGlobalHomeostasis(deltaTime) {
        const biochemical = this.modules.get('biochemical');
        if (!biochemical) return;
        
        const bioState = biochemical.getState();
        const rate = this.coreConfig.homeostasisRate * deltaTime;
        
        const homeostaticAdjustments = {
            cortisol: bioState.cortisol > 70 ? -0.5 : (bioState.cortisol < 20 ? 0.3 : 0),
            energia: bioState.energia < 25 ? 0.3 : (bioState.energia > 80 ? -0.1 : 0),
            oxigeno: bioState.oxigeno < 30 ? 0.5 : 0,
            toxicidad: bioState.toxicidad > 60 ? -0.4 : 0
        };
        
        Object.keys(homeostaticAdjustments).forEach(key => {
            const adjustment = homeostaticAdjustments[key] * rate;
            if (adjustment !== 0) {
                const modulation = {};
                modulation[key] = adjustment;
                biochemical.applyModulation(modulation);
            }
        });
        
        const stabilityTrend = (bioState.oxigeno / 100 + bioState.energia / 100 + (1 - bioState.toxicidad / 100)) / 3;
        this.systemState.stability = this.systemState.stability * 0.95 + stabilityTrend * 0.05;
    }

    checkSystemHealth() {
        const biochemical = this.modules.get('biochemical');
        const emotional = this.modules.get('emotional');
        
        if (!biochemical || !emotional) return;
        
        const bioState = biochemical.getState();
        const emoState = emotional.getState();
        
        const criticalConditions = [
            { condition: bioState.oxigeno < 10, message: 'Oxígeno crítico' },
            { condition: bioState.toxicidad > 90, message: 'Toxicidad crítica' },
            { condition: bioState.energia < 5, message: 'Energía crítica' },
            { condition: bioState.cortisol > 95, message: 'Estrés crítico' },
            { condition: emoState.miedo > 90, message: 'Miedo extremo' },
            { condition: this.systemState.stability < 0.2, message: 'Sistema inestable' }
        ];
        
        const critical = criticalConditions.some(c => c.condition);
        
        if (critical) {
            const messages = criticalConditions
                .filter(c => c.condition)
                .map(c => c.message)
                .join(', ');
            
            this.logSystem(`Condiciones críticas detectadas: ${messages}`, 'error');
            this.triggerEmergencyProtocol();
        }
        
        const warningConditions = [
            { condition: bioState.oxigeno < 25, message: 'Oxígeno bajo' },
            { condition: bioState.toxicidad > 70, message: 'Toxicidad elevada' },
            { condition: bioState.energia < 20, message: 'Energía baja' },
            { condition: bioState.cortisol > 70, message: 'Estrés elevado' },
            { condition: this.systemState.stability < 0.5, message: 'Estabilidad disminuida' }
        ];
        
        warningConditions.forEach(w => {
            if (w.condition) {
                this.dispatchEvent('warning', {
                    message: w.message,
                    type: 'warning'
                });
            }
        });
    }

    updateStatistics(results) {
        const bio = results.biochemical || this.modules.get('biochemical')?.getState() || {};
        const emo = results.emotional || this.modules.get('emotional')?.getState() || {};
        const cog = results.cognitive || this.modules.get('cognitive')?.getState() || {};
        
        this.statistics.stabilityHistory.push(this.systemState.stability);
        this.statistics.performanceHistory.push(this.systemState.performance);
        this.statistics.emotionalStability.push(emo.estabilidad || 50);
        this.statistics.cognitiveEfficiency.push(cog.fluidez || 50);
        
        const maxHistory = 1000;
        ['stabilityHistory', 'performanceHistory', 'emotionalStability', 'cognitiveEfficiency']
            .forEach(key => {
                if (this.statistics[key].length > maxHistory) {
                    this.statistics[key] = this.statistics[key].slice(-maxHistory);
                }
            });
    }

    updateConsciousness(results) {
        // Nivel de consciencia basado en integración de sistemas
        const emotional = results.emotional || {};
        const cognitive = results.cognitive || {};
        const sleep = results.sleep || {};
        
        let consciousness = 0.1;
        consciousness += (emotional.bienestar || 0) / 100 * 0.2;
        consciousness += (cognitive.autoconciencia || 0) / 100 * 0.3;
        consciousness += (cognitive.fluidez || 0) / 100 * 0.15;
        consciousness += this.systemState.stability * 0.2;
        
        if (sleep.estado && sleep.estado !== 'despierto') {
            consciousness *= 0.3;
        }
        
        this.systemState.consciousnessLevel = Math.min(1, consciousness);
        
        if (this.cycleCount % 10 === 0) {
            this.dispatchEvent('consciousness_update', {
                level: this.systemState.consciousnessLevel,
                time: this.systemTime
            });
        }
    }

    autoEvolve() {
        if (this.cycleCount % 100 !== 0) return;
        
        const performance = this.systemState.performance;
        const consciousness = this.systemState.consciousnessLevel;
        const personality = this.modules.get('personality');
        
        if (personality && typeof personality.applyModulation === 'function') {
            try {
                if (performance < 0.6) {
                    personality.applyModulation({ madurez: 0.01, desarrollo: 0.005 });
                    this.logSystem('Auto-evolución: Mejorando personalidad');
                } else if (consciousness > 0.5) {
                    personality.applyModulation({ apertura: 0.01, creatividad: 0.01 });
                    this.logSystem('Auto-evolución: Desarrollando consciencia');
                }
            } catch (error) {
                if (this.cycleCount % 500 === 0) {
                    this.logSystem(`Advertencia en evolución: ${error.message}`, 'warning');
                }
            }
        }
        
        this.humanParameters.learningRate = 0.1 + consciousness * 0.1;
        this.systemState.performance = this.systemState.stability * 0.6 + consciousness * 0.4;
        
        if (this.cycleCount % 100 === 0) {
            this.logSystem(`🧬 Auto-evolución: Consciencia ${(consciousness * 100).toFixed(1)}%`);
            this.logSystem(`📊 Rendimiento: ${(this.systemState.performance * 100).toFixed(1)}%`);
        }
    }

    checkAlerts(results) {
        const bio = results.biochemical || {};
        const emo = results.emotional || {};
        const thresholds = this.alerts.thresholds;
        
        const criticalChecks = [
            { value: bio.oxigeno || 100, threshold: thresholds.critical.oxygen, message: 'Oxígeno crítico' },
            { value: bio.energia || 100, threshold: thresholds.critical.energy, message: 'Energía crítica' },
            { value: bio.cortisol || 0, threshold: thresholds.critical.cortisol, message: 'Estrés crítico' },
            { value: this.systemState.stability * 100, threshold: thresholds.critical.stability, message: 'Estabilidad crítica' }
        ];
        
        criticalChecks.forEach(check => {
            if (check.value < check.threshold) {
                this.addAlert('critical', check.message, { value: check.value, threshold: check.threshold });
            }
        });
        
        const warningChecks = [
            { value: bio.oxigeno || 100, threshold: thresholds.warning.oxygen, message: 'Oxígeno bajo' },
            { value: bio.energia || 100, threshold: thresholds.warning.energy, message: 'Energía baja' },
            { value: bio.cortisol || 0, threshold: thresholds.warning.cortisol, message: 'Estrés elevado' },
            { value: this.systemState.stability * 100, threshold: thresholds.warning.stability, message: 'Estabilidad disminuida' }
        ];
        
        warningChecks.forEach(check => {
            if (check.value < check.threshold) {
                this.addAlert('warning', check.message, { value: check.value, threshold: check.threshold });
            }
        });
        
        this.alerts.activeAlerts = this.alerts.activeAlerts.filter(alert => {
            const check = criticalChecks.concat(warningChecks).find(c => c.message === alert.message);
            if (!check) return true;
            return check.value < check.threshold;
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
            id: Date.now(),
            type: type,
            message: message,
            data: data,
            timestamp: this.systemTime,
            count: 1,
            lastOccurrence: this.systemTime
        };
        
        this.alerts.activeAlerts.push(alert);
        this.alerts.history.push(alert);
        
        this.dispatchEvent('alert', alert);
        
        if (type === 'critical') {
            this.logSystem(`ALERTA CRÍTICA: ${message}`, 'error');
        } else {
            this.logSystem(`ADVERTENCIA: ${message}`, 'warning');
        }
    }

    triggerEmergencyProtocol() {
        if (this.systemState.emergency) return;
        
        this.systemState.emergency = true;
        this.logSystem('⚠️ PROTOCOLO DE EMERGENCIA ACTIVADO', 'error');
        
        this.dispatchEvent('emergency', {
            time: this.systemTime,
            state: { ...this.systemState }
        });
        
        this.modules.forEach(module => {
            if (module.emergencyProtocol) {
                module.emergencyProtocol();
            }
        });
        
        setTimeout(() => {
            this.resolveEmergency();
        }, 5000);
    }

    resolveEmergency() {
        const biochemical = this.modules.get('biochemical');
        const bioState = biochemical?.getState();
        
        if (bioState) {
            const conditions = [
                bioState.oxigeno > 20,
                bioState.toxicidad < 80,
                bioState.energia > 15,
                bioState.cortisol < 80
            ];
            
            if (conditions.every(c => c)) {
                this.systemState.emergency = false;
                this.logSystem('✅ Emergencia resuelta, sistema estabilizado', 'system');
                this.dispatchEvent('emergency_resolved', { time: this.systemTime });
            } else {
                setTimeout(() => {
                    this.resolveEmergency();
                }, 5000);
            }
        }
    }

    // API pública
    applySituation(situationType, intensity = 1.0) {
        if (!this.isRunning) return;
        
        this.logSystem(`Aplicando situación: ${situationType} (intensidad: ${intensity})`);
        
        this.modules.forEach((module, name) => {
            if (module.handleSituation) {
                module.handleSituation(situationType, intensity);
            }
        });
        
        this.dispatchEvent('situation_applied', {
            situation: situationType,
            intensity: intensity,
            time: this.systemTime
        });
    }

    changeCharacter(config) {
        this.characterConfig = config;
        this.logSystem(`Configuración cambiada a: ${config.genotipo}`);
        
        this.modules.forEach(module => {
            if (module.reconfigure) {
                module.reconfigure(config);
            }
        });
        
        this.dispatchEvent('character_changed', config);
    }

    exportSystemData() {
        const modulesData = {};
        this.modules.forEach((module, name) => {
            if (module.exportData) {
                modulesData[name] = module.exportData();
            }
        });
        
        return {
            version: '2.0',
            timestamp: Date.now(),
            systemState: {
                ...this.systemState,
                time: this.systemTime,
                cycles: this.cycleCount
            },
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

    resetSystem() {
        this.isRunning = false;
        this.systemTime = 0;
        this.cycleCount = 0;
        this.cycleHistory = [];
        this.systemState.emergency = false;
        this.alerts.activeAlerts = [];
        
        this.modules.forEach(module => {
            if (module.reset) {
                module.reset();
            }
        });
        
        this.logSystem('Sistema reiniciado completamente');
        this.isRunning = true;
    }

    logSystem(message, type = 'system') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = { 
            timestamp, 
            message, 
            type, 
            cycle: this.cycleCount,
            time: this.systemTime 
        };
        
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('systemLog', { 
                detail: logEntry 
            }));
        }
        
        const prefix = type === 'error' ? '❌' : 
                       type === 'warning' ? '⚠️' : 
                       type === 'debug' ? '🔍' : '📌';
        
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    dispatchEvent(type, data) {
        const event = new CustomEvent(type, { detail: data });
        this.eventBus.dispatchEvent(event);
    }

    // Getters
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

    getEvents() {
        return this.eventHistory.slice(-100);
    }
}

export const systemCore = new SystemCore();
export const brain = systemCore;

