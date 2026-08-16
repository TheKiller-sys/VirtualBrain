// src/modules/EmotionalSystem.js
import { brain } from '../core/SystemCore.js';

export class EmotionalSystem {
    constructor() {
        this.state = {};
        this.config = {};
        this.emotionalMemory = [];
        this.circadianRhythm = null;
        this.emotionalHistory = [];
        this.emotionalPatterns = new Map();
        this.eventListeners = [];
        this.emotionCache = {};
        this.lastUpdateTime = 0;
        this.activePatterns = [];
        this.emotionalRegulationBuffer = {};
    }

    async initialize(characterConfig) {
        this.config = characterConfig;
        this.setupEmotionalBaselines();
        this.initializeState();
        this.setupCircadianRhythm();
        this.setupEmotionalPatterns();
        console.log('❤️ Sistema emocional V3.0 inicializado');
    }

    setupEmotionalBaselines() {
        // Baselines humanos realistas
        this.emotionalProfile = {
            emotionalStability: 1.0,
            stressRecovery: 1.0,
            joyBaseline: 1.0,
            fearThreshold: 1.0,
            emotionalIntensity: 1.0,
            emotionalRegulation: 1.0,
            empathyBaseline: 1.0,
            resilienceBaseline: 1.0
        };

        // Variaciones basadas en genotipo
        const profiles = {
            humano: this.emotionalProfile,
            resiliente: {
                emotionalStability: 1.3,
                stressRecovery: 1.4,
                emotionalRegulation: 1.3,
                resilienceBaseline: 1.3
            },
            sensible: {
                emotionalStability: 0.7,
                stressRecovery: 0.6,
                emotionalIntensity: 1.3,
                fearThreshold: 1.2
            },
            creativo: {
                emotionalStability: 0.8,
                emotionalIntensity: 1.4,
                emotionalRegulation: 0.8,
                joyBaseline: 1.2
            },
            social: {
                emotionalStability: 1.1,
                stressRecovery: 1.2,
                empathyBaseline: 1.4,
                joyBaseline: 1.3
            }
        };

        const base = profiles[this.config.genotipo] || profiles.humano;
        Object.assign(this.emotionalProfile, base);
    }

    setupCircadianRhythm() {
        this.circadianRhythm = {
            phase: 0,
            amplitude: 0.3,
            period: 86400,
            emotionalVariation: {
                morning: { energy: 0.2, positivity: 0.3, stability: 0.1 },
                afternoon: { energy: 0.1, positivity: 0.1, stability: -0.1 },
                evening: { energy: -0.1, positivity: -0.2, stability: 0.1 },
                night: { energy: -0.3, positivity: -0.4, stability: -0.2 }
            }
        };
    }

    setupEmotionalPatterns() {
        this.emotionalPatterns.set('anxiety_cycle', {
            trigger: ['estres', 'miedo'],
            progression: ['miedo', 'ansiedad', 'miedo', 'fatiga'],
            duration: 300,
            intensityMultiplier: 1.2
        });
        
        this.emotionalPatterns.set('joy_spiral', {
            trigger: ['alegria', 'sorpresa'],
            progression: ['alegria', 'euforia', 'gratitud', 'alegria'],
            duration: 200,
            intensityMultiplier: 1.3
        });
        
        this.emotionalPatterns.set('anger_cycle', {
            trigger: ['ira', 'frustracion'],
            progression: ['ira', 'frustracion', 'ira', 'culpa'],
            duration: 250,
            intensityMultiplier: 1.4
        });
        
        this.emotionalPatterns.set('recovery_pattern', {
            trigger: ['tristeza', 'miedo'],
            progression: ['tristeza', 'aceptacion', 'confianza', 'alegria'],
            duration: 400,
            intensityMultiplier: 0.8
        });

        this.emotionalPatterns.set('social_connection', {
            trigger: ['confianza', 'alegria'],
            progression: ['confianza', 'alegria', 'gratitud', 'conexion'],
            duration: 250,
            intensityMultiplier: 1.1
        });
    }

