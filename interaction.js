import { stackSizes } from './data.js';
import { getRecipeOutput } from './crafting.js';

class CraftEvent extends Event {
  item;
  constructor(item) {
    super('craft');
    this.item = item;
  }
}

const grabbedStack = document.querySelector('grabbed-stack');
const craftingGrid = document.querySelector('crafting-grid');
const inventoryGrid = document.querySelector('inventory-grid');
const outputCell = document.querySelector('crafting-output');

let state = 'idle';

const splitTargets = new Set();

export function resetInventory() {
  for (const stack of document.querySelectorAll('item-stack')) {
    stack.remove();
  }
  splitTargets.clear();
  state = 'idle';
}

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
  if (state !== 'idle') return;
  if (event.button !== 0 && event.button !== 2) return;

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
      const sourceCount = getCount(sourceStack);
      if (sourceCount === 1) {
        grabbedStack.appendChild(sourceStack);
        updateRecipeOutput();
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
      updateRecipeOutput();
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
      updateRecipeOutput();
      break;
    }

    case 'pickup-drag': {
      const sourceStack = cell.firstElementChild;
      if (!sourceStack) break;
      const heldStack = grabbedStack.firstElementChild;
      const item = sourceStack.getAttribute('data-item');
      if (item !== heldStack.getAttribute('data-item')) return;

      const stackSize = stackSizes[item] ?? 64;

      const newCount = getCount(heldStack) + getCount(sourceStack);
      if (newCount > stackSize) return;

      setCount(heldStack, newCount);
      sourceStack.remove();
      updateRecipeOutput();
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
      if (event.button !== 0) return;

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

    case 'pickup-drag':
      if (event.button !== 0) return;
      state = 'idle';
      break;
    
    case 'split-one':
      if (event.button !== 2) return;
      state = 'idle';
      break;

    case 'shift-drag':
      // this could be either button. whatever.
      state = 'idle';
      break;

    default:
      break;
  }
}

export function craftClick(event) {
  if (event.shiftKey) {
    craftAll();
  } else {
    craftOne();
  }
}

function craftOne() {
  const previewStack = outputCell.firstElementChild;
  if (!previewStack) return;

  const item = previewStack.getAttribute('data-item');
  const craftCount = getCount(previewStack);
  const stackSize = stackSizes[item] ?? 64;

  const heldStack = grabbedStack.firstElementChild;
  if (heldStack !== null) {
    if (heldStack.getAttribute('data-item') !== item) {
      return;
    }

    const heldCount = getCount(heldStack);
    if (heldCount + craftCount > stackSize) {
      return;
    }

    setCount(heldStack, heldCount + craftCount);
  } else {
    grabbedStack.appendChild(createItem(item, craftCount));
  }
  consumeIngredients();
  document.dispatchEvent(new CraftEvent(item));
}

function craftAll() {
  const previewStack = outputCell.firstElementChild;
  if (!previewStack) return;

  const item = previewStack.getAttribute('data-item');
  const craftCount = getCount(previewStack);
  const stackSize = stackSizes[item] ?? 64;

  let success = false;

  do {
    let unallocated = craftCount;

    const nonEmptyTargets = [];
    let emptyTarget = null;

    for (const cell of inventoryGrid.children) {
      const stack = cell.firstElementChild;
      if (stack === null) {
        // This slot is empty.
        // All crafting outputs that don't fit into existing stacks
        // will be deposited into the first empty slot.
        emptyTarget ??= cell;
        continue;
      }

      if (stack.getAttribute('data-item') !== item) {
        // This slot already contains a different item,
        // so we can't add crafting outputs to it.
        continue;
      }

      const spareCapacity = stackSize - getCount(stack);
      if (spareCapacity <= 0) {
        // This slot contains the correct item, but is already full.
        continue;
      }

      const amountToAdd = Math.min(unallocated, spareCapacity);
      unallocated -= amountToAdd;
      nonEmptyTargets.push([stack, amountToAdd]);

      if (unallocated === 0) {
        // All crafting outputs can fit into existing stacks of the item.
        break;
      }
    }

    if (unallocated > 0 && emptyTarget === null) {
      // The inventory is full: no slots are empty and existing stacks don't have enough room.
      // Abort this attempt and conclude the loop.
      break;
    }

    // Add crafting output to existing stacks, to whatever extent possible.
    for (const [stack, amountToAdd] of nonEmptyTargets) {
      setCount(stack, getCount(stack) + amountToAdd);
    }

    // Put any remaining items into the first empty slot.
    if (unallocated > 0) {
      emptyTarget.appendChild(createItem(item, unallocated));
    }

    success = true;

    // Consume one set of ingredients.
    // Cease crafting if this causes the recipe output to change.
  } while (!consumeIngredients());

  if (success) {
    document.dispatchEvent(new CraftEvent(item));
  }
}

