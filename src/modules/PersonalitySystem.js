// src/modules/PersonalitySystem.js
// V4.1
//
// CAMBIOS CLAVE V4.1:
//  - evolución poblada manualmente (el trigger AFTER UPDATE no dispara con INSERT)
//  - updateSlow para evaluación de evolución
//  - savePersonality con sim_time
//  - throttle de INSERTs a personalidad_rasgos

import { systemCore } from '../core/SystemCore.js';

export class PersonalitySystem {
    constructor() {
        this.state = {};
        this.traits = {};
        this.subTraits = {};
        this.personalityMatrix = {};
        this.eventListeners = [];
        this.personalityDevelopment = 0;
        this.lastUpdateTime = 0;
        this.config = {};

        // Control de guardado
        this._lastSavedTraits = null;
        this._lastSavedAt = 0;
        this._saveIntervalSec = 60;
        this._evolThreshold = 0.02;

        this._criticalCooldown = 0;
    }

    async initialize(characterConfig) {
        this.config = characterConfig || { genotipo: 'resiliente' };
        this.initializeTraits();
        this.initializeState();
        this.setupPersonalityMatrix();
        this._lastSavedTraits = { ...this.traits };
        this._lastSavedAt = 0;
        systemCore.logSystem('Sistema de personalidad V4.1 inicializado');
    }

    initializeTraits() {
        const genotipo = this.config?.genotipo || 'resiliente';
        const baseTraits = {
            resiliente: { openness: 0.5, conscientiousness: 0.7, extraversion: 0.5, agreeableness: 0.7, neuroticism: 0.3 },
            vulnerable: { openness: 0.4, conscientiousness: 0.5, extraversion: 0.3, agreeableness: 0.6, neuroticism: 0.8 },
            audaz:      { openness: 0.7, conscientiousness: 0.5, extraversion: 0.8, agreeableness: 0.4, neuroticism: 0.4 },
            intelectual:{ openness: 0.9, conscientiousness: 0.8, extraversion: 0.3, agreeableness: 0.5, neuroticism: 0.3 },
            social:     { openness: 0.6, conscientiousness: 0.6, extraversion: 0.9, agreeableness: 0.8, neuroticism: 0.4 },
            humano:     { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 }
        };
        const base = baseTraits[genotipo] || baseTraits.resiliente;

        this.traits = {
            openness: base.openness,
            conscientiousness: base.conscientiousness,
            extraversion: base.extraversion,
            agreeableness: base.agreeableness,
            neuroticism: base.neuroticism
        };
        this.updateSubTraits();
    }

    initializeState() {
        this.state = {
            estabilidad: 0.7, flexibilidad: 0.5, adaptabilidad: 0.6,
            integridad: 0.8, madurez: 0.4, sabiduria: 0.3,
            autenticidad: 0.6, bienestar: 0.6, satisfaccion: 0.5,
            proposito: 0.4, autoconocimiento: 0.5
        };
        this.personalityDevelopment = 0;
        this.lastUpdateTime = systemCore.systemTime;
        this._criticalCooldown = 0;
    }

    setupPersonalityMatrix() {
        this.updatePersonalityMatrix();
    }

    updateSubTraits() {
        const t = this.traits;
        this.subTraits = {
            curiosity: 0.5 + (t.openness - 0.5) * 0.6,
            creativity: 0.5 + (t.openness - 0.5) * 0.5,
            imagination: 0.5 + (t.openness - 0.5) * 0.4,
            discipline: 0.5 + (t.conscientiousness - 0.5) * 0.6,
            organization: 0.5 + (t.conscientiousness - 0.5) * 0.5,
            responsibility: 0.5 + (t.conscientiousness - 0.5) * 0.4,
            sociability: 0.5 + (t.extraversion - 0.5) * 0.6,
            assertiveness: 0.5 + (t.extraversion - 0.5) * 0.5,
            energy: 0.5 + (t.extraversion - 0.5) * 0.4,
            empathy: 0.5 + (t.agreeableness - 0.5) * 0.6,
            cooperation: 0.5 + (t.agreeableness - 0.5) * 0.5,
            trust: 0.5 + (t.agreeableness - 0.5) * 0.4,
            anxiety: 0.5 + (t.neuroticism - 0.5) * 0.6,
            vulnerability: 0.5 + (t.neuroticism - 0.5) * 0.5,
            moodiness: 0.5 + (t.neuroticism - 0.5) * 0.4
        };
        for (const k of Object.keys(this.subTraits)) {
            this.subTraits[k] = this.clamp(this.subTraits[k], 0, 1);
        }
    }

