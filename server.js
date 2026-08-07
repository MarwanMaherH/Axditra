import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { chromium } from 'playwright';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// axe-core's built browser bundle — we inject this into the scanned page.
const AXE_SCRIPT = fs.readFileSync(
  path.join(__dirname, 'node_modules', 'axe-core', 'axe.min.js'),
  'utf-8'
);

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// Resend is optional — if no key is set, we still capture emails,
// we just skip sending the confirmation message.
const RESEND_API_KEY = process.env.RESEND_API_KEY || null;
const WAITLIST_FROM = process.env.WAITLIST_FROM_EMAIL || 'Axditra <onboarding@resend.dev>';

const DATA_DIR = path.join(__dirname, 'data');
const WAITLIST_FILE = path.join(DATA_DIR, 'waitlist.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(WAITLIST_FILE)) fs.writeFileSync(WAITLIST_FILE, '[]');

// ---------- Helpers ----------

function isValidEmail(input) {
  return typeof input === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

function readWaitlist() {
  try {
    return JSON.parse(fs.readFileSync(WAITLIST_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeWaitlist(list) {
  fs.writeFileSync(WAITLIST_FILE, JSON.stringify(list, null, 2));
}

async function sendConfirmationEmail(email) {
  if (!RESEND_API_KEY) return { sent: false, reason: 'RESEND_API_KEY not set' };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: WAITLIST_FROM,
      to: email,
      subject: "You're on the Axditra waitlist",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #17191D;">
          <h2 style="font-weight: 600;">You're on the list 🎉</h2>
          <p>Thanks for signing up for early access to Axditra — the accessibility scanner that goes from detection to a working fix in one sitting.</p>
          <p>We'll email you the moment your invite is ready. Until then, we're building in public — follow along for updates.</p>
          <p style="color:#7D8890; font-size: 13px; margin-top: 32px;">— The Axditra team</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Resend API error (${res.status}): ${detail}`);
  }
  return { sent: true };
}

/**
 * Turns axe-core's raw violation list into a 0-100 score.
 * Weighted by impact so a handful of "critical" issues hurt more
 * than a pile of "minor" ones — mirrors how a real audit reads.
 */
function scoreFromViolations(violations) {
  const weight = { critical: 10, serious: 6, moderate: 3, minor: 1 };
  let penalty = 0;
  for (const v of violations) {
    const w = weight[v.impact] || 2;
    penalty += w * v.nodes.length;
  }
  const score = Math.max(0, Math.round(100 - penalty));
  return score;
}

function isValidUrl(input) {
  try {
    const u = new URL(input);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// ---------- Routes ----------

/**
 * POST /api/scan { url }
 * Loads the page in headless Chromium, runs axe-core against it,
 * and returns a transparent score + the list of violations.
 */
app.post('/api/scan', async (req, res) => {
  const { url } = req.body || {};

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Please provide a valid http(s) URL.' });
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Inject axe-core into the page, then run it in-page.
    await page.addScriptTag({ content: AXE_SCRIPT });
    const results = await page.evaluate(async () => {
      // eslint-disable-next-line no-undef
      return await axe.run(document, {
        runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
      });
    });

    const violations = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      nodes: v.nodes.map((n) => ({
        html: n.html,
        target: n.target,
        failureSummary: n.failureSummary,
      })),
    }));

    res.json({
      url,
      scannedAt: new Date().toISOString(),
      score: scoreFromViolations(violations),
      totalIssues: violations.reduce((sum, v) => sum + v.nodes.length, 0),
      violations,
    });
  } catch (err) {
    console.error('Scan failed:', err.message);
    res.status(500).json({ error: 'Scan failed. The page may be unreachable, or took too long to load.', detail: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

/**
 * POST /api/explain { violation, node }
 * Sends a single failing node to Claude and asks for:
 *  - a plain-language explanation of the problem and who it affects
 *  - a corrected version of the exact HTML snippet
 * Returns strict JSON so the frontend can render it without guesswork.
 */
app.post('/api/explain', async (req, res) => {
  if (!anthropic) {
    return res.status(501).json({
      error: 'AI explanations are not configured. Set ANTHROPIC_API_KEY in your .env file.',
    });
  }

  const { violation, node } = req.body || {};
  if (!violation || !node || !node.html) {
    return res.status(400).json({ error: 'Missing violation or node data.' });
  }

  const prompt = `You are Axditra, an accessibility expert that explains WCAG issues in plain, friendly language and writes the exact fix.

Issue: ${violation.help} (${violation.id}, impact: ${violation.impact})
WCAG reference: ${violation.helpUrl}
Failure detail: ${node.failureSummary || 'n/a'}

Offending HTML:
${node.html}

Respond with ONLY a JSON object, no markdown fences, no preamble, in this exact shape:
{
  "explanation": "2-3 plain-language sentences: what's wrong and who it affects. No WCAG jargon unless necessary.",
  "fixedHtml": "the corrected HTML snippet, same element, minimal change",
  "whatChanged": "one short sentence describing the specific change made"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim()
      .replace(/^```json\s*|\s*```$/g, '');

    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err) {
    console.error('Explain failed:', err.message);
    res.status(500).json({ error: 'Could not generate an explanation right now.', detail: err.message });
  }
});

/**
 * POST /api/waitlist { email }
 * Stores the email locally (data/waitlist.json) and, if RESEND_API_KEY
 * is configured, sends a confirmation email. Works fine with no Resend
 * key set — it just captures the signup silently in that case.
 */
app.post('/api/waitlist', async (req, res) => {
  const { email } = req.body || {};

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const list = readWaitlist();
  const normalized = email.trim().toLowerCase();
  const alreadyOnList = list.some((entry) => entry.email === normalized);

  if (!alreadyOnList) {
    list.push({ email: normalized, joinedAt: new Date().toISOString() });
    writeWaitlist(list);
  }

  let emailStatus = { sent: false };
  try {
    emailStatus = await sendConfirmationEmail(normalized);
  } catch (err) {
    // Don't fail the signup just because the confirmation email failed —
    // the email is already saved to the waitlist either way.
    console.error('Confirmation email failed:', err.message);
  }

  res.json({ success: true, alreadyOnList, emailSent: emailStatus.sent });
});

/**
 * GET /api/waitlist
 * Quick way to check who's signed up during development.
 * Lock this down (or remove it) before this goes anywhere public.
 */
app.get('/api/waitlist', (_req, res) => {
  const list = readWaitlist();
  res.json({ count: list.length, entries: list });
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Axditra running at http://localhost:${PORT}`);
  if (!anthropic) {
    console.warn('⚠️  ANTHROPIC_API_KEY not set — /api/explain will be disabled until you add one to .env');
  }
});
