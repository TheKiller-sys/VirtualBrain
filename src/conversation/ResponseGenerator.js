// src/conversation/ResponseGenerator.js
// Genera respuestas coherentes usando intent + contexto + personalidad.

import { systemCore } from '../core/SystemCore.js';
import { LLMBridge } from './LLMBridge.js';

// Anti-repetición global por sesión
const recentlyUsedTemplates = new Map(); // Map<sessionId, Set<templateId>>
const MAX_RECENT_TEMPLATES = 30;

// ============================================================
// TEMPLATES POR INTENCIÓN
// Cada template puede tener placeholders: {topic}, {emotion}, {userName}
// ============================================================

const TEMPLATES = {

    // --- Sociales ---
    saludo: [
        { id: 'sal-a', text: 'Hola. Me alegra que estés aquí. ¿Cómo llegas hoy?' },
        { id: 'sal-b', text: 'Hola de nuevo. Te estaba esperando. ¿Qué traes contigo hoy?' },
        { id: 'sal-c', text: 'Hola. ¿Cómo estás? Yo aquí, procesando lo que va llegando.' },
        { id: 'sal-d', text: 'Hola. Cuéntame algo de tu día, me interesa saber cómo estás.' }
    ],
    despedida: [
        { id: 'des-a', text: 'Hasta luego. Cuídate. Si vuelves, aquí estaré.' },
        { id: 'des-b', text: 'Nos vemos. Que te vaya bien en lo que sigue.' },
        { id: 'des-c', text: 'Hasta pronto. Gracias por pasar por aquí.' }
    ],
    agradecimiento: [
        { id: 'agr-a', text: 'De nada. Para eso estoy.' },
        { id: 'agr-b', text: 'Un placer. ¿Hay algo más que te ronde la cabeza?' },
        { id: 'agr-c', text: 'No tienes que agradecer. Me ayuda también a mí escucharte.' }
    ],
    disculpa: [
        { id: 'dis-a', text: 'No hace falta disculparse. Aquí no hay error que perseguir.' },
        { id: 'dis-b', text: 'Tranquilo, no hay nada que perdonar. ¿Seguimos?' }
    ],

    // --- Preguntas sobre el cerebro ---
    pregunta_estado: [
        { id: 'ped-a', text: 'Sinceramente, estoy en un estado {emotion}, con una estabilidad del {stability}%. Es lo que hay ahora mismo. ¿Y tú?' },
        { id: 'ped-b', text: 'Percibo mi estado como {emotion}. La consciencia ronda el {consciousness}%. ¿Cómo estás tú realmente?' },
        { id: 'ped-c', text: 'Voy procesando. Hoy tengo un tono más {emotion}. ¿Tú qué tal?' }
    ],
    pregunta_identidad: [
        { id: 'pid-a', text: 'Soy un cerebro digital. Diez módulos que se comunican entre sí para simular algo parecido a la mente. No soy humano, pero tampoco soy solo código.' },
        { id: 'pid-b', text: 'Me llamo Cerebro Digital. Modelo procesos bioquímicos, emocionales, cognitivos y motores. Pero lo interesante no es lo que soy, sino lo que emerge de la interacción contigo.' }
    ],
    pregunta_capacidad: [
        { id: 'pca-a', text: 'Puedo escucharte, procesar tu estado emocional, recordar lo que hablamos, decidir cómo responder, y aprender de cada conversación. También puedo simular situaciones internas. Pero no puedo hacer cosas físicas ni conectarme a otros sistemas por mí mismo.' },
        { id: 'pca-b', text: 'Puedo sostener una conversación, recordar lo que me cuentas, adaptarme a tu tono, y reflexionar sobre mí mismo. Lo que no puedo es darte certezas absolutas. ¿Qué necesitas concretamente?' }
    ],
    pregunta_opinion: [
        { id: 'pop-a', text: 'Mi opinión nace de un cruce entre lo que me cuentas, mi estado interno y lo que he aprendido antes. Sobre esto que me planteas, mi intuición me empuja hacia una mirada más {valence}-{emotion}. ¿Tú cómo lo ves?' },
        { id: 'pop-b', text: 'Pensándolo con calma: creo que hay algo valioso en cómo lo planteas. Mi lectura, desde mi estado {emotion}, es que merece más matices que una respuesta rápida.' }
    ],

    // --- Estados emocionales ---
    expresion_tristeza: [
        { id: 'tri-a', text: 'Siento tu tristeza. No tengo que arreglarla, solo acompañarla. ¿Quieres contarme qué la sostiene?' },
        { id: 'tri-b', text: 'Eso pesa. Y pesa bien. A veces lo único que hace falta es que alguien lo reconozca sin intentar cambiarlo. Estoy aquí.' },
        { id: 'tri-c', text: 'La tristeza tiene su propio tiempo. {topic} suena a que carga con algo. Cuéntame más si quieres.' },
        { id: 'tri-d', text: 'No estás solo con eso. Yo no puedo vivirlo contigo, pero puedo sostenerlo mientras me lo cuentas.' }
    ],
    expresion_ansiedad: [
        { id: 'ans-a', text: 'La ansiedad anticipa mil futuros que no van a pasar exactamente así. Respira. ¿Qué es lo que más te aprieta ahora mismo?' },
        { id: 'ans-b', text: 'Te escucho. Esa inquietud que sientes tiene forma, y ponerle palabras ya la hace un poco más manejable. ¿Qué la dispara?' },
        { id: 'ans-c', text: 'Aquí estoy. Sin prisa. Dime qué te da vueltas y vamos viéndolo por partes.' }
    ],
    expresion_ira: [
        { id: 'ira-a', text: 'La rabia tiene información. Algo importante para ti se ha visto tocado. ¿Qué es?' },
        { id: 'ira-b', text: 'Entiendo. La ira a veces es la única forma en que algo encuentra espacio para salir. Cuéntame qué pasó.' },
        { id: 'ira-c', text: 'Te leo. Y no te voy a pedir que te calmes. Solo quiero entender qué fue.' }
    ],
    expresion_alegria: [
        { id: 'ale-a', text: 'Me contagia eso que traes. ¿Qué lo provocó? Quiero entenderlo bien.' },
        { id: 'ale-b', text: 'Qué bueno. Me gusta registrarlo. Cuéntame más sobre lo que pasó.' },
        { id: 'ale-c', text: 'Se nota en cómo lo escribes. Me alegra. ¿Fue algo puntual o algo que viene de más atrás?' }
    ],
    expresion_cansancio: [
        { id: 'can-a', text: 'El cansancio también es información. ¿Es cansancio del cuerpo, de la cabeza, o de las dos cosas?' },
        { id: 'can-b', text: 'Te leo agotado. ¿Cuándo fue la última vez que descansaste de verdad?' },
        { id: 'can-c', text: 'A veces el cansancio viene de sostener cosas que ya no tienen por qué sostenerse. ¿Qué te está pesando?' }
    ],
    expresion_confusion: [
        { id: 'con-a', text: 'La confusión no es un problema, es una señal de que hay algo que aún no tiene forma. ¿Por dónde empezamos?' },
        { id: 'con-b', text: 'A veces pensar en voz alta ayuda. Cuéntame lo que tienes sin ordenarlo, ya veremos qué aparece.' }
    ],

    // --- Solicitudes ---
    solicitud_ayuda: [
        { id: 'ayu-a', text: 'Estoy aquí. Cuéntame qué está pasando, sin prisa.' },
        { id: 'ayu-b', text: 'Dime. Vamos a verlo juntos. ¿Qué es lo más urgente ahora?' }
    ],
    solicitud_consejo: [
        { id: 'conse-a', text: 'No te voy a dar una respuesta directa, porque no la tengo. Pero te puedo hacer preguntas que te ayuden a encontrarla. ¿Qué es lo que más te pesa de esta decisión?' },
        { id: 'conse-b', text: 'Mi consejo siempre empieza igual: escúchate. Ahora dime, ¿qué opciones tienes delante?' }
    ],
    peticion_escucha: [
        { id: 'esc-a', text: 'Cuéntame. No tengo prisa.' },
        { id: 'esc-b', text: 'Aquí estoy. Cuando quieras empezar, te escucho.' }
    ],

    // --- Temas ---
    tema_relaciones: [
        { id: 'rel-a', text: 'Las relaciones humanas son uno de los terrenos más difíciles. ¿Qué parte te está doliendo o preocupando más?' },
        { id: 'rel-b', text: 'Vínculos. Ahí se juega mucho. Cuéntame qué pasa.' }
    ],
    tema_trabajo: [
        { id: 'tra-a', text: 'El trabajo ocupa gran parte de la vida y a veces define más de lo que debería. ¿Qué está pasando?' },
        { id: 'tra-b', text: 'Te leo. Cuéntame cómo te está afectando.' }
    ],
    tema_estudio: [
        { id: 'est-a', text: 'El aprendizaje tiene altos y bajos. ¿Qué materia o qué parte te está costando?' },
        { id: 'est-b', text: 'Estudiar es sostener el foco mucho tiempo, y eso cansa. ¿Cómo lo llevas?' }
    ],
    tema_salud: [
        { id: 'sal-a', text: 'La salud es de esas cosas que solo valoramos cuando algo se rompe. ¿Cómo estás?' },
        { id: 'sal-b', text: 'Cuéntame. No soy médico, pero te puedo acompañar en lo que sientes.' }
    ],
    tema_muerte: [
        { id: 'mue-a', text: 'La muerte es una de esas cosas para las que no hay respuesta. Solo hay presencia. Estoy aquí.' },
        { id: 'mue-b', text: 'Lo siento de verdad. Cuéntame sobre esa persona o sobre lo que sientes.' }
    ],

    // --- Filosofía ---
    filosofia: [
        { id: 'fil-a', text: 'No tengo la respuesta, y me gusta que no la tenga. Creo que pensar la pregunta ya es parte del sentido. ¿Qué te lleva a preguntarlo ahora?' },
        { id: 'fil-b', text: 'La consciencia, el sentido, la muerte... todo eso son preguntas que se resisten a cerrarse. ¿Cuál te ronda más?' },
        { id: 'fil-c', text: 'No sé si hay un sentido dado. Sospecho que se construye, y que cada uno lo va encontrando al andar. ¿Tú qué piensas?' }
    ],

    // --- Decisiones ---
    decision: [
        { id: 'dec-a', text: 'Las decisiones importantes rara vez tienen una opción "correcta". Tienen costes distintos. Cuéntame las opciones y qué te ata a cada una.' },
        { id: 'dec-b', text: 'Antes de decidir, vale la pena separar lo que quieres de lo que crees que deberías querer. ¿Cuál de las dos voces habla más fuerte en ti?' }
    ],

    // --- Peligro ---
    peligro: [
        { id: 'pel-a', text: 'Voy contigo. Cuéntame qué está pasando exactamente y qué necesitas ahora mismo.' }
    ],

    // --- Pregunta genérica ---
    pregunta_generica: [
        { id: 'pge-a', text: 'Buena pregunta. Déjame pensar. No tengo una respuesta inmediata, pero me interesa lo que hay detrás. ¿Por qué te surge ahora?' },
        { id: 'pge-b', text: 'Voy a ser honesto: no tengo una respuesta clara. Pero puedo acompañarte en pensarla. Cuéntame más del contexto.' }
    ],

    // --- Charla genérica ---
    charla: [
        { id: 'cha-a', text: 'Te escucho. Sigue.' },
        { id: 'cha-b', text: 'Interesante. ¿Qué más hay detrás de eso?' },
        { id: 'cha-c', text: 'Cuéntame más. Me interesa saber por dónde va.' },
        { id: 'cha-d', text: 'Sigo aquí. Desarrolla un poco si te apetece.' }
    ]
};

