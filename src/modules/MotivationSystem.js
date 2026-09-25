// src/modules/MotivationSystem.js
// V4.1
//
// CAMBIOS CLAVE V4.1:
//  - recordHistory con Date.now() + simTime (antes mezclaba unidades)
//  - sort de goals solo cuando la prioridad cambia
//  - updateSlow para evaluar metas
//  - eventos críticos con severity

import { systemCore } from '../core/SystemCore.js';

export class MotivationSystem {
    constructor() {
        this.state = {};
        this.config = {};
        this.drives = {};
        this.currentGoals = [];
        this.motivationHistory = [];
        this.eventListeners = [];
        this.lastUpdateTime = 0;

        // Control
        this._lastHistoryAt = -Infinity;
        this._historyIntervalSec = 5;
        this._lastGoalEvalAt = -Infinity;
        this._criticalCooldown = 0;
    }

    async initialize(characterConfig) {
        this.config = characterConfig || { genotipo: 'humano' };
        this.initializeDrives();
        this.initializeState();
        this.setupGoalSystem();
        systemCore.logSystem('Sistema de motivación V4.1 inicializado');
    }

    initializeDrives() {
        this.drives = {
            hambre: 0.3, sed: 0.2, confort: 0.4, seguridad: 0.6, curiosidad: 0.5,
            logro: 0.4, afiliacion: 0.5, poder: 0.3, autonomia: 0.6, competencia: 0.4,
            estatus: 0.3, pertenencia: 0.5, reconocimiento: 0.4, contribucion: 0.3,
            exploracion: 0.5, significado: 0.3
        };
        const g = this.config?.genotipo || 'humano';
        const adj = {
            resiliente: { confort: 0.1, seguridad: 0.1, logro: 0.05 },
            vulnerable: { seguridad: 0.2, afiliacion: 0.1, confort: 0.15 },
            audaz: { poder: 0.2, logro: 0.15, curiosidad: 0.1, seguridad: -0.1 },
            intelectual: { curiosidad: 0.2, logro: 0.1, autonomia: 0.1, competencia: 0.15 },
            social: { afiliacion: 0.2, pertenencia: 0.15, reconocimiento: 0.1, contribucion: 0.1 }
        };
        const a = adj[g] || {};
        for (const k of Object.keys(a)) {
            if (this.drives[k] !== undefined) {
                this.drives[k] = Math.max(0, Math.min(1, this.drives[k] + a[k]));
            }
        }
    }

    initializeState() {
        this.state = {
            intensidadMotivacional: 0.5, satisfaccionGeneral: 0.6, urgencia: 0.3,
            persistencia: 0.5, flexibilidadMotivacional: 0.4, impulsoActual: 'curiosidad',
            nivelActivacion: 0.5, focoMotivacional: 0.6, frustracion: 0.2,
            esperanza: 0.6, determinacion: 0.5
        };
        this.motivationHistory = [];
        this.lastUpdateTime = systemCore.systemTime;
        this._lastHistoryAt = -Infinity;
        this._lastGoalEvalAt = -Infinity;
        this._criticalCooldown = 0;
    }

    setupGoalSystem() {
        this.currentGoals = [
            { id: 'goal_1', tipo: 'supervivencia', descripcion: 'Mantener homeostasis', prioridad: 10, progreso: 0, impulso: 'seguridad', completada: false },
            { id: 'goal_2', tipo: 'aprendizaje', descripcion: 'Explorar y aprender', prioridad: 6, progreso: 0, impulso: 'curiosidad', completada: false },
            { id: 'goal_3', tipo: 'social', descripcion: 'Conectar con otros', prioridad: 5, progreso: 0, impulso: 'afiliacion', completada: false },
            { id: 'goal_4', tipo: 'logro', descripcion: 'Alcanzar metas personales', prioridad: 4, progreso: 0, impulso: 'logro', completada: false },
            { id: 'goal_5', tipo: 'significado', descripcion: 'Encontrar propósito', prioridad: 3, progreso: 0, impulso: 'significado', completada: false }
        ];
    }

    onEvent(cb) { this.eventListeners.push(cb); }

