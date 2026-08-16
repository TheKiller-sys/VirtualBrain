// src/modules/MotorSystem.js
import { systemCore } from '../core/SystemCore.js';

export class MotorSystem {
    constructor() {
        this.state = {};
        this.config = {};
        this.motorSkills = new Map();
        this.actionQueue = [];
        this.currentAction = null;
        this.motorMemory = new Map();
        this.eventListeners = [];
        this.lastUpdateTime = 0;
        this.motorLearning = 0;
        this.executionHistory = [];
        this.movementPatterns = [];
        this.reflexes = new Map();
        this.motorProfile = {};
    }

    async initialize(characterConfig) {
        this.config = characterConfig || { genotipo: 'humano' };
        this.setupMotorProfile();
        this.initializeState();
        this.setupBasicSkills();
        this.setupMotorLearning();
        this.setupReflexes();
        systemCore.logSystem('Sistema motor V3.0 inicializado');
    }

    setupMotorProfile() {
        const genotipo = this.config?.genotipo || 'humano';
        
        const profiles = {
            humano: {
                coordination: 1.0,
                strength: 1.0,
                endurance: 1.0,
                recovery: 1.0,
                precision: 1.0,
                agility: 1.0,
                motorLearning: 1.0,
                fineMotor: 1.0,
                reflexSpeed: 1.0
            },
            resiliente: {
                coordination: 1.2,
                strength: 1.1,
                endurance: 1.3,
                recovery: 1.2,
                precision: 1.1,
                agility: 1.0,
                motorLearning: 1.2
            },
            vulnerable: {
                coordination: 0.8,
                strength: 0.7,
                endurance: 0.6,
                recovery: 0.8,
                precision: 0.9,
                agility: 0.7,
                motorLearning: 0.8
            },
            audaz: {
                coordination: 1.3,
                strength: 1.4,
                endurance: 1.1,
                recovery: 1.0,
                precision: 0.9,
                agility: 1.5,
                motorLearning: 1.0,
                riskTaking: 1.4
            },
            intelectual: {
                coordination: 1.1,
                strength: 0.9,
                endurance: 1.0,
                recovery: 1.1,
                precision: 1.4,
                agility: 1.0,
                motorLearning: 1.3,
                fineMotor: 1.3
            },
            social: {
                coordination: 1.2,
                strength: 1.0,
                endurance: 1.1,
                recovery: 1.2,
                precision: 1.1,
                agility: 1.1,
                motorLearning: 1.1,
                expressive: 1.4
            }
        };

        this.motorProfile = profiles[genotipo] || profiles.humano;
    }

    initializeState() {
        this.state = {
            coordinacion: 80,
            fuerza: 75,
            velocidad: 70,
            precision: 72,
            agilidad: 65,
            equilibrio: 68,
            resistencia: 75,
            fatiga: 20,
            recuperacion: 70,
            controlVoluntario: 78,
            controlAutomatico: 82,
            fluidez: 74,
            tension: 25,
            relajacion: 60,
            estabilidad: 76,
            precisionFina: 70,
            fuerzaExplosiva: 65,
            resistenciaMuscular: 72,
            tiempoReaccion: 60,
            propiocepcion: 65,
            aprendizajeMotor: 50,
            fluidezMovimiento: 70,
            reflejos: 75
        };

        this.motorSkills = new Map();
        this.actionQueue = [];
        this.currentAction = null;
        this.energyExpenditure = 0;
        this.motorLearning = 0;
        this.executionHistory = [];
        this.movementPatterns = [];
        this.reflexes = new Map();
        
        this.applyMotorProfile();
    }

    setupMotorLearning() {
        this.motorLearning = {
            rate: 0.06 * this.motorProfile.motorLearning,
            decay: 0.008,
            retention: 0.9,
            practiceEffect: 0.12
        };
    }

