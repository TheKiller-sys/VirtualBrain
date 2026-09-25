// src/conversation/IntentClassifier.js
// Clasificador de intención con detección de negación, entidades y sentimiento.
// Sin dependencias externas.
//
// FIX V4.2.1:
//  - _analyzeSentiment ahora recibe el texto normalizado y detecta frases
//    multi-palabra ("no puedo", "no sé", "no sirvo", ...) que antes estaban
//    dentro de un Set de tokens individuales y NUNCA coincidían.
//  - Eliminado duplicado 'inútil' en el léxico negativo.

// ============================================================
// PATRONES DE INTENCIÓN
// Cada patrón tiene regex + peso. El score más alto gana.
// ============================================================

const INTENT_PATTERNS = [
    // --- Sociales ---
    {
        intent: 'saludo',
        patterns: [
            /\b(hola|buenas|hey|qué tal|qué onda|buenos días|buenas tardes|buenas noches|saludos)\b/i
        ],
        weight: 1.0
    },
    {
        intent: 'despedida',
        patterns: [
            /\b(adiós|adios|chao|chau|hasta luego|nos vemos|me voy|hasta pronto|bye)\b/i
        ],
        weight: 1.0
    },
    {
        intent: 'agradecimiento',
        patterns: [
            /\b(gracias|te agradezco|muy amable|te lo agradezco)\b/i
        ],
        weight: 1.0
    },
    {
        intent: 'disculpa',
        patterns: [
            /\b(perdón|perdon|perdona|disculpa|lo siento)\b/i
        ],
        weight: 0.9
    },

    // --- Preguntas sobre el cerebro ---
    {
        intent: 'pregunta_estado',
        patterns: [
            /\b(c[oó]mo (est[aá]s|te sientes|te encuentras)|qu[eé] tal est[aá]s|c[oó]mo va todo)\b/i
        ],
        weight: 1.2
    },
    {
        intent: 'pregunta_identidad',
        patterns: [
            /\b(qui[eé]n eres|qu[eé] eres|tu nombre|te llamas|c[oó]mo te llamas|eres (un|una|el|la) )\b/i
        ],
        weight: 1.2
    },
    {
        intent: 'pregunta_capacidad',
        patterns: [
            /\b(qu[eé] puedes hacer|qu[eé] sabes hacer|para qu[eé] sirves|en qu[eé] me puedes ayudar|qu[eé] funciones tienes)\b/i
        ],
        weight: 1.2
    },
    {
        intent: 'pregunta_opinion',
        patterns: [
            /\b(qu[eé] opinas|qu[eé] piensas|qu[eé] crees|tu opini[oó]n|qu[eé] te parece)\b/i
        ],
        weight: 1.1
    },

    // --- Estados emocionales del usuario ---
    {
        intent: 'expresion_tristeza',
        patterns: [
            /\b(estoy|me siento|ando|me encuentro)\b.*\b(triste|mal|deprimido|depre|baj[oó]n|sin [aá]nimo|desanimado|vac[ií]o|solo|sola)\b/i,
            /\b(llorar|llorando|quiero llorar|me dan ganas de llorar|no puedo m[aá]s)\b/i
        ],
        weight: 1.3
    },
    {
        intent: 'expresion_ansiedad',
        patterns: [
            /\b(estoy|me siento|ando|me encuentro)\b.*\b(ansioso|ansiosa|nervioso|nerviosa|inquieto|inquieta|preocupado|preocupada|angustiado|angustiada)\b/i,
            /\b(no puedo dejar de pensar|me da ansiedad|me da miedo|tengo miedo)\b/i
        ],
        weight: 1.3
    },
    {
        intent: 'expresion_ira',
        patterns: [
            /\b(estoy|me siento)\b.*\b(enfadado|enfadada|furioso|furiosa|enojado|enojada|molesto|molesta|irritado|irritada|harto|harta)\b/i,
            /\b(me saca de quicio|me cabrea|me da rabia|estoy que ardo)\b/i
        ],
        weight: 1.3
    },
    {
        intent: 'expresion_alegria',
        patterns: [
            /\b(estoy|me siento|ando)\b.*\b(feliz|contento|contenta|alegre|genial|emocionado|emocionada|ilusionado|ilusionada|euf[oó]rico|euf[oó]rica)\b/i,
            /\b(me siento muy bien|estoy de maravilla|qu[eé] bien todo)\b/i
        ],
        weight: 1.3
    },
    {
        intent: 'expresion_cansancio',
        patterns: [
            /\b(estoy|me siento|ando)\b.*\b(cansado|cansada|agotado|agotada|fatigado|fatigada|sin energ[ií]a|fundido|fundida|muerto de|muerta de)\b/i
        ],
        weight: 1.2
    },
    {
        intent: 'expresion_confusion',
        patterns: [
            /\b(estoy|me siento)\b.*\b(confundido|confundida|perdido|perdida|desorientado|desorientada)\b/i,
            /\b(no s[eé] qu[eé] hacer|no s[eé] por d[oó]nde empezar|no entiendo nada)\b/i
        ],
        weight: 1.2
    },

    // --- Solicitudes ---
    {
        intent: 'solicitud_ayuda',
        patterns: [
            /\b(ay[uú]dame|necesito ayuda|me puedes ayudar|puedes ayudarme|auxilio|socorro)\b/i
        ],
        weight: 1.4
    },
    {
        intent: 'solicitud_consejo',
        patterns: [
            /\b(qu[eé] hago|qu[eé] deber[ií]a|me recomiendas|qu[eé] me aconsejas|consejo|alg[uú]n consejo|qu[eé] har[ií]as t[uú])\b/i
        ],
        weight: 1.3
    },
    {
        intent: 'peticion_escucha',
        patterns: [
            /\b(necesito hablar|puedo contarte|te cuento algo|quiero contarte|puedo desahogarme)\b/i
        ],
        weight: 1.3
    },

    // --- Temas ---
    {
        intent: 'tema_relaciones',
        patterns: [
            /\b(pareja|novio|novia|marido|esposo|esposa|amigo|amiga|familia|madre|padre|hermano|hermana|hijo|hija|relaci[oó]n)\b/i
        ],
        weight: 1.0
    },
    {
        intent: 'tema_trabajo',
        patterns: [
            /\b(trabajo|empleo|jefe|jefa|oficina|compañero de trabajo|compañera de trabajo|carrera|profesi[oó]n|proyecto|empresa)\b/i
        ],
        weight: 1.0
    },
    {
        intent: 'tema_estudio',
        patterns: [
            /\b(estudiar|estudio|examen|universidad|colegio|instituto|tarea|tesis|materia|aprender)\b/i
        ],
        weight: 1.0
    },
    {
        intent: 'tema_salud',
        patterns: [
            /\b(salud|enfermo|enferma|m[eé]dico|hospital|dolor|s[ií]ntoma|diagn[oó]stico|terapia|terapeuta)\b/i
        ],
        weight: 1.0
    },
    {
        intent: 'tema_muerte',
        patterns: [
            /\b(morir|muerte|morir|fallecer|falleci[oó]|duelo|luto|perd[ií] a)\b/i
        ],
        weight: 1.2
    },

    // --- Filosofía / profundo ---
    {
        intent: 'filosofia',
        patterns: [
            /\b(sentido de la vida|por qu[eé] existimos|qu[eé] es la consciencia|libre albedr[ií]o|el alma|la muerte|qu[eé] hay despu[eé]s|el universo|qu[eé] somos)\b/i
        ],
        weight: 1.1
    },

    // --- Decisiones ---
    {
        intent: 'decision',
        patterns: [
            /\b(deber[ií]a|debo|tengo que decidir|dos opciones|opci[oó]n a|opci[oó]n b|no s[eé] si|estoy entre)\b/i
        ],
        weight: 1.1
    },

    // --- Peligro / urgente ---
    {
        intent: 'peligro',
        patterns: [
            /\b(peligro|urgente|emergencia|ayuda urgente|me est[aá]n|me amenaza|me atacan)\b/i
        ],
        weight: 1.5
    }
];