    emitEvent(type, data) {
        const payload = { type, data, module: 'motivation', simTime: systemCore.systemTime };
        for (const cb of this.eventListeners) {
            try { cb(payload); }
            catch (err) { console.error('❌ mot listener:', err); }
        }
    }

    update(input, deltaTime) {
        this.lastUpdateTime = systemCore.systemTime;
        if (!input || !input.biochemical || !input.emotional) return this.getState();

        this.updateDrives(input, deltaTime);
        this.processRewards(input, deltaTime);
        this.calculateGeneralMotivation(deltaTime);
        this._applyHomeostasis();

        // Persistencia
        systemCore.queuePersistence('motivation', () => {
            if (systemCore.database?.isInitialized) {
                return systemCore.database.saveMotivationState({
                    ...this.state,
                    sim_time: systemCore.systemTime
                });
            }
        });

        return this.getState();
    }

    updateSlow(input, slowDelta) {
        // Evaluar metas cada ~1s
        if (this.lastUpdateTime - this._lastGoalEvalAt >= 1) {
            this._lastGoalEvalAt = this.lastUpdateTime;
            this.processGoals(input, slowDelta);
        }

        // Historial cada 5s
        if (this.lastUpdateTime - this._lastHistoryAt >= this._historyIntervalSec) {
            this._lastHistoryAt = this.lastUpdateTime;
            this.recordHistory();
        }

        this._checkCriticalConditions();
        this._criticalCooldown = Math.max(0, this._criticalCooldown - slowDelta);
    }

    updateDrives(input, dt) {
        const bio = input.biochemical || {};
        const emo = input.emotional || {};
        const cog = input.cognitive || {};
        const env = input.environmental || input.environment || {};

        // Drives reactivos (fijos por estado)
        this.drives.hambre = 1 - (bio.energia ?? 50) / 100;
        this.drives.sed = 1 - ((bio.estadoHidratacion ?? 50) / 100);
        this.drives.confort = 1 - ((bio.cortisol ?? 0) / 100) * 0.5;
        this.drives.seguridad = 1 - (env.peligro ?? 0) / 100;

        // Drives evolutivos (acumulativos)
        this.drives.curiosidad = this.clamp(
            this.drives.curiosidad + ((cog.curiosidad ?? 50) / 100) * 0.008 * dt, 0, 1
        );
        this.drives.logro = this.clamp(
            this.drives.logro + ((emo.orgullo ?? 0) / 100) * 0.008 * dt, 0, 1
        );
        this.drives.afiliacion = this.clamp(
            this.drives.afiliacion + ((emo.confianza ?? 0) / 100) * 0.008 * dt, 0, 1
        );
        this.drives.autonomia = this.clamp(
            this.drives.autonomia + (1 - (cog.carga ?? 0) / 100) * 0.008 * dt, 0, 1
        );
        this.drives.significado = this.clamp(
            this.drives.significado + ((emo.realizacion ?? 0) / 100) * 0.005 * dt, 0, 1
        );

        // Decay natural
        for (const k of Object.keys(this.drives)) {
            this.drives[k] *= (1 - 0.0008 * dt);
            this.drives[k] = this.clamp(this.drives[k], 0, 1);
        }

        // Dominante
        let max = 0, dom = 'curiosidad';
        for (const k of Object.keys(this.drives)) {
            if (this.drives[k] > max) { max = this.drives[k]; dom = k; }
        }
        this.state.impulsoActual = dom;
        this.state.nivelActivacion = max;
    }

