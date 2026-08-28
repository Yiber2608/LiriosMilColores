// api/carta.js — sirve TUS cartas (privadas) leyéndolas desde la hoja de Google
// (pestaña "Cartas") a través del mismo Apps Script, validando el pin.
// Así la carta nunca queda en el repo público.
//
// Configurar en Vercel:
//   SHEET_WEBHOOK_URL = https://script.google.com/macros/s/XXXXX/exec
//
// Uso: GET /api/carta?pin=02052026  → { ok, cartas:[{fecha,titulo,parrafos}], mensajeNoDisponible }

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const pin = ((req.query && req.query.pin) || '').toString();

  const base = process.env.SHEET_WEBHOOK_URL || process.env.MENSAJES_WEBHOOK_URL;
  if (!base) return res.status(501).json({ ok: false, error: 'sin-backend' });

  try {
    const url = base + (base.indexOf('?') >= 0 ? '&' : '?') + 'pin=' + encodeURIComponent(pin);
    const r = await fetch(url, { redirect: 'follow' });
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'hook' });
  }
};
