"use client";
import {useState, useEffect, useRef} from 'react';
import {ChefHat, Check, Plus, ArrowRight, ArrowLeft, MapPin, Wallet, Utensils, CalendarDays, ShoppingBasket, Sprout, Flame, ExternalLink, MessageCircle, ChevronRight, LoaderCircle} from 'lucide-react';
import {Config, Product, Day, Meal, defaults, equipment, initialProducts, money, target, validate, groceries} from './planner';
import PlannerWorker from './planner-worker.ts?worker';
import {Preferences, PlanViews, Catalog, RecipeModal, ChatGuide} from './views';
import {Button} from '@/components/ui/button';
import {Locale, messages} from './i18n';

const icons = [ChefHat, CalendarDays, ShoppingBasket, Sprout];

function Kitchen({config, toggle}: {config: Config; toggle: (name: string) => void}) {
  return <section className="kitchen-card">
    <div className="card-heading"><div><h2>Make yourself at home.</h2><p>Select the tools you cook with. Your recipes will follow.</p></div><span className="selected-count"><Check size={14}/>{config.tools.length} selected</span></div>
    <div className="kitchen-workspace">
      <div className="kitchen-scene"><img src="/kitchen.png" width="1536" height="1024" alt="Kitchen with cooking tools you can select using the markers or checklist" fetchPriority="high"/>
        {equipment.map(([name,x,y]) => <button key={name} aria-label={name} aria-pressed={config.tools.includes(name)} onClick={() => toggle(name)} className={'hotspot '+(config.tools.includes(name)?'chosen':'')} style={{left:x+'%',top:y+'%'}}>{config.tools.includes(name)?<Check size={16}/>:<Plus size={16}/>}<span>{name}</span></button>)}
        <span className="scene-hint"><Plus size={14}/> Tap a marker to select a tool</span>
      </div>
      <div className="equipment-panel"><div className="equipment-heading"><h3>Your equipment</h3><span>8 available tools</span></div><div className="equipment-list">{equipment.map(([name]) => <button key={name} onClick={() => toggle(name)} aria-pressed={config.tools.includes(name)} className={'equipment-option '+(config.tools.includes(name)?'selected':'')}><span>{name}</span><span className="equipment-check">{config.tools.includes(name)&&<Check size={14}/>}</span></button>)}</div></div>
    </div>
    <div className="kitchen-caption"><ChefHat size={18}/><p>No fancy kitchen needed. Basic utensils, bowls, clean water and refrigeration are assumed.</p></div>
  </section>;
}

