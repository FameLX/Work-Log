// ── Firestore Live Cross-Device Sync ─────────────────────────────────────────
// Turns a localStorage-only array of items into a live, multi-device-synced
// Firestore collection. Any client's writes propagate to every other open
// client automatically via onSnapshot — there is no manual "save all"; the
// snapshot listener owns state, matching the pattern used in the source app
// (Work Log Shared), where `save()` becomes a no-op once Firestore is wired up.
//
// Extracted and decoupled from Project/Work Log Shared/worklog-shared.html
// (see `_appInit`, `saveEntryDoc` / `deleteEntryDoc`, and the
// `#db-status-pill` around lines 190-193, 362, 378-390, 455-463) and
// cross-checked against REF/integrations-reference.html (Block 1: Firebase
// Shared Database) for the canonical init pattern.
//
// REQUIRES the Firebase JS SDK loaded as an ES module BEFORE this script runs
// its sync calls. This file itself has NO import statements — it expects the
// five Firestore functions (getFirestore, collection, doc, onSnapshot,
// setDoc, deleteDoc) to be passed in via `firestoreFns`, OR it will read them
// off `window._db` / `window._collection` / etc. if you follow the same
// window-exposure convention as the source app. Recommended setup, exactly as
// used in worklog-shared.html:
//
//   <script type="module">
//   import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
//   import { getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc, getDocs }
//     from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
//
//   const firebaseConfig = { apiKey: 'YOUR_API_KEY', authDomain: 'YOUR_PROJECT.firebaseapp.com',
//     projectId: 'YOUR_PROJECT_ID', storageBucket: 'YOUR_PROJECT.firebasestorage.app',
//     messagingSenderId: 'YOUR_SENDER_ID', appId: 'YOUR_APP_ID' };
//
//   const app = initializeApp(firebaseConfig);
//   const db  = getFirestore(app);
//   window._db = db; window._collection = collection; window._doc = doc;
//   window._onSnapshot = onSnapshot; window._setDoc = setDoc; window._deleteDoc = deleteDoc;
//   window._fbReady = true;
//   if (window._appInit) window._appInit();
//   </script>
//   <script src="firestore-sync.js"></script>
//   <script>
//     window._appInit = function () {
//       const sync = createFirestoreSync({
//         db: window._db,
//         firestoreFns: {
//           collection: window._collection, doc: window._doc,
//           onSnapshot: window._onSnapshot, setDoc: window._setDoc, deleteDoc: window._deleteDoc,
//         },
//         collectionPath: 'entries',
//         onSnapshotUpdate: (items) => { myItems = items; renderUI(); },
//         onStatusChange: (status) => { pill.setStatus(status); },
//       });
//     };
//     if (window._fbReady) window._appInit();
//   </script>
//
// Firestore SECURITY RULES must restrict access appropriately before shipping
// anything beyond a private/team tool — see REF/integrations-reference.html
// (Block 1, Step D) for the example rules; not duplicated here.
//
// PUBLIC API:
//   const sync = createFirestoreSync({
//     db,                  // required — a getFirestore() instance (or pass firebaseConfig, see below)
//     firestoreFns,        // required — { collection, doc, onSnapshot, setDoc, deleteDoc }
//     collectionPath,      // required — Firestore collection name, e.g. 'entries'
//     onSnapshotUpdate,    // (items[]) => void — called with the fresh array on every change
//     onStatusChange,      // ('connecting'|'connected'|'error') => void
//   });
//   sync.saveItem(item);   // setDoc — item.id is required, used as the Firestore doc ID
//   sync.deleteItem(id);   // deleteDoc
//   sync.getItems();       // -> current cached array (same reference passed to onSnapshotUpdate)
//   sync.stop();           // unsubscribe the onSnapshot listener
//
//   createStatusPill(container, opts) -> { setStatus(status), el }
//     Standalone dot+text badge. 'connecting' (warn) -> 'connected' (success) -> 'error' (danger).
//     Can be driven manually or wired straight into onStatusChange above.

