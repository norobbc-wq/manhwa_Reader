import { source, parseSeries, pageCount } from '@/lib/olympus';
export async function GET(request:Request) {
  const page=Number(new URL(request.url).searchParams.get('page')||1);
  if(!Number.isInteger(page)||page<1||page>300) return Response.json({error:'Ungültige Katalogseite.'},{status:400});
  try{const html=await source(`/series?page=${page}`); const series=parseSeries(html); if(!series.length) throw new Error('Die Olympus-Titelliste konnte nicht gelesen werden.'); return Response.json({series,pages:pageCount(html)},{headers:{'Cache-Control':'private, max-age=180'}});}
  catch(e){return Response.json({error:(e as Error).message},{status:502});}
}
