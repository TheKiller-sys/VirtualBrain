// src/modules/SleepSystem.js
import { systemCore } from '../core/SystemCore.js';

export class SleepSystem {
    constructor() {
        this.state = {};
        this.config = {};
        this.eventListeners = [];
        this.sleepHistory = [];
        this.dreamLog = [];
        this.lastUpdateTime = 0;
        this.dreamGenerationTimer = 0;
        this.cycleCounter = 0;
    }

    async initialize(characterConfig) {
        this.config = characterConfig || { genotipo: 'humano' };
        this.initializeState();
        systemCore.logSystem('Sistema de sueño V4 inicializado');
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
        this.lastUpdateTime = systemCore.systemTime;
        this.dreamGenerationTimer = 0;
        this.cycleCounter = 0;
    }

    onEvent(cb) { this.eventListeners.push(cb); }
    emitEvent(type, data) {
        this.eventListeners.forEach(cb => {
            try { cb({ type, data, module: 'sleep' }); }
            catch (err) { console.error('❌ sleep listener:', err); }
        });
    }

    update(input, deltaTime) {
        this.lastUpdateTime = systemCore.systemTime;
        if (!input || !input.biochemical) return this.getState();

        this.calculateSleepPressure(input.biochemical, deltaTime);
        this.processSleepState(input, deltaTime);
        this.applySleepEffects(input, deltaTime);
        this.processDreams(deltaTime);
        this.recordHistory();

        systemCore.queuePersistence('sleep', () => {
            if (systemCore.database?.isInitialized) {
                return systemCore.database.saveSleepState(this.state);
            }
        });

        return this.getState();
    }

    calculateSleepPressure(bio, dt) {
        const wakeTime = this.state.estado === 'despierto' ? dt : 0;
        const activity = (bio.energia || 50) < 50 ? 1.5 : 1.0;
        const stress = (bio.cortisol || 0) > 60 ? 1.3 : 1.0;
        this.state.presionSueño = this.clamp(this.state.presionSueño + wakeTime * 0.008 * activity * stress, 0, 100);
        if (this.state.estado !== 'despierto') {
            this.state.deudaSueño *= (1 - 0.008 * dt * this.state.calidadSueño);
        }
    }

