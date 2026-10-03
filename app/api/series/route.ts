import { source, safeSlug, plain, attr, parseChapters, pageCount } from '@/lib/olympus';
export async function GET(request:Request) {
  try {
    const q=new URL(request.url).searchParams,slug=safeSlug(q.get('slug')||''),page=Number(q.get('page')||1);
    if(!Number.isInteger(page)||page<1||page>300) return Response.json({error:'Ungültige Kapitelseite.'},{status:400});
    const html=await source(`/series/${slug}?page=${page}`);
    const title=plain(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||slug);
    let cover=''; for(const m of html.matchAll(/<img\b([^>]*)>/gi)) if(attr(m[1],'alt')==='Manga Image') {cover=attr(m[1],'data-src')||attr(m[1],'src');break;}
    const chapters=parseChapters(html,slug); if(!chapters.length) throw new Error('Keine zugänglichen Kapitel gefunden. Möglicherweise wurde die Olympus-Seite geändert.');
    return Response.json({slug,title,cover,chapters,pages:pageCount(html)});
  } catch(e){return Response.json({error:(e as Error).message},{status:502});}
}
