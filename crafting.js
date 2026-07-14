import { recipes, amounts } from './data.js';

export function getRecipeOutput() {
  const input = readGrid();
  if (input.length === 0) return null;

  const mirroredInput = input.map(row => row.toReversed());

  for (const [item, recipe] of Object.entries(recipes)) {
    const isMatch = compare(input, recipe) || compare(mirroredInput, recipe);
    if (!isMatch) continue;

    const amount = amounts[item] ?? 1;
    return [item, amount];
  }

  return null;
}

function last(arr) {
  return arr[arr.length - 1];
}

function isSymmetric(grid) {
  return grid.every(row => row[0] === last(row));
}

function readGrid() {
  const cells = document.querySelectorAll('crafting-grid > inventory-cell');

  const rows = [];
  for (let y = 0; y < 3; y++) {
    const row = [];
    for (let x = 0; x < 3; x++) {
      let item = null;
      const stack = cells[3 * y + x].firstElementChild;
      if (!!stack) {
        item = stack.getAttribute('data-item');
      }
      row.push(item);
    }
    rows.push(row);
  }

  trimGrid(rows);

  return rows;
}

function trimGrid(grid) {
  if (grid.flat().every(v => v === null)) {
    while (grid.length > 0) {
      grid.pop();
    }
    return;
  }

  // it is now established that the grid is non-empty,
  // so there will always be at least one row+col
  
  // trim blank rows from bottom
  while (last(grid).every(v => v === null)) {
    grid.pop();
  }

  // trim blank rows from top
  while (grid[0].every(v => v === null)) {
    grid.shift();
  }

  // trim blank columns from right
  while (grid.every(row => last(row) === null)) {
    for (const row of grid) {
      row.pop();
    }
  }

  // trim blank columns from left
  while (grid.every(row => row[0] === null)) {
    for (const row of grid) {
      row.shift();
    }
  }
}

function compare(a, b) {
  if (a.length !== b.length) return false;

  for (let y = 0; y < a.length; y++) {
    if (a[y].length !== b[y].length) return false;
    
    for (let x = 0; x < a[y].length; x++) {
      if (a[y][x] !== b[y][x]) return false;
    }
  }

  return true;
}
