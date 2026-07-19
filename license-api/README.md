# license-api

Node.js/Express backend + dashboard for the `licensing-sdk` FiveM resource.
This is **not** a FiveM resource — it's a normal web app you deploy
separately (a small VPS is plenty; it doesn't need to be near your game
servers).

## 1. Requirements

- Node.js 18+
- A place to run a long-lived Node process (VPS, Railway, Render, etc.)
- A domain/subdomain pointing at it (recommended: put it behind HTTPS via
  nginx + Let's Encrypt, or a platform that does this for you)

## 2. Install

```bash
cd license-api
npm install
cp .env.example .env
```

Edit `.env` and set a strong `ADMIN_TOKEN`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the output in as `ADMIN_TOKEN`.

## 3. Run it

```bash
npm start
```

By default it listens on port 3000 (change via `PORT` in `.env`). For
production, run it under a process manager so it survives reboots/crashes:

```bash
npm install -g pm2
pm2 start server.js --name license-api
pm2 save
```

Put it behind a reverse proxy (nginx/Caddy) with HTTPS. **This matters**:
`Config.ApiUrl` in the FiveM resource should be the HTTPS URL, and
`app.set('trust proxy', true)` in `server.js` is already set so the
correct client IP is recorded even behind a proxy — just make sure your
proxy forwards the `X-Forwarded-For` header (nginx does this by default
with `proxy_pass`).

## 4. Using the dashboard

1. Go to `https://your-domain.com/dashboard`
2. Paste your `ADMIN_TOKEN` to log in
3. **Create a product** — this is your script (e.g. "Advanced Garage
   System"). You get a `Product Key` — put this in every copy of
   `licensing-sdk/config.lua` you ship as `Config.ProductKey`.
4. **Create a license** per customer/sale — you get a `License Key`. Give
   this to that specific customer to put in their `Config.LicenseKey`.
5. Licenses auto-bind to the IP of the first server that validates them.
   Leaked/duplicated copies running elsewhere will fail validation and
   show up in that license's **Logs**.
6. To cut someone off, click **Revoke** — their server locks down within
   one heartbeat interval (default 10 minutes, configurable per-copy in
   their `config.lua`, though obviously a pirate won't turn that down for
   you — the enforcement happens API-side regardless).

## 5. Data storage

Everything is stored in a local SQLite file, `licenses.db`, created
automatically on first run. Back this file up — it's your entire customer
license list. There's no external database to configure for a
single-server MVP.

## 6. Security notes

- `ADMIN_TOKEN` is the only thing protecting the dashboard/admin API.
  Treat it like a password — long, random, not reused, not committed to
  git.
- `/api/validate` is intentionally public/unauthenticated — that's the
  endpoint your customers' FiveM servers call. It only ever returns
  `{ valid: true/false, reason }`, never any customer data.
- Consider rate-limiting `/api/validate` at the reverse-proxy level if you
  expect abuse (e.g. someone hammering it trying to brute-force license
  keys) — not included here to keep the MVP simple, but `express-rate-limit`
  is a one-line addition if you want it later.