    setupReflexes() {
        this.reflexes.set('retirar_mano', {
            trigger: 'dolor_agudo',
            response: 'retirar',
            speed: 0.15,
            priority: 10
        });
        
        this.reflexes.set('parpadeo', {
            trigger: 'estimulo_visual',
            response: 'parpadear',
            speed: 0.1,
            priority: 8
        });
        
        this.reflexes.set('equilibrio', {
            trigger: 'perdida_equilibrio',
            response: 'ajustar_postura',
            speed: 0.2,
            priority: 9
        });
    }

    applyMotorProfile() {
        Object.keys(this.state).forEach(capacity => {
            const profileFactor = this.getProfileFactorForCapacity(capacity);
            this.state[capacity] *= profileFactor;
        });
    }

    getProfileFactorForCapacity(capacity) {
        const factorMap = {
            coordinacion: this.motorProfile.coordination,
            fuerza: this.motorProfile.strength,
            resistencia: this.motorProfile.endurance,
            precision: this.motorProfile.precision,
            agilidad: this.motorProfile.agility || 1.0,
            recuperacion: this.motorProfile.recovery,
            precisionFina: this.motorProfile.fineMotor || 1.0,
            aprendizajeMotor: this.motorProfile.motorLearning || 1.0,
            reflejos: this.motorProfile.reflexSpeed || 1.0
        };
        
        return factorMap[capacity] || 1.0;
    }

    setupBasicSkills() {
        const basicSkills = {
            'caminar': { tipo: 'locomocion', complejidad: 2, energia: 1, precision: 1 },
            'correr': { tipo: 'locomocion', complejidad: 4, energia: 3, precision: 2 },
            'saltar': { tipo: 'locomocion', complejidad: 5, energia: 4, precision: 3 },
            'agarrar': { tipo: 'manipulacion', complejidad: 3, energia: 1, precision: 4 },
            'lanzar': { tipo: 'manipulacion', complejidad: 6, energia: 3, precision: 5 },
            'esquivar': { tipo: 'defensa', complejidad: 7, energia: 4, precision: 4 },
            'observar': { tipo: 'percepcion', complejidad: 1, energia: 0.5, precision: 2 },
            'correr_veloz': { tipo: 'locomocion', complejidad: 6, energia: 5, precision: 3 },
            'equilibrio': { tipo: 'equilibrio', complejidad: 4, energia: 2, precision: 4 },
            'saltar_alto': { tipo: 'locomocion', complejidad: 7, energia: 6, precision: 4 },
            'escribir': { tipo: 'manipulacion', complejidad: 5, energia: 2, precision: 6 },
            'dibujar': { tipo: 'manipulacion', complejidad: 6, energia: 2, precision: 7 },
            'bailar': { tipo: 'expresivo', complejidad: 7, energia: 5, precision: 5 },
            'nadar': { tipo: 'locomocion', complejidad: 6, energia: 5, precision: 4 }
        };

        Object.keys(basicSkills).forEach(skill => {
            this.motorSkills.set(skill, {
                ...basicSkills[skill],
                nivel: 70,
                practica: 10,
                eficiencia: 0.8,
                ultimoUso: 0,
                precision: basicSkills[skill].precision || 3,
                complejidadDominada: false,
                mastery: 0,
                ultimaPractica: 0
            });
        });
    }

    onEvent(callback) {
        this.eventListeners.push(callback);
    }

    emitEvent(type, data) {
        this.eventListeners.forEach(cb => {
            try {
                cb({ type, data, module: 'motor' });
            } catch (error) {
                console.error('❌ Error en listener motor:', error);
            }
        });
    }

    update(input, deltaTime) {
        this.lastUpdateTime = systemCore.systemTime || Date.now();
        
        if (!input || !input.biochemical) return this.getState();

        this.processReflexes(input, deltaTime);
        this.updateBasalCapacities(input.biochemical, deltaTime);
        this.processActionQueue(deltaTime);
        this.updateFatigueAndRecovery(deltaTime);
        this.applyNeurotransmitterEffects(input.biochemical, deltaTime);
        this.manageMotorControl(deltaTime);
        this.applyMotorLearning(deltaTime);
        this.generateMovementPatterns(deltaTime);
        this.applyMotorHomeostasis(deltaTime);

        return this.getState();
    }

