"use client";

import {useRef, useState} from 'react';
import {ExternalLink, Info, Search} from 'lucide-react';
import {Config, Product, money, offer} from './planner';
import {fallbackImage, hiResImage, imageAlt} from './media';

type LiveProduct = {id: string; title: string; image: string; url: string; offers: Product['offers']};
const PAGE_SIZE = 40;

export function Catalog({products, config, priceStatus}: {products: Product[]; config: Config; priceStatus: string}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<LiveProduct[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const requestId = useRef(0);

  async function liveSearch() {
    if (search.trim().length < 2) {
      setError('Enter at least two characters to search Arzan.');
      return;
    }
    const id = ++requestId.current;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/search?q=' + encodeURIComponent(search));
      const data = await response.json() as {items?: LiveProduct[]; error?: string};
      if (!response.ok) throw new Error(data.error);
      if (id === requestId.current) setResults(data.items ?? []);
    } catch (reason) {
      if (id === requestId.current) setError(reason instanceof Error ? reason.message : 'Search unavailable');
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }

  const filtered = products.filter((product) => (product.name + ' ' + product.title).toLowerCase().includes(search.toLowerCase()));
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleProducts = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const resetSearch = (value: string) => { setSearch(value); setResults(null); setPage(1); requestId.current++; setBusy(false); };

  return <>
    <div className="catalog-toolbar"><div className="search-field"><Search size={18}/><input aria-label="Search foods" placeholder="Search foods… or search Arzan in Russian" value={search} onChange={(event) => resetSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && liveSearch()}/></div><button className="secondary" onClick={liveSearch} disabled={busy}>{busy ? 'Searching…' : 'Search live on Arzan'}<ExternalLink size={14}/></button></div>
    {error && <div className="notice warning" role="alert">{error}</div>}
    <div className="source-note"><Info size={16}/><span>{priceStatus}. Nutrition is a generic estimate per 100 g (per 100 ml for milk and oil), separate from Arzan prices. Dry grains are measured before cooking.</span></div>
    {results ? <><button className="back-button" onClick={() => resetSearch('')}>Back to nutrition catalog</button><div className="live-grid">{results.map((product) => {const matchingOffer = product.offers.filter((item) => config.stores.includes(item.store)).sort((a, b) => a.price - b.price)[0]; return <a className="content-card live-product" href={product.url} key={product.id} target="_blank" rel="noreferrer"><div className="product-photo large"><img src={hiResImage(product.image)} alt={imageAlt(product.title)} loading="lazy" onError={(event) => {const img=event.currentTarget;if(img.dataset.fallback)return;img.dataset.fallback='1';img.src=fallbackImage('Produce')}}/></div><h3>{product.title}</h3><b>{matchingOffer ? money(matchingOffer.price) : 'No offer in selected stores'}</b><small>{matchingOffer?.store} · Nutrition not verified</small><span>View on Arzan <ExternalLink size={14}/></span></a>;})}</div>{!results.length && <div className="empty">No products found. Try a Russian product name.</div>}</> : <>
      <div className="catalog-count"><div><b>{filtered.length.toLocaleString()} nutrition-mapped products</b><small>{config.stores.length ? `Selected store snapshot: ${config.stores.map((store) => `${store} ${products.filter((product) => product.offers.some((offer) => offer.store === store)).length}`).join(' · ')}` : 'Select a store to see availability'}</small></div><span>{filtered.length ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)}` : 'No matches'}</span></div>
      <div className="content-card table-wrap"><table><thead><tr><th>Ingredient</th><th>Calories</th><th>Protein</th><th>Carbs</th><th>Fat</th><th>Pack from</th></tr></thead><tbody>{visibleProducts.map((product) => {const matchingOffer = offer(product, config.stores); return <tr key={product.id}><td><div className="product-cell"><div className="product-photo"><img src={hiResImage(product.image)} alt={imageAlt(product.title,product.name)} loading="lazy" onError={(event) => {const img=event.currentTarget;if(img.dataset.fallback)return;img.dataset.fallback='1';img.src=fallbackImage(product.category)}}/></div><span><b>{product.name}</b><small>{product.category} · {product.packLabel}</small></span></div></td><td>{product.kcal} kcal</td><td>{product.p} g</td><td>{product.c} g</td><td>{product.f} g</td><td><a href={product.source} target="_blank" rel="noreferrer">{matchingOffer ? money(matchingOffer.price) : 'Unavailable'}<ExternalLink size={12}/></a><small>{matchingOffer?.store}</small></td></tr>;})}</tbody></table>{!filtered.length && <div className="empty">No matching ingredient in the catalog. Search live on Arzan for more products.</div>}</div>
      {filtered.length > PAGE_SIZE && <div className="pagination" aria-label="Catalog pagination"><button className="secondary" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1}>Previous</button><span>Page {currentPage} of {pageCount}</span><button className="secondary" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={currentPage === pageCount}>Next</button></div>}
    </>}
    <p className="muted-small">Reference values describe generic foods, not exact branded products. Check the pack for verified nutrition. Live search results are not automatically added to recipes.</p>
  </>;
}
