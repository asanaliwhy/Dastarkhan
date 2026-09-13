import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";

/** D1 persistence model. JSON fields keep the first release flexible. */
export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  uuid: text("uuid").notNull(),
  name: text("name").notNull(),
  title: text("title").notNull(),
  image: text("image").notNull().default(""),
  packAmount: real("pack_amount").notNull(),
  packLabel: text("pack_label").notNull(),
  kcal: real("kcal").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  category: text("category").notNull(),
  vegan: integer("vegan", { mode: "boolean" }).notNull().default(false),
  allergens: text("allergens").notNull().default("[]"),
  unit: text("unit").notNull().default("g"),
  source: text("source").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const productOffers = sqliteTable(
  "product_offers",
  {
    productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    store: text("store").notNull(),
    price: integer("price").notNull(),
    inStock: integer("in_stock", { mode: "boolean" }).notNull().default(true),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.productId, table.store] }),
    storeIdx: index("product_offers_store_idx").on(table.store),
  }),
);

export const userProfiles = sqliteTable("user_profiles", {
  userId: text("user_id").primaryKey(),
  config: text("config").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const mealPlans = sqliteTable("meal_plans", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  config: text("config").notNull(),
  days: text("days").notNull(),
  basketTotal: integer("basket_total").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({ userIdx: index("meal_plans_user_idx").on(table.userId, table.createdAt) }));
