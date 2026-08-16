// src/modules/SleepSystem.js
import { brain } from '../core/SystemCore.js';

export class SleepSystem {
    constructor() {
        this.state = {};
        this.eventListeners = [];
        this.sleepHistory = [];
        this.dreamLog = [];
        this.lastUpdateTime = 0;
        this.circadianRhythm = { phase: 0, amplitude: 0.3, period: 86400 };
        this.dreamGenerationTimer = 0;
        this.sleepDepth = 0;
        this.cycleCounter = 0;
    }

    async initialize(characterConfig) {
        this.config = characterConfig;
        this.initializeState();
        this.setupCircadianRhythm();
        console.log('😴 Sistema de sueño V3.0 inicializado');
    }

    initializeState() {
        this.state = {
            estado: 'despierto',
            presionSueño: 0,
            deudaSueño: 0,
            fase: 0,
            calidadSueño: 0.8,
            tiempoDormido: 0,
            ciclosCompletos: 0,
            etapaActual: 0,
            profundidad: 0,
            sueñosActivos: false,
            paralisisSueño: false,
            eficienciaSueño: 0.7,
            despertares: 0,
            ultimoDespertar: 0
        };
        this.sleepHistory = [];
        this.dreamLog = [];
        this.lastUpdateTime = brain.systemTime || Date.now();
        this.circadianPhase = 0;
        this.dreamGenerationTimer = 0;
        this.sleepDepth = 0;
        this.cycleCounter = 0;
    }

    setupCircadianRhythm() {
        this.circadianRhythm = { phase: 0, amplitude: 0.3, period: 86400, wakeThreshold: 0.7, sleepThreshold: 0.3 };
    }

    onEvent(callback) {
        this.eventListeners.push(callback);
    }

    emitEvent(type, data) {
        this.eventListeners.forEach(cb => {
            try {
                cb({ type, data, module: 'sleep' });
            } catch (error) {
                console.error('❌ Error en listener de sueño:', error);
            }
        });
    }

    update(input, deltaTime) {
        this.lastUpdateTime = brain.systemTime || Date.now();
        if (!input || !input.biochemical) return this.getState();
        this.updateCircadianRhythm(deltaTime);
        this.calculateSleepPressure(input.biochemical, deltaTime);
        this.processSleepState(input, deltaTime);
        this.applySleepEffects(input, deltaTime);
        this.processDreams(deltaTime);
        this.recordHistory();
        return this.getState();
    }

    updateCircadianRhythm(deltaTime) {
        this.circadianPhase += deltaTime / this.circadianRhythm.period;
        this.circadianPhase = this.circadianPhase % 1;
        const rhythmValue = 0.5 + 0.5 * Math.sin(this.circadianPhase * Math.PI * 2);
        this.state.profundidad = rhythmValue;
    }

    calculateSleepPressure(bioState, deltaTime) {
        const wakeTime = this.state.estado === 'despierto' ? deltaTime : 0;
        const activityFactor = (bioState.energia || 50) < 50 ? 1.5 : 1.0;
        const stressFactor = (bioState.cortisol || 0) > 60 ? 1.3 : 1.0;
        this.state.presionSueño += wakeTime * 0.008 * activityFactor * stressFactor;
        this.state.presionSueño = this.clamp(this.state.presionSueño, 0, 100);
        if (this.state.estado !== 'despierto') {
            this.state.deudaSueño *= (1 - 0.008 * deltaTime * this.state.calidadSueño);
        }
    }

