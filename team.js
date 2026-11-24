/* Chat Dungeon: the Team camp (store tab, replaces Deck) and the Collection (side panel tab beside Chat).
   Loaded by the streamer page (404.html), which hands over its helpers as window.CDX. Nothing shows until the
   database says team mode is on (team_state.on), or the page is opened with ?team=demo (pretend data, no calls).
   Database: team_state, team_set, team_send, team_name, claim_card (clears an egg's make), live_dungeons. */
(function(){
  'use strict';
  var SRC=document.currentScript&&document.currentScript.src||'/team.js';
  var X=window.CDX; if(!X){ document.addEventListener('cdx',function go(){ document.removeEventListener('cdx',go); var sc=document.createElement('script'); sc.src=SRC; document.head.appendChild(sc); }); return; }
  if(window.CDTEAM) return;
  var DEMO=/[?&]team=demo\b/.test(location.search);
  var $=function(id){ return document.getElementById(id); };
  var $$=function(s,el){ return [].slice.call((el||document).querySelectorAll(s)); };
  var esc=X.esc, still=window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches;
  var ptCur='spawn', sideCur='chat';
  function ptNow(){ return typeof X.ptNow==='string'?X.ptNow:typeof X.ptNow==='function'?ptNow():ptCur; }
  function sideNow(){ return typeof X.sideNow==='string'?X.sideNow:typeof X.sideNow==='function'?sideNow():sideCur; }
  function roomOpen(){ var r=typeof X.roomOpen==='function'?X.roomOpen():X.roomOpen; return r!==false; }
  function me(){ return typeof X.me==='function'?me():X.me||''; }
  function room(){ return typeof X.room==='function'?X.room():X.room||''; }
  function channel(){ return typeof X.channel==='function'?channel():X.channel||''; }
  function phone(){ return typeof X.phone==='function'?X.phone():false; }
  function account(){ return typeof X.account==='function'?X.account():!!X.account; }
  var BASE=(function(){ var s=document.currentScript&&document.currentScript.src; return s?s.replace(/team\.js.*$/,''):'/'; })();
  var VER=(function(){ var s=document.currentScript&&document.currentScript.src, m=s&&s.match(/[?&]v=([\w.-]+)/); return m?m[1]:'1'; })();
  (function(){ var l=document.createElement('link'); l.rel='stylesheet'; l.href=BASE+'team.css?v='+VER; document.head.appendChild(l); })();

  /* ---------------------------------------------------------------- state */
  var S={on:false,known:false,slots:5,cooldown:14400,members:[],byId:{},making:null,at:0,got:0,
         sel:0,          /* the pad the detail strip shows */
         pick:null,      /* the Collection card that's open in the big panel */
         placing:null,   /* a card being put on a pad (dragged, or "Add to team" then tap a pad) */
         seenForm:{}, seenEgg:{}, played:{}, titleMax:16, outSince:{}, revealing:null, live:null, liveAt:0, busy:false, dead:0};
  function M(id){ return S.byId[id]||null; }
  function onPad(k){ for(var i=0;i<S.members.length;i++) if(S.members[i].slot===k) return S.members[i]; return null; }
  function teamCount(){ return S.members.filter(function(m){ return m.slot!=null; }).length; }
  function cap(s){ s=String(s||''); return s.charAt(0).toUpperCase()+s.slice(1); }
  function nameOf(m){ return m.egg?'Your egg':(m.name||'It'); }
  function hm(s){ s=Math.max(0,s|0); var h=Math.floor(s/3600), m=Math.floor(s%3600/60); return h?h+'h '+(m<10?'0':'')+m+'m':m?m+'m':Math.max(1,s)+'s'; }
  function ms(s){ s=Math.max(0,s|0); return Math.floor(s/60)+':'+(s%60<10?'0':'')+s%60; }
  function chan(){ return channel()||'the'; }
  function chanS(){ var c=channel(); return c?c+'’s':'this'; }
  function spriteOk(s){ return typeof s==='string'&&s.length<60000&&/^[A-Za-z0-9+\/]+=*$/.test(s); }
  function img(m,n,cls){ return spriteOk(m.sprite)?'<img class="tspr'+(cls?' '+cls:'')+'" alt="" width="'+n+'" height="'+n+'" src="data:image/png;base64,'+m.sprite+'">':'<span class="tspr nospr'+(cls?' '+cls:'')+'" style="width:'+n+'px;height:'+n+'px">'+X.pix('enemy',n)+'</span>'; }
  function left(m){ return Math.max(0,Math.round(((m.until||0)-Date.now())/1000)); }

  /* a pixel egg, coloured by the egg's hue (the hue says nothing about what's inside) */
  var eggMemo={};
  function egg(hue,scale,cls){ hue=(hue|0)%360; var key=hue+'/'+scale; if(!eggMemo[key]){ var W=16,H=20,g=[],x,y;
      for(y=0;y<H;y++){ g.push([]); for(x=0;x<W;x++){ var dx=(x+.5-8)/7.2, dy=(y+.5-11.2)/(y<11?10.4:8.6), ch=(dx*dx+dy*dy<=1)?'a':'.';
          if(ch==='a'){ if(dx>.35&&dy>-.1||dy>.62) ch='b'; if(dx<-.25&&dx>-.6&&dy<-.25&&dy>-.6) ch='h';
            [[5,6],[10,9],[6,13],[11,15],[9,4],[4,10]].forEach(function(p){ if(Math.abs(x-p[0])+Math.abs(y-p[1])<=1&&ch!=='h') ch='s'; }); }
          g[y].push(ch); } }
      var pal={a:'hsl('+hue+',62%,76%)',b:'hsl('+hue+',48%,58%)',h:'#fffbe8',s:'hsl('+hue+',46%,36%)',o:'#0b0706'}, out=g.map(function(r){ return r.slice(); }), r='';
      for(y=0;y<H;y++) for(x=0;x<W;x++) if(g[y][x]==='.'&&((g[y-1]&&g[y-1][x]!=='.')||(g[y+1]&&g[y+1][x]!=='.')||(g[y][x-1]&&g[y][x-1]!=='.')||(g[y][x+1]&&g[y][x+1]!=='.'))) out[y][x]='o';
      for(y=0;y<H;y++){ x=0; while(x<W){ var c=out[y][x]; if(c==='.'){ x++; continue; } var x0=x; while(x<W&&out[y][x]===c) x++; r+='<rect x="'+x0+'" y="'+y+'" width="'+(x-x0)+'" height="1" fill="'+pal[c]+'"/>'; } }
      eggMemo[key]='<svg width="'+W*scale+'" height="'+H*scale+'" viewBox="0 0 16 20" shape-rendering="crispEdges" aria-hidden="true">'+r+'</svg>'; }
    return cls?eggMemo[key].replace('<svg ','<svg class="'+cls+'" '):eggMemo[key]; }
  var HAND=(function(){ var g=['....kk......','...kwwk.....','...kwwk.....','...kwwkkk...','...kwwkwwkk.','.kkkwwkwwkwk','kwwkwwwwwkwk','kwwwwwwwwwwk','.kwwwwwwwwwk','.kwwwwwwwwk.','..kwwwwwwwk.','..kwwwwwwk..','...kkkkkkk..'], r='';
    g.forEach(function(row,y){ row.split('').forEach(function(c,x){ if(c!=='.') r+='<rect x="'+x+'" y="'+y+'" width="1" height="1" fill="'+(c==='k'?'#0b0706':'#fff3dc')+'"/>'; }); });
    return '<svg class="thand" viewBox="0 0 12 13" shape-rendering="crispEdges" aria-hidden="true">'+r+'</svg>'; })();

  /* ---------------------------------------------------------------- talking to the database (or the pretend one) */
  var api=DEMO?null:{
    state:function(){ return X.rpc('team_state',X.withTok({q_name:me()})); },
    set:function(id,k){ return X.rpc('team_set',X.withTok({q_name:me(),q_card:id,q_slot:k})); },
    send:function(id){ return X.rpc('team_send',X.withTok({q_code:room(),q_name:me(),q_card:id})); },
    name:function(id,t){ return X.rpc('team_name',X.withTok({q_name:me(),q_card:id,q_title:t})); },
    clear:function(id){ return X.rpc('claim_card',X.withTok({q_name:me(),q_card:id})); },
    live:function(){ return X.rpc('live_dungeons',{}); }
  };
  var ERR={'busy':'It can’t move while it’s fighting or resting.','bad slot':'That pad doesn’t exist.','no card':'That creature isn’t yours.',
    'room closed':'The stream is offline, so nothing can go in right now.','out':'It’s already in the fight.','resting':'It’s still resting.',
    'not on team':'Put it on a pad first, then send it.','too busy':'The stream is very busy. Try again in a moment.','slow down':'Slow down a little, then try again.','team off':'Teams aren’t switched on yet.','not ready':'That egg is still being made.','no account':'Make an account first.','not hatched':'It hasn’t hatched yet.','bad name':'That name isn’t allowed. Try another.'};
  function errText(e){ var m=String(e&&e.message||''); return ERR[m]||(!m||e instanceof TypeError?'Couldn’t reach the server. Try again.':'Server said: '+m.slice(0,100)); }

  function stateIn(j){ if(!j||typeof j!=='object'||!j.members) return false; var now=Date.now(), was=S.on;
    S.known=true; S.on=!!j.on; S.slots=(j.slots|0)||5; S.cooldown=(j.cooldown|0)||14400; S.got=now;
    var by={}, events=[];
    S.members=j.members.map(function(m){ m.id=+m.id; m.slot=m.slot==null?null:+m.slot; m.egg=!!m.egg; m.until=now+(m.left|0)*1000;
      if(m.status==='out'){ if(!S.outSince[m.id]) S.outSince[m.id]=now; } else delete S.outSince[m.id];
      var f=S.seenForm[m.id];
      if(!m.egg&&((f!=null&&(m.form|0)>f)||(f==null&&m.evolved_ago!=null&&m.evolved_ago<12&&!S.played[m.id]))) events.push(['evolve',m,f]);
      if(!m.egg&&S.seenEgg[m.id]&&!m.fresh) events.push(['hatched',m]);
      if(!m.egg) S.seenForm[m.id]=m.form|0; S.seenEgg[m.id]=m.egg;
      by[m.id]=m; return m; });
    S.byId=by; S.making=j.making||null; if(j.title_max) S.titleMax=j.title_max|0;
    if(S.pick!=null&&!by[S.pick]) S.pick=null;
    if(S.on!==was) modeChanged();
    draw(); events.forEach(function(e){ if(e[0]==='evolve') evolved(e[1],e[2]); });
    var fresh=S.members.filter(function(m){ return m.fresh&&!m.egg; })[0];
    if(fresh&&S.revealing!==fresh.id) hatchShow(fresh);
    return true; }

  var pollT=0;
  function poll(){ clearTimeout(pollT);
    if(!api){ pollT=setTimeout(poll,5000); return; }
    if(document.hidden||!me()){ pollT=setTimeout(poll,4000); return; }
    S.busy=true;
    api.state().then(function(j){ S.busy=false; S.dead=0; if(!stateIn(j)){ S.known=true; if(S.on){ S.on=false; modeChanged(); } } next(); })
    .catch(function(e){ S.busy=false; var m=String(e&&e.message||'');
      if(/Could not find the function|no function|does not exist/i.test(m)){ S.dead++; if(S.on){ S.on=false; modeChanged(); } pollT=setTimeout(poll,300000); return; }
      pollT=setTimeout(poll,20000); }); }
  function next(){ pollT=setTimeout(poll,!S.on?180000:shown()?5000:30000); }
  function soon(ms){ clearTimeout(pollT); pollT=setTimeout(poll,ms||600); }
  document.addEventListener('visibilitychange',function(){ if(!document.hidden&&S.on) soon(200); });

  /* ---------------------------------------------------------------- turning team mode on and off */
  var tabTeam=document.querySelector('#ptabs [data-pt="team"]'), tabDeck=document.querySelector('#ptabs [data-pt="deck"]'), tabCol=document.querySelector('.stabs [data-side="collection"]');
  var pane=$('pteam'), colv=document.querySelector('.sview[data-view="collection"]');
  if(!tabTeam||!pane||!tabCol||!colv) return;
  (function(){ var ic=tabTeam.querySelector('[data-px]')||tabTeam.querySelector('svg'); var e=document.createElement('span'); e.className='tegg'; e.innerHTML=egg(38,1); if(ic) ic.parentNode.replaceChild(e,ic); else tabTeam.insertBefore(e,tabTeam.firstChild);
    if(!$('tmdot')){ var d=document.createElement('i'); d.className='pdot'; d.id='tmdot'; d.hidden=true; d.textContent='!'; tabTeam.appendChild(d); } })();
  function modeChanged(){ var on=S.on;
    document.documentElement.classList.toggle('cdteam',on);
    tabTeam.hidden=!on; tabCol.hidden=!on; if(tabDeck) tabDeck.hidden=on;
    if(on){ if(ptNow()==='deck') X.pTab('team'); if(sideNow()==='cards') X.sideTab('collection'); }
    else { if(ptNow()==='team') X.pTab('spawn'); if(sideNow()==='collection') X.sideTab('chat'); }
    if(X.redrawMake) X.redrawMake();
    if(X.layout) X.layout(); }
  function shown(){ return (!pane.hidden&&!!pane.offsetParent)||(!colv.hidden&&!!colv.offsetParent); }
  X.onTab=function(t){ ptCur=t; pane.hidden=t!=='team'; if(t==='team'){ tabDot(false); drawTeam(); wall.kick(); if(S.on) soon(150); } };
  X.onSide=function(t){ sideCur=t; if(t==='collection'){ drawCol(); if(S.on) soon(150); } else if(S.placing&&!drag) stopPlacing(); };
  X.teamOn=function(){ return S.on; };

  /* ---------------------------------------------------------------- Make, in team mode: what's made is an egg */
  X.teamTips=['It comes out as an egg. Nobody knows what’s inside.','It hatches the first time you send it into a stream.','Sending your team in is always free.',
    'Your team has '+5+' pads. The rest wait in your Collection.','You can leave this page. It keeps making.'];
  X.eggCard=function(mk){ return '<button type="button" class="mc t-egg tegg ready" id="mzmyst" aria-label="Your new egg"><span class="nin">New egg</span><span class="ew">'+egg(mk.hue,4,'wob')+'</span></button>'; };
  X.makeDraw=function(st){ if(!S.on) return; $('mzready').textContent='Your egg is ready!'; var b=$('mkreveal'); if(b&&b.textContent!=='Meet your egg') b.textContent='Meet your egg'; };
  X.eggReady=function(mk){ var id=+mk.id, k=mk.slot==null?null:+mk.slot;
    var go=function(j){ if(j&&X.cardsIn) X.cardsIn(j); soon(100); };
    (api?api.clear(id):demo.clear(id)).then(go,function(){ soon(100); });
    if(k!=null){ S.sel=k; X.pTab('team'); toast('Your egg is on your team. Send it into a stream to hatch it!'); }
    else { S.pick=id; X.sideTab('collection',true); toast('Your team is full, so your egg went to your Collection.'); }
    S.landed=id; setTimeout(function(){ S.landed=null; },2500); draw(); };

  /* ---------------------------------------------------------------- the camp: a torch-lit wall and floor (same bricks and torches as the page) */
  var wall=(function(){
    var cv=document.createElement('canvas'), ctx=cv.getContext('2d'), T=4, W=0, H=0, base, f0, f1, im, tx=[0,0], ty=0, wallH=0, t=0;
    cv.className='twall'; cv.setAttribute('aria-hidden','true');
    function rng(seed){ return function(){ seed|=0; seed=seed+0x6D2B79F5|0; var t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
    var STONES=[[156,134,96],[143,122,86],[163,141,102],[134,114,79],[150,128,90],[128,110,80]], MOSS=[112,124,74], MORTAR=[52,43,30];
    var FLOOR=[[96,84,66],[88,77,60],[104,91,70],[82,72,57]], GROUT=[34,28,20];
    function build(){ var host=cv.parentNode; if(!host) return; var w=host.clientWidth, h=host.clientHeight; if(!w||!h) return;
      W=Math.ceil(w/T); H=Math.ceil(h/T); cv.width=W; cv.height=H; base=new Uint8ClampedArray(W*H*3); f0=new Float32Array(W*H); f1=new Float32Array(W*H); im=ctx.createImageData(W,H);
      wallH=Math.round(H*(host.classList.contains('two')?.2:.36));
      var r=rng(11), BW=12, BH=6, x, y, i;
      for(var row=0; row*BH<wallH; row++){ var off=(row%2?BW/2:0)+Math.floor(r()*2);
        for(var c0=-1; c0*BW<W; c0++){ var c=r()<.03?MOSS:STONES[Math.floor(r()*STONES.length)], sh=.9+r()*.2;
          for(var by=0; by<BH; by++) for(var bx=0; bx<BW; bx++){ x=c0*BW+off+bx; y=row*BH+by; if(x<0||x>=W||y>=wallH) continue; i=(y*W+x)*3;
            var m=(bx===0||by===0), k=m?1:sh*(by===1?1.08:by===BH-1?.86:1)*(.95+r()*.1), s=m?MORTAR:c; base[i]=s[0]*k; base[i+1]=s[1]*k; base[i+2]=s[2]*k; } } }
      /* the floor: big flagstones, darker, a shadow line where the wall meets it */
      var FW=16, FH=8;
      for(y=wallH; y<H; y++){ var fy=y-wallH, frow=Math.floor(fy/FH), foff=frow%2?FW/2:0;
        for(x=0; x<W; x++){ i=(y*W+x)*3; var fx=x+foff, cell=Math.floor(fx/FW)*7+frow*13, rr=rng(cell+5)(), s2=FLOOR[Math.floor(rr*FLOOR.length)];
          var g=(fx%FW===0||fy%FH===0), dk=fy<2?.45:fy<4?.7:1, k2=g?1:(.92+rr*.12)*(fy%FH===1?1.06:1)*dk, src=g?GROUT:s2; base[i]=src[0]*k2; base[i+1]=src[1]*k2; base[i+2]=src[2]*k2; } }
      tx=[Math.max(5,Math.round(W*.05)),Math.min(W-6,Math.round(W*.95))]; ty=Math.max(10,Math.round(wallH*.62));
      var rad=Math.max(700,W*W*.09);
      for(y=0;y<H;y++) for(x=0;x<W;x++){ i=y*W+x; var p=x-tx[0], q=y-(ty-4), u=x-tx[1], v=y-(ty-4);
        f0[i]=1.3/(1+(p*p+q*q)/rad); f1[i]=1.3/(1+(u*u+v*v)/rad); }
      paint(true); }
    var fr=rng(99);
    function px(x,y,c){ if(x<0||y<0||x>=W||y>=H) return; var j=(y*W+x)*4, d=im.data; d[j]=c[0]; d[j+1]=c[1]; d[j+2]=c[2]; }
    function paint(force){ if(!im||(!force&&(!cv.offsetParent||document.hidden))) return;
      var d=im.data, n=W*H, I0=still?1:.86+fr()*.14, I1=still?1:.86+fr()*.14;
      for(var i=0, j=0, k=0; i<n; i++, j+=4, k+=3){ var warm=Math.round(Math.min(I0*f0[i]+I1*f1[i],1.3)*14)/14;
        d[j]=base[k]*(.2+warm*.95); d[j+1]=base[k+1]*(.21+warm*.8); d[j+2]=base[k+2]*(.28+warm*.55); d[j+3]=255; }
      for(var t2=0; t2<2; t2++){ var x=tx[t2], y=ty;
        for(var s=0; s<9; s++){ px(x,y+2+s,[70,46,24]); px(x-1,y+2+s,[46,30,16]); }
        for(var c=-2; c<=2; c++){ px(x+c,y,[58,54,52]); px(x+c,y+1,[30,28,28]); }
        px(x-3,y-1,[30,28,28]); px(x+3,y-1,[30,28,28]);
        var hgt=8+(still?0:Math.floor(fr()*3)), sway=still?0:Math.round((fr()-.5)*1.6);
        for(var r2=0; r2<hgt; r2++){ var half=Math.max(0,2.6-r2*.36+(still?0:(fr()-.5)*.9)), cx=x+Math.round(sway*r2/hgt);
          for(var o=-3; o<=3; o++){ var ad=Math.abs(o); if(ad>half) continue;
            px(cx+o,y-1-r2, ad<half-1.4&&r2<hgt-3?[255,241,168]:ad<half-.6?[255,178,58]:[226,83,27]); } } }
      ctx.putImageData(im,0,0); }
    if(!still) setInterval(function(){ paint(false); },110);
    var rz=0; function kick(){ clearTimeout(rz); rz=setTimeout(build,40); }
    window.addEventListener('resize',kick);
    return {el:cv,kick:kick,build:build}; })();

  /* ---------------------------------------------------------------- drawing the Team tab */
  function padPos(k,w,two){ var ah=(campEl&&campEl._ah)||216; if(!two) return {x:10+k*20,y:ah<196?ah-124:Math.max(24,ah-172)}; return [{x:18,y:40},{x:50,y:40},{x:82,y:40},{x:34,y:192},{x:66,y:192}][k]; }
  function stLine(m){ if(!m) return '<span class="tst none">Free pad</span>';
    if(m.status==='out') return m.egg?'<span class="tst out">Hatching…</span>':'<span class="tst out"><i class="tsw">Fighting </i><b data-out="'+m.id+'" data-pre="">'+ms((Date.now()-(S.outSince[m.id]||Date.now()))/1000)+'</b></span>';
    if(m.status==='resting') return '<span class="tst rest"><i class="tsw">Resting </i><b data-left="'+m.id+'" data-pre="">'+hm(left(m))+'</b></span>';
    if(m.egg) return '<span class="tst egg">Send to hatch</span>';
    if(m.evolve_ready) return '<span class="tst evo">Send to evolve!</span>';
    return '<span class="tst ok">Ready</span>'; }
  function lockOf(m){ return m&&(m.status==='out'||m.status==='resting'); }
  function padHtml(k,pos){ var m=onPad(k), cls=[], body='', lk='', tag='';
    if(!m){ cls.push('empty'); body='<span class="tplus">+</span>'; tag='<span class="tnm dim">Empty</span>'; }
    else if(m.status==='out'){ cls.push('locked','isout'); body='<span class="portal"></span>'; lk='Fighting'; tag='<span class="tnm">'+esc(m.egg?'Egg':m.name)+'</span>'; }
    else if(m.egg){ cls.push(m.status==='resting'?'locked':'full'); body='<span class="tshadow"></span><span class="who">'+egg(m.hue,3,'wob')+'</span>'; tag='<span class="tnm">Egg</span>'; if(m.status==='resting') lk='Resting'; }
    else { var r=m.status==='resting'; cls.push(r?'locked':'full'); if(m.evolve_ready&&!r) cls.push('evo'); lk=r?'Resting':'';
      body='<span class="tshadow"></span><span class="who'+(r?'':' look')+'" style="animation-delay:-'+(k*1.3).toFixed(1)+'s">'+img(m,72,r?'sleep':'alive')+'</span>'+(r?'<span class="zz">z</span><span class="zz b">z</span>':'');
      var pct=Math.round(xpPct(m));
      tag='<span class="tnm">'+esc(X.fitName(m.name))+'</span><span class="txp'+(m.xp_next?'':' max')+'"><b style="width:'+pct+'%"></b></span>'; }
    if(S.sel===k) cls.push('sel'); if(m&&S.landed===m.id) cls.push('landed');
    return '<div class="tpad '+cls.join(' ')+'" data-k="'+k+'" role="button" tabindex="0" aria-label="'+(m?esc(m.egg?'Egg':m.name):'Empty pad')+'" style="left:'+pos.x+'%;top:'+pos.y+'px">'
      +'<span class="mark"></span><span class="swapi">'+(m?'⇄':'+')+'</span>'+(lk?'<span class="lk">'+lk+'</span>':'')+'<span class="disc"></span>'+body+tag+stLine(m)+'</div>'; }
  var campEl=null, detEl=null, lastCamp='';
  function availH(){ var pts=pane.closest('.points'); if(!pts) return 0; var cs=getComputedStyle(pts), used=0, n=0;
    [].forEach.call(pts.children,function(c){ if(c.hidden||getComputedStyle(c).display==='none'||getComputedStyle(c).position==='absolute') return; n++;
      if(c.contains(pane)){ var c2=getComputedStyle(c), n2=0; [].forEach.call(c.children,function(d){ if(d.hidden||getComputedStyle(d).display==='none') return; n2++; if(d!==pane) used+=d.offsetHeight; }); used+=(parseFloat(c2.rowGap)||0)*Math.max(0,n2-1); }
      else used+=c.offsetHeight; });
    used+=(parseFloat(cs.rowGap)||0)*Math.max(0,n-1);
    return pts.clientHeight-(parseFloat(cs.paddingTop)||0)-(parseFloat(cs.paddingBottom)||0)-used; }
  function drawTeam(){ if(!S.on) return;
    if(!campEl){ pane.innerHTML='<div class="trow"><div class="tcamp" id="tcamp"><div class="ttitle"><span class="tt1"></span><span class="tt2">Drop it on a pad <button type="button" class="tcancel" data-act="cancel">Cancel</button></span></div><div class="tpads"></div></div><div class="tdet" id="tdet"></div></div><div class="trv" id="trv" hidden></div>';
      campEl=$('tcamp'); detEl=$('tdet'); campEl.insertBefore(wall.el,campEl.firstChild); }
    /* on a PC the store under the stream has a fixed height: the camp fills it, one row, the details beside it */
    var pw=pane.clientWidth||600, fixed=!phone()&&window.matchMedia('(min-width:1000px)').matches&&!!pane.closest('.points');
    pane.classList.toggle('narrow',!fixed&&pw<720); pane.classList.toggle('fixed',fixed); pane.classList.toggle('slim',fixed&&pw<780);
    if(fixed){ var ah=Math.max(118,Math.min(300,availH()-2)); if(campEl._ah!==ah){ campEl._ah=ah; campEl.style.height=ah+'px'; detEl.style.maxHeight=ah+'px'; wall.kick(); } }
    else if(campEl._ah){ campEl._ah=0; campEl.style.height=''; detEl.style.maxHeight=''; wall.kick(); }
    campEl.classList.toggle('compact',fixed&&campEl._ah<196);
    var w=campEl.clientWidth||pw, two=!fixed&&w<540;
    if(campEl.classList.contains('two')!==two){ campEl.classList.toggle('two',two); wall.kick(); }
    campEl.querySelector('.tt1').textContent='Your team · '+teamCount()+' / '+S.slots;
    var h=''; for(var k=0;k<S.slots;k++) h+=padHtml(k,padPos(k,w,two));
    if(h!==lastCamp){ lastCamp=h; campEl.querySelector('.tpads').innerHTML=h; if(S.placing) markPads(); }
    drawDet(); if(!wall.el.width) wall.kick(); }
  function sendBtn(m){ var open=roomOpen();
    if(m.status==='out') return '<span class="tbtn gray">'+(m.egg?'Hatching in '+esc(m.out_where||chan())+'’s stream':'Fighting in '+esc(m.out_where||chan())+'’s stream')+'</span>';
    if(m.status==='resting') return '<span class="tbtn gray" data-left="'+m.id+'" data-pre="Resting · back in ">Resting · back in '+hm(left(m))+'</span>';
    if(!open) return '<span class="tbtn gray">The stream is offline</span>';
    var what=m.egg?'Send to hatch':m.evolve_ready?'Send to evolve':'Send into '+esc(chanS())+' stream';
    if(pane.classList.contains('slim')&&!m.egg&&!m.evolve_ready) what='Send it in';
    return '<button type="button" class="tbtn free'+(m.evolve_ready?' evo':'')+'" data-act="send" data-id="'+m.id+'"><span>'+what+'</span><small>FREE</small></button>'; }
  function xpPct(m){ var a=m.xp_from|0, b=m.xp_next; if(!b) return 100; return Math.max(0,Math.min(100,100*((m.xp|0)-a)/Math.max(1,b-a))); }
  function xpBlock(m){ if(m.egg) return '';
    if(!m.xp_next) return '<div class="txpbar max"><b style="width:calc(100% - 4px)"></b></div><div class="txpl"><span>XP '+(m.xp|0)+'</span><span>Final form</span></div>';
    var pct=xpPct(m);
    return '<div class="txpbar'+(m.evolve_ready?' full':'')+'"><b style="width:calc('+pct.toFixed(1)+'% - 4px)"></b></div><div class="txpl"><span>XP '+(m.xp|0)+' / '+m.xp_next+'</span><span>'+(m.evolve_ready?'Evolves on its next send!':(m.xp_next-(m.xp|0))+' to evolve')+'</span></div>'; }
  function tierTag(m){ return m.egg?'<span class="ttier t-egg">Egg</span>':'<span class="ttier tt-'+esc(m.danger||'normal')+'">'+cap(m.danger||'normal')+'</span>'; }
  function report(m){ var l=m.last; if(!l||m.egg) return ''; var lines=(l.lines||[]).map(function(x){ return '<li'+(x[2]?' class="grey"':'')+'><span>'+esc(x[0])+'</span><b>+'+(x[1]|0)+'</b></li>'; }).join('');
    var tot=l.xp!=null?(l.xp|0):(l.lines||[]).reduce(function(a,x){ return a+(x[2]?0:(x[1]|0)); },0);
    return '<details class="trep"'+(m.status==='resting'&&S.repOpen!==false?' open':'')+'><summary>Last fight'+(l.channel?' in '+esc(l.channel)+'’s stream':'')+'<b>+'+tot+' XP</b></summary>'
      +'<div class="trs"><span>Alive <b>'+ms(l.alive_s|0)+'</b></span><span>Damage <b>'+(l.damage|0)+'</b></span>'+(l.ko?'<span class="ko">KO’d the player!</span>':'')+'</div><ul>'+lines+'</ul></details>'; }
  function liveList(){ var me=String(channel()||'').toLowerCase(), l=(S.live||[]).filter(function(r){ return r.twitch&&r.twitch.toLowerCase()!==me; }).slice(0,4);
    if(!l.length) return ''; return '<div class="tlive"><h4>Your other creatures can fight here</h4>'+l.map(function(r){ return '<a href="/live/'+encodeURIComponent(r.twitch)+'"><span class="dotl"></span><b>'+esc(r.twitch)+'</b><small>'+(r.spawns_hour|0)+' spawns this hour</small></a>'; }).join('')+'</div>'; }
  function drawDet(){ var m=onPad(S.sel), h;
    if(!m) h='<div class="thd"><span class="tname">Empty pad</span></div><p class="tmuted">Drag a creature from your Collection onto this pad, or make a new egg in the Make tab.</p><div class="tacts"><button type="button" class="tbtn ghost" data-act="col">Open Collection</button></div>';
    else if(m.egg) h='<div class="thd"><span class="tname">Mystery egg</span>'+tierTag(m)+'</div><p class="tmuted">'+(m.status==='out'?'It’s in the dungeon now. It hatches about 10 seconds after it lands, or sooner if the streamer hits it.':'Nobody knows what’s inside. Send it into a stream and it hatches there, live.')+'</p>'+sendBtn(m);
    else h='<div class="thd"><span class="tname">'+esc(m.name)+'</span>'+tierTag(m)+'<span class="tform">Form '+((m.form|0)||1)+'</span></div>'+xpBlock(m)
      +'<div class="tstats"><span>Streams <b>'+(m.sends|0)+'</b></span><span>KOs <b>'+(m.kos|0)+'</b></span></div>'+sendBtn(m)+report(m)+(m.status==='resting'?liveList():'');
    if(detEl._h!==h){ var op=detEl.querySelector('details'); if(op) S.repOpen=op.open; detEl._h=h; detEl.innerHTML=h; }
    if(m&&m.status==='resting') getLive(); }
  function getLive(){ if(!api||Date.now()-S.liveAt<60000) return; S.liveAt=Date.now(); api.live().then(function(l){ S.live=Array.isArray(l)?l:[]; drawDet(); },function(){}); }

  /* ---------------------------------------------------------------- the Collection (side panel) */
  function smallCard(m){ var on=m.slot!=null, cls='mc tcard k-enemy '+(m.egg?'t-egg':'t-'+esc(m.danger||'normal'))+(on?' onteam':'')+(S.pick===m.id?' sel':'')+(lockOf(m)?' cool':'')+(S.landed===m.id?' landed':'');
    var inner=m.egg?'<span class="nin">Egg</span><span class="ew">'+egg(m.hue,3,'wob')+'</span>':'<span class="nin">'+esc(X.fitName(m.name))+'</span>'+img(m,96,'cspr');
    var chip=m.status==='out'?'<span class="tchip out">Fighting</span>':m.status==='resting'?'<span class="tchip rest" data-left="'+m.id+'" data-pre="">'+hm(left(m))+'</span>':on?'<span class="tchip team">Team</span>':'';
    return '<button type="button" class="'+cls+'" data-id="'+m.id+'" aria-label="'+esc(m.egg?'Egg':m.name)+'">'+inner+chip+(S.pick===m.id&&!on?HAND+'<span class="thint">drag me</span>':'')+'</button>'; }
  function forms(m){ var f=(m.forms_seen||[]).filter(function(x){ return x&&spriteOk(x.sprite); }), h='';
    if(!f.length&&!m.xp_next) return '';
    f.forEach(function(x){ h+='<span class="tf" title="'+esc(x.name||'')+'"><img alt="" width="28" height="28" src="data:image/png;base64,'+x.sprite+'"></span><i>›</i>'; });
    h+='<span class="tf now">'+img(m,28)+'</span>'; if(m.xp_next) h+='<i>›</i><span class="tf q">?</span>';
    return '<div class="tforms" aria-label="Its forms so far">'+h+'</div>'; }
  function pinHtml(m){ var on=m.slot!=null, big;
    if(m.egg) big='<div class="mc tbig t-egg"><span class="nin">Egg</span><span class="ew">'+egg(m.hue,5,'wob')+'</span></div>';
    else big='<div class="mc tbig k-enemy t-'+esc(m.danger||'normal')+'"><span class="nin">'+esc(X.fitName(m.name))+'</span>'+img(m,112,'cspr')+'</div>';
    var acts=on?'<span class="tbtn gray sm">On your team</span>':'<button type="button" class="tbtn sm" data-act="add">Add to team</button>';
    var state=m.status==='out'?'Fighting in '+esc(m.out_where||chan())+'’s stream right now.':m.status==='resting'?'Resting. It can fight or swap again in <b data-left="'+m.id+'" data-pre="">'+hm(left(m))+'</b>.':m.egg?'Nobody knows what’s inside. Send it into a stream to hatch it.':'Ready to fight.';
    return '<div class="tpin">'+big+'<div class="tpi"><span class="tname">'+(m.egg?'Mystery egg':esc(m.name))+'</span><span class="trowi">'+tierTag(m)+(m.egg?'':'<span class="tform">Form '+((m.form|0)||1)+'</span>')+'</span>'
      +xpBlock(m)+(m.egg?'':'<div class="tstats"><span>Streams <b>'+(m.sends|0)+'</b></span><span>KOs <b>'+(m.kos|0)+'</b></span></div>')+forms(m)+'<p class="tmuted">'+state+'</p>'
      +'<div class="tacts">'+acts+(on?'':'<span class="tdragtip">or drag the card onto a pad</span>')+'</div></div><button type="button" class="tx" data-act="close" aria-label="Close">×</button></div>'; }
  var colBuilt=false;
  function drawCol(){ if(!S.on) return;
    if(!colBuilt){ colBuilt=true; colv.innerHTML='<h3>Collection <small class="tcount"></small></h3><div class="tprev" id="tprev"><div id="tprevin"></div></div><div class="tgrid" id="tgrid"></div><p class="dim tcolnote" id="tcolnote"></p>'; }
    var list=S.members.slice().sort(function(a,b){ var A=a.slot==null?9:a.slot, B=b.slot==null?9:b.slot; return A-B||b.id-a.id; });
    colv.querySelector('.tcount').textContent=list.length?list.length+(list.length===1?' creature':' creatures'):'';
    var g=list.map(smallCard).join(''), grid=$('tgrid'); if(grid._h!==g&&!drag){ grid._h=g; grid.innerHTML=g; }
    $('tcolnote').textContent=list.length?'Tap one to look. Drag it onto your team to swap it in.':'Nothing here yet. Make something in the Make tab and it comes out as an egg.';
    var m=S.pick!=null&&M(S.pick), pv=$('tprev'), ph=m?pinHtml(m):'';
    if(pv._h!==ph){ pv._h=ph; if(ph) $('tprevin').innerHTML=ph; } pv.classList.toggle('open',!!m); }
  function draw(){ if(!S.on) return; drawTeam(); drawCol(); }

  /* ---------------------------------------------------------------- the 1 s tick: timers count down without redrawing everything */
  setInterval(function(){ if(!S.on||document.hidden) return; var now=Date.now();
    $$('[data-left]').forEach(function(el){ var m=M(+el.getAttribute('data-left')); if(!m) return; var pre=el.getAttribute('data-pre'); el.textContent=(pre==null?'Resting ':pre)+hm(left(m)); });
    $$('[data-out]').forEach(function(el){ var m=M(+el.getAttribute('data-out')); if(!m||m.egg) return; var pre=el.getAttribute('data-pre'); el.textContent=(pre==null?'Fighting ':pre)+ms((now-(S.outSince[m.id]||now))/1000); });
    if(S.members.some(function(m){ return m.status==='resting'&&left(m)===0; })) soon(1500); },1000);

  /* ---------------------------------------------------------------- clicks */
  pane.addEventListener('click',function(e){ var a=e.target.closest('[data-act]');
    if(a){ var act=a.getAttribute('data-act');
      if(act==='send') send(+a.getAttribute('data-id'),a);
      else if(act==='col') X.sideTab('collection',true);
      else if(act==='cancel') stopPlacing();
      else if(act==='keep') nameDone(false); else if(act==='rename') nameDone(true);
      return; }
    var p=e.target.closest('.tpad'); if(!p) return; var k=+p.getAttribute('data-k');
    if(S.placing!=null&&!drag){ tryDrop(k); return; }
    S.sel=k; drawTeam(); });
  pane.addEventListener('keydown',function(e){ var p=e.target.closest&&e.target.closest('.tpad'); if(p&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); p.click(); } });
  pane.addEventListener('submit',function(e){ e.preventDefault(); nameDone(true); });
  colv.addEventListener('click',function(e){ if(justDragged) return; var a=e.target.closest('[data-act]');
    if(a){ var act=a.getAttribute('data-act'); if(act==='close'){ S.pick=null; drawCol(); } else if(act==='add') startPlacing(S.pick,false); return; }
    var c=e.target.closest('.tcard'); if(!c) return; var id=+c.getAttribute('data-id'); S.pick=S.pick===id?null:id; drawCol(); });

  function send(id,btn){ var m=M(id); if(!m) return;
    if(!account()){ X.needAccount(function(){ send(id); }); return; }
    if(btn) btn.disabled=true;
    (api?api.send(id):demo.send(id)).then(function(j){ if(j&&j.state&&j.state.members){ stateIn(j.state); m=M(id)||m; } m.status='out'; S.outSince[id]=Date.now(); lastCamp=''; detEl._h=''; draw();
      toast(m.egg?'Your egg drops into '+chanS()+' dungeon. Watch it hatch!':m.evolve_ready?nameOf(m)+' jumps in. Watch it evolve on stream!':nameOf(m)+' jumps into '+chanS()+' stream!'); soon(1500); })
    .catch(function(e){ if(btn) btn.disabled=false; toast(errText(e),true); soon(300); }); }

  /* ---------------------------------------------------------------- placing: drag a card onto a pad, or Add to team then tap a pad */
  function camp(){ return campEl; }
  function goTeam(){ var ph=phone(); if(ph&&sideNow()!=='rewards') X.sideTab('rewards'); if(ptNow()!=='team') X.pTab('team');
    if(campEl){ var r=campEl.getBoundingClientRect(); if(r.top<0||r.bottom>innerHeight) campEl.scrollIntoView({block:ph?'start':'nearest',behavior:still?'auto':'smooth'}); } }
  function markPads(){ var src=M(S.placing), busy=lockOf(src);
    $$('.tpad',campEl).forEach(function(p){ var m=onPad(+p.getAttribute('data-k'));
      p.classList.remove('can-add','can-swap','no');
      if(busy||lockOf(m)) p.classList.add('no'); else p.classList.add(m?'can-swap':'can-add'); }); }
  function startPlacing(id,dragging){ var m=M(id); if(!m) return;
    if(m.slot!=null){ toast(nameOf(m)+' is already on your team.'); return false; }
    S.placing=id; document.documentElement.classList.add('tplacing'); goTeam(); drawTeam(); markPads();
    if(lockOf(m)) toast(m.status==='out'?nameOf(m)+' is fighting. It can join when it’s back.':nameOf(m)+' is resting. It can join in '+hm(left(m))+'.',true);
    else if(!dragging) toast(phone()?'Tap a glowing pad to put it there.':'Click a glowing pad to put it there.');
    return true; }
  function stopPlacing(){ S.placing=null; document.documentElement.classList.remove('tplacing'); $$('.tpad.hot').forEach(function(p){ p.classList.remove('hot'); }); }
  function shake(el){ if(!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
  function tryDrop(k){ var id=S.placing, src=M(id), old=onPad(k), pad=campEl&&campEl.querySelector('.tpad[data-k="'+k+'"]');
    if(!src) { stopPlacing(); return false; }
    if(lockOf(src)){ shake(pad); toast(src.status==='out'?nameOf(src)+' is fighting. It can join when it’s back.':nameOf(src)+' is resting. It can join in '+hm(left(src))+'.',true); return false; }
    if(lockOf(old)){ shake(pad); toast(old.status==='out'?nameOf(old)+' is fighting. Wait until it’s back to swap it.':nameOf(old)+' is resting. You can swap it in '+hm(left(old))+'.',true); return false; }
    /* looks done at once; the database has the last word */
    var who=pad&&pad.querySelector('.who'); if(who) who.classList.add('leave');
    var was=src.slot; if(old) old.slot=null; src.slot=k; S.sel=k; S.pick=null; stopPlacing();
    setTimeout(function(){ lastCamp=''; draw(); var w=campEl.querySelector('.tpad[data-k="'+k+'"] .who')||campEl.querySelector('.tpad[data-k="'+k+'"]'); if(w){ w.classList.add('arrive'); } },who?240:0);
    toast(old?nameOf(src)+' joined your team. '+(old.egg?'The egg':old.name)+' went back to your Collection.':nameOf(src)+' joined your team.');
    (api?api.set(id,k):demo.set(id,k)).then(function(j){ if(j&&j.members) stateIn(j); else soon(200); })
    .catch(function(e){ src.slot=was; if(old) old.slot=k; lastCamp=''; draw(); toast(errText(e),true); soon(200); });
    return true; }

  var drag=null, justDragged=false, press=null, lp=null;
  function ghost(m,el){ var g=document.createElement('div'); g.className='tghost';
    g.innerHTML='<div class="gcard">'+el.outerHTML.replace(/<svg class="thand"[\s\S]*?<\/svg>|<span class="thint">.*?<\/span>/g,'')+'</div><span class="gc">'+(m.egg?egg(m.hue,3):img(m,72))+'</span>';
    document.body.appendChild(g); return g; }
  function beginDrag(id,el,x,y){ var m=M(id); if(!m) return;
    if(m.slot!=null){ toast(nameOf(m)+' is already on your team.'); return; }
    var r=el.getBoundingClientRect(); S.pick=id;
    drag={id:id,el:el,ox:x-r.left,oy:y-r.top,home:r,hot:null,g:ghost(m,el)}; el.classList.add('lifted');
    if(navigator.vibrate) try{ navigator.vibrate(15); }catch(e){}
    startPlacing(id,true); moveDrag(x,y); }
  function moveDrag(x,y){ if(!drag) return; drag.g.style.transform='translate('+(x-drag.ox)+'px,'+(y-drag.oy)+'px)';
    var hit=document.elementFromPoint(x,y), p=hit&&hit.closest&&hit.closest('#tcamp .tpad');
    if(p!==drag.hot){ if(drag.hot) drag.hot.classList.remove('hot'); drag.hot=p; if(p) p.classList.add('hot'); }
    drag.g.classList.toggle('over',!!(p&&!p.classList.contains('no')));
    /* near the screen's edge: scroll, so a camp below the fold can be reached */
    var ed=60, dy=y<ed?-12:y>innerHeight-ed?12:0; if(dy) scrollBy(0,dy); }
  function endDrag(){ var d=drag; drag=null; justDragged=true; setTimeout(function(){ justDragged=false; },60);
    var ok=d.hot?tryDrop(+d.hot.getAttribute('data-k')):false;
    if(ok){ d.g.remove(); d.el.classList.remove('lifted'); return; }
    stopPlacing(); if(phone()) X.sideTab('collection');
    requestAnimationFrame(function(){ var r=d.el.isConnected&&d.el.offsetParent?d.el.getBoundingClientRect():d.home; d.g.classList.add('back'); d.g.classList.remove('over'); d.g.style.transform='translate('+r.left+'px,'+r.top+'px)'; });
    setTimeout(function(){ d.g.remove(); d.el.classList.remove('lifted'); colv.querySelector('#tgrid')._h=''; drawCol(); },320); }
  /* mouse and pen: drag after a small move */
  document.addEventListener('pointerdown',function(e){ if(e.pointerType==='touch'||e.button!==0||!S.on) return; var el=e.target.closest&&e.target.closest('#tgrid .tcard'); if(!el) return;
    press={id:+el.getAttribute('data-id'),el:el,x:e.clientX,y:e.clientY}; });
  document.addEventListener('pointermove',function(e){ if(e.pointerType==='touch') return;
    if(press&&!drag&&Math.abs(e.clientX-press.x)+Math.abs(e.clientY-press.y)>7){ var p=press; press=null; beginDrag(p.id,p.el,e.clientX,e.clientY); }
    if(drag){ e.preventDefault(); moveDrag(e.clientX,e.clientY); } });
  document.addEventListener('pointerup',function(e){ if(e.pointerType==='touch') return; press=null; if(drag) endDrag(); });
  document.addEventListener('dragstart',function(e){ if(e.target.closest&&e.target.closest('#tgrid')) e.preventDefault(); });
  /* touch: press and hold, then drag (a quick swipe still scrolls) */
  document.addEventListener('touchstart',function(e){ if(!S.on) return; var el=e.target.closest&&e.target.closest('#tgrid .tcard'); if(!el) return; var t=e.touches[0];
    lp={el:el,x:t.clientX,y:t.clientY,timer:setTimeout(function(){ var l=lp; lp=null; if(l) beginDrag(+l.el.getAttribute('data-id'),l.el,l.x,l.y); },280)}; },{passive:true});
  document.addEventListener('touchmove',function(e){ var t=e.touches[0];
    if(lp){ if(Math.abs(t.clientX-lp.x)+Math.abs(t.clientY-lp.y)>10){ clearTimeout(lp.timer); lp=null; } else { lp.x=t.clientX; lp.y=t.clientY; } }
    if(drag){ e.preventDefault(); moveDrag(t.clientX,t.clientY); } },{passive:false});
  document.addEventListener('touchend',function(e){ if(lp){ clearTimeout(lp.timer); lp=null; } if(drag){ e.preventDefault(); endDrag(); } },{passive:false});
  document.addEventListener('touchcancel',function(){ if(lp){ clearTimeout(lp.timer); lp=null; } if(drag) endDrag(); });
  document.addEventListener('contextmenu',function(e){ if(e.target.closest&&e.target.closest('#tgrid .tcard')) e.preventDefault(); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&S.placing!=null&&!drag){ stopPlacing(); toast('Cancelled.'); } });

  /* ---------------------------------------------------------------- hatching (the site shows it the moment the game reports it) */
  function tabDot(on){ var d=$('tmdot'); if(d) d.hidden=!on; }
  function hatchShow(m){ S.revealing=m.id; var o=$('trv'); if(!o) { drawTeam(); o=$('trv'); } if(!o) return;
    var max=S.titleMax||16;
    o.innerHTML='<div class="trvbox"><span class="rays" aria-hidden="true"></span><div class="mc tbig k-enemy t-'+esc(m.danger||'normal')+'"><span class="nin">'+esc(X.fitName(m.name))+'</span>'+img(m,112,'cspr')+'</div>'
      +'<div class="trvt"><p class="trvh">Your egg hatched!</p><p class="tmuted">It\u2019s a <b>'+esc(m.name)+'</b>. Give it a name, or keep this one.</p><form class="trvf"><label class="vh" for="trvname">Name</label><input id="trvname" maxlength="'+max+'" autocomplete="off" value="'+esc(String(m.name||'').slice(0,max))+'" enterkeyhint="done">'
      +'<button type="submit" class="tbtn sm">Name it</button><button type="button" class="tbtn ghost sm" data-act="keep">Keep</button></form><p class="trverr" id="trverr" role="status"></p></div></div>';
    o.hidden=false; pane.classList.add('rvon');
    if(ptNow()!=='team'||!pane.offsetParent){ tabDot(true); toast('Your egg hatched! Open your Team to meet it.'); } }
  function nameDone(typed){ var id=S.revealing, m=M(id), inp=$('trvname'); if(!m){ hatchClose(); return; }
    var t=typed&&inp?inp.value.replace(/\s+/g,' ').trim():''; if(t===m.name) t='';
    var b=$$('#trv button'); b.forEach(function(x){ x.disabled=true; });
    (api?api.name(id,t):demo.name(id,t)).then(function(j){ m.fresh=false; if(t) m.name=t; hatchClose(); if(j&&j.members) stateIn(j); else soon(200); })
    .catch(function(e){ b.forEach(function(x){ x.disabled=false; }); $('trverr').textContent=errText(e); }); }
  function hatchClose(){ var o=$('trv'); if(o){ o.hidden=true; o.innerHTML=''; } pane.classList.remove('rvon'); S.revealing=null; lastCamp=''; detEl&&(detEl._h=''); draw(); }

  /* ---------------------------------------------------------------- evolving: shown on the site while the stream shows it */
  function evolved(m,from){ S.played[m.id]=1; var k=m.slot, w=k!=null&&campEl&&campEl.querySelector('.tpad[data-k="'+k+'"] .who');
    if(w){ w.classList.add('evolving'); setTimeout(function(){ w.classList.remove('evolving'); w.classList.add('arrive'); },1300); }
    toast(nameOf(m)+' evolved! Form '+(m.form|0)+(m.danger?', now '+cap(m.danger):'')+'.'); if(ptNow()!=='team') tabDot(true); }

  /* ---------------------------------------------------------------- a small toast of its own (bottom of the screen) */
  var tEl=document.createElement('div'), tT=0; tEl.className='ttoast'; tEl.setAttribute('role','status'); tEl.setAttribute('aria-live','polite'); document.body.appendChild(tEl);
  function toast(t,bad){ tEl.textContent=t; tEl.classList.toggle('bad',!!bad); tEl.classList.add('on'); clearTimeout(tT); tT=setTimeout(function(){ tEl.classList.remove('on'); },3200); }

  if(window.ResizeObserver) new ResizeObserver(function(){ if(!drag&&S.on&&!pane.hidden){ lastCamp=''; drawTeam(); wall.kick(); } }).observe(pane);

  /* ---------------------------------------------------------------- start */
  var demo=null;
  window.CDTEAM={S:S,draw:draw,stateIn:stateIn,poll:poll,api:api,setDemo:function(d){ demo=d; }};
  if(DEMO){ var s=document.createElement('script'); s.src=BASE+'team-demo.js?v='+VER+''; s.onload=function(){ if(window.CDTEAM_DEMO){ demo=window.CDTEAM_DEMO(stateIn,X); } }; document.head.appendChild(s); }
  else { var wait=function(){ if(me()) poll(); else setTimeout(wait,1500); }; setTimeout(wait,800); }
})();
