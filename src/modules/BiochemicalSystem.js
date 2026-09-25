// src/modules/BiochemicalSystem.js
// V4.1
//
// CAMBIOS CLAVE V4.1:
//  - updateNeuroendocrineSystem sin doble término de decay
//  - handleSituation con clamp inmediato
//  - emergencyProtocol reversible (restaura metabolicRates)
//  - persistencia con sim_time
//  - eventos con severity

import { systemCore } from '../core/SystemCore.js';

export class BiochemicalSystem {
    constructor() {
        this.state = {};
        this.config = {};
        this.metabolicRates = {};
        this._savedMetabolicRates = null;
        this.neurotransmitterBaselines = {};
        this.eventListeners = [];
        this.homeostasisBuffer = {};
        this.lastUpdateTime = 0;
        this.energyHistory = [];
        this.stressHistory = [];
        this.genotypeConfig = {};

        // Throttle de historial
        this._lastHistoryAt = -Infinity;
        this._historyIntervalSec = 5;
        this._criticalCooldown = 0;
    }

    async initialize(characterConfig) {
        this.config = characterConfig || { genotipo: 'humano' };
        this.setupGenotype(this.config.genotipo || 'humano');
        this.initializeState();
        this.setupHomeostasisBuffer();
        systemCore.logSystem('Sistema bioquímico V4.1 inicializado');
    }

    setupGenotype(genotipo) {
        const g = {
            resiliente: { metabolicRate: 1.0, detoxEfficiency: 1.3, stressResistance: 1.2, oxygenEfficiency: 1.1, neurotransmitterStability: 1.2, recoveryRate: 1.3 },
            vulnerable: { metabolicRate: 0.8, detoxEfficiency: 0.7, stressResistance: 0.6, oxygenEfficiency: 0.9, neurotransmitterStability: 0.7, recoveryRate: 0.6 },
            audaz:      { metabolicRate: 1.2, detoxEfficiency: 1.1, stressResistance: 0.9, oxygenEfficiency: 1.0, neurotransmitterStability: 0.9, recoveryRate: 0.9, adrenalineProduction: 1.4 },
            intelectual:{ metabolicRate: 0.9, detoxEfficiency: 1.0, stressResistance: 1.1, oxygenEfficiency: 1.2, neurotransmitterStability: 1.1, recoveryRate: 1.0, cognitiveEfficiency: 1.3 },
            social:     { metabolicRate: 1.0, detoxEfficiency: 1.0, stressResistance: 1.0, oxygenEfficiency: 1.0, neurotransmitterStability: 1.1, recoveryRate: 1.1, socialNeurotransmitters: 1.4 },
            humano:     { metabolicRate: 1.0, detoxEfficiency: 1.0, stressResistance: 1.0, oxygenEfficiency: 1.0, neurotransmitterStability: 1.0, recoveryRate: 1.0 }
        };
        this.genotypeConfig = g[genotipo] || g.humano;
        this.setupMetabolicRates();
        this.setupNeurotransmitterBaselines();
    }

    setupMetabolicRates() {
        this.metabolicRates = {
            oxygenConsumption: 0.1 * this.genotypeConfig.metabolicRate,
            energyConsumption: 0.05 * this.genotypeConfig.metabolicRate,
            co2Production: 0.08 * this.genotypeConfig.metabolicRate,
            toxinElimination: 0.1 * this.genotypeConfig.detoxEfficiency,
            stressDecay: 0.2 * this.genotypeConfig.stressResistance,
            recoveryRate: 0.15 * this.genotypeConfig.recoveryRate,
            neurotransmitterDecay: 0.08 * (1 / this.genotypeConfig.neurotransmitterStability)
        };
        this._savedMetabolicRates = { ...this.metabolicRates };
    }

    setupNeurotransmitterBaselines() {
        this.neurotransmitterBaselines = {
            dopamina: 50,
            noradrenalina: 50,
            serotonina: 50,
            cortisol: 20,
            oxitocina: this.genotypeConfig.socialNeurotransmitters ? 40 : 30,
            gaba: 50,
            glutamato: 50,
            endorfinas: 30,
            acetilcolina: 50,
            adrenalina: this.genotypeConfig.adrenalineProduction ? 20 : 10,
            histamina: 20,
            melatonina: 20
        };
    }