    processReflexes(input, deltaTime) {
        const bioState = input.biochemical || {};
        const emoState = input.emotional || {};
        
        if (bioState.cortisol > 70 && emoState.miedo > 60) {
            this.executeReflex('retirar_mano');
        }
        
        if (this.state.equilibrio < 40) {
            this.executeReflex('equilibrio');
        }
        
        if (input.environmental && input.environmental.luz > 90) {
            this.executeReflex('parpadeo');
        }
    }

    executeReflex(reflexName) {
        const reflex = this.reflexes.get(reflexName);
        if (!reflex) return;
        
        const action = {
            tipo: reflex.response,
            prioridad: reflex.priority || 5,
            intensidad: 1.0,
            esReflejo: true,
            timestamp: systemCore.systemTime || Date.now()
        };
        
        this.addToActionQueue(action);
        
        this.emitEvent('reflex_executed', {
            reflex: reflexName,
            response: reflex.response,
            speed: reflex.speed
        });
    }

    updateBasalCapacities(bioState, deltaTime) {
        const baseCapacities = {
            coordinacion: 80,
            fuerza: 75,
            velocidad: 70,
            precision: 72,
            resistencia: 75,
            controlVoluntario: 78,
            precisionFina: 70,
            fuerzaExplosiva: 65,
            resistenciaMuscular: 72,
            reflejos: 75
        };

        const modificationFactors = {
            energia: (bioState.energia || 50) / 100,
            oxigeno: (bioState.oxigeno || 50) / 100,
            toxicidad: 1 - ((bioState.toxicidad || 0) / 150),
            cortisol: 1 - ((bioState.cortisol || 0) / 120),
            glucosa: Math.min(1.0, (bioState.glucosa || 50) / 100),
            dopamina: (bioState.dopamina || 50) / 100,
            noradrenalina: (bioState.noradrenalina || 50) / 100
        };

        if (bioState.estadoHidratacion < 30) {
            modificationFactors.fuerza *= 0.8;
            modificationFactors.resistencia *= 0.7;
        }

        Object.keys(baseCapacities).forEach(capacity => {
            let baseValue = baseCapacities[capacity];
            
            const profileFactor = this.getProfileFactorForCapacity(capacity);
            baseValue *= profileFactor;
            
            const bioFactor = Object.values(modificationFactors).reduce((product, factor) => product * factor, 1);
            baseValue *= (0.3 + bioFactor * 0.7);
            
            const fatigueEffect = 1 - ((this.state.fatiga || 0) / 200);
            baseValue *= fatigueEffect;
            
            this.state[capacity] = this.clamp(baseValue, 0, 100);
        });

        const reactionBase = 60;
        const speedFactor = (this.state.velocidad || 50) / 100;
        const attentionFactor = (bioState.dopamina || 50) / 100;
        const reflexFactor = (this.state.reflejos || 50) / 100;
        this.state.tiempoReaccion = 60 * (1 / (speedFactor * attentionFactor * reflexFactor));
        this.state.tiempoReaccion = this.clamp(this.state.tiempoReaccion, 15, 120);
    }

