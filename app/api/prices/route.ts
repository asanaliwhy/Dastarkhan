import {initialProducts, Product} from '../../planner';
type JsonObject=Record<string,unknown>;
const isObject=(value:unknown):value is JsonObject=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const text=(value:unknown)=>typeof value==='string'?value:'';
const number=(value:unknown)=>typeof value==='number'?value:Number(value);
export async function GET(){
 const results=await Promise.allSettled(initialProducts.map(async p=>{
  const response=await fetch(`https://api.arzan.kz/api/products/${p.uuid}/?city_id=2`,{signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('Arzan unavailable');
  const raw=await response.json() as unknown;const root=isObject(raw)?raw:{};const data=isObject(root.product)?root.product:root;
  const stores=Array.isArray(data.stores)?data.stores.filter(isObject):[];if(!Array.isArray(data.stores))throw new Error('Unexpected Arzan response');
  const offers=stores.filter(store=>store.in_stock===true&&store.hidden!==true&&number(store.price)>0&&number(store.city_id)===2).map(store=>({store:text(store.chain_name),price:number(store.price),updated:text(store.updated_at)})).filter(offer=>offer.store);
  return {...p,offers} satisfies Product;
 }));
 const products=results.map((result,index)=>result.status==='fulfilled'?result.value:initialProducts[index]);
 return Response.json({products,refreshed:results.filter(result=>result.status==='fulfilled').length,total:products.length,checkedAt:new Date().toISOString()},{headers:{'Cache-Control':'public, max-age=300'}});
}
