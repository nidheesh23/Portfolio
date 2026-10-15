const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {createServer}=require('../server');
test('verified reviews persist, update once per account, validate input, and hide emails',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'portfolio-review-'));
  const options={clientId:'test-client',dataPath:path.join(dir,'reviews.sqlite'),verifyToken:async token=>{
    if(token!=='valid')throw Error('Invalid token');
    return {sub:'account-1',email_verified:true,name:'Google Name',email:'private@gmail.com',picture:'https://lh3.googleusercontent.com/avatar'};
  }};
  let server=createServer(options);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=()=>`http://127.0.0.1:${server.address().port}`;
  const post=(url,body)=>fetch(base()+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  try{
    assert.equal((await post('/api/reviews',{credential:'forged',rating:5,message:'fake'})).status,401);
    assert.equal((await post('/api/reviews',{credential:'valid',rating:6,message:'bad'})).status,400);
    assert.equal((await post('/api/reviews',{credential:'valid',rating:4,message:'  Helpful portfolio  ',name:'Forged name',email:'fake@gmail.com'})).status,200);
    let data=await (await fetch(base()+'/api/reviews')).json();
    assert.equal(data.reviews[0].name,'Google Name');assert.equal(data.reviews[0].message,'Helpful portfolio');
    assert.ok(!JSON.stringify(data).includes('private@gmail.com'));assert.ok(!('subject' in data.reviews[0]));
    await post('/api/reviews',{credential:'valid',rating:5,message:'Updated review'});
    data=await (await fetch(base()+'/api/reviews')).json();assert.equal(data.reviews.length,1);assert.equal(data.reviews[0].rating,5);
    assert.equal((await fetch(base()+'/.env')).status,404);assert.equal((await fetch(base()+'/data/reviews.sqlite')).status,404);
    await new Promise(r=>server.close(r));server=createServer(options);await new Promise(r=>server.listen(0,'127.0.0.1',r));
    data=await (await fetch(base()+'/api/reviews')).json();assert.equal(data.reviews[0].message,'Updated review');
  }finally{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});}
});
