// Cloudflare Pages Function: POST /api/contact
// Receives the #contact form (JSON from js/main.js, or a plain form post without JS),
// validates it, and emails it to CONTACT_TO through the Resend API.
//
// Environment (Cloudflare dashboard > Pages project > Settings > Variables and Secrets):
//   RESEND_API_KEY  secret, required   Resend API key with send access
//   CONTACT_FROM    required           Sender on a Resend-verified domain, e.g. "Appel Haken Website <website@appelhaken.com>"
//   CONTACT_TO      optional           Inbox that receives inquiries (default contact@appelhaken.com)

const URGENCY = { '': 'Not specified', 'this-week': 'This week', 'this-month': 'This month', 'exploring': 'Exploring' };
const LIMITS = { name: 200, email: 254, company: 200, message: 5000 };
const GENERIC_ERROR = 'That didn’t go through.';

export async function onRequestPost({ request, env }) {
  const wantsJson = (request.headers.get('Content-Type') || '').includes('application/json');
  const reply = (ok, error, status) => wantsJson
    ? Response.json(ok ? { ok: true } : { ok: false, error }, { status })
    : htmlReply(ok, error, status);

  let input;
  try {
    input = wantsJson ? await request.json() : Object.fromEntries(await request.formData());
  } catch {
    return reply(false, GENERIC_ERROR, 400);
  }

  // Spam trap filled: answer as if it worked so bots learn nothing
  if (clean(input.website)) return reply(true, null, 200);

  const data = {
    name: clean(input.name),
    email: clean(input.email),
    company: clean(input.company),
    message: String(input.message || '').trim(),
    urgency: clean(input.urgency)
  };
  const invalid = validate(data);
  if (invalid) return reply(false, invalid, 400);

  if (!env.RESEND_API_KEY || !env.CONTACT_FROM) {
    console.error('contact: RESEND_API_KEY or CONTACT_FROM is not set');
    return reply(false, GENERIC_ERROR, 503);
  }

  const urgency = URGENCY[data.urgency];
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.CONTACT_FROM,
      to: [env.CONTACT_TO || 'contact@appelhaken.com'],
      reply_to: data.email,
      subject: `Website inquiry: ${data.company} (${urgency})`,
      text: [
        `Name: ${data.name}`,
        `Email: ${data.email}`,
        `Company: ${data.company}`,
        `Timing: ${urgency}`,
        '',
        'What’s broken / what’s urgent:',
        data.message
      ].join('\n')
    })
  });
  if (!res.ok) {
    console.error('contact: Resend responded', res.status, await res.text());
    return reply(false, GENERIC_ERROR, 502);
  }
  return reply(true, null, 200);
}

export function onRequest() {
  return new Response('Method Not Allowed', { status: 405, headers: { 'Allow': 'POST' } });
}

// Single-line fields: trim and drop line breaks (they end up in the email subject)
function clean(value) {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim();
}

function validate(d) {
  if (!d.name || !d.email || !d.company || !d.message) return 'Please fill in every field except timing.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return 'Please enter a valid work email.';
  for (const key in LIMITS) {
    if (d[key].length > LIMITS[key]) return `That ${key} is too long.`;
  }
  if (!(d.urgency in URGENCY)) return 'Please choose a timing option from the list.';
  return null;
}

// Response for browsers posting the form without JavaScript
function htmlReply(ok, error, status) {
  const body = ok
    ? '<h1 class="section-heading">Got it.</h1><p>We’ll come back with a clear next step — not a deck.</p><p>We reply within one business day.</p>'
    : `<h1 class="section-heading">That didn’t go through.</h1><p>${escapeHtml(error)} Go back and try again, or email <a href="mailto:contact@appelhaken.com">contact@appelhaken.com</a>.</p>`;
  return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>${ok ? 'Request received' : 'Request not sent'} — Appel Haken, LLC</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=DM+Sans:wght@300;400;500&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/styles.css">
</head>
<body>
<main class="simple-page">
  <a href="/" class="simple-page-logo"><img src="/assets/logo.jpg" alt="Appel Haken, LLC home"></a>
  ${body}
  <a href="/" class="cta-primary">Return to the homepage</a>
</main>
</body>
</html>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