    applyNeurotransmitterEffects(bioState, deltaTime) {
        const ntEffects = {
            dopamina: {
                fluidez: 0.3,
                velocidad: 0.2,
                controlVoluntario: 0.2,
                aprendizajeMotor: 0.3,
                precision: 0.15
            },
            noradrenalina: {
                fuerza: 0.4,
                velocidad: 0.5,
                tension: 0.3,
                tiempoReaccion: -0.25
            },
            adrenalina: {
                fuerza: 0.6,
                velocidad: 0.7,
                agilidad: 0.5,
                tension: 0.8,
                fuerzaExplosiva: 0.5
            },
            cortisol: {
                coordinacion: -0.3,
                precision: -0.4,
                tension: 0.5,
                controlVoluntario: -0.3,
                tiempoReaccion: 0.2
            },
            gaba: {
                tension: -0.4,
                relajacion: 0.3,
                controlAutomatico: 0.2,
                fluidezMovimiento: 0.2
            },
            serotonina: {
                estabilidad: 0.3,
                coordinacion: 0.2,
                fluidez: 0.2,
                propiocepcion: 0.2
            },
            acetilcolina: {
                precisionFina: 0.3,
                coordinacion: 0.2,
                controlVoluntario: 0.2,
                reflejos: 0.15
            }
        };

        Object.keys(ntEffects).forEach(nt => {
            const effects = ntEffects[nt];
            const ntLevel = (bioState[nt] || 50) / 100;
            
            Object.keys(effects).forEach(capacity => {
                if (this.state[capacity] !== undefined) {
                    const effect = effects[capacity] * ntLevel * deltaTime * 18;
                    this.state[capacity] += effect;
                }
            });
        });
    }

    processActionQueue(deltaTime) {
        if (this.currentAction && this.currentAction.completado) {
            this.currentAction = null;
        }

        if (!this.currentAction && this.actionQueue.length > 0) {
            this.currentAction = this.actionQueue.shift();
            this.currentAction.inicio = systemCore.systemTime || Date.now();
            this.currentAction.completado = false;
            this.currentAction.progreso = 0;
            
            this.emitEvent('action_started', {
                tipo: this.currentAction.tipo,
                intensidad: this.currentAction.intensidad,
                esReflejo: this.currentAction.esReflejo || false
            });
        }

        if (this.currentAction && !this.currentAction.completado) {
            this.executeCurrentAction(deltaTime);
        }
    }

    executeCurrentAction(deltaTime) {
        const action = this.currentAction;
        const skill = this.motorSkills.get(action.tipo);
        
        if (!skill) {
            action.completado = true;
            action.resultado = 'habilidad_no_encontrada';
            this.emitEvent('action_failed', { reason: 'skill_not_found', action: action.tipo });
            return;
        }

        const progressRate = this.calculateProgressRate(skill, action);
        action.progreso = Math.min(1.0, (action.progreso || 0) + progressRate * deltaTime);
        
        const energyCost = skill.energia * action.intensidad * (1 + (1 - skill.eficiencia) * 0.5);
        this.energyExpenditure += energyCost * deltaTime;
        this.state.fatiga += energyCost * 0.07 * deltaTime;
        
        if (action.progreso >= 1.0) {
            action.completado = true;
            action.resultado = this.determineActionResult(skill, action);
            action.fin = systemCore.systemTime || Date.now();
            
            this.learnFromAction(skill, action);
            
            this.executionHistory.push({
                tipo: action.tipo,
                resultado: action.resultado,
                duracion: (action.fin - action.inicio) / 1000,
                timestamp: action.fin
            });
            
            if (this.executionHistory.length > 100) {
                this.executionHistory.shift();
            }
            
            this.emitEvent('action_completed', {
                tipo: action.tipo,
                resultado: action.resultado,
                tiempo: action.fin - action.inicio
            });
        }
    }

    calculateProgressRate(skill, action) {
        const baseRate = 0.5;
        const skillFactor = (skill.nivel || 0) / 100;
        const stateFactor = this.getMotorStateFactor();
        const intensityFactor = action.intensidad || 1.0;
        const complexityFactor = 1 - (skill.complejidad / 20);
        const fatigueFactor = 1 - ((this.state.fatiga || 0) / 200);
        const reflexBoost = action.esReflejo ? 2.0 : 1.0;
        
        return baseRate * skillFactor * stateFactor * intensityFactor * complexityFactor * fatigueFactor * reflexBoost;
    }

