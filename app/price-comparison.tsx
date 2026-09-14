'use client';
import { useState } from 'react';
import { compareOffers } from './commerce';
import { money, type Product } from './planner';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
export function PriceComparison({ product, stores, close }: {product:Product;stores:string[];close:()=>void}) {
  const [focus]=useState(()=>document.activeElement as HTMLElement|null);
  const offers=compareOffers(product,stores);
  return <Dialog open onOpenChange={open=>{if(!open)close();}}><DialogContent className="recipe-dialog" onCloseAutoFocus={e=>{e.preventDefault();focus?.focus();}}><DialogTitle>Compare this pack</DialogTitle><DialogDescription>{product.title} · {product.packLabel}</DialogDescription>
    <ul className="offer-list">{offers.map((o,i)=><li key={o.store}><span>{o.store}{i===0&&<small>Lowest listed price</small>}<small>Updated {o.updated.slice(0,10)||'date unavailable'}</small></span><b>{money(o.price)}</b></li>)}</ul>
    {!offers.length&&<p>No offers in these stores.</p>}
    {offers.length>1&&<p>Difference between lowest and highest listed price: <b>{money(offers.at(-1)!.price-offers[0].price)}</b>.</p>}
    <p className="muted-small">Same product and pack, across the stores in your catalog filter. Snapshot prices may change; stock and delivery are not guaranteed.</p><a className="secondary" href={product.source} target="_blank" rel="noreferrer">Check on Arzan</a>
  </DialogContent></Dialog>;
}
