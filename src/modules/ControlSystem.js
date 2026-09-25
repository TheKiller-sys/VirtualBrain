// src/modules/ControlSystem.js
// V4.1
//
// CAMBIOS CLAVE V4.1:
//  - update/updateSlow como no-op (módulo de UI, no necesita ticks)
//  - emergencyStop invoca resetEmergency para permitir recuperación
//  - API limpia para todos los controles

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
        systemCore.logSystem('Sistema de control V4.1 inicializado');
    }

    initializeUIState() {
        this.uiState = {
            panelAbierto: 'principal',
            modoVisualizacion: 'completo',
            tema: 'oscuro',
            pausa: false,
            velocidadSimulacion: 1.0,
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
            funcion: () => systemCore.exportSystemData(),
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
        this.controlMapping.set('reset_emergency', {
            funcion: () => systemCore.resetEmergency(),
            confirmacion: false
        });
    }

    setupSituationPresets() {
        this.situationPresets.set('estres_gradual', {
            nombre: 'Estrés Gradual',
            situaciones: [
                { tipo: 'actividad_alta', intensidad: 1.0, delay: 2000 },
                { tipo: 'amenaza', intensidad: 0.7, delay: 3000 },
                { tipo: 'oxigeno_bajo', intensidad: 0.8, delay: 4000 },
                { tipo: 'estres_alto', intensidad: 0.6, delay: 3000 }
            ]
        });
        this.situationPresets.set('recuperacion', {
            nombre: 'Recuperación',
            situaciones: [
                { tipo: 'reposo', intensidad: 1.0, delay: 2000 },
                { tipo: 'limpiar_toxinas', intensidad: 1.0, delay: 3000 },
                { tipo: 'recompensa', intensidad: 0.9, delay: 4000 },
                { tipo: 'interaccion_social', intensidad: 0.8, delay: 5000 }
            ]
        });
        this.situationPresets.set('crisis_extrema', {
            nombre: 'Crisis Extrema',
            situaciones: [
                { tipo: 'oxigeno_bajo', intensidad: 1.0, delay: 1000 },
                { tipo: 'toxinas', intensidad: 1.0, delay: 1500 },
                { tipo: 'amenaza', intensidad: 1.0, delay: 2000 },
                { tipo: 'estres_alto', intensidad: 1.0, delay: 2000 }
            ]
        });
        this.situationPresets.set('estado_optimo', {
            nombre: 'Estado Óptimo',
            situaciones: [
                { tipo: 'oxigeno_alto', intensidad: 1.0, delay: 2000 },
                { tipo: 'recompensa', intensidad: 1.0, delay: 3000 },
                { tipo: 'confianza', intensidad: 1.0, delay: 4000 },
                { tipo: 'alegria', intensidad: 1.0, delay: 5000 }
            ]
        });
    }

    onEvent(cb) { this.eventListeners.push(cb); }

    emitEvent(type, data) {
        const payload = { type, data, module: 'control', simTime: systemCore.systemTime };
        for (const cb of this.eventListeners) {
            try { cb(payload); }
            catch (err) { console.error('❌ control listener:', err); }
        }
    }

    // No-op: ControlSystem no tiene estado dinámico que actualizar.
    // SystemCore lo invoca por simetría con el resto de módulos.
    update(input, deltaTime) {
        return this.getState();
    }

    updateSlow(input, slowDelta) {
        // No-op intencional
    }

    executeControl(controlId) {
        const c = this.controlMapping.get(controlId);
        if (!c) return { success: false, error: `Control desconocido: ${controlId}` };
        try {
            const result = c.funcion();
            this.lastControlAction = controlId;
            this.actionHistory.push({ control: controlId, timestamp: Date.now() });
            if (this.actionHistory.length > 50) this.actionHistory.shift();
            return { success: true, result };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    applySituation(type, intensity = 1.0) {
        const result = systemCore.applySituation(type, intensity);
        this.actionHistory.push({ action: 'situation', type, intensity, timestamp: Date.now() });
        this.addLog(`Situación aplicada: ${type}`, 'system');
        return result;
    }

    async executeSequence(sequenceId) {
        const seq = this.situationPresets.get(sequenceId);
        if (!seq) return { success: false, error: 'Secuencia no encontrada' };
        this.addLog(`Iniciando secuencia: ${seq.nombre}`, 'system');
        for (const s of seq.situaciones) {
            await this.delay(s.delay);
            this.applySituation(s.tipo, s.intensidad);
        }
        this.addLog(`Secuencia completada: ${seq.nombre}`, 'system');
        return { success: true };
    }

    changeCharacter(genotipo) {
        const configs = {
            resiliente: { nombre: 'Nexus Prime', genotipo: 'resiliente', genero: 'neutro' },
            vulnerable: { nombre: 'Sigma', genotipo: 'vulnerable', genero: 'neutro' },
            audaz: { nombre: 'Thor', genotipo: 'audaz', genero: 'masculino' },
            intelectual: { nombre: 'Athena', genotipo: 'intelectual', genero: 'femenino' },
            social: { nombre: 'Luna', genotipo: 'social', genero: 'femenino' }
        };
        const c = configs[genotipo];
        if (c) systemCore.changeCharacter(c);
    }

    exportSystemData() { return systemCore.exportSystemData(); }

    toggleAutoEvolution() {
        systemCore.autoEvolution = !systemCore.autoEvolution;
        this.addLog(`Auto-evolución ${systemCore.autoEvolution ? 'activada' : 'desactivada'}`);
        return systemCore.autoEvolution;
    }

    /**
     * FIX: además de activar, permite programar un reset automático
     * si se pasa `autoResetMs`. Útil para pruebas.
     */
    emergencyStop(autoResetMs = 0) {
        systemCore.triggerEmergencyProtocol();
        this.addLog('🚨 PARADA DE EMERGENCIA', 'error');
        if (autoResetMs > 0) {
            const t = setTimeout(() => {
                systemCore.resetEmergency();
                this.addLog('🔓 Reset automático aplicado', 'system');
            }, autoResetMs);
            if (t.unref) t.unref();
        }
    }

    addLog(message, type = 'info') {
        const log = { message, type, timestamp: Date.now(), simTime: systemCore.systemTime };
        this.systemLogs.push(log);
        if (this.systemLogs.length > 100) this.systemLogs.shift();
        systemCore.logSystem(message, type);
    }

    delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    getUIState() { return { ...this.uiState }; }
    getSituationPresets() {
        return Array.from(this.situationPresets.entries()).map(([id, p]) => ({ id, ...p }));
    }
    getControlMapping() { return new Map(this.controlMapping); }
    getActionHistory() { return this.actionHistory.slice(-20); }
    getLogs() { return this.systemLogs.slice(-50); }

    getState() {
        return {
            uiState: this.getUIState(),
            presets: this.getSituationPresets().map(p => p.id),
            actionCount: this.actionHistory.length
        };
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
            actionHistory: this.actionHistory.slice(-20),
            systemLogs: this.systemLogs.slice(-50)
        };
    }
}

systemCore.registerModule('control', new ControlSystem());
