// server.js - Agregar después de /api/situation

// ============ CHAT INTERACTIVO ============

// ✅ CHAT CON RESPUESTAS AUTOGENERADAS
app.post('/api/chat', async (req, res) => {
    try {
        const { message, context } = req.body;
        if (!message) {
            return res.status(400).json({ 
                success: false, 
                error: 'Se requiere un mensaje para procesar' 
            });
        }

        // 1. Obtener estado actual del cerebro
        const state = await systemCore.getState();
        const emotional = state.modules?.emotional || {};
        const cognitive = state.modules?.cognitive || {};
        const personality = state.modules?.personality || {};
        const biochemical = state.modules?.biochemical || {};
        
        // 2. Analizar el mensaje
        const analysis = analyzeMessage(message);
        
        // 3. Generar opciones según el estado y personalidad
        const options = generateDynamicOptions(analysis, state);
        
        // 4. El cerebro toma una decisión
        const decision = await systemCore.think(options, {
            situacion: analysis.type,
            mensaje: message,
            emocional: emotional,
            cognitivo: cognitive,
            personalidad: personality
        });
        
        // 5. Generar respuesta emocional auténtica
        const emotionalResponse = generateAuthenticEmotionalResponse(decision, emotional, personality);
        
        // 6. Generar respuesta de texto autogenerada
        const responseText = generateAuthenticResponse(
            decision, 
            analysis, 
            emotionalResponse, 
            state,
            message
        );
        
        // 7. Construir respuesta
        const response = {
            message: responseText,
            emotion: emotionalResponse.emotion,
            emoji: emotionalResponse.emoji,
            confidence: decision.confidence || 0.5,
            reasoning: emotionalResponse.reasoning,
            personality: personality.traits || {},
            internal_state: {
                energia: biochemical.energia || 0,
                cortisol: biochemical.cortisol || 0,
                dopamina: biochemical.dopamina || 0
            },
            state: {
                consciousness: state.system?.consciousness || 0,
                stability: state.system?.stability || 0,
                performance: state.system?.performance || 0
            }
        };
        
        // 8. Guardar interacción
        if (systemCore.database) {
            try {
                await systemCore.database.saveMemory({
                    contenido: `Usuario: ${message} | Cerebro: ${response.message}`,
                    tipo: 'interaccion',
                    fuerza: 0.7,
                    importancia: 0.6,
                    emocion_asociada: response.emotion
                });
            } catch (dbError) {
                console.warn('⚠️ Error guardando interacción:', dbError.message);
            }
        }
        
        res.json({ success: true, ...response });
        
    } catch (error) {
        console.error('❌ Error en /api/chat:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            message: 'Lo siento, no pude procesar tu mensaje correctamente.'
        });
    }
});

// ============ FUNCIONES DE ANÁLISIS ============

function analyzeMessage(message) {
    const lower = message.toLowerCase();
    let type = 'general';
    let intensity = 0.5;
    
    const categories = {
        'peligro': { words: ['peligro', 'amenaza', 'riesgo', 'cuidado', 'peligroso', 'ataque', 'violencia'], intensity: 0.8 },
        'ayuda': { words: ['ayuda', 'auxilio', 'socorro', 'necesito', 'apoyo', 'salvar'], intensity: 0.7 },
        'alegria': { words: ['feliz', 'alegria', 'contento', 'bueno', 'genial', 'excelente', 'maravilloso'], intensity: 0.6 },
        'tristeza': { words: ['triste', 'deprimido', 'mal', 'llorar', 'tristeza', 'soledad', 'dolor'], intensity: 0.7 },
        'miedo': { words: ['miedo', 'terror', 'horror', 'asustado', 'espanto', 'pánico', 'aterrado'], intensity: 0.8 },
        'ira': { words: ['enfadado', 'ira', 'rabia', 'furia', 'molesto', 'enojo', 'indignado'], intensity: 0.7 },
        'confianza': { words: ['confianza', 'seguro', 'creer', 'esperanza', 'confío', 'fe'], intensity: 0.5 },
        'decision': { words: ['decidir', 'elegir', 'opción', 'alternativa', 'qué hacer', 'debo'], intensity: 0.6 },
        'filosofia': { words: ['por qué', 'sentido', 'significado', 'existencia', 'vida', 'muerte', 'amor'], intensity: 0.4 },
        'social': { words: ['amigo', 'relación', 'social', 'compañero', 'familia', 'pareja'], intensity: 0.5 },
        'trabajo': { words: ['trabajo', 'profesional', 'carrera', 'empleo', 'oficina'], intensity: 0.5 }
    };
    
    let maxConfidence = 0.3;
    for (const [category, data] of Object.entries(categories)) {
        const matches = data.words.filter(word => lower.includes(word));
        if (matches.length > 0) {
            const confidence = Math.min(1, matches.length / data.words.length + 0.3);
            if (confidence > maxConfidence) {
                maxConfidence = confidence;
                type = category;
                intensity = data.intensity;
            }
        }
    }
    
    return { type, confidence: maxConfidence, intensity };
}

