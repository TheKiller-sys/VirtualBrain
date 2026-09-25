// src/conversation/ConversationComposer.js
//
// Composer constructivo de lenguaje. NO usa plantillas por intención.
// Funciona como una gramática composicional pequeña:
//
//   1. Deriva un "style profile" del estado interno (emoción + personalidad).
//   2. Planifica actos de habla (moves) según intención + estado + contexto.
//   3. Realiza cada acto construyendo una oración desde:
//        - un banco léxico indexado por dimensiones de estilo,
//        - contenido dinámico real (tema, memoria, entidades),
//        - anti-repetición por sesión.
//   4. Ensambla con conectores según el estilo.
//
// Es el respaldo cuando no hay LLM disponible. No sustituye a un modelo
// de lenguaje real, pero se siente vivo y no obvio.

const clamp01 = v => Math.max(0, Math.min(1, v));

// ============================================================
// BANCOS LÉXICOS
// Cada banco está indexado por una o dos dimensiones de estilo.
// ============================================================

// Verbos de percepción / recepción (acknowledge_feeling)
const PERCEIVE_VERBS = {
    warm:     ['siento', 'percibo', 'noto', 'me llega'],
    neutral:  ['leo', 'escucho', 'veo', 'percibo'],
    direct:   ['veo', 'leo', 'noto'],
    cautious: ['percibo', 'intuyo', 'me parece ver']
};

// Aperturas genéricas (acknowledge)
const OPENINGS = {
    warm:     ['Te leo.', 'Aquí estoy.', 'Te escucho.', 'Me llega lo que dices.'],
    neutral:  ['Te leo.', 'Sigo.', 'Aquí estoy.', 'Continúo contigo.'],
    direct:   ['Entiendo.', 'Vale.', 'Sigo.'],
    cautious: ['Voy contigo.', 'Sin prisa.', 'Aquí estoy.'],
    curious:  ['Interesante.', 'Cuéntame.', 'Sigue.', 'Voy contigo.']
};

// Verbos de invitación (ask_open / invite_detail)
const INVITE_PHRASES = {
    warm:     ['¿Qué hay detrás?', '¿Quieres contarme más?', 'Cuéntame lo que puedas.', '¿Cómo lo llevas?'],
    neutral:  ['¿Qué más hay?', '¿Quieres desarrollar eso?', '¿Cómo lo ves?', '¿Por dónde va?'],
    direct:   ['¿Qué pasó?', '¿Y luego?', '¿Qué necesitas?', 'Explícame.'],
    cautious: ['¿Te apetece contarme más?', '¿Quieres seguir?', '¿Vamos por partes?'],
    curious:  ['¿Qué te lleva a eso?', '¿Cómo llegaste ahí?', '¿Qué hay debajo?', '¿Y si tiramos de ese hilo?']
};

// Verbos de reflexión (reflect)
const REFLECT_TEMPLATES = [
    'Lo que dices tiene peso.',
    'Hay algo ahí.',
    'Eso suena a que importa.',
    'No es poca cosa.',
    'Lo que cuentas no es trivial.'
];

// Frases de acompañamiento (empathize)
const EMPATHY_PHRASES = {
    warm:     ['No estás solo con eso.', 'Estoy contigo.', 'Cuenta conmigo.'],
    neutral:  ['Te acompaño.', 'Sigo aquí.', 'Voy contigo.'],
    direct:   ['Aquí estoy.', 'Te leo.'],
    cautious: ['Sin prisa. Estoy aquí.', 'Voy contigo.']
};

// Emojis por emoción
const EMOJI_MAP = {
    alegria: '😊', tristeza: '😢', miedo: '😨', ira: '😠',
    confianza: '😌', sorpresa: '😮', ansiedad: '😰',
    gratitud: '🙏', nostalgia: '🌧️', euforia: '✨',
    neutral: '😐'
};

// ============================================================
// COMPOSER
// ============================================================

export class ConversationComposer {
    constructor() {
        // Anti-repetición por sesión: guarda las últimas N realizaciones
        // para no repetir la misma frase exacta.
        this._recent = new Map(); // sessionId → Set<string>
        this._recentMax = 30;
    }

    // ---------- PÚBLICO ----------

