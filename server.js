import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dns from 'node:dns/promises';
import net from 'node:net';
import { chromium } from 'playwright';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_SECRET = process.env.ADMIN_SECRET;

const SUPABASE_URL = process.env.SUPABASE_URL || null;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || null;


function supabaseForRequest(req) {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null;

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);

  const client = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  return client;
}

async function getAuthedUser(supabaseClient) {
  if (!supabaseClient) return null;

  const { data, error } = await supabaseClient.auth.getUser();

  if (error || !data?.user) return null;

  return data.user;
}
// ---------- Security: Headers ----------
// Helmet sets a batch of well-known HTTP security headers (X-Content-Type-Options,
// X-Frame-Options, etc.) with sane defaults. One line, meaningful protection.
app.use(helmet({
  contentSecurityPolicy: false, // left off for now since the frontend uses inline scripts/styles
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Security: Admin authentication ----------
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const token = authHeader.slice(7);
  if (token !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Invalid authentication credentials.' });
  }

  next();
}

// ---------- Security: Rate limiting ----------
// Each limiter tracks requests per IP over a time window. Costlier or
// more sensitive endpoints get tighter limits.
const scanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many scan requests. Please try again later.' },
});

const explainLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI explanation requests. Please try again later.' },
});

const waitlistLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many waitlist requests. Please try again later.' },
});

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
  return Math.max(0, Math.round(100 - penalty));
}

// ---------- Security: SSRF protection ----------
// A hostname string check alone isn't enough — an attacker could use a
// normal-looking domain that *resolves* to an internal address (DNS
// rebinding). So we resolve the hostname first and check the real IP.
function isPrivateOrReservedIp(ip) {
  if (ip === '::1') return true;
  if (ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) return true;

  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 127) return true;                       // loopback
    if (a === 10) return true;                          // private
    if (a === 172 && b >= 16 && b <= 31) return true;    // private
    if (a === 192 && b === 168) return true;             // private
    if (a === 169 && b === 254) return true;             // link-local / cloud metadata
    if (a === 0) return true;                            // "this network"
  }
  return false;
}

async function isSafeScanUrl(input) {
  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    return { safe: false, reason: 'Please provide a valid http(s) URL.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, reason: 'Only http:// and https:// URLs are allowed.' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.local')) {
    return { safe: false, reason: 'Local hostnames are not allowed.' };
  }

  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    return { safe: false, reason: 'Could not resolve this hostname.' };
  }

  for (const { address } of addresses) {
    if (isPrivateOrReservedIp(address)) {
      return { safe: false, reason: 'This URL resolves to a private or internal address.' };
    }
  }

  return { safe: true };
}

// ---------- Routes ----------

app.get('/api/config', (_req, res) => {
  res.json({
    supabaseUrl: SUPABASE_URL,
    supabasePublishableKey: SUPABASE_PUBLISHABLE_KEY,
  });
});

/**
 * POST /api/scan { url }
 * Loads the page in headless Chromium, runs axe-core against it,
 * and returns a transparent score + the list of violations.
 */
app.post('/api/scan', scanLimiter, async (req, res) => {
  const { url } = req.body || {};

  const supa = supabaseForRequest(req);
  const user = await getAuthedUser(supa);

  if (!url) {

    return res.status(400).json({ error: 'Please provide a valid http(s) URL.' });
  }

  const safety = await isSafeScanUrl(url);
  if (!safety.safe) {
    return res.status(400).json({ error: safety.reason });
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

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

let saved = false;

if (user) {
  const { error: insertError } = await supa
    .from('scans')
    .insert({
      user_id: user.id,
      url,
      score: scoreFromViolations(violations),
      violations_count: violations.reduce(
        (sum, v) => sum + v.nodes.length,
        0
      ),
      results: { violations },
    });

  if (insertError) {
    console.error('Could not save scan:', insertError.message);
  } else {
    saved = true;
  }
}

res.json({
  url,
  scannedAt: new Date().toISOString(),
  score: scoreFromViolations(violations),
  totalIssues: violations.reduce(
    (sum, v) => sum + v.nodes.length,
    0
  ),
  violations,
  saved,
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
app.post('/api/explain', explainLimiter, async (req, res) => {
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
app.post('/api/waitlist', waitlistLimiter, async (req, res) => {
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
    console.error('Confirmation email failed:', err.message);
  }

  res.json({ success: true, alreadyOnList, emailSent: emailStatus.sent });
});

/**
 * GET /api/waitlist
 * Requires: Authorization: Bearer YOUR_ADMIN_SECRET
 */
app.get('/api/waitlist', requireAdmin, (_req, res) => {
  const list = readWaitlist();
  res.json({ count: list.length, entries: list });
});

app.get('/api/scans', async (req, res) => {
  const supa = supabaseForRequest(req);
  const user = await getAuthedUser(supa);

  if (!user) {
    return res.status(401).json({
      error: 'Please sign in to view your scan history.',
    });
  }

  const { data, error } = await supa
    .from('scans')
    .select('id, url, score, violations_count, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Could not load scans:', error.message);

    return res.status(500).json({
      error: 'Could not load your scan history right now.',
    });
  }

  res.json({ scans: data });
});
app.get('/api/scans/:id', async (req, res) => {
  const supa = supabaseForRequest(req);
  const user = await getAuthedUser(supa);

  if (!user) {
    return res.status(401).json({
      error: 'Please sign in to view this report.',
    });
  }

  const { data, error } = await supa
    .from('scans')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !data) {
    return res.status(404).json({
      error: 'Scan not found.',
    });
  }

  res.json(data);
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Axditra running at http://localhost:${PORT}`);
  if (!anthropic) {
    console.warn('⚠️  ANTHROPIC_API_KEY not set — /api/explain will be disabled until you add one to .env');
  }
});
