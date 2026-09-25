// src/modules/MotorSystem.js
// V4.1
//
// CAMBIOS CLAVE V4.1:
//  - applyMotorProfile con clamp inmediato (antes > 100)
//  - habilidades ejercitadas por eventos ambientales
//  - saveMotorAction por batch
//  - updateSlow para aprendizaje motor
//  - eventos con severity

import { systemCore } from '../core/SystemCore.js';

export class MotorSystem {
    constructor() {
        this.state = {};
        this.config = {};
        this.motorSkills = new Map();
        this.actionQueue = [];
        this.currentAction = null;
        this.eventListeners = [];
        this.lastUpdateTime = 0;
        this.motorLearning = 0;
        this.executionHistory = [];
        this.reflexes = new Map();
        this.motorProfile = {};
        this.energyExpenditure = 0;

        // Batch de acciones pendientes de persistir
        this._pendingActions = [];

        // Throttle
        this._lastHistoryAt = -Infinity;
        this._historyIntervalSec = 10;
        this._criticalCooldown = 0;

        // Control de consumo de eventos ambientales
        this._lastEnvEventTimestamp = 0;
    }

    async initialize(characterConfig) {
        this.config = characterConfig || { genotipo: 'humano' };
        this.setupMotorProfile();
        this.initializeState();
        this.setupBasicSkills();
        this.setupReflexes();
        systemCore.logSystem('Sistema motor V4.1 inicializado');
    }

    setupMotorProfile() {
        const g = this.config?.genotipo || 'humano';
        const profiles = {
            humano:     { coordination: 1.0, strength: 1.0, endurance: 1.0, recovery: 1.0, precision: 1.0, agility: 1.0, motorLearning: 1.0, fineMotor: 1.0, reflexSpeed: 1.0 },
            resiliente: { coordination: 1.2, strength: 1.1, endurance: 1.3, recovery: 1.2, precision: 1.1, agility: 1.0, motorLearning: 1.2, fineMotor: 1.0, reflexSpeed: 1.1 },
            vulnerable: { coordination: 0.8, strength: 0.7, endurance: 0.6, recovery: 0.8, precision: 0.9, agility: 0.7, motorLearning: 0.8, fineMotor: 0.85, reflexSpeed: 0.9 },
            audaz:      { coordination: 1.3, strength: 1.4, endurance: 1.1, recovery: 1.0, precision: 0.9, agility: 1.5, motorLearning: 1.0, fineMotor: 0.95, reflexSpeed: 1.3, riskTaking: 1.4 },
            intelectual:{ coordination: 1.1, strength: 0.9, endurance: 1.0, recovery: 1.1, precision: 1.4, agility: 1.0, motorLearning: 1.3, fineMotor: 1.3, reflexSpeed: 1.0 },
            social:     { coordination: 1.2, strength: 1.0, endurance: 1.1, recovery: 1.2, precision: 1.1, agility: 1.1, motorLearning: 1.1, fineMotor: 1.0, reflexSpeed: 1.1 }
        };
        this.motorProfile = profiles[g] || profiles.humano;
    }

    initializeState() {
        this.state = {
            coordinacion: 80, fuerza: 75, velocidad: 70, precision: 72, agilidad: 65,
            equilibrio: 68, resistencia: 75, fatiga: 20, recuperacion: 70,
            controlVoluntario: 78, controlAutomatico: 82, fluidez: 74, tension: 25, relajacion: 60,
            estabilidad: 76, precisionFina: 70, fuerzaExplosiva: 65, resistenciaMuscular: 72,
            tiempoReaccion: 60, propiocepcion: 65, aprendizajeMotor: 50,
            fluidezMovimiento: 70, reflejos: 75
        };
        this._applyProfileToState();
        this.motorSkills = new Map();
        this.actionQueue = [];
        this.currentAction = null;
        this.energyExpenditure = 0;
        this.motorLearning = 0;
        this.executionHistory = [];
        this.reflexes = new Map();
        this._pendingActions = [];
        this._lastEnvEventTimestamp = 0;
        this._criticalCooldown = 0;
    }