    processGoals(input, dt) {
        // Recalcular prioridades y ordenar solo si cambia significativamente
        let changed = false;
        for (const g of this.currentGoals) {
            const newP = this.calculateGoalPriority(g, input);
            if (Math.abs(newP - g.prioridad) > 0.5) {
                g.prioridad = newP;
                changed = true;
            }
        }
        if (changed) {
            this.currentGoals.sort((a, b) => b.prioridad - a.prioridad);
        }

        const main = this.currentGoals[0];
        if (main && !main.completada) {
            main.progreso += this.calculateGoalProgress(main, input) * dt;
            if (main.progreso >= 100) {
                main.completada = true;
                this.emitEvent('goal_completed', { goal: main, simTime: this.lastUpdateTime });
                this.generateNewGoal(input);
                this.state.satisfaccionGeneral = Math.min(1, this.state.satisfaccionGeneral + 0.1);
            }
        }

        this.state.focoMotivacional = (this.currentGoals[0]?.prioridad ?? 5) / 10;

        if (main && main.progreso < 20 && this.state.persistencia > 0.6) {
            this.state.frustracion += 0.01 * dt;
        } else {
            this.state.frustracion -= 0.005 * dt;
        }
        this.state.frustracion = this.clamp(this.state.frustracion, 0, 1);
        this.state.determinacion = this.state.persistencia * (1 - this.state.frustracion * 0.5);
        this.state.esperanza = (1 - this.state.frustracion) * (this.state.satisfaccionGeneral * 0.5 + 0.5);
    }

    calculateGoalPriority(goal, input) {
        let p = goal.prioridad ?? 5;
        const drive = this.drives[goal.impulso] ?? 0.5;
        p += drive * 5;
        const bio = input.biochemical || {};
        if (goal.tipo === 'supervivencia') {
            if ((bio.energia ?? 100) < 30) p += 3;
            if ((bio.oxigeno ?? 100) < 30) p += 4;
            if ((bio.cortisol ?? 0) > 70) p += 2;
        }
        return this.clamp(p, 0, 15);
    }

    calculateGoalProgress(goal, input) {
        const d = this.drives[goal.impulso] ?? 0.5;
        return 0.4 * (
            d * 0.3 +
            this.state.persistencia * 0.2 +
            this.state.urgencia * 0.15 +
            this.state.nivelActivacion * 0.2 +
            this.state.determinacion * 0.15
        );
    }

    generateNewGoal(input) {
        const possible = [
            { tipo: 'supervivencia', descripcion: 'Asegurar recursos', impulso: 'seguridad', prioridad: 8 },
            { tipo: 'aprendizaje', descripcion: 'Descubrir algo nuevo', impulso: 'curiosidad', prioridad: 6 },
            { tipo: 'social', descripcion: 'Fortalecer conexiones', impulso: 'afiliacion', prioridad: 5 },
            { tipo: 'logro', descripcion: 'Alcanzar una meta', impulso: 'logro', prioridad: 6 },
            { tipo: 'autonomia', descripcion: 'Ganar independencia', impulso: 'autonomia', prioridad: 5 },
            { tipo: 'significado', descripcion: 'Encontrar propósito', impulso: 'significado', prioridad: 4 }
        ];
        const max = Math.max(...Object.values(this.drives));
        const dominant = Object.keys(this.drives).filter(k => this.drives[k] > max * 0.7);
        const matching = possible.filter(g =>
            dominant.includes(g.impulso) && !this.currentGoals.some(e => e.tipo === g.tipo && !e.completada)
        );
        const chosen = matching.length > 0
            ? matching[Math.floor(Math.random() * matching.length)]
            : possible[Math.floor(Math.random() * possible.length)];

        this.currentGoals.push({
            id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            ...chosen,
            progreso: 0,
            completada: false,
            creada: this.lastUpdateTime
        });

        // Cap defensivo
        if (this.currentGoals.length > 15) {
            this.currentGoals = this.currentGoals
                .filter(g => !g.completada)
                .slice(0, 10);
        }
    }

    processRewards(input, dt) {
        const emo = input.emotional || {};
        const bio = input.biochemical || {};
        if ((emo.alegria ?? 0) > 60 || (emo.confianza ?? 0) > 60) {
            this.state.satisfaccionGeneral += 0.002 * dt;
        }
        if ((bio.dopamina ?? 0) > 60) this.state.satisfaccionGeneral += 0.003 * dt;
        if ((bio.oxitocina ?? 0) > 60) this.state.satisfaccionGeneral += 0.002 * dt;
        this.state.satisfaccionGeneral = this.clamp(this.state.satisfaccionGeneral, 0, 1);
    }

