# Axditra — MVP

Scan a live page with axe-core, get a transparent score, and turn every
violation into a plain-language explanation plus a copy-pasteable fix.

## What's in here

- `server.js` — Express backend. `/api/scan` runs axe-core against a URL in
  headless Chromium (via Playwright). `/api/explain` sends one violation to
  Claude and gets back a plain-language explanation + fixed HTML.
- `public/app.html` — the scanning UI (paste a URL, see results, copy fixes).
- `public/index.html` *(optional)* — drop your marketing landing page here if
  you want `/` to serve it instead of the app.

## Setup

```bash
npm install
npx playwright install chromium   # downloads the headless browser binary
cp .env.example .env              # then add your ANTHROPIC_API_KEY
npm start
```

Open **http://localhost:3000/app.html**.

## Notes on this build

- This was built without live network access in the environment that wrote
  it, so it has **not been run end-to-end yet**. The syntax has been checked
  (`node --check server.js` passes), but you should smoke-test the two
  endpoints yourself before treating this as demo-ready:
  1. `npm start`, then scan a real URL from the UI.
  2. Click "Explain & generate fix" on one issue and confirm the AI response
     comes back and parses correctly.
- If a scan times out on a heavy page, raise the `timeout` value in
  `page.goto()` inside `server.js`.
- The score formula in `scoreFromViolations()` is a starting point — a
  critical issue costs 10 points per node, serious 6, moderate 3, minor 1,
  floored at 0. Tune the weights once you have real audits to compare against.
- `/api/explain` calls `claude-sonnet-4-6`. Swap the model string in
  `server.js` if you want to use a different one.

## Waitlist

`POST /api/waitlist { email }` saves the email to `data/waitlist.json` on
the server (created automatically on first run) and, if you've set
`RESEND_API_KEY` in `.env`, sends a confirmation email via
[Resend](https://resend.com) — free tier covers 100 emails/day, no
credit card needed to start.

- No `RESEND_API_KEY` set → signups still get saved, no email is sent.
  Nothing breaks.
- `GET /api/waitlist` lists everyone who's signed up so far — handy while
  testing, but **lock this down or remove it before deploying publicly**,
  since right now anyone who finds the URL can see every email on the list.
- If you want a real domain in the "from" address instead of
  `onboarding@resend.dev`, verify a domain in the Resend dashboard first,
  then update `WAITLIST_FROM_EMAIL` in `.env`.

This is intentionally file-based rather than a full database — fine for the
first hundred signups. Move to SQLite or Postgres once volume picks up.

## Next steps toward the full MVP

1. ~~Wire the landing page's "Join the waitlist" CTA to an actual mailing
   list~~ — done, see the Waitlist section above.
2. Add a "Copy PR" flow: instead of just copying the fixed snippet, open a
   real pull request against a connected GitHub repo (this is the "PR"
   half of the "detection to Pull Request" promise — not built yet).
3. Persist scans (even to a simple SQLite file) so you can show "return
   users" and "time-to-first-fix" — the two brand metrics from the strategy
   doc that need real data to track.
4. Rate-limit `/api/scan` and `/api/explain` before this is public — a
   naive open endpoint that launches headless Chromium on request is easy
   to abuse.
