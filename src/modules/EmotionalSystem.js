// src/modules/EmotionalSystem.js
// V4.1
//
// CAMBIOS CLAVE V4.1:
//  - getEmotionalBaseline() completa (antes la mitad eran 0)
//  - estabilidad con dinámica real (antes subía monotónicamente a 100)
//  - muestreo de historial a 1 Hz (antes 4/s)
//  - updateSlow para regulación pesada
//  - eventos con severity para SystemCore
//  - handleSituation con clamp inmediato

import { systemCore } from '../core/SystemCore.js';

// Baselines por defecto (multiplicados por el perfil genético)
const EMOTIONAL_BASELINES = Object.freeze({
    // Primarias
    alegria: 20,
    tristeza: 10,
    miedo: 5,
    ira: 5,
    asco: 3,
    sorpresa: 8,
    // Sociales / secundarias
    confianza: 50,
    verguenza: 5,
    orgullo: 15,
    culpa: 5,
    envidia: 3,
    gratitud: 20,
    esperanza: 30,
    aceptacion: 40,
    frustracion: 20,
    nostalgia: 15,
    conexion: 45,
    soledad: 10,
    ansiedad: 20,
    bienestar: 65,
    depresion: 10,
    euforia: 5,
    satisfaccion: 55,
    realizacion: 40,
    humor: 60,
    // Meta
    estabilidad: 80,
    resiliencia: 75,
    sensibilidad: 50
});

// Claves que NO se regulan con baseline (son dimensiones calculadas)
const DIMENSION_KEYS = new Set([
    'valencia', 'activacion', 'dominio', 'intensidad',
    'complejidad', 'polaridad', 'regulacion', 'humor'
]);

export class EmotionalSystem {
    constructor() {
        this.state = {};
        this.config = {};
        this.emotionalMemory = [];
        this.circadianRhythm = null;
        this.emotionalHistory = [];
        this.emotionalPatterns = new Map();
        this.eventListeners = [];
        this.lastUpdateTime = 0;
        this.activePatterns = [];
        this.emotionalProfile = {};

        // Control de muestreo
        this._lastHistoryAt = -Infinity;
        this._historyIntervalSec = 1.0;

        // Contador para eventos de critical
        this._criticalCooldown = 0;
    }

    async initialize(characterConfig) {
        this.config = characterConfig || { genotipo: 'humano' };
        this.setupEmotionalBaselines();
        this.initializeState();
        this.setupCircadianRhythm();
        this.setupEmotionalPatterns();
        systemCore.logSystem('Sistema emocional V4.1 inicializado');
    }

    setupEmotionalBaselines() {
        const g = this.config?.genotipo || 'humano';
        const profiles = {
            humano:     { emotionalStability: 1.0, stressRecovery: 1.0, joyBaseline: 1.0, fearThreshold: 1.0, emotionalIntensity: 1.0, emotionalRegulation: 1.0, empathyBaseline: 1.0, resilienceBaseline: 1.0 },
            resiliente: { emotionalStability: 1.3, stressRecovery: 1.4, joyBaseline: 1.1, fearThreshold: 0.8, emotionalIntensity: 0.9, emotionalRegulation: 1.3, resilienceBaseline: 1.3 },
            vulnerable: { emotionalStability: 0.7, stressRecovery: 0.6, joyBaseline: 0.9, fearThreshold: 1.3, emotionalIntensity: 1.2, emotionalRegulation: 0.6 },
            audaz:      { emotionalStability: 1.1, stressRecovery: 0.9, joyBaseline: 1.2, fearThreshold: 0.7, emotionalIntensity: 1.4, emotionalRegulation: 0.8, angerPropensity: 1.4 },
            intelectual:{ emotionalStability: 1.4, stressRecovery: 1.2, joyBaseline: 1.0, fearThreshold: 0.9, emotionalIntensity: 0.8, emotionalRegulation: 1.5 },
            social:     { emotionalStability: 1.1, stressRecovery: 1.3, joyBaseline: 1.4, fearThreshold: 1.0, emotionalIntensity: 1.3, emotionalRegulation: 1.2, socialEmotionIntensity: 1.5 }
        };
        this.emotionalProfile = profiles[g] || profiles.humano;
    }

