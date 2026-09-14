import type { Product } from './planner';

export const referenceIds = ['chicken','oats','rice','buckwheat','lentils','eggs','tvorog','banana','tomato','cucumber','milk','chickpeas','tuna','oil'];
export const hasNutritionReference = (product: Product) => referenceIds.includes(product.id);

export function catalogCategory(title:string,fallback:string) {
  if(/^(?:гель|шампунь|мыло|крем|средство|порошок стиральный|кондиционер для|салфетки)/i.test(title))return 'Household';
  if(/^(?:масло|приправа|смесь|соус|лапша|чипсы|суп|бульон|заправка)/i.test(title))return 'Pantry';
  if(/^(?:филе|стейк)\s.*(?:лосос|семг|форел|треск|минтай|судак|хек)|^(?:тунец|лосось|семга|форель|рыба|скумбрия|сельдь)/i.test(title))return 'Fish';
  if(/^(?:филе|мясо|фарш|стейк|ребра|курица|говядина|свинина|баранина|тушка|голень|грудка|колбас|сосиск|ветчина|паштет)/i.test(title))return 'Meat';
  return fallback;
}

// Parse only explicit net weight/volume. Counts and edible/drained yields need
// separate evidence; never turn an unknown package into an assumed kilogram.
export function packageQuantity(title: string): { amount: number; unit: string } | null {
  const matches = [...title.matchAll(/(?<![\p{L}\d.,])(\d+(?:[.,]\d+)?)\s*(кг|мл|kg|ml|гр|г|л|g|l)(?![\p{L}])/giu)];
  if (matches.length !== 1 || /\d\s*[xх×*]/i.test(title) || /[xх×*]\s*\d/i.test(title) || /\d\s*[-–]\s*\d/.test(title)) return null;
  const [, number, suffix] = matches[0];
  const amount = Number(number.replace(',', '.')) * (/^(кг|kg|л|l)$/i.test(suffix) ? 1000 : 1);
  return amount > 0 && amount <= 100000 ? { amount, unit: /^(мл|ml|л|l)$/i.test(suffix) ? 'ml' : 'g' } : null;
}

export function normalizeProduct(product: Product): Product {
  if (hasNutritionReference(product)) return product; // Preserve documented usable yields.
  product={...product,name:product.title,category:catalogCategory(product.title,product.category)};
  const pack = packageQuantity(product.title);
  // Reuse the core recipe's explicitly approximate edible-weight conventions.
  // These are usable quantities, not a claim that shell/peel can be eaten.
  const eggs=/^яйц[оа]\s.*?\s(\d+)\s*шт\.?$/i.exec(product.title);
  if(eggs&&Number(eggs[1])<=100)return {...product,unit:'g',packAmount:Number(eggs[1])*45,packLabel:`${eggs[1]} eggs (~${Number(eggs[1])*45} g edible)`};
  if(pack?.unit==='g'&&/^бананы\s/i.test(product.title))return {...product,unit:'g',packAmount:pack.amount*0.66,packLabel:`${pack.amount} g (~${Math.round(pack.amount*0.66)} g peeled)`};
  return { ...product, packAmount: pack?.amount ?? 0, unit: pack?.unit ?? product.unit,
    packLabel: pack ? `${pack.amount} ${pack.unit}` : 'Check package quantity' };
}
