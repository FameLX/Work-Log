/**
 * Work Log AI proxy — Cloudflare Worker (Groq backend)
 * ------------------------------------------------------------------
 * A thin, CORS-enabled pass-through in front of Groq's OpenAI-compatible
 * API. The Work Log frontend POSTs a standard chat-completions body here;
 * this Worker injects the secret Groq key and forwards it to Groq, then
 * returns Groq's response verbatim.
 *
 * Why a proxy: the Work Log app is a static site (GitHub Pages) with no
 * backend, so it can't keep an API key secret. This Worker holds the ONE
 * key server-side, so no user needs their own and the key never ships to
 * the browser.
 *
 * Endpoints:
 *   POST /   → forwards {messages, model, tools, ...} to Groq
 *              chat/completions (this is what the assistant uses).
 *   GET  /   → returns Groq's model list, so the app can populate its
 *              model-picker with whatever is actually available.
 *
 * ── Secrets / variables (set in the Cloudflare dashboard) ──
 *   GROQ_API_KEY   (required, secret)  Free key from
 *                                      https://console.groq.com/keys
 *   GROQ_MODEL     (optional, plain)   If set, LOCKS every request to this
 *                                      model (ignores what the app sends).
 *                                      Leave unset to let the app's model
 *                                      picker choose. e.g.
 *                                      "openai/gpt-oss-120b".
 *   PROXY_TOKEN    (optional, secret)  If set, requests must send a
 *                                      matching  x-proxy-token  header.
 *   ALLOWED_ORIGIN (optional, plain)   Comma-separated allowed origins.
 *                                      Defaults to the Work Log Pages sites
 *                                      + local file testing.
 * ------------------------------------------------------------------
 */

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile'; // safe fallback if none sent

const DEFAULT_ALLOWED = [
  'https://famelx.github.io', // production + beta Pages (same origin)
  'http://localhost',
  'http://127.0.0.1',
  'null',                     // file:// origin, for local testing
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGIN
      ? env.ALLOWED_ORIGIN.split(',').map(s => s.trim())
      : DEFAULT_ALLOWED);
    const allowOrigin = allowed.includes(origin) ? origin : allowed[0];
    const cors = {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-proxy-token',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // Optional shared-token gate (basic abuse protection)
    if (env.PROXY_TOKEN) {
      const tok = request.headers.get('x-proxy-token') || '';
      if (tok !== env.PROXY_TOKEN) {
        return json({ error: 'Unauthorized' }, 401, cors);
      }
    }

    if (!env.GROQ_API_KEY) {
      return json({ error: 'Server not configured: GROQ_API_KEY missing' }, 500, cors);
    }

    const auth = { 'Authorization': 'Bearer ' + env.GROQ_API_KEY };

    // GET → list available models (for the app's model picker)
    if (request.method === 'GET') {
      try {
        const r = await fetch(`${GROQ_BASE}/models`, { headers: auth });
        const data = await r.text();
        return new Response(data, {
          status: r.status,
          headers: { 'Content-Type': 'application/json', ...cors },
        });
      } catch (e) {
        return json({ error: 'Upstream request failed: ' + e.message }, 502, cors);
      }
    }

    if (request.method !== 'POST') {
      return json({ error: 'GET or POST only' }, 405, cors);
    }

    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'Invalid JSON body' }, 400, cors); }

    if (!body || !Array.isArray(body.messages)) {
      return json({ error: 'Missing "messages" array in request body' }, 400, cors);
    }

    // GROQ_MODEL, if set, locks the model server-side; otherwise honour the
    // model the app requested, falling back to a safe default.
    if (env.GROQ_MODEL) body.model = env.GROQ_MODEL;
    else if (!body.model) body.model = DEFAULT_MODEL;

    try {
      const r = await fetch(`${GROQ_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify(body),
      });
      const data = await r.text(); // pass through verbatim (incl. errors)
      return new Response(data, {
        status: r.status,
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    } catch (e) {
      return json({ error: 'Upstream request failed: ' + e.message }, 502, cors);
    }
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