    initializeState() {
        this.state = {
            oxigeno: 100, dioxidoCarbono: 0, monoxidoCarbono: 0, oxidoNitrico: 5,
            energia: 100, toxicidad: 0, temperatura: 37.0, ph: 7.4,
            glucosa: 80, lactato: 10, creatinina: 1, urea: 20,
            estadoHidratacion: 80, recuperacion: 75, fatigaAcumulada: 0,
            ...this.neurotransmitterBaselines,
            hormonaCrecimiento: 25,
            testosterona: this.config?.genero === 'masculino' ? 60 : 20,
            estradiol: this.config?.genero === 'femenino' ? 40 : 10,
            insulina: 15, glucagon: 10, leptina: 20, grelina: 20,
            presionArterial: { sistolica: 120, diastolica: 80 },
            frecuenciaCardiaca: 72, saturacionOxigeno: 98,
            ritmoRespiratorio: 16, variabilidadCardiaca: 50,
            homeostasisDelta: 0
        };
        this.homeostasisTargets = { ...this.state };
        this.energyHistory = [];
        this.stressHistory = [];
        this._lastHistoryAt = -Infinity;
        this._criticalCooldown = 0;
    }

    setupHomeostasisBuffer() {
        this.homeostasisBuffer = { oxigeno: [], energia: [], toxicidad: [], cortisol: [], temperatura: [] };
    }

    onEvent(cb) { this.eventListeners.push(cb); }

    emitEvent(type, data) {
        const payload = { type, data, module: 'biochemical', simTime: systemCore.systemTime };
        for (const cb of this.eventListeners) {
            try { cb(payload); }
            catch (err) { console.error('❌ bio listener:', err); }
        }
    }

    update(input, deltaTime) {
        this.lastUpdateTime = systemCore.systemTime;
        if (!input) return this.getState();

        this.processEnvironmentalExchange(input.environmental || input.environment, deltaTime);
        this.updateBasalMetabolism(deltaTime);
        this.updateNeuroendocrineSystem(deltaTime);
        this.applyHomeostasis(deltaTime);
        this.updateVitalSigns();
        this._applyHomeostasisClamp();

        systemCore.queuePersistence('biochemical', () => {
            if (systemCore.database?.isInitialized) {
                return systemCore.database.saveBiochemicalState({
                    ...this.state,
                    sim_time: systemCore.systemTime
                });
            }
        });

        return this.getState();
    }

    updateSlow(input, slowDelta) {
        this.checkCriticalConditions();
        this._criticalCooldown = Math.max(0, this._criticalCooldown - slowDelta);

        if (this.lastUpdateTime - this._lastHistoryAt >= this._historyIntervalSec) {
            this._lastHistoryAt = this.lastUpdateTime;
            this._trimHistory();
        }
    }

    processEnvironmentalExchange(env, dt) {
        if (!env) return;

        const o2Diff = ((env.oxigeno ?? 80) - this.state.oxigeno) * 0.02 * dt;
        this.state.oxigeno += o2Diff * this.genotypeConfig.oxygenEfficiency;

        if (env.toxinas) {
            this.state.toxicidad += env.toxinas * 0.01 * dt * (1 / this.genotypeConfig.detoxEfficiency);
            this.state.monoxidoCarbono += env.toxinas * 0.005 * dt;
        }
        if (env.temperatura !== undefined) {
            this.state.temperatura += (env.temperatura - this.state.temperatura) * 0.01 * dt;
        }
        if (env.peligro) {
            this.state.cortisol += env.peligro * 0.1 * dt * (1 / this.genotypeConfig.stressResistance);
            this.state.adrenalina += env.peligro * 0.08 * dt;
        }
        if (env.recompensas) {
            this.state.dopamina += env.recompensas * 0.05 * dt;
            this.state.endorfinas += env.recompensas * 0.03 * dt;
            this.state.oxitocina += env.recompensas * 0.02 * dt;
        }
    }

    updateBasalMetabolism(dt) {
        const rates = this.metabolicRates;
        const activity = this.getActivityLevel();
        const recoveryMod = this.state.recuperacion / 100;

        this.state.oxigeno -= rates.oxygenConsumption * activity * dt;
        this.state.dioxidoCarbono += rates.co2Production * activity * dt;
        this.state.energia -= rates.energyConsumption * activity * dt * (1 + this.state.fatigaAcumulada / 200);

        this.state.toxicidad -= rates.toxinElimination * dt;
        this.state.monoxidoCarbono *= (1 - rates.toxinElimination * dt);

        if (this.state.energia < 50) {
            this.state.energia += rates.recoveryRate * recoveryMod * dt * 2;
        }

        this.state.fatigaAcumulada += rates.energyConsumption * activity * 0.1 * dt;
        this.state.fatigaAcumulada = Math.max(0, this.state.fatigaAcumulada - rates.recoveryRate * 2 * dt);

        this.regulateGlucose(dt);
    }

