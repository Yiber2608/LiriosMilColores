// api/chiste.js — Función serverless (Vercel) que genera chistes malos con Groq.
// Cada chiste trae { q, correcta, falsa } para armar el juego de 2 opciones.
// La API key vive SOLO en la variable de entorno GROQ_API_KEY de Vercel.
//
// Uso: /api/chiste?n=8

const PROMPT =
  'Eres un comediante de chistes malos (dad jokes) en espanol latino, tiernos y bobos, ' +
  'aptos para todo publico, sin groserias ni doble sentido adulto. Genera chistes cortos ' +
  'tipo pregunta con remate tonto (colmos, "¿por que...?", "¿que le dijo X a Y?"). Para CADA ' +
  'chiste entrega: q (la pregunta o setup), correcta (el remate real y gracioso-malo, corto), ' +
  'y falsa (un remate ALTERNATIVO distinto, plausible pero que NO es el chiste real). La ' +
  'correcta y la falsa deben ser parecidas en longitud y estilo. Devuelve unicamente JSON ' +
  'valido con una clave llamada chistes que contenga una lista de objetos con las claves q, correcta y falsa.';

const FALLBACK = [
  { q: "¿Cuál es el colmo de un electricista?", correcta: "Que siempre le dé miedo la corriente.", falsa: "Que le cobren por la luz." },
  { q: "¿Por qué el libro de matemáticas está triste?", correcta: "Porque tiene muchos problemas.", falsa: "Porque nunca tiene respuestas." },
  { q: "¿Qué le dice una iguana a su hermana?", correcta: "¡Iguanita, qué tal!", falsa: "¡Iguanita, dame calor!" },
  { q: "¿Cuál es el animal más antiguo?", correcta: "La cebra, porque está en blanco y negro.", falsa: "El pingüino, porque siempre lleva traje." },
  { q: "¿Por qué la pelota no puede guardar secretos?", correcta: "Porque siempre rebota la información.", falsa: "Porque siempre se le escapa la presión." },
  { q: "¿Qué le dijo el tomate a la cebolla?", correcta: "¡No llores, que yo también soy rojo!", falsa: "¡No llores, que yo también tengo capas!" },
  { q: "¿Cómo se llama el campeón de buceo japonés?", correcta: "Tokofondo.", falsa: "Miyamare." },
  { q: "¿Qué hace una abeja en el gimnasio?", correcta: "Zum-ba.", falsa: "Miel-itar." },
  { q: "¿Cuál es la fruta más divertida?", correcta: "La sandía, porque siempre está de fiesta.", falsa: "El melón, porque tiene muchas semillas." },
  { q: "¿Por qué los fantasmas no mienten?", correcta: "Porque se les ve a través.", falsa: "Porque siempre están transparentes." },
  { q: "¿Qué le dice un semáforo a otro?", correcta: "No te pongas rojo, que yo estoy verde.", falsa: "Cambia de luz, que estoy cansado." },
  { q: "¿Cómo se llama el perro de un mago?", correcta: "Ladrín.", falsa: "Abracane." }
];

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
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

  if (!apiKey) {
    return res.status(200).json({ chistes: shuffle(FALLBACK).slice(0, n), source: 'fallback' });
  }
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model, temperature: 1.05, max_tokens: 6000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: PROMPT },
          { role: 'user', content: 'Genera ' + n + ' chistes.' }
        ]
      })
    });
    const data = await r.json();
    const content = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content : null;
    let chistes = [];
    if (content) { try { chistes = JSON.parse(content).chistes || []; } catch (_) { chistes = []; } }
    chistes = (chistes || []).filter(c => c && c.q && c.correcta && c.falsa);
    if (!chistes.length) {
      return res.status(200).json({ chistes: shuffle(FALLBACK).slice(0, n), source: 'fallback' });
    }
    return res.status(200).json({ chistes: chistes.slice(0, n), source: 'groq', model });
  } catch (e) {
    return res.status(200).json({ chistes: shuffle(FALLBACK).slice(0, n), source: 'fallback' });
  }
};
