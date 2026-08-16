// src/modules/MemorySystem.js
import { brain } from '../core/SystemCore.js';

export class MemorySystem {
    constructor() {
        this.state = {};
        this.memories = {
            episodica: [],
            semantica: new Map(),
            procedural: new Map(),
            working: [],
            emocional: [],
            espacial: new Map(),
            social: new Map(),
            procedural_motor: new Map()
        };
        this.learningAlgorithms = new Map();
        this.consolidationQueue = [];
        this.eventListeners = [];
        this.memoryStrengths = new Map();
        this.lastUpdateTime = 0;
        this.consolidationRate = 0.12;
        this.consolidationThreshold = 0.6;
        this.cache = new Map();
        this.cacheTimeout = 300000;
    }

    async initialize(characterConfig) {
        this.config = characterConfig;
        this.setupMemoryProfile();
        this.initializeState();
        this.setupLearningAlgorithms();
        this.setupConsolidationSystem();
        console.log('💾 Sistema de memoria V3.0 inicializado');
    }

    setupMemoryProfile() {
        const baseProfile = {
            retentionRate: 1.0,
            retrievalSpeed: 1.0,
            learningEfficiency: 1.0,
            workingMemory: 1.0,
            consolidationEfficiency: 1.0,
            semanticMemory: 1.0,
            episodicMemory: 1.0,
            spatialMemory: 1.0
        };

        const profiles = {
            humano: baseProfile,
            intelectual: {
                ...baseProfile,
                retentionRate: 1.3,
                retrievalSpeed: 1.2,
                learningEfficiency: 1.4,
                workingMemory: 1.2,
                consolidationEfficiency: 1.3,
                semanticMemory: 1.4
            },
            creativo: {
                ...baseProfile,
                retentionRate: 1.1,
                retrievalSpeed: 1.3,
                learningEfficiency: 1.2,
                episodicMemory: 1.3,
                consolidationEfficiency: 1.1
            },
            estratega: {
                ...baseProfile,
                retentionRate: 1.2,
                learningEfficiency: 1.3,
                consolidationEfficiency: 1.4,
                semanticMemory: 1.2
            },
            perceptivo: {
                ...baseProfile,
                retrievalSpeed: 1.4,
                spatialMemory: 1.3,
                workingMemory: 1.3
            }
        };

        this.memoryProfile = profiles[this.config.genotipo] || profiles.humano;
    }

    initializeState() {
        this.state = {
            capacidadRetencion: 80,
            velocidadRecuperacion: 75,
            capacidadTrabajo: 70,
            consolidacion: 65,
            codificacion: 70,
            almacenamiento: 75,
            recuperacion: 72,
            reconocimiento: 68,
            memoriaEpisodica: 75,
            memoriaSemantica: 80,
            memoriaProcedural: 70,
            memoriaEspacial: 65,
            memoriaSocial: 60,
            interferencia: 20,
            olvido: 15,
            confianzaMemoria: 70,
            consolidacionEficiencia: 70,
            retrievalEficiencia: 80,
            aprendizajeActivo: 50,
            memoriaEmocional: 65,
            asociacion: 60
        };

        this.memories = {
            episodica: [],
            semantica: new Map(),
            procedural: new Map(),
            working: [],
            emocional: [],
            espacial: new Map(),
            social: new Map(),
            procedural_motor: new Map()
        };

        this.parametros = {
            retencion: 0.95 * this.memoryProfile.retentionRate,
            consolidacion: 0.12 * this.memoryProfile.consolidationEfficiency,
            olvido: 0.018,
            interferencia: 0.04,
            capacidadTrabajo: 7 * this.memoryProfile.workingMemory,
            retrievalSpeed: 1.0 * this.memoryProfile.retrievalSpeed
        };

        this.applyMemoryProfile();
        this.consolidationQueue = [];
        this.cache = new Map();
    }

    applyMemoryProfile() {
        this.parametros.retencion *= this.memoryProfile.retentionRate;
        this.parametros.consolidacion *= this.memoryProfile.consolidationEfficiency;
        this.parametros.capacidadTrabajo *= this.memoryProfile.workingMemory;
        
        Object.keys(this.state).forEach(capacity => {
            if (capacity.startsWith('memoria') || capacity.startsWith('capacidad')) {
                this.state[capacity] *= this.getProfileFactorForCapacity(capacity);
            }
        });
    }

    getProfileFactorForCapacity(capacity) {
        const factorMap = {
            capacidadRetencion: this.memoryProfile.retentionRate,
            velocidadRecuperacion: this.memoryProfile.retrievalSpeed,
            capacidadTrabajo: this.memoryProfile.workingMemory,
            memoriaSemantica: this.memoryProfile.semanticMemory || 1.0,
            memoriaEpisodica: this.memoryProfile.episodicMemory || 1.0,
            memoriaSocial: this.memoryProfile.socialMemory || 1.0,
            memoriaEspacial: this.memoryProfile.spatialMemory || 1.0,
            consolidacion: this.memoryProfile.consolidationEfficiency || 1.0
        };
        
        return factorMap[capacity] || 1.0;
    }