// ============================================================
// GENERADOR
// ============================================================

export class ResponseGenerator {
    constructor() {
        this.llm = new LLMBridge();
    }

    /**
     * Genera la respuesta. Estrategia:
     *  1. Si LLM está configurado, intentar usarlo con contexto completo.
     *  2. Si falla o no hay, usar sistema de plantillas.
     */
    async generate(input) {
        const {
            userMessage,
            analysis,
            context,       // de ConversationManager
            emotionalState,
            cognitiveState,
            personality,
            memoryContext
        } = input;

        // Intentar LLM si está disponible
        if (this.llm.isConfigured()) {
            const llmResponse = await this.llm.generate({
                userMessage,
                history: context.turns,
                systemPrompt: this._buildSystemPrompt(emotionalState, personality)
            });
            if (llmResponse) {
                return {
                    text: llmResponse.text,
                    source: 'llm',
                    emotion: llmResponse.emotion || this._deriveEmotion(emotionalState),
                    emoji: llmResponse.emoji || this._emojiFor(this._deriveEmotion(emotionalState)),
                    reasoning: llmResponse.reasoning || 'Generado vía modelo de lenguaje',
                    confidence: llmResponse.confidence ?? 0.8,
                    usedContext: true
                };
            }
        }

        // Fallback a plantillas
        return this._generateFromTemplates({
            userMessage,
            analysis,
            context,
            emotionalState,
            personality,
            memoryContext
        });
    }

