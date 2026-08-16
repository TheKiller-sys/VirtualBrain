// src/modules/CognitiveSystem.js
import { systemCore } from '../core/SystemCore.js';

export class CognitiveSystem {
    constructor() {
        this.state = {};
        this.config = {};
        this.workingMemory = [];
        this.cognitiveProcesses = new Map();
        this.decisionHistory = [];
        this.eventListeners = [];
        this.plans = [];
        this.currentPlan = null;
        this.goals = [];
        this.cognitiveCache = {};
        this.attentionFocus = 'general';
        this.attentionHistory = [];
        this.lastUpdateTime = 0;
        this.thoughtHistory = [];
        this.insightMoments = [];
        this.creativeSpikes = 0;
        this.cognitiveProfile = {};
    }

    async initialize(characterConfig) {
        // ✅ Asegurar que characterConfig existe
        this.config = characterConfig || { genotipo: 'humano' };
        this.setupCognitiveProfile();
        this.initializeState();
        this.setupCognitiveProcesses();
        this.setupGoalSystem();
        systemCore.logSystem('Sistema cognitivo V3.0 inicializado');
    }

    setupCognitiveProfile() {
        // ✅ Usar genotipo con valor por defecto
        const genotipo = this.config?.genotipo || 'humano';
        
        const profiles = {
            humano: {
                attentionCapacity: 1.0,
                memoryEfficiency: 1.0,
                problemSolving: 1.0,
                decisionMaking: 1.0,
                learningRate: 1.0,
                cognitiveFlexibility: 1.0,
                creativityBaseline: 1.0,
                processingSpeed: 1.0
            },
            resiliente: {
                attentionCapacity: 1.1,
                memoryEfficiency: 1.2,
                problemSolving: 1.1,
                decisionMaking: 1.2,
                learningRate: 1.1,
                cognitiveFlexibility: 1.1
            },
            vulnerable: {
                attentionCapacity: 0.8,
                memoryEfficiency: 0.7,
                problemSolving: 0.8,
                decisionMaking: 0.7,
                learningRate: 0.9,
                cognitiveFlexibility: 0.7
            },
            audaz: {
                attentionCapacity: 1.3,
                memoryEfficiency: 1.0,
                problemSolving: 1.2,
                decisionMaking: 1.4,
                learningRate: 1.0,
                cognitiveFlexibility: 1.3,
                riskTaking: 1.5
            },
            intelectual: {
                attentionCapacity: 1.4,
                memoryEfficiency: 1.5,
                problemSolving: 1.6,
                decisionMaking: 1.3,
                learningRate: 1.4,
                cognitiveFlexibility: 1.2,
                analyticalThinking: 1.5
            },
            social: {
                attentionCapacity: 1.1,
                memoryEfficiency: 1.3,
                problemSolving: 1.0,
                decisionMaking: 1.1,
                learningRate: 1.2,
                cognitiveFlexibility: 1.0,
                socialCognition: 1.6
            }
        };

        this.cognitiveProfile = profiles[genotipo] || profiles.humano;
    }

    initializeState() {
        this.state = {
            atencion: 80,
            concentracion: 75,
            memoriaTrabajo: 70,
            velocidadProcesamiento: 65,
            razonamiento: 70,
            tomaDecisiones: 75,
            planificacion: 65,
            flexibilidad: 60,
            inhibicion: 70,
            memoriaCortoPlazo: 75,
            memoriaLargoPlazo: 80,
            memoriaProcedural: 70,
            aprendizaje: 70,
            retencion: 75,
            transferencia: 60,
            autoconciencia: 65,
            monitoreo: 70,
            regulacion: 60,
            fatiga: 20,
            estres: 25,
            carga: 30,
            fluidez: 65,
            curiosidad: 50,
            creatividad: 40,
            intuicion: 45,
            sabiduria: 30,
            complejidad: 0.5,
            eficiencia: 0.7,
            adaptabilidad: 0.6,
            profundidad: 0.5,
            flow: 0,
            bloqueo: 0,
            iluminacion: 0,
            duda: 20
        };

        this.workingMemory = [];
        this.cognitiveLoad = 0;
        this.attentionFocus = 'general';
        this.attentionHistory = [];
        this.cognitiveCache = {};
        this.thoughtHistory = [];
        this.insightMoments = [];
        this.creativeSpikes = 0;
        this.lastUpdateTime = systemCore.systemTime || Date.now();
    }

    setupCognitiveProcesses() {
        this.cognitiveProcesses.set('perception', {
            capacity: 100,
            load: 0,
            efficiency: 1.0,
            priority: 3,
            description: 'Procesamiento perceptual'
        });
        
        this.cognitiveProcesses.set('attention', {
            capacity: 100,
            load: 0,
            focus: 'distributed',
            efficiency: 1.0,
            priority: 4,
            description: 'Atención y concentración'
        });
        
        this.cognitiveProcesses.set('memory', {
            capacity: 100,
            load: 0,
            retrievalSpeed: 1.0,
            efficiency: 1.0,
            priority: 2,
            description: 'Memoria de trabajo'
        });
        
        this.cognitiveProcesses.set('reasoning', {
            capacity: 100,
            load: 0,
            logicalAccuracy: 1.0,
            efficiency: 1.0,
            priority: 3,
            description: 'Razonamiento lógico'
        });
        
        this.cognitiveProcesses.set('decision', {
            capacity: 80,
            load: 0,
            speed: 1.0,
            accuracy: 1.0,
            priority: 5,
            description: 'Toma de decisiones'
        });
        
        this.cognitiveProcesses.set('planning', {
            capacity: 60,
            load: 0,
            horizon: 50,
            efficiency: 1.0,
            priority: 4,
            description: 'Planificación'
        });
        
        this.cognitiveProcesses.set('metacognition', {
            capacity: 70,
            load: 0,
            awareness: 1.0,
            efficiency: 1.0,
            priority: 2,
            description: 'Metacognición'
        });
        
        this.cognitiveProcesses.set('creativity', {
            capacity: 50,
            load: 0,
            generation: 1.0,
            efficiency: 1.0,
            priority: 3,
            description: 'Pensamiento creativo'
        });
    }

