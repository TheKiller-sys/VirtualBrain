// src/modules/ControlSystem.js
import { systemCore } from '../core/SystemCore.js';

export class ControlSystem {
    constructor() {
        this.config = {};
        this.uiState = {};
        this.controlMapping = new Map();
        this.situationPresets = new Map();
        this.eventListeners = [];
        this.actionHistory = [];
        this.systemLogs = [];
        this.isDebugMode = false;
        this.lastControlAction = null;
    }

    async initialize(characterConfig) {
        this.config = characterConfig || { genotipo: 'humano' };
        this.initializeUIState();
        this.setupControlMapping();
        this.setupSituationPresets();
        this.setupEventListeners();
        systemCore.logSystem('Sistema de control V3.0 inicializado');
    }

    initializeUIState() {
        this.uiState = {
            panelAbierto: 'principal',
            modoVisualizacion: 'completo',
            tema: 'oscuro',
            mostrarBioquimica: true,
            mostrarEmociones: true,
            mostrarCognicion: true,
            mostrarMemoria: true,
            mostrarMotor: true,
            pausa: false,
            velocidadSimulacion: 1.0,
            registroAutomatico: true,
            interaccionActiva: false,
            ultimaAccion: null,
            historialAcciones: []
        };
    }

    setupControlMapping() {
        this.controlMapping.set('reset_system', {
            funcion: () => systemCore.resetSystem(),
            confirmacion: true,
            mensaje: '¿Reiniciar todo el sistema?'
        });
        
        this.controlMapping.set('export_data', {
            funcion: () => this.exportSystemData(),
            confirmacion: false
        });
        
        this.controlMapping.set('toggle_ai', {
            funcion: () => this.toggleAutoEvolution(),
            confirmacion: false
        });
        
        this.controlMapping.set('emergency_stop', {
            funcion: () => this.emergencyStop(),
            confirmacion: true,
            mensaje: '¿Activar parada de emergencia?'
        });

        this.controlMapping.set('save_state', {
            funcion: () => this.saveState(),
            confirmacion: false
        });

        this.controlMapping.set('load_state', {
            funcion: () => this.loadState(),
            confirmacion: true,
            mensaje: '¿Cargar último estado guardado?'
        });
    }

