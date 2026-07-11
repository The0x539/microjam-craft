import { recipes, amounts } from "./data.js";

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

function createItem(item, count) {
  const elem = document.createElement('inventory-item');
  elem.setAttribute('data-item', item);
  elem.setAttribute('data-count', count);
  const countElem = document.createElement("data");
  countElem.textContent = count.toString();
  elem.appendChild(countElem);
  return elem;
}

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
    inventory-item[data-item="${item}"]::before {
      background-image: url("./items/${item}.png");
    }
  `);
}

const craftingGrid = document.querySelector('crafting-grid');
const inventoryGrid = document.querySelector('inventory-grid');

for (let i = 0; i < 3 * 3; i++) {
  craftingGrid.appendChild(createCell());
}

for (let i = 0; i < 12 * 3; i++) {
  inventoryGrid.appendChild(createCell());
}

inventoryGrid.firstElementChild.appendChild(createItem('stick', 32));

window.addEventListener('message', m => handleMessage(m.data));
window.parent.postMessage({ op: 'ready' });
