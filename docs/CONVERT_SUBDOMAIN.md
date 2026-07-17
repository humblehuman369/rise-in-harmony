# TrueHz Convert — Subdomain productization (Phase 4.2)

## Recommended layout

| Host | Role |
|------|------|
| `www.riseinharmony.com` | Main app (Studio, Library, TrueHz live) |
| `convert.riseinharmony.com` | Convert-focused entry (same app, forced path) |

## Implementation options

### A. Same deployment, DNS + reverse proxy (recommended)

1. Point `convert.riseinharmony.com` CNAME → same Railway/Manus service as web.
2. In the edge proxy or Express middleware, if `Host` starts with `convert.`:
   - On `/`, **302 → `/convert`**
   - Leave `/api/*`, assets, auth cookies shared (same parent domain if using `.riseinharmony.com` cookie domain).
3. Cookie domain: set session cookie `domain=.riseinharmony.com` so login works across hosts.

Pseudo-middleware:

```ts
app.use((req, res, next) => {
  const host = req.headers.host ?? "";
  if (host.startsWith("convert.") && (req.path === "/" || req.path === "")) {
    res.redirect(302, "/convert");
    return;
  }
  next();
});
```

### B. Separate Vite entry later

Only if Convert marketing needs a fully separate SPA. Higher cost; reuse tRPC + worker.

## Brand rules on subdomain

- Hero: “TrueHz Convert — retune your music by concert pitch”
- Always link to `/technology` for pure-tone TrueHz story
- Never claim mixed tracks are exact Hz

## Env

No new env required for option A. Optional:

```
CONVERT_PUBLIC_HOST=convert.riseinharmony.com
```

Use in email deep links if you want job-ready mail to open the subdomain.
