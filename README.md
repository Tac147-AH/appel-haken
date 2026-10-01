# appelhaken.com

Static marketing site for Appel Haken, LLC, deployed on Cloudflare Pages from this repo. It has no build step: the repo root is the published directory.

| Path | What it is |
| --- | --- |
| `index.html`, `css/styles.css`, `js/main.js` | The one-page site |
| `privacy.html` | `/privacy` notice linked from the contact form (stub, `noindex` until reviewed) |
| `404.html` | Served by Pages for unmatched paths |
| `functions/api/contact.js` | Pages Function behind the contact form (`POST /api/contact`) |
| `_routes.json` | Runs Functions only for `/api/*`; everything else stays static |
| `favicon.ico`, `assets/` | Icons, logo, 1200×630 `og-image.jpg` |

## Contact form

The primary CTAs scroll to the form in `#contact`. It posts to `/api/contact`, which validates the input, discards spam-trap hits, and emails the inquiry to the inbox through [Resend](https://resend.com). Reply-to is the sender, so you can reply straight from your inbox. If JavaScript is off, the browser posts the same form and gets a plain HTML confirmation page.

Until the variables below are set, the endpoint returns 503 and the form shows an error that points to contact@appelhaken.com.

### One-time setup

1. In Resend, add the domain `appelhaken.com` and create the DNS records it lists in Cloudflare DNS. Resend sends from a `send.` subdomain, so existing email records such as SPF are not affected.
2. Create a Resend API key with "Sending access" only.
3. In Cloudflare, open **Workers & Pages → (this project) → Settings → Variables and Secrets** and add these for **Production** (and Preview if you want previews to send):

| Name | Type | Value |
| --- | --- | --- |
| `RESEND_API_KEY` | **Secret** | The Resend API key |
| `CONTACT_FROM` | Text | e.g. `Appel Haken Website <website@appelhaken.com>` (must be on the verified domain) |
| `CONTACT_TO` | Text, optional | Inbox for inquiries; defaults to `contact@appelhaken.com` |

4. Redeploy so the Function picks up the variables, then send a test inquiry from the live site.

Never commit the API key. It belongs only in the Cloudflare dashboard (or in a local `.dev.vars` file, which is git-ignored).

To run the site and Function locally: put the variables in `.dev.vars`, then run `npx wrangler pages dev .`.

Spam protection is a hidden honeypot field. If spam gets through, add Cloudflare Turnstile: a widget in the form plus a check in `contact.js`.

### Optional "Book 20 min" link

Set `CONFIG.calendarUrl` at the top of `js/main.js` to a scheduling link. The link next to the email fallback stays hidden while that value is empty.

## www → apex redirect (still to do in Cloudflare)

The canonical host is `https://appelhaken.com/`, but `www.appelhaken.com` currently also returns 200. Pages' `_redirects` file can't match on hostname, so add the redirect at the zone level:

**Cloudflare dashboard → appelhaken.com → Rules → Redirect Rules → Create rule** (or use the "Redirect from WWW to root" template):

- When: `Hostname` equals `www.appelhaken.com`
- Then: Dynamic redirect to `concat("https://appelhaken.com", http.request.uri.path)`, status **301**, preserve query string

The `www` DNS record must be proxied (orange cloud) for the rule to run. Check it with `curl -I https://www.appelhaken.com/`, which should return `301` with `location: https://appelhaken.com/`.

## Analytics

`js/main.js` has a `track()` hook that sends two events:

- `CTA Open` (`location`: nav, mobile-menu, hero, mid-page, float)
- `Form Submit Success` (`timing`: this-week, this-month, exploring, not-specified)

It forwards them to Plausible or to Cloudflare Zaraz, whichever is loaded, and does nothing otherwise. Both are cookieless.

- **Plausible:** add the site in Plausible, uncomment the snippet in the `<head>` of `index.html`, and create goals for the two event names.
- **Cloudflare Zaraz:** enable it for the zone. Events arrive through `zaraz.track()`; map them to a tool in the Zaraz dashboard.
- Cloudflare Web Analytics can run alongside either for page views, but it does not record custom events.

Whichever you enable, name it in `privacy.html`.

## Waiting on Brian

Everything that needs a decision or approval is marked in the source; `grep -rn "TODO" *.html js` lists it all.

- [ ] Founder headshot (replaces the "BD" monogram), bio and credential chips (`index.html`, founder section)
- [ ] Result cards: client names or more specific industries if any are publishable; the industry and stakes for the 12–37% card
- [ ] Privacy notice: retention period and analytics provider, then remove `noindex` and add `/privacy` to `sitemap.xml`
- [ ] Resend and Cloudflare variables (above), then a live test submission
- [ ] www → apex redirect rule (above)
- [ ] Optional: calendar URL and analytics provider
