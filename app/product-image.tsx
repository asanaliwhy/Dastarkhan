"use client";
import {useState} from 'react';
import {ShoppingBasket} from 'lucide-react';
import {hiResImage} from './media';

export function ProductImage({src,alt,large=false}:{src?:string;alt:string;large?:boolean}) {
  const [failed,setFailed]=useState(false);
  return <div className={'product-photo'+(large?' large':'')}>
    {src&&!failed?<img src={hiResImage(src)} alt={alt} width="320" height="320" loading="lazy" decoding="async" onError={()=>setFailed(true)}/>:<span className="image-placeholder"><ShoppingBasket size={24}/><small>Photo unavailable</small></span>}
  </div>;
}
