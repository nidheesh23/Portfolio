(function () {
/* Nidheesh Kumar portfolio, hero behaviour
   1. scale the 1672 x 941 design canvas to the window
   2. typing effect on the second headline line
   3. gentle float and cursor parallax on the hero layers
   4. highlight the navigation link of the section in view */
(function () {
  'use strict';

  var root = document.documentElement;
  var DESIGN_W = 1672, MOBILE_MAX = 900;
  var frozen = !!window.__freeze;                       /* used only by screenshot tests */
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. fit the canvas to the window ---------- */
  function fit() {
    var width = root.clientWidth || window.innerWidth;
    if (width <= MOBILE_MAX) {
      root.style.removeProperty('--k');
      return;
    }
    var k = width / DESIGN_W;
    root.style.setProperty('--k', k.toFixed(5));
  }
  fit();
  window.addEventListener('resize', fit);

  /* ---------- 2. typing effect ---------- */
  var typed = document.getElementById('typed');
  var phrases = ['web applications.', 'scalable APIs.', 'delightful interfaces.', 'web applications.'];
  if (typed && !reduceMotion && !frozen) {
    var p = 0, i = phrases[0].length, deleting = false;
    (function tick() {
      var full = phrases[p];
      typed.textContent = full.slice(0, i);
      var delay = deleting ? 38 : 82;
      if (!deleting && i === full.length) { deleting = true; delay = p === phrases.length - 1 ? 4000 : 1900; if (p === phrases.length - 1) { p = -1; } }
      else if (deleting && i === 0) { deleting = false; p = (p + 1) % phrases.length; delay = 380; }
      else { i += deleting ? -1 : 1; }
      setTimeout(tick, delay);
    })();
  }

  /* ---------- 3. float and parallax ---------- */
  var layers = [
    { el: '.person',    depth: 9,  floatY: 0, speed: 0 },
    { el: '.ring',      depth: 16, floatY: 0, speed: 0 },
    { el: '.ring-outer', depth: 22, floatY: 0, speed: 0 },
    { el: '.code',      depth: 26, floatY: 7, speed: 0.9, phase: 0.0 },
    { el: '.note',      depth: 30, floatY: 5, speed: 0.7, phase: 1.7 },
    { el: '.stack',     depth: 14, floatY: 5, speed: 0.8, phase: 3.1 },
    { el: '.mug',       depth: 6,  floatY: 0, speed: 0 },
    { el: '.books',     depth: 5,  floatY: 0, speed: 0 },
    { el: '.plant',     depth: 11, floatY: 0, speed: 0 },
    { el: '.bg-plant',  depth: 11, floatY: 0, speed: 0 }
  ].map(function (l) { l.node = document.querySelector(l.el); return l; }).filter(function (l) { return l.node; });

  var target = { x: 0, y: 0 }, current = { x: 0, y: 0 };
  window.addEventListener('pointermove', function (e) {
    target.x = (e.clientX / window.innerWidth - 0.5) * 2;
    target.y = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', function () { target.x = 0; target.y = 0; });

  var start = performance.now();
  function frame(now) {
    if (!frozen && !reduceMotion) {
      var desktop = (root.clientWidth || window.innerWidth) > MOBILE_MAX;
      current.x += (target.x - current.x) * 0.06;
      current.y += (target.y - current.y) * 0.06;
      var t = (now - start) / 1000;
      for (var n = 0; n < layers.length; n++) {
        var l = layers[n];
        if (!desktop) { l.node.style.translate = ''; continue; }
        var fy = l.floatY ? Math.sin(t * l.speed + (l.phase || 0)) * l.floatY : 0;
        l.node.style.translate = (-current.x * l.depth).toFixed(2) + 'px ' + (-current.y * l.depth * 0.7 + fy).toFixed(2) + 'px';
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- 4. active navigation link ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));
  var ids = links.map(function (a) { return a.getAttribute('data-link'); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id;
        links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('data-link') === id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    ids.forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }
})();



})();

(function () {
// Interactive, procedurally shaded velvet: no external textures required.
const canvas = document.getElementById('fabric');
const ctx = canvas.getContext('2d', { alpha: false });
const preloader = document.getElementById('preloader');
const revealButton = document.getElementById('revealButton');
let w = 0, h = 0, dpr = 1, last = 0, revealing = false;
let pointer = { x: -1000, y: -1000, tx: -1000, ty: -1000, intensity: 0 };
let ripples = [];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Keep the name fixed while the introduction welcomes visitors in six languages.
const greeting = document.getElementById('preloaderGreeting');
const welcomes = [
  { lang: 'en', text: 'Hello, I am' },
  { lang: 'ta', text: 'வணக்கம், நான்' },
  { lang: 'hi', text: 'नमस्ते, मैं हूँ' },
  { lang: 'fr', text: 'Bonjour, je suis' },
  { lang: 'es', text: 'Hola, soy' },
  { lang: 'de', text: 'Hallo, ich bin' }
];
let welcomeIndex = 0;
const welcomeTimer = reducedMotion ? null : window.setInterval(() => {
  welcomeIndex = (welcomeIndex + 1) % welcomes.length;
  greeting.lang = welcomes[welcomeIndex].lang;
  greeting.textContent = welcomes[welcomeIndex].text;
  greeting.classList.remove('is-changing');
  void greeting.offsetWidth;
  greeting.classList.add('is-changing');
}, 1800);

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = window.innerWidth; h = window.innerHeight;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize); resize();

function move(e) {
  if (revealing) return;
  const previousX = pointer.tx, previousY = pointer.ty;
  pointer.tx = e.clientX; pointer.ty = e.clientY;
  const speed = Math.hypot(e.clientX - previousX, e.clientY - previousY);
  pointer.intensity = Math.min(1, pointer.intensity + Math.min(speed / 140, .32));
  if (speed > 8 && ripples.length < 12) ripples.push({x:e.clientX,y:e.clientY,age:0,force:Math.min(1,speed/70)});
}
preloader.addEventListener('pointermove', move);
preloader.addEventListener('pointerleave', () => { pointer.tx=-1000; pointer.ty=-1000; });
preloader.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'mouse') {pointer.tx=e.clientX;pointer.ty=e.clientY;pointer.intensity=1; ripples.push({x:e.clientX,y:e.clientY,age:0,force:1});}
});
function reveal() {
  if (revealing) return;
  revealing = true;
  window.clearInterval(welcomeTimer);
  preloader.classList.add('revealing');
  preloader.addEventListener('animationend', e => {
    if(e.animationName === 'throwCloth') { preloader.remove(); document.body.classList.remove('is-preloading'); document.body.style.overflow = 'auto'; window.dispatchEvent(new Event('portfolio:ready')); }
  });
}
preloader.addEventListener('dblclick', reveal);
revealButton.addEventListener('click', reveal); // accessible alternative
preloader.addEventListener('touchend', e => {
  const now = Date.now();
  if (now - (preloader._lastTap || 0) < 320) { e.preventDefault(); reveal(); }
  preloader._lastTap = now;
}, {passive:false});

// Fine horizontal bands and overlapping soft curved folds evoke velvet pile.
function draw(time) {
  if (revealing) return;
  const t = reducedMotion ? 0 : time * .0003;
  pointer.x += (pointer.tx - pointer.x) * .12;
  pointer.y += (pointer.ty - pointer.y) * .12;
  pointer.intensity *= .971;
  const bg = ctx.createLinearGradient(0,0,w,h);
  bg.addColorStop(0,'#bdbbc0');bg.addColorStop(.4,'#97969c');bg.addColorStop(1,'#75757d');
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);

  // Fold shading rendered in scan lines: broad diagonal drapes plus cursor deformation.
  const step = Math.max(2, Math.round(h / 440));
  for(let y=0;y<h+step;y+=step){
    const yn=y/h;
    const pdy=y-pointer.y;
    const nearY=Math.exp(-(pdy*pdy)/(2*190*190));
    const fold1 = .5 + .5*Math.sin((y*.0065) + Math.sin(yn*5+t*.5)*1.4);
    const fold2 = Math.sin(y*.014 + t*.38);
    const drift = 18*Math.sin(yn*7+t*.35);
    const dx = pointer.x - w*.5;
    const gradient=ctx.createLinearGradient(0,y,w,y);
    for(let i=0;i<=16;i++){
      const x=w*i/16;
      const px=x-pointer.x;
      const r2=(px*px+pdy*pdy);
      const influence=pointer.intensity*Math.exp(-r2/(2*180*180));
      let folds=0;
      const diag=(x*.78+y*.64);
      folds+=Math.sin(diag*.009 + Math.sin(y*.004+t)*1.4)*.46;
      folds+=Math.sin((x*.47-y*.88)*.015 + t*.4)*.24;
      folds+=Math.sin((x*.26+y*.97)*.022)*.1;
      folds+=Math.cos((x+drift)*.004 - y*.008)*.25;
      const local = Math.sin(Math.sqrt(r2)*.063 - t*4)*influence*.48;
      let wave=0;
      for(const ripple of ripples){
        const dist=Math.hypot(x-ripple.x,y-ripple.y);
        const ring=dist-ripple.age*280;
        wave+=Math.sin(ring*.045)*Math.exp(-Math.abs(ring)/100)*ripple.force*(1-ripple.age/1.4)*.3;
      }
      const glint = Math.pow(Math.max(0,Math.sin(diag*.009 + Math.sin(y*.004+t)*1.4+.9)),5)*.21;
      const light = Math.max(0,Math.min(1,.52 + folds*.26 + fold1*.1 + fold2*.035 + glint + local + wave + nearY*influence*.06));
      const rr=Math.round(95+light*111),gg=Math.round(94+light*109),bb=Math.round(102+light*108);
      gradient.addColorStop(i/16,`rgb(${rr},${gg},${bb})`);
    }
    ctx.fillStyle=gradient;ctx.fillRect(0,y,w,step+1);
  }
  // Satin-like directional highlight across the top left.
  const glow=ctx.createRadialGradient(w*.28,h*.15,0,w*.28,h*.15,Math.max(w,h)*.9);
  glow.addColorStop(0,'rgba(255,255,255,.17)');glow.addColorStop(.45,'rgba(255,255,255,.025)');glow.addColorStop(1,'rgba(15,14,22,.2)');
  ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
  ripples.forEach(r=>r.age+=Math.min(.05,(time-last)/1000||.016));
  ripples=ripples.filter(r=>r.age<1.4);
  last=time;
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
})();

