// src/modules/EnvironmentSystem.js
// V4.1
//
// CAMBIOS CLAVE V4.1:
//  - state.eventos: array rolling de eventos reales para MemorySystem
//  - patrones ambientales con efectos sobre el estado
//  - eventos con severity para que SystemCore los procese
//  - historial con Date.now() (persistible) + simTime separado
//  - updateSlow para patrones e historial

import { systemCore } from '../core/SystemCore.js';

export class EnvironmentSystem {
    constructor() {
        this.state = {};
        this.config = {};
        this.eventListeners = [];
        this.environmentalPatterns = [];
        this.lastUpdateTime = 0;
        this.environmentHistory = [];
        this.currentPattern = null;

        // Buffer de eventos pendientes (para que memory los consuma)
        this._pendingEvents = [];
        this._eventCounter = 0;

        // Control de history
        this._lastHistoryAt = -Infinity;
        this._historyIntervalSec = 5;
    }

    async initialize(characterConfig) {
        this.config = characterConfig || { genotipo: 'humano' };
        this.initializeState();
        this.setupEnvironmentalPatterns();
        systemCore.logSystem('Sistema de entorno V4.1 inicializado');
    }

    initializeState() {
        this.state = {
            oxigeno: 80,
            toxinas: 10,
            temperatura: 22,
            peligro: 10,
            recompensas: 10,
            humedad: 50,
            presion: 1013,
            luz: 80,
            ruido: 20,
            vibracion: 5,
            calidadAire: 85,
            actividadSocial: 10,
            recursos: 50,
            estabilidad: 80,
            previsibilidad: 70,
            viento: 15,
            lluvia: 0,
            nubosidad: 30,
            // FIX: rolling array de eventos recientes (memory los consume por timestamp)
            eventos: []
        };
        this.environmentHistory = [];
        this.currentPattern = null;
        this._pendingEvents = [];
        this._eventCounter = 0;
        this.lastUpdateTime = systemCore.systemTime;
        this._lastHistoryAt = -Infinity;
    }

    setupEnvironmentalPatterns() {
        // Cada patrón: duración (s), efecto sobre state, y evento descriptivo
        this.environmentalPatterns = [
            {
                name: 'día_tranquilo',
                duration: 300,
                effect: (s, dt) => {
                    s.peligro = Math.max(0, s.peligro - 0.3 * dt);
                    s.estabilidad = Math.min(100, s.estabilidad + 0.4 * dt);
                    s.recursos = Math.min(100, s.recursos + 0.2 * dt);
                },
                eventText: 'El ambiente se ha calmado'
            },
            {
                name: 'tormenta',
                duration: 120,
                effect: (s, dt) => {
                    s.peligro = Math.min(100, s.peligro + 0.4 * dt);
                    s.viento = Math.min(100, s.viento + 0.6 * dt);
                    s.lluvia = Math.min(100, s.lluvia + 0.8 * dt);
                    s.temperatura = Math.max(-10, s.temperatura - 0.08 * dt);
                    s.estabilidad = Math.max(0, s.estabilidad - 0.5 * dt);
                },
                eventText: 'Tormenta severa detectada: lluvia y viento incrementados'
            },
            {
                name: 'paraíso',
                duration: 200,
                effect: (s, dt) => {
                    s.oxigeno = Math.min(100, s.oxigeno + 0.5 * dt);
                    s.temperatura += (24 - s.temperatura) * 0.02 * dt;
                    s.peligro = Math.max(0, s.peligro - 0.6 * dt);
                    s.recompensas = Math.min(100, s.recompensas + 0.5 * dt);
                    s.estabilidad = Math.min(100, s.estabilidad + 0.5 * dt);
                },
                eventText: 'Entorno idílico: condiciones óptimas para el organismo'
            },
            {
                name: 'territorio_hostil',
                duration: 180,
                effect: (s, dt) => {
                    s.toxinas = Math.min(100, s.toxinas + 0.5 * dt);
                    s.peligro = Math.min(100, s.peligro + 0.5 * dt);
                    s.recursos = Math.max(0, s.recursos - 0.3 * dt);
                    s.calidadAire = Math.max(0, s.calidadAire - 0.4 * dt);
                },
                eventText: 'Territorio hostil: toxinas y peligro en aumento'
            },
            {
                name: 'amanecer',
                duration: 90,
                effect: (s, dt) => {
                    s.luz = Math.min(100, s.luz + 1.0 * dt);
                    s.temperatura += 0.05 * dt;
                    s.peligro = Math.max(0, s.peligro - 0.2 * dt);
                },
                eventText: 'Amanecer: la luz comienza a aumentar'
            },
            {
                name: 'anochecer',
                duration: 90,
                effect: (s, dt) => {
                    s.luz = Math.max(0, s.luz - 1.0 * dt);
                    s.temperatura -= 0.05 * dt;
                    s.peligro = Math.min(100, s.peligro + 0.2 * dt);
                },
                eventText: 'Anochecer: la luz disminuye y el peligro aumenta'
            }
        ];
    }

