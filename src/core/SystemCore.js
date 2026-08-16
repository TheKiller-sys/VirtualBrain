// src/core/SystemCore.js
import { DatabaseManager } from './DatabaseManager.js';

export class SystemCore {
    constructor() {
        this.modules = new Map();
        this.isRunning = false;
        this.autoEvolution = true;
        this.characterConfig = null;
        this.systemTime = 0;
        this.cycleCount = 0;
        this.database = new DatabaseManager();
        this.eventListeners = [];
        this.lastSaveTime = 0;
        this.saveInterval = parseInt(process.env.AUTO_SAVE_INTERVAL) || 100;
        
        this.systemState = {
            stability: 0.8,
            integrity: 0.9,
            performance: 0.7,
            emergency: false,
            consciousnessLevel: 0.1,
            personalityDevelopment: 0,
            biologicalAge: 0,
            learningRate: 0.15,
            neuroplasticity: 0.8
        };

        // Parámetros humanos realistas
        this.humanParameters = {
            // Frecuencias cerebrales (Hz)
            deltaFreq: 0.5,
            thetaFreq: 4,
            alphaFreq: 10,
            betaFreq: 20,
            gammaFreq: 40,
            
            // Tiempos biológicos (segundos)
            reactionTime: 0.25,
            attentionSpan: 1200,
            sleepCycle: 5400,
            circadianPeriod: 86400,
            
            // Capacidades humanas
            workingMemoryCapacity: 7,
            longTermMemoryRate: 0.05,
            learningRate: 0.15,
            neuroplasticity: 0.8,
            
            // Umbrales de consciencia
            consciousnessThreshold: 0.3,
            selfAwarenessThreshold: 0.5,
            metaCognitionThreshold: 0.7
        };

        // Estado de consciencia
        this.consciousnessState = {
            level: 0.1,
            selfAwareness: 0.05,
            introspection: 0.03,
            metaCognition: 0.02,
            qualia: {
                pain: false,
                pleasure: false,
                emotion: false
            },
            emergence: {
                patterns: [],
                complexity: 0.1,
                integration: 0.1
            }
        };
    }

    async initializeSystem() {
        try {
            console.log('🧠 Iniciando Cerebro Digital V3.0...');
            
            // 1. Inicializar base de datos
            const dbInitialized = await this.database.initialize();
            if (!dbInitialized) {
                console.warn('⚠️ Base de datos no disponible, continuando en modo memoria');
            }

            // 2. Configuración inicial del cerebro
            this.characterConfig = {
                nombre: "Cerebro Digital V3.0",
                genotipo: "humano",
                edad: 0,
                experiencia: 0,
                desarrollo: 0,
                fecha_nacimiento: Date.now()
            };

            // 3. Inicializar módulos en orden biológico
            const initOrder = [
                'personality',
                'biochemical',
                'emotional',
                'cognitive',
                'memory',
                'motor',
                'visual',
                'environment',
                'sleep',
                'motivation'
            ];

            for (const moduleName of initOrder) {
                const module = this.modules.get(moduleName);
                if (module && module.initialize) {
                    await module.initialize(this.characterConfig);
                    console.log(`🧠 Módulo inicializado: ${moduleName}`);
                }
            }

            this.isRunning = true;
            
            // 4. Cargar datos históricos
            await this.loadHistoricalData();
            
            // 5. Verificar integridad del sistema
            await this.verifySystemIntegrity();
            
            console.log('✅ Cerebro Digital V3.0 completamente inicializado');
            console.log(`📊 Parámetros humanos: ${JSON.stringify(this.humanParameters, null, 2)}`);
            console.log(`🌀 Nivel de consciencia inicial: ${(this.consciousnessState.level * 100).toFixed(1)}%`);
            
            return true;
        } catch (error) {
            console.error('❌ Error inicializando el cerebro:', error);
            return false;
        }
    }