/* Category rows: select a technology to expand its knowledge; select again to close. */
(function () {
 'use strict';
 document.querySelectorAll('#skills .sr-row').forEach(row => {
  const buttons = Array.from(row.querySelectorAll('.sr-skill'));
  const toggle = row.querySelector('.sr-expand');
  const detail = row.querySelector('.sr-detail');
  let selected = buttons.find(b => b.getAttribute('aria-expanded') === 'true') || buttons[0];
  function update(button, open) {
   selected = button;
   buttons.forEach(b => b.setAttribute('aria-expanded', String(open && b === button)));
   toggle.setAttribute('aria-expanded', String(open));
   toggle.setAttribute('aria-label', (open ? 'Collapse ' : 'Expand ') + row.dataset.category + ' knowledge');
   detail.hidden = !open;
   detail.querySelector('h4').textContent = button.dataset.skill.toUpperCase() + ' / CORE KNOWLEDGE';
   const list = detail.querySelector('ul'); list.replaceChildren();
   JSON.parse(button.dataset.knowledge).forEach(text => { const li=document.createElement('li');li.textContent=text;list.appendChild(li); });
  }
  buttons.forEach(button => button.addEventListener('click', () => update(button, button.getAttribute('aria-expanded') !== 'true')));
  toggle.addEventListener('click', () => update(selected, detail.hidden));
 });
})();