    setupLearningAlgorithms() {
        this.learningAlgorithms.set('hebbian', {
            strength: 0.12,
            decay: 0.008,
            efficiency: 0.85,
            description: 'Aprendizaje por asociación'
        });
        
        this.learningAlgorithms.set('reinforcement', {
            strength: 0.18,
            decay: 0.015,
            efficiency: 0.75,
            description: 'Aprendizaje por refuerzo'
        });
        
        this.learningAlgorithms.set('errorCorrection', {
            strength: 0.22,
            decay: 0.01,
            efficiency: 0.9,
            description: 'Corrección de errores'
        });
        
        this.learningAlgorithms.set('episodic', {
            strength: 0.28,
            decay: 0.004,
            efficiency: 0.85,
            description: 'Codificación episódica'
        });
        
        this.learningAlgorithms.set('social', {
            strength: 0.2,
            decay: 0.008,
            efficiency: 0.8,
            description: 'Aprendizaje social'
        });
        
        this.learningAlgorithms.set('motor', {
            strength: 0.18,
            decay: 0.006,
            efficiency: 0.9,
            description: 'Aprendizaje motor'
        });
    }

    setupConsolidationSystem() {
        this.consolidationRate = 0.12 * this.memoryProfile.consolidationEfficiency;
        this.consolidationThreshold = 0.6;
    }

    onEvent(callback) {
        this.eventListeners.push(callback);
    }

    emitEvent(type, data) {
        this.eventListeners.forEach(cb => {
            try {
                cb({ type, data, module: 'memory' });
            } catch (error) {
                console.error('❌ Error en listener de memoria:', error);
            }
        });
    }

    update(input, deltaTime) {
        this.lastUpdateTime = brain.systemTime || Date.now();
        
        if (!input || !input.biochemical || !input.cognitive) return this.getState();

        // 1. Procesar memoria de trabajo
        this.processWorkingMemory(input, deltaTime);
        
        // 2. Consolidar memorias recientes
        this.consolidateMemories(deltaTime);
        
        // 3. Procesar consolidación en cola
        this.processConsolidationQueue(deltaTime);
        
        // 4. Aplicar procesos de olvido
        this.applyForgettingProcess(deltaTime);
        
        // 5. Actualizar capacidades de memoria
        this.updateMemoryCapacities(input, deltaTime);
        
        // 6. Gestionar interferencia
        this.manageInterference(deltaTime);
        
        // 7. Fortalecer conexiones asociativas
        this.strengthenAssociations(deltaTime);
        
        // 8. Aplicar homeostasis de memoria
        this.applyMemoryHomeostasis(deltaTime);

        return this.getState();
    }

    processWorkingMemory(input, deltaTime) {
        const cognitiveState = input.cognitive || {};
        const emotionalState = input.emotional || {};
        
        const workingCapacity = this.parametros.capacidadTrabajo * ((cognitiveState.memoriaTrabajo || 70) / 100);
        
        if (this.memories.working.length > workingCapacity) {
            const toConsolidate = this.memories.working.splice(0, Math.ceil(this.memories.working.length - workingCapacity));
            toConsolidate.forEach(memory => {
                if (memory.fuerza > this.consolidationThreshold) {
                    this.consolidationQueue.push(memory);
                }
            });
        }
        
        if (input.environmental && input.environmental.eventos) {
            input.environmental.eventos.forEach(evento => {
                this.addToWorkingMemory(evento, input);
            });
        }
        
        if (input.cognitive && input.cognitive.nuevos_aprendizajes) {
            input.cognitive.nuevos_aprendizajes.forEach(aprendizaje => {
                this.addToWorkingMemory(aprendizaje, input);
            });
        }
        
        this.memories.working = this.memories.working.filter(memory => {
            memory.strength *= (1 - 0.08 * deltaTime * (1 - this.parametros.retencion));
            memory.age += deltaTime;
            return memory.strength > 0.05;
        });
    }

    addToWorkingMemory(evento, context) {
        const emotionalState = context.emotional || {};
        const cognitiveState = context.cognitive || {};
        
        const memoryEntry = {
            contenido: evento,
            contexto: {
                biochemical: { ...context.biochemical },
                emotional: { ...emotionalState },
                cognitive: { ...cognitiveState },
                timestamp: brain.systemTime || Date.now()
            },
            fuerza: this.calculateInitialStrength(context),
            tipo: this.classifyMemory(evento),
            acceso: 1,
            age: 0,
            consolidationPriority: this.calculateConsolidationPriority(context),
            asociaciones: []
        };
        
        this.memories.working.push(memoryEntry);
        
        if (memoryEntry.fuerza > 0.8 || memoryEntry.consolidationPriority > 0.7) {
            this.consolidationQueue.push(memoryEntry);
        }
        
        this.emitEvent('memory_added', {
            tipo: memoryEntry.tipo,
            fuerza: memoryEntry.fuerza,
            tiempo: this.lastUpdateTime
        });
    }

    calculateInitialStrength(context) {
        let strength = 0.5;
        
        const factors = {
            emotional: this.calculateEmotionalImpact(context.emotional),
            novelty: this.calculateNovelty(context),
            relevance: this.calculateRelevance(context),
            repetition: 1.0,
            attention: ((context.cognitive?.atencion || 50) / 100),
            motivation: ((context.emotional?.alegria || 50) / 100)
        };
        
        strength *= Object.values(factors).reduce((product, factor) => product * factor, 1);
        
        return Math.min(1.0, strength);
    }

