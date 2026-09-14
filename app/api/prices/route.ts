import { getOptionalDb } from '../../../db';
import { productOffers, products as productRows } from '../../../db/schema';
import {initialProducts, Product} from '../../planner';
import { eq } from 'drizzle-orm';
type JsonObject=Record<string,unknown>;
const isObject=(value:unknown):value is JsonObject=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const text=(value:unknown)=>typeof value==='string'?value:'';
const number=(value:unknown)=>typeof value==='number'?value:Number(value);
export async function GET(){
 // Refresh the 14 recipe ingredients; keep the expanded catalog on its saved snapshot.
 // This bounds the outbound fan-out while still returning the complete catalog to the UI.
 const refreshable=initialProducts.slice(0,14);
 const results=await Promise.allSettled(refreshable.map(async p=>{
  const response=await fetch(`https://api.arzan.kz/api/products/${p.uuid}/?city_id=2`,{signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('Arzan unavailable');
  const raw=await response.json() as unknown;const root=isObject(raw)?raw:{};const data=isObject(root.product)?root.product:root;
  const stores=Array.isArray(data.stores)?data.stores.filter(isObject):[];if(!Array.isArray(data.stores))throw new Error('Unexpected Arzan response');
  const offers=stores.filter(store=>store.in_stock===true&&store.hidden!==true&&Number.isFinite(number(store.price))&&number(store.price)>0&&number(store.city_id)===2).map(store=>({store:text(store.chain_name),price:number(store.price),updated:text(store.updated_at)})).filter(offer=>offer.store);
  return {...p,offers} satisfies Product;
 }));
 const refreshedByUuid=new Map(results.map((result,index)=>[refreshable[index].uuid,result.status==='fulfilled'?result.value:refreshable[index]]));
 const products=initialProducts.map(product=>refreshedByUuid.get(product.uuid)??product);
 const db=getOptionalDb();
 if(db){
  for(const product of products){
   await db.insert(productRows).values({id:product.id,uuid:product.uuid,name:product.name,title:product.title,image:product.image,packAmount:product.packAmount,packLabel:product.packLabel,kcal:product.kcal,protein:product.p,carbs:product.c,fat:product.f,category:product.category,vegan:product.vegan,allergens:JSON.stringify(product.allergens),unit:product.unit,source:product.source,updatedAt:new Date().toISOString()}).onConflictDoUpdate({target:productRows.id,set:{uuid:product.uuid,name:product.name,title:product.title,image:product.image,packAmount:product.packAmount,packLabel:product.packLabel,kcal:product.kcal,protein:product.p,carbs:product.c,fat:product.f,category:product.category,vegan:product.vegan,allergens:JSON.stringify(product.allergens),unit:product.unit,source:product.source,updatedAt:new Date().toISOString()}});
   // Replace each offer set atomically, including a successful empty response.
   // Otherwise removed/out-of-stock offers remain available after the next reload.
   await db.batch([
    db.delete(productOffers).where(eq(productOffers.productId,product.id)),
    ...product.offers.map(offer=>db.insert(productOffers).values({productId:product.id,store:offer.store,price:Math.round(offer.price),inStock:true,updatedAt:offer.updated})),
   ]);
  }
 }
 return Response.json({products,refreshed:results.filter(result=>result.status==='fulfilled').length,total:refreshable.length,checkedAt:new Date().toISOString(),persisted:!!db},{headers:{'Cache-Control':'public, max-age=300'}});
}