// ============================================================
// NEGACIONES
// Si estas palabras están ANTES de un patrón, invierten la polaridad
// para "expresion_*".
// ============================================================

const NEGATION_WORDS = ['no', 'nunca', 'jamás', 'jamas', 'tampoco', 'ni'];

// ============================================================
// INTENSIFICADORES Y ATENUADORES
// ============================================================

const INTENSIFIERS = {
    'muy': 1.3, 'muchísimo': 1.5, 'muchisimo': 1.5, 'demasiado': 1.4,
    'súper': 1.3, 'super': 1.3, 're': 1.15, 'ultra': 1.4,
    'extremadamente': 1.5, 'terriblemente': 1.4, 'horriblemente': 1.4,
    'completamente': 1.3, 'totalmente': 1.3, 'absolutamente': 1.35
};

const ATTENUATORS = {
    'un poco': 0.7, 'algo': 0.8, 'ligeramente': 0.6, 'levemente': 0.6,
    'medianamente': 0.75, 'moderadamente': 0.8, 'apenas': 0.5,
    'casi': 0.7, 'a veces': 0.8
};

// ============================================================
// ENTIDADES (sustantivos frecuentes con valor semántico)
// ============================================================

const ENTITY_STOPWORDS = new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
    'de', 'del', 'a', 'al', 'en', 'con', 'por', 'para', 'sin', 'sobre',
    'y', 'o', 'u', 'pero', 'sino', 'que', 'qué', 'quien', 'quién',
    'es', 'son', 'está', 'están', 'estoy', 'estás', 'estamos',
    'ser', 'estar', 'tener', 'hacer', 'voy', 'vas', 'va',
    'yo', 'tú', 'él', 'ella', 'nosotros', 'ustedes', 'ellos', 'ellas',
    'me', 'te', 'se', 'nos', 'os', 'mi', 'tu', 'su', 'mis', 'tus', 'sus',
    'muy', 'más', 'mas', 'menos', 'poco', 'mucho', 'tanto',
    'aquí', 'ahí', 'allí', 'allá', 'acá',
    'este', 'esta', 'esto', 'ese', 'esa', 'eso', 'aquel', 'aquella',
    'mi', 'tu', 'su', 'nuestro', 'vuestro',
    'ya', 'aún', 'aun', 'todavía', 'siempre', 'nunca', 'jamás',
    'bien', 'mal', 'así', 'tan', 'como', 'cuando', 'donde',
    'si', 'sí', 'no', 'ni', 'también', 'tampoco',
    'porque', 'pues', 'entonces', 'luego', 'ahora', 'después', 'antes',
    'hoy', 'ayer', 'mañana', 'siempre', 'nunca'
]);