    setupCircadianRhythm() {
        this.circadianRhythm = {
            emotionalVariation: {
                morning:   { energy: 0.2,  positivity: 0.3,  stability: 0.1 },
                afternoon: { energy: 0.1,  positivity: 0.1,  stability: -0.1 },
                evening:   { energy: -0.1, positivity: -0.2, stability: 0.1 },
                night:     { energy: -0.3, positivity: -0.4, stability: -0.2 }
            }
        };
    }

    setupEmotionalPatterns() {
        this.emotionalPatterns.set('anxiety_cycle', {
            progression: ['miedo', 'ansiedad', 'miedo', 'fatiga'],
            duration: 300, intensityMultiplier: 1.2
        });
        this.emotionalPatterns.set('joy_spiral', {
            progression: ['alegria', 'euforia', 'gratitud', 'alegria'],
            duration: 200, intensityMultiplier: 1.3
        });
        this.emotionalPatterns.set('anger_cycle', {
            progression: ['ira', 'frustracion', 'ira', 'culpa'],
            duration: 250, intensityMultiplier: 1.4
        });
        this.emotionalPatterns.set('recovery_pattern', {
            progression: ['tristeza', 'aceptacion', 'confianza', 'alegria'],
            duration: 400, intensityMultiplier: 0.8
        });
    }

    initializeState() {
        this.state = {
            alegria: 20, tristeza: 10, miedo: 5, ira: 5, asco: 3, sorpresa: 8,
            confianza: 50, verguenza: 5, orgullo: 15, culpa: 5, envidia: 3,
            gratitud: 20, esperanza: 30, aceptacion: 40, frustracion: 20,
            nostalgia: 15, conexion: 45, soledad: 10,
            ansiedad: 20, bienestar: 65, depresion: 10, euforia: 5,
            satisfaccion: 55, realizacion: 40,
            valencia: 0.6, activacion: 0.5, dominio: 0.7,
            estabilidad: 80, resiliencia: 75, sensibilidad: 50,
            humor: 60, intensidad: 0.5, complejidad: 0.3,
            polaridad: 0.6, regulacion: 0.7
        };
        this.emotionalMemory = [];
        this.emotionalHistory = [];
        this.lastUpdateTime = systemCore.systemTime;
        this.activePatterns = [];
        this._lastHistoryAt = -Infinity;
        this._criticalCooldown = 0;
    }

    onEvent(cb) { this.eventListeners.push(cb); }

    emitEvent(type, data) {
        const payload = { type, data, module: 'emotional', simTime: systemCore.systemTime };
        for (const cb of this.eventListeners) {
            try { cb(payload); }
            catch (err) { console.error('❌ emo listener:', err); }
        }
    }

    update(input, deltaTime) {
        this.lastUpdateTime = systemCore.systemTime;
        if (!input || !input.biochemical) return this.getState();

        this.calculateBiochemicalEmotions(input.biochemical, deltaTime);
        if (input.personality) this.applyPersonalityInfluence(input.personality, deltaTime);
        this.applyCircadianEffects(deltaTime);
        this.processEmotionalPatterns(deltaTime);
        this.updateMoodStates(deltaTime);
        this.calculateAdvancedEmotions(deltaTime);
        this.applyEmotionalHomeostasis();

        // Muestreo de historial a 1 Hz (no cada tick)
        if (this.lastUpdateTime - this._lastHistoryAt >= this._historyIntervalSec) {
            this._lastHistoryAt = this.lastUpdateTime;
            this.recordEmotionalState();
        }

        // Persistencia (debounced por SystemCore)
        systemCore.queuePersistence('emotional', () => {
            if (systemCore.database?.isInitialized) {
                return systemCore.database.saveEmotionalState({
                    ...this.state,
                    sim_time: systemCore.systemTime
                });
            }
        });

        this._checkCriticalConditions();

        return this.getState();
    }