    setupGoalSystem() {
        this.goals = [];
        this.currentGoal = null;
        this.goalHistory = [];
        
        this.addGoal({
            type: 'survival',
            priority: 10,
            description: 'Mantener homeostasis',
            subGoals: ['maintain_oxygen', 'maintain_energy', 'reduce_toxicity']
        });
        
        this.addGoal({
            type: 'learning',
            priority: 6,
            description: 'Adquirir conocimiento',
            subGoals: ['explore_environment', 'learn_patterns', 'understand_causality']
        });
        
        this.addGoal({
            type: 'social',
            priority: 5,
            description: 'Establecer conexiones',
            subGoals: ['interact_others', 'build_trust', 'share_knowledge']
        });
        
        this.addGoal({
            type: 'creative',
            priority: 3,
            description: 'Expresión creativa',
            subGoals: ['generate_ideas', 'synthesize', 'innovate']
        });
    }

    onEvent(callback) {
        this.eventListeners.push(callback);
    }

    emitEvent(type, data) {
        this.eventListeners.forEach(cb => {
            try {
                cb({ type, data, module: 'cognitive' });
            } catch (error) {
                console.error('❌ Error en listener cognitivo:', error);
            }
        });
    }

    update(input, deltaTime) {
        this.lastUpdateTime = systemCore.systemTime || Date.now();
        
        if (!input || !input.biochemical || !input.emotional) return this.getState();

        this.calculateBasalCapacities(input.biochemical);
        this.applyEmotionalInfluences(input.emotional, deltaTime);
        
        if (input.personality) {
            this.applyPersonalityInfluence(input.personality, deltaTime);
        }
        
        this.updateCognitiveProcesses(deltaTime);
        this.manageCognitiveLoad(deltaTime);
        this.processGoalsAndPlanning(input, deltaTime);
        
        if (this.currentPlan) {
            this.executePlan(this.currentPlan, deltaTime);
        }
        
        this.processCreativityAndInsight(deltaTime);
        this.updateMetacognition(deltaTime);
        this.updateCuriosity(input, deltaTime);
        this.processThoughts(deltaTime);
        this.applyCognitiveHomeostasis(deltaTime);

        return this.getState();
    }

    calculateBasalCapacities(bioState) {
        const baseCapacities = {
            atencion: 80,
            concentracion: 75,
            memoriaTrabajo: 70,
            velocidadProcesamiento: 65,
            razonamiento: 70,
            tomaDecisiones: 75,
            planificacion: 65,
            flexibilidad: 60,
            inhibicion: 70
        };

        const modificationFactors = {
            oxigeno: (bioState.oxigeno || 50) / 100,
            energia: (bioState.energia || 50) / 100,
            glucosa: Math.min(1.0, (bioState.glucosa || 50) / 100),
            toxicidad: 1 - ((bioState.toxicidad || 0) / 200),
            cortisol: 1 - ((bioState.cortisol || 0) / 150),
            dopamina: (bioState.dopamina || 50) / 100,
            noradrenalina: (bioState.noradrenalina || 50) / 100,
            serotonina: (bioState.serotonina || 50) / 100
        };

        if (bioState.estadoHidratacion < 30) {
            modificationFactors.energia *= 0.8;
            modificationFactors.atencion *= 0.7;
        }

        Object.keys(baseCapacities).forEach(capacity => {
            let baseValue = baseCapacities[capacity];
            
            const profileFactor = this.mapCapacityToProfile(capacity);
            baseValue *= profileFactor;
            
            const bioFactor = Object.values(modificationFactors).reduce((product, factor) => product * factor, 1);
            baseValue *= (0.4 + bioFactor * 0.6);
            
            const fatigueEffect = 1 - ((this.state.fatiga || 0) / 200);
            baseValue *= fatigueEffect;
            
            const flowEffect = 1 + (this.state.flow || 0) * 0.2;
            baseValue *= flowEffect;
            
            this.state[capacity] = this.clamp(baseValue, 0, 100);
        });

        this.applyNeurotransmitterEffects(bioState);
    }

    applyNeurotransmitterEffects(bioState) {
        const ntEffects = {
            dopamina: {
                atencion: 0.3,
                concentracion: 0.2,
                aprendizaje: 0.4,
                creatividad: 0.3,
                curiosidad: 0.2,
                insight: 0.15
            },
            noradrenalina: {
                atencion: 0.5,
                velocidadProcesamiento: 0.3,
                tomaDecisiones: 0.2,
                vigilia: 0.4
            },
            acetilcolina: {
                memoriaTrabajo: 0.4,
                aprendizaje: 0.5,
                atencion: 0.3,
                profundidad: 0.3
            },
            serotonina: {
                tomaDecisiones: 0.2,
                flexibilidad: 0.3,
                estabilidad: 0.4,
                sabiduria: 0.2,
                inhibicion: 0.2
            },
            cortisol: {
                atencion: -0.4,
                memoriaTrabajo: -0.3,
                tomaDecisiones: -0.5,
                flexibilidad: -0.3,
                creatividad: -0.2,
                insight: -0.3
            },
            gaba: {
                concentracion: 0.2,
                estres: -0.3,
                inhibicion: 0.3,
                bloqueo: -0.2
            },
            glutamato: {
                aprendizaje: 0.2,
                razonamiento: 0.2,
                complejidad: 0.1
            }
        };

        Object.keys(ntEffects).forEach(nt => {
            const effects = ntEffects[nt];
            const ntLevel = (bioState[nt] || 50) / 100;
            
            Object.keys(effects).forEach(capacity => {
                if (this.state[capacity] !== undefined) {
                    this.state[capacity] += effects[capacity] * ntLevel * 10;
                }
            });
        });
    }

