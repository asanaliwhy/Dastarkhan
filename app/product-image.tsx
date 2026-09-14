"use client";
import {useState} from 'react';
import {ShoppingBasket} from 'lucide-react';
import {hiResImage} from './media';

export function ProductImage({src,alt,large=false}:{src?:string;alt:string;large?:boolean}) {
  const [failedSrc,setFailedSrc]=useState<string>();
  return <div className={'product-photo'+(large?' large':'')}>
    {src&&failedSrc!==src?<img src={hiResImage(src)} alt={alt} width="320" height="320" loading="lazy" decoding="async" onError={()=>setFailedSrc(src)}/>:<span className="image-placeholder"><ShoppingBasket size={24}/><small>Photo unavailable</small></span>}
  </div>;
}
