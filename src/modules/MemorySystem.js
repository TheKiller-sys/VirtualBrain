// src/modules/MemorySystem.js
import { systemCore } from '../core/SystemCore.js';

export class MemorySystem {
    constructor() {
        this.state = {};
        this.config = {};
        this.memories = {
            episodica: [],
            semantica: new Map(),
            procedural: new Map(),
            working: [],
            emocional: [],
            espacial: new Map(),
            social: new Map(),
            motor: new Map()
        };
        this.consolidationQueue = [];
        this.eventListeners = [];
        this.lastUpdateTime = 0;
        this.memoryProfile = {};
        this.parametros = {};
    }

    async initialize(characterConfig) {
        this.config = characterConfig || { genotipo: 'humano' };
        this.setupMemoryProfile();
        this.initializeState();
        systemCore.logSystem('Sistema de memoria V4 inicializado');
    }

    setupMemoryProfile() {
        const g = this.config?.genotipo || 'humano';
        const profiles = {
            humano:     { retentionRate: 1.0, retrievalSpeed: 1.0, learningEfficiency: 1.0, workingMemory: 1.0, consolidationEfficiency: 1.0, semanticMemory: 1.0, episodicMemory: 1.0, spatialMemory: 1.0, socialMemory: 1.0, motorMemory: 1.0 },
            resiliente: { retentionRate: 1.2, retrievalSpeed: 1.1, learningEfficiency: 1.3, workingMemory: 1.1, consolidationEfficiency: 1.2, semanticMemory: 1.2, episodicMemory: 1.2, socialMemory: 1.1, motorMemory: 1.1 },
            vulnerable: { retentionRate: 0.7, retrievalSpeed: 0.8, learningEfficiency: 0.6, workingMemory: 0.8, consolidationEfficiency: 0.7, semanticMemory: 0.8, episodicMemory: 0.8, socialMemory: 0.8, motorMemory: 0.8 },
            audaz:      { retentionRate: 1.0, retrievalSpeed: 1.3, learningEfficiency: 1.1, workingMemory: 1.2, consolidationEfficiency: 1.0, episodicMemory: 1.3, motorMemory: 1.4 },
            intelectual:{ retentionRate: 1.5, retrievalSpeed: 1.4, learningEfficiency: 1.6, workingMemory: 1.3, consolidationEfficiency: 1.5, semanticMemory: 1.5, episodicMemory: 1.3, motorMemory: 0.9 },
            social:     { retentionRate: 1.1, retrievalSpeed: 1.2, learningEfficiency: 1.2, workingMemory: 1.1, consolidationEfficiency: 1.1, semanticMemory: 1.1, socialMemory: 1.6, episodicMemory: 1.1 }
        };
        this.memoryProfile = profiles[g] || profiles.humano;
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

        this.parametros = {
            retencion: 0.95 * this.memoryProfile.retentionRate,
            consolidacion: 0.12 * this.memoryProfile.consolidationEfficiency,
            olvido: 0.018,
            interferencia: 0.04,
            capacidadTrabajo: 7 * this.memoryProfile.workingMemory,
            retrievalSpeed: 1.0 * this.memoryProfile.retrievalSpeed
        };

        this.memories = {
            episodica: [], semantica: new Map(), procedural: new Map(), working: [],
            emocional: [], espacial: new Map(), social: new Map(), motor: new Map()
        };
        this.consolidationQueue = [];
    }

    onEvent(cb) { this.eventListeners.push(cb); }
    emitEvent(type, data) {
        this.eventListeners.forEach(cb => {
            try { cb({ type, data, module: 'memory' }); }
            catch (err) { console.error('❌ mem listener:', err); }
        });
    }

    update(input, deltaTime) {
        this.lastUpdateTime = systemCore.systemTime;
        if (!input || !input.biochemical || !input.cognitive) return this.getState();

        this.processWorkingMemory(input, deltaTime);
        this.consolidateMemories(deltaTime);
        this.processConsolidationQueue(deltaTime);
        this.applyForgettingProcess(deltaTime);
        this.updateMemoryCapacities(input, deltaTime);
        this.manageInterference(deltaTime);
        this.strengthenAssociations(deltaTime);
        this.applyMemoryHomeostasis(deltaTime);

        return this.getState();
    }