function consumeIngredients() {
  let anyExhausted = false;

  for (const cell of craftingGrid.children) {
    const stack = cell.firstElementChild;
    if (!stack) continue;

    const count = getCount(stack);
    if (count === 1) {
      stack.remove();
      anyExhausted = true;
    } else {
      setCount(stack, count - 1);
    }
  }

  return anyExhausted && updateRecipeOutput();
}

// Returns whether the output actually changed
function updateRecipeOutput() {
  const outputStack = outputCell.firstElementChild;

  const output = getRecipeOutput();
  if (output === null) {
    if (outputStack === null) {
      return false;
    } else {
      outputStack.remove();
      return true;
    }
  }

  const [item, count] = output;
  if (outputStack === null) {
    outputCell.appendChild(createItem(item, count));
    return true;
  }

  if (outputStack.getAttribute('data-item') === item && getCount(outputStack) === count) {
    return false;
  }

  outputStack.setAttribute('data-item', item);
  setCount(outputStack, count);
  return true;
}

export function consumeClock() {
  if (state === 'split-exhausted') {
    commitSplit();
  }

  if (state === 'split-evenly' && splitTargets.size > 1) {
    // oh dear. this is a complicated situation
    // first, let's try to search for uninvolved clocks
    const uninvolved = document.querySelector('inventory-cell > item-stack[data-item="clock"]:not([data-original-count]):not(crafting-output item-stack)');
    if (!!uninvolved) {
      const count = getCount(uninvolved);
      if (count === 1) {
        uninvolved.remove();
      } else {
        setCount(uninvolved, count - 1);
      }
      // phew
      return;
    }

    // okay so we will actually need to remove a clock from the items being split, ugh
    // not a lot of code, but low confidence that it works properly
    const heldStack = grabbedStack.firstElementChild;
    const count = +heldStack.getAttribute('data-original-count');
    heldStack.setAttribute('data-original-count', count - 1);
    updateSplitPreview();
    return;
  }

  const stack = document.querySelector('item-stack[data-item="clock"][data-count]:not(crafting-output item-stack)')
  const count = getCount(stack);
  if (count === 1) {
    if (stack.parentElement === grabbedStack) {
      // conclude drag operations if they're done using a stack of clocks that gets deleted
      state = 'idle';
    }
    stack.remove();
  } else {
    setCount(stack, count - 1);
  }
}

function getCount(itemStack) {
  return +itemStack.getAttribute('data-count');
}

function setCount(itemStack, value) {
  itemStack.setAttribute('data-count', value);
  itemStack.firstElementChild.textContent = value.toString();
}

function depositOne(targetCell) {
  const heldStack = grabbedStack.firstElementChild;
  const item = heldStack.getAttribute('data-item');
  const heldCount = getCount(heldStack);

  const stackSize = stackSizes[item] ?? 64;

  const targetStack = targetCell.firstElementChild;
  if (targetStack) {
    if (targetStack.getAttribute('data-item') !== item) {
      return;
    }

    const targetCount = getCount(targetStack);
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

  updateRecipeOutput();
}

function shiftClickTransfer(sourceStack, targetGrid) {
  const item = sourceStack.getAttribute('data-item');
  const stackSize = stackSizes[item] ?? 64;
  let count = getCount(sourceStack);

  // First, search for existing stacks to add to
  for (const cell of targetGrid.children) {
    const targetStack = cell.firstElementChild;
    if (!targetStack) continue;
    if (targetStack.getAttribute('data-item') !== item) continue;
    const curCount = getCount(targetStack);
    const available = stackSize - curCount;
    if (available === 0) continue; 

    const transferSize = Math.min(count, available);
    const newCount = curCount + transferSize;
    setCount(targetStack, newCount);
    
    count -= transferSize;
    if (count === 0) {
      sourceStack.remove();
      updateRecipeOutput();
      return;
    } else {
      setCount(sourceStack, count);
    }
  }

  // Now, look for any empty slots to move whatever's left to
  for (const cell of targetGrid.children) {
    if (!cell.firstElementChild) {
      cell.appendChild(sourceStack);
      break;
    }
  }

  updateRecipeOutput();
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
  const heldCount = getCount(heldStack);
  
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

  updateRecipeOutput();
}

function depositAll(targetCell) {
  const heldStack = grabbedStack.firstElementChild;
  const item = heldStack.getAttribute('data-item');
  const heldCount = getCount(heldStack);

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
      const targetCount = getCount(targetStack);
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

  updateRecipeOutput();
}
