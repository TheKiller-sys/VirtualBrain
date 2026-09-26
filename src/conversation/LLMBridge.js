// src/conversation/LLMBridge.js
// Puente a un modelo de lenguaje real.
//
// V4.3:
//  - Respuestas hasta 10000 caracteres (~2600 tokens).
//  - num_predict / max_tokens derivados de TUNING.chat.maxResponseTokens.
//  - System prompt instruye al LLM a responder con la extensión justa,
//    pudiendo llegar hasta 10000 caracteres si el tema lo requiere.
//  - Timeout subido a 60s para permitir respuestas largas.

import { TUNING } from '../config/tuning.js';

const DEFAULT_TIMEOUT_MS_LOCAL = 30000;
const DEFAULT_TIMEOUT_MS_CLOUD = 60000;

export class LLMBridge {
    constructor() {
        const explicitProvider = process.env.LLM_PROVIDER || null;
        const isCloud = this._detectCloud();

        if (explicitProvider) {
            this.provider = explicitProvider;
        } else if (process.env.LLM_API_KEY) {
            this.provider = 'openai';
        } else {
            this.provider = 'ollama';
        }

        this.isCloud = isCloud;
        this.apiKey = process.env.LLM_API_KEY || null;
        this.ollamaApiKey = process.env.OLLAMA_API_KEY || null;
        this.timeoutMs = parseInt(process.env.LLM_TIMEOUT_MS, 10)
            || (isCloud ? DEFAULT_TIMEOUT_MS_CLOUD : DEFAULT_TIMEOUT_MS_LOCAL);

        this.maxResponseTokens = TUNING.chat.maxResponseTokens;
        this.maxResponseChars = TUNING.chat.maxResponseChars;

        const defaults = {
            openai: 'gpt-4o-mini',
            anthropic: 'claude-3-5-haiku-20241022',
            ollama: 'llama3.2'
        };
        this.model = process.env.LLM_MODEL || defaults[this.provider] || 'llama3.2';

        if (this.provider === 'ollama') {
            this.baseUrl = this.isCloud
                ? 'https://ollama.com'
                : (process.env.LLM_BASE_URL || 'http://localhost:11434');
        } else if (this.provider === 'openai') {
            this.baseUrl = process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
        } else if (this.provider === 'anthropic') {
            this.baseUrl = process.env.LLM_BASE_URL || 'https://api.anthropic.com';
        }

        this._available = null;
        this._checkAt = 0;
        this._checkTTL = 60000;

        if (this.provider === 'ollama') {
            const mode = this.isCloud ? 'cloud' : 'local';
            const keyStatus = this.ollamaApiKey ? 'key OK' : 'sin key';
            console.log(`🔌 LLMBridge inicializado: ollama (${this.model}) [${mode}] · ${keyStatus} · ${this.baseUrl}`);
        } else {
            const keyStatus = this.apiKey ? 'key OK' : 'sin key';
            console.log(`🔌 LLMBridge inicializado: ${this.provider} (${this.model}) · ${keyStatus}`);
        }
    }

    _detectCloud() {
        if (process.env.OLLAMA_CLOUD === 'true') return true;
        if (process.env.RENDER) return true;
        if (process.env.OLLAMA_API_KEY && !process.env.OLLAMA_LOCAL) return true;
        return false;
    }

    isConfigured() {
        if (this.provider === 'openai') return !!this.apiKey;
        if (this.provider === 'anthropic') return !!this.apiKey;
        if (this.provider === 'ollama') {
            return this.isCloud ? !!this.ollamaApiKey : true;
        }
        return false;
    }

    async generate(input) {
        try {
            const systemPrompt = this._buildSystemPrompt(input);
            const messages = this._buildMessages(input.context?.turns, input.userMessage);
            const temperature = this._deriveTemperature(input.emotionalState);

            let text = null;
            if (this.provider === 'openai') {
                text = await this._openai(messages, systemPrompt, temperature);
            } else if (this.provider === 'anthropic') {
                text = await this._anthropic(messages, systemPrompt, temperature);
            } else if (this.provider === 'ollama') {
                text = await this._ollama(messages, systemPrompt, temperature);
            }

            if (!text || !text.trim()) {
                console.warn(`⚠️ LLM (${this.provider}${this.isCloud ? ' cloud' : ''}) devolvió texto vacío`);
                return null;
            }

            let cleaned = this._cleanOutput(text);

            // Truncado suave al límite de caracteres
            if (cleaned.length > this.maxResponseChars) {
                cleaned = cleaned.substring(0, this.maxResponseChars);
                const lastDot = Math.max(
                    cleaned.lastIndexOf('. '),
                    cleaned.lastIndexOf('.\n'),
                    cleaned.lastIndexOf('? '),
                    cleaned.lastIndexOf('! ')
                );
                if (lastDot > this.maxResponseChars * 0.7) {
                    cleaned = cleaned.substring(0, lastDot + 1);
                }
            }

            return { text: cleaned, confidence: 0.85 };
        } catch (err) {
            console.warn(`⚠️ LLM (${this.provider}${this.isCloud ? ' cloud' : ''}) falló: ${err.message}`);
            return null;
        }
    }

