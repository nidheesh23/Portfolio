const {test}=require('node:test');const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');const fs=require('node:fs');const path=require('node:path');
test('Worker verifies signed Google-style tokens and rejects forged, expired and wrong-audience tokens',async()=>{
  const {verifyGoogleToken}=await import('../cloudflare/worker.mjs');
  const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
  const jwk=await crypto.subtle.exportKey('jwk',pair.publicKey);jwk.kid='test';
  const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
  const claims={iss:'https://accounts.google.com',aud:'client',sub:'account',email:'person@gmail.com',email_verified:true,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600};
  async function sign(p){const body=encode({alg:'RS256',kid:'test'})+'.'+encode(p);return body+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(body))).toString('base64url');}
  const token=await sign(claims),keys=async()=>[jwk];
  assert.equal((await verifyGoogleToken(token,'client',keys)).email,'person@gmail.com');
  await assert.rejects(verifyGoogleToken(token,'wrong-client',keys));
  await assert.rejects(verifyGoogleToken(await sign({...claims,exp:0}),'client',keys));
  await assert.rejects(verifyGoogleToken(await sign({...claims,email_verified:false}),'client',keys));
  const parts=token.split('.');parts[1]=encode({...claims,email:'forged@gmail.com'});
  await assert.rejects(verifyGoogleToken(parts.join('.'),'client',keys));
});
test('Worker D1 queries support profile, review update, private email, CORS and visitor deduplication',async()=>{
  const {handleRequest}=await import('../cloudflare/worker.mjs');
  const sqlite=new DatabaseSync(':memory:');sqlite.exec(fs.readFileSync(path.join(__dirname,'../cloudflare/schema.sql'),'utf8'));
  const db={prepare(sql){let values=[];return {bind(...args){values=args;return this;},async first(){return sqlite.prepare(sql).get(...values);},async all(){return {results:sqlite.prepare(sql).all(...values)};},async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...values).changes)}};}};}};
  const env={DB:db,GOOGLE_CLIENT_ID:'client',ALLOWED_ORIGINS:'https://example.github.io'};
  const verify=async token=>{if(token!=='valid')throw Error('bad token');return {sub:'account',name:'Verified Name',email:'private@gmail.com'};};
  const request=(route,body,origin=env.ALLOWED_ORIGINS)=>handleRequest(new Request('https://api.example'+route,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}),env,verify);
  try{
    const profile=await request('/api/profile',{credential:'valid'});assert.equal(profile.status,200);assert.equal((await profile.json()).profile.email,'private@gmail.com');
    assert.equal((await request('/api/profile',{credential:'forged'})).status,401);
    assert.equal((await request('/api/reviews',null,'https://wrong.example')).status,403);
    const preflight=await handleRequest(new Request('https://api.example/api/reviews',{method:'OPTIONS',headers:{Origin:env.ALLOWED_ORIGINS}}),env);
    assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),env.ALLOWED_ORIGINS);
    for(const message of ['First','Updated'])assert.equal((await request('/api/reviews',{credential:'valid',rating:5,message})).status,200);
    const reviews=await (await request('/api/reviews')).json();assert.equal(reviews.reviews.length,1);assert.equal(reviews.reviews[0].message,'Updated');assert.ok(!JSON.stringify(reviews).includes('private@gmail.com'));
    assert.equal((await request('/api/reviews',{credential:'valid',rating:6,message:'bad'})).status,400);
    const body={visitorId:'12345678-1234-4123-8123-123456789abc'};
    assert.deepEqual(await (await request('/api/visits',body)).json(),{total:1,counted:true});
    assert.deepEqual(await (await request('/api/visits',body)).json(),{total:1,counted:false});
  }finally{sqlite.close();}
});
