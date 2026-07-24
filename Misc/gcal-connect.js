/* ============================================================================
 * gcal-connect.js — reusable "Connect to Google Calendar" OAuth helper
 * ----------------------------------------------------------------------------
 * Client-side Google OAuth 2.0 *implicit* flow (response_type=token). No server,
 * no client secret, no build step. Generalised from the Work Log app.
 *
 * HOW THE FLOW WORKS (important — read before using):
 *   1. Your page calls GCalConnect.connect(). A popup opens Google's consent
 *      screen with redirect_uri = your registered URL.
 *   2. After the user consents, Google redirects the POPUP to that redirect_uri
 *      with #access_token=... in the URL hash. THAT PAGE MUST ALSO LOAD THIS
 *      SCRIPT — its captureRedirect() step reads the token and postMessage()s
 *      it back to the opener window, then closes the popup.
 *   3. The opener receives the token, stores it, and flips to "connected".
 *
 * So the redirect_uri must host a page that includes this script. The simplest
 * setup: point redirect_uri at the very same page that opened the popup.
 *
 * The access token is short-lived (~1 hour). There is no refresh token in the
 * implicit flow — when it expires, call connect() again (Reconnect).
 *
 * SETUP (one time, in Google Cloud Console):
 *   - Create an OAuth 2.0 Client ID (type: Web application).
 *   - Add your page URL to "Authorised JavaScript origins" AND
 *     "Authorised redirect URIs" (exact match, including trailing slash).
 *
 * USAGE:
 *   // (optional) set the relay tag BEFORE the script loads if you run multiple
 *   // OAuth widgets on one origin; otherwise the default is fine.
 *   window.GCAL_CONNECT_MESSAGE_TYPE = 'myapp_gcal_token';
 *   <script src="gcal-connect.js"></script>
 *
 *   const gcal = GCalConnect.init({
 *     clientId:   'xxxx.apps.googleusercontent.com', // omit to prompt/paste later
 *     redirectUri: location.origin + location.pathname, // MUST host this script
 *     scopes:     ['https://www.googleapis.com/auth/calendar.events'],
 *     storagePrefix: 'myapp',        // localStorage: myapp_gcal_token / _client_id
 *     onChange: (s) => {             // s = { connected, expired, token }
 *       pill.classList.toggle('connected', s.connected && !s.expired);
 *       pill.classList.toggle('expired', s.expired);
 *     },
 *   });
 *
 *   pill.onclick = () => gcal.isConnected() ? gcal.disconnect() : gcal.connect();
 *   gcal.getToken();  // -> current access token or null (use as Bearer)
 *   gcal.applyToken(t); // manual fallback if the popup was blocked
 * ==========================================================================*/
(function (global) {
  'use strict';

  var MESSAGE_TYPE = global.GCAL_CONNECT_MESSAGE_TYPE || 'gcal_connect_token';

  // ── Popup side: if THIS load is the OAuth redirect, relay the token home ──
  // Runs immediately at script load so it works even before init() is called.
  (function captureRedirect() {
    if (location.hash && location.hash.indexOf('access_token=') !== -1) {
      var params = new URLSearchParams(location.hash.slice(1));
      var token = params.get('access_token');
      if (token && global.opener) {
        try {
          global.opener.postMessage({ type: MESSAGE_TYPE, token: token }, location.origin);
        } catch (e) { /* opener gone / cross-origin — nothing we can do */ }
        // Scrub the token out of the address bar, then close the popup.
        history.replaceState(null, '', location.pathname + location.search);
        global.close();
      }
    }
  })();

  function init(opts) {
    opts = opts || {};
    var prefix = opts.storagePrefix || 'gcal';
    var K_TOKEN = prefix + '_gcal_token';
    var K_CID = prefix + '_gcal_client_id';
    var scopes = opts.scopes || ['https://www.googleapis.com/auth/calendar.events'];
    var redirectUri = opts.redirectUri || (location.origin + location.pathname);
    var onChange = typeof opts.onChange === 'function' ? opts.onChange : function () {};

    var token = localStorage.getItem(K_TOKEN) || null;
    var clientId = opts.clientId || localStorage.getItem(K_CID) || '';
    var expired = false;

    if (opts.clientId) localStorage.setItem(K_CID, opts.clientId);

    function emit() { onChange({ connected: !!token, expired: expired, token: token }); }

    // Receive the token the popup relayed back.
    global.addEventListener('message', function (ev) {
      if (ev.origin !== location.origin) return;
      if (ev.data && ev.data.type === MESSAGE_TYPE && ev.data.token) applyToken(ev.data.token);
    });

    function connect(overrideClientId) {
      var cid = (overrideClientId || clientId || '').trim();
      if (!cid) { emitError('Set a Google OAuth Client ID first.'); return false; }
      clientId = cid; localStorage.setItem(K_CID, cid);
      var url = 'https://accounts.google.com/o/oauth2/v2/auth'
        + '?client_id=' + encodeURIComponent(cid)
        + '&redirect_uri=' + encodeURIComponent(redirectUri)
        + '&response_type=token'
        + '&scope=' + encodeURIComponent(scopes.join(' '))
        + '&prompt=consent';
      global.open(url, 'gcal_oauth', 'width=520,height=620');
      return true;
    }

    function applyToken(t) {
      token = t; expired = false;
      localStorage.setItem(K_TOKEN, t);
      emit();
      return t;
    }

    function disconnect() {
      token = null; expired = false;
      localStorage.removeItem(K_TOKEN);
      emit();
    }

    // Cheap liveness probe: hit the primary calendar; 401 => token expired.
    function verify() {
      if (!token) return Promise.resolve(false);
      return fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
        headers: { Authorization: 'Bearer ' + token }
      }).then(function (res) {
        if (res.status === 401) { expired = true; emit(); return false; }
        expired = false; emit(); return true;
      }).catch(function () { return true; /* network blip — don't flag expired */ });
    }

    function emitError(msg) {
      if (typeof opts.onError === 'function') opts.onError(msg);
      else if (global.console) console.warn('[gcal-connect]', msg);
    }

    emit();          // announce initial state
    if (token) verify();

    return {
      connect: connect,
      disconnect: disconnect,
      applyToken: applyToken,
      verify: verify,
      getToken: function () { return token; },
      isConnected: function () { return !!token; },
      isExpired: function () { return expired; },
      setClientId: function (id) { clientId = id; localStorage.setItem(K_CID, id); }
    };
  }

  global.GCalConnect = { init: init, messageType: MESSAGE_TYPE };
})(window);
