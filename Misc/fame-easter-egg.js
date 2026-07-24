// ── Fame Easter Egg Modal ────────────────────────────────────────────────────
// Personal creator-credit variant of the generic Easter Egg Modal
// (see easter-egg.js) — same click-4x-in-2s trigger, but paired with
// fame-easter-egg-modal.html / fame-easter-egg.css, which assume the host
// project already has a --radius-lg variable and a .btn.btn-primary button
// style (this is the version used across Fame's own projects, not a
// from-scratch generic template).
//
// Usage:
//   1. <button onclick="easterEggClick()">◆</button>  -- any clickable element
//   2. Copy fame-easter-egg-modal.html's markup into the page
//   3. Add fame-easter-egg.css to the stylesheet
//   4. Include this file AFTER the modal markup in the DOM

let easterEggClicks = 0;
let easterEggTimer = null;

function easterEggClick(){
  easterEggClicks++;
  if(easterEggClicks === 1){
    easterEggTimer = setTimeout(() => { easterEggClicks = 0; }, 2000);
  }
  if(easterEggClicks === 4){
    clearTimeout(easterEggTimer);
    easterEggClicks = 0;
    document.getElementById('creator-modal')?.classList.add('open');
  }
}

function closeCreatorModal(){
  document.getElementById('creator-modal')?.classList.remove('open');
}

// Close on click outside
document.getElementById('creator-modal')?.addEventListener('click', (e) => {
  if(e.target.id === 'creator-modal') closeCreatorModal();
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape' && document.getElementById('creator-modal')?.classList.contains('open')){
    closeCreatorModal();
  }
});
