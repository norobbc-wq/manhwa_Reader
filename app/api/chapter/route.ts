import { source, safeSlug, parseImages, ORIGIN } from '@/lib/olympus';
export async function GET(request:Request) {
  try{const q=new URL(request.url).searchParams,slug=safeSlug(q.get('slug')||''),id=safeSlug(q.get('id')||'');
    const url=`${ORIGIN}/series/${slug}/${id}`,html=await source(url),images=parseImages(html);
    if(!images.length) return Response.json({error:'Dieses Kapitel enthält keine frei abrufbaren Bilder. Öffne es auf Olympus.',url},{status:422});
    return Response.json({images,url});
  }catch(e){return Response.json({error:(e as Error).message},{status:502});}
}