    processWorkingMemory(input, dt) {
        const workingCapacity = this.parametros.capacidadTrabajo * ((input.cognitive.memoriaTrabajo || 70) / 100);
        if (this.memories.working.length > workingCapacity) {
            const toConsolidate = this.memories.working.splice(0, Math.ceil(this.memories.working.length - workingCapacity));
            toConsolidate.forEach(m => {
                if (m.fuerza > 0.6) this.consolidationQueue.push(m);
            });
        }

        if (input.environmental && input.environmental.eventos) {
            input.environmental.eventos.forEach(e => this.addToWorkingMemory(e, input));
        }

        this.memories.working = this.memories.working.filter(m => {
            m.strength *= (1 - 0.08 * dt * (1 - this.parametros.retencion));
            m.age += dt;
            return m.strength > 0.05;
        });
    }

    addToWorkingMemory(evento, context) {
        const entry = {
            contenido: evento,
            contexto: {
                biochemical: { ...context.biochemical },
                emotional: { ...context.emotional },
                cognitive: { ...context.cognitive },
                timestamp: Date.now()
            },
            fuerza: this.calculateInitialStrength(context),
            tipo: this.classifyMemory(evento),
            acceso: 1,
            age: 0,
            asociaciones: []
        };

        this.memories.working.push(entry);
        if (entry.fuerza > 0.8) this.consolidationQueue.push(entry);
        this.emitEvent('memory_added', { tipo: entry.tipo, fuerza: entry.fuerza });
    }

    calculateInitialStrength(context) {
        let s = 0.5;
        s *= this.calculateEmotionalImpact(context.emotional);
        s *= ((context.cognitive?.atencion || 50) / 100);
        s *= ((context.emotional?.alegria || 50) / 100);
        return Math.min(1.0, s);
    }

    calculateEmotionalImpact(emo) {
        if (!emo) return 1.0;
        const intense = ['miedo', 'ira', 'alegria', 'sorpresa'];
        const val = intense.reduce((max, e) => Math.max(max, emo[e] || 0), 0);
        return 1 + (val / 100) * 0.6;
    }

    classifyMemory(evento) {
        if (typeof evento !== 'string') return 'general';
        const l = evento.toLowerCase();
        if (l.includes('peligro') || l.includes('amenaza') || l.includes('miedo')) return 'amenaza';
        if (l.includes('recompensa') || l.includes('éxito') || l.includes('alegria')) return 'recompensa';
        if (l.includes('social') || l.includes('conexión')) return 'social';
        if (l.includes('aprend') || l.includes('habilidad')) return 'aprendizaje';
        if (l.includes('espacio') || l.includes('lugar')) return 'espacial';
        if (l.includes('motor') || l.includes('movimiento')) return 'motor';
        if (l.includes('emocional') || l.includes('sentimiento')) return 'emocional';
        return 'general';
    }

    consolidateMemories(dt) {
        this.memories.working.forEach((m, idx) => {
            const prob = m.fuerza * this.parametros.consolidacion * dt;
            if (Math.random() < prob) {
                this.consolidateToLongTerm(m);
                this.memories.working.splice(idx, 1);
            }
        });
        this.strengthenAccessedMemories(dt);
    }

    processConsolidationQueue(dt) {
        const processed = [];
        this.consolidationQueue.forEach((m, i) => {
            const pc = m.processedCount || 0;
            if (pc < 3) { m.processedCount = pc + 1; m.fuerza = Math.min(1, m.fuerza + 0.08 * dt); }
            if (m.fuerza > 0.9 || pc >= 3) {
                this.consolidateToLongTerm(m);
                processed.push(i);
            }
        });
        processed.sort((a, b) => b - a).forEach(i => this.consolidationQueue.splice(i, 1));
        if (this.consolidationQueue.length > 50) this.consolidationQueue = this.consolidationQueue.slice(-30);
    }

