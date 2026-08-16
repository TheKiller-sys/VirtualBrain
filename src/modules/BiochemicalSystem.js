// src/modules/BiochemicalSystem.js
import { systemCore } from '../core/SystemCore.js';

export class BiochemicalSystem {
    constructor() {
        this.state = {};
        this.config = {};
        this.metabolicRates = {};
        this.neurotransmitterBaselines = {};
        this.eventListeners = [];
        this.homeostasisBuffer = {};
        this.lastUpdateTime = 0;
        this.energyHistory = [];
        this.stressHistory = [];
        this.genotypeConfig = {};
    }

    async initialize(characterConfig) {
        // ✅ Asegurar que characterConfig existe
        this.config = characterConfig || { genotipo: 'humano' };
        this.setupGenotype(this.config.genotipo || 'humano');
        this.initializeState();
        this.setupHomeostasisBuffer();
        systemCore.logSystem('Sistema bioquímico V2.0 inicializado');
    }

    setupGenotype(genotipo) {
        const genotypes = {
            resiliente: {
                metabolicRate: 1.0,
                detoxEfficiency: 1.3,
                stressResistance: 1.2,
                oxygenEfficiency: 1.1,
                neurotransmitterStability: 1.2,
                recoveryRate: 1.3
            },
            vulnerable: {
                metabolicRate: 0.8,
                detoxEfficiency: 0.7,
                stressResistance: 0.6,
                oxygenEfficiency: 0.9,
                neurotransmitterStability: 0.7,
                recoveryRate: 0.6
            },
            audaz: {
                metabolicRate: 1.2,
                detoxEfficiency: 1.1,
                stressResistance: 0.9,
                oxygenEfficiency: 1.0,
                neurotransmitterStability: 0.9,
                recoveryRate: 0.9,
                adrenalineProduction: 1.4
            },
            intelectual: {
                metabolicRate: 0.9,
                detoxEfficiency: 1.0,
                stressResistance: 1.1,
                oxygenEfficiency: 1.2,
                neurotransmitterStability: 1.1,
                recoveryRate: 1.0,
                cognitiveEfficiency: 1.3
            },
            social: {
                metabolicRate: 1.0,
                detoxEfficiency: 1.0,
                stressResistance: 1.0,
                oxygenEfficiency: 1.0,
                neurotransmitterStability: 1.1,
                recoveryRate: 1.1,
                socialNeurotransmitters: 1.4
            },
            humano: {
                metabolicRate: 1.0,
                detoxEfficiency: 1.0,
                stressResistance: 1.0,
                oxygenEfficiency: 1.0,
                neurotransmitterStability: 1.0,
                recoveryRate: 1.0
            }
        };

        this.genotypeConfig = genotypes[genotipo] || genotypes.humano;
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
            adrenalina: this.genotypeConfig.adrenalineProduction ? 20 : 10
        };
    }

    initializeState() {
        this.state = {
            oxigeno: 100,
            dioxidoCarbono: 0,
            monoxidoCarbono: 0,
            oxidoNitrico: 5,
            energia: 100,
            toxicidad: 0,
            temperatura: 37.0,
            ph: 7.4,
            glucosa: 80,
            ...this.neurotransmitterBaselines,
            hormonaCrecimiento: 25,
            testosterona: this.config?.genero === 'masculino' ? 60 : 20,
            estradiol: this.config?.genero === 'femenino' ? 40 : 10,
            insulina: 15,
            presionArterial: { sistolica: 120, diastolica: 80 },
            frecuenciaCardiaca: 72,
            saturacionOxigeno: 98,
            recuperacion: 75,
            fatigaAcumulada: 0,
            homeostasisDelta: 0
        };

        this.homeostasisTargets = { ...this.state };
        this.energyHistory = [];
        this.stressHistory = [];
    }

    setupHomeostasisBuffer() {
        this.homeostasisBuffer = {
            oxigeno: [],
            energia: [],
            toxicidad: [],
            cortisol: [],
            temperatura: []
        };
    }

    onEvent(callback) {
        this.eventListeners.push(callback);
    }

    emitEvent(type, data) {
        this.eventListeners.forEach(cb => cb({ type, data, module: 'biochemical' }));
    }

    update(input, deltaTime) {
        this.lastUpdateTime = systemCore.systemTime || Date.now();
        
        if (!input) return this.getState();

        this.processEnvironmentalExchange(input.environmental, deltaTime);
        this.updateBasalMetabolism(deltaTime);
        this.updateNeuroendocrineSystem(deltaTime);
        this.applyHomeostasis(deltaTime);
        this.updateVitalSigns();
        this.checkCriticalConditions();
        
        return this.getState();
    }

    processEnvironmentalExchange(environment, deltaTime) {
        if (!environment) return;

        const o2Diffusion = (environment.oxigeno - this.state.oxigeno) * 0.02 * deltaTime;
        this.state.oxigeno += o2Diffusion * this.genotypeConfig.oxygenEfficiency;
        this.state.oxigeno = this.clamp(this.state.oxigeno, 0, 100);
        
        if (environment.toxinas) {
            const toxinIncrement = environment.toxinas * 0.01 * deltaTime;
            this.state.toxicidad += toxinIncrement * (1 / this.genotypeConfig.detoxEfficiency);
            this.state.monoxidoCarbono += environment.toxinas * 0.005 * deltaTime;
        }
        
        if (environment.temperatura !== undefined) {
            const tempDiff = environment.temperatura - this.state.temperatura;
            this.state.temperatura += tempDiff * 0.01 * deltaTime;
        }
        
        if (environment.peligro) {
            const stressIncrement = environment.peligro * 0.1 * deltaTime;
            this.state.cortisol += stressIncrement * (1 / this.genotypeConfig.stressResistance);
            this.state.adrenalina += environment.peligro * 0.08 * deltaTime;
            
            this.stressHistory.push({
                time: this.lastUpdateTime,
                level: this.state.cortisol
            });
        }
        
        if (environment.recompensas) {
            this.state.dopamina += environment.recompensas * 0.05 * deltaTime;
            this.state.endorfinas += environment.recompensas * 0.03 * deltaTime;
            this.state.oxitocina += environment.recompensas * 0.02 * deltaTime;
        }
    }

    updateBasalMetabolism(deltaTime) {
        const rates = this.metabolicRates;
        const activity = this.getActivityLevel();
        const recoveryMod = this.state.recuperacion / 100;
        
        const o2Consumption = rates.oxygenConsumption * activity * deltaTime;
        this.state.oxigeno -= o2Consumption;
        
        this.state.dioxidoCarbono += rates.co2Production * activity * deltaTime;
        
        const energyConsumption = rates.energyConsumption * activity * deltaTime * (1 + this.state.fatigaAcumulada / 200);
        this.state.energia -= energyConsumption;
        
        this.energyHistory.push({
            time: this.lastUpdateTime,
            level: this.state.energia
        });
        
        this.state.toxicidad -= rates.toxinElimination * deltaTime;
        this.state.monoxidoCarbono *= (1 - rates.toxinElimination * deltaTime);
        
        if (this.state.energia < 50) {
            const recoveryRate = rates.recoveryRate * recoveryMod * deltaTime;
            this.state.energia += recoveryRate * 2;
        }
        
        this.state.fatigaAcumulada += energyConsumption * 0.1;
        this.state.fatigaAcumulada = Math.max(0, this.state.fatigaAcumulada - rates.recoveryRate * 2 * deltaTime);
        
        this.regulateGlucose(deltaTime);
        
        if (this.state.cortisol > 50) {
            this.state.oxidoNitrico += 0.1 * deltaTime * (this.state.cortisol / 100);
        }
    }

    updateNeuroendocrineSystem(deltaTime) {
        const decay = this.metabolicRates.neurotransmitterDecay * deltaTime;
        const stability = this.genotypeConfig.neurotransmitterStability;
        
        Object.keys(this.neurotransmitterBaselines).forEach(nt => {
            const current = this.state[nt];
            const baseline = this.neurotransmitterBaselines[nt];
            const diff = current - baseline;
            
            this.state[nt] = current - diff * decay * 0.5;
            this.state[nt] += (baseline - this.state[nt]) * 0.01 * deltaTime * stability;
        });
        
        this.calculateNeurotransmitterInteractions(deltaTime);
        this.regulateHormones(deltaTime);
    }

    calculateNeurotransmitterInteractions(deltaTime) {
        const excitacionBalance = (this.state.dopamina + this.state.noradrenalina) / 2;
        this.state.glutamato += excitacionBalance * 0.01 * deltaTime;
        
        const cortisolEffect = this.state.cortisol * 0.005 * deltaTime;
        this.state.serotonina -= cortisolEffect;
        this.state.dopamina -= cortisolEffect * 0.7;
        
        const inhibicionBalance = this.state.gaba - this.state.glutamato;
        if (inhibicionBalance > 0) {
            this.state.glutamato *= (1 - 0.01 * deltaTime);
        }
        
        this.state.cortisol -= this.state.oxitocina * 0.002 * deltaTime;
        this.state.cortisol -= this.state.serotonina * 0.001 * deltaTime;
        this.state.cortisol -= this.state.endorfinas * 0.003 * deltaTime;
    }

    regulateHormones(deltaTime) {
        const circadianPhase = this.getCircadianPhase();
        this.state.cortisol += circadianPhase.cortisol * deltaTime * 0.1;
        
        if (circadianPhase.isRestTime || this.state.energia < 30) {
            this.state.hormonaCrecimiento += 0.1 * deltaTime * (1 + (100 - this.state.energia) / 100);
        }
        
        const glucoseDelta = this.state.glucosa - 80;
        this.state.insulina += glucoseDelta * 0.01 * deltaTime;
        this.state.glucosa -= this.state.insulina * 0.05 * deltaTime;
    }

    regulateGlucose(deltaTime) {
        const activity = this.getActivityLevel();
        this.state.glucosa -= activity * 0.2 * deltaTime;
        
        const insulinEffect = this.state.insulina * 0.1;
        this.state.glucosa -= insulinEffect * deltaTime;
        
        if (this.state.cortisol > 60) {
            this.state.glucosa += 0.1 * deltaTime * (this.state.cortisol / 100);
        }
        
        if (this.state.glucosa < 60) {
            this.state.glucosa += 0.05 * deltaTime;
        }
    }

    applyHomeostasis(deltaTime) {
        const rate = 0.05 * deltaTime;
        
        this.state.oxigeno = this.clamp(this.state.oxigeno, 0, 100);
        this.state.energia = this.clamp(this.state.energia, 0, 100);
        this.state.toxicidad = this.clamp(this.state.toxicidad, 0, 100);
        this.state.glucosa = this.clamp(this.state.glucosa, 50, 200);
        this.state.temperatura = this.clamp(this.state.temperatura, 35, 42);
        this.state.ph = this.clamp(this.state.ph, 7.0, 7.8);
        this.state.recuperacion = this.clamp(this.state.recuperacion, 0, 100);
        
        Object.keys(this.neurotransmitterBaselines).forEach(nt => {
            this.state[nt] = this.clamp(this.state[nt], 0, 100);
        });
        
        Object.keys(this.homeostasisTargets).forEach(key => {
            if (typeof this.state[key] === 'number' && !Array.isArray(this.state[key])) {
                const target = this.homeostasisTargets[key];
                const current = this.state[key];
                const difference = target - current;
                
                if (Math.abs(difference) > 10) {
                    this.state[key] += difference * rate * 0.5;
                } else {
                    this.state[key] += difference * rate;
                }
            }
        });
        
        this.state.homeostasisDelta = this.calculateHomeostasisDelta();
    }

    calculateHomeostasisDelta() {
        let totalDelta = 0;
        let count = 0;
        
        Object.keys(this.homeostasisTargets).forEach(key => {
            if (typeof this.state[key] === 'number' && !Array.isArray(this.state[key])) {
                const target = this.homeostasisTargets[key];
                const current = this.state[key];
                const diff = Math.abs(target - current) / (target || 1);
                totalDelta += diff;
                count++;
            }
        });
        
        return count > 0 ? totalDelta / count : 0;
    }

    updateVitalSigns() {
        const baseHR = 60;
        const activityEffect = this.getActivityLevel() * 20;
        const stressEffect = this.state.cortisol * 0.3;
        const adrenalineEffect = this.state.adrenalina * 0.4;
        const recoveryEffect = (100 - this.state.recuperacion) * 0.2;
        
        this.state.frecuenciaCardiaca = baseHR + activityEffect + stressEffect + adrenalineEffect + recoveryEffect;
        this.state.frecuenciaCardiaca = this.clamp(this.state.frecuenciaCardiaca, 40, 200);
        
        const bpBase = { sistolica: 110, diastolica: 70 };
        const bpStress = this.state.cortisol * 0.2;
        const bpActivity = this.getActivityLevel() * 10;
        
        this.state.presionArterial = {
            sistolica: bpBase.sistolica + bpStress + bpActivity + (this.state.frecuenciaCardiaca - 60) * 0.5,
            diastolica: bpBase.diastolica + bpStress * 0.7 + bpActivity * 0.5
        };
        
        this.state.saturacionOxigeno = this.state.oxigeno * 0.98;
        this.state.saturacionOxigeno = this.clamp(this.state.saturacionOxigeno, 70, 100);
        
        if (this.state.frecuenciaCardiaca < 80 && this.state.cortisol < 40) {
            this.state.recuperacion = Math.min(100, this.state.recuperacion + 0.1);
        } else {
            this.state.recuperacion = Math.max(0, this.state.recuperacion - 0.05);
        }
    }

    getActivityLevel() {
        const baseActivity = 1.0;
        const noradrenalineEffect = this.state.noradrenalina / 100;
        const energyEffect = this.state.energia / 100;
        const cortisolEffect = this.state.cortisol > 70 ? 0.5 : 1.0;
        const fatigueEffect = 1 - (this.state.fatigaAcumulada / 200);
        
        return baseActivity * noradrenalineEffect * energyEffect * cortisolEffect * fatigueEffect;
    }

    getCircadianPhase() {
        const systemTime = systemCore.systemTime || Date.now();
        const daySeconds = systemTime % 86400;
        const hour = (daySeconds / 3600) % 24;
        
        return {
            isRestTime: hour >= 22 || hour < 6 || (hour >= 13 && hour < 15),
            cortisol: hour >= 7 && hour <= 9 ? 10 : (hour >= 18 && hour <= 20 ? -5 : 0),
            melatonin: hour >= 21 || hour < 6 ? 5 : 0
        };
    }

    checkCriticalConditions() {
        const critical = {
            oxigeno: this.state.oxigeno < 15,
            energia: this.state.energia < 10,
            toxicidad: this.state.toxicidad > 85,
            cortisol: this.state.cortisol > 85
        };
        
        if (critical.oxigeno || critical.energia || critical.toxicidad || critical.cortisol) {
            this.emitEvent('critical', {
                type: 'bio_critical',
                conditions: critical,
                state: { ...this.state }
            });
        }
        
        const warning = {
            oxigeno: this.state.oxigeno < 25,
            energia: this.state.energia < 20,
            toxicidad: this.state.toxicidad > 70,
            cortisol: this.state.cortisol > 70
        };
        
        if (warning.oxigeno || warning.energia || warning.toxicidad || warning.cortisol) {
            this.emitEvent('warning', {
                type: 'bio_warning',
                conditions: warning,
                state: { ...this.state }
            });
        }
    }

    handleSituation(situationType, intensity) {
        const effects = this.getSituationEffects(situationType, intensity);
        
        Object.keys(effects).forEach(key => {
            if (this.state[key] !== undefined) {
                const current = this.state[key];
                const change = effects[key];
                this.state[key] = this.clamp(current + change, 0, 100);
            }
        });
        
        systemCore.logSystem(`Efecto bioquímico aplicado: ${situationType}`);
    }

    getSituationEffects(situationType, intensity) {
        const effectsMap = {
            'oxigeno_alto': { oxigeno: 30 * intensity },
            'oxigeno_bajo': { oxigeno: -40 * intensity, cortisol: 15 * intensity },
            'toxinas': { toxicidad: 25 * intensity, monoxidoCarbono: 15 * intensity },
            'limpiar_toxinas': { toxicidad: -30 * intensity, monoxidoCarbono: -20 * intensity },
            'temperatura_alta': { temperatura: 2 * intensity, cortisol: 5 * intensity },
            'temperatura_baja': { temperatura: -2 * intensity, cortisol: 8 * intensity },
            'amenaza': { cortisol: 30 * intensity, adrenalina: 25 * intensity, noradrenalina: 20 * intensity },
            'recompensa': { dopamina: 25 * intensity, endorfinas: 20 * intensity, oxitocina: 15 * intensity },
            'actividad_alta': { noradrenalina: 20 * intensity, energia: -15 * intensity },
            'reposo': { cortisol: -10 * intensity, energia: 10 * intensity, recuperacion: 15 * intensity },
            'interaccion_social': { oxitocina: 25 * intensity, dopamina: 15 * intensity, serotonina: 10 * intensity },
            'alegria': { dopamina: 20 * intensity, serotonina: 25 * intensity, endorfinas: 15 * intensity },
            'tristeza': { serotonina: -30 * intensity, dopamina: -20 * intensity, cortisol: 10 * intensity },
            'miedo': { cortisol: 35 * intensity, noradrenalina: 30 * intensity, adrenalina: 25 * intensity },
            'ira': { noradrenalina: 35 * intensity, adrenalina: 30 * intensity, cortisol: 20 * intensity },
            'confianza': { oxitocina: 30 * intensity, serotonina: 20 * intensity, cortisol: -15 * intensity },
            'sorpresa': { adrenalina: 20 * intensity, noradrenalina: 15 * intensity }
        };
        
        return effectsMap[situationType] || {};
    }

    applyModulation(modulation) {
        Object.keys(modulation).forEach(key => {
            if (this.state[key] !== undefined) {
                const current = this.state[key];
                const change = modulation[key];
                this.state[key] = this.clamp(current + change, 0, 100);
            }
        });
    }

    adjustMetabolicRates(factor) {
        Object.keys(this.metabolicRates).forEach(key => {
            this.metabolicRates[key] *= factor;
            this.metabolicRates[key] = Math.max(0.01, this.metabolicRates[key]);
        });
    }

    adjustNeurotransmitterBalance(factor) {
        Object.keys(this.neurotransmitterBaselines).forEach(key => {
            this.neurotransmitterBaselines[key] *= factor;
            this.neurotransmitterBaselines[key] = Math.max(1, this.neurotransmitterBaselines[key]);
        });
    }

    emergencyProtocol() {
        this.applyModulation({
            cortisol: -50,
            adrenalina: -30,
            noradrenalina: -20,
            energia: 20,
            oxigeno: 20,
            recuperacion: 20
        });
        
        this.adjustMetabolicRates(0.7);
        
        this.emitEvent('emergency', {
            type: 'bio_emergency',
            state: { ...this.state }
        });
    }

    getState() {
        return { ...this.state };
    }

    getMetabolicRates() {
        return { ...this.metabolicRates };
    }

    getEnergyHistory() {
        return this.energyHistory.slice(-100);
    }

    getStressHistory() {
        return this.stressHistory.slice(-100);
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    reset() {
        this.initializeState();
        this.energyHistory = [];
        this.stressHistory = [];
    }

    exportData() {
        return {
            state: this.getState(),
            metabolicRates: this.getMetabolicRates(),
            genotypeConfig: this.genotypeConfig,
            homeostasisTargets: this.homeostasisTargets,
            energyHistory: this.getEnergyHistory(),
            stressHistory: this.getStressHistory(),
            homeostasisBuffer: this.homeostasisBuffer
        };
    }
}

// Registrar el módulo
systemCore.registerModule('biochemical', new BiochemicalSystem());