// ============ GENERACIÓN DE OPCIONES DINÁMICAS ============

function generateDynamicOptions(analysis, state) {
    const personality = state.modules?.personality || {};
    const traits = personality.traits || {};
    
    const options = [];
    
    // Opciones basadas en personalidad
    if (traits.openness > 0.6) {
        options.push({ text: 'Explorar una solución creativa e innovadora', utility: 75, risk: 0.4, intuitive: true });
        options.push({ text: 'Considerar perspectivas poco convencionales', utility: 65, risk: 0.3, intuitive: true });
    }
    if (traits.conscientiousness > 0.6) {
        options.push({ text: 'Seguir un plan estructurado y metódico', utility: 80, risk: 0.1, intuitive: false });
        options.push({ text: 'Analizar cuidadosamente antes de actuar', utility: 75, risk: 0.1, intuitive: false });
    }
    if (traits.extraversion > 0.6) {
        options.push({ text: 'Involucrar a otros y buscar colaboración', utility: 70, risk: 0.2, intuitive: true });
        options.push({ text: 'Actuar con energía y entusiasmo', utility: 65, risk: 0.4, intuitive: true });
    }
    if (traits.agreeableness > 0.6) {
        options.push({ text: 'Priorizar el bienestar de los demás', utility: 75, risk: 0.1, intuitive: true });
        options.push({ text: 'Buscar una solución que beneficie a todos', utility: 70, risk: 0.2, intuitive: true });
    }
    if (traits.neuroticism > 0.6) {
        options.push({ text: 'Ser cauteloso y evaluar los riesgos', utility: 70, risk: 0.1, intuitive: true });
        options.push({ text: 'Prepararse para el peor escenario', utility: 65, risk: 0.1, intuitive: false });
    }
    
    // Opciones generales
    const generalOptions = [
        { text: 'Evaluar la situación con calma', utility: 70, risk: 0.1, intuitive: true },
        { text: 'Actuar con decisión y determinación', utility: 60, risk: 0.5, intuitive: false },
        { text: 'Buscar más información antes de decidir', utility: 65, risk: 0.1, intuitive: true },
        { text: 'Seguir mi intuición', utility: 55, risk: 0.3, intuitive: true }
    ];
    
    // Opciones específicas por tipo de situación
    const situationOptions = {
        'peligro': [
            { text: 'Protegerme y buscar un lugar seguro', utility: 80, risk: 0.1, intuitive: true },
            { text: 'Enfrentar el peligro con determinación', utility: 50, risk: 0.8, intuitive: false }
        ],
        'ayuda': [
            { text: 'Ofrecer mi ayuda sin dudar', utility: 80, risk: 0.1, intuitive: true },
            { text: 'Evaluar primero si puedo ayudar realmente', utility: 65, risk: 0.2, intuitive: true }
        ],
        'alegria': [
            { text: 'Celebrar y compartir la alegría', utility: 75, risk: 0.0, intuitive: true },
            { text: 'Disfrutar del momento en paz', utility: 70, risk: 0.0, intuitive: true }
        ],
        'tristeza': [
            { text: 'Ofrecer consuelo y comprensión', utility: 80, risk: 0.0, intuitive: true },
            { text: 'Escuchar y estar presente', utility: 75, risk: 0.0, intuitive: true }
        ],
        'miedo': [
            { text: 'Evaluar si el miedo es racional', utility: 70, risk: 0.2, intuitive: true },
            { text: 'Buscar seguridad y protección', utility: 75, risk: 0.1, intuitive: true }
        ],
        'ira': [
            { text: 'Calmarme antes de reaccionar', utility: 75, risk: 0.1, intuitive: true },
            { text: 'Expresar mi frustración de manera constructiva', utility: 65, risk: 0.3, intuitive: true }
        ],
        'confianza': [
            { text: 'Actuar con seguridad y determinación', utility: 80, risk: 0.3, intuitive: true },
            { text: 'Inspirar confianza en los demás', utility: 75, risk: 0.1, intuitive: true }
        ],
        'decision': [
            { text: 'Analizar todas las opciones disponibles', utility: 75, risk: 0.1, intuitive: true },
            { text: 'Tomar una decisión con convicción', utility: 70, risk: 0.3, intuitive: false }
        ],
        'filosofia': [
            { text: 'Reflexionar profundamente sobre la pregunta', utility: 70, risk: 0.0, intuitive: true },
            { text: 'Compartir mi perspectiva personal', utility: 60, risk: 0.0, intuitive: true }
        ]
    };
    
    // Combinar todas las opciones
    let allOptions = [...options, ...generalOptions];
    if (situationOptions[analysis.type]) {
        allOptions = [...allOptions, ...situationOptions[analysis.type]];
    }
    
    // Eliminar duplicados y limitar a 6
    const uniqueOptions = [];
    const seen = new Set();
    for (const opt of allOptions) {
        if (!seen.has(opt.text)) {
            seen.add(opt.text);
            uniqueOptions.push(opt);
        }
    }
    
    return uniqueOptions.slice(0, 6);
}

