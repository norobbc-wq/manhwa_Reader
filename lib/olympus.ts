export const ORIGIN = 'https://olympustaff.com';
export type Series = {slug:string;title:string;cover?:string};
export type Chapter = {id:string;number:number;url:string};
const cache = new Map<string,{time:number;html:string}>();
export function decode(s:string):string { return s.replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):+n)).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' '); }
export function plain(s:string):string { return decode(s.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim(); }
export function attr(s:string,key:string):string { return decode(s.match(new RegExp('(?:^|\\s)'+key+'\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))','i'))?.slice(1).find(Boolean)||''); }
export function safeSlug(s:string):string { if(!/^[\p{L}\p{N}_%-][\p{L}\p{N}_%.-]{0,199}$/u.test(s)) throw new Error('Ungültiger Serienlink.'); return s; }
export function sourceUrl(path:string):URL { const u=new URL(path,ORIGIN); if(u.origin!==ORIGIN || u.username || u.password || !/^\/series(?:\/[^/]+(?:\/[^/]+)?)?\/?$/.test(u.pathname)) throw new Error('Nur Olympus-Serien und Kapitel werden unterstützt.'); return u; }
export async function source(path:string):Promise<string> {
  const u=sourceUrl(path), key=u.href, hit=cache.get(key);
  if(hit && Date.now()-hit.time<300000) return hit.html;
  let r:Response;
  try { r=await fetch(u,{headers:{Accept:'text/html'},redirect:'manual',signal:AbortSignal.timeout(18000)}); }
  catch { throw new Error('Olympus ist gerade nicht erreichbar. Bitte später erneut versuchen.'); }
  if(r.status>=300 && r.status<400) { const next=sourceUrl(r.headers.get('location')||''); if(next.href===key) throw new Error('Olympus leitet diese Seite um.'); r=await fetch(next,{headers:{Accept:'text/html'},redirect:'error',signal:AbortSignal.timeout(18000)}); }
  if(!r.ok) throw new Error(r.status===403?'Olympus blockiert den Abruf dieser Seite. Du kannst das Kapitel auf Olympus öffnen.':`Olympus meldet Fehler ${r.status}. Bitte erneut versuchen.`);
  const html=await r.text();
  if(html.length>5_000_000) throw new Error('Die Olympus-Seite ist zu groß.');
  if(/WatchGuard Endpoint|Just a moment\.\.\.|cf-chl-/i.test(html)) throw new Error('Olympus ist gesperrt oder verlangt eine Browserprüfung. Öffne die Originalseite.');
  if(cache.size>=24) cache.delete(cache.keys().next().value!);
  cache.set(key,{time:Date.now(),html}); return html;
}
export function pageCount(html:string):number { let max=1; for(const m of html.matchAll(/[?&](?:amp;)?page=(\d+)/g)) max=Math.max(max,+m[1]); return Math.min(max,300); }
export function parseSeries(html:string):Series[] {
  const out=new Map<string,Series>();
  for(const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    let u:URL; try{u=sourceUrl(attr(m[1],'href'));}catch{continue;}
    const parts=u.pathname.split('/').filter(Boolean); if(parts.length!==2) continue;
    const heading=m[2].match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1];
    let title=plain(heading||m[2]); if(!title||/^(Manga Image|اقرا لاحقا|المفضلة)$/i.test(title)) continue;
    title=title.replace(/^(?:(?:مستمرة|متروك|مكتملة|مانها صيني|مانهوا كورية|مانجا يابانية)\s*)+/,'').trim();
    if(!title) continue;
    const slug=parts[1]; if(!out.has(slug)) out.set(slug,{slug,title});
  }
  return [...out.values()];
}
export function parseChapters(html:string,slug:string):Chapter[] {
  const found=new Map<string,Chapter>();
  for(const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    let u:URL; try{u=sourceUrl(attr(m[1],'href'));}catch{continue;}
    const p=u.pathname.split('/').filter(Boolean); if(p.length!==3||p[1]!==slug) continue;
    const numeric=p[2].match(/^\d+(?:\.\d+)?$/)?.[0] || plain(m[2]).match(/(?:الفصل|chapter)\s*(?:رقم\s*)?(\d+(?:\.\d+)?)/i)?.[1];
    if(numeric) found.set(p[2],{id:p[2],number:+numeric,url:u.href});
  }
  return [...found.values()].sort((a,b)=>a.number-b.number);
}
export function parseImages(html:string):string[] {
  const images:string[]=[];
  for(const m of html.matchAll(/<img\b([^>]*)>/gi)) {
    const a=m[1], alt=attr(a,'alt');
    const src=attr(a,'data-src')||attr(a,'data-original')||attr(a,'src');
    if(!src||(!/image of episode/i.test(alt)&&!/(?:^|\s)manga-chapter-img(?:\s|$)/i.test(attr(a,'class'))&&!/\/uploads\/[^/]+\/[^/]+\//i.test(src))) continue;
    try{const u=new URL(src,ORIGIN); if(u.protocol==='https:'&&!u.username&&!u.password&&(!/logo|avatar|banner|advert|loading|placeholder/i.test(u.pathname))) images.push(u.href);}catch{}
  }
  return [...new Set(images)];
}