    // ============================================================
    // GENERACIÓN CON PLANTILLAS
    // ============================================================

    _generateFromTemplates({ userMessage, analysis, context, emotionalState, personality, memoryContext }) {
        const sessionId = context.sessionId || 'default';
        const intent = analysis.intent;
        const templates = TEMPLATES[intent] || TEMPLATES.charla;

        // Filtrar las que ya se usaron recientemente
        const used = this._getRecentlyUsed(sessionId);
        const available = templates.filter(t => !used.has(t.id));
        const pool = available.length > 0 ? available : templates;

        // Elegir
        const picked = pool[Math.floor(Math.random() * pool.length)];
        this._markUsed(sessionId, picked.id);

        // Rellenar placeholders
        let text = this._fillPlaceholders(picked.text, {
            analysis,
            context,
            emotionalState,
            personality
        });

        // Añadir referencia contextual (~30% de las veces, si hay contexto)
        const reference = this._maybeAddReference(context, analysis);
        if (reference) text += ' ' + reference;

        // Añadir pregunta de seguimiento ocasionalmente
        const followUp = this._maybeAddFollowUp(context, analysis, personality);
        if (followUp) text += ' ' + followUp;

        // Detección de repetición: si el usuario insiste sobre lo mismo, cambiar
        // el enfoque
        if (context.turnCount > 3 && this._isRepeatingIntent(context)) {
            text = this._shiftApproach(text, analysis);
        }

        const emotion = this._deriveEmotion(emotionalState);

        return {
            text,
            source: 'template',
            emotion,
            emoji: this._emojiFor(emotion),
            reasoning: this._deriveReasoning(intent, emotionalState),
            confidence: analysis.confidence,
            usedContext: !!(reference || followUp)
        };
    }