    /**
     * FIX: aplicar perfil Y clampear inmediatamente. Antes los valores
     * podían quedar > 100 hasta el siguiente tick.
     */
    _applyProfileToState() {
        const map = {
            coordinacion: this.motorProfile.coordination,
            fuerza: this.motorProfile.strength,
            resistencia: this.motorProfile.endurance,
            precision: this.motorProfile.precision,
            agilidad: this.motorProfile.agility,
            recuperacion: this.motorProfile.recovery,
            precisionFina: this.motorProfile.fineMotor,
            aprendizajeMotor: this.motorProfile.motorLearning,
            reflejos: this.motorProfile.reflexSpeed
        };
        for (const k of Object.keys(map)) {
            if (this.state[k] !== undefined) {
                this.state[k] = this.clamp(this.state[k] * map[k], 0, 100);
            }
        }
    }

    setupBasicSkills() {
        const basic = {
            'caminar': { tipo: 'locomocion', complejidad: 2, energia: 1, precision: 1 },
            'correr': { tipo: 'locomocion', complejidad: 4, energia: 3, precision: 2 },
            'saltar': { tipo: 'locomocion', complejidad: 5, energia: 4, precision: 3 },
            'agarrar': { tipo: 'manipulacion', complejidad: 3, energia: 1, precision: 4 },
            'lanzar': { tipo: 'manipulacion', complejidad: 6, energia: 3, precision: 5 },
            'esquivar': { tipo: 'defensa', complejidad: 7, energia: 4, precision: 4 },
            'observar': { tipo: 'percepcion', complejidad: 1, energia: 0.5, precision: 2 },
            'escribir': { tipo: 'manipulacion', complejidad: 5, energia: 2, precision: 6 },
            'dibujar': { tipo: 'manipulacion', complejidad: 6, energia: 2, precision: 7 },
            'bailar': { tipo: 'expresivo', complejidad: 7, energia: 5, precision: 5 },
            'meditar': { tipo: 'habilidad', complejidad: 6, energia: 1, precision: 3 }
        };
        for (const k of Object.keys(basic)) {
            this.motorSkills.set(k, {
                ...basic[k],
                nivel: 70, practica: 10, eficiencia: 0.8,
                ultimoUso: 0, mastery: 0, complejidadDominada: false
            });
        }
    }

    setupReflexes() {
        this.reflexes.set('retirar_mano', { trigger: 'dolor_agudo', response: 'retirar', speed: 0.15, priority: 10 });
        this.reflexes.set('parpadeo', { trigger: 'estimulo_visual', response: 'parpadear', speed: 0.1, priority: 8 });
        this.reflexes.set('equilibrio', { trigger: 'perdida_equilibrio', response: 'ajustar_postura', speed: 0.2, priority: 9 });
    }

    onEvent(cb) { this.eventListeners.push(cb); }

    emitEvent(type, data) {
        const payload = { type, data, module: 'motor', simTime: systemCore.systemTime };
        for (const cb of this.eventListeners) {
            try { cb(payload); }
            catch (err) { console.error('❌ motor listener:', err); }
        }
    }

    update(input, deltaTime) {
        this.lastUpdateTime = systemCore.systemTime;
        if (!input || !input.biochemical) return this.getState();

        this.processReflexes(input, deltaTime);
        this._consumeEnvironmentalEvents(input);
        this.updateBasalCapacities(input.biochemical, deltaTime);
        this.processActionQueue(deltaTime);
        this.updateFatigueAndRecovery(deltaTime);
        this.applyNeurotransmitterEffects(input.biochemical, deltaTime);
        this.manageMotorControl(deltaTime);
        this.applyMotorHomeostasis();

        systemCore.queuePersistence('motor', () => {
            if (systemCore.database?.isInitialized) {
                return systemCore.database.saveMotorState({
                    ...this.state,
                    sim_time: systemCore.systemTime
                });
            }
        });

        // Flush de acciones
        if (this._pendingActions.length > 0) {
            systemCore.queuePersistence('motor-actions', async () => {
                const db = systemCore.database;
                if (!db?.isInitialized) {
                    this._pendingActions.length = 0;
                    return;
                }
                const actions = this._pendingActions.splice(0);
                for (const a of actions) {
                    try { await db.saveMotorAction(a); } catch (_) {}
                }
            });
        }

        return this.getState();
    }

