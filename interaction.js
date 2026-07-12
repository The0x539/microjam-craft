import { stackSizes } from './data.js';

const grabbedStack = document.querySelector('grabbed-stack');
const craftingGrid = document.querySelector('crafting-grid');
const inventoryGrid = document.querySelector('inventory-grid');

let state = 'idle';

const splitTargets = new Set();

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
    } else {
      // Left click: split stack evenly across all empty/compatible cells.
      // If no compatible cells are dragged over, swap stack with the cell the mouse was released on.
      // (In the common case, this is just what a "click" looks like on a cell with incompatible contents.)
      heldStack.setAttribute('data-original-count', heldStack.getAttribute('data-count'));
      state = 'split-evenly';
      addSplitTarget(cell);
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

    case 'split-evenly':
      addSplitTarget(cell);
      break;
    
    default:
      break;
  }
}

export function mouseUp(event) {
  switch (state) {
    case 'split-evenly':
    case 'split-exhausted': {
      if (splitTargets.size <= 1) {
        const targetCell = event.target.closest('inventory-cell');
        if (targetCell) {
          depositAll(targetCell);
        }
      } else {
        commitSplit();
      }
      break;
    }
    
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

function addSplitTarget(targetCell) {
  const heldStack = grabbedStack.firstElementChild;
  const item = heldStack.getAttribute('data-item');

  const targetStack = targetCell.firstElementChild;
  if (targetStack) {
    if (targetStack.getAttribute('data-item') !== item) {
      return;
    }
  }

  splitTargets.add(targetCell);

  if (splitTargets.size > 1) {
    updateSplitPreview();
  }
}

function updateSplitPreview() {
  const heldStack = grabbedStack.firstElementChild;
  const item = heldStack.getAttribute('data-item');
  const heldCount = +heldStack.getAttribute('data-original-count');

  const stackSize = stackSizes[item] ?? 64;

  const splitCount = Math.max(1, Math.floor(heldCount / splitTargets.size));
  let remainder = heldCount;

  for (const targetCell of splitTargets) {
    let targetStack = targetCell.firstElementChild;
    if (!targetStack) {
      targetStack = createItem(item, 0);
      targetCell.appendChild(targetStack);
    }
    if (!targetStack.hasAttribute('data-original-count')) {
      targetStack.setAttribute('data-original-count', targetStack.getAttribute('data-count'));
    }
    const targetCount = +targetStack.getAttribute('data-original-count');
    const available = stackSize - targetCount;
    const transferSize = Math.min(splitCount, available);
    setCount(targetStack, targetCount + transferSize);
    remainder -= transferSize;
    // TODO: give stacks yellow text if they're too full to accomodate their full share of the split

    if (remainder === 0) break;
  }

  setCount(heldStack, remainder);

  if (splitCount === 1 && remainder === 0) {
    state = 'split-exhausted';
  }
}

function commitSplit() {
  const heldStack = grabbedStack.firstElementChild;
  const heldCount = +heldStack.getAttribute('data-count');
  
  if (heldCount === 0) {
    heldStack.remove();
  } else {
    heldStack.removeAttribute('data-original-count');
  }

  for (const target of splitTargets) {
    target.firstElementChild?.removeAttribute('data-original-count');
  }

  splitTargets.clear();

  state = 'idle';
}

function depositAll(targetCell) {
  const heldStack = grabbedStack.firstElementChild;
  const item = heldStack.getAttribute('data-item');
  const heldCount = +heldStack.getAttribute('data-count');

  const stackSize = stackSizes[item] ?? 64;

  const targetStack = targetCell.firstElementChild;
  if (!!targetStack && targetStack.getAttribute('data-item') !== item) {
    // swap held and target stacks because they don't match
    targetCell.appendChild(heldStack);
    grabbedStack.appendChild(targetStack);
  } else {
    if (!targetStack) {
      // deposit the full stack to the slot
      targetCell.appendChild(heldStack);
    } else {
      // deposit as much as possible
      const targetCount = +targetStack.getAttribute('data-count');
      const available = stackSize - targetCount;
      const transferSize = Math.min(heldCount, available);
      const newCount = targetCount + transferSize;
      setCount(targetStack, newCount);

      if (transferSize < heldCount) {
        setCount(heldStack, heldCount - transferSize);
      } else {
        heldStack.remove();
      }
    }
  }

  heldStack.removeAttribute('data-original-count');

  for (const target of splitTargets) {
    target.firstElementChild?.removeAttribute('data-original-count');
  }

  splitTargets.clear();

  state = 'idle';
}
