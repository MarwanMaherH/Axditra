# Axditra

**AI-powered accessibility auditor — scan, explain, and fix WCAG issues in one sitting.**

Most accessibility tools tell you what's wrong on your site. Axditra tells you what's wrong, explains it in plain language, and writes the fix.

## How it works

1. **Scan** — paste any URL, get a live audit against WCAG 2.1 A/AA using axe-core in headless Chromium
2. **Score** — a transparent 0-100 score with full visibility into how it's calculated
3. **Explain** — every issue gets a plain-language explanation via Claude, not just a rule ID
4. **Fix** — copy the corrected code directly, ready to paste into your project

## Tech stack

- **Backend:** Node.js, Express
- **Scanning engine:** Playwright (headless Chromium) + axe-core
- **AI explanations & fixes:** Anthropic Claude API
- **Waitlist:** file-based storage, optional Resend integration for confirmation emails

## Status

🚧 Early build — actively in development. Core scan engine and waitlist are working; AI explanation flow is implemented and being tested; GitHub PR integration and public deployment are next.

## Why I'm building this

Every developer has run an accessibility scan, seen a wall of errors, and closed the tab — because the report told you *what* was wrong, never *how* to fix it. Axditra closes that gap.

Building this in public. Follow along:
[X](https://x.com/MarwanMaherH) 
·
[LinkedIn](https://www.linkedin.com/in/marwanmaher)

---

Built by [Marwan Maher](https://github.com/MarwanMaherH)
