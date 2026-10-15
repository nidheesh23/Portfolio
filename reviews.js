document.addEventListener('DOMContentLoaded',async()=>{
  const byId=id=>document.getElementById(id);
  const modal=byId('reviewModal'),form=byId('reviewForm'),status=byId('reviewStatus'),submit=form.querySelector('[type=submit]');
  // Keep the fixed dialog outside the transformed hero canvas.
  document.body.append(modal);
  let credential='',profile=null,rating=0,returnFocus=null,signInAttempt=0;
  const stars=[...document.querySelectorAll('#ratingStars button')];
  function setRating(value){rating=value;stars.forEach(s=>{s.classList.toggle('selected',Number(s.dataset.rating)<=value);s.setAttribute('aria-pressed',String(Number(s.dataset.rating)===value));});}
  stars.forEach(s=>s.addEventListener('click',()=>setRating(Number(s.dataset.rating))));
  function open(mode){
    const history=mode==='history';
    byId('reviewComposer').hidden=history;
    byId('reviewsList').hidden=!history;
    byId('reviewHistoryStatus').hidden=!history;
    byId('reviewTitle').textContent=history?'Recent Reviews':'Share Your Experience';
    byId('reviewIntro').textContent=history?'Recent feedback from portfolio visitors.':'Your feedback means a lot to me!';
    if(history){byId('reviewHistoryStatus').textContent='Loading recent reviews…';request('/api/reviews').then(data=>{render(data.reviews);byId('reviewHistoryStatus').textContent='';}).catch(error=>{byId('reviewHistoryStatus').textContent=error.message;});}
    returnFocus=document.activeElement;modal.classList.add('active');modal.setAttribute('aria-hidden','false');byId('closeReview').focus();}
  function close(){modal.classList.remove('active');modal.setAttribute('aria-hidden','true');returnFocus?.focus();}
  byId('openReviews').addEventListener('click',()=>open('history'));
  byId('writeReview').addEventListener('click',()=>open('compose'));
  // Playful pointer animation stops after five escapes so the button can be caught.
  const runaway=byId('writeReview');
  let escapes=0,lastEscape=0,offset={x:0,y:0};
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  function settle(){runaway.style.translate='0px 0px';offset={x:0,y:0};}
  runaway.addEventListener('focus',()=>{escapes=5;settle();});
  reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)settle();});
  document.addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse'||reducedMotion.matches||escapes>=5||modal.classList.contains('active'))return;
    const now=performance.now();if(now-lastEscape<250)return;
    const rect=runaway.getBoundingClientRect();
    if(Math.hypot(event.clientX-(rect.left+rect.width/2),event.clientY-(rect.top+rect.height/2))>=85)return;
    const baseX=rect.left-offset.x,baseY=rect.top-offset.y;
    const targets=[{x:100,y:-50},{x:-100,y:50},{x:130,y:50},{x:-80,y:-60},{x:0,y:0}];
    const target=targets[escapes];
    offset={x:Math.max(10,Math.min(baseX+target.x,window.innerWidth-rect.width-10))-baseX,y:Math.max(10,Math.min(baseY+target.y,window.innerHeight-rect.height-10))-baseY};
    runaway.style.translate=`${offset.x}px ${offset.y}px`;lastEscape=now;escapes++;
    if(escapes===5)setTimeout(()=>{settle();runaway.title='You caught me!';},400);
  });
  window.addEventListener('resize',settle);
  byId('closeReview').addEventListener('click',close);modal.addEventListener('click',e=>{if(e.target===modal)close();});
  modal.addEventListener('keydown',e=>{
    if(e.key==='Escape')close();
    if(e.key==='Tab'){const list=[...modal.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea,a[href],iframe')].filter(el=>el.getClientRects().length);const first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  });
  function avatar(p){const el=document.createElement('span');el.className='avatar';el.textContent=p.name.slice(0,1).toUpperCase();el.title=p.name;if(p.picture){const img=document.createElement('img');img.src=p.picture;img.alt='';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.remove());el.append(img);}return el;}
  function render(reviews){
    byId('averageRating').textContent=(reviews.length?reviews.reduce((s,r)=>s+r.rating,0)/reviews.length:0).toFixed(1);
    byId('reviewCount').textContent=`${reviews.length} ${reviews.length===1?'Review':'Reviews'}`;
    byId('reviewAvatars').replaceChildren(...reviews.slice(0,4).map(avatar));
    const list=byId('reviewsList');list.replaceChildren();
    if(!reviews.length){const empty=document.createElement('p');empty.textContent='Be the first to leave a review.';list.append(empty);}
    [...reviews].sort((a,b)=>new Date(b.date)-new Date(a.date)).forEach(r=>{const item=document.createElement('article');item.className='review-item';const header=document.createElement('div');header.className='review-person';const name=document.createElement('strong');name.textContent=r.name;header.append(avatar(r),name);const score=document.createElement('div');score.className='stars';score.textContent='★'.repeat(r.rating)+'☆'.repeat(5-r.rating);score.setAttribute('aria-label',`${r.rating} out of 5 stars`);const message=document.createElement('p');message.textContent=r.message;const date=document.createElement('small');date.textContent=new Date(r.date).toLocaleDateString();item.append(header,score,message,date);list.append(item);});
  }
  async function request(url,body){const res=await fetch((window.PORTFOLIO_CONFIG?.apiBase||'').replace(/\/$/,'')+url,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)}:{signal:AbortSignal.timeout(15000)});let data;try{data=await res.json();}catch{throw Error('Review API unavailable. Check config.js and your backend deployment.');}if(!res.ok)throw Error(data.message||'Request failed.');return data;}
  function resetProfile(){signInAttempt++;credential='';profile=null;byId('reviewerName').value='';byId('reviewerEmail').value='';byId('googleProfile').hidden=true;byId('googleSignIn').hidden=false;submit.disabled=true;window.google?.accounts.id.disableAutoSelect();}
  byId('changeGoogleAccount').addEventListener('click',resetProfile);
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(!credential||!profile){status.textContent='Sign in with Google first.';return;}if(!rating){status.textContent='Please select a star rating.';return;}if(!byId('reviewMessage').value.trim()){status.textContent='Please write your review.';return;}
    submit.disabled=true;status.textContent='Saving your review…';
    try{const data=await request('/api/reviews',{credential,rating,message:byId('reviewMessage').value});render(data.reviews);byId('reviewMessage').value='';setRating(0);status.textContent=data.message;}
    catch(error){status.textContent=error.message;if(error.message.includes('sign in'))resetProfile();}
    finally{submit.disabled=!profile;}
  });
  try{
    render((await request('/api/reviews')).reviews);
    const config=await request('/api/config');
    if(!config.googleClientId){status.textContent='Google sign-in needs setup. Follow REVIEW-SETUP.md.';return;}
    const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;
    script.onerror=()=>{status.textContent='Google sign-in could not load. Check your connection.';};
    function fillIdentity(identity){
      byId('reviewerName').value=identity.name||identity.email.split('@')[0];
      byId('reviewerEmail').value=identity.email;
    }
    function previewIdentity(token){
      // Display only: decoding a token never grants permission to submit.
      try{
        const encoded=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
        const bytes=Uint8Array.from(atob(encoded.padEnd(Math.ceil(encoded.length/4)*4,'=')),c=>c.charCodeAt(0));
        const identity=JSON.parse(new TextDecoder().decode(bytes));
        if(typeof identity.email==='string'&&identity.email)fillIdentity(identity);
      }catch{/* The server will report invalid credentials. */}
    }
    async function handleGoogleCredential(response){
      resetProfile();
      const attempt=signInAttempt;
      if(!response?.credential){status.textContent='Google did not return account details. Please sign in again.';return;}
      previewIdentity(response.credential);
      status.textContent='Account details received. Verifying with the portfolio server…';
      try{
        const data=await request('/api/profile',{credential:response.credential});
        if(attempt!==signInAttempt)return;
        if(!data.profile?.email||!data.profile?.name)throw Error('The server did not return your Google profile.');
        fillIdentity(data.profile);
        byId('profileAvatar').replaceChildren(avatar(data.profile));
        byId('profileName').textContent=data.profile.name;
        byId('profileEmail').textContent=data.profile.email;
        credential=response.credential;profile=data.profile;
        byId('googleProfile').hidden=false;byId('googleSignIn').hidden=true;
        submit.disabled=false;status.textContent='Signed in. Choose your stars and write a review.';
      }catch(error){
        if(attempt!==signInAttempt)return;
        credential='';profile=null;submit.disabled=true;
        const detail=error.name==='TimeoutError'?'The verification request timed out. Check the terminal running npm start and your internet connection.':error.message;
        status.textContent='Google account verification failed. '+detail+' Please try signing in again.';
      }
    }
    script.onload=()=>{window.google.accounts.id.initialize({client_id:config.googleClientId,callback:handleGoogleCredential});window.google.accounts.id.renderButton(byId('googleSignIn'),{theme:'outline',size:'large',text:'signin_with',width:300});status.textContent='Sign in with Google to leave a review.';};
    document.head.append(script);
  }catch(error){status.textContent=error.message;}
});