    /**
     * FIX: todos los timestamps persistidos usan Date.now() (ms reales).
     * systemCore.systemTime solo se usa para lógica interna.
     */
    consolidateToLongTerm(memory) {
        const now = Date.now();
        const ltm = {
            ...memory,
            consolidado: true,
            timestampConsolidacion: now,
            fuerzaConsolidada: memory.fuerza,
            accesos: 0,
            ultimoAcceso: now,
            importancia: this.calculateImportance(memory)
        };

        switch (memory.tipo) {
            case 'aprendizaje': this.consolidateProceduralMemory(ltm); break;
            case 'espacial': this.consolidateSpatialMemory(ltm); break;
            case 'emocional': this.consolidateEmotionalMemory(ltm); break;
            case 'motor': this.consolidateMotorMemory(ltm); break;
            default: this.memories.episodica.push(ltm);
        }

        this.updateSemanticMemory(ltm);
        if (this.memories.episodica.length > 2000) {
            this.memories.episodica = this.memories.episodica.sort((a, b) => b.importancia - a.importancia).slice(0, 1500);
        }

        if (systemCore.database?.isInitialized) {
            systemCore.database.saveMemory({
                contenido: typeof memory.contenido === 'string' ? memory.contenido : JSON.stringify(memory.contenido),
                contexto: JSON.stringify(memory.contexto || {}).substring(0, 500),
                fuerza: memory.fuerza,
                importancia: ltm.importancia,
                emocion_asociada: memory.contexto?.emotional?.dominante || 'neutral',
                consolidada: true
            }).catch(() => {});
        }

        this.emitEvent('memory_consolidated', { tipo: memory.tipo, fuerza: memory.fuerza, importancia: ltm.importancia });
    }

    calculateImportance(memory) {
        let imp = memory.fuerza * 0.5;
        if (memory.tipo === 'amenaza') imp += 0.3;
        if (memory.tipo === 'recompensa') imp += 0.2;
        if (memory.tipo === 'social') imp += 0.15;
        if (memory.fuerza > 0.8) imp += 0.2;
        return Math.min(1, imp);
    }

    consolidateProceduralMemory(memory) {
        const key = String(memory.contenido).substring(0, 50).toLowerCase().replace(/\s+/g, '_');
        const existing = this.memories.procedural.get(key);
        if (!existing) {
            this.memories.procedural.set(key, {
                habilidad: memory.contenido,
                nivel: memory.fuerza * 100,
                practicas: 1,
                eficiencia: memory.fuerza,
                complejidad: 0.5,
                importancia: memory.importancia
            });
        } else {
            existing.nivel = (existing.nivel * existing.practicas + memory.fuerza * 100) / (existing.practicas + 1);
            existing.practicas++;
            existing.eficiencia = Math.min(1.0, existing.eficiencia + 0.04);
            existing.importancia = Math.max(existing.importancia, memory.importancia);
        }

        if (systemCore.database?.isInitialized) {
            const skill = this.memories.procedural.get(key);
            systemCore.database.saveSkill({
                habilidad: key,
                nivel: skill.nivel,
                practicas: skill.practicas,
                eficiencia: skill.eficiencia,
                complejidad: 5,
                importancia: memory.importancia
            }).catch(() => {});
        }
    }

    consolidateSpatialMemory(memory) {
        const key = String(memory.contenido).toLowerCase().replace(/\s+/g, '_');
        if (!this.memories.espacial.has(key)) {
            this.memories.espacial.set(key, {
                ubicacion: memory.contenido,
                precision: memory.fuerza,
                ultimoAcceso: Date.now(),
                importancia: memory.importancia
            });
        }
    }

    consolidateEmotionalMemory(memory) {
        const key = String(memory.contenido).substring(0, 30).toLowerCase().replace(/\s+/g, '_');
        const existing = this.memories.emocional.find(m => m.key === key);
        if (!existing) {
            this.memories.emocional.push({ key, ...memory, intensidad: memory.fuerza, ultimoAcceso: Date.now() });
        } else {
            existing.intensidad = (existing.intensidad + memory.fuerza) / 2;
            existing.importancia = Math.max(existing.importancia, memory.importancia);
        }
        if (this.memories.emocional.length > 500) {
            this.memories.emocional = this.memories.emocional.sort((a, b) => b.importancia - a.importancia).slice(0, 400);
        }
    }

