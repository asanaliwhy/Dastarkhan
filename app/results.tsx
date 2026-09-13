"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, RefreshCw, Clock, Utensils, Download, ExternalLink, CheckCheck } from "lucide-react";
import { Config, Product, Day, Meal, groceries, money, nutrition, productFor, recipeCount, macroTargets } from "./planner";
import { ProductImage } from "./product-image";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Props = {
  view: number;
  days: Day[];
  config: Config;
  products: Product[];
  day: number;
  setDay: (n: number) => void;
  generate: (n: number) => void;
  setRecipe: (m: Meal) => void;
  setView: (n: number) => void;
  priceStatus: string;
};

export function PlanViews({ view, days, config, products, day, setDay, generate, setRecipe, setView, priceStatus }: Props) {
  const [checked, setChecked] = useState<string[]>([]);
  const [storeFilter, setStoreFilter] = useState("all");
  const cart = useMemo(() => groceries(days, products, config.stores), [days, products, config.stores]);
  const stores = useMemo(() => [...new Set(cart.map((item) => item.store))], [cart]);
  const visibleCart = storeFilter === "all" ? cart : cart.filter((item) => item.store === storeFilter);
  const total = cart.reduce((sum, item) => sum + item.cost, 0);
  const targets = macroTargets(config);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("dastarkhan.checked.v1") || "[]") as unknown;
      setChecked(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : []);
    } catch { setChecked([]); }
  }, [days]);

  useEffect(() => {
    try { localStorage.setItem("dastarkhan.checked.v1", JSON.stringify(checked)); } catch { /* storage is optional */ }
  }, [checked]);

  function toggleChecked(id: string) {
    setChecked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function download() {
    const rows = [
      ["Dastarkhan grocery list", "", "", ""],
      ["Source", priceStatus, "", ""],
      ["Store", "Product", "Packs", "Estimated cost"],
      ...cart.map((item) => [item.store, item.product.title, String(item.packs), money(item.cost)]),
      ["", "Total", "", money(total)],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = "dastarkhan-groceries.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function markAll() { setChecked((current) => current.length === cart.length ? [] : cart.map((item) => item.product.id)); }

  return <>
    {total > config.max && <div className="notice warning" role="status">This basket is above your saved budget. Refresh prices and generate a new plan.</div>}
    <div className="plan-stats">
      <div><small>Weekly basket</small><b>{money(total)}</b><span>{total < config.min ? "Below your preferred range" : "Within your maximum budget"}</span></div>
      <div><small>Daily calorie estimate</small><b>{Math.round(days[day].kcal)} <em>kcal</em></b><span>{config.diet} · one person</span></div>
      <div><small>Daily protein</small><b>{Math.round(days[day].p)} <em>g</em></b><span>Target {targets.protein} g · approximate</span></div>
    </div>
    {view === 1 ? <>
      <div className="toolbar"><div className="days" role="tablist" aria-label="Choose a day">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((name, index) => <button key={name} role="tab" aria-selected={day === index} className={day === index ? "active" : ""} onClick={() => setDay(index)}>{name}</button>)}</div><button className="secondary" onClick={() => generate(day + 1)}><RefreshCw size={15} /> New combination</button></div>
      {config.diet === "High protein" && days[day].p < targets.protein && <div className="notice" role="status">This day has {Math.round(days[day].p)} g protein against your {targets.protein} g target. Add more protein foods or broaden your stores.</div>}
      <div className="meal-grid">{days[day].meals.map((meal, index) => { const n = nutrition(meal.recipe, products, meal.scale, config.stores); return <button className="meal-card" key={`${meal.recipe.id}-${index}`} onClick={() => setRecipe(meal)} aria-label={`Open ${meal.recipe.name} recipe`}><div className={`meal-accent accent-${index}`}><span>{["Breakfast", "Lunch", "Dinner", "Snack"][index]}</span><Utensils size={27} /></div><div className="meal-ingredients">{meal.recipe.ingredients.slice(0, 3).map(([id]) => { const product = productFor(id, products, config.stores); return <ProductImage key={id} src={product?.image} alt={product?.title || id} />; })}<small>Ingredients</small></div><div className="meal-body"><span className="muted-small"><Clock size={13} /> {meal.recipe.minutes} min</span><h2>{meal.recipe.name.replace(/\s+\d{3}$/, "")}</h2><p>{meal.recipe.ingredients.map(([id]) => productFor(id, products, config.stores)?.name).join(" · ")}</p><div className="macro-row"><b>{Math.round(n.kcal)} kcal</b><span>{Math.round(n.p)}g protein</span></div><span className="recipe-link">Ingredients &amp; recipe <ArrowRight size={15} /></span></div></button>; })}</div>
      <div className="day-macros"><span>Today’s estimated macros</span><b>Protein {Math.round(days[day].p)}g</b><b>Carbs {Math.round(days[day].c)}g</b><b>Fat {Math.round(days[day].f)}g</b></div>
      <div className="macro-target-note">Daily target: {targets.kcal} kcal · {targets.protein} g protein · {targets.carbs} g carbs · {targets.fat} g fat. Values are estimates from product labels.</div>
      <div className="bottom-actions"><p className="muted-small">{recipeCount} recipe variations; combinations adapt to your tools, stores, and diet.</p><button className="primary auto-width" onClick={() => setView(2)}>See my grocery list <ArrowRight size={16} /></button></div>
    </> : <section className="content-card padded">
      <div className="split-heading"><div><h2>Your grocery list</h2><p>{checked.length} of {cart.length} items checked · {stores.length} stores</p></div><div className="grocery-actions"><button className="secondary" onClick={markAll}><CheckCheck size={15} /> {checked.length === cart.length ? "Clear checks" : "Mark all"}</button><button className="secondary" onClick={download}><Download size={15} /><span>Export CSV</span></button></div></div>
      {stores.length > 1 && <div className="store-filter" role="group" aria-label="Filter grocery list by store"><button className={storeFilter === "all" ? "active" : ""} onClick={() => setStoreFilter("all")}>All stores</button>{stores.map((store) => <button key={store} className={storeFilter === store ? "active" : ""} onClick={() => setStoreFilter(store)}>{store}</button>)}</div>}
      {[...new Set(visibleCart.map((item) => item.store))].map((store) => <div className="grocery-group" key={store}><h3>{store}<span>{money(visibleCart.filter((item) => item.store === store).reduce((sum, item) => sum + item.cost, 0))}</span></h3>{visibleCart.filter((item) => item.store === store).map((item) => <div key={item.product.id} className={`grocery-row ${checked.includes(item.product.id) ? "checked" : ""}`}><input aria-label={`Got ${item.product.name}`} type="checkbox" checked={checked.includes(item.product.id)} onChange={() => toggleChecked(item.product.id)} /><div><b>{item.product.name}</b><small>{item.packs} × {item.product.packLabel} · recipe use ≈ {Math.round(item.amount)} {item.product.unit}</small><a target="_blank" rel="noreferrer" href={item.product.source}>{item.product.title} <ExternalLink size={12} /></a></div><strong>{money(item.cost)}</strong></div>)}</div>)}
      <p className="muted-small">{priceStatus}. Whole packs are rounded up; unused quantities may remain. Delivery, water and seasonings are excluded. Verify prices before purchasing.</p>
    </section>}
  </>;
}

export function RecipeModal({ meal, products, stores = [], close }: { meal: Meal; products: Product[]; stores?: string[]; close: () => void }) {
  const [returnFocus] = useState(() => typeof document === "undefined" ? null : document.activeElement as HTMLElement | null);
  const [portion, setPortion] = useState(Math.max(0.5, Math.min(2.5, meal.scale)));
  const n = nutrition(meal.recipe, products, portion, stores);
  return <Dialog open onOpenChange={(open) => { if (!open) close(); }}><DialogContent className="recipe-dialog" onCloseAutoFocus={(event) => { event.preventDefault(); returnFocus?.focus(); }}>
    <div className="recipe-meta"><Clock size={16} />{meal.recipe.minutes} min <span>·</span>{Math.round(n.kcal)} kcal <span>·</span>{Math.round(n.p)}g protein</div>
    <DialogTitle>{meal.recipe.name.replace(/\s+\d{3}$/, "")}</DialogTitle>
    <DialogDescription>Adjust the portion to recalculate ingredients and nutrition.</DialogDescription>
    <div className="portion-control"><label htmlFor="portion">Portion size <b>{portion.toFixed(1)}×</b></label><input id="portion" type="range" min="0.5" max="2.5" step="0.1" value={portion} onChange={(event) => setPortion(Number(event.target.value))} /><div><span>½ portion</span><span>2½ portions</span></div></div>
    <div className="recipe-nutrition"><span>{Math.round(n.kcal)} kcal</span><span>{Math.round(n.p)} g protein</span><span>{Math.round(n.c)} g carbs</span><span>{Math.round(n.f)} g fat</span></div>
    <h3>What you’ll need</h3><ul>{meal.recipe.ingredients.map(([id, grams]) => { const product = productFor(id, products, stores); return <li key={id}><ProductImage src={product?.image} alt={product?.title || id} /><span>{product?.name || id}</span><b>{Math.round(grams * portion)} {product?.unit || "g"}</b></li>; })}</ul>
    <h3>Let’s get cooking</h3><ol>{meal.recipe.steps.map((step) => <li key={step}>{step}</li>)}</ol>
    <p className="muted-small">Nutrition is estimated from product labels and may vary by brand. Product photos show ingredients, not the finished dish. Follow package instructions.</p>
  </DialogContent></Dialog>;
}
