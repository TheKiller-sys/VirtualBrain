// src/app.js
import { systemCore } from './core/SystemCore.js';
import './modules/BiochemicalSystem.js';
import './modules/EmotionalSystem.js';
import './modules/CognitiveSystem.js';
import './modules/MemorySystem.js';
import './modules/MotorSystem.js';
import './modules/VisualSystem.js';
import './modules/EnvironmentSystem.js';
import './modules/SleepSystem.js';
import './modules/PersonalitySystem.js';
import './modules/MotivationSystem.js';
import './modules/ControlSystem.js';

class AdvancedNervousSystemApp {
    constructor() {
        this.systemCore = systemCore;
        this.isInitialized = false;
        this.controlSystem = null;
        this.animationId = null;
        this.lastTime = 0;
        
        this.initializeApp();
    }

    async initializeApp() {
        try {
            const initialConfig = {
                nombre: "Nexus Prime",
                genotipo: "resiliente",
                genero: "neutro",
                edad: 0,
                experiencia: 0
            };

            await this.systemCore.initializeSystem(initialConfig);
            this.initializeControlSystem();
            this.initializeEventListeners();
            this.initializeUI();
            
            this.isInitialized = true;
            this.startGameLoop();
            
            console.log('✅ Sistema inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando la aplicación:', error);
        }
    }

    initializeControlSystem() {
        this.controlSystem = this.systemCore.modules.get('control');
    }

    initializeEventListeners() {
        window.addEventListener('systemLog', (event) => {
            this.addLogEntry(event.detail);
        });

        window.addEventListener('systemStateChange', (event) => {
            this.updateSystemDisplay(event.detail);
        });
        
        window.addEventListener('alert', (event) => {
            console.warn('⚠️ Alerta del sistema:', event.detail);
        });
    }

    initializeUI() {
        this.loadSituations();
        this.loadSequences();
        this.updateCharacterDisplay();
        this.setupControlButtons();
    }

