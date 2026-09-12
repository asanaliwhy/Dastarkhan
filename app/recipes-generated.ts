import type {Recipe} from './planner';

const grainNames: Record<string, string> = {oats: 'oats', rice: 'rice', buckwheat: 'buckwheat'};
const proteinNames: Record<string, string> = {chicken: 'chicken', tuna: 'tuna', chickpeas: 'chickpea', lentils: 'lentil', eggs: 'egg'};
const produceNames: Record<string, string> = {tomato: 'tomato', cucumber: 'cucumber'};
const accents = ['herb', 'lemon', 'warm', 'garden', 'spiced', 'simple', 'savory', 'bright', 'weekday', 'green'];
const tools = {
  pot: [['Stovetop', 'Pot'], ['Microwave']] as string[][],
  pan: [['Stovetop', 'Pan'], ['Stovetop', 'Pan', 'Cutting board']] as string[][],
  board: [['Cutting board']] as string[][],
  none: [] as string[][],
};

const breakfast: Recipe[] = [];
for (let i = 0; i < 150; i += 1) {
  const grain = ['oats', 'rice', 'buckwheat'][i % 3];
  const veg = ['tomato', 'cucumber'][Math.floor(i / 3) % 2];
  const protein = i % 4 === 0 ? 'eggs' : i % 4 === 1 ? 'chickpeas' : null;
  const ingredients: [string, number][] = [[grain, 65 + (i % 4) * 10], [veg, 100 + (i % 3) * 30]];
  if (protein) ingredients.push([protein, protein === 'eggs' ? 90 : 120]);
  breakfast.push({
    id: `generated-breakfast-${i + 1}`,
    name: `${accents[i % accents.length]} ${grainNames[grain]} & ${produceNames[veg]} bowl ${String(i + 1).padStart(3, '0')}`,
    slot: 'Breakfast',
    tools: protein === 'eggs' ? tools.pan : tools.pot,
    ingredients,
    steps: protein === 'eggs'
      ? ['Cook the grain until tender according to the packet directions.', 'Wash and chop the vegetables.', 'Cook the eggs until fully set, then serve with the grain and vegetables.']
      : ['Rinse and cook the grain until tender.', 'Drain the chickpeas and wash the vegetables.', 'Combine everything and season to taste.'],
    minutes: 10 + (i % 3) * 5,
  });
}

const mains: Recipe[] = [];
for (let i = 0; i < 250; i += 1) {
  const protein = ['chicken', 'tuna', 'chickpeas', 'lentils', 'eggs'][i % 5];
  const grain = ['rice', 'buckwheat', 'oats'][Math.floor(i / 5) % 3];
  const veg = ['tomato', 'cucumber'][Math.floor(i / 2) % 2];
  const ingredients: [string, number][] = [[protein, protein === 'chicken' ? 180 + (i % 3) * 20 : 150 + (i % 4) * 25], [grain, 70 + (i % 4) * 10], [veg, 120 + (i % 3) * 30], ['oil', 10 + (i % 3) * 5]];
  mains.push({
    id: `generated-main-${i + 1}`,
    name: `${accents[(i + 3) % accents.length]} ${proteinNames[protein]} & ${grainNames[grain]} plate ${String(i + 1).padStart(3, '0')}`,
    slot: 'Main',
    tools: protein === 'tuna' || protein === 'chickpeas' ? tools.board : tools.pan,
    ingredients,
    steps: protein === 'chicken'
      ? ['Cook the grain in water until tender.', 'Pan-cook the chicken in oil until it reaches 74°C internally.', 'Wash and chop the vegetables, then serve everything together.']
      : ['Cook the grain according to the packet directions.', 'Drain or rinse the protein as needed.', 'Wash, chop and combine the vegetables with the grain and oil.'],
    minutes: 12 + (i % 4) * 6,
  });
}

const snacks: Recipe[] = [];
for (let i = 0; i < 100; i += 1) {
  const protein = i % 2 === 0 ? 'eggs' : 'chickpeas';
  const veg = i % 3 === 0 ? 'tomato' : 'cucumber';
  snacks.push({
    id: `generated-snack-${i + 1}`,
    name: `${accents[(i + 5) % accents.length]} ${proteinNames[protein]} & ${produceNames[veg]} snack ${String(i + 1).padStart(3, '0')}`,
    slot: 'Snack',
    tools: protein === 'eggs' ? tools.pot : tools.board,
    ingredients: [[protein, protein === 'eggs' ? 90 : 140], [veg, 100 + (i % 3) * 20]],
    steps: protein === 'eggs'
      ? ['Boil the eggs until fully set, then cool and peel.', 'Wash and slice the vegetables.', 'Serve together with a pinch of seasoning.']
      : ['Drain and rinse the chickpeas.', 'Wash and slice the vegetables.', 'Toss together and serve chilled or at room temperature.'],
    minutes: protein === 'eggs' ? 12 : 5,
  });
}

export const generatedRecipes: Recipe[] = [...breakfast, ...mains, ...snacks];
