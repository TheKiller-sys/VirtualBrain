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
        this.cognitiveLoad = 0;
    }

    async initialize(characterConfig) {
        this.config = characterConfig || { genotipo: 'humano' };
        this.setupCognitiveProfile();
        this.initializeState();
        this.setupCognitiveProcesses();
        this.setupGoalSystem();
        systemCore.logSystem('Sistema cognitivo V4 inicializado');
    }

    setupCognitiveProfile() {
        const g = this.config?.genotipo || 'humano';
        const profiles = {
            humano:     { attentionCapacity: 1.0, memoryEfficiency: 1.0, problemSolving: 1.0, decisionMaking: 1.0, learningRate: 1.0, cognitiveFlexibility: 1.0, creativityBaseline: 1.0, processingSpeed: 1.0 },
            resiliente: { attentionCapacity: 1.1, memoryEfficiency: 1.2, problemSolving: 1.1, decisionMaking: 1.2, learningRate: 1.1, cognitiveFlexibility: 1.1 },
            vulnerable: { attentionCapacity: 0.8, memoryEfficiency: 0.7, problemSolving: 0.8, decisionMaking: 0.7, learningRate: 0.9, cognitiveFlexibility: 0.7 },
            audaz:      { attentionCapacity: 1.3, memoryEfficiency: 1.0, problemSolving: 1.2, decisionMaking: 1.4, learningRate: 1.0, cognitiveFlexibility: 1.3, riskTaking: 1.5 },
            intelectual:{ attentionCapacity: 1.4, memoryEfficiency: 1.5, problemSolving: 1.6, decisionMaking: 1.3, learningRate: 1.4, cognitiveFlexibility: 1.2, analyticalThinking: 1.5 },
            social:     { attentionCapacity: 1.1, memoryEfficiency: 1.3, problemSolving: 1.0, decisionMaking: 1.1, learningRate: 1.2, cognitiveFlexibility: 1.0, socialCognition: 1.6 }
        };
        this.cognitiveProfile = profiles[g] || profiles.humano;
    }

    initializeState() {
        this.state = {
            atencion: 80, concentracion: 75, memoriaTrabajo: 70, velocidadProcesamiento: 65,
            razonamiento: 70, tomaDecisiones: 75, planificacion: 65, flexibilidad: 60,
            inhibicion: 70, memoriaCortoPlazo: 75, memoriaLargoPlazo: 80, memoriaProcedural: 70,
            aprendizaje: 70, retencion: 75, transferencia: 60, autoconciencia: 65, monitoreo: 70, regulacion: 60,
            fatiga: 20, estres: 25, carga: 30, fluidez: 65, curiosidad: 50, creatividad: 40,
            intuicion: 45, sabiduria: 30, complejidad: 0.5, eficiencia: 0.7, adaptabilidad: 0.6,
            profundidad: 0.5, flow: 0, bloqueo: 0, iluminacion: 0, duda: 20
        };
        this.workingMemory = [];
        this.cognitiveLoad = 0;
        this.attentionFocus = 'general';
        this.attentionHistory = [];
        this.thoughtHistory = [];
        this.insightMoments = [];
        this.creativeSpikes = 0;
        this.lastUpdateTime = systemCore.systemTime;
    }

    setupCognitiveProcesses() {
        const proc = {
            perception: { capacity: 100, load: 0, priority: 3 },
            attention: { capacity: 100, load: 0, priority: 4 },
            memory: { capacity: 100, load: 0, priority: 2 },
            reasoning: { capacity: 100, load: 0, priority: 3 },
            decision: { capacity: 80, load: 0, priority: 5 },
            planning: { capacity: 60, load: 0, priority: 4 },
            metacognition: { capacity: 70, load: 0, priority: 2 },
            creativity: { capacity: 50, load: 0, priority: 3 }
        };
        Object.keys(proc).forEach(k => {
            this.cognitiveProcesses.set(k, { ...proc[k], efficiency: 1.0, description: k });
        });
    }

    setupGoalSystem() {
        this.goals = [];
        this.addGoal({ type: 'survival', priority: 10, description: 'Mantener homeostasis' });
        this.addGoal({ type: 'learning', priority: 6, description: 'Adquirir conocimiento' });
        this.addGoal({ type: 'social', priority: 5, description: 'Establecer conexiones' });
        this.addGoal({ type: 'creative', priority: 3, description: 'Expresión creativa' });
    }

    addGoal(goal) {
        this.goals.push({
            ...goal,
            id: Date.now() + Math.random(),
            progress: 0,
            active: true,
            createdAt: this.lastUpdateTime
        });
    }

    onEvent(cb) { this.eventListeners.push(cb); }
    emitEvent(type, data) {
        this.eventListeners.forEach(cb => {
            try { cb({ type, data, module: 'cognitive' }); }
            catch (err) { console.error('❌ cog listener:', err); }
        });
    }

    update(input, deltaTime) {
        this.lastUpdateTime = systemCore.systemTime;
        if (!input || !input.biochemical || !input.emotional) return this.getState();

        this.calculateBasalCapacities(input.biochemical);
        this.applyEmotionalInfluences(input.emotional, deltaTime);
        if (input.personality) this.applyPersonalityInfluence(input.personality, deltaTime);

        this.updateCognitiveProcesses();
        this.manageCognitiveLoad(deltaTime);
        this.processGoalsAndPlanning(input, deltaTime);

        if (this.currentPlan) this.executePlan(this.currentPlan, deltaTime);

        this.processCreativityAndInsight(deltaTime);
        this.updateMetacognition(deltaTime);
        this.updateCuriosity(input, deltaTime);
        this.processThoughts(deltaTime);
        this.applyCognitiveHomeostasis(deltaTime);

        systemCore.queuePersistence('cognitive', () => {
            if (systemCore.database?.isInitialized) {
                return systemCore.database.saveCognitiveState(this.state);
            }
        });

        return this.getState();
    }

    calculateBasalCapacities(bio) {
        const base = {
            atencion: 80, concentracion: 75, memoriaTrabajo: 70, velocidadProcesamiento: 65,
            razonamiento: 70, tomaDecisiones: 75, planificacion: 65, flexibilidad: 60, inhibicion: 70
        };

        const mod = {
            oxigeno: (bio.oxigeno || 50) / 100,
            energia: (bio.energia || 50) / 100,
            glucosa: Math.min(1.0, (bio.glucosa || 50) / 100),
            toxicidad: 1 - ((bio.toxicidad || 0) / 200),
            cortisol: 1 - ((bio.cortisol || 0) / 150),
            dopamina: (bio.dopamina || 50) / 100,
            noradrenalina: (bio.noradrenalina || 50) / 100,
            serotonina: (bio.serotonina || 50) / 100
        };

        Object.keys(base).forEach(cap => {
            let v = base[cap];
            v *= this.mapCapacityToProfile(cap);
            const bf = Object.values(mod).reduce((p, f) => p * f, 1);
            v *= (0.4 + bf * 0.6);
            v *= 1 - ((this.state.fatiga || 0) / 200);
            v *= 1 + (this.state.flow || 0) * 0.2;
            this.state[cap] = this.clamp(v, 0, 100);
        });

        this.applyNeurotransmitterEffects(bio);
    }

    applyNeurotransmitterEffects(bio) {
        const ntEffects = {
            dopamina: { atencion: 0.3, concentracion: 0.2, aprendizaje: 0.4, creatividad: 0.3, curiosidad: 0.2, insight: 0.15 },
            noradrenalina: { atencion: 0.5, velocidadProcesamiento: 0.3, tomaDecisiones: 0.2 },
            acetilcolina: { memoriaTrabajo: 0.4, aprendizaje: 0.5, atencion: 0.3, profundidad: 0.3 },
            serotonina: { tomaDecisiones: 0.2, flexibilidad: 0.3, inhibicion: 0.2 },
            cortisol: { atencion: -0.4, memoriaTrabajo: -0.3, tomaDecisiones: -0.5, flexibilidad: -0.3, creatividad: -0.2, insight: -0.3 },
            gaba: { concentracion: 0.2, estres: -0.3, inhibicion: 0.3, bloqueo: -0.2 },
            glutamato: { aprendizaje: 0.2, razonamiento: 0.2, complejidad: 0.1 }
        };
        Object.keys(ntEffects).forEach(nt => {
            const level = (bio[nt] || 50) / 100;
            Object.keys(ntEffects[nt]).forEach(cap => {
                if (this.state[cap] !== undefined) {
                    this.state[cap] += ntEffects[nt][cap] * level * 10;
                }
            });
        });
    }

    applyEmotionalInfluences(emo, dt) {
        const effects = {
            alegria: { aprendizaje: 0.2, flexibilidad: 0.3, fluidez: 0.4, creatividad: 0.3, insight: 0.15 },
            tristeza: { atencion: -0.3, memoriaTrabajo: -0.2, velocidadProcesamiento: -0.2, curiosidad: -0.2 },
            miedo: { atencion: 0.4, concentracion: -0.2, tomaDecisiones: -0.3, flexibilidad: -0.2, bloqueo: 0.2 },
            ira: { velocidadProcesamiento: 0.3, flexibilidad: -0.4, inhibicion: -0.5, razonamiento: -0.2 },
            ansiedad: { atencion: -0.5, memoriaTrabajo: -0.4, tomaDecisiones: -0.6, planificacion: -0.3, bloqueo: 0.3 },
            confianza: { tomaDecisiones: 0.4, autoconciencia: 0.3, planificacion: 0.2, flexibilidad: 0.15 },
            sorpresa: { atencion: 0.3, curiosidad: 0.3, insight: 0.2, fluidez: 0.15 },
            frustracion: { bloqueo: 0.3, creatividad: -0.2, flexibilidad: -0.2 }
        };
        Object.keys(effects).forEach(em => {
            const level = (emo[em] || 0) / 100;
            Object.keys(effects[em]).forEach(cap => {
                if (this.state[cap] !== undefined) {
                    this.state[cap] += effects[em][cap] * level * dt * 20;
                }
            });
        });

        const challenge = this.state.carga || 30;
        const skill = (this.state.atencion + this.state.concentracion) / 2;
        if (challenge > 40 && skill > 40 && Math.abs(challenge - skill) < 15) {
            this.state.flow = Math.min(100, (this.state.flow || 0) + 0.5 * dt);
        } else {
            this.state.flow = Math.max(0, (this.state.flow || 0) - 0.3 * dt);
        }
    }

    applyPersonalityInfluence(p, dt) {
        const t = p.traits || {};
        if (t.openness) {
            const f = (t.openness - 0.5) * 2;
            this.state.creatividad += f * 3 * dt;
            this.state.curiosidad += f * 4 * dt;
        }
        if (t.conscientiousness) {
            const f = (t.conscientiousness - 0.5) * 2;
            this.state.planificacion += f * 4 * dt;
            this.state.concentracion += f * 3 * dt;
        }
        if (t.extraversion) {
            const f = (t.extraversion - 0.5) * 2;
            this.state.velocidadProcesamiento += f * 3 * dt;
            this.state.fluidez += f * 2 * dt;
        }
        if (t.neuroticism) {
            const f = (t.neuroticism - 0.5) * 2;
            this.state.inhibicion += f * 2 * dt;
            this.state.estres += f * 3 * dt;
            this.state.duda += f * 2 * dt;
        }
        if (t.agreeableness) {
            const f = (t.agreeableness - 0.5) * 2;
            this.state.tomaDecisiones += f * 2 * dt;
            this.state.flexibilidad += f * 1.5 * dt;
        }
    }

    updateCognitiveProcesses() {
        this.cognitiveProcesses.forEach((p, name) => {
            const baseEff = this.getProcessBaseEfficiency(name);
            const loadFactor = 1 - (p.load / p.capacity);
            const fatigueFactor = 1 - ((this.state.fatiga || 0) / 200);
            const stressFactor = 1 - ((this.state.estres || 0) / 150);
            const flowFactor = 1 + (this.state.flow || 0) * 0.1;
            p.efficiency = this.clamp(baseEff * loadFactor * fatigueFactor * stressFactor * flowFactor, 0.1, 1.0);
        });
        this.updateTotalCognitiveLoad();
    }

    getProcessBaseEfficiency(name) {
        const map = {
            perception: this.state.atencion / 100,
            attention: this.state.concentracion / 100,
            memory: this.state.memoriaTrabajo / 100,
            reasoning: this.state.razonamiento / 100,
            decision: this.state.tomaDecisiones / 100,
            planning: this.state.planificacion / 100,
            metacognition: this.state.autoconciencia / 100,
            creativity: this.state.creatividad / 100
        };
        return map[name] || 1.0;
    }

    updateTotalCognitiveLoad() {
        let total = 0, wsum = 0;
        this.cognitiveProcesses.forEach(p => {
            const w = p.priority || 1;
            total += p.load * w;
            wsum += w;
        });
        this.cognitiveLoad = wsum > 0 ? total / wsum : 0;
        this.state.carga = this.cognitiveLoad;
    }

    manageCognitiveLoad(dt) {
        const fatigueRate = this.cognitiveLoad * 0.08;
        this.state.fatiga += fatigueRate * dt * 10;

        if (this.cognitiveLoad > 70) {
            this.state.estres += (this.cognitiveLoad - 70) * 0.15 * dt;
            this.state.bloqueo += (this.cognitiveLoad - 70) * 0.05 * dt;
        }

        this.state.fatiga = Math.max(0, this.state.fatiga - 0.4 * dt);
        this.state.estres = Math.max(0, this.state.estres - 0.2 * dt);
        this.state.bloqueo = Math.max(0, this.state.bloqueo - 0.1 * dt);

        const fluencyBase = (this.state.atencion + this.state.concentracion) / 2;
        const reduction = (this.state.fatiga + this.state.estres) / 2;
        this.state.fluidez = this.clamp(fluencyBase - reduction, 0, 100);

        const effFactors = {
            a: this.state.atencion / 100,
            c: this.state.concentracion / 100,
            f: this.state.fluidez / 100,
            l: 1 - this.cognitiveLoad / 100
        };
        this.state.eficiencia = Object.values(effFactors).reduce((a, b) => a + b, 0) / 4;
    }

    processGoalsAndPlanning(input, dt) {
        this.goals.forEach(g => g.priority = this.calculateGoalPriority(g, input));
        this.goals.sort((a, b) => b.priority - a.priority);

        if (!this.currentPlan || this.currentPlan.completed) {
            const main = this.goals[0];
            if (main) this.currentPlan = this.generatePlan(main, input);
        }

        if (this.currentPlan && !this.currentPlan.completed) {
            this.currentPlan.progress += this.calculatePlanProgress(this.currentPlan, dt);
            this.currentPlan.progress = this.clamp(this.currentPlan.progress, 0, 100);
            if (this.currentPlan.progress >= 100) {
                this.currentPlan.completed = true;
                this.emitEvent('goal_completed', { goal: this.currentPlan.goal, time: this.lastUpdateTime });
            }
        }
    }

    calculateGoalPriority(goal, input) {
        let p = goal.priority || 5;
        const bio = input.biochemical || {};
        const emo = input.emotional || {};

        if (goal.type === 'survival') {
            if (bio.oxigeno < 30) p += 10;
            if (bio.energia < 20) p += 8;
            if (bio.toxicidad > 60) p += 6;
            if (bio.cortisol > 70) p += 5;
        }
        if (goal.type === 'learning') {
            if (this.state.curiosidad > 60) p += 5;
            if (this.state.creatividad > 50) p += 3;
        }
        if (goal.type === 'social') {
            if ((emo.conexion || 0) < 40) p += 4;
            if ((emo.confianza || 0) < 30) p += 3;
        }
        if (goal.type === 'creative') {
            if (this.state.creatividad > 50) p += 4;
            if (this.state.flow > 30) p += 3;
        }
        return Math.min(20, p);
    }

    generatePlan(goal, input) {
        const steps = [];
        const bio = input.biochemical || {};

        switch (goal.type) {
            case 'survival':
                if (bio.oxigeno < 30) steps.push({ action: 'increase_oxygen', estimatedTime: 20 });
                if (bio.energia < 20) steps.push({ action: 'conserve_energy', estimatedTime: 15 });
                if (bio.toxicidad > 60) steps.push({ action: 'detoxify', estimatedTime: 25 });
                if (bio.cortisol > 70) steps.push({ action: 'reduce_stress', estimatedTime: 20 });
                break;
            case 'learning':
                steps.push({ action: 'explore', estimatedTime: 30 });
                steps.push({ action: 'analyze', estimatedTime: 20 });
                steps.push({ action: 'synthesize', estimatedTime: 25 });
                break;
            case 'social':
                steps.push({ action: 'approach', estimatedTime: 10 });
                steps.push({ action: 'communicate', estimatedTime: 20 });
                steps.push({ action: 'build_trust', estimatedTime: 30 });
                break;
            case 'creative':
                steps.push({ action: 'brainstorm', estimatedTime: 20 });
                steps.push({ action: 'incubate', estimatedTime: 30 });
                steps.push({ action: 'implement', estimatedTime: 25 });
                break;
        }

        const plan = {
            id: Date.now(),
            goal,
            steps,
            currentStep: 0,
            progress: 0,
            completed: false,
            startTime: this.lastUpdateTime,
            estimatedDuration: steps.reduce((s, st) => s + (st.estimatedTime || 10), 0)
        };

        this.plans.push(plan);
        if (this.plans.length > 10) this.plans.shift();
        return plan;
    }

    calculatePlanProgress(plan, dt) {
        const eff = this.state.eficiencia || 0.5;
        const speed = (this.state.velocidadProcesamiento || 50) / 100;
        const flow = 1 + (this.state.flow || 0) * 0.1;
        const block = 1 - (this.state.bloqueo || 0) * 0.005;
        return 5 * eff * speed * flow * block * dt;
    }

    executePlan(plan, dt) {
        if (plan.completed || plan.steps.length === 0) return;
        const step = plan.steps[plan.currentStep];
        if (!step) return;
        const success = this.executePlanStep(step, dt);
        if (success) {
            plan.currentStep++;
            if (plan.currentStep >= plan.steps.length) {
                plan.completed = true;
                plan.progress = 100;
                this.emitEvent('plan_completed', { plan, time: this.lastUpdateTime });
            }
        }
    }

    executePlanStep(step, dt) {
        const speed = (this.state.velocidadProcesamiento || 50) / 100;
        const execTime = (step.estimatedTime || 20) * (1 / Math.max(0.1, speed));
        if (step.progress === undefined) step.progress = 0;
        step.progress += (100 / execTime) * dt;
        return step.progress >= 100;
    }

    processCreativityAndInsight(dt) {
        const relax = 1 - (this.state.estres || 0) / 100;
        const open = (this.state.flexibilidad || 50) / 100;
        const energy = (this.state.atencion || 50) / 100;
        const flow = (this.state.flow || 0) / 100;
        const factor = relax * 0.3 + open * 0.3 + energy * 0.2 + flow * 0.2;

        if (Math.random() < 0.01 * factor * dt) {
            this.state.creatividad = Math.min(100, (this.state.creatividad || 0) + 2);
            this.creativeSpikes++;
        }
        if (Math.random() < 0.005 * (this.state.intuicion || 0) / 100 * dt) {
            const intensity = 0.3 + Math.random() * 0.7;
            this.insightMoments.push({ time: this.lastUpdateTime, intensity, description: 'Momento de iluminación' });
            if (this.insightMoments.length > 50) this.insightMoments.shift();
            this.state.insight = Math.min(100, (this.state.insight || 0) + intensity * 10);
            this.emitEvent('insight', { intensity, time: this.lastUpdateTime });
        }

        this.state.creatividad = Math.max(0, this.state.creatividad - 0.5 * dt);
        this.state.insight = Math.max(0, (this.state.insight || 0) - 0.3 * dt);
    }

    processThoughts(dt) {
        const consciousness = systemCore.systemState?.consciousnessLevel || 0;
        if (consciousness < 0.15) return;

        const types = ['consciente', 'subconsciente', 'asociativo', 'creativo', 'reflexivo', 'intuitivo'];
        const prob = 0.08 + consciousness * 0.3;

        if (Math.random() < prob * dt) {
            const type = types[Math.floor(Math.random() * types.length)];
            const intensity = 0.2 + Math.random() * 0.6;
            const emotionalModule = systemCore.modules.get('emotional');
            const dom = emotionalModule?.getDominantEmotion()?.emotion || 'neutral';

            const templates = {
                consciente: `Analizando mi estado actual, sintiendo ${dom}`,
                subconsciente: `Procesando conexiones profundas relacionadas con ${dom}`,
                asociativo: `Recordando experiencias similares a ${dom}`,
                creativo: `Explorando nuevas perspectivas sobre ${dom}`,
                reflexivo: `Reflexionando sobre mis procesos internos`,
                intuitivo: `Sintiendo una comprensión profunda sin palabras`
            };

            const thought = {
                contenido: templates[type],
                tipo: type,
                intensidad: intensity,
                timestamp: this.lastUpdateTime
            };
            this.thoughtHistory.push(thought);
            if (this.thoughtHistory.length > 100) this.thoughtHistory.shift();
            this.emitEvent('thought', thought);

            if (intensity > 0.5 && systemCore.database?.isInitialized) {
                systemCore.database.saveThought({
                    contenido: thought.contenido,
                    tipo: thought.tipo,
                    intensidad: thought.intensidad,
                    emocion_asociada: dom,
                    nivel_consciencia: consciousness
                }).catch(() => {});
            }
        }
    }

    updateMetacognition(dt) {
        const coherence = this.getCognitiveCoherence();
        this.state.autoconciencia = this.clamp(coherence * 100, 0, 100);
        const perf = this.getCurrentPerformance();
        this.state.monitoreo = this.clamp(perf * 100, 0, 100);
        this.state.regulacion = this.clamp((this.state.autoconciencia + this.state.monitoreo) / 2, 0, 100);

        const depth = {
            a: this.state.atencion / 100,
            c: this.state.concentracion / 100,
            r: this.state.razonamiento / 100,
            p: this.state.complejidad || 0.5
        };
        this.state.profundidad = Object.values(depth).reduce((a, b) => a + b, 0) / 4;

        const adapt = {
            f: this.state.flexibilidad / 100,
            a: this.state.aprendizaje / 100,
            t: this.state.transferencia / 100,
            c: this.state.creatividad / 100
        };
        this.state.adaptabilidad = Object.values(adapt).reduce((a, b) => a + b, 0) / 4;

        this.state.duda = Math.max(0, this.state.duda - 0.5 * dt);
        if (this.state.complejidad > 0.6 && this.state.autoconciencia > 60) {
            this.state.duda += 0.2 * dt;
        }
        this.state.duda = this.clamp(this.state.duda, 0, 100);
    }

    updateCuriosity(input, dt) {
        const bio = input.biochemical || {};
        const emo = input.emotional || {};
        const env = input.environmental || {};
        const novelty = this.calculateNovelty(input);
        const energy = (bio.energia || 50) / 100;
        const safety = 1 - ((emo.miedo || 0) / 100);
        const stimulus = (env.oxigeno || 50) / 100;
        const inc = (novelty * 0.3 + stimulus * 0.15 + (this.state.creatividad || 0) / 100 * 0.2) * energy * safety * dt * 8;
        this.state.curiosidad = this.clamp(this.state.curiosidad + inc - 0.08 * dt, 0, 100);
    }

    calculateNovelty(input) {
        let n = 0.5;
        if (input.environmental) {
            const e = input.environmental;
            if (e.toxinas !== undefined) n += Math.abs(e.toxinas - 50) / 100;
            if (e.peligro !== undefined) n += e.peligro / 100;
        }
        if (input.emotional) {
            const e = input.emotional;
            ['alegria', 'miedo', 'ira', 'tristeza', 'sorpresa'].forEach(em => {
                if (e[em] !== undefined) n += Math.abs(e[em] - 20) / 100;
            });
        }
        return this.clamp(n, 0, 1);
    }

    getCognitiveCoherence() {
        const caps = ['atencion', 'concentracion', 'memoriaTrabajo', 'razonamiento'];
        const vals = caps.map(c => (this.state[c] || 50) / 100);
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        const variance = vals.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / vals.length;
        return Math.max(0, 1 - Math.sqrt(variance));
    }

    getCurrentPerformance() {
        const base = (this.state.atencion + this.state.concentracion + this.state.razonamiento) / 3;
        const red = (this.state.fatiga || 0) * 0.005 + (this.state.estres || 0) * 0.003 + (this.state.carga || 0) * 0.002;
        return Math.max(0, (base / 100) - red);
    }

    applyCognitiveHomeostasis(dt) {
        Object.keys(this.state).forEach(k => {
            if (typeof this.state[k] === 'number') this.state[k] = this.clamp(this.state[k], 0, 100);
        });
        const rec = (this.cognitiveProfile?.learningRate || 1.0) * 0.08 * dt;
        this.state.fatiga = Math.max(0, this.state.fatiga - rec * 5);
        this.state.estres = Math.max(0, this.state.estres - rec * 3);
        if (this.state.curiosidad < 15) this.state.curiosidad += 0.3 * dt;
        if (this.state.bloqueo > 20) this.state.bloqueo -= 0.2 * dt;
    }

    processDecision(context, options) {
        if (!options || options.length === 0) return { decision: null, confidence: 0 };

        const metrics = {
            rationality: (this.state.razonamiento || 50) / 100,
            riskTolerance: this.getRiskTolerance(),
            attention: (this.state.atencion || 50) / 100,
            emotionalInfluence: this.getEmotionalBias(),
            intuition: (this.state.intuicion || 45) / 100,
            speed: (this.state.velocidadProcesamiento || 50) / 100,
            doubt: (this.state.duda || 0) / 100
        };

        const processed = options.map(opt => this.evaluateOption(opt, metrics, context));
        const doubtFactor = 1 - metrics.doubt * 0.5;

        const best = processed.reduce((b, c) =>
            c.score * doubtFactor > b.score * doubtFactor ? c : b
        );

        const decision = {
            decision: best.option,
            confidence: best.confidence * (1 - metrics.doubt * 0.3),
            processingTime: this.getProcessingTime(metrics),
            metrics,
            alternatives: processed.slice(1, 3)
        };

        this.decisionHistory.push({
            ...decision,
            timestamp: this.lastUpdateTime,
            context
        });
        if (this.decisionHistory.length > 100) this.decisionHistory.shift();

        this.emitEvent('decision_made', decision);

        if (systemCore.database?.isInitialized) {
            systemCore.database.saveDecision({
                decision: decision.decision?.text || decision.decision,
                opciones: options,
                contexto: context,
                confianza: decision.confidence,
                tiempo_procesamiento: decision.processingTime,
                emocion_dominante: 'neutral',
                resultado: 'pendiente'
            }).catch(() => {});
        }

        return decision;
    }

    evaluateOption(option, metrics, context) {
        let score = (option.utility || 50) * metrics.rationality;
        if (option.risk) score += option.risk * (metrics.riskTolerance - 0.5) * 25;
        score *= (1 + metrics.emotionalInfluence * 0.2);
        if (option.intuitive) score *= (1 + metrics.intuition * 0.15);
        score *= (0.7 + metrics.attention * 0.3);

        const confidence = Math.min(1.0, metrics.attention * metrics.rationality * (0.8 + metrics.intuition * 0.2)) * (1 - metrics.doubt * 0.3);
        return { option, score: Math.max(0, score), confidence: Math.max(0, confidence) };
    }

    getRiskTolerance() {
        const base = 0.5;
        const profile = this.cognitiveProfile?.riskTaking || 1.0;
        const emo = ((this.state.confianza || 50) / 100 - 0.5) * 0.3;
        const stress = -((this.state.estres || 0) / 500);
        return this.clamp(base * profile + emo + stress, 0, 1);
    }

    getEmotionalBias() {
        const positive = ((this.state.alegria || 0) + (this.state.confianza || 0)) / 200;
        const negative = ((this.state.miedo || 0) + (this.state.ira || 0)) / 200;
        return positive - negative;
    }

    getProcessingTime(metrics) {
        const base = 800;
        const speed = metrics.speed || 0.5;
        const complexity = 1 + (1 - metrics.attention) * 0.5;
        const doubt = 1 + metrics.doubt * 0.5;
        return (base / speed) * complexity * doubt;
    }

    mapCapacityToProfile(cap) {
        const map = {
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
        return this.cognitiveProfile[map[cap]] || 1.0;
    }

    handleSituation(type, intensity) {
        const eff = this.getSituationCognitiveEffects(type, intensity);
        Object.keys(eff).forEach(k => {
            if (this.state[k] !== undefined) this.state[k] += eff[k];
        });
    }

    getSituationCognitiveEffects(type, i) {
        const map = {
            'amenaza': { atencion: 20 * i, concentracion: -15 * i, estres: 25 * i, tomaDecisiones: -10 * i, bloqueo: 10 * i },
            'recompensa': { aprendizaje: 15 * i, atencion: 10 * i, fluidez: 20 * i, creatividad: 15 * i, curiosidad: 10 * i },
            'fatiga': { fatiga: 30 * i, atencion: -25 * i, velocidadProcesamiento: -20 * i, memoriaTrabajo: -15 * i, creatividad: -10 * i },
            'interaccion_social': { atencion: 15 * i, flexibilidad: 10 * i, tomaDecisiones: 12 * i, aprendizaje: 10 * i },
            'estres_alto': { estres: 30 * i, atencion: -20 * i, memoriaTrabajo: -15 * i, tomaDecisiones: -20 * i, bloqueo: 15 * i },
            'recuperacion': { fatiga: -20 * i, estres: -25 * i, fluidez: 15 * i, atencion: 10 * i, creatividad: 10 * i },
            'desafio': { atencion: 25 * i, razonamiento: 20 * i, tomaDecisiones: 15 * i, estres: 10 * i, flow: 10 * i },
            'inspiracion': { creatividad: 30 * i, insight: 25 * i, fluidez: 20 * i, curiosidad: 15 * i },
            'reposo': { fatiga: -15 * i, estres: -20 * i, atencion: 5 * i }
        };
        return map[type] || {};
    }

    emergencyProtocol() {
        this.applyModulation({
            atencion: 20, concentracion: 15, estres: -40, fatiga: -30,
            tomaDecisiones: 10, autoconciencia: 15, bloqueo: -20, duda: -15
        });
        this.emitEvent('emergency', { type: 'cognitive_emergency', state: { ...this.state } });
    }

    applyModulation(mod) {
        Object.keys(mod).forEach(k => {
            if (this.state[k] !== undefined) {
                this.state[k] = this.clamp(this.state[k] + mod[k], 0, 100);
            }
        });
    }

    getState() { return { ...this.state }; }
    getCognitiveProcesses() { return new Map(this.cognitiveProcesses); }
    getGoals() { return [...this.goals]; }
    getPlans() { return [...this.plans]; }
    getDecisionHistory() { return this.decisionHistory.slice(-20); }
    getThoughtHistory() { return this.thoughtHistory.slice(-20); }
    getInsightMoments() { return this.insightMoments.slice(-10); }
    clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

    reset() {
        this.initializeState();
        this.goals = [];
        this.plans = [];
        this.currentPlan = null;
        this.decisionHistory = [];
        this.thoughtHistory = [];
        this.insightMoments = [];
        this.creativeSpikes = 0;
    }

    exportData() {
        return {
            state: this.getState(),
            cognitiveProfile: this.cognitiveProfile,
            cognitiveProcesses: Array.from(this.cognitiveProcesses.entries()),
            performance: {
                current: this.getCurrentPerformance(),
                load: this.cognitiveLoad,
                coherence: this.getCognitiveCoherence()
            },
            goals: this.getGoals(),
            plans: this.getPlans(),
            decisionHistory: this.getDecisionHistory(),
            thoughtHistory: this.getThoughtHistory(),
            insightMoments: this.getInsightMoments()
        };
    }
}

systemCore.registerModule('cognitive', new CognitiveSystem());