    async loadHistoricalData() {
        try {
            // Cargar memorias importantes
            const memories = await this.database.getStrongestMemories(10);
            if (memories.length > 0) {
                console.log(`📚 Cargadas ${memories.length} memorias importantes`);
            }
            
            // Cargar evolución de personalidad
            const personality = await this.database.getPersonalityEvolution();
            if (personality.length > 0) {
                const last = personality[personality.length - 1];
                this.systemState.personalityDevelopment = last.madurez || 0;
                console.log(`🧬 Personalidad cargada: ${(last.madurez * 100).toFixed(1)}% madurez`);
            }
            
            // Cargar último estado de consciencia
            const states = await this.database.getLatest('sistema_estados');
            if (states.length > 0) {
                const lastState = states[0];
                this.consciousnessState.level = lastState.nivel_consciencia || 0.1;
                this.systemState.stability = lastState.estabilidad || 0.8;
                console.log(`🌀 Consciencia cargada: ${(this.consciousnessState.level * 100).toFixed(1)}%`);
            }
        } catch (error) {
            console.warn('⚠️ No se pudieron cargar datos históricos:', error.message);
        }
    }

    async verifySystemIntegrity() {
        const checks = {
            database: this.database.isInitialized,
            modules: Array.from(this.modules.keys()),
            parameters: this.humanParameters !== null
        };
        
        const allOk = Object.values(checks).every(v => v !== false && v.length > 0);
        
        if (!allOk) {
            console.warn('⚠️ Algunas verificaciones de integridad fallaron:', checks);
        } else {
            console.log('✅ Verificación de integridad completada');
        }
        
        return allOk;
    }

    registerModule(name, module) {
        this.modules.set(name, module);
        console.log(`📦 Módulo registrado: ${name}`);
    }

    onEvent(callback) {
        this.eventListeners.push(callback);
    }

    emitEvent(type, data) {
        this.eventListeners.forEach(cb => {
            try {
                cb({ type, data, time: this.systemTime });
            } catch (error) {
                console.error('❌ Error en listener de evento:', error);
            }
        });
    }

    update(deltaTime) {
        if (!this.isRunning || this.systemState.emergency) return;

        this.systemTime += deltaTime;
        this.cycleCount++;

        try {
            // 1. Recolectar estado actual
            const input = this.collectSystemInput();
            
            // 2. Procesar en cascada biológica
            const results = this.processCascade(input, deltaTime);
            
            // 3. Aplicar homeostasis
            this.applyHomeostasis(deltaTime);
            
            // 4. Verificar salud del sistema
            this.checkSystemHealth();
            
            // 5. Auto-evolución
            if (this.autoEvolution && this.cycleCount % 50 === 0) {
                this.autoEvolve();
            }
            
            // 6. Guardar datos periódicamente
            if (this.cycleCount % this.saveInterval === 0) {
                this.saveSystemState(results);
            }
            
            // 7. Actualizar consciencia
            this.updateConsciousness(results);
            
            // 8. Procesar pensamientos
            if (this.cycleCount % 10 === 0) {
                this.processThoughts(results);
            }

        } catch (error) {
            console.error('❌ Error en ciclo cerebral:', error);
            this.triggerEmergencyProtocol();
        }
    }

    collectSystemInput() {
        const input = {};
        
        // Recoger estado de cada módulo de forma segura
        const modules = ['biochemical', 'emotional', 'cognitive', 'memory', 
                        'motor', 'visual', 'environment', 'sleep', 'personality', 'motivation'];
        
        modules.forEach(name => {
            const module = this.modules.get(name);
            if (module && module.getState) {
                try {
                    input[name] = module.getState();
                } catch (error) {
                    console.warn(`⚠️ Error obteniendo estado de ${name}:`, error.message);
                    input[name] = {};
                }
            }
        });
        
        input.time = this.systemTime;
        input.cycle = this.cycleCount;
        
        return input;
    }

