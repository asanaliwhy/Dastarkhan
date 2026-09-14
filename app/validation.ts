import { z } from 'zod';

const finite = z.number().finite();
export const configSchema = z.object({
  tools: z.array(z.enum(['Stovetop','Oven','Microwave','Blender','Kettle','Cutting board','Pan','Pot'])).max(8),
  stores: z.array(z.enum(['MagnumGO','Small','Arbuz','SPAR','Galmart'])).max(5),
  min: finite.min(0).max(10000000), max: finite.min(0).max(10000000),
  diet: z.enum(['Balanced','High protein','Plant-based','Vegetarian']),
  weight: finite.min(0).max(250), goal: finite.min(0).max(250), height: finite.min(0).max(220), age: finite.min(0).max(120),
  sex: z.enum(['male','female']), activity: z.union([z.literal(1.2),z.literal(1.375),z.literal(1.55),z.literal(1.725)]),
  allergens: z.array(z.enum(['milk','eggs','fish','gluten'])).max(4), eligible: z.boolean(),
}).strict();

export const savedPlanSchema = z.object({
  config: configSchema,
  days: z.array(z.object({
    meals: z.array(z.object({ recipe: z.object({id:z.string().max(100)}), scale: finite.min(0.5).max(2.5) })).length(4),
  })).length(7),
});

export const productSchema = z.object({
  id:z.string().min(1).max(150), uuid:z.string(), name:z.string(), title:z.string(), image:z.string(),
  packAmount:finite.min(0).max(100000), packLabel:z.string(),
  kcal:finite.min(0),p:finite.min(0),c:finite.min(0),f:finite.min(0),
  category:z.string(),vegan:z.boolean(),allergens:z.array(z.string()),unit:z.enum(['g','ml']),
  offers:z.array(z.object({store:z.string(),price:finite.positive(),updated:z.string()})),
  source:z.string().url().refine(url=>url.startsWith('https://arzan.kz/')),
});
export const catalogSchema=z.array(productSchema).min(1).max(10000).refine(products=>new Set(products.map(p=>p.id)).size===products.length);
