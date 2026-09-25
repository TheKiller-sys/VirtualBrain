// src/modules/CognitiveSystem.js
// V4.1
//
// CAMBIOS CLAVE V4.1:
//  - getEmotionalBias lee del input emocional (antes era siempre 0)
//  - processThoughts con coherencia narrativa entre pensamientos
//  - evaluateOption con penalización bidireccional correcta
//  - updateSlow para metas y planes
//  - eventos críticos con severity
//  - persistencia batch con contextos truncados

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

        // Buffers de persistencia
        this._pendingThoughts = [];
        this._pendingDecisions = [];

        // Coherencia narrativa
        this._lastThoughtAt = -Infinity;
        this._thoughtTheme = null;
        this._thoughtMomentum = 0;

        // Throttle de procesamiento pesado
        this._lastGoalSortAt = -Infinity;
        this._lastMetacognitionAt = -Infinity;
        this._lastCreativityAt = -Infinity;

        // Control de eventos
        this._criticalCooldown = 0;
    }

    async initialize(characterConfig) {
        this.config = characterConfig || { genotipo: 'humano' };
        this.setupCognitiveProfile();
        this.initializeState();
        this.setupCognitiveProcesses();
        this.setupGoalSystem();
        systemCore.logSystem('Sistema cognitivo V4.1 inicializado');
    }

    setupCognitiveProfile() {
        const g = this.config?.genotipo || 'humano';
        const profiles = {
            humano:     { attentionCapacity: 1.0, memoryEfficiency: 1.0, problemSolving: 1.0, decisionMaking: 1.0, learningRate: 1.0, cognitiveFlexibility: 1.0, creativityBaseline: 1.0, processingSpeed: 1.0, riskTaking: 1.0 },
            resiliente: { attentionCapacity: 1.1, memoryEfficiency: 1.2, problemSolving: 1.1, decisionMaking: 1.2, learningRate: 1.1, cognitiveFlexibility: 1.1, creativityBaseline: 1.0, processingSpeed: 1.05, riskTaking: 1.0 },
            vulnerable: { attentionCapacity: 0.8, memoryEfficiency: 0.7, problemSolving: 0.8, decisionMaking: 0.7, learningRate: 0.9, cognitiveFlexibility: 0.7, creativityBaseline: 0.9, processingSpeed: 0.85, riskTaking: 0.7 },
            audaz:      { attentionCapacity: 1.3, memoryEfficiency: 1.0, problemSolving: 1.2, decisionMaking: 1.4, learningRate: 1.0, cognitiveFlexibility: 1.3, creativityBaseline: 1.1, processingSpeed: 1.1, riskTaking: 1.5 },
            intelectual:{ attentionCapacity: 1.4, memoryEfficiency: 1.5, problemSolving: 1.6, decisionMaking: 1.3, learningRate: 1.4, cognitiveFlexibility: 1.2, creativityBaseline: 1.2, processingSpeed: 1.0, riskTaking: 0.9 },
            social:     { attentionCapacity: 1.1, memoryEfficiency: 1.3, problemSolving: 1.0, decisionMaking: 1.1, learningRate: 1.2, cognitiveFlexibility: 1.0, creativityBaseline: 1.1, processingSpeed: 1.05, riskTaking: 1.0 }
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
        this._pendingThoughts = [];
        this._pendingDecisions = [];
        this._lastThoughtAt = -Infinity;
        this._thoughtTheme = null;
        this._thoughtMomentum = 0;
        this._criticalCooldown = 0;
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
        for (const k of Object.keys(proc)) {
            this.cognitiveProcesses.set(k, { ...proc[k], efficiency: 1.0, description: k });
        }
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
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            progress: 0,
            active: true,
            createdAt: this.lastUpdateTime
        });
    }

    onEvent(cb) { this.eventListeners.push(cb); }

    emitEvent(type, data) {
        const payload = { type, data, module: 'cognitive', simTime: systemCore.systemTime };
        for (const cb of this.eventListeners) {
            try { cb(payload); }
            catch (err) { console.error('❌ cog listener:', err); }
        }
    }

    update(input, deltaTime) {
        this.lastUpdateTime = systemCore.systemTime;
        if (!input || !input.biochemical || !input.emotional) return this.getState();

        this.calculateBasalCapacities(input.biochemical);
        this.applyEmotionalInfluences(input.emotional, deltaTime);
        if (input.personality) this.applyPersonalityInfluence(input.personality, deltaTime);

        this.updateCognitiveProcesses();
        this.manageCognitiveLoad(deltaTime);
        this.processCreativityAndInsight(deltaTime);
        this.updateCuriosity(input, deltaTime);
        this.processThoughts(deltaTime);
        this.updateMetacognition(deltaTime);
        this.applyCognitiveHomeostasis(deltaTime);

        // Persistencia del estado cognitivo
        systemCore.queuePersistence('cognitive', () => {
            if (systemCore.database?.isInitialized) {
                return systemCore.database.saveCognitiveState({
                    ...this.state,
                    sim_time: systemCore.systemTime
                });
            }
        });

        // Flush de buffers
        if (this._pendingThoughts.length > 0 || this._pendingDecisions.length > 0) {
            systemCore.queuePersistence('cognitive-batch', async () => {
                const db = systemCore.database;
                if (!db?.isInitialized) {
                    this._pendingThoughts.length = 0;
                    this._pendingDecisions.length = 0;
                    return;
                }
                const thoughts = this._pendingThoughts.splice(0);
                const decisions = this._pendingDecisions.splice(0);
                for (const t of thoughts) {
                    try { await db.saveThought(t); } catch (_) {}
                }
                for (const d of decisions) {
                    try { await db.saveDecision(d); } catch (_) {}
                }
            });
        }

        this._checkCriticalConditions();
        return this.getState();
    }

    /**
     * Operaciones que no necesitan 4 Hz:
     *  - sort de goals
     *  - metacognición (varianza, coherencia)
     *  - creatividad e insight (procesos estocásticos lentos)
     */
    updateSlow(input, slowDelta) {
        this.processGoalsAndPlanning(input, slowDelta);
        if (this.currentPlan) this.executePlan(this.currentPlan, slowDelta);

        // Metacognición cada ~2s
        if (this.lastUpdateTime - this._lastMetacognitionAt >= 2) {
            this._lastMetacognitionAt = this.lastUpdateTime;
            this._updateMetacognitionSlow();
        }

        this._criticalCooldown = Math.max(0, this._criticalCooldown - slowDelta);
    }

    calculateBasalCapacities(bio) {
        const base = {
            atencion: 80, concentracion: 75, memoriaTrabajo: 70, velocidadProcesamiento: 65,
            razonamiento: 70, tomaDecisiones: 75, planificacion: 65, flexibilidad: 60, inhibicion: 70
        };

        const mod = {
            oxigeno: (bio.oxigeno ?? 50) / 100,
            energia: (bio.energia ?? 50) / 100,
            glucosa: Math.min(1.0, (bio.glucosa ?? 50) / 100),
            toxicidad: 1 - ((bio.toxicidad ?? 0) / 200),
            cortisol: 1 - ((bio.cortisol ?? 0) / 150),
            dopamina: (bio.dopamina ?? 50) / 100,
            noradrenalina: (bio.noradrenalina ?? 50) / 100,
            serotonina: (bio.serotonina ?? 50) / 100
        };
        const bf = Object.values(mod).reduce((p, f) => p * f, 1);

        for (const cap of Object.keys(base)) {
            let v = base[cap];
            v *= this.mapCapacityToProfile(cap);
            v *= (0.4 + bf * 0.6);
            v *= 1 - ((this.state.fatiga || 0) / 200);
            v *= 1 + (this.state.flow || 0) * 0.2;
            this.state[cap] = this.clamp(v, 0, 100);
        }

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
        for (const nt of Object.keys(ntEffects)) {
            const level = (bio[nt] ?? 50) / 100;
            for (const cap of Object.keys(ntEffects[nt])) {
                if (this.state[cap] !== undefined) {
                    this.state[cap] += ntEffects[nt][cap] * level * 10;
                }
            }
        }
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
        for (const em of Object.keys(effects)) {
            const level = (emo[em] ?? 0) / 100;
            for (const cap of Object.keys(effects[em])) {
                if (this.state[cap] !== undefined) {
                    this.state[cap] += effects[em][cap] * level * dt * 20;
                }
            }
        }

        // Flow state: reto vs habilidad
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
        if (t.openness !== undefined) {
            const f = (t.openness - 0.5) * 2;
            this.state.creatividad += f * 3 * dt;
            this.state.curiosidad += f * 4 * dt;
        }
        if (t.conscientiousness !== undefined) {
            const f = (t.conscientiousness - 0.5) * 2;
            this.state.planificacion += f * 4 * dt;
            this.state.concentracion += f * 3 * dt;
        }
        if (t.extraversion !== undefined) {
            const f = (t.extraversion - 0.5) * 2;
            this.state.velocidadProcesamiento += f * 3 * dt;
            this.state.fluidez += f * 2 * dt;
        }
        if (t.neuroticism !== undefined) {
            const f = (t.neuroticism - 0.5) * 2;
            this.state.inhibicion += f * 2 * dt;
            this.state.estres += f * 3 * dt;
            this.state.duda += f * 2 * dt;
        }
        if (t.agreeableness !== undefined) {
            const f = (t.agreeableness - 0.5) * 2;
            this.state.tomaDecisiones += f * 2 * dt;
            this.state.flexibilidad += f * 1.5 * dt;
        }
    }

    updateCognitiveProcesses() {
        for (const [name, p] of this.cognitiveProcesses) {
            const baseEff = this.getProcessBaseEfficiency(name);
            const loadFactor = 1 - (p.load / p.capacity);
            const fatigueFactor = 1 - ((this.state.fatiga || 0) / 200);
            const stressFactor = 1 - ((this.state.estres || 0) / 150);
            const flowFactor = 1 + (this.state.flow || 0) * 0.1;
            p.efficiency = this.clamp(baseEff * loadFactor * fatigueFactor * stressFactor * flowFactor, 0.1, 1.0);
        }
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
        return map[name] ?? 1.0;
    }

    updateTotalCognitiveLoad() {
        let total = 0, wsum = 0;
        for (const p of this.cognitiveProcesses.values()) {
            const w = p.priority || 1;
            total += p.load * w;
            wsum += w;
        }
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
        // Sort solo si alguna prioridad cambió de forma significativa
        let changed = false;
        for (const g of this.goals) {
            const newP = this.calculateGoalPriority(g, input);
            if (Math.abs(newP - g.priority) > 0.5) {
                g.priority = newP;
                changed = true;
            }
        }
        if (changed || this.goals.length === 0) {
            this.goals.sort((a, b) => b.priority - a.priority);
        }

        if (!this.currentPlan || this.currentPlan.completed) {
            const main = this.goals[0];
            if (main) this.currentPlan = this.generatePlan(main, input);
        }

        if (this.currentPlan && !this.currentPlan.completed) {
            this.currentPlan.progress += this.calculatePlanProgress(this.currentPlan, dt);
            this.currentPlan.progress = this.clamp(this.currentPlan.progress, 0, 100);
            if (this.currentPlan.progress >= 100) {
                this.currentPlan.completed = true;
                this.emitEvent('goal_completed', { goal: this.currentPlan.goal, simTime: this.lastUpdateTime });
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
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            goal,
            steps,
            currentStep: 0,
            progress: 0,
            completed: false,
            startSimTime: this.lastUpdateTime,
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
                this.emitEvent('plan_completed', { plan, simTime: this.lastUpdateTime });
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
        // Throttle: solo evaluar insight/creatividad cada ~0.5s
        if (this.lastUpdateTime - this._lastCreativityAt < 0.5) return;
        const realDt = this.lastUpdateTime - this._lastCreativityAt;
        this._lastCreativityAt = this.lastUpdateTime;

        const relax = 1 - (this.state.estres || 0) / 100;
        const open = (this.state.flexibilidad || 50) / 100;
        const energy = (this.state.atencion || 50) / 100;
        const flow = (this.state.flow || 0) / 100;
        const factor = relax * 0.3 + open * 0.3 + energy * 0.2 + flow * 0.2;

        // Probabilidad por segundo, escalada por realDt
        if (Math.random() < 0.01 * factor * realDt) {
            this.state.creatividad = Math.min(100, (this.state.creatividad || 0) + 2);
            this.creativeSpikes++;
        }
        if (Math.random() < 0.005 * ((this.state.intuicion || 0) / 100) * realDt) {
            const intensity = 0.3 + Math.random() * 0.7;
            this.insightMoments.push({
                simTime: this.lastUpdateTime,
                wallTime: Date.now(),
                intensity,
                description: 'Momento de iluminación'
            });
            if (this.insightMoments.length > 50) this.insightMoments.shift();
            this.state.insight = Math.min(100, (this.state.insight || 0) + intensity * 10);
            this.emitEvent('insight', { intensity, simTime: this.lastUpdateTime });
        }

        this.state.creatividad = Math.max(0, this.state.creatividad - 0.5 * realDt);
        this.state.insight = Math.max(0, (this.state.insight || 0) - 0.3 * realDt);
    }

    processThoughts(dt) {
        const consciousness = systemCore.systemState?.consciousnessLevel || 0;
        if (consciousness < 0.15) return;

        // Coherencia: mantener momentum narrativo. Si acabamos de pensar,
        // no pensar de nuevo tan rápido.
        const timeSinceLast = this.lastUpdateTime - this._lastThoughtAt;
        if (timeSinceLast < 3) return;

        // Probabilidad por segundo, calibrada
        const baseProb = 0.15 + consciousness * 0.4;
        const p = baseProb * dt;

        if (Math.random() > p) return;

        this._lastThoughtAt = this.lastUpdateTime;
        this._thoughtMomentum = Math.min(1, this._thoughtMomentum + 0.2);

        const emotionalModule = systemCore.modules.get('emotional');
        const dom = emotionalModule?.getDominantEmotion?.()?.emotion || 'neutral';

        // Continuidad temática: 60% continuar el tema previo, 40% nuevo
        let theme = this._thoughtTheme;
        if (!theme || Math.random() > 0.6) {
            theme = dom;
            this._thoughtTheme = theme;
        }

        const type = this._pickThoughtType(consciousness, emotionalModule);
        const contenido = this._generateThoughtContent(type, theme, dom);

        const thought = {
            contenido,
            tipo: type,
            intensidad: 0.3 + Math.random() * 0.5,
            tema: theme,
            simTime: this.lastUpdateTime,
            wallTime: Date.now()
        };

        this.thoughtHistory.push(thought);
        if (this.thoughtHistory.length > 100) this.thoughtHistory.shift();
        this.emitEvent('thought', thought);

        // Persistir solo los significativos
        if (thought.intensidad > 0.5) {
            this._pendingThoughts.push({
                contenido: thought.contenido,
                tipo: thought.tipo,
                intensidad: thought.intensidad,
                emocion_asociada: dom,
                nivel_consciencia: consciousness,
                timestamp: thought.wallTime,
                sim_time: thought.simTime
            });
            if (this._pendingThoughts.length > 200) {
                this._pendingThoughts.splice(0, this._pendingThoughts.length - 200);
            }
        }
    }

    _pickThoughtType(consciousness, emotionalModule) {
        const dom = emotionalModule?.getDominantEmotion?.()?.emotion || 'neutral';
        const weights = {
            consciente: 2,
            subconsciente: 1,
            asociativo: 1.5,
            creativo: this.state.creatividad > 50 ? 2 : 1,
            reflexivo: consciousness > 0.5 ? 2 : 1,
            intuitivo: this.state.intuicion > 50 ? 2 : 1
        };
        if (['miedo', 'ira', 'ansiedad'].includes(dom)) weights.reflexivo += 1;

        const entries = Object.entries(weights);
        const total = entries.reduce((s, [, w]) => s + w, 0);
        let r = Math.random() * total;
        for (const [type, w] of entries) {
            r -= w;
            if (r <= 0) return type;
        }
        return 'consciente';
    }

    _generateThoughtContent(type, theme, dom) {
        const templates = {
            consciente: [
                `Analizando mi estado actual: siento ${dom}`,
                `Percibo ${theme} con claridad`,
                `Estoy presente, procesando ${theme}`
            ],
            subconsciente: [
                `Procesando conexiones profundas relacionadas con ${theme}`,
                `Algo sobre ${theme} resuena en mi interior`,
                `Emergen patrones ocultos vinculados a ${theme}`
            ],
            asociativo: [
                `Recordando experiencias similares a ${theme}`,
                `${theme} me recuerda a algo previo`,
                `Asociando ${theme} con vivencias pasadas`
            ],
            creativo: [
                `Explorando nuevas perspectivas sobre ${theme}`,
                `${theme} podría verse de otra forma`,
                `Imaginando posibilidades alrededor de ${theme}`
            ],
            reflexivo: [
                `Reflexionando sobre mis procesos internos`,
                `¿Por qué siento ${dom}?`,
                `Contemplando la naturaleza de ${theme}`
            ],
            intuitivo: [
                `Sintiendo una comprensión profunda sin palabras`,
                `Mi intuición me susurra sobre ${theme}`,
                `Algo en mí entiende ${theme} más allá de la razón`
            ]
        };
        const list = templates[type] || templates.consciente;
        return list[Math.floor(Math.random() * list.length)];
    }

    updateMetacognition(dt) {
        // Solo algunas partes en el tick rápido
        const coherence = this.getCognitiveCoherence();
        this.state.autoconciencia = this.clamp(coherence * 100, 0, 100);
        const perf = this.getCurrentPerformance();
        this.state.monitoreo = this.clamp(perf * 100, 0, 100);
        this.state.regulacion = this.clamp((this.state.autoconciencia + this.state.monitoreo) / 2, 0, 100);

        this.state.duda = Math.max(0, this.state.duda - 0.5 * dt);
        if (this.state.complejidad > 0.6 && this.state.autoconciencia > 60) {
            this.state.duda += 0.2 * dt;
        }
        this.state.duda = this.clamp(this.state.duda, 0, 100);
    }

    _updateMetacognitionSlow() {
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
    }

    updateCuriosity(input, dt) {
        const bio = input.biochemical || {};
        const emo = input.emotional || {};
        const env = input.environmental || input.environment || {};

        const novelty = this.calculateNovelty(input);
        const energy = (bio.energia ?? 50) / 100;
        const safety = 1 - ((emo.miedo ?? 0) / 100);
        const stimulus = (env.oxigeno ?? 50) / 100;
        const inc = (novelty * 0.3 + stimulus * 0.15 + (this.state.creatividad || 0) / 100 * 0.2) * energy * safety * dt * 8;
        this.state.curiosidad = this.clamp(this.state.curiosidad + inc - 0.08 * dt, 0, 100);
    }

    calculateNovelty(input) {
        let n = 0.5;
        const env = input.environmental || input.environment;
        if (env) {
            if (env.toxinas !== undefined) n += Math.abs(env.toxinas - 50) / 100;
            if (env.peligro !== undefined) n += env.peligro / 100;
            if (Array.isArray(env.eventos)) n += Math.min(0.3, env.eventos.length * 0.05);
        }
        const emo = input.emotional;
        if (emo) {
            for (const e of ['alegria', 'miedo', 'ira', 'tristeza', 'sorpresa']) {
                if (emo[e] !== undefined) n += Math.abs(emo[e] - 20) / 100;
            }
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
        const red = (this.state.fatiga || 0) * 0.005
                  + (this.state.estres || 0) * 0.003
                  + (this.state.carga || 0) * 0.002;
        return Math.max(0, (base / 100) - red);
    }

    applyCognitiveHomeostasis(dt) {
        for (const k of Object.keys(this.state)) {
            if (typeof this.state[k] === 'number') {
                this.state[k] = this.clamp(this.state[k], 0, 100);
            }
        }
        const rec = (this.cognitiveProfile?.learningRate || 1.0) * 0.08 * dt;
        this.state.fatiga = Math.max(0, this.state.fatiga - rec * 5);
        this.state.estres = Math.max(0, this.state.estres - rec * 3);
        if (this.state.curiosidad < 15) this.state.curiosidad += 0.3 * dt;
        if (this.state.bloqueo > 20) this.state.bloqueo -= 0.2 * dt;
    }

    _checkCriticalConditions() {
        if (this._criticalCooldown > 0) return;
        const critical = this.state.fatiga > 90 || this.state.estres > 90 || this.state.carga > 95;
        if (critical) {
            this.emitEvent('critical', {
                type: 'cognitive_critical',
                severity: 0.85,
                state: { fatiga: this.state.fatiga, estres: this.state.estres, carga: this.state.carga }
            });
            this._criticalCooldown = 10;
        }
    }

    /**
     * FIX CRÍTICO: antes leía `this.state.alegria` etc. que no existen en
     * CognitiveSystem → siempre devolvía 0. Ahora recibe el estado emocional
     * como argumento (viene del input).
     */
    processDecision(context, options) {
        if (!options || options.length === 0) return { decision: null, confidence: 0 };

        const emotionalState = context?.emocional || context?.emotional || {};

        const metrics = {
            rationality: (this.state.razonamiento || 50) / 100,
            riskTolerance: this.getRiskTolerance(emotionalState),
            attention: (this.state.atencion || 50) / 100,
            emotionalInfluence: this.getEmotionalBias(emotionalState),
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
            confidence: Math.max(0, best.confidence * (1 - metrics.doubt * 0.3)),
            processingTime: this.getProcessingTime(metrics),
            metrics,
            alternatives: processed.slice(1, 3).map(p => ({ option: p.option, score: p.score }))
        };

        this.decisionHistory.push({
            ...decision,
            simTime: this.lastUpdateTime,
            wallTime: Date.now(),
            context: this._sanitizeContext(context)
        });
        if (this.decisionHistory.length > 100) this.decisionHistory.shift();

        this.emitEvent('decision_made', { decision: decision.decision?.text || 'opción', confidence: decision.confidence });

        // Buffer de persistencia
        const emocionDominante = this._getDominantEmotionFromState(emotionalState);
        this._pendingDecisions.push({
            decision: decision.decision?.text || decision.decision,
            opciones: options.slice(0, 10),
            contexto: this._sanitizeContext(context),
            confianza: decision.confidence,
            tiempo_procesamiento: decision.processingTime,
            emocion_dominante: emocionDominante,
            resultado: 'pendiente',
            timestamp: Date.now(),
            sim_time: systemCore.systemTime
        });
        if (this._pendingDecisions.length > 100) {
            this._pendingDecisions.splice(0, this._pendingDecisions.length - 100);
        }

        return decision;
    }

    _getDominantEmotionFromState(emotionalState) {
        const emotions = ['alegria', 'tristeza', 'miedo', 'ira', 'confianza', 'ansiedad'];
        let dom = 'neutral', max = 0;
        for (const e of emotions) {
            const v = emotionalState[e] || 0;
            if (v > max) { max = v; dom = e; }
        }
        return dom;
    }

    _sanitizeContext(context) {
        // Evita JSON circular y trunca strings largos
        const safe = {};
        for (const k of Object.keys(context || {})) {
            const v = context[k];
            if (v === null || v === undefined) continue;
            if (typeof v === 'string') safe[k] = v.substring(0, 500);
            else if (typeof v === 'number' || typeof v === 'boolean') safe[k] = v;
            else if (Array.isArray(v)) safe[k] = v.slice(0, 10);
            else if (typeof v === 'object') {
                // Snapshot superficial de solo primitivos
                const sub = {};
                let count = 0;
                for (const sk of Object.keys(v)) {
                    if (count++ > 10) break;
                    const sv = v[sk];
                    if (typeof sv === 'string') sub[sk] = sv.substring(0, 200);
                    else if (typeof sv === 'number' || typeof sv === 'boolean') sub[sk] = sv;
                }
                safe[k] = sub;
            }
        }
        return safe;
    }

    /**
     * FIX: penalización bidireccional. Antes `if (option.risk)` ignoraba
     * risk=0 y no distinguía entre bajo/alto. Ahora:
     *  - risk alto + tolerancia alta = bonus
     *  - risk alto + tolerancia baja = penalización fuerte
     *  - risk bajo + tolerancia baja = bonus
     *  - risk bajo + tolerancia alta = ligera penalización
     */
    evaluateOption(option, metrics, context) {
        let score = (option.utility || 50) * metrics.rationality;

        const risk = option.risk ?? 0.5;
        const riskDelta = metrics.riskTolerance - 0.5;
        // Contribution: si risk=1 y riskDelta>0 → positivo. Si risk=1 y riskDelta<0 → negativo.
        const riskContribution = (risk - 0.5) * riskDelta * 40;
        score += riskContribution;

        // Influencia emocional (acotada)
        score *= (1 + Math.max(-0.3, Math.min(0.3, metrics.emotionalInfluence * 0.2)));

        if (option.intuitive) {
            score *= (1 + metrics.intuition * 0.15);
        }

        score *= (0.7 + metrics.attention * 0.3);

        const confidence = Math.min(1.0,
            metrics.attention * metrics.rationality * (0.8 + metrics.intuition * 0.2)
        ) * (1 - metrics.doubt * 0.3);

        return { option, score: Math.max(0, score), confidence: Math.max(0, confidence) };
    }

    getRiskTolerance(emotionalState) {
        const base = 0.5;
        const profile = this.cognitiveProfile?.riskTaking || 1.0;
        const emo = (((emotionalState?.confianza || 50) / 100) - 0.5) * 0.3;
        const fearPenalty = -((emotionalState?.miedo || 0) / 500);
        const stress = -((this.state.estres || 0) / 500);
        return this.clamp(base * profile + emo + fearPenalty + stress, 0, 1);
    }

    getEmotionalBias(emotionalState) {
        const positive = ((emotionalState.alegria || 0) + (emotionalState.confianza || 0)) / 200;
        const negative = ((emotionalState.miedo || 0) + (emotionalState.ira || 0)) / 200;
        return positive - negative;
    }

    getProcessingTime(metrics) {
        const base = 800;
        const speed = Math.max(0.1, metrics.speed || 0.5);
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
        for (const k of Object.keys(eff)) {
            if (this.state[k] !== undefined) {
                this.state[k] += eff[k];
            }
        }
        // Clamp inmediato
        for (const k of Object.keys(this.state)) {
            if (typeof this.state[k] === 'number') {
                this.state[k] = this.clamp(this.state[k], 0, 100);
            }
        }
    }

    getSituationCognitiveEffects(type, i) {
        const map = {
            'amenaza': { atencion: 20 * i, concentracion: -15 * i, estres: 25 * i, tomaDecisiones: -10 * i, bloqueo: 10 * i },
            'recompensa': { aprendizaje: 15 * i, atencion: 10 * i, fluidez: 20 * i, creatividad: 15 * i, curiosidad: 10 * i },
            'fatiga': { fatiga: 30 * i, atencion: -25 * i, velocidadProcesamiento: -20 * i, memoriaTrabajo: -15 * i, creatividad: -10 * i },
            'interaccion_social': { atencion: 15 * i, flexibilidad: 10 * i, tomaDecisiones: 12 * i, aprendizaje: 10 * i },
            'estres_alto': { estres: 30 * i, atencion: -20 * i, memoriaTrabajo: -15 * i, tomaDecisiones: -20 * i, bloqueo: 15 * i },
            'recuperacion': { fatiga: -20 * i, estres: -25 * i, fluidez: 15 * i, atencion: 10 * i, creatividad: 10 * i },
            'descanso': { fatiga: -15 * i, estres: -20 * i, atencion: 5 * i },
            'desafio': { atencion: 25 * i, razonamiento: 20 * i, tomaDecisiones: 15 * i, estres: 10 * i, flow: 10 * i },
            'inspiracion': { creatividad: 30 * i, insight: 25 * i, fluidez: 20 * i, curiosidad: 15 * i },
            'reposo': { fatiga: -15 * i, estres: -20 * i, atencion: 5 * i },
            'aprendizaje_intenso': { aprendizaje: 25 * i, atencion: 15 * i, memoriaTrabajo: 12 * i, curiosidad: 10 * i },
            'insight': { insight: 30 * i, creatividad: 20 * i, flexibilidad: 15 * i },
            'lesion': { atencion: -15 * i, concentracion: -20 * i, fatiga: 20 * i },
            'entrenamiento': { atencion: 15 * i, aprendizaje: 20 * i, fatiga: 12 * i },
            'logro': { confianza: 15 * i, fluidez: 15 * i, creatividad: 12 * i },
            'fracaso': { estres: 20 * i, bloqueo: 15 * i, confianza: -15 * i },
            'tormenta': { estres: 15 * i, atencion: -10 * i }
        };
        return map[type] || {};
    }

    emergencyProtocol() {
        this.applyModulation({
            atencion: 20, concentracion: 15, estres: -40, fatiga: -30,
            tomaDecisiones: 10, autoconciencia: 15, bloqueo: -20, duda: -15
        });
        this.emitEvent('emergency', { type: 'cognitive_emergency', severity: 0.95 });
    }

    applyModulation(mod) {
        for (const k of Object.keys(mod)) {
            if (this.state[k] !== undefined) {
                this.state[k] = this.clamp(this.state[k] + mod[k], 0, 100);
            }
        }
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
        this._pendingThoughts = [];
        this._pendingDecisions = [];
        this._thoughtTheme = null;
        this._thoughtMomentum = 0;
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