/* Edit project names, descriptions and URLs here. Empty URLs show demo placeholders. */
(function () {
 'use strict';
 const projects = [
  { name: 'Smashpro', description: 'Explore my Smashpro project in a live browser preview.', url: 'https://nidheesh23.github.io/Smashpro/', icon: 'bx-trophy' },
  { name: 'Demo Project 02', description: 'A space for your next project. Add its name, description and live URL.', url: '', icon: 'bx-code-alt' },
  { name: 'Demo Project 03', description: 'A space for another project. Add its name, description and live URL.', url: '', icon: 'bx-layer' }
 ];
 const grid = document.getElementById('projectsGrid');
 const dialog = document.getElementById('projectPreview');
 const address = document.getElementById('previewAddress');
 const frame = document.getElementById('projectFrame');
 const placeholder = document.getElementById('previewPlaceholder');
 const heading = document.getElementById('previewTitle');
 const openLink = document.getElementById('previewOpen');
 const closeButton = document.getElementById('previewClose');
 const demoName = document.getElementById('previewDemoName');
 let timer = 0, trigger = null, dismissed = null;
 const hover = window.matchMedia('(hover: hover) and (pointer: fine)');
 const reducedProjectMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
 const projectSection = document.getElementById('projects');
 if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => projectSection.classList.toggle('projects-in-view', entries[0].isIntersecting)).observe(projectSection);
 } else { projectSection.classList.add('projects-in-view'); }
 document.addEventListener('visibilitychange', () => {if(document.hidden)clearTimeout(timer);});
 function validURL(raw) {
  try { const parsed = new URL(raw); return ['http:','https:'].includes(parsed.protocol) ? parsed.href : ''; }
  catch (_) { return ''; }
 }
 function show(project, tile) {
  clearTimeout(timer);
  if (dialog.open) return;
  const url = validURL(project.url);
  trigger=tile;
  heading.textContent=project.name+' project preview';
  address.textContent=url || 'Add your project URL';
  frame.hidden=!url; placeholder.hidden=!!url; openLink.hidden=!url;
  if (url) { frame.title=project.name+' live website'; frame.src=url; openLink.href=url; }
  else { frame.removeAttribute('src'); openLink.removeAttribute('href'); demoName.textContent=project.name; }
  dialog.showModal();
  closeButton.focus({preventScroll:true});
 }
 function close() { if (dialog.open) dialog.close(); }
 closeButton.addEventListener('click',close);
 dialog.addEventListener('click',e=> {if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
 dialog.addEventListener('close',()=>{
  clearTimeout(timer); frame.removeAttribute('src'); dismissed=trigger;
  if(trigger)trigger.focus({preventScroll:true});
 });
 projects.forEach((project,index)=>{
  const tile=document.createElement('button');
  tile.type='button'; tile.className='project-tile';tile.setAttribute('aria-haspopup','dialog');
  tile.setAttribute('aria-label','Preview '+project.name);
  // Structure is fixed; project copy is assigned as text to keep editable URLs safe.
  tile.innerHTML='<span class="project-cover"><span class="project-number"></span><i class="bx" aria-hidden="true"></i><span class="project-cover-title"></span><span class="project-cover-hint">Hover 5 seconds to preview</span></span><span class="project-info"><span class="project-name"></span><span class="project-description"></span><span class="project-url"><i class="bx bx-link-external" aria-hidden="true"></i><span></span></span></span>';
  tile.querySelector('.project-number').textContent='';
  tile.querySelector('.project-cover .bx').classList.add(project.icon);
  tile.querySelector('.project-cover-title').textContent=project.name;
  tile.querySelector('.project-name').textContent=project.name;
  tile.querySelector('.project-description').textContent=project.description;
  tile.querySelector('.project-url span').textContent=validURL(project.url)||'URL: Add your project link';
  tile.addEventListener('pointerenter',()=>{if(!hover.matches||dialog.open||dismissed===tile)return;clearTimeout(timer);timer=setTimeout(()=>{if(tile.matches(':hover')&&!document.hidden)show(project,tile);},5000);});
  tile.addEventListener('pointerleave',()=>{clearTimeout(timer);if(dismissed===tile)dismissed=null;});
  tile.addEventListener('click',e=>{if(!hover.matches||e.detail===0)show(project,tile);});
  tile.addEventListener('pointermove', e=>{
   if(e.pointerType!=='mouse'||reducedProjectMotion.matches)return;
   const r=tile.getBoundingClientRect();
   const x=Math.max(-1,Math.min(1,(e.clientX-r.left)/r.width*2-1));
   const y=Math.max(-1,Math.min(1,(e.clientY-r.top)/r.height*2-1));
   tile.style.setProperty('--project-light-x',(50+x*35)+'%');
   tile.style.setProperty('--project-light-y',(35+y*30)+'%');
   tile.style.setProperty('--project-tilt-x',(-y*3)+'deg');
   tile.style.setProperty('--project-tilt-y',(x*3)+'deg');
  });
  tile.addEventListener('pointerleave',()=>{
   tile.style.setProperty('--project-tilt-x','0deg');tile.style.setProperty('--project-tilt-y','0deg');
   tile.style.setProperty('--project-light-x','50%');tile.style.setProperty('--project-light-y','20%');
  });
  grid.appendChild(tile);
 });
})();

