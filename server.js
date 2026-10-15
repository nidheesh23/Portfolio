const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

function createServer({clientId=process.env.GOOGLE_CLIENT_ID || '', dataPath=process.env.DATA_PATH || path.join(__dirname,'data','reviews.sqlite'), allowedOrigins=process.env.ALLOWED_ORIGINS || '', verifyToken}={}) {
  fs.mkdirSync(path.dirname(dataPath),{recursive:true});
  const db=new DatabaseSync(dataPath);
  db.exec(`CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY, subject TEXT UNIQUE NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, picture TEXT NOT NULL, rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), message TEXT NOT NULL, date TEXT NOT NULL)`);
  db.exec('CREATE TABLE IF NOT EXISTS visitors (id TEXT PRIMARY KEY NOT NULL)');
  const origins=new Set((Array.isArray(allowedOrigins)?allowedOrigins:allowedOrigins.split(',')).map(x=>x.trim()).filter(Boolean));
  const totalVisitors=()=>Number(db.prepare('SELECT COUNT(*) AS total FROM visitors').get().total);
  let googleClient;
  async function verify(credential) {
    if(verifyToken) return verifyToken(credential);
    googleClient ||= new (require('google-auth-library').OAuth2Client)(clientId);
    const ticket=await googleClient.verifyIdToken({idToken:credential,audience:clientId});
    return ticket.getPayload();
  }
  function publicReviews() { return db.prepare('SELECT id,name,picture,rating,message,date FROM reviews ORDER BY date DESC LIMIT 200').all(); }
  const send=(res,code,value)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  const server=http.createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const origin=req.headers.origin;
    const sameOrigin=origin===`${req.socket.encrypted?'https':'http'}://${req.headers.host}`;
    const permitted=!origin || sameOrigin || origins.has(origin);
    if(pathname.startsWith('/api/')){
      res.setHeader('Vary','Origin');
      if(!permitted)return send(res,403,{message:'Website origin is not allowed. Check ALLOWED_ORIGINS on the server.'});
      if(origin)res.setHeader('Access-Control-Allow-Origin',origin);
      if(req.method==='OPTIONS'){
        res.writeHead(204,{'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'});return res.end();
      }
    }
    if(req.method==='GET' && pathname==='/api/health')return send(res,200,{ok:true});
    if(req.method==='GET' && pathname==='/api/visits')return send(res,200,{total:totalVisitors()});
    if(req.method==='POST' && pathname==='/api/visits'){
      let raw='',size=0;
      try{
        for await(const chunk of req){size+=chunk.length;if(size>1000)return send(res,413,{message:'Request too large.'});raw+=chunk;}
        const body=JSON.parse(raw);
        if(typeof body.visitorId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.visitorId))return send(res,400,{message:'Invalid visitor ID.'});
        const result=db.prepare('INSERT OR IGNORE INTO visitors(id) VALUES(?)').run(body.visitorId.toLowerCase());
        return send(res,200,{total:totalVisitors(),counted:result.changes>0});
      }catch{return send(res,400,{message:'Could not record visit.'});}
    }
    if(req.method==='GET' && pathname==='/api/config') return send(res,200,{googleClientId:clientId});
    if(req.method==='GET' && pathname==='/api/reviews') return send(res,200,{reviews:publicReviews()});
    if(req.method==='POST' && ['/api/profile','/api/reviews'].includes(pathname)) {
      if(!clientId) return send(res,503,{message:'Google sign-in is not configured yet.'});
      let body='',size=0;
      try {
        for await(const chunk of req) {size+=chunk.length;if(size>16000){send(res,413,{message:'Request too large.'});return;}body+=chunk;}
        body=JSON.parse(body);
      } catch {return send(res,400,{message:'Invalid request.'});}
      let p;
      try {p=await verify(body.credential);if(!p?.sub || !p.email_verified || !p.email) throw Error();}
      catch {return send(res,401,{message:'Please sign in with Google again.'});}
      const profile={name:String(p.name || p.email.split('@')[0]).slice(0,100),email:p.email,picture:''};
      try {const u=new URL(p.picture);if(u.protocol==='https:' && (u.hostname==='googleusercontent.com'||u.hostname.endsWith('.googleusercontent.com'))) profile.picture=u.href;}catch{}
      if(pathname==='/api/profile') return send(res,200,{profile});
      const message=typeof body.message==='string'?body.message.trim():'';
      if(!Number.isInteger(body.rating)||body.rating<1||body.rating>5||!message||message.length>1000) return send(res,400,{message:'Choose 1–5 stars and enter a review of up to 1000 characters.'});
      try {
        db.prepare(`INSERT INTO reviews(subject,name,email,picture,rating,message,date) VALUES(?,?,?,?,?,?,?) ON CONFLICT(subject) DO UPDATE SET name=excluded.name,email=excluded.email,picture=excluded.picture,rating=excluded.rating,message=excluded.message,date=excluded.date`).run(p.sub,profile.name,profile.email,profile.picture,body.rating,message,new Date().toISOString());
        return send(res,200,{reviews:publicReviews(),message:'Thank you! Your review has been saved.'});
      } catch {return send(res,500,{message:'Could not save the review. Please try again.'});}
    }
    if(req.method!=='GET' && req.method!=='HEAD') return send(res,405,{message:'Method not allowed.'});
    let file;
    try {file=decodeURIComponent(pathname);}catch{return send(res,400,{message:'Invalid path.'});}
    if(file==='/')file='/index.html';
    // Only public files are served; account emails and server configuration stay private.
    if(!['/index.html','/style.css','/script.js','/reviews.js','/config.js','/visits.js'].includes(file) && !file.startsWith('/assets/')) return send(res,404,{message:'Not found.'});
    const target=path.resolve(__dirname,'.'+file);
    if(!target.startsWith(__dirname+path.sep))return send(res,404,{message:'Not found.'});
    fs.readFile(target,(err,data)=>{
      if(err)return send(res,404,{message:'Not found.'});
      const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.pdf':'application/pdf','.woff2':'font/woff2'}[path.extname(target)]||'application/octet-stream';
      res.writeHead(200,{'Content-Type':mime,'X-Content-Type-Options':'nosniff','Cross-Origin-Opener-Policy':'same-origin-allow-popups'});res.end(req.method==='HEAD'?undefined:data);
    });
  });
  server.on('close',()=>db.close());
  return server;
}
if(require.main===module) createServer().listen(process.env.PORT||3000,()=>console.log(`Portfolio: http://localhost:${process.env.PORT||3000}`));
module.exports={createServer};