    updatePersonalityMatrix() {
        const t = this.traits;
        this.personalityMatrix = {
            emotional: {
                stability: 1 - t.neuroticism,
                intensity: t.extraversion * 0.5 + 0.5,
                regulation: 1 - t.neuroticism * 0.5
            },
            cognitive: {
                attention: 1 - t.neuroticism * 0.3,
                creativity: t.openness * 0.7,
                decision_making: 1 - t.neuroticism * 0.2
            },
            memory: {
                retention: t.conscientiousness * 0.5,
                retrieval: 1 - t.neuroticism * 0.2,
                learning: t.openness * 0.6
            },
            motor: {
                coordination: 1 - t.neuroticism * 0.2,
                precision: t.conscientiousness * 0.4,
                speed: t.extraversion * 0.3
            },
            social: {
                connection: t.agreeableness * 0.7,
                influence: t.extraversion * 0.5,
                trust: t.agreeableness * 0.6
            }
        };
    }

    onEvent(cb) { this.eventListeners.push(cb); }

    emitEvent(type, data) {
        const payload = { type, data, module: 'personality', simTime: systemCore.systemTime };
        for (const cb of this.eventListeners) {
            try { cb(payload); }
            catch (err) { console.error('❌ pers listener:', err); }
        }
    }

    update(input, deltaTime) {
        this.lastUpdateTime = systemCore.systemTime;
        if (!input || !input.biochemical || !input.emotional) return this.getState();

        this.applyEmotionalInfluences(input.emotional, deltaTime);
        this.applyBiochemicalInfluences(input.biochemical, deltaTime);
        this.developPersonality(input, deltaTime);
        this.applyHomeostasis();

        return this.getState();
    }

    updateSlow(input, slowDelta) {
        this.updatePersonalityMatrix();
        this._maybeSaveAndLogEvolution();
        this._criticalCooldown = Math.max(0, this._criticalCooldown - slowDelta);
    }

    applyEmotionalInfluences(emotionalState, deltaTime) {
        const intensity = emotionalState.intensidad || 0;
        if (intensity > 0.5) {
            const dominant = this.getDominantEmotion(emotionalState);
            switch (dominant) {
                case 'alegria':
                    this.traits.extraversion = this.clamp(this.traits.extraversion + 0.05 * deltaTime * intensity, 0.1, 0.9);
                    this.traits.agreeableness = this.clamp(this.traits.agreeableness + 0.03 * deltaTime * intensity, 0.1, 0.9);
                    break;
                case 'tristeza':
                    this.traits.neuroticism = this.clamp(this.traits.neuroticism + 0.05 * deltaTime * intensity, 0.1, 0.9);
                    break;
                case 'miedo':
                    this.traits.neuroticism = this.clamp(this.traits.neuroticism + 0.08 * deltaTime * intensity, 0.1, 0.9);
                    this.traits.openness = this.clamp(this.traits.openness - 0.03 * deltaTime * intensity, 0.1, 0.9);
                    break;
                case 'ira':
                    this.traits.agreeableness = this.clamp(this.traits.agreeableness - 0.05 * deltaTime * intensity, 0.1, 0.9);
                    break;
                case 'confianza':
                    this.traits.agreeableness = this.clamp(this.traits.agreeableness + 0.04 * deltaTime * intensity, 0.1, 0.9);
                    this.traits.neuroticism = this.clamp(this.traits.neuroticism - 0.03 * deltaTime * intensity, 0.1, 0.9);
                    break;
            }
        }
        this.updateSubTraits();
    }

    getDominantEmotion(e) {
        const emotions = ['alegria', 'tristeza', 'miedo', 'ira', 'confianza', 'sorpresa', 'asco'];
        let max = 0, dom = 'neutral';
        for (const em of emotions) {
            if ((e[em] || 0) > max) { max = e[em]; dom = em; }
        }
        return dom;
    }

    applyBiochemicalInfluences(bio, deltaTime) {
        const dopamina = (bio.dopamina ?? 50) / 100;
        const serotonina = (bio.serotonina ?? 50) / 100;
        const cortisol = (bio.cortisol ?? 20) / 100;

        this.traits.extraversion = this.clamp(this.traits.extraversion + (dopamina - 0.5) * 0.02 * deltaTime, 0.1, 0.9);
        this.traits.openness = this.clamp(this.traits.openness + (dopamina - 0.5) * 0.015 * deltaTime, 0.1, 0.9);
        this.traits.agreeableness = this.clamp(this.traits.agreeableness + (serotonina - 0.5) * 0.02 * deltaTime, 0.1, 0.9);
        this.traits.neuroticism = this.clamp(this.traits.neuroticism + (cortisol - 0.2) * 0.03 * deltaTime, 0.1, 0.9);
        this.updateSubTraits();
    }

