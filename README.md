<div align="center">

<img src="assets/logo.png" alt="Axditra Logo" width="110"/>

# AXDITRA

### AI-Powered Accessibility Auditor

**Scan • Understand • Fix Accessibility Faster**

<p>
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/Express-Backend-black?style=for-the-badge&logo=express"/>
  <img src="https://img.shields.io/badge/Playwright-Chromium-45ba63?style=for-the-badge&logo=playwright&logoColor=white"/>
  <img src="https://img.shields.io/badge/Claude-AI-orange?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/WCAG-2.1-blue?style=for-the-badge"/>
</p>

<p>

**AI-powered accessibility scanner that doesn't just detect issues—it explains them and generates production-ready fixes.**

</p>

---

### 🚀 Coming Soon

Website Demo • GitHub Pull Requests • User Dashboard • Cloud Deployment

</div>

---

# 📖 Overview

Modern accessibility tools stop after showing you **what is wrong**.

**AXDITRA** goes much further.

It scans any website using **axe-core**, explains every accessibility issue in plain English using **Claude AI**, then generates code fixes developers can copy directly into their projects.

Instead of spending hours reading WCAG documentation, developers receive an explanation they actually understand.

---

# ✨ Features

✅ Live Accessibility Scanning

✅ WCAG 2.1 A / AA Validation

✅ AI-Powered Explanations

✅ AI Generated HTML Fixes

✅ Accessibility Score (0–100)

✅ Copy Ready Code

✅ Waitlist API

✅ Optional Email Confirmation

---

# ⚡ How It Works

```text
          Website URL
               │
               ▼
        Playwright Browser
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
     Human Explanation + HTML Fix
```

---

# 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js |
| Framework | Express |
| Browser | Playwright |
| Scanner | axe-core |
| AI | Claude API |
| Storage | JSON |
| Email | Resend |

---

# 🚀 Quick Start

### Clone

```bash
git clone https://github.com/MarwanMaherH/Axditra.git

cd Axditra
```

### Install

```bash
npm install
```

### Install Chromium

```bash
npx playwright install chromium
```

### Configure Environment

```bash
cp .env.example .env
```

Add your Claude API Key

```env
ANTHROPIC_API_KEY=YOUR_API_KEY
```

Start the server

```bash
npm start
```

Open

```
http://localhost:3000/app.html
```

---

# 📂 Project Structure

```
Axditra
│
├── public/
│   ├── index.html
│   └── app.html
│
├── server.js
├── package.json
├── README.md
└── .env.example
```

---

# 🎯 Roadmap

- ✅ Accessibility Scanner

- ✅ AI Explanations

- ✅ AI HTML Fixes

- ✅ Waitlist

- 🔄 Authentication

- 🔄 User Dashboard

- 🔄 GitHub Pull Request Generator

- 🔄 Scan History

- 🔄 Team Collaboration

- 🔄 Cloud Deployment

---

# 💡 Why AXDITRA?

Most accessibility reports look like this:

```
color-contrast
aria-label
button-name
duplicate-id
```

Developers then spend time searching documentation just to understand the issue.

AXDITRA eliminates that process.

Instead of error codes, developers receive:

- Plain-English explanations
- Corrected HTML
- Accessibility best practices
- Faster development workflow

---

# 👨‍💻 About the Creator

<div align="center">

<img src="assets/marwan.jpg" width="170" style="border-radius:50%;"/>

## Marwan Maher

**Software Engineer**

Building developer tools powered by AI.

Making accessibility easier for every developer.

### Connect

X

https://x.com/MarwanMaherH

LinkedIn

https://linkedin.com/in/marwanmaher

GitHub

https://github.com/MarwanMaherH

</div>

---

# 🤝 Contributing

Contributions, feature requests and ideas are always welcome.

Feel free to fork the project and open a Pull Request.

---

# 📄 License

MIT License

---

<div align="center">

## ⭐ If you like this project, consider giving it a Star.

Made with ❤️ by Marwan Maher

</div>