// ============================================================
// LÉXICO DE SENTIMIENTO
// Separado en tokens individuales + frases multi-palabra.
// FIX: antes las frases estaban mezcladas en el Set de tokens y
// nunca coincidían porque tokens son palabras sueltas.
// ============================================================

const SENTIMENT_POSITIVE_WORDS = new Set([
    'bien', 'bueno', 'buena', 'feliz', 'contento', 'contenta', 'alegre',
    'genial', 'excelente', 'maravilloso', 'maravillosa', 'fantástico',
    'estupendo', 'increíble', 'amor', 'amoroso', 'gracias', 'gracioso',
    'mejor', 'mejorando', 'orgulloso', 'orgullosa', 'esperanza',
    'bonito', 'bonita', 'lindo', 'linda', 'hermoso', 'hermosa',
    'tranquilo', 'tranquila', 'calmado', 'calmada', 'paz',
    'éxito', 'logro', 'logré', 'gané', 'aprendí', 'crecí', 'avancé',
    'ilusionado', 'ilusionada', 'emocionado', 'emocionada',
    'optimista', 'positivo', 'positiva', 'agradable', 'cómodo'
]);

const SENTIMENT_NEGATIVE_WORDS = new Set([
    'mal', 'malo', 'mala', 'triste', 'tristeza', 'deprimido', 'deprimida',
    'ansioso', 'ansiosa', 'ansiedad', 'miedo', 'terror', 'pánico',
    'enfadado', 'enfadada', 'furioso', 'furiosa', 'ira', 'rabia',
    'enojado', 'enojada', 'molesto', 'molesta', 'harto', 'harta',
    'cansado', 'cansada', 'agotado', 'agotada', 'fatigado',
    'solo', 'sola', 'soledad', 'perdido', 'perdida',
    'dolor', 'duele', 'sufrir', 'sufro', 'sufrimiento',
    'error', 'fracaso', 'fracasé', 'perdí', 'fallé', 'fallo',
    'horrible', 'terrible', 'fatal', 'asqueroso', 'asquerosa',
    'enfermo', 'enferma', 'enfermedad', 'muerto', 'muerte', 'murió',
    'difícil', 'complicado', 'complicada', 'duro', 'dura',
    'problema', 'problemas', 'conflicto', 'pelea', 'discusión',
    'miente', 'mentira', 'traición', 'traicionó',
    'inútil', 'inservible', 'incompetente'
]);

// Frases multi-palabra (se buscan con includes sobre el texto normalizado)
const SENTIMENT_POSITIVE_PHRASES = [
    'me siento bien',
    'estoy bien',
    'todo bien',
    'mucho mejor',
    'me alegra'
];

const SENTIMENT_NEGATIVE_PHRASES = [
    'no puedo',
    'no sé',
    'no se',
    'no sirvo',
    'no valgo',
    'no aguanto',
    'no puedo más',
    'no puedo mas',
    'me siento mal',
    'estoy harto',
    'estoy harta',
    'no tengo ganas'
];

