// src/conversation/LLMBridge.js
// Puente a un modelo de lenguaje real.
//
// Compatible con DOS entornos:
//   - Local (tu PC): usa http://localhost:11434 (Ollama instalado)
//   - Render / nube:  usa https://ollama.com (Ollama Cloud, requiere API key)
//
// Detección automática:
//   - Si process.env.RENDER está definido → modo cloud
//   - Si process.env.OLLAMA_CLOUD === 'true' → modo cloud
//   - Si process.env.OLLAMA_API_KEY está definido → modo cloud
//   - Si no → modo local (localhost:11434)
//
// Variables de entorno:
//   LLM_PROVIDER   'ollama' | 'openai' | 'anthropic'   (default 'ollama')
//   OLLAMA_API_KEY API key de Ollama Cloud (obligatoria en Render)
//   LLM_MODEL      ej 'llama3.2', 'qwen2.5:7b' (default 'llama3.2')
//   LLM_TIMEOUT_MS default 45000 (más alto en cloud)
//
// Proveedores alternativos (si no usas Ollama):
//   LLM_API_KEY + LLM_PROVIDER='openai' o 'anthropic'

const DEFAULT_TIMEOUT_MS_LOCAL = 25000;
const DEFAULT_TIMEOUT_MS_CLOUD = 45000;

export class LLMBridge {
    constructor() {
        const explicitProvider = process.env.LLM_PROVIDER || null;

        // --- Detección de entorno ---
        const isCloud = this._detectCloud();

        // --- Selección de proveedor ---
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

        // --- Modelo por defecto ---
        const defaults = {
            openai: 'gpt-4o-mini',
            anthropic: 'claude-3-5-haiku-20241022',
            ollama: 'llama3.2'
        };
        this.model = process.env.LLM_MODEL || defaults[this.provider] || 'llama3.2';

        // --- Base URL según entorno ---
        if (this.provider === 'ollama') {
            if (this.isCloud) {
                this.baseUrl = 'https://ollama.com';
            } else {
                this.baseUrl = process.env.LLM_BASE_URL || 'http://localhost:11434';
            }
        } else if (this.provider === 'openai') {
            this.baseUrl = process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
        } else if (this.provider === 'anthropic') {
            this.baseUrl = process.env.LLM_BASE_URL || 'https://api.anthropic.com';
        }

        // Cache de disponibilidad (para no insistir si está caído)
        this._available = null;
        this._checkAt = 0;
        this._checkTTL = 60000;
    }

    /**
     * Detecta si estamos en un entorno cloud (Render, etc.).
     * Render inyecta RENDER=true automáticamente.
     */
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
            // En cloud exige API key; en local no
            return this.isCloud ? !!this.ollamaApiKey : true;
        }
        return false;
    }

    /**
     * Punto de entrada principal.
     * Recibe el input completo del ResponseGenerator y devuelve:
     *   { text, confidence }  o  null si falla.
     */
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

            if (!text || !text.trim()) return null;

            const cleaned = this._cleanOutput(text);

            return {
                text: cleaned,
                confidence: 0.85
            };
        } catch (err) {
            console.warn(`⚠️ LLM (${this.provider}${this.isCloud ? ' cloud' : ''}) falló: ${err.message}`);
            return null;
        }
    }

    // ============================================================
    // PROMPT DEL SISTEMA — construido desde el estado real del cerebro
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

        const style = [
            'Habla en español. Primera persona. Frases cortas.',
            'Sin markdown, sin listas, sin encabezados.',
            'No expliques lo que haces. No repitas lo que el usuario acaba de decir.',
            'Si no tienes algo que decir, dilo. No rellenes.',
            'Puedes tener opiniones, dudas, contradicciones. Eres una mente, no un chatbot.',
            'Responde con la longitud justa: a veces una frase, a veces tres. Nunca un párrafo largo.'
        ].join(' ');

        return [
            identity,
            traitDesc,
            mood,
            memory,
            topic,
            repeatNote,
            style
        ].filter(Boolean).join('\n\n');
    }

    _describePersonality(personality) {
        const t = personality?.traits || {};
        const openness = t.openness ?? 0.5;
        const consc = t.conscientiousness ?? 0.5;
        const extra = t.extraversion ?? 0.5;
        const agree = t.agreeableness ?? 0.5;
        const neuro = t.neuroticism ?? 0.5;

        const adjectives = [];
        if (openness > 0.65) adjectives.push('abierto a lo desconocido, curioso');
        else if (openness < 0.35) adjectives.push('apegado a lo conocido');
        if (consc > 0.65) adjectives.push('ordenado, riguroso');
        else if (consc < 0.35) adjectives.push('espontáneo');
        if (extra > 0.65) adjectives.push('expansivo, te gusta hablar');
        else if (extra < 0.35) adjectives.push('reservado');
        if (agree > 0.65) adjectives.push('empático, cálido');
        else if (agree < 0.35) adjectives.push('directo, sin filtros');
        if (neuro > 0.65) adjectives.push('sensible, te afectan las cosas');
        else if (neuro < 0.35) adjectives.push('emocionalmente estable');

        return `Tu personalidad se define por: ${adjectives.join(', ')}.`;
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

        const lines = eps.slice(0, 3)
            .map(m => `- ${(m.contenido || '').substring(0, 120)}`)
            .filter(Boolean);
        if (lines.length === 0) return '';

        return `Recuerdos relevantes de tu historia:\n${lines.join('\n')}`;
    }

    _buildMessages(history, userMessage) {
        const msgs = [];
        for (const turn of (history || []).slice(-10)) {
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

    // ============================================================
    // PROVEEDORES
    // ============================================================

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
                max_tokens: 350,
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
                max_tokens: 350,
                temperature
            })
        });
        if (!r.ok) throw new Error(`Anthropic HTTP ${r.status}`);
        const data = await r.json();
        return data.content?.[0]?.text || null;
    }

    /**
     * Ollama — mismo endpoint en local y en cloud.
     * La única diferencia es la URL base y el header de autorización.
     * En cloud exige OLLAMA_API_KEY; en local se omite.
     */
    async _ollama(messages, systemPrompt, temperature) {
        // Verificación de disponibilidad (cacheada)
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

        const r = await this._fetchWithTimeout(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: this.model,
                messages: [{ role: 'system', content: systemPrompt }, ...messages],
                stream: false,
                options: {
                    temperature,
                    num_predict: 350,
                    top_p: 0.9,
                    repeat_penalty: 1.15
                }
            })
        });

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

    // ============================================================
    // LIMPIEZA DE SALIDA
    // ============================================================

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