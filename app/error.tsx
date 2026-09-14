'use client';
import { useEffect } from 'react';
import Link from 'next/link';
export default function ErrorPage({ error, reset }: {error:Error & {digest?:string};reset:()=>void}) {
  useEffect(()=>{ console.error(JSON.stringify({event:'render_failure',digest:error.digest??'client'})); },[error]);
  return <main className="empty"><h1>Let’s get your kitchen back.</h1><p>The page couldn’t finish loading. Your saved data remains on this device.</p><button className="primary auto-width" onClick={reset}>Try again</button><Link href="/">Return to planner</Link></main>;
}