    applyEmotionalInfluences(emotionalState, deltaTime) {
        const emotionalEffects = {
            alegria: {
                aprendizaje: 0.2,
                flexibilidad: 0.3,
                fluidez: 0.4,
                creatividad: 0.3,
                insight: 0.15
            },
            tristeza: {
                atencion: -0.3,
                memoriaTrabajo: -0.2,
                velocidadProcesamiento: -0.2,
                curiosidad: -0.2,
                creatividad: -0.1
            },
            miedo: {
                atencion: 0.4,
                concentracion: -0.2,
                tomaDecisiones: -0.3,
                flexibilidad: -0.2,
                bloqueo: 0.2
            },
            ira: {
                velocidadProcesamiento: 0.3,
                flexibilidad: -0.4,
                inhibicion: -0.5,
                tomaDecisiones: -0.2,
                razonamiento: -0.2
            },
            ansiedad: {
                atencion: -0.5,
                memoriaTrabajo: -0.4,
                tomaDecisiones: -0.6,
                planificacion: -0.3,
                bloqueo: 0.3
            },
            confianza: {
                tomaDecisiones: 0.4,
                autoconciencia: 0.3,
                planificacion: 0.2,
                sabiduria: 0.2,
                flexibilidad: 0.15
            },
            sorpresa: {
                atencion: 0.3,
                curiosidad: 0.3,
                insight: 0.2,
                fluidez: 0.15
            },
            nostalgia: {
                introspeccion: 0.2,
                profundidad: 0.15,
                memoriaLargoPlazo: 0.2
            },
            frustracion: {
                bloqueo: 0.3,
                creatividad: -0.2,
                flexibilidad: -0.2
            }
        };

        Object.keys(emotionalEffects).forEach(emotion => {
            const effects = emotionalEffects[emotion];
            const emotionLevel = (emotionalState[emotion] || 0) / 100;
            
            Object.keys(effects).forEach(capacity => {
                if (this.state[capacity] !== undefined) {
                    const effect = effects[capacity] * emotionLevel * deltaTime * 20;
                    this.state[capacity] += effect;
                }
            });
        });

        const challenge = this.state.carga || 30;
        const skill = (this.state.atencion + this.state.concentracion) / 2;
        if (challenge > 40 && skill > 40 && Math.abs(challenge - skill) < 15) {
            this.state.flow = Math.min(100, (this.state.flow || 0) + 0.5 * deltaTime);
        } else {
            this.state.flow = Math.max(0, (this.state.flow || 0) - 0.3 * deltaTime);
        }
    }

    applyPersonalityInfluence(personality, deltaTime) {
        if (!personality || !personality.traits) return;
        
        const traits = personality.traits || {};
        
        if (traits.openness) {
            const openFactor = (traits.openness - 0.5) * 2;
            this.state.creatividad += openFactor * 3 * deltaTime;
            this.state.curiosidad += openFactor * 4 * deltaTime;
            this.state.complejidad += openFactor * 0.08 * deltaTime;
            this.state.insight += openFactor * 0.05 * deltaTime;
        }
        
        if (traits.conscientiousness) {
            const consFactor = (traits.conscientiousness - 0.5) * 2;
            this.state.planificacion += consFactor * 4 * deltaTime;
            this.state.concentracion += consFactor * 3 * deltaTime;
            this.state.profundidad += consFactor * 0.08 * deltaTime;
        }
        
        if (traits.extraversion) {
            const extraFactor = (traits.extraversion - 0.5) * 2;
            this.state.velocidadProcesamiento += extraFactor * 3 * deltaTime;
            this.state.fluidez += extraFactor * 2 * deltaTime;
            this.state.tomaDecisiones += extraFactor * 1.5 * deltaTime;
        }
        
        if (traits.neuroticism) {
            const neuroFactor = (traits.neuroticism - 0.5) * 2;
            this.state.inhibicion += neuroFactor * 2 * deltaTime;
            this.state.estres += neuroFactor * 3 * deltaTime;
            this.state.bloqueo += neuroFactor * 1.5 * deltaTime;
            this.state.duda += neuroFactor * 2 * deltaTime;
        }
        
        if (traits.agreeableness) {
            const agreeFactor = (traits.agreeableness - 0.5) * 2;
            this.state.tomaDecisiones += agreeFactor * 2 * deltaTime;
            this.state.flexibilidad += agreeFactor * 1.5 * deltaTime;
        }
    }

