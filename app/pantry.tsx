'use client';
import { useState } from 'react';
import { Barcode, Plus, Trash2 } from 'lucide-react';
import type { Product } from './planner';
import type { Pantry } from './commerce';

type Detector = { detect(image: ImageBitmap):Promise<{rawValue:string}[]> };
export function PantryPanel({ products, pantry, update }: {products:Product[];pantry:Pantry;update:(value:Pantry)=>void}) {
  const [query,setQuery]=useState(''),[code,setCode]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const [identified,setIdentified]=useState<{name:string;source:string}|null>(null);
  const matches=query.trim().length>=2 ? products.filter(p=>p.category!=='Household'&&p.packAmount>0&&(p.title+' '+p.name).toLowerCase().includes(query.trim().toLowerCase())).slice(0,6):[];
  async function lookup(barcode:string) {
    setBusy(true);setMessage('');setIdentified(null);
    try { const r=await fetch('/api/barcode?code='+encodeURIComponent(barcode),{signal:AbortSignal.timeout(12000)}); const data=await r.json() as {error?:string;name:string;source:string}; if(!r.ok)throw new Error(data.error||'Barcode lookup is unavailable. Try again.');setIdentified(data);setQuery(data.name); }
    catch(e){setMessage(e instanceof Error?e.message:'Lookup failed.');}finally{setBusy(false);}
  }
  async function scan(file:File|undefined) {
    if(!file)return;
    const Constructor=(window as unknown as {BarcodeDetector?:new()=>Detector}).BarcodeDetector;
    if(!Constructor){setMessage('Photo scanning is not supported by this browser. Enter the printed barcode below.');return;}
    setBusy(true);setMessage('');
    let bitmap:ImageBitmap|undefined;
    try {bitmap=await createImageBitmap(file);const codes=await new Constructor().detect(bitmap);if(!codes[0])throw new Error('No barcode detected. Try a clear close-up or enter the printed number.');setCode(codes[0].rawValue);await lookup(codes[0].rawValue);}
    catch(e){setMessage(e instanceof Error?e.message:'Unable to scan image.');}finally{bitmap?.close();setBusy(false);}
  }
  return <details className="pantry-panel"><summary>Use what’s already in your kitchen <span>{Object.keys(pantry).length} saved items</span></summary>
    <p>Enter usable quantities in grams or millilitres. They reduce this list’s pack quantities. Your meal plan and calorie target stay the same.</p>
    <div className="pantry-search"><label>Find a catalog ingredient<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rice, milk, рис…"/></label></div>
    {identified&&<p>Identified: <a href={identified.source} target="_blank" rel="noreferrer">{identified.name}</a>. Confirm a matching ingredient below; lookup does not add it automatically.</p>}
    {query.length>=2&&!matches.length&&<p role="status">No exact catalog match. Try a shorter ingredient name.</p>}
    <ul className="pantry-matches">{matches.map(p=><li key={p.id}><span>{p.title}</span><button className="secondary" disabled={!!pantry[p.id]} onClick={()=>{update({...pantry,[p.id]:p.packAmount});setQuery('');}}><Plus size={16}/>{pantry[p.id]?'Added':'Add pack'}</button></li>)}</ul>
    <details><summary><Barcode size={16}/> Scan or enter a barcode</summary><p>The barcode number is looked up on Open Food Facts. Photos are processed on your device.</p><div className="barcode-controls"><label>Printed barcode<input inputMode="numeric" value={code} onChange={e=>setCode(e.target.value)} maxLength={14}/></label><button className="secondary" disabled={busy||!code} onClick={()=>void lookup(code)}>{busy?'Looking up…':'Look up'}</button><label className="secondary">Scan photo<input type="file" accept="image/*" capture="environment" disabled={busy} onChange={e=>void scan(e.target.files?.[0])}/></label></div></details>
    {message&&<p role="status" className="notice">{message}</p>}
    <ul className="pantry-owned">{Object.entries(pantry).map(([id,amount])=>{const p=products.find(p=>p.id===id);return <li key={id}><label>{p?.title??id}<span><input aria-label={`Available ${p?.name??id}`} type="number" min="0" max="100000" value={amount} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n)&&n>=0&&n<=100000)update({...pantry,[id]:n});}}/>{p?.unit??'g'}</span></label><button className="secondary" aria-label={`Remove ${p?.name??id} from pantry`} onClick={()=>{const next={...pantry};delete next[id];update(next);}}><Trash2 size={16}/></button></li>;})}</ul>
    <small>Saved on this device. Pantry is not consumed automatically when you check off purchases.</small>
  </details>;
}
