document.addEventListener('DOMContentLoaded',()=>{
  const number=document.getElementById('viewNumber'),counter=document.getElementById('viewCounter');
  const plus=counter.querySelector('.view-increment');
  plus.textContent='';
  const base=(window.PORTFOLIO_CONFIG?.apiBase||'').replace(/\/$/,'');
  let visitorId;
  try{
    visitorId=localStorage.getItem('nid-portfolio-visitor-v1');
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitorId||'')){
      visitorId=crypto.randomUUID();localStorage.setItem('nid-portfolio-visitor-v1',visitorId);
    }
  }catch{visitorId=null;} // Without storage, display the total without inventing repeat visitors.
  let busy=false;
  async function update(){
    if(busy)return;busy=true;
    try{
      const options={signal:AbortSignal.timeout(15000)};
      if(visitorId)Object.assign(options,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitorId})});
      const response=await fetch(base+'/api/visits',options);
      if(!response.ok)throw Error('Visitor service unavailable');
      const data=await response.json();
      if(!Number.isSafeInteger(data.total)||data.total<0)throw Error('Invalid visitor count');
      number.textContent=data.total.toLocaleString();
      if(data.counted)plus.textContent='+1';
      counter.title='Unique browsers since launch; refreshes do not add visitors.';
      counter.setAttribute('aria-label',data.total+' portfolio visitors');
    }catch{
      number.textContent='—';counter.title='Visitor count temporarily unavailable.';
    }finally{busy=false;}
  }
  window.addEventListener('online',update);
  update();
});