    initializeState() {
        this.state = {
            // Emociones básicas
            alegria: 20,
            tristeza: 10,
            miedo: 5,
            ira: 5,
            asco: 3,
            sorpresa: 8,

            // Emociones sociales
            confianza: 50,
            verguenza: 5,
            orgullo: 15,
            culpa: 5,
            envidia: 3,
            gratitud: 20,

            // Estados afectivos
            valencia: 0.6,
            activacion: 0.5,
            dominio: 0.7,

            // Regulación emocional
            estabilidad: 80,
            resiliencia: 75,
            sensibilidad: 50,

            // Estados de ánimo
            humor: 60,
            ansiedad: 20,
            depresion: 10,
            euforia: 5,

            // Dimensiones avanzadas
            intensidad: 0.5,
            complejidad: 0.3,
            polaridad: 0.6,
            regulacion: 0.7,
            
            // Estados compuestos
            bienestar: 65,
            satisfaccion: 55,
            conexion: 45,
            realizacion: 40,
            
            // Emociones secundarias
            esperanza: 30,
            aceptacion: 40,
            frustracion: 20,
            nostalgia: 15
        };

        this.emotionalMemory = [];
        this.emotionalHistory = [];
        this.emotionCache = {};
        this.activePatterns = [];
        this.lastUpdateTime = brain.systemTime || 0;
        this.emotionalRegulationBuffer = {};
    }

    onEvent(callback) {
        this.eventListeners.push(callback);
    }

    emitEvent(type, data) {
        this.eventListeners.forEach(cb => {
            try {
                cb({ type, data, module: 'emotional' });
            } catch (error) {
                console.error('❌ Error en listener emocional:', error);
            }
        });
    }

    update(input, deltaTime) {
        this.lastUpdateTime = brain.systemTime || Date.now();
        
        if (!input || !input.biochemical) return this.getState();

        // 1. Calcular emociones basadas en bioquímica
        this.calculateBiochemicalEmotions(input.biochemical, deltaTime);
        
        // 2. Aplicar influencias de personalidad
        if (input.personality) {
            this.applyPersonalityInfluence(input.personality, deltaTime);
        }
        
        // 3. Aplicar influencias circadianas
        this.applyCircadianEffects(deltaTime);
        
        // 4. Procesar patrones emocionales
        this.processEmotionalPatterns(deltaTime);
        
        // 5. Procesar regulación emocional
        this.processEmotionalRegulation(deltaTime);
        
        // 6. Actualizar estados de ánimo
        this.updateMoodStates(deltaTime);
        
        // 7. Calcular dimensiones avanzadas
        this.calculateAdvancedEmotions(deltaTime);
        
        // 8. Aplicar homeostasis emocional
        this.applyEmotionalHomeostasis(deltaTime);
        
        // 9. Registrar estado emocional
        this.recordEmotionalState();

        return this.getState();
    }

    calculateBiochemicalEmotions(bioState, deltaTime) {
        const intensity = this.emotionalProfile.emotionalIntensity || 1.0;
        
        const neurotransmitterEffects = {
            dopamina: {
                alegria: 0.8,
                euforia: 0.6,
                valencia: 0.5,
                satisfaccion: 0.4,
                esperanza: 0.3
            },
            serotonina: {
                alegria: 0.4,
                tristeza: -0.7,
                estabilidad: 0.6,
                humor: 0.5,
                bienestar: 0.5,
                confianza: 0.2
            },
            noradrenalina: {
                miedo: 0.3,
                ira: 0.4,
                ansiedad: 0.5,
                activacion: 0.7,
                frustracion: 0.3
            },
            cortisol: {
                miedo: 0.9,
                ansiedad: 0.8,
                ira: 0.3,
                valencia: -0.6,
                estabilidad: -0.4,
                bienestar: -0.5,
                frustracion: 0.4
            },
            oxitocina: {
                confianza: 0.9,
                alegria: 0.3,
                gratitud: 0.7,
                valencia: 0.4,
                conexion: 0.6,
                aceptacion: 0.4
            },
            endorfinas: {
                alegria: 0.6,
                euforia: 0.4,
                valencia: 0.3,
                bienestar: 0.4,
                esperanza: 0.2
            },
            gaba: {
                ansiedad: -0.5,
                miedo: -0.3,
                estabilidad: 0.4,
                regulacion: 0.3,
                aceptacion: 0.2
            },
            adrenalina: {
                miedo: 0.6,
                ira: 0.5,
                activacion: 0.8,
                sorpresa: 0.4,
                ansiedad: 0.3
            },
            acetilcolina: {
                atencion: 0.3,
                complejidad: 0.4,
                sorpresa: 0.3,
                nostalgia: 0.2
            }
        };

        Object.keys(neurotransmitterEffects).forEach(nt => {
            const effects = neurotransmitterEffects[nt];
            const ntLevel = (bioState[nt] || 50) / 100;
            const effectMultiplier = intensity * deltaTime * 10;
            
            Object.keys(effects).forEach(emotion => {
                const effect = effects[emotion] * ntLevel * effectMultiplier;
                this.state[emotion] = (this.state[emotion] || 0) + effect;
            });
        });

        // Efectos fisiológicos directos
        if (bioState.oxigeno < 40) {
            const hypoxiaEffect = (100 - bioState.oxigeno) * 0.008 * deltaTime;
            this.state.ansiedad += hypoxiaEffect;
            this.state.miedo += hypoxiaEffect * 0.7;
            this.state.bienestar -= hypoxiaEffect * 0.4;
            this.state.estabilidad -= hypoxiaEffect * 0.2;
        }

        if (bioState.toxicidad > 50) {
            const toxicityEffect = bioState.toxicidad * 0.008 * deltaTime;
            this.state.asco += toxicityEffect;
            this.state.valencia -= toxicityEffect * 0.004;
            this.state.bienestar -= toxicityEffect * 0.3;
            this.state.ira += toxicityEffect * 0.2;
        }

        if (bioState.energia < 30) {
            const fatigueEffect = (100 - bioState.energia) * 0.008 * deltaTime;
            this.state.tristeza += fatigueEffect;
            this.state.activacion -= fatigueEffect * 0.004;
            this.state.nostalgia += fatigueEffect * 0.1;
        }

        if (bioState.estadoHidratacion < 30) {
            this.state.frustracion += (100 - bioState.estadoHidratacion) * 0.005 * deltaTime;
        }
    }