    developPersonality(input, deltaTime) {
        const learning = input.cognitive?.aprendizaje ?? 50;
        const emotionalDepth = input.emotional?.intensidad ?? 0;

        this.personalityDevelopment = this.clamp(
            this.personalityDevelopment + (learning / 100) * 0.001 * deltaTime + emotionalDepth * 0.001 * deltaTime,
            0, 1
        );

        this.state.madurez = 0.3 + this.personalityDevelopment * 0.5;
        this.state.sabiduria = 0.2 + this.personalityDevelopment * 0.4;
        this.state.autenticidad = 0.4 + this.personalityDevelopment * 0.3;
        this.state.estabilidad = 0.5 + this.personalityDevelopment * 0.4;
        this.state.adaptabilidad = 0.4 + (1 - this.traits.neuroticism) * 0.4;
        this.state.integridad = 0.6 + this.traits.conscientiousness * 0.3;
    }

    applyHomeostasis() {
        for (const k of Object.keys(this.traits)) {
            this.traits[k] = this.clamp(this.traits[k], 0.1, 0.9);
        }
        for (const k of Object.keys(this.subTraits)) {
            this.subTraits[k] = this.clamp(this.subTraits[k], 0.1, 0.9);
        }
        for (const k of Object.keys(this.state)) {
            if (typeof this.state[k] === 'number') {
                this.state[k] = this.clamp(this.state[k], 0, 1);
            }
        }
    }