    calculateEmotionalImpact(emotionalState) {
        if (!emotionalState) return 1.0;
        
        const intenseEmotions = ['miedo', 'ira', 'alegria', 'sorpresa'];
        const emotionalIntensity = intenseEmotions.reduce((max, emotion) => {
            return Math.max(max, emotionalState[emotion] || 0);
        }, 0);
        
        return 1 + (emotionalIntensity / 100) * 0.6;
    }

    calculateNovelty(context) {
        const similarMemories = this.findSimilarMemories(context);
        const novelty = 1 - (similarMemories.length * 0.08);
        return Math.max(0.3, novelty);
    }

    calculateRelevance(context) {
        let relevance = 0.5;
        const bio = context.biochemical || {};
        const emo = context.emotional || {};
        const cog = context.cognitive || {};
        
        if (bio.cortisol > 70) relevance += 0.2;
        if (bio.dopamina > 70) relevance += 0.2;
        if (emo.miedo > 60) relevance += 0.3;
        if (emo.alegria > 60) relevance += 0.2;
        if (cog.atencion > 70) relevance += 0.1;
        
        return Math.min(1.0, relevance);
    }

    calculateConsolidationPriority(context) {
        let priority = 0.5;
        const bio = context.biochemical || {};
        const emo = context.emotional || {};
        
        if (bio.cortisol > 70) priority += 0.2;
        if (bio.dopamina > 60) priority += 0.1;
        if (emo.miedo > 60) priority += 0.2;
        if (emo.alegria > 60) priority += 0.1;
        
        return Math.min(1.0, priority);
    }

    classifyMemory(evento) {
        if (typeof evento === 'string') {
            const lower = evento.toLowerCase();
            if (lower.includes('peligro') || lower.includes('amenaza') || lower.includes('miedo')) 
                return 'amenaza';
            if (lower.includes('recompensa') || lower.includes('éxito') || lower.includes('alegria')) 
                return 'recompensa';
            if (lower.includes('social') || lower.includes('interacción') || lower.includes('conexión')) 
                return 'social';
            if (lower.includes('aprendizaje') || lower.includes('habilidad') || lower.includes('técnica')) 
                return 'aprendizaje';
            if (lower.includes('espacio') || lower.includes('ubicación') || lower.includes('lugar')) 
                return 'espacial';
            if (lower.includes('motor') || lower.includes('movimiento') || lower.includes('acción')) 
                return 'motor';
            if (lower.includes('emocional') || lower.includes('sentimiento')) 
                return 'emocional';
        }
        return 'general';
    }

    findSimilarMemories(context) {
        const results = [];
        const bio = context.biochemical || {};
        
        this.memories.episodica.forEach(memory => {
            const similarity = this.calculateMemorySimilarity(memory, context);
            if (similarity > 0.3) {
                results.push({ memory, similarity });
            }
        });
        
        return results.sort((a, b) => b.similarity - a.similarity);
    }

    calculateMemorySimilarity(memory, context) {
        let similarity = 0;
        const memoryBio = memory.contexto?.biochemical || {};
        const contextBio = context.biochemical || {};
        
        const keys = ['oxigeno', 'energia', 'cortisol', 'dopamina'];
        let matchingKeys = 0;
        let totalDiff = 0;
        
        keys.forEach(key => {
            if (memoryBio[key] !== undefined && contextBio[key] !== undefined) {
                const diff = Math.abs(memoryBio[key] - contextBio[key]) / 100;
                totalDiff += diff;
                matchingKeys++;
            }
        });
        
        if (matchingKeys > 0) {
            similarity = 1 - (totalDiff / matchingKeys);
        }
        
        const timeDiff = Math.abs((memory.contexto?.timestamp || 0) - (context.time || 0));
        const timeDecay = Math.min(1, timeDiff / 86400);
        similarity *= (1 - timeDecay * 0.3);
        
        return Math.max(0, similarity);
    }

    consolidateMemories(deltaTime) {
        this.memories.working.forEach((memory, index) => {
            const consolidationProbability = memory.fuerza * this.parametros.consolidacion * deltaTime;
            
            if (Math.random() < consolidationProbability) {
                this.consolidateToLongTerm(memory);
                this.memories.working.splice(index, 1);
            }
        });
        
        this.strengthenAccessedMemories(deltaTime);
    }

    processConsolidationQueue(deltaTime) {
        const processed = [];
        
        this.consolidationQueue.forEach((memory, index) => {
            const processedCount = memory.processedCount || 0;
            
            if (processedCount < 3) {
                memory.processedCount = processedCount + 1;
                memory.fuerza = Math.min(1, memory.fuerza + 0.08 * deltaTime);
            }
            
            if (memory.fuerza > 0.9 || processedCount >= 3) {
                this.consolidateToLongTerm(memory);
                processed.push(index);
            }
        });
        
        processed.sort((a, b) => b - a).forEach(index => {
            this.consolidationQueue.splice(index, 1);
        });
        
        if (this.consolidationQueue.length > 50) {
            this.consolidationQueue = this.consolidationQueue.slice(-30);
        }
    }