    applyPersonalityInfluence(personality, deltaTime) {
        if (!personality || !personality.traits) return;
        
        const traits = personality.traits || {};
        
        // Extraversión influye en emociones positivas
        if (traits.extraversion) {
            const extraFactor = (traits.extraversion - 0.5) * 2;
            this.state.alegria += extraFactor * 4 * deltaTime;
            this.state.activacion += extraFactor * 0.08 * deltaTime;
            this.state.conexion += extraFactor * 0.1 * deltaTime;
        }
        
        // Neuroticismo influye en emociones negativas
        if (traits.neuroticism) {
            const neuroFactor = (traits.neuroticism - 0.5) * 2;
            this.state.miedo += neuroFactor * 3 * deltaTime;
            this.state.ansiedad += neuroFactor * 4 * deltaTime;
            this.state.estabilidad -= neuroFactor * 5 * deltaTime;
            this.state.frustracion += neuroFactor * 2 * deltaTime;
        }
        
        // Amabilidad influye en emociones sociales
        if (traits.agreeableness) {
            const agreeFactor = (traits.agreeableness - 0.5) * 2;
            this.state.confianza += agreeFactor * 4 * deltaTime;
            this.state.gratitud += agreeFactor * 3 * deltaTime;
            this.state.conexion += agreeFactor * 0.3 * deltaTime;
            this.state.aceptacion += agreeFactor * 0.2 * deltaTime;
        }
        
        // Apertura influye en complejidad emocional
        if (traits.openness) {
            const openFactor = (traits.openness - 0.5) * 2;
            this.state.complejidad += openFactor * 0.08 * deltaTime;
            this.state.sorpresa += openFactor * 2 * deltaTime;
            this.state.esperanza += openFactor * 0.2 * deltaTime;
        }
        
        // Conciencia influye en estabilidad
        if (traits.conscientiousness) {
            const consFactor = (traits.conscientiousness - 0.5) * 2;
            this.state.estabilidad += consFactor * 3 * deltaTime;
            this.state.regulacion += consFactor * 0.1 * deltaTime;
            this.state.resiliencia += consFactor * 0.2 * deltaTime;
        }
    }

    applyCircadianEffects(deltaTime) {
        const time = brain.systemTime || Date.now();
        const daySeconds = time % 86400;
        const hour = (daySeconds / 3600) % 24;
        let phaseEffect;

        if (hour < 6) {
            phaseEffect = this.circadianRhythm.emotionalVariation.night;
        } else if (hour < 12) {
            phaseEffect = this.circadianRhythm.emotionalVariation.morning;
        } else if (hour < 18) {
            phaseEffect = this.circadianRhythm.emotionalVariation.afternoon;
        } else {
            phaseEffect = this.circadianRhythm.emotionalVariation.evening;
        }

        this.state.activacion += phaseEffect.energy * deltaTime;
        this.state.valencia += phaseEffect.positivity * deltaTime;
        this.state.estabilidad += (phaseEffect.stability || 0) * deltaTime;
        
        // Anochecer: aumento de nostalgia
        if (hour > 19 && hour < 22) {
            this.state.nostalgia += 0.05 * deltaTime;
        }
        
        // Amanecer: aumento de esperanza
        if (hour > 5 && hour < 8) {
            this.state.esperanza += 0.05 * deltaTime;
        }
    }

