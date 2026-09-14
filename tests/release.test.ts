import test from 'node:test';
import assert from 'node:assert/strict';
import { barcodeValid, compareOffers, readPantry, shoppingQuantity, csvCell } from '../app/commerce';
import { catalogAnswer, guideContext, retrieveFoods } from '../app/guide';
import { buildPlan, defaults, initialProducts, groceries, productFor, recipes, restorePlan, nutrition, validate, type Config } from '../app/planner';
import { packageQuantity, normalizeProduct, catalogCategory } from '../app/catalog-data';
import { configSchema } from '../app/validation';
import { allowRequest, readJson } from '../server/http';
import { POST as chat } from '../app/api/chat/route';

test('pantry reduces whole packs without negative amounts',()=>{
  assert.deepEqual(shoppingQuantity(1200,500,300),{needed:900,packs:2});
  assert.deepEqual(shoppingQuantity(1200,500,2000),{needed:0,packs:0});
  assert.deepEqual(readPantry({rice:100,oats:-3,milk:'20',x:Infinity}),{rice:100});
  assert.throws(()=>shoppingQuantity(100,0));
  assert.throws(()=>shoppingQuantity(100,500,NaN));
});

test('package weights parse explicit units without fabricating counts or multipacks',()=>{
  assert.deepEqual(packageQuantity('Каша овсяная 240г'),{amount:240,unit:'g'});
  assert.deepEqual(packageQuantity('Молоко 2.5% 0,9 л'),{amount:900,unit:'ml'});
  assert.deepEqual(packageQuantity('Филе 1.5кг'),{amount:1500,unit:'g'});
  assert.equal(packageQuantity('Яйца 30шт'),null);
  assert.equal(packageQuantity('Батончики 4x50г'),null);
  assert.equal(packageQuantity('Набор 200г + 50г'),null);
  assert.equal(packageQuantity('Филе 800-1000г'),null);
  const imported={...initialProducts[0],id:'imported',title:'Каша овсяная 240г'};
  assert.equal(normalizeProduct(imported).packAmount,240);
  assert.equal(normalizeProduct({...imported,title:'Unknown pack'}).packAmount,0);
  assert.equal(normalizeProduct(initialProducts.find(p=>p.id==='banana')!).packAmount,660);
});

test('ingredient matching rejects unrelated categories, mixed foods and unknown pack sizes',()=>{
  const core=initialProducts.find(p=>p.id==='rice')!;
  const fake=(title:string,packAmount=1000)=>({...core,id:'imported',title,packAmount,offers:[{store:'Small',price:100,updated:'today'}]});
  for(const item of [fake('Хлопья овсяные 1кг'),fake('Рис со вкусом курицы 1кг'),fake('Рис 1кг',0)])assert.equal(productFor('rice',[core,item],['Small']),undefined);
  const match=fake('Рис длиннозерный 1кг');
  assert.equal(productFor('rice',[core,match],['Small'])?.id,match.id);
  assert.equal(productFor('chickpeas',initialProducts,['Small']),undefined);
  assert.throws(()=>nutrition({id:'missing',name:'missing',slot:'Main',tools:[],steps:[],minutes:1,ingredients:[['unknown',100]]},initialProducts));
});

test('product type takes precedence over flavour and household items are not food suggestions',()=>{
  assert.equal(catalogCategory('Чипсы со вкусом лосося 50г','Fish'),'Pantry');
  assert.equal(catalogCategory('Масло с чесноком для курицы 200мл','Meat'),'Pantry');
  assert.equal(catalogCategory('Филе цыпленка бройлера Кус-Вкус 1кг','Pantry'),'Meat');
  assert.equal(catalogCategory('Гель-уход с маслом жожоба 250мл','Pantry'),'Household');
  const household=normalizeProduct({...initialProducts[0],id:'shower-gel',title:'Гель для душа 250мл'});
  assert.equal(retrieveFoods('Гель', [household],guideContext(defaults,[])).length,0);
});

test('every generated recipe declares equipment for its uncooked ingredients',()=>{
  for(const recipe of recipes.filter(r=>r.id.startsWith('generated-'))){
    const ids=recipe.ingredients.map(([id])=>id);
    for(const tools of recipe.tools){
      assert.ok(tools.includes('Cutting board'),recipe.id);
      if(ids.some(id=>['rice','oats','buckwheat','lentils'].includes(id)))assert.ok(tools.includes('Microwave')||(tools.includes('Stovetop')&&tools.includes('Pot')),recipe.id);
      if(ids.includes('eggs')){assert.ok(tools.includes('Stovetop'),recipe.id);assert.match(recipe.steps.join(' '),/eggs until fully set/,recipe.id);}
    }
    if(!ids.includes('chickpeas'))assert.ok(!recipe.steps.some(step=>/^Drain the chickpeas/.test(step)),recipe.id);
  }
});