    consolidateToLongTerm(memory) {
        const longTermMemory = {
            ...memory,
            consolidado: true,
            timestampConsolidacion: brain.systemTime || Date.now(),
            fuerzaConsolidada: memory.fuerza,
            accesos: 0,
            ultimoAcceso: brain.systemTime || Date.now(),
            importancia: this.calculateImportance(memory)
        };
        
        switch(memory.tipo) {
            case 'amenaza':
            case 'recompensa':
            case 'social':
            case 'general':
                this.memories.episodica.push(longTermMemory);
                break;
            case 'aprendizaje':
                this.consolidateProceduralMemory(longTermMemory);
                break;
            case 'espacial':
                this.consolidateSpatialMemory(longTermMemory);
                break;
            case 'emocional':
                this.consolidateEmotionalMemory(longTermMemory);
                break;
            case 'motor':
                this.consolidateMotorMemory(longTermMemory);
                break;
            default:
                this.memories.episodica.push(longTermMemory);
        }
        
        this.updateSemanticMemory(longTermMemory);
        
        if (this.memories.episodica.length > 2000) {
            this.memories.episodica = this.memories.episodica
                .sort((a, b) => b.importancia - a.importancia)
                .slice(0, 1500);
        }
        
        this.emitEvent('memory_consolidated', {
            tipo: memory.tipo,
            fuerza: memory.fuerza,
            importancia: longTermMemory.importancia
        });
    }

    calculateImportance(memory) {
        let importance = memory.fuerza * 0.5;
        
        if (memory.tipo === 'amenaza') importance += 0.3;
        if (memory.tipo === 'recompensa') importance += 0.2;
        if (memory.tipo === 'social') importance += 0.15;
        if (memory.fuerza > 0.8) importance += 0.2;
        
        if (memory.contexto?.emotional) {
            const emo = memory.contexto.emotional;
            const intensity = (emo.miedo || 0) + (emo.alegria || 0) + (emo.ira || 0);
            importance += (intensity / 300) * 0.3;
        }
        
        return Math.min(1, importance);
    }

    consolidateProceduralMemory(memory) {
        const key = this.generateProceduralKey(memory.contenido);
        
        if (!this.memories.procedural.has(key)) {
            this.memories.procedural.set(key, {
                habilidad: memory.contenido,
                nivel: memory.fuerza * 100,
                practica: 1,
                ultimaPractica: brain.systemTime || Date.now(),
                eficiencia: memory.fuerza,
                complejidad: 0.5,
                importancia: memory.importancia
            });
        } else {
            const existing = this.memories.procedural.get(key);
            existing.nivel = (existing.nivel * existing.practica + memory.fuerza * 100) / (existing.practica + 1);
            existing.practica++;
            existing.ultimaPractica = brain.systemTime || Date.now();
            existing.eficiencia = Math.min(1.0, existing.eficiencia + 0.04);
            existing.importancia = Math.max(existing.importancia, memory.importancia);
        }
    }

    consolidateSpatialMemory(memory) {
        const key = this.generateSpatialKey(memory.contenido);
        
        if (!this.memories.espacial.has(key)) {
            this.memories.espacial.set(key, {
                ubicacion: memory.contenido,
                coordenadas: memory.coordenadas || { x: 0, y: 0, z: 0 },
                precision: memory.fuerza,
                ultimoAcceso: brain.systemTime || Date.now(),
                importancia: memory.importancia
            });
        }
    }

    consolidateEmotionalMemory(memory) {
        const key = this.generateEmotionalKey(memory.contenido);
        
        const existing = this.memories.emocional.find(m => m.key === key);
        if (!existing) {
            this.memories.emocional.push({
                key: key,
                ...memory,
                emociones: memory.contexto?.emotional || {},
                intensidad: memory.fuerza,
                ultimoAcceso: brain.systemTime || Date.now()
            });
        } else {
            existing.intensidad = (existing.intensidad + memory.fuerza) / 2;
            existing.ultimoAcceso = brain.systemTime || Date.now();
            existing.importancia = Math.max(existing.importancia, memory.importancia);
        }
        
        if (this.memories.emocional.length > 500) {
            this.memories.emocional = this.memories.emocional
                .sort((a, b) => b.importancia - a.importancia)
                .slice(0, 400);
        }
    }

    consolidateMotorMemory(memory) {
        const key = this.generateMotorKey(memory.contenido);
        
        if (!this.memories.procedural_motor.has(key)) {
            this.memories.procedural_motor.set(key, {
                habilidad: memory.contenido,
                nivel: memory.fuerza * 100,
                practica: 1,
                ultimaPractica: brain.systemTime || Date.now(),
                precision: memory.fuerza,
                fluidez: memory.fuerza * 0.8,
                importancia: memory.importancia
            });
        } else {
            const existing = this.memories.procedural_motor.get(key);
            existing.nivel = (existing.nivel * existing.practica + memory.fuerza * 100) / (existing.practica + 1);
            existing.practica++;
            existing.ultimaPractica = brain.systemTime || Date.now();
            existing.precision = Math.min(1, existing.precision + 0.04);
            existing.fluidez = Math.min(1, existing.fluidez + 0.03);
        }
    }

    updateSemanticMemory(memory) {
        const contenido = memory.contenido;
        if (typeof contenido === 'string' && contenido.length > 10) {
            const palabras = contenido.toLowerCase().split(/\s+/);
            palabras.forEach(palabra => {
                if (palabra.length > 3) {
                    if (!this.memories.semantica.has(palabra)) {
                        this.memories.semantica.set(palabra, {
                            concepto: palabra,
                            fuerza: 0.3,
                            contextos: 1,
                            ultimaActualizacion: brain.systemTime || Date.now()
                        });
                    } else {
                        const sem = this.memories.semantica.get(palabra);
                        sem.fuerza = Math.min(1, sem.fuerza + 0.02);
                        sem.contextos++;
                        sem.ultimaActualizacion = brain.systemTime || Date.now();
                    }
                }
            });
        }
    }