// ============================================================
// CLASIFICADOR
// ============================================================

export class IntentClassifier {
    /**
     * Analiza un mensaje y devuelve un objeto con:
     *  - intent: string (categoría principal)
     *  - secondaryIntents: array (otras coincidencias significativas)
     *  - confidence: 0-1
     *  - sentiment: -1 a 1
     *  - intensity: 0-1
     *  - negated: boolean (si el intent fue negado)
     *  - questionType: 'que' | 'como' | 'por_que' | 'cuando' | 'donde' | 'quien' | null
     *  - entities: array de strings
     *  - tokens: array de tokens normalizados
     *  - raw: string original
     *  - metadata: {hasExclamation, hasQuestion, hasEllipsis, isAllCaps, wordCount}
     */
    static classify(message) {
        if (!message || typeof message !== 'string') {
            return this._emptyAnalysis();
        }

        const raw = message.trim();
        const normalized = this._normalize(raw);
        const tokens = this._tokenize(normalized);

        // Metadatos de forma
        const metadata = {
            hasExclamation: /[!¡]/.test(raw),
            hasQuestion: /[?¿]/.test(raw),
            hasEllipsis: /\.{2,}|…/.test(raw),
            isAllCaps: raw.length > 3 && raw === raw.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(raw),
            wordCount: tokens.length
        };

        // Negación global: buscar "no" al principio
        const negated = this._detectNegation(tokens);

        // Detección de tipo de pregunta
        const questionType = this._detectQuestionType(normalized);

        // Sentimiento base
        const { score: rawSentiment, hits: sentimentHits } = this._analyzeSentiment(tokens, normalized);

        // Intensidad
        let intensity = this._computeIntensity(tokens, metadata, rawSentiment);

        // Ajustar sentimiento por negación global
        let sentiment = negated ? -rawSentiment * 0.7 : rawSentiment;

        // Clasificar intención
        const matches = [];
        for (const ip of INTENT_PATTERNS) {
            for (const pattern of ip.patterns) {
                const m = raw.match(pattern);
                if (m) {
                    // Verificar negación local alrededor del match
                    const localNegated = this._isLocalNegation(raw, m.index, m[0].length);
                    const effectiveWeight = ip.weight * (localNegated ? 0.3 : 1.0);
                    matches.push({
                        intent: ip.intent,
                        weight: effectiveWeight,
                        match: m[0],
                        localNegated
                    });
                    break; // Solo un match por patrón
                }
            }
        }

        // Ajuste por pregunta
        if (metadata.hasQuestion) {
            for (const m of matches) {
                if (m.intent.startsWith('pregunta_')) m.weight *= 1.3;
            }
        }

        // Ajuste por exclamación
        if (metadata.hasExclamation) {
            for (const m of matches) {
                if (m.intent.startsWith('expresion_')) m.weight *= 1.2;
            }
        }

        // Ordenar y elegir
        matches.sort((a, b) => b.weight - a.weight);

        const primary = matches[0];
        const secondary = matches.slice(1, 4);

        // Confianza: cuánto se distingue del resto
        let confidence = 0.3;
        if (primary) {
            const secondWeight = secondary[0]?.weight || 0;
            const gap = primary.weight - secondWeight;
            confidence = Math.min(0.95, 0.4 + gap * 0.3 + primary.weight * 0.15);
        }

        // Entidades
        const entities = this._extractEntities(tokens);

        // Intent final
        const intent = primary?.intent || (metadata.hasQuestion ? 'pregunta_generica' : 'charla');

        return {
            intent,
            secondaryIntents: secondary.map(s => s.intent),
            confidence,
            sentiment: Math.max(-1, Math.min(1, sentiment)),
            sentimentHits: sentimentHits.slice(0, 5),
            intensity: Math.max(0, Math.min(1, intensity)),
            negated,
            questionType,
            entities,
            tokens,
            raw,
            metadata
        };
    }

    // ============================================================
    // HELPERS PRIVADOS
    // ============================================================

    static _emptyAnalysis() {
        return {
            intent: 'charla',
            secondaryIntents: [],
            confidence: 0.2,
            sentiment: 0,
            sentimentHits: [],
            intensity: 0.3,
            negated: false,
            questionType: null,
            entities: [],
            tokens: [],
            raw: '',
            metadata: {
                hasExclamation: false,
                hasQuestion: false,
                hasEllipsis: false,
                isAllCaps: false,
                wordCount: 0
            }
        };
    }