    setupSituationPresets() {
        this.situationPresets.set('estres_gradual', {
            nombre: 'Estrés Gradual',
            descripcion: 'Aumento progresivo de factores estresantes',
            situaciones: [
                { tipo: 'actividad_normal', intensidad: 1.0, delay: 2000 },
                { tipo: 'actividad_alta', intensidad: 1.0, delay: 3000 },
                { tipo: 'amenaza', intensidad: 0.7, delay: 4000 },
                { tipo: 'oxigeno_bajo', intensidad: 0.8, delay: 5000 },
                { tipo: 'estres_alto', intensidad: 0.6, delay: 3000 }
            ]
        });
        
        this.situationPresets.set('recuperacion', {
            nombre: 'Recuperación',
            descripcion: 'Proceso de recuperación y relajación',
            situaciones: [
                { tipo: 'reposo', intensidad: 1.0, delay: 2000 },
                { tipo: 'limpiar_toxinas', intensidad: 1.0, delay: 3000 },
                { tipo: 'recompensa', intensidad: 0.9, delay: 4000 },
                { tipo: 'interaccion_social', intensidad: 0.8, delay: 5000 },
                { tipo: 'descanso', intensidad: 1.0, delay: 3000 }
            ]
        });
        
        this.situationPresets.set('crisis_extrema', {
            nombre: 'Crisis Extrema',
            descripcion: 'Situación de emergencia múltiple',
            situaciones: [
                { tipo: 'oxigeno_bajo', intensidad: 1.0, delay: 1000 },
                { tipo: 'toxinas', intensidad: 1.0, delay: 1500 },
                { tipo: 'amenaza', intensidad: 1.0, delay: 2000 },
                { tipo: 'actividad_alta', intensidad: 1.0, delay: 2500 },
                { tipo: 'ira', intensidad: 0.9, delay: 3000 },
                { tipo: 'estres_alto', intensidad: 1.0, delay: 2000 }
            ]
        });
        
        this.situationPresets.set('estado_optimo', {
            nombre: 'Estado Óptimo',
            descripcion: 'Condiciones ideales para máximo rendimiento',
            situaciones: [
                { tipo: 'oxigeno_alto', intensidad: 1.0, delay: 2000 },
                { tipo: 'recompensa', intensidad: 1.0, delay: 3000 },
                { tipo: 'confianza', intensidad: 1.0, delay: 4000 },
                { tipo: 'alegria', intensidad: 1.0, delay: 5000 },
                { tipo: 'interaccion_social', intensidad: 1.0, delay: 6000 },
                { tipo: 'inspiracion', intensidad: 0.8, delay: 3000 }
            ]
        });

        this.situationPresets.set('creatividad', {
            nombre: 'Flujo Creativo',
            descripcion: 'Estímulo de la creatividad',
            situaciones: [
                { tipo: 'inspiracion', intensidad: 1.0, delay: 2000 },
                { tipo: 'sorpresa', intensidad: 0.8, delay: 3000 },
                { tipo: 'recompensa', intensidad: 0.7, delay: 4000 },
                { tipo: 'interaccion_social', intensidad: 0.6, delay: 5000 },
                { tipo: 'desafio', intensidad: 0.9, delay: 3000 }
            ]
        });

        this.situationPresets.set('aprendizaje', {
            nombre: 'Aprendizaje Intenso',
            descripcion: 'Optimización del aprendizaje',
            situaciones: [
                { tipo: 'desafio', intensidad: 1.0, delay: 2000 },
                { tipo: 'recompensa', intensidad: 0.9, delay: 3000 },
                { tipo: 'actividad_alta', intensidad: 0.7, delay: 4000 },
                { tipo: 'sorpresa', intensidad: 0.6, delay: 5000 },
                { tipo: 'descanso', intensidad: 0.5, delay: 3000 }
            ]
        });
    }

    // ✅ CORREGIDO: Verificar si window existe
    setupEventListeners() {
        // Solo en entorno de navegador
        if (typeof window !== 'undefined') {
            this.setupDOMEventListeners();
            
            // Escuchar eventos del sistema central
            window.addEventListener('systemLog', (event) => {
                this.handleSystemLog(event.detail);
            });
            
            window.addEventListener('systemStateChange', (event) => {
                this.handleSystemStateChange(event.detail);
            });
        } else {
            // En entorno Node.js, solo eventos del sistema
            systemCore.onEvent((event) => {
                if (event.type === 'systemLog') {
                    this.handleSystemLog(event.data);
                } else if (event.type === 'systemStateChange') {
                    this.handleSystemStateChange(event.data);
                }
            });
        }
    }

    // ✅ CORREGIDO: Verificar si document existe
    setupDOMEventListeners() {
        if (typeof document === 'undefined') return;
        
        document.addEventListener('DOMContentLoaded', () => {
            this.setupControlButtons();
            this.setupSituationButtons();
            this.setupSequenceButtons();
            this.setupCharacterSelector();
        });
    }