    updateCognitiveProcesses(deltaTime) {
        this.cognitiveProcesses.forEach((process, name) => {
            const baseEfficiency = this.getProcessBaseEfficiency(name);
            const loadFactor = 1 - (process.load / process.capacity);
            const fatigueFactor = 1 - ((this.state.fatiga || 0) / 200);
            const stressFactor = 1 - ((this.state.estres || 0) / 150);
            const flowFactor = 1 + (this.state.flow || 0) * 0.1;
            
            process.efficiency = baseEfficiency * loadFactor * fatigueFactor * stressFactor * flowFactor;
            process.efficiency = this.clamp(process.efficiency, 0.1, 1.0);
        });

        this.updateTotalCognitiveLoad();
    }

    getProcessBaseEfficiency(processName) {
        const efficiencyMap = {
            perception: (this.state.atencion || 0) / 100,
            attention: (this.state.concentracion || 0) / 100,
            memory: (this.state.memoriaTrabajo || 0) / 100,
            reasoning: (this.state.razonamiento || 0) / 100,
            decision: (this.state.tomaDecisiones || 0) / 100,
            planning: (this.state.planificacion || 0) / 100,
            metacognition: (this.state.autoconciencia || 0) / 100,
            creativity: (this.state.creatividad || 0) / 100
        };
        
        return efficiencyMap[processName] || 1.0;
    }

    updateTotalCognitiveLoad() {
        let totalLoad = 0;
        let weightSum = 0;
        
        this.cognitiveProcesses.forEach((process, name) => {
            const weight = process.priority || 1;
            totalLoad += process.load * weight;
            weightSum += weight;
        });
        
        this.cognitiveLoad = weightSum > 0 ? totalLoad / weightSum : 0;
        this.state.carga = this.cognitiveLoad;
    }

    manageCognitiveLoad(deltaTime) {
        const fatigueRate = this.cognitiveLoad * 0.08;
        this.state.fatiga += fatigueRate * deltaTime * 10;
        
        if (this.cognitiveLoad > 70) {
            this.state.estres += (this.cognitiveLoad - 70) * 0.15 * deltaTime;
            this.state.bloqueo += (this.cognitiveLoad - 70) * 0.05 * deltaTime;
        }
        
        this.state.fatiga = Math.max(0, (this.state.fatiga || 0) - 0.4 * deltaTime);
        this.state.estres = Math.max(0, (this.state.estres || 0) - 0.2 * deltaTime);
        this.state.bloqueo = Math.max(0, (this.state.bloqueo || 0) - 0.1 * deltaTime);
        
        const fluencyBase = ((this.state.atencion || 0) + (this.state.concentracion || 0)) / 2;
        const fluencyReduction = ((this.state.fatiga || 0) + (this.state.estres || 0)) / 2;
        this.state.fluidez = Math.max(0, fluencyBase - fluencyReduction);
        this.state.fluidez = this.clamp(this.state.fluidez, 0, 100);
        
        const efficiencyFactors = {
            atencion: (this.state.atencion || 0) / 100,
            concentracion: (this.state.concentracion || 0) / 100,
            fluidez: (this.state.fluidez || 0) / 100,
            carga: 1 - (this.cognitiveLoad / 100)
        };
        this.state.eficiencia = Object.values(efficiencyFactors).reduce((a, b) => a + b, 0) / 4;
        this.state.eficiencia = this.clamp(this.state.eficiencia, 0, 1);
    }

    processGoalsAndPlanning(input, deltaTime) {
        this.goals.forEach(goal => {
            goal.priority = this.calculateGoalPriority(goal, input);
        });
        
        const sortedGoals = [...this.goals].sort((a, b) => b.priority - a.priority);
        if (sortedGoals.length > 0) {
            this.currentGoal = sortedGoals[0];
        }
        
        if (!this.currentPlan || this.currentPlan.completed) {
            if (this.currentGoal) {
                this.currentPlan = this.generatePlan(this.currentGoal, input);
            }
        }
        
        if (this.currentPlan && !this.currentPlan.completed) {
            this.currentPlan.progress += this.calculatePlanProgress(this.currentPlan, deltaTime);
            this.currentPlan.progress = this.clamp(this.currentPlan.progress, 0, 100);
            
            if (this.currentPlan.progress >= 100) {
                this.currentPlan.completed = true;
                this.goalHistory.push({
                    goal: this.currentPlan.goal,
                    completed: true,
                    time: this.lastUpdateTime,
                    progress: this.currentPlan.progress
                });
                
                this.emitEvent('goal_completed', {
                    goal: this.currentPlan.goal,
                    time: this.lastUpdateTime
                });
            }
        }
    }

    addGoal(goal) {
        this.goals.push({
            ...goal,
            id: Date.now() + Math.random() * 1000,
            progress: 0,
            active: true,
            createdAt: this.lastUpdateTime
        });
    }

    calculateGoalPriority(goal, input) {
        let priority = goal.priority || 5;
        const bio = input.biochemical || {};
        const emo = input.emotional || {};
        const cog = input.cognitive || {};
        
        if (goal.type === 'survival') {
            if (bio.oxigeno < 30) priority += 10;
            if (bio.energia < 20) priority += 8;
            if (bio.toxicidad > 60) priority += 6;
            if (bio.cortisol > 70) priority += 5;
        }
        
        if (goal.type === 'learning') {
            if ((this.state.curiosidad || 0) > 60) priority += 5;
            if ((this.state.creatividad || 0) > 50) priority += 3;
            if (cog.aprendizaje > 60) priority += 2;
        }
        
        if (goal.type === 'social') {
            if ((emo.conexion || 0) < 40) priority += 4;
            if ((emo.confianza || 0) < 30) priority += 3;
            if ((this.state.soledad || 0) > 50) priority += 5;
        }
        
        if (goal.type === 'creative') {
            if ((this.state.creatividad || 0) > 50) priority += 4;
            if ((this.state.flow || 0) > 30) priority += 3;
        }
        
        return Math.min(20, priority);
    }