    onEvent(cb) { this.eventListeners.push(cb); }

    emitEvent(type, data) {
        const payload = { type, data, module: 'environment', simTime: systemCore.systemTime };
        for (const cb of this.eventListeners) {
            try { cb(payload); }
            catch (err) { console.error('❌ env listener:', err); }
        }
    }

    /**
     * Registra un evento ambiental. Aparece en state.eventos (rolling)
     * y queda disponible para MemorySystem.
     */
    _pushEvent(texto, severidad = 0) {
        const now = Date.now();
        const ev = { texto, severidad, timestamp: now };

        this.state.eventos.push(ev);
        if (this.state.eventos.length > 30) this.state.eventos.shift();

        this._pendingEvents.push(ev);
        if (this._pendingEvents.length > 100) this._pendingEvents.shift();

        this._eventCounter++;

        if (severidad >= 0.8) {
            this.emitEvent('critical', { type: 'environment_critical', severity: severidad, texto });
        } else if (severidad >= 0.5) {
            this.emitEvent('warning', { type: 'environment_warning', severity: severidad, texto });
        }
    }

    update(input, deltaTime) {
        this.lastUpdateTime = systemCore.systemTime;
        this.applyNaturalChanges(deltaTime);
        this.processEnvironmentalPatterns(deltaTime);
        return this.getState();
    }

    /**
     * Operaciones que no necesitan correr a 4 Hz.
     */
    updateSlow(input, slowDelta) {
        // Patrones que podrían iniciarse (probabilidad muy baja)
        if (!this.currentPattern && Math.random() < 0.03 * slowDelta) {
            this._startRandomPattern();
        }
        // Historial
        if (this.lastUpdateTime - this._lastHistoryAt >= this._historyIntervalSec) {
            this._lastHistoryAt = this.lastUpdateTime;
            this.recordHistory();
        }
    }

    applyNaturalChanges(dt) {
        const t = this.lastUpdateTime;
        const hour = systemCore.getCircadianHour();

        // Oscilaciones suaves
        this.state.oxigeno += Math.sin(t * 0.01) * 0.08 * dt;

        const targetTemp = 20 + 5 * Math.sin((hour - 6) * 0.2618);
        this.state.temperatura += (targetTemp - this.state.temperatura) * 0.008 * dt;

        this.state.toxinas *= (1 - 0.0008 * dt);
        this.state.peligro *= (1 - 0.0015 * dt);
        this.state.humedad += Math.sin(t * 0.005) * 0.04 * dt;

        const dayPhase = Math.sin((hour - 6) * 0.2618);
        this.state.luz = 50 + 50 * dayPhase;

        this.state.calidadAire = 100 - this.state.toxinas * 0.5 - this.state.peligro * 0.3;
        this.state.estabilidad = 100 - (this.state.peligro * 0.3 + this.state.toxinas * 0.2);

        this.state.viento += Math.sin(t * 0.008) * 0.02 * dt;
        this.state.lluvia += (Math.sin(t * 0.003) * 0.5 + 0.5) * 0.01 * dt;
        this.state.nubosidad = 30 + 30 * Math.sin(t * 0.004);

        this._clampState();
    }

    _clampState() {
        const c = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
        this.state.oxigeno = c(this.state.oxigeno, 0, 100);
        this.state.temperatura = c(this.state.temperatura, -10, 50);
        this.state.toxinas = c(this.state.toxinas, 0, 100);
        this.state.peligro = c(this.state.peligro, 0, 100);
        this.state.recompensas = c(this.state.recompensas, 0, 100);
        this.state.humedad = c(this.state.humedad, 0, 100);
        this.state.luz = c(this.state.luz, 0, 100);
        this.state.calidadAire = c(this.state.calidadAire, 0, 100);
        this.state.estabilidad = c(this.state.estabilidad, 0, 100);
        this.state.viento = c(this.state.viento, 0, 80);
        this.state.lluvia = c(this.state.lluvia, 0, 100);
        this.state.nubosidad = c(this.state.nubosidad, 0, 100);
        this.state.actividadSocial = c(this.state.actividadSocial, 0, 100);
        this.state.recursos = c(this.state.recursos, 0, 100);
        this.state.ruido = c(this.state.ruido, 0, 100);
        this.state.vibracion = c(this.state.vibracion, 0, 100);
    }