    static _normalize(text) {
        return text
            .toLowerCase()
            .replace(/[¡¿]/g, '')
            .replace(/[^a-záéíóúñü0-9\s?!.,;:]/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    static _tokenize(text) {
        return text.split(/\s+/).filter(t => t.length > 0);
    }

    static _detectNegation(tokens) {
        // Negación global: "no" o "nunca" en las primeras 3 palabras
        const head = tokens.slice(0, 3);
        return head.some(t => NEGATION_WORDS.includes(t));
    }

    static _isLocalNegation(text, matchIndex, matchLength) {
        // Mirar hasta 20 caracteres antes del match
        const start = Math.max(0, matchIndex - 20);
        const before = text.substring(start, matchIndex).toLowerCase();
        const wordsBefore = before.split(/\s+/).filter(w => w.length > 0);
        const lastWords = wordsBefore.slice(-3);
        return lastWords.some(w => NEGATION_WORDS.includes(w));
    }

    static _detectQuestionType(text) {
        if (/\b(c[oó]mo|de qu[eé] manera|de qu[eé] forma)\b/i.test(text)) return 'como';
        if (/\b(por qu[eé]|para qu[eé])\b/i.test(text)) return 'por_que';
        if (/\b(cu[aá]ndo)\b/i.test(text)) return 'cuando';
        if (/\b(d[oó]nde)\b/i.test(text)) return 'donde';
        if (/\b(qui[eé]n|qui[eé]nes)\b/i.test(text)) return 'quien';
        if (/\b(qu[eé]|cu[aá]l|cu[aá]les)\b/i.test(text)) return 'que';
        return null;
    }

    /**
     * FIX V4.2.1: antes las frases multi-palabra estaban dentro del Set de
     * tokens y nunca coincidían (los tokens son palabras sueltas). Ahora
     * separamos palabras de frases y buscamos las frases con includes()
     * sobre el texto normalizado.
     */
    static _analyzeSentiment(tokens, normalizedText) {
        let sum = 0;
        const hits = [];

        // 1) Tokens individuales
        for (const t of tokens) {
            if (SENTIMENT_POSITIVE_WORDS.has(t)) {
                sum += 1;
                hits.push({ word: t, polarity: 'pos' });
            } else if (SENTIMENT_NEGATIVE_WORDS.has(t)) {
                sum -= 1;
                hits.push({ word: t, polarity: 'neg' });
            }
        }

        // 2) Frases multi-palabra (peso mayor porque son más específicas)
        const text = normalizedText || tokens.join(' ');
        for (const p of SENTIMENT_POSITIVE_PHRASES) {
            if (text.includes(p)) {
                sum += 1.5;
                hits.push({ word: p, polarity: 'pos', phrase: true });
            }
        }
        for (const p of SENTIMENT_NEGATIVE_PHRASES) {
            if (text.includes(p)) {
                sum -= 1.5;
                hits.push({ word: p, polarity: 'neg', phrase: true });
            }
        }

        const score = sum / Math.max(1, Math.sqrt(tokens.length));
        return { score: Math.max(-1, Math.min(1, score)), hits };
    }

    static _computeIntensity(tokens, metadata, sentimentScore) {
        let intensity = 0.4 + Math.abs(sentimentScore) * 0.3;

        // Intensificadores
        for (const t of tokens) {
            if (INTENSIFIERS[t]) intensity *= INTENSIFIERS[t];
            if (ATTENUATORS[t]) intensity *= ATTENUATORS[t];
        }

        // Puntuación
        if (metadata.hasExclamation) intensity *= 1.25;
        if (metadata.isAllCaps) intensity *= 1.35;
        if (metadata.hasEllipsis) intensity *= 0.85;

        // Repeticiones ("muy muy")
        const repeated = this._detectRepeats(tokens);
        intensity *= (1 + repeated * 0.15);

        return Math.max(0, Math.min(1.5, intensity));
    }

    static _detectRepeats(tokens) {
        let count = 0;
        for (let i = 1; i < tokens.length; i++) {
            if (tokens[i] === tokens[i - 1] && tokens[i].length > 2) count++;
        }
        return count;
    }

    static _extractEntities(tokens) {
        const entities = [];
        const seen = new Set();
        for (const t of tokens) {
            if (t.length < 4) continue;
            if (ENTITY_STOPWORDS.has(t)) continue;
            if (/^\d+$/.test(t)) continue;
            if (seen.has(t)) continue;
            seen.add(t);
            entities.push(t);
            if (entities.length >= 8) break;
        }
        return entities;
    }
            }