    /**
     * FIX: antes había dos términos redundantes que hacían pull-to-base
     * (decay + 0.01*dt*stability). Ahora solo uno.
     */
    updateNeuroendocrineSystem(dt) {
        const decay = this.metabolicRates.neurotransmitterDecay * dt;
        const stability = this.genotypeConfig.neurotransmitterStability;

        for (const nt of Object.keys(this.neurotransmitterBaselines)) {
            const cur = this.state[nt] ?? 0;
            const base = this.neurotransmitterBaselines[nt];
            const diff = cur - base;
            // Pull-to-base único, escalado por estabilidad
            const pull = diff * decay * 0.5 * stability;
            this.state[nt] = cur - pull;
        }

        this.calculateNeurotransmitterInteractions(dt);
        this.regulateHormones(dt);
    }

    calculateNeurotransmitterInteractions(dt) {
        const exBalance = (this.state.dopamina + this.state.noradrenalina) / 2;
        this.state.glutamato += exBalance * 0.01 * dt;

        const cortEffect = this.state.cortisol * 0.005 * dt;
        this.state.serotonina -= cortEffect;
        this.state.dopamina -= cortEffect * 0.7;

        this.state.cortisol -= this.state.oxitocina * 0.002 * dt;
        this.state.cortisol -= this.state.serotonina * 0.001 * dt;
        this.state.cortisol -= this.state.endorfinas * 0.003 * dt;
    }

    regulateHormones(dt) {
        const cp = this.getCircadianPhase();
        this.state.cortisol += cp.cortisol * dt * 0.1;
        if (cp.isRestTime || this.state.energia < 30) {
            this.state.hormonaCrecimiento += 0.1 * dt * (1 + (100 - this.state.energia) / 100);
        }
        const glDelta = this.state.glucosa - 80;
        this.state.insulina += glDelta * 0.01 * dt;
        this.state.glucosa -= this.state.insulina * 0.05 * dt;
    }

    regulateGlucose(dt) {
        const activity = this.getActivityLevel();
        this.state.glucosa -= activity * 0.2 * dt;
        this.state.glucosa -= this.state.insulina * 0.1 * dt;
        if (this.state.cortisol > 60) this.state.glucosa += 0.1 * dt * (this.state.cortisol / 100);
        if (this.state.glucosa < 60) this.state.glucosa += 0.05 * dt;
    }

    applyHomeostasis(dt) {
        const rate = 0.05 * dt;

        for (const nt of Object.keys(this.neurotransmitterBaselines)) {
            this.state[nt] = this.clamp(this.state[nt], 0, 100);
        }

        for (const k of Object.keys(this.homeostasisTargets)) {
            if (typeof this.state[k] === 'number' && !Array.isArray(this.state[k])) {
                const diff = this.homeostasisTargets[k] - this.state[k];
                this.state[k] += diff * (Math.abs(diff) > 10 ? rate * 0.5 : rate);
            }
        }

        this.state.homeostasisDelta = this.calculateHomeostasisDelta();
    }

    calculateHomeostasisDelta() {
        let total = 0, count = 0;
        for (const k of Object.keys(this.homeostasisTargets)) {
            if (typeof this.state[k] === 'number' && !Array.isArray(this.state[k])) {
                const target = this.homeostasisTargets[k] || 1;
                total += Math.abs(target - this.state[k]) / target;
                count++;
            }
        }
        return count > 0 ? total / count : 0;
    }

    _applyHomeostasisClamp() {
        this.state.oxigeno = this.clamp(this.state.oxigeno, 0, 100);
        this.state.energia = this.clamp(this.state.energia, 0, 100);
        this.state.toxicidad = this.clamp(this.state.toxicidad, 0, 100);
        this.state.glucosa = this.clamp(this.state.glucosa, 50, 200);
        this.state.temperatura = this.clamp(this.state.temperatura, 35, 42);
        this.state.ph = this.clamp(this.state.ph, 7.0, 7.8);
        this.state.recuperacion = this.clamp(this.state.recuperacion, 0, 100);
        this.state.dioxidoCarbono = this.clamp(this.state.dioxidoCarbono, 0, 100);
        this.state.monoxidoCarbono = this.clamp(this.state.monoxidoCarbono, 0, 100);
        this.state.fatigaAcumulada = Math.max(0, this.state.fatigaAcumulada);
    }

