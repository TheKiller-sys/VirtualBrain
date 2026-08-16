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
        this.config = {}; // ✅ Inicializar config como objeto vacío
    }

    async initialize(characterConfig) {
        this.config = characterConfig || { genotipo: 'resiliente' }; // ✅ Asegurar que config existe
        this.initializeTraits();
        this.initializeState();
        this.setupPersonalityMatrix();
        systemCore.logSystem('Sistema de personalidad V3.0 inicializado');
    }

    initializeTraits() {
        // ✅ Verificar que config existe antes de usarlo
        const genotipo = this.config?.genotipo || 'resiliente';
        
        const baseTraits = {
            resiliente: {
                openness: 0.5,
                conscientiousness: 0.7,
                extraversion: 0.5,
                agreeableness: 0.7,
                neuroticism: 0.3
            },
            vulnerable: {
                openness: 0.4,
                conscientiousness: 0.5,
                extraversion: 0.3,
                agreeableness: 0.6,
                neuroticism: 0.8
            },
            audaz: {
                openness: 0.7,
                conscientiousness: 0.5,
                extraversion: 0.8,
                agreeableness: 0.4,
                neuroticism: 0.4
            },
            intelectual: {
                openness: 0.9,
                conscientiousness: 0.8,
                extraversion: 0.3,
                agreeableness: 0.5,
                neuroticism: 0.3
            },
            social: {
                openness: 0.6,
                conscientiousness: 0.6,
                extraversion: 0.9,
                agreeableness: 0.8,
                neuroticism: 0.4
            }
        };

        const base = baseTraits[genotipo] || baseTraits.resiliente;
        
        this.traits = {
            openness: base.openness,
            conscientiousness: base.conscientiousness,
            extraversion: base.extraversion,
            agreeableness: base.agreeableness,
            neuroticism: base.neuroticism
        };

        this.subTraits = {
            curiosity: 0.5 + (base.openness - 0.5) * 0.5,
            creativity: 0.5 + (base.openness - 0.5) * 0.4,
            imagination: 0.5 + (base.openness - 0.5) * 0.3,
            discipline: 0.5 + (base.conscientiousness - 0.5) * 0.5,
            organization: 0.5 + (base.conscientiousness - 0.5) * 0.4,
            responsibility: 0.5 + (base.conscientiousness - 0.5) * 0.3,
            sociability: 0.5 + (base.extraversion - 0.5) * 0.5,
            assertiveness: 0.5 + (base.extraversion - 0.5) * 0.4,
            energy: 0.5 + (base.extraversion - 0.5) * 0.3,
            empathy: 0.5 + (base.agreeableness - 0.5) * 0.5,
            cooperation: 0.5 + (base.agreeableness - 0.5) * 0.4,
            trust: 0.5 + (base.agreeableness - 0.5) * 0.3,
            anxiety: 0.5 + (base.neuroticism - 0.5) * 0.5,
            vulnerability: 0.5 + (base.neuroticism - 0.5) * 0.4,
            moodiness: 0.5 + (base.neuroticism - 0.5) * 0.3
        };
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
        this.personalityMatrix = {};
        this.lastUpdateTime = systemCore.systemTime || Date.now();
    }

    setupPersonalityMatrix() {
        this.personalityMatrix = {
            emotional: {
                stability: 1 - this.traits.neuroticism,
                intensity: this.traits.extraversion * 0.5 + 0.5,
                regulation: 1 - this.traits.neuroticism * 0.5
            },
            cognitive: {
                attention: 1 - this.traits.neuroticism * 0.3,
                creativity: this.traits.openness * 0.7,
                decision_making: 1 - this.traits.neuroticism * 0.2
            },
            memory: {
                retention: this.traits.conscientiousness * 0.5,
                retrieval: 1 - this.traits.neuroticism * 0.2,
                learning: this.traits.openness * 0.6
            },
            motor: {
                coordination: 1 - this.traits.neuroticism * 0.2,
                precision: this.traits.conscientiousness * 0.4,
                speed: this.traits.extraversion * 0.3
            },
            social: {
                connection: this.traits.agreeableness * 0.7,
                influence: this.traits.extraversion * 0.5,
                trust: this.traits.agreeableness * 0.6
            }
        };
    }

    onEvent(callback) {
        this.eventListeners.push(callback);
    }

    emitEvent(type, data) {
        this.eventListeners.forEach(cb => cb({ type, data, module: 'personality' }));
    }

    update(input, deltaTime) {
        this.lastUpdateTime = systemCore.systemTime || Date.now();
        
        if (!input || !input.biochemical || !input.emotional) return this.getState();

        this.applyEmotionalInfluences(input.emotional, deltaTime);
        this.applyBiochemicalInfluences(input.biochemical, deltaTime);
        this.developPersonality(input, deltaTime);
        this.updatePersonalityMatrix(deltaTime);
        this.applyHomeostasis(deltaTime);

        return this.getState();
    }

    applyEmotionalInfluences(emotionalState, deltaTime) {
        if (!emotionalState) return;
        
        const intensity = emotionalState.intensidad || 0;
        
        if (intensity > 0.5) {
            const dominant = this.getDominantEmotion(emotionalState);
            
            switch(dominant) {
                case 'alegria':
                    this.traits.extraversion += 0.05 * deltaTime * intensity;
                    this.traits.agreeableness += 0.03 * deltaTime * intensity;
                    break;
                case 'tristeza':
                    this.traits.neuroticism += 0.05 * deltaTime * intensity;
                    this.traits.extraversion -= 0.03 * deltaTime * intensity;
                    break;
                case 'miedo':
                    this.traits.neuroticism += 0.08 * deltaTime * intensity;
                    this.traits.openness -= 0.03 * deltaTime * intensity;
                    break;
                case 'ira':
                    this.traits.agreeableness -= 0.05 * deltaTime * intensity;
                    this.traits.neuroticism += 0.04 * deltaTime * intensity;
                    break;
                case 'confianza':
                    this.traits.agreeableness += 0.04 * deltaTime * intensity;
                    this.traits.neuroticism -= 0.03 * deltaTime * intensity;
                    break;
            }
        }
        
        this.updateSubTraits(deltaTime);
    }

    getDominantEmotion(emotionalState) {
        let max = 0;
        let dominant = 'neutral';
        const emotions = ['alegria', 'tristeza', 'miedo', 'ira', 'confianza', 'sorpresa', 'asco'];
        
        emotions.forEach(emotion => {
            if ((emotionalState[emotion] || 0) > max) {
                max = emotionalState[emotion] || 0;
                dominant = emotion;
            }
        });
        
        return dominant;
    }

    applyBiochemicalInfluences(bioState, deltaTime) {
        if (!bioState) return;
        
        const dopamine = (bioState.dopamina || 50) / 100;
        const serotonin = (bioState.serotonina || 50) / 100;
        const cortisol = (bioState.cortisol || 20) / 100;
        
        this.traits.extraversion += (dopamine - 0.5) * 0.02 * deltaTime;
        this.traits.openness += (dopamine - 0.5) * 0.015 * deltaTime;
        this.traits.agreeableness += (serotonin - 0.5) * 0.02 * deltaTime;
        this.traits.neuroticism -= (serotonin - 0.5) * 0.015 * deltaTime;
        this.traits.neuroticism += (cortisol - 0.2) * 0.03 * deltaTime;
        this.traits.conscientiousness -= (cortisol - 0.2) * 0.01 * deltaTime;
        
        this.updateSubTraits(deltaTime);
    }

    updateSubTraits(deltaTime) {
        this.subTraits.curiosity = 0.5 + (this.traits.openness - 0.5) * 0.6;
        this.subTraits.creativity = 0.5 + (this.traits.openness - 0.5) * 0.5;
        this.subTraits.imagination = 0.5 + (this.traits.openness - 0.5) * 0.4;
        this.subTraits.discipline = 0.5 + (this.traits.conscientiousness - 0.5) * 0.6;
        this.subTraits.organization = 0.5 + (this.traits.conscientiousness - 0.5) * 0.5;
        this.subTraits.responsibility = 0.5 + (this.traits.conscientiousness - 0.5) * 0.4;
        this.subTraits.sociability = 0.5 + (this.traits.extraversion - 0.5) * 0.6;
        this.subTraits.assertiveness = 0.5 + (this.traits.extraversion - 0.5) * 0.5;
        this.subTraits.energy = 0.5 + (this.traits.extraversion - 0.5) * 0.4;
        this.subTraits.empathy = 0.5 + (this.traits.agreeableness - 0.5) * 0.6;
        this.subTraits.cooperation = 0.5 + (this.traits.agreeableness - 0.5) * 0.5;
        this.subTraits.trust = 0.5 + (this.traits.agreeableness - 0.5) * 0.4;
        this.subTraits.anxiety = 0.5 + (this.traits.neuroticism - 0.5) * 0.6;
        this.subTraits.vulnerability = 0.5 + (this.traits.neuroticism - 0.5) * 0.5;
        this.subTraits.moodiness = 0.5 + (this.traits.neuroticism - 0.5) * 0.4;
        
        Object.keys(this.subTraits).forEach(key => {
            this.subTraits[key] = this.clamp(this.subTraits[key], 0, 1);
        });
    }

    developPersonality(input, deltaTime) {
        const learning = input.cognitive?.aprendizaje || 50;
        const experience = input.cognitive?.experiencia || 0;
        const emotionalDepth = input.emotional?.intensidad || 0;
        
        this.personalityDevelopment += (learning / 100) * 0.001 * deltaTime;
        this.personalityDevelopment += experience * 0.0001 * deltaTime;
        this.personalityDevelopment += emotionalDepth * 0.001 * deltaTime;
        
        this.personalityDevelopment = this.clamp(this.personalityDevelopment, 0, 1);
        
        this.state.madurez = 0.3 + this.personalityDevelopment * 0.5;
        this.state.sabiduria = 0.2 + this.personalityDevelopment * 0.4;
        this.state.autenticidad = 0.4 + this.personalityDevelopment * 0.3;
        this.state.estabilidad = 0.5 + this.personalityDevelopment * 0.4;
        this.state.adaptabilidad = 0.4 + (1 - this.traits.neuroticism) * 0.4;
        this.state.integridad = 0.6 + this.traits.conscientiousness * 0.3;
    }

    updatePersonalityMatrix(deltaTime) {
        this.personalityMatrix = {
            emotional: {
                stability: 1 - this.traits.neuroticism,
                intensity: this.traits.extraversion * 0.5 + 0.5,
                regulation: 1 - this.traits.neuroticism * 0.5
            },
            cognitive: {
                attention: 1 - this.traits.neuroticism * 0.3,
                creativity: this.traits.openness * 0.7,
                decision_making: 1 - this.traits.neuroticism * 0.2
            },
            memory: {
                retention: this.traits.conscientiousness * 0.5,
                retrieval: 1 - this.traits.neuroticism * 0.2,
                learning: this.traits.openness * 0.6
            },
            motor: {
                coordination: 1 - this.traits.neuroticism * 0.2,
                precision: this.traits.conscientiousness * 0.4,
                speed: this.traits.extraversion * 0.3
            },
            social: {
                connection: this.traits.agreeableness * 0.7,
                influence: this.traits.extraversion * 0.5,
                trust: this.traits.agreeableness * 0.6
            }
        };
    }

    applyHomeostasis(deltaTime) {
        Object.keys(this.traits).forEach(key => {
            this.traits[key] = this.clamp(this.traits[key], 0.1, 0.9);
        });
        
        Object.keys(this.subTraits).forEach(key => {
            this.subTraits[key] = this.clamp(this.subTraits[key], 0.1, 0.9);
        });
        
        Object.keys(this.state).forEach(key => {
            if (typeof this.state[key] === 'number') {
                this.state[key] = this.clamp(this.state[key], 0, 1);
            }
        });
    }

    applyModulation(modulation) {
        if (modulation.madurez !== undefined) {
            this.state.madurez = Math.min(1, Math.max(0, this.state.madurez + modulation.madurez));
        }
        if (modulation.desarrollo !== undefined) {
            this.personalityDevelopment = Math.min(1, Math.max(0, this.personalityDevelopment + modulation.desarrollo));
        }
        if (modulation.apertura !== undefined) {
            this.traits.openness = Math.min(1, Math.max(0, this.traits.openness + modulation.apertura));
        }
        if (modulation.conciencia !== undefined) {
            this.traits.conscientiousness = Math.min(1, Math.max(0, this.traits.conscientiousness + modulation.conciencia));
        }
        if (modulation.extraversion !== undefined) {
            this.traits.extraversion = Math.min(1, Math.max(0, this.traits.extraversion + modulation.extraversion));
        }
        if (modulation.amabilidad !== undefined) {
            this.traits.agreeableness = Math.min(1, Math.max(0, this.traits.agreeableness + modulation.amabilidad));
        }
        if (modulation.neuroticismo !== undefined) {
            this.traits.neuroticism = Math.min(1, Math.max(0, this.traits.neuroticism + modulation.neuroticismo));
        }
        if (modulation.creatividad !== undefined) {
            this.subTraits.creativity = Math.min(1, Math.max(0, this.subTraits.creativity + modulation.creatividad));
        }
        this.updateSubTraits(0.1);
    }

    getPersonalityDescription() {
        const descriptions = [];
        
        if (this.traits.openness > 0.7) descriptions.push('abierto a nuevas experiencias');
        else if (this.traits.openness < 0.3) descriptions.push('tradicional y cauteloso');
        
        if (this.traits.conscientiousness > 0.7) descriptions.push('altamente disciplinado');
        else if (this.traits.conscientiousness < 0.3) descriptions.push('espontáneo y despreocupado');
        
        if (this.traits.extraversion > 0.7) descriptions.push('extrovertido y sociable');
        else if (this.traits.extraversion < 0.3) descriptions.push('introvertido y reservado');
        
        if (this.traits.agreeableness > 0.7) descriptions.push('empático y cooperativo');
        else if (this.traits.agreeableness < 0.3) descriptions.push('desafiante y competitivo');
        
        if (this.traits.neuroticism > 0.7) descriptions.push('emocionalmente sensible');
        else if (this.traits.neuroticism < 0.3) descriptions.push('emocionalmente estable');
        
        return descriptions.join(', ');
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

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

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
