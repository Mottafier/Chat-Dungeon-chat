/* Chat Dungeon: the Team camp (store tab, replaces Deck) and the Collection (side tab beside Chat on a PC; under the camp on a phone).
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
  (function(){ var l=document.createElement('link'); l.rel='stylesheet'; l.href=BASE+'team.css?v='+VER+'.2'; document.head.appendChild(l); })();

  /* ---------------------------------------------------------------- state */
  var S={on:false,known:false,slots:5,cooldown:14400,members:[],byId:{},making:null,at:0,got:0,
         pick:null,      /* the creature that's picked: a team member (Send button over it) or a Collection card. Its full page shows in the Collection */
         spot:null,      /* an empty team spot that's picked (Add to team fills it) */
         placing:null,   /* a card being put on the team (dragged, or "Add to team" with a full team, then tap who it swaps with) */
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
  var ERR={'busy':'It can’t move while it’s fighting or resting.','bad slot':'That spot doesn’t exist.','no card':'That creature isn’t yours.',
    'room closed':'The stream is offline, so nothing can go in right now.','out':'It’s already in the fight.','resting':'It’s still resting.',
    'not on team':'Put it on your team first, then send it.','too busy':'The stream is very busy. Try again in a moment.','slow down':'Slow down a little, then try again.','team off':'Teams aren’t switched on yet.','not ready':'That egg is still being made.','no account':'Make an account first.','not hatched':'It hasn’t hatched yet.','bad name':'That name isn’t allowed. Try another.'};
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
    tabTeam.hidden=!on; tabCol.hidden=!on||phone(); if(tabDeck) tabDeck.hidden=on;
    if(on){ if(ptNow()==='deck') X.pTab('team'); if(sideNow()==='cards') X.sideTab('collection'); }
    else { if(ptNow()==='team') X.pTab('spawn'); if(sideNow()==='collection') X.sideTab('chat'); }
    if(X.redrawMake) X.redrawMake();
    if(X.layout) X.layout(); }
  function shown(){ return (!pane.hidden&&!!pane.offsetParent)||(!colv.hidden&&!!colv.offsetParent); }
  X.onTab=function(t){ ptCur=t; pane.hidden=t!=='team'; if(t==='team'){ tabDot(false); draw(); scene.kick(); if(S.on) soon(150); } };
  X.onSide=function(t){ sideCur=t; if(t==='collection'){ drawCol(); if(S.on) soon(150); } else if(S.placing!=null&&!drag&&!phone()&&t!=='rewards') stopPlacing(); };
  X.teamOn=function(){ return S.on; };

  /* ---------------------------------------------------------------- Make, in team mode: what's made is an egg */
  X.teamTips=['It comes out as an egg. Nobody knows what’s inside.','It hatches the first time you send it into a stream.','Sending your team in is always free.',
    'Your team has '+5+' spots. The rest wait in your Collection.','You can leave this page. It keeps making.'];
  X.eggCard=function(mk){ return '<button type="button" class="mc t-egg tegg ready" id="mzmyst" aria-label="Your new egg"><span class="nin">New egg</span><span class="ew">'+egg(mk.hue,4,'wob')+'</span></button>'; };
  X.makeDraw=function(st){ if(!S.on) return; $('mzready').textContent='Your egg is ready!'; var b=$('mkreveal'); if(b&&b.textContent!=='Meet your egg') b.textContent='Meet your egg'; };
  X.eggReady=function(mk){ var id=+mk.id, k=mk.slot==null?null:+mk.slot;
    var go=function(j){ if(j&&X.cardsIn) X.cardsIn(j); soon(100); };
    (api?api.clear(id):demo.clear(id)).then(go,function(){ soon(100); });
    if(k!=null){ S.pick=id; S.spot=null; X.pTab('team'); toast('Your egg is on your team. Send it into a stream to hatch it!'); }
    else { S.pick=id; if(phone()) X.pTab('team'); else X.sideTab('collection',true); toast('Your team is full, so your egg went to your Collection.'); }
    S.landed=id; setTimeout(function(){ S.landed=null; },2500); draw(); };

  /* ---------------------------------------------------------------- the camp: a night sky over grass, outside the dungeon.
     (The page around it is the torch-lit brick wall; the team's camp is its own place, so it's painted differently.) */
  var scene=(function(){
    var cv=document.createElement('canvas'), ctx=cv.getContext('2d'), T=4, W=0, H=0, base=null, im=null, stars=[], lines=[], tk=0, sig='';
    cv.className='tsky'; cv.setAttribute('aria-hidden','true');
    function rng(seed){ return function(){ seed|=0; seed=seed+0x6D2B79F5|0; var t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
    var SKY=[[9,11,36],[13,18,54],[18,28,78],[25,40,102],[35,55,126],[50,74,150],[72,96,170]];
    var FAR=[36,54,122], NEAR=[21,34,86], PINE=[11,19,52];
    var GRASS=[{e:[134,220,112],t:[70,160,90],m:[47,124,82],l:[31,90,72]},      /* the front ground */
               {e:[96,180,116],t:[53,130,94],m:[38,102,86],l:[27,78,74]}];      /* a ridge behind it */
    function put(x,y,c){ if(x<0||y<0||x>=W||y>=H) return; var i=(y*W+x)*3; base[i]=c[0]; base[i+1]=c[1]; base[i+2]=c[2]; }
    function build(){ var host=cv.parentNode; if(!host) return; var w=host.clientWidth, h=host.clientHeight; if(!w||!h) return;
      W=Math.ceil(w/T); H=Math.ceil(h/T); cv.width=W; cv.height=H; im=ctx.createImageData(W,H); base=new Uint8ClampedArray(W*H*3);
      var g=(lines.length?lines:[h*.7]).map(function(v){ return Math.max(4,Math.min(H-2,Math.round(v/T))); }), g0=g[0], r=rng(7), x, y, i;
      /* sky: bands that dither into each other, lighter toward the hills */
      for(y=0;y<H;y++){ var t=Math.min(1,y/Math.max(1,g0))*(SKY.length-1), b=Math.min(SKY.length-1,Math.floor(t)), fr=t-b;
        for(x=0;x<W;x++) put(x,y,SKY[Math.min(SKY.length-1,b+((fr>.55&&((x+y)&1))?1:0))]); }
      /* the moon, between two of the team's spots, with a soft halo */
      var R=Math.max(3,Math.round(g0*.17)), mx=Math.round(W*(g.length>1?.665:.8)), my=Math.max(R+2,Math.round(g0*.3));
      for(y=my-R-4;y<=my+R+4;y++) for(x=mx-R-4;x<=mx+R+4;x++){ if(x<0||y<0||x>=W||y>=H) continue; var dx=x-mx, dy=y-my, dd=Math.sqrt(dx*dx+dy*dy); i=(y*W+x)*3;
        if(dd<=R+.2){ var edge=(dx+dy)>R*.75||dd>R-.9&&dx>0; put(x,y,edge?[214,202,170]:[250,242,204]); }
        else if(dd<=R+3.4&&(dd<=R+1.6||((x+y)&1))){ base[i]+=(150-base[i])*.3; base[i+1]+=(170-base[i+1])*.3; base[i+2]+=(235-base[i+2])*.3; } }
      [[-.35,-.3,.22],[.2,.15,.28],[-.3,.4,.16]].forEach(function(c){ var cr=Math.max(1,Math.round(R*c[2])), cx=mx+Math.round(R*c[0]), cy=my+Math.round(R*c[1]);
        for(var yy=-cr;yy<=cr;yy++) for(var xx=-cr;xx<=cr;xx++) if(xx*xx+yy*yy<=cr*cr-.5&&R>4) put(cx+xx,cy+yy,[226,214,178]); });
      /* two lines of hills, and pines on the nearer one */
      var sc=Math.max(.5,g0/30);
      function far(x){ return g0-Math.round((2.5+4*(Math.sin(x*.043+1.1)+1)+2.4*(Math.sin(x*.117+4)+1))*sc); }
      function near(x){ return g0-Math.round((.8+2.3*(Math.sin(x*.071+2.2)+1)+1.3*(Math.sin(x*.19+.4)+1))*sc); }
      /* stars (they twinkle in paint) */
      stars=[]; var n=Math.round(W*g0/120);
      for(i=0;i<n;i++){ var sx=Math.floor(r()*W), sy=Math.floor(r()*g0*.86), md=Math.sqrt((sx-mx)*(sx-mx)+(sy-my)*(sy-my)); if(md<R+5||sy>=far(sx)-1) continue;
        stars.push({x:sx,y:sy,b:r()<.14?2:r()<.5?1:0,ph:Math.floor(r()*16),w:r()<.3}); }
      for(x=0;x<W;x++){ for(y=far(x);y<g0+2;y++) put(x,y,FAR); }
      for(x=0;x<W;x++){ for(y=near(x);y<g0+2;y++) put(x,y,NEAR); }
      for(x=Math.floor(r()*6);x<W;x+=6+Math.floor(r()*11)){ var th=Math.round((4+r()*5)*Math.min(1.4,sc)), by=near(x)+1;
        for(var j=0;j<th;j++){ var half=Math.floor(j/2.1); for(var o=-half;o<=half;o++) put(x+o,by-th+j,PINE); } put(x,by,PINE); }
      /* grass: one band for each row of spots, the front one brightest */
      g.forEach(function(gy,gi){ var end=gi+1<g.length?g[gi+1]:H, P=GRASS[gi===g.length-1?0:1], rr=rng(31+gi*17);
        for(x=0;x<W;x++){ var y0=gy+(Math.sin(x*.9+gi*2)+Math.sin(x*.37+gi)>1.1?-1:0), span=Math.max(1,end-y0);
          for(y=y0;y<end;y++){ var d=y-y0, p=d/span, c=d===0?P.e:d<3?P.t:p<.5?P.m:P.l;
            if(d>=3&&Math.abs(p-.5)<.06&&((x+y)&1)) c=P.m;
            var q=rr(); if(d>0&&d<4&&q<.08) c=P.e; else if(d>=3&&q<.02) c=P.t; else if(d>=2&&d<span-1&&q>.9975) c=q>.999?[255,214,110]:[246,240,214];
            put(x,y,c); } } });
      paint(true); }
    function paint(force){ if(!im||(!force&&(!cv.offsetParent||document.hidden))) return; var d=im.data, n=W*H; tk++;
      for(var i=0,j=0,k=0;i<n;i++,j+=4,k+=3){ d[j]=base[k]; d[j+1]=base[k+1]; d[j+2]=base[k+2]; d[j+3]=255; }
      stars.forEach(function(s){ var ph=(tk+s.ph)%16, off=!still&&s.w&&ph<2, v=s.b===2?255:s.b===1?200:140; if(off) v*=.45;
        var q=(s.y*W+s.x)*4; d[q]=Math.max(d[q],v*.92); d[q+1]=Math.max(d[q+1],v*.95); d[q+2]=Math.max(d[q+2],v);
        if(s.b===2&&!off&&(still||ph>8)){ [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(o){ var x=s.x+o[0], y=s.y+o[1]; if(x<0||y<0||x>=W||y>=H) return; var z=(y*W+x)*4; d[z]=Math.max(d[z],120); d[z+1]=Math.max(d[z+1],130); d[z+2]=Math.max(d[z+2],170); }); } });
      ctx.putImageData(im,0,0); }
    if(!still) setInterval(function(){ paint(false); },380);
    var rz=0; function kick(){ clearTimeout(rz); rz=setTimeout(build,40); }
    function set(l,key){ var s=l.join(',')+'/'+key; if(s!==sig){ sig=s; lines=l; kick(); } }
    window.addEventListener('resize',kick);
    return {el:cv,kick:kick,set:set}; })();

  /* ---------------------------------------------------------------- drawing the Team tab */
  var TIER={harmless:1,weak:1,normal:1,tough:1,deadly:1,god:1};
  function tcls(m){ return m.egg?'t-egg':'t-'+(TIER[m.danger]?m.danger:'normal'); }
  function lockOf(m){ return m&&(m.status==='out'||m.status==='resting'); }
  function stLine(m){ if(!m) return '<span class="tst none">Add someone</span>';
    if(m.status==='out') return m.egg?'<span class="tst out">Hatching…</span>':'<span class="tst out">Fighting <b data-out="'+m.id+'" data-pre="">'+ms((Date.now()-(S.outSince[m.id]||Date.now()))/1000)+'</b></span>';
    if(m.status==='resting') return '<span class="tst rest">Resting <b data-left="'+m.id+'" data-pre="">'+hm(left(m))+'</b></span>';
    if(m.egg) return '<span class="tst egg">Ready to hatch</span>';
    if(m.evolve_ready) return '<span class="tst evo">Ready to evolve!</span>';
    return '<span class="tst ok">Ready</span>'; }
  function xpPct(m){ var a=m.xp_from|0, b=m.xp_next; if(!b) return 100; return Math.max(0,Math.min(100,100*((m.xp|0)-a)/Math.max(1,b-a))); }
  /* the big button that appears over the one you picked */
  function sendTop(m){ if(m.status==='out'||m.status==='resting') return '';
    if(!roomOpen()) return '<span class="tsend gray">Stream is offline</span>';
    var what=m.egg?'Send to hatch!':m.evolve_ready?'Send to evolve!':'Send to dungeon!';
    return '<button type="button" class="tsend'+(m.evolve_ready&&!m.egg?' evo':'')+'" data-act="send" data-id="'+m.id+'">'+what+'</button>'; }
  function spotHtml(k,pos){ var m=onPad(k), cls=['tspot'], body='', lk='', tag='', top='', sel=m?S.pick===m.id:S.spot===k, cs=camp.cs;
    if(!m){ cls.push('empty'); body='<span class="tplus" aria-hidden="true"><i>+</i></span>'; tag='<span class="tnm dim">Empty spot</span>'; }
    else { cls.push(tcls(m)); var nm=m.egg?'Egg':esc(camp.sw<170?X.fitName(m.name):m.name), bar=m.egg?'':'<span class="txp'+(m.xp_next?'':' max')+(m.evolve_ready?' full':'')+'"><b style="width:'+Math.round(xpPct(m))+'%"></b></span>';
      tag='<span class="tnm">'+nm+'</span>'+bar;
      if(m.status==='out'){ cls.push('locked','isout'); body='<span class="portal"></span>'; lk='Fighting'; }
      else if(m.egg){ var re=m.status==='resting'; cls.push(re?'locked':'full'); if(re) lk='Resting'; body='<span class="tshadow"></span><span class="who">'+egg(m.hue,cs>=96?4:3,'wob')+'</span>'; }
      else { var r=m.status==='resting'; cls.push(r?'locked':'full'); if(r){ cls.push('asleep'); lk='Resting'; } if(m.evolve_ready&&!r) cls.push('evo');
        body='<span class="tshadow"></span><span class="who'+(r?'':' look')+'" style="animation-delay:-'+(k*1.3).toFixed(1)+'s">'+img(m,cs,r?'sleep':'alive')+'</span>'+(r?'<span class="zz">z</span><span class="zz b">z</span>':''); }
      if(sel) top=sendTop(m);
      if(!top&&!m.egg) top='<span class="thov">'+cap(m.danger||'normal')+' · Form '+((m.form|0)||1)+'</span>';
      else if(!top) top='<span class="thov">Mystery egg</span>'; }
    if(sel) cls.push('sel'); if(m&&S.landed===m.id) cls.push('landed'); if(pos.e) cls.push(pos.e);
    return '<div class="'+cls.join(' ')+'" data-k="'+k+'" role="button" tabindex="0" aria-pressed="'+(sel?'true':'false')+'" aria-label="'+(m?esc(m.egg?'Egg':m.name):'Empty spot')+'" style="left:'+pos.x+'%;top:'+pos.y+'px;height:'+pos.h+'px">'
      +'<span class="tglow"></span><span class="mark"></span><span class="swapi">'+(m?'⇄ Swap':'+ Here')+'</span>'+(lk?'<span class="lk">'+lk+'</span>':'')+top+body+'<span class="tlbl">'+tag+stLine(m)+'</span></div>'; }
  /* what's compared to decide on a redraw: the HTML without its running clocks (the 1 s tick keeps those going) */
  function sig(h){ return h.replace(/(data-(?:out|left)="\d+" data-pre="[^"]*">)[^<]*/g,'$1'); }
  var campEl=null, lastCamp='', camp={cs:96,lh:40,two:false,h:216,sw:200};
  function availH(){ var pts=pane.closest('.points'); if(!pts) return 0; var cs=getComputedStyle(pts), used=0, n=0;
    [].forEach.call(pts.children,function(c){ if(c.hidden||getComputedStyle(c).display==='none'||getComputedStyle(c).position==='absolute') return; n++;
      if(c.contains(pane)){ var c2=getComputedStyle(c), n2=0; [].forEach.call(c.children,function(d){ if(d.hidden||getComputedStyle(d).display==='none') return; n2++; if(d!==pane) used+=d.offsetHeight; }); used+=(parseFloat(c2.rowGap)||0)*Math.max(0,n2-1); }
      else used+=c.offsetHeight; });
    used+=(parseFloat(cs.rowGap)||0)*Math.max(0,n-1);
    return pts.clientHeight-(parseFloat(cs.paddingTop)||0)-(parseFloat(cs.paddingBottom)||0)-used; }
  function buildPane(){ if(campEl) return;
    pane.innerHTML='<div class="tstage"><div class="tcamp" id="tcamp"><div class="tflies" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>'
      +'<div class="ttitle"><span class="tt1"></span><span class="tt2">Pick a spot for it <button type="button" class="tcancel" data-act="cancel">Cancel</button></span></div><div class="tspots"></div></div>'
      +'<div class="trv" id="trv" hidden></div></div><div class="tcolhost" id="tcolhost"></div>';
    campEl=$('tcamp'); campEl.insertBefore(scene.el,campEl.firstChild); }
  function drawTeam(){ if(!S.on) return; buildPane(); mount();
    /* on a PC the store under the stream has a fixed height: the camp fills all of it, one row of five.
       On a phone (and anything narrow) it's two rows, three on a ridge and two in front. */
    var pw=pane.clientWidth||600, fixed=!phone()&&window.matchMedia('(min-width:1000px)').matches&&!!pane.closest('.points'), h, two=false, cs, lh;
    pane.classList.toggle('fixed',fixed);
    if(fixed){ h=Math.max(118,Math.min(320,availH()-2)); cs=h>=158?96:h>=140?80:h>=126?72:64; lh=cs>=80?46:40; }
    else { two=pw<560; cs=96; lh=46; h=two?356:232; if(two&&pw<340){ cs=80; h=324; } }
    if(camp.h!==h||camp.two!==two||camp.cs!==cs){ camp.h=h; camp.two=two; camp.cs=cs; camp.lh=lh; lastCamp='';
      campEl.style.height=h+'px'; campEl.style.setProperty('--cs',cs+'px'); campEl.style.setProperty('--lh',lh+'px');
      campEl.classList.toggle('two',two); campEl.classList.toggle('compact',cs<80); }
    camp.lh=lh;
    var rows=two?[[0,1,2],[3,4]]:[[0,1,2,3,4]], rh=h/rows.length, P=[], lines=[], cw=campEl.clientWidth||pw, sw=Math.round(cw*(two?.3333:.2));
    campEl.style.setProperty('--sw',sw+'px'); camp.sw=sw;
    rows.forEach(function(row,ri){ lines.push(Math.round((ri+1)*rh-lh-Math.round(cs*.14))); row.forEach(function(k,i){ P[k]={x:two?(ri?[32,68]:[17,50,83])[i]:10+i*20,y:Math.round(ri*rh),h:Math.round(rh),e:sw<216?(i===0?'el':i===row.length-1?'er':''):''}; }); });
    scene.set(lines,h+'x'+campEl.clientWidth);
    campEl.querySelector('.tt1').textContent='Your team  '+teamCount()+' / '+S.slots; var pk=S.pick!=null&&M(S.pick); campEl.classList.toggle('haspick',!!(pk&&pk.slot!=null));
    var html=''; for(var k=0;k<S.slots;k++) html+=spotHtml(k,P[k]||P[P.length-1]);
    var hs=sig(html); if(hs!==lastCamp){ lastCamp=hs; campEl.querySelector('.tspots').innerHTML=html; if(S.placing!=null) markPads(); }
    if(!scene.el.width) scene.kick(); }

  /* ---------------------------------------------------------------- the Collection: everyone who is not on the team, and
     the full page about whoever is picked (a team member or a card). On a PC it's the side tab beside Chat; on a phone
     it sits right under the camp, so a card can be dragged straight up onto the team. */
  var colEl=document.createElement('div'); colEl.className='tcol';
  colEl.innerHTML='<h3>Collection <small class="tcount"></small></h3><div class="tprev" id="tprev"><div id="tprevin"></div></div><div class="tgrid" id="tgrid"></div><p class="dim tcolnote" id="tcolnote"></p>';
  function mount(){ var ph=phone(), host=ph?$('tcolhost'):colv; if(host&&colEl.parentNode!==host) host.appendChild(colEl);
    tabCol.hidden=!S.on||ph; document.documentElement.classList.toggle('tphone',ph&&S.on);
    if(ph&&S.on&&sideNow()==='collection'){ X.sideTab('rewards'); X.pTab('team'); } }
  function tierTag(m){ return m.egg?'<span class="ttier t-egg">Egg</span>':'<span class="ttier tt-'+esc(m.danger||'normal')+'">'+cap(m.danger||'normal')+'</span>'; }
  function xpBlock(m){ if(m.egg) return '';
    if(!m.xp_next) return '<div class="txpbar max"><b style="width:calc(100% - 4px)"></b></div><div class="txpl"><span>XP '+(m.xp|0)+'</span><span>Final form</span></div>';
    var pct=xpPct(m);
    return '<div class="txpbar'+(m.evolve_ready?' full':'')+'"><b style="width:calc('+pct.toFixed(1)+'% - 4px)"></b></div><div class="txpl"><span>XP '+(m.xp|0)+' / '+m.xp_next+'</span><span>'+(m.evolve_ready?'Evolves on its next send!':(m.xp_next-(m.xp|0))+' to evolve')+'</span></div>'; }
  function report(m){ var l=m.last; if(!l||m.egg) return ''; var lines=(l.lines||[]).map(function(x){ return '<li'+(x[2]?' class="grey"':'')+'><span>'+esc(x[0])+'</span><b>+'+(x[1]|0)+'</b></li>'; }).join('');
    var tot=l.xp!=null?(l.xp|0):(l.lines||[]).reduce(function(a,x){ return a+(x[2]?0:(x[1]|0)); },0);
    return '<details class="trep"'+(S.repOpen!==false?' open':'')+'><summary>Last fight'+(l.channel?' in '+esc(l.channel)+'’s stream':'')+'<b>+'+tot+' XP</b></summary>'
      +'<div class="trs"><span>Alive <b>'+ms(l.alive_s|0)+'</b></span><span>Damage <b>'+(l.damage|0)+'</b></span>'+(l.ko?'<span class="ko">KO’d the player!</span>':'')+'</div><ul>'+lines+'</ul></details>'; }
  function liveList(){ var me=String(channel()||'').toLowerCase(), l=(S.live||[]).filter(function(r){ return r.twitch&&r.twitch.toLowerCase()!==me; }).slice(0,4);
    if(!l.length) return ''; return '<div class="tlive"><h4>Your other creatures can fight here</h4>'+l.map(function(r){ return '<a href="/live/'+encodeURIComponent(r.twitch)+'"><span class="dotl"></span><b>'+esc(r.twitch)+'</b><small>'+(r.spawns_hour|0)+' spawns this hour</small></a>'; }).join('')+'</div>'; }
  function getLive(){ if(!api||Date.now()-S.liveAt<60000) return; S.liveAt=Date.now(); api.live().then(function(l){ S.live=Array.isArray(l)?l:[]; drawCol(); },function(){}); }
  function smallCard(m){ var cls='mc tcard k-enemy '+(m.egg?'t-egg':'t-'+esc(m.danger||'normal'))+(S.pick===m.id?' sel':'')+(lockOf(m)?' cool':'')+(S.landed===m.id?' landed':'');
    var inner=m.egg?'<span class="nin">Egg</span><span class="ew">'+egg(m.hue,3,'wob')+'</span>':'<span class="nin">'+esc(X.fitName(m.name))+'</span>'+img(m,96,'cspr');
    var chip=m.status==='out'?'<span class="tchip out">Fighting</span>':m.status==='resting'?'<span class="tchip rest" data-left="'+m.id+'" data-pre="">'+hm(left(m))+'</span>':'';
    return '<button type="button" class="'+cls+'" data-id="'+m.id+'" aria-label="'+esc(m.egg?'Egg':m.name)+'">'+inner+chip+(S.pick===m.id?HAND+'<span class="thint">drag me</span>':'')+'</button>'; }
  function forms(m){ var f=(m.forms_seen||[]).filter(function(x){ return x&&spriteOk(x.sprite); }), h='';
    if(m.egg||(!f.length&&!m.xp_next)) return '';
    f.forEach(function(x){ h+='<span class="tf" title="'+esc(x.name||'')+'"><img alt="" width="36" height="36" src="data:image/png;base64,'+x.sprite+'"></span><i>›</i>'; });
    h+='<span class="tf now">'+img(m,36)+'</span>'; if(m.xp_next) h+='<i>›</i><span class="tf q">?</span>';
    return '<div class="tforms" aria-label="Its forms so far"><em>Forms</em>'+h+'</div>'; }
  function pinHtml(m){ var on=m.slot!=null, lock=lockOf(m), where=chan();
    var art='<div class="tart'+(m.status==='resting'?' dozing':'')+'"><span class="tglow"></span>'+(m.egg?egg(m.hue,5,'wob'):img(m,120,'alive'))+'</div>';
    var state=m.status==='out'?(m.egg?'It’s in '+esc(m.out_where||where)+'’s dungeon. It hatches about 10 seconds after it lands, or sooner if the streamer hits it.':'Fighting in '+esc(m.out_where||where)+'’s stream right now.')
      :m.status==='resting'?'Resting. It can fight or swap again in <b data-left="'+m.id+'" data-pre="">'+hm(left(m))+'</b>.'
      :m.egg?'Nobody knows what’s inside. '+(on?'Send it into a stream and it hatches there, live.':'Put it on your team, then send it into a stream to hatch it.')
      :on?(m.evolve_ready?'It’s ready to evolve. Send it in and it changes on stream!':'Ready to fight. Press <b>Send to dungeon!</b> above it.'):'Ready. Add it to your team to send it into a stream.';
    var acts=on?(lock?'':'<button type="button" class="tbtn ghost sm" data-act="off">Take off team</button>')
      :'<button type="button" class="tbtn" data-act="add">Add to team</button><span class="tdragtip">'+(phone()?'or hold and drag it up':'or drag its card onto your team')+'</span>';
    return '<div class="tpin '+tcls(m)+(on?' onteam':'')+'"><div class="tptop">'+art+'<div class="tpi"><span class="twhere'+(on?' on':'')+'">'+(on?'On your team':'In your collection')+'</span><span class="tname">'+(m.egg?'Mystery egg':esc(m.name))+'</span>'
      +'<span class="trowi">'+tierTag(m)+(m.egg?'':'<span class="tform">Form '+((m.form|0)||1)+'</span>')+'</span>'+xpBlock(m)+(m.egg?'':'<div class="tstats"><span>Streams <b>'+(m.sends|0)+'</b></span><span>KOs <b>'+(m.kos|0)+'</b></span></div>')+'</div></div>'
      +forms(m)+'<p class="tmuted">'+state+'</p>'+(acts?'<div class="tacts">'+acts+'</div>':'')+report(m)+(m.status==='resting'?liveList():'')
      +'<button type="button" class="tx" data-act="close" aria-label="Close">×</button></div>'; }
  function spotHint(){ var any=S.members.some(function(m){ return m.slot==null; });
    return '<div class="tpin t-none"><div class="tpi"><span class="twhere on">Empty spot</span><span class="tname">Who goes here?</span><p class="tmuted">'
      +(any?(phone()?'Tap a creature below, then <b>Add to team</b>. Or hold one and drag it up.':'Click a creature below, then <b>Add to team</b>. Or just drag its card onto the spot.'):'Everyone you have is already on your team. Make a new egg to fill this spot.')
      +'</p>'+(any?'':'<div class="tacts"><button type="button" class="tbtn sm" data-act="make">Make an egg</button></div>')+'</div><button type="button" class="tx" data-act="close" aria-label="Close">×</button></div>'; }
  function drawCol(){ if(!S.on) return; mount();
    var list=S.members.filter(function(m){ return m.slot==null; }).sort(function(a,b){ return b.id-a.id; });
    colEl.querySelector('.tcount').textContent=list.length?list.length+' waiting':'';
    var g=list.map(smallCard).join(''), gs=sig(g), grid=colEl.querySelector('#tgrid'); if(grid._h!==gs&&!drag){ grid._h=gs; grid.innerHTML=g; }
    colEl.querySelector('#tcolnote').textContent=list.length?(phone()?'Tap one to look. Hold and drag it onto your team.':'Click one to look. Drag it onto your team to swap it in.')
      :S.members.length?'Everyone is on your team. Make another egg in the Make tab.':'Nothing here yet. Make something in the Make tab and it comes out as an egg.';
    var m=S.pick!=null&&M(S.pick), pv=colEl.querySelector('#tprev'), ph=m?pinHtml(m):S.spot!=null&&!onPad(S.spot)?spotHint():'';
    var ps=sig(ph); if(pv._h!==ps){ var op=pv.querySelector('details'); if(op) S.repOpen=op.open; pv._h=ps; if(ph) colEl.querySelector('#tprevin').innerHTML=ph; } pv.classList.toggle('open',!!ph);
    if(m&&m.status==='resting') getLive(); }
  function draw(){ if(!S.on) return; drawTeam(); drawCol(); }

  /* ---------------------------------------------------------------- the 1 s tick: timers count down without redrawing everything */
  setInterval(function(){ if(!S.on||document.hidden) return; var now=Date.now();
    $$('[data-left]').forEach(function(el){ var m=M(+el.getAttribute('data-left')); if(!m) return; var pre=el.getAttribute('data-pre'); el.textContent=(pre==null?'Resting ':pre)+hm(left(m)); });
    $$('[data-out]').forEach(function(el){ var m=M(+el.getAttribute('data-out')); if(!m||m.egg) return; var pre=el.getAttribute('data-pre'); el.textContent=(pre==null?'Fighting ':pre)+ms((now-(S.outSince[m.id]||now))/1000); });
    if(S.members.some(function(m){ return m.status==='resting'&&left(m)===0; })) soon(1500); },1000);

  /* ---------------------------------------------------------------- clicks (the camp, and the Collection wherever it sits) */
  function showInfo(){ if(!phone()&&sideNow()!=='collection'&&!tabCol.hidden) X.sideTab('collection',true); }
  function onClick(e){ if(justDragged) return; var a=e.target.closest('[data-act]');
    if(a){ var act=a.getAttribute('data-act');
      if(act==='send') send(+a.getAttribute('data-id'),a);
      else if(act==='cancel') stopPlacing();
      else if(act==='keep') nameDone(false); else if(act==='rename') nameDone(true);
      else if(act==='close'){ S.pick=null; S.spot=null; draw(); }
      else if(act==='add') addToTeam(S.pick);
      else if(act==='off') bench(S.pick);
      else if(act==='make') X.pTab('make');
      return; }
    var c=e.target.closest('.tcard');
    if(c){ var id=+c.getAttribute('data-id'); if(S.placing!=null) stopPlacing(); S.pick=S.pick===id?null:id; draw(); return; }
    var p=e.target.closest('.tspot');
    if(p){ var k=+p.getAttribute('data-k'), m=onPad(k);
      if(S.placing!=null&&!drag){ tryDrop(k); return; }
      if(m){ S.pick=m.id; S.spot=null; } else { S.spot=k; var cur=S.pick!=null&&M(S.pick); if(cur&&cur.slot!=null) S.pick=null; }
      showInfo(); draw(); return; }
    if(e.target.closest('.tcamp')&&!e.target.closest('.trv')){ var pk=S.pick!=null&&M(S.pick); if(pk&&pk.slot!=null) S.pick=null; S.spot=null; if(S.placing!=null) stopPlacing(); draw(); } }
  pane.addEventListener('click',onClick); colv.addEventListener('click',onClick);
  pane.addEventListener('keydown',function(e){ var p=e.target.closest&&e.target.closest('.tspot'); if(p&&e.target===p&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); p.click(); } });
  pane.addEventListener('submit',function(e){ e.preventDefault(); nameDone(true); });

  function send(id,btn){ var m=M(id); if(!m) return;
    if(!DEMO&&!account()){ X.needAccount(function(){ send(id); }); return; }
    if(btn) btn.disabled=true;
    (api?api.send(id):demo.send(id)).then(function(j){ if(j&&j.state&&j.state.members){ stateIn(j.state); m=M(id)||m; } m.status='out'; S.outSince[id]=Date.now(); lastCamp=''; draw();
      toast(m.egg?'Your egg drops into '+chanS()+' dungeon. Watch it hatch!':m.evolve_ready?nameOf(m)+' jumps in. Watch it evolve on stream!':nameOf(m)+' jumps into '+chanS()+' dungeon!'); soon(1500); })
    .catch(function(e){ if(btn) btn.disabled=false; toast(errText(e),true); soon(300); }); }

  /* ---------------------------------------------------------------- joining the team: drag a card onto a spot, or Add to team.
     Add to team goes straight in when there's an empty spot; with a full team you pick who it swaps with. */
  function goTeam(){ var ph=phone(); if(ph&&sideNow()!=='rewards') X.sideTab('rewards'); if(ptNow()!=='team') X.pTab('team');
    if(campEl&&!ph){ var r=campEl.getBoundingClientRect(); if(r.top<0||r.bottom>innerHeight) campEl.scrollIntoView({block:'nearest',behavior:still?'auto':'smooth'}); } }
  function busyWhy(m,join){ return m.status==='out'?nameOf(m)+' is fighting. '+(join?'It can join when it’s back.':'Wait until it’s back to swap it.'):nameOf(m)+' is resting. '+(join?'It can join in ':'You can swap it in ')+hm(left(m))+'.'; }
  function addToTeam(id){ var m=M(id); if(!m||m.slot!=null) return;
    if(lockOf(m)){ toast(busyWhy(m,true),true); return; }
    var k=-1; if(S.spot!=null&&!onPad(S.spot)) k=S.spot; else for(var i=0;i<S.slots;i++) if(!onPad(i)){ k=i; break; }
    if(k>=0){ S.placing=id; goTeam(); tryDrop(k); return; }
    startPlacing(id,false); }
  function bench(id){ var m=M(id); if(!m||m.slot==null) return;
    if(lockOf(m)){ toast(busyWhy(m,false),true); return; }
    var was=m.slot; m.slot=null; S.landed=id; setTimeout(function(){ S.landed=null; },900); lastCamp=''; draw(); toast(nameOf(m)+' went back to your Collection.');
    (api?api.set(id,null):demo.set(id,null)).then(function(j){ if(j&&j.members) stateIn(j); else soon(200); })
    .catch(function(e){ m.slot=was; lastCamp=''; draw(); toast(errText(e),true); soon(200); }); }
  function markPads(){ var src=M(S.placing), busy=lockOf(src);
    $$('.tspot',campEl).forEach(function(p){ var m=onPad(+p.getAttribute('data-k'));
      p.classList.remove('can-add','can-swap','no');
      if(busy||lockOf(m)) p.classList.add('no'); else p.classList.add(m?'can-swap':'can-add'); }); }
  function startPlacing(id,dragging){ var m=M(id); if(!m) return;
    if(m.slot!=null){ toast(nameOf(m)+' is already on your team.'); return false; }
    S.placing=id; document.documentElement.classList.add('tplacing'); goTeam(); drawTeam(); markPads();
    if(lockOf(m)) toast(busyWhy(m,true),true);
    else if(!dragging) toast(phone()?'Your team is full. Tap who it should swap with.':'Your team is full. Click who it should swap with.');
    return true; }
  function stopPlacing(){ S.placing=null; document.documentElement.classList.remove('tplacing'); $$('.tspot.hot').forEach(function(p){ p.classList.remove('hot'); }); }
  function shake(el){ if(!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
  function tryDrop(k){ var id=S.placing, src=M(id), old=onPad(k), pad=campEl&&campEl.querySelector('.tspot[data-k="'+k+'"]');
    if(!src) { stopPlacing(); return false; }
    if(lockOf(src)){ shake(pad); toast(busyWhy(src,true),true); return false; }
    if(lockOf(old)){ shake(pad); toast(busyWhy(old,false),true); return false; }
    /* looks done at once; the database has the last word */
    var who=pad&&pad.querySelector('.who'); if(who) who.classList.add('leave');
    var was=src.slot; if(old) old.slot=null; src.slot=k; S.pick=id; S.spot=null; stopPlacing();
    setTimeout(function(){ lastCamp=''; draw(); var w=campEl.querySelector('.tspot[data-k="'+k+'"] .who')||campEl.querySelector('.tspot[data-k="'+k+'"]'); if(w){ w.classList.add('arrive'); } },who?240:0);
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
    var hit=document.elementFromPoint(x,y), p=hit&&hit.closest&&hit.closest('#tcamp .tspot');
    if(p!==drag.hot){ if(drag.hot) drag.hot.classList.remove('hot'); drag.hot=p; if(p) p.classList.add('hot'); }
    drag.g.classList.toggle('over',!!(p&&!p.classList.contains('no')));
    /* near the edge of the list (phones) or the screen: scroll, so a camp that's out of view can be reached */
    var sv=pane.closest('.sview'), box=sv&&sv.scrollHeight>sv.clientHeight+4?sv.getBoundingClientRect():{top:0,bottom:innerHeight}, ed=56, dy=y<box.top+ed?-12:y>box.bottom-ed?12:0;
    if(dy){ if(sv&&box.top) sv.scrollTop+=dy; else scrollBy(0,dy); } }
  function endDrag(){ var d=drag; drag=null; justDragged=true; setTimeout(function(){ justDragged=false; },60);
    var ok=d.hot?tryDrop(+d.hot.getAttribute('data-k')):false;
    if(ok){ d.g.remove(); d.el.classList.remove('lifted'); return; }
    stopPlacing();
    requestAnimationFrame(function(){ var r=d.el.isConnected&&d.el.offsetParent?d.el.getBoundingClientRect():d.home; d.g.classList.add('back'); d.g.classList.remove('over'); d.g.style.transform='translate('+r.left+'px,'+r.top+'px)'; });
    setTimeout(function(){ d.g.remove(); d.el.classList.remove('lifted'); colEl.querySelector('#tgrid')._h=''; drawCol(); },320); }
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
  function hatchClose(){ var o=$('trv'); if(o){ o.hidden=true; o.innerHTML=''; } pane.classList.remove('rvon'); S.revealing=null; lastCamp=''; draw(); }

  /* ---------------------------------------------------------------- evolving: shown on the site while the stream shows it */
  function evolved(m,from){ S.played[m.id]=1; var k=m.slot, w=k!=null&&campEl&&campEl.querySelector('.tspot[data-k="'+k+'"] .who');
    if(w){ w.classList.add('evolving'); setTimeout(function(){ w.classList.remove('evolving'); w.classList.add('arrive'); },1300); }
    toast(nameOf(m)+' evolved! Form '+(m.form|0)+(m.danger?', now '+cap(m.danger):'')+'.'); if(ptNow()!=='team') tabDot(true); }

  /* ---------------------------------------------------------------- a small toast of its own (bottom of the screen) */
  var tEl=document.createElement('div'), tT=0; tEl.className='ttoast'; tEl.setAttribute('role','status'); tEl.setAttribute('aria-live','polite'); document.body.appendChild(tEl);
  function toast(t,bad){ tEl.textContent=t; tEl.classList.toggle('bad',!!bad); tEl.classList.add('on'); clearTimeout(tT); tT=setTimeout(function(){ tEl.classList.remove('on'); },3200); }

  var paneW=0; function resized(){ if(drag||!S.on||pane.hidden) return; var w=pane.clientWidth+'/'+innerHeight+'/'+(phone()?1:0); if(w===paneW) return; paneW=w; lastCamp=''; draw(); }
  if(window.ResizeObserver) new ResizeObserver(resized).observe(pane);
  window.addEventListener('resize',function(){ setTimeout(resized,120); });

  /* ---------------------------------------------------------------- start */
  var demo=null;
  window.CDTEAM={S:S,draw:draw,stateIn:stateIn,poll:poll,api:api,setDemo:function(d){ demo=d; }};
  if(DEMO){ var s=document.createElement('script'); s.src=BASE+'team-demo.js?v='+VER+'.2'; s.onload=function(){ if(window.CDTEAM_DEMO){ demo=window.CDTEAM_DEMO(stateIn,X); } }; document.head.appendChild(s); }
  else { var wait=function(){ if(me()) poll(); else setTimeout(wait,1500); }; setTimeout(wait,800); }
})();