    processEnvironmentalPatterns(dt) {
        if (this.currentPattern) {
            this.currentPattern.remainingTime -= dt;

            // Aplicar efecto del patrón activo
            if (typeof this.currentPattern.effect === 'function') {
                try { this.currentPattern.effect(this.state, dt); }
                catch (err) {
                    systemCore.logSystem(`Error en patrón ${this.currentPattern.name}: ${err.message}`, 'warning');
                }
            }

            if (this.currentPattern.remainingTime <= 0) {
                this._pushEvent(`El patrón "${this.currentPattern.name}" terminó`, 0.2);
                this.emitEvent('pattern_ended', { name: this.currentPattern.name });
                this.currentPattern = null;
            }
            this._clampState();
        }
    }

    _startRandomPattern() {
        // Filtrar el patrón actual para no repetir
        const candidates = this.environmentalPatterns.filter(
            p => p.name !== this.currentPattern?.name
        );
        if (candidates.length === 0) return;

        const p = candidates[Math.floor(Math.random() * candidates.length)];
        this.currentPattern = { ...p, remainingTime: p.duration, startSimTime: this.lastUpdateTime };

        if (p.eventText) {
            this._pushEvent(p.eventText, 0.4);
        }
        this.emitEvent('pattern_started', { name: p.name, duration: p.duration });
    }

    recordHistory() {
        this.environmentHistory.push({
            timestamp: Date.now(),
            simTime: this.lastUpdateTime,
            oxigeno: this.state.oxigeno,
            toxinas: this.state.toxinas,
            temperatura: this.state.temperatura,
            peligro: this.state.peligro,
            estabilidad: this.state.estabilidad,
            calidadAire: this.state.calidadAire,
            pattern: this.currentPattern?.name || null
        });
        if (this.environmentHistory.length > 1000) this.environmentHistory.shift();
    }

    handleSituation(situationType, intensity) {
        const effects = this.getSituationEffects(situationType, intensity);
        for (const k of Object.keys(effects)) {
            if (this.state[k] !== undefined && typeof this.state[k] === 'number') {
                this.state[k] = Math.max(0, Math.min(100, this.state[k] + effects[k]));
            }
        }
        this._clampState();

        // Emitir evento de la situación
        const sev = Math.min(1, intensity);
        this._pushEvent(`Situación aplicada: ${situationType}`, sev);
        this.emitEvent('situation_applied', { situation: situationType, intensity, effects });
    }

    getSituationEffects(type, i) {
        const map = {
            'oxigeno_alto': { oxigeno: 30 * i },
            'oxigeno_bajo': { oxigeno: -40 * i, peligro: 10 * i },
            'toxinas': { toxinas: 30 * i, calidadAire: -20 * i },
            'limpiar_toxinas': { toxinas: -40 * i, calidadAire: 20 * i },
            'temperatura_alta': { temperatura: 10 * i },
            'temperatura_baja': { temperatura: -10 * i },
            'amenaza': { peligro: 40 * i, estabilidad: -15 * i },
            'recompensa': { recompensas: 30 * i },
            'actividad_alta': { ruido: 20 * i, vibracion: 15 * i },
            'reposo': { ruido: -20 * i, vibracion: -10 * i },
            'interaccion_social': { actividadSocial: 30 * i },
            'tormenta': { peligro: 30 * i, toxinas: 20 * i, estabilidad: -20 * i, lluvia: 40 * i },
            'desastre': { peligro: 50 * i, estabilidad: -30 * i, recursos: -20 * i },
            'amanecer': { luz: 30 * i, temperatura: 5 * i, peligro: -10 * i },
            'anochecer': { luz: -30 * i, peligro: 10 * i }
        };
        return map[type] || {};
    }

    applyModulation(mod) {
        for (const k of Object.keys(mod)) {
            if (this.state[k] !== undefined && typeof this.state[k] === 'number') {
                this.state[k] = Math.max(0, Math.min(100, this.state[k] + mod[k]));
            }
        }
    }

    getState() {
        // Devolver copia con los eventos incluidos (MemorySystem los consume)
        return {
            ...this.state,
            eventos: this.state.eventos.slice() // copia defensiva
        };
    }

    getEnvironmentHistory() { return this.environmentHistory.slice(-100); }
    getCurrentPattern() { return this.currentPattern ? { name: this.currentPattern.name, remainingTime: this.currentPattern.remainingTime } : null; }

    emergencyProtocol() {
        // El entorno no tiene emergencia propia, pero emitimos un evento
        this._pushEvent('Protocolo de emergencia activado en el entorno', 0.9);
    }

    reset() {
        this.initializeState();
    }

    exportData() {
        return {
            state: this.getState(),
            currentPattern: this.getCurrentPattern(),
            patternsAvailable: this.environmentalPatterns.map(p => p.name),
            historyLength: this.environmentHistory.length
        };
    }
}

systemCore.registerModule('environment', new EnvironmentSystem());