    generateProceduralKey(contenido) {
        return contenido.toString().substring(0, 50).toLowerCase().replace(/\s+/g, '_');
    }

    generateSpatialKey(contenido) {
        return contenido.toString().toLowerCase().replace(/\s+/g, '_');
    }

    generateEmotionalKey(contenido) {
        return contenido.toString().substring(0, 30).toLowerCase().replace(/\s+/g, '_');
    }

    generateMotorKey(contenido) {
        return contenido.toString().toLowerCase().replace(/\s+/g, '_');
    }

    strengthenAccessedMemories(deltaTime) {
        this.memories.episodica.forEach(memory => {
            if (memory.acceso > 0) {
                const strengthening = memory.acceso * 0.08 * deltaTime * this.parametros.retencion;
                memory.fuerzaConsolidada = Math.min(1.0, memory.fuerzaConsolidada + strengthening);
                memory.acceso = 0;
            }
        });
    }

    strengthenAssociations(deltaTime) {
        const memories = this.memories.episodica;
        for (let i = 0; i < memories.length - 1; i++) {
            for (let j = i + 1; j < memories.length; j++) {
                const similarity = this.calculateMemorySimilarity(memories[i], memories[j]);
                if (similarity > 0.5) {
                    const associationStrength = similarity * 0.08 * deltaTime;
                    this.state.asociacion = Math.min(100, (this.state.asociacion || 0) + associationStrength * 10);
                    break;
                }
            }
        }
    }

    applyForgettingProcess(deltaTime) {
        const forgetRate = this.parametros.olvido * (1 - this.memoryProfile.retentionRate / 2);
        
        this.memories.episodica = this.memories.episodica.filter(memory => {
            const timeSinceConsolidation = (brain.systemTime || Date.now()) - memory.timestampConsolidacion;
            const survivalProbability = Math.exp(-forgetRate * timeSinceConsolidation / 86400);
            const importanceBoost = 1 + (memory.importancia || 0) * 0.5;
            
            return Math.random() < survivalProbability * importanceBoost;
        });
        
        this.memories.working = this.memories.working.filter(memory => {
            memory.fuerza *= (1 - forgetRate * deltaTime * 0.5);
            return memory.fuerza > 0.05;
        });
        
        this.memories.semantica.forEach((value, key) => {
            const timeSinceUpdate = (brain.systemTime || Date.now()) - value.ultimaActualizacion;
            if (timeSinceUpdate > 86400 * 30) {
                value.fuerza *= (1 - forgetRate * deltaTime * 0.01);
                if (value.fuerza < 0.1) {
                    this.memories.semantica.delete(key);
                }
            }
        });
    }

    updateMemoryCapacities(input, deltaTime) {
        const bioState = input.biochemical || {};
        const cognitiveState = input.cognitive || {};
        
        const modificationFactors = {
            oxigeno: (bioState.oxigeno || 50) / 100,
            energia: (bioState.energia || 50) / 100,
            atencion: (cognitiveState.atencion || 50) / 100,
            estres: 1 - ((bioState.cortisol || 0) / 150),
            dopamina: (bioState.dopamina || 50) / 100,
            serotonina: (bioState.serotonina || 50) / 100
        };
        
        Object.keys(this.state).forEach(capacity => {
            if (capacity !== 'interferencia' && capacity !== 'olvido' && 
                capacity !== 'asociacion' && !capacity.startsWith('memoria')) {
                const baseValue = this.getBaseCapacity(capacity);
                const modFactor = Object.values(modificationFactors).reduce((product, factor) => product * factor, 1);
                this.state[capacity] = baseValue * (0.4 + modFactor * 0.6);
                this.state[capacity] = this.clamp(this.state[capacity], 0, 100);
            }
        });
        
        this.state.interferencia = (cognitiveState.carga || 0) * 0.4;
        this.state.olvido = ((bioState.cortisol || 0) + (cognitiveState.fatiga || 0)) * 0.08;
        this.state.confianzaMemoria = Math.min(100, (this.state.confianzaMemoria || 0) + 1.5 * deltaTime);
    }

    getBaseCapacity(capacity) {
        const baseCapacities = {
            capacidadRetencion: 80,
            velocidadRecuperacion: 75,
            capacidadTrabajo: 70,
            consolidacion: 65,
            codificacion: 70,
            almacenamiento: 75,
            recuperacion: 72,
            reconocimiento: 68,
            consolidacionEficiencia: 70,
            retrievalEficiencia: 80,
            aprendizajeActivo: 50,
            confianzaMemoria: 70,
            memoriaEmocional: 65
        };
        
        return baseCapacities[capacity] || 50;
    }

    manageInterference(deltaTime) {
        const interferenceEffect = (this.state.interferencia || 0) / 100;
        this.state.confianzaMemoria -= interferenceEffect * 4 * deltaTime;
        
        this.state.interferencia = Math.max(0, (this.state.interferencia || 0) - 2.5 * deltaTime);
        this.state.confianzaMemoria = Math.min(100, (this.state.confianzaMemoria || 0) + 1.5 * deltaTime);
    }