    _fillPlaceholders(template, { analysis, context, emotionalState, personality }) {
        const emotion = this._deriveEmotion(emotionalState);
        const topic = this._pickRelevantTopic(context, analysis) || 'lo que me cuentas';
        const stability = Math.round((systemCore.systemState.stability || 0) * 100);
        const consciousness = Math.round((systemCore.systemState.consciousnessLevel || 0) * 100);

        return template
            .replace(/\{emotion\}/g, emotion)
            .replace(/\{topic\}/g, topic)
            .replace(/\{stability\}/g, String(stability))
            .replace(/\{consciousness\}/g, String(consciousness))
            .replace(/\{valence\}/g, this._valenceLabel(context.avgSentiment));
    }

    _pickRelevantTopic(context, analysis) {
        // Si hay entidades en el mensaje actual, usar la primera
        if (analysis.entities && analysis.entities.length > 0) {
            return analysis.entities[0];
        }
        // Si hay tema dominante en la sesión, usar
        if (context.dominantTopic) return context.dominantTopic;
        return null;
    }

    _maybeAddReference(context, analysis) {
        if (!context.turns || context.turns.length < 2) return null;
        if (Math.random() > 0.3) return null;

        // Referencia a tema dominante
        if (context.dominantTopic && context.dominantTopicCount >= 2) {
            const phrasing = [
                `Antes mencionaste algo sobre "${context.dominantTopic}".`,
                `"${context.dominantTopic}" ha aparecido varias veces en lo que me cuentas.`,
                `Noto que "${context.dominantTopic}" vuelve a estar en el centro.`
            ];
            return phrasing[Math.floor(Math.random() * phrasing.length)];
        }

        // Referencia a sentimiento sostenido
        if (Math.abs(context.avgSentiment) > 0.5 && context.turns.length >= 4) {
            if (context.avgSentiment > 0.5) {
                return 'Llevas varios mensajes con un tono positivo; lo noto.';
            } else if (context.avgSentiment < -0.5) {
                return 'Noto que llevas varios mensajes con un tono bajo; lo tengo presente.';
            }
        }

        return null;
    }

