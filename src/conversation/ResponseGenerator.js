// src/conversation/ResponseGenerator.js
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

        return {
            text: finalText,
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