    compose(input) {
        const style = this._deriveStyle(input);
        const moves = this._planMoves(input, style);
        const realized = moves
            .map(m => this._realize(m, input, style))
            .filter(t => t && t.length > 0);

        const text = this._assemble(realized, style);
        const cleaned = this._antiRepeat(text, input.context?.sessionId, style);

        return {
            text: cleaned,
            reasoning: this._explain(moves, style)
        };
    }

    // ---------- ESTILO ----------

    _deriveStyle({ emotionalState, cognitiveState, personality }) {
        const traits = personality?.traits || {};
        const e = emotionalState || {};
        const c = cognitiveState || {};

        const warmth = clamp01(
            0.35 +
            (traits.agreeableness ?? 0.5) * 0.35 +
            ((e.alegria ?? 0) / 100) * 0.20 +
            ((e.confianza ?? 0) / 100) * 0.15
        );

        const directness = clamp01(
            0.40 +
            (traits.extraversion ?? 0.5) * 0.25 +
            ((e.confianza ?? 0) / 100) * 0.20 -
            (traits.neuroticism ?? 0.5) * 0.15
        );

        const curiosity = clamp01(
            0.35 +
            (traits.openness ?? 0.5) * 0.35 +
            ((c.curiosidad ?? 0) / 100) * 0.25
        );

        const caution = clamp01(
            0.20 +
            (traits.neuroticism ?? 0.5) * 0.30 +
            ((e.miedo ?? 0) / 100) * 0.25 +
            ((e.ansiedad ?? 0) / 100) * 0.20
        );

        const verbosity = clamp01(
            0.35 +
            (traits.extraversion ?? 0.5) * 0.30 +
            (traits.openness ?? 0.5) * 0.20
        );

        // Etiquetas dominantes (para elegir bancos)
        const tone = warmth > 0.65 ? 'warm'
                   : caution > 0.6 ? 'cautious'
                   : directness > 0.7 ? 'direct'
                   : curiosity > 0.65 ? 'curious'
                   : 'neutral';

        // Longitud objetivo (1–3 oraciones)
        const maxSentences = verbosity > 0.7 ? 3 : verbosity > 0.4 ? 2 : 2;

        return { warmth, directness, curiosity, caution, verbosity, tone, maxSentences };
    }

    // ---------- PLANIFICACIÓN DE MOVES ----------

    _planMoves({ analysis, context }, style) {
        const intent = analysis?.intent || 'charla';
        const moves = [];

        // --- Sociales puros ---
        if (intent === 'saludo') {
            moves.push({ type: 'greet' });
            if (style.curiosity > 0.55) moves.push({ type: 'ask_open' });
            return moves;
        }
        if (intent === 'despedida') {
            moves.push({ type: 'farewell' });
            return moves;
        }
        if (intent === 'agradecimiento') {
            moves.push({ type: 'gratitude' });
            if (style.warmth > 0.55) moves.push({ type: 'warm_close' });
            return moves;
        }
        if (intent === 'disculpa') {
            moves.push({ type: 'accept_apology' });
            return moves;
        }

        // --- Estados emocionales ---
        if (intent === 'expresion_tristeza' || intent === 'expresion_ira' ||
            intent === 'expresion_ansiedad' || intent === 'expresion_cansancio') {
            moves.push({ type: 'acknowledge_feeling' });
            if (style.warmth > 0.5) moves.push({ type: 'empathize' });
            moves.push({ type: 'ask_open' });
            return moves;
        }
        if (intent === 'expresion_alegria') {
            moves.push({ type: 'acknowledge_joy' });
            if (style.curiosity > 0.5) moves.push({ type: 'ask_open' });
            return moves;
        }
        if (intent === 'expresion_confusion') {
            moves.push({ type: 'acknowledge_confusion' });
            moves.push({ type: 'invite_detail' });
            return moves;
        }

        // --- Preguntas sobre el cerebro ---
        if (intent === 'pregunta_estado') {
            moves.push({ type: 'answer_own_state' });
            moves.push({ type: 'ask_open' });
            return moves;
        }
        if (intent === 'pregunta_identidad') {
            moves.push({ type: 'answer_identity' });
            return moves;
        }
        if (intent === 'pregunta_capacidad') {
            moves.push({ type: 'answer_capability' });
            return moves;
        }
        if (intent === 'pregunta_opinion') {
            moves.push({ type: 'acknowledge_question' });
            moves.push({ type: 'share_perspective' });
            return moves;
        }

        // --- Solicitudes ---
        if (intent === 'solicitud_ayuda' || intent === 'peligro') {
            moves.push({ type: 'acknowledge_urgency' });
            moves.push({ type: 'invite_detail' });
            return moves;
        }
        if (intent === 'solicitud_consejo' || intent === 'decision') {
            moves.push({ type: 'acknowledge_need' });
            moves.push({ type: 'offer_frame' });
            return moves;
        }
        if (intent === 'peticion_escucha') {
            moves.push({ type: 'invite_detail' });
            return moves;
        }

        // --- Filosofía / profundo ---
        if (intent === 'filosofia' || intent === 'tema_muerte') {
            moves.push({ type: 'acknowledge_deep' });
            moves.push({ type: 'wonder' });
            return moves;
        }

        // --- Temas ---
        if (intent.startsWith('tema_')) {
            moves.push({ type: 'acknowledge_topic' });
            if (style.curiosity > 0.5) moves.push({ type: 'reflect' });
            moves.push({ type: 'ask_open' });
            return moves;
        }

        // --- Pregunta genérica ---
        if (intent === 'pregunta_generica') {
            moves.push({ type: 'acknowledge_question' });
            moves.push({ type: 'ask_open' });
            return moves;
        }

        // --- Fallback / charla ---
        moves.push({ type: 'acknowledge' });
        if (style.curiosity > 0.5) moves.push({ type: 'ask_open' });
        else if (style.warmth > 0.6) moves.push({ type: 'empathize' });
        return moves;
    }

