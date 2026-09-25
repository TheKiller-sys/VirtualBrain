// src/conversation/ResponseGenerator.js
//
// Genera respuestas en dos capas:
//
//   1. LLM (Ollama local por defecto). Lenguaje real, emergente, con voz.
//      Es la vía primaria. Si está disponible, se usa siempre.
//
//   2. ConversationComposer. Gramática composicional sin plantillas.
//      Solo entra si el LLM falla o no está configurado.
//
// El composer NO usa "si tristeza → di X". Planifica actos de habla y
// construye oraciones desde unidades léxicas pequeñas + estado interno.
//
// El modo de operación se refleja en `source`: 'llm' o 'composer'.

import { systemCore } from '../core/SystemCore.js';
import { LLMBridge } from './LLMBridge.js';
import { ConversationComposer } from './ConversationComposer.js';

export class ResponseGenerator {
    constructor() {
        this.llm = new LLMBridge();
        this.composer = new ConversationComposer();
    }

    /**
     * Punto de entrada. Devuelve:
     *   { text, source, emotion, emoji, reasoning, confidence, usedContext }
     */
    async generate(input) {
        // 1. Intentar LLM
        if (this.llm.isConfigured()) {
            const r = await this.llm.generate(input);
            if (r && r.text) {
                return this._wrap({
                    text: r.text,
                    source: 'llm',
                    input,
                    confidence: r.confidence ?? 0.85,
                    reasoning: `Generación directa vía ${this.llm.provider} (${this.llm.model})`
                });
            }
        }

        // 2. Composer constructivo
        const c = this.composer.compose(input);
        return this._wrap({
            text: c.text,
            source: 'composer',
            input,
            confidence: (input.analysis?.confidence ?? 0.5) * 0.75,
            reasoning: c.reasoning
        });
    }

    // ============================================================
    // HELPERS
    // ============================================================

    _wrap({ text, source, input, confidence, reasoning }) {
        const emotion = this._deriveEmotion(input.emotionalState);
        return {
            text,
            source,
            emotion,
            emoji: this._emojiFor(emotion),
            reasoning,
            confidence,
            usedContext: true
        };
    }

    _deriveEmotion(emotionalState) {
        if (!emotionalState) return 'neutral';
        const emotions = [
            'alegria', 'tristeza', 'miedo', 'ira', 'confianza',
            'sorpresa', 'ansiedad', 'gratitud', 'nostalgia', 'euforia'
        ];
        let dom = 'neutral', max = 0;
        for (const e of emotions) {
            if ((emotionalState[e] || 0) > max) {
                max = emotionalState[e];
                dom = e;
            }
        }
        return max > 25 ? dom : 'neutral';
    }

    _emojiFor(emotion) {
        const map = {
            alegria: '😊', tristeza: '😢', miedo: '😨', ira: '😠',
            confianza: '😌', sorpresa: '😮', ansiedad: '😰',
            gratitud: '🙏', nostalgia: '🌧️', euforia: '✨',
            neutral: '😐'
        };
        return map[emotion] || '😐';
    }
}

export const responseGenerator = new ResponseGenerator();