    processEmotionalPatterns(deltaTime) {
        this.activePatterns = this.activePatterns.filter(pattern => {
            pattern.timeRemaining -= deltaTime * 1000;
            if (pattern.timeRemaining <= 0) return false;
            
            const progress = 1 - (pattern.timeRemaining / pattern.totalDuration);
            const step = Math.floor(progress * pattern.progression.length);
            const currentEmotion = pattern.progression[Math.min(step, pattern.progression.length - 1)];
            
            if (currentEmotion && this.state[currentEmotion] !== undefined) {
                this.state[currentEmotion] += pattern.intensity * deltaTime * 2;
            }
            
            return true;
        });
        
        // Iniciar nuevos patrones
        if (this.state.miedo > 60 && this.state.ansiedad > 50) {
            if (!this.activePatterns.find(p => p.type === 'anxiety_cycle')) {
                this.startPattern('anxiety_cycle', 1.0);
            }
        }
        
        if (this.state.alegria > 70 && this.state.sorpresa > 30) {
            if (!this.activePatterns.find(p => p.type === 'joy_spiral')) {
                this.startPattern('joy_spiral', 0.8);
            }
        }
        
        if (this.state.ira > 60 && this.state.activacion > 0.7) {
            if (!this.activePatterns.find(p => p.type === 'anger_cycle')) {
                this.startPattern('anger_cycle', 0.9);
            }
        }
        
        if (this.state.tristeza > 50 && this.state.miedo > 40) {
            if (!this.activePatterns.find(p => p.type === 'recovery_pattern')) {
                this.startPattern('recovery_pattern', 0.7);
            }
        }
        
        if (this.state.confianza > 60 && this.state.alegria > 50) {
            if (!this.activePatterns.find(p => p.type === 'social_connection')) {
                this.startPattern('social_connection', 0.8);
            }
        }
    }

    startPattern(patternType, intensity) {
        const pattern = this.emotionalPatterns.get(patternType);
        if (!pattern) return;
        
        this.activePatterns.push({
            type: patternType,
            progression: pattern.progression,
            duration: pattern.duration,
            totalDuration: pattern.duration,
            intensity: intensity * pattern.intensityMultiplier,
            timeRemaining: pattern.duration,
            startTime: this.lastUpdateTime
        });
        
        this.emitEvent('pattern_started', {
            pattern: patternType,
            intensity: intensity,
            time: this.lastUpdateTime
        });
    }

    processEmotionalRegulation(deltaTime) {
        const stabilityFactor = this.state.estabilidad / 100;
        const regulationFactor = this.emotionalProfile.emotionalRegulation || 1.0;
        
        // Regulación automática
        Object.keys(this.state).forEach(emotion => {
            if (typeof this.state[emotion] === 'number' && 
                !['valencia', 'activacion', 'dominio', 'intensidad', 'complejidad', 'polaridad', 'regulacion'].includes(emotion)) {
                const current = this.state[emotion] || 0;
                const baseline = this.getEmotionalBaseline(emotion);
                const difference = baseline - current;
                
                let regulationRate = 0.08 * stabilityFactor * regulationFactor * deltaTime;
                
                if (emotion === 'miedo' || emotion === 'ira' || emotion === 'tristeza' || emotion === 'ansiedad') {
                    regulationRate *= 1.3;
                }
                
                this.state[emotion] += difference * regulationRate;
            }
        });

        // Regulación cognitiva
        this.applyCognitiveRegulation(deltaTime);
        
        // Regulación social
        this.applySocialRegulation(deltaTime);
        
        // Regulación por respiración
        this.applyBreathingRegulation(deltaTime);
    }

    applyCognitiveRegulation(deltaTime) {
        const cognitiveFactor = this.emotionalProfile.emotionalRegulation || 1.0;
        
        const negativeEmotions = ['miedo', 'ira', 'tristeza', 'ansiedad', 'culpa', 'frustracion'];
        negativeEmotions.forEach(emotion => {
            if (this.state[emotion] > 30) {
                const reduction = 0.04 * cognitiveFactor * deltaTime * (this.state[emotion] / 100);
                this.state[emotion] -= reduction;
            }
        });

        this.state.estabilidad += 0.08 * cognitiveFactor * deltaTime;
        this.state.regulacion += 0.04 * cognitiveFactor * deltaTime;
        
        // Aumento de aceptación
        if (this.state.estabilidad > 60) {
            this.state.aceptacion += 0.03 * cognitiveFactor * deltaTime;
        }
    }