    applyMemoryHomeostasis(deltaTime) {
        Object.keys(this.state).forEach(capacity => {
            if (typeof this.state[capacity] === 'number') {
                this.state[capacity] = this.clamp(this.state[capacity], 0, 100);
            }
        });
        
        this.state.consolidacionEficiencia = this.clamp(
            (this.state.consolidacionEficiencia || 0) + 0.4 * deltaTime, 0, 100
        );
        this.state.retrievalEficiencia = this.clamp(
            (this.state.retrievalEficiencia || 0) + 0.4 * deltaTime, 0, 100
        );
    }

    retrieveMemory(query, context) {
        const results = {
            episodica: this.searchEpisodicMemory(query, context),
            semantica: this.searchSemanticMemory(query),
            procedural: this.searchProceduralMemory(query),
            working: this.searchWorkingMemory(query),
            emocional: this.searchEmotionalMemory(query),
            espacial: this.searchSpatialMemory(query),
            motor: this.searchMotorMemory(query)
        };
        
        const confidence = this.calculateRetrievalConfidence(results, context);
        
        this.recordMemoryAccess(results);
        
        return {
            memories: results,
            confidence: confidence,
            totalMatches: Object.values(results).flat().length,
            retrievalTime: this.calculateRetrievalTime()
        };
    }

    searchEpisodicMemory(query, context) {
        return this.memories.episodica.filter(memory => {
            const contentMatch = this.memoryContentMatch(memory.contenido, query);
            const contextMatch = this.contextMatch(memory.contexto, context);
            const relevance = contentMatch * 0.6 + contextMatch * 0.4;
            
            return relevance > 0.25;
        }).sort((a, b) => {
            const scoreA = (a.fuerzaConsolidada || 0) * this.calculateRelevance(a.contexto, context) * (1 + (a.importancia || 0));
            const scoreB = (b.fuerzaConsolidada || 0) * this.calculateRelevance(b.contexto, context) * (1 + (b.importancia || 0));
            return scoreB - scoreA;
        }).slice(0, 5);
    }

    searchSemanticMemory(query) {
        const results = [];
        const queryStr = query.toString().toLowerCase();
        const queryWords = queryStr.split(/\s+/);
        
        this.memories.semantica.forEach((knowledge, concept) => {
            const conceptStr = concept.toLowerCase();
            let matchScore = 0;
            
            queryWords.forEach(word => {
                if (conceptStr.includes(word)) {
                    matchScore += 1 / queryWords.length;
                }
            });
            
            if (matchScore > 0.3) {
                results.push({
                    concepto: concept,
                    conocimiento: knowledge,
                    tipo: 'semantico',
                    fuerza: knowledge.fuerza,
                    match: matchScore
                });
            }
        });
        
        return results.sort((a, b) => b.fuerza - a.fuerza).slice(0, 5);
    }

    searchProceduralMemory(query) {
        const results = [];
        const queryStr = query.toString().toLowerCase();
        
        this.memories.procedural.forEach((skill, key) => {
            if (key.toLowerCase().includes(queryStr) || 
                skill.habilidad.toString().toLowerCase().includes(queryStr)) {
                results.push({
                    habilidad: skill.habilidad,
                    nivel: skill.nivel,
                    eficiencia: skill.eficiencia,
                    practica: skill.practica,
                    tipo: 'procedural'
                });
            }
        });
        
        return results.slice(0, 5);
    }

    searchWorkingMemory(query) {
        return this.memories.working.filter(memory => {
            return this.memoryContentMatch(memory.contenido, query) > 0.3;
        }).slice(0, 3);
    }

    searchEmotionalMemory(query) {
        const queryStr = query.toString().toLowerCase();
        const emotionKeywords = ['feliz', 'triste', 'miedo', 'ira', 'asco', 'sorpresa', 'alegria', 'tristeza'];
        
        const hasEmotionKeyword = emotionKeywords.some(keyword => queryStr.includes(keyword));
        if (!hasEmotionKeyword) return [];
        
        return this.memories.emocional.filter(memory => {
            const contentMatch = this.memoryContentMatch(memory.contenido, query);
            return contentMatch > 0.3;
        }).slice(0, 3);
    }

    searchSpatialMemory(query) {
        const queryStr = query.toString().toLowerCase();
        const spatialKeywords = ['donde', 'ubicación', 'lugar', 'espacio', 'posicion'];
        
        const hasSpatialKeyword = spatialKeywords.some(keyword => queryStr.includes(keyword));
        if (!hasSpatialKeyword) return [];
        
        const results = [];
        this.memories.espacial.forEach((location, key) => {
            if (key.toLowerCase().includes(queryStr) || 
                location.ubicacion.toString().toLowerCase().includes(queryStr)) {
                results.push({
                    ubicacion: location.ubicacion,
                    coordenadas: location.coordenadas,
                    precision: location.precision,
                    tipo: 'espacial'
                });
            }
        });
        
        return results.slice(0, 3);
    }