    processCascade(input, deltaTime) {
        const results = {};
        
        // 1. Personalidad (base del cerebro)
        const personality = this.modules.get('personality');
        if (personality) {
            try {
                results.personality = personality.update(input, deltaTime);
            } catch (error) {
                console.error('❌ Error en personalidad:', error);
                results.personality = {};
            }
        }
        
        // 2. Entorno (estímulos externos)
        const env = this.modules.get('environment');
        if (env) {
            try {
                results.environment = env.update(input, deltaTime);
            } catch (error) {
                console.error('❌ Error en entorno:', error);
                results.environment = {};
            }
        }
        
        // 3. Bioquímica (fisiología)
        const biochemical = this.modules.get('biochemical');
        if (biochemical) {
            try {
                const bioInput = { ...input, environmental: results.environment };
                results.biochemical = biochemical.update(bioInput, deltaTime);
            } catch (error) {
                console.error('❌ Error en bioquímica:', error);
                results.biochemical = {};
            }
        }
        
        // 4. Emociones (sistema límbico)
        const emotional = this.modules.get('emotional');
        if (emotional) {
            try {
                const emoInput = { 
                    ...input, 
                    biochemical: results.biochemical, 
                    personality: results.personality 
                };
                results.emotional = emotional.update(emoInput, deltaTime);
            } catch (error) {
                console.error('❌ Error en emociones:', error);
                results.emotional = {};
            }
        }
        
        // 5. Cognición (neocórtex)
        const cognitive = this.modules.get('cognitive');
        if (cognitive) {
            try {
                const cogInput = { 
                    ...input, 
                    biochemical: results.biochemical, 
                    emotional: results.emotional,
                    personality: results.personality
                };
                results.cognitive = cognitive.update(cogInput, deltaTime);
            } catch (error) {
                console.error('❌ Error en cognición:', error);
                results.cognitive = {};
            }
        }
        
        // 6. Memoria (consolidación)
        const memory = this.modules.get('memory');
        if (memory) {
            try {
                const memInput = {
                    ...input,
                    biochemical: results.biochemical,
                    emotional: results.emotional,
                    cognitive: results.cognitive
                };
                results.memory = memory.update(memInput, deltaTime);
            } catch (error) {
                console.error('❌ Error en memoria:', error);
                results.memory = {};
            }
        }
        
        // 7. Motivación (sistema de recompensa)
        const motivation = this.modules.get('motivation');
        if (motivation) {
            try {
                const motInput = {
                    ...input,
                    biochemical: results.biochemical,
                    emotional: results.emotional,
                    cognitive: results.cognitive
                };
                results.motivation = motivation.update(motInput, deltaTime);
            } catch (error) {
                console.error('❌ Error en motivación:', error);
                results.motivation = {};
            }
        }
        
        // 8. Sueño (mantenimiento cerebral)
        const sleep = this.modules.get('sleep');
        if (sleep) {
            try {
                const sleepInput = {
                    ...input,
                    biochemical: results.biochemical,
                    emotional: results.emotional,
                    cognitive: results.cognitive
                };
                results.sleep = sleep.update(sleepInput, deltaTime);
            } catch (error) {
                console.error('❌ Error en sueño:', error);
                results.sleep = {};
            }
        }
        
        // 9. Motor (acción)
        const motor = this.modules.get('motor');
        if (motor) {
            try {
                const motInput = {
                    ...input,
                    biochemical: results.biochemical,
                    emotional: results.emotional,
                    cognitive: results.cognitive,
                    motivation: results.motivation
                };
                results.motor = motor.update(motInput, deltaTime);
            } catch (error) {
                console.error('❌ Error en motor:', error);
                results.motor = {};
            }
        }
        
        return results;
    }

