// api/visita.js — registra visitas y sesiones (tiempo en la página) en la hoja.
// - tipo "visita": una fila por carga (IP + fecha/hora + navegador).
// - tipo "sesion": latidos (heartbeat) con la duración; el Apps Script actualiza
//   la misma fila por SesionID, así queda cuánto tiempo estuvo esa IP.
// La IP real la da Vercel en la cabecera x-forwarded-for.

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const hook = process.env.SHEET_WEBHOOK_URL || process.env.MENSAJES_WEBHOOK_URL;
  if (!hook) return res.status(200).json({ ok: false, error: 'sin-almacen' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) { body = {}; } }
  body = body || {};

  const registro = {
    tipo: body.tipo === 'sesion' ? 'sesion' : 'visita',
    sid: body.sid ? String(body.sid) : null,
    dur: parseInt(body.dur, 10) || 0,
    ip: ((req.headers['x-forwarded-for'] || '').split(',')[0] || '').trim() || null,
    ua: req.headers['user-agent'] || null,
    ref: req.headers['referer'] || req.headers['referrer'] || null
  };
  try {
    await fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registro)
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(200).json({ ok: false });
  }
};