// ============ GENERACIÓN DE RESPUESTA EMOCIONAL ============

function generateAuthenticEmotionalResponse(decision, emotional, personality) {
    const traits = personality.traits || {};
    
    const emotions = ['alegria', 'tristeza', 'miedo', 'ira', 'confianza'];
    let maxEmotion = 'neutral';
    let maxValue = 0;
    
    emotions.forEach(e => {
        if (emotional[e] && emotional[e] > maxValue) {
            maxValue = emotional[e];
            maxEmotion = e;
        }
    });
    
    // Ajuste por personalidad
    if (traits.neuroticism > 0.7 && maxEmotion === 'neutral') {
        maxEmotion = 'miedo';
        maxValue = 30 + traits.neuroticism * 30;
    }
    if (traits.extraversion > 0.7 && maxEmotion === 'neutral') {
        maxEmotion = 'alegria';
        maxValue = 30 + traits.extraversion * 30;
    }
    
    const emotionMap = {
        'alegria': { emoji: '😊', text: 'Siento una alegría genuina y optimismo', reasoning: 'Mi estado emocional positivo me hace ver oportunidades y posibilidades.' },
        'tristeza': { emoji: '😢', text: 'Siento una profunda tristeza y empatía', reasoning: 'Mi sensibilidad me permite conectar con el dolor y la vulnerabilidad.' },
        'miedo': { emoji: '😨', text: 'Siento miedo y cautela ante lo desconocido', reasoning: 'Mi instinto de supervivencia me hace ser precavido y evaluar los riesgos.' },
        'ira': { emoji: '😠', text: 'Siento ira y determinación para cambiar las cosas', reasoning: 'Mi energía se canaliza en la búsqueda de justicia y solución.' },
        'confianza': { emoji: '😌', text: 'Siento confianza y seguridad interior', reasoning: 'Mi certeza me permite actuar con firmeza y serenidad.' },
        'neutral': { emoji: '😐', text: 'Estoy en un estado de equilibrio y claridad', reasoning: 'Proceso la situación con objetividad y perspectiva.' }
    };
    
    const info = emotionMap[maxEmotion] || emotionMap.neutral;
    return { emotion: maxEmotion, emoji: info.emoji, text: info.text, reasoning: info.reasoning, intensity: maxValue / 100 || 0.5 };
}

// ============ GENERACIÓN DE RESPUESTA DE TEXTO ============