    updateSlow(input, slowDelta) {
        this.applyMotorLearning(slowDelta);

        if (this.lastUpdateTime - this._lastHistoryAt >= this._historyIntervalSec) {
            this._lastHistoryAt = this.lastUpdateTime;
        }

        this._checkCriticalConditions();
        this._criticalCooldown = Math.max(0, this._criticalCooldown - slowDelta);
    }

    /**
     * FIX: los eventos del entorno ahora generan acciones motoras orgánicas.
     * Antes las habilidades solo mejoraban si había un reflejo, algo rarísimo.
     */
    _consumeEnvironmentalEvents(input) {
        const eventos = input.environment?.eventos || input.environmental?.eventos || [];
        if (!Array.isArray(eventos) || eventos.length === 0) return;

        for (const ev of eventos) {
            const ts = ev.timestamp || 0;
            if (ts <= this._lastEnvEventTimestamp) continue;

            const severidad = typeof ev === 'object' ? (ev.severidad || 0) : 0;
            if (severidad > 0.4) {
                // Eventos importantes generan acción motora
                const skill = this._pickActionForEvent(ev.texto || '');
                if (skill) {
                    this.addToActionQueue({
                        tipo: skill,
                        prioridad: Math.round(severidad * 10),
                        intensidad: Math.min(1, severidad + 0.3),
                        esReflejo: severidad > 0.8
                    });
                }
            }
        }
        const lastTs = eventos[eventos.length - 1]?.timestamp || 0;
        if (lastTs > this._lastEnvEventTimestamp) {
            this._lastEnvEventTimestamp = lastTs;
        }
    }

    _pickActionForEvent(texto) {
        const t = String(texto).toLowerCase();
        if (t.includes('peligro') || t.includes('tormenta') || t.includes('amenaza')) return 'esquivar';
        if (t.includes('recompensa') || t.includes('paraíso')) return 'bailar';
        if (t.includes('social') || t.includes('interaccion')) return 'agarrar';
        if (t.includes('calma') || t.includes('descanso')) return 'meditar';
        if (t.includes('amanecer') || t.includes('anochecer')) return 'observar';
        if (t.includes('territorio') || t.includes('hostil')) return 'correr';
        return null;
    }

    processReflexes(input, dt) {
        const bio = input.biochemical || {};
        const emo = input.emotional || {};
        if (bio.cortisol > 70 && emo.miedo > 60) this.executeReflex('retirar_mano');
        if (this.state.equilibrio < 40) this.executeReflex('equilibrio');
    }

    executeReflex(name) {
        const r = this.reflexes.get(name);
        if (!r) return;
        this.addToActionQueue({
            tipo: r.response, prioridad: r.priority, intensidad: 1.0,
            esReflejo: true, timestamp: Date.now()
        });
        this.emitEvent('reflex_executed', { reflex: name, response: r.response });
    }

    updateBasalCapacities(bio, dt) {
        const base = {
            coordinacion: 80, fuerza: 75, velocidad: 70, precision: 72, resistencia: 75,
            controlVoluntario: 78, precisionFina: 70, fuerzaExplosiva: 65, reflejos: 75
        };
        const mod = {
            energia: (bio.energia ?? 50) / 100,
            oxigeno: (bio.oxigeno ?? 50) / 100,
            toxicidad: 1 - ((bio.toxicidad ?? 0) / 150),
            cortisol: 1 - ((bio.cortisol ?? 0) / 120),
            dopamina: (bio.dopamina ?? 50) / 100,
            noradrenalina: (bio.noradrenalina ?? 50) / 100
        };
        const bf = Object.values(mod).reduce((p, f) => p * f, 1);

        for (const cap of Object.keys(base)) {
            let v = base[cap];
            v *= this.getProfileFactor(cap);
            v *= (0.3 + bf * 0.7);
            v *= 1 - (this.state.fatiga || 0) / 200;
            this.state[cap] = this.clamp(v, 0, 100);
        }
    }

