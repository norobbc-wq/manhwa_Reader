const COOKIE = 'manhwa_reader_device';
// An unguessable browser cookie identifies one personal progress collection.
// Reading records live in D1; no ChatGPT identity is needed or trusted here.
export function getReaderUser(request:Request, create=false) {
  const value=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  if(value&&/^[a-f0-9]{64}$/.test(value))return {userId:'device:'+value,cookie:null};
  if(!create)return null;
  const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
  const secure=new URL(request.url).protocol==='https:'?'; Secure':'';
  return {userId:'device:'+token,cookie:`${COOKIE}=${token}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`};
}