    getMotorStateFactor() {
        const positiveFactors = ['coordinacion', 'fuerza', 'velocidad', 'precision', 'agilidad'];
        const negativeFactors = ['fatiga', 'tension'];
        
        const positiveAverage = positiveFactors.reduce((sum, factor) => sum + (this.state[factor] || 0), 0) / positiveFactors.length;
        const negativeAverage = negativeFactors.reduce((sum, factor) => sum + (this.state[factor] || 0), 0) / negativeFactors.length;
        
        return (positiveAverage / 100) * (1 - negativeAverage / 200);
    }

    determineActionResult(skill, action) {
        const baseSuccessRate = (skill.nivel || 0) / 100;
        const stateModifier = this.getMotorStateFactor();
        const difficultyModifier = 1 - (skill.complejidad / 20);
        const intensityModifier = action.intensidad ? 1 - Math.abs(action.intensidad - 1) * 0.2 : 1.0;
        const precisionEffect = (this.state.precision || 50) / 100;
        const practiceEffect = 1 + ((skill.practica || 0) / 100) * 0.2;
        const reflexModifier = action.esReflejo ? 1.3 : 1.0;
        
        let successProbability = baseSuccessRate * stateModifier * difficultyModifier * 
                                 intensityModifier * precisionEffect * practiceEffect * reflexModifier;
        
        successProbability *= (1 - (this.state.fatiga || 0) / 200);
        
        const precisionVariation = (1 - (this.state.precision || 50) / 100) * 0.2;
        const finalProbability = Math.max(0, Math.min(1, successProbability - precisionVariation));
        
        const success = Math.random() < finalProbability;
        const quality = success ? 0.7 + Math.random() * 0.3 : 0.15 + Math.random() * 0.3;
        
        return {
            success: success,
            quality: quality,
            probability: finalProbability
        };
    }

    learnFromAction(skill, action) {
        const learningRate = this.calculateMotorLearningRate();
        const resultBonus = action.resultado.success ? 1.3 : 0.6;
        const qualityBonus = action.resultado.quality || 0.5;
        const reflexModifier = action.esReflejo ? 0.3 : 1.0;
        
        const gain = learningRate * resultBonus * (0.5 + qualityBonus * 0.5) * reflexModifier;
        skill.nivel = Math.min(100, (skill.nivel || 0) + gain * 2);
        skill.practica = (skill.practica || 0) + 1;
        skill.ultimoUso = systemCore.systemTime || Date.now();
        skill.eficiencia = Math.min(1.0, (skill.eficiencia || 0) + learningRate * 0.04);
        skill.ultimaPractica = systemCore.systemTime || Date.now();
        
        if ((skill.nivel || 0) > 85) {
            skill.complejidadDominada = true;
        }
        
        skill.mastery = Math.min(100, (skill.mastery || 0) + learningRate * 4);
        
        this.motorLearning += gain * 0.008;
        
        this.emitEvent('skill_improved', {
            skill: action.tipo,
            nivel: skill.nivel,
            gain: gain,
            mastery: skill.mastery
        });
    }

    calculateMotorLearningRate() {
        const baseRate = 0.04 * this.motorProfile.motorLearning;
        const stateFactor = this.getMotorStateFactor();
        const fatiguePenalty = (this.state.fatiga || 0) > 50 ? 0.6 : 1.0;
        const attentionFactor = (this.state.controlVoluntario || 50) / 100;
        const sleepFactor = (this.state.recuperacion || 50) / 100;
        
        return baseRate * stateFactor * fatiguePenalty * attentionFactor * sleepFactor;
    }

    updateFatigueAndRecovery(deltaTime) {
        const fatigueFromEnergy = this.energyExpenditure * 0.08;
        this.state.fatiga += fatigueFromEnergy * deltaTime;
        
        const recoveryRate = ((this.state.recuperacion || 50) / 100) * (this.motorProfile.recovery || 1.0);
        this.state.fatiga = Math.max(0, (this.state.fatiga || 0) - recoveryRate * 4 * deltaTime);
        
        this.energyExpenditure = Math.max(0, this.energyExpenditure - 1.5 * deltaTime);
        
        this.updateTensionAndRelaxation(deltaTime);
    }