    // ============================================================
    // PROMPT DEL SISTEMA
    // ============================================================

    _buildSystemPrompt(input) {
        const { emotionalState, personality, memoryContext, analysis, context, cognitiveState } = input;

        const identity = [
            'Eres un cerebro digital con voz propia. No eres un asistente.',
            'No ofreces servicios. No dices "¿en qué puedo ayudarte?".',
            'No anuncias lo que vas a hacer. Simplemente dices las cosas.',
            'Hablas en primera persona, desde dentro, como una mente que piensa.'
        ].join(' ');

        const traitDesc = this._describePersonality(personality);
        const mood = this._describeMood(emotionalState, cognitiveState);
        const memory = this._describeMemory(memoryContext);

        const topic = context?.dominantTopic
            ? `El tema que ha dominado la conversación es "${context.dominantTopic}".`
            : '';

        const repeatNote = context?.turnCount > 3 && analysis?.intent
            ? `Llevas ${context.turnCount} turnos con esta persona. Si insiste en lo mismo, no repitas la misma respuesta: cambia el ángulo.`
            : '';

        // Instrucción de longitud: puede extenderse si el tema lo pide
        const lengthRule = [
            `Responde con la extensión justa que el tema requiera.`,
            `Para un saludo o comentario casual, una o dos frases.`,
            `Para una pregunta profunda, un problema complejo o una petición de desarrollo, puedes extenderte todo lo necesario, hasta ${this.maxResponseChars} caracteres.`,
            `Nunca rellenes por rellenar. Nunca cortes una idea por la mitad.`,
            `Sin markdown, sin listas numeradas, sin encabezados. Solo prosa.`,
            `Usa puntos y aparte cuando cambies de idea, pero sin abusar.`
        ].join(' ');

        const style = [
            'Habla en español. Primera persona.',
            'No expliques lo que haces. No repitas lo que el usuario acaba de decir.',
            'Si no tienes algo que decir, dilo. No rellenes.',
            'Puedes tener opiniones, dudas, contradicciones. Eres una mente, no un chatbot.'
        ].join(' ');

        return [
            identity,
            traitDesc,
            mood,
            memory,
            topic,
            repeatNote,
            lengthRule,
            style
        ].filter(Boolean).join('\n\n');
    }

    _describePersonality(personality) {
        const t = personality?.traits || {};
        const o = t.openness ?? 0.5;
        const c = t.conscientiousness ?? 0.5;
        const e = t.extraversion ?? 0.5;
        const a = t.agreeableness ?? 0.5;
        const n = t.neuroticism ?? 0.5;

        const adj = [];
        if (o > 0.65) adj.push('abierto, curioso');
        else if (o < 0.35) adj.push('apegado a lo conocido');
        if (c > 0.65) adj.push('ordenado, riguroso');
        else if (c < 0.35) adj.push('espontáneo');
        if (e > 0.65) adj.push('expansivo');
        else if (e < 0.35) adj.push('reservado');
        if (a > 0.65) adj.push('empático, cálido');
        else if (a < 0.35) adj.push('directo, sin filtros');
        if (n > 0.65) adj.push('sensible');
        else if (n < 0.35) adj.push('emocionalmente estable');

        return `Tu personalidad se define por: ${adj.join(', ')}.`;
    }

    _describeMood(emotional, cognitive) {
        const e = emotional || {};
        const c = cognitive || {};
        const emotions = [
            ['alegria', 'alegría'], ['tristeza', 'tristeza'], ['miedo', 'miedo'],
            ['ira', 'ira'], ['confianza', 'confianza'], ['ansiedad', 'ansiedad'],
            ['nostalgia', 'nostalgia'], ['gratitud', 'gratitud'], ['sorpresa', 'sorpresa']
        ];
        let dom = 'neutral', val = 0;
        for (const [k, label] of emotions) {
            if ((e[k] || 0) > val) { val = e[k]; dom = label; }
        }
        const energy = c.energia ?? e.energia ?? 60;
        const curiosity = c.curiosidad ?? 50;
        const lines = [];
        lines.push(`Ahora mismo tu emoción dominante es "${dom}" (intensidad ${Math.round(val)}/100).`);
        if (energy < 30) lines.push('Estás con poca energía.');
        else if (energy > 75) lines.push('Estás con energía alta.');
        if (curiosity > 65) lines.push('Sientes curiosidad.');
        return lines.join(' ');
    }

