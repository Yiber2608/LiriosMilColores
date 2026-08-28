// api/visita.js — registra cada visita (IP + fecha/hora + navegador) en la hoja
// (pestaña "Visitas"), reenviando al mismo webhook de Apps Script.
// La IP real la da Vercel en la cabecera x-forwarded-for.

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const hook = process.env.SHEET_WEBHOOK_URL || process.env.MENSAJES_WEBHOOK_URL;
  if (!hook) return res.status(200).json({ ok: false, error: 'sin-almacen' });

  const registro = {
    tipo: 'visita',
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
