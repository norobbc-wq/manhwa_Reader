'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { BookOpen, Search, Bookmark, Layers, Loader2, X, ExternalLink, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Series, Chapter } from '@/lib/olympus';
type Progress={slug:string;title:string;chapter:string;image:number;offset:number;start:number;end:number;updated:number};
type Book=Series & {chapters:Chapter[]};
type Session={book:Book;chapters:Chapter[];start:number;end:number;resume?:Progress};
type Loaded={chapter:Chapter;images:string[];error?:string};
async function api<T>(url:string,options?:RequestInit):Promise<T>{const r=await fetch(url,options);const d=await r.json() as T & {error?:string};if(!r.ok)throw Error(d.error||'Die Anfrage konnte nicht abgeschlossen werden.');return d;}
const norm=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[\p{P}\p{Z}\s]/gu,'');
const sourceLink=(slug:string)=>`https://olympustaff.com/series/${slug}`;

function PageImage({src,index,chapter,onLoad,eager}:{src:string;index:number;chapter:string;onLoad:()=>void;eager:boolean}){
 const [failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 return failed?<div className="image-error"><AlertCircle size={24}/><p>Bild {index+1} konnte nicht geladen werden.</p><Button variant="outline" onClick={()=>{setFailed(false);setAttempt(a=>a+1);}}>Erneut laden</Button><a href={src} target="_blank" rel="noreferrer">Originalbild öffnen</a></div>:<img key={attempt} className="page-image" data-chapter={chapter} data-image={index} src={src} alt={`Kapitel ${chapter}, Bild ${index+1}`} loading={eager?'eager':'lazy'} decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(true)} onLoad={onLoad}/>;
}