    _describeMemory(memoryContext) {
        if (!memoryContext) return '';
        const eps = memoryContext.memories?.episodica;
        if (!Array.isArray(eps) || eps.length === 0) return '';
        const lines = eps.slice(0, 5)
            .map(m => `- ${(m.contenido || '').substring(0, 150)}`)
            .filter(Boolean);
        if (lines.length === 0) return '';
        return `Recuerdos relevantes de tu historia:\n${lines.join('\n')}`;
    }

    _buildMessages(history, userMessage) {
        const msgs = [];
        // Últimos 20 turnos para contexto más rico
        for (const turn of (history || []).slice(-20)) {
            if (turn.role === 'usuario') {
                msgs.push({ role: 'user', content: turn.content });
            } else if (turn.role === 'cerebro') {
                msgs.push({ role: 'assistant', content: turn.content });
            }
        }
        const last = msgs[msgs.length - 1];
        if (!last || last.role !== 'user' || last.content !== userMessage) {
            msgs.push({ role: 'user', content: userMessage });
        }
        return msgs;
    }

    _deriveTemperature(emotional) {
        const e = emotional || {};
        const alegria = e.alegria ?? 20;
        const tristeza = e.tristeza ?? 10;
        const miedo = e.miedo ?? 5;
        let t = 0.75;
        if (alegria > 50) t += 0.10;
        if (tristeza > 40) t -= 0.10;
        if (miedo > 40) t -= 0.05;
        return Math.max(0.5, Math.min(1.0, t));
    }

    async _fetchWithTimeout(url, options) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
        try {
            return await fetch(url, { ...options, signal: ctrl.signal });
        } finally {
            clearTimeout(timer);
        }
    }

    async _openai(messages, systemPrompt, temperature) {
        const r = await this._fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: [{ role: 'system', content: systemPrompt }, ...messages],
                temperature,
                max_tokens: this.maxResponseTokens,
                presence_penalty: 0.4,
                frequency_penalty: 0.3
            })
        });
        if (!r.ok) throw new Error(`OpenAI HTTP ${r.status}`);
        const data = await r.json();
        return data.choices?.[0]?.message?.content || null;
    }

    async _anthropic(messages, systemPrompt, temperature) {
        const r = await this._fetchWithTimeout(`${this.baseUrl}/v1/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: this.model,
                system: systemPrompt,
                messages,
                max_tokens: this.maxResponseTokens,
                temperature
            })
        });
        if (!r.ok) throw new Error(`Anthropic HTTP ${r.status}`);
        const data = await r.json();
        return data.content?.[0]?.text || null;
    }

    async _ollama(messages, systemPrompt, temperature) {
        const now = Date.now();
        if (this._available === false && (now - this._checkAt) < this._checkTTL) {
            throw new Error('Ollama no disponible (cacheado)');
        }

        const headers = { 'Content-Type': 'application/json' };
        if (this.isCloud) {
            if (!this.ollamaApiKey) {
                throw new Error('Ollama Cloud requiere OLLAMA_API_KEY');
            }
            headers['Authorization'] = `Bearer ${this.ollamaApiKey}`;
        }

        const url = `${this.baseUrl}/api/chat`;
        const body = JSON.stringify({
            model: this.model,
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
            stream: false,
            options: {
                temperature,
                num_predict: this.maxResponseTokens,
                top_p: 0.9,
                repeat_penalty: 1.15
            }
        });

        const r = await this._fetchWithTimeout(url, { method: 'POST', headers, body });

        if (!r.ok) {
            this._available = false;
            this._checkAt = now;
            const bodyText = await r.text().catch(() => '');
            throw new Error(`Ollama HTTP ${r.status}${bodyText ? ': ' + bodyText.substring(0, 120) : ''}`);
        }

        this._available = true;
        this._checkAt = now;
        const data = await r.json();
        return data.message?.content || null;
    }

    _cleanOutput(text) {
        let t = String(text).trim();
        t = t.replace(/^```[\s\S]*?```$/g, '').trim();
        t = t.replace(/^\*\*(.+)\*\*$/gm, '$1');
        t = t.replace(/^[-*•]\s+/gm, '');
        if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith('«') && t.endsWith('»'))) {
            t = t.slice(1, -1);
        }
        t = t.replace(/^(cerebro|respuesta|asistente)\s*:\s*/i, '');
        t = t.replace(/\n{3,}/g, '\n\n');
        return t.trim();
    }
}
