import { z } from 'zod';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/database';
import { safeSlug } from '@/lib/olympus';
export async function GET(){const user=await getChatGPTUser();if(!user)return Response.json({error:'Bitte anmelden.'},{status:401});
  try{const data=await database().prepare('SELECT slug, title, chapter, image, offset, range_start AS start, range_end AS end, updated FROM reading_progress WHERE user_id = ? ORDER BY updated DESC LIMIT 100').bind(user.userId).all();return Response.json({progress:data.results},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Dein gespeicherter Fortschritt kann gerade nicht geladen werden.'},{status:503});}}
export async function POST(request:Request){
  if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Ungültige Anfrage.'},{status:403});
  const user=await getChatGPTUser();if(!user)return Response.json({error:'Bitte anmelden.'},{status:401});
  let p;try{p=z.object({slug:z.string(),title:z.string().min(1).max(400),chapter:z.string(),image:z.number().int().min(0).max(2000),offset:z.number().min(0).max(1),start:z.number().min(0),end:z.number().min(0)}).parse(await request.json());safeSlug(p.slug);safeSlug(p.chapter);if(typeof p.title!=='string'||!p.title||p.title.length>400||!Number.isInteger(p.image)||p.image<0||p.image>2000||![p.offset,p.start,p.end].every(Number.isFinite)||p.offset<0||p.offset>1||p.start<0||p.end<p.start)throw Error();}catch{return Response.json({error:'Ungültiger Lesepunkt.'},{status:400});}
  try{await database().prepare('INSERT INTO reading_progress (user_id,slug,title,chapter,image,offset,range_start,range_end,updated) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,slug) DO UPDATE SET title=excluded.title,chapter=excluded.chapter,image=excluded.image,offset=excluded.offset,range_start=excluded.range_start,range_end=excluded.range_end,updated=excluded.updated').bind(user.userId,p.slug,p.title,p.chapter,p.image,p.offset,p.start,p.end,Date.now()).run();return Response.json({saved:true});}catch{return Response.json({error:'Fortschritt konnte nicht gespeichert werden. Bitte erneut versuchen.'},{status:503});}}