    /**
     * Operaciones pesadas que no necesitan 4 Hz:
     *  - regulación completa (iterar todas las emociones)
     *  - detección de patrones emergentes
     *  - cooldown de eventos críticos
     */
    updateSlow(input, slowDelta) {
        this.processEmotionalRegulation(slowDelta);
        this._criticalCooldown = Math.max(0, this._criticalCooldown - slowDelta);
    }

    calculateBiochemicalEmotions(bio, dt) {
        const intensity = this.emotionalProfile?.emotionalIntensity || 1.0;
        const effects = {
            dopamina: { alegria: 0.8, euforia: 0.6, valencia: 0.5, satisfaccion: 0.4, esperanza: 0.3 },
            serotonina: { alegria: 0.4, tristeza: -0.7, estabilidad: 0.6, humor: 0.5, bienestar: 0.5, confianza: 0.2 },
            noradrenalina: { miedo: 0.3, ira: 0.4, ansiedad: 0.5, activacion: 0.7, frustracion: 0.3 },
            cortisol: { miedo: 0.9, ansiedad: 0.8, ira: 0.3, valencia: -0.6, estabilidad: -0.4, bienestar: -0.5, frustracion: 0.4 },
            oxitocina: { confianza: 0.9, alegria: 0.3, gratitud: 0.7, valencia: 0.4, conexion: 0.6, aceptacion: 0.4 },
            endorfinas: { alegria: 0.6, euforia: 0.4, valencia: 0.3, bienestar: 0.4, esperanza: 0.2 },
            gaba: { ansiedad: -0.5, miedo: -0.3, estabilidad: 0.4, regulacion: 0.3, aceptacion: 0.2 },
            adrenalina: { miedo: 0.6, ira: 0.5, activacion: 0.8, sorpresa: 0.4, ansiedad: 0.3 },
            acetilcolina: { sorpresa: 0.3, nostalgia: 0.2 }
        };

        for (const nt of Object.keys(effects)) {
            const level = (bio[nt] ?? 50) / 100;
            const mult = intensity * dt * 10;
            for (const em of Object.keys(effects[nt])) {
                this.state[em] = (this.state[em] || 0) + effects[nt][em] * level * mult;
            }
        }

        if (bio.oxigeno < 40) {
            const h = (100 - bio.oxigeno) * 0.008 * dt;
            this.state.ansiedad += h;
            this.state.miedo += h * 0.7;
            this.state.bienestar -= h * 0.4;
        }
        if (bio.toxicidad > 50) {
            const t = bio.toxicidad * 0.008 * dt;
            this.state.asco += t;
            this.state.valencia -= t * 0.004;
            this.state.bienestar -= t * 0.3;
        }
        if (bio.energia < 30) {
            const f = (100 - bio.energia) * 0.008 * dt;
            this.state.tristeza += f;
            this.state.activacion -= f * 0.004;
        }
    }

    applyPersonalityInfluence(p, dt) {
        const traits = p.traits || {};
        if (traits.extraversion !== undefined) {
            const f = (traits.extraversion - 0.5) * 2;
            this.state.alegria += f * 4 * dt;
            this.state.activacion += f * 0.08 * dt;
            this.state.conexion += f * 0.1 * dt;
        }
        if (traits.neuroticism !== undefined) {
            const f = (traits.neuroticism - 0.5) * 2;
            this.state.miedo += f * 3 * dt;
            this.state.ansiedad += f * 4 * dt;
            this.state.estabilidad -= f * 5 * dt;
        }
        if (traits.agreeableness !== undefined) {
            const f = (traits.agreeableness - 0.5) * 2;
            this.state.confianza += f * 4 * dt;
            this.state.gratitud += f * 3 * dt;
            this.state.conexion += f * 0.3 * dt;
        }
        if (traits.openness !== undefined) {
            const f = (traits.openness - 0.5) * 2;
            this.state.sorpresa += f * 2 * dt;
            this.state.esperanza += f * 0.2 * dt;
        }
        if (traits.conscientiousness !== undefined) {
            const f = (traits.conscientiousness - 0.5) * 2;
            this.state.estabilidad += f * 3 * dt;
            this.state.regulacion += f * 0.1 * dt;
        }
    }