    generatePlan(goal, input) {
        const plan = {
            id: Date.now(),
            goal: goal,
            steps: this.generatePlanSteps(goal, input),
            currentStep: 0,
            progress: 0,
            completed: false,
            startTime: this.lastUpdateTime,
            estimatedDuration: 0,
            flexibility: 0.3
        };
        
        plan.estimatedDuration = plan.steps.reduce((sum, step) => sum + (step.estimatedTime || 10), 0);
        
        this.plans.push(plan);
        if (this.plans.length > 10) {
            this.plans.shift();
        }
        
        this.emitEvent('plan_generated', {
            goal: goal.type,
            steps: plan.steps.length,
            time: this.lastUpdateTime
        });
        
        return plan;
    }

    generatePlanSteps(goal, input) {
        const steps = [];
        const bio = input.biochemical || {};
        const emo = input.emotional || {};
        
        switch(goal.type) {
            case 'survival':
                if (bio.oxigeno < 30) {
                    steps.push({ action: 'increase_oxygen', estimatedTime: 20, priority: 'high' });
                }
                if (bio.energia < 20) {
                    steps.push({ action: 'conserve_energy', estimatedTime: 15, priority: 'high' });
                }
                if (bio.toxicidad > 60) {
                    steps.push({ action: 'detoxify', estimatedTime: 25, priority: 'medium' });
                }
                if (bio.cortisol > 70) {
                    steps.push({ action: 'reduce_stress', estimatedTime: 20, priority: 'high' });
                }
                break;
                
            case 'learning':
                steps.push({ action: 'explore', estimatedTime: 30, priority: 'medium' });
                steps.push({ action: 'analyze', estimatedTime: 20, priority: 'medium' });
                steps.push({ action: 'synthesize', estimatedTime: 25, priority: 'medium' });
                steps.push({ action: 'integrate', estimatedTime: 15, priority: 'low' });
                break;
                
            case 'social':
                steps.push({ action: 'approach', estimatedTime: 10, priority: 'high' });
                steps.push({ action: 'communicate', estimatedTime: 20, priority: 'high' });
                steps.push({ action: 'build_trust', estimatedTime: 30, priority: 'medium' });
                steps.push({ action: 'deepen_connection', estimatedTime: 25, priority: 'medium' });
                break;
                
            case 'creative':
                steps.push({ action: 'brainstorm', estimatedTime: 20, priority: 'high' });
                steps.push({ action: 'incubate', estimatedTime: 30, priority: 'medium' });
                steps.push({ action: 'illuminate', estimatedTime: 15, priority: 'high' });
                steps.push({ action: 'implement', estimatedTime: 25, priority: 'medium' });
                break;
        }
        
        return steps;
    }

    calculatePlanProgress(plan, deltaTime) {
        const step = plan.steps[plan.currentStep];
        if (!step) return 0;
        
        const efficiency = this.state.eficiencia || 0.5;
        const speed = (this.state.velocidadProcesamiento || 50) / 100;
        const flowBoost = 1 + (this.state.flow || 0) * 0.1;
        const blockPenalty = 1 - (this.state.bloqueo || 0) * 0.005;
        
        return 5 * efficiency * speed * flowBoost * blockPenalty * deltaTime;
    }

    executePlan(plan, deltaTime) {
        if (plan.completed || plan.steps.length === 0) return;
        
        const currentStep = plan.steps[plan.currentStep];
        if (!currentStep) return;
        
        const success = this.executePlanStep(currentStep, deltaTime);
        
        if (success) {
            plan.currentStep++;
            if (plan.currentStep >= plan.steps.length) {
                plan.completed = true;
                plan.progress = 100;
                this.emitEvent('plan_completed', {
                    plan: plan,
                    time: this.lastUpdateTime
                });
            }
        }
    }

    executePlanStep(step, deltaTime) {
        const successProbability = ((this.state.razonamiento || 50) / 100) * (this.state.eficiencia || 0.5);
        const executionTime = step.estimatedTime * (1 / ((this.state.velocidadProcesamiento || 50) / 100));
        
        if (step.progress === undefined) {
            step.progress = 0;
        }
        step.progress += (100 / executionTime) * deltaTime;
        
        if (step.progress >= 100) {
            this.emitEvent('step_completed', {
                step: step.action,
                time: this.lastUpdateTime
            });
            return true;
        }
        
        return false;
    }

    processCreativityAndInsight(deltaTime) {
        const relaxation = 1 - (this.state.estres || 0) / 100;
        const openness = (this.state.flexibilidad || 50) / 100;
        const energy = (this.state.atencion || 50) / 100;
        const flowState = (this.state.flow || 0) / 100;
        
        const creativityFactor = (relaxation * 0.3 + openness * 0.3 + energy * 0.2 + flowState * 0.2);
        
        if (Math.random() < 0.01 * creativityFactor * deltaTime) {
            this.state.creatividad = Math.min(100, (this.state.creatividad || 0) + 2);
            this.creativeSpikes++;
            
            this.emitEvent('creative_spike', {
                intensity: creativityFactor,
                time: this.lastUpdateTime
            });
        }
        
        if (Math.random() < 0.005 * (this.state.intuicion || 0) / 100 * deltaTime) {
            const insightIntensity = 0.3 + Math.random() * 0.7;
            this.insightMoments.push({
                time: this.lastUpdateTime,
                intensity: insightIntensity,
                description: 'Momento de iluminación'
            });
            
            this.state.insight = Math.min(100, (this.state.insight || 0) + insightIntensity * 10);
            this.state.iluminacion = Math.min(100, (this.state.iluminacion || 0) + 10);
            
            this.emitEvent('insight', {
                intensity: insightIntensity,
                time: this.lastUpdateTime
            });
        }
        
        this.state.creatividad = Math.max(0, (this.state.creatividad || 0) - 0.5 * deltaTime);
        this.state.insight = Math.max(0, (this.state.insight || 0) - 0.3 * deltaTime);
        this.state.iluminacion = Math.max(0, (this.state.iluminacion || 0) - 0.5 * deltaTime);
    }

