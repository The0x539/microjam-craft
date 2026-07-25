const ingredients = {
  i: 'ingot',
  l: 'log',
  p: 'plank',
  s: 'stick',
  d: 'dust',
  c: 'cobble',
  C: 'chest',
  S: 'string',
  g: 'gold',
}

function recipe(...shape) {
  return shape.map(line => Array.from(line).map(ch => {
    if (ch === ' ') {
      return null;
    } else {
      const item = ingredients[ch];
      console.assert(!!item);
      return item;
    }
  }));
}

export const recipes = {
  helmet: recipe(
    'iii',
    'i i',
  ),
  chestplate: recipe(
    'i i',
    'iii',
    'iii',
  ),
  leggings: recipe(
    'iii',
    'i i',
    'i i',
  ),
  boots: recipe(
    'i i',
    'i i',
  ),
  plank: recipe(
    'l',
  ),
  stick: recipe(
    'p',
    'p',
  ),
  pickaxe: recipe(
    'ppp',
    ' s ',
    ' s ',
  ),
  piston: recipe(
    'ppp',
    'cic',
    'cdc',
  ),
  chest: recipe(
    'ppp',
    'p p',
    'ppp',
  ),
  hopper: recipe(
    'i i',
    'iCi',
    ' i ',
  ),
  rod: recipe(
    '  s',
    ' sS',
    's S',
  ),
  bow: recipe(
    ' sS',
    's S',
    ' sS',
  ),
  clock: recipe(
    ' g ',
    'gdg',
    ' g ',
  ),
};

export const amounts = {
  plank: 4,
  stick: 4,
}

export const stackSizes = {
  helmet: 1,
  chestplate: 1,
  leggings: 1,
  boots: 1,
  pickaxe: 1,
  rod: 1,
  bow: 1,
}
