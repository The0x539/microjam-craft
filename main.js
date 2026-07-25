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
import { scenarios } from './difficulty.js';

const followCursor = document.querySelector('follow-cursor');
const tooltip = document.querySelector('item-tooltip');
const craftingGrid = document.querySelector('crafting-grid');
const inventoryGrid = document.querySelector('inventory-grid');
const craftingOutput = document.querySelector('crafting-output');
const todoList = document.getElementById('todo-list');

const desiredCrafts = new Set();

const playSound = {
  playImpl(id, volume = 1.0, pitch = 1.0) {
    const audio = document.getElementById(id);

    audio.currentTime = 0;

    const p = new Promise(resolve => {
      const f = (event) => {
        audio.removeEventListener('ended', f);
        resolve(event);
      };
      audio.addEventListener('ended', f);
    });

    audio.volume = volume;
    audio.playbackRate = pitch;
    audio.preservesPitch = false;

    audio.play();
    return p;
  },

  smallDing() {
    return this.playImpl('small-ding', 0.1, 0.55 + 0.7 * Math.random());
  },

  bigDing() {
    return this.playImpl('big-ding', 0.75);
  },

  oof() {
    return this.playImpl('oof', 0.75);
  },
};

function onCraft(event) {
  const item = event.item;
  if (desiredCrafts.has(item)) {
    desiredCrafts.delete(item);

    document.querySelector(`#todo-list > li:has([data-item="${item}"])`)?.remove();

    if (desiredCrafts.size > 0) {
      playSound.smallDing();
    } else {
      endGame(true);
    }
  }
}

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
  if (!document.querySelector('item-stack[data-item="clock"]:not(crafting-output item-stack)')) {
    // time's up!
    endGame(false);
  } else {
    consumeClock();
  }
}

function startGame(difficulty) {
  document.body.classList.remove('failed');

  resetInventory();

  const scenario = scenarios.toReversed().find(s => difficulty >= s.level);

  desiredCrafts.clear();
  for (const item of scenario.goal) {
    desiredCrafts.add(item);
  }

  todoList.replaceChildren();
  for (const item of desiredCrafts) {
    const listItem = document.createElement('li');

    const stack = document.createElement('item-stack');
    stack.setAttribute('data-item', item);
    listItem.append(stack);

    todoList.append(listItem);
  }

  for (const [item, amount] of Object.entries(scenario.items)) {
    giveItem(item, amount);
  }
  giveItem('clock', scenario.time(difficulty - scenario.level));

  document.addEventListener('mousemove', onMouseMove);
  timerInterval = setInterval(timer, 1000);
  window.parent.postMessage({ op: 'started', verb: 'craft!' });
}

async function endGame(win) {
  clearInterval(timerInterval);
  timerInterval = null;
  if (win) {
    await playSound.bigDing();
  } else {
    document.body.classList.add('failed');
    await playSound.oof();
  }
  await new Promise(resolve => setTimeout(resolve, 500));
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
document.addEventListener('craft', onCraft);

craftingOutput.addEventListener('click', craftClick);

window.addEventListener('message', m => handleMessage(m.data));
window.parent.postMessage({ op: 'ready' });