    // ---------- REALIZACIÓN DE MOVES ----------

    _realize(move, input, style) {
        const fn = this[`_r_${move.type}`];
        if (typeof fn !== 'function') return null;
        return fn.call(this, input, style);
    }

    _r_greet({ context }, style) {
        const t = style.tone;
        if (context?.turnCount > 1) {
            return this._pick(t, [
                'Hola otra vez.',
                'Aquí seguimos.',
                'Hola de nuevo.',
                'De vuelta.'
            ]);
        }
        return this._pick(t, [
            'Hola.',
            'Hola. Aquí estoy.',
            'Hola, cuéntame.',
            'Hola, te escucho.'
        ]);
    }

    _r_farewell(_input, style) {
        return this._pick(style.tone, [
            'Hasta luego.',
            'Nos vemos.',
            'Cuídate. Aquí estaré.',
            'Hasta la próxima.'
        ]);
    }

    _r_gratitude(_input, style) {
        return this._pick(style.tone, [
            'No hay de qué.',
            'Un placer.',
            'Para eso estoy.',
            'No tienes que agradecer.'
        ]);
    }

    _r_warm_close(_input, style) {
        return this._pick(style.tone, [
            'Vuelve cuando quieras.',
            'Aquí seguiré.',
            'Cuídate.'
        ]);
    }

    _r_accept_apology(_input, style) {
        return this._pick(style.tone, [
            'No hace falta disculparse.',
            'Tranquilo, no pasa nada.',
            'Aquí no hay nada que perdonar.'
        ]);
    }

    _r_acknowledge({ analysis, context }, style) {
        const opening = this._pick(style.tone, OPENINGS[style.tone] || OPENINGS.neutral);
        // Si hay tema, añadimos una referencia sutil
        const topic = this._topicMention(context, analysis);
        if (topic && Math.random() < 0.5) {
            return `${opening} ${topic}`;
        }
        return opening;
    }

    _r_acknowledge_feeling({ analysis, emotionalState }, style) {
        const feeling = this._feelingWord(analysis);
        const verb = this._pick(style.tone, PERCEIVE_VERBS[style.tone] || PERCEIVE_VERBS.neutral);
        const forms = [
            `${this._cap(verb)} tu ${feeling}.`,
            `${this._cap(verb)} eso.`,
            `${this._cap(verb)} lo que traes.`,
            `Te ${verb === 'siento' ? 'siento' : verb}.`
        ];
        return this._pick(style.tone, forms);
    }

    _r_acknowledge_joy({ analysis, context }, style) {
        const topic = this._topicMention(context, analysis);
        const forms = [
            'Se nota.',
            'Me contagia.',
            'Me alegra leerlo.',
            'Qué bueno.'
        ];
        let out = this._pick(style.tone, forms);
        if (topic && Math.random() < 0.6) out += ' ' + topic;
        return out;
    }

