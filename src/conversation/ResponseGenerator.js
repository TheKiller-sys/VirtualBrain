// src/conversation/ResponseGenerator.js
//
// V4.3.1:
//  - usedContext ahora se calcula realmente a partir de memoryContext y
//    del contexto de conversación. Antes estaba hardcoded a `true`.
//
// V4.3:
//  - Truncado suave a TUNING.chat.maxResponseChars (10000).
//  - El composer también respeta el límite.
//  - Si el LLM falla, el composer produce salida estructurada.

import { systemCore } from '../core/SystemCore.js';
import { TUNING } from '../config/tuning.js';
import { LLMBridge } from './LLMBridge.js';
import { ConversationComposer } from './ConversationComposer.js';

export class ResponseGenerator {
    constructor() {
        this.llm = new LLMBridge();
        this.composer = new ConversationComposer();
        this.maxChars = TUNING.chat.maxResponseChars;
    }

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

    _wrap({ text, source, input, confidence, reasoning }) {
        const emotion = this._deriveEmotion(input.emotionalState);

        // Truncado suave si excede el límite
        let finalText = text || '';
        if (finalText.length > this.maxChars) {
            finalText = finalText.substring(0, this.maxChars);
            const lastDot = Math.max(
                finalText.lastIndexOf('. '),
                finalText.lastIndexOf('.\n')
            );
            if (lastDot > this.maxChars * 0.7) {
                finalText = finalText.substring(0, lastDot + 1);
            }
        }

        const usedContext = this._computeUsedContext(input);

        return {
            text: finalText,
            source,
            emotion,
            emoji: this._emojiFor(emotion),
            reasoning,
            confidence,
            usedContext
        };
    }

    /**
     * Determina si realmente se usó contexto (memoria + historial).
     * Antes esto era `true` fijo, lo que hacía que el chip "contexto"
     * del frontend mintiera siempre.
     */
    _computeUsedContext(input) {
        if (!input) return false;

        // Memoria semántica/episódica/procedural
        const mem = input.memoryContext;
        if (mem && mem.memories) {
            const e = mem.memories.episodica;
            const s = mem.memories.semantica;
            const p = mem.memories.procedural;
            if ((Array.isArray(e) && e.length > 0) ||
                (Array.isArray(s) && s.length > 0) ||
                (Array.isArray(p) && p.length > 0)) {
                return true;
            }
        }

        // Historial de conversación previo (turnCount > 0 o turns no vacío)
        const ctx = input.context;
        if (ctx) {
            if (typeof ctx.turnCount === 'number' && ctx.turnCount > 0) return true;
            if (Array.isArray(ctx.turns) && ctx.turns.length > 0) return true;
        }

        return false;
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
