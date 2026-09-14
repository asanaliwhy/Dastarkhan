import type { Product } from './planner';

export type Pantry = Record<string, number>;
export function csvCell(value:string) {
  const safe = /^[=+@\-\t\r]/.test(value) ? "'"+value : value;
  return '"'+safe.replaceAll('"','""')+'"';
}
export function readPantry(value: unknown): Pantry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([id, amount]) => id.length < 150 && typeof amount === 'number' && Number.isFinite(amount) && amount > 0 && amount <= 100000));
}
export function shoppingQuantity(amount: number, packAmount: number, owned = 0) {
  if (![amount, packAmount, owned].every(Number.isFinite) || amount < 0 || packAmount <= 0) throw new Error('A valid package quantity is required to calculate shopping packs.');
  const needed = Math.max(0, amount - Math.max(0, owned));
  return { needed, packs: Math.ceil(needed / packAmount) };
}
export function compareOffers(product: Product, stores: string[]) {
  // Compare the same product/pack only. Never sum different brands as equivalent.
  const cheapest = new Map<string, Product['offers'][number]>();
  for (const offer of product.offers) {
    if (!stores.includes(offer.store) || !Number.isFinite(offer.price) || offer.price <= 0) continue;
    if (!cheapest.has(offer.store) || offer.price < cheapest.get(offer.store)!.price) cheapest.set(offer.store, offer);
  }
  return [...cheapest.values()].sort((a, b) => a.price - b.price);
}
export function barcodeValid(value: string) {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return false;
  const digits = [...value].map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((total, n, i) => total + n * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - sum % 10) % 10 === check;
}