/* Configure your contact details here. Empty values display editable placeholders. */
(function () {
 'use strict';
 const contactDetails = { email: 's.nidheesh2002@gmail.com', linkedin: 'https://www.linkedin.com/in/s-nidheesh-kumar', github: 'https://github.com/nidheesh23' };
 const emailLink=document.getElementById('contactEmail');
 if(contactDetails.email){emailLink.href='mailto:'+contactDetails.email;emailLink.removeAttribute('aria-disabled');emailLink.querySelector('small').textContent=contactDetails.email;}
 for(const [key,id] of [['linkedin','contactLinkedIn'],['github','contactGitHub']]){
  try{const u=new URL(contactDetails[key]);if(!['https:','http:'].includes(u.protocol))continue;const a=document.getElementById(id);a.href=u.href;a.removeAttribute('aria-disabled');a.querySelector('small').textContent=u.hostname+u.pathname;}
  catch(_){/* Keep unconfigured links as visible placeholders. */}
 }
 document.getElementById('contactForm').addEventListener('submit',e=>{
  e.preventDefault();const status=document.getElementById('contactStatus');
  if(!contactDetails.email){status.textContent='Contact email is not configured yet. Add your email to contactDetails in script.js.';return;}
  const data=new FormData(e.currentTarget);
  const subject='Portfolio enquiry from '+data.get('name');
  const body='Name: '+data.get('name')+'\nReply email: '+data.get('email')+'\n\n'+data.get('message');
  window.location.href='mailto:'+contactDetails.email+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
  status.textContent='Your email app will open with this message. Send it from there.';
 });
})();

