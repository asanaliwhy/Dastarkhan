export function hiResImage(url:string){
  if(!url)return '';
  return url.replace(/([?&])w=240\b/,'$1w=1200').replace(/([?&])h=240\b/,'$1h=1200').replace(/%w/g,'1200').replace(/%h/g,'1200');
}

export function imageAlt(title:string,name?:string){return `${name||title} product photo`}

const categoryFallbacks:Record<string,string>={
  Produce:'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=85',
  Grains:'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=1200&q=85',
  Meat:'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=1200&q=85',
  Fish:'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=1200&q=85',
  'Eggs & dairy':'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=1200&q=85',
  Legumes:'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=1200&q=85',
  Pantry:'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=85',
  Drinks:'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=1200&q=85',
};
export function fallbackImage(category:string){return categoryFallbacks[category]||categoryFallbacks.Produce}