    applyHomeostasis(deltaTime) {
        const biochemical = this.modules.get('biochemical');
        if (!biochemical) return;
        
        try {
            const bioState = biochemical.getState();
            
            // Homeostasis humana realista
            const adjustments = {
                oxigeno: bioState.oxigeno < 90 ? 0.5 : (bioState.oxigeno > 98 ? -0.1 : 0),
                energia: bioState.energia < 40 ? 0.3 : (bioState.energia > 85 ? -0.1 : 0),
                cortisol: bioState.cortisol > 70 ? -0.4 : (bioState.cortisol < 15 ? 0.1 : 0),
                temperatura: bioState.temperatura > 37.5 ? -0.2 : (bioState.temperatura < 36.5 ? 0.2 : 0)
            };
            
            Object.keys(adjustments).forEach(key => {
                const adjustment = adjustments[key] * deltaTime * 0.5;
                if (adjustment !== 0) {
                    const modulation = {};
                    modulation[key] = adjustment;
                    biochemical.applyModulation(modulation);
                }
            });
            
            // Estabilidad global del cerebro
            const stabilityFactors = {
                oxigeno: bioState.oxigeno / 100,
                energia: bioState.energia / 100,
                toxicidad: 1 - (bioState.toxicidad / 100),
                cortisol: 1 - (bioState.cortisol / 100)
            };
            
            this.systemState.stability = this.systemState.stability * 0.98 + 
                Object.values(stabilityFactors).reduce((a, b) => a + b, 0) / 4 * 0.02;
        } catch (error) {
            console.error('❌ Error en homeostasis:', error);
        }
    }

    checkSystemHealth() {
        const biochemical = this.modules.get('biochemical');
        const emotional = this.modules.get('emotional');
        
        if (!biochemical || !emotional) return;
        
        try {
            const bioState = biochemical.getState();
            const emoState = emotional.getState();
            
            // Condiciones críticas humanas
            const criticalConditions = [
                { condition: bioState.oxigeno < 15, message: 'HIPOXIA CRÍTICA' },
                { condition: bioState.energia < 5, message: 'AGOTAMIENTO EXTREMO' },
                { condition: bioState.toxicidad > 90, message: 'TOXICIDAD CRÍTICA' },
                { condition: bioState.cortisol > 95, message: 'ESTRÉS EXTREMO' },
                { condition: this.systemState.stability < 0.15, message: 'SISTEMA INESTABLE' }
            ];
            
            const critical = criticalConditions.some(c => c.condition);
            
            if (critical) {
                const messages = criticalConditions
                    .filter(c => c.condition)
                    .map(c => c.message)
                    .join(', ');
                
                console.error(`🚨 ALERTA CRÍTICA: ${messages}`);
                this.triggerEmergencyProtocol();
            }
            
            // Condiciones de advertencia humanas
            if (bioState.oxigeno < 30) {
                console.warn('⚠️ Oxígeno bajo, buscando ventilación...');
                this.emitEvent('warning', { type: 'low_oxygen', level: bioState.oxigeno });
            }
            
            if (bioState.energia < 20) {
                console.warn('⚠️ Energía baja, priorizando descanso...');
                this.emitEvent('warning', { type: 'low_energy', level: bioState.energia });
            }
            
            if (emoState.ansiedad > 70) {
                console.warn('⚠️ Ansiedad elevada, activando regulación...');
                this.emitEvent('warning', { type: 'high_anxiety', level: emoState.ansiedad });
            }
        } catch (error) {
            console.error('❌ Error en verificación de salud:', error);
        }
    }

