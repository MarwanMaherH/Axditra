<p align="center">
  <img src="assets/logo.png" width="120" alt="Axditra Logo"/>
</p>

<h1 align="center">AXDITRA</h1>

<p align="center">
<b>AI-Powered Accessibility Auditor</b><br/>
Scan • Understand • Fix Accessibility Faster
</p>

<p align="center">
<a href="https://axditra.up.railway.app"><b>🔗 Try it live — axditra.up.railway.app</b></a>
</p>

<p align="center">
<img src="https://img.shields.io/badge/Node.js-22.x-339933?style=for-the-badge&logo=node.js&logoColor=white">
<img src="https://img.shields.io/badge/Express-Backend-000000?style=for-the-badge&logo=express">
<img src="https://img.shields.io/badge/Playwright-Chromium-2EAD33?style=for-the-badge&logo=playwright">
<img src="https://img.shields.io/badge/axe--core-WCAG-blue?style=for-the-badge">
<img src="https://img.shields.io/badge/Claude-AI-7C3AED?style=for-the-badge">
<img src="https://img.shields.io/badge/License-MIT-success?style=for-the-badge">
</p>

<p align="center">
<img src="assets/banner.png" width="100%">
</p>

---

## 📖 Overview

Most accessibility tools stop after telling developers **what's wrong**.

**Axditra** goes further: it scans any public website with **Playwright** and **axe-core**, explains every accessibility issue in plain English using **Claude AI**, and generates a ready-to-use HTML fix — all in one sitting, without digging through WCAG documentation.

---

## ✨ Features

| Feature | Description | Status |
|---|---|---|
| 🔍 Live Accessibility Scan | Scans any public URL using Playwright + axe-core against WCAG 2.1 A/AA | ✅ Live |
| 📊 Transparent Score | 0–100 score, weighted by issue severity — no black box | ✅ Live |
| 🤖 AI Explanations | Claude explains each issue in plain language, not just a rule ID | ✅ Live |
| 🛠 AI-Generated Fixes | Produces a corrected, copy-ready HTML snippet per issue | ✅ Live |
| 📧 Waitlist | Captures signups, optional Resend confirmation email | ✅ Live |
| 🔐 Hardened Backend | Rate limiting, admin-authenticated endpoints, SSRF protection, security headers | ✅ Live |
| ☁️ Public Deployment | Live on Railway, not just localhost | ✅ Live |
| 🔁 GitHub PR Generator | Open a real pull request with the fix instead of copy/paste | 🔄 Planned |
| 📈 Dashboard & Scan History | Save and revisit past scans | 🔄 Planned |

---

## ⚙️ How It Works

```text
           Website URL
                │
                ▼
      Playwright (Chromium)
                │
                ▼
          axe-core Scanner
                │
                ▼
     Accessibility Violations
                │
                ▼
          Claude AI Analysis
                │
                ▼
 Explanation + HTML Fix + Score
```

---

## 🔐 Security

Built with the assumption that this is a public-facing service from day one, not an afterthought:

- **Rate limiting** per endpoint (tighter limits on costlier routes — scanning launches a real browser, explanations cost API credits)
- **SSRF protection** — resolves the actual IP behind any submitted hostname and blocks private/internal ranges, not just a string match against `localhost`
- **Admin-authenticated waitlist** — signup data isn't publicly readable
- **Security headers** via Helmet

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Backend | Express |
| Browser Automation | Playwright |
| Accessibility Engine | axe-core |
| AI | Anthropic Claude |
| Hosting | Railway |
| Storage | JSON (file-based, MVP stage) |
| Email | Resend (optional) |

---

## 🚀 Quick Start

**Try it without installing anything:** [axditra.up.railway.app](https://axditra.up.railway.app)

**Or run it locally:**

```bash
git clone https://github.com/MarwanMaherH/Axditra.git
cd Axditra
npm install
npx playwright install chromium
cp .env.example .env
# add your ANTHROPIC_API_KEY and ADMIN_SECRET to .env
npm start
```

Open `http://localhost:3000/app.html`

---

## 📂 Project Structure

```
Axditra
├── assets/
│   ├── logo.png
│   ├── banner.png
│   └── marwan.jpg
├── public/
│   ├── index.html
│   └── app.html
├── server.js
├── package.json
├── README.md
└── .env.example
```

---

## 🗺 Roadmap

- ✅ Accessibility scanner (Playwright + axe-core)
- ✅ AI explanations + HTML fix generation
- ✅ Waitlist API
- ✅ Rate limiting, SSRF protection, admin auth, security headers
- ✅ Public deployment
- 🔄 GitHub Pull Request generator
- 🔄 Scan history & user accounts
- 🔄 Team collaboration
- 🔄 VS Code extension

---

## 💡 Why Axditra?

Traditional accessibility tools generate reports like:

```text
color-contrast
button-name
duplicate-id
aria-label
```

...and leave developers to search documentation and figure out the fix themselves. Axditra removes that step: plain-English explanations, AI-generated fixes, and a faster path to actually shipping accessible code.

---

## 👨‍💻 About the Creator

<p align="center">
<img src="assets/marwan.jpg" width="150" style="border-radius:50%;">
</p>

<p align="center">
<b>Marwan Maher</b><br/>
Founder of Axditra — Full-Stack & AI Developer, building in public from Egypt 🇪🇬
</p>

<p align="center">
<a href="https://github.com/MarwanMaherH">GitHub</a> ·
<a href="https://linkedin.com/in/MarwanMaherH">LinkedIn</a> ·
<a href="https://x.com/MarwanMaherH">X</a>
</p>

---

## 🤝 Contributing

Issues, feature requests, and pull requests are welcome — fork the repo and submit a PR.

## 📄 License

MIT License.

<p align="center">

⭐ **If this project is useful to you, consider giving it a star.**

</p>
