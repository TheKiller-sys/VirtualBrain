// src/core/SystemCore.js
// Núcleo central que coordina todos los módulos — V4.3
//
// CAMBIOS CLAVE V4.3:
//  - queuePersistence acepta MÚLTIPLES funciones por módulo (antes la
//    segunda sobreescribía la primera antes del flush).
//  - flushPendingPersistence itera arrays de funciones.
//  - getMetrics reporta total real de funciones pendientes.
//
// CAMBIOS CLAVE V4.1:
//  - severity real en eventos críticos
//  - persistencia de sistema_estados en cada flush
//  - tick rápido (updateHz) + tick lento (slowTickHz)
//  - emergency reset cancela timeouts pendientes
//  - homeostasis delegada a cada módulo (no doble)
//  - timestamps unificados (Date.now para persistir, systemTime para sim)

import { TUNING } from '../config/tuning.js';

export class SystemCore {
    constructor() {
        this.modules = new Map();
        this.isRunning = false;
        this.autoEvolution = true;
        this.characterConfig = null;

        // Tiempos
        this.systemTime = 0;          // segundos simulados acumulados
        this.cycleCount = 0;          // ciclos rápidos completados
        this.slowCycleCount = 0;      // ciclos lentos completados
        this._lastSlowTickAt = 0;     // systemTime del último slow tick

        this.eventListeners = [];
        this.eventHistory = [];

        this.database = null;

        // Buffer de persistencia: Map<moduleName, Array<fn>>
        // Antes era Map<moduleName, fn> y la segunda llamada sobreescribía.
        this._pendingPersists = new Map();
        this._lastPersistFlushAt = Date.now();
        this._persistFlushIntervalMs = TUNING.persistFlushInterval * 1000;

        // Cache de estado
        this._stateCache = null;
        this._stateCacheAt = 0;
        this._stateCacheTTL = TUNING.stateCacheTTL;

        // Config
        this.coreConfig = {
            updateFrequency: TUNING.updateHz,
            slowTickFrequency: TUNING.slowTickHz,
            maxCycleHistory: TUNING.maxCycleHistory,
            emergencyThreshold: TUNING.emergencyThreshold,
            homeostasisRate: TUNING.homeostasisRate,
            consciousnessThreshold: TUNING.consciousnessThreshold
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

        this.humanParameters = {
            learningRate: 0.15,
            neuroplasticity: 0.8,
            consciousnessGrowth: 0.01
        };

        this.statistics = {
            stabilityHistory: [],
            performanceHistory: [],
            emotionalStability: [],
            cognitiveEfficiency: [],
            consciousnessLevels: []
        };

        this.alerts = {
            thresholds: {
                critical: { ...TUNING.alerts.critical },
                warning: { ...TUNING.alerts.warning }
            },
            history: [],
            activeAlerts: []
        };

        this.initOrder = [
            'environment', 'personality', 'biochemical', 'emotional',
            'cognitive', 'memory', 'motivation', 'sleep', 'motor', 'control'
        ];

        // Control de emergencia
        this._emergencyRetries = 0;
        this._emergencyTimeouts = new Set();

        this.initializeCore();
    }

    initializeCore() {
        console.log('⚙️ SystemCore V4.3 inicializado');
    }

    // ==================== REGISTRO DE MÓDULOS ====================

    registerModule(name, module) {
        if (this.modules.has(name)) {
            this.logSystem(`⚠️ Módulo duplicado, sobreescribiendo: ${name}`, 'warning');
        }
        this.modules.set(name, module);
        this.logSystem(`Módulo registrado: ${name}`);
        return module;
    }

    setDatabase(database) {
        this.database = database;
        this.logSystem('Base de datos vinculada al núcleo');
    }

    // ==================== PERSISTENCIA CENTRALIZADA ====================

    /**
     * Encola una función de persistencia para un módulo.
     *
     * FIX V4.3: ahora acepta múltiples funciones por módulo. Antes
     * `this._pendingPersists.set(moduleName, fn)` sobreescribía la
     * anterior si dos llamadas ocurrían antes del siguiente flush
     * (ej: PersonalitySystem encola 'personality' y luego 'personality'
     * otra vez → la primera se perdía).
     */
    queuePersistence(moduleName, fn) {
        if (typeof fn !== 'function') return;
        if (!this._pendingPersists.has(moduleName)) {
            this._pendingPersists.set(moduleName, []);
        }
        this._pendingPersists.get(moduleName).push(fn);
    }

    async flushPendingPersistence() {
        if (!this.database?.isInitialized) {
            if (this._pendingPersists.size > 0) this._pendingPersists.clear();
            return;
        }

        // Persistencia del estado del sistema (una vez por flush)
        try {
            await this.database.saveSystemState({
                stability: this.systemState.stability,
                performance: this.systemState.performance,
                consciousnessLevel: this.systemState.consciousnessLevel,
                integrity: this.systemState.integrity,
                emergency: this.systemState.emergency,
                activeAlerts: this.alerts.activeAlerts.length,
                systemTime: this.systemTime,
                cycleCount: this.cycleCount
            });
        } catch (err) {
            this.logSystem(`Error persistiendo estado del sistema: ${err.message}`, 'warning');
        }

        if (this._pendingPersists.size === 0) return;

        // Snapshot y reset ANTES de await (evita carreras si algo
        // vuelve a encolar durante el flush)
        const snapshot = new Map();
        for (const [name, arr] of this._pendingPersists) {
            snapshot.set(name, arr.slice());
        }
        this._pendingPersists.clear();

        for (const [name, fns] of snapshot) {
            for (const fn of fns) {
                try { await fn(); }
                catch (err) {
                    this.logSystem(`Error persistiendo "${name}": ${err.message}`, 'warning');
                }
            }
        }
    }

    /** Total de funciones pendientes (suma de todos los módulos). */
    _pendingPersistCount() {
        let n = 0;
        for (const arr of this._pendingPersists.values()) n += arr.length;
        return n;
    }

    // ==================== UTILIDADES DE TIEMPO ====================

    /**
     * Hora circadiana (0–24) según TUNING.circadian.
     * - useLocalTime=true (default): hora local del sistema.
     * - timezone especificado: usa Intl para esa zona.
     */
    getCircadianHour() {
        const cfg = TUNING.circadian;
        if (cfg.timezone) {
            try {
                const fmt = new Intl.DateTimeFormat('en-GB', {
                    timeZone: cfg.timezone,
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: false
                });
                const parts = fmt.formatToParts(new Date());
                const h = parseInt(parts.find(p => p.type === 'hour').value, 10) || 0;
                const m = parseInt(parts.find(p => p.type === 'minute').value, 10) || 0;
                return h + m / 60;
            } catch (_) {
                // Fallback a local si la timezone es inválida
            }
        }
        if (cfg.useLocalTime) {
            const d = new Date();
            return d.getHours() + d.getMinutes() / 60;
        }
        // UTC
        return (Date.now() % cfg.msPerDay) / 3600000;
    }

    // ==================== EVENTOS ====================

    onEvent(callback) {
        if (typeof callback === 'function') this.eventListeners.push(callback);
    }

    emitEvent(type, data) {
        const payload = { type, data, simTime: this.systemTime, wallTime: Date.now() };
        for (const cb of this.eventListeners) {
            try { cb(payload); }
            catch (err) { console.error('❌ Listener error:', err); }
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
            this._lastPersistFlushAt = Date.now();
            this.logSystem('Sistema nervioso central V4.3 inicializado completamente');

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
        for (const [name, module] of this.modules) {
            if (module && typeof module.onEvent === 'function') {
                try {
                    module.onEvent((event) => this.handleModuleEvent(name, event));
                } catch (err) {
                    this.logSystem(`No se pudo suscribir a ${name}: ${err.message}`, 'warning');
                }
            }
        }
    }

    handleModuleEvent(moduleName, event) {
        if (!event || !event.type) return;

        this.eventHistory.push({ module: moduleName, event, simTime: this.systemTime });
        if (this.eventHistory.length > TUNING.maxEventHistory) this.eventHistory.shift();

        const severity = this._deriveSeverity(event);

        if (severity >= 0.8) {
            this.handleCriticalEvent(moduleName, event, severity);
        } else if (severity >= 0.5) {
            this.addAlert('warning', `${moduleName}: ${event.type}`, event);
        }
    }

    _deriveSeverity(event) {
        if (typeof event.severity === 'number') return event.severity;
        switch (event.type) {
            case 'critical':
            case 'bio_critical':
            case 'emotional_emergency':
            case 'cognitive_emergency':
                return 0.9;
            case 'warning':
            case 'bio_warning':
                return 0.6;
            case 'emergency':
                return 0.95;
            default:
                return 0;
        }
    }

    handleCriticalEvent(moduleName, event, severity) {
        this.systemState.lastCriticalEvent = {
            module: moduleName,
            event,
            severity,
            simTime: this.systemTime,
            wallTime: Date.now()
        };
        this.addAlert('critical', `${moduleName}: ${event.type}`, { severity, ...event });
        this.dispatchEvent('critical_event', { module: moduleName, event, severity });

        if (severity > TUNING.emergencyThreshold) {
            this.triggerEmergencyProtocol();
        }
    }

    // ==================== BUCLE PRINCIPAL ====================

    update(deltaTime) {
        if (!this.isRunning || this.systemState.emergency) return;

        this.systemTime += deltaTime;
        this.cycleCount++;

        // Invalidar cache de estado
        this._stateCache = null;

        try {
            const input = this.collectSystemInput();
            const results = this.processCascade(input, deltaTime);

            // Homeostasis global: SOLO consolidar, no duplicar la de cada módulo
            this.consolidateHomeostasis(results, deltaTime);
            this.checkSystemHealth(results);
            if (this.autoEvolution) this.autoEvolve(results);

            this.updateStatistics(results);
            this.checkAlerts(results);
            this.updateConsciousness(results);
            this.recordCycle(results);

            // Slow tick: módulos que declaran updateSlow()
            const slowInterval = 1 / this.coreConfig.slowTickFrequency;
            if ((this.systemTime - this._lastSlowTickAt) >= slowInterval) {
                this._lastSlowTickAt = this.systemTime;
                this.slowCycleCount++;
                this.processSlowCascade(input, deltaTime);
            }

            // Flush por reloj real
            const now = Date.now();
            if (now - this._lastPersistFlushAt >= this._persistFlushIntervalMs) {
                this._lastPersistFlushAt = now;
                this.flushPendingPersistence().catch(() => {});
            }
        } catch (error) {
            // Un error de JS no activa emergencia. Solo loguea.
            this.logSystem(`Error en ciclo: ${error.message}`, 'error');
            if (this.cycleCount % 100 === 0) console.error(error.stack);
        }
    }

    collectSystemInput() {
        const input = {
            time: this.systemTime,
            cycle: this.cycleCount,
            slowCycle: this.slowCycleCount
        };
        for (const [name, module] of this.modules) {
            try {
                input[name] = module.getState ? module.getState() : {};
            } catch (err) {
                input[name] = { error: err.message };
            }
        }
        return input;
    }

    processCascade(input, deltaTime) {
        const results = {};
        const M = this.modules;

        const env = M.get('environment');
        if (env?.update) results.environment = env.update(input, deltaTime);

        const personality = M.get('personality');
        if (personality?.update) {
            results.personality = personality.update(
                { ...input, environment: results.environment }, deltaTime
            );
        }

        const bio = M.get('biochemical');
        if (bio?.update) {
            results.biochemical = bio.update(
                { ...input, environment: results.environment },
                deltaTime
            );
        }

        const emo = M.get('emotional');
        if (emo?.update) {
            results.emotional = emo.update(
                {
                    ...input,
                    biochemical: results.biochemical,
                    personality: results.personality,
                    environment: results.environment
                },
                deltaTime
            );
        }

        const cog = M.get('cognitive');
        if (cog?.update) {
            results.cognitive = cog.update(
                {
                    ...input,
                    biochemical: results.biochemical,
                    emotional: results.emotional,
                    personality: results.personality
                },
                deltaTime
            );
        }

        const mem = M.get('memory');
        if (mem?.update) {
            results.memory = mem.update(
                {
                    ...input,
                    biochemical: results.biochemical,
                    emotional: results.emotional,
                    cognitive: results.cognitive,
                    environment: results.environment
                },
                deltaTime
            );
        }

        const mot = M.get('motivation');
        if (mot?.update) {
            results.motivation = mot.update(
                {
                    ...input,
                    biochemical: results.biochemical,
                    emotional: results.emotional,
                    cognitive: results.cognitive
                },
                deltaTime
            );
        }

        const sleep = M.get('sleep');
        if (sleep?.update) {
            results.sleep = sleep.update(
                {
                    ...input,
                    biochemical: results.biochemical,
                    emotional: results.emotional,
                    cognitive: results.cognitive
                },
                deltaTime
            );
        }

        const motor = M.get('motor');
        if (motor?.update) {
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

        return results;
    }

    processSlowCascade(input, deltaTime) {
        const slowDelta = 1 / this.coreConfig.slowTickFrequency;
        for (const [name, module] of this.modules) {
            if (module?.updateSlow) {
                try { module.updateSlow(input, slowDelta); }
                catch (err) {
                    this.logSystem(`Error slow en ${name}: ${err.message}`, 'warning');
                }
            }
        }
    }

    /**
     * Solo consolida el estado global. La homeostasis real la aplica cada
     * módulo internamente. Antes este método duplicaba la de Biochemical.
     */
    consolidateHomeostasis(results, deltaTime) {
        const bio = results.biochemical || this.modules.get('biochemical')?.getState?.() || {};
        const oxigeno = (bio.oxigeno ?? 50) / 100;
        const energia = (bio.energia ?? 50) / 100;
        const toxicidad = 1 - ((bio.toxicidad ?? 0) / 100);
        const trend = (oxigeno + energia + toxicidad) / 3;
        // Suavizado exponencial hacia el trend
        this.systemState.stability = this.systemState.stability * 0.95 + trend * 0.05;
        this.systemState.integrity = Math.min(1, this.systemState.integrity * 0.999 + 0.001);
    }

    checkSystemHealth(results) {
        const bio = results.biochemical || this.modules.get('biochemical')?.getState?.() || {};
        const emo = results.emotional || this.modules.get('emotional')?.getState?.() || {};

        const criticals = [
            { c: (bio.oxigeno ?? 100) < 10, m: 'Oxígeno crítico' },
            { c: (bio.toxicidad ?? 0) > 90, m: 'Toxicidad crítica' },
            { c: (bio.energia ?? 100) < 5, m: 'Energía crítica' },
            { c: (bio.cortisol ?? 0) > 95, m: 'Estrés crítico' },
            { c: (emo.miedo ?? 0) > 90, m: 'Miedo extremo' },
            { c: this.systemState.stability < 0.2, m: 'Sistema inestable' }
        ];

        const triggered = criticals.filter(x => x.c);
        if (triggered.length > 0) {
            const msgs = triggered.map(x => x.m).join(', ');
            this.logSystem(`Condiciones críticas: ${msgs}`, 'error');
            this.addAlert('critical', msgs, { source: 'checkSystemHealth' });
            this.triggerEmergencyProtocol();
        }

        const warnings = [
            { c: (bio.oxigeno ?? 100) < 25, m: 'Oxígeno bajo' },
            { c: (bio.toxicidad ?? 0) > 70, m: 'Toxicidad elevada' },
            { c: (bio.energia ?? 100) < 20, m: 'Energía baja' },
            { c: (bio.cortisol ?? 0) > 70, m: 'Estrés elevado' },
            { c: this.systemState.stability < 0.5, m: 'Estabilidad disminuida' }
        ];

        for (const w of warnings) {
            if (w.c) this.addAlert('warning', w.m, { source: 'checkSystemHealth' });
        }
    }

    updateStatistics(results) {
        const emo = results.emotional || {};
        const cog = results.cognitive || {};

        this.statistics.stabilityHistory.push(this.systemState.stability);
        this.statistics.performanceHistory.push(this.systemState.performance);
        this.statistics.emotionalStability.push(emo.estabilidad ?? 50);
        this.statistics.cognitiveEfficiency.push(cog.fluidez ?? 50);
        this.statistics.consciousnessLevels.push(this.systemState.consciousnessLevel);

        const max = TUNING.maxStabilityHistory;
        for (const k of ['stabilityHistory', 'performanceHistory', 'emotionalStability', 'cognitiveEfficiency', 'consciousnessLevels']) {
            const arr = this.statistics[k];
            if (arr.length > max) this.statistics[k] = arr.slice(-max);
        }
    }

    updateConsciousness(results) {
        const emotional = results.emotional || {};
        const cognitive = results.cognitive || {};
        const sleep = results.sleep || {};

        let consciousness = 0.1;
        consciousness += (emotional.bienestar ?? 0) / 100 * 0.2;
        consciousness += (cognitive.autoconciencia ?? 0) / 100 * 0.3;
        consciousness += (cognitive.fluidez ?? 0) / 100 * 0.15;
        consciousness += this.systemState.stability * 0.2;

        if (sleep.estado && sleep.estado !== 'despierto') consciousness *= 0.3;

        this.systemState.consciousnessLevel = Math.min(1, consciousness);
        this.systemState.performance = this.systemState.stability * 0.6 + consciousness * 0.4;

        if (this.cycleCount % 40 === 0) {
            this.dispatchEvent('consciousness_update', {
                level: this.systemState.consciousnessLevel,
                simTime: this.systemTime
            });
        }
    }

    recordCycle(results) {
        this.cycleHistory.push({
            simTime: this.systemTime,
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
                    personality.applyModulation({ apertura: 0.01 });
                }
            } catch (err) {
                if (this.cycleCount % 500 === 0) {
                    this.logSystem(`Advertencia evolución: ${err.message}`, 'warning');
                }
            }
        }
        this.humanParameters.learningRate = 0.1 + consciousness * 0.1;
    }

    // ==================== ALERTAS ====================

    checkAlerts(results) {
        const bio = results.biochemical || {};
        const thresholds = this.alerts.thresholds;

        const criticalChecks = [
            { value: bio.oxigeno ?? 100, threshold: thresholds.critical.oxygen, m: 'Oxígeno crítico', invert: false },
            { value: bio.energia ?? 100, threshold: thresholds.critical.energy, m: 'Energía crítica', invert: false },
            { value: bio.cortisol ?? 0, threshold: thresholds.critical.cortisol, m: 'Estrés crítico', invert: true },
            { value: this.systemState.stability * 100, threshold: thresholds.critical.stability, m: 'Estabilidad crítica', invert: false }
        ];

        const warningChecks = [
            { value: bio.oxigeno ?? 100, threshold: thresholds.warning.oxygen, m: 'Oxígeno bajo', invert: false },
            { value: bio.energia ?? 100, threshold: thresholds.warning.energy, m: 'Energía baja', invert: false },
            { value: bio.cortisol ?? 0, threshold: thresholds.warning.cortisol, m: 'Estrés elevado', invert: true },
            { value: this.systemState.stability * 100, threshold: thresholds.warning.stability, m: 'Estabilidad disminuida', invert: false }
        ];

        for (const c of criticalChecks) {
            const triggered = c.invert ? c.value > c.threshold : c.value < c.threshold;
            if (triggered) this.addAlert('critical', c.m, { value: c.value, threshold: c.threshold });
        }

        for (const c of warningChecks) {
            const triggered = c.invert ? c.value > c.threshold : c.value < c.threshold;
            if (triggered) this.addAlert('warning', c.m, { value: c.value, threshold: c.threshold });
        }

        // Limpiar alertas resueltas
        const allChecks = criticalChecks.concat(warningChecks);
        this.alerts.activeAlerts = this.alerts.activeAlerts.filter(alert => {
            const check = allChecks.find(c => c.m === alert.message);
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
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type, message, data,
            simTime: this.systemTime,
            wallTime: Date.now(),
            count: 1,
            lastOccurrence: this.systemTime
        };
        this.alerts.activeAlerts.push(alert);
        this.alerts.history.push(alert);
        if (this.alerts.history.length > 500) this.alerts.history.shift();

        // Persistir alerta crítica (auditoría)
        if (this.database?.isInitialized && type === 'critical') {
            this.database.db?.run(
                `INSERT INTO sistema_alertas (timestamp, sim_time, nivel, mensaje, modulo, resuelta)
                 VALUES (?, ?, ?, ?, ?, 0)`,
                [Date.now(), this.systemTime, 'critical', message, data?.source || 'core']
            ).catch(() => {});
        }

        this.dispatchEvent('alert', alert);
        if (type === 'critical') this.logSystem(`ALERTA CRÍTICA: ${message}`, 'error');
        else this.logSystem(`ADVERTENCIA: ${message}`, 'warning');
    }

    // ==================== EMERGENCIA ====================

    triggerEmergencyProtocol() {
        if (this.systemState.emergency) return;
        this.systemState.emergency = true;
        this.logSystem('⚠️ PROTOCOLO DE EMERGENCIA ACTIVADO', 'error');
        this.dispatchEvent('emergency', {
            simTime: this.systemTime,
            wallTime: Date.now(),
            state: { ...this.systemState }
        });

        for (const [, module] of this.modules) {
            if (module && typeof module.emergencyProtocol === 'function') {
                try { module.emergencyProtocol(); } catch (_) {}
            }
        }

        this._emergencyRetries = (this._emergencyRetries || 0) + 1;

        if (this._emergencyRetries <= TUNING.emergencyRetryLimit) {
            const t = setTimeout(() => {
                this._emergencyTimeouts.delete(t);
                this.resolveEmergency();
            }, TUNING.emergencyRetryDelayMs);
            if (t.unref) t.unref();
            this._emergencyTimeouts.add(t);
        } else {
            this.logSystem(
                '⚠️ Emergencia persiste tras múltiples reintentos. Requiere POST /api/emergency/reset',
                'error'
            );
            this.dispatchEvent('emergency_stuck', { simTime: this.systemTime });
        }
    }

    resolveEmergency() {
        const biochemical = this.modules.get('biochemical');
        const bio = biochemical?.getState?.();
        if (!bio) {
            this.systemState.emergency = false;
            return;
        }

        const ok = (bio.oxigeno ?? 0) > 20 && (bio.toxicidad ?? 0) < 80
                && (bio.energia ?? 0) > 15 && (bio.cortisol ?? 0) < 80;

        if (ok) {
            this.systemState.emergency = false;
            this._emergencyRetries = 0;
            this.logSystem('✅ Emergencia resuelta', 'system');
            this.dispatchEvent('emergency_resolved', { simTime: this.systemTime });
        } else {
            const t = setTimeout(() => {
                this._emergencyTimeouts.delete(t);
                this.resolveEmergency();
            }, TUNING.emergencyRetryDelayMs);
            if (t.unref) t.unref();
            this._emergencyTimeouts.add(t);
        }
    }

    /**
     * Reset manual. Cancela timeouts pendientes y limpia alertas.
     */
    resetEmergency() {
        for (const t of this._emergencyTimeouts) clearTimeout(t);
        this._emergencyTimeouts.clear();

        const wasEmergency = this.systemState.emergency;
        this.systemState.emergency = false;
        this._emergencyRetries = 0;
        this.alerts.activeAlerts = [];

        this.logSystem(
            wasEmergency ? '🔓 Emergencia reiniciada manualmente' : 'Sistema no estaba en emergencia',
            'system'
        );
        this.dispatchEvent('emergency_reset', { simTime: this.systemTime, wasEmergency });
    }

    // ==================== SITUACIONES / CONFIG ====================

    applySituation(situationType, intensity = TUNING.situations.defaultIntensity) {
        if (!this.isRunning) return { applied: false, reason: 'not_running' };
        const clampedIntensity = Math.max(
            TUNING.situations.minIntensity,
            Math.min(TUNING.situations.maxIntensity, Number(intensity) || TUNING.situations.defaultIntensity)
        );

        this.logSystem(`Aplicando situación: ${situationType} (intensidad: ${clampedIntensity})`);

        let applied = 0;
        for (const [, module] of this.modules) {
            if (module && typeof module.handleSituation === 'function') {
                try { module.handleSituation(situationType, clampedIntensity); applied++; }
                catch (err) {
                    this.logSystem(`Error aplicando situación en módulo: ${err.message}`, 'error');
                }
            }
        }

        // Persistir evento de situación
        if (this.database?.isInitialized) {
            this.database.saveSituationEvent(situationType, clampedIntensity).catch(() => {});
        }

        this.dispatchEvent('situation_applied', {
            situation: situationType,
            intensity: clampedIntensity,
            modulesApplied: applied,
            simTime: this.systemTime
        });

        return { applied: true, modulesApplied: applied, intensity: clampedIntensity };
    }

    changeCharacter(config) {
        if (!config) return;
        this.characterConfig = { ...this.characterConfig, ...config };
        this.logSystem(`Personaje cambiado a: ${this.characterConfig.genotipo}`);

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
        for (const [name, module] of this.modules) {
            if (module && typeof module.exportData === 'function') {
                try { modulesData[name] = module.exportData(); }
                catch (err) { modulesData[name] = { error: err.message }; }
            }
        }
        return {
            version: '4.3.0',
            timestamp: Date.now(),
            simTime: this.systemTime,
            cycleCount: this.cycleCount,
            slowCycleCount: this.slowCycleCount,
            systemState: { ...this.systemState },
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

    exportData() { return this.exportSystemData(); }

    resetSystem() {
        this.isRunning = false;

        for (const t of this._emergencyTimeouts) clearTimeout(t);
        this._emergencyTimeouts.clear();

        this.systemTime = 0;
        this.cycleCount = 0;
        this.slowCycleCount = 0;
        this._lastSlowTickAt = 0;
        this.cycleHistory = [];
        this.eventHistory = [];
        this.systemState.emergency = false;
        this._emergencyRetries = 0;
        this.alerts.activeAlerts = [];
        this._stateCache = null;
        this._pendingPersists.clear();
        this._lastPersistFlushAt = Date.now();

        this.statistics = {
            stabilityHistory: [],
            performanceHistory: [],
            emotionalStability: [],
            cognitiveEfficiency: [],
            consciousnessLevels: []
        };

        for (const [, module] of this.modules) {
            if (module && typeof module.reset === 'function') {
                try { module.reset(); } catch (_) {}
            }
        }

        this.logSystem('Sistema reiniciado completamente');
        this.isRunning = true;
    }

    reset() { this.resetSystem(); }

    // ==================== LOG ====================

    logSystem(message, type = 'system') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = type === 'error' ? '❌'
                     : type === 'warning' ? '⚠️'
                     : type === 'debug' ? '🔍' : '📌';

        if (type === 'error' || type === 'warning' || process.env.VERBOSE_LOGS === 'true') {
            console.log(`${prefix} [${timestamp}] ${message}`);
        }
    }

    // ==================== GETTERS ====================

    getSystemState() {
        return {
            ...this.systemState,
            simTime: this.systemTime,
            cycles: this.cycleCount,
            slowCycles: this.slowCycleCount,
            character: this.characterConfig,
            modules: Array.from(this.modules.keys()),
            activeAlerts: this.alerts.activeAlerts.length
        };
    }

    isSystemStable() {
        return this.systemState.stability > 0.6
            && !this.systemState.emergency
            && this.alerts.activeAlerts.length === 0;
    }

    getEvents() { return this.eventHistory.slice(-100); }

    async getState() {
        const now = Date.now();
        if (this._stateCache && (now - this._stateCacheAt) < this._stateCacheTTL) {
            return this._stateCache;
        }

        const modulesState = {};
        for (const [name, module] of this.modules) {
            if (module && typeof module.getState === 'function') {
                try { modulesState[name] = module.getState(); }
                catch (err) { modulesState[name] = { error: err.message }; }
            }
        }

        const result = {
            system: {
                stability: this.systemState.stability || 0,
                performance: this.systemState.performance || 0,
                consciousness: this.systemState.consciousnessLevel || 0,
                emergency: this.systemState.emergency || false,
                integrity: this.systemState.integrity || 1,
                activeAlerts: this.alerts.activeAlerts.length,
                simTime: this.systemTime,
                cycles: this.cycleCount
            },
            modules: modulesState,
            timestamp: now
        };

        this._stateCache = result;
        this._stateCacheAt = now;
        return result;
    }

    async getMetrics() {
        const metrics = {
            stability: this.systemState.stability || 0,
            performance: this.systemState.performance || 0,
            consciousness: this.systemState.consciousnessLevel || 0,
            cycles: this.cycleCount,
            slowCycles: this.slowCycleCount,
            simTime: this.systemTime,
            modules: Array.from(this.modules.keys()),
            alerts: this.alerts.activeAlerts.length,
            pendingPersists: this._pendingPersistCount(),
            timestamp: Date.now()
        };

        if (this.database && typeof this.database.getSystemMetrics === 'function') {
            try { metrics.database = await this.database.getSystemMetrics(); }
            catch (err) { metrics.databaseError = err.message; }
        }
        return metrics;
    }

    async think(options, context) {
        const cognitive = this.modules.get('cognitive');
        if (!cognitive) return { decision: null, confidence: 0, error: 'Cognitive module not available' };
        try {
            return cognitive.processDecision(context || {}, options || []);
        } catch (err) {
            return { decision: null, confidence: 0, error: err.message };
        }
    }

    async remember(query) {
        const memory = this.modules.get('memory');
        if (!memory) return { memories: [], confidence: 0, error: 'Memory module not available' };
        try {
            return memory.retrieveMemory(query, this.collectSystemInput());
        } catch (err) {
            return { memories: [], confidence: 0, error: err.message };
        }
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