export default function Reader(){
 const [query,setQuery]=useState(''),[catalog,setCatalog]=useState<Series[]>([]),[catalogStatus,setCatalogStatus]=useState(''),[searchError,setSearchError]=useState(''),[indexing,setIndexing]=useState(false);
 const catalogRef=useRef(new Map<string,Series>()),indexed=useRef(new Set<number>()),catalogPages=useRef(0),searchRun=useRef(0);
 const [library,setLibrary]=useState<Progress[]>([]),[libraryError,setLibraryError]=useState('');
 const [book,setBook]=useState<Book|null>(null),[busy,setBusy]=useState(''),[error,setError]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState('');
 const [session,setSession]=useState<Session|null>(null),[loaded,setLoaded]=useState<Loaded[]>([]),[loadingChapter,setLoadingChapter]=useState(false),[current,setCurrent]=useState(''),[saveStatus,setSaveStatus]=useState('Bereit');
 const [width,setWidth]=useState('full'),[toolsVisible,setToolsVisible]=useState(true);
 const sessionRef=useRef<Session|null>(null),loadedRef=useRef<Loaded[]>([]),pending=useRef<Progress|null>(null),dirty=useRef(false),saving=useRef(false),restoring=useRef(false),readerRun=useRef(0),chapterLock=useRef(false),endMarker=useRef<HTMLDivElement|null>(null);
 const loadLibrary=useCallback(async()=>{try{const d=await api<{progress:Progress[]}>('/api/progress');setLibrary(d.progress);setLibraryError('');}catch(e){setLibraryError((e as Error).message);}},[]);
 useEffect(()=>{
   async function initialize(){
     await loadLibrary();
     if(!location.hash.startsWith('#restore='))return;
     try{
       const points=JSON.parse(decodeURIComponent(location.hash.slice(9))) as Progress[];
       if(!Array.isArray(points)||points.length>100)throw Error('Ungültige Sicherung.');
       const existing=await api<{progress:Progress[]}>('/api/progress');
       for(const p of points){if(existing.progress.some(x=>x.slug===p.slug))continue;await api('/api/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});}
       history.replaceState(null,'',location.pathname+location.search);await loadLibrary();
     }catch{setLibraryError('Deine bisherigen Lesestände konnten noch nicht übernommen werden. Bitte diese Adresse erneut laden.');}
   }
   void initialize();
 },[loadLibrary]);
 useEffect(()=>{
   if(!session){setToolsVisible(true);return;}
   let lastY=window.scrollY,touchY=0;
   const scroll=()=>{const y=Math.max(0,window.scrollY),delta=y-lastY;if(restoring.current){lastY=y;return;}if(Math.abs(delta)<10)return;setToolsVisible(delta<0);lastY=y;};
   const wheel=(e:WheelEvent)=>{if(Math.abs(e.deltaY)>4)setToolsVisible(e.deltaY<0);};
   const touchStart=(e:TouchEvent)=>{touchY=e.touches[0]?.clientY||0;};
   const touchMove=(e:TouchEvent)=>{const y=e.touches[0]?.clientY||0;if(Math.abs(y-touchY)>10){setToolsVisible(y>touchY);touchY=y;}};
   const key=(e:KeyboardEvent)=>{if(e.key==='Escape'||e.key==='ArrowUp'||e.key==='PageUp')setToolsVisible(true);if(e.key==='ArrowDown'||e.key==='PageDown')setToolsVisible(false);};
   window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('wheel',wheel,{passive:true});window.addEventListener('touchstart',touchStart,{passive:true});window.addEventListener('touchmove',touchMove,{passive:true});window.addEventListener('keydown',key);
   return()=>{window.removeEventListener('scroll',scroll);window.removeEventListener('wheel',wheel);window.removeEventListener('touchstart',touchStart);window.removeEventListener('touchmove',touchMove);window.removeEventListener('keydown',key);};
 },[session]);
 const indexCatalog=useCallback(async()=>{
   const run=++searchRun.current;setIndexing(true);setSearchError('');
   try{
     async function page(n:number){const d=await api<{series:Series[];pages:number}>(`/api/catalog?page=${n}`);if(run!==searchRun.current)return;d.series.forEach(s=>catalogRef.current.set(s.slug,s));indexed.current.add(n);catalogPages.current=Math.max(catalogPages.current,d.pages);setCatalog([...catalogRef.current.values()]);setCatalogStatus(`${catalogRef.current.size} Titel · Katalog ${indexed.current.size}/${catalogPages.current}`);}
     if(!indexed.current.has(1))await page(1);
     for(let n=2;n<=catalogPages.current&&run===searchRun.current;n+=4){await Promise.all(Array.from({length:Math.min(4,catalogPages.current-n+1)},(_,i)=>n+i).filter(x=>!indexed.current.has(x)).map(page));}
     if(run===searchRun.current)setCatalogStatus(`${catalogRef.current.size} Titel auf Olympus`);
   }catch(e){if(run===searchRun.current)setSearchError((e as Error).message);}finally{if(run===searchRun.current)setIndexing(false);}
 },[]);
 useEffect(()=>{if(searchError||book||busy||query.trim().length<2||query.startsWith('http')||indexed.current.size===catalogPages.current&&catalogPages.current>0)return;const t=setTimeout(()=>{if(!indexing)void indexCatalog();},450);return()=>clearTimeout(t);},[query,indexCatalog,indexing,searchError,book,busy]);
 const save=useCallback(async(keepalive=false)=>{
   if(!pending.current||!dirty.current||saving.current)return;const p={...pending.current};dirty.current=false;saving.current=true;setSaveStatus('Wird gespeichert …');
   try{await api('/api/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p),keepalive});setSaveStatus('Fortschritt gespeichert');setLibrary(prev=>[p,...prev.filter(x=>x.slug!==p.slug)].slice(0,100));}
   catch{dirty.current=true;setSaveStatus('Speichern fehlgeschlagen · wird erneut versucht');}finally{saving.current=false;}
 },[]);
 const track=useCallback(()=>{
   const s=sessionRef.current;if(!s||restoring.current)return;
   const nodes=Array.from(document.querySelectorAll<HTMLImageElement>('.page-image'));
   const line=0;const img=nodes.find(x=>{const r=x.getBoundingClientRect();return r.bottom>line&&r.top<window.innerHeight&&x.complete&&x.naturalHeight>0;});if(!img)return;
   const r=img.getBoundingClientRect(),chapter=img.dataset.chapter!,image=Number(img.dataset.image),offset=Math.min(1,Math.max(0,(line-r.top)/r.height));
   pending.current={slug:s.book.slug,title:s.book.title,chapter,image,offset,start:s.start,end:s.end,updated:Date.now()};dirty.current=true;setCurrent(chapter);
 },[]);
 useEffect(()=>{let frame=0;const onScroll=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;track();});};const timer=setInterval(()=>void save(),2500);const leave=()=>void save(true);const hidden=()=>{if(document.visibilityState==='hidden')leave();};window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('pagehide',leave);document.addEventListener('visibilitychange',hidden);return()=>{clearInterval(timer);cancelAnimationFrame(frame);window.removeEventListener('scroll',onScroll);window.removeEventListener('pagehide',leave);document.removeEventListener('visibilitychange',hidden);};},[track,save]);
 const openBook=useCallback(async(s:Series,resume?:Progress)=>{
   ++searchRun.current;setIndexing(false);setBusy('Kapitelliste wird geladen …');setError('');setBook(null);
   try{
     const first=await api<Series&{chapters:Chapter[];pages:number}>(`/api/series?slug=${encodeURIComponent(s.slug)}&page=1`),all=new Map(first.chapters.map(c=>[c.id,c]));
     for(let p=2;p<=first.pages;p+=3){const pages=await Promise.all(Array.from({length:Math.min(3,first.pages-p+1)},(_,i)=>p+i).map(n=>api<{chapters:Chapter[]}>(`/api/series?slug=${encodeURIComponent(s.slug)}&page=${n}`)));pages.forEach(d=>d.chapters.forEach(c=>all.set(c.id,c)));setBusy(`Kapitelliste wird geladen … ${all.size} Kapitel`);}
     const b:Book={...first,title:first.title||s.title,chapters:[...all.values()].sort((a,b)=>a.number-b.number)};setBook(b);setFrom(String(b.chapters[0].number));setTo(String(b.chapters.at(-1)!.number));if(resume)begin(b,resume.start,resume.end,resume);
   }catch(e){setError((e as Error).message);}finally{setBusy('');}
 },[]);
 function begin(b:Book,start:number,end:number,resume?:Progress){
   if(!Number.isFinite(start)||!Number.isFinite(end)||start>end){setError('Bitte einen gültigen Kapitelbereich angeben.');return;}
   const selected=b.chapters.filter(c=>c.number>=start&&c.number<=end);if(!selected.length){setError('In diesem Bereich sind keine Kapitel verfügbar.');return;}
   if(resume&&!selected.some(c=>c.id===resume.chapter)){setError('Dein gespeichertes Kapitel ist auf Olympus derzeit nicht verfügbar. Wähle einen neuen Bereich.');return;}
   const s:Session={book:b,chapters:selected,start,end,resume};readerRun.current++;sessionRef.current=s;setSession(s);setToolsVisible(false);loadedRef.current=[];setLoaded([]);chapterLock.current=false;pending.current=null;dirty.current=false;restoring.current=!!resume;setCurrent(resume?.chapter||selected[0].id);setSaveStatus(resume?'Lesepunkt wird wiederhergestellt …':'Bereit');setError('');window.scrollTo(0,0);
 }
 const loadNext=useCallback(async(retry=false)=>{
   const s=sessionRef.current;if(!s||chapterLock.current)return;const list=loadedRef.current,last=list.at(-1);if(last?.error&&!retry)return;
   const initial=s.resume?s.chapters.findIndex(c=>c.id===s.resume!.chapter):0;
   const next=retry&&last?.error?last.chapter:list.length?s.chapters[s.chapters.findIndex(c=>c.id===last!.chapter.id)+1]:s.chapters[initial];if(!next)return;
   const run=readerRun.current;chapterLock.current=true;setLoadingChapter(true);
   try{const d=await api<{images:string[]}>(`/api/chapter?slug=${encodeURIComponent(s.book.slug)}&id=${encodeURIComponent(next.id)}`);if(run!==readerRun.current)return;const item={chapter:next,images:d.images};loadedRef.current=retry&&last?.error?[...list.slice(0,-1),item]:[...list,item];setLoaded(loadedRef.current);}
   catch(e){if(run!==readerRun.current)return;const item={chapter:next,images:[],error:(e as Error).message};loadedRef.current=retry&&last?.error?[...list.slice(0,-1),item]:[...list,item];setLoaded(loadedRef.current);}
   finally{if(run===readerRun.current){chapterLock.current=false;setLoadingChapter(false);}}
 },[]);
 useEffect(()=>{if(session)void loadNext();},[session,loadNext]);
 useEffect(()=>{const target=endMarker.current;if(!session||!target)return;const observer=new IntersectionObserver(entries=>{if(entries.some(x=>x.isIntersecting)&&!restoring.current)void loadNext();},{rootMargin:'1400px'});observer.observe(target);return()=>observer.disconnect();},[session,loaded,loadNext]);
 const imageLoaded=useCallback(()=>{
   const s=sessionRef.current;if(restoring.current&&s?.resume){const r=s.resume;const images=Array.from(document.querySelectorAll<HTMLImageElement>('.page-image')).filter(x=>x.dataset.chapter===r.chapter);const target=images.find(x=>Number(x.dataset.image)===r.image);
     if(!target)return;if(!images.filter(x=>Number(x.dataset.image)<=r.image).every(x=>x.complete&&x.naturalHeight>0))return;
     window.scrollTo(0,window.scrollY+target.getBoundingClientRect().top+target.getBoundingClientRect().height*r.offset);restoring.current=false;setSaveStatus('Lesepunkt wiederhergestellt');requestAnimationFrame(track);
   }else track();
 },[track]);
 async function leaveReader(){track();await save();if(dirty.current){setError('Dein Lesepunkt konnte noch nicht gespeichert werden. Bitte erneut versuchen.');return;}readerRun.current++;sessionRef.current=null;setSession(null);setLoaded([]);setError('');window.scrollTo(0,0);}
 const filtered=query.trim().length>=2?catalog.filter(s=>norm(s.title).includes(norm(query))):[];
 const savedForBook=book?library.find(x=>x.slug===book.slug):null;
 async function submitSearch(e:React.FormEvent){e.preventDefault();setError('');if(/^https?:/.test(query.trim())){try{const u=new URL(query.trim());if(u.hostname!=='olympustaff.com'||!/^\/series\/[^/]+\/?$/.test(u.pathname))throw Error();await openBook({slug:u.pathname.split('/')[2],title:''});}catch{setError('Bitte einen Olympus-Serienlink eingeben, z. B. https://olympustaff.com/series/ECD');}}else if(filtered.length===1)await openBook(filtered[0]);else if(!indexing)void indexCatalog();}
 useEffect(()=>{
   type Context={registerTool:(tool:unknown,options:{signal:AbortSignal})=>unknown};const context=(document as unknown as {modelContext?:Context}).modelContext;if(!context?.registerTool)return;const ctl=new AbortController();
   Promise.resolve(context.registerTool({name:'search_manhwa',title:'Manhwa suchen',description:'Setzt die sichtbare Titelsuche und lädt den Olympus-Katalog.',inputSchema:{type:'object',properties:{title:{type:'string',minLength:2,maxLength:300}},required:['title'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:async(input:unknown)=>{const title=(input as {title?:unknown}).title;if(typeof title!=='string'||title.trim().length<2||title.length>300)throw Error('Bitte einen gültigen Titel angeben.');setQuery(title);await indexCatalog();return {matches:[...catalogRef.current.values()].filter(s=>norm(s.title).includes(norm(title))).map(s=>({title:s.title,slug:s.slug}))};}}, {signal:ctl.signal})).catch(()=>{});return()=>ctl.abort();
 },[indexCatalog]);

 return <div className={session?`app reading${toolsVisible?'':' tools-hidden'}`:'app'}>
 <header className="topbar"><button className="brand" onClick={()=>{if(session)void leaveReader();else{setBook(null);setError('');}}}><span className="brand-icon"><BookOpen size={22}/></span><span>Manhwa<span className="brand-light"> Reader</span></span></button><div className="source-badge">OLYMPUS<span>Quelle</span></div>{session&&<Button variant="outline" onClick={()=>void leaveReader()}><X size={16}/>Bibliothek</Button>}</header>
 {session?<>
   <div className="reading-bar"><div><b dir="auto">{session.book.title}</b><span>Kapitel {current} · Bereich {session.start}–{session.end}</span></div><div className="reader-controls"><Select value={width} onValueChange={setWidth}><SelectTrigger aria-label="Lesebreite"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="full">Bildschirmfüllend</SelectItem><SelectItem value="640">Schmal</SelectItem><SelectItem value="800">Standard</SelectItem><SelectItem value="1100">Breit</SelectItem></SelectContent></Select><span className="saved-status" role="status">{saveStatus.includes('fehlgeschlagen')?<AlertCircle size={15}/>:<Bookmark size={15}/>} {saveStatus}</span></div></div>
   {error&&<div className="notice" role="alert">{error}</div>}
   <main className="reading-canvas" style={{maxWidth:width==='full'?'none':`${width}px`}}>{loaded.map(item=><section className="chapter" key={item.chapter.id}><div className="chapter-divider"><span>Kapitel {item.chapter.number}</span><a href={item.chapter.url} target="_blank" rel="noreferrer" aria-label={`Kapitel ${item.chapter.number} auf Olympus öffnen`}><ExternalLink size={16}/></a></div>{item.error?<div className="chapter-error" role="alert"><AlertCircle size={30}/><h2>Kapitel {item.chapter.number} konnte nicht geladen werden</h2><p>{item.error}</p><Button onClick={()=>void loadNext(true)}>Erneut versuchen</Button><a href={item.chapter.url} target="_blank" rel="noreferrer">Auf Olympus öffnen</a></div>:item.images.map((src,i)=><PageImage key={src} src={src} index={i} chapter={item.chapter.id} onLoad={imageLoaded} eager={!!session.resume && item.chapter.id===session.resume.chapter && i<=session.resume.image}/>)}</section>)}
   {session.resume&&restoring.current&&loaded.length>0&&<div className="notice">Lesepunkt wird geladen. Falls ein vorheriges Bild nicht lädt: <Button variant="outline" onClick={()=>{restoring.current=false;track();}}>Hier weiterlesen</Button></div>}
   <div ref={endMarker} className="reader-end">{loadingChapter?<><Loader2 className="spin"/>Kapitel wird geladen …</>:loaded.at(-1)?.error?null:loaded.at(-1)?.chapter.id===session.chapters.at(-1)?.id?<><Check/>Du hast das Ende deines Kapitelbereichs erreicht.<Button variant="outline" onClick={()=>void leaveReader()}>Zur Kapitelauswahl</Button></>:<Button variant="outline" onClick={()=>void loadNext()}>Nächstes Kapitel laden</Button>}</div></main>
 </>:<main className="workspace">
 <div className="intro-line"><span className="eyebrow">DEIN LESEPLATZ</span><span className="intro-meta">Arabische Kapitel · Originalquelle Olympus</span></div>
 <h1>Eine Geschichte.<br/><span>Ein durchgehender Lesefluss.</span></h1>
 <form className="search-form" onSubmit={submitSearch}><Search size={22}/><Input aria-label="Manhwa-Titel oder Olympus-Link" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Manhwa-Titel wie auf Olympus oder Serienlink" maxLength={400}/><Button type="submit" disabled={!!busy}>Suchen</Button></form>
 <div className="search-meta" role="status">{indexing?<><Loader2 className="spin" size={14}/>{catalogStatus||'Olympus-Katalog wird geladen …'}</>:catalogStatus||'Titel eingeben, Kapitel wählen und direkt weiterlesen.'}</div>
 {(searchError||error)&&<div className="notice" role="alert"><AlertCircle size={20}/><span>{searchError||error}</span>{searchError&&<Button variant="outline" onClick={()=>void indexCatalog()}>Erneut versuchen</Button>}</div>}
 {busy&&<div className="loading-box" role="status"><Loader2 className="spin"/>{busy}</div>}
 {filtered.length>0&&!book&&<section className="results"><div className="section-heading"><h2>Suchergebnisse</h2><span>{filtered.length} Treffer</span></div>{filtered.slice(0,60).map(s=><button className="result-row" key={s.slug} onClick={()=>void openBook(s)} disabled={!!busy}><span className="small-book"><BookOpen size={21}/></span><b dir="auto">{s.title}</b><span>Kapitel auswählen</span></button>)}</section>}
 {query.trim().length>=2&&!filtered.length&&!indexing&&!searchError&&catalogPages.current>0&&indexed.current.size===catalogPages.current&&!query.startsWith('http')&&<div className="empty-result">Kein passender Titel gefunden. Prüfe die Schreibweise oder füge den Serienlink von Olympus ein.</div>}
 {book&&<section className="selection"><div className="book-summary">{book.cover&&/^https:\/\//.test(book.cover)&&<img src={book.cover} alt="" referrerPolicy="no-referrer"/>}<div><span className="eyebrow">KAPITELAUSWAHL</span><h2 dir="auto">{book.title}</h2><p>{book.chapters.length} Kapitel gefunden · {book.chapters[0].number} bis {book.chapters.at(-1)!.number}</p><a href={sourceLink(book.slug)} target="_blank" rel="noreferrer">Original auf Olympus <ExternalLink size={14}/></a></div><button className="close-selection" aria-label="Kapitelauswahl schließen" onClick={()=>setBook(null)}><X/></button></div>
 <div className="range-controls"><label>Von Kapitel<Input type="number" step="any" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Bis Kapitel<Input type="number" step="any" value={to} onChange={e=>setTo(e.target.value)}/></label><Button onClick={()=>begin(book,from.trim()?Number(from):NaN,to.trim()?Number(to):NaN)}><BookOpen size={18}/>Bereich lesen</Button><Button variant="outline" onClick={()=>begin(book,book.chapters[0].number,book.chapters.at(-1)!.number)}><Layers size={18}/>Alle Kapitel</Button></div>{savedForBook&&<Button className="resume-button" variant="outline" onClick={()=>begin(book,savedForBook.start,savedForBook.end,savedForBook)}><Bookmark size={17}/>Fortsetzen · Kapitel {savedForBook.chapter}, Bild {savedForBook.image+1}</Button>}
 <details className="chapter-list"><summary>Verfügbare Kapitel anzeigen</summary><div>{book.chapters.map(c=><button key={c.id} onClick={()=>{setFrom(String(c.number));setTo(String(book.chapters.at(-1)!.number));}}>{c.number}</button>)}</div></details></section>}
 <section className="library"><div className="section-heading"><h2><Bookmark size={20}/>Weiterlesen</h2><span>Dein gespeicherter Fortschritt</span></div>{libraryError?<div className="notice" role="alert">{libraryError}<Button variant="outline" onClick={()=>void loadLibrary()}>Erneut laden</Button></div>:library.length?<div className="library-grid">{library.map(p=><button className="library-card" key={p.slug} disabled={!!busy} onClick={()=>void openBook({slug:p.slug,title:p.title},p)}><span className="eyebrow">ZULETZT GELESEN</span><h3 dir="auto">{p.title}</h3><div className="reading-position"><Bookmark size={16}/>Kapitel {p.chapter} · Bild {p.image+1}</div><div className="library-card-bottom"><span>{new Date(p.updated).toLocaleDateString('de-DE')}</span><b>Fortsetzen</b></div></button>)}</div>:<div className="library-empty"><div className="empty-icon"><Bookmark size={29}/></div><div><h3>Deine nächste Geschichte wartet.</h3><p>Suche einen Titel. Dein Lesepunkt erscheint hier automatisch.</p></div></div>}</section>
 <footer><span><Bookmark size={15}/>Kapitel und Leseposition werden automatisch gespeichert.</span><a href="https://olympustaff.com/" target="_blank" rel="noreferrer">Olympus öffnen <ExternalLink size={14}/></a></footer>
 </main>}
 </div>;
}