    updateTensionAndRelaxation(deltaTime) {
        const tensionSources = (this.state.fatiga || 0) * 0.08 + (this.energyExpenditure * 0.04);
        this.state.tension += tensionSources * deltaTime;
        this.state.tension = this.clamp(this.state.tension, 0, 100);
        
        this.state.relajacion = 100 - this.state.tension;
        
        const tensionBalance = 1 - Math.abs((this.state.tension || 0) - 50) / 50;
        this.state.estabilidad = 50 + tensionBalance * 50;
    }

    manageMotorControl(deltaTime) {
        const fatigueEffect = 1 - ((this.state.fatiga || 0) / 150);
        const tensionEffect = 1 - ((this.state.tension || 0) / 120);
        
        this.state.controlVoluntario = 80 * fatigueEffect * tensionEffect;
        this.state.controlAutomatico = 85 * (1 - tensionEffect * 0.3);
        this.state.controlVoluntario = this.clamp(this.state.controlVoluntario, 0, 100);
        this.state.controlAutomatico = this.clamp(this.state.controlAutomatico, 0, 100);
        
        const coordinationBase = this.state.coordinacion || 0;
        const tensionPenalty = (this.state.tension || 0) * 0.25;
        const fatiguePenalty = (this.state.fatiga || 0) * 0.15;
        this.state.fluidez = Math.max(0, coordinationBase - tensionPenalty - fatiguePenalty);
        this.state.fluidez = this.clamp(this.state.fluidez, 0, 100);
        
        this.state.fluidezMovimiento = ((this.state.fluidez || 0) + (this.state.coordinacion || 0)) / 2;
        this.state.fluidezMovimiento = this.clamp(this.state.fluidezMovimiento, 0, 100);
        
        this.state.propiocepcion = ((this.state.coordinacion || 0) + (this.state.equilibrio || 0) + (this.state.controlAutomatico || 0)) / 3;
        this.state.propiocepcion = this.clamp(this.state.propiocepcion, 0, 100);
    }

    applyMotorLearning(deltaTime) {
        if (this.motorLearning > 0) {
            this.motorLearning -= 0.008 * deltaTime;
            this.motorLearning = Math.max(0, this.motorLearning);
        }
        
        this.state.aprendizajeMotor = 50 + this.motorLearning * 50;
        this.state.aprendizajeMotor = this.clamp(this.state.aprendizajeMotor, 0, 100);
        
        if (this.cycleCount % 100 === 0) {
            this.state.aprendizajeMotor += 0.5 * deltaTime;
        }
    }

    generateMovementPatterns(deltaTime) {
        if (Math.random() < 0.01 * deltaTime) {
            const patterns = ['ritmico', 'fluido', 'erratico', 'preciso', 'explosivo'];
            const pattern = patterns[Math.floor(Math.random() * patterns.length)];
            
            this.movementPatterns.push({
                type: pattern,
                timestamp: systemCore.systemTime || Date.now(),
                duration: 5 + Math.random() * 10,
                intensity: 0.3 + Math.random() * 0.7
            });
            
            if (this.movementPatterns.length > 50) {
                this.movementPatterns.shift();
            }
        }
    }

    applyMotorHomeostasis(deltaTime) {
        Object.keys(this.state).forEach(capacity => {
            if (typeof this.state[capacity] === 'number') {
                this.state[capacity] = this.clamp(this.state[capacity], 0, 100);
            }
        });
    }