    updateVitalSigns() {
        const baseHR = 60;
        const act = this.getActivityLevel() * 20;
        const stress = this.state.cortisol * 0.3;
        const adren = this.state.adrenalina * 0.4;
        const rec = (100 - this.state.recuperacion) * 0.2;
        this.state.frecuenciaCardiaca = this.clamp(baseHR + act + stress + adren + rec, 40, 200);

        const bpStress = this.state.cortisol * 0.2;
        const bpAct = this.getActivityLevel() * 10;
        this.state.presionArterial = {
            sistolica: 110 + bpStress + bpAct + (this.state.frecuenciaCardiaca - 60) * 0.5,
            diastolica: 70 + bpStress * 0.7 + bpAct * 0.5
        };

        this.state.saturacionOxigeno = this.clamp(this.state.oxigeno * 0.98, 70, 100);

        if (this.state.frecuenciaCardiaca < 80 && this.state.cortisol < 40) {
            this.state.recuperacion = Math.min(100, this.state.recuperacion + 0.1);
        } else {
            this.state.recuperacion = Math.max(0, this.state.recuperacion - 0.05);
        }
    }

    getActivityLevel() {
        const na = this.state.noradrenalina / 100;
        const en = this.state.energia / 100;
        const cort = this.state.cortisol > 70 ? 0.5 : 1.0;
        const fat = 1 - (this.state.fatigaAcumulada / 200);
        return Math.max(0.1, na * en * cort * fat);
    }

    getCircadianPhase() {
        const hour = systemCore.getCircadianHour();
        return {
            isRestTime: hour >= 22 || hour < 6 || (hour >= 13 && hour < 15),
            cortisol: (hour >= 7 && hour <= 9) ? 10 : ((hour >= 18 && hour <= 20) ? -5 : 0),
            melatonin: (hour >= 21 || hour < 6) ? 5 : 0
        };
    }

    checkCriticalConditions() {
        if (this._criticalCooldown > 0) return;
        const crit = {
            oxigeno: this.state.oxigeno < 15,
            energia: this.state.energia < 10,
            toxicidad: this.state.toxicidad > 85,
            cortisol: this.state.cortisol > 85
        };
        if (crit.oxigeno || crit.energia || crit.toxicidad || crit.cortisol) {
            this.emitEvent('critical', {
                type: 'bio_critical',
                severity: 0.9,
                conditions: crit,
                state: { oxigeno: this.state.oxigeno, energia: this.state.energia, toxicidad: this.state.toxicidad, cortisol: this.state.cortisol }
            });
            this._criticalCooldown = 10;
            return;
        }
        const warn = {
            oxigeno: this.state.oxigeno < 25,
            energia: this.state.energia < 20,
            toxicidad: this.state.toxicidad > 70,
            cortisol: this.state.cortisol > 70
        };
        if (warn.oxigeno || warn.energia || warn.toxicidad || warn.cortisol) {
            this.emitEvent('warning', {
                type: 'bio_warning',
                severity: 0.6,
                conditions: warn
            });
            this._criticalCooldown = 5;
        }
    }

    _trimHistory() {
        if (this.energyHistory.length > 200) this.energyHistory = this.energyHistory.slice(-200);
        if (this.stressHistory.length > 200) this.stressHistory = this.stressHistory.slice(-200);
    }

    /**
     * FIX: antes solo aplicaba deltas sin clamp y esperaba al siguiente tick.
     * Ahora aplica y clampea inmediatamente.
     */
    handleSituation(situationType, intensity) {
        const effects = this.getSituationEffects(situationType, intensity);
        for (const k of Object.keys(effects)) {
            if (this.state[k] !== undefined && typeof this.state[k] === 'number') {
                this.state[k] = this.clamp(this.state[k] + effects[k], 0, 100);
            }
        }
        this._applyHomeostasisClamp();
    }