/* Scroll animation; visits.js supplies the shared visitor total. */
(function () {
 'use strict';
 const about=document.getElementById('about'),contact=document.getElementById('contact');
 const tag=document.getElementById('visitTag'),cord=document.getElementById('visitCord');
 const path=cord.querySelector('path'),anchor=cord.querySelector('circle');
 const counter=document.getElementById('viewCounter'),number=document.getElementById('viewNumber');
 const progressText=tag.querySelector('.visit-progress');
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 let active=false,done=false,falling=false,dragging=false,frame=0;
 let x=0,y=0,targetX=0,targetY=0,dragOffsetX=0,dragOffsetY=0,baselineX=0,baselineY=0;
 let progress=0,last=0,fallStart=0,fallX=0,fallY=0,contactInView=false;
 function bounds(){return {w:window.innerWidth,h:window.innerHeight,tw:tag.offsetWidth||38,th:tag.offsetHeight||64};}
 function range(){const start=about.getBoundingClientRect().top+window.scrollY;const end=Math.max(start+1,contact.getBoundingClientRect().bottom+window.scrollY-window.innerHeight);return {start,end};}
 function hide(){tag.hidden=true;cord.hidden=true;active=false;cancelAnimationFrame(frame);frame=0;}
 function land(){
  if(done)return;done=true;falling=false;
  document.getElementById('viewerAnnouncement').textContent='Visit animation complete. Portfolio visitors: '+number.textContent+'.';
  counter.classList.add('is-counting');setTimeout(()=>counter.classList.remove('is-counting'),1100);hide();
 }
 function startFall(now){if(falling||done||dragging)return;falling=true;fallStart=now;fallX=x;fallY=y;tag.classList.add('is-falling');cord.hidden=true;if(reduced.matches)land();}
 function draw(now){
  frame=0;if(!active||done||document.hidden)return;
  const b=bounds();const dt=Math.min(32,now-last||16);last=now;
  let angle=0;
  if(falling){
   const target=counter.getBoundingClientRect();
   const t=Math.min(1,(now-fallStart)/850),ease=t*t;
   x=fallX+(target.left+target.width/2-b.tw/2-fallX)*ease;
   y=fallY+(target.top+target.height/2-b.th/2-fallY)*ease;
   angle=t*42;
   tag.style.opacity=String(1-Math.max(0,(t-.8)/.2));
   if(t>=1){land();return;}
  }else{
   if(!dragging){const k=reduced.matches?1:1-Math.pow(.88,dt/16);x+=(targetX-x)*k;y+=(targetY-y)*k;angle=reduced.matches?0:Math.sin(now/650)*4;}
   if(contactInView)startFall(now);
  }
  tag.style.transform=`translate3d(${x}px,${y}px,0) rotate(${angle}deg)`;
  anchor.setAttribute('cx',String(b.w-25));anchor.setAttribute('cy','22');
  path.setAttribute('d',`M ${b.w-25} 22 Q ${b.w-25+Math.sin(now/900)*6} ${Math.max(30,y*.45)} ${x+b.tw/2} ${y}`);
  frame=requestAnimationFrame(draw);
 }
 function sync(){
  if(document.getElementById('preloader')){hide();return;}
  if(done)return;const b=bounds(),r=range();
  progress=Math.max(0,Math.min(1,(window.scrollY-r.start)/(r.end-r.start)));
  const visible=about.getBoundingClientRect().top<=b.h*.55;
  if(!visible&&!falling){hide();return;}
  if(!active){active=true;tag.hidden=false;cord.hidden=false;x=b.w-b.tw-12;y=70;last=0;}
  targetX=Math.max(8,Math.min(b.w-b.tw-8,b.w-b.tw-12+baselineX));
  targetY=Math.max(45,Math.min(b.h-b.th-16,70+progress*Math.max(0,b.h-b.th-120)+baselineY));
  const c=counter.getBoundingClientRect();contactInView=c.top>=0&&c.bottom<=b.h-4;
  tag.setAttribute('aria-valuenow',String(Math.round(progress*100)));progressText.textContent=Math.round(progress*100)+'%';
  if(!frame&&!document.hidden)frame=requestAnimationFrame(draw);
 }
 tag.addEventListener('pointerdown',e=>{if(falling||done)return;dragging=true;tag.classList.add('is-dragging');tag.setPointerCapture(e.pointerId);dragOffsetX=e.clientX-x;dragOffsetY=e.clientY-y;});
 tag.addEventListener('pointermove',e=>{if(!dragging)return;const b=bounds();x=Math.max(8,Math.min(b.w-b.tw-8,e.clientX-dragOffsetX));y=Math.max(38,Math.min(b.h-b.th-8,e.clientY-dragOffsetY));});
 function release(){if(!dragging)return;dragging=false;tag.classList.remove('is-dragging');baselineX=x-(window.innerWidth-(tag.offsetWidth||38)-12);baselineY=y-(70+progress*Math.max(0,window.innerHeight-(tag.offsetHeight||64)-120));sync();}
 tag.addEventListener('pointerup',release);tag.addEventListener('pointercancel',release);tag.addEventListener('lostpointercapture',release);
 tag.addEventListener('keydown',e=>{const r=range();let value=null;if(e.key==='ArrowDown')value=window.scrollY+150;if(e.key==='ArrowUp')value=window.scrollY-150;if(e.key==='Home')value=r.start;if(e.key==='End')value=r.end;if(value!==null){e.preventDefault();window.scrollTo({top:Math.max(r.start,Math.min(r.end,value)),behavior:reduced.matches?'instant':'smooth'});}});
 window.addEventListener('portfolio:ready',sync);
 window.addEventListener('scroll',sync,{passive:true});window.addEventListener('resize',sync);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else sync();});
 reduced.addEventListener('change',()=>{if(reduced.matches&&falling)land();else sync();});
 sync();
})();