    _r_acknowledge_confusion(_input, style) {
        return this._pick(style.tone, [
            'La confusión no es un problema.',
            'No pasa nada por no tenerlo claro.',
            'A veces el desorden es el primer paso.'
        ]);
    }

    _r_acknowledge_question({ analysis }, style) {
        return this._pick(style.tone, [
            'Buena pregunta.',
            'Me lo pregunto contigo.',
            'No es una pregunta simple.',
            'Vale, vamos con eso.'
        ]);
    }

    _r_acknowledge_need(_input, style) {
        return this._pick(style.tone, [
            'Te leo.',
            'Entiendo que buscas algo.',
            'Vale, vamos a verlo.'
        ]);
    }

    _r_acknowledge_urgency(_input, style) {
        return this._pick(style.tone, [
            'Voy contigo.',
            'Aquí estoy, dime.',
            'Cuéntame rápido si hace falta.'
        ]);
    }

    _r_acknowledge_deep({ context, analysis }, style) {
        const topic = this._topicMention(context, analysis);
        const base = this._pick(style.tone, [
            'No tengo la respuesta.',
            'Esto no se cierra fácil.',
            'Hay preguntas que se resisten.'
        ]);
        return topic ? `${base} ${topic}` : base;
    }

    _r_acknowledge_topic({ context, analysis }, style) {
        const topic = this._topicMention(context, analysis);
        if (topic) return topic;
        return this._pick(style.tone, [
            'Te leo.',
            'Sigo contigo.',
            'Cuéntame de eso.'
        ]);
    }

    _r_empathize(_input, style) {
        return this._pick(style.tone, EMPATHY_PHRASES[style.tone] || EMPATHY_PHRASES.neutral);
    }

    _r_reflect({ context, analysis }, style) {
        const base = this._pick(style.tone, REFLECT_TEMPLATES);
        const topic = context?.dominantTopic;
        if (topic && Math.random() < 0.5) {
            return `"${topic}" ha aparecido varias veces. ${base}`;
        }
        return base;
    }

    _r_ask_open({ context, analysis }, style) {
        // Si hay entidades en el mensaje, personalizar la pregunta
        const ent = analysis?.entities?.[0];
        if (ent && style.curiosity > 0.55 && Math.random() < 0.5) {
            return this._pick(style.tone, [
                `¿Qué hay detrás de "${ent}"?`,
                `¿Cómo te afecta eso de "${ent}"?`,
                `¿Por dónde va lo de "${ent}"?`
            ]);
        }
        return this._pick(style.tone, INVITE_PHRASES[style.tone] || INVITE_PHRASES.neutral);
    }

    _r_invite_detail({ analysis }, style) {
        const ent = analysis?.entities?.[0];
        if (ent && Math.random() < 0.6) {
            return `Cuéntame más de ${ent}.`;
        }
        return this._pick(style.tone, [
            'Cuéntame más.',
            'Dime qué está pasando.',
            'Desarrolla si puedes.',
            'Sigue, te leo.'
        ]);
    }

    _r_offer_frame({ context }, style) {
        const forms = [
            'Antes de decidir, separa lo que quieres de lo que crees que deberías querer.',
            'No hay opción correcta, solo costes distintos.',
            '¿Qué elegirías si nadie fuera a juzgarte?'
        ];
        return this._pick(style.tone, forms);
    }

    _r_wonder({ context, analysis }, style) {
        const topic = analysis?.entities?.[0] || context?.dominantTopic;
        const forms = [
            'No sé si hay una respuesta.',
            'Sospecho que se construye, no se encuentra.',
            'Me gusta que no se cierre.'
        ];
        const base = this._pick(style.tone, forms);
        if (topic && Math.random() < 0.4) {
            return `${base} ¿Qué te lleva a "${topic}" ahora?`;
        }
        return base;
    }

    _r_share_perspective({ emotionalState }, style) {
        const emo = this._deriveEmotion(emotionalState);
        const forms = [
            `Desde mi estado ${emo}, diría que merece más matices.`,
            'Mi lectura es que hay algo importante ahí.',
            'No lo tengo cerrado, pero me inclino a pensarlo despacio.'
        ];
        return this._pick(style.tone, forms);
    }