    loadSituations() {
        const situations = [
            { id: 'oxigeno_alto', name: '🌬️ Alto Oxígeno', positive: true },
            { id: 'oxigeno_bajo', name: '💨 Bajo Oxígeno', danger: true },
            { id: 'toxinas', name: '☠️ Aumentar Toxinas', danger: true },
            { id: 'limpiar_toxinas', name: '🌿 Limpiar Toxinas', positive: true },
            { id: 'recompensa', name: '🎁 Dar Recompensa', positive: true },
            { id: 'amenaza', name: '⚠️ Amenaza', danger: true },
            { id: 'alegria', name: '😄 Inducir Alegría', positive: true },
            { id: 'tristeza', name: '😢 Inducir Tristeza' },
            { id: 'miedo', name: '😨 Inducir Miedo', danger: true },
            { id: 'ira', name: '😠 Inducir Ira', danger: true },
            { id: 'confianza', name: '😌 Inducir Confianza', positive: true },
            { id: 'reposo', name: '😴 Modo Reposo', positive: true },
            { id: 'actividad_alta', name: '🏃 Actividad Alta' },
            { id: 'interaccion_social', name: '👥 Interacción Social', positive: true },
            { id: 'tormenta', name: '⛈️ Tormenta', danger: true },
            { id: 'desastre', name: '💥 Desastre', danger: true }
        ];

        const grid = document.getElementById('situationsGrid');
        if (grid) {
            grid.innerHTML = situations.map(sit => `
                <button class="situation-btn ${sit.danger ? 'danger' : ''} ${sit.positive ? 'positive' : ''}" 
                        data-situation="${sit.id}">
                    ${sit.name}
                </button>
            `).join('');

            grid.querySelectorAll('.situation-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const situation = btn.dataset.situation;
                    this.systemCore.applySituation(situation, 1.0);
                });
            });
        }
    }

    loadSequences() {
        const sequences = [
            { id: 'estres_gradual', name: '📈 Estrés Gradual' },
            { id: 'recuperacion', name: '🔄 Recuperación' },
            { id: 'crisis_extrema', name: '🚨 Crisis Extrema' },
            { id: 'estado_optimo', name: '⭐ Estado Óptimo' }
        ];

        const grid = document.getElementById('sequencesGrid');
        if (grid) {
            grid.innerHTML = sequences.map(seq => `
                <button class="sequence-btn ${seq.id.includes('crisis') ? 'danger' : ''} ${seq.id.includes('optimo') ? 'positive' : ''}" 
                        data-sequence="${seq.id}">
                    ${seq.name}
                </button>
            `).join('');

            grid.querySelectorAll('.sequence-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const sequenceId = btn.dataset.sequence;
                    this.executeSequence(sequenceId);
                });
            });
        }
    }

    async executeSequence(sequenceId) {
        const sequences = {
            'estres_gradual': ['actividad_alta', 'amenaza', 'oxigeno_bajo', 'toxinas'],
            'recuperacion': ['reposo', 'limpiar_toxinas', 'recompensa', 'interaccion_social'],
            'crisis_extrema': ['oxigeno_bajo', 'toxinas', 'amenaza', 'actividad_alta', 'ira'],
            'estado_optimo': ['oxigeno_alto', 'recompensa', 'confianza', 'alegria', 'interaccion_social']
        };

        const actions = sequences[sequenceId];
        if (!actions) return;

        this.addLogEntry({ message: `Ejecutando secuencia: ${sequenceId}`, type: 'system' });

        for (let i = 0; i < actions.length; i++) {
            await this.delay(2000);
            this.systemCore.applySituation(actions[i], 1.0);
        }
    }

    startGameLoop() {
        const gameLoop = (currentTime) => {
            const deltaTime = (currentTime - this.lastTime) / 1000;
            this.lastTime = currentTime;
            
            if (this.isInitialized) {
                this.systemCore.update(deltaTime);
                this.updateDisplay();
            }
            
            this.animationId = requestAnimationFrame(gameLoop);
        };
        
        this.animationId = requestAnimationFrame(gameLoop);
    }

    updateDisplay() {
        this.updateStatusBars();
        this.updateEnvironmentInfo();
        this.updateMemoryDisplay();
        this.updateCharacterState();
        this.updateSystemStats();
    }

    updateStatusBars() {
        const biochemical = this.systemCore.modules.get('biochemical');
        const emotional = this.systemCore.modules.get('emotional');
        const cognitive = this.systemCore.modules.get('cognitive');
        
        if (biochemical && emotional && cognitive) {
            this.updatePhysiologicalStatus(biochemical.getState());
            this.updateEmotionalStatus(emotional.getState());
            this.updateCognitiveStatus(cognitive.getState());
        }
    }

    updatePhysiologicalStatus(state) {
        const container = document.getElementById('physiologicalStatus');
        if (!container) return;
        
        const bars = [
            { name: 'Oxígeno', value: state.oxigeno || 0, color: '#4FC3F7' },
            { name: 'Energía', value: state.energia || 0, color: '#FFEB3B' },
            { name: 'Toxicidad', value: state.toxicidad || 0, color: '#795548' },
            { name: 'Cortisol', value: state.cortisol || 0, color: '#F44336' }
        ];
        
        container.innerHTML = bars.map(bar => `
            <div class="status-bar">
                <div class="status-label">
                    <span class="status-name">${bar.name}</span>
                    <span class="status-value">${Math.round(bar.value)}%</span>
                </div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${Math.min(100, bar.value)}%; background: ${bar.color};"></div>
                </div>
            </div>
        `).join('');
    }

    updateEmotionalStatus(state) {
        const container = document.getElementById('emotionalStatus');
        if (!container) return;
        
        const emotions = [
            { name: 'Alegría', value: state.alegria || 0, color: '#FFD54F' },
            { name: 'Miedo', value: state.miedo || 0, color: '#BA68C8' },
            { name: 'Ira', value: state.ira || 0, color: '#E57373' },
            { name: 'Confianza', value: state.confianza || 0, color: '#81C784' }
        ];
        
        container.innerHTML = emotions.map(emotion => `
            <div class="status-bar">
                <div class="status-label">
                    <span class="status-name">${emotion.name}</span>
                    <span class="status-value">${Math.round(emotion.value)}%</span>
                </div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${Math.min(100, emotion.value)}%; background: ${emotion.color};"></div>
                </div>
            </div>
        `).join('');
    }

    updateCognitiveStatus(state) {
        const container = document.getElementById('cognitiveStatus');
        if (!container) return;
        
        const skills = [
            { name: 'Atención', value: state.atencion || 0, color: '#4FC3F7' },
            { name: 'Razonamiento', value: state.razonamiento || 0, color: '#AED581' },
            { name: 'Memoria', value: state.memoriaTrabajo || 0, color: '#CE93D8' }
        ];
        
        container.innerHTML = skills.map(skill => `
            <div class="status-bar">
                <div class="status-label">
                    <span class="status-name">${skill.name}</span>
                    <span class="status-value">${Math.round(skill.value)}%</span>
                </div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${Math.min(100, skill.value)}%; background: ${skill.color};"></div>
                </div>
            </div>
        `).join('');
    }

    updateEnvironmentInfo() {
        const environment = this.systemCore.modules.get('environment');
        if (!environment) return;
        
        const state = environment.getState();
        const container = document.getElementById('environmentInfo');
        if (!container) return;
        
        container.innerHTML = `
            <div class="environment-item">
                <span class="environment-name">Oxígeno</span>
                <span class="environment-value">${Math.round(state.oxigeno || 0)}%</span>
            </div>
            <div class="environment-item">
                <span class="environment-name">Toxinas</span>
                <span class="environment-value">${Math.round(state.toxinas || 0)}%</span>
            </div>
            <div class="environment-item">
                <span class="environment-name">Peligro</span>
                <span class="environment-value">${Math.round(state.peligro || 0)}%</span>
            </div>
            <div class="environment-item">
                <span class="environment-name">Temperatura</span>
                <span class="environment-value">${(state.temperatura || 0).toFixed(1)}°C</span>
            </div>
        `;
    }

    updateMemoryDisplay() {
        const memory = this.systemCore.modules.get('memory');
        if (!memory) return;
        
        const state = memory.getState();
        const container = document.getElementById('memoryStatus');
        if (!container) return;
        
        container.innerHTML = `
            <div class="environment-item">
                <span class="environment-name">Memoria Episódica</span>
                <span class="environment-value">${state.episodica || 0}</span>
            </div>
            <div class="environment-item">
                <span class="environment-name">Habilidades</span>
                <span class="environment-value">${state.procedural || 0}</span>
            </div>
            <div class="environment-item">
                <span class="environment-name">Confianza</span>
                <span class="environment-value">${Math.round(state.confianzaMemoria || 0)}%</span>
            </div>
        `;
    }

    updateCharacterState() {
        const biochemical = this.systemCore.modules.get('biochemical');
        const emotional = this.systemCore.modules.get('emotional');
        const personality = this.systemCore.modules.get('personality');
        
        if (biochemical && emotional) {
            const bioState = biochemical.getState();
            const emoState = emotional.getState();
            
            const charState = document.getElementById('charState');
            if (charState) {
                charState.textContent = this.getCharacterState(bioState, emoState);
                charState.style.color = this.getStateColor(bioState, emoState);
            }
        }
        
        if (personality) {
            const perState = personality.getState();
            const charGenotype = document.getElementById('charGenotype');
            if (charGenotype && perState.description) {
                charGenotype.textContent = `Personalidad: ${perState.description}`;
            }
        }
    }

    updateSystemStats() {
        const systemState = this.systemCore.getSystemState();
        const stabilityElement = document.querySelector('.system-stability');
        
        if (stabilityElement) {
            const stability = (systemState.stability || 0) * 100;
            stabilityElement.textContent = `Estabilidad: ${stability.toFixed(1)}%`;
            stabilityElement.style.color = this.getStabilityColor(stability);
        }
    }

    getCharacterState(bioState, emoState) {
        if ((bioState.oxigeno || 100) < 15) return "🆘 HIPOXIA CRÍTICA";
        if ((bioState.toxicidad || 0) > 85) return "☠️ INTOXICACIÓN SEVERA";
        if ((bioState.energia || 100) < 10) return "💤 AGOTAMIENTO EXTREMO";
        if ((emoState.miedo || 0) > 80) return "😨 PÁNICO";
        if ((emoState.ira || 0) > 80) return "😠 FURIA";
        if ((emoState.alegria || 0) > 80) return "😄 ÉXTASIS";
        if ((bioState.cortisol || 0) > 70) return "😰 ESTRÉS ELEVADO";
        if ((emoState.confianza || 0) > 70) return "😌 CONFIANZA ALTA";
        return "⚖️ ESTADO EQUILIBRADO";
    }

    getStateColor(bioState, emoState) {
        if ((bioState.oxigeno || 100) < 20 || (bioState.toxicidad || 0) > 80) return '#ff0000';
        if ((bioState.energia || 100) < 20 || (bioState.cortisol || 0) > 70) return '#ff6b00';
        if ((emoState.alegria || 0) > 70 || (emoState.confianza || 0) > 70) return '#00ff00';
        return '#00d4ff';
    }

    getStabilityColor(stability) {
        if (stability >= 80) return '#00ff00';
        if (stability >= 60) return '#ffff00';
        if (stability >= 40) return '#ffa500';
        return '#ff0000';
    }

    updateCharacterDisplay() {
        const config = this.systemCore.characterConfig;
        const charName = document.getElementById('charName');
        if (charName) {
            charName.textContent = config?.nombre || 'NEXUS PRIME';
        }
    }

    setupControlButtons() {
        const resetBtn = document.getElementById('resetSystem');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('¿Reiniciar todo el sistema?')) {
                    this.systemCore.resetSystem();
                }
            });
        }

        const exportBtn = document.getElementById('exportData');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const data = this.systemCore.exportSystemData();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `sistema_${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
            });
        }

        const toggleBtn = document.getElementById('toggleAI');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.systemCore.autoEvolution = !this.systemCore.autoEvolution;
                toggleBtn.textContent = `🤖 Auto-evolución: ${this.systemCore.autoEvolution ? 'ON' : 'OFF'}`;
            });
        }

        const emergencyBtn = document.getElementById('emergencyStop');
        if (emergencyBtn) {
            emergencyBtn.addEventListener('click', () => {
                if (confirm('¿Activar parada de emergencia?')) {
                    this.systemCore.triggerEmergencyProtocol();
                }
            });
        }

        const applyBtn = document.getElementById('applyCharacter');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                const selector = document.getElementById('characterSelect');
                if (selector) {
                    const genotipo = selector.value;
                    const names = {
                        resiliente: 'Nexus Prime',
                        vulnerable: 'Sigma',
                        audaz: 'Thor',
                        intelectual: 'Athena',
                        social: 'Luna'
                    };
                    this.systemCore.changeCharacter({
                        nombre: names[genotipo] || 'Nexus Prime',
                        genotipo: genotipo,
                        genero: 'neutro'
                    });
                    this.updateCharacterDisplay();
                }
            });
        }
    }

    addLogEntry(logEntry) {
        const container = document.getElementById('systemLog');
        if (!container) return;
        
        const entryElement = document.createElement('div');
        entryElement.className = `log-entry ${logEntry.type || 'system'}`;
        entryElement.innerHTML = `
            <span class="log-time">${logEntry.timestamp || new Date().toLocaleTimeString()}</span>
            <span class="log-message">${logEntry.message}</span>
        `;
        
        container.appendChild(entryElement);
        container.scrollTop = container.scrollHeight;
        
        if (container.children.length > 50) {
            container.removeChild(container.firstChild);
        }
    }

    updateSystemDisplay(systemState) {
        console.log('Estado del sistema actualizado:', systemState);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.isInitialized = false;
    }
}

window.addEventListener('load', () => {
    window.nervousSystemApp = new AdvancedNervousSystemApp();
});