/* Section entrance, the same rise-and-fade Home uses. Elements are only hidden once this script has run. */
(function () {
 'use strict';
 if (!('IntersectionObserver' in window) || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
 const groups = [
  '#about .about-content > *', '#about .about-feature',
  '#skills > .sr-label, #skills > .sr-title, #skills > .sr-sub', '#skills .sr-row',
  '#projects > .projects-label, #projects > .projects-title, #projects > .projects-sub', '#projects .project-tile',
  '#experience > .experience-label, #experience > .experience-title, #experience > .experience-sub', '#experience .journey-item',
  '#contact .contact-layout > div > *', '#contact .contact-form', '#contact .contact-footer'
 ];
 const io = new IntersectionObserver(entries => entries.forEach(en => {
  if (en.isIntersecting || en.boundingClientRect.top < 0) { en.target.classList.add('is-revealed'); io.unobserve(en.target); }
 }), { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
 groups.forEach(sel => document.querySelectorAll(sel).forEach((el, i) => {
  el.classList.add('reveal'); el.style.setProperty('--reveal-delay', Math.min(i, 5) * 0.08 + 's'); io.unobserve(el); io.observe(el);
 }));
})();

/* Section entrance, the same rise-and-fade Home uses. Elements are only hidden once this script has run. */
(function () {
 'use strict';
 if (!('IntersectionObserver' in window) || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
 const groups = [
  '#about .about-content > *', '#about .about-feature',
  '#skills > .sr-label, #skills > .sr-title, #skills > .sr-sub', '#skills .sr-row',
  '#projects > .projects-label, #projects > .projects-title, #projects > .projects-sub', '#projects .project-tile',
  '#experience > .experience-label, #experience > .experience-title, #experience > .experience-sub', '#experience .journey-item',
  '#contact .contact-layout > div > *', '#contact .contact-form', '#contact .contact-footer'
 ];
 const io = new IntersectionObserver(entries => entries.forEach(en => {
  if (en.isIntersecting || en.boundingClientRect.top < 0) { en.target.classList.add('is-revealed'); io.unobserve(en.target); }
 }), { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
 groups.forEach(sel => document.querySelectorAll(sel).forEach((el, i) => {
  el.classList.add('reveal'); el.style.setProperty('--reveal-delay', Math.min(i, 5) * 0.08 + 's'); io.unobserve(el); io.observe(el);
 }));
})();


(function(){
 const root=document.querySelector('.about-prism');if(!root)return;
 const prism=root.querySelector('.values-prism'),stage=root.querySelector('.prism-stage'),tabs=[...root.querySelectorAll('.prism-tab')],faces=[...root.querySelectorAll('.prism-face')],play=root.querySelector('.prism-play'),reduce=matchMedia('(prefers-reduced-motion: reduce)');
 let angle=-18,target=null,last=0,paused=reduce.matches,hover=false,visible=false,start=null,resumeAt=0,active=-1;
 function draw(announce=false){prism.style.transform=`translateZ(calc(-1 * var(--depth))) rotateY(${angle}deg)`;const index=((Math.round((-angle-18)/90)%4)+4)%4;if(index!==active){active=index;tabs.forEach((b,i)=>{b.classList.toggle('is-current',i===index);b.setAttribute('aria-pressed',String(i===index));});faces.forEach((f,i)=>{f.classList.toggle('is-current',i===index);f.setAttribute('aria-hidden',String(i!==index));});root.querySelector('.prism-count').textContent=`0${index+1} / 04`;}if(announce)root.querySelector('.prism-status').textContent=tabs[index].textContent;}
 function choose(index){const current=Math.round((-angle-18)/90);let diff=index-((current%4)+4)%4;if(diff>2)diff-=4;if(diff< -2)diff+=4;target=-18-(current+diff)*90;resumeAt=performance.now()+7000;if(reduce.matches){angle=target;target=null;draw(true);}}
 tabs.forEach((b,i)=>b.addEventListener('click',()=>choose(i)));
 root.querySelector('[data-direction="next"]').addEventListener('click',()=>choose((active+1)%4));root.querySelector('[data-direction="prev"]').addEventListener('click',()=>choose((active+3)%4));
 function button(){play.textContent=paused?'Play rotation':'Pause rotation';play.setAttribute('aria-pressed',String(paused));}
 play.addEventListener('click',()=>{paused=!paused;button();});button();
 root.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')hover=true;});root.addEventListener('pointerleave',()=>hover=false);
 stage.addEventListener('pointerdown',e=>{if(e.button!==0)return;start={x:e.clientX,y:e.clientY,angle,id:e.pointerId};target=null;stage.setPointerCapture(e.pointerId);});
 stage.addEventListener('pointermove',e=>{if(!start||e.pointerId!==start.id)return;if(Math.abs(e.clientX-start.x)>Math.abs(e.clientY-start.y)){angle=start.angle+(e.clientX-start.x)*.35;draw();}});
 function release(){if(!start)return;start=null;target=-18-Math.round((-angle-18)/90)*90;resumeAt=performance.now()+7000;}
 stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',release);
 root.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();choose((active+(e.key==='ArrowRight'?1:3))%4);}});
 reduce.addEventListener('change',()=>{paused=reduce.matches;button();});
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{threshold:.15}).observe(root);
 function tick(now){const dt=Math.min((now-(last||now))/1000,.05);last=now;if(visible&&!document.hidden){if(target!==null){angle+=(target-angle)*(1-Math.exp(-dt*5));if(Math.abs(target-angle)<.08){angle=target;target=null;draw(true);}}else if(!paused&&!hover&&!start&&!root.contains(document.activeElement)&&now>resumeAt)angle-=dt*5;draw();}requestAnimationFrame(tick);}
 draw();requestAnimationFrame(tick);
})();