    applySocialRegulation(deltaTime) {
        const socialFactor = this.emotionalProfile.empathyBaseline || 1.0;
        
        if (this.state.conexion > 50) {
            this.state.alegria += 0.08 * socialFactor * deltaTime;
            this.state.confianza += 0.12 * socialFactor * deltaTime;
            this.state.ansiedad -= 0.08 * socialFactor * deltaTime;
            this.state.miedo -= 0.04 * socialFactor * deltaTime;
            this.state.soledad = Math.max(0, this.state.soledad - 0.05 * deltaTime);
        } else {
            this.state.soledad = (this.state.soledad || 0) + 0.02 * deltaTime;
        }
    }

    applyBreathingRegulation(deltaTime) {
        // Simulación de respiración profunda
        const breathingRate = 0.2; // Ciclos por segundo
        const breathPhase = Math.sin((brain.systemTime || 0) * breathingRate * 2 * Math.PI);
        
        if (breathPhase > 0.8) {
            // Inhalación profunda
            this.state.estabilidad += 0.02 * deltaTime;
            this.state.ansiedad -= 0.02 * deltaTime;
            this.state.activacion += 0.01 * deltaTime;
        }
    }

    updateMoodStates(deltaTime) {
        const recentEmotions = this.getRecentEmotionalStates();
        
        // Humor basado en valencia emocional reciente
        const positiveEmotions = (recentEmotions.alegria || 0) + (recentEmotions.confianza || 0) + (recentEmotions.gratitud || 0);
        const negativeEmotions = (recentEmotions.tristeza || 0) + (recentEmotions.miedo || 0) + (recentEmotions.ira || 0);
        
        this.state.humor = 50 + (positiveEmotions - negativeEmotions) * 0.4;
        
        // Ansiedad
        const anxietyTarget = (this.state.miedo || 0) * 0.7 + (this.state.ansiedad || 0) * 0.3;
        this.state.ansiedad += (anxietyTarget - this.state.ansiedad) * 0.1 * deltaTime;
        
        // Depresión
        const depressionTarget = (this.state.tristeza || 0) * 0.6 + (this.state.depresion || 0) * 0.4;
        this.state.depresion += (depressionTarget - this.state.depresion) * 0.1 * deltaTime;
        
        // Euforia
        this.state.euforia = Math.max(0, (this.state.alegria || 0) - 70) * 2;
        
        // Bienestar general
        const wellbeingFactors = {
            emocional: ((this.state.alegria || 0) + (this.state.confianza || 0)) / 2,
            estabilidad: this.state.estabilidad || 0,
            conexion: this.state.conexion || 0,
            realizacion: this.state.realizacion || 0,
            esperanza: this.state.esperanza || 0,
            aceptacion: this.state.aceptacion || 0
        };
        
        this.state.bienestar = Object.values(wellbeingFactors).reduce((a, b) => a + b, 0) / 6;
        this.state.bienestar = this.clamp(this.state.bienestar, 0, 100);
    }

    calculateAdvancedEmotions(deltaTime) {
        // Intensidad emocional total
        const primaryEmotions = ['alegria', 'tristeza', 'miedo', 'ira', 'asco', 'sorpresa'];
        const totalIntensity = primaryEmotions.reduce((sum, emotion) => sum + (this.state[emotion] || 0), 0);
        this.state.intensidad = totalIntensity / primaryEmotions.length / 100;
        
        // Complejidad emocional
        const emotionValues = primaryEmotions.map(e => (this.state[e] || 0) / 100);
        const average = emotionValues.reduce((a, b) => a + b, 0) / emotionValues.length;
        const variance = emotionValues.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / emotionValues.length;
        this.state.complejidad = Math.min(1, Math.sqrt(variance) * 3);
        
        // Polaridad
        const positive = (this.state.alegria || 0) + (this.state.confianza || 0) + (this.state.gratitud || 0);
        const negative = (this.state.tristeza || 0) + (this.state.miedo || 0) + (this.state.ira || 0) + (this.state.asco || 0);
        this.state.polaridad = (positive - negative) / (positive + negative + 1);
        this.state.polaridad = (this.state.polaridad + 1) / 2;
        
        // Satisfacción
        this.state.satisfaccion = ((this.state.bienestar || 0) + (this.state.humor || 0) + (this.state.realizacion || 0)) / 3;
        this.state.satisfaccion = this.clamp(this.state.satisfaccion, 0, 100);
        
        // Realización
        this.state.realizacion += ((this.state.orgullo || 0) / 100 - (this.state.realizacion || 0) / 100) * 0.008 * deltaTime;
        this.state.realizacion = this.clamp(this.state.realizacion, 0, 100);
        
        // Conexión
        this.state.conexion += ((this.state.confianza || 0) / 100 - (this.state.conexion || 0) / 100) * 0.008 * deltaTime;
        this.state.conexion = this.clamp(this.state.conexion, 0, 100);
        
        // Esperanza
        if (this.state.alegria > 50 && this.state.confianza > 40) {
            this.state.esperanza += 0.02 * deltaTime;
        } else if (this.state.tristeza > 50 || this.state.miedo > 50) {
            this.state.esperanza -= 0.01 * deltaTime;
        }
        this.state.esperanza = this.clamp(this.state.esperanza, 0, 100);
        
        // Aceptación
        if (this.state.estabilidad > 50 && this.state.ansiedad < 30) {
            this.state.aceptacion += 0.02 * deltaTime;
        }
        this.state.aceptacion = this.clamp(this.state.aceptacion, 0, 100);
    }

