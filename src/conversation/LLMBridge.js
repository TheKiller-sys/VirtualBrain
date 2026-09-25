// src/conversation/LLMBridge.js
// Puente opcional a un modelo externo.
// Se activa solo si hay variables de entorno configuradas.

const DEFAULT_TIMEOUT_MS = 15000;

export class LLMBridge {
    constructor() {
        this.provider = process.env.LLM_PROVIDER || null; // 'openai' | 'anthropic' | 'ollama'
        this.apiKey = process.env.LLM_API_KEY || null;
        this.model = process.env.LLM_MODEL || null;
        this.baseUrl = process.env.LLM_BASE_URL || null;
        this.timeoutMs = parseInt(process.env.LLM_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

        // Defaults por proveedor
        if (this.provider === 'openai' && !this.model) this.model = 'gpt-4o-mini';
        if (this.provider === 'anthropic' && !this.model) this.model = 'claude-3-5-haiku-20241022';
        if (this.provider === 'ollama' && !this.model) this.model = 'llama3.2';
        if (this.provider === 'ollama' && !this.baseUrl) this.baseUrl = 'http://localhost:11434';
    }

    isConfigured() {
        if (!this.provider) return false;
        if (this.provider === 'openai' && !this.apiKey) return false;
        if (this.provider === 'anthropic' && !this.apiKey) return false;
        return true;
    }

    async generate({ userMessage, history, systemPrompt }) {
        try {
            const messages = this._buildMessages(history, userMessage);
            let raw;
            if (this.provider === 'openai') raw = await this._openai(messages, systemPrompt);
            else if (this.provider === 'anthropic') raw = await this._anthropic(messages, systemPrompt);
            else if (this.provider === 'ollama') raw = await this._ollama(messages, systemPrompt);
            else return null;

            if (!raw) return null;

            return {
                text: raw.trim(),
                confidence: 0.85
            };
        } catch (err) {
            console.warn('⚠️ LLM falló, usando plantillas:', err.message);
            return null;
        }
    }

    _buildMessages(history, userMessage) {
        const msgs = [];
        for (const turn of (history || []).slice(-8)) {
            if (turn.role === 'usuario') msgs.push({ role: 'user', content: turn.content });
            else if (turn.role === 'cerebro') msgs.push({ role: 'assistant', content: turn.content });
        }
        msgs.push({ role: 'user', content: userMessage });
        return msgs;
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

    async _openai(messages, systemPrompt) {
        const r = await this._fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: [{ role: 'system', content: systemPrompt }, ...messages],
                temperature: 0.8,
                max_tokens: 400
            })
        });
        if (!r.ok) throw new Error(`OpenAI HTTP ${r.status}`);
        const data = await r.json();
        return data.choices?.[0]?.message?.content || null;
    }

    async _anthropic(messages, systemPrompt) {
        const r = await this._fetchWithTimeout('https://api.anthropic.com/v1/messages', {
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
                max_tokens: 400,
                temperature: 0.8
            })
        });
        if (!r.ok) throw new Error(`Anthropic HTTP ${r.status}`);
        const data = await r.json();
        return data.content?.[0]?.text || null;
    }

    async _ollama(messages, systemPrompt) {
        const r = await this._fetchWithTimeout(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.model,
                messages: [{ role: 'system', content: systemPrompt }, ...messages],
                stream: false,
                options: { temperature: 0.8 }
            })
        });
        if (!r.ok) throw new Error(`Ollama HTTP ${r.status}`);
        const data = await r.json();
        return data.message?.content || null;
    }
}
