export const scenarios = [
  {
    upTo: 5,
    items: {
      plank: 7,
      cobble: 6,
      dust: 8,
      ingot: 4,
    },
    goal: ['piston'],
    time: d => 15 - d,
  },
];
