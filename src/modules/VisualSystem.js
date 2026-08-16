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
        this.isHeadless = false;
        this.renderQueue = [];
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
        systemCore.logSystem('Sistema visual V3.0 inicializado');
    }

    initializeVisualState() {
        this.visualState = {
            colorBase: '#00d4ff',
            colorSecundario: '#ff0064',
            tamaño: 1.0,
            brillo: 0.7,
            saturacion: 0.8,
            pulso: 1.0,
            oscilacion: 0.0,
            distorsion: 0.0,
            particulas: true,
            halo: true,
            reflejos: true,
            glow: true,
            trail: true,
            expresion: 'neutral',
            intensidadEmocional: 0.5,
            intensidadVisual: 0.5,
            movimiento: 'quieto',
            velocidad: 0.0,
            direccion: 0,
            energiaVisual: 0.5,
            claridad: 0.8,
            contraste: 0.6,
            calidez: 0.5,
            textura: 0.3,
            profundidad: 0.4,
            ripple: 0.0,
            wave: 0.0,
            shimmer: 0.0,
            pulsePhase: 0.0,
            parpadeo: 0.0,
            enfoque: 0.8
        };

        this.particles = [];
        this.particleSystems = new Map();
        this.visualCache = {};
        this.interactionZones = [];
        this.lastRenderTime = 0;
        this.renderQueue = [];
        this.frameCount = 0;
    }

    setupCanvas() {
        this.canvas = typeof document !== 'undefined' ? document.getElementById('gameCanvas') : null;
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.setupCanvasEvents();
            this.resizeCanvas();
        } else {
            console.log('🎨 Modo headless activado (sin canvas)');
            this.isHeadless = true;
            this.setupHeadlessMode();
        }
    }

    resizeCanvas() {
        if (!this.canvas) return;
        const container = this.canvas.parentElement;
        if (container) {
            const rect = container.getBoundingClientRect();
            this.canvas.width = rect.width || 800;
            this.canvas.height = rect.height || 500;
        }
    }

    setupCanvasEvents() {
        if (!this.canvas) return;

        this.canvas.addEventListener('click', (event) => {
            this.handleCanvasClick(event);
        });

        this.canvas.addEventListener('mousemove', (event) => {
            this.handleMouseMove(event);
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.handleMouseLeave();
        });

        if (typeof window !== 'undefined') {
            window.addEventListener('resize', () => {
                this.resizeCanvas();
            });
        }
    }

    setupHeadlessMode() {
        this.canvas = null;
        this.ctx = {
            save: () => {},
            restore: () => {},
            fillStyle: null,
            strokeStyle: null,
            beginPath: () => {},
            arc: () => {},
            fill: () => {},
            stroke: () => {},
            clearRect: () => {},
            translate: () => {},
            scale: () => {},
            rotate: () => {},
            transform: () => {},
            drawImage: () => {},
            createRadialGradient: () => ({ addColorStop: () => {} }),
            createLinearGradient: () => ({ addColorStop: () => {} })
        };
    }

    setupVisualEffects() {
        this.effects.set('estres', {
            color: '#ff6b6b',
            pulso: 1.5,
            oscilacion: 0.3,
            particulas: 'rojas',
            distorsion: 0.2,
            calidez: 0.8,
            claridad: 0.6
        });
        
        this.effects.set('alegria', {
            color: '#ffd54f',
            pulso: 1.2,
            brillo: 1.0,
            particulas: 'doradas',
            calidez: 0.7,
            shimmer: 0.3,
            glow: true
        });
        
        this.effects.set('miedo', {
            color: '#ba68c8',
            pulso: 2.0,
            oscilacion: 0.5,
            distorsion: 0.2,
            brillo: 0.5,
            contraste: 0.8,
            claridad: 0.4
        });
        
        this.effects.set('ira', {
            color: '#e57373',
            pulso: 1.8,
            brillo: 1.2,
            particulas: 'rojas_intensas',
            calidez: 0.9,
            distorsion: 0.3,
            contraste: 0.7
        });
        
        this.effects.set('confianza', {
            color: '#81c784',
            pulso: 1.1,
            brillo: 0.9,
            halo: true,
            claridad: 0.9,
            profundidad: 0.6,
            glow: true
        });
        
        this.effects.set('tristeza', {
            color: '#4a90d9',
            pulso: 0.8,
            brillo: 0.4,
            saturacion: 0.3,
            calidez: 0.2,
            shimmer: 0.1,
            claridad: 0.5
        });

        this.effects.set('sorpresa', {
            color: '#ff9800',
            pulso: 1.4,
            brillo: 1.1,
            shimmer: 0.5,
            ripple: 0.3,
            claridad: 0.7
        });

        this.effects.set('asco', {
            color: '#795548',
            pulso: 0.9,
            brillo: 0.3,
            saturacion: 0.2,
            textura: 0.8,
            claridad: 0.4
        });

        this.effects.set('meditacion', {
            color: '#7c4dff',
            pulso: 0.7,
            brillo: 0.5,
            halo: true,
            shimmer: 0.2,
            wave: 0.15,
            claridad: 0.8
        });
    }

    setupParticleSystems() {
        this.particleSystems.set('rojas', {
            color: '#ff6b6b',
            size: 3,
            speed: 2,
            count: 50,
            spread: 100,
            life: 2.0,
            glow: false
        });

        this.particleSystems.set('doradas', {
            color: '#ffd54f',
            size: 4,
            speed: 1.5,
            count: 40,
            spread: 80,
            life: 3.0,
            glow: true
        });

        this.particleSystems.set('rojas_intensas', {
            color: '#e53935',
            size: 5,
            speed: 3,
            count: 60,
            spread: 120,
            life: 1.5,
            glow: true
        });

        this.particleSystems.set('azules', {
            color: '#4a90d9',
            size: 3,
            speed: 1,
            count: 30,
            spread: 60,
            life: 4.0,
            glow: false
        });

        this.particleSystems.set('verdes', {
            color: '#81c784',
            size: 3,
            speed: 1.5,
            count: 35,
            spread: 70,
            life: 3.5,
            glow: true
        });

        this.particleSystems.set('moradas', {
            color: '#ba68c8',
            size: 4,
            speed: 2.5,
            count: 45,
            spread: 90,
            life: 2.5,
            glow: true
        });

        this.particleSystems.set('blancas', {
            color: '#ffffff',
            size: 2,
            speed: 1,
            count: 25,
            spread: 50,
            life: 5.0,
            glow: true
        });
    }

    setupRenderPipeline() {
        this.renderCallbacks = [];
        this.renderCallbacks.push(this.renderBackground.bind(this));
        this.renderCallbacks.push(this.renderParticles.bind(this));
        this.renderCallbacks.push(this.renderCharacter.bind(this));
        this.renderCallbacks.push(this.renderEffects.bind(this));
        this.renderCallbacks.push(this.renderUIOverlay.bind(this));
    }

    onEvent(callback) {
        this.eventListeners.push(callback);
    }

    emitEvent(type, data) {
        this.eventListeners.forEach(cb => {
            try {
                cb({ type, data, module: 'visual' });
            } catch (error) {
                console.error('❌ Error en listener visual:', error);
            }
        });
    }

    update(input) {
        if (!input || !input.biochemical || !input.emotional) return this.getState();

        this.frameCount++;

        this.calculateVisualState(input);
        this.updateVisualEffects(input);
        this.generateParticles(input);
        this.updateParticles(input);
        
        if (this.canvas && this.ctx && !this.isHeadless) {
            this.render();
        }

        if (this.frameCount % 10 === 0) {
            this.emitEvent('visual_updated', {
                state: { ...this.visualState },
                particleCount: this.particles.length
            });
        }

        return this.getState();
    }

    calculateVisualState(input) {
        const bioState = input.biochemical || {};
        const emotionalState = input.emotional || {};
        const cognitiveState = input.cognitive || {};
        const motorState = input.motor || {};
        const sleepState = input.sleep || {};
        
        this.visualState.colorBase = this.calculateBaseColor(bioState);
        this.visualState.colorSecundario = this.calculateSecondaryColor(emotionalState);
        this.visualState.tamaño = this.calculateSize(emotionalState);
        this.visualState.brillo = (bioState.energia || 50) / 100 * 0.7 + 0.3;
        this.visualState.saturacion = (emotionalState.valencia || 0.5) * 0.5 + 0.3;
        this.visualState.pulso = 1.0 + ((bioState.noradrenalina || 50) / 100) * 0.5;
        this.visualState.oscilacion = ((bioState.cortisol || 0) / 100) * 0.4;
        this.visualState.distorsion = ((bioState.toxicidad || 0) / 100) * 0.3;
        this.visualState.ripple = ((bioState.cortisol || 0) / 100) * 0.3;
        this.visualState.wave = ((bioState.noradrenalina || 50) / 100) * 0.2;
        this.visualState.shimmer = ((bioState.dopamina || 50) / 100) * 0.3;
        this.visualState.pulsePhase += 0.02;
        this.visualState.parpadeo = (sleepState.estado && sleepState.estado !== 'despierto') ? 0.3 : 0.0;
        this.visualState.expresion = this.determineExpression(emotionalState);
        this.visualState.intensidadEmocional = this.calculateEmotionalIntensity(emotionalState);
        this.visualState.intensidadVisual = this.calculateVisualIntensity(emotionalState, bioState);
        this.visualState.movimiento = this.determineMovement(bioState);
        this.visualState.velocidad = (bioState.noradrenalina || 50) / 100;
        this.visualState.direccion = this.calculateDirection(emotionalState);
        this.visualState.energiaVisual = (bioState.energia || 50) / 100;
        this.visualState.claridad = 1 - ((bioState.toxicidad || 0) / 200);
        this.visualState.contraste = 0.5 + ((bioState.cortisol || 0) / 200);
        this.visualState.calidez = this.calculateWarmth(emotionalState);
        this.visualState.textura = (bioState.toxicidad || 0) / 100;
        this.visualState.profundidad = ((bioState.oxigeno || 50) / 100) * 0.5 + 0.3;
        this.visualState.enfoque = (cognitiveState.atencion || 50) / 100;
    }

    calculateBaseColor(bioState) {
        const r = Math.min(255, 100 + ((bioState.cortisol || 0) * 1.5));
        const g = Math.min(255, 100 + ((bioState.oxigeno || 50) * 0.8) + ((bioState.serotonina || 50) * 0.7));
        const b = Math.min(255, 100 + ((bioState.dopamina || 50) * 0.6) + ((bioState.oxitocina || 50) * 0.9));
        return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
    }

    calculateSecondaryColor(emotionalState) {
        const dominant = this.getDominantEmotion(emotionalState);
        const colors = {
            alegria: '#ffd54f',
            tristeza: '#4a90d9',
            miedo: '#ba68c8',
            ira: '#e57373',
            confianza: '#81c784',
            sorpresa: '#ff9800',
            asco: '#795548'
        };
        return colors[dominant.emotion] || '#00d4ff';
    }

    calculateWarmth(emotionalState) {
        const warmEmotions = ['alegria', 'ira', 'sorpresa'];
        const coldEmotions = ['tristeza', 'miedo', 'asco'];
        let warmth = 0.5;
        warmEmotions.forEach(e => warmth += (emotionalState[e] || 0) / 100 * 0.3);
        coldEmotions.forEach(e => warmth -= (emotionalState[e] || 0) / 100 * 0.2);
        return this.clamp(warmth, 0, 1);
    }

    calculateSize(emotionalState) {
        let baseSize = 1.0;
        if ((emotionalState.miedo || 0) > 50) baseSize -= 0.2 * ((emotionalState.miedo || 0) / 100);
        if ((emotionalState.ira || 0) > 50) baseSize += 0.3 * ((emotionalState.ira || 0) / 100);
        if ((emotionalState.confianza || 0) > 70) baseSize += 0.1;
        if ((emotionalState.alegria || 0) > 70) baseSize += 0.15;
        return Math.max(0.5, Math.min(1.6, baseSize));
    }

    determineExpression(emotionalState) {
        const dominant = this.getDominantEmotion(emotionalState);
        const expressionMap = {
            alegria: 'alegre',
            tristeza: 'triste',
            miedo: 'asustado',
            ira: 'enojado',
            confianza: 'confiado',
            sorpresa: 'sorprendido',
            asco: 'asqueado'
        };
        return expressionMap[dominant.emotion] || 'neutral';
    }

    getDominantEmotion(emotionalState) {
        let dominant = 'neutral';
        let maxIntensity = 0;
        const emotions = ['alegria', 'tristeza', 'miedo', 'ira', 'confianza', 'sorpresa', 'asco'];
        emotions.forEach(emotion => {
            const value = emotionalState[emotion] || 0;
            if (value > maxIntensity) {
                maxIntensity = value;
                dominant = emotion;
            }
        });
        return { emotion: dominant, intensity: maxIntensity };
    }

    calculateEmotionalIntensity(emotionalState) {
        const intenseEmotions = ['alegria', 'tristeza', 'miedo', 'ira'];
        const totalIntensity = intenseEmotions.reduce((sum, emotion) => sum + (emotionalState[emotion] || 0), 0);
        return totalIntensity / (intenseEmotions.length * 100);
    }

    calculateVisualIntensity(emotionalState, bioState) {
        const emotionalIntensity = this.calculateEmotionalIntensity(emotionalState);
        const bioIntensity = (bioState.energia || 50) / 100;
        const stressIntensity = (bioState.cortisol || 0) / 100;
        return emotionalIntensity * 0.4 + bioIntensity * 0.3 + stressIntensity * 0.3;
    }

    determineMovement(bioState) {
        const noradrenalina = bioState.noradrenalina || 0;
        const cortisol = bioState.cortisol || 0;
        const energia = bioState.energia || 0;
        const dopamina = bioState.dopamina || 0;
        if (noradrenalina > 70) return 'agitado';
        if (cortisol > 60) return 'nervioso';
        if (energia < 30) return 'lento';
        if (dopamina > 60) return 'energico';
        return 'tranquilo';
    }

    calculateDirection(emotionalState) {
        const positive = (emotionalState.alegria || 0) + (emotionalState.confianza || 0);
        const negative = (emotionalState.tristeza || 0) + (emotionalState.miedo || 0) + (emotionalState.ira || 0);
        return (positive - negative) / 100;
    }

    updateVisualEffects(input) {
        const emotionalState = input.emotional || {};
        const dominantEmotion = this.getDominantEmotion(emotionalState);
        const effect = this.effects.get(dominantEmotion.emotion);
        if (effect) {
            this.applyVisualEffect(effect, dominantEmotion.intensity / 100);
        }
        const bio = input.biochemical || {};
        if (bio.oxigeno < 30) this.applyCriticalEffect('hipoxia');
        if (bio.toxicidad > 70) this.applyCriticalEffect('toxicidad');
        if (bio.energia < 20) this.applyCriticalEffect('agotamiento');
        if (bio.cortisol > 80) this.applyCriticalEffect('estres_extremo');
    }

    applyVisualEffect(effect, intensity) {
        Object.keys(effect).forEach(property => {
            if (this.visualState[property] !== undefined) {
                const baseValue = this.getBaseVisualValue(property);
                const effectValue = effect[property];
                this.visualState[property] = baseValue + (effectValue - baseValue) * intensity;
            }
        });
    }

    getBaseVisualValue(property) {
        const baseValues = {
            colorBase: '#00d4ff',
            colorSecundario: '#ff0064',
            pulso: 1.0,
            oscilacion: 0.0,
            brillo: 0.7,
            saturacion: 0.8,
            calidez: 0.5,
            claridad: 0.8,
            contraste: 0.6,
            shimmer: 0.0,
            ripple: 0.0,
            wave: 0.0
        };
        return baseValues[property] || 0;
    }

    applyCriticalEffect(type) {
        switch(type) {
            case 'hipoxia':
                this.visualState.colorBase = '#4fc3f7';
                this.visualState.pulso = 0.5;
                this.visualState.brillo = 0.3;
                this.visualState.claridad = 0.4;
                this.visualState.shimmer = 0.0;
                break;
            case 'toxicidad':
                this.visualState.colorBase = '#795548';
                this.visualState.distorsion = 0.8;
                this.visualState.saturacion = 0.2;
                this.visualState.claridad = 0.3;
                this.visualState.textura = 0.8;
                break;
            case 'agotamiento':
                this.visualState.colorBase = '#78909c';
                this.visualState.pulso = 0.3;
                this.visualState.brillo = 0.4;
                this.visualState.energiaVisual = 0.2;
                this.visualState.shimmer = 0.0;
                break;
            case 'estres_extremo':
                this.visualState.colorBase = '#ff1744';
                this.visualState.pulso = 2.0;
                this.visualState.ripple = 0.5;
                this.visualState.distorsion = 0.4;
                this.visualState.contraste = 0.9;
                break;
        }
    }

    generateParticles(input) {
        const emotionalState = input.emotional || {};
        const bioState = input.biochemical || {};
        const particleIntensity = this.visualState.intensidadVisual;
        const dominantEmotion = this.getDominantEmotion(emotionalState);
        const spawnRate = particleIntensity * 0.15;
        if (Math.random() < spawnRate) {
            const particleType = this.getParticleType(dominantEmotion.emotion);
            this.createParticle(particleType, emotionalState, bioState);
        }
        if (particleIntensity > 0.7 && Math.random() < 0.05) {
            this.createSpecialParticle(dominantEmotion.emotion, particleIntensity);
        }
        this.updateParticles(input);
    }

    getParticleType(emotion) {
        const typeMap = {
            alegria: 'doradas',
            tristeza: 'azules',
            miedo: 'moradas',
            ira: 'rojas_intensas',
            confianza: 'verdes',
            sorpresa: 'doradas',
            asco: 'rojas'
        };
        return typeMap[emotion] || 'rojas';
    }

    createParticle(particleType, emotionalState, bioState) {
        const system = this.particleSystems.get(particleType) || this.particleSystems.get('rojas');
        const width = this.canvas?.width || 800;
        const height = this.canvas?.height || 500;
        const baseX = width / 2 + (Math.random() - 0.5) * (system.spread || 100);
        const baseY = height / 2 + (Math.random() - 0.5) * (system.spread || 100);
        const intensity = this.visualState.intensidadEmocional;
        this.particles.push({
            x: baseX,
            y: baseY,
            size: (system.size || 3) * (0.5 + Math.random() * 0.5) * (1 + intensity * 0.5),
            color: system.color,
            speed: (system.speed || 2) * (0.5 + Math.random() * 0.5) * (1 + intensity * 0.3),
            life: 1.0,
            maxLife: (system.life || 2) * (0.8 + Math.random() * 0.4),
            decay: 1 / ((system.life || 2) * (0.8 + Math.random() * 0.4)),
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            type: particleType,
            glow: system.glow || false,
            trail: system.trail || false,
            trailPositions: [],
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.1
        });
    }

    createSpecialParticle(emotion, intensity) {
        const width = this.canvas?.width || 800;
        const height = this.canvas?.height || 500;
        const centerX = width / 2;
        const centerY = height / 2;
        const colors = {
            alegria: '#ffd54f',
            tristeza: '#4a90d9',
            miedo: '#ba68c8',
            ira: '#e53935',
            confianza: '#81c784',
            sorpresa: '#ff9800'
        };
        this.particles.push({
            x: centerX + (Math.random() - 0.5) * 50,
            y: centerY + (Math.random() - 0.5) * 50,
            size: 8 + Math.random() * 4,
            color: colors[emotion] || '#ffffff',
            speed: 0.5 + Math.random() * 0.5,
            life: 1.0,
            maxLife: 3 + Math.random() * 2,
            decay: 0.02 + Math.random() * 0.01,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            type: 'special',
            glow: true,
            trail: true,
            trailPositions: [],
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.05,
            special: true,
            intensity: intensity
        });
    }

    updateParticles(input) {
        const time = systemCore.systemTime || Date.now();
        const width = this.canvas?.width || 800;
        const height = this.canvas?.height || 500;
        const centerX = width / 2;
        const centerY = height / 2;
        this.particles = this.particles.map(particle => {
            particle.x += particle.vx * particle.speed * 0.5;
            particle.y += particle.vy * particle.speed * 0.5;
            particle.vx *= 0.99;
            particle.vy *= 0.99;
            particle.rotation += particle.rotSpeed || 0;
            particle.life -= particle.decay || 0.02;
            const pulse = 1 + Math.sin(time + particle.x * 0.01) * 0.1;
            particle.size *= (1 + (pulse - 1) * 0.01);
            const dx = centerX - particle.x;
            const dy = centerY - particle.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 10) {
                const force = 0.001 * particle.life;
                particle.vx += (dx / dist) * force;
                particle.vy += (dy / dist) * force;
            }
            if (particle.x < 0 || particle.x > width) { particle.vx *= -0.5; particle.x = Math.max(0, Math.min(width, particle.x)); }
            if (particle.y < 0 || particle.y > height) { particle.vy *= -0.5; particle.y = Math.max(0, Math.min(height, particle.y)); }
            if (particle.trail) {
                particle.trailPositions.push({ x: particle.x, y: particle.y });
                if (particle.trailPositions.length > 10) particle.trailPositions.shift();
            }
            return particle;
        }).filter(particle => particle.life > 0);
        if (this.particles.length > 500) this.particles = this.particles.slice(-400);
    }

    render() {
        if (!this.canvas || !this.ctx || this.isHeadless) return;
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        this.renderCallbacks.forEach(callback => {
            if (typeof callback === 'function') callback(ctx, width, height);
        });
        this.lastRenderTime = performance.now();
    }

    renderBackground(ctx, width, height) {
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
        const baseColor = this.visualState.colorBase;
        const brightness = this.visualState.brillo * 0.3 + 0.1;
        gradient.addColorStop(0, this.adjustBrightness(baseColor, brightness * 1.5));
        gradient.addColorStop(0.5, this.adjustBrightness(baseColor, brightness));
        gradient.addColorStop(1, this.adjustBrightness(baseColor, brightness * 0.3));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        this.renderBackgroundStars(ctx, width, height);
    }

    renderBackgroundStars(ctx, width, height) {
        const time = systemCore.systemTime || Date.now();
        const stars = this.getBackgroundStars(width, height);
        stars.forEach(star => {
            const twinkle = 0.5 + 0.5 * Math.sin(time * 2 + star.phase);
            ctx.globalAlpha = twinkle * 0.5;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size * twinkle, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    getBackgroundStars(width, height) {
        if (!this.visualCache.stars) {
            this.visualCache.stars = [];
            for (let i = 0; i < 50; i++) {
                this.visualCache.stars.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    size: 0.5 + Math.random() * 1.5,
                    phase: Math.random() * Math.PI * 2
                });
            }
        }
        return this.visualCache.stars;
    }

    renderParticles(ctx, width, height) {
        const particles = this.particles.sort((a, b) => a.size - b.size);
        particles.forEach(particle => {
            ctx.save();
            ctx.globalAlpha = particle.life * 0.8;
            ctx.translate(particle.x, particle.y);
            ctx.rotate(particle.rotation || 0);
            if (particle.trail && particle.trailPositions.length > 1) {
                ctx.globalAlpha *= 0.3;
                for (let i = 1; i < particle.trailPositions.length; i++) {
                    const alpha = i / particle.trailPositions.length * 0.5;
                    ctx.globalAlpha = alpha * particle.life;
                    ctx.fillStyle = particle.color;
                    const size = particle.size * (i / particle.trailPositions.length) * 0.5;
                    ctx.beginPath();
                    ctx.arc(particle.trailPositions[i].x - particle.x, particle.trailPositions[i].y - particle.y, size, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = particle.life * 0.8;
            }
            if (particle.glow) {
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, particle.size * 3);
                gradient.addColorStop(0, particle.color + '80');
                gradient.addColorStop(1, particle.color + '00');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, particle.size * 3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = particle.color;
            ctx.shadowColor = particle.glow ? particle.color : 'transparent';
            ctx.shadowBlur = particle.glow ? particle.size * 2 : 0;
            ctx.beginPath();
            ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
            ctx.fill();
            if (particle.size > 3) {
                const innerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, particle.size);
                innerGradient.addColorStop(0, '#ffffff60');
                innerGradient.addColorStop(1, particle.color + '00');
                ctx.fillStyle = innerGradient;
                ctx.beginPath();
                ctx.arc(0, 0, particle.size * 0.7, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        });
    }

    renderCharacter(ctx, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        ctx.save();
        ctx.translate(centerX, centerY);
        this.applyDynamicTransformations(ctx);
        if (this.visualState.halo) this.drawHalo(ctx);
        this.drawMainCharacter(ctx);
        this.drawEmotionalExpression(ctx);
        if (this.visualState.reflejos) this.drawReflections(ctx);
        ctx.restore();
    }

    applyDynamicTransformations(ctx) {
        const time = systemCore.systemTime || Date.now();
        const pulseScale = this.visualState.pulso + Math.sin(time * 2 + this.visualState.pulsePhase) * 0.08;
        ctx.scale(pulseScale, pulseScale);
        const oscillation = Math.sin(time * 3 + this.visualState.pulsePhase) * this.visualState.oscilacion * 0.1;
        ctx.rotate(oscillation);
        if (this.visualState.wave > 0) {
            const wave = Math.sin(time * 1.5 + this.visualState.pulsePhase) * this.visualState.wave * 0.05;
            ctx.transform(1 + wave, 0, 0, 1 - wave, 0, 0);
        }
        if (this.visualState.distorsion > 0) {
            for (let i = 0; i < 3; i++) {
                const wave = Math.sin(time * 1.5 + i * 1.2) * this.visualState.distorsion * 0.08;
                ctx.transform(1 + wave, wave * 0.05, wave * 0.05, 1 + wave, 0, 0);
            }
        }
    }

    drawMainCharacter(ctx) {
        const baseRadius = 40 * this.visualState.tamaño;
        const baseColor = this.visualState.colorBase;
        const secondaryColor = this.visualState.colorSecundario;
        const brightness = this.visualState.brillo;
        const saturation = this.visualState.saturacion;
        ctx.shadowColor = baseColor + '80';
        ctx.shadowBlur = 30 * brightness;
        const gradient = ctx.createRadialGradient(-baseRadius * 0.2, -baseRadius * 0.2, 0, 0, 0, baseRadius);
        const lightColor = this.adjustBrightness(baseColor, 1.3);
        const darkColor = this.adjustBrightness(baseColor, 0.6);
        gradient.addColorStop(0, lightColor);
        gradient.addColorStop(0.5, baseColor);
        gradient.addColorStop(0.8, this.adjustSaturation(baseColor, saturation * 0.8));
        gradient.addColorStop(1, darkColor);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = secondaryColor + '60';
        ctx.lineWidth = 2 * brightness;
        ctx.stroke();
        const innerGlow = this.createInnerGlow(ctx, baseRadius);
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(0, 0, baseRadius * 0.8, 0, Math.PI * 2);
        ctx.fill();
        if (this.visualState.shimmer > 0) this.drawShimmer(ctx, baseRadius);
        if (this.visualState.ripple > 0) this.drawRipple(ctx, baseRadius);
    }

    drawShimmer(ctx, radius) {
        const time = systemCore.systemTime || Date.now();
        const shimmerIntensity = this.visualState.shimmer * 0.5;
        for (let i = 0; i < 3; i++) {
            const angle = time * 0.5 + i * 2.1;
            const distance = radius * 0.3 + Math.sin(time * 0.7 + i) * radius * 0.2;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 0.4);
            gradient.addColorStop(0, `rgba(255,255,255,${shimmerIntensity * 0.4})`);
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawRipple(ctx, radius) {
        const time = systemCore.systemTime || Date.now();
        const rippleIntensity = this.visualState.ripple;
        for (let i = 0; i < 3; i++) {
            const waveRadius = radius * (0.6 + i * 0.2) + Math.sin(time * 1.5 + i) * radius * 0.1;
            ctx.strokeStyle = `rgba(255,255,255,${rippleIntensity * 0.15})`;
            ctx.lineWidth = 1 + rippleIntensity;
            ctx.beginPath();
            ctx.arc(0, 0, waveRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    createInnerGlow(ctx, radius) {
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.8);
        gradient.addColorStop(0, 'rgba(255,255,255,0.3)');
        gradient.addColorStop(0.3, this.visualState.colorBase + '40');
        gradient.addColorStop(1, this.visualState.colorBase + '00');
        return gradient;
    }

    drawEmotionalExpression(ctx) {
        const expression = this.visualState.expresion;
        const intensity = this.visualState.intensidadEmocional;
        const baseRadius = 40 * this.visualState.tamaño;
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        const eyeSize = 0.08 + intensity * 0.05;
        const eyeSpacing = 0.3;
        const eyeY = -0.2;
        const mouthY = 0.2;
        switch(expression) {
            case 'alegre': this.drawHappyExpression(ctx, baseRadius, intensity, eyeSize, eyeSpacing, eyeY, mouthY); break;
            case 'triste': this.drawSadExpression(ctx, baseRadius, intensity, eyeSize, eyeSpacing, eyeY, mouthY); break;
            case 'asustado': this.drawScaredExpression(ctx, baseRadius, intensity, eyeSize, eyeSpacing, eyeY, mouthY); break;
            case 'enojado': this.drawAngryExpression(ctx, baseRadius, intensity, eyeSize, eyeSpacing, eyeY, mouthY); break;
            case 'confiado': this.drawConfidentExpression(ctx, baseRadius, intensity, eyeSize, eyeSpacing, eyeY, mouthY); break;
            case 'sorprendido': this.drawSurprisedExpression(ctx, baseRadius, intensity, eyeSize, eyeSpacing, eyeY, mouthY); break;
            case 'asqueado': this.drawDisgustedExpression(ctx, baseRadius, intensity, eyeSize, eyeSpacing, eyeY, mouthY); break;
            default: this.drawNeutralExpression(ctx, baseRadius, eyeSize, eyeSpacing, eyeY, mouthY);
        }
        ctx.restore();
    }

    drawHappyExpression(ctx, radius, intensity, eyeSize, eyeSpacing, eyeY, mouthY) {
        ctx.beginPath();
        ctx.arc(-radius * eyeSpacing, radius * eyeY, radius * eyeSize * 1.2, 0.1, Math.PI - 0.1);
        ctx.arc(radius * eyeSpacing, radius * eyeY, radius * eyeSize * 1.2, 0.1, Math.PI - 0.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, radius * mouthY, radius * 0.35, 0.1, Math.PI - 0.1);
        ctx.strokeWidth = 2 + intensity;
        ctx.stroke();
        ctx.fillStyle = `rgba(255,150,150,${intensity * 0.3})`;
        ctx.beginPath();
        ctx.arc(-radius * 0.45, radius * 0.1, radius * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(radius * 0.45, radius * 0.1, radius * 0.15, 0, Math.PI * 2);
        ctx.fill();
    }

    drawSadExpression(ctx, radius, intensity, eyeSize, eyeSpacing, eyeY, mouthY) {
        ctx.beginPath();
        ctx.arc(-radius * eyeSpacing, radius * eyeY, radius * eyeSize * 1.2, 0, Math.PI * 2);
        ctx.arc(radius * eyeSpacing, radius * eyeY, radius * eyeSize * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-radius * 0.4, radius * eyeY - radius * 0.15);
        ctx.lineTo(-radius * 0.2, radius * eyeY - radius * 0.1);
        ctx.moveTo(radius * 0.2, radius * eyeY - radius * 0.1);
        ctx.lineTo(radius * 0.4, radius * eyeY - radius * 0.15);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, radius * mouthY + radius * 0.1, radius * 0.25, Math.PI + 0.2, Math.PI * 2 - 0.2);
        ctx.stroke();
        if (intensity > 0.5) {
            ctx.fillStyle = `rgba(100,150,255,${intensity * 0.3})`;
            ctx.beginPath();
            ctx.ellipse(-radius * 0.3, radius * (eyeY + 0.2), radius * 0.05, radius * 0.08, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(radius * 0.3, radius * (eyeY + 0.2), radius * 0.05, radius * 0.08, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawScaredExpression(ctx, radius, intensity, eyeSize, eyeSpacing, eyeY, mouthY) {
        const eyeSizeBig = eyeSize * 1.5;
        ctx.beginPath();
        ctx.arc(-radius * eyeSpacing, radius * eyeY, radius * eyeSizeBig, 0, Math.PI * 2);
        ctx.arc(radius * eyeSpacing, radius * eyeY, radius * eyeSizeBig, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(-radius * eyeSpacing, radius * eyeY, radius * eyeSize * 0.3, 0, Math.PI * 2);
        ctx.arc(radius * eyeSpacing, radius * eyeY, radius * eyeSize * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(-radius * 0.4, radius * eyeY - radius * 0.25);
        ctx.lineTo(-radius * 0.2, radius * eyeY - radius * 0.2);
        ctx.moveTo(radius * 0.2, radius * eyeY - radius * 0.2);
        ctx.lineTo(radius * 0.4, radius * eyeY - radius * 0.25);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, radius * mouthY + radius * 0.05, radius * 0.2, 0, Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, radius * mouthY + radius * 0.05, radius * 0.15, 0, Math.PI);
        ctx.fillStyle = '#00000020';
        ctx.fill();
        ctx.fillStyle = '#000000';
    }

    drawAngryExpression(ctx, radius, intensity, eyeSize, eyeSpacing, eyeY, mouthY) {
        ctx.beginPath();
        ctx.moveTo(-radius * 0.4, radius * eyeY - radius * 0.05);
        ctx.lineTo(-radius * 0.2, radius * eyeY + radius * 0.05);
        ctx.moveTo(radius * 0.2, radius * eyeY + radius * 0.05);
        ctx.lineTo(radius * 0.4, radius * eyeY - radius * 0.05);
        ctx.stroke();
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-radius * 0.45, radius * eyeY - radius * 0.25);
        ctx.lineTo(-radius * 0.25, radius * eyeY - radius * 0.1);
        ctx.moveTo(radius * 0.25, radius * eyeY - radius * 0.1);
        ctx.lineTo(radius * 0.45, radius * eyeY - radius * 0.25);
        ctx.stroke();
        ctx.lineWidth = 2;
        if (intensity > 0.7) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(-radius * 0.25, radius * mouthY - radius * 0.05, radius * 0.5, radius * 0.1);
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 4; i++) {
                const x = -radius * 0.2 + i * radius * 0.12;
                ctx.fillRect(x, radius * mouthY - radius * 0.04, radius * 0.04, radius * 0.08);
            }
            ctx.fillStyle = '#000000';
        } else {
            ctx.beginPath();
            ctx.moveTo(-radius * 0.25, radius * mouthY);
            ctx.lineTo(radius * 0.25, radius * mouthY);
            ctx.stroke();
        }
        if (intensity > 0.6) {
            ctx.strokeStyle = `rgba(255,0,0,${intensity * 0.3})`;
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                const angle = -0.8 + i * 0.8;
                ctx.beginPath();
                ctx.moveTo(Math.cos(angle) * radius * 0.5, Math.sin(angle) * radius * 0.5);
                ctx.lineTo(Math.cos(angle) * radius * 0.7, Math.sin(angle) * radius * 0.7);
                ctx.stroke();
            }
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
        }
    }

    drawConfidentExpression(ctx, radius, intensity, eyeSize, eyeSpacing, eyeY, mouthY) {
        ctx.beginPath();
        ctx.arc(-radius * eyeSpacing, radius * eyeY, radius * eyeSize * 0.8, 0, Math.PI * 2);
        ctx.arc(radius * eyeSpacing, radius * eyeY, radius * eyeSize * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-radius * 0.35, radius * eyeY - radius * 0.15);
        ctx.lineTo(-radius * 0.2, radius * eyeY - radius * 0.13);
        ctx.moveTo(radius * 0.2, radius * eyeY - radius * 0.13);
        ctx.lineTo(radius * 0.35, radius * eyeY - radius * 0.15);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, radius * mouthY, radius * 0.28, 0.1, Math.PI - 0.1);
        ctx.strokeWidth = 2.5;
        ctx.stroke();
        ctx.strokeWidth = 2;
        ctx.fillStyle = `rgba(255,255,255,${intensity * 0.1})`;
        ctx.beginPath();
        ctx.arc(-radius * 0.1, -radius * 0.3, radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }

    drawSurprisedExpression(ctx, radius, intensity, eyeSize, eyeSpacing, eyeY, mouthY) {
        const eyeSizeBig = eyeSize * 1.8;
        ctx.beginPath();
        ctx.arc(-radius * eyeSpacing, radius * eyeY, radius * eyeSizeBig, 0, Math.PI * 2);
        ctx.arc(radius * eyeSpacing, radius * eyeY, radius * eyeSizeBig, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(-radius * eyeSpacing, radius * eyeY, radius * eyeSize * 0.3, 0, Math.PI * 2);
        ctx.arc(radius * eyeSpacing, radius * eyeY, radius * eyeSize * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(-radius * 0.4, radius * eyeY - radius * 0.3);
        ctx.lineTo(-radius * 0.2, radius * eyeY - radius * 0.2);
        ctx.moveTo(radius * 0.2, radius * eyeY - radius * 0.2);
        ctx.lineTo(radius * 0.4, radius * eyeY - radius * 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, radius * mouthY + radius * 0.05, radius * 0.2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#00000020';
        ctx.fill();
        ctx.fillStyle = '#000000';
    }

    drawDisgustedExpression(ctx, radius, intensity, eyeSize, eyeSpacing, eyeY, mouthY) {
        ctx.beginPath();
        ctx.moveTo(-radius * 0.4, radius * eyeY - radius * 0.05);
        ctx.lineTo(-radius * 0.2, radius * eyeY + radius * 0.05);
        ctx.moveTo(radius * 0.2, radius * eyeY + radius * 0.05);
        ctx.lineTo(radius * 0.4, radius * eyeY - radius * 0.05);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-radius * 0.4, radius * eyeY - radius * 0.2);
        ctx.lineTo(-radius * 0.2, radius * eyeY - radius * 0.15);
        ctx.moveTo(radius * 0.2, radius * eyeY - radius * 0.15);
        ctx.lineTo(radius * 0.4, radius * eyeY - radius * 0.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, radius * mouthY + radius * 0.05, radius * 0.2, 0.2, Math.PI - 0.2);
        ctx.stroke();
        if (intensity > 0.6) {
            ctx.fillStyle = '#e57373';
            ctx.beginPath();
            ctx.ellipse(0, radius * mouthY + radius * 0.15, radius * 0.1, radius * 0.12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000000';
        }
    }

    drawNeutralExpression(ctx, radius, eyeSize, eyeSpacing, eyeY, mouthY) {
        ctx.beginPath();
        ctx.arc(-radius * eyeSpacing, radius * eyeY, radius * eyeSize, 0, Math.PI * 2);
        ctx.arc(radius * eyeSpacing, radius * eyeY, radius * eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-radius * 0.2, radius * mouthY);
        ctx.lineTo(radius * 0.2, radius * mouthY);
        ctx.stroke();
    }

    drawHalo(ctx) {
        const radius = 50 * this.visualState.tamaño;
        const color = this.visualState.colorBase;
        const intensity = this.visualState.intensidadVisual * 0.5 + 0.3;
        const gradient = ctx.createRadialGradient(0, 0, radius * 0.3, 0, 0, radius * 1.5);
        gradient.addColorStop(0, color + `${Math.floor(intensity * 60).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(0.5, color + `${Math.floor(intensity * 30).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, color + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 1.5, 0, Math.PI * 2);
        ctx.fill();
        const pulse = 1 + Math.sin((systemCore.systemTime || Date.now()) * 1.5) * 0.05;
        ctx.strokeStyle = color + `${Math.floor(intensity * 40).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 2 * intensity;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 1.2 * pulse, 0, Math.PI * 2);
        ctx.stroke();
    }

    drawReflections(ctx) {
        const radius = 40 * this.visualState.tamaño;
        const intensity = this.visualState.brillo * 0.5;
        const gradient = ctx.createRadialGradient(-radius * 0.3, -radius * 0.35, 0, -radius * 0.3, -radius * 0.35, radius * 0.5);
        gradient.addColorStop(0, `rgba(255,255,255,${intensity * 0.6})`);
        gradient.addColorStop(0.5, `rgba(255,255,255,${intensity * 0.2})`);
        gradient.addColorStop(1, `rgba(255,255,255,0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(-radius * 0.2, -radius * 0.25, radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        if (intensity > 0.4) {
            const gradient2 = ctx.createRadialGradient(radius * 0.2, -radius * 0.1, 0, radius * 0.2, -radius * 0.1, radius * 0.2);
            gradient2.addColorStop(0, `rgba(255,255,255,${intensity * 0.2})`);
            gradient2.addColorStop(1, `rgba(255,255,255,0)`);
            ctx.fillStyle = gradient2;
            ctx.beginPath();
            ctx.arc(radius * 0.2, -radius * 0.1, radius * 0.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderEffects(ctx, width, height) {
        const intensity = this.visualState.intensidadVisual;
        if (this.visualState.energiaVisual > 0.3) {
            const time = systemCore.systemTime || Date.now();
            const centerX = width / 2;
            const centerY = height / 2;
            for (let i = 0; i < 8; i++) {
                const angle = time * 0.5 + i * 0.785;
                const radius = 60 + Math.sin(time * 0.7 + i) * 20;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, 30);
                gradient.addColorStop(0, `rgba(100,200,255,${this.visualState.energiaVisual * 0.2})`);
                gradient.addColorStop(1, `rgba(100,200,255,0)`);
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y, 30, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        if (this.visualState.claridad < 0.5) {
            const fogIntensity = (0.5 - this.visualState.claridad) * 2;
            ctx.fillStyle = `rgba(150,150,200,${fogIntensity * 0.15})`;
            ctx.fillRect(0, 0, width, height);
        }
        if (this.visualState.textura > 0.3) {
            const time = systemCore.systemTime || Date.now();
            const texIntensity = this.visualState.textura * 0.3;
            for (let i = 0; i < 30; i++) {
                const x = (Math.sin(time * 0.1 + i * 1.7) * 0.5 + 0.5) * width;
                const y = (Math.cos(time * 0.13 + i * 2.3) * 0.5 + 0.5) * height;
                const size = 1 + Math.sin(time * 0.2 + i) * 0.5;
                ctx.fillStyle = `rgba(100,100,120,${texIntensity * 0.1})`;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    renderUIOverlay(ctx, width, height) {
        const stats = this.getState();
        const x = 15;
        const y = 15;
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, 120, 25, 8);
            ctx.fill();
        } else {
            ctx.fillRect(x, y, 120, 25);
        }
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(`💡 ${stats.expresion}`, x + 10, y + 16);
        ctx.restore();
    }

    handleCanvasClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        this.interactionZones.forEach(zone => {
            const dx = x - zone.x;
            const dy = y - zone.y;
            if (dx * dx + dy * dy < zone.radius * zone.radius) {
                this.emitEvent('zone_clicked', { zone, position: { x, y } });
            }
        });
        this.emitEvent('canvas_click', { x, y });
    }

    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        this.emitEvent('mouse_move', { x, y });
    }

    handleMouseLeave() {
        this.emitEvent('mouse_leave', {});
    }

    addInteractionZone(zone) {
        this.interactionZones.push(zone);
    }

    getState() {
        return { ...this.visualState, particleCount: this.particles.length };
    }

    getParticleCount() {
        return this.particles.length;
    }

    adjustBrightness(color, factor) {
        if (!color || !color.startsWith('#')) return color;
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const newR = Math.min(255, Math.floor(r * factor));
        const newG = Math.min(255, Math.floor(g * factor));
        const newB = Math.min(255, Math.floor(b * factor));
        return `rgb(${newR}, ${newG}, ${newB})`;
    }

    adjustSaturation(color, factor) {
        if (!color || !color.startsWith('#')) return color;
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        const newR = Math.min(255, Math.floor(gray + (r - gray) * factor));
        const newG = Math.min(255, Math.floor(gray + (g - gray) * factor));
        const newB = Math.min(255, Math.floor(gray + (b - gray) * factor));
        return `rgb(${newR}, ${newG}, ${newB})`;
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    reset() {
        this.initializeVisualState();
        this.particles = [];
        this.visualCache = {};
        this.interactionZones = [];
        this.renderQueue = [];
    }

    exportData() {
        return {
            visualState: this.getState(),
            particleCount: this.getParticleCount(),
            effects: Array.from(this.effects.entries()),
            particleSystems: Array.from(this.particleSystems.entries()),
            interactionZones: this.interactionZones
        };
    }
}

systemCore.registerModule('visual', new VisualSystem());