    getProfileFactor(cap) {
        const map = {
            coordinacion: this.motorProfile.coordination,
            fuerza: this.motorProfile.strength,
            resistencia: this.motorProfile.endurance,
            precision: this.motorProfile.precision,
            agilidad: this.motorProfile.agility,
            recuperacion: this.motorProfile.recovery,
            precisionFina: this.motorProfile.fineMotor,
            reflejos: this.motorProfile.reflexSpeed
        };
        return map[cap] || 1.0;
    }

    applyNeurotransmitterEffects(bio, dt) {
        const eff = {
            dopamina: { fluidez: 0.3, velocidad: 0.2, aprendizajeMotor: 0.3 },
            noradrenalina: { fuerza: 0.4, velocidad: 0.5, tiempoReaccion: -0.25 },
            adrenalina: { fuerza: 0.6, velocidad: 0.7, agilidad: 0.5, fuerzaExplosiva: 0.5 },
            cortisol: { coordinacion: -0.3, precision: -0.4, controlVoluntario: -0.3 },
            gaba: { tension: -0.4, relajacion: 0.3, fluidezMovimiento: 0.2 },
            acetilcolina: { precisionFina: 0.3, coordinacion: 0.2 }
        };
        for (const nt of Object.keys(eff)) {
            const level = (bio[nt] ?? 50) / 100;
            for (const cap of Object.keys(eff[nt])) {
                if (this.state[cap] !== undefined) {
                    this.state[cap] += eff[nt][cap] * level * dt * 18;
                }
            }
        }
    }

    processActionQueue(dt) {
        if (this.currentAction?.completado) this.currentAction = null;
        if (!this.currentAction && this.actionQueue.length > 0) {
            this.currentAction = this.actionQueue.shift();
            this.currentAction.inicio = Date.now();
            this.currentAction.completado = false;
            this.currentAction.progreso = 0;
            this.emitEvent('action_started', { tipo: this.currentAction.tipo });
        }
        if (this.currentAction && !this.currentAction.completado) {
            this.executeCurrentAction(dt);
        }
    }

    executeCurrentAction(dt) {
        const action = this.currentAction;
        const skill = this.motorSkills.get(action.tipo);
        if (!skill) { action.completado = true; return; }

        const rate = this.calculateProgressRate(skill, action);
        action.progreso = Math.min(1.0, (action.progreso || 0) + rate * dt);

        const cost = skill.energia * action.intensidad * (1 + (1 - skill.eficiencia) * 0.5);
        this.energyExpenditure += cost * dt;
        this.state.fatiga += cost * 0.07 * dt;

        if (action.progreso >= 1.0) {
            action.completado = true;
            action.resultado = this.determineActionResult(skill, action);
            action.fin = Date.now();
            this.learnFromAction(skill, action);
            this.executionHistory.push({
                tipo: action.tipo,
                resultado: action.resultado,
                duracion: (action.fin - action.inicio) / 1000,
                timestamp: action.fin
            });
            if (this.executionHistory.length > 100) this.executionHistory.shift();
            this.emitEvent('action_completed', { tipo: action.tipo, resultado: action.resultado });

            // Batch de persistencia
            this._pendingActions.push({
                tipo: action.tipo,
                duracion: (action.fin - action.inicio) / 1000,
                exito: action.resultado.success,
                calidad: action.resultado.quality,
                probabilidad: action.resultado.probability,
                esReflejo: action.esReflejo,
                timestamp: action.fin,
                sim_time: systemCore.systemTime
            });
            if (this._pendingActions.length > 100) {
                this._pendingActions.splice(0, this._pendingActions.length - 100);
            }
        }
    }

    calculateProgressRate(skill, action) {
        const base = 0.5;
        const skillFactor = (skill.nivel || 0) / 100;
        const stateFactor = this.getMotorStateFactor();
        const intensity = action.intensidad || 1.0;
        const complexity = 1 - (skill.complejidad / 20);
        const fatigue = 1 - (this.state.fatiga || 0) / 200;
        const reflex = action.esReflejo ? 2.0 : 1.0;
        return base * skillFactor * stateFactor * intensity * complexity * fatigue * reflex;
    }