export default function Home() {
  const [config,setConfig]=useState<Config>(defaults), [step,setStep]=useState(0), [view,setView]=useState(0);
  const [products,setProducts]=useState<Product[]>(initialProducts), [days,setDays]=useState<Day[]>([]), [saved,setSaved]=useState<Config|null>(null);
  const [day,setDay]=useState(0), [error,setError]=useState(''), [recipe,setRecipe]=useState<Meal|null>(null), [busy,setBusy]=useState(false);
  const [planning,setPlanning]=useState(false), [priceStatus,setPriceStatus]=useState('Arzan price snapshot · 12 Sep 2026'), [chat,setChat]=useState(false);
  const [hydrated,setHydrated]=useState(false);
  const [language,setLanguage]=useState<Locale>('en');
  const copy=messages[language], tabs=copy.tabs;
  const variantRef=useRef(0), workerRef=useRef<Worker|null>(null), busyRef=useRef(false);
  const generationRef=useRef<(()=>Promise<{days:number;calories:number;basket:number}>)|null>(null), cancelRef=useRef<(()=>void)|null>(null);
  useEffect(() => () => workerRef.current?.terminate(),[]);
  useEffect(()=>{
    let active=true;
    const load=async()=>{
      try{const localLanguage=localStorage.getItem('dastarkhan.locale.v1') as Locale|null;if(localLanguage&&messages[localLanguage]&&active)setLanguage(localLanguage);const local=localStorage.getItem('dastarkhan.profile.v1');if(local&&active)setConfig({...defaults,...JSON.parse(local)});}catch{}
      try{const response=await fetch('/api/profile');const data=await response.json() as {config?:Config|null};if(active&&data.config)setConfig({...defaults,...data.config});}catch{}
      try{const localPlan=localStorage.getItem('dastarkhan.plan.v1');if(localPlan&&active){const plan=JSON.parse(localPlan) as {config:Config;days:Day[]};if(plan.days?.length===7){setSaved(plan.config);setDays(plan.days);setView(1);}}}catch{}
      try{const response=await fetch('/api/plans');const data=await response.json() as {plan?:{config:Config;days:Day[]}|null};if(active&&data.plan?.days?.length===7){setSaved(data.plan.config);setDays(data.plan.days);setView(1);}}catch{}
      try{const response=await fetch('/api/catalog');const data=await response.json() as {products?:Product[]};if(active&&data.products?.length)setProducts(data.products);}catch{}
      if(active)setHydrated(true);
    };
    void load();
    return()=>{active=false;};
  },[]);
  useEffect(()=>{document.documentElement.lang=language;try{localStorage.setItem('dastarkhan.locale.v1',language);}catch{}},[language]);
  useEffect(()=>{if(!hydrated)return;try{localStorage.setItem('dastarkhan.profile.v1',JSON.stringify(config));}catch{}const timer=window.setTimeout(()=>{void fetch('/api/profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({config})}).catch(()=>{});},500);return()=>window.clearTimeout(timer);},[config,hydrated]);
  const update=(patch:Partial<Config>) => {setConfig(c=>({...c,...patch}));setError('');};
  const toggle=(field:'tools'|'stores'|'allergens',name:string) => update({[field]:config[field].includes(name)?config[field].filter(x=>x!==name):[...config[field],name]});
  function navigate(next:number) {setView(next);setError('');window.scrollTo({top:0});}
  function goStep(next:number) {setStep(next);setError('');window.scrollTo({top:0});}
  async function generatePlan() {
    if(workerRef.current||busyRef.current)throw new Error('Please wait for the current operation to finish.');
    const issue=validate(config);if(issue)throw new Error(issue);
    const snapshot=structuredClone(config), priceSnapshot=products;
    setPlanning(true);setError('');
    return new Promise<{days:number;calories:number;basket:number}>((resolve,reject)=>{
      try{
        const worker=new PlannerWorker();workerRef.current=worker;
        const finish=()=>{worker.terminate();workerRef.current=null;cancelRef.current=null;setPlanning(false);};
        cancelRef.current=()=>{finish();reject(new DOMException('Planning cancelled','AbortError'));};
        worker.onmessage=(event:MessageEvent<{days?:Day[];error?:string}>)=>{
          if(event.data.days){const next=event.data.days;const basket=groceries(next,priceSnapshot,snapshot.stores).reduce((sum,g)=>sum+g.cost,0);setDays(next);setSaved(snapshot);setDay(0);setView(1);window.scrollTo({top:0});try{localStorage.setItem('dastarkhan.plan.v1',JSON.stringify({config:snapshot,days:next}));}catch{}void fetch('/api/plans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({config:snapshot,days:next,basketTotal:basket})}).catch(()=>{});finish();resolve({days:7,calories:target(snapshot),basket});}
          else{finish();reject(new Error(event.data.error||'Unable to build a plan. Please try again.'));}
        };
        worker.onerror=()=>{finish();reject(new Error('The planner could not start. Reload the page and try again.'));};
        worker.postMessage({config:snapshot,products:priceSnapshot,variant:variantRef.current++});
      }catch(reason){workerRef.current?.terminate();workerRef.current=null;setPlanning(false);reject(reason);}
    });
  }
  function generate(){void generatePlan().catch(reason=>{if(reason?.name!=='AbortError')setError(reason instanceof Error?reason.message:'Unable to build a plan.');});}
  useEffect(()=>{generationRef.current=generatePlan;});
  function nextStep(){if(step===1&&(!config.stores.length||config.min>config.max||config.min<0||config.max<1000)){setError('Choose at least one store and a valid budget range.');return;}if(step<2)goStep(step+1);else generate();}
  useEffect(()=>{
    const ctx=(document as Document & {modelContext?:{registerTool?:Function}}).modelContext;if(!ctx?.registerTool)return;const lifecycle=new AbortController();
    try{Promise.resolve(ctx.registerTool({name:'generate_meal_plan',title:'Generate a seven-day meal plan',description:'Generate and display a new seven-day plan using the current kitchen, budget, stores and food preferences. Replaces the existing plan.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async(input:unknown)=>{if(!input||typeof input!=='object'||Object.keys(input).length)throw new Error('Expected an empty object.');if(!generationRef.current)throw new Error('Planner is initializing.');return generationRef.current();}},{signal:lifecycle.signal})).catch(()=>{});}catch{}return()=>lifecycle.abort();
  },[]);
  async function refresh(){if(workerRef.current||busyRef.current)return;busyRef.current=true;setBusy(true);try{const r=await fetch('/api/prices');if(!r.ok)throw new Error();const d=await r.json() as {products:Product[];refreshed:number;total:number;persisted?:boolean};setProducts(d.products);setPriceStatus(`${d.refreshed} core products refreshed · ${d.persisted?'catalog synced to your account':'remaining prices from snapshot'}`);setDays([]);setSaved(null);try{localStorage.removeItem('dastarkhan.plan.v1');}catch{}}catch{setPriceStatus('Arzan unavailable · using 12 Sep 2026 snapshot');}finally{busyRef.current=false;setBusy(false);}}
  const total=days.length&&saved?groceries(days,products,saved.stores).reduce((s,g)=>s+g.cost,0):0;
  return <div className="app-shell"><a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="sidebar"><a className="brand" href="/" aria-label="Dastarkhan home"><span className="brand-mark"><Utensils size={21}/></span><span>dastarkhan<span className="brand-dot">.</span></span></a><p className="brand-caption">A good week starts here.</p>
      <nav aria-label="Main navigation">{tabs.map((name,i)=>{const Icon=icons[i];return <button key={name} aria-label={name} aria-current={view===i?'page':undefined} onClick={()=>navigate(i)} className={view===i?'nav-active':''}><Icon size={20}/><span className="nav-full">{name}</span><span className="nav-short">{copy.shortTabs[i]}</span>{view===i&&<ChevronRight className="nav-arrow" size={15}/>}</button>;})}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><Sprout size={24}/><h3>Less deciding.<br/>More enjoying.</h3><p>Meals that work with your kitchen and your budget.</p><button onClick={()=>setChat(true)}>Meet your meal guide <ArrowRight size={15}/></button></div><div className="profile"><span>N</span><div>My workspace<small>One person · metric units</small></div></div></div>
    </aside>
    <div className="main-shell"><header className="app-header"><span className="breadcrumb">Your workspace <ChevronRight size={14}/><b>{tabs[view]}</b></span><div className="header-actions"><label className="language-picker"><span className="sr-only">Language</span><select value={language} onChange={event=>setLanguage(event.target.value as Locale)} aria-label="Language"><option value="en">EN</option><option value="ru">RU</option><option value="kk">KZ</option></select></label><span className="location"><MapPin size={15}/>Astana, KZ</span><button className="help-button" onClick={()=>setChat(true)} aria-label="Ask meal guide"><MessageCircle size={19}/></button></div></header>
      <main id="main-content"><div className="intro"><div><h1>{copy.introTitles[view]}</h1><p>{copy.introDescriptions[view]}</p></div><span className="weekly-chip"><CalendarDays size={18}/><span>{copy.weekly}<small>{copy.planned}</small></span></span></div>
        {error&&<div role="alert" className="notice warning">{error}</div>}
        {planning&&<div className="planning-status" role="status"><LoaderCircle className="spin" size={20}/><div><b>Finding your week’s meals…</b><span>Matching recipes, portions and prices to your selections.</span></div><button className="secondary" onClick={()=>cancelRef.current?.()}>Cancel</button></div>}
        {view===0&&<><div className="steps" aria-label="Plan setup">{copy.steps.map((name,i)=><button key={name} disabled={planning} aria-current={i===step?'step':undefined} onClick={()=>goStep(i)} className={'step '+(i===step?'active':i<step?'complete':'')}><span className="step-number">{i<step?<Check size={16}/>:i+1}</span><span><b>{name}</b><small>{copy.stepHints[i]}</small></span></button>)}</div>
          <div className="builder-grid"><div className="builder-content" key={step}>{step===0?<Kitchen config={config} toggle={name=>toggle('tools',name)}/>:<Preferences step={step} config={config} products={products} update={update} toggle={toggle} refresh={refresh} busy={busy||planning} priceStatus={priceStatus}/>}</div>
            <aside className="plan-summary"><div className="summary-heading"><span className="summary-symbol"><Utensils size={22}/></span><div><h2>Your week is taking shape.</h2><p>7 days · 1 person</p></div></div>
              <div className="summary-line"><Wallet size={18}/><span>Weekly budget<small>Up to {money(config.max)}</small></span><button aria-label="Edit budget" onClick={()=>goStep(1)}>Edit</button></div>
              <div className="summary-line"><ChefHat size={18}/><span>Your kitchen<small>{config.tools.length} tools selected</small></span><button aria-label="Edit kitchen" onClick={()=>goStep(0)}>Edit</button></div>
              <div className="summary-line"><MapPin size={18}/><span>Shopping at<small>{config.stores.length?config.stores.join(', '):'Choose a store'}</small></span><button aria-label="Edit stores" onClick={()=>goStep(1)}>Edit</button></div>
              <div className="summary-line"><Sprout size={18}/><span>Eating style<small>{config.diet}</small></span><button aria-label="Edit eating style" onClick={()=>goStep(2)}>Edit</button></div>
              {step===2&&!validate(config)&&<div className="calorie-preview"><Flame size={18}/><span>Daily estimate</span><b>{target(config)} <small>kcal</small></b></div>}
              <div className="summary-note"><p>{step===0?'Your recipes will only use the equipment you select.':step===1?'We compare offers at your selected stores. Delivery and seasonings are extra.':'Portions follow your calorie estimate. Nutrition values are approximate.'}</p></div>
              <div className="builder-actions"><Button className="primary" disabled={planning||busy} onClick={nextStep}>{planning?'Building your plan…':step===0?'Continue to budget':step===1?'Continue to your goals':'Build my meal plan'}{planning?<LoaderCircle className="spin" size={17}/>:<ArrowRight size={17}/>}</Button>{step>0&&<button className="back-button" disabled={planning} onClick={()=>goStep(step-1)}><ArrowLeft size={14}/>Previous step</button>}</div><small className="center-note">Step {step+1} of 3 · Settings stay in this session</small>
            </aside>
          </div></>}
        {(view===1||view===2)&&!days.length&&<div className="empty content-card"><span className="empty-icon"><ChefHat size={36}/></span><h2>A well-fed week awaits.</h2><p>Choose your kitchen tools, set a budget, and tell us what you like. We’ll put it all on the menu.</p><Button className="primary auto-width" onClick={()=>{navigate(0);goStep(0);}}>Create my first plan <ArrowRight size={17}/></Button></div>}
        {(view===1||view===2)&&days.length>0&&saved&&<>{JSON.stringify(saved)!==JSON.stringify(config)&&<div className="notice">Your preferences have changed. This plan uses your previous settings. <button disabled={planning} onClick={generate}>Update my plan</button></div>}<PlanViews view={view} days={days} config={saved} products={products} day={day} setDay={setDay} generate={generate} setRecipe={setRecipe} setView={navigate} priceStatus={priceStatus}/></>}
        {view===3&&<Catalog products={products} config={config} priceStatus={priceStatus}/>}
        <footer><span>A little planning. A better everyday.</span><a href="https://arzan.kz/ru/astana" target="_blank" rel="noreferrer">Price data from Arzan <ExternalLink size={12}/></a></footer>
      </main>
    </div>
    <button className="chat-launcher" aria-label="Open meal guide" onClick={()=>setChat(true)}><MessageCircle size={20}/><span>Meal guide</span></button>
    {chat&&<ChatGuide config={saved||config} products={products} days={days} total={total} close={()=>setChat(false)}/>}
    {recipe&&<RecipeModal meal={recipe} products={products} stores={saved?.stores||config.stores} close={()=>setRecipe(null)}/>}
  </div>;
}