    processThoughts(deltaTime) {
        // ✅ Usar systemCore en lugar de brain
        const consciousness = systemCore.systemState?.consciousnessLevel || 0;
        if (consciousness < 0.15) return;
        
        const thoughtTypes = ['consciente', 'subconsciente', 'asociativo', 'creativo', 'reflexivo', 'intuitivo'];
        const thoughtProbability = 0.08 + consciousness * 0.3;
        
        if (Math.random() < thoughtProbability * deltaTime) {
            const type = thoughtTypes[Math.floor(Math.random() * thoughtTypes.length)];
            const intensidad = 0.2 + Math.random() * 0.6;
            
            let contenido = '';
            const emotionalModule = systemCore.modules.get('emotional');
            const dominantEmotion = emotionalModule?.getState()?.dominante || 'neutral';
            
            switch(type) {
                case 'consciente':
                    contenido = `Analizando mi estado actual, sintiendo ${dominantEmotion}`;
                    break;
                case 'subconsciente':
                    contenido = `Procesando conexiones profundas relacionadas con ${dominantEmotion}`;
                    break;
                case 'asociativo':
                    contenido = `Recordando experiencias similares a ${dominantEmotion}`;
                    break;
                case 'creativo':
                    contenido = `Explorando nuevas perspectivas sobre ${dominantEmotion}`;
                    break;
                case 'reflexivo':
                    contenido = `Reflexionando sobre mis procesos internos`;
                    break;
                case 'intuitivo':
                    contenido = `Sintiendo una comprensión profunda sin palabras`;
                    break;
                default:
                    contenido = `Pensamiento emergente`;
            }
            
            this.thoughtHistory.push({
                contenido,
                tipo: type,
                intensidad,
                timestamp: this.lastUpdateTime
            });
            
            if (this.thoughtHistory.length > 100) {
                this.thoughtHistory.shift();
            }
            
            this.emitEvent('thought', {
                contenido,
                tipo: type,
                intensidad,
                time: this.lastUpdateTime
            });
        }
    }

    updateMetacognition(deltaTime) {
        const coherence = this.getCognitiveCoherence();
        this.state.autoconciencia = coherence * 100;
        this.state.autoconciencia = this.clamp(this.state.autoconciencia, 0, 100);
        
        const performance = this.getCurrentPerformance();
        this.state.monitoreo = performance * 100;
        this.state.monitoreo = this.clamp(this.state.monitoreo, 0, 100);
        
        this.state.regulacion = ((this.state.autoconciencia || 0) + (this.state.monitoreo || 0)) / 2;
        this.state.regulacion = this.clamp(this.state.regulacion, 0, 100);
        
        const depthFactors = {
            atencion: (this.state.atencion || 0) / 100,
            concentracion: (this.state.concentracion || 0) / 100,
            razonamiento: (this.state.razonamiento || 0) / 100,
            complejidad: this.state.complejidad || 0.5
        };
        this.state.profundidad = Object.values(depthFactors).reduce((a, b) => a + b, 0) / 4;
        this.state.profundidad = this.clamp(this.state.profundidad, 0, 1);
        
        const adaptabilityFactors = {
            flexibilidad: (this.state.flexibilidad || 0) / 100,
            aprendizaje: (this.state.aprendizaje || 0) / 100,
            transferencia: (this.state.transferencia || 0) / 100,
            creatividad: (this.state.creatividad || 0) / 100
        };
        this.state.adaptabilidad = Object.values(adaptabilityFactors).reduce((a, b) => a + b, 0) / 4;
        this.state.adaptabilidad = this.clamp(this.state.adaptabilidad, 0, 1);
        
        this.state.duda = Math.max(0, this.state.duda - 0.5 * deltaTime);
        if (this.state.complejidad > 0.6 && this.state.autoconciencia > 60) {
            this.state.duda += 0.2 * deltaTime;
        }
        this.state.duda = this.clamp(this.state.duda, 0, 100);
    }

    updateCuriosity(input, deltaTime) {
        const bioState = input.biochemical || {};
        const emoState = input.emotional || {};
        const envState = input.environmental || {};
        
        const novelty = this.calculateNovelty(input);
        const energyFactor = (bioState.energia || 50) / 100;
        const safetyFactor = 1 - ((emoState.miedo || 0) / 100);
        const environmentalStimulus = (envState.oxigeno || 50) / 100;
        
        let curiosityIncrease = (novelty * 0.3 + environmentalStimulus * 0.15 + (this.state.creatividad || 0) / 100 * 0.2) * 
                               energyFactor * safetyFactor * deltaTime * 8;
        
        this.state.curiosidad += curiosityIncrease - 0.08 * deltaTime;
        this.state.curiosidad = this.clamp(this.state.curiosidad, 0, 100);
    }