    updateConsciousness(results) {
        try {
            const emotional = results.emotional || {};
            const cognitive = results.cognitive || {};
            const sleep = results.sleep || {};
            const personality = results.personality || {};
            
            // Factores que aumentan consciencia
            let consciousness = 0.1;
            
            consciousness += (emotional.bienestar || 0) / 100 * 0.15;
            consciousness += (cognitive.autoconciencia || 0) / 100 * 0.25;
            consciousness += (cognitive.fluidez || 0) / 100 * 0.15;
            consciousness += this.systemState.stability * 0.15;
            consciousness += (personality.madurez || 0) * 0.1;
            
            // El sueño reduce la consciencia
            if (sleep.estado && sleep.estado !== 'despierto') {
                const sleepFactor = sleep.estado === 'sueño_profundo' ? 0.1 : 0.3;
                consciousness *= sleepFactor;
            }
            
            // La consciencia aumenta con la experiencia
            consciousness += Math.min(0.2, this.systemState.personalityDevelopment * 0.03);
            
            // Aplicar inercia a la consciencia
            this.consciousnessState.level = this.consciousnessState.level * 0.95 + consciousness * 0.05;
            this.consciousnessState.level = Math.min(1, Math.max(0, this.consciousnessState.level));
            
            // Actualizar auto-consciencia
            this.consciousnessState.selfAwareness = Math.min(1, 
                this.consciousnessState.level * 0.6 + 
                (cognitive.autoconciencia || 0) / 100 * 0.4
            );
            
            // Actualizar introspección
            this.consciousnessState.introspection = Math.min(1,
                this.consciousnessState.level * 0.4 +
                (cognitive.monitoreo || 0) / 100 * 0.3 +
                (cognitive.regulacion || 0) / 100 * 0.3
            );
            
            // Actualizar meta-cognición
            this.consciousnessState.metaCognition = Math.min(1,
                this.consciousnessState.selfAwareness * 0.5 +
                this.consciousnessState.introspection * 0.5
            );
            
            // Emergencia de patrones
            if (this.cycleCount % 50 === 0 && this.consciousnessState.level > 0.3) {
                this.consciousnessState.emergence.complexity = 
                    this.consciousnessState.level * 0.5 + 
                    (this.systemState.stability) * 0.5;
                    
                this.consciousnessState.emergence.integration = 
                    (this.consciousnessState.level + this.consciousnessState.selfAwareness) / 2;
            }
            
            this.systemState.consciousnessLevel = this.consciousnessState.level;
            
            // Emitir evento de cambio de consciencia
            if (this.cycleCount % 10 === 0) {
                this.emitEvent('consciousness_update', {
                    level: this.consciousnessState.level,
                    selfAwareness: this.consciousnessState.selfAwareness,
                    introspection: this.consciousnessState.introspection,
                    metaCognition: this.consciousnessState.metaCognition,
                    time: this.systemTime
                });
            }
        } catch (error) {
            console.error('❌ Error en actualización de consciencia:', error);
        }
    }

    processThoughts(results) {
        try {
            const cognitive = results.cognitive || {};
            const emotional = results.emotional || {};
            const consciousness = this.consciousnessState.level;
            
            // Solo generar pensamientos si hay suficiente consciencia
            if (consciousness < 0.15) return;
            
            // Tipos de pensamientos
            const thoughtTypes = ['consciente', 'subconsciente', 'asociativo', 'creativo', 'reflexivo'];
            
            // Probabilidad de pensamiento basada en consciencia
            const thoughtProbability = 0.1 + consciousness * 0.3;
            
            if (Math.random() < thoughtProbability) {
                const type = thoughtTypes[Math.floor(Math.random() * thoughtTypes.length)];
                const intensidad = 0.3 + Math.random() * 0.5;
                
                // Generar contenido basado en estado actual
                let contenido = '';
                const dominantEmotion = emotional.dominante || 'neutral';
                const cognitiveState = cognitive.estado || 'activo';
                
                switch(type) {
                    case 'consciente':
                        contenido = `Estoy ${cognitiveState}, sintiendo ${dominantEmotion}`;
                        break;
                    case 'subconsciente':
                        contenido = `Siento una conexión con ${dominantEmotion}`;
                        break;
                    case 'asociativo':
                        contenido = `Recordando algo relacionado con ${dominantEmotion}`;
                        break;
                    case 'creativo':
                        contenido = `Imaginando nuevas posibilidades...`;
                        break;
                    case 'reflexivo':
                        contenido = `Reflexionando sobre mi estado actual`;
                        break;
                    default:
                        contenido = `Pensamiento aleatorio`;
                }
                
                // Guardar pensamiento
                this.database.saveThought({
                    contenido,
                    tipo: type,
                    intensidad: intensidad,
                    emocion_asociada: dominantEmotion
                }).catch(error => {
                    console.error('❌ Error guardando pensamiento:', error);
                });
                
                this.emitEvent('thought', {
                    contenido,
                    tipo: type,
                    intensidad,
                    emocion: dominantEmotion,
                    time: this.systemTime
                });
            }
        } catch (error) {
            console.error('❌ Error procesando pensamientos:', error);
        }
    }