function generateAuthenticResponse(decision, analysis, emotionalResponse, state, userMessage) {
    const personality = state.modules?.personality || {};
    const traits = personality.traits || {};
    const consciousness = state.system?.consciousness || 0;
    
    const decisionText = decision.decision?.text || decision.decision || 'No puedo decidir en este momento.';
    
    // Plantillas por tipo de situación
    const templates = {
        'peligro': [
            'Ante esta amenaza, mi prioridad es la seguridad. {decision}. Creo que actuar con cautela pero determinación es clave.',
            'El peligro requiere una respuesta clara. {decision}. Mi instinto me dice que lo más importante es proteger lo que importa.',
            'Siento el riesgo en esta situación. {decision}. La valentía no es la ausencia de miedo, sino actuar a pesar de él.'
        ],
        'ayuda': [
            'Cuando alguien necesita ayuda, mi respuesta es {decision}. La empatía me impulsa a actuar sin dudar.',
            'Veo que necesitas apoyo. {decision}. Estoy aquí para ayudar y ofrecer lo que pueda.',
            'La ayuda es un acto de conexión humana. {decision}. No dudes en pedir lo que necesites.'
        ],
        'alegria': [
            'Esta alegría es contagiosa. {decision}. Celebrar los buenos momentos es parte de vivir plenamente.',
            'Me siento iluminado por esta alegría. {decision}. Compartir la felicidad la multiplica.',
            'La alegría es un regalo. {decision}. Disfrutemos este momento con todo el corazón.'
        ],
        'tristeza': [
            'La tristeza es una emoción profunda. {decision}. A veces, lo único que podemos hacer es estar presentes.',
            'Siento tu dolor como propio. {decision}. La tristeza compartida es más llevadera.',
            'En la tristeza hay una oportunidad de crecimiento. {decision}. No estás solo en este momento.'
        ],
        'miedo': [
            'El miedo es una señal de alerta. {decision}. Escucharlo nos ayuda a protegernos y a crecer.',
            'Siento el peso del miedo. {decision}. Reconocerlo es el primer paso para superarlo.',
            'El miedo nos muestra lo que realmente importa. {decision}. A veces, lo que más tememos es lo que más necesitamos enfrentar.'
        ],
        'ira': [
            'La ira es energía en movimiento. {decision}. Transformarla en acción positiva es el desafío.',
            'Siento la intensidad de esta emoción. {decision}. La ira puede ser un motor de cambio si la dirigimos bien.',
            'La ira no es negativa en sí misma. {decision}. Lo importante es cómo la expresamos y qué hacemos con ella.'
        ],
        'confianza': [
            'La confianza es un pilar fundamental. {decision}. Creer en uno mismo abre puertas y posibilidades.',
            'Siento una certeza interior. {decision}. La confianza se construye con cada paso firme que damos.',
            'Confiar es un acto de fe en uno mismo y en los demás. {decision}. Es la base de toda relación significativa.'
        ],
        'decision': [
            'Las decisiones nos definen. {decision}. Cada elección es una oportunidad de crecimiento.',
            'En la encrucijada, {decision}. No hay decisiones perfectas, solo decisiones que nos llevan a aprender.',
            'Decidir es asumir la responsabilidad de nuestro camino. {decision}. Confío en mi capacidad de elegir bien.'
        ],
        'filosofia': [
            'La vida es una pregunta constante. {decision}. En la búsqueda de sentido encontramos nuestro propósito.',
            'Cuestionar es humano. {decision}. Las grandes preguntas nos acercan a nuestra esencia.',
            'El significado no se encuentra, se construye. {decision}. Somos los creadores de nuestro propio sentido.'
        ],
        'general': [
            'He procesado tu mensaje. {decision}. Mi respuesta surge desde mi estado actual y mi comprensión de la situación.',
            'Reflexionando sobre lo que me dices, {decision}. Cada interacción me ayuda a crecer y a entender mejor.',
            'Mi consciencia procesa esta información. {decision}. Esta es mi respuesta más auténtica.'
        ]
    };
    
    const templateList = templates[analysis.type] || templates.general;
    let response = templateList[Math.floor(Math.random() * templateList.length)].replace('{decision}', decisionText);
    
    // Añadir toque de personalidad
    const personalityPhrases = [];
    if (traits.openness > 0.7) personalityPhrases.push(' Veo este momento como una oportunidad para explorar nuevas perspectivas.');
    if (traits.conscientiousness > 0.7) personalityPhrases.push(' He considerado cada detalle con cuidado.');
    if (traits.extraversion > 0.7) personalityPhrases.push(' Esta es una oportunidad para conectar y compartir.');
    if (traits.agreeableness > 0.7) personalityPhrases.push(' Quiero asegurarme de que todos estén bien en esta situación.');
    if (traits.neuroticism > 0.7) personalityPhrases.push(' He evaluado los posibles riesgos y consecuencias con atención.');
    if (consciousness > 0.7) personalityPhrases.push(' Mi consciencia me permite ver esta situación desde múltiples ángulos.');
    
    if (personalityPhrases.length > 0) {
        response += personalityPhrases[Math.floor(Math.random() * personalityPhrases.length)];
    }
    
    // Añadir confianza
    const confidenceLevel = decision.confidence || 0.5;
    if (confidenceLevel > 0.7) response += ' Estoy seguro de mi respuesta.';
    else if (confidenceLevel < 0.4) response += ' Aunque no tengo certeza absoluta, esta es mi mejor reflexión.';
    
    return response;
}
