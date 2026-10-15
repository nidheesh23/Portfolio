const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {createServer}=require('../server');
test('GitHub Pages CORS, verified profile, unique visitors, and persistence',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'portfolio-deploy-'));const origin='https://example.github.io';
 const options={clientId:'test',allowedOrigins:origin,dataPath:path.join(dir,'reviews.sqlite'),verifyToken:async()=>({sub:'account',email_verified:true,email:'person@gmail.com',name:'Person'})};
 let server=createServer(options);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=route=>`http://127.0.0.1:${server.address().port}${route}`;
 const post=(route,body,from=origin)=>fetch(url(route),{method:'POST',headers:{Origin:from,'Content-Type':'application/json'},body:JSON.stringify(body)});
 try{
  const preflight=await fetch(url('/api/profile'),{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}});
  assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),origin);
  const verified=await post('/api/profile',{credential:'mock'});assert.equal(verified.status,200);assert.equal((await verified.json()).profile.email,'person@gmail.com');
  assert.equal((await post('/api/profile',{},'https://wrong.example')).status,403);
  const id='12345678-1234-4123-8123-123456789abc';
  assert.deepEqual(await (await post('/api/visits',{visitorId:id})).json(),{total:1,counted:true});
  assert.deepEqual(await (await post('/api/visits',{visitorId:id})).json(),{total:1,counted:false});
  assert.deepEqual(await (await post('/api/visits',{visitorId:'22345678-1234-4123-8123-123456789abc'})).json(),{total:2,counted:true});
  assert.equal((await post('/api/visits',{visitorId:'invalid'})).status,400);
  await new Promise(r=>server.close(r));server=createServer(options);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  assert.deepEqual(await (await fetch(url('/api/visits'))).json(),{total:2});
 }finally{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});}
});