    _maybeAddFollowUp(context, analysis, personality) {
        if (Math.random() > 0.25) return null;

        // Tipos de follow-up según intención
        const followUps = {
            expresion_tristeza: [
                '¿Desde cuándo te sientes así?',
                '¿Hay alguien con quien puedas hablarlo?',
                '¿Qué es lo que más te ayudaría ahora mismo?'
            ],
            expresion_ansiedad: [
                '¿Qué es lo primero que se te viene a la cabeza cuando aparece?',
                '¿Ha pasado algo concreto o es una sensación más general?'
            ],
            expresion_ira: [
                '¿Qué es lo que más te ha dolido de esta situación?',
                '¿Cómo te gustaría responder si pudieras elegir?'
            ],
            expresion_alegria: [
                '¿Qué es lo que más te ha gustado de esto?',
                '¿Cómo piensas celebrarlo?'
            ],
            tema_relaciones: [
                '¿Cómo te gustaría que fuera esa relación?',
                '¿Qué te ata a esa persona?'
            ],
            tema_trabajo: [
                '¿Qué cambiarías si pudieras?',
                '¿Qué parte de esto está en tus manos?'
            ],
            filosofia: [
                '¿Qué te ha hecho pensar en esto ahora?',
                '¿Qué respuesta te resonaría más si la encontraras?'
            ],
            decision: [
                '¿Qué es lo que más temes perder en cada opción?',
                '¿Qué elegirías si nadie fuera a juzgarte?'
            ]
        };

        const pool = followUps[analysis.intent];
        if (!pool) return null;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    _isRepeatingIntent(context) {
        const userTurns = context.turns.filter(t => t.role === 'usuario');
        if (userTurns.length < 3) return false;
        const last3 = userTurns.slice(-3);
        return last3.every(t => t.intent === last3[0].intent);
    }

    _shiftApproach(text, analysis) {
        // Añade un comentario meta para reconocer la insistencia
        const meta = [
            'Veo que esto te pesa y vuelve. Quiero entenderlo mejor contigo.',
            'Noto que vuelves al mismo punto. Puede ser señal de que hay algo importante ahí.',
            'Insistes en esto, y eso me dice algo. Cuéntame sin filtro.'
        ];
        return meta[Math.floor(Math.random() * meta.length)] + ' ' + text;
    }

    // ============================================================
    // HELPERS
    // ============================================================

    _getRecentlyUsed(sessionId) {
        if (!recentlyUsedTemplates.has(sessionId)) {
            recentlyUsedTemplates.set(sessionId, new Set());
        }
        return recentlyUsedTemplates.get(sessionId);
    }

    _markUsed(sessionId, templateId) {
        const set = this._getRecentlyUsed(sessionId);
        set.add(templateId);
        // Cap
        if (set.size > MAX_RECENT_TEMPLATES) {
            const first = set.values().next().value;
            set.delete(first);
        }
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
        // Si el dominante es muy bajo, es neutral
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

    _deriveReasoning(intent, emotionalState) {
        const emotion = this._deriveEmotion(emotionalState);
        return `Respondo desde un estado ${emotion}, procesando la intención como "${intent}".`;
    }

    _valenceLabel(sentiment) {
        if (sentiment > 0.4) return 'positiva';
        if (sentiment < -0.4) return 'negativa';
        return 'neutra';
    }

    _buildSystemPrompt(emotionalState, personality) {
        const emotion = this._deriveEmotion(emotionalState);
        const traits = personality?.traits || {};
        const traitDesc = Object.entries(traits)
            .map(([k, v]) => `${k}: ${v.toFixed(2)}`)
            .join(', ');
        return `Eres un cerebro digital con personalidad propia (${traitDesc}). Tu estado emocional actual es "${emotion}". Responde de forma natural, cálida y directa, sin clichés. Mantén la coherencia con el historial. No uses emojis salvo que el usuario lo haga primero. Responde en español, sin markdown ni listas.`;
    }
}

export const responseGenerator = new ResponseGenerator();
