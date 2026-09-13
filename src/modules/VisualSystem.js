// src/modules/VisualSystem.js
import { systemCore } from '../core/SystemCore.js';

export class VisualSystem {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.visualState = {};
        this.particles = [];
        this.effects = new Map();
        this.particleSystems = new Map();
        this.renderCallbacks = [];
        this.eventListeners = [];
        this.lastRenderTime = 0;
        this.visualCache = {};
        this.interactionZones = [];
        this.isHeadless = true;
        this.frameCount = 0;
        this.config = {};
    }

    async initialize(characterConfig) {
        this.config = characterConfig || { genotipo: 'humano' };
        this.initializeVisualState();
        this.setupVisualEffects();
        this.setupParticleSystems();
        this.setupRenderPipeline();
        this.setupCanvas();
        systemCore.logSystem('Sistema visual V4 inicializado');
    }

    initializeVisualState() {
        this.visualState = {
            colorBase: '#00d4ff', colorSecundario: '#ff0064',
            tamaño: 1.0, brillo: 0.7, saturacion: 0.8, pulso: 1.0,
            oscilacion: 0.0, distorsion: 0.0, particulas: true, halo: true,
            reflejos: true, glow: true, trail: true, expresion: 'neutral',
            intensidadEmocional: 0.5, intensidadVisual: 0.5,
            movimiento: 'quieto', velocidad: 0.0, direccion: 0,
            energiaVisual: 0.5, claridad: 0.8, contraste: 0.6, calidez: 0.5,
            textura: 0.3, profundidad: 0.4, ripple: 0.0, wave: 0.0,
            shimmer: 0.0, pulsePhase: 0.0, parpadeo: 0.0, enfoque: 0.8
        };
        this.particles = [];
        this.frameCount = 0;
    }

    setupCanvas() {
        if (typeof document !== 'undefined') {
            const el = document.getElementById('gameCanvas');
            if (el) {
                this.canvas = el;
                this.ctx = el.getContext('2d');
                this.isHeadless = false;
                return;
            }
        }
        this.isHeadless = true;
    }

    setupVisualEffects() {
        this.effects.set('estres', { color: '#ff6b6b', pulso: 1.5, oscilacion: 0.3, distorsion: 0.2, claridad: 0.6 });
        this.effects.set('alegria', { color: '#ffd54f', pulso: 1.2, brillo: 1.0, shimmer: 0.3, glow: true });
        this.effects.set('miedo', { color: '#ba68c8', pulso: 2.0, oscilacion: 0.5, distorsion: 0.2, brillo: 0.5 });
        this.effects.set('ira', { color: '#e57373', pulso: 1.8, brillo: 1.2, distorsion: 0.3 });
        this.effects.set('confianza', { color: '#81c784', pulso: 1.1, brillo: 0.9, halo: true, glow: true });
        this.effects.set('tristeza', { color: '#4a90d9', pulso: 0.8, brillo: 0.4, saturacion: 0.3 });
        this.effects.set('sorpresa', { color: '#ff9800', pulso: 1.4, brillo: 1.1, shimmer: 0.5, ripple: 0.3 });
        this.effects.set('asco', { color: '#795548', pulso: 0.9, brillo: 0.3, saturacion: 0.2 });
    }

    setupParticleSystems() {
        this.particleSystems.set('rojas', { color: '#ff6b6b', size: 3, speed: 2, count: 50, spread: 100, life: 2.0, glow: false });
        this.particleSystems.set('doradas', { color: '#ffd54f', size: 4, speed: 1.5, count: 40, spread: 80, life: 3.0, glow: true });
        this.particleSystems.set('azules', { color: '#4a90d9', size: 3, speed: 1, count: 30, spread: 60, life: 4.0, glow: false });
        this.particleSystems.set('verdes', { color: '#81c784', size: 3, speed: 1.5, count: 35, spread: 70, life: 3.5, glow: true });
        this.particleSystems.set('moradas', { color: '#ba68c8', size: 4, speed: 2.5, count: 45, spread: 90, life: 2.5, glow: true });
    }

    setupRenderPipeline() {
        this.renderCallbacks = [
            this.renderBackground.bind(this),
            this.renderParticles.bind(this),
            this.renderCharacter.bind(this),
            this.renderEffects.bind(this)
        ];
    }

    onEvent(cb) { this.eventListeners.push(cb); }
    emitEvent(type, data) {
        this.eventListeners.forEach(cb => {
            try { cb({ type, data, module: 'visual' }); }
            catch (err) { console.error('❌ visual listener:', err); }
        });
    }

    update(input) {
        if (!input || !input.biochemical || !input.emotional) return this.getState();
        this.frameCount++;
        this.calculateVisualState(input);
        this.updateVisualEffects(input);
        this.generateParticles(input);
        if (this.canvas && this.ctx && !this.isHeadless) this.render();
        return this.getState();
    }

    calculateVisualState(input) {
        const bio = input.biochemical || {};
        const emo = input.emotional || {};
        const cog = input.cognitive || {};
        const sleep = input.sleep || {};

        this.visualState.brillo = (bio.energia || 50) / 100 * 0.7 + 0.3;
        this.visualState.saturacion = (emo.valencia || 0.5) * 0.5 + 0.3;
        this.visualState.pulso = 1.0 + ((bio.noradrenalina || 50) / 100) * 0.5;
        this.visualState.oscilacion = ((bio.cortisol || 0) / 100) * 0.4;
        this.visualState.distorsion = ((bio.toxicidad || 0) / 100) * 0.3;
        this.visualState.pulsePhase += 0.02;
        this.visualState.expresion = this.determineExpression(emo);
        this.visualState.intensidadEmocional = this.calculateEmotionalIntensity(emo);
        this.visualState.intensidadVisual = this.calculateVisualIntensity(emo, bio);
        this.visualState.movimiento = this.determineMovement(bio);
        this.visualState.velocidad = (bio.noradrenalina || 50) / 100;
        this.visualState.energiaVisual = (bio.energia || 50) / 100;
        this.visualState.claridad = 1 - ((bio.toxicidad || 0) / 200);
        this.visualState.contraste = 0.5 + ((bio.cortisol || 0) / 200);
        this.visualState.calidez = this.calculateWarmth(emo);
        this.visualState.textura = (bio.toxicidad || 0) / 100;
        this.visualState.profundidad = ((bio.oxigeno || 50) / 100) * 0.5 + 0.3;
        this.visualState.enfoque = (cog.atencion || 50) / 100;
        this.visualState.parpadeo = (sleep.estado && sleep.estado !== 'despierto') ? 0.3 : 0.0;
        this.visualState.colorBase = this.calculateBaseColor(bio);
        this.visualState.colorSecundario = this.calculateSecondaryColor(emo);
    }

    calculateBaseColor(bio) {
        const r = Math.min(255, 100 + ((bio.cortisol || 0) * 1.5));
        const g = Math.min(255, 100 + ((bio.oxigeno || 50) * 0.8) + ((bio.serotonina || 50) * 0.7));
        const b = Math.min(255, 100 + ((bio.dopamina || 50) * 0.6) + ((bio.oxitocina || 50) * 0.9));
        return `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`;
    }

    calculateSecondaryColor(emo) {
        const dom = this.getDominantEmotion(emo);
        const colors = {
            alegria: '#ffd54f', tristeza: '#4a90d9', miedo: '#ba68c8',
            ira: '#e57373', confianza: '#81c784', sorpresa: '#ff9800', asco: '#795548'
        };
        return colors[dom.emotion] || '#00d4ff';
    }

    calculateWarmth(emo) {
        let w = 0.5;
        ['alegria', 'ira', 'sorpresa'].forEach(e => w += (emo[e] || 0) / 100 * 0.3);
        ['tristeza', 'miedo', 'asco'].forEach(e => w -= (emo[e] || 0) / 100 * 0.2);
        return this.clamp(w, 0, 1);
    }

    determineExpression(emo) {
        const dom = this.getDominantEmotion(emo);
        const map = {
            alegria: 'alegre', tristeza: 'triste', miedo: 'asustado',
            ira: 'enojado', confianza: 'confiado', sorpresa: 'sorprendido', asco: 'asqueado'
        };
        return map[dom.emotion] || 'neutral';
    }

    getDominantEmotion(emo) {
        const emotions = ['alegria', 'tristeza', 'miedo', 'ira', 'confianza', 'sorpresa', 'asco'];
        let dom = 'neutral', max = 0;
        emotions.forEach(e => {
            if ((emo[e] || 0) > max) { max = emo[e]; dom = e; }
        });
        return { emotion: dom, intensity: max };
    }

    calculateEmotionalIntensity(emo) {
        const intense = ['alegria', 'tristeza', 'miedo', 'ira'];
        return intense.reduce((s, e) => s + (emo[e] || 0), 0) / (intense.length * 100);
    }

    calculateVisualIntensity(emo, bio) {
        const em = this.calculateEmotionalIntensity(emo);
        const bi = (bio.energia || 50) / 100;
        const st = (bio.cortisol || 0) / 100;
        return em * 0.4 + bi * 0.3 + st * 0.3;
    }

    determineMovement(bio) {
        if (bio.noradrenalina > 70) return 'agitado';
        if (bio.cortisol > 60) return 'nervioso';
        if (bio.energia < 30) return 'lento';
        if (bio.dopamina > 60) return 'energico';
        return 'tranquilo';
    }

    updateVisualEffects(input) {
        const emo = input.emotional || {};
        const dom = this.getDominantEmotion(emo);
        const effect = this.effects.get(dom.emotion);
        if (effect) this.applyVisualEffect(effect, dom.intensity / 100);

        const bio = input.biochemical || {};
        if (bio.oxigeno < 30) this.applyCriticalEffect('hipoxia');
        if (bio.toxicidad > 70) this.applyCriticalEffect('toxicidad');
        if (bio.energia < 20) this.applyCriticalEffect('agotamiento');
        if (bio.cortisol > 80) this.applyCriticalEffect('estres_extremo');
    }

    applyVisualEffect(effect, intensity) {
        Object.keys(effect).forEach(prop => {
            if (this.visualState[prop] !== undefined) {
                const base = this.getBaseVisualValue(prop);
                this.visualState[prop] = base + (effect[prop] - base) * intensity;
            }
        });
    }

    getBaseVisualValue(prop) {
        const base = {
            colorBase: '#00d4ff', colorSecundario: '#ff0064',
            pulso: 1.0, oscilacion: 0.0, brillo: 0.7, saturacion: 0.8,
            calidez: 0.5, claridad: 0.8, contraste: 0.6, shimmer: 0.0, ripple: 0.0, wave: 0.0
        };
        return base[prop] !== undefined ? base[prop] : 0;
    }

    applyCriticalEffect(type) {
        switch (type) {
            case 'hipoxia':
                this.visualState.colorBase = '#4fc3f7';
                this.visualState.pulso = 0.5;
                this.visualState.brillo = 0.3;
                break;
            case 'toxicidad':
                this.visualState.colorBase = '#795548';
                this.visualState.distorsion = 0.8;
                this.visualState.saturacion = 0.2;
                break;
            case 'agotamiento':
                this.visualState.colorBase = '#78909c';
                this.visualState.pulso = 0.3;
                this.visualState.brillo = 0.4;
                break;
            case 'estres_extremo':
                this.visualState.colorBase = '#ff1744';
                this.visualState.pulso = 2.0;
                this.visualState.ripple = 0.5;
                break;
        }
    }

    generateParticles(input) {
        if (this.isHeadless) return;
        const emo = input.emotional || {};
        const intensity = this.visualState.intensidadVisual;
        const dom = this.getDominantEmotion(emo);
        const type = this.getParticleType(dom.emotion);

        if (Math.random() < intensity * 0.15) this.createParticle(type, intensity);
        if (this.particles.length > 500) this.particles = this.particles.slice(-400);
    }

    getParticleType(emotion) {
        const map = {
            alegria: 'doradas', tristeza: 'azules', miedo: 'moradas',
            ira: 'rojas', confianza: 'verdes', sorpresa: 'doradas', asco: 'rojas'
        };
        return map[emotion] || 'rojas';
    }

    createParticle(type, intensity) {
        const sys = this.particleSystems.get(type) || this.particleSystems.get('rojas');
        const width = this.canvas?.width || 800;
        const height = this.canvas?.height || 500;
        this.particles.push({
            x: width / 2 + (Math.random() - 0.5) * (sys.spread || 100),
            y: height / 2 + (Math.random() - 0.5) * (sys.spread || 100),
            size: (sys.size || 3) * (0.5 + Math.random() * 0.5),
            color: sys.color,
            speed: (sys.speed || 2) * (0.5 + Math.random() * 0.5),
            life: 1.0,
            maxLife: sys.life || 2,
            decay: 1 / (sys.life || 2),
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            type,
            glow: sys.glow || false
        });
    }

    render() {
        if (!this.ctx || !this.canvas) return;
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.ctx.fillStyle = this.visualState.colorBase;
        this.ctx.fillRect(0, 0, w, h);
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            p.x += p.vx * p.speed * 0.5;
            p.y += p.vy * p.speed * 0.5;
            p.life -= p.decay * 0.01;
        });
        this.particles = this.particles.filter(p => p.life > 0);
        this.ctx.globalAlpha = 1;
    }

    getState() {
        return { ...this.visualState, particleCount: this.particles.length };
    }

    clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

    reset() {
        this.initializeVisualState();
        this.particles = [];
        this.visualCache = {};
    }

    exportData() {
        return {
            visualState: this.getState(),
            particleCount: this.particles.length,
            effects: Array.from(this.effects.entries())
        };
    }
}

systemCore.registerModule('visual', new VisualSystem());
