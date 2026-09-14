'use client';
import { useEffect, useRef, useState } from 'react';
import { Send, LoaderCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { guideContext, type GuideReply } from './guide';
import type { Config, Product, Day } from './planner';
type Message = {role:'user'|'assistant';text:string;sources?:GuideReply['sources'];mode?:string};
export function ChatGuide({config,days,close}:{config:Config;products:Product[];days:Day[];total:number;close:()=>void}) {
  const [draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [messages,setMessages]=useState<Message[]>([{role:'assistant',text:'Salem! Ask about your meals, budget, or catalog products. I can show store prices and nutrition estimates with sources.'}]);
  const [ai,setAi]=useState(false),[useAI,setUseAI]=useState(false);
  const request=useRef<AbortController|null>(null),bottom=useRef<HTMLDivElement>(null);
  const [focus]=useState(()=>document.activeElement as HTMLElement|null);
  useEffect(()=>{const controller=new AbortController();void fetch('/api/health',{signal:controller.signal}).then(r=>r.json() as Promise<{ai:boolean}>).then(d=>setAi(d.ai===true)).catch(()=>{});return()=>{controller.abort();request.current?.abort();};},[]);
  useEffect(()=>{bottom.current?.scrollIntoView({block:'nearest'});},[messages,busy]);
  async function ask(question:string) {
    if(!question.trim()||request.current)return;
    setBusy(true);setError('');setDraft(question);
    const controller=new AbortController();request.current=controller;
    const timeout=window.setTimeout(()=>controller.abort(new DOMException('The guide took too long. Please try again.','TimeoutError')),25000);
    try {
      const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({question,context:guideContext(config,days.flatMap(d=>d.meals.map(m=>m.recipe.name))),useAI})});
      const reply=await response.json() as GuideReply & {error?:string};if(!response.ok)throw new Error(reply.error??'The guide is unavailable. Try again.');
      setMessages(current=>[...current,{role:'user' as const,text:question},{role:'assistant' as const,text:(reply.notice?reply.notice+'\n\n':'')+reply.text,sources:reply.sources,mode:reply.mode}].slice(-30));setDraft('');
    }catch(e){if(!controller.signal.aborted||controller.signal.reason?.name==='TimeoutError')setError(controller.signal.reason?.name==='TimeoutError'?'The guide took too long. Please try again.':e instanceof Error?e.message:'Please try again.');}
    finally{window.clearTimeout(timeout);request.current=null;setBusy(false);}
  }
  return <Dialog open onOpenChange={open=>{if(!open)close();}}><DialogContent className="guide-dialog" onCloseAutoFocus={e=>{e.preventDefault();focus?.focus();}}>
    <DialogTitle>Your meal guide</DialogTitle><DialogDescription>Catalog-grounded answers · snapshot prices · estimated nutrition</DialogDescription>
    {ai&&<label className="ai-opt-in"><input type="checkbox" checked={useAI} onChange={e=>setUseAI(e.target.checked)}/>Use AI for this conversation. Your question, meal names and food preferences will be sent to OpenAI.</label>}
    <div className="guide-messages" role="log" aria-label="Conversation">{messages.map((m,i)=><div key={i} className={'guide-message '+m.role}><small>{m.role==='user'?'You':m.mode==='ai'?'AI meal guide':'Catalog guide'}</small><p>{m.text}</p>{!!m.sources?.length&&<details><summary>Catalog sources ({m.sources.length})</summary><ul>{m.sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></li>)}</ul></details>}</div>)}{busy&&<p role="status"><LoaderCircle className="spin" size={16}/> Looking through your catalog…</p>}<div ref={bottom}/></div>
    {error&&<p role="alert" className="notice warning">{error}</p>}
    <div className="suggestions">{['Protein options','My budget','My calories'].map(q=><button key={q} disabled={busy} onClick={()=>void ask(q)}>{q}</button>)}</div>
    <form className="chat-input" onSubmit={e=>{e.preventDefault();void ask(draft);}}><input aria-label="Message meal guide" value={draft} disabled={busy} onChange={e=>setDraft(e.target.value)} placeholder="Ask about your meals…" maxLength={500}/><button disabled={busy||!draft.trim()} aria-label="Send question"><Send size={18}/></button></form>
  </DialogContent></Dialog>;
}