    applyEmotionalHomeostasis(deltaTime) {
        const emotionalLimits = {
            alegria: { min: 0, max: 100 },
            tristeza: { min: 0, max: 90 },
            miedo: { min: 0, max: 95 },
            ira: { min: 0, max: 90 },
            asco: { min: 0, max: 80 },
            sorpresa: { min: 0, max: 70 },
            confianza: { min: 0, max: 95 },
            ansiedad: { min: 0, max: 85 },
            depresion: { min: 0, max: 80 },
            euforia: { min: 0, max: 50 },
            bienestar: { min: 0, max: 100 },
            satisfaccion: { min: 0, max: 100 },
            conexion: { min: 0, max: 100 },
            realizacion: { min: 0, max: 100 },
            esperanza: { min: 0, max: 100 },
            aceptacion: { min: 0, max: 100 },
            frustracion: { min: 0, max: 80 },
            nostalgia: { min: 0, max: 70 }
        };

        Object.keys(emotionalLimits).forEach(emotion => {
            const limits = emotionalLimits[emotion];
            this.state[emotion] = this.clamp(this.state[emotion] || 0, limits.min, limits.max);
        });

        // Mantener dimensiones afectivas en rango
        this.state.valencia = this.clamp(this.state.valencia || 0, -1, 1);
        this.state.activacion = this.clamp(this.state.activacion || 0, 0, 1);
        this.state.dominio = this.clamp(this.state.dominio || 0, 0, 1);
        this.state.estabilidad = this.clamp(this.state.estabilidad || 0, 0, 100);
        this.state.resiliencia = this.clamp(this.state.resiliencia || 0, 0, 100);
        this.state.sensibilidad = this.clamp(this.state.sensibilidad || 0, 0, 100);
        this.state.humor = this.clamp(this.state.humor || 0, 0, 100);
        this.state.intensidad = this.clamp(this.state.intensidad || 0, 0, 1);
        this.state.complejidad = this.clamp(this.state.complejidad || 0, 0, 1);
        this.state.polaridad = this.clamp(this.state.polaridad || 0, 0, 1);
        this.state.regulacion = this.clamp(this.state.regulacion || 0, 0, 1);
    }

    getRecentEmotionalStates() {
        const recent = this.emotionalMemory.slice(-20);
        if (recent.length === 0) return this.state;

        const average = {};
        Object.keys(this.state).forEach(key => {
            if (typeof this.state[key] === 'number') {
                average[key] = recent.reduce((sum, state) => sum + (state[key] || 0), 0) / recent.length;
            }
        });

        return average;
    }

    recordEmotionalState() {
        const state = { ...this.state };
        state.timestamp = brain.systemTime || Date.now();
        
        this.emotionalMemory.push(state);
        this.emotionalHistory.push(state);
        
        if (this.emotionalMemory.length > 200) {
            this.emotionalMemory.shift();
        }
        if (this.emotionalHistory.length > 1000) {
            this.emotionalHistory.shift();
        }
    }

    getEmotionalBaseline(emotion) {
        const baselines = {
            alegria: 20 * this.emotionalProfile.joyBaseline,
            tristeza: 10,
            miedo: 5 * this.emotionalProfile.fearThreshold,
            ira: 5,
            confianza: 50,
            estabilidad: 80 * this.emotionalProfile.emotionalStability,
            resiliencia: 75 * this.emotionalProfile.resilienceBaseline,
            bienestar: 65,
            satisfaccion: 55,
            conexion: 45,
            realizacion: 40,
            esperanza: 30,
            aceptacion: 40,
            ansiedad: 20
        };

        return baselines[emotion] || 0;
    }

