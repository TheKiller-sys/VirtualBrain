// src/modules/SleepSystem.js
// V4.1
//
// CAMBIOS CLAVE V4.1:
//  - calculateSleepEfficiency corregido (antes se cancelaba t)
//  - efectos sobre bioquímica con magnitudes coherentes
//  - updateSlow para chequeos de presión y transiciones
//  - eventos críticos con severity
//  - cooldown entre transiciones para evitar oscilación

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

        // Control
        this._lastHistoryAt = -Infinity;
        this._historyIntervalSec = 30;
        this._lastTransitionAt = -Infinity;
        this._minTransitionInterval = 5;
        this._criticalCooldown = 0;
    }

    async initialize(characterConfig) {
        this.config = characterConfig || { genotipo: 'humano' };
        this.initializeState();
        systemCore.logSystem('Sistema de sueño V4.1 inicializado');
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
        this._lastHistoryAt = -Infinity;
        this._lastTransitionAt = -Infinity;
        this._criticalCooldown = 0;
    }

    onEvent(cb) { this.eventListeners.push(cb); }

    emitEvent(type, data) {
        const payload = { type, data, module: 'sleep', simTime: systemCore.systemTime };
        for (const cb of this.eventListeners) {
            try { cb(payload); }
            catch (err) { console.error('❌ sleep listener:', err); }
        }
    }

    update(input, deltaTime) {
        this.lastUpdateTime = systemCore.systemTime;
        if (!input || !input.biochemical) return this.getState();

        this.calculateSleepPressure(input.biochemical, deltaTime);
        this.applySleepEffects(input, deltaTime);
        this.processDreams(deltaTime);
        this._applyHomeostasis();
        return this.getState();
    }

    /**
     * Transiciones y chequeos pesados cada ~1s.
     */
    updateSlow(input, slowDelta) {
        this.processSleepState(input, slowDelta);
        this._checkCriticalConditions();
        this._criticalCooldown = Math.max(0, this._criticalCooldown - slowDelta);

        if (this.lastUpdateTime - this._lastHistoryAt >= this._historyIntervalSec) {
            this._lastHistoryAt = this.lastUpdateTime;
            this.recordHistory();
        }
    }

    calculateSleepPressure(bio, dt) {
        const wakeTime = this.state.estado === 'despierto' ? dt : 0;
        const activity = (bio.energia ?? 50) < 50 ? 1.5 : 1.0;
        const stress = (bio.cortisol ?? 0) > 60 ? 1.3 : 1.0;
        this.state.presionSueño = this.clamp(
            this.state.presionSueño + wakeTime * 0.008 * activity * stress,
            0, 100
        );
        if (this.state.estado !== 'despierto') {
            this.state.deudaSueño *= (1 - 0.008 * dt * this.state.calidadSueño);
        }
    }

    processSleepState(input, dt) {
        const bio = input.biochemical || {};
        const cp = systemCore.getCircadianHour() / 24;

        const sinceLastTransition = this.lastUpdateTime - this._lastTransitionAt;

        const wakeThreshold = 0.7 - ((bio.cortisol ?? 0) / 100) * 0.2;
        const sleepThreshold = 0.3 + ((bio.serotonina ?? 50) / 100) * 0.2;

        if (sinceLastTransition < this._minTransitionInterval) {
            // Solo mantener estado actual y actualizar tiempo
            if (this.state.estado !== 'despierto') {
                this.state.tiempoDormido += dt;
                this.state.presionSueño = Math.max(0, this.state.presionSueño - dt * 0.015 * this.state.calidadSueño);
                this.cycleCounter += dt / 5400;
                if (this.cycleCounter >= 1) {
                    this.cycleCounter = 0;
                    this.state.ciclosCompletos++;
                }
            }
            return;
        }

        let nextState = this.state.estado;
        switch (this.state.estado) {
            case 'despierto':
                if (this.state.presionSueño > 70 && cp < sleepThreshold) nextState = 'somnoliento';
                break;
            case 'somnoliento':
                if (this.state.presionSueño > 80 && cp < 0.4) nextState = 'dormido';
                else if (this.state.presionSueño < 30) nextState = 'despierto';
                break;
            case 'dormido':
                if (this.state.profundidad < 0.2) nextState = 'sueño_profundo';
                else if (this.state.profundidad > 0.6) nextState = 'sueño_rem';
                else if (this.state.presionSueño < 20 || cp > wakeThreshold) nextState = 'despierto';
                break;
            case 'sueño_profundo':
                if (this.state.profundidad > 0.3) nextState = 'sueño_rem';
                else if (this.state.presionSueño < 15) nextState = 'despierto';
                break;
            case 'sueño_rem':
                if (this.state.profundidad < 0.5) nextState = 'dormido';
                else if (this.state.presionSueño < 10) nextState = 'despierto';
                break;
        }

        if (nextState !== this.state.estado) {
            this.transitionTo(nextState);
        }

        if (this.state.estado !== 'despierto') {
            this.state.tiempoDormido += dt;
            this.state.presionSueño = Math.max(0, this.state.presionSueño - dt * 0.015 * this.state.calidadSueño);
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
        d += ((bio.gaba ?? 50) / 100) * 0.2;
        d += ((bio.serotonina ?? 50) / 100) * 0.15;
        d += (100 - (bio.cortisol ?? 0)) / 100 * 0.2;
        d += (100 - (emo.ansiedad ?? 0)) / 100 * 0.15;
        d -= ((bio.noradrenalina ?? 0) / 100) * 0.1;
        if (this.state.estado === 'sueño_profundo') d += 0.2;
        if (this.state.estado === 'sueño_rem') d -= 0.1;
        return this.clamp(d, 0, 1);
    }

    transitionTo(ns) {
        const old = this.state.estado;
        this.state.estado = ns;
        this._lastTransitionAt = this.lastUpdateTime;

        if (ns === 'despierto' && old !== 'despierto') {
            this.state.sueñosActivos = false;
            this.state.paralisisSueño = false;
            this.state.calidadSueño = this.calculateSleepQuality();
            this.state.eficienciaSueño = this.calculateSleepEfficiency();
            this.state.despertares++;
            this.state.ultimoDespertar = Date.now();
            this.emitEvent('woke_up', { quality: this.state.calidadSueño, simTime: this.lastUpdateTime });
        }
        if (ns === 'sueño_rem') {
            this.state.sueñosActivos = true;
            this.emitEvent('rem_started', {});
        }
        if (ns === 'sueño_profundo') {
            this.state.sueñosActivos = false;
            this.emitEvent('deep_started', {});
        }
        if (ns === 'dormido') {
            this.emitEvent('fell_asleep', { pressure: this.state.presionSueño });
        }
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

    /**
     * FIX: antes era `(profundidad * t) / t` que se cancelaba → siempre
     * devolvía profundidad sin más. Ahora mide eficiencia real:
     * fracción de tiempo de sueño útil dado el tiempo dormido y calidad.
     */
    calculateSleepEfficiency() {
        if (this.state.tiempoDormido <= 0) return 0;
        // Eficiencia = (calidad × ciclos completos) / tiempo esperado
        const expectedCycles = Math.max(1, this.state.tiempoDormido / 5400);
        const cycleCompletion = Math.min(1, this.state.ciclosCompletos / expectedCycles);
        const penalty = this.state.despertares * 0.05;
        const eff = (this.state.calidadSueño * 0.6 + cycleCompletion * 0.4) - penalty;
        return this.clamp(eff, 0, 1);
    }

    applySleepEffects(input, dt) {
        const bio = systemCore.modules.get('biochemical');
        if (!bio?.applyModulation) return;

        if (this.state.estado === 'sueño_profundo') {
            const rec = 0.04 * this.state.calidadSueño * dt;
            bio.applyModulation({
                energia: rec * 20,
                cortisol: -rec * 15,
                oxigeno: rec * 5,
                recuperacion: rec * 25
            });
        }
        if (this.state.estado === 'sueño_rem') {
            const rec = 0.025 * this.state.calidadSueño * dt;
            bio.applyModulation({
                serotonina: rec * 15,
                dopamina: rec * 10,
                oxitocina: rec * 10
            });
        }
        if (this.state.estado === 'despierto' && this.state.presionSueño > 70) {
            const stress = 0.008 * dt;
            bio.applyModulation({ cortisol: stress * 10, energia: -stress * 5 });
        }
    }

    processDreams(dt) {
        if (!this.state.sueñosActivos) return;
        if (Math.random() < 0.008 * dt) {
            const dream = this.generateDream();
            this.dreamLog.push({ ...dream, timestamp: Date.now(), simTime: this.lastUpdateTime });
            if (this.dreamLog.length > 50) this.dreamLog.shift();
            this.emitEvent('dream_occurred', dream);

            if (systemCore.database?.isInitialized) {
                systemCore.database.saveDream({
                    ...dream,
                    sim_time: systemCore.systemTime
                }).catch(() => {});
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

    _checkCriticalConditions() {
        if (this._criticalCooldown > 0) return;
        const critical = this.state.deudaSueño > 80 || this.state.presionSueño > 95;
        if (critical) {
            this.emitEvent('critical', {
                type: 'sleep_critical',
                severity: 0.8,
                deuda: this.state.deudaSueño,
                presion: this.state.presionSueño
            });
            this._criticalCooldown = 15;
        }
    }

    _applyHomeostasis() {
        const c = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
        this.state.presionSueño = c(this.state.presionSueño, 0, 100);
        this.state.deudaSueño = c(this.state.deudaSueño, 0, 100);
        this.state.calidadSueño = c(this.state.calidadSueño, 0, 1);
        this.state.eficienciaSueño = c(this.state.eficienciaSueño, 0, 1);
        this.state.profundidad = c(this.state.profundidad, 0, 1);
        this.state.tiempoDormido = Math.max(0, this.state.tiempoDormido);
    }

    recordHistory() {
        this.sleepHistory.push({
            timestamp: Date.now(),
            simTime: this.lastUpdateTime,
            estado: this.state.estado,
            presionSueño: this.state.presionSueño,
            profundidad: this.state.profundidad,
            calidadSueño: this.state.calidadSueño,
            deudaSueño: this.state.deudaSueño
        });
        if (this.sleepHistory.length > 1000) this.sleepHistory.shift();

        systemCore.queuePersistence('sleep', () => {
            if (systemCore.database?.isInitialized) {
                return systemCore.database.saveSleepState({
                    ...this.state,
                    sim_time: systemCore.systemTime
                });
            }
        });
    }

    handleSituation(type, intensity) {
        const map = {
            'reposo': { presionSueño: 20 * intensity, calidadSueño: 0.1 * intensity },
            'estres_alto': { presionSueño: -10 * intensity, calidadSueño: -0.1 * intensity },
            'descanso': { presionSueño: 30 * intensity },
            'fatiga': { presionSueño: 40 * intensity },
            'recuperacion': { calidadSueño: 0.15 * intensity, deudaSueño: -20 * intensity }
        };
        const eff = map[type] || {};
        for (const k of Object.keys(eff)) {
            if (this.state[k] === undefined) continue;
            if (k === 'calidadSueño') {
                this.state[k] = this.clamp(this.state[k] + eff[k], 0, 1);
            } else {
                this.state[k] = this.clamp(this.state[k] + eff[k], 0, 100);
            }
        }
    }

    getState() { return { ...this.state }; }
    getSleepHistory() { return this.sleepHistory.slice(-100); }
    getDreamLog() { return this.dreamLog.slice(-20); }
    clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

    reset() {
        this.initializeState();
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
