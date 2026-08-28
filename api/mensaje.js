// api/mensaje.js — recibe el mensaje que ella escribe y lo reenvía a un webhook
// de Google Apps Script (una hoja de cálculo) para guardarlo con fecha y hora.
// La URL del webhook vive SOLO en la variable de entorno MENSAJES_WEBHOOK_URL,
// así no queda expuesta en el repo público.
//
// Configurar en Vercel (Settings → Environment Variables):
//   MENSAJES_WEBHOOK_URL = https://script.google.com/macros/s/XXXXX/exec
//   CARTA_PIN            = 02052026   (opcional; valida el pin al enviar)

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'metodo' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) { body = {}; } }
  body = body || {};

  const mensaje = (body.mensaje || '').toString().slice(0, 4000).trim();
  const pin = (body.pin || '').toString();
  if (!mensaje) return res.status(400).json({ ok: false, error: 'vacio' });
  if (process.env.CARTA_PIN && pin !== process.env.CARTA_PIN) {
    return res.status(403).json({ ok: false, error: 'pin' });
  }

  const hook = process.env.SHEET_WEBHOOK_URL || process.env.MENSAJES_WEBHOOK_URL;
  if (!hook) return res.status(501).json({ ok: false, error: 'sin-almacen' });

  const registro = {
    mensaje: mensaje,
    fechaISO: new Date().toISOString(),
    ip: (req.headers['x-forwarded-for'] || '').split(',')[0] || null,
    ua: req.headers['user-agent'] || null
  };
  try {
    const r = await fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registro)
    });
    if (!r.ok) return res.status(502).json({ ok: false, error: 'hook' });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'hook' });
  }
};