    getDominantEmotion() {
        let dominant = 'neutral';
        let maxIntensity = 0;

        const emotions = ['alegria', 'tristeza', 'miedo', 'ira', 'asco', 'sorpresa', 
                         'confianza', 'ansiedad', 'euforia', 'nostalgia'];
        emotions.forEach(emotion => {
            if ((this.state[emotion] || 0) > maxIntensity) {
                maxIntensity = this.state[emotion] || 0;
                dominant = emotion;
            }
        });

        return { emotion: dominant, intensity: maxIntensity };
    }

    getEmotionalAnalysis() {
        const dominantEmotion = this.getDominantEmotion();
        const emotionalIntensity = this.getEmotionalIntensity();
        const coherence = this.getEmotionalCoherence();
        const regulationCapacity = this.getRegulationCapacity();

        return {
            dominantEmotion,
            emotionalIntensity,
            coherence,
            regulationCapacity,
            mood: this.getMoodState(),
            stability: this.state.estabilidad || 0,
            wellbeing: this.state.bienestar || 0,
            satisfaction: this.state.satisfaccion || 0,
            connection: this.state.conexion || 0,
            complexity: this.state.complejidad || 0,
            polarity: this.state.polaridad || 0,
            hope: this.state.esperanza || 0,
            acceptance: this.state.aceptacion || 0,
            frustration: this.state.frustracion || 0,
            nostalgia: this.state.nostalgia || 0,
            riskFactors: this.getEmotionalRiskFactors()
        };
    }

    getEmotionalIntensity() {
        const primaryEmotions = ['alegria', 'tristeza', 'miedo', 'ira'];
        const totalIntensity = primaryEmotions.reduce((sum, emotion) => sum + (this.state[emotion] || 0), 0);
        return totalIntensity / primaryEmotions.length;
    }

    getEmotionalCoherence() {
        const positiveCoherence = Math.abs((this.state.valencia || 0) - ((this.state.alegria || 0) / 100));
        const activationCoherence = Math.abs((this.state.activacion || 0) - (this.getArousalLevel() / 100));
        
        return 1 - (positiveCoherence + activationCoherence) / 2;
    }

    getRegulationCapacity() {
        return ((this.state.estabilidad || 0) + (this.state.resiliencia || 0) + (this.state.regulacion || 0) * 100) / 3;
    }

    getMoodState() {
        if ((this.state.humor || 0) > 70) return 'positive';
        if ((this.state.humor || 0) < 30) return 'negative';
        return 'neutral';
    }

    getArousalLevel() {
        const arousalEmotions = ['miedo', 'ira', 'sorpresa', 'euforia'];
        return arousalEmotions.reduce((max, emotion) => Math.max(max, this.state[emotion] || 0), 0);
    }

    getEmotionalRiskFactors() {
        const risks = [];
        
        if ((this.state.ansiedad || 0) > 70) risks.push('high_anxiety');
        if ((this.state.depresion || 0) > 60) risks.push('depressive_tendency');
        if ((this.state.estabilidad || 0) < 30) risks.push('emotional_instability');
        if ((this.state.ira || 0) > 80) risks.push('anger_issues');
        if ((this.state.miedo || 0) > 75) risks.push('phobic_tendency');
        if ((this.state.bienestar || 0) < 30) risks.push('low_wellbeing');
        if ((this.state.regulacion || 0) < 0.3) risks.push('poor_regulation');
        if ((this.state.frustracion || 0) > 60) risks.push('high_frustration');
        if ((this.state.conexion || 0) < 20) risks.push('social_isolation');
        
        return risks;
    }

    handleSituation(situationType, intensity) {
        const emotionalEffects = this.getSituationEmotionalEffects(situationType, intensity);
        
        Object.keys(emotionalEffects).forEach(emotion => {
            if (this.state[emotion] !== undefined) {
                this.state[emotion] += emotionalEffects[emotion];
            }
        });

        this.emitEvent('situation_applied', {
            situation: situationType,
            intensity: intensity,
            state: { ...this.state }
        });
    }

