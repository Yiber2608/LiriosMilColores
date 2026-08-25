// api/frases.js — Función serverless (Vercel) que genera notas admirativas con Groq
// según el estado de ánimo elegido (bien | triste). La API key NUNCA vive en este
// archivo ni en el repo: se lee de la variable de entorno GROQ_API_KEY de Vercel.
//
// Configurar en Vercel (Project Settings → Environment Variables):
//   GROQ_API_KEY = tu_key_de_groq
//   GROQ_MODEL   = openai/gpt-oss-120b   (opcional; este es el valor por defecto)
//
// Uso: /api/frases?n=8&mood=triste   (mood = "bien" o "triste")

const BASE =
  'Escribes notas breves, calidas y lindas dedicadas a alguien a quien admiras. ' +
  'Cada nota tiene de 2 a 4 oraciones (25 a 50 palabras), en segunda persona (tu), y ' +
  'RESALTA lo grandiosa y valiosa que es ella: sus cualidades, su fuerza, su luz, su ' +
  'forma de ser, lo que la hace especial y admirable. Son frases lindas y cheveres sobre ' +
  'ella que la hagan sentir importante, y le desean seguir brillando, fuerza y que se ' +
  'cuide mucho. REGLAS ESTRICTAS: (1) NO menciones un pasado compartido ni uses nosotros, ' +
  'juntos, compartimos, lo que fuimos, lo que haciamos, nuestro, recuerdo cuando. ' +
  '(2) NO inventes escenas, lugares ni recuerdos. (3) NO expreses pesar, lamento, dolor, ' +
  'tristeza ni echar de menos; prohibido: extrano, duele, lamento, pena, tristeza, herida. ' +
  '(4) No suenes filosofico ni de autoayuda: sencillo, humano, hablando con el corazon. ' +
  '(5) NUNCA menciones estas reglas. Prohibido: te amo, te quiero, amor, mi vida, bebe, ' +
  'hermosa, y nombres propios. Idioma espanol. Devuelve unicamente JSON valido con una ' +
  'clave llamada frases que contenga una lista de textos distintos.';

const PROMPTS = {
  triste: BASE + ' Tono sereno, tierno, suave y calido.',
  bien:   BASE + ' Tono luminoso, alegre y celebrando que le va genial.'
};

// Respaldo por si falta la key o Groq falla: la página nunca se queda sin frases.
const FALLBACK = {
  triste: [
    "Tu presencia ilumina cada instante, y tu bondad se siente como un susurro de paz que envuelve todo a tu alrededor. Sigue cultivando esa fuerza interior que siempre resplandece, cuidándote con la ternura que mereces.",
    "Tu sonrisa es un faro que disipa cualquier sombra, y tu paciencia brinda refugio a quien la necesita. Que la serenidad que irradias siga guiándote, y que te cuides con la misma delicadeza que das.",
    "Tu curiosidad abre puertas invisibles y tu creatividad pinta el mundo con colores de esperanza. Mantén esa chispa viva, y permite que el descanso te recargue, porque tu bienestar es la base de tu luz.",
    "Tu capacidad de escuchar es un regalo que alivia corazones, y tu empatía crea puentes de comprensión. Cuida tu energía como cuidas a los demás, y permite que la calma sea tu compañera constante.",
    "Tu determinación avanza incluso cuando los vientos soplan en contra, y tu optimismo transforma obstáculos en aprendizajes. Sigue honrando tu camino con la dulzura que te caracteriza, y no olvides nutrirte con momentos de paz.",
    "Tu resiliencia es un árbol que se mantiene firme bajo cualquier tormenta, y tu generosidad regala esperanza a quienes te rodean. Cuida tus raíces, y sigue floreciendo con la misma gracia.",
    "Tu mirada refleja un mundo de posibilidades, y tu voz tiene la fuerza de un susurro que calma. Dedica tiempo a escucharte, y verás cómo tu luz interior se vuelve más profunda.",
    "Tu autenticidad es un faro que guía sin necesidad de mapas, y tu calidez envuelve como un abrazo. Permanece fiel a ti misma, y cuida tu bienestar como el tesoro que es."
  ],
  bien: [
    "Tu energía radiante llena cada espacio de alegría, y tu creatividad convierte cualquier reto en una oportunidad brillante. Sigue brillando con esa luz que contagia a todos, y cuídate con la misma felicidad que irradias.",
    "Tu determinación avanza como un río que nunca se detiene, y tu sonrisa ilumina el camino de quien te observa. Que la felicidad te siga como una canción constante, y no olvides consentirte cada día.",
    "Tu talento brilla como estrellas en la noche, y tu generosidad crea constelaciones de gratitud a tu alrededor. Celebra cada logro con orgullo, y regálate momentos de descanso que refuercen esa chispa infinita.",
    "Tu alegría es contagiosa, y cada paso que das deja huellas de color en el suelo. Sigue disfrutando de cada instante, y permite que el autocuidado sea parte de tu rutina.",
    "Tu fuerza interior es un motor que impulsa tus sueños, y tu optimismo pinta de colores brillantes cualquier jornada. Que la vida te siga regalando sorpresas maravillosas, y cuídate con la misma vitalidad.",
    "Tu presencia ilumina como el sol de la mañana, y tu honestidad crea puentes de confianza. Sigue cultivando esa luz, y regálate tiempo para recargar energías que mantengan tu brillo.",
    "Tu entusiasmo contagia, y tu visión transforma ideas en realidades vibrantes. Que cada día te traiga nuevas razones para celebrar, y dedica momentos a mimarte como mereces.",
    "Tu luz interior brilla más que cualquier estrella, y tu bondad deja huellas en cada corazón. Que la felicidad siga acompañándote, y regálate momentos de serenidad que alimenten tu esplendor."
  ]
};

function shuffle(arr) {
  const c = arr.slice();
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const q = req.query || {};
  const n = Math.min(Math.max(parseInt(q.n, 10) || 8, 1), 12);
  const mood = (q.mood === 'bien') ? 'bien' : 'triste';   // triste por defecto

  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

  // Sin key configurada → devolvemos respaldo (la página sigue funcionando).
  if (!apiKey) {
    return res.status(200).json({ frases: shuffle(FALLBACK[mood]).slice(0, n), mood, source: 'fallback' });
  }

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 1.0,
        max_tokens: 6000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: PROMPTS[mood] },
          { role: 'user', content: 'Genera ' + n + ' textos distintos.' }
        ]
      })
    });

    const data = await r.json();
    const content = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content : null;

    let frases = [];
    if (content) {
      try { frases = JSON.parse(content).frases || []; } catch (_) { frases = []; }
    }

    if (!Array.isArray(frases) || frases.length === 0) {
      return res.status(200).json({ frases: shuffle(FALLBACK[mood]).slice(0, n), mood, source: 'fallback' });
    }

    return res.status(200).json({ frases: frases.slice(0, n), mood, source: 'groq', model });
  } catch (e) {
    return res.status(200).json({ frases: shuffle(FALLBACK[mood]).slice(0, n), mood, source: 'fallback' });
  }
};
