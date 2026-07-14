import { recipes, amounts } from './data.js';
import {
  createItem,
  mouseDown,
  mouseEnter,
  mouseUp,
  craftClick,
  consumeClock,
  resetInventory,
} from './interaction.js';

const followCursor = document.querySelector('follow-cursor');
const tooltip = document.querySelector('item-tooltip');
const craftingGrid = document.querySelector('crafting-grid');
const inventoryGrid = document.querySelector('inventory-grid');
const craftingOutput = document.querySelector('crafting-output');

function handleMessage(msg) {
  if (msg.op === 'start') {
    startGame(msg.difficulty);
  }
}

function giveItem(item, count) {
  const emptySlots = document.querySelectorAll('inventory-grid > inventory-cell:empty');
  const index = Math.floor(Math.random() * emptySlots.length);
  emptySlots[index].appendChild(createItem(item, count));
}

let timerInterval = null;

function timer() {
  if (!document.querySelector('item-stack[data-item="clock"]')) {
    // time's up!
    endGame(false);
  } else {
    consumeClock();
  }
}

function startGame(difficulty) {
  resetInventory();
  
  giveItem('log', 64);
  giveItem('ingot', 64);
  giveItem('clock', 16);

  document.addEventListener('mousemove', onMouseMove);
  timerInterval = setInterval(timer, 1000);
  window.parent.postMessage({ op: 'started', verb: 'craft!' });
}

function endGame(win) {
  clearInterval(timerInterval);
  timerInterval = null;
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
  followCursor.setAttribute('style', `left: ${event.clientX}px; top: ${event.clientY}px`);

  const hoverItem = document.querySelector('item-stack:hover');
  if (hoverItem !== null) {
    const name = hoverItem.getAttribute('data-item');
    tooltip.textContent = name;
  } else {
    tooltip.textContent = '';
  }
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

craftingOutput.addEventListener('click', craftClick);

window.addEventListener('message', m => handleMessage(m.data));
window.parent.postMessage({ op: 'ready' });
