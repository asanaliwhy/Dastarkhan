import { offer, target, validate, type Config, type Product } from './planner';
import { compareOffers } from './commerce';
import { hasNutritionReference } from './catalog-data';

export type GuideContext = { stores: string[]; diet: string; allergens: string[]; tools: string[]; budget: number; calories: number | null; plan: string[] };
export type GuideReply = { text: string; sources: { title: string; url: string }[]; mode: 'catalog' | 'ai'; notice?: string };
export function guideContext(config: Config, names: string[]): GuideContext {
  return { stores: config.stores, diet: config.diet, allergens: config.allergens, tools: config.tools, budget: config.max, calories: validate(config) ? null : target(config), plan: names.slice(0, 28) };
}
export function retrieveFoods(question: string, products: Product[], context: GuideContext) {
  const tokens = question.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [];
  const protein = /protein|белок|белк|ақуыз/i.test(question);
  // Expanded snapshot categories are not reliable enough for protein rankings.
  const referenceIds = ['chicken','oats','rice','buckwheat','lentils','eggs','tvorog','banana','tomato','cucumber','milk','chickpeas','tuna','oil'];
  return products.filter(p => p.category!=='Household' && offer(p, context.stores) && !p.allergens.some(a => context.allergens.includes(a)) &&
    // Imported diet/allergen flags are category guesses, so never use them to
    // promise that a branded food satisfies an exclusion or plant-based diet.
    (!(context.allergens.length||context.diet==='Plant-based'||context.diet==='Vegetarian')||hasNutritionReference(p)) &&
    (!protein || (referenceIds.includes(p.id) && p.p >= 8)) &&
    (context.diet !== 'Plant-based' || p.vegan) && (context.diet !== 'Vegetarian' || !['Meat', 'Fish'].includes(p.category)))
    .map(p => ({ p, score: tokens.reduce((s, t) => s + ((p.name+' '+p.title).toLocaleLowerCase().includes(t) ? 10 : 0), 0) + (protein ? p.p / 10 : 0) }))
    .filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 6).map(x => x.p);
}
export function catalogAnswer(question: string, context: GuideContext, products: Product[]): GuideReply {
  const foods = retrieveFoods(question, products, context);
  const sources = foods.map(p => ({ title: p.title, url: p.source }));
  const rows = foods.map(p => {
    const offers = compareOffers(p, context.stores);
    return `${p.title}: ${hasNutritionReference(p) ? `~${p.kcal} kcal, ${p.p} g protein per 100 ${p.unit}` : 'package nutrition unavailable'}; ${offers.map(o => `${o.store}: ${o.price} ₸ (updated ${o.updated.slice(0, 10)})`).join('; ')}.`;
  });
  let text = rows.join('\n\n');
  if (/calori|калор|bulk|cut/i.test(question)) text = context.calories ? `Your current estimate is ${context.calories} kcal/day. It uses your saved adult profile and activity level. Adjust portions in the recipe preview; regenerate to update your week.` : 'Complete a supported adult profile before generating a calorie target.';
  else if (/budget|cost|бюджет|стоим/i.test(question)) text = `Your weekly limit is ${context.budget} ₸. Whole packs are compared across ${context.stores.join(', ')}. Pantry quantities reduce the shopping list; delivery and seasonings are extra.` + (text ? '\n\n'+text : '');
  else if (/tool|kitchen|құрал|кухн/i.test(question)) text = `Selected tools: ${context.tools.join(', ') || 'none'}. Recipes require a complete equipment combination. Only select equipment you actually have.`;
  else if (/plan|week|меню|жоспар/i.test(question) && context.plan.length) text = 'Your displayed meals include: '+[...new Set(context.plan)].slice(0, 10).join(', ')+'.';
  return { text: (text || 'I could not match that question to the available catalog. Try a food name in English or Russian, “protein options”, “my budget”, or “my calories”.') + (rows.length ? '\n\nNutrition above is a generic reference, not verified nutrition for these branded packs. Check the package.' : ''), sources, mode: 'catalog' };
}
