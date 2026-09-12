type JsonObject=Record<string,unknown>;
const isObject=(value:unknown):value is JsonObject=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const text=(value:unknown)=>typeof value==='string'?value:'';
const number=(value:unknown)=>typeof value==='number'?value:Number(value);
export async function GET(req:Request){
 const q=new URL(req.url).searchParams.get('q')?.trim()||'';if(q.length<2||q.length>100)return Response.json({error:'Enter 2–100 characters.'},{status:400});
 try{const response=await fetch(`https://api.arzan.kz/api/search/?city_id=2&q=${encodeURIComponent(q)}`,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error('Arzan unavailable');const raw=await response.json() as unknown;const root=isObject(raw)?raw:{};const hits=Array.isArray(root.hits)?root.hits.filter(isObject).slice(0,16):[];const items=hits.map(product=>{const stores=Array.isArray(product.stores)?product.stores.filter(isObject):[];const offers=stores.filter(store=>number(store.city_id)===2&&store.in_stock===true&&store.hidden!==true&&number(store.price)>0).map(store=>({store:text(store.chain_name),price:number(store.price),updated:text(store.updated_at)})).filter(offer=>offer.store);const uuid=text(product.uuid);return {id:uuid,title:text(product.title),image:text(product.image_url),offers,url:`https://arzan.kz/ru/astana/p/${uuid}`};});return Response.json({items},{headers:{'Cache-Control':'public, max-age=300'}});}catch{return Response.json({error:'Arzan is unavailable right now. Your saved catalog is still available.'},{status:502});}
}
