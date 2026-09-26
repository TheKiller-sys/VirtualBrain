// src/conversation/ConversationManager.js
// Mantiene el contexto conversacional por sesión.
//
// V4.3.1:
//  - FIX CRÍTICO: _pendingMessages ahora es Map<sessionId, Array>.
//    Antes era un array global y en concurrencia las sesiones se
//    mezclaban: si A grababa, B grababa, y A drenaba, A se llevaba
//    los mensajes de B.
//  - drainPendingMessages(sessionId) drena solo una sesión.
//  - drainAllPendingMessages() para shutdown.
//  - Cap por sesión (200 mensajes pendientes máximo).
//  - _maybeCleanupSessions limpia también los pendientes.
//
// V4.3:
//  - MAX_IN_MEMORY_TURNS subido a 300 para conversaciones largas.
//  - Método getFullHistory() que devuelve todos los turnos de la sesión.
//  - Método getSerializableTurns() para el endpoint de historial.

import { systemCore } from '../core/SystemCore.js';

const MAX_IN_MEMORY_TURNS = 300;
const MAX_TOPICS = 30;
const MAX_PENDING_PER_SESSION = 200;

export class ConversationManager {
    constructor() {
        this.sessions = new Map();
        // Map<sessionId, Array<entry>> — cola de pendientes por sesión
        this._pendingMessages = new Map();
        this._lastCleanupAt = Date.now();
        this._cleanupIntervalMs = 300000;
        this._sessionTTL = 7200000; // 2 horas sin actividad
    }

