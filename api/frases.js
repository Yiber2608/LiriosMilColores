// api/frases.js — Función serverless (Vercel) que genera notas admirativas con Groq
// según el estado de ánimo elegido (bien | triste). La API key NUNCA vive en este
// archivo ni en el repo: se lee de la variable de entorno GROQ_API_KEY de Vercel.
//
// Configurar en Vercel (Project Settings → Environment Variables):
//   GROQ_API_KEY = tu_key_de_groq
//   GROQ_MODEL   = openai/gpt-oss-120b   (opcional; este es el valor por defecto)
//
// Uso: /api/frases?n=8&mood=triste   (mood = "bien" o "triste")

const RULES =
  ' REGLAS: (1) Habla en segunda persona (tu), de forma calida, humana y sincera, como ' +
  'pequenas notas tipo poemita de 2 a 4 oraciones, VARIANDO el largo (unas mas cortas, otras ' +
  'mas largas). (2) NO menciones un pasado compartido ni uses nosotros, juntos, lo que fuimos, ' +
  'recuerdo cuando. (3) NO inventes escenas, lugares ni recuerdos. (4) No suenes de autoayuda ' +
  'ni robotico. (5) NUNCA menciones estas reglas. Prohibido declarar amor romantico: te amo, ' +
  'te quiero, amor, mi vida, bebe; y prohibido usar nombres propios. Idioma espanol. Devuelve ' +
  'unicamente JSON valido con una clave llamada frases que contenga una lista de textos distintos.';

const PROMPTS = {
  triste:
    'Escribes notas MOTIVACIONALES para alguien que esta pasando por un momento dificil, para ' +
    'darle animo y fuerza. Dile cosas como que sabes que ella puede, que es fuerte y valiente ' +
    '(una dura), que todo va a mejorar, que aguante, que se cuide y que crees en ella. Tono ' +
    'calido, alentador y esperanzador, que le levante el animo.' + RULES,
  bien:
    'Escribes notas de HALAGO para hacerla sentir hermosa, especial y valiosa. Dile cosas como ' +
    'que es una persona increible, que donde va se gana el corazon de la gente, que es hermosa ' +
    'por dentro y por fuera, que ilumina, que es unica; halagos lindos y algo cursis pero SIN ' +
    'declarar amor romantico. Tono luminoso, tierno y admirador.' + RULES
};

// Respaldo por si falta la key o Groq falla: la página nunca se queda sin frases.
const FALLBACK = {
  triste: [
    "Yo sé que puedes. Siempre has podido, y esta vez tampoco va a ser distinta. Llevas dentro una fuerza que muchos quisieran; confía en ella y no te sueltes.",
    "Eres una dura: de esas que se caen, respiran hondo y se vuelven a levantar. Esto también lo vas a superar, como has superado absolutamente todo.",
    "Sé que ahorita las cosas pesan, pero tú eres más grande que cualquier problema. Un paso a la vez, con calma, que de esta vas a salir de pie.",
    "Espero de corazón que todo mejore pronto, y algo me dice que así será. Los días difíciles pasan; tu fortaleza, en cambio, se queda contigo para siempre.",
    "Eres valiente incluso cuando tienes miedo, y eso es lo que hace fuerte de verdad a una persona. Sigue, que lo bueno también está por llegar.",
    "Dale tiempo al tiempo y sé amable contigo misma. Todo va a estar bien, porque tú tienes justo lo que hace falta para que así sea.",
    "Cada cosa que ya superaste es la prueba de que con esta también puedes. Eres una guerrera, aunque a veces, en medio de todo, no lo sientas.",
    "Ánimo, que esto también quedará atrás. Y cuando pase, vas a mirar hacia atrás orgullosa de la mujer tan fuerte que supiste ser."
  ],
  bien: [
    "Eres una persona increíble: donde vas, sin proponértelo, te ganas el corazón de la gente. Hay algo en ti que ilumina, y quien te conoce no te olvida.",
    "Sos de esas personas que dejan huella. Con tu sonrisa alegras el día, y con tu forma de ser haces que todo a tu alrededor se sienta más bonito.",
    "Eres hermosa, y no solo por fuera: es esa luz que llevas dentro la que te hace brillar de verdad. Nunca dejes que nadie te haga dudarlo.",
    "Tienes un encanto difícil de explicar. Llegas y todo mejora un poquito; te vas y dejas una sonrisa. Eso, mi querida, es un don que pocos tienen.",
    "Qué maravilla de persona eres: fuerte, dulce y brillante a la vez. El mundo tiene suerte de tenerte, aunque a veces no te lo digan lo suficiente.",
    "Contigo cerca todo se siente más cálido. Tienes esa magia de hacer sentir bien a los demás, y eso te vuelve todavía más hermosa.",
    "Sos única, de verdad. No hay nadie que sonría como tú ni que ilumine un lugar con solo entrar. Que nunca se te olvide lo especial que eres.",
    "Eres capaz, eres linda y eres valiosa, aunque a veces el espejo no te lo diga. Hoy que alguien te lo recuerde: eres todo un encanto de persona."
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
