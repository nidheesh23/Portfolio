// Paste this entire module into the Cloudflare Worker editor.
let cachedKeys=[],keysExpire=0;
async function googleKeys(){
  if(Date.now()<keysExpire)return cachedKeys;
  const response=await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if(!response.ok)throw Error('Google key service unavailable');
  const data=await response.json();
  if(!Array.isArray(data.keys))throw Error('Invalid Google keys');
  cachedKeys=data.keys;
  const ttl=Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1]||300);
  keysExpire=Date.now()+Math.min(ttl,3600)*1000;
  return cachedKeys;
}
function decode(value){
  return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
}
export async function verifyGoogleToken(token,clientId,getKeys=googleKeys){
  if(typeof token!=='string'||token.length>12000)throw Error('Invalid token');
  const parts=token.split('.');if(parts.length!==3)throw Error('Invalid token');
  const header=JSON.parse(new TextDecoder().decode(decode(parts[0])));
  if(header.alg!=='RS256'||typeof header.kid!=='string')throw Error('Invalid signing algorithm');
  let keys=await getKeys();let jwk=keys.find(k=>k.kid===header.kid&&k.kty==='RSA');
  if(!jwk){keysExpire=0;keys=await getKeys();jwk=keys.find(k=>k.kid===header.kid&&k.kty==='RSA');}
  if(!jwk)throw Error('Unknown signing key');
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
  if(!valid)throw Error('Invalid signature');
  const p=JSON.parse(new TextDecoder().decode(decode(parts[1]))),now=Date.now()/1000;
  if(!['accounts.google.com','https://accounts.google.com'].includes(p.iss)||p.aud!==clientId||
    (p.azp&&p.azp!==clientId)||typeof p.exp!=='number'||p.exp<=now||typeof p.iat!=='number'||p.iat>now+60||
    typeof p.sub!=='string'||!p.sub||p.email_verified!==true||typeof p.email!=='string'||!p.email)throw Error('Invalid Google identity');
  return p;
}
async function readBody(request){
  const reader=request.body?.getReader();if(!reader)throw Error('Missing body');
  let size=0;const chunks=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16000){await reader.cancel();throw Error('Request too large');}chunks.push(value);}
  const all=new Uint8Array(size);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length;}
  const body=JSON.parse(new TextDecoder().decode(all));if(!body||typeof body!=='object'||Array.isArray(body))throw Error('Invalid body');return body;
}
export async function handleRequest(request,env,verify=verifyGoogleToken){
  const origin=request.headers.get('Origin');
  const allowed=(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  const send=(code,body)=>new Response(JSON.stringify(body),{status:code,headers});
  if(origin&&!allowed.includes(origin))return send(403,{message:'Website origin is not allowed. Check ALLOWED_ORIGINS in Cloudflare.'});
  if(origin)headers['Access-Control-Allow-Origin']=origin;
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});
  const route=new URL(request.url).pathname,method=request.method;
  if(method==='GET'&&route==='/api/health')return send(200,{ok:true});
  if(method==='GET'&&route==='/api/config')return send(200,{googleClientId:env.GOOGLE_CLIENT_ID||''});
  if(!env.DB)return send(503,{message:'D1 database binding DB is missing.'});
  const total=async()=>Number((await env.DB.prepare('SELECT COUNT(*) AS total FROM visitors').first()).total);
  const reviews=async()=>(await env.DB.prepare('SELECT id,name,picture,rating,message,date FROM reviews ORDER BY date DESC LIMIT 200').all()).results;
  try{
    if(method==='GET'&&route==='/api/visits')return send(200,{total:await total()});
    if(method==='GET'&&route==='/api/reviews')return send(200,{reviews:await reviews()});
    if(method!=='POST'||!['/api/visits','/api/profile','/api/reviews'].includes(route))return send(404,{message:'Not found.'});
    let body;try{body=await readBody(request);}catch{return send(400,{message:'Invalid or oversized request.'});}
    if(route==='/api/visits'){
      if(typeof body.visitorId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.visitorId))return send(400,{message:'Invalid visitor ID.'});
      const result=await env.DB.prepare('INSERT OR IGNORE INTO visitors(id) VALUES(?)').bind(body.visitorId.toLowerCase()).run();
      return send(200,{total:await total(),counted:result.meta.changes>0});
    }
    if(!env.GOOGLE_CLIENT_ID)return send(503,{message:'Set GOOGLE_CLIENT_ID in Cloudflare.'});
    let p;try{p=await verify(body.credential,env.GOOGLE_CLIENT_ID);}catch{return send(401,{message:'Please sign in with Google again.'});}
    const profile={name:String(p.name||p.email.split('@')[0]).slice(0,100),email:p.email,picture:''};
    try{const u=new URL(p.picture);if(u.protocol==='https:'&&(u.hostname==='googleusercontent.com'||u.hostname.endsWith('.googleusercontent.com')))profile.picture=u.href;}catch{}
    if(route==='/api/profile')return send(200,{profile});
    const message=typeof body.message==='string'?body.message.trim():'';
    if(!Number.isInteger(body.rating)||body.rating<1||body.rating>5||!message||message.length>1000)return send(400,{message:'Choose 1–5 stars and enter a review of up to 1000 characters.'});
    await env.DB.prepare('INSERT INTO reviews(subject,name,email,picture,rating,message,date) VALUES(?,?,?,?,?,?,?) ON CONFLICT(subject) DO UPDATE SET name=excluded.name,email=excluded.email,picture=excluded.picture,rating=excluded.rating,message=excluded.message,date=excluded.date')
      .bind(p.sub,profile.name,profile.email,profile.picture,body.rating,message,new Date().toISOString()).run();
    return send(200,{reviews:await reviews(),message:'Thank you! Your review has been saved.'});
  }catch(error){console.error('Portfolio API failure',error?.message);return send(500,{message:'Database request failed. Check the D1 binding and run schema.sql.'});}
}
export default {fetch(request,env){return handleRequest(request,env);}};
