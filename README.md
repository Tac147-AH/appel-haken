# appelhaken.com

Static marketing site for Appel Haken, LLC, deployed on Cloudflare Pages from this repo. It has no build step: the repo root is the published directory.

| Path | What it is |
| --- | --- |
| `index.html` | Homepage: hero, results, services, approach, case studies, founder, email CTA |
| `services/`, `about/`, `faq/`, `insights/`, `contact/` | Content pages (one `index.html` each) |
| `css/styles.css`, `js/main.js` | Shared styles and behaviour for every page. Browsers cache them for up to 4 hours, so **bump the `?v=` value on every page's `<link>`/`<script>` tag whenever either file changes** |
| `llms.txt`, `sitemap.xml`, `robots.txt` | Search and AI-crawler metadata |
| `scripts/validate_site.py` | Run `python3 scripts/validate_site.py` before pushing: checks links, titles, descriptions, canonicals, JSON-LD |
| `404.html` | Served by Pages for unmatched paths |
| `favicon.ico`, `assets/` | Icons, logo, 1200×630 `og-image.jpg` |

## Contact form (tabled)

The contact form is off for now; "Start the Conversation" goes to an email card (`#request`) on the homepage and `/contact/`.

The full form is in commit `8cf0234` on `site-restore-v2`: markup in `index.html` and `contact/index.html`, `functions/api/contact.js` (Cloudflare Pages Function, sends through Resend), `_routes.json`, and `privacy/index.html`. `js/main.js` still handles the form if it is restored.

Already done: appelhaken.com is verified in Resend, and `RESEND_API_KEY` and `CONTACT_FROM` are set for **Production** in Cloudflare. Still needed before restoring: the same two variables under **Preview** (so the branch preview can be tested), a decision on "We reply within one business day", and review of the privacy notice.

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

Whichever you enable, name it in the privacy notice when the form returns.

## Waiting on Brian

Everything that needs a decision or approval is marked in the source; `grep -rn "TODO" *.html js` lists it all.

- [ ] Founder headshot (replaces the "BD" monogram, `index.html` founder section)
- [ ] Contact form: see "Contact form (tabled)" above
- [ ] www → apex redirect rule (above)
- [ ] Optional: calendar URL and analytics provider