(function (global) {
  'use strict';

  // ── createFirestoreSync ──────────────────────────────────────────────────
  function createFirestoreSync(opts) {
    opts = opts || {};
    if (!opts.db) throw new Error('[firestore-sync] opts.db is required (a getFirestore() instance).');
    if (!opts.firestoreFns) throw new Error('[firestore-sync] opts.firestoreFns is required: { collection, doc, onSnapshot, setDoc, deleteDoc }.');
    if (!opts.collectionPath) throw new Error('[firestore-sync] opts.collectionPath is required.');

    var db = opts.db;
    var fns = opts.firestoreFns;
    var collectionPath = opts.collectionPath;
    var onSnapshotUpdate = typeof opts.onSnapshotUpdate === 'function' ? opts.onSnapshotUpdate : function () {};
    var onStatusChange = typeof opts.onStatusChange === 'function' ? opts.onStatusChange : function () {};

    var items = [];
    var unsub = null;

    function emitStatus(status) {
      try { onStatusChange(status); } catch (e) { /* caller's handler, not ours to swallow silently */ console.error('[firestore-sync] onStatusChange handler threw', e); }
    }

    emitStatus('connecting');

    unsub = fns.onSnapshot(
      fns.collection(db, collectionPath),
      function (snap) {
        items = snap.docs.map(function (d) {
          var data = d.data();
          return Object.assign({}, data, { id: d.id });
        });
        emitStatus('connected');
        onSnapshotUpdate(items);
      },
      function (err) {
        if (global.console) console.error('[firestore-sync] onSnapshot error (' + collectionPath + ')', err);
        emitStatus('error');
      }
    );

    // setDoc — item.id is required; used verbatim as the Firestore document ID.
    function saveItem(item) {
      if (!item || item.id === undefined || item.id === null) {
        return Promise.reject(new Error('[firestore-sync] saveItem requires item.id'));
      }
      var docRef = fns.doc(db, collectionPath, String(item.id));
      return fns.setDoc(docRef, item);
    }

    // deleteDoc
    function deleteItem(id) {
      if (id === undefined || id === null) {
        return Promise.reject(new Error('[firestore-sync] deleteItem requires an id'));
      }
      return fns.deleteDoc(fns.doc(db, collectionPath, String(id)));
    }

    function stop() {
      if (unsub) { unsub(); unsub = null; }
    }

    return {
      saveItem: saveItem,
      deleteItem: deleteItem,
      getItems: function () { return items; },
      stop: stop,
    };
  }

  // ── createStatusPill ─────────────────────────────────────────────────────
  // Small dot+text badge. Builds its own markup and appends to `container`
  // (an element, or a selector string). Usable standalone or driven by
  // createFirestoreSync's onStatusChange callback.
  var STATUS_LABEL = {
    connecting: 'Connecting…',
    connected: 'Connected',
    error: 'Connection error',
  };

  function createStatusPill(container, opts) {
    opts = opts || {};
    var host = typeof container === 'string' ? document.querySelector(container) : container;
    if (!host) throw new Error('[firestore-sync] createStatusPill: container not found.');

    var pill = document.createElement('div');
    pill.className = 'fs-status-pill';
    pill.setAttribute('role', 'status');

    var dot = document.createElement('span');
    dot.className = 'fs-status-dot';

    var text = document.createElement('span');
    text.className = 'fs-status-text';

    pill.appendChild(dot);
    pill.appendChild(text);
    host.appendChild(pill);

    function setStatus(status) {
      var known = STATUS_LABEL.hasOwnProperty(status) ? status : 'connecting';
      pill.classList.remove('fs-status-connecting', 'fs-status-connected', 'fs-status-error');
      pill.classList.add('fs-status-' + known);
      text.textContent = (opts.labels && opts.labels[known]) || STATUS_LABEL[known];
    }

    setStatus('connecting');

    return { el: pill, setStatus: setStatus };
  }

  global.createFirestoreSync = createFirestoreSync;
  global.createStatusPill = createStatusPill;
})(window);