    processSleepState(input, dt) {
        const bio = input.biochemical || {};
        const cp = systemCore.getCircadianHour() / 24;
        const wakeThreshold = 0.7 - ((bio.cortisol || 0) / 100) * 0.2;
        const sleepThreshold = 0.3 + ((bio.serotonina || 50) / 100) * 0.2;

        switch (this.state.estado) {
            case 'despierto':
                if (this.state.presionSueño > 70 && cp < sleepThreshold) this.transitionTo('somnoliento');
                break;
            case 'somnoliento':
                if (this.state.presionSueño > 80 && cp < 0.4) this.transitionTo('dormido');
                if (this.state.presionSueño < 30) this.transitionTo('despierto');
                break;
            case 'dormido':
                if (this.state.profundidad < 0.2) this.transitionTo('sueño_profundo');
                if (this.state.profundidad > 0.6) this.transitionTo('sueño_rem');
                if (this.state.presionSueño < 20 || cp > wakeThreshold) this.transitionTo('despierto');
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
            this.state.tiempoDormido += dt;
            this.state.presionSueño -= dt * 0.015 * this.state.calidadSueño;
            this.cycleCounter += dt / 5400;
            if (this.cycleCounter >= 1) {
                this.cycleCounter = 0;
                this.state.ciclosCompletos++;
            }
        }

        this.state.profundidad = this.calculateSleepDepth(input);

        if (this.state.estado === 'sueño_rem') {
            this.dreamGenerationTimer += dt;
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
        const bio = input.biochemical || {};
        const emo = input.emotional || {};
        let d = 0.5;
        d += ((bio.gaba || 50) / 100) * 0.2;
        d += ((bio.serotonina || 50) / 100) * 0.15;
        d += (100 - (bio.cortisol || 0)) / 100 * 0.2;
        d += (100 - (emo.ansiedad || 0)) / 100 * 0.15;
        d -= ((bio.noradrenalina || 0) / 100) * 0.1;
        if (this.state.estado === 'sueño_profundo') d += 0.2;
        if (this.state.estado === 'sueño_rem') d -= 0.1;
        return this.clamp(d, 0, 1);
    }

    transitionTo(ns) {
        const old = this.state.estado;
        this.state.estado = ns;
        if (ns === 'despierto' && old !== 'despierto') {
            this.state.sueñosActivos = false;
            this.state.paralisisSueño = false;
            this.state.calidadSueño = this.calculateSleepQuality();
            this.state.eficienciaSueño = this.calculateSleepEfficiency();
            this.state.despertares++;
            this.state.ultimoDespertar = Date.now();
            this.emitEvent('woke_up', { quality: this.state.calidadSueño });
        }
        if (ns === 'sueño_rem') { this.state.sueñosActivos = true; this.emitEvent('rem_started', {}); }
        if (ns === 'sueño_profundo') { this.state.sueñosActivos = false; this.emitEvent('deep_started', {}); }
        if (ns === 'dormido') this.emitEvent('fell_asleep', { pressure: this.state.presionSueño });
        this.emitEvent('state_changed', { from: old, to: ns });
    }

    calculateSleepQuality() {
        let q = 0.7;
        q += (1 - this.state.deudaSueño / 100) * 0.2;
        q += this.state.ciclosCompletos / 10 * 0.1;
        q += this.state.tiempoDormido > 28800 ? 0.1 : 0;
        q -= this.state.despertares * 0.02;
        return this.clamp(q, 0, 1);
    }

    calculateSleepEfficiency() {
        const t = this.state.tiempoDormido || 1;
        return (this.state.profundidad * t) / t;
    }

    applySleepEffects(input, dt) {
        if (this.state.estado === 'sueño_profundo') {
            const rec = 0.04 * this.state.calidadSueño * dt;
            const bio = systemCore.modules.get('biochemical');
            if (bio?.applyModulation) {
                bio.applyModulation({ energia: rec * 20, cortisol: -rec * 15, oxigeno: rec * 5, recuperacion: rec * 25 });
            }
        }
        if (this.state.estado === 'sueño_rem') {
            const rec = 0.025 * this.state.calidadSueño * dt;
            const bio = systemCore.modules.get('biochemical');
            if (bio?.applyModulation) {
                bio.applyModulation({ serotonina: rec * 15, dopamina: rec * 10, oxitocina: rec * 10 });
            }
        }
    }

    /**
     * FIX: usar db.saveDream() en vez de acceder a db.db.run() directamente.
     */
    processDreams(dt) {
        if (!this.state.sueñosActivos) return;
        if (Math.random() < 0.008 * dt) {
            const dream = this.generateDream();
            this.dreamLog.push({ ...dream, timestamp: Date.now() });
            if (this.dreamLog.length > 50) this.dreamLog.shift();
            this.emitEvent('dream_occurred', dream);

            if (systemCore.database?.isInitialized) {
                systemCore.database.saveDream(dream).catch(() => {});
            }
        }
    }

    generateDream() {
        const tipos = ['recuerdo', 'imaginativo', 'emocional', 'abstracto', 'narrativo'];
        const emociones = ['alegría', 'tristeza', 'miedo', 'confianza', 'sorpresa', 'amor'];
        const temas = ['exploración', 'encuentro', 'peligro', 'descubrimiento', 'vuelo', 'caída'];
        return {
            tipo: tipos[Math.floor(Math.random() * tipos.length)],
            emocion: emociones[Math.floor(Math.random() * emociones.length)],
            tema: temas[Math.floor(Math.random() * temas.length)],
            intensidad: 0.3 + Math.random() * 0.7,
            vividness: 0.3 + Math.random() * 0.7,
            duracion: 10 + Math.random() * 50
        };
    }

    recordHistory() {
        this.sleepHistory.push({
            timestamp: Date.now(),
            estado: this.state.estado,
            presionSueño: this.state.presionSueño,
            profundidad: this.state.profundidad,
            calidadSueño: this.state.calidadSueño
        });
        if (this.sleepHistory.length > 1000) this.sleepHistory.shift();
    }

    handleSituation(type, intensity) {
        const map = {
            'reposo': { presionSueño: 20 * intensity, calidadSueño: 0.1 * intensity },
            'estres_alto': { presionSueño: -10 * intensity, calidadSueño: -0.1 * intensity },
            'descanso': { presionSueño: 30 * intensity },
            'fatiga': { presionSueño: 40 * intensity }
        };
        const eff = map[type] || {};
        Object.keys(eff).forEach(k => {
            if (this.state[k] !== undefined) {
                this.state[k] = k === 'calidadSueño' ? this.clamp(this.state[k] + eff[k], 0, 1) : this.clamp(this.state[k] + eff[k], 0, 100);
            }
        });
    }

    getState() { return { ...this.state }; }
    getSleepHistory() { return this.sleepHistory.slice(-100); }
    getDreamLog() { return this.dreamLog.slice(-20); }
    clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

    reset() {
        this.initializeState();
        this.sleepHistory = [];
        this.dreamLog = [];
    }

    exportData() {
        return {
            state: this.getState(),
            sleepHistory: this.getSleepHistory(),
            dreamLog: this.getDreamLog(),
            circadianPhase: systemCore.getCircadianHour() / 24
        };
    }
}

systemCore.registerModule('sleep', new SleepSystem());
