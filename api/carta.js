// api/carta.js — sirve TUS cartas (privadas) leyéndolas desde la hoja de Google
// (pestaña "Cartas") a través del mismo Apps Script, validando el pin.
// Con reintentos, porque el web app de Apps Script a veces responde lento o con
// una página HTML en vez de JSON (hipos de Google).
//
// Configurar en Vercel:  SHEET_WEBHOOK_URL = https://script.google.com/macros/s/XXXXX/exec
// Uso: GET /api/carta?pin=02052026

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  // Lee el pin con la API moderna URL (evita el DeprecationWarning de req.query)
  let pin = '';
  try { pin = new URL(req.url, 'http://x').searchParams.get('pin') || ''; } catch (_) { pin = ''; }

  const base = process.env.SHEET_WEBHOOK_URL || process.env.MENSAJES_WEBHOOK_URL;
  if (!base) return res.status(501).json({ ok: false, error: 'sin-backend' });

  // Pasamos IP y navegador para que el Apps Script pueda registrar cada intento de pin
  const ip = ((req.headers['x-forwarded-for'] || '').split(',')[0] || '').trim();
  const ua = (req.headers['user-agent'] || '').slice(0, 200);
  const url = base + (base.indexOf('?') >= 0 ? '&' : '?') +
    'pin=' + encodeURIComponent(pin) +
    '&ip=' + encodeURIComponent(ip) +
    '&ua=' + encodeURIComponent(ua);

  for (let intento = 0; intento < 3; intento++) {
    try {
      const r = await fetch(url, { redirect: 'follow' });
      const txt = await r.text();
      let data = null;
      try { data = JSON.parse(txt); } catch (_) { data = null; }   // si no es JSON, reintenta
      if (data && typeof data.ok !== 'undefined') {
        return res.status(200).json(data);
      }
    } catch (_) { /* reintenta */ }
  }
  return res.status(502).json({ ok: false, error: 'hook' });
};