test('invalid saved preferences are rejected before rendering or planning',()=>{
  for(const value of [null,{...defaults,tools:null},{...defaults,stores:[{}]},{...defaults,diet:'invalid'},{...defaults,activity:Infinity}]){
    assert.equal(configSchema.safeParse(value).success,false);
    assert.ok(validate(value as Config));
  }
  assert.equal(restorePlan({config:defaults,days:Array(7).fill({})},initialProducts),null);
});
test('offers respect stores, reject invalid prices and deduplicate',()=>{
  const p={...initialProducts[0],offers:[{store:'Small',price:100,updated:'today'},{store:'Small',price:90,updated:'today'},{store:'Arbuz',price:20,updated:'today'},{store:'SPAR',price:NaN,updated:'today'}]};
  assert.equal(compareOffers(p,['Small','SPAR']).length,1);
  assert.equal(compareOffers(p,['Small'])[0].price,90);
});
test('barcodes validate their check digit',()=>{
  assert.equal(barcodeValid('3017620422003'),true);
  assert.equal(barcodeValid('3017620422004'),false);
  assert.equal(barcodeValid('abc'),false);
});
test('CSV quotes embedded commas and neutralizes formulas',()=>{
  assert.equal(csvCell('=1+1'),'"\'=1+1"');
  assert.equal(csvCell('Rice, "white"'),'"Rice, ""white"""');
});
test('guide respects exclusions and does not invent missing products',()=>{
  const context=guideContext({...defaults,diet:'Plant-based',allergens:['milk']},[]);
  const foods=retrieveFoods('protein',initialProducts,context);
  assert.ok(foods.length>0); assert.ok(foods.every(p=>p.vegan&&!p.allergens.includes('milk')));
  assert.match(catalogAnswer('xyzzyunobtainium',context,initialProducts).text,/could not match/);
});
test('request body limits and per-instance rate limits',async()=>{
  await assert.rejects(readJson(new Request('http://local',{method:'POST',body:'x'.repeat(50)}),10));
  assert.equal(allowRequest('test',1,100),true);assert.equal(allowRequest('test',1,101),false);assert.equal(allowRequest('test',1,60101),true);
});
test('chat rejects malformed context and cross-origin calls',async()=>{
  assert.equal((await chat(new Request('http://local/api/chat',{method:'POST',body:'{}'}))).status,400);
  assert.equal((await chat(new Request('http://local/api/chat',{method:'POST',headers:{origin:'http://evil'},body:'{}'}))).status,403);
});
test('catalog chat works with AI disabled and returns catalog sources',async()=>{
  const r=await chat(new Request('http://local/api/chat',{method:'POST',body:JSON.stringify({question:'protein',context:guideContext(defaults,[]),useAI:false})}));
  const data=await r.json() as {mode:string;sources:unknown[]};
  assert.equal(r.status,200);assert.equal(data.mode,'catalog');assert.ok(data.sources.length);
});
test('Small-only weekly plan honors store, budget, and finite totals',()=>{
  const config={...defaults,stores:['Small']};
  const days=buildPlan(config,initialProducts);
  const cart=groceries(days,initialProducts,config.stores);
  assert.equal(days.length,7);assert.ok(days.every(d=>Number.isFinite(d.kcal)&&d.meals.length===4));
  assert.ok(cart.every(i=>i.store==='Small'));assert.ok(cart.reduce((s,i)=>s+i.cost,0)<=config.max);
  const corrupted=structuredClone({config,days});
  corrupted.days[0].kcal=999999;
  corrupted.days[0].meals[0].recipe.steps=['Invented unsafe instruction'];
  const restored=restorePlan(corrupted,initialProducts)!;
  assert.ok(restored);assert.ok(restored.days[0].kcal<4001);
  assert.notDeepEqual(restored.days[0].meals[0].recipe.steps,['Invented unsafe instruction']);
  corrupted.days[0].meals[0].recipe.id='removed-recipe';
  assert.equal(restorePlan(corrupted,initialProducts),null);
});

test('each supported store can generate a complete week with the default kitchen',()=>{
  for(const store of defaults.stores.filter(s=>s!=='Small')){
    const config={...defaults,stores:[store],max:80000};
    let days;
    try{days=buildPlan(config,initialProducts);}catch(error){assert.fail(`${store}: ${error instanceof Error?error.message:error}`);}
    const cart=groceries(days,initialProducts,config.stores);
    assert.equal(days.length,7,store);assert.ok(cart.every(i=>i.store===store&&i.packs>0),store);
    assert.ok(cart.reduce((sum,i)=>sum+i.cost,0)<=config.max,store);
  }
});
test('AI integration parses Responses output and falls back after provider failure',async()=>{
  const oldFetch=globalThis.fetch;
  const oldEnv={ key:process.env.OPENAI_API_KEY,model:process.env.OPENAI_MODEL,enabled:process.env.ENABLE_AI_CHAT };
  process.env.OPENAI_API_KEY='test-key';process.env.OPENAI_MODEL='test-model';process.env.ENABLE_AI_CHAT='true';
  const request=()=>new Request('http://local/api/chat',{method:'POST',body:JSON.stringify({question:'protein',context:guideContext(defaults,[]),useAI:true})});
  try {
    globalThis.fetch=async (_url,init)=>{
      const body=JSON.parse(String(init?.body));assert.equal(body.store,false);assert.equal(body.model,'test-model');
      assert.ok(!String(init?.body).includes('"weight"'));
      return Response.json({output:[{content:[{type:'output_text',text:'A grounded answer.'}]}]});
    };
    assert.equal(((await (await chat(request())).json()) as {mode:string}).mode,'ai');
    globalThis.fetch=async()=>{throw new Error('provider outage');};
    const fallback=await (await chat(request())).json() as {mode:string;notice:string};
    assert.equal(fallback.mode,'catalog');assert.ok(fallback.notice);
  } finally {
    globalThis.fetch=oldFetch;
    for(const [key,value] of Object.entries({OPENAI_API_KEY:oldEnv.key,OPENAI_MODEL:oldEnv.model,ENABLE_AI_CHAT:oldEnv.enabled})) {
      if(value===undefined)delete process.env[key];else process.env[key]=value;
    }
  }
});