    applyCircadianEffects(dt) {
        const hour = systemCore.getCircadianHour();
        let pe;
        if (hour < 6) pe = this.circadianRhythm.emotionalVariation.night;
        else if (hour < 12) pe = this.circadianRhythm.emotionalVariation.morning;
        else if (hour < 18) pe = this.circadianRhythm.emotionalVariation.afternoon;
        else pe = this.circadianRhythm.emotionalVariation.evening;

        this.state.activacion += pe.energy * dt;
        this.state.valencia += pe.positivity * dt;
        this.state.estabilidad += (pe.stability || 0) * dt;
    }

    processEmotionalPatterns(dt) {
        this.activePatterns = this.activePatterns.filter(p => {
            p.timeRemaining -= dt;
            if (p.timeRemaining <= 0) return false;
            const prog = 1 - (p.timeRemaining / p.totalDuration);
            const step = Math.floor(prog * p.progression.length);
            const em = p.progression[Math.min(step, p.progression.length - 1)];
            if (em && this.state[em] !== undefined) {
                this.state[em] += p.intensity * dt * 2;
            }
            return true;
        });

        if (this.state.miedo > 60 && this.state.ansiedad > 50 && !this.activePatterns.find(p => p.type === 'anxiety_cycle')) {
            this._startPattern('anxiety_cycle', 1.0);
        }
        if (this.state.alegria > 70 && this.state.sorpresa > 30 && !this.activePatterns.find(p => p.type === 'joy_spiral')) {
            this._startPattern('joy_spiral', 0.8);
        }
        if (this.state.ira > 60 && this.state.activacion > 0.7 && !this.activePatterns.find(p => p.type === 'anger_cycle')) {
            this._startPattern('anger_cycle', 0.9);
        }
        if (this.state.tristeza > 50 && this.state.miedo > 40 && !this.activePatterns.find(p => p.type === 'recovery_pattern')) {
            this._startPattern('recovery_pattern', 0.7);
        }
    }

    _startPattern(type, intensity) {
        const p = this.emotionalPatterns.get(type);
        if (!p) return;
        this.activePatterns.push({
            type,
            progression: p.progression,
            duration: p.duration,
            totalDuration: p.duration,
            intensity: intensity * p.intensityMultiplier,
            timeRemaining: p.duration,
            startSimTime: this.lastUpdateTime
        });
        this.emitEvent('pattern_started', { pattern: type, intensity });
    }

    processEmotionalRegulation(dt) {
        const stab = this.state.estabilidad / 100;
        const reg = this.emotionalProfile?.emotionalRegulation || 1.0;

        // Regulación hacia baseline de cada emoción
        for (const em of Object.keys(this.state)) {
            if (typeof this.state[em] !== 'number') continue;
            if (DIMENSION_KEYS.has(em)) continue;
            const cur = this.state[em];
            const base = this.getEmotionalBaseline(em);
            const diff = base - cur;
            let rate = 0.08 * stab * reg * dt;
            if (em === 'miedo' || em === 'ira' || em === 'tristeza' || em === 'ansiedad') rate *= 1.3;
            this.state[em] += diff * rate;
        }

        // Reducción extra para emociones intensas negativas
        for (const em of ['miedo', 'ira', 'tristeza', 'ansiedad', 'culpa', 'frustracion']) {
            if (this.state[em] > 30) {
                this.state[em] -= 0.04 * reg * dt * (this.state[em] / 100);
            }
        }

        // FIX: estabilidad hacia baseline, no crecimiento monotónico
        const stabBase = 80 * (this.emotionalProfile?.emotionalStability || 1.0);
        const stabDiff = stabBase - this.state.estabilidad;
        this.state.estabilidad += stabDiff * 0.08 * reg * dt;

        // Conexión social
        const social = this.emotionalProfile?.empathyBaseline || 1.0;
        if (this.state.conexion > 50) {
            this.state.alegria += 0.08 * social * dt;
            this.state.confianza += 0.12 * social * dt;
            this.state.ansiedad -= 0.08 * social * dt;
            this.state.miedo -= 0.04 * social * dt;
            this.state.soledad = Math.max(0, this.state.soledad - 0.05 * dt);
        } else {
            this.state.soledad += 0.02 * dt;
        }
    }