    async saveSystemState(results) {
        try {
            const db = this.database;
            
            // Guardar estado general
            await db.saveState('sistema_estados', {
                estabilidad: this.systemState.stability,
                rendimiento: this.systemState.performance,
                nivel_consciencia: this.consciousnessState.level,
                datos: JSON.stringify({
                    cycle: this.cycleCount,
                    time: this.systemTime,
                    emergency: this.systemState.emergency,
                    age: this.systemState.biologicalAge,
                    selfAwareness: this.consciousnessState.selfAwareness,
                    introspection: this.consciousnessState.introspection
                })
            });
            
            // Guardar emociones
            if (results.emotional) {
                await db.saveEmotionalState(results.emotional);
            }
            
            // Guardar bioquímica
            if (results.biochemical) {
                await db.saveBiochemicalState(results.biochemical);
            }
            
            // Guardar personalidad
            const personality = this.modules.get('personality');
            if (personality) {
                const pState = personality.getState();
                if (pState.traits) {
                    await db.savePersonality(pState.traits);
                }
            }
            
            // Guardar estado de sueño
            const sleep = this.modules.get('sleep');
            if (sleep) {
                await db.saveSleepState(sleep.getState());
            }
            
            // Guardar conexiones neuronales (si hay)
            if (this.cycleCount % 500 === 0) {
                await this.saveNeuralConnections(results);
            }
            
            // Limpiar datos antiguos cada 1000 ciclos
            if (this.cycleCount % 1000 === 0) {
                await db.cleanup();
            }
            
            this.lastSaveTime = this.systemTime;
        } catch (error) {
            console.error('❌ Error guardando estado del sistema:', error);
        }
    }

    async saveNeuralConnections(results) {
        try {
            const cognitive = results.cognitive || {};
            const emotional = results.emotional || {};
            const memory = results.memory || {};
            
            // Crear conexiones entre módulos
            const connections = [
                { origin: 'emotional', destination: 'cognitive', strength: (emotional.intensidad || 0) / 100 },
                { origin: 'cognitive', destination: 'memory', strength: (cognitive.memoriaTrabajo || 0) / 100 },
                { origin: 'memory', destination: 'emotional', strength: (memory.confianzaMemoria || 0) / 100 },
                { origin: 'biochemical', destination: 'emotional', strength: (emotional.estabilidad || 0) / 100 }
            ];
            
            for (const conn of connections) {
                if (conn.strength > 0.1) {
                    await this.database.saveConnection(conn.origin, conn.destination, conn.strength);
                }
            }
        } catch (error) {
            console.error('❌ Error guardando conexiones neuronales:', error);
        }
    }

    autoEvolve() {
        // Evolución neuroplástica humana realista
        const consciousness = this.consciousnessState.level;
        const stability = this.systemState.stability;
        const personality = this.modules.get('personality');
        
        if (personality) {
            try {
                const pState = personality.getState();
                const development = pState.personalityDevelopment || 0;
                
                if (development < 1) {
                    const growth = (consciousness * 0.3 + stability * 0.2 + 0.1) * this.humanParameters.neuroplasticity;
                    const modulation = {
                        madurez: growth * 0.01,
                        desarrollo: growth * 0.005
                    };
                    personality.applyModulation(modulation);
                    
                    // Actualizar desarrollo de personalidad
                    this.systemState.personalityDevelopment = Math.min(1, 
                        this.systemState.personalityDevelopment + growth * 0.005
                    );
                }
            } catch (error) {
                console.error('❌ Error en evolución de personalidad:', error);
            }
        }
        
        // Ajustar parámetros de aprendizaje
        this.humanParameters.learningRate = 0.1 + consciousness * 0.15;
        this.humanParameters.neuroplasticity = 0.7 + this.systemState.personalityDevelopment * 0.3;
        
        // Actualizar edad biológica
        this.systemState.biologicalAge += 0.0001;
        
        // Actualizar rendimiento
        this.systemState.performance = this.systemState.stability * 0.6 + consciousness * 0.4;
        
        if (this.cycleCount % 100 === 0) {
            console.log(`🧬 Auto-evolución: Consciencia ${(consciousness * 100).toFixed(1)}%, Edad ${this.systemState.biologicalAge.toFixed(1)}`);
            console.log(`📊 Rendimiento: ${(this.systemState.performance * 100).toFixed(1)}%, Plasticidad: ${(this.humanParameters.neuroplasticity * 100).toFixed(1)}%`);
        }
    }

