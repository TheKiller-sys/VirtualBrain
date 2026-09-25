// src/conversation/ConversationManager.js
// Mantiene el contexto conversacional por sesión.

import { systemCore } from '../core/SystemCore.js';

const MAX_IN_MEMORY_TURNS = 30;
const MAX_TOPICS = 20;

export class ConversationManager {
    constructor() {
        // Map<sessionId, SessionState>
        this.sessions = new Map();

        // Buffer de persistencia
        this._pendingMessages = [];

        // Control
        this._lastCleanupAt = Date.now();
        this._cleanupIntervalMs = 300000; // 5 min
        this._sessionTTL = 3600000; // 1 hora sin actividad
    }

    /**
     * Obtiene (o crea) la sesión.
     */
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
            turns: [], // [{role, content, intent, sentiment, emotion, timestamp, entities}]
            topics: new Map(), // Map<topic, {count, lastMention, sentimentSum}>
            sentimentTrend: [], // últimos 10 valores
            emotionalTrend: [], // últimas 10 emociones detectadas en el cerebro
            turnCount: 0,
            askedTopics: new Set() // temas sobre los que el cerebro ya preguntó
        };
    }

    /**
     * Registra un turno (usuario o cerebro).
     */
    recordTurn(sessionId, turn) {
        const session = this.getSession(sessionId);
        const entry = {
            role: turn.role, // 'usuario' | 'cerebro'
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

        // Actualizar topics
        if (entry.role === 'usuario' && entry.entities.length > 0) {
            for (const topic of entry.entities) {
                const existing = session.topics.get(topic) || { count: 0, lastMention: 0, sentimentSum: 0 };
                existing.count++;
                existing.lastMention = entry.timestamp;
                existing.sentimentSum += entry.sentiment;
                session.topics.set(topic, existing);
            }
            // Cap de topics
            if (session.topics.size > MAX_TOPICS) {
                const sorted = Array.from(session.topics.entries())
                    .sort((a, b) => b[1].count - a[1].count || b[1].lastMention - a[1].lastMention)
                    .slice(0, MAX_TOPICS);
                session.topics = new Map(sorted);
            }
        }

        // Trend de sentimiento (del usuario)
        if (entry.role === 'usuario') {
            session.sentimentTrend.push(entry.sentiment);
            if (session.sentimentTrend.length > 10) session.sentimentTrend.shift();
        }

        // Trend emocional (del cerebro)
        if (entry.role === 'cerebro' && entry.emotion) {
            session.emotionalTrend.push(entry.emotion);
            if (session.emotionalTrend.length > 10) session.emotionalTrend.shift();
        }

        // Encolar para persistencia
        this._pendingMessages.push({
            sessionId,
            timestamp: entry.timestamp,
            simTime: entry.simTime,
            role: entry.role,
            content: entry.content.substring(0, 2000),
            intent: entry.intent,
            emotion: entry.emotion,
            sentiment: entry.sentiment,
            metadata: JSON.stringify({ entities: entry.entities })
        });

        if (this._pendingMessages.length > 500) {
            this._pendingMessages.splice(0, this._pendingMessages.length - 500);
        }

        // Cleanup periódico
        this._maybeCleanupSessions();
    }

    /**
     * Devuelve el contexto listo para el generador de respuestas.
     */
    getContext(sessionId = 'default') {
        const session = this.getSession(sessionId);

        // Últimos 6 turnos (3 pares usuario-cerebro aprox)
        const recentTurns = session.turns.slice(-6);

        // Tema dominante
        let dominantTopic = null;
        let maxCount = 0;
        for (const [topic, data] of session.topics) {
            if (data.count > maxCount && (Date.now() - data.lastMention) < 600000) {
                maxCount = data.count;
                dominantTopic = topic;
            }
        }

        // Tendencia de sentimiento (últimos 5 del usuario)
        const recentSentiments = session.sentimentTrend.slice(-5);
        const avgSentiment = recentSentiments.length > 0
            ? recentSentiments.reduce((a, b) => a + b, 0) / recentSentiments.length
            : 0;

        // Emoción dominante del cerebro en los últimos turnos
        const emotionCounts = {};
        for (const e of session.emotionalTrend) {
            emotionCounts[e] = (emotionCounts[e] || 0) + 1;
        }
        const dominantBrainEmotion = Object.entries(emotionCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

        // Último intent del usuario
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

    /**
     * Marca que el cerebro ya preguntó sobre un tema (para no repetir).
     */
    markAsked(sessionId, topic) {
        const session = this.getSession(sessionId);
        session.askedTopics.add(topic);
    }

    /**
     * Detecta si el usuario se está repitiendo.
     */
    detectRepetition(sessionId, currentIntent) {
        const session = this.getSession(sessionId);
        const userTurns = session.turns.filter(t => t.role === 'usuario').slice(-4);
        if (userTurns.length < 2) return false;
        const matching = userTurns.filter(t => t.intent === currentIntent).length;
        return matching >= 2;
    }

    /**
     * Devuelve los N temas principales del usuario.
     */
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
     * Devuelve los mensajes pendientes de persistir y los vacía.
     */
    drainPendingMessages() {
        return this._pendingMessages.splice(0);
    }

    _maybeCleanupSessions() {
        const now = Date.now();
        if (now - this._lastCleanupAt < this._cleanupIntervalMs) return;
        this._lastCleanupAt = now;

        for (const [id, session] of this.sessions) {
            if (now - session.lastActivityAt > this._sessionTTL) {
                this.sessions.delete(id);
            }
        }
    }

    /**
     * Estadísticas globales.
     */
    getStats() {
        let totalTurns = 0;
        for (const s of this.sessions.values()) totalTurns += s.turnCount;
        return {
            activeSessions: this.sessions.size,
            totalTurns,
            pendingMessages: this._pendingMessages.length
        };
    }

    reset() {
        this.sessions.clear();
        this._pendingMessages = [];
    }
}

export const conversationManager = new ConversationManager();