    getSituationEffects(type, i) {
        const map = {
            'oxigeno_alto': { oxigeno: 30 * i },
            'oxigeno_bajo': { oxigeno: -40 * i, cortisol: 15 * i },
            'toxinas': { toxicidad: 25 * i, monoxidoCarbono: 15 * i },
            'limpiar_toxinas': { toxicidad: -30 * i, monoxidoCarbono: -20 * i },
            'temperatura_alta': { temperatura: 2 * i, cortisol: 5 * i },
            'temperatura_baja': { temperatura: -2 * i, cortisol: 8 * i },
            'amenaza': { cortisol: 30 * i, adrenalina: 25 * i, noradrenalina: 20 * i },
            'recompensa': { dopamina: 25 * i, endorfinas: 20 * i, oxitocina: 15 * i },
            'actividad_alta': { noradrenalina: 20 * i, energia: -15 * i },
            'reposo': { cortisol: -10 * i, energia: 10 * i, recuperacion: 15 * i },
            'interaccion_social': { oxitocina: 25 * i, dopamina: 15 * i, serotonina: 10 * i },
            'alegria': { dopamina: 20 * i, serotonina: 25 * i, endorfinas: 15 * i },
            'tristeza': { serotonina: -30 * i, dopamina: -20 * i, cortisol: 10 * i },
            'miedo': { cortisol: 35 * i, noradrenalina: 30 * i, adrenalina: 25 * i },
            'ira': { noradrenalina: 35 * i, adrenalina: 30 * i, cortisol: 20 * i },
            'confianza': { oxitocina: 30 * i, serotonina: 20 * i, cortisol: -15 * i },
            'sorpresa': { adrenalina: 20 * i, noradrenalina: 15 * i },
            'estres_alto': { cortisol: 30 * i, adrenalina: 20 * i, noradrenalina: 25 * i },
            'recuperacion': { cortisol: -20 * i, energia: 15 * i, recuperacion: 25 * i },
            'descanso': { cortisol: -15 * i, energia: 20 * i, recuperacion: 20 * i },
            'fatiga': { energia: -25 * i, cortisol: 10 * i, fatigaAcumulada: 20 * i },
            'aprendizaje_intenso': { dopamina: 15 * i, acetilcolina: 20 * i, noradrenalina: 10 * i },
            'insight': { dopamina: 20 * i, serotonina: 15 * i, endorfinas: 15 * i },
            'lesion': { toxicidad: 20 * i, cortisol: 25 * i, recuperacion: -30 * i },
            'entrenamiento': { noradrenalina: 20 * i, energia: -20 * i, fatigaAcumulada: 15 * i },
            'logro': { dopamina: 30 * i, serotonina: 20 * i, oxitocina: 15 * i },
            'fracaso': { cortisol: 25 * i, serotonina: -20 * i, dopamina: -15 * i },
            'inspiracion': { dopamina: 25 * i, serotonina: 20 * i, noradrenalina: 15 * i },
            'tormenta': { cortisol: 20 * i, noradrenalina: 15 * i },
            'desastre': { cortisol: 40 * i, adrenalina: 30 * i, toxicidad: 15 * i },
            'amanecer': { cortisol: 10 * i, oxigeno: 5 * i },
            'anochecer': { melatonina: 15 * i, cortisol: -10 * i }
        };
        return map[type] || {};
    }

    applyModulation(mod) {
        for (const k of Object.keys(mod)) {
            if (this.state[k] !== undefined && typeof this.state[k] === 'number') {
                this.state[k] = this.clamp(this.state[k] + mod[k], 0, 100);
            }
        }
    }

    adjustMetabolicRates(factor) {
        for (const k of Object.keys(this.metabolicRates)) {
            this.metabolicRates[k] = Math.max(0.01, this.metabolicRates[k] * factor);
        }
    }

    /**
     * FIX: ahora es reversible. Guarda los rates originales para restaurarlos.
     */
    emergencyProtocol() {
        if (!this._savedMetabolicRates) {
            this._savedMetabolicRates = { ...this.metabolicRates };
        }
        this.applyModulation({
            cortisol: -50, adrenalina: -30, noradrenalina: -20,
            energia: 20, oxigeno: 20, recuperacion: 20
        });
        this.adjustMetabolicRates(0.7);
        this.emitEvent('emergency', {
            type: 'bio_emergency',
            severity: 0.95,
            state: { cortisol: this.state.cortisol, energia: this.state.energia, oxigeno: this.state.oxigeno }
        });
    }

    restoreMetabolicRates() {
        if (this._savedMetabolicRates) {
            this.metabolicRates = { ...this._savedMetabolicRates };
        }
    }

    getState() { return { ...this.state }; }
    getMetabolicRates() { return { ...this.metabolicRates }; }
    getEnergyHistory() { return this.energyHistory.slice(-100); }
    getStressHistory() { return this.stressHistory.slice(-100); }
    clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

    reset() {
        this.initializeState();
        this.setupMetabolicRates();
        this.energyHistory = [];
        this.stressHistory = [];
        this._criticalCooldown = 0;
    }

    exportData() {
        return {
            state: this.getState(),
            metabolicRates: this.getMetabolicRates(),
            genotypeConfig: this.genotypeConfig,
            homeostasisTargets: this.homeostasisTargets,
            energyHistory: this.getEnergyHistory(),
            stressHistory: this.getStressHistory()
        };
    }
}

systemCore.registerModule('biochemical', new BiochemicalSystem());