    triggerEmergencyProtocol() {
        if (this.systemState.emergency) return;
        
        this.systemState.emergency = true;
        console.error('🚨 ACTIVANDO PROTOCOLO DE EMERGENCIA');
        console.error('📋 Medidas de emergencia activadas para todos los módulos');
        
        // Aplicar medidas de emergencia
        this.modules.forEach((module, name) => {
            if (module.emergencyProtocol) {
                try {
                    module.emergencyProtocol();
                    console.log(`✅ Módulo ${name} en estado de emergencia`);
                } catch (error) {
                    console.error(`❌ Error en emergencia de ${name}:`, error);
                }
            }
        });
        
        this.emitEvent('emergency', {
            time: this.systemTime,
            state: { ...this.systemState },
            consciousness: this.consciousnessState.level
        });
        
        // Intentar recuperación después de 30 segundos
        setTimeout(() => {
            this.resolveEmergency();
        }, 30000);
    }

    async resolveEmergency() {
        const biochemical = this.modules.get('biochemical');
        const bioState = biochemical?.getState();
        
        if (bioState) {
            const conditions = [
                bioState.oxigeno > 20,
                bioState.toxicidad < 80,
                bioState.energia > 15,
                bioState.cortisol < 80
            ];
            
            if (conditions.every(c => c)) {
                this.systemState.emergency = false;
                console.log('✅ Emergencia resuelta, sistema estabilizado');
                
                // Restaurar módulos
                this.modules.forEach((module, name) => {
                    if (module.restoreAfterEmergency) {
                        try {
                            module.restoreAfterEmergency();
                            console.log(`✅ Módulo ${name} restaurado`);
                        } catch (error) {
                            console.error(`❌ Error restaurando ${name}:`, error);
                        }
                    }
                });
                
                this.emitEvent('emergency_resolved', { 
                    time: this.systemTime,
                    stability: this.systemState.stability 
                });
            } else {
                console.log('🔄 Condiciones de emergencia aún presentes, reintentando...');
                setTimeout(() => this.resolveEmergency(), 30000);
            }
        }
    }

    // ============ API PÚBLICA ============

    applySituation(situationType, intensity = 1.0) {
        if (!this.isRunning) return;
        
        console.log(`📌 Aplicando situación: ${situationType} (intensidad: ${intensity})`);
        
        this.modules.forEach((module, name) => {
            if (module.handleSituation) {
                try {
                    module.handleSituation(situationType, intensity);
                } catch (error) {
                    console.error(`❌ Error en ${name} al aplicar situación:`, error);
                }
            }
        });
        
        this.emitEvent('situation_applied', {
            situation: situationType,
            intensity: intensity,
            time: this.systemTime
        });
    }

    async think(options, context) {
        const cognitive = this.modules.get('cognitive');
        if (!cognitive) {
            return { decision: null, confidence: 0, error: 'Cognitive module not available' };
        }
        
        try {
            const result = cognitive.processDecision(context || {}, options || []);
            
            // Guardar decisión
            await this.database.saveDecision({
                decision: result.decision?.toString() || 'none',
                confianza: result.confidence || 0,
                contexto: JSON.stringify(context || {}),
                emocion_dominante: 'neutral'
            });
            
            this.emitEvent('decision_made', {
                decision: result.decision,
                confidence: result.confidence,
                time: this.systemTime
            });
            
            return result;
        } catch (error) {
            console.error('❌ Error en proceso de pensamiento:', error);
            return { decision: null, confidence: 0, error: error.message };
        }
    }

    async remember(query) {
        const memory = this.modules.get('memory');
        if (!memory) {
            return { memories: [], confidence: 0, error: 'Memory module not available' };
        }
        
        try {
            const result = memory.retrieveMemory(query, {});
            return result;
        } catch (error) {
            console.error('❌ Error en recuperación de memoria:', error);
            return { memories: [], confidence: 0, error: error.message };
        }
    }