    getMotorStateFactor() {
        const pos = ['coordinacion', 'fuerza', 'velocidad', 'precision', 'agilidad'];
        const neg = ['fatiga', 'tension'];
        const pAvg = pos.reduce((s, f) => s + (this.state[f] || 0), 0) / pos.length;
        const nAvg = neg.reduce((s, f) => s + (this.state[f] || 0), 0) / neg.length;
        return (pAvg / 100) * (1 - nAvg / 200);
    }

    determineActionResult(skill, action) {
        const base = (skill.nivel || 0) / 100;
        const state = this.getMotorStateFactor();
        const diff = 1 - (skill.complejidad / 20);
        const intensity = action.intensidad ? 1 - Math.abs(action.intensidad - 1) * 0.2 : 1.0;
        const precision = (this.state.precision || 50) / 100;
        const practice = 1 + ((skill.practica || 0) / 100) * 0.2;
        const reflex = action.esReflejo ? 1.3 : 1.0;

        let sp = base * state * diff * intensity * precision * practice * reflex;
        sp *= (1 - (this.state.fatiga || 0) / 200);
        sp = Math.max(0, Math.min(1, sp));

        const success = Math.random() < sp;
        const quality = success ? 0.7 + Math.random() * 0.3 : 0.15 + Math.random() * 0.3;
        return { success, quality, probability: sp };
    }

    learnFromAction(skill, action) {
        const rate = this.calculateMotorLearningRate();
        const resultBonus = action.resultado.success ? 1.3 : 0.6;
        const qualityBonus = action.resultado.quality || 0.5;
        const reflexMod = action.esReflejo ? 0.3 : 1.0;
        const gain = rate * resultBonus * (0.5 + qualityBonus * 0.5) * reflexMod;

        skill.nivel = Math.min(100, (skill.nivel || 0) + gain * 2);
        skill.practica = (skill.practica || 0) + 1;
        skill.eficiencia = Math.min(1.0, (skill.eficiencia || 0) + rate * 0.04);
        skill.mastery = Math.min(100, (skill.mastery || 0) + rate * 4);

        if (skill.nivel > 85) skill.complejidadDominada = true;

        this.motorLearning += gain * 0.008;
        this.emitEvent('skill_improved', {
            skill: action.tipo,
            nivel: skill.nivel,
            mastery: skill.mastery
        });
    }

    calculateMotorLearningRate() {
        const base = 0.04 * this.motorProfile.motorLearning;
        const state = this.getMotorStateFactor();
        const fatigue = this.state.fatiga > 50 ? 0.6 : 1.0;
        const attention = (this.state.controlVoluntario || 50) / 100;
        return base * state * fatigue * attention;
    }

    updateFatigueAndRecovery(dt) {
        this.state.fatiga += this.energyExpenditure * 0.08 * dt;
        const rec = ((this.state.recuperacion || 50) / 100) * (this.motorProfile.recovery || 1.0);
        this.state.fatiga = Math.max(0, this.state.fatiga - rec * 4 * dt);
        this.energyExpenditure = Math.max(0, this.energyExpenditure - 1.5 * dt);

        const tensionSources = (this.state.fatiga || 0) * 0.08 + this.energyExpenditure * 0.04;
        this.state.tension = this.clamp(this.state.tension + tensionSources * dt, 0, 100);
        this.state.relajacion = 100 - this.state.tension;
    }

    manageMotorControl(dt) {
        const fatigueEffect = 1 - (this.state.fatiga || 0) / 150;
        const tensionEffect = 1 - (this.state.tension || 0) / 120;
        this.state.controlVoluntario = this.clamp(80 * fatigueEffect * tensionEffect, 0, 100);
        this.state.controlAutomatico = this.clamp(85 * (1 - tensionEffect * 0.3), 0, 100);

        const tensionPenalty = (this.state.tension || 0) * 0.25;
        const fatiguePenalty = (this.state.fatiga || 0) * 0.15;
        this.state.fluidez = this.clamp(this.state.coordinacion - tensionPenalty - fatiguePenalty, 0, 100);
        this.state.fluidezMovimiento = this.clamp((this.state.fluidez + this.state.coordinacion) / 2, 0, 100);
        this.state.propiocepcion = this.clamp(
            (this.state.coordinacion + this.state.equilibrio + this.state.controlAutomatico) / 3, 0, 100
        );
    }