    searchMotorMemory(query) {
        const queryStr = query.toString().toLowerCase();
        const motorKeywords = ['movimiento', 'acción', 'motor', 'habilidad', 'técnica'];
        
        const hasMotorKeyword = motorKeywords.some(keyword => queryStr.includes(keyword));
        if (!hasMotorKeyword) return [];
        
        const results = [];
        this.memories.procedural_motor.forEach((skill, key) => {
            if (key.toLowerCase().includes(queryStr) || 
                skill.habilidad.toString().toLowerCase().includes(queryStr)) {
                results.push({
                    habilidad: skill.habilidad,
                    nivel: skill.nivel,
                    precision: skill.precision,
                    fluidez: skill.fluidez,
                    tipo: 'motor'
                });
            }
        });
        
        return results.slice(0, 3);
    }

    memoryContentMatch(contenido, query) {
        const contentStr = contenido.toString().toLowerCase();
        const queryStr = query.toString().toLowerCase();
        
        if (contentStr.includes(queryStr)) return 1.0;
        
        const queryWords = queryStr.split(/\s+/);
        const contentWords = contentStr.split(/\s+/);
        
        let matches = 0;
        queryWords.forEach(qWord => {
            if (contentWords.some(cWord => cWord.includes(qWord))) {
                matches++;
            }
        });
        
        return matches / queryWords.length;
    }

    contextMatch(memoryContext, currentContext) {
        let similarity = 0;
        let count = 0;
        
        if (memoryContext?.biochemical && currentContext?.biochemical) {
            const bioSim = this.calculateContextSimilarity(memoryContext.biochemical, currentContext.biochemical);
            similarity += bioSim;
            count++;
        }
        
        if (memoryContext?.emotional && currentContext?.emotional) {
            const emoSim = this.calculateContextSimilarity(memoryContext.emotional, currentContext.emotional);
            similarity += emoSim;
            count++;
        }
        
        if (memoryContext?.cognitive && currentContext?.cognitive) {
            const cogSim = this.calculateContextSimilarity(memoryContext.cognitive, currentContext.cognitive);
            similarity += cogSim;
            count++;
        }
        
        return count > 0 ? similarity / count : 0;
    }

    calculateContextSimilarity(contextA, contextB) {
        const keys = Object.keys(contextA).filter(key => contextB[key] !== undefined);
        if (keys.length === 0) return 0;
        
        const differences = keys.map(key => {
            const a = typeof contextA[key] === 'number' ? contextA[key] : 0;
            const b = typeof contextB[key] === 'number' ? contextB[key] : 0;
            return Math.abs(a - b) / 100;
        });
        
        const averageDifference = differences.reduce((sum, diff) => sum + diff, 0) / differences.length;
        return 1 - averageDifference;
    }

    calculateRetrievalConfidence(results, context) {
        let totalConfidence = 0;
        let memoryCount = 0;
        
        Object.values(results).forEach(memories => {
            memories.forEach(memory => {
                let memoryConfidence = memory.fuerzaConsolidada || memory.fuerza || 0.5;
                
                if (memory.contexto) {
                    const relevance = this.calculateRelevance(memory.contexto, context);
                    memoryConfidence *= relevance;
                }
                
                memoryConfidence *= ((this.state.confianzaMemoria || 0) / 100);
                memoryConfidence *= ((this.state.retrievalEficiencia || 0) / 100);
                
                totalConfidence += memoryConfidence;
                memoryCount++;
            });
        });
        
        return memoryCount > 0 ? totalConfidence / memoryCount : 0;
    }

    calculateRetrievalTime() {
        const baseTime = 100;
        const speed = this.parametros.retrievalSpeed || 1.0;
        const efficiency = (this.state.retrievalEficiencia || 0) / 100;
        
        return baseTime / (speed * efficiency);
    }

    recordMemoryAccess(results) {
        Object.values(results).forEach(memories => {
            memories.forEach(memory => {
                if (memory.acceso !== undefined) {
                    memory.acceso++;
                }
                if (memory.ultimoAcceso !== undefined) {
                    memory.ultimoAcceso = brain.systemTime || Date.now();
                }
            });
        });
    }

    learnSkill(skill, context, success) {
        const learningRate = this.calculateLearningRate(context);
        const strengthGain = success ? learningRate : learningRate * 0.3;
        
        const memory = {
            contenido: skill,
            fuerza: strengthGain,
            contexto: context,
            tipo: 'aprendizaje',
            consolidado: false,
            importancia: success ? 0.8 : 0.3
        };
        
        this.consolidateToLongTerm(memory);
        
        this.emitEvent('skill_learned', {
            skill: skill,
            success: success,
            gain: strengthGain
        });
        
        return {
            skill: skill,
            strengthGain: strengthGain,
            newLevel: this.getSkillLevel(skill)
        };
    }

    calculateLearningRate(context) {
        const baseRate = 0.12 * this.memoryProfile.learningEfficiency;
        const factors = {
            atencion: ((context.cognitive?.atencion || 50) / 100),
            motivacion: ((context.biochemical?.dopamina || 50) / 100),
            estres: 1 - ((context.biochemical?.cortisol || 0) / 200),
            energia: ((context.biochemical?.energia || 50) / 100)
        };
        
        return baseRate * Object.values(factors).reduce((product, factor) => product * factor, 1);
    }

    getSkillLevel(skill) {
        const key = this.generateProceduralKey(skill);
        const proceduralMemory = this.memories.procedural.get(key);
        return proceduralMemory ? proceduralMemory.nivel : 0;
    }

