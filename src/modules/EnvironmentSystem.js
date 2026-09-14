// src/modules/EnvironmentSystem.js
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
    }

    async initialize(characterConfig) {
        this.config = characterConfig || { genotipo: 'humano' };
        this.initializeState();
        this.setupEnvironmentalPatterns();
        systemCore.logSystem('Sistema de entorno V4 inicializado');
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
            nubosidad: 30
        };
        this.environmentHistory = [];
        this.currentPattern = null;
        this.lastUpdateTime = systemCore.systemTime;
    }

    setupEnvironmentalPatterns() {
        this.environmentalPatterns = [
            { name: 'día_tranquilo', conditions: {}, duration: 300 },
            { name: 'tormenta', conditions: {}, duration: 120 },
            { name: 'paraíso', conditions: {}, duration: 200 },
            { name: 'territorio_hostil', conditions: {}, duration: 180 },
            { name: 'amanecer', conditions: {}, duration: 90 },
            { name: 'anochecer', conditions: {}, duration: 90 }
        ];
    }

    onEvent(cb) { this.eventListeners.push(cb); }

    emitEvent(type, data) {
        this.eventListeners.forEach(cb => {
            try { cb({ type, data, module: 'environment' }); }
            catch (err) { console.error('❌ env listener:', err); }
        });
    }

    update(input, deltaTime) {
        this.lastUpdateTime = systemCore.systemTime;
        this.applyNaturalChanges(deltaTime);
        this.processEnvironmentalPatterns(deltaTime);
        this.recordHistory();
        return this.getState();
    }

    applyNaturalChanges(dt) {
        const t = this.lastUpdateTime;
        this.state.oxigeno += Math.sin(t * 0.01) * 0.08 * dt;
        const hour = systemCore.getCircadianHour();
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

        this.state.oxigeno = this.clamp(this.state.oxigeno, 0, 100);
        this.state.temperatura = this.clamp(this.state.temperatura, -10, 50);
        this.state.toxinas = this.clamp(this.state.toxinas, 0, 100);
        this.state.peligro = this.clamp(this.state.peligro, 0, 100);
        this.state.humedad = this.clamp(this.state.humedad, 0, 100);
        this.state.luz = this.clamp(this.state.luz, 0, 100);
        this.state.calidadAire = this.clamp(this.state.calidadAire, 0, 100);
        this.state.estabilidad = this.clamp(this.state.estabilidad, 0, 100);
        this.state.viento = this.clamp(this.state.viento, 0, 80);
        this.state.lluvia = this.clamp(this.state.lluvia, 0, 100);
        this.state.nubosidad = this.clamp(this.state.nubosidad, 0, 100);
    }

    processEnvironmentalPatterns(dt) {
        if (this.currentPattern) {
            this.currentPattern.remainingTime -= dt;
            if (this.currentPattern.remainingTime <= 0) {
                this.currentPattern = null;
                this.emitEvent('pattern_ended', {});
            }
            return;
        }
        if (Math.random() < 0.0008 * dt) {
            const p = this.environmentalPatterns[Math.floor(Math.random() * this.environmentalPatterns.length)];
            this.currentPattern = { ...p, remainingTime: p.duration, startTime: this.lastUpdateTime };
            this.emitEvent('pattern_started', { name: p.name, duration: p.duration });
        }
    }

    recordHistory() {
        this.environmentHistory.push({ timestamp: this.lastUpdateTime, state: { ...this.state } });
        if (this.environmentHistory.length > 1000) this.environmentHistory.shift();
    }

    handleSituation(situationType, intensity) {
        const effects = this.getSituationEffects(situationType, intensity);
        Object.keys(effects).forEach(k => {
            if (this.state[k] !== undefined) {
                this.state[k] += effects[k];
                this.state[k] = this.clamp(this.state[k], 0, 100);
            }
        });
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
        Object.keys(mod).forEach(k => {
            if (this.state[k] !== undefined) {
                this.state[k] += mod[k];
                this.state[k] = this.clamp(this.state[k], 0, 100);
            }
        });
    }

    getState() { return { ...this.state }; }
    getEnvironmentHistory() { return this.environmentHistory.slice(-100); }
    getCurrentPattern() { return this.currentPattern || null; }
    clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

    reset() {
        this.initializeState();
        this.currentPattern = null;
        this.environmentHistory = [];
    }

    exportData() {
        return {
            state: this.getState(),
            currentPattern: this.getCurrentPattern(),
            environmentalPatterns: this.environmentalPatterns
        };
    }
}

systemCore.registerModule('environment', new EnvironmentSystem());
