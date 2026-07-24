// ── Easter Egg Modal ─────────────────────────────────────────────────────────
// Click a trigger element 4 times within 2 seconds to reveal a hidden modal
// (e.g. a "made by" credit tucked behind a logo).
//
// Usage:
//   1. <button onclick="easterEggClick()">◆</button>  -- any clickable element
//   2. Add the modal markup with id="creator-modal" (see easter-egg.css for
//      the .modal-overlay / .creator-modal .modal shape it expects)
//   3. <link rel="stylesheet" href="easter-egg.css">
//   4. Customize the modal's inner content to whatever you want hidden.

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

document.getElementById('creator-modal')?.addEventListener('click', (e) => {
  if(e.target.id === 'creator-modal') closeCreatorModal();
});

document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape' && document.getElementById('creator-modal')?.classList.contains('open')){
    closeCreatorModal();
  }
});
