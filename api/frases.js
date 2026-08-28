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
  'y nombres propios. Idioma espanol. Devuelve unicamente JSON valido con una ' +
  'clave llamada frases que contenga una lista de textos distintos.';

const PROMPTS = {
  triste: BASE + ' Tono sereno, tierno, suave y calido.',
  bien:   BASE + ' Tono luminoso, alegre y halagador. Puedes decirle que es increible, ' +
    'hermosa, maravillosa, brillante y unica; halagos lindos y algo cursis que la hagan ' +
    'sentir muy valiosa y especial, pero SIN declarar amor romantico.'
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
    "Qué persona tan increíble eres: brillas con luz propia y contagias alegría a quien se te acerca. Sos hermosa por dentro y por fuera, y el mundo es un lugar mejor contigo en él.",
    "Eres maravillosa, de esas personas que iluminan un cuarto solo con entrar. Tu risa vale oro y tu forma de ser es un regalo; nunca dejes de ser tan auténtica y tan tú.",
    "Sos de las personas que dejan huella: fuerte, brillante y con un corazón enorme. Que nunca se te olvide lo valiosa que eres y todo lo que iluminas a tu paso.",
    "Increíble, así de simple. Tienes una chispa que pocos tienen y una belleza que no es solo de afuera, sino de todo lo que llevas dentro. Sigue brillando, que te queda perfecto.",
    "Eres hermosa, capaz y maravillosa, aunque a veces no te lo digan lo suficiente. Hoy que alguien te lo recuerde: vales muchísimo y el mundo tiene suerte de tenerte.",
    "Sos brillante y hermosa, de esas que hacen ver todo más bonito. Nunca subestimes lo especial que eres ni lo mucho que aportas con solo ser tú misma.",
    "Eres una persona increíble, con un brillo que no se apaga. Que sigas conquistando todo lo que te propongas, porque te sobra talento, luz y corazón.",
    "Sos hermosa, valiente y única. El mundo brilla un poco más gracias a personas como tú; no lo olvides nunca, y sigue siendo esa persona tan admirable."
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