    getSituationEmotionalEffects(situationType, intensity) {
        const effectsMap = {
            'amenaza': { 
                miedo: 40 * intensity, 
                ansiedad: 30 * intensity,
                activacion: 0.3 * intensity,
                bienestar: -10 * intensity,
                confianza: -15 * intensity
            },
            'recompensa': { 
                alegria: 35 * intensity, 
                gratitud: 20 * intensity,
                valencia: 0.4 * intensity,
                satisfaccion: 15 * intensity,
                esperanza: 10 * intensity
            },
            'alegria': { 
                alegria: 45 * intensity, 
                euforia: 15 * intensity,
                valencia: 0.5 * intensity,
                bienestar: 20 * intensity,
                esperanza: 15 * intensity
            },
            'tristeza': { 
                tristeza: 40 * intensity, 
                depresion: 20 * intensity,
                valencia: -0.4 * intensity,
                bienestar: -15 * intensity,
                nostalgia: 10 * intensity
            },
            'miedo': { 
                miedo: 50 * intensity, 
                ansiedad: 35 * intensity,
                activacion: 0.6 * intensity,
                confianza: -20 * intensity,
                estabilidad: -10 * intensity
            },
            'ira': { 
                ira: 45 * intensity, 
                activacion: 0.5 * intensity,
                valencia: -0.3 * intensity,
                estabilidad: -15 * intensity,
                frustracion: 20 * intensity
            },
            'confianza': { 
                confianza: 40 * intensity, 
                alegria: 20 * intensity,
                estabilidad: 15 * intensity,
                conexion: 25 * intensity,
                aceptacion: 15 * intensity
            },
            'sorpresa': { 
                sorpresa: 35 * intensity, 
                activacion: 0.4 * intensity,
                complejidad: 0.2 * intensity,
                valencia: 0.2 * intensity
            },
            'interaccion_social': { 
                confianza: 30 * intensity, 
                alegria: 25 * intensity,
                valencia: 0.3 * intensity,
                conexion: 35 * intensity,
                gratitud: 20 * intensity
            },
            'estres_alto': {
                miedo: 20 * intensity,
                ansiedad: 25 * intensity,
                ira: 15 * intensity,
                estabilidad: -20 * intensity,
                bienestar: -15 * intensity,
                frustracion: 15 * intensity
            },
            'recuperacion': {
                ansiedad: -20 * intensity,
                miedo: -15 * intensity,
                estabilidad: 25 * intensity,
                bienestar: 20 * intensity,
                confianza: 15 * intensity,
                esperanza: 15 * intensity
            },
            'nostalgia': {
                nostalgia: 30 * intensity,
                tristeza: 10 * intensity,
                valencia: 0.1 * intensity,
                aceptacion: 10 * intensity
            },
            'logro': {
                orgullo: 35 * intensity,
                satisfaccion: 25 * intensity,
                realizacion: 20 * intensity,
                esperanza: 15 * intensity
            },
            'fracaso': {
                frustracion: 30 * intensity,
                tristeza: 20 * intensity,
                confianza: -15 * intensity,
                orgullo: -20 * intensity
            }
        };

        return effectsMap[situationType] || {};
    }

    emergencyProtocol() {
        this.applyModulation({
            miedo: -50,
            ira: -40,
            ansiedad: -60,
            activacion: -0.5,
            estabilidad: 30,
            resiliencia: 20,
            bienestar: 20,
            regulacion: 0.3,
            frustracion: -20
        });
        
        this.emitEvent('emergency', {
            type: 'emotional_emergency',
            state: { ...this.state }
        });
        
        console.log('🚨 Protocolo de emergencia emocional activado');
    }

    restoreAfterEmergency() {
        this.applyModulation({
            estabilidad: 20,
            confianza: 15,
            bienestar: 15,
            esperanza: 20
        });
        console.log('✅ Sistema emocional restaurado después de emergencia');
    }

    applyModulation(modulation) {
        Object.keys(modulation).forEach(key => {
            if (this.state[key] !== undefined) {
                const current = this.state[key] || 0;
                const change = modulation[key];
                if (typeof current === 'number') {
                    this.state[key] = this.clamp(current + change, 0, 100);
                }
            }
        });
    }

    getState() {
        return { ...this.state };
    }

    getEmotionalMemory() {
        return [...this.emotionalMemory];
    }

    getEmotionalHistory() {
        return this.emotionalHistory.slice(-100);
    }

    getActivePatterns() {
        return [...this.activePatterns];
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    reset() {
        this.initializeState();
        this.activePatterns = [];
        this.emotionalMemory = [];
        this.emotionalHistory = [];
        this.emotionCache = {};
        console.log('🔄 Sistema emocional reiniciado');
    }

    exportData() {
        return {
            state: this.getState(),
            emotionalProfile: this.emotionalProfile,
            emotionalMemory: this.emotionalMemory.slice(-50),
            emotionalHistory: this.getEmotionalHistory(),
            activePatterns: this.getActivePatterns(),
            analysis: this.getEmotionalAnalysis()
        };
    }
}

brain.registerModule('emotional', new EmotionalSystem());