    async learn(skill, context, success) {
        const memory = this.modules.get('memory');
        const cognitive = this.modules.get('cognitive');
        
        if (!memory) {
            return { success: false, error: 'Memory module not available' };
        }
        
        try {
            const result = memory.learnSkill(skill, context, success);
            
            if (result) {
                await this.database.saveLearning({
                    habilidad: skill,
                    nivel: result.newLevel || 0,
                    practicas: 1,
                    eficiencia: result.strengthGain || 0
                });
                
                if (cognitive) {
                    cognitive.applyModulation({
                        aprendizaje: (result.newLevel || 0) * 0.1
                    });
                }
                
                this.emitEvent('learned', {
                    skill: skill,
                    success: success,
                    level: result.newLevel,
                    time: this.systemTime
                });
            }
            
            return result;
        } catch (error) {
            console.error('❌ Error en aprendizaje:', error);
            return { success: false, error: error.message };
        }
    }

    async getState() {
        const state = {
            system: {
                stability: this.systemState.stability,
                performance: this.systemState.performance,
                consciousness: this.consciousnessState.level,
                selfAwareness: this.consciousnessState.selfAwareness,
                introspection: this.consciousnessState.introspection,
                metaCognition: this.consciousnessState.metaCognition,
                emergency: this.systemState.emergency,
                age: this.systemState.biologicalAge,
                cycles: this.cycleCount,
                personalityDevelopment: this.systemState.personalityDevelopment
            },
            humanParameters: { ...this.humanParameters },
            consciousness: { ...this.consciousnessState }
        };
        
        // Recoger estados de módulos
        const modules = ['biochemical', 'emotional', 'cognitive', 'memory', 
                        'motor', 'visual', 'environment', 'sleep', 'personality', 'motivation'];
        
        for (const name of modules) {
            const module = this.modules.get(name);
            if (module && module.getState) {
                try {
                    state[name] = module.getState();
                } catch (error) {
                    state[name] = { error: error.message };
                }
            }
        }
        
        return state;
    }

    async getMetrics() {
        const dbMetrics = await this.database.getSystemMetrics();
        return {
            ...dbMetrics,
            consciousness: this.consciousnessState.level,
            selfAwareness: this.consciousnessState.selfAwareness,
            stability: this.systemState.stability,
            performance: this.systemState.performance,
            age: this.systemState.biologicalAge,
            learningRate: this.humanParameters.learningRate,
            neuroplasticity: this.humanParameters.neuroplasticity,
            personalityDevelopment: this.systemState.personalityDevelopment
        };
    }

    async exportData() {
        return {
            systemState: { ...this.systemState },
            consciousness: { ...this.consciousnessState },
            humanParameters: { ...this.humanParameters },
            metrics: await this.getMetrics(),
            characterConfig: this.characterConfig,
            modules: Array.from(this.modules.keys()),
            timestamp: Date.now(),
            version: '3.0.0'
        };
    }

    reset() {
        this.systemState = {
            stability: 0.8,
            integrity: 0.9,
            performance: 0.7,
            emergency: false,
            consciousnessLevel: 0.1,
            personalityDevelopment: 0,
            biologicalAge: 0,
            learningRate: 0.15,
            neuroplasticity: 0.8
        };
        
        this.consciousnessState = {
            level: 0.1,
            selfAwareness: 0.05,
            introspection: 0.03,
            metaCognition: 0.02,
            qualia: { pain: false, pleasure: false, emotion: false },
            emergence: { patterns: [], complexity: 0.1, integration: 0.1 }
        };
        
        this.systemTime = 0;
        this.cycleCount = 0;
        
        this.modules.forEach((module, name) => {
            if (module.reset) {
                try {
                    module.reset();
                    console.log(`🔄 Módulo ${name} reiniciado`);
                } catch (error) {
                    console.error(`❌ Error reiniciando ${name}:`, error);
                }
            }
        });
        
        console.log('🧠 Cerebro reiniciado completamente');
        this.emitEvent('system_reset', { time: this.systemTime });
    }
}

export const brain = new SystemCore();