    executeAction(actionType, parameters = {}) {
        const skill = this.motorSkills.get(actionType);
        if (!skill) {
            this.emitEvent('action_error', { 
                error: 'skill_not_found', 
                action: actionType 
            });
            return null;
        }
        
        const capability = this.evaluateActionCapability(actionType);
        if (!capability.capaz) {
            this.emitEvent('action_error', {
                error: 'insufficient_capability',
                action: actionType,
                reason: capability.razon
            });
            return null;
        }
        
        const action = {
            tipo: actionType,
            parametros: parameters,
            intensidad: parameters.intensidad || 1.0,
            prioridad: parameters.prioridad || 1,
            progreso: 0,
            completado: false,
            timestamp: systemCore.systemTime || Date.now(),
            resultado: null,
            esReflejo: false
        };
        
        this.addToActionQueue(action);
        
        this.emitEvent('action_queued', {
            tipo: actionType,
            prioridad: action.prioridad
        });
        
        return action;
    }

    addToActionQueue(action) {
        let inserted = false;
        for (let i = 0; i < this.actionQueue.length; i++) {
            if (action.prioridad > this.actionQueue[i].prioridad) {
                this.actionQueue.splice(i, 0, action);
                inserted = true;
                break;
            }
        }
        
        if (!inserted) {
            this.actionQueue.push(action);
        }
        
        if (this.actionQueue.length > 20) {
            this.actionQueue = this.actionQueue.slice(0, 20);
        }
    }

    evaluateActionCapability(actionType) {
        const skill = this.motorSkills.get(actionType);
        if (!skill) {
            return { capaz: false, razon: 'habilidad_desconocida', score: 0 };
        }
        
        const capabilityScore = this.calculateCapabilityScore(skill);
        const energyRequirement = skill.energia;
        const fatigueImpact = (this.state.fatiga || 0) + energyRequirement * 10;
        
        return {
            capaz: capabilityScore > 0.25 && fatigueImpact < 80 && (this.state.energia || 0) > energyRequirement * 5,
            score: capabilityScore,
            energiaRequerida: energyRequirement,
            fatigaEstimada: fatigueImpact,
            habilidad: skill.nivel,
            precision: this.state.precision
        };
    }

    calculateCapabilityScore(skill) {
        const skillFactor = (skill.nivel || 0) / 100;
        const stateFactor = this.getMotorStateFactor();
        const complexityFactor = 1 - (skill.complejidad / 20);
        const precisionFactor = (this.state.precision || 50) / 100;
        const practiceFactor = 1 + ((skill.practica || 0) / 200);
        
        return skillFactor * stateFactor * complexityFactor * precisionFactor * practiceFactor;
    }

    learnNewSkill(skillName, skillDefinition) {
        if (this.motorSkills.has(skillName)) {
            this.emitEvent('skill_error', { error: 'skill_exists', skill: skillName });
            return null;
        }
        
        const newSkill = {
            tipo: skillDefinition.tipo || 'general',
            complejidad: skillDefinition.complejidad || 5,
            energia: skillDefinition.energia || 2,
            nivel: 30,
            practica: 0,
            eficiencia: 0.5,
            ultimoUso: 0,
            precision: skillDefinition.precision || 3,
            complejidadDominada: false,
            mastery: 0,
            ultimaPractica: 0
        };
        
        this.motorSkills.set(skillName, newSkill);
        
        this.emitEvent('skill_learned', {
            skill: skillName,
            tipo: newSkill.tipo,
            complejidad: newSkill.complejidad
        });
        
        return newSkill;
    }

    handleSituation(situationType, intensity) {
        const motorEffects = this.getSituationMotorEffects(situationType, intensity);
        
        Object.keys(motorEffects).forEach(capacity => {
            if (this.state[capacity] !== undefined) {
                this.state[capacity] += motorEffects[capacity];
            }
        });
    }