    applyMotorLearning(dt) {
        if (this.motorLearning > 0) {
            this.motorLearning = Math.max(0, this.motorLearning - 0.008 * dt);
        }
        this.state.aprendizajeMotor = this.clamp(50 + this.motorLearning * 50, 0, 100);
    }

    applyMotorHomeostasis() {
        for (const k of Object.keys(this.state)) {
            if (typeof this.state[k] === 'number') {
                this.state[k] = this.clamp(this.state[k], 0, 100);
            }
        }
    }

    _checkCriticalConditions() {
        if (this._criticalCooldown > 0) return;
        const critical = this.state.fatiga > 90 || this.state.tension > 90 || this.state.fuerza < 15;
        if (critical) {
            this.emitEvent('critical', {
                type: 'motor_critical',
                severity: 0.8,
                state: { fatiga: this.state.fatiga, tension: this.state.tension, fuerza: this.state.fuerza }
            });
            this._criticalCooldown = 15;
        }
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
        if (!inserted) this.actionQueue.push(action);
        if (this.actionQueue.length > 20) this.actionQueue = this.actionQueue.slice(0, 20);
    }

    handleSituation(type, intensity) {
        const map = {
            'actividad_alta': { fatiga: 22 * intensity, fuerza: 10 * intensity, velocidad: 15 * intensity },
            'reposo': { fatiga: -18 * intensity, recuperacion: 15 * intensity, relajacion: 25 * intensity },
            'estres_alto': { tension: 30 * intensity, coordinacion: -15 * intensity, precision: -20 * intensity },
            'lesion': { fuerza: -40 * intensity, velocidad: -35 * intensity, agilidad: -50 * intensity, recuperacion: -20 * intensity },
            'entrenamiento': { fuerza: 10 * intensity, resistencia: 15 * intensity, aprendizajeMotor: 20 * intensity, fatiga: 15 * intensity },
            'fatiga': { fatiga: 25 * intensity, velocidad: -15 * intensity, precision: -12 * intensity },
            'recuperacion': { fatiga: -25 * intensity, recuperacion: 20 * intensity, tension: -15 * intensity },
            'descanso': { fatiga: -15 * intensity, relajacion: 20 * intensity }
        };
        const eff = map[type] || {};
        for (const k of Object.keys(eff)) {
            if (this.state[k] !== undefined) {
                this.state[k] = this.clamp(this.state[k] + eff[k], 0, 100);
            }
        }
    }

    emergencyProtocol() {
        this.applyModulation({
            fuerza: 20, velocidad: 25, agilidad: 15, fatiga: -30,
            tension: 40, recuperacion: 20, controlAutomatico: 15, reflejos: 20
        });
        this.actionQueue = this.actionQueue.filter(a => a.prioridad >= 8);
        this.emitEvent('emergency', { type: 'motor_emergency', severity: 0.9 });
    }

    applyModulation(mod) {
        for (const k of Object.keys(mod)) {
            if (this.state[k] !== undefined) {
                this.state[k] = this.clamp(this.state[k] + mod[k], 0, 100);
            }
        }
    }

    getState() { return { ...this.state }; }
    getMotorSkills() {
        return Array.from(this.motorSkills.entries()).map(([name, s]) => ({
            nombre: name, nivel: s.nivel || 0, eficiencia: s.eficiencia || 0,
            practica: s.practica || 0, tipo: s.tipo, mastery: s.mastery || 0,
            complejidad: s.complejidad || 0, complejidadDominada: s.complejidadDominada || false
        }));
    }
    getActionQueue() { return [...this.actionQueue]; }
    getCurrentAction() { return this.currentAction; }
    clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

    reset() {
        this.initializeState();
        this.setupBasicSkills();
        this.setupReflexes();
    }

    exportData() {
        return {
            state: this.getState(),
            motorProfile: this.motorProfile,
            motorSkills: this.getMotorSkills(),
            currentAction: this.getCurrentAction(),
            actionQueue: this.getActionQueue(),
            executionHistory: this.executionHistory.slice(-20)
        };
    }
}

systemCore.registerModule('motor', new MotorSystem());
