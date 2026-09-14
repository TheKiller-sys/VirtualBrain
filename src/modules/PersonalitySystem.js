// src/modules/PersonalitySystem.js
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
    }

    async initialize(characterConfig) {
        this.config = characterConfig || { genotipo: 'resiliente' };
        this.initializeTraits();
        this.initializeState();
        this.setupPersonalityMatrix();
        systemCore.logSystem('Sistema de personalidad V4 inicializado');
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
        // FIX: la función ignora el argumento, se llama sin él
        this.updateSubTraits();
    }

    initializeState() {
        this.state = {
            estabilidad: 0.7,
            flexibilidad: 0.5,
            adaptabilidad: 0.6,
            integridad: 0.8,
            madurez: 0.4,
            sabiduria: 0.3,
            autenticidad: 0.6,
            bienestar: 0.6,
            satisfaccion: 0.5,
            proposito: 0.4
        };
        this.personalityDevelopment = 0;
        this.lastUpdateTime = systemCore.systemTime;
    }

    setupPersonalityMatrix() {
        this.updatePersonalityMatrix();
    }

    // FIX: firma sin argumento (antes recibía 0 y lo ignoraba)
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
        Object.keys(this.subTraits).forEach(k => this.subTraits[k] = this.clamp(this.subTraits[k], 0, 1));
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
        this.eventListeners.forEach(cb => {
            try { cb({ type, data, module: 'personality' }); }
            catch (err) { console.error('❌ pers listener:', err); }
        });
    }

    update(input, deltaTime) {
        this.lastUpdateTime = systemCore.systemTime;
        if (!input || !input.biochemical || !input.emotional) return this.getState();

        this.applyEmotionalInfluences(input.emotional, deltaTime);
        this.applyBiochemicalInfluences(input.biochemical, deltaTime);
        this.developPersonality(input, deltaTime);
        this.updatePersonalityMatrix();
        this.applyHomeostasis();

        systemCore.queuePersistence('personality', () => {
            if (systemCore.database?.isInitialized) {
                return systemCore.database.savePersonality({
                    openness: this.traits.openness,
                    conscientiousness: this.traits.conscientiousness,
                    extraversion: this.traits.extraversion,
                    agreeableness: this.traits.agreeableness,
                    neuroticism: this.traits.neuroticism
                });
            }
        });

        return this.getState();
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
        emotions.forEach(em => {
            if ((e[em] || 0) > max) { max = e[em]; dom = em; }
        });
        return dom;
    }

    applyBiochemicalInfluences(bio, deltaTime) {
        const dopamina = (bio.dopamina || 50) / 100;
        const serotonina = (bio.serotonina || 50) / 100;
        const cortisol = (bio.cortisol || 20) / 100;

        this.traits.extraversion = this.clamp(this.traits.extraversion + (dopamina - 0.5) * 0.02 * deltaTime, 0.1, 0.9);
        this.traits.openness = this.clamp(this.traits.openness + (dopamina - 0.5) * 0.015 * deltaTime, 0.1, 0.9);
        this.traits.agreeableness = this.clamp(this.traits.agreeableness + (serotonina - 0.5) * 0.02 * deltaTime, 0.1, 0.9);
        this.traits.neuroticism = this.clamp(this.traits.neuroticism + (cortisol - 0.2) * 0.03 * deltaTime, 0.1, 0.9);
        this.updateSubTraits();
    }

    developPersonality(input, deltaTime) {
        const learning = input.cognitive?.aprendizaje || 50;
        const emotionalDepth = input.emotional?.intensidad || 0;

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
        Object.keys(this.traits).forEach(k => this.traits[k] = this.clamp(this.traits[k], 0.1, 0.9));
        Object.keys(this.subTraits).forEach(k => this.subTraits[k] = this.clamp(this.subTraits[k], 0.1, 0.9));
        Object.keys(this.state).forEach(k => {
            if (typeof this.state[k] === 'number') this.state[k] = this.clamp(this.state[k], 0, 1);
        });
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
            // Compatibilidad hacia atrás: algunos llamadores pasan {creatividad: x}
            this.traits.openness = this.clamp(this.traits.openness + mod.creatividad * 0.3, 0.1, 0.9);
        }
        this.updateSubTraits();
        this.updatePersonalityMatrix();
    }

    getPersonalityDescription() {
        const d = [];
        if (this.traits.openness > 0.7) d.push('abierto');
        else if (this.traits.openness < 0.3) d.push('tradicional');
        if (this.traits.conscientiousness > 0.7) d.push('disciplinado');
        else if (this.traits.conscientiousness < 0.3) d.push('espontáneo');
        if (this.traits.extraversion > 0.7) d.push('extrovertido');
        else if (this.traits.extraversion < 0.3) d.push('introvertido');
        if (this.traits.agreeableness > 0.7) d.push('empático');
        else if (this.traits.agreeableness < 0.3) d.push('desafiante');
        if (this.traits.neuroticism > 0.7) d.push('sensible');
        else if (this.traits.neuroticism < 0.3) d.push('estable');
        return d.join(', ') || 'equilibrado';
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