    processSleepState(input, deltaTime) {
        const bioState = input.biochemical || {};
        const emoState = input.emotional || {};
        const wakeThreshold = 0.7 - ((bioState.cortisol || 0) / 100) * 0.2;
        const sleepThreshold = 0.3 + ((bioState.serotonina || 50) / 100) * 0.2;
        const circadianFactor = this.circadianPhase;
        switch(this.state.estado) {
            case 'despierto':
                if (this.state.presionSueño > 70 && circadianFactor < sleepThreshold) this.transitionTo('somnoliento');
                break;
            case 'somnoliento':
                if (this.state.presionSueño > 80 && circadianFactor < 0.4) this.transitionTo('dormido');
                if (this.state.presionSueño < 30) this.transitionTo('despierto');
                break;
            case 'dormido':
                if (this.state.profundidad < 0.2) this.transitionTo('sueño_profundo');
                if (this.state.profundidad > 0.6) this.transitionTo('sueño_rem');
                if (this.state.presionSueño < 20 || circadianFactor > wakeThreshold) this.transitionTo('despierto');
                break;
            case 'sueño_profundo':
                if (this.state.profundidad > 0.3) this.transitionTo('sueño_rem');
                if (this.state.presionSueño < 15) this.transitionTo('despierto');
                break;
            case 'sueño_rem':
                if (this.state.profundidad < 0.5) this.transitionTo('dormido');
                if (this.state.presionSueño < 10) this.transitionTo('despierto');
                break;
        }
        if (this.state.estado !== 'despierto') {
            this.state.tiempoDormido += deltaTime;
            this.state.presionSueño -= deltaTime * 0.015 * this.state.calidadSueño;
            this.cycleCounter += deltaTime / 5400;
            if (this.cycleCounter >= 1) {
                this.cycleCounter = 0;
                this.state.ciclosCompletos++;
            }
        }
        this.state.profundidad = this.calculateSleepDepth(input);
        if (this.state.estado === 'sueño_rem') {
            this.dreamGenerationTimer += deltaTime;
            if (this.dreamGenerationTimer > 60) {
                this.dreamGenerationTimer = 0;
                this.state.sueñosActivos = true;
            }
        } else {
            this.dreamGenerationTimer = 0;
            this.state.sueñosActivos = false;
        }
    }

    calculateSleepDepth(input) {
        const bioState = input.biochemical || {};
        const emoState = input.emotional || {};
        let depth = 0.5;
        depth += ((bioState.gaba || 50) / 100) * 0.2;
        depth += ((bioState.serotonina || 50) / 100) * 0.15;
        depth += (100 - (bioState.cortisol || 0)) / 100 * 0.2;
        depth += (100 - (emoState.ansiedad || 0)) / 100 * 0.15;
        depth -= ((bioState.noradrenalina || 0) / 100) * 0.1;
        depth -= ((bioState.adrenalina || 0) / 100) * 0.1;
        if (this.state.estado === 'sueño_profundo') depth += 0.2;
        if (this.state.estado === 'sueño_rem') depth -= 0.1;
        return this.clamp(depth, 0, 1);
    }

    transitionTo(newState) {
        const oldState = this.state.estado;
        this.state.estado = newState;
        if (newState === 'despierto' && oldState !== 'despierto') {
            this.state.sueñosActivos = false;
            this.state.paralisisSueño = false;
            this.state.calidadSueño = this.calculateSleepQuality();
            this.state.eficienciaSueño = this.calculateSleepEfficiency();
            this.state.despertares++;
            this.state.ultimoDespertar = brain.systemTime || Date.now();
            this.emitEvent('woke_up', { quality: this.state.calidadSueño, efficiency: this.state.eficienciaSueño, time: this.state.tiempoDormido });
        }
        if (newState === 'sueño_rem') {
            this.state.sueñosActivos = true;
            this.emitEvent('rem_sleep_started', {});
        }
        if (newState === 'sueño_profundo') {
            this.state.sueñosActivos = false;
            this.emitEvent('deep_sleep_started', {});
        }
        if (newState === 'dormido') {
            this.emitEvent('fell_asleep', { pressure: this.state.presionSueño });
        }
        this.emitEvent('state_changed', { from: oldState, to: newState });
    }

    calculateSleepQuality() {
        let quality = 0.7;
        quality += (1 - this.state.deudaSueño / 100) * 0.2;
        quality += this.state.ciclosCompletos / 10 * 0.1;
        quality += (this.state.tiempoDormido > 28800) ? 0.1 : 0;
        quality -= (this.state.presionSueño > 50) ? 0.1 : 0;
        quality -= this.state.ciclosCompletos < 3 ? 0.1 : 0;
        quality -= this.state.despertares * 0.02;
        return this.clamp(quality, 0, 1);
    }