    calculateNovelty(input) {
        let novelty = 0.5;
        
        if (input.environmental) {
            const env = input.environmental;
            if (env.toxinas !== undefined) novelty += Math.abs(env.toxinas - 50) / 100;
            if (env.peligro !== undefined) novelty += env.peligro / 100;
            if (env.oxigeno !== undefined) novelty += Math.abs(env.oxigeno - 80) / 100;
        }
        
        if (input.emotional) {
            const emo = input.emotional;
            const emotions = ['alegria', 'miedo', 'ira', 'tristeza', 'sorpresa'];
            emotions.forEach(e => {
                if (emo[e] !== undefined) {
                    novelty += Math.abs(emo[e] - 20) / 100;
                }
            });
        }
        
        return this.clamp(novelty, 0, 1);
    }

    getCognitiveCoherence() {
        const capacities = ['atencion', 'concentracion', 'memoriaTrabajo', 'razonamiento'];
        const values = capacities.map(cap => (this.state[cap] || 50) / 100);
        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        
        const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
        return Math.max(0, 1 - Math.sqrt(variance));
    }

    getCurrentPerformance() {
        const basePerformance = ((this.state.atencion || 0) + (this.state.concentracion || 0) + (this.state.razonamiento || 0)) / 3;
        const reductionFactors = (this.state.fatiga || 0) * 0.005 + (this.state.estres || 0) * 0.003 + (this.state.carga || 0) * 0.002;
        
        return Math.max(0, (basePerformance / 100) - reductionFactors);
    }

    applyCognitiveHomeostasis(deltaTime) {
        Object.keys(this.state).forEach(capacity => {
            if (typeof this.state[capacity] === 'number') {
                this.state[capacity] = this.clamp(this.state[capacity], 0, 100);
            }
        });

        const recoveryRate = (this.cognitiveProfile?.learningRate || 1.0) * 0.08 * deltaTime;
        this.state.fatiga = Math.max(0, (this.state.fatiga || 0) - recoveryRate * 5);
        this.state.estres = Math.max(0, (this.state.estres || 0) - recoveryRate * 3);
        
        if ((this.state.curiosidad || 0) < 15) {
            this.state.curiosidad += 0.3 * deltaTime;
        }
        
        if ((this.state.bloqueo || 0) > 20) {
            this.state.bloqueo -= 0.2 * deltaTime;
        }
    }

    processDecision(context, options) {
        if (!options || options.length === 0) {
            return { decision: null, confidence: 0 };
        }
        
        const decisionMetrics = {
            rationality: (this.state.razonamiento || 50) / 100,
            riskTolerance: this.getRiskTolerance(),
            attention: (this.state.atencion || 50) / 100,
            emotionalInfluence: this.getEmotionalBias(),
            intuition: (this.state.intuicion || 45) / 100,
            speed: (this.state.velocidadProcesamiento || 50) / 100,
            doubt: (this.state.duda || 0) / 100
        };

        const processedOptions = options.map(option => {
            return this.evaluateOption(option, decisionMetrics, context);
        });

        const doubtFactor = 1 - decisionMetrics.doubt * 0.5;
        
        const bestOption = processedOptions.reduce((best, current) => {
            const adjustedScore = current.score * doubtFactor;
            return adjustedScore > best.score * doubtFactor ? current : best;
        });

        const decision = {
            decision: bestOption.option,
            confidence: bestOption.confidence * (1 - decisionMetrics.doubt * 0.3),
            processingTime: this.getProcessingTime(decisionMetrics),
            metrics: decisionMetrics,
            alternatives: processedOptions.slice(1, 3)
        };

        this.decisionHistory.push({
            ...decision,
            timestamp: this.lastUpdateTime,
            context: context
        });

        if (this.decisionHistory.length > 100) {
            this.decisionHistory.shift();
        }

        this.emitEvent('decision_made', decision);

        return decision;
    }

    evaluateOption(option, metrics, context) {
        const baseScore = option.utility || 50;
        
        let score = baseScore * metrics.rationality;
        
        if (option.risk) {
            const riskAdjustment = option.risk * (metrics.riskTolerance - 0.5) * 25;
            score += riskAdjustment;
        }
        
        score *= (1 + metrics.emotionalInfluence * 0.2);
        
        if (option.intuitive) {
            score *= (1 + metrics.intuition * 0.15);
        }
        
        score *= (0.7 + metrics.attention * 0.3);
        
        const confidence = Math.min(1.0, metrics.attention * metrics.rationality * 
                                   (0.8 + metrics.intuition * 0.2)) * (1 - metrics.doubt * 0.3);
        
        return {
            option: option,
            score: Math.max(0, score),
            confidence: Math.max(0, confidence)
        };
    }

    getRiskTolerance() {
        const baseTolerance = 0.5;
        const profileEffect = this.cognitiveProfile?.riskTaking || 1.0;
        const emotionalEffect = ((this.state.confianza || 50) / 100 - 0.5) * 0.3;
        const stressEffect = -((this.state.estres || 0) / 500);
        
        return this.clamp(baseTolerance * profileEffect + emotionalEffect + stressEffect, 0, 1);
    }

    getEmotionalBias() {
        const positiveBias = ((this.state.alegria || 0) + (this.state.confianza || 0)) / 200;
        const negativeBias = ((this.state.miedo || 0) + (this.state.ira || 0)) / 200;
        
        return positiveBias - negativeBias;
    }

    getProcessingTime(metrics) {
        const baseTime = 800;
        const speedFactor = metrics.speed || 0.5;
        const complexityFactor = 1 + (1 - metrics.attention) * 0.5;
        const doubtFactor = 1 + metrics.doubt * 0.5;
        
        return (baseTime / speedFactor) * complexityFactor * doubtFactor;
    }

