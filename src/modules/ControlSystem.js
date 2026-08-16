// src/modules/ControlSystem.js
import { brain } from '../core/SystemCore.js';

export class ControlSystem {
    constructor() {
        this.controlMapping = new Map();
        this.situationPresets = new Map();
        this.eventListeners = [];
        this.actionHistory = [];
        this.systemLogs = [];
        this.isDebugMode = false;
        this.lastControlAction = null;
    }

    async initialize(characterConfig) {
        this.config = characterConfig;
        this.setupControlMapping();
        this.setupSituationPresets();
        console.log('🎮 Sistema de control V3.0 inicializado');
    }

    setupControlMapping() {
        this.controlMapping.set('reset_system', {
            funcion: () => brain.reset(),
            confirmacion: true,
            mensaje: '¿Reiniciar todo el sistema?'
        });
        this.controlMapping.set('export_data', {
            funcion: () => this.exportSystemData(),
            confirmacion: false
        });
        this.controlMapping.set('toggle_auto_evolution', {
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

    onEvent(callback) {
        this.eventListeners.push(callback);
    }

    emitEvent(type, data) {
        this.eventListeners.forEach(cb => {
            try {
                cb({ type, data, module: 'control' });
            } catch (error) {
                console.error('❌ Error en listener de control:', error);
            }
        });
    }

    executeControl(controlId) {
        const control = this.controlMapping.get(controlId);
        if (!control) {
            this.addLog(`Control no encontrado: ${controlId}`, 'error');
            return;
        }
        if (control.confirmacion) {
            if (this.confirmAction(control.mensaje || '¿Está seguro?')) {
                control.funcion();
                this.lastControlAction = controlId;
            }
        } else {
            control.funcion();
            this.lastControlAction = controlId;
        }
        this.actionHistory.push({ control: controlId, timestamp: brain.systemTime || Date.now() });
        if (this.actionHistory.length > 50) this.actionHistory.shift();
    }

    confirmAction(message) {
        if (typeof window !== 'undefined' && window.confirm) {
            return window.confirm(message);
        }
        return true;
    }

    applySituation(situationType, intensity = 1.0) {
        brain.applySituation(situationType, intensity);
        this.actionHistory.push({ action: 'situation', type: situationType, intensity: intensity, timestamp: brain.systemTime || Date.now() });
        this.addLog(`Situación aplicada: ${situationType} (intensidad: ${intensity})`, 'system');
    }

    async executeSequence(sequenceId) {
        const sequence = this.situationPresets.get(sequenceId);
        if (!sequence) {
            this.addLog(`Secuencia no encontrada: ${sequenceId}`, 'error');
            return;
        }
        this.addLog(`Iniciando secuencia: ${sequence.nombre}`, 'system');
        this.actionHistory.push({ action: 'sequence', id: sequenceId, name: sequence.nombre, timestamp: brain.systemTime || Date.now() });
        for (const situacion of sequence.situaciones) {
            await this.delay(situacion.delay);
            this.applySituation(situacion.tipo, situacion.intensidad);
        }
        this.addLog(`Secuencia completada: ${sequence.nombre}`, 'system');
    }

    exportSystemData() {
        const data = brain.exportData();
        if (typeof window !== 'undefined') {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cerebro_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } else {
            console.log('📊 Datos exportados:', JSON.stringify(data, null, 2));
        }
        this.addLog('Datos del sistema exportados', 'system');
        return data;
    }

    toggleAutoEvolution() {
        brain.autoEvolution = !brain.autoEvolution;
        this.addLog(`Auto-evolución ${brain.autoEvolution ? 'activada' : 'desactivada'}`, 'system');
        return brain.autoEvolution;
    }

    emergencyStop() {
        brain.triggerEmergencyProtocol();
        this.addLog('🚨 PARADA DE EMERGENCIA ACTIVADA', 'error');
        this.actionHistory.push({ action: 'emergency_stop', timestamp: brain.systemTime || Date.now() });
    }

    async saveState() {
        try {
            const data = brain.exportData();
            if (typeof window !== 'undefined') {
                localStorage.setItem('cerebro_state', JSON.stringify(data));
                this.addLog('Estado guardado correctamente', 'system');
            } else {
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
                // Aquí se implementaría la lógica de importación
            } else {
                this.addLog('No se encontró estado guardado', 'warning');
            }
        } catch (error) {
            this.addLog(`Error cargando estado: ${error.message}`, 'error');
        }
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

    getState() {
        return {
            mapping: Array.from(this.controlMapping.keys()),
            presets: Array.from(this.situationPresets.keys()),
            actionHistory: this.actionHistory.slice(-20),
            systemLogs: this.systemLogs.slice(-50),
            lastAction: this.lastControlAction,
            isDebugMode: this.isDebugMode
        };
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
        this.actionHistory = [];
        this.systemLogs = [];
        this.lastControlAction = null;
        console.log('🔄 Sistema de control reiniciado');
    }

    exportData() {
        return {
            actionHistory: this.actionHistory.slice(-20),
            systemLogs: this.systemLogs.slice(-50),
            lastAction: this.lastControlAction,
            isDebugMode: this.isDebugMode,
            situationPresets: this.getSituationPresets()
        };
    }
}

brain.registerModule('control', new ControlSystem());