    updateMoodStates(dt) {
        const recent = this.getRecentEmotionalStates();
        const pos = (recent.alegria || 0) + (recent.confianza || 0) + (recent.gratitud || 0);
        const neg = (recent.tristeza || 0) + (recent.miedo || 0) + (recent.ira || 0);
        this.state.humor = 50 + (pos - neg) * 0.4;

        this.state.ansiedad += ((this.state.miedo || 0) * 0.7 + (this.state.ansiedad || 0) * 0.3 - this.state.ansiedad) * 0.1 * dt;
        this.state.depresion += ((this.state.tristeza || 0) * 0.6 + (this.state.depresion || 0) * 0.4 - this.state.depresion) * 0.1 * dt;
        this.state.euforia = Math.max(0, (this.state.alegria || 0) - 70) * 2;

        const wellFactors = {
            e: ((this.state.alegria || 0) + (this.state.confianza || 0)) / 2,
            s: this.state.estabilidad || 0,
            c: this.state.conexion || 0,
            r: this.state.realizacion || 0,
            es: this.state.esperanza || 0,
            a: this.state.aceptacion || 0
        };
        this.state.bienestar = Object.values(wellFactors).reduce((a, b) => a + b, 0) / 6;
    }

    calculateAdvancedEmotions(dt) {
        const prim = ['alegria', 'tristeza', 'miedo', 'ira', 'asco', 'sorpresa'];
        this.state.intensidad = prim.reduce((s, e) => s + (this.state[e] || 0), 0) / prim.length / 100;

        const vals = prim.map(e => (this.state[e] || 0) / 100);
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        const variance = vals.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / vals.length;
        this.state.complejidad = Math.min(1, Math.sqrt(variance) * 3);

        const pos = (this.state.alegria || 0) + (this.state.confianza || 0) + (this.state.gratitud || 0);
        const neg = (this.state.tristeza || 0) + (this.state.miedo || 0) + (this.state.ira || 0) + (this.state.asco || 0);
        this.state.polaridad = (pos - neg) / (pos + neg + 1);
        this.state.polaridad = (this.state.polaridad + 1) / 2;

        this.state.satisfaccion = ((this.state.bienestar || 0) + (this.state.humor || 0) + (this.state.realizacion || 0)) / 3;
        this.state.realizacion += ((this.state.orgullo || 0) / 100 - (this.state.realizacion || 0) / 100) * 0.008 * dt;
        this.state.conexion += ((this.state.confianza || 0) / 100 - (this.state.conexion || 0) / 100) * 0.008 * dt;

        if (this.state.alegria > 50 && this.state.confianza > 40) this.state.esperanza += 0.02 * dt;
        else if (this.state.tristeza > 50 || this.state.miedo > 50) this.state.esperanza -= 0.01 * dt;

        if (this.state.estabilidad > 50 && this.state.ansiedad < 30) this.state.aceptacion += 0.02 * dt;
    }