    calculateSleepEfficiency() {
        const totalTime = this.state.tiempoDormido || 1;
        const deepTime = this.state.profundidad * totalTime;
        return deepTime / totalTime;
    }

    applySleepEffects(input, deltaTime) {
        const bioState = input.biochemical || {};
        const emoState = input.emotional || {};
        if (this.state.estado !== 'despierto') {
            this.applySleepingEffects(bioState, deltaTime);
        } else {
            this.applyWakeEffects(bioState, deltaTime);
        }
    }

    applySleepingEffects(bioState, deltaTime) {
        if (this.state.estado === 'sueño_profundo') {
            const recoveryRate = 0.04 * this.state.calidadSueño * deltaTime;
            const modulation = {
                energia: recoveryRate * 20,
                cortisol: -recoveryRate * 15,
                oxigeno: recoveryRate * 5,
                recuperacion: recoveryRate * 25,
                fatigaAcumulada: -recoveryRate * 10
            };
            brain.modules.get('biochemical')?.applyModulation(modulation);
        }
        if (this.state.estado === 'sueño_rem') {
            const recoveryRate = 0.025 * this.state.calidadSueño * deltaTime;
            const modulation = {
                serotonina: recoveryRate * 15,
                dopamina: recoveryRate * 10,
                oxitocina: recoveryRate * 10,
                cortisol: -recoveryRate * 5
            };
            brain.modules.get('biochemical')?.applyModulation(modulation);
        }
    }

    applyWakeEffects(bioState, deltaTime) {
        const quality = this.state.calidadSueño;
        if ((bioState.energia || 50) < 30) {
            const recoveryRate = 0.008 * quality * deltaTime;
            brain.modules.get('biochemical')?.applyModulation({
                energia: recoveryRate * 10,
                cortisol: -recoveryRate * 5
            });
        }
    }

    processDreams(deltaTime) {
        if (!this.state.sueñosActivos) return;
        if (Math.random() < 0.008 * deltaTime) {
            const dream = this.generateDream();
            this.dreamLog.push({ ...dream, timestamp: brain.systemTime || Date.now() });
            if (this.dreamLog.length > 50) this.dreamLog.shift();
            this.emitEvent('dream_occurred', dream);
        }
    }

    generateDream() {
        const dreamTypes = ['recuerdo', 'imaginativo', 'emocional', 'abstracto', 'narrativo'];
        const emotions = ['alegría', 'tristeza', 'miedo', 'confianza', 'sorpresa', 'amor', 'culpa'];
        const themes = ['exploración', 'encuentro', 'peligro', 'descubrimiento', 'recuerdo', 'vuelo', 'caída'];
        return {
            tipo: dreamTypes[Math.floor(Math.random() * dreamTypes.length)],
            emocion: emotions[Math.floor(Math.random() * emotions.length)],
            tema: themes[Math.floor(Math.random() * themes.length)],
            intensidad: 0.3 + Math.random() * 0.7,
            vividness: 0.3 + Math.random() * 0.7,
            duracion: 10 + Math.random() * 50
        };
    }

    recordHistory() {
        this.sleepHistory.push({ timestamp: this.lastUpdateTime, estado: this.state.estado, presionSueño: this.state.presionSueño, profundidad: this.state.profundidad, calidadSueño: this.state.calidadSueño });
        if (this.sleepHistory.length > 1000) this.sleepHistory.shift();
    }

    getState() {
        return { ...this.state };
    }

    getSleepHistory() {
        return this.sleepHistory.slice(-100);
    }

    getDreamLog() {
        return this.dreamLog.slice(-20);
    }

    getCircadianPhase() {
        return this.circadianPhase;
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    reset() {
        this.initializeState();
        this.sleepHistory = [];
        this.dreamLog = [];
        this.dreamGenerationTimer = 0;
        this.sleepDepth = 0;
        this.cycleCounter = 0;
        console.log('🔄 Sistema de sueño reiniciado');
    }

    exportData() {
        return {
            state: this.getState(),
            sleepHistory: this.getSleepHistory(),
            dreamLog: this.getDreamLog(),
            circadianPhase: this.circadianPhase,
            circadianRhythm: this.circadianRhythm
        };
    }
}

brain.registerModule('sleep', new SleepSystem());