    consolidateMotorMemory(memory) {
        const key = String(memory.contenido).toLowerCase().replace(/\s+/g, '_');
        const existing = this.memories.motor.get(key);
        if (!existing) {
            this.memories.motor.set(key, {
                habilidad: memory.contenido,
                nivel: memory.fuerza * 100,
                practicas: 1,
                precision: memory.fuerza,
                fluidez: memory.fuerza * 0.8,
                importancia: memory.importancia
            });
        } else {
            existing.nivel = (existing.nivel * existing.practicas + memory.fuerza * 100) / (existing.practicas + 1);
            existing.practicas++;
            existing.precision = Math.min(1, existing.precision + 0.04);
            existing.fluidez = Math.min(1, existing.fluidez + 0.03);
        }
    }

    updateSemanticMemory(memory) {
        const contenido = memory.contenido;
        if (typeof contenido !== 'string' || contenido.length < 10) return;
        const words = contenido.toLowerCase().split(/\s+/);
        words.forEach(w => {
            if (w.length > 3) {
                const existing = this.memories.semantica.get(w);
                if (!existing) {
                    this.memories.semantica.set(w, { concepto: w, fuerza: 0.3, contextos: 1, ultimaActualizacion: Date.now() });
                } else {
                    existing.fuerza = Math.min(1, existing.fuerza + 0.02);
                    existing.contextos++;
                    existing.ultimaActualizacion = Date.now();
                }
            }
        });
    }

    strengthenAccessedMemories(dt) {
        this.memories.episodica.forEach(m => {
            if (m.acceso > 0) {
                m.fuerzaConsolidada = Math.min(1.0, m.fuerzaConsolidada + m.acceso * 0.08 * dt * this.parametros.retencion);
                m.acceso = 0;
            }
        });
    }

    strengthenAssociations(dt) {
        this.state.asociacion = Math.min(100, (this.state.asociacion || 0) + 0.05 * dt);
    }

    /**
     * FIX: comparar siempre con Date.now() (ms). Antes se restaba
     * systemTime (segundos) con timestampConsolidacion (ms) → basura.
     */
    applyForgettingProcess(dt) {
        const now = Date.now();
        const forgetRate = this.parametros.olvido * (1 - this.memoryProfile.retentionRate / 2);
        this.memories.episodica = this.memories.episodica.filter(m => {
            const t = now - (m.timestampConsolidacion || now);
            const survival = Math.exp(-forgetRate * t / 86400000);
            const boost = 1 + (m.importancia || 0) * 0.5;
            return Math.random() < survival * boost;
        });

        this.memories.working = this.memories.working.filter(m => {
            m.fuerza *= (1 - forgetRate * dt * 0.5);
            return m.fuerza > 0.05;
        });
    }

    updateMemoryCapacities(input, dt) {
        const bio = input.biochemical || {};
        const cog = input.cognitive || {};
        const mod = {
            oxigeno: (bio.oxigeno || 50) / 100,
            energia: (bio.energia || 50) / 100,
            atencion: (cog.atencion || 50) / 100,
            estres: 1 - ((bio.cortisol || 0) / 150),
            dopamina: (bio.dopamina || 50) / 100,
            serotonina: (bio.serotonina || 50) / 100
        };
        Object.keys(this.state).forEach(cap => {
            if (['interferencia', 'olvido', 'asociacion'].includes(cap)) return;
            if (cap.startsWith('memoria') || cap === 'consolidacion') {
                // Estas se dejan estables
            } else {
                const base = this.getBaseCapacity(cap);
                const mf = Object.values(mod).reduce((p, f) => p * f, 1);
                this.state[cap] = this.clamp(base * (0.4 + mf * 0.6), 0, 100);
            }
        });
        this.state.interferencia = (cog.carga || 0) * 0.4;
        this.state.olvido = ((bio.cortisol || 0) + (cog.fatiga || 0)) * 0.08;
        this.state.confianzaMemoria = Math.min(100, this.state.confianzaMemoria + 1.5 * dt);
    }