    // ✅ CORREGIDO: Verificar si document existe
    setupControlButtons() {
        if (typeof document === 'undefined') return;
        
        const controlSelectors = {
            '#resetSystem': 'reset_system',
            '#exportData': 'export_data',
            '#toggleAI': 'toggle_ai',
            '#emergencyStop': 'emergency_stop'
        };
        
        Object.keys(controlSelectors).forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.addEventListener('click', () => {
                    this.executeControl(controlSelectors[selector]);
                });
            }
        });
    }

    // ✅ CORREGIDO: Verificar si document existe
    setupSituationButtons() {
        if (typeof document === 'undefined') return;
        
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('situation-btn')) {
                const situation = event.target.dataset.situation;
                this.applySituation(situation);
            }
        });
    }

    // ✅ CORREGIDO: Verificar si document existe
    setupSequenceButtons() {
        if (typeof document === 'undefined') return;
        
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('sequence-btn')) {
                const sequence = event.target.dataset.sequence;
                this.executeSequence(sequence);
            }
        });
    }

    // ✅ CORREGIDO: Verificar si document existe
    setupCharacterSelector() {
        if (typeof document === 'undefined') return;
        
        const selector = document.getElementById('characterSelect');
        const applyButton = document.getElementById('applyCharacter');
        
        if (selector && applyButton) {
            applyButton.addEventListener('click', () => {
                this.changeCharacter(selector.value);
            });
        }
    }

    executeControl(controlId) {
        const control = this.controlMapping.get(controlId);
        if (!control) {
            systemCore.logSystem(`Control no encontrado: ${controlId}`, 'error');
            return;
        }
        
        // ✅ Verificar si confirm existe (solo en navegador)
        if (control.confirmacion) {
            if (typeof window !== 'undefined' && window.confirm) {
                if (window.confirm(control.mensaje || '¿Está seguro?')) {
                    control.funcion();
                    this.lastControlAction = controlId;
                }
            } else {
                // En Node.js, ejecutar sin confirmación
                control.funcion();
                this.lastControlAction = controlId;
            }
        } else {
            control.funcion();
            this.lastControlAction = controlId;
        }
        this.actionHistory.push({ control: controlId, timestamp: systemCore.systemTime || Date.now() });
        if (this.actionHistory.length > 50) this.actionHistory.shift();
    }

    applySituation(situationType, intensity = 1.0) {
        systemCore.applySituation(situationType, intensity);
        this.actionHistory.push({ action: 'situation', type: situationType, intensity: intensity, timestamp: systemCore.systemTime || Date.now() });
        this.addLog(`Situación aplicada: ${situationType} (intensidad: ${intensity})`, 'system');
    }

    async executeSequence(sequenceId) {
        const sequence = this.situationPresets.get(sequenceId);
        if (!sequence) {
            this.addLog(`Secuencia no encontrada: ${sequenceId}`, 'error');
            return;
        }
        this.addLog(`Iniciando secuencia: ${sequence.nombre}`, 'system');
        this.actionHistory.push({ action: 'sequence', id: sequenceId, name: sequence.nombre, timestamp: systemCore.systemTime || Date.now() });
        for (const situacion of sequence.situaciones) {
            await this.delay(situacion.delay);
            this.applySituation(situacion.tipo, situacion.intensidad);
        }
        this.addLog(`Secuencia completada: ${sequence.nombre}`, 'system');
    }

    changeCharacter(genotipo) {
        const characterConfigs = {
            resiliente: { nombre: "Nexus Prime", genotipo: "resiliente", genero: "neutro" },
            vulnerable: { nombre: "Sigma", genotipo: "vulnerable", genero: "neutro" },
            audaz: { nombre: "Thor", genotipo: "audaz", genero: "masculino" },
            intelectual: { nombre: "Athena", genotipo: "intelectual", genero: "femenino" },
            social: { nombre: "Luna", genotipo: "social", genero: "femenino" }
        };
        
        const config = characterConfigs[genotipo];
        if (config) {
            systemCore.changeCharacter(config);
            this.recordAction('cambio_personaje', config);
        }
    }

    exportSystemData() {
        const data = systemCore.exportSystemData();
        // ✅ Verificar si window existe
        if (typeof window !== 'undefined') {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sistema_nervioso_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } else {
            console.log('📊 Datos exportados (JSON):', JSON.stringify(data, null, 2));
        }
        this.addLog('Datos del sistema exportados', 'system');
        return data;
    }

    toggleAutoEvolution() {
        systemCore.autoEvolution = !systemCore.autoEvolution;
        // ✅ Verificar si document existe
        if (typeof document !== 'undefined') {
            const button = document.getElementById('toggleAI');
            if (button) {
                button.textContent = `🤖 Auto-evolución: ${systemCore.autoEvolution ? 'ON' : 'OFF'}`;
            }
        }
        this.addLog(`Auto-evolución ${systemCore.autoEvolution ? 'activada' : 'desactivada'}`, 'system');
        return systemCore.autoEvolution;
    }

    emergencyStop() {
        systemCore.triggerEmergencyProtocol();
        this.addLog('🚨 PARADA DE EMERGENCIA ACTIVADA', 'error');
        this.actionHistory.push({ action: 'emergency_stop', timestamp: systemCore.systemTime || Date.now() });
    }

    async saveState() {
        try {
            const data = systemCore.exportSystemData();
            // ✅ Verificar si window existe
            if (typeof window !== 'undefined') {
                localStorage.setItem('cerebro_state', JSON.stringify(data));
                this.addLog('Estado guardado correctamente', 'system');
            } else {
                // En Node.js, guardar en archivo
                const fs = await import('fs');
                const path = await import('path');
                const savePath = path.join(process.cwd(), 'saved_state.json');
                fs.writeFileSync(savePath, JSON.stringify(data, null, 2));
                this.addLog(`Estado guardado en ${savePath}`, 'system');
            }
        } catch (error) {
            this.addLog(`Error guardando estado: ${error.message}`, 'error');
        }
    }

    async loadState() {
        try {
            let data = null;
            // ✅ Verificar si window existe
            if (typeof window !== 'undefined') {
                const saved = localStorage.getItem('cerebro_state');
                if (saved) data = JSON.parse(saved);
            } else {
                const fs = await import('fs');
                const path = await import('path');
                const loadPath = path.join(process.cwd(), 'saved_state.json');
                if (fs.existsSync(loadPath)) {
                    data = JSON.parse(fs.readFileSync(loadPath, 'utf8'));
                }
            }
            if (data) {
                this.addLog('Estado cargado correctamente', 'system');
            } else {
                this.addLog('No se encontró estado guardado', 'warning');
            }
        } catch (error) {
            this.addLog(`Error cargando estado: ${error.message}`, 'error');
        }
    }

    handleSystemLog(logEntry) {
        this.updateLogDisplay(logEntry);
        this.recordSystemEvent('log', logEntry);
    }

    handleSystemStateChange(stateChange) {
        this.updateUIState(stateChange);
        this.recordSystemEvent('estado', stateChange);
    }

    updateLogDisplay(logEntry) {
        // ✅ Verificar si document existe
        if (typeof document === 'undefined') return;
        
        const logContainer = document.getElementById('systemLog');
        if (!logContainer) return;
        
        const logElement = document.createElement('div');
        logElement.className = `log-entry ${logEntry.type}`;
        logElement.innerHTML = `
            <span class="log-time">${logEntry.timestamp}</span>
            <span class="log-message">${logEntry.message}</span>
        `;
        
        logContainer.appendChild(logElement);
        logContainer.scrollTop = logContainer.scrollHeight;
        
        if (logContainer.children.length > 50) {
            logContainer.removeChild(logContainer.firstChild);
        }
    }

    updateUIState(stateChange) {
        this.updateCharacterDisplay();
        this.updateSystemStatus();
        this.updateControlStates();
    }

    updateCharacterDisplay() {
        // ✅ Verificar si document existe
        if (typeof document === 'undefined') return;
        
        const systemState = systemCore.getSystemState();
        const charName = document.getElementById('charName');
        const charState = document.getElementById('charState');
        const charGenotype = document.getElementById('charGenotype');
        
        if (charName) charName.textContent = systemState.character?.nombre || 'Nexus Prime';
        if (charGenotype) {
            const genotipo = systemState.character?.genotipo || 'resiliente';
            charGenotype.textContent = `Genotipo: ${genotipo.charAt(0).toUpperCase() + genotipo.slice(1)}`;
        }
    }

    updateSystemStatus() {
        // ✅ Verificar si document existe
        if (typeof document === 'undefined') return;
        
        const systemState = systemCore.getSystemState();
        const stabilityElement = document.querySelector('.system-stability');
        
        if (stabilityElement) {
            const stability = (systemState.stability || 0) * 100;
            stabilityElement.textContent = `Estabilidad: ${stability.toFixed(1)}%`;
            stabilityElement.style.color = this.getStabilityColor(stability);
        }
    }

    updateControlStates() {
        // ✅ Verificar si document existe
        if (typeof document === 'undefined') return;
        
        const emergencyStopBtn = document.getElementById('emergencyStop');
        if (emergencyStopBtn) {
            emergencyStopBtn.disabled = systemCore.systemState.emergency || false;
        }
    }

    getStabilityColor(stability) {
        if (stability >= 80) return '#00ff00';
        if (stability >= 60) return '#ffff00';
        if (stability >= 40) return '#ffa500';
        return '#ff0000';
    }

    recordAction(tipo, detalles) {
        const accion = {
            tipo,
            detalles,
            timestamp: new Date().toLocaleTimeString(),
            ciclo: systemCore.cycleCount
        };
        
        this.uiState.historialAcciones.push(accion);
        this.uiState.ultimaAccion = accion;
        
        if (this.uiState.historialAcciones.length > 100) {
            this.uiState.historialAcciones.shift();
        }
    }

    recordSystemEvent(tipo, datos) {
        console.log(`[ControlSystem] Evento ${tipo}:`, datos);
    }

    togglePanel(panelId) {
        this.uiState.panelAbierto = panelId;
        this.updatePanelVisibility();
    }

    updatePanelVisibility() {
        // Implementar lógica para mostrar/ocultar paneles
    }

    setVisualizationMode(mode) {
        this.uiState.modoVisualizacion = mode;
        this.applyVisualizationMode();
    }

    applyVisualizationMode() {
        // ✅ Verificar si document existe
        if (typeof document === 'undefined') return;
        
        const body = document.body;
        body.className = '';
        body.classList.add(`mode-${this.uiState.modoVisualizacion}`);
        body.classList.add(`theme-${this.uiState.tema}`);
    }

    addLog(message, type = 'info') {
        const logEntry = { message, type, timestamp: new Date().toLocaleTimeString() };
        this.systemLogs.push(logEntry);
        if (this.systemLogs.length > 100) this.systemLogs.shift();
        this.emitEvent('log', logEntry);
        if (this.isDebugMode) console.log(`[Control] ${message}`);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getUIState() {
        return { ...this.uiState };
    }

    getSituationPresets() {
        return Array.from(this.situationPresets.entries()).map(([id, preset]) => ({ id, ...preset }));
    }

    getControlMapping() {
        return new Map(this.controlMapping);
    }

    getActionHistory() {
        return this.actionHistory.slice(-20);
    }

    getLogs() {
        return this.systemLogs.slice(-50);
    }

    toggleDebugMode() {
        this.isDebugMode = !this.isDebugMode;
        this.addLog(`Modo debug ${this.isDebugMode ? 'activado' : 'desactivado'}`, 'system');
        return this.isDebugMode;
    }

    reset() {
        this.initializeUIState();
        this.actionHistory = [];
        this.systemLogs = [];
        this.lastControlAction = null;
    }

    exportData() {
        return {
            uiState: this.getUIState(),
            situationPresets: this.getSituationPresets(),
            controlMapping: Array.from(this.getControlMapping().entries()),
            historialAcciones: this.uiState.historialAcciones,
            actionHistory: this.actionHistory.slice(-20),
            systemLogs: this.systemLogs.slice(-50),
            lastAction: this.lastControlAction,
            isDebugMode: this.isDebugMode
        };
    }
}

systemCore.registerModule('control', new ControlSystem());