    applyEmotionalHomeostasis() {
        const c = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
        for (const k of Object.keys(this.state)) {
            if (typeof this.state[k] !== 'number') continue;
            if (k === 'valencia') this.state[k] = c(this.state[k], -1, 1);
            else if (['activacion', 'dominio', 'intensidad', 'complejidad', 'polaridad', 'regulacion'].includes(k)) {
                this.state[k] = c(this.state[k], 0, 1);
            } else {
                this.state[k] = c(this.state[k], 0, 100);
            }
        }
    }

    _checkCriticalConditions() {
        if (this._criticalCooldown > 0) return;
        const s = this.state;
        const critical = (s.miedo > 80) || (s.ira > 80) || (s.ansiedad > 85) || (s.depresion > 75);
        if (critical) {
            this.emitEvent('critical', {
                type: 'emotional_critical',
                severity: 0.85,
                emotions: { miedo: s.miedo, ira: s.ira, ansiedad: s.ansiedad, depresion: s.depresion }
            });
            this._criticalCooldown = 10; // segundos
        }
    }

    getRecentEmotionalStates() {
        const recent = this.emotionalMemory.slice(-20);
        if (recent.length === 0) return this.state;
        const avg = {};
        for (const k of Object.keys(this.state)) {
            if (typeof this.state[k] !== 'number') continue;
            const vals = [];
            for (const st of recent) {
                if (typeof st[k] === 'number') vals.push(st[k]);
            }
            if (vals.length > 0) avg[k] = vals.reduce((s, v) => s + v, 0) / vals.length;
        }
        return avg;
    }

    recordEmotionalState() {
        const s = { ...this.state, wallTime: Date.now(), simTime: systemCore.systemTime };
        this.emotionalMemory.push(s);
        this.emotionalHistory.push(s);
        if (this.emotionalMemory.length > 200) this.emotionalMemory.shift();
        if (this.emotionalHistory.length > 1000) this.emotionalHistory.shift();
    }

    /**
     * FIX: baseline para TODAS las emociones. Antes la mitad devolvían 0
     * y se desvanecían a 0. Las dimensiones no se regulan.
     */
    getEmotionalBaseline(emotion) {
        if (DIMENSION_KEYS.has(emotion)) return this.state[emotion] || 0;
        const base = EMOTIONAL_BASELINES[emotion];
        if (base === undefined) return 20; // fallback no-cero

        const p = this.emotionalProfile || {};
        switch (emotion) {
            case 'alegria':     return base * (p.joyBaseline || 1.0);
            case 'miedo':       return base * (p.fearThreshold || 1.0);
            case 'ira':         return base * (p.angerPropensity || 1.0);
            case 'estabilidad': return base * (p.emotionalStability || 1.0);
            case 'resiliencia': return base * (p.resilienceBaseline || 1.0);
            default:            return base;
        }
    }

    getDominantEmotion() {
        const emotions = ['alegria', 'tristeza', 'miedo', 'ira', 'asco', 'sorpresa', 'confianza', 'ansiedad', 'euforia', 'nostalgia'];
        let dom = 'neutral', max = 0;
        for (const e of emotions) {
            if ((this.state[e] || 0) > max) { max = this.state[e]; dom = e; }
        }
        return { emotion: dom, intensity: max };
    }

    handleSituation(type, intensity) {
        const eff = this.getSituationEmotionalEffects(type, intensity);
        for (const em of Object.keys(eff)) {
            if (this.state[em] !== undefined && typeof this.state[em] === 'number') {
                this.state[em] += eff[em];
            }
        }
        // Clamp inmediato tras aplicar
        this.applyEmotionalHomeostasis();
    }

