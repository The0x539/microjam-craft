import { stackSizes } from './data.js';

const grabbedStack = document.querySelector('grabbed-stack');
const craftingGrid = document.querySelector('crafting-grid');
const inventoryGrid = document.querySelector('inventory-grid');

let state = 'idle';

export function createItem(item, count) {
  const elem = document.createElement('item-stack');
  elem.setAttribute('data-item', item);
  elem.setAttribute('data-count', count);
  const countElem = document.createElement('data');
  countElem.textContent = count.toString();
  elem.appendChild(countElem);
  return elem;
}

export function mouseDown(event) {
  const cell = event.currentTarget;

  // Shift click: Transfer a full stack to the other place.
  if (event.shiftKey) {
    const sourceStack = cell.firstElementChild;
    if (sourceStack) {
      const targetGrid = cell.parentElement === inventoryGrid ? craftingGrid : inventoryGrid;
      shiftClickTransfer(sourceStack, targetGrid);
    }
    state = 'shift-drag';
    return;
  }

  const heldStack = grabbedStack.firstElementChild;
  
  // Click with empty cursor: pick up items
  if (!heldStack) {
    const sourceStack = cell.firstElementChild;
    if (!sourceStack) {
      return;
    }

    if (event.button === 2) {
      // Right click: take half the stack, rounded up
      const sourceCount = +sourceStack.getAttribute('data-count');
      if (sourceCount === 1) {
        grabbedStack.appendChild(sourceStack);
        return;
      }

      const takenCount = Math.ceil(sourceCount / 2);
      const newCount = sourceCount - takenCount;
      const item = sourceStack.getAttribute('data-item');
      setCount(sourceStack, newCount);
      grabbedStack.appendChild(createItem(item, takenCount));
    } else {
      // Left click: take the whole stack. Drag to pick up other stacks
      grabbedStack.appendChild(sourceStack);
      state = 'pickup-drag';
    }
  } else {
    // Click with items held: deposit items

    if (event.button === 2) {
      // Right click: deposit one item. Drag to deposit one item in each cell
      state = 'split-one';
      depositOne(cell);
    }
  }
}

export function mouseEnter(event) {
  const cell = event.currentTarget;

  switch (state) {
    case 'shift-drag': {
      const sourceStack = cell.firstElementChild;
      if (!sourceStack) break;
      const targetGrid = cell.parentElement === inventoryGrid ? craftingGrid : inventoryGrid;
      shiftClickTransfer(sourceStack, targetGrid);
      break;
    }

    case 'pickup-drag': {
      const sourceStack = cell.firstElementChild;
      if (!sourceStack) break;
      const heldStack = grabbedStack.firstElementChild;
      const item = sourceStack.getAttribute('data-item');
      if (item !== heldStack.getAttribute('data-item')) return;

      const stackSize = stackSizes[item] ?? 64;

      const heldCount = +grabbedStack.firstElementChild.getAttribute('data-count');
      const newCount = heldCount + +sourceStack.getAttribute('data-count');
      if (newCount > stackSize) return;

      setCount(heldStack, newCount);
      sourceStack.remove();
      break;
    }

    case 'split-one':
      depositOne(cell);
      break;
    
    default: {
      break;
    }
  }
}

export function mouseUp(event) {
  switch (state) {
    case 'shift-drag':
    case 'pickup-drag':
    case 'split-one':
      state = 'idle';
      break;
    
    default:
      break;
  }
}

function setCount(itemStack, value) {
  itemStack.setAttribute('data-count', value);
  itemStack.firstElementChild.textContent = value.toString();
}

function depositOne(targetCell) {
  const heldStack = grabbedStack.firstElementChild;
  const item = heldStack.getAttribute('data-item');
  const heldCount = +heldStack.getAttribute('data-count');

  const stackSize = stackSizes[item] ?? 64;

  const targetStack = targetCell.firstElementChild;
  if (targetStack) {
    if (targetStack.getAttribute('data-item') !== item) {
      return;
    }

    const targetCount = +targetStack.getAttribute('data-count');
    if (targetCount >= stackSize) return;

    setCount(targetStack, targetCount + 1);
  } else {
    targetCell.appendChild(createItem(item, 1));
  }

  if (heldCount === 1) {
    heldStack.remove();
    state = 'idle';
  } else {
    setCount(heldStack, heldCount - 1);
  }
}

function shiftClickTransfer(sourceStack, targetGrid) {
  const item = sourceStack.getAttribute('data-item');
  const stackSize = stackSizes[item] ?? 64;
  let count = +sourceStack.getAttribute('data-count');

  // First, search for existing stacks to add to
  for (const cell of targetGrid.children) {
    const targetStack = cell.firstElementChild;
    if (!targetStack) continue;
    if (targetStack.getAttribute('data-item') !== item) continue;
    const curCount = +targetStack.getAttribute('data-count');
    const available = stackSize - curCount;
    if (available === 0) continue; 

    const transferSize = Math.min(count, available);
    const newCount = curCount + transferSize;
    setCount(targetStack, newCount);
    
    count -= transferSize;
    if (count === 0) {
      sourceStack.remove();
      return;
    } else {
      setCount(sourceStack, count);
    }
  }

  // Now, look for any empty slots to move whatever's left to
  for (const cell of targetGrid.children) {
    if (!cell.firstElementChild) {
      cell.appendChild(sourceStack);
      return;
    }
  }
}
