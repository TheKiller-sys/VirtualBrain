// src/modules/BiochemicalSystem.js
import { brain } from '../core/SystemCore.js';

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
    }

    async initialize(characterConfig) {
        this.config = characterConfig;
        this.setupGenotype(characterConfig.genotipo || 'humano');
        this.initializeState();
        this.setupHomeostasisBuffer();
        console.log('🧪 Sistema bioquímico V3.0 inicializado');
    }

    setupGenotype(genotipo) {
        // Parámetros humanos realistas
        const humanBase = {
            metabolicRate: 1.0,
            detoxEfficiency: 1.0,
            stressResistance: 1.0,
            oxygenEfficiency: 1.0,
            neurotransmitterStability: 1.0,
            recoveryRate: 1.0,
            cardiovascularEfficiency: 1.0,
            respiratoryEfficiency: 1.0,
            renalEfficiency: 1.0,
            hepaticEfficiency: 1.0
        };

        // Variaciones genéticas humanas realistas
        const genotypes = {
            humano: humanBase,
            atleta: {
                ...humanBase,
                metabolicRate: 1.2,
                cardiovascularEfficiency: 1.3,
                respiratoryEfficiency: 1.2,
                recoveryRate: 1.2
            },
            intelectual: {
                ...humanBase,
                neurotransmitterStability: 1.2,
                metabolicRate: 0.9,
                stressResistance: 1.1
            },
            resiliente: {
                ...humanBase,
                stressResistance: 1.3,
                recoveryRate: 1.2,
                neurotransmitterStability: 1.1
            },
            creativo: {
                ...humanBase,
                neurotransmitterStability: 1.3,
                metabolicRate: 1.1,
                detoxEfficiency: 0.9
            }
        };

        this.genotypeConfig = genotypes[genotipo] || genotypes.humano;
        this.setupMetabolicRates();
        this.setupNeurotransmitterBaselines();
    }

    setupMetabolicRates() {
        this.metabolicRates = {
            oxygenConsumption: 0.12 * this.genotypeConfig.metabolicRate,
            energyConsumption: 0.06 * this.genotypeConfig.metabolicRate,
            co2Production: 0.09 * this.genotypeConfig.metabolicRate,
            toxinElimination: 0.12 * this.genotypeConfig.detoxEfficiency,
            stressDecay: 0.25 * this.genotypeConfig.stressResistance,
            recoveryRate: 0.18 * this.genotypeConfig.recoveryRate,
            neurotransmitterDecay: 0.07 * (1 / this.genotypeConfig.neurotransmitterStability),
            heartRateVariability: 0.1,
            respiratoryRate: 0.15
        };
    }

    setupNeurotransmitterBaselines() {
        this.neurotransmitterBaselines = {
            dopamina: 45,
            noradrenalina: 45,
            serotonina: 50,
            cortisol: 25,
            oxitocina: 35,
            gaba: 50,
            glutamato: 50,
            endorfinas: 30,
            acetilcolina: 50,
            adrenalina: 15,
            histamina: 20,
            melatonina: 10
        };
    }

    initializeState() {
        this.state = {
            // Gases y metabolitos
            oxigeno: 98,
            dioxidoCarbono: 5,
            monoxidoCarbono: 0,
            oxidoNitrico: 3,
            
            // Estado metabólico
            energia: 85,
            toxicidad: 5,
            temperatura: 37.0,
            ph: 7.4,
            glucosa: 90,
            lactato: 10,
            creatinina: 1.0,
            urea: 20,
            
            // Neurotransmisores
            ...this.neurotransmitterBaselines,
            
            // Hormonas
            hormonaCrecimiento: 30,
            testosterona: this.config.genero === 'masculino' ? 60 : 20,
            estradiol: this.config.genero === 'femenino' ? 40 : 10,
            insulina: 20,
            glucagon: 15,
            leptina: 10,
            grelina: 20,
            
            // Marcadores de salud
            presionArterial: { sistolica: 120, diastolica: 80 },
            frecuenciaCardiaca: 72,
            saturacionOxigeno: 98,
            ritmoRespiratorio: 16,
            variabilidadCardiaca: 50,
            
            // Recuperación
            recuperacion: 80,
            fatigaAcumulada: 10,
            homeostasisDelta: 0,
            estadoHidratacion: 80
        };

        this.homeostasisTargets = { ...this.state };
        this.energyHistory = [];
        this.stressHistory = [];
        this.lastUpdateTime = brain.systemTime || 0;
    }

    setupHomeostasisBuffer() {
        this.homeostasisBuffer = {
            oxigeno: [],
            energia: [],
            toxicidad: [],
            cortisol: [],
            temperatura: [],
            glucosa: []
        };
    }

    onEvent(callback) {
        this.eventListeners.push(callback);
    }

    emitEvent(type, data) {
        this.eventListeners.forEach(cb => {
            try {
                cb({ type, data, module: 'biochemical' });
            } catch (error) {
                console.error('❌ Error en listener bioquímico:', error);
            }
        });
    }

    update(input, deltaTime) {
        this.lastUpdateTime = brain.systemTime || Date.now();
        
        if (!input) return this.getState();

        // 1. Procesar intercambio con el entorno
        this.processEnvironmentalExchange(input.environmental, deltaTime);
        
        // 2. Actualizar metabolismo basal
        this.updateBasalMetabolism(deltaTime);
        
        // 3. Procesar neurotransmisores y hormonas
        this.updateNeuroendocrineSystem(deltaTime);
        
        // 4. Aplicar homeostasis con amortiguación
        this.applyHomeostasis(deltaTime);
        
        // 5. Actualizar marcadores vitales
        this.updateVitalSigns();
        
        // 6. Verificar condiciones críticas
        this.checkCriticalConditions();
        
        return this.getState();
    }

    processEnvironmentalExchange(environment, deltaTime) {
        if (!environment) return;

        // Intercambio de gases
        const o2Diffusion = (environment.oxigeno || 80 - this.state.oxigeno) * 0.015 * deltaTime;
        this.state.oxigeno += o2Diffusion * this.genotypeConfig.oxygenEfficiency;
        this.state.oxigeno = this.clamp(this.state.oxigeno, 0, 100);
        
        // Acumulación de toxinas
        if (environment.toxinas) {
            const toxinIncrement = environment.toxinas * 0.008 * deltaTime;
            this.state.toxicidad += toxinIncrement * (1 / this.genotypeConfig.detoxEfficiency);
            this.state.monoxidoCarbono += environment.toxinas * 0.004 * deltaTime;
        }
        
        // Efecto de temperatura
        if (environment.temperatura !== undefined) {
            const tempDiff = environment.temperatura - this.state.temperatura;
            this.state.temperatura += tempDiff * 0.008 * deltaTime;
        }
        
        // Estrés ambiental
        if (environment.peligro) {
            const stressIncrement = environment.peligro * 0.08 * deltaTime;
            this.state.cortisol += stressIncrement * (1 / this.genotypeConfig.stressResistance);
            this.state.adrenalina += environment.peligro * 0.06 * deltaTime;
            
            this.stressHistory.push({
                time: this.lastUpdateTime,
                level: this.state.cortisol
            });
        }
        
        // Recompensas ambientales
        if (environment.recompensas) {
            this.state.dopamina += environment.recompensas * 0.04 * deltaTime;
            this.state.endorfinas += environment.recompensas * 0.03 * deltaTime;
            this.state.oxitocina += environment.recompensas * 0.02 * deltaTime;
        }
        
        // Calidad del aire
        if (environment.calidadAire !== undefined) {
            const airQualityEffect = (environment.calidadAire - 50) * 0.005 * deltaTime;
            this.state.oxigeno += airQualityEffect;
        }
    }

    updateBasalMetabolism(deltaTime) {
        const rates = this.metabolicRates;
        const activity = this.getActivityLevel();
        const recoveryMod = this.state.recuperacion / 100;
        
        // Consumo de oxígeno
        const o2Consumption = rates.oxygenConsumption * activity * deltaTime * (1 + this.state.fatigaAcumulada / 300);
        this.state.oxigeno -= o2Consumption;
        
        // Producción de CO2
        this.state.dioxidoCarbono += rates.co2Production * activity * deltaTime;
        
        // Consumo de energía
        const energyConsumption = rates.energyConsumption * activity * deltaTime * (1 + this.state.fatigaAcumulada / 200);
        this.state.energia -= energyConsumption;
        
        this.energyHistory.push({
            time: this.lastUpdateTime,
            level: this.state.energia
        });
        
        // Eliminación de toxinas
        this.state.toxicidad -= rates.toxinElimination * deltaTime;
        this.state.monoxidoCarbono *= (1 - rates.toxinElimination * deltaTime);
        
        // Recuperación de energía
        if (this.state.energia < 50) {
            const recoveryRate = rates.recoveryRate * recoveryMod * deltaTime;
            this.state.energia += recoveryRate * 2;
        }
        
        // Fatiga acumulada
        this.state.fatigaAcumulada += energyConsumption * 0.08;
        this.state.fatigaAcumulada = Math.max(0, this.state.fatigaAcumulada - rates.recoveryRate * 2 * deltaTime);
        this.state.fatigaAcumulada = this.clamp(this.state.fatigaAcumulada, 0, 100);
        
        // Regulación de glucosa
        this.regulateGlucose(deltaTime);
        
        // Regulación de hidratación
        this.regulateHydration(deltaTime);
        
        // Producción de óxido nítrico bajo estrés
        if (this.state.cortisol > 50) {
            this.state.oxidoNitrico += 0.08 * deltaTime * (this.state.cortisol / 100);
        }
        
        // Producción de lactato durante actividad intensa
        if (activity > 1.5) {
            this.state.lactato += (activity - 1.5) * 0.5 * deltaTime;
            this.state.lactato = this.clamp(this.state.lactato, 0, 50);
        } else {
            this.state.lactato *= (1 - 0.02 * deltaTime);
        }
    }

    updateNeuroendocrineSystem(deltaTime) {
        const decay = this.metabolicRates.neurotransmitterDecay * deltaTime;
        const stability = this.genotypeConfig.neurotransmitterStability;
        const circadianPhase = this.getCircadianPhase();
        
        // Degradación natural de neurotransmisores
        Object.keys(this.neurotransmitterBaselines).forEach(nt => {
            const current = this.state[nt] || 0;
            const baseline = this.neurotransmitterBaselines[nt] || 50;
            const diff = current - baseline;
            
            this.state[nt] = current - diff * decay * 0.5;
            this.state[nt] += (baseline - this.state[nt]) * 0.01 * deltaTime * stability;
            this.state[nt] = this.clamp(this.state[nt], 0, 100);
        });
        
        // Ritmo circadiano de melatonina
        this.state.melatonina = 5 + 20 * (0.5 + 0.5 * Math.sin(circadianPhase * Math.PI * 2));
        
        // Interacciones entre neurotransmisores
        this.calculateNeurotransmitterInteractions(deltaTime);
        
        // Regulación hormonal
        this.regulateHormones(deltaTime);
    }

    calculateNeurotransmitterInteractions(deltaTime) {
        // Dopamina y noradrenalina se influyen mutuamente
        const excitacionBalance = (this.state.dopamina + this.state.noradrenalina) / 2;
        this.state.glutamato += excitacionBalance * 0.008 * deltaTime;
        this.state.glutamato = this.clamp(this.state.glutamato, 0, 100);
        
        // Cortisol inhibe serotonina y dopamina
        const cortisolEffect = this.state.cortisol * 0.004 * deltaTime;
        this.state.serotonina -= cortisolEffect;
        this.state.dopamina -= cortisolEffect * 0.7;
        
        // GABA se opone a glutamato
        const inhibicionBalance = this.state.gaba - this.state.glutamato;
        if (inhibicionBalance > 0) {
            this.state.glutamato *= (1 - 0.008 * deltaTime);
        }
        
        // Oxitocina modula estrés
        this.state.cortisol -= this.state.oxitocina * 0.0015 * deltaTime;
        
        // Serotonina estabiliza
        this.state.cortisol -= this.state.serotonina * 0.0008 * deltaTime;
        
        // Endorfinas alivian estrés
        this.state.cortisol -= this.state.endorfinas * 0.002 * deltaTime;
        
        // Histamina aumenta con estrés
        this.state.histamina += this.state.cortisol * 0.002 * deltaTime;
        this.state.histamina = this.clamp(this.state.histamina, 0, 80);
    }

    regulateHormones(deltaTime) {
        const circadianPhase = this.getCircadianPhase();
        
        // Cortisol sigue ritmo circadiano (pico matutino)
        const cortisolRhythm = 5 * Math.sin((circadianPhase - 0.25) * Math.PI * 2);
        this.state.cortisol += cortisolRhythm * deltaTime * 0.1;
        
        // Hormona de crecimiento durante sueño/descanso
        if (circadianPhase > 0.7 || circadianPhase < 0.1 || this.state.energia < 30) {
            this.state.hormonaCrecimiento += 0.08 * deltaTime * (1 + (100 - this.state.energia) / 100);
        }
        
        // Regulación de insulina basada en glucosa
        const glucoseDelta = this.state.glucosa - 90;
        this.state.insulina += glucoseDelta * 0.008 * deltaTime;
        this.state.insulina = this.clamp(this.state.insulina, 0, 80);
        
        // Insulina reduce glucosa
        this.state.glucosa -= this.state.insulina * 0.04 * deltaTime;
        
        // Glucagon aumenta glucosa
        if (this.state.glucosa < 70) {
            this.state.glucagon += 0.02 * deltaTime;
            this.state.glucosa += this.state.glucagon * 0.01 * deltaTime;
        }
        this.state.glucagon = this.clamp(this.state.glucagon, 0, 30);
        
        // Leptina y grelina (regulación del apetito)
        this.state.leptina += (this.state.energia / 100 - 0.5) * 0.01 * deltaTime;
        this.state.leptina = this.clamp(this.state.leptina, 0, 100);
        
        this.state.grelina += (0.5 - this.state.energia / 100) * 0.01 * deltaTime;
        this.state.grelina = this.clamp(this.state.grelina, 0, 100);
    }

    regulateGlucose(deltaTime) {
        // Consumo de glucosa basado en actividad
        const activity = this.getActivityLevel();
        this.state.glucosa -= activity * 0.15 * deltaTime;
        
        // Regulación por insulina
        const insulinEffect = this.state.insulina * 0.08;
        this.state.glucosa -= insulinEffect * deltaTime;
        
        // Gluconeogénesis bajo estrés
        if (this.state.cortisol > 60) {
            this.state.glucosa += 0.08 * deltaTime * (this.state.cortisol / 100);
        }
        
        // Recuperación de glucosa
        if (this.state.glucosa < 60) {
            this.state.glucosa += 0.04 * deltaTime;
        }
        
        this.state.glucosa = this.clamp(this.state.glucosa, 40, 180);
    }

    regulateHydration(deltaTime) {
        // Pérdida de agua por actividad
        const activity = this.getActivityLevel();
        this.state.estadoHidratacion -= activity * 0.2 * deltaTime;
        
        // Recuperación de hidratación
        if (this.state.estadoHidratacion < 60) {
            this.state.estadoHidratacion += 0.05 * deltaTime;
        }
        
        this.state.estadoHidratacion = this.clamp(this.state.estadoHidratacion, 0, 100);
        
        // Efecto de hidratación en rendimiento
        if (this.state.estadoHidratacion < 30) {
            this.state.energia -= 0.05 * deltaTime;
        }
    }

    applyHomeostasis(deltaTime) {
        const rate = 0.04 * deltaTime;
        
        // Mantener todos los valores dentro de límites fisiológicos
        this.state.oxigeno = this.clamp(this.state.oxigeno, 0, 100);
        this.state.energia = this.clamp(this.state.energia, 0, 100);
        this.state.toxicidad = this.clamp(this.state.toxicidad, 0, 100);
        this.state.glucosa = this.clamp(this.state.glucosa, 40, 180);
        this.state.temperatura = this.clamp(this.state.temperatura, 35, 42);
        this.state.ph = this.clamp(this.state.ph, 7.0, 7.8);
        this.state.recuperacion = this.clamp(this.state.recuperacion, 0, 100);
        
        // Aplicar tendencia hacia homeostasis
        Object.keys(this.homeostasisTargets).forEach(key => {
            if (typeof this.state[key] === 'number' && !Array.isArray(this.state[key])) {
                const target = this.homeostasisTargets[key] || 50;
                const current = this.state[key] || 0;
                const difference = target - current;
                
                if (Math.abs(difference) > 10) {
                    this.state[key] += difference * rate * 0.3;
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
                const target = this.homeostasisTargets[key] || 50;
                const current = this.state[key] || 0;
                const diff = Math.abs(target - current) / (target || 1);
                totalDelta += diff;
                count++;
            }
        });
        
        return count > 0 ? totalDelta / count : 0;
    }

    updateVitalSigns() {
        const activity = this.getActivityLevel();
        const stressLevel = this.state.cortisol / 100;
        const fatigueLevel = this.state.fatigaAcumulada / 100;
        
        // Frecuencia cardíaca
        const baseHR = 60;
        const activityEffect = activity * 15;
        const stressEffect = stressLevel * 25;
        const fatigueEffect = fatigueLevel * 10;
        const recoveryEffect = (100 - this.state.recuperacion) * 0.1;
        
        this.state.frecuenciaCardiaca = baseHR + activityEffect + stressEffect + fatigueEffect + recoveryEffect;
        this.state.frecuenciaCardiaca = this.clamp(this.state.frecuenciaCardiaca, 40, 200);
        
        // Variabilidad cardíaca (HRV)
        const hrvBase = 50;
        const hrvStress = stressLevel * -30;
        const hrvRecovery = (this.state.recuperacion / 100) * 20;
        this.state.variabilidadCardiaca = hrvBase + hrvStress + hrvRecovery;
        this.state.variabilidadCardiaca = this.clamp(this.state.variabilidadCardiaca, 10, 100);
        
        // Presión arterial
        const bpBase = { sistolica: 110, diastolica: 70 };
        const bpStress = stressLevel * 20;
        const bpActivity = activity * 10;
        const bpCardiac = (this.state.frecuenciaCardiaca - 60) * 0.3;
        
        this.state.presionArterial = {
            sistolica: bpBase.sistolica + bpStress + bpActivity + bpCardiac,
            diastolica: bpBase.diastolica + bpStress * 0.6 + bpActivity * 0.5
        };
        
        // Saturación de oxígeno
        this.state.saturacionOxigeno = 98 - (100 - this.state.oxigeno) * 0.3;
        this.state.saturacionOxigeno = this.clamp(this.state.saturacionOxigeno, 70, 100);
        
        // Ritmo respiratorio
        const baseRR = 16;
        const rrStress = stressLevel * 8;
        const rrActivity = activity * 3;
        const rrRecovery = fatigueLevel * 2;
        this.state.ritmoRespiratorio = baseRR + rrStress + rrActivity - rrRecovery;
        this.state.ritmoRespiratorio = this.clamp(this.state.ritmoRespiratorio, 8, 30);
        
        // Recuperación
        if (this.state.frecuenciaCardiaca < 80 && this.state.cortisol < 40) {
            this.state.recuperacion = Math.min(100, this.state.recuperacion + 0.08);
        } else {
            this.state.recuperacion = Math.max(0, this.state.recuperacion - 0.04);
        }
    }

    getActivityLevel() {
        const baseActivity = 1.0;
        const noradrenalineEffect = this.state.noradrenalina / 100;
        const energyEffect = this.state.energia / 100;
        const cortisolEffect = this.state.cortisol > 70 ? 0.6 : (this.state.cortisol > 40 ? 0.8 : 1.0);
        const fatigueEffect = 1 - (this.state.fatigaAcumulada / 200);
        const hydrationEffect = this.state.estadoHidratacion / 100;
        
        return baseActivity * noradrenalineEffect * energyEffect * cortisolEffect * fatigueEffect * hydrationEffect;
    }

    getCircadianPhase() {
        const time = brain.systemTime || Date.now();
        const daySeconds = time % 86400;
        const hour = (daySeconds / 3600) % 24;
        return hour / 24;
    }

    checkCriticalConditions() {
        const critical = {
            oxigeno: this.state.oxigeno < 15,
            energia: this.state.energia < 10,
            toxicidad: this.state.toxicidad > 85,
            cortisol: this.state.cortisol > 85,
            temperatura: this.state.temperatura > 40 || this.state.temperatura < 35,
            glucosa: this.state.glucosa < 50 || this.state.glucosa > 160
        };
        
        if (Object.values(critical).some(v => v)) {
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
            cortisol: this.state.cortisol > 70,
            temperatura: this.state.temperatura > 38.5 || this.state.temperatura < 36,
            estadoHidratacion: this.state.estadoHidratacion < 30
        };
        
        if (Object.values(warning).some(v => v)) {
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
                const current = this.state[key] || 0;
                const change = effects[key];
                this.state[key] = this.clamp(current + change, 0, 100);
            }
        });
        
        console.log(`🧪 Efecto bioquímico aplicado: ${situationType}`);
    }

    getSituationEffects(situationType, intensity) {
        const effectsMap = {
            'oxigeno_alto': { oxigeno: 25 * intensity },
            'oxigeno_bajo': { oxigeno: -35 * intensity, cortisol: 12 * intensity },
            'toxinas': { toxicidad: 30 * intensity, monoxidoCarbono: 15 * intensity },
            'limpiar_toxinas': { toxicidad: -35 * intensity, monoxidoCarbono: -20 * intensity },
            'temperatura_alta': { temperatura: 2 * intensity, cortisol: 4 * intensity },
            'temperatura_baja': { temperatura: -2 * intensity, cortisol: 6 * intensity },
            'amenaza': { cortisol: 35 * intensity, adrenalina: 25 * intensity, noradrenalina: 20 * intensity },
            'recompensa': { dopamina: 25 * intensity, endorfinas: 20 * intensity, oxitocina: 15 * intensity },
            'actividad_alta': { noradrenalina: 20 * intensity, energia: -15 * intensity, lactato: 5 * intensity },
            'reposo': { cortisol: -12 * intensity, energia: 8 * intensity, recuperacion: 15 * intensity },
            'interaccion_social': { oxitocina: 25 * intensity, dopamina: 15 * intensity, serotonina: 10 * intensity },
            'alegria': { dopamina: 20 * intensity, serotonina: 25 * intensity, endorfinas: 15 * intensity },
            'tristeza': { serotonina: -25 * intensity, dopamina: -15 * intensity, cortisol: 8 * intensity },
            'miedo': { cortisol: 35 * intensity, noradrenalina: 30 * intensity, adrenalina: 25 * intensity },
            'ira': { noradrenalina: 35 * intensity, adrenalina: 30 * intensity, cortisol: 20 * intensity },
            'confianza': { oxitocina: 30 * intensity, serotonina: 20 * intensity, cortisol: -15 * intensity },
            'sorpresa': { adrenalina: 20 * intensity, noradrenalina: 15 * intensity, cortisol: 10 * intensity },
            'hidratacion': { estadoHidratacion: 20 * intensity },
            'deshidratacion': { estadoHidratacion: -20 * intensity, energia: -10 * intensity }
        };
        
        return effectsMap[situationType] || {};
    }

    applyModulation(modulation) {
        Object.keys(modulation).forEach(key => {
            if (this.state[key] !== undefined) {
                const current = this.state[key] || 0;
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
            recuperacion: 25
        });
        
        this.adjustMetabolicRates(0.7);
        
        this.emitEvent('emergency', {
            type: 'bio_emergency',
            state: { ...this.state }
        });
        
        console.log('🚨 Protocolo de emergencia bioquímico activado');
    }

    restoreAfterEmergency() {
        this.adjustMetabolicRates(1.0);
        this.adjustNeurotransmitterBalance(1.0);
        
        console.log('✅ Sistema bioquímico restaurado después de emergencia');
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
        this.homeostasisBuffer = {};
        this.setupHomeostasisBuffer();
        console.log('🔄 Sistema bioquímico reiniciado');
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

// Registrar módulo
brain.registerModule('biochemical', new BiochemicalSystem());
