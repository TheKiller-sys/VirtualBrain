// src/modules/MotivationSystem.js
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
        this.goalAccomplishments = [];
        this.rewardHistory = [];
        this.frustrationHistory = [];
    }

    async initialize(characterConfig) {
        this.config = characterConfig || { genotipo: 'humano' };
        this.initializeDrives();
        this.initializeState();
        this.setupGoalSystem();
        systemCore.logSystem('Sistema de motivación V3.0 inicializado');
    }

    initializeDrives() {
        const genotipo = this.config?.genotipo || 'humano';
        
        this.drives = {
            hambre: 0.3,
            sed: 0.2,
            confort: 0.4,
            seguridad: 0.6,
            curiosidad: 0.5,
            logro: 0.4,
            afiliacion: 0.5,
            poder: 0.3,
            autonomia: 0.6,
            competencia: 0.4,
            estatus: 0.3,
            pertenencia: 0.5,
            reconocimiento: 0.4,
            contribucion: 0.3,
            exploracion: 0.5,
            significado: 0.3
        };
        
        this.adjustDrivesByGenotype();
    }

    adjustDrivesByGenotype() {
        const genotipo = this.config?.genotipo || 'humano';
        
        const adjustments = {
            humano: {},
            resiliente: { confort: 0.1, seguridad: 0.1, logro: 0.05 },
            vulnerable: { seguridad: 0.2, afiliacion: 0.1, confort: 0.15 },
            audaz: { poder: 0.2, logro: 0.15, curiosidad: 0.1, seguridad: -0.1 },
            intelectual: { curiosidad: 0.2, logro: 0.1, autonomia: 0.1, competencia: 0.15 },
            social: { afiliacion: 0.2, pertenencia: 0.15, reconocimiento: 0.1, contribucion: 0.1 }
        };
        
        const adj = adjustments[genotipo] || adjustments.humano;
        Object.keys(adj).forEach(key => {
            if (this.drives[key] !== undefined) {
                this.drives[key] += adj[key];
            }
        });
    }

    initializeState() {
        this.state = {
            intensidadMotivacional: 0.5,
            satisfaccionGeneral: 0.6,
            urgencia: 0.3,
            persistencia: 0.5,
            flexibilidadMotivacional: 0.4,
            impulsoActual: 'curiosidad',
            nivelActivacion: 0.5,
            focoMotivacional: 0.6,
            frustracion: 0.2,
            esperanza: 0.6,
            determinacion: 0.5
        };
        this.currentGoals = [];
        this.motivationHistory = [];
        this.goalAccomplishments = [];
        this.rewardHistory = [];
        this.frustrationHistory = [];
        this.lastUpdateTime = systemCore.systemTime || Date.now();
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

    onEvent(callback) {
        this.eventListeners.push(callback);
    }

    emitEvent(type, data) {
        this.eventListeners.forEach(cb => {
            try {
                cb({ type, data, module: 'motivation' });
            } catch (error) {
                console.error('❌ Error en listener de motivación:', error);
            }
        });
    }

    update(input, deltaTime) {
        this.lastUpdateTime = systemCore.systemTime || Date.now();
        if (!input || !input.biochemical || !input.emotional) return this.getState();
        this.updateDrives(input, deltaTime);
        this.processGoals(input, deltaTime);
        this.calculateGeneralMotivation(deltaTime);
        this.processRewards(input, deltaTime);
        this.applyHomeostasis(deltaTime);
        this.recordHistory();
        return this.getState();
    }

    updateDrives(input, deltaTime) {
        const bioState = input.biochemical || {};
        const emoState = input.emotional || {};
        const cogState = input.cognitive || {};
        const envState = input.environmental || {};
        
        this.drives.hambre = 1 - (bioState.energia || 50) / 100;
        this.drives.sed = 1 - ((bioState.estadoHidratacion || 50) / 100);
        this.drives.confort = 1 - ((bioState.cortisol || 0) / 100) * 0.5;
        this.drives.seguridad = 1 - (envState.peligro || 0) / 100;
        this.drives.curiosidad += ((cogState.curiosidad || 50) / 100) * 0.008 * deltaTime;
        this.drives.curiosidad = this.clamp(this.drives.curiosidad, 0, 1);
        this.drives.logro += ((emoState.orgullo || 0) / 100) * 0.008 * deltaTime;
        this.drives.logro = this.clamp(this.drives.logro, 0, 1);
        this.drives.afiliacion += ((emoState.confianza || 0) / 100) * 0.008 * deltaTime;
        this.drives.afiliacion = this.clamp(this.drives.afiliacion, 0, 1);
        this.drives.autonomia += (1 - (cogState.carga || 0) / 100) * 0.008 * deltaTime;
        this.drives.autonomia = this.clamp(this.drives.autonomia, 0, 1);
        this.drives.competencia += ((cogState.aprendizaje || 50) / 100) * 0.008 * deltaTime;
        this.drives.competencia = this.clamp(this.drives.competencia, 0, 1);
        this.drives.significado += ((emoState.realizacion || 0) / 100) * 0.005 * deltaTime;
        this.drives.significado = this.clamp(this.drives.significado, 0, 1);
        this.drives.exploracion += ((cogState.curiosidad || 50) / 100) * 0.006 * deltaTime;
        this.drives.exploracion = this.clamp(this.drives.exploracion, 0, 1);
        
        Object.keys(this.drives).forEach(key => {
            this.drives[key] *= (1 - 0.0008 * deltaTime);
            this.drives[key] = this.clamp(this.drives[key], 0, 1);
        });
        
        let maxDrive = 0, dominant = 'curiosidad';
        Object.keys(this.drives).forEach(key => {
            if (this.drives[key] > maxDrive) { maxDrive = this.drives[key]; dominant = key; }
        });
        this.state.impulsoActual = dominant;
        this.state.nivelActivacion = maxDrive;
    }

    processGoals(input, deltaTime) {
        this.currentGoals.forEach(goal => { goal.prioridad = this.calculateGoalPriority(goal, input); });
        this.currentGoals.sort((a, b) => b.prioridad - a.prioridad);
        const mainGoal = this.currentGoals[0];
        if (mainGoal && !mainGoal.completada) {
            const progressRate = this.calculateGoalProgress(mainGoal, input);
            mainGoal.progreso += progressRate * deltaTime;
            if (mainGoal.progreso >= 100) {
                mainGoal.completada = true;
                this.goalAccomplishments.push({ goal: mainGoal, timestamp: this.lastUpdateTime });
                this.emitEvent('goal_completed', { goal: mainGoal, time: this.lastUpdateTime });
                this.generateNewGoal(input);
                this.state.satisfaccionGeneral = Math.min(1, this.state.satisfaccionGeneral + 0.1);
                this.rewardHistory.push({ type: 'goal_completion', intensity: 0.8, timestamp: this.lastUpdateTime });
            }
        }
        this.state.focoMotivacional = this.currentGoals[0]?.prioridad / 10 || 0.5;
        
        if (mainGoal && mainGoal.progreso < 20 && this.state.persistencia > 0.6) {
            this.state.frustracion += 0.01 * deltaTime;
            this.frustrationHistory.push({ level: this.state.frustracion, timestamp: this.lastUpdateTime });
        } else {
            this.state.frustracion -= 0.005 * deltaTime;
        }
        this.state.frustracion = this.clamp(this.state.frustracion, 0, 1);
        this.state.determinacion = this.state.persistencia * (1 - this.state.frustracion * 0.5);
        this.state.esperanza = (1 - this.state.frustracion) * (this.state.satisfaccionGeneral * 0.5 + 0.5);
    }

    calculateGoalPriority(goal, input) {
        let priority = goal.prioridad || 5;
        const driveValue = this.drives[goal.impulso] || 0.5;
        priority += driveValue * 5;
        const bio = input.biochemical || {};
        const emo = input.emotional || {};
        const cog = input.cognitive || {};
        if (goal.tipo === 'supervivencia') {
            if (bio.energia < 30) priority += 3;
            if (bio.oxigeno < 30) priority += 4;
            if (bio.toxicidad > 60) priority += 3;
            if (bio.cortisol > 70) priority += 2;
        }
        if (goal.tipo === 'aprendizaje') {
            if (cog.curiosidad > 60) priority += 3;
            if (cog.creatividad > 50) priority += 2;
        }
        if (goal.tipo === 'social') {
            if (emo.conexion < 40) priority += 3;
            if (emo.confianza < 30) priority += 2;
        }
        if (goal.tipo === 'logro') {
            if (this.drives.logro > 0.7) priority += 3;
            if (cog.tomaDecisiones > 60) priority += 2;
        }
        if (goal.tipo === 'significado') {
            if (this.drives.significado > 0.6) priority += 3;
            if (emo.realizacion > 50) priority += 2;
        }
        return this.clamp(priority, 0, 15);
    }

    calculateGoalProgress(goal, input) {
        const driveValue = this.drives[goal.impulso] || 0.5;
        const persistence = this.state.persistencia;
        const urgency = this.state.urgencia;
        const activation = this.state.nivelActivacion;
        const determination = this.state.determinacion;
        const baseRate = 0.4;
        return baseRate * (driveValue * 0.3 + persistence * 0.2 + urgency * 0.15 + activation * 0.2 + determination * 0.15);
    }

    generateNewGoal(input) {
        const possibleGoals = [
            { tipo: 'supervivencia', descripcion: 'Asegurar recursos', impulso: 'seguridad', prioridad: 8 },
            { tipo: 'aprendizaje', descripcion: 'Descubrir algo nuevo', impulso: 'curiosidad', prioridad: 6 },
            { tipo: 'social', descripcion: 'Fortalecer conexiones', impulso: 'afiliacion', prioridad: 5 },
            { tipo: 'logro', descripcion: 'Alcanzar una meta', impulso: 'logro', prioridad: 6 },
            { tipo: 'autonomia', descripcion: 'Ganar independencia', impulso: 'autonomia', prioridad: 5 },
            { tipo: 'significado', descripcion: 'Encontrar propósito', impulso: 'significado', prioridad: 4 },
            { tipo: 'exploracion', descripcion: 'Explorar el entorno', impulso: 'exploracion', prioridad: 5 }
        ];
        const maxDrive = Math.max(...Object.values(this.drives));
        const dominantDrives = Object.keys(this.drives).filter(key => this.drives[key] > maxDrive * 0.7);
        const matchingGoals = possibleGoals.filter(g =>
            dominantDrives.includes(g.impulso) &&
            !this.currentGoals.some(existing => existing.tipo === g.tipo && !existing.completada)
        );
        const newGoal = matchingGoals.length > 0 ?
            matchingGoals[Math.floor(Math.random() * matchingGoals.length)] :
            possibleGoals[Math.floor(Math.random() * possibleGoals.length)];
        this.currentGoals.push({
            id: `goal_${Date.now()}`,
            ...newGoal,
            progreso: 0,
            completada: false,
            creada: this.lastUpdateTime
        });
        this.emitEvent('goal_generated', { goal: newGoal, time: this.lastUpdateTime });
    }

    processRewards(input, deltaTime) {
        const emoState = input.emotional || {};
        const bioState = input.biochemical || {};
        if (emoState.alegria > 60 || emoState.confianza > 60) {
            this.rewardHistory.push({ type: 'positive_emotion', intensity: Math.max(emoState.alegria, emoState.confianza) / 100, timestamp: this.lastUpdateTime });
            this.state.satisfaccionGeneral += 0.002 * deltaTime;
        }
        if (bioState.dopamina > 60) {
            this.rewardHistory.push({ type: 'dopamine', intensity: bioState.dopamina / 100, timestamp: this.lastUpdateTime });
            this.state.satisfaccionGeneral += 0.003 * deltaTime;
        }
        if (bioState.oxitocina > 60) {
            this.rewardHistory.push({ type: 'oxytocin', intensity: bioState.oxitocina / 100, timestamp: this.lastUpdateTime });
            this.state.satisfaccionGeneral += 0.002 * deltaTime;
        }
        this.state.satisfaccionGeneral = this.clamp(this.state.satisfaccionGeneral, 0, 1);
        if (this.rewardHistory.length > 100) this.rewardHistory.shift();
    }

    calculateGeneralMotivation(deltaTime) {
        const averageDrive = Object.values(this.drives).reduce((a, b) => a + b, 0) / Object.keys(this.drives).length;
        const goalProgress = this.currentGoals.reduce((sum, g) => sum + g.progreso, 0) / this.currentGoals.length / 100;
        const satisfaction = this.state.satisfaccionGeneral;
        this.state.intensidadMotivacional = (averageDrive * 0.35 + goalProgress * 0.3 + satisfaction * 0.35);
        this.state.intensidadMotivacional = this.clamp(this.state.intensidadMotivacional, 0, 1);
        const urgentDrives = ['seguridad', 'hambre', 'sed'];
        const maxUrgency = Math.max(...urgentDrives.map(d => this.drives[d] || 0));
        this.state.urgencia = maxUrgency * 0.5 + (1 - this.state.satisfaccionGeneral) * 0.5;
        this.state.urgencia = this.clamp(this.state.urgencia, 0, 1);
        this.state.persistencia += (this.state.intensidadMotivacional - this.state.persistencia) * 0.008 * deltaTime;
        this.state.persistencia = this.clamp(this.state.persistencia, 0, 1);
        const driveVariety = new Set(Object.values(this.drives).map(v => Math.round(v * 10))).size / 10;
        this.state.flexibilidadMotivacional = driveVariety * 0.5 + (1 - this.state.persistencia) * 0.5;
        this.state.flexibilidadMotivacional = this.clamp(this.state.flexibilidadMotivacional, 0, 1);
    }

    applyHomeostasis(deltaTime) {
        Object.keys(this.state).forEach(key => {
            if (typeof this.state[key] === 'number') this.state[key] = this.clamp(this.state[key], 0, 1);
        });
        Object.keys(this.drives).forEach(key => { this.drives[key] = this.clamp(this.drives[key], 0, 1); });
        this.state.satisfaccionGeneral += (0.5 - this.state.satisfaccionGeneral) * 0.0008 * deltaTime;
        this.state.satisfaccionGeneral = this.clamp(this.state.satisfaccionGeneral, 0, 1);
        this.state.frustracion *= (1 - 0.005 * deltaTime);
        this.state.frustracion = this.clamp(this.state.frustracion, 0, 1);
    }

    recordHistory() {
        this.motivationHistory.push({
            timestamp: this.lastUpdateTime,
            drives: { ...this.drives },
            state: { ...this.state },
            currentGoal: this.currentGoals[0] || null,
            satisfaction: this.state.satisfaccionGeneral,
            frustration: this.state.frustracion
        });
        if (this.motivationHistory.length > 500) this.motivationHistory.shift();
    }

    getState() {
        return {
            drives: { ...this.drives },
            state: { ...this.state },
            goals: [...this.currentGoals],
            goalAccomplishments: this.goalAccomplishments.slice(-20),
            motivationHistory: this.motivationHistory.slice(-50)
        };
    }

    getDominantDrive() {
        let max = 0, dominant = 'curiosidad';
        Object.keys(this.drives).forEach(key => {
            if (this.drives[key] > max) { max = this.drives[key]; dominant = key; }
        });
        return { drive: dominant, intensity: max };
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    reset() {
        this.initializeDrives();
        this.initializeState();
        this.setupGoalSystem();
        this.motivationHistory = [];
        this.goalAccomplishments = [];
        this.rewardHistory = [];
        this.frustrationHistory = [];
    }

    exportData() {
        return {
            drives: { ...this.drives },
            state: { ...this.state },
            goals: [...this.currentGoals],
            goalAccomplishments: this.goalAccomplishments.slice(-20),
            motivationHistory: this.motivationHistory.slice(-50),
            rewardHistory: this.rewardHistory.slice(-50),
            dominantDrive: this.getDominantDrive()
        };
    }
}

systemCore.registerModule('motivation', new MotivationSystem());