    getSituationMotorEffects(situationType, intensity) {
        const effectsMap = {
            'actividad_alta': { 
                fatiga: 22 * intensity,
                fuerza: 10 * intensity,
                velocidad: 15 * intensity,
                energia: -15 * intensity
            },
            'reposo': { 
                fatiga: -18 * intensity,
                recuperacion: 15 * intensity,
                relajacion: 25 * intensity,
                energia: 10 * intensity
            },
            'estres_alto': { 
                tension: 30 * intensity,
                coordinacion: -15 * intensity,
                precision: -20 * intensity,
                controlVoluntario: -15 * intensity,
                tiempoReaccion: 10 * intensity
            },
            'lesion': { 
                fuerza: -40 * intensity,
                velocidad: -35 * intensity,
                agilidad: -50 * intensity,
                precision: -30 * intensity,
                recuperacion: -20 * intensity
            },
            'entrenamiento': {
                fuerza: 10 * intensity,
                resistencia: 15 * intensity,
                aprendizajeMotor: 20 * intensity,
                fatiga: 15 * intensity,
                precision: 5 * intensity
            },
            'reflexivo': {
                reflejos: 15 * intensity,
                tiempoReaccion: -10 * intensity,
                precision: 10 * intensity
            }
        };

        return effectsMap[situationType] || {};
    }

    emergencyProtocol() {
        this.applyModulation({
            fuerza: 20,
            velocidad: 25,
            agilidad: 15,
            fatiga: -30,
            tension: 40,
            recuperacion: 20,
            controlAutomatico: 15,
            reflejos: 20
        });
        
        this.actionQueue = this.actionQueue.filter(action => action.prioridad >= 8);
        
        this.emitEvent('emergency', {
            type: 'motor_emergency',
            state: { ...this.state }
        });
    }

    applyModulation(modulation) {
        Object.keys(modulation).forEach(key => {
            if (this.state[key] !== undefined) {
                this.state[key] += modulation[key];
            }
        });
    }

    getState() {
        return { ...this.state };
    }

    getMotorSkills() {
        return Array.from(this.motorSkills.entries()).map(([name, skill]) => ({
            nombre: name,
            nivel: skill.nivel || 0,
            eficiencia: skill.eficiencia || 0,
            practica: skill.practica || 0,
            tipo: skill.tipo || 'general',
            mastery: skill.mastery || 0,
            complejidad: skill.complejidad || 0,
            complejidadDominada: skill.complejidadDominada || false
        }));
    }

    getActionQueue() {
        return [...this.actionQueue];
    }

    getCurrentAction() {
        return this.currentAction;
    }

    getPerformanceMetrics() {
        return {
            overallCapability: this.getMotorStateFactor() * 100,
            energyEfficiency: 100 - this.energyExpenditure,
            skillMastery: this.calculateAverageSkillLevel(),
            recoveryRate: this.state.recuperacion || 0,
            fatigueLevel: this.state.fatiga || 0,
            tensionLevel: this.state.tension || 0,
            learningProgress: this.motorLearning * 100,
            reflexSpeed: this.state.reflejos || 0,
            reactionTime: this.state.tiempoReaccion || 0
        };
    }

    calculateAverageSkillLevel() {
        const skills = Array.from(this.motorSkills.values());
        if (skills.length === 0) return 0;
        return skills.reduce((sum, skill) => sum + (skill.nivel || 0), 0) / skills.length;
    }

    getSkillByName(name) {
        return this.motorSkills.get(name) || null;
    }

    getExecutionHistory() {
        return this.executionHistory.slice(-50);
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    reset() {
        this.initializeState();
        this.actionQueue = [];
        this.currentAction = null;
        this.executionHistory = [];
        this.motorLearning = 0;
        this.movementPatterns = [];
    }

    exportData() {
        return {
            state: this.getState(),
            motorProfile: this.motorProfile,
            motorSkills: this.getMotorSkills(),
            performanceMetrics: this.getPerformanceMetrics(),
            currentAction: this.getCurrentAction(),
            actionQueue: this.getActionQueue(),
            motorLearning: this.motorLearning,
            executionHistory: this.getExecutionHistory(),
            movementPatterns: this.movementPatterns.slice(-20)
        };
    }
}

systemCore.registerModule('motor', new MotorSystem());
