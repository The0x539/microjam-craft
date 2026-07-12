import { recipes, amounts } from './data.js';
import { createItem, mouseDown, mouseEnter, mouseUp } from './interaction.js';

const grabbedStack = document.querySelector('grabbed-stack');
const craftingGrid = document.querySelector('crafting-grid');
const inventoryGrid = document.querySelector('inventory-grid');

function handleMessage(msg) {
  if (msg.op === 'start') {
    startGame(msg.difficulty);
  }
}

function startGame(difficulty) {
  document.addEventListener('mousemove', onMouseMove);
  window.parent.postMessage({ op: 'started', verb: 'craft!' });
}

function endGame(win) {
  document.removeEventListener('mousemove', onMouseMove);
  window.parent.postMessage({ op: 'done', win });
}

function createCell() {
  const elem = document.createElement('inventory-cell');
  elem.addEventListener('mousedown', mouseDown);
  elem.addEventListener('mouseenter', mouseEnter);
  return elem;
}

function onMouseMove(event) {
  grabbedStack.setAttribute('style', `left: ${event.clientX}px; top: ${event.clientY}px`);
}

document.addEventListener('contextmenu', e => e.preventDefault());

const allItems = new Set();
for (const [output, shape] of Object.entries(recipes)) {
  allItems.add(output);
  for (const item of shape.flat()) {
    if (item) {
      allItems.add(item);
    }
  }
}

const stylesheet = document.styleSheets[0];

for (const item of allItems) {
  stylesheet.insertRule(`
    item-stack[data-item="${item}"]::before {
      background-image: url("./items/${item}.png");
    }
  `);
}

for (let i = 0; i < 3 * 3; i++) {
  craftingGrid.appendChild(createCell());
}

for (let i = 0; i < 12 * 3; i++) {
  inventoryGrid.appendChild(createCell());
}

document.addEventListener('mouseup', mouseUp);

const inventory = document.querySelectorAll('inventory-grid > inventory-cell');
inventory[0].appendChild(createItem('log', 64));
inventory[1].appendChild(createItem('log', 64));
inventory[2].appendChild(createItem('plank', 64));
inventory[3].appendChild(createItem('plank', 64));
inventory[4].appendChild(createItem('stick', 64));
inventory[5].appendChild(createItem('stick', 64));

window.addEventListener('message', m => handleMessage(m.data));
window.parent.postMessage({ op: 'ready' });
