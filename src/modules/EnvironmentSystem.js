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
        systemCore.logSystem('Sistema de entorno V3.0 inicializado');
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
        this.environmentalPatterns = [];
        this.lastUpdateTime = systemCore.systemTime || Date.now();
        this.currentPattern = null;
    }

    setupEnvironmentalPatterns() {
        this.environmentalPatterns = [
            { name: 'día_tranquilo', conditions: { oxigeno: { min: 70, max: 90 }, toxinas: { min: 0, max: 20 }, peligro: { min: 0, max: 20 }, recompensas: { min: 10, max: 30 } }, duration: 300 },
            { name: 'tormenta', conditions: { oxigeno: { min: 50, max: 70 }, toxinas: { min: 20, max: 50 }, peligro: { min: 40, max: 80 }, recompensas: { min: 0, max: 10 } }, duration: 120 },
            { name: 'paraíso', conditions: { oxigeno: { min: 85, max: 100 }, toxinas: { min: 0, max: 5 }, peligro: { min: 0, max: 5 }, recompensas: { min: 40, max: 70 } }, duration: 200 },
            { name: 'territorio_hostil', conditions: { oxigeno: { min: 30, max: 60 }, toxinas: { min: 40, max: 80 }, peligro: { min: 60, max: 90 }, recompensas: { min: 0, max: 5 } }, duration: 180 },
            { name: 'amanecer', conditions: { luz: { min: 30, max: 60 }, temperatura: { min: 15, max: 20 }, peligro: { min: 0, max: 15 } }, duration: 90 },
            { name: 'anochecer', conditions: { luz: { min: 20, max: 40 }, temperatura: { min: 18, max: 23 }, peligro: { min: 5, max: 25 } }, duration: 90 }
        ];
    }

    onEvent(callback) {
        this.eventListeners.push(callback);
    }

    emitEvent(type, data) {
        this.eventListeners.forEach(cb => {
            try {
                cb({ type, data, module: 'environment' });
            } catch (error) {
                console.error('❌ Error en listener de entorno:', error);
            }
        });
    }

    update(input, deltaTime) {
        this.lastUpdateTime = systemCore.systemTime || Date.now();
        this.applyNaturalChanges(deltaTime);
        this.processEnvironmentalPatterns(deltaTime);
        this.recordHistory();
        return this.getState();
    }

    applyNaturalChanges(deltaTime) {
        this.state.oxigeno += Math.sin(this.lastUpdateTime * 0.01) * 0.08 * deltaTime;
        this.state.oxigeno = this.clamp(this.state.oxigeno, 0, 100);
        const hour = (this.lastUpdateTime % 86400) / 3600;
        const targetTemp = 20 + 5 * Math.sin((hour - 6) * 0.2618);
        this.state.temperatura += (targetTemp - this.state.temperatura) * 0.008 * deltaTime;
        this.state.temperatura = this.clamp(this.state.temperatura, -10, 50);
        this.state.toxinas *= (1 - 0.0008 * deltaTime);
        this.state.toxinas = this.clamp(this.state.toxinas, 0, 100);
        this.state.peligro *= (1 - 0.0015 * deltaTime);
        this.state.peligro = this.clamp(this.state.peligro, 0, 100);
        this.state.humedad += Math.sin(this.lastUpdateTime * 0.005) * 0.04 * deltaTime;
        this.state.humedad = this.clamp(this.state.humedad, 0, 100);
        const dayPhase = Math.sin((hour - 6) * 0.2618);
        this.state.luz = 50 + 50 * dayPhase;
        this.state.luz = this.clamp(this.state.luz, 0, 100);
        this.state.calidadAire = 100 - this.state.toxinas * 0.5 - this.state.peligro * 0.3;
        this.state.calidadAire = this.clamp(this.state.calidadAire, 0, 100);
        this.state.estabilidad = 100 - (this.state.peligro * 0.3 + this.state.toxinas * 0.2);
        this.state.estabilidad = this.clamp(this.state.estabilidad, 0, 100);
        this.state.viento += Math.sin(this.lastUpdateTime * 0.008) * 0.02 * deltaTime;
        this.state.viento = this.clamp(this.state.viento, 0, 80);
        this.state.lluvia += (Math.sin(this.lastUpdateTime * 0.003) * 0.5 + 0.5) * 0.01 * deltaTime;
        this.state.lluvia = this.clamp(this.state.lluvia, 0, 100);
        this.state.nubosidad = 30 + 30 * Math.sin(this.lastUpdateTime * 0.004);
        this.state.nubosidad = this.clamp(this.state.nubosidad, 0, 100);
    }

    processEnvironmentalPatterns(deltaTime) {
        if (this.currentPattern) {
            this.currentPattern.remainingTime -= deltaTime;
            if (this.currentPattern.remainingTime <= 0) {
                this.currentPattern = null;
                this.emitEvent('pattern_ended', {});
            }
            return;
        }
        if (Math.random() < 0.0008 * deltaTime) {
            const pattern = this.environmentalPatterns[Math.floor(Math.random() * this.environmentalPatterns.length)];
            this.currentPattern = { ...pattern, remainingTime: pattern.duration, startTime: this.lastUpdateTime };
            this.emitEvent('pattern_started', { name: pattern.name, duration: pattern.duration });
        }
    }

    recordHistory() {
        this.environmentHistory.push({ timestamp: this.lastUpdateTime, state: { ...this.state } });
        if (this.environmentHistory.length > 1000) this.environmentHistory.shift();
    }

    handleSituation(situationType, intensity) {
        const effects = this.getSituationEffects(situationType, intensity);
        Object.keys(effects).forEach(key => {
            if (this.state[key] !== undefined) {
                this.state[key] += effects[key];
                this.state[key] = this.clamp(this.state[key], 0, 100);
            }
        });
        this.emitEvent('situation_applied', { situation: situationType, intensity: intensity, effects: effects });
    }

    getSituationEffects(situationType, intensity) {
        const effectsMap = {
            'oxigeno_alto': { oxigeno: 30 * intensity },
            'oxigeno_bajo': { oxigeno: -40 * intensity, peligro: 10 * intensity },
            'toxinas': { toxinas: 30 * intensity, calidadAire: -20 * intensity },
            'limpiar_toxinas': { toxinas: -40 * intensity, calidadAire: 20 * intensity },
            'temperatura_alta': { temperatura: 10 * intensity },
            'temperatura_baja': { temperatura: -10 * intensity },
            'amenaza': { peligro: 40 * intensity, estabilidad: -15 * intensity },
            'recompensa': { recompensas: 30 * intensity },
            'actividad_alta': { ruido: 20 * intensity, vibracion: 15 * intensity },
            'reposo': { ruido: -20 * intensity, vibracion: -10 * intensity },
            'interaccion_social': { actividadSocial: 30 * intensity },
            'tormenta': { peligro: 30 * intensity, toxinas: 20 * intensity, estabilidad: -20 * intensity, lluvia: 40 * intensity },
            'desastre': { peligro: 50 * intensity, estabilidad: -30 * intensity, recursos: -20 * intensity },
            'amanecer': { luz: 30 * intensity, temperatura: 5 * intensity, peligro: -10 * intensity },
            'anochecer': { luz: -30 * intensity, peligro: 10 * intensity }
        };
        return effectsMap[situationType] || {};
    }

    applyModulation(modulation) {
        Object.keys(modulation).forEach(key => {
            if (this.state[key] !== undefined) {
                this.state[key] += modulation[key];
                this.state[key] = this.clamp(this.state[key], 0, 100);
            }
        });
    }

    getState() {
        return { ...this.state };
    }

    getEnvironmentHistory() {
        return this.environmentHistory.slice(-100);
    }

    getCurrentPattern() {
        return this.currentPattern || null;
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    reset() {
        this.initializeState();
        this.currentPattern = null;
        this.environmentHistory = [];
    }

    exportData() {
        return {
            state: this.getState(),
            environmentHistory: this.getEnvironmentHistory(),
            currentPattern: this.getCurrentPattern(),
            environmentalPatterns: this.environmentalPatterns
        };
    }
}

systemCore.registerModule('environment', new EnvironmentSystem());