    /**
     * Guarda personalidad si:
     *  - Pasó al menos _saveIntervalSec desde el último guardado
     *  - Y algún rasgo cambió > _evolThreshold
     * Además, escribe evolución manual en personalidad_evolucion.
     */
    _maybeSaveAndLogEvolution() {
        if (!systemCore.database?.isInitialized) return;

        const now = Date.now();
        const lastTraits = this._lastSavedTraits || { ...this.traits };

        // Calcular deltas
        const deltas = {
            apertura: this.traits.openness - (lastTraits.openness ?? this.traits.openness),
            conciencia: this.traits.conscientiousness - (lastTraits.conscientiousness ?? this.traits.conscientiousness),
            extraversion: this.traits.extraversion - (lastTraits.extraversion ?? this.traits.extraversion),
            amabilidad: this.traits.agreeableness - (lastTraits.agreeableness ?? this.traits.agreeableness),
            neuroticismo: this.traits.neuroticism - (lastTraits.neuroticism ?? this.traits.neuroticism)
        };

        const anySignificant = Object.values(deltas).some(d => Math.abs(d) > this._evolThreshold);
        const timeDue = (systemCore.systemTime - this._lastSavedAt) >= this._saveIntervalSec;

        if (!anySignificant && !timeDue) return;

        // Persistir snapshot
        systemCore.queuePersistence('personality', async () => {
            const db = systemCore.database;
            if (!db?.isInitialized) return;

            try {
                await db.savePersonality({
                    openness: this.traits.openness,
                    conscientiousness: this.traits.conscientiousness,
                    extraversion: this.traits.extraversion,
                    agreeableness: this.traits.agreeableness,
                    neuroticism: this.traits.neuroticism
                }, systemCore.systemTime);

                // Escribir evolución manual (el trigger AFTER UPDATE no dispara con INSERT)
                if (anySignificant) {
                    const map = {
                        apertura: 'apertura',
                        conciencia: 'conciencia',
                        extraversion: 'extraversion',
                        amabilidad: 'amabilidad',
                        neuroticismo: 'neuroticismo'
                    };
                    for (const [key, delta] of Object.entries(deltas)) {
                        if (Math.abs(delta) < this._evolThreshold) continue;
                        const oldVal = lastTraits[this._traitKeyFor(key)] ?? this.traits[this._traitKeyFor(key)];
                        const newVal = this.traits[this._traitKeyFor(key)];
                        await db.db.run(
                            `INSERT INTO personalidad_evolucion
                                (timestamp, sim_time, rasgo, valor_anterior, valor_nuevo, delta, causa)
                             VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [now, systemCore.systemTime, map[key], oldVal, newVal, delta, 'evolucion_natural']
                        );
                    }
                }
            } catch (err) {
                systemCore.logSystem(`Error guardando personalidad: ${err.message}`, 'warning');
            }
        });

        // Actualizar referencia solo si hubo cambio significativo
        if (anySignificant) {
            this._lastSavedTraits = { ...this.traits };
        }
        this._lastSavedAt = systemCore.systemTime;

        // Emitir evento si un rasgo cambió mucho en el intervalo
        for (const [k, d] of Object.entries(deltas)) {
            if (Math.abs(d) > 0.08) {
                this.emitEvent('personality_shift', { trait: k, delta: d });
            }
        }
    }

    _traitKeyFor(name) {
        const map = {
            apertura: 'openness',
            conciencia: 'conscientiousness',
            extraversion: 'extraversion',
            amabilidad: 'agreeableness',
            neuroticismo: 'neuroticism'
        };
        return map[name] || name;
    }

    applyModulation(mod) {
        if (mod.madurez !== undefined) this.state.madurez = this.clamp(this.state.madurez + mod.madurez, 0, 1);
        if (mod.desarrollo !== undefined) this.personalityDevelopment = this.clamp(this.personalityDevelopment + mod.desarrollo, 0, 1);
        if (mod.apertura !== undefined) this.traits.openness = this.clamp(this.traits.openness + mod.apertura, 0.1, 0.9);
        if (mod.conciencia !== undefined) this.traits.conscientiousness = this.clamp(this.traits.conscientiousness + mod.conciencia, 0.1, 0.9);
        if (mod.extraversion !== undefined) this.traits.extraversion = this.clamp(this.traits.extraversion + mod.extraversion, 0.1, 0.9);
        if (mod.amabilidad !== undefined) this.traits.agreeableness = this.clamp(this.traits.agreeableness + mod.amabilidad, 0.1, 0.9);
        if (mod.neuroticismo !== undefined) this.traits.neuroticism = this.clamp(this.traits.neuroticism + mod.neuroticismo, 0.1, 0.9);
        if (mod.creatividad !== undefined) {
            this.traits.openness = this.clamp(this.traits.openness + mod.creatividad * 0.3, 0.1, 0.9);
        }
        this.updateSubTraits();
        this.updatePersonalityMatrix();
    }

    getPersonalityDescription() {
        const d = [];
        const t = this.traits;
        if (t.openness > 0.7) d.push('abierto');
        else if (t.openness < 0.3) d.push('tradicional');
        if (t.conscientiousness > 0.7) d.push('disciplinado');
        else if (t.conscientiousness < 0.3) d.push('espontáneo');
        if (t.extraversion > 0.7) d.push('extrovertido');
        else if (t.extraversion < 0.3) d.push('introvertido');
        if (t.agreeableness > 0.7) d.push('empático');
        else if (t.agreeableness < 0.3) d.push('desafiante');
        if (t.neuroticism > 0.7) d.push('sensible');
        else if (t.neuroticism < 0.3) d.push('estable');
        return d.join(', ') || 'equilibrado';
    }

    handleSituation(type, intensity) {
        const effects = {
            'recompensa': { estabilidad: 0.05 * intensity, bienestar: 0.05 * intensity },
            'amenaza': { estabilidad: -0.05 * intensity, flexibilidad: -0.03 * intensity },
            'interaccion_social': { bienestar: 0.05 * intensity, satisfaccion: 0.04 * intensity },
            'insight': { sabiduria: 0.03 * intensity, autenticidad: 0.03 * intensity },
            'logro': { proposito: 0.05 * intensity, satisfaccion: 0.05 * intensity },
            'fracaso': { satisfaccion: -0.05 * intensity, estabilidad: -0.03 * intensity }
        };
        const eff = effects[type] || {};
        for (const k of Object.keys(eff)) {
            if (this.state[k] !== undefined) {
                this.state[k] = this.clamp(this.state[k] + eff[k], 0, 1);
            }
        }
    }

    emergencyProtocol() {
        this.applyModulation({
            apertura: -0.02, conciencia: 0.02, neuroticismo: 0.03,
            extraversion: -0.02, amabilidad: 0.01
        });
        this.emitEvent('emergency', { type: 'personality_emergency', severity: 0.85 });
    }

    getState() {
        return {
            traits: { ...this.traits },
            subTraits: { ...this.subTraits },
            state: { ...this.state },
            personalityDevelopment: this.personalityDevelopment,
            matrix: { ...this.personalityMatrix },
            description: this.getPersonalityDescription()
        };
    }

    clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

    reset() {
        this.initializeTraits();
        this.initializeState();
        this.setupPersonalityMatrix();
        this._lastSavedTraits = { ...this.traits };
        this._lastSavedAt = 0;
    }

    exportData() {
        return {
            traits: { ...this.traits },
            subTraits: { ...this.subTraits },
            state: { ...this.state },
            personalityDevelopment: this.personalityDevelopment,
            personalityMatrix: { ...this.personalityMatrix },
            description: this.getPersonalityDescription()
        };
    }
}

systemCore.registerModule('personality', new PersonalitySystem());
