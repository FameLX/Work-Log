// ── AI Chat Panel with Tool-Calling Loop ────────────────────────────────────
// A sliding chat panel that talks to any Groq/OpenAI-compatible chat-
// completions endpoint (POST { model, messages, tools, tool_choice }) and
// supports the `tools` / `tool_calls` "agentic" protocol: when the model
// replies with tool_calls instead of text, the caller's tools are executed
// locally and the results are fed back in, looping until a final text reply
// (or a step cap is hit). Extracted and generalised from Work Log's AI panel
// — the tool registry is NOT hardcoded here; pass your own via `tools` /
// `executeTool`. Depends on ai-chat-panel.css. Builder pattern — call once
// per panel instance, keep the returned handle. Plain vanilla JS, no deps.
//
// Usage:
//   const chat = createAIChatPanel({
//     endpoint: 'https://api.groq.com/openai/v1/chat/completions', // any compatible URL
//     apiKey: 'gsk_...',        // string, OR a getter: () => key | Promise<key>
//     model: 'llama-3.3-70b-versatile',
//     systemPrompt: 'You are a helpful assistant for ...',   // string OR () => string|Promise<string>
//     tools: [ { type:'function', function:{ name, description, parameters } } ], // OpenAI tool-schema, optional
//     executeTool: (name, args) => { /* run it, return a result (sync or Promise) */ },
//   });
//   container.appendChild(chat.el);
//   openBtn.addEventListener('click', () => chat.toggle());
//
// Full options (only `endpoint` and `model` are required):
//   endpoint        string, required — chat-completions URL
//   model           string, required — model id
//   apiKey          string | () => string|Promise<string>, optional — sent as
//                   `Authorization: Bearer <key>`; omit if your endpoint is a
//                   proxy that injects its own auth server-side
//   systemPrompt    string | () => string|Promise<string>, optional — re-read
//                   on every send, so a function can inject fresh context
//   tools           array, optional — OpenAI tool-schema `function` entries
//   executeTool     (name, args) => result|Promise<result>, optional but
//                   required if `tools` is non-empty; not hardcoded to any
//                   app's tool set — the caller owns this registry entirely
//   maxSteps        number, default 6 — caps the send -> tool_calls -> send loop
//   temperature     number, default 0.3
//   headers         object, optional — extra fetch headers merged in
//   title           string, default 'AI Assistant'
//   badgeText       string, default 'Ready'
//   icon            string, optional — raw inner SVG markup for the header icon
//   welcomeMessage  string, default a generic greeting
//   placeholder     string, default 'Ask anything…'
//   suggestions     string[], optional — rendered as clickable suggestion chips
//   showClear       boolean, default true — show the "clear chat" header button
//   showClose       boolean, default true — show the close (X) header button
//   loadingText / stoppedText / networkErrorText — override the built-in status strings
//
// Public API (per instance, returned by createAIChatPanel):
//   el                    -> the panel root element; appendChild it somewhere
//   open() / close()      -> slide the panel in/out (toggles the `.open` class)
//   toggle()              -> flips open/closed
//   isOpen()              -> current open state
//   sendMessage(text?)    -> sends `text` (or the current input value if omitted),
//                            runs the full tool-calling loop, returns a Promise
//   clearChat()           -> resets the conversation back to the welcome message
//   getMessages()         -> copy of the raw OpenAI-format message array (no system prompt)
//   destroy()             -> removes the panel and its listeners