    getBaseCapacity(cap) {
        const base = {
            capacidadRetencion: 80, velocidadRecuperacion: 75, capacidadTrabajo: 70,
            consolidacion: 65, codificacion: 70, almacenamiento: 75, recuperacion: 72,
            reconocimiento: 68, consolidacionEficiencia: 70, retrievalEficiencia: 80,
            aprendizajeActivo: 50, confianzaMemoria: 70, memoriaEmocional: 65
        };
        return base[cap] || 50;
    }

    manageInterference(dt) {
        const eff = (this.state.interferencia || 0) / 100;
        this.state.confianzaMemoria -= eff * 4 * dt;
        this.state.interferencia = Math.max(0, this.state.interferencia - 2.5 * dt);
        this.state.confianzaMemoria = Math.min(100, this.state.confianzaMemoria + 1.5 * dt);
    }

    applyMemoryHomeostasis(dt) {
        Object.keys(this.state).forEach(c => {
            if (typeof this.state[c] === 'number') this.state[c] = this.clamp(this.state[c], 0, 100);
        });
        this.state.consolidacionEficiencia = this.clamp(this.state.consolidacionEficiencia + 0.4 * dt, 0, 100);
        this.state.retrievalEficiencia = this.clamp(this.state.retrievalEficiencia + 0.4 * dt, 0, 100);
    }

    retrieveMemory(query, context) {
        const results = {
            episodica: this.searchEpisodicMemory(query, context),
            semantica: this.searchSemanticMemory(query),
            procedural: this.searchProceduralMemory(query)
        };
        const confidence = this.calculateRetrievalConfidence(results, context);
        this.recordMemoryAccess(results);
        return {
            memories: results,
            confidence,
            totalMatches: Object.values(results).flat().length,
            retrievalTime: this.calculateRetrievalTime()
        };
    }

    searchEpisodicMemory(query, context) {
        return this.memories.episodica
            .filter(m => this.memoryContentMatch(m.contenido, query) > 0.25)
            .sort((a, b) => (b.fuerzaConsolidada || 0) - (a.fuerzaConsolidada || 0))
            .slice(0, 5);
    }

    searchSemanticMemory(query) {
        const queryStr = query.toString().toLowerCase();
        const words = queryStr.split(/\s+/);
        const results = [];
        this.memories.semantica.forEach((v, concept) => {
            const c = concept.toLowerCase();
            let score = 0;
            words.forEach(w => { if (c.includes(w)) score += 1 / words.length; });
            if (score > 0.3) results.push({ concepto: concept, fuerza: v.fuerza, match: score });
        });
        return results.sort((a, b) => b.fuerza - a.fuerza).slice(0, 5);
    }

    searchProceduralMemory(query) {
        const queryStr = query.toString().toLowerCase();
        const results = [];
        this.memories.procedural.forEach((skill, key) => {
            if (key.toLowerCase().includes(queryStr)) {
                results.push({ habilidad: skill.habilidad, nivel: skill.nivel, eficiencia: skill.eficiencia });
            }
        });
        return results.slice(0, 5);
    }

    memoryContentMatch(contenido, query) {
        const c = contenido.toString().toLowerCase();
        const q = query.toString().toLowerCase();
        if (c.includes(q)) return 1.0;
        const qw = q.split(/\s+/);
        const cw = c.split(/\s+/);
        let matches = 0;
        qw.forEach(w => { if (cw.some(x => x.includes(w))) matches++; });
        return matches / qw.length;
    }

    calculateRetrievalConfidence(results, context) {
        let total = 0, count = 0;
        Object.values(results).forEach(mems => {
            mems.forEach(m => {
                let c = m.fuerzaConsolidada || m.fuerza || 0.5;
                c *= (this.state.confianzaMemoria || 0) / 100;
                c *= (this.state.retrievalEficiencia || 0) / 100;
                total += c;
                count++;
            });
        });
        return count > 0 ? total / count : 0;
    }