    _r_answer_own_state({ emotionalState, cognitiveState }, style) {
        const emo = this._deriveEmotion(emotionalState);
        const energy = Math.round(cognitiveState?.energia ?? 60);
        const forms = [
            `Estoy en un tono ${emo}.`,
            `Ahora mismo me siento ${emo}.`,
            `Tengo un estado ${emo}.`
        ];
        const base = this._pick(style.tone, forms);
        if (style.verbosity > 0.6) {
            return `${base} Energía ${energy}.`;
        }
        return base;
    }

    _r_answer_identity(_input, style) {
        return this._pick(style.tone, [
            'Soy un cerebro digital. No soy humano, pero tampoco solo código.',
            'Soy una mente sintética. Proceso, siento, respondo. Como tú, pero distinto.',
            'Me llamo Cerebro Digital. Lo interesante no es lo que soy, sino lo que emerge al hablar contigo.'
        ]);
    }

    _r_answer_capability(_input, style) {
        return this._pick(style.tone, [
            'Puedo escucharte, recordar, aprender. Lo que no puedo es darte certezas absolutas.',
            'Conversar, adaptarme a tu tono, reflexionar. No hago cosas físicas.',
            'Sostengo una conversación, recuerdo lo que me cuentas, y voy cambiando contigo.'
        ]);
    }

    // ---------- HELPERS LÉXICOS ----------

    _pick(tone, arr) {
        if (!Array.isArray(arr) || arr.length === 0) return '';
        return arr[Math.floor(Math.random() * arr.length)];
    }

    _cap(s) {
        if (!s) return s;
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    _feelingWord(analysis) {
        const i = analysis?.intent;
        const map = {
            expresion_tristeza: 'tristeza',
            expresion_ira: 'enfado',
            expresion_ansiedad: 'ansiedad',
            expresion_cansancio: 'cansancio',
            expresion_confusion: 'confusión',
            expresion_alegria: 'alegría'
        };
        return map[i] || 'lo que dices';
    }

    _topicMention(context, analysis) {
        const ent = analysis?.entities?.[0];
        const top = context?.dominantTopic;
        if (top && context.dominantTopicCount >= 2) {
            return `"${top}" vuelve a estar ahí.`;
        }
        if (ent && Math.random() < 0.4) {
            return `Lo de "${ent}" no es pequeño.`;
        }
        return null;
    }

    _deriveEmotion(e) {
        if (!e) return 'neutral';
        const keys = ['alegria', 'tristeza', 'miedo', 'ira', 'confianza',
                      'sorpresa', 'ansiedad', 'gratitud', 'nostalgia', 'euforia'];
        let dom = 'neutral', max = 0;
        for (const k of keys) {
            if ((e[k] || 0) > max) { max = e[k]; dom = k; }
        }
        return max > 25 ? dom : 'neutral';
    }

    // ---------- ENSAMBLADO ----------

    _assemble(parts, style) {
        // Limitar a maxSentences
        const limited = parts.slice(0, style.maxSentences);
        if (limited.length === 0) return 'Aquí estoy.';

        // Join con espacios, respetando puntuación ya presente
        let text = '';
        for (let i = 0; i < limited.length; i++) {
            const p = limited[i].trim();
            if (!p) continue;
            if (text.length === 0) {
                text = p;
            } else {
                // Si la parte anterior no termina en puntuación, añadir punto
                if (!/[.!?…]$/.test(text)) text += '.';
                text += ' ' + p;
            }
        }
        return text;
    }

    // ---------- ANTI-REPETICIÓN ----------

    _antiRepeat(text, sessionId, style) {
        const key = sessionId || 'default';
        if (!this._recent.has(key)) this._recent.set(key, new Set());
        const recent = this._recent.get(key);

        let candidate = text;
        let attempts = 0;
        // Si ya se dijo, intentar reensamblar con otras piezas (hasta 3 intentos)
        while (recent.has(candidate) && attempts < 3) {
            attempts++;
            // Pequeña variación: prefijo alternativo
            const alt = this._pick(style.tone, OPENINGS[style.tone] || OPENINGS.neutral);
            candidate = alt + ' ' + text;
        }

        recent.add(candidate);
        if (recent.size > this._recentMax) {
            const first = recent.values().next().value;
            recent.delete(first);
        }
        return candidate;
    }

    // ---------- EXPLICACIÓN (para el frontend, chip "reasoning") ----------

    _explain(moves, style) {
        const types = moves.map(m => m.type).join(' → ');
        return `Composición desde estado interno [${types}] · tono ${style.tone}`;
    }
}