    getSituationEmotionalEffects(type, i) {
        const map = {
            'amenaza': { miedo: 40 * i, ansiedad: 30 * i, activacion: 0.3 * i, bienestar: -10 * i, confianza: -15 * i },
            'recompensa': { alegria: 35 * i, gratitud: 20 * i, valencia: 0.4 * i, satisfaccion: 15 * i, esperanza: 10 * i },
            'alegria': { alegria: 45 * i, euforia: 15 * i, valencia: 0.5 * i, bienestar: 20 * i, esperanza: 15 * i },
            'tristeza': { tristeza: 40 * i, depresion: 20 * i, valencia: -0.4 * i, bienestar: -15 * i, nostalgia: 10 * i },
            'miedo': { miedo: 50 * i, ansiedad: 35 * i, activacion: 0.6 * i, confianza: -20 * i, estabilidad: -10 * i },
            'ira': { ira: 45 * i, activacion: 0.5 * i, valencia: -0.3 * i, estabilidad: -15 * i, frustracion: 20 * i },
            'confianza': { confianza: 40 * i, alegria: 20 * i, estabilidad: 15 * i, conexion: 25 * i, aceptacion: 15 * i },
            'sorpresa': { sorpresa: 35 * i, activacion: 0.4 * i, complejidad: 0.2 * i, valencia: 0.2 * i },
            'interaccion_social': { confianza: 30 * i, alegria: 25 * i, valencia: 0.3 * i, conexion: 35 * i, gratitud: 20 * i },
            'estres_alto': { miedo: 20 * i, ansiedad: 25 * i, ira: 15 * i, estabilidad: -20 * i, bienestar: -15 * i, frustracion: 15 * i },
            'recuperacion': { ansiedad: -20 * i, miedo: -15 * i, estabilidad: 25 * i, bienestar: 20 * i, confianza: 15 * i, esperanza: 15 * i },
            'nostalgia': { nostalgia: 30 * i, tristeza: 10 * i, valencia: 0.1 * i, aceptacion: 10 * i },
            'logro': { orgullo: 35 * i, satisfaccion: 25 * i, realizacion: 20 * i, esperanza: 15 * i },
            'fracaso': { frustracion: 30 * i, tristeza: 20 * i, confianza: -15 * i, orgullo: -20 * i },
            'reposo': { ansiedad: -15 * i, estabilidad: 10 * i, bienestar: 10 * i },
            'inspiracion': { alegria: 20 * i, sorpresa: 25 * i, esperanza: 20 * i, realizacion: 10 * i },
            'descanso': { ansiedad: -20 * i, miedo: -10 * i, estabilidad: 15 * i, bienestar: 15 * i },
            'fatiga': { activacion: -0.3 * i, estabilidad: -10 * i, ansiedad: 10 * i }
        };
        return map[type] || {};
    }

    emergencyProtocol() {
        this.applyModulation({
            miedo: -50, ira: -40, ansiedad: -60, activacion: -0.5, estabilidad: 30,
            resiliencia: 20, bienestar: 20, regulacion: 0.3, frustracion: -20
        });
        this.emitEvent('emergency', { type: 'emotional_emergency', severity: 0.95, state: { ...this.state } });
    }

    applyModulation(mod) {
        for (const k of Object.keys(mod)) {
            if (this.state[k] === undefined) continue;
            const cur = this.state[k] || 0;
            const change = mod[k];
            let mn = 0, mx = 100;
            if (k === 'valencia') { mn = -1; mx = 1; }
            else if (['activacion', 'dominio', 'intensidad', 'complejidad', 'polaridad', 'regulacion'].includes(k)) { mn = 0; mx = 1; }
            this.state[k] = Math.max(mn, Math.min(mx, cur + change));
        }
    }

    getState() { return { ...this.state }; }
    getEmotionalMemory() { return [...this.emotionalMemory]; }
    getEmotionalHistory() { return this.emotionalHistory.slice(-100); }
    getActivePatterns() { return [...this.activePatterns]; }

    reset() {
        this.initializeState();
    }

    exportData() {
        return {
            state: this.getState(),
            emotionalProfile: this.emotionalProfile,
            activePatterns: this.getActivePatterns(),
            analysis: {
                dominant: this.getDominantEmotion(),
                wellbeing: this.state.bienestar,
                stability: this.state.estabilidad
            }
        };
    }
}

systemCore.registerModule('emotional', new EmotionalSystem());
