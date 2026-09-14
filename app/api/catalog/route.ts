import { eq } from "drizzle-orm";
import { getOptionalDb } from "../../../db";
import { productOffers, products as productRows } from "../../../db/schema";
import { initialProducts, type Product } from "../../planner";
import { normalizeProduct } from '../../catalog-data';

export async function GET() {
  const db = getOptionalDb();
  if (!db) return Response.json({ products: initialProducts, source: "snapshot", count: initialProducts.length });
  const rows = await db.select().from(productRows);
  if (!rows.length) return Response.json({ products: initialProducts, source: "snapshot", count: initialProducts.length });
  const offers = await db.select().from(productOffers);
  const byProduct = new Map<string, Product["offers"]>();
  for (const offer of offers.filter(offer=>offer.inStock&&Number.isFinite(offer.price)&&offer.price>0)) {
    const list = byProduct.get(offer.productId) ?? [];
    list.push({ store: offer.store, price: offer.price, updated: offer.updatedAt });
    byProduct.set(offer.productId, list);
  }
  const products: Product[] = rows.map((row) => ({
    id: row.id, uuid: row.uuid, name: row.name, title: row.title, image: row.image,
    packAmount: row.packAmount, packLabel: row.packLabel, kcal: row.kcal, p: row.protein,
    c: row.carbs, f: row.fat, category: row.category, vegan: row.vegan,
    allergens: JSON.parse(row.allergens || "[]") as string[], unit: row.unit,
    offers: byProduct.get(row.id) ?? [], source: row.source,
  }));
  return Response.json({ products:products.map(normalizeProduct), source: "d1", count: products.length }, { headers: { "Cache-Control": "public, max-age=300" } });
}
