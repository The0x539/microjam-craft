function handleMessage(msg) {
  if (msg.op === 'start') {
    startGame(msg.difficulty);
  }
}

function win() {
  document.body.removeEventListener('click', win);
  window.parent.postMessage({ op: 'done', win: true });
}

function startGame(difficulty) {
  // document.body.addEventListener('click', win);
  window.parent.postMessage({ op: 'started', verb: 'craft!' });
}

function createCell() {
  const elem = document.createElement('inventory-cell');
  return elem;
}

const craftingGrid = document.querySelector('crafting-grid');
const inventoryGrid = document.querySelector('inventory-grid');

for (let i = 0; i < 3 * 3; i++) {
  craftingGrid.appendChild(createCell());
}

for (let i = 0; i < 12 * 3; i++) {
  inventoryGrid.appendChild(createCell());
}

window.addEventListener('message', m => handleMessage(m.data));
window.parent.postMessage({ op: 'ready' });
