"use client";
import {useRef,useState} from 'react';
import {ExternalLink,Info,Search,LayoutGrid,List,ArrowUpRight,X} from 'lucide-react';
import {Config,Product,money,offer} from './planner';
import {ProductImage} from './product-image';
import {PriceComparison} from './price-comparison';
import {hasNutritionReference} from './catalog-data';
const nutritionValue=(p:Product,key:'kcal'|'p'|'c'|'f')=>hasNutritionReference(p)?p[key]:'—';

type LiveProduct={id:string;title:string;image:string;url:string;offers:Product['offers']};
const PAGE_SIZE=24;
export function Catalog({products,config,priceStatus}:{products:Product[];config:Config;priceStatus:string}) {
  const [search,setSearch]=useState(''),[category,setCategory]=useState('All foods'),[store,setStore]=useState('selected'),[sort,setSort]=useState('default'),[layout,setLayout]=useState('grid');
  const [results,setResults]=useState<LiveProduct[]|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[page,setPage]=useState(1);
  const [comparing,setComparing]=useState<Product|null>(null);
  const requestId=useRef(0), top=useRef<HTMLDivElement>(null);
  function returnToCatalog(){requestId.current++;setResults(null);setBusy(false);setError('');}
  const stores=store==='selected'?config.stores:store==='all'?[...new Set(products.flatMap(p=>p.offers.map(o=>o.store)))]:[store];
  const categories=['All foods',...new Set(products.map(p=>p.category))];
  function resetSearch(value:string){setSearch(value);setResults(null);setPage(1);requestId.current++;setBusy(false);setError('');}
  async function liveSearch(){
    if(search.trim().length<2){setError('Enter at least two characters to search Arzan.');return;}
    const id=++requestId.current;setBusy(true);setError('');
    try{const r=await fetch('/api/search?q='+encodeURIComponent(search));const d=await r.json() as {items?:LiveProduct[];error?:string};if(!r.ok)throw new Error(d.error||'Arzan search is unavailable.');if(id===requestId.current)setResults(d.items??[]);}
    catch(e){if(id===requestId.current)setError(e instanceof Error?e.message:'Search unavailable');}finally{if(id===requestId.current)setBusy(false);}
  }
  const filtered=products.filter(p=>(p.name+' '+p.title).toLowerCase().includes(search.trim().toLowerCase())&&(category==='All foods'||p.category===category)&&!!offer(p,stores)).sort((a,b)=>sort==='protein'?(hasNutritionReference(b)?b.p:-1)-(hasNutritionReference(a)?a.p:-1):sort==='price'?offer(a,stores)!.price-offer(b,stores)!.price:sort==='name'?a.name.localeCompare(b.name):0);
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE)),current=Math.min(page,pages),visible=filtered.slice((current-1)*PAGE_SIZE,current*PAGE_SIZE);
  function changePage(n:number){setPage(n);top.current?.scrollIntoView({block:'start'});}
  return <div ref={top}>
    {comparing&&<PriceComparison product={comparing} stores={stores} close={()=>setComparing(null)}/>}
    <div className="catalog-toolbar"><div className="search-field"><Search size={20}/><input aria-label="Search foods" placeholder="Search ingredients or products…" value={search} onChange={e=>resetSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&liveSearch()}/>{search&&<button aria-label="Clear search" onClick={()=>resetSearch('')}><X size={16}/></button>}</div><button className="secondary" onClick={liveSearch} disabled={busy}>{busy?'Searching Arzan…':'Search live on Arzan'}<ArrowUpRight size={16}/></button></div>
    <div className="catalog-filters"><label>Available at<select className="catalog-select" value={store} onChange={e=>{returnToCatalog();setStore(e.target.value);setPage(1);}}><option value="selected">My selected stores</option><option value="all">All Astana stores</option>{['MagnumGO','Small','Arbuz','SPAR','Galmart'].map(s=><option key={s}>{s}</option>)}</select></label><label>Sort by<select className="catalog-select" value={sort} disabled={results!==null} onChange={e=>{returnToCatalog();setSort(e.target.value);setPage(1);}}><option value="default">Recommended order</option><option value="price">Price: low to high</option><option value="protein">Highest protein / 100 g</option><option value="name">Name: A–Z</option></select></label><div className="view-switch" aria-label="Product layout"><button disabled={results!==null} aria-label="Grid view" aria-pressed={layout==='grid'} onClick={()=>setLayout('grid')}><LayoutGrid size={18}/></button><button disabled={results!==null} aria-label="List view" aria-pressed={layout==='list'} onClick={()=>setLayout('list')}><List size={18}/></button></div></div>
    {error&&<div className="notice warning" role="alert">{error}</div>}
    <div className="category-tabs" aria-label="Food categories">{categories.map(c=><button key={c} className={category===c?'active':''} aria-pressed={category===c} onClick={()=>{returnToCatalog();setCategory(c);setPage(1);}}>{c}</button>)}</div>
    <div className="catalog-count"><span><b>{results?results.length:filtered.length}</b> {results?'live search results':'products available'}<small>{priceStatus}</small></span><span className="nutrition-note"><Info size={14}/> Nutrition estimates per 100 g / ml</span></div>
    {results?<><button className="back-button" onClick={()=>resetSearch('')}>Back to food database</button><div className="product-grid">{results.map(p=>{const o=p.offers.filter(o=>stores.includes(o.store)).sort((a,b)=>a.price-b.price)[0];return <a className="product-card" key={p.id} href={p.url} target="_blank" rel="noreferrer"><ProductImage src={p.image} alt={p.title} large/><div className="product-card-body"><h3>{p.title}</h3><p>Nutrition not verified</p><div className="product-price"><b>{o?money(o.price):'No selected-store offer'}</b><ExternalLink size={15}/></div><small>{o?.store}</small></div></a>;})}</div>{!results.length&&<div className="empty content-card"><Search size={28}/><h2>No live products found</h2><p>Try a Russian product name or return to the food database.</p></div>}</>:<>
      {layout==='grid'?<div className="product-grid">{visible.map(p=>{const o=offer(p,stores)!;return <button className="product-card" key={p.id} onClick={()=>setComparing(p)} aria-label={"Compare prices for "+p.title}><div className="product-image-wrap"><ProductImage src={p.image} alt={p.title} large/><span className="product-category">{p.category}</span></div><div className="product-card-body"><h3>{p.name}</h3><p>{p.packLabel}</p><div className="product-macros">{hasNutritionReference(p)?<><span><b>{p.kcal}</b> kcal</span><span><b>{p.p}g</b> protein</span></>:<span>Package nutrition unavailable</span>}</div><div className="product-price"><b>{money(o.price)}</b><ArrowUpRight size={17}/></div><small>{o.store} · Compare stores</small></div></button>;})}</div>:<div className="content-card table-wrap"><table><thead><tr><th>Product</th><th>Calories</th><th>Protein</th><th>Carbs</th><th>Fat</th><th>Pack price</th></tr></thead><tbody>{visible.map(p=>{const o=offer(p,stores)!;return <tr key={p.id}><td><div className="product-cell"><ProductImage src={p.image} alt={p.title}/><span><b>{p.name}</b><small>{p.packLabel}</small></span></div></td><td>{nutritionValue(p,'kcal')}</td><td>{nutritionValue(p,'p')}</td><td>{nutritionValue(p,'c')}</td><td>{nutritionValue(p,'f')}</td><td><button className="secondary" onClick={()=>setComparing(p)}>{money(o.price)} · Compare</button><small>{o.store}</small></td></tr>;})}</tbody></table></div>}
      {!filtered.length&&<div className="empty content-card"><Search size={28}/><h2>No products match these filters.</h2><p>Try another store, food category, or search term.</p><button className="secondary" onClick={()=>{resetSearch('');setCategory('All foods');setStore('all');}}>Clear all filters</button></div>}
      {pages>1&&<nav className="pagination" aria-label="Catalog pagination"><button className="secondary" disabled={current===1} onClick={()=>changePage(current-1)}>Previous</button><span>Page {current} of {pages}</span><button className="secondary" disabled={current===pages} onClick={()=>changePage(current+1)}>Next</button></nav>}
    </>}
    <p className="catalog-disclaimer">Calories are kcal and macros are grams per 100 g / ml. Numbers are shown only for the core foods with generic nutrition references; — means unavailable. Imported category estimates are not used as package nutrition. Dry grains are measured before cooking. Check package labels. Live search products are not automatically added to recipes.</p>
  </div>;
}