    handleSituation(situationType, intensity) {
        const memoryEffects = this.getSituationMemoryEffects(situationType, intensity);
        
        Object.keys(memoryEffects).forEach(capacity => {
            if (this.state[capacity] !== undefined) {
                this.state[capacity] += memoryEffects[capacity];
            }
        });
    }

    getSituationMemoryEffects(situationType, intensity) {
        const effectsMap = {
            'estres_alto': { 
                consolidacion: -18 * intensity,
                recuperacion: -22 * intensity,
                confianzaMemoria: -25 * intensity,
                interferencia: 18 * intensity
            },
            'aprendizaje_intenso': { 
                consolidacion: 15 * intensity,
                capacidadRetencion: 10 * intensity,
                interferencia: 18 * intensity,
                aprendizajeActivo: 25 * intensity
            },
            'descanso': { 
                consolidacion: 10 * intensity,
                confianzaMemoria: 15 * intensity,
                interferencia: -22 * intensity,
                recuperacion: 20 * intensity
            },
            'recompensa': {
                consolidacion: 15 * intensity,
                confianzaMemoria: 10 * intensity,
                aprendizajeActivo: 20 * intensity
            },
            'insight': {
                consolidacion: 20 * intensity,
                confianzaMemoria: 15 * intensity,
                retrievalEficiencia: 10 * intensity
            }
        };

        return effectsMap[situationType] || {};
    }

    emergencyProtocol() {
        this.applyModulation({
            consolidacion: 20,
            confianzaMemoria: 15,
            interferencia: -30,
            recuperacion: 25,
            consolidacionEficiencia: 15
        });
        
        this.memories.episodica = this.memories.episodica
            .filter(memory => memory.importancia > 0.5 || memory.fuerzaConsolidada > 0.7);
    }

    restoreAfterEmergency() {
        this.applyModulation({
            confianzaMemoria: 10,
            retrievalEficiencia: 10,
            consolidacionEficiencia: 10
        });
        console.log('✅ Sistema de memoria restaurado después de emergencia');
    }

    applyModulation(modulation) {
        Object.keys(modulation).forEach(key => {
            if (this.state[key] !== undefined) {
                this.state[key] += modulation[key];
            }
        });
    }

    getState() {
        return {
            ...this.state,
            episodica: this.memories.episodica.length,
            procedural: this.memories.procedural.size,
            working: this.memories.working.length,
            emocional: this.memories.emocional.length,
            espacial: this.memories.espacial.size,
            social: this.memories.social.size,
            semantic: this.memories.semantica.size,
            motor: this.memories.procedural_motor.size,
            consolidationQueue: this.consolidationQueue.length,
            parametros: { ...this.parametros }
        };
    }

    getMemoryStats() {
        return {
            totalEpisodic: this.memories.episodica.length,
            totalProcedural: this.memories.procedural.size,
            totalSemantic: this.memories.semantica.size,
            workingUsage: this.memories.working.length,
            averageStrength: this.calculateAverageMemoryStrength(),
            retentionEfficiency: this.state.capacidadRetencion || 0,
            consolidationRate: this.parametros.consolidacion,
            retrievalSpeed: this.parametros.retrievalSpeed,
            memoryTypes: {
                episodica: this.memories.episodica.length,
                procedural: this.memories.procedural.size,
                semantica: this.memories.semantica.size,
                emocional: this.memories.emocional.length,
                espacial: this.memories.espacial.size,
                motor: this.memories.procedural_motor.size
            }
        };
    }

    calculateAverageMemoryStrength() {
        const episodicStrength = this.memories.episodica.reduce((sum, memory) => sum + (memory.fuerzaConsolidada || 0), 0);
        const proceduralStrength = Array.from(this.memories.procedural.values()).reduce((sum, skill) => sum + (skill.nivel || 0), 0);
        
        const totalMemories = this.memories.episodica.length + this.memories.procedural.size;
        return totalMemories > 0 ? (episodicStrength + proceduralStrength) / totalMemories / 100 : 0;
    }

    getMemoriesByType(type) {
        const typeMap = {
            'episodica': this.memories.episodica,
            'procedural': this.memories.procedural,
            'semantica': this.memories.semantica,
            'working': this.memories.working,
            'emocional': this.memories.emocional,
            'espacial': this.memories.espacial,
            'motor': this.memories.procedural_motor
        };
        
        return typeMap[type] || [];
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    reset() {
        this.initializeState();
        this.consolidationQueue = [];
        this.memoryStrengths = new Map();
        this.cache = new Map();
        console.log('🔄 Sistema de memoria reiniciado');
    }

    exportData() {
        return {
            state: this.getState(),
            memoryProfile: this.memoryProfile,
            memoryStats: this.getMemoryStats(),
            parameters: this.parametros,
            learningAlgorithms: Array.from(this.learningAlgorithms.entries()),
            memories: {
                episodica: this.memories.episodica.slice(-50),
                procedural: Array.from(this.memories.procedural.entries()).slice(0, 30),
                semantica: Array.from(this.memories.semantica.entries()).slice(0, 30),
                working: this.memories.working.slice(-10),
                emocional: this.memories.emocional.slice(-20),
                espacial: Array.from(this.memories.espacial.entries()).slice(0, 20)
            },
            consolidationQueue: this.consolidationQueue.slice(-20)
        };
    }
}

brain.registerModule('memory', new MemorySystem());
