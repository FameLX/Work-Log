# Work Log AI Proxy (Cloudflare Worker → Groq)

A tiny backend that lets the Work Log app use AI **without every user needing
their own API key**. It holds one free Groq key server-side and forwards
requests from the app to Groq's OpenAI-compatible API.

- Frontend (Work Log on GitHub Pages) → **this Worker** → Groq
- The key lives only in Cloudflare, never in anyone's browser.
- Free: Cloudflare Workers (100k req/day) + Groq's free tier.

> Note: we use Groq (not Google Gemini) because your Google account's org
> policy blocks Gemini API keys. Groq has no such restriction and hosts
> strong open models with fast inference.

---

## One-time setup

### 1. Get a free Groq API key
1. Go to <https://console.groq.com/keys> (sign in with Google — no card needed).
2. **Create API Key** → copy it (starts with `gsk_…`).
   - If you already have a Groq key from the old in-app setup, you can reuse it.

### 2. Paste the Worker code
1. In the Cloudflare dashboard → your `worklog-ai` Worker → **Edit code**.
2. Select-all, delete, paste the entire contents of [`worker.js`](./worker.js).
3. **Deploy**.

### 3. Add the secret key
1. Worker → **Settings** → **Variables and Secrets**.
2. Add a **Secret**:
   - Name: `GROQ_API_KEY`
   - Value: the `gsk_…` key from step 1
3. *(Optional)* Add a plain **Variable** `GROQ_MODEL` to lock everyone to one
   model, e.g. `openai/gpt-oss-120b`. Leave it unset to let the app's model
   picker choose.
4. **Deploy** again so the secret takes effect.

### 4. Get the Worker URL
It looks like:

```
https://worklog-ai.<your-subdomain>.workers.dev
```

Copy it — that URL goes into the Work Log app (one constant).

### 5. Quick test (optional)
```bash
# Chat test
curl -X POST https://worklog-ai.<your-subdomain>.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Reply with just OK"}]}'

# See which models are available
curl https://worklog-ai.<your-subdomain>.workers.dev
```
A JSON response containing `"OK"` means it works.

---

## Model options (free on Groq)
Set `GROQ_MODEL`, or pick in the app once it lists them. Strong choices:

- `openai/gpt-oss-120b` — OpenAI's open model; excellent tool use
- `moonshotai/kimi-k2-instruct` — very capable, strong at agentic/tool tasks
- `meta-llama/llama-4-maverick-17b-128e-instruct` — Llama 4
- `llama-3.3-70b-versatile` — the current default (safe fallback)

## Hardening (optional, later)
- **Shared token:** add secret `PROXY_TOKEN`; the app then sends a matching
  `x-proxy-token` header. Blocks casual abuse of your quota.
- **Origin lock:** set `ALLOWED_ORIGIN` to `https://famelx.github.io`.
- **Rate limiting:** Cloudflare dashboard → the Worker → add a rate-limit rule.