    mapCapacityToProfile(capacity) {
        const mapping = {
            atencion: 'attentionCapacity',
            concentracion: 'attentionCapacity',
            memoriaTrabajo: 'memoryEfficiency',
            velocidadProcesamiento: 'processingSpeed',
            razonamiento: 'problemSolving',
            tomaDecisiones: 'decisionMaking',
            aprendizaje: 'learningRate',
            flexibilidad: 'cognitiveFlexibility',
            creatividad: 'creativityBaseline'
        };
        
        return this.cognitiveProfile[mapping[capacity]] || 1.0;
    }

    handleSituation(situationType, intensity) {
        const cognitiveEffects = this.getSituationCognitiveEffects(situationType, intensity);
        
        Object.keys(cognitiveEffects).forEach(capacity => {
            if (this.state[capacity] !== undefined) {
                this.state[capacity] += cognitiveEffects[capacity];
            }
        });

        this.emitEvent('situation_applied', {
            situation: situationType,
            intensity: intensity,
            state: { ...this.state }
        });
    }

    getSituationCognitiveEffects(situationType, intensity) {
        const effectsMap = {
            'amenaza': { 
                atencion: 20 * intensity,
                concentracion: -15 * intensity,
                estres: 25 * intensity,
                tomaDecisiones: -10 * intensity,
                bloqueo: 10 * intensity
            },
            'recompensa': { 
                aprendizaje: 15 * intensity,
                atencion: 10 * intensity,
                fluidez: 20 * intensity,
                creatividad: 15 * intensity,
                curiosidad: 10 * intensity
            },
            'fatiga': { 
                fatiga: 30 * intensity,
                atencion: -25 * intensity,
                velocidadProcesamiento: -20 * intensity,
                memoriaTrabajo: -15 * intensity,
                creatividad: -10 * intensity
            },
            'interaccion_social': { 
                atencion: 15 * intensity,
                flexibilidad: 10 * intensity,
                tomaDecisiones: 12 * intensity,
                aprendizaje: 10 * intensity,
                sabiduria: 5 * intensity
            },
            'estres_alto': {
                estres: 30 * intensity,
                atencion: -20 * intensity,
                memoriaTrabajo: -15 * intensity,
                tomaDecisiones: -20 * intensity,
                bloqueo: 15 * intensity
            },
            'recuperacion': {
                fatiga: -20 * intensity,
                estres: -25 * intensity,
                fluidez: 15 * intensity,
                atencion: 10 * intensity,
                creatividad: 10 * intensity
            },
            'desafio': {
                atencion: 25 * intensity,
                razonamiento: 20 * intensity,
                tomaDecisiones: 15 * intensity,
                estres: 10 * intensity,
                flow: 10 * intensity
            },
            'inspiracion': {
                creatividad: 30 * intensity,
                insight: 25 * intensity,
                fluidez: 20 * intensity,
                curiosidad: 15 * intensity
            }
        };

        return effectsMap[situationType] || {};
    }

    emergencyProtocol() {
        this.applyModulation({
            atencion: 20,
            concentracion: 15,
            estres: -40,
            fatiga: -30,
            tomaDecisiones: 10,
            autoconciencia: 15,
            bloqueo: -20,
            duda: -15
        });
        
        this.emitEvent('emergency', {
            type: 'cognitive_emergency',
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

    getCognitiveProcesses() {
        return new Map(this.cognitiveProcesses);
    }

    getPerformanceMetrics() {
        return {
            currentPerformance: this.getCurrentPerformance(),
            cognitiveLoad: this.cognitiveLoad,
            coherence: this.getCognitiveCoherence(),
            efficiency: this.getOverallEfficiency(),
            creativity: this.state.creatividad || 0,
            curiosity: this.state.curiosidad || 0,
            adaptability: this.state.adaptabilidad || 0,
            depth: this.state.profundidad || 0,
            insight: this.state.insight || 0,
            flow: this.state.flow || 0,
            doubt: this.state.duda || 0
        };
    }

    getOverallEfficiency() {
        let totalEfficiency = 0;
        this.cognitiveProcesses.forEach(process => {
            totalEfficiency += process.efficiency;
        });
        return totalEfficiency / this.cognitiveProcesses.size;
    }

    getGoals() {
        return [...this.goals];
    }

    getPlans() {
        return [...this.plans];
    }

    getDecisionHistory() {
        return this.decisionHistory.slice(-20);
    }

    getThoughtHistory() {
        return this.thoughtHistory.slice(-20);
    }

    getInsightMoments() {
        return this.insightMoments.slice(-10);
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    reset() {
        this.initializeState();
        this.goals = [];
        this.plans = [];
        this.currentPlan = null;
        this.decisionHistory = [];
        this.cognitiveCache = {};
        this.thoughtHistory = [];
        this.insightMoments = [];
        this.creativeSpikes = 0;
    }

    exportData() {
        return {
            state: this.getState(),
            cognitiveProfile: this.cognitiveProfile,
            cognitiveProcesses: Array.from(this.cognitiveProcesses.entries()),
            performanceMetrics: this.getPerformanceMetrics(),
            workingMemory: [...this.workingMemory],
            goals: this.getGoals(),
            plans: this.getPlans(),
            decisionHistory: this.getDecisionHistory(),
            thoughtHistory: this.getThoughtHistory(),
            insightMoments: this.getInsightMoments()
        };
    }
}

systemCore.registerModule('cognitive', new CognitiveSystem());
