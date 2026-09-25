// src/modules/MemorySystem.js
// V4.1
//
// CAMBIOS CLAVE V4.1:
//  - consume environmental.eventos (ahora existen)
//  - calculateInitialStrength sin suprimir
//  - consolidación real funcionando
//  - updateSlow para olvido (antes recorría toda la memoria cada tick)
//  - persistencia batch con queuePersistence dedicado
//  - _lastEnvEventTimestamp evita duplicados

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

        // Buffers de persistencia
        this._pendingMemories = [];
        this._pendingSkills = [];

        // Control del olvido
        this._lastForgetAt = 0;
        this._forgetIntervalMs = 10000;

        // Control de consumo de eventos del entorno
        this._lastEnvEventTimestamp = 0;

        // Control de throttle de consolidationQueue
        this._lastConsolidationQueueAt = 0;
    }

    async initialize(characterConfig) {
        this.config = characterConfig || { genotipo: 'humano' };
        this.setupMemoryProfile();
        this.initializeState();
        systemCore.logSystem('Sistema de memoria V4.1 inicializado');
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
        this._pendingMemories = [];
        this._pendingSkills = [];
        this._lastForgetAt = 0;
        this._lastEnvEventTimestamp = 0;
        this._lastConsolidationQueueAt = 0;
    }

    onEvent(cb) { this.eventListeners.push(cb); }

    emitEvent(type, data) {
        const payload = { type, data, module: 'memory', simTime: systemCore.systemTime };
        for (const cb of this.eventListeners) {
            try { cb(payload); }
            catch (err) { console.error('❌ mem listener:', err); }
        }
    }

    update(input, deltaTime) {
        this.lastUpdateTime = systemCore.systemTime;
        if (!input || !input.biochemical || !input.cognitive) return this.getState();

        // FIX: consumir eventos del entorno (antes nunca existían)
        this._consumeEnvironmentalEvents(input);

        this.processWorkingMemory(input, deltaTime);
        this.consolidateMemories(deltaTime);
        this.updateMemoryCapacities(input, deltaTime);
        this.manageInterference(deltaTime);
        this.applyMemoryHomeostasis(deltaTime);

        // Flush de buffers
        if (this._pendingMemories.length > 0 || this._pendingSkills.length > 0) {
            systemCore.queuePersistence('memory-batch', async () => {
                const db = systemCore.database;
                if (!db?.isInitialized) {
                    this._pendingMemories.length = 0;
                    this._pendingSkills.length = 0;
                    return;
                }
                const memories = this._pendingMemories.splice(0);
                const skills = this._pendingSkills.splice(0);
                for (const m of memories) {
                    try { await db.saveMemory(m); } catch (_) {}
                }
                for (const s of skills) {
                    try { await db.saveSkill(s); } catch (_) {}
                }
            });
        }

        return this.getState();
    }

    /**
     * Operaciones que no necesitan 4 Hz:
     *  - Olvido (recorre toda la memoria episódica)
     *  - Procesamiento de la queue de consolidación
     *  - Fortalecimiento de asociaciones
     */
    updateSlow(input, slowDelta) {
        this.processConsolidationQueue(slowDelta);
        this.applyForgettingProcess(slowDelta);
        this.strengthenAssociations(slowDelta);
        this.strengthenAccessedMemories(slowDelta);
    }

    /**
     * Consume los eventos que EnvironmentSystem emite. Evita reprocesar
     * los mismos (control por timestamp).
     */
    _consumeEnvironmentalEvents(input) {
        const eventos = input.environment?.eventos || input.environmental?.eventos || [];
        if (!Array.isArray(eventos) || eventos.length === 0) return;

        for (const ev of eventos) {
            const ts = ev.timestamp || 0;
            if (ts <= this._lastEnvEventTimestamp) continue;

            const texto = typeof ev === 'string' ? ev : (ev.texto || String(ev));
            const severidad = typeof ev === 'object' ? (ev.severidad || 0) : 0;

            this.addToWorkingMemory(texto, {
                biochemical: input.biochemical,
                emotional: input.emotional,
                cognitive: input.cognitive,
                severidad
            });
        }
        // Avanzar marca al último timestamp visto
        const lastTs = eventos[eventos.length - 1]?.timestamp || 0;
        if (lastTs > this._lastEnvEventTimestamp) {
            this._lastEnvEventTimestamp = lastTs;
        }
    }

    processWorkingMemory(input, dt) {
        const cog = input.cognitive || {};
        const workingCapacity = this.parametros.capacidadTrabajo * ((cog.memoriaTrabajo || 70) / 100);
        if (this.memories.working.length > workingCapacity) {
            const overflow = Math.ceil(this.memories.working.length - workingCapacity);
            const toConsolidate = this.memories.working.splice(0, overflow);
            for (const m of toConsolidate) {
                if (m.fuerza > 0.4) this.consolidationQueue.push(m);
            }
        }

        // Decay de working memory
        this.memories.working = this.memories.working.filter(m => {
            m.fuerza *= (1 - 0.08 * dt * (1 - this.parametros.retencion));
            m.age = (m.age || 0) + dt;
            return m.fuerza > 0.05;
        });
    }

    addToWorkingMemory(evento, context) {
        const entry = {
            contenido: String(evento),
            contexto: {
                biochemical: this._snapshot(context.biochemical),
                emotional: this._snapshot(context.emotional),
                cognitive: this._snapshot(context.cognitive),
                severidad: context.severidad || 0,
                wallTime: Date.now()
            },
            fuerza: this.calculateInitialStrength(context),
            tipo: this.classifyMemory(evento),
            acceso: 0,
            age: 0,
            asociaciones: []
        };

        this.memories.working.push(entry);
        if (entry.fuerza > 0.7) this.consolidationQueue.push(entry);
        this.emitEvent('memory_added', { tipo: entry.tipo, fuerza: entry.fuerza, contenido: entry.contenido.substring(0, 60) });
    }

    _snapshot(obj) {
        if (!obj) return {};
        const out = {};
        let count = 0;
        for (const k of Object.keys(obj)) {
            if (count++ > 15) break;
            const v = obj[k];
            if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') out[k] = v;
        }
        return out;
    }

    /**
     * FIX: antes suprimía casi todas las memorias a < 0.15 porque usaba
     * `alegria / 100` con alegria=20 → 0.2. Ahora usa 0.5 + alegria/200.
     */
    calculateInitialStrength(context) {
        let s = 0.5;

        // Impacto emocional (boost)
        s *= this.calculateEmotionalImpact(context.emotional);

        // Atención (0.4–1.0)
        const atencion = context.cognitive?.atencion ?? 50;
        s *= 0.4 + (atencion / 100) * 0.6;

        // FIX: alegría como boost, no como multiplicador puro
        const alegria = context.emotional?.alegria ?? 20;
        s *= 0.5 + Math.min(1, alegria / 200);

        // Severidad ambiental (boost)
        const sev = context.severidad ?? 0;
        s *= 1 + sev * 0.5;

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
        if (l.includes('recompensa') || l.includes('éxito') || l.includes('alegria') || l.includes('felicidad')) return 'recompensa';
        if (l.includes('social') || l.includes('conexión') || l.includes('interaccion')) return 'social';
        if (l.includes('aprend') || l.includes('habilidad')) return 'aprendizaje';
        if (l.includes('espacio') || l.includes('lugar') || l.includes('territorio')) return 'espacial';
        if (l.includes('motor') || l.includes('movimiento')) return 'motor';
        if (l.includes('emocional') || l.includes('sentimiento')) return 'emocional';
        if (l.includes('tormenta') || l.includes('temporal') || l.includes('clima')) return 'climatico';
        return 'general';
    }

    consolidateMemories(dt) {
        // Consolidación probabilística de working memory
        for (let i = this.memories.working.length - 1; i >= 0; i--) {
            const m = this.memories.working[i];
            const prob = m.fuerza * this.parametros.consolidacion * dt;
            if (Math.random() < prob) {
                this.consolidateToLongTerm(m);
                this.memories.working.splice(i, 1);
            }
        }
    }

    processConsolidationQueue(dt) {
        if (this.consolidationQueue.length === 0) return;
        const processed = [];
        for (let i = 0; i < this.consolidationQueue.length; i++) {
            const m = this.consolidationQueue[i];
            const pc = m.processedCount || 0;
            if (pc < 3) {
                m.processedCount = pc + 1;
                m.fuerza = Math.min(1, m.fuerza + 0.08 * dt);
            }
            if (m.fuerza > 0.9 || m.processedCount >= 3) {
                this.consolidateToLongTerm(m);
                processed.push(i);
            }
        }
        // Remover de atrás hacia adelante
        for (let i = processed.length - 1; i >= 0; i--) {
            this.consolidationQueue.splice(processed[i], 1);
        }
        if (this.consolidationQueue.length > 50) {
            this.consolidationQueue = this.consolidationQueue.slice(-30);
        }
    }

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

        // Cap defensivo
        if (this.memories.episodica.length > 2000) {
            this.memories.episodica.sort((a, b) => b.importancia - a.importancia);
            this.memories.episodica = this.memories.episodica.slice(0, 1500);
        }

        // Encolar para persistencia batch
        const emocionAsociada = memory.contexto?.emotional?.emotion
            || memory.contexto?.emotional?.dominante
            || 'neutral';

        this._pendingMemories.push({
            contenido: typeof memory.contenido === 'string' ? memory.contenido.substring(0, 500) : JSON.stringify(memory.contenido).substring(0, 500),
            contexto: JSON.stringify(memory.contexto || {}).substring(0, 1000),
            fuerza: memory.fuerza,
            importancia: ltm.importancia,
            emocion_asociada: emocionAsociada,
            consolidada: true,
            timestamp: now,
            sim_time: systemCore.systemTime
        });

        const cap = 500;
        if (this._pendingMemories.length > cap) {
            this._pendingMemories.splice(0, this._pendingMemories.length - cap);
        }

        this.emitEvent('memory_consolidated', {
            tipo: memory.tipo,
            fuerza: memory.fuerza,
            importancia: ltm.importancia,
            contenido: String(memory.contenido).substring(0, 60)
        });
    }

    calculateImportance(memory) {
        let imp = memory.fuerza * 0.5;
        if (memory.tipo === 'amenaza') imp += 0.3;
        if (memory.tipo === 'recompensa') imp += 0.2;
        if (memory.tipo === 'social') imp += 0.15;
        if (memory.fuerza > 0.8) imp += 0.2;
        const sev = memory.contexto?.severidad || 0;
        imp += sev * 0.15;
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

        const skill = this.memories.procedural.get(key);
        this._pendingSkills.push({
            habilidad: key,
            nivel: skill.nivel,
            practicas: skill.practicas,
            eficiencia: skill.eficiencia,
            complejidad: 5,
            importancia: memory.importancia,
            timestamp: Date.now(),
            sim_time: systemCore.systemTime
        });
        if (this._pendingSkills.length > 200) {
            this._pendingSkills.splice(0, this._pendingSkills.length - 200);
        }
    }

    consolidateSpatialMemory(memory) {
        const key = String(memory.contenido).toLowerCase().replace(/\s+/g, '_').substring(0, 100);
        const existing = this.memories.espacial.get(key);
        if (!existing) {
            this.memories.espacial.set(key, {
                ubicacion: memory.contenido,
                precision: memory.fuerza,
                ultimoAcceso: Date.now(),
                importancia: memory.importancia
            });
        } else {
            existing.precision = Math.min(1, (existing.precision + memory.fuerza) / 2);
            existing.importancia = Math.max(existing.importancia, memory.importancia);
            existing.ultimoAcceso = Date.now();
        }
    }

    consolidateEmotionalMemory(memory) {
        const key = String(memory.contenido).substring(0, 30).toLowerCase().replace(/\s+/g, '_');
        const existing = this.memories.emocional.find(m => m.key === key);
        if (!existing) {
            this.memories.emocional.push({
                key,
                contenido: memory.contenido,
                emocion: memory.contexto?.emotional?.emotion || 'neutral',
                intensidad: memory.fuerza,
                importancia: memory.importancia,
                ultimoAcceso: Date.now()
            });
        } else {
            existing.intensidad = (existing.intensidad + memory.fuerza) / 2;
            existing.importancia = Math.max(existing.importancia, memory.importancia);
            existing.ultimoAcceso = Date.now();
        }
        if (this.memories.emocional.length > 500) {
            this.memories.emocional.sort((a, b) => b.importancia - a.importancia);
            this.memories.emocional = this.memories.emocional.slice(0, 400);
        }
    }

    consolidateMotorMemory(memory) {
        const key = String(memory.contenido).toLowerCase().replace(/\s+/g, '_').substring(0, 100);
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
        for (const w of words) {
            if (w.length > 3) {
                const existing = this.memories.semantica.get(w);
                if (!existing) {
                    this.memories.semantica.set(w, {
                        concepto: w, fuerza: 0.3, contextos: 1,
                        ultimaActualizacion: Date.now()
                    });
                } else {
                    existing.fuerza = Math.min(1, existing.fuerza + 0.02);
                    existing.contextos++;
                    existing.ultimaActualizacion = Date.now();
                }
            }
        }
        // Cap defensivo
        if (this.memories.semantica.size > 3000) {
            const sorted = Array.from(this.memories.semantica.entries())
                .sort((a, b) => b[1].fuerza - a[1].fuerza)
                .slice(0, 2000);
            this.memories.semantica = new Map(sorted);
        }
    }

    strengthenAccessedMemories(dt) {
        for (const m of this.memories.episodica) {
            if (m.acceso > 0) {
                m.fuerzaConsolidada = Math.min(1.0, (m.fuerzaConsolidada || 0) + m.acceso * 0.08 * dt * this.parametros.retencion);
                m.acceso = 0;
            }
        }
    }

    strengthenAssociations(dt) {
        this.state.asociacion = Math.min(100, (this.state.asociacion || 0) + 0.05 * dt);
    }

    applyForgettingProcess(dt) {
        // Working memory se procesa cada tick (barato)
        const forgetRate = this.parametros.olvido * (1 - this.memoryProfile.retentionRate / 2);
        this.memories.working = this.memories.working.filter(m => {
            m.fuerza *= (1 - forgetRate * dt * 0.5);
            return m.fuerza > 0.05;
        });

        // LTM se procesa cada _forgetIntervalMs
        const now = Date.now();
        if (now - this._lastForgetAt < this._forgetIntervalMs) return;
        this._lastForgetAt = now;

        this.memories.episodica = this.memories.episodica.filter(m => {
            const t = now - (m.timestampConsolidacion || now);
            const survival = Math.exp(-forgetRate * t / 86400000);
            const boost = 1 + (m.importancia || 0) * 0.5;
            return Math.random() < survival * boost;
        });
    }

    updateMemoryCapacities(input, dt) {
        const bio = input.biochemical || {};
        const cog = input.cognitive || {};
        const mod = {
            oxigeno: (bio.oxigeno ?? 50) / 100,
            energia: (bio.energia ?? 50) / 100,
            atencion: (cog.atencion ?? 50) / 100,
            estres: 1 - ((bio.cortisol ?? 0) / 150),
            dopamina: (bio.dopamina ?? 50) / 100,
            serotonina: (bio.serotonina ?? 50) / 100
        };
        const mf = Object.values(mod).reduce((p, f) => p * f, 1);

        for (const cap of ['capacidadRetencion', 'velocidadRecuperacion', 'capacidadTrabajo', 'codificacion', 'almacenamiento', 'recuperacion', 'reconocimiento', 'confianzaMemoria', 'retrievalEficiencia', 'aprendizajeActivo']) {
            if (this.state[cap] === undefined) continue;
            const base = this.getBaseCapacity(cap);
            this.state[cap] = Math.max(0, Math.min(100, base * (0.4 + mf * 0.6)));
        }

        this.state.interferencia = (cog.carga ?? 0) * 0.4;
        this.state.olvido = ((bio.cortisol ?? 0) + (cog.fatiga ?? 0)) * 0.08;
        this.state.confianzaMemoria = Math.min(100, this.state.confianzaMemoria + 1.5 * dt);
    }

    getBaseCapacity(cap) {
        const base = {
            capacidadRetencion: 80, velocidadRecuperacion: 75, capacidadTrabajo: 70,
            codificacion: 70, almacenamiento: 75, recuperacion: 72,
            reconocimiento: 68, confianzaMemoria: 70, retrievalEficiencia: 80,
            aprendizajeActivo: 50
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
        for (const c of Object.keys(this.state)) {
            if (typeof this.state[c] === 'number') {
                this.state[c] = Math.max(0, Math.min(100, this.state[c]));
            }
        }
        this.state.consolidacionEficiencia = Math.min(100, this.state.consolidacionEficiencia + 0.4 * dt);
        this.state.retrievalEficiencia = Math.min(100, this.state.retrievalEficiencia + 0.4 * dt);
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
        const queryStr = String(query).toLowerCase();
        const words = queryStr.split(/\s+/);
        const results = [];
        for (const [concept, v] of this.memories.semantica) {
            const c = concept.toLowerCase();
            let score = 0;
            for (const w of words) if (c.includes(w)) score += 1 / words.length;
            if (score > 0.3) results.push({ concepto: concept, fuerza: v.fuerza, match: score });
        }
        return results.sort((a, b) => b.fuerza - a.fuerza).slice(0, 5);
    }

    searchProceduralMemory(query) {
        const queryStr = String(query).toLowerCase();
        const results = [];
        for (const [key, skill] of this.memories.procedural) {
            if (key.toLowerCase().includes(queryStr)) {
                results.push({ habilidad: skill.habilidad, nivel: skill.nivel, eficiencia: skill.eficiencia });
            }
        }
        return results.slice(0, 5);
    }

    memoryContentMatch(contenido, query) {
        const c = String(contenido).toLowerCase();
        const q = String(query).toLowerCase();
        if (c.includes(q)) return 1.0;
        const qw = q.split(/\s+/);
        const cw = c.split(/\s+/);
        let matches = 0;
        for (const w of qw) {
            if (cw.some(x => x.includes(w))) matches++;
        }
        return matches / Math.max(1, qw.length);
    }

    calculateRetrievalConfidence(results, context) {
        let total = 0, count = 0;
        for (const mems of Object.values(results)) {
            for (const m of mems) {
                let c = m.fuerzaConsolidada || m.fuerza || 0.5;
                c *= (this.state.confianzaMemoria || 0) / 100;
                c *= (this.state.retrievalEficiencia || 0) / 100;
                total += c;
                count++;
            }
        }
        return count > 0 ? total / count : 0;
    }

    calculateRetrievalTime() {
        return 100 / (this.parametros.retrievalSpeed || 1.0) / Math.max(0.1, (this.state.retrievalEficiencia || 0) / 100);
    }

    recordMemoryAccess(results) {
        const now = Date.now();
        for (const mems of Object.values(results)) {
            for (const m of mems) {
                if (m.acceso !== undefined) m.acceso++;
                if (m.ultimoAcceso !== undefined) m.ultimoAcceso = now;
            }
        }
    }

    learnSkill(skill, context, success) {
        const rate = this.calculateLearningRate(context);
        const gain = success ? rate : rate * 0.3;
        const memory = {
            contenido: skill,
            fuerza: Math.min(1, 0.5 + gain),
            contexto: context,
            tipo: 'aprendizaje',
            importancia: success ? 0.8 : 0.3
        };
        this.consolidateToLongTerm(memory);

        // Persistir evento de aprendizaje
        if (systemCore.database?.isInitialized) {
            const prevLevel = this.getSkillLevel(skill) - gain * 100;
            systemCore.database.saveLearningEvent({
                habilidad: skill,
                nivel_anterior: Math.max(0, prevLevel),
                nivel_nuevo: this.getSkillLevel(skill),
                ganancia: gain * 100,
                metodo: context?.metodo || 'interacción',
                exito: success,
                sim_time: systemCore.systemTime
            }).catch(() => {});
        }

        return { skill, strengthGain: gain, newLevel: this.getSkillLevel(skill) };
    }

    calculateLearningRate(context) {
        const base = 0.12 * this.memoryProfile.learningEfficiency;
        const f = {
            a: ((context.cognitive?.atencion ?? 50) / 100),
            m: ((context.biochemical?.dopamina ?? 50) / 100),
            e: 1 - ((context.biochemical?.cortisol ?? 0) / 200),
            en: ((context.biochemical?.energia ?? 50) / 100)
        };
        return base * Object.values(f).reduce((p, x) => p * x, 1);
    }

    getSkillLevel(skill) {
        const key = String(skill).substring(0, 50).toLowerCase().replace(/\s+/g, '_');
        return this.memories.procedural.get(key)?.nivel || 0;
    }

    handleSituation(type, intensity) {
        const eff = this.getSituationMemoryEffects(type, intensity);
        for (const k of Object.keys(eff)) {
            if (this.state[k] !== undefined) this.state[k] += eff[k];
        }
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
        this.applyModulation({
            consolidacion: 20, confianzaMemoria: 15, interferencia: -30, recuperacion: 25
        });
        // Reducir memoria a solo lo importante
        this.memories.episodica = this.memories.episodica.filter(
            m => (m.importancia || 0) > 0.5 || (m.fuerzaConsolidada || 0) > 0.7
        );
        this.emitEvent('emergency', { type: 'memory_emergency', severity: 0.9 });
    }

    applyModulation(mod) {
        for (const k of Object.keys(mod)) {
            if (this.state[k] !== undefined) {
                this.state[k] = Math.max(0, Math.min(100, this.state[k] + mod[k]));
            }
        }
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
            pendingMemories: this._pendingMemories.length
        };
    }

    reset() {
        this.initializeState();
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