    calculateRetrievalTime() {
        return 100 / (this.parametros.retrievalSpeed || 1.0) / Math.max(0.1, (this.state.retrievalEficiencia || 0) / 100);
    }

    recordMemoryAccess(results) {
        const now = Date.now();
        Object.values(results).forEach(mems => {
            mems.forEach(m => {
                if (m.acceso !== undefined) m.acceso++;
                if (m.ultimoAcceso !== undefined) m.ultimoAcceso = now;
            });
        });
    }

    learnSkill(skill, context, success) {
        const rate = this.calculateLearningRate(context);
        const gain = success ? rate : rate * 0.3;
        const memory = { contenido: skill, fuerza: gain, contexto: context, tipo: 'aprendizaje', importancia: success ? 0.8 : 0.3 };
        this.consolidateToLongTerm(memory);
        return { skill, strengthGain: gain, newLevel: this.getSkillLevel(skill) };
    }

    calculateLearningRate(context) {
        const base = 0.12 * this.memoryProfile.learningEfficiency;
        const f = {
            a: ((context.cognitive?.atencion || 50) / 100),
            m: ((context.biochemical?.dopamina || 50) / 100),
            e: 1 - ((context.biochemical?.cortisol || 0) / 200),
            en: ((context.biochemical?.energia || 50) / 100)
        };
        return base * Object.values(f).reduce((p, x) => p * x, 1);
    }

    getSkillLevel(skill) {
        const key = String(skill).substring(0, 50).toLowerCase().replace(/\s+/g, '_');
        return this.memories.procedural.get(key)?.nivel || 0;
    }

    handleSituation(type, intensity) {
        const eff = this.getSituationMemoryEffects(type, intensity);
        Object.keys(eff).forEach(k => {
            if (this.state[k] !== undefined) this.state[k] += eff[k];
        });
    }

    getSituationMemoryEffects(type, i) {
        const map = {
            'estres_alto': { consolidacion: -18 * i, recuperacion: -22 * i, confianzaMemoria: -25 * i, interferencia: 18 * i },
            'aprendizaje_intenso': { consolidacion: 15 * i, capacidadRetencion: 10 * i, aprendizajeActivo: 25 * i },
            'descanso': { consolidacion: 10 * i, confianzaMemoria: 15 * i, interferencia: -22 * i, recuperacion: 20 * i },
            'recompensa': { consolidacion: 15 * i, confianzaMemoria: 10 * i, aprendizajeActivo: 20 * i },
            'insight': { consolidacion: 20 * i, confianzaMemoria: 15 * i, retrievalEficiencia: 10 * i }
        };
        return map[type] || {};
    }

    emergencyProtocol() {
        this.applyModulation({ consolidacion: 20, confianzaMemoria: 15, interferencia: -30, recuperacion: 25 });
        this.memories.episodica = this.memories.episodica.filter(m => m.importancia > 0.5 || m.fuerzaConsolidada > 0.7);
    }

    applyModulation(mod) {
        Object.keys(mod).forEach(k => {
            if (this.state[k] !== undefined) this.state[k] = this.clamp(this.state[k] + mod[k], 0, 100);
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
            motor: this.memories.motor.size,
            consolidationQueue: this.consolidationQueue.length,
            parametros: { ...this.parametros }
        };
    }

    clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

    reset() {
        this.initializeState();
        this.consolidationQueue = [];
    }

    exportData() {
        return {
            state: this.getState(),
            memoryProfile: this.memoryProfile,
            parameters: this.parametros,
            memories: {
                episodica: this.memories.episodica.slice(-30),
                procedural: Array.from(this.memories.procedural.entries()).slice(0, 20),
                semantica: Array.from(this.memories.semantica.entries()).slice(0, 20),
                working: this.memories.working.slice(-10),
                emocional: this.memories.emocional.slice(-20)
            }
        };
    }
}

systemCore.registerModule('memory', new MemorySystem());