    getSession(sessionId = 'default') {
        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, this._createSession(sessionId));
        }
        const s = this.sessions.get(sessionId);
        s.lastActivityAt = Date.now();
        return s;
    }

    _createSession(sessionId) {
        return {
            sessionId,
            createdAt: Date.now(),
            lastActivityAt: Date.now(),
            turns: [],
            topics: new Map(),
            sentimentTrend: [],
            emotionalTrend: [],
            turnCount: 0,
            askedTopics: new Set()
        };
    }

    recordTurn(sessionId, turn) {
        const session = this.getSession(sessionId);
        const entry = {
            role: turn.role,
            content: turn.content || '',
            intent: turn.intent || null,
            sentiment: typeof turn.sentiment === 'number' ? turn.sentiment : 0,
            emotion: turn.emotion || null,
            entities: Array.isArray(turn.entities) ? turn.entities.slice(0, 8) : [],
            timestamp: Date.now(),
            simTime: systemCore.systemTime
        };

        session.turns.push(entry);
        if (session.turns.length > MAX_IN_MEMORY_TURNS) {
            session.turns.shift();
        }
        session.turnCount++;

        if (entry.role === 'usuario' && entry.entities.length > 0) {
            for (const topic of entry.entities) {
                const existing = session.topics.get(topic) || { count: 0, lastMention: 0, sentimentSum: 0 };
                existing.count++;
                existing.lastMention = entry.timestamp;
                existing.sentimentSum += entry.sentiment;
                session.topics.set(topic, existing);
            }
            if (session.topics.size > MAX_TOPICS) {
                const sorted = Array.from(session.topics.entries())
                    .sort((a, b) => b[1].count - a[1].count || b[1].lastMention - a[1].lastMention)
                    .slice(0, MAX_TOPICS);
                session.topics = new Map(sorted);
            }
        }

        if (entry.role === 'usuario') {
            session.sentimentTrend.push(entry.sentiment);
            if (session.sentimentTrend.length > 20) session.sentimentTrend.shift();
        }

        if (entry.role === 'cerebro' && entry.emotion) {
            session.emotionalTrend.push(entry.emotion);
            if (session.emotionalTrend.length > 20) session.emotionalTrend.shift();
        }

        // Encolar para persistencia (contenido hasta 10000 chars)
        this._pushPending(sessionId, {
            sessionId,
            timestamp: entry.timestamp,
            simTime: entry.simTime,
            role: entry.role,
            content: entry.content.substring(0, 10000),
            intent: entry.intent,
            emotion: entry.emotion,
            sentiment: entry.sentiment,
            metadata: JSON.stringify({ entities: entry.entities })
        });

        this._maybeCleanupSessions();
    }

    /**
     * Añade un mensaje a la cola de la sesión, con cap por sesión.
     */
    _pushPending(sessionId, payload) {
        if (!this._pendingMessages.has(sessionId)) {
            this._pendingMessages.set(sessionId, []);
        }
        const arr = this._pendingMessages.get(sessionId);
        arr.push(payload);
        if (arr.length > MAX_PENDING_PER_SESSION) {
            arr.splice(0, arr.length - MAX_PENDING_PER_SESSION);
        }
    }

    getContext(sessionId = 'default') {
        const session = this.getSession(sessionId);
        const recentTurns = session.turns.slice(-20);

        let dominantTopic = null;
        let maxCount = 0;
        for (const [topic, data] of session.topics) {
            if (data.count > maxCount && (Date.now() - data.lastMention) < 1800000) {
                maxCount = data.count;
                dominantTopic = topic;
            }
        }

        const recentSentiments = session.sentimentTrend.slice(-5);
        const avgSentiment = recentSentiments.length > 0
            ? recentSentiments.reduce((a, b) => a + b, 0) / recentSentiments.length
            : 0;

        const emotionCounts = {};
        for (const e of session.emotionalTrend) {
            emotionCounts[e] = (emotionCounts[e] || 0) + 1;
        }
        const dominantBrainEmotion = Object.entries(emotionCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

        const lastUserTurn = [...session.turns].reverse().find(t => t.role === 'usuario');

        return {
            sessionId,
            turns: recentTurns,
            turnCount: session.turnCount,
            dominantTopic,
            dominantTopicCount: maxCount,
            avgSentiment,
            sentimentTrend: recentSentiments,
            dominantBrainEmotion,
            lastUserIntent: lastUserTurn?.intent || null,
            lastUserContent: lastUserTurn?.content || null,
            askedTopics: Array.from(session.askedTopics)
        };
    }

    /** Devuelve TODOS los turnos de la sesión (para el frontend). */
    getFullHistory(sessionId = 'default') {
        const session = this.getSession(sessionId);
        return session.turns.slice();
    }

    markAsked(sessionId, topic) {
        const session = this.getSession(sessionId);
        session.askedTopics.add(topic);
    }

    detectRepetition(sessionId, currentIntent) {
        const session = this.getSession(sessionId);
        const userTurns = session.turns.filter(t => t.role === 'usuario').slice(-5);
        if (userTurns.length < 2) return false;
        const matching = userTurns.filter(t => t.intent === currentIntent).length;
        return matching >= 3;
    }

    getTopTopics(sessionId, n = 5) {
        const session = this.getSession(sessionId);
        return Array.from(session.topics.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, n)
            .map(([topic, data]) => ({
                topic,
                count: data.count,
                sentiment: data.count > 0 ? data.sentimentSum / data.count : 0
            }));
    }

    /**
     * Drena los mensajes pendientes de UNA sesión.
     * Antes drenaba globalmente y mezclaba sesiones concurrentes.
     */
    drainPendingMessages(sessionId) {
        if (!sessionId) return [];
        if (!this._pendingMessages.has(sessionId)) return [];
        const arr = this._pendingMessages.get(sessionId);
        this._pendingMessages.set(sessionId, []);
        return arr;
    }

    /**
     * Drena TODAS las sesiones (para shutdown).
     * Devuelve un array plano con todos los mensajes pendientes.
     */
    drainAllPendingMessages() {
        const out = [];
        for (const arr of this._pendingMessages.values()) {
            for (const m of arr) out.push(m);
        }
        this._pendingMessages.clear();
        return out;
    }

    _maybeCleanupSessions() {
        const now = Date.now();
        if (now - this._lastCleanupAt < this._cleanupIntervalMs) return;
        this._lastCleanupAt = now;
        for (const [id, session] of this.sessions) {
            if (now - session.lastActivityAt > this._sessionTTL) {
                this.sessions.delete(id);
                this._pendingMessages.delete(id);
            }
        }
    }

    getStats() {
        let totalTurns = 0;
        for (const s of this.sessions.values()) totalTurns += s.turnCount;
        let pending = 0;
        for (const arr of this._pendingMessages.values()) pending += arr.length;
        return {
            activeSessions: this.sessions.size,
            totalTurns,
            pendingMessages: pending
        };
    }

    reset() {
        this.sessions.clear();
        this._pendingMessages = new Map();
    }
}

export const conversationManager = new ConversationManager();
