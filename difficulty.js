export const scenarios = [
  {
    level: 0,
    items: {
      log: 2,
    },
    goal: ['chest'],
    time: _ => 10,
  },
  {
    level: 5,
    items: {
      plank: 7,
      cobble: 6,
      dust: 8,
      ingot: 4,
    },
    goal: ['piston'],
    time: d => 15 - d,
  },
  {
    level: 10,
    items: {
      log: 2,
      cobble: 4,
      dust: 2,
      ingot: 1,
    },
    goal: ['piston'],
    time: d => 15 - d,
  },
  {
    level: 13,
    items: {
      log: 8,
    },
    goal: ['pickaxe'],
    time: d => 15 - d,
  },
  {
    level: 18,
    items: {
      ingot: 8,
      plank: 8,
    },
    goal: ['hopper'],
    time: d => 20 - d,
  },
  {
    level: 21,
    items: {
      ingot: 12,
      log: 3,
    },
    goal: ['hopper'],
    time: d => 20 - d,
  },
  {
    level: 25,
    items: {
      ingot: 24,
    },
    goal: ['helmet', 'chestplate', 'leggings', 'boots'],
    time: d => 18 - d,
  },
  {
    level: 30,
    items: {
      ingot: 28,
      log: 1,
      string: 3,
    },
    goal: ['helmet', 'chestplate', 'leggings', 'boots', 'bow'],
    time: d => 30 - d,
  },
  {
    level: 35,
    items: {
      ingot: 24,
      log: 1,
      string: 3,
      gold: 64,
      dust: 17,
    },
    goal: ['helmet', 'chestplate', 'leggings', 'boots', 'bow'],
    time: _ => 15,
  },
  {
    level: 40,
    items: {
      ingot: 24,
      log: 1,
      string: 3,
      gold: 63,
      dust: 15,
    },
    goal: ['helmet', 'chestplate', 'leggings', 'boots', 'bow'],
    time: _ => 15,
  },
];