(function (global) {
  const DEFAULT_ICON = '<path d="M12 2a8 8 0 0 0-8 8c0 3 1.6 5.6 4 7.1V20h8v-2.9c2.4-1.5 4-4.1 4-7.1a8 8 0 0 0-8-8z"/><line x1="9" y1="21" x2="15" y2="21"/>';
  const CLEAR_ICON = '<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>';
  const CLOSE_ICON = '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';

  function svgIcon(inner, cls) {
    const span = document.createElement('span');
    span.className = cls || 'ai-chat-icon';
    span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
    return span;
  }

  // Resolve a value that may be a plain value, or a sync/async getter function.
  function resolve(v) {
    return typeof v === 'function' ? Promise.resolve(v()) : Promise.resolve(v);
  }

  function createAIChatPanel(opts) {
    if (!opts || !opts.endpoint) throw new Error('createAIChatPanel: opts.endpoint is required');
    if (!opts.model) throw new Error('createAIChatPanel: opts.model is required');

    const tools = Array.isArray(opts.tools) ? opts.tools : [];
    const maxSteps = opts.maxSteps > 0 ? opts.maxSteps : 6;
    const temperature = typeof opts.temperature === 'number' ? opts.temperature : 0.3;
    const welcomeMessage = opts.welcomeMessage || 'Hi! How can I help?';
    const loadingText = opts.loadingText || 'Thinking...';
    const stoppedText = opts.stoppedText || 'Stopped after too many steps — please try rephrasing.';
    const networkErrorText = opts.networkErrorText || 'Could not reach the AI service. Check your internet connection.';

    // Conversation memory in OpenAI wire format (user / assistant / tool turns).
    // The system prompt is NOT stored here — it's re-resolved fresh on every send.
    let messages = [];
    let open = false;
    let busy = false;
    let msgCounter = 0;

    // ── Structure ──
    const panel = document.createElement('div');
    panel.className = 'ai-chat-panel';

    const header = document.createElement('div');
    header.className = 'ai-chat-header';
    header.appendChild(svgIcon(opts.icon || DEFAULT_ICON, 'ai-chat-icon'));

    const titleEl = document.createElement('h2');
    titleEl.className = 'ai-chat-title';
    titleEl.textContent = opts.title || 'AI Assistant';
    header.appendChild(titleEl);

    const badgeEl = document.createElement('span');
    badgeEl.className = 'ai-chat-badge';
    badgeEl.textContent = opts.badgeText || 'Ready';
    header.appendChild(badgeEl);

    if (opts.showClear !== false) {
      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'ai-chat-icon-btn';
      clearBtn.title = 'Clear chat';
      clearBtn.appendChild(svgIcon(CLEAR_ICON, 'ai-chat-icon sm'));
      clearBtn.addEventListener('click', clearChat);
      header.appendChild(clearBtn);
    }

    if (opts.showClose !== false) {
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'ai-chat-icon-btn';
      closeBtn.title = 'Close';
      closeBtn.appendChild(svgIcon(CLOSE_ICON, 'ai-chat-icon sm'));
      closeBtn.addEventListener('click', close);
      header.appendChild(closeBtn);
    }

    const messagesEl = document.createElement('div');
    messagesEl.className = 'ai-chat-messages';

    let suggestionsEl = null;
    if (Array.isArray(opts.suggestions) && opts.suggestions.length) {
      suggestionsEl = document.createElement('div');
      suggestionsEl.className = 'ai-chat-suggestions';
      opts.suggestions.forEach((text) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'ai-chat-suggest';
        chip.textContent = text;
        chip.addEventListener('click', () => sendMessage(text));
        suggestionsEl.appendChild(chip);
      });
    }

    const inputRow = document.createElement('div');
    inputRow.className = 'ai-chat-input-row';

    const inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.className = 'ai-chat-input';
    inputEl.placeholder = opts.placeholder || 'Ask anything…';
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    const sendBtn = document.createElement('button');
    sendBtn.type = 'button';
    sendBtn.className = 'ai-chat-btn ai-chat-btn-primary';
    sendBtn.textContent = 'Send';
    sendBtn.addEventListener('click', () => sendMessage());

    inputRow.appendChild(inputEl);
    inputRow.appendChild(sendBtn);

    panel.appendChild(header);
    panel.appendChild(messagesEl);
    if (suggestionsEl) panel.appendChild(suggestionsEl);
    panel.appendChild(inputRow);

    // ── Message bubbles ──
    function appendMsg(text, cls) {
      const id = 'ai-chat-msg-' + (++msgCounter);
      const div = document.createElement('div');
      div.className = 'ai-chat-msg ' + cls;
      div.id = id;
      div.textContent = text;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return id;
    }

    function removeMsg(id) {
      const el = document.getElementById(id);
      if (el) el.remove();
    }

    function resetMessages() {
      messagesEl.innerHTML = '';
      appendMsg(welcomeMessage, 'bot');
    }
    resetMessages();

    function setBusy(v) {
      busy = v;
      inputEl.disabled = v;
      sendBtn.disabled = v;
    }

    // ── The tool-calling loop ──
    // Protocol: send -> if the reply carries tool_calls, push the ASSISTANT
    // message (with those tool_calls) BEFORE pushing the tool result messages
    // that answer them, then loop; else render the final text and stop.
    async function sendMessage(text) {
      if (busy) return;
      const outgoing = (typeof text === 'string' ? text : inputEl.value).trim();
      if (!outgoing) return;
      inputEl.value = '';
      appendMsg(outgoing, 'user');
      messages.push({ role: 'user', content: outgoing });

      setBusy(true);
      const loadId = appendMsg(loadingText, 'bot loading');
      try {
        let key, systemPrompt;
        try {
          key = await resolve(opts.apiKey);
          systemPrompt = (await resolve(opts.systemPrompt)) || '';
        } catch (err) {
          removeMsg(loadId);
          appendMsg('Configuration error: ' + err.message, 'bot error');
          return;
        }

        let guard = 0;
        while (guard++ < maxSteps) {
          const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
          if (key) headers.Authorization = 'Bearer ' + key;

          const body = {
            model: opts.model,
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
            temperature,
          };
          if (tools.length) { body.tools = tools; body.tool_choice = 'auto'; }

          let resp;
          try {
            resp = await fetch(opts.endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
          } catch (netErr) {
            removeMsg(loadId);
            appendMsg(networkErrorText, 'bot error');
            return;
          }

          let data = null;
          try { data = await resp.json(); } catch (e) { /* non-JSON body */ }

          if (!resp.ok) {
            const detail = (data && data.error && (data.error.message || data.error)) || resp.statusText || ('HTTP ' + resp.status);
            removeMsg(loadId);
            appendMsg(
              resp.status === 401 ? 'Unauthorised — check your API key.'
                : resp.status === 429 ? 'Rate limited — please wait and try again.'
                : 'Request failed: ' + detail,
              'bot error'
            );
            return;
          }
          if (data && data.error) {
            removeMsg(loadId);
            appendMsg('Error: ' + (data.error.message || JSON.stringify(data.error)), 'bot error');
            return;
          }

          const msg = data && data.choices && data.choices[0] && data.choices[0].message;
          if (!msg) {
            removeMsg(loadId);
            appendMsg('No response from the AI.', 'bot error');
            return;
          }

          // Assistant turn (possibly carrying tool_calls) goes in BEFORE any tool results.
          messages.push({ role: 'assistant', content: msg.content || '', tool_calls: msg.tool_calls });

          if (msg.tool_calls && msg.tool_calls.length) {
            for (const tc of msg.tool_calls) {
              let args = {};
              try { args = JSON.parse(tc.function.arguments || '{}'); } catch (e) { /* leave args = {} */ }
              let result;
              try {
                if (typeof opts.executeTool !== 'function') {
                  result = { ok: false, message: 'No executeTool handler configured for tool "' + tc.function.name + '"' };
                } else {
                  result = await opts.executeTool(tc.function.name, args);
                }
              } catch (err) {
                result = { ok: false, message: 'Error: ' + err.message };
              }
              messages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: typeof result === 'string' ? result : JSON.stringify(result),
              });
            }
            continue; // feed tool results back in and let the model continue
          }

          removeMsg(loadId);
          appendMsg(msg.content || '(done)', 'bot');
          return;
        }

        removeMsg(loadId);
        appendMsg(stoppedText, 'bot error');
      } finally {
        setBusy(false);
      }
    }

    function clearChat() {
      messages = [];
      resetMessages();
    }

    function applyOpenState() {
      panel.classList.toggle('open', open);
      if (open) inputEl.focus();
    }

    function openPanel() { open = true; applyOpenState(); }
    function close() { open = false; applyOpenState(); }
    function toggle() { open = !open; applyOpenState(); }
    function isOpen() { return open; }

    function getMessages() {
      return messages.map((m) => Object.assign({}, m));
    }

    function destroy() {
      panel.remove();
    }

    return {
      el: panel,
      open: openPanel,
      close,
      toggle,
      isOpen,
      sendMessage,
      clearChat,
      getMessages,
      destroy,
    };
  }

  global.createAIChatPanel = createAIChatPanel;
})(window);