    calculateGeneralMotivation(dt) {
        const drives = Object.values(this.drives);
        const avg = drives.length > 0 ? drives.reduce((a, b) => a + b, 0) / drives.length : 0.5;
        const prog = this.currentGoals.length > 0
            ? this.currentGoals.reduce((s, g) => s + g.progreso, 0) / this.currentGoals.length / 100
            : 0;
        const sat = this.state.satisfaccionGeneral;

        this.state.intensidadMotivacional = this.clamp(avg * 0.35 + prog * 0.3 + sat * 0.35, 0, 1);

        const urg = Math.max(this.drives.seguridad, this.drives.hambre, this.drives.sed);
        this.state.urgencia = this.clamp(urg * 0.5 + (1 - sat) * 0.5, 0, 1);

        this.state.persistencia += (this.state.intensidadMotivacional - this.state.persistencia) * 0.008 * dt;
        this.state.persistencia = this.clamp(this.state.persistencia, 0, 1);
    }

    _applyHomeostasis() {
        for (const k of Object.keys(this.state)) {
            if (typeof this.state[k] === 'number') {
                this.state[k] = this.clamp(this.state[k], 0, 1);
            }
        }
        for (const k of Object.keys(this.drives)) {
            this.drives[k] = this.clamp(this.drives[k], 0, 1);
        }
        this.state.satisfaccionGeneral += (0.5 - this.state.satisfaccionGeneral) * 0.0008;
        this.state.frustracion *= (1 - 0.005);
    }

    _checkCriticalConditions() {
        if (this._criticalCooldown > 0) return;
        const critical = this.state.frustracion > 0.9
                      || (this.state.satisfaccionGeneral < 0.05 && this.state.urgencia > 0.9);
        if (critical) {
            this.emitEvent('critical', {
                type: 'motivation_critical',
                severity: 0.8,
                frustracion: this.state.frustracion,
                satisfaccion: this.state.satisfaccionGeneral
            });
            this._criticalCooldown = 15;
        }
    }

    recordHistory() {
        // FIX: timestamp con Date.now(), simTime separado
        this.motivationHistory.push({
            timestamp: Date.now(),
            simTime: this.lastUpdateTime,
            drives: { ...this.drives },
            state: { ...this.state }
        });
        if (this.motivationHistory.length > 500) this.motivationHistory.shift();
    }

    handleSituation(type, intensity) {
        const effects = {
            'recompensa': { satisfaccionGeneral: 0.15 * intensity, frustracion: -0.1 * intensity },
            'fracaso': { frustracion: 0.2 * intensity, satisfaccionGeneral: -0.1 * intensity },
            'logro': { satisfaccionGeneral: 0.2 * intensity, frustracion: -0.15 * intensity },
            'estres_alto': { frustracion: 0.1 * intensity },
            'inspiracion': { intensidadMotivacional: 0.15 * intensity, esperanza: 0.1 * intensity },
            'fatiga': { persistencia: -0.1 * intensity, nivelActivacion: -0.15 * intensity },
            'recuperacion': { persistencia: 0.1 * intensity, esperanza: 0.1 * intensity }
        };
        const eff = effects[type] || {};
        for (const k of Object.keys(eff)) {
            if (this.state[k] !== undefined) {
                this.state[k] = this.clamp(this.state[k] + eff[k], 0, 1);
            }
        }
    }

    getState() {
        return {
            drives: { ...this.drives },
            state: { ...this.state },
            goals: this.currentGoals.map(g => ({ ...g }))
        };
    }

    getDominantDrive() {
        let max = 0, dom = 'curiosidad';
        for (const k of Object.keys(this.drives)) {
            if (this.drives[k] > max) { max = this.drives[k]; dom = k; }
        }
        return { drive: dom, intensity: max };
    }

    clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

    reset() {
        this.initializeDrives();
        this.initializeState();
        this.setupGoalSystem();
    }

    exportData() {
        return {
            drives: { ...this.drives },
            state: { ...this.state },
            goals: this.currentGoals.map(g => ({ ...g })),
            dominantDrive: this.getDominantDrive()
        };
    }
}

systemCore.registerModule('motivation', new MotivationSystem());
