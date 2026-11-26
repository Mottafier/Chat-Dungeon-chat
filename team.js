/* Chat Dungeon: the Pets tab (the team strip: a store tab, replaces Deck) and the Collection (side tab beside Chat on a PC; under the strip on a phone).
   Also here (2026-11-26): the free egg present, the "learning something new" picks, and the tabs that unlock one at a time.
   Loaded by the streamer page (404.html), which hands over its helpers as window.CDX. Nothing shows until the
   database says team mode is on (team_state.on), or the page is opened with ?team=demo (pretend data, no calls).
   Database: team_state, team_set, team_send, team_name, claim_card (clears an egg's make), live_dungeons,
   free_egg_claim, pick_choose, pick_skip, unlock_seen. */
(function(){
  'use strict';
  var SRC=document.currentScript&&document.currentScript.src||'/team.js';
  var X=window.CDX; if(!X){ document.addEventListener('cdx',function go(){ document.removeEventListener('cdx',go); var sc=document.createElement('script'); sc.src=SRC; document.head.appendChild(sc); }); return; }
  if(window.CDTEAM) return;
  var DEMO=/[?&]team=demo\b/.test(location.search);
  /* what the tab is called. It may change again: this is the only place the word lives (plus the tab's own label in 404.html). */
  var PETS='Pets';
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
         free:null, fails:0, shownNew:{}, seenForm:{}, seenEgg:{}, played:{}, titleMax:16, outSince:{}, helping:{}, noSide:false, revealing:null, live:null, liveAt:0, busy:false, dead:0};
  function M(id){ return S.byId[id]||null; }
  function onPad(k){ for(var i=0;i<S.members.length;i++) if(S.members[i].slot===k) return S.members[i]; return null; }
  function teamCount(){ return S.members.filter(function(m){ return m.slot!=null; }).length; }
  function cap(s){ s=String(s||''); return s.charAt(0).toUpperCase()+s.slice(1); }
  /* what players read for a danger tier: the top one is stored as 'god' and shown as Legendary */
  function tierName(d){ d=String(d||'normal').toLowerCase(); return d==='god'?'Legendary':cap(d); }
  function nameOf(m){ return m.egg?'Your egg':(m.name||'It'); }
  /* egg creatures carry a level (1-99): shown as "Lv 12 Name" */
  function lvl(m){ return !m.egg&&m.level?'Lv '+(m.level|0)+' ':''; }
  /* a fed creature carries its bean until its next change: a small badge; hover (or tap) shows the bean and its line */
  function beanLine(look){ var B=window.CDBAG; return B&&B.line?B.line(look):''; }
  function bean(m,big){ if(!m||m.egg||!m.fed||!m.fed.look) return ''; var lk=esc(m.fed.look);
    return '<span class="tbean'+(big?' big':'')+'" tabindex="0" aria-label="It ate a bean"><canvas width="40" height="40" data-blook="'+lk+'"></canvas>'
      +'<span class="tbtip" role="tooltip"><canvas width="40" height="40" data-blook="'+lk+'"></canvas><em>'+esc(beanLine(m.fed.look))+'</em><small>Its next change will be shaped by this bean.</small></span></span>'; }
  function paintBeans(){ var B=window.CDBAG; if(!B||!B.paint) return; $$('canvas[data-blook]').forEach(function(cv){ B.paint(cv,cv.getAttribute('data-blook'),0); }); }
  function hm(s){ s=Math.max(0,s|0); var h=Math.floor(s/3600), m=Math.floor(s%3600/60); return h?h+'h '+(m<10?'0':'')+m+'m':m?m+'m':Math.max(1,s)+'s'; }
  function ms(s){ s=Math.max(0,s|0); return Math.floor(s/60)+':'+(s%60<10?'0':'')+s%60; }
  function chan(){ return channel()||'the'; }
  function chanS(){ var c=channel(); return c?c+'’s':'this'; }
  function spriteOk(s){ return typeof s==='string'&&s.length<60000&&/^[A-Za-z0-9+\/]+=*$/.test(s); }
  function img(m,n,cls){ return spriteOk(m.sprite)?'<img class="tspr'+(cls?' '+cls:'')+'" alt="" width="'+n+'" height="'+n+'" src="data:image/png;base64,'+m.sprite+'">':'<span class="tspr nospr'+(cls?' '+cls:'')+'" style="width:'+n+'px;height:'+n+'px">'+X.pix('enemy',n)+'</span>'; }
  /* creature HP (2026-11-25): a small pixel heart with the creature's max health; a sleeping picture when the server has one */
  var HEART='<svg class="thrt" viewBox="0 0 7 6" width="14" height="12" shape-rendering="crispEdges" aria-hidden="true"><path fill="#000" d="M1 0h2v1H1zM4 0h2v1H4zM0 1h7v2H0zM1 3h5v1H1zM2 4h3v1H2zM3 5h1v1H3z"/><path fill="#ff3b4e" d="M1 1h2v1H1zM4 1h2v1H4zM1 2h5v1H1zM2 3h3v1H2zM3 4h1v1H3z"/></svg>';
  function hpTag(m,cls){ return !m.egg&&(m.hp_max|0)>0?'<span class="'+cls+'">'+HEART+'<b>'+(m.hp_max|0)+'</b></span>':''; }
  function dozy(m,n,cls,fallback){ return spriteOk(m.sleep)?'<img class="tspr dozy'+(cls?' '+cls:'')+'" alt="" width="'+n+'" height="'+n+'" src="data:image/png;base64,'+m.sleep+'">':img(m,n,fallback); }
  /* how long a rest is depends on the creature's tier now: each one carries its own length (rest_total) */
  function restPct(m){ return Math.max(0,Math.min(100,100*(1-left(m)/Math.max(1,(m.rest_total|0)||S.cooldown)))); }
  function restBar(m,cls){ return '<span class="trest'+(cls?' '+cls:'')+'"><b data-fill="'+m.id+'" style="width:'+restPct(m).toFixed(1)+'%"></b><i data-left="'+m.id+'" data-pre="">'+hm(left(m))+'</i></span>'; }
  function left(m){ return Math.max(0,Math.round(((m.until||0)-Date.now())/1000)); }

  /* a pixel egg, coloured by the egg's hue (the hue says nothing about what's inside) */
  var eggMemo={};
  function egg(hue,scale,cls,res){ hue=(hue|0)%360; res=res||1; var key=hue+'/'+scale+'/'+res; if(!eggMemo[key]){ var W=16*res,H=20*res,g=[],x,y;
      for(y=0;y<H;y++){ g.push([]); for(x=0;x<W;x++){ var ux=(x+.5)/res, uy=(y+.5)/res, dx=(ux-8)/7.2, dy=(uy-11.2)/(uy<11.2?10.4:8.6), ch=(dx*dx+dy*dy<=1)?'a':'.';
          if(ch==='a'){ if(dx>.35&&dy>-.1||dy>.62) ch='b'; if(dx<-.25&&dx>-.6&&dy<-.25&&dy>-.6) ch='h';
            [[5,6],[10,9],[6,13],[11,15],[9,4],[4,10]].forEach(function(p){ if(Math.abs(ux-.5-p[0])+Math.abs(uy-.5-p[1])<=1.01&&ch!=='h') ch='s'; }); }
          g[y].push(ch); } }
      var pal={a:'hsl('+hue+',62%,76%)',b:'hsl('+hue+',48%,58%)',h:'#fffbe8',s:'hsl('+hue+',46%,36%)',o:'#0b0706'}, out=g.map(function(r){ return r.slice(); }), r='';
      for(y=0;y<H;y++) for(x=0;x<W;x++) if(g[y][x]==='.'&&((g[y-1]&&g[y-1][x]!=='.')||(g[y+1]&&g[y+1][x]!=='.')||(g[y][x-1]&&g[y][x-1]!=='.')||(g[y][x+1]&&g[y][x+1]!=='.'))) out[y][x]='o';
      for(y=0;y<H;y++){ x=0; while(x<W){ var c=out[y][x]; if(c==='.'){ x++; continue; } var x0=x; while(x<W&&out[y][x]===c) x++; r+='<rect x="'+x0+'" y="'+y+'" width="'+(x-x0)+'" height="1" fill="'+pal[c]+'"/>'; } }
      eggMemo[key]='<svg width="'+W*scale+'" height="'+H*scale+'" viewBox="0 0 '+W+' '+H+'" shape-rendering="crispEdges" aria-hidden="true">'+r+'</svg>'; }
    return cls?eggMemo[key].replace('<svg ','<svg class="'+cls+'" '):eggMemo[key]; }
  var HAND=(function(){ var g=['....kk......','...kwwk.....','...kwwk.....','...kwwkkk...','...kwwkwwkk.','.kkkwwkwwkwk','kwwkwwwwwkwk','kwwwwwwwwwwk','.kwwwwwwwwwk','.kwwwwwwwwk.','..kwwwwwwwk.','..kwwwwwwk..','...kkkkkkk..'], r='';
    g.forEach(function(row,y){ row.split('').forEach(function(c,x){ if(c!=='.') r+='<rect x="'+x+'" y="'+y+'" width="1" height="1" fill="'+(c==='k'?'#0b0706':'#fff3dc')+'"/>'; }); });
    return '<svg class="thand" viewBox="0 0 12 13" shape-rendering="crispEdges" aria-hidden="true">'+r+'</svg>'; })();

  function pxIcon(g,pal,cls){ var r=''; g.forEach(function(row,y){ row.split('').forEach(function(c,x){ if(c!=='.') r+='<rect x="'+x+'" y="'+y+'" width="1" height="1" fill="'+pal[c]+'"/>'; }); });
    return '<svg class="tico '+cls+'" viewBox="0 0 '+g[0].length+' '+g.length+'" shape-rendering="crispEdges" aria-hidden="true">'+r+'</svg>'; }
  var SWORD=pxIcon(['........kkk','.......kwwk','......kwwsk','.....kwwsk.','.k..kwwsk..','kgkkwwsk...','.kggwsk....','..kggk.....','.kbkggk....','kbbk.kgk...','kbk...k....','.k.........'],{k:'#0b0706',w:'#fff3dc',s:'#c9bfae',g:'#ffc23a',b:'#8a4a1c'},'sw');
  var HEART=pxIcon(['.kkk...kkk.','kwwrk.krrrk','kwrrrkrrrrk','krrrrrrrrrk','krrrrrrrrdk','.krrrrrrdk.','..krrrrdk..','...krrdk...','....krk....','.....k.....'],{k:'#0b0706',w:'#fff3dc',r:'#ff4a5c',d:'#b81d3a'},'ht');

  /* ---------------------------------------------------------------- talking to the database (or the pretend one) */
  var api=DEMO?null:{
    state:function(){ return X.rpc('team_state',X.withTok({q_name:me()})); },
    set:function(id,k){ return X.rpc('team_set',X.withTok({q_name:me(),q_card:id,q_slot:k})); },
    /* side = 'attack' or 'help' (eggs send none: the hatchling picks for itself in the game). A database that doesn't know
       sides yet still takes an attack the old way; a help is never quietly turned into an attack. */
    send:function(id,side){ var old=function(){ return X.rpc('team_send',X.withTok({q_code:room(),q_name:me(),q_card:id})); };
      if(!side||S.noSide) return old();
      return X.rpc('team_send',X.withTok({q_code:room(),q_name:me(),q_card:id,q_side:side})).catch(function(e){
        if(!/Could not find the function|schema cache|PGRST202/i.test(String(e&&e.message||''))) throw e;
        S.noSide=true; if(side==='help') throw new Error('no side'); return old(); }); },
    name:function(id,t){ return X.rpc('team_name',X.withTok({q_name:me(),q_card:id,q_title:t})); },
    clear:function(id){ return X.rpc('claim_card',X.withTok({q_name:me(),q_card:id})); },
    live:function(){ return X.rpc('live_dungeons',{}); },
    grow:function(id){ return X.rpc('test_grow',X.withTok({q_name:me(),q_card:id})); },
    /* the free egg (one per account), a pick (q_replaces = the name of the old move it swaps out, when it's full), a tab seen by time */
    claim:function(t){ return X.rpc('free_egg_claim',X.withTok({q_name:me(),q_text:t})); },
    pick:function(id,i,rep){ return X.rpc('pick_choose',X.withTok({q_name:me(),q_card:id,q_option:i,q_replaces:rep==null?null:rep})); },
    skip:function(id){ return X.rpc('pick_skip',X.withTok({q_name:me(),q_card:id})); },
    seen:function(k){ return X.rpc('unlock_seen',X.withTok({q_name:me(),q_what:k})); }
  };
  var ERR={'busy':'It can’t move while it’s fighting or resting.','bad slot':'That spot doesn’t exist.','no card':'That creature isn’t yours.',
    'room closed':'The stream is offline, so nothing can go in right now.','out':'It’s already in the fight.','resting':'It’s still resting.',
    'not on team':'Put it on your team first, then send it.','too busy':'The stream is very busy. Try again in a moment.','slow down':'Slow down a little, then try again.','team off':'Teams aren’t switched on yet.','not ready':'That egg is still being made.','no account':'Make an account first.','not hatched':'It hasn’t hatched yet.','bad name':'That name isn’t allowed. Try another.','no side':'Helping isn’t switched on yet.','too many helpers':'There are enough helpers in there right now. Try again soon.',
    'not allowed':'Those words aren’t allowed. Try something else.','claimed':'You already opened your free egg.','too many':'Too many free eggs went out on your network today. Try again tomorrow.',
    'full':'It’s full. Pick one to swap out.','bad replace':'It doesn’t have that one any more. Pick again.','bad option':'That one isn’t on offer any more.','no pick':'That pick is gone.'};
  function errText(e){ var m=String(e&&e.message||''); return ERR[m]||(!m||e instanceof TypeError?'Couldn’t reach the server. Try again.':'Server said: '+m.slice(0,100)); }

  function stateIn(j){ if(!j||typeof j!=='object'||!j.members) return false; var now=Date.now(), was=S.on;
    S.known=true; S.on=!!j.on; S.slots=(j.slots|0)||5; S.cooldown=(j.cooldown|0)||14400; S.got=now;
    var by={}, events=[]; eggsIn(j); if(j.seed_max) WORD_MAX=Math.max(1,j.seed_max|0);
    S.members=j.members.map(function(m){ m.id=+m.id; m.slot=m.slot==null?null:+m.slot; m.egg=!!m.egg; m.until=now+(m.left|0)*1000;
      if(m.status==='out'){ if(!S.outSince[m.id]) S.outSince[m.id]=now; } else { delete S.outSince[m.id]; delete S.helping[m.id]; }
      var f=S.seenForm[m.id];
      if(!m.egg&&((f!=null&&(m.form|0)>f)||(f==null&&m.evolved_ago!=null&&m.evolved_ago<12&&!S.played[m.id]))) events.push(['evolve',m,f]);
      if(!m.egg&&S.seenEgg[m.id]&&!m.fresh) events.push(['hatched',m]);
      if(!m.egg) S.seenForm[m.id]=m.form|0; S.seenEgg[m.id]=m.egg;
      by[m.id]=m; return m; });
    S.byId=by; giftMember(); S.making=j.making||null; if(j.title_max) S.titleMax=j.title_max|0; S.free=j.free_egg||null;
    if(S.pick!=null&&!by[S.pick]) S.pick=null;
    if(S.on!==was) modeChanged();
    uSync(j);
    draw(); events.forEach(function(e){ if(e[0]==='evolve') evolved(e[1],e[2]); });
    var fresh=S.members.filter(function(m){ return m.fresh&&!m.egg&&!S.shownNew[m.id]; })[0];
    if(fresh&&S.revealing!==fresh.id){ S.shownNew[fresh.id]=1; hatchShow(fresh); }
    giftSync(); pickSync();
    return true; }

  /* an egg whose first form is still being designed is listed under `making`, not with the members: it stands on its
     spot all the same (a wobbling egg that can't be sent yet) */
  function eggsIn(j){ var mk=Array.isArray(j.making)?j.making:j.making&&typeof j.making==='object'?[j.making]:[];
    mk.forEach(function(e){ if(!e||!e.egg||e.ready||e.id==null) return; var m=j.members.filter(function(x){ return +x.id===+e.id; })[0];
      if(m) m.making=true; else j.members.push({id:e.id,slot:e.slot==null?null:e.slot,egg:true,hue:e.hue|0,status:'home',making:true}); }); }
  var pollT=0;
  function poll(){ clearTimeout(pollT);
    if(!api){ pollT=setTimeout(poll,5000); return; }
    if(document.hidden||!me()){ pollT=setTimeout(poll,4000); return; }
    S.busy=true;
    api.state().then(function(j){ S.busy=false; S.dead=0; if(!stateIn(j)){ S.known=true; if(S.on){ S.on=false; modeChanged(); } uAll(); } next(); })
    .catch(function(e){ S.busy=false; var m=String(e&&e.message||'');
      if(/Could not find the function|no function|does not exist/i.test(m)){ S.dead++; if(S.on){ S.on=false; modeChanged(); } uAll(); pollT=setTimeout(poll,300000); return; }
      if(++S.fails>=3) uAll();   /* (the server can't be reached: nobody is left staring at a page with no tabs) */
      pollT=setTimeout(poll,20000); }); }
  function next(){ S.fails=0; pollT=setTimeout(poll,!S.on?180000:shown()||S.members.some(function(m){ return m.making; })?5000:30000); }
  function soon(ms){ clearTimeout(pollT); pollT=setTimeout(poll,ms||600); }
  document.addEventListener('visibilitychange',function(){ if(!document.hidden&&S.on) soon(200); });

  /* ---------------------------------------------------------------- turning team mode on and off */
  var tabTeam=document.querySelector('#ptabs [data-pt="team"]'), tabDeck=document.querySelector('#ptabs [data-pt="deck"]'), tabCol=document.querySelector('.stabs [data-side="collection"]');
  var pane=$('pteam'), colv=document.querySelector('.sview[data-view="collection"]');
  if(!tabTeam||!pane||!tabCol||!colv) return;
  (function(){ var ic=tabTeam.querySelector('[data-px]')||tabTeam.querySelector('svg'); var e=document.createElement('span'); e.className='tegg'; e.innerHTML=egg(38,1); if(ic) ic.parentNode.replaceChild(e,ic); else tabTeam.insertBefore(e,tabTeam.firstChild);
    [].forEach.call(tabTeam.childNodes,function(n){ if(n.nodeType===3&&n.nodeValue.trim()) n.nodeValue=PETS; });
    if(!$('tmdot')){ var d=document.createElement('i'); d.className='pdot'; d.id='tmdot'; d.hidden=true; d.textContent='!'; tabTeam.appendChild(d); } })();
  function modeChanged(){ var on=S.on;
    document.documentElement.classList.toggle('cdteam',on);
    tabTeam.hidden=!on; tabCol.hidden=!on||phone(); if(tabDeck) tabDeck.hidden=on; if(!on) uAll();
    if(on){ if(ptNow()==='deck') X.pTab('team'); if(sideNow()==='cards') X.sideTab('collection'); }
    else { if(ptNow()==='team') X.pTab('spawn'); if(sideNow()==='collection') X.sideTab('chat'); }
    if(X.layout) X.layout(); }
  function shown(){ return (!pane.hidden&&!!pane.offsetParent)||(!colv.hidden&&!!colv.offsetParent); }
  X.onTab=function(t){ if(t==='spawn'&&lk('power')&&S.on&&!lk('pets')&&X.cards&&X.cards.ok){ X.pTab('team'); return; }
    ptCur=t; pane.hidden=t!=='team'; if(t==='team'){ tabDot(false); draw(); if(S.on) soon(150); giftAsk(); pickSync(); } else clearDot(document.querySelector('#ptabs [data-pt="'+t+'"]')); };
  X.onSide=function(t){ sideCur=t; clearDot(document.querySelector('.stabs [data-side="'+t+'"]'));
    if(t==='collection'){ drawCol(); if(S.on) soon(150); } else if(S.placing!=null&&!drag&&!phone()&&t!=='rewards') stopPlacing();
    if(t==='rewards'&&lk('power')&&S.on&&ptNow()!=='team') X.pTab('team'); if(t==='rewards') setTimeout(function(){ giftAsk(); pickSync(); },50); };
  X.teamOn=function(){ return S.on; };

  /* ---------------------------------------------------------------- an egg that was ordered before the Make tab went away: it lands by itself */
  X.eggReady=function(mk){ var id=+mk.id, k=mk.slot==null?null:+mk.slot, here=!!M(id);
    var go=function(j){ if(j&&X.cardsIn) X.cardsIn(j); soon(100); };
    (api?api.clear(id):demo.clear(id)).then(go,function(){ soon(100); });
    if(here) return;   /* (it's already standing on its spot: the free egg) */
    if(k!=null){ S.pick=id; S.spot=null; X.pTab('team'); toast('Your egg is on your team. Send it into a stream to hatch it!'); }
    else { S.pick=id; if(phone()) X.pTab('team'); else if(colOpen()) X.sideTab('collection',true); toast('Your team is full, so your egg went to your Collection.'); }
    S.landed=id; setTimeout(function(){ S.landed=null; },2500); draw(); };

  /* ---------------------------------------------------------------- the team strip: five plain columns, one fun colour per creature
     (a creature's 48px sprite is always shown at exactly 2x, so every pixel on it is the same size). */

  /* ---------------------------------------------------------------- drawing the Team tab */
  var TIER={harmless:1,weak:1,normal:1,tough:1,deadly:1,god:1};
  function tcls(m){ return m.egg?'t-egg':'t-'+(TIER[m.danger]?m.danger:'normal'); }
  function helping(m){ return !m.egg&&(m.side?m.side==='help':!!S.helping[m.id]); }
  function outWord(m){ return helping(m)?'Helping':'Fighting'; }
  function lockOf(m){ return m&&(m.status==='out'||m.status==='resting'||!!m.gift); }
  function stLine(m){ if(!m) return '<span class="tst none">Add someone</span>';
    if(m.status==='out') return m.egg?'<span class="tst out">Hatching…</span>':'<span class="tst out">'+outWord(m)+' <b data-out="'+m.id+'" data-pre="">'+ms((Date.now()-(S.outSince[m.id]||Date.now()))/1000)+'</b></span>';
    if(m.status==='resting') return '<span class="tst rest">Resting <b data-left="'+m.id+'" data-pre="">'+hm(left(m))+'</b></span>';
    if(m.egg) return '<span class="tst egg">Ready to hatch</span>';
    if(m.changing) return '<span class="tst evo">Changing…</span>';
    if(m.evolve_ready) return '<span class="tst evo">Ready to evolve!</span>';
    return '<span class="tst ok">Ready</span>'; }
  function xpPct(m){ var a=m.xp_from|0, b=m.xp_next; if(!b) return 100; return Math.max(0,Math.min(100,100*((m.xp|0)-a)/Math.max(1,b-a))); }
  /* the big button that appears over the one you picked */
  function sendTop(m){ if(m.status==='out'||m.status==='resting') return '';
    if(m.making) return '<span class="tsend gray">Almost ready…</span>';
    if(!roomOpen()) return '<span class="tsend gray">Stream is offline</span>';
    if(!m.egg&&!S.noSide) return '<span class="tsend duo'+(m.evolve_ready?' evo':'')+'">'
      +'<button type="button" class="tside atk" data-act="send" data-side="attack" data-id="'+m.id+'">'+SWORD+'Attack</button>'
      +'<button type="button" class="tside help" data-act="send" data-side="help" data-id="'+m.id+'">'+HEART+'Help</button></span>';
    var what=m.egg?'Send to hatch!':m.evolve_ready?'Send to evolve!':'Send to dungeon!';
    return '<button type="button" class="tsend'+(m.evolve_ready&&!m.egg?' evo':'')+'" data-act="send" data-id="'+m.id+'">'+what+'</button>'; }
  /* every creature gets its own fun panel colour, picked from a fixed set by its id so it never changes */
  var FUN=['#5fd04a','#3fa7ff','#ff8a1c','#ff5fa8','#2fd0c0','#f2c531','#ff4a4a','#a56bff'];
  function funCol(m){ var t=String(m.id), h=2166136261, i; for(i=0;i<t.length;i++){ h^=t.charCodeAt(i); h=Math.imul(h,16777619); } h^=h>>>13; h=Math.imul(h,0x5bd1e995); h^=h>>>15; return (h>>>0)%FUN.length; }
  /* two team mates never share a colour: a later spot steps on to the next free one */
  function teamCol(k){ var used={}, j, m, c; for(j=0;j<=k;j++){ m=onPad(j); if(!m) continue; c=funCol(m); while(used[c]) c=(c+1)%FUN.length; used[c]=1; } return FUN[c]; }
  function spotHtml(k,pos){ var m=onPad(k), cls=['tspot'], body='', lk='', tag='', top='', name='', sel=m?S.pick===m.id:S.spot===k, cs=camp.cs;
    if(!m){ cls.push('empty'); body='<span class="tplus" aria-hidden="true"><i>+</i></span>'; name='<span class="tnm top dim">Empty spot</span>'; }
    else { cls.push(tcls(m)); var nm=m.egg?'Egg':esc(lvl(m)+(camp.sw<170?X.fitName(m.name):m.name)), r=m.status==='resting', out=m.status==='out';
      var xpr=m.egg?'':'<span class="txr"><i>XP</i><span class="txp'+(m.xp_next?'':' max')+(m.evolve_ready?' full':'')+'"><b style="width:'+Math.round(xpPct(m))+'%"></b></span></span>';
      /* name above; under the creature its heart and XP, or the rest bar while it sleeps. No status badges: ready shows nothing extra. */
      name='<span class="tnm top">'+nm+'</span>';
      tag=m.changing?'<span class="tst evo">Changing…</span>':r?restBar(m):hpTag(m,'thp')+xpr;
      if(out){ cls.push('locked','isout','gone'); lk=outWord(m); body='<span class="who">'+(m.egg?egg(m.hue,2,'',2):img(m,cs,''))+'</span>'; }
      else if(m.egg){ cls.push(r?'locked':'full'); if(m.gift) cls.push('gift'); if(r) lk='Resting'; body='<span class="tshadow"></span><span class="who">'+egg(m.hue,2,'wob',2)+'</span>'; }
      else { cls.push(r?'locked':'full'); if(r){ cls.push('asleep'); lk='Resting'; } if(m.evolve_ready&&!r) cls.push('evo'); if(m.changing) cls.push('changing');
        body=bean(m)+'<span class="tshadow"></span><span class="who'+(r?'':' look')+'" style="animation-delay:-'+(k*1.3).toFixed(1)+'s">'+(r?dozy(m,cs,'','sleep'):img(m,cs,'alive'))+'</span>'+(r?'<span class="zz">z</span><span class="zz b">z</span>':''); }
      if(m.gift) body+='<button type="button" class="tpkb" data-act="gift" aria-label="Your free egg">!</button>';
      if(pickOf(m)&&!out) body+='<button type="button" class="tpkb" data-act="pick" data-id="'+m.id+'" aria-label="'+esc(m.name)+' is learning something new">!</button>';
      if(sel) top=sendTop(m);
      if(!top&&!m.egg) top='<span class="thov">'+(m.changing?'Changing…':tierName(m.danger)+(m.level?' · Lv '+(m.level|0):' · Form '+((m.form|0)||1)))+'</span>';
      else if(!top) top='<span class="thov">Mystery egg</span>'; }
    if(sel) cls.push('sel'); if(m&&S.landed===m.id) cls.push('landed'); if(m&&S.lift===m.id) cls.push('lifted'); if(m&&fly[m.id]) cls.push('flying'); if(pos.e) cls.push(pos.e);
    return '<div class="'+cls.join(' ')+'" data-k="'+k+'" role="button" tabindex="0" aria-pressed="'+(sel?'true':'false')+'" aria-label="'+(m?esc(m.egg?'Egg':m.name):'Empty spot')+'" style="left:'+pos.x+'%;top:'+pos.y+'px;height:'+pos.h+'px'+(m?';--cc:'+teamCol(k):'')+'">'
      +'<span class="tglow"></span><span class="mark"></span>'+(lk?'<span class="lk">'+lk+'</span>':'')+top+name+body+'<span class="tlbl">'+tag+'</span></div>'; }
  /* what's compared to decide on a redraw: the HTML without its running clocks (the 1 s tick keeps those going) */
  function sig(h){ return h.replace(/(data-(?:out|left)="\d+" data-pre="[^"]*">)[^<]*/g,'$1').replace(/(data-fill="\d+" style=")[^"]*/g,'$1'); }
  var campEl=null, lastCamp='', camp={cs:96,lh:40,two:false,h:216,sw:200};
  function availH(){ var pts=pane.closest('.points'); if(!pts) return 0; var cs=getComputedStyle(pts), used=0, n=0;
    [].forEach.call(pts.children,function(c){ if(c.hidden||getComputedStyle(c).display==='none'||getComputedStyle(c).position==='absolute') return; n++;
      if(c.contains(pane)){ var c2=getComputedStyle(c), n2=0; [].forEach.call(c.children,function(d){ if(d.hidden||getComputedStyle(d).display==='none') return; n2++; if(d!==pane) used+=d.offsetHeight; }); used+=(parseFloat(c2.rowGap)||0)*Math.max(0,n2-1); }
      else used+=c.offsetHeight; });
    used+=(parseFloat(cs.rowGap)||0)*Math.max(0,n-1);
    return pts.clientHeight-(parseFloat(cs.paddingTop)||0)-(parseFloat(cs.paddingBottom)||0)-used; }
  function buildPane(){ if(campEl) return;
    pane.innerHTML='<div class="tstage"><div class="tcamp th-cols" id="tcamp">'
      +'<div class="ttitle"><span class="tt1"></span></div><div class="tspots"></div></div>'
      +'<div class="trv" id="trv" hidden></div><div class="trv tgv" id="tgv" hidden></div><div class="tpk" id="tpk" hidden></div></div><div class="tcolhost" id="tcolhost"></div>';
    campEl=$('tcamp'); }
  function drawTeam(){ if(!S.on) return; buildPane(); mount();
    /* on a PC the store under the stream has a fixed height: the camp fills all of it, one row of five.
       On a phone (and anything narrow) it's two rows, three on a ridge and two in front. */
    var pw=pane.clientWidth||600, fixed=!phone()&&window.matchMedia('(min-width:1000px)').matches&&!!pane.closest('.points'), h, two=false, cs, lh;
    pane.classList.toggle('fixed',fixed);
    if(fixed){ h=Math.max(118,Math.min(320,availH()-2)); cs=h>=150?96:72; lh=cs<80?30:34; }
    else { two=pw<560; cs=96; lh=38; h=two?356:232; }
    if(camp.h!==h||camp.two!==two||camp.cs!==cs){ camp.h=h; camp.two=two; camp.cs=cs; camp.lh=lh; lastCamp='';
      campEl.style.height=h+'px'; campEl.style.setProperty('--cs',cs+'px'); campEl.style.setProperty('--lh',lh+'px');
      campEl.classList.toggle('two',two); campEl.classList.toggle('compact',cs<80); }
    camp.lh=lh;
    var rows=two?[[0,1,2],[3,4]]:[[0,1,2,3,4]], rh=h/rows.length, P=[], cw=campEl.clientWidth||pw, sw=Math.round(cw*(two?.3333:.2));
    campEl.style.setProperty('--sw',sw+'px'); camp.sw=sw;
    rows.forEach(function(row,ri){ row.forEach(function(k,i){ P[k]={x:two?(ri?[25,75]:[17,50,83])[i]:10+i*20,y:Math.round(ri*rh),h:Math.round(rh),e:sw<216?(i===0?'el':i===row.length-1?'er':''):''}; }); });
    campEl.querySelector('.tt1').textContent='Your team  '+teamCount()+' / '+S.slots; var pk=S.pick!=null&&M(S.pick); campEl.classList.toggle('haspick',!!(pk&&pk.slot!=null));
    var html=''; for(var k=0;k<S.slots;k++) html+=spotHtml(k,P[k]||P[P.length-1]);
    var hs=sig(html); if(hs!==lastCamp){ lastCamp=hs; campEl.querySelector('.tspots').innerHTML=html; if(S.placing!=null) markPads(); }
 }

  /* ---------------------------------------------------------------- the Collection: everyone who is not on the team, and
     the full page about whoever is picked (a team member or a card). On a PC it's the side tab beside Chat; on a phone
     it sits right under the camp, so a card can be dragged straight up onto the team. */
  var colEl=document.createElement('div'); colEl.className='tcol';
  colEl.innerHTML='<h3>Collection <small class="tcount"></small></h3><div class="tprev" id="tprev"><div id="tprevin"></div></div><div class="tgrid" id="tgrid"></div><p class="dim tcolnote" id="tcolnote"></p>';
  function mount(){ var ph=phone(), host=ph?$('tcolhost'):colv; if(host&&colEl.parentNode!==host) host.appendChild(colEl);
    tabCol.hidden=!S.on||ph; document.documentElement.classList.toggle('tphone',ph&&S.on); relabel();
    if(ph&&S.on&&sideNow()==='collection'){ X.sideTab('rewards'); X.pTab('team'); } }
  function tierTag(m){ return m.egg?'<span class="ttier t-egg">Egg</span>':'<span class="ttier tt-'+esc(m.danger||'normal')+'">'+tierName(m.danger)+'</span>'; }
  function xpBlock(m){ if(m.egg) return '';
    if(!m.xp_next) return '<div class="txprow"><span>XP</span><div class="txpbar max"><b style="width:calc(100% - 4px)"></b></div></div><div class="txpl"><span>'+(m.xp|0)+'</span><span>Final form</span></div>';
    var pct=xpPct(m);
    if(m.level) return '<div class="txprow"><span>XP</span><div class="txpbar"><b style="width:calc('+pct.toFixed(1)+'% - 4px)"></b></div></div><div class="txpl"><span>'+(m.xp|0)+' / '+m.xp_next+'</span><span>'+(m.xp_next-(m.xp|0))+' to Lv '+((m.level|0)+1)+'</span></div>';
    return '<div class="txprow"><span>XP</span><div class="txpbar'+(m.evolve_ready?' full':'')+'"><b style="width:calc('+pct.toFixed(1)+'% - 4px)"></b></div></div><div class="txpl"><span>'+(m.xp|0)+' / '+m.xp_next+'</span><span>'+(m.evolve_ready?'Evolves on its next send!':(m.xp_next-(m.xp|0))+' to evolve')+'</span></div>'; }
  function report(m){ var l=m.last; if(!l||m.egg) return ''; var lines=(l.lines||[]).map(function(x){ return '<li'+(x[2]?' class="grey"':'')+'><span>'+esc(x[0])+'</span><b>+'+(x[1]|0)+'</b></li>'; }).join('');
    var tot=l.xp!=null?(l.xp|0):(l.lines||[]).reduce(function(a,x){ return a+(x[2]?0:(x[1]|0)); },0);
    return '<details class="trep"'+(S.repOpen!==false?' open':'')+'><summary>Last fight'+(l.channel?' in '+esc(l.channel)+'’s stream':'')+'<b>+'+tot+' XP</b></summary>'
      +'<div class="trs"><span>Alive <b>'+ms(l.alive_s|0)+'</b></span><span>Damage <b>'+(l.damage|0)+'</b></span>'+(l.ko?'<span class="ko">KO’d the player!</span>':'')+'</div><ul>'+lines+'</ul></details>'; }
  function liveList(){ var me=String(channel()||'').toLowerCase(), l=(S.live||[]).filter(function(r){ return r.twitch&&r.twitch.toLowerCase()!==me; }).slice(0,4);
    if(!l.length) return ''; return '<div class="tlive"><h4>Your other creatures can fight here</h4>'+l.map(function(r){ return '<a href="/live/'+encodeURIComponent(r.twitch)+'"><span class="dotl"></span><b>'+esc(r.twitch)+'</b><small>'+(r.spawns_hour|0)+' spawns this hour</small></a>'; }).join('')+'</div>'; }
  function getLive(){ if(!api||Date.now()-S.liveAt<60000) return; S.liveAt=Date.now(); api.live().then(function(l){ S.live=Array.isArray(l)?l:[]; drawCol(); },function(){}); }
  function smallCard(m){ var cls='mc tcard k-enemy '+(m.egg?'t-egg':'t-'+esc(m.danger||'normal'))+(S.pick===m.id?' sel':'')+(lockOf(m)?' cool':'')+(S.landed===m.id?' landed':'')+(fly[m.id]?' flying':'');
    var inner=m.egg?'<span class="nin">Egg</span><span class="ew">'+egg(m.hue,2,'wob',2)+'</span>':'<span class="nin">'+esc(lvl(m)+X.fitName(m.name))+'</span>'+(m.status==='resting'?dozy(m,96,'cspr','cspr'):img(m,96,'cspr'));
    var chip=m.status==='out'?'<span class="tchip out">'+outWord(m)+'</span>':m.status==='resting'?'<span class="tchip rest" data-left="'+m.id+'" data-pre="">'+hm(left(m))+'</span>':'';
    return '<button type="button" class="'+cls+'" data-id="'+m.id+'" aria-label="'+esc(m.egg?'Egg':m.name)+'">'+inner+chip+(S.pick===m.id?HAND+'<span class="thint">drag me</span>':'')+'</button>'; }
  function forms(m){ var f=(m.forms_seen||[]).filter(function(x){ return x&&spriteOk(x.sprite); }), h='';
    if(m.egg||(!f.length&&!m.xp_next)) return '';
    f.forEach(function(x){ h+='<span class="tf" title="'+esc(x.name||'')+'"><img alt="" width="48" height="48" src="data:image/png;base64,'+x.sprite+'"></span><i>›</i>'; });
    h+='<span class="tf now">'+img(m,48)+'</span>'; if(m.xp_next) h+='<i>›</i><span class="tf q">?</span>';
    return '<div class="tforms" aria-label="Its forms so far"><em>Forms</em>'+h+'</div>'; }
  function pinHtml(m){ var on=m.slot!=null, lock=lockOf(m), where=chan();
    var art='<div class="tart'+(m.status==='resting'?' dozing':'')+(m.changing?' changing':'')+'">'+bean(m,true)+'<span class="tglow"></span>'+(m.egg?egg(m.hue,2,'wob',2):m.status==='resting'?dozy(m,96,'','alive'):img(m,96,'alive'))+'</div>';
    var state=m.status==='out'?(m.egg?'It’s in '+esc(m.out_where||where)+'’s dungeon. It hatches about 10 seconds after it lands, or sooner if the streamer hits it.':outWord(m)+' in '+esc(m.out_where||where)+'’s stream right now.')
      :m.status==='resting'?'Sleeping it off. It can fight or swap again when the bar is full.'
      :m.egg?'Nobody knows what’s inside. '+(on?'Send it into a stream and it hatches there, live.':'Put it on your team, then send it into a stream to hatch it.')
      :m.changing?'It ate a bean and is changing… Its new form shows up here in about half a minute.'
      :m.final&&m.level?'Final form: it won\u2019t change again, but it keeps levelling up.'
      :on?(m.evolve_ready?'It’s ready to evolve. Send it in and it changes on stream!':'Ready to go.'):'Ready. Add it to your team to send it into a stream.';
    var grow=m.tester&&!m.egg&&!m.final&&!m.changing&&!lock?'<button type="button" class="tbtn ghost sm" data-act="grow" title="Test accounts only">Grow (test)</button>':'';
    var acts=(pickOf(m)&&m.status!=='out'?'<button type="button" class="tbtn sm tpkgo" data-act="pick">Learning something new!</button>':'')+grow+(on?(lock?'':'<button type="button" class="tbtn ghost sm" data-act="off">Take off team</button>')
      :'<button type="button" class="tbtn" data-act="add">Add to team</button><span class="tdragtip">'+(phone()?'or hold and drag it up':'or drag its card onto your team')+'</span>');
    return '<div class="tpin '+tcls(m)+(on?' onteam':'')+'"><div class="tptop">'+art+'<div class="tpi"><span class="twhere'+(on?' on':'')+'">'+(on?'On your team':'In your collection')+'</span><span class="tname">'+(m.egg?'Mystery egg':esc(lvl(m)+m.name))+'</span>'
      +'<span class="trowi">'+tierTag(m)+(m.egg?'':'<span class="tform">Form '+((m.form|0)||1)+'</span>')+hpTag(m,'thp pin')+'</span>'+(m.status==='resting'&&!m.egg?restBar(m,'big'):'')+xpBlock(m)+(m.egg?'':'<div class="tstats"><span>Streams <b>'+(m.sends|0)+'</b></span><span>KOs <b>'+(m.kos|0)+'</b></span></div>')+'</div></div>'
      +forms(m)+movesBlock(m)+'<p class="tmuted">'+state+'</p>'+(acts?'<div class="tacts">'+acts+'</div>':'')+report(m)+(m.status==='resting'?liveList():'')
      +'<button type="button" class="tx" data-act="close" aria-label="Close">×</button></div>'; }
  function spotHint(){ if(!S.members.some(function(m){ return m.slot==null; })) return '';   /* (nobody is waiting: the empty spot says enough) */
    return '<div class="tpin t-none"><div class="tpi"><span class="twhere on">Empty spot</span><span class="tname">Who goes here?</span><p class="tmuted">'
      +(phone()?'Tap a creature below, then <b>Add to team</b>. Or hold one and drag it up.':'Click a creature below, then <b>Add to team</b>. Or just drag its card onto the spot.')
      +'</p></div><button type="button" class="tx" data-act="close" aria-label="Close">×</button></div>'; }
  /* the Collection's order is the viewer's own (drag a card onto another to move it); it's kept in this browser.
     Anyone not placed yet comes first, newest first. */
  var colOrder=[]; try{ colOrder=JSON.parse(localStorage.getItem('cdColOrder')||'[]')||[]; }catch(e){ colOrder=[]; }
  function colList(){ return S.members.filter(function(m){ return m.slot==null; }).sort(function(a,b){ var i=colOrder.indexOf(a.id), j=colOrder.indexOf(b.id); return i<0&&j<0?b.id-a.id:i<0?-1:j<0?1:i-j; }); }
  function reorder(id,target,after,from){ var ids=colList().map(function(m){ return m.id; }).filter(function(x){ return x!==id; }), at=target==null?ids.length:ids.indexOf(target);
    if(at<0) at=ids.length; else if(after&&target!=null) at++; ids.splice(at,0,id);
    smooth(function(){ colOrder=ids; try{ localStorage.setItem('cdColOrder',JSON.stringify(ids)); }catch(e){} redraw(); },from); }
  function drawCol(){ if(!S.on) return; mount();
    var list=colList();
    colEl.querySelector('.tcount').textContent=list.length?list.length+' waiting':'';
    var g=list.map(smallCard).join(''), gs=sig(g), grid=colEl.querySelector('#tgrid'); if(grid._h!==gs&&!drag){ grid._h=gs; grid.innerHTML=g; }
    colEl.querySelector('#tcolnote').textContent=list.length?(phone()?'Tap one to look. Hold and drag it onto your team, or onto another card to reorder.':'Click one to look. Drag it onto your team, or onto another card to reorder.')
      :'';
    var m=S.pick!=null&&M(S.pick), pv=colEl.querySelector('#tprev'), ph=m?pinHtml(m):S.spot!=null&&!onPad(S.spot)?spotHint():'';
    var ps=sig(ph); if(pv._h!==ps){ var op=pv.querySelector('details'); if(op) S.repOpen=op.open; pv._h=ps; if(ph) colEl.querySelector('#tprevin').innerHTML=ph; } pv.classList.toggle('open',!!ph);
    if(m&&m.status==='resting') getLive(); }
  function draw(){ if(!S.on) return; drawTeam(); drawCol(); paintBeans(); }

  /* ---------------------------------------------------------------- the 1 s tick: timers count down without redrawing everything */
  setInterval(function(){ if(!S.on||document.hidden) return; var now=Date.now();
    $$('[data-left]').forEach(function(el){ var m=M(+el.getAttribute('data-left')); if(!m) return; var pre=el.getAttribute('data-pre'); el.textContent=(pre==null?'Resting ':pre)+hm(left(m)); });
    $$('[data-fill]').forEach(function(el){ var m=M(+el.getAttribute('data-fill')); if(m) el.style.width=restPct(m).toFixed(1)+'%'; });
    $$('[data-out]').forEach(function(el){ var m=M(+el.getAttribute('data-out')); if(!m||m.egg) return; var pre=el.getAttribute('data-pre'); el.textContent=(pre==null?'Fighting ':pre)+ms((now-(S.outSince[m.id]||now))/1000); });
    if(S.members.some(function(m){ return m.status==='resting'&&left(m)===0; })) soon(1500);
    if(S.members.some(function(m){ return m.changing; })) soon(4000); },1000);

  /* ---------------------------------------------------------------- clicks (the camp, and the Collection wherever it sits) */
  /* a tester's Grow: straight to its next change (shaped by its bean, if it ate one); the new form shows up in about a minute */
  function grow(id){ var m=M(id); if(!m||!api) return; m.changing=true; draw();
    api.grow(id).then(function(j){ if(j&&j.state) stateIn(j.state); toast(nameOf(m)+' is growing. Its new form shows up in about a minute.'); soon(3000); },
      function(e){ m.changing=false; draw(); toast(ERR[String(e&&e.message||'')]||'Couldn\u2019t grow it: '+String(e&&e.message||'try again')); }); }
  function colOpen(){ return !tabCol.hidden&&!lk('col'); }
  function showInfo(){ if(!phone()&&sideNow()!=='collection'&&colOpen()) X.sideTab('collection',true); }
  function onClick(e){ if(justDragged) return; var a=e.target.closest('[data-act]');
    if(a){ var act=a.getAttribute('data-act');
      if(act==='send') send(+a.getAttribute('data-id'),a,a.getAttribute('data-side')||'');
      else if(act==='keep') nameDone();
      else if(act==='close'){ S.pick=null; S.spot=null; draw(); }
      else if(act==='add') addToTeam(S.pick);
      else if(act==='off') bench(S.pick);
      else if(act==='grow') grow(S.pick);
      else if(act==='gift') giftOpen(); else if(act==='giftclose') giftClose();
      else if(act==='pick') pickOpen(a.getAttribute('data-id')?+a.getAttribute('data-id'):S.pick);
      else if(/^pk/.test(act)) pickAct(act,a);
      return; }
    var c=e.target.closest('.tcard');
    if(c&&+c.getAttribute('data-id')===GIFT){ giftOpen(); return; }
    if(c){ var id=+c.getAttribute('data-id'); if(S.placing!=null) stopPlacing(); S.pick=S.pick===id?null:id; draw(); return; }
    var p=e.target.closest('.tspot');
    if(p){ var k=+p.getAttribute('data-k'), m=onPad(k);
      if(m&&m.gift&&S.placing==null){ giftOpen(); return; }
      if(S.placing!=null&&!drag){ tryDrop(k); return; }
      if(m){ S.pick=m.id; S.spot=null; } else { S.spot=k; var cur=S.pick!=null&&M(S.pick); if(cur&&cur.slot!=null) S.pick=null; }
      showInfo(); draw(); return; }
    if(e.target.closest('.tcamp')&&!e.target.closest('.trv')){ var pk=S.pick!=null&&M(S.pick); if(pk&&pk.slot!=null) S.pick=null; S.spot=null; if(S.placing!=null) stopPlacing(); draw(); } }
  pane.addEventListener('click',onClick); colv.addEventListener('click',onClick);
  pane.addEventListener('keydown',function(e){ var p=e.target.closest&&e.target.closest('.tspot'); if(p&&e.target===p&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); p.click(); } });
  pane.addEventListener('submit',function(e){ e.preventDefault(); if(e.target.closest('#tgv')) giftSend(); });
  pane.addEventListener('input',function(e){ if(e.target.id==='tgword'){ var er=$('tgerr'); if(er) er.textContent=''; } });

  /* Attack or Help: the one you press swells while the other slides away, and both come back if the send fails */
  function send(id,btn,side){ var m=M(id); if(!m) return;
    if(!DEMO&&!account()){ X.needAccount(function(){ send(id,null,side); }); return; }
    if(m.egg) side='';
    var duo=btn&&btn.closest('.tsend.duo'), all=duo?$$('button',duo):btn?[btn]:[];
    all.forEach(function(b){ b.disabled=true; }); if(duo){ duo.classList.add('went'); btn.classList.add('pick'); }
    var help=side==='help';
    var t0=Date.now(), held=function(v){ return new Promise(function(ok){ setTimeout(function(){ ok(v); },duo&&!still?Math.max(0,340-(Date.now()-t0)):0); }); };
    (api?api.send(id,side):demo.send(id,side)).then(held).then(function(j){ if(j&&j.state&&j.state.members){ stateIn(j.state); m=M(id)||m; } m.status='out'; S.outSince[id]=Date.now(); if(help) S.helping[id]=1; else delete S.helping[id]; lastCamp=''; draw();
      toast(m.egg?'Your egg drops into '+chanS()+' dungeon. Watch it hatch!':help?nameOf(m)+' jumps in to help '+(channel()||'the streamer')+'!':m.evolve_ready?nameOf(m)+' jumps in. Watch it evolve on stream!':nameOf(m)+' jumps into '+chanS()+' dungeon!'); soon(1500); })
    .catch(function(e){ all.forEach(function(b){ b.disabled=false; }); if(duo){ duo.classList.remove('went'); btn.classList.remove('pick'); }
      if(S.noSide){ lastCamp=''; draw(); } toast(errText(e),true); soon(300); }); }

  /* ---------------------------------------------------------------- joining the team: drag a card onto a spot, or Add to team.
     Add to team goes straight in when there's an empty spot; with a full team you pick who it swaps with. */
  function goTeam(){ var ph=phone(); if(ph&&sideNow()!=='rewards') X.sideTab('rewards'); if(ptNow()!=='team') X.pTab('team');
    if(campEl&&!ph){ var r=campEl.getBoundingClientRect(); if(r.top<0||r.bottom>innerHeight) campEl.scrollIntoView({block:'nearest',behavior:still?'auto':'smooth'}); } }
  function busyWhy(m,join){ return m.gift?'Tell your egg what to hatch into first.':m.status==='out'?nameOf(m)+' is fighting. '+(join?'It can join when it’s back.':'Wait until it’s back to swap it.'):nameOf(m)+' is resting. '+(join?'It can join in ':'You can swap it in ')+hm(left(m))+'.'; }
  function addToTeam(id){ var m=M(id); if(!m||m.slot!=null) return;
    if(lockOf(m)){ toast(busyWhy(m,true),true); return; }
    var k=-1; if(S.spot!=null&&!onPad(S.spot)) k=S.spot; else for(var i=0;i<S.slots;i++) if(!onPad(i)){ k=i; break; }
    if(k>=0){ S.placing=id; goTeam(); tryDrop(k); return; }
    startPlacing(id,false); }
  function bench(id,from){ var m=M(id); if(!m||m.slot==null) return;
    if(lockOf(m)){ toast(busyWhy(m,false),true); return; }
    var was=m.slot; smooth(function(){ m.slot=null; redraw(); },from); toast(nameOf(m)+' went back to your Collection.');
    (api?api.set(id,null):demo.set(id,null)).then(function(j){ if(j&&j.members) stateIn(j); else soon(200); })
    .catch(function(e){ smooth(function(){ m.slot=was; redraw(); }); toast(errText(e),true); soon(200); }); }
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
  function stopPlacing(){ S.placing=null; document.documentElement.classList.remove('tplacing','tfromteam'); $$('.tspot.hot').forEach(function(p){ p.classList.remove('hot'); }); }
  function shake(el){ if(!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
  /* ---------------------------------------------------------------- smooth moves: nobody ever jumps. Whenever creatures change
     places (a swap, a move, joining or leaving the team, a new order in the Collection) each one glides from where it was to
     where it now is. The real one stays hidden where it will land until its glide gets there. */
  var fly={};
  function redraw(){ lastCamp=''; colEl.querySelector('#tgrid')._h=''; draw(); }
  function spotOf(id){ var m=M(id); return m&&m.slot!=null&&campEl?campEl.querySelector('.tspot[data-k="'+m.slot+'"]'):null; }
  function cardOf(id){ return colEl.querySelector('#tgrid .tcard[data-id="'+id+'"]'); }
  function seen(r){ return r.width>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth; }
  /* where a creature is drawn right now: the middle of its picture, and how wide the picture is */
  function at(id){ var p=spotOf(id), r, e;
    if(p){ r=p.getBoundingClientRect(); if(!seen(r)) return null; return {x:r.left+r.width/2,y:r.bottom-camp.lh-camp.cs/2,w:camp.cs,team:true}; }
    e=cardOf(id); if(!e) return null; r=e.getBoundingClientRect();
    var sv=e.closest('.sview'), b=sv&&sv.getBoundingClientRect();
    if(!seen(r)||(b&&(r.bottom<b.top||r.top>b.bottom))){ /* its card is scrolled out of view: its big picture, if that's showing, stands in */
      var art=S.pick===id&&colEl.querySelector('#tprev.open .tart'), ar=art&&art.getBoundingClientRect(); return ar&&seen(ar)?{x:ar.left+ar.width/2,y:ar.top+ar.height/2,w:96}:null; }
    var sp=e.querySelector('.cspr,.ew'), q=sp?sp.getBoundingClientRect():r; return {x:q.left+q.width/2,y:q.top+q.height/2,w:Math.min(q.width,q.height)||r.width*.8,card:r}; }
  function places(){ var o={}; S.members.forEach(function(m){ var a=at(m.id); if(a) o[m.id]=a; }); return o; }
  function ease(t){ return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2; }
  function unhide(id){ delete fly[id]; var p=spotOf(id), c=cardOf(id); if(p) p.classList.remove('flying'); if(c) c.classList.remove('flying'); }
  function glide(id,a){ var m=M(id); if(!m) return; var g=document.createElement('div'); g.className='tflyer';
    g.innerHTML='<span>'+(m.egg?egg(m.hue,2,'',2):img(m,96))+'</span>'; document.body.appendChild(g);
    var nat=g.firstChild.getBoundingClientRect().width||96, t0=0, run=(fly[id]|0)+1, last=null; fly[id]=run;
    var p=spotOf(id), c=cardOf(id); if(p) p.classList.add('flying'); if(c) c.classList.add('flying');
    function put(x,y,w,o){ g.style.transform='translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px) scale('+(w/nat).toFixed(3)+')'; g.style.opacity=o; }
    put(a.x,a.y,a.w,1);
    function step(now){ if(fly[id]!==run||!M(id)){ g.remove(); return; }
      if(!t0) t0=now; var t=Math.min(1,(now-t0)/400), e=ease(t), b=at(id), o=1;
      if(!b){ /* it lands somewhere that isn't on screen (the Collection behind another tab): it shrinks into that tab's button */
        var tb=tabCol&&colOpen()?tabCol.getBoundingClientRect():null; b=last||(tb&&tb.width?{x:tb.left+tb.width/2,y:tb.top+tb.height/2,w:20}:{x:a.x,y:a.y+30,w:a.w*.5}); if(!last) o=1-e*e; }
      else last=b;
      put(a.x+(b.x-a.x)*e,a.y+(b.y-a.y)*e-Math.sin(Math.PI*e)*Math.min(26,Math.abs(b.x-a.x)/5+Math.abs(b.y-a.y)/8),a.w+(b.w-a.w)*e,o);
      if(t<1) requestAnimationFrame(step); else { g.remove(); unhide(id); } }
    requestAnimationFrame(step); }
  /* run a change (it redraws), then glide everyone who ended up somewhere else. from = where a dragged one was let go */
  function smooth(fn,from){ if(still||document.hidden) return fn();
    var a=places(), k, ret; if(from) for(k in from) a[k]=from[k];
    ret=fn(); var b=places();
    S.members.forEach(function(m){ var p=a[m.id], q=b[m.id]; if(!p) return; if(q&&Math.abs(p.x-q.x)+Math.abs(p.y-q.y)<3) return;
      if(!q&&(m.slot!=null||p.card)) return;
      /* a card that only shifts along in the Collection slides as a whole card */
      if(q&&p.card&&q.card){ var c=cardOf(m.id); if(c&&c.animate) c.animate([{transform:'translate('+(p.card.left-q.card.left)+'px,'+(p.card.top-q.card.top)+'px)'},{transform:'none'}],{duration:320,easing:'cubic-bezier(.3,.8,.3,1)'}); return; }
      glide(m.id,p); });
    return ret; }

  function tryDrop(k,from){ var id=S.placing, src=M(id), old=onPad(k), pad=campEl&&campEl.querySelector('.tspot[data-k="'+k+'"]');
    if(!src) { stopPlacing(); return false; }
    if(lockOf(src)){ shake(pad); toast(busyWhy(src,true),true); return false; }
    if(lockOf(old)){ shake(pad); toast(busyWhy(old,false),true); return false; }
    if(old===src){ stopPlacing(); return false; }
    /* looks done at once; the database has the last word */
    var was=src.slot;
    smooth(function(){ if(old) old.slot=was; src.slot=k; S.pick=id; S.spot=null; S.lift=null; stopPlacing(); redraw(); },from);
    toast(was!=null?(old?nameOf(src)+' and '+(old.egg?'the egg':old.name)+' swapped places.':nameOf(src)+' moved over.'):old?nameOf(src)+' joined your team. '+(old.egg?'The egg':old.name)+' went back to your Collection.':nameOf(src)+' joined your team.');
    (api?api.set(id,k):demo.set(id,k)).then(function(j){ if(j&&j.members) stateIn(j); else soon(200); })
    .catch(function(e){ smooth(function(){ src.slot=was; if(old) old.slot=k; redraw(); }); toast(errText(e),true); soon(200); });
    return true; }

  var drag=null, justDragged=false, press=null, lp=null;
  function ghost(m,el){ var g=document.createElement('div'); g.className='tghost';
    g.innerHTML='<div class="gcard">'+el.outerHTML.replace(/<svg class="thand"[\s\S]*?<\/svg>|<span class="thint">.*?<\/span>/g,'')+'</div><span class="gc">'+(m.egg?egg(m.hue,2,'',2):img(m,96))+'</span>';
    document.body.appendChild(g); return g; }
  /* A drag starts on a Collection card or on a team member.
     Card -> a team spot: joins (or swaps in).   Card -> another card: moves it there in the Collection.
     Team member -> another spot: moves or swaps places.   Team member -> the Collection: comes off the team. */
  function beginDrag(id,el,x,y){ var m=M(id); if(!m) return;
    var team=m.slot!=null, r=el.getBoundingClientRect(), g;
    if(team&&lockOf(m)){ toast(busyWhy(m,false),true); return; }
    S.pick=id;
    if(team){ g=document.createElement('div'); g.className='tghost spr'; g.innerHTML='<span class="gc">'+(m.egg?egg(m.hue,2,'',2):img(m,96))+'</span>'; document.body.appendChild(g); }
    else g=ghost(m,el);
    drag={id:id,el:el,team:team,ox:team?52:x-r.left,oy:team?60:y-r.top,home:r,hot:null,col:false,card:null,after:false,g:g}; el.classList.add('lifted');
    document.documentElement.classList.add('tdragging');
    if(navigator.vibrate) try{ navigator.vibrate(15); }catch(e){}
    if(team){ S.lift=id; S.placing=id; document.documentElement.classList.add('tplacing','tfromteam'); if(!phone()&&colOpen()&&sideNow()!=='collection') X.sideTab('collection'); lastCamp=''; drawTeam(); markPads(); }
    else startPlacing(id,true);
    moveDrag(x,y); }
  function colZone(hit){ return !!(hit&&hit.closest&&(hit.closest('.tcol')||hit.closest('.sview[data-view="collection"]'))); }
  function moveDrag(x,y){ if(!drag) return; drag.x=x; drag.y=y; drag.g.style.transform='translate('+(x-drag.ox)+'px,'+(y-drag.oy)+'px)';
    var hit=document.elementFromPoint(x,y), p=hit&&hit.closest&&hit.closest('#tcamp .tspot');
    if(p!==drag.hot){ if(drag.hot) drag.hot.classList.remove('hot'); drag.hot=p; if(p) p.classList.add('hot'); }
    drag.g.classList.toggle('over',!!(p&&!p.classList.contains('no')));
    /* a team member over the Collection: it would come off the team */
    var col=drag.team&&!p&&colZone(hit); if(col!==drag.col){ drag.col=col; colEl.classList.toggle('tdrop',col); }
    /* a card over another card: it would move there */
    var c=!drag.team&&!p&&hit&&hit.closest?hit.closest('#tgrid .tcard'):null, after=false; if(c&&+c.getAttribute('data-id')===drag.id) c=null;
    if(c){ var cr=c.getBoundingClientRect(); after=x>cr.left+cr.width/2; }
    if(c!==drag.card||after!==drag.after){ if(drag.card) drag.card.classList.remove('ins-l','ins-r'); drag.card=c; drag.after=after; if(c) c.classList.add(after?'ins-r':'ins-l'); }
    /* near the edge of the list (phones) or the screen: scroll, so a camp that's out of view can be reached */
    var sv=pane.closest('.sview'), box=sv&&sv.scrollHeight>sv.clientHeight+4?sv.getBoundingClientRect():{top:0,bottom:innerHeight}, ed=56, dy=y<box.top+ed?-12:y>box.bottom-ed?12:0;
    if(dy){ if(sv&&box.top) sv.scrollTop+=dy; else scrollBy(0,dy); } }
  function endDrag(){ var d=drag; drag=null; justDragged=true; setTimeout(function(){ justDragged=false; },60);
    document.documentElement.classList.remove('tdragging'); colEl.classList.remove('tdrop'); if(d.card) d.card.classList.remove('ins-l','ins-r'); S.lift=null;
    function done(){ d.g.remove(); d.el.classList.remove('lifted'); }
    /* where it was let go: its glide to the new place starts here */
    var from={}, gr=d.g.getBoundingClientRect(), gx=d.x-d.ox, gy=d.y-d.oy;
    from[d.id]=d.team||d.g.classList.contains('over')?{x:gx+52,y:gy+(d.team?60:52),w:96}:{x:gx+d.home.width/2,y:gy+d.home.height/2+9,w:Math.min(96,d.home.width*.8),card:{left:gx,top:gy}};
    if(d.hot){ if(tryDrop(+d.hot.getAttribute('data-k'),from)){ done(); return; } }
    else if(d.team&&d.col){ stopPlacing(); done(); bench(d.id,from); return; }
    else if(!d.team&&d.card){ stopPlacing(); done(); reorder(d.id,+d.card.getAttribute('data-id'),d.after,from); return; }
    stopPlacing();
    requestAnimationFrame(function(){ var r=d.el.isConnected&&d.el.offsetParent?d.el.getBoundingClientRect():d.home; d.g.classList.add('back'); d.g.classList.remove('over'); d.g.style.transform='translate('+(d.team?r.left+r.width/2-52:r.left)+'px,'+(d.team?r.top+r.height/2-60:r.top)+'px)'; });
    setTimeout(function(){ done(); colEl.querySelector('#tgrid')._h=''; lastCamp=''; draw(); },320); }
  /* what can be picked up under this point: a Collection card, or a team member standing on its spot */
  function grab(t){ if(!t||!t.closest||S.placing!=null&&!drag) return null; var el=t.closest('#tgrid .tcard'); if(el) return +el.getAttribute('data-id')===GIFT?null:{id:+el.getAttribute('data-id'),el:el};
    if(t.closest('[data-act]')) return null; el=t.closest('#tcamp .tspot'); var m=el&&onPad(+el.getAttribute('data-k')); return m&&!m.gift?{id:m.id,el:el}:null; }
  /* mouse and pen: drag after a small move */
  document.addEventListener('pointerdown',function(e){ if(e.pointerType==='touch'||e.button!==0||!S.on) return; var g=grab(e.target); if(!g) return;
    press={id:g.id,el:g.el,x:e.clientX,y:e.clientY}; });
  document.addEventListener('pointermove',function(e){ if(e.pointerType==='touch') return;
    if(press&&!drag&&Math.abs(e.clientX-press.x)+Math.abs(e.clientY-press.y)>7){ var p=press; press=null; beginDrag(p.id,p.el,e.clientX,e.clientY); }
    if(drag){ e.preventDefault(); moveDrag(e.clientX,e.clientY); } });
  document.addEventListener('pointerup',function(e){ if(e.pointerType==='touch') return; press=null; if(drag) endDrag(); });
  document.addEventListener('dragstart',function(e){ if(e.target.closest&&(e.target.closest('#tgrid')||e.target.closest('#tcamp'))) e.preventDefault(); });
  /* touch: press and hold, then drag (a quick swipe still scrolls) */
  /* A touch keeps sending its events to the element it started on, even after a redraw has taken that element off the page
     (then they no longer reach the document). So the same handlers also listen on that element until the finger lifts. */
  var touchEl=null, tOpt={passive:false};
  function tBind(el){ tFree(); touchEl=el; el.addEventListener('touchmove',tMove,tOpt); el.addEventListener('touchend',tEnd,tOpt); el.addEventListener('touchcancel',tCancel,tOpt); }
  function tFree(){ if(!touchEl) return; touchEl.removeEventListener('touchmove',tMove,tOpt); touchEl.removeEventListener('touchend',tEnd,tOpt); touchEl.removeEventListener('touchcancel',tCancel,tOpt); touchEl=null; }
  function tMove(e){ if(e._cd) return; e._cd=1; var t=e.touches[0]; if(!t) return;
    if(lp){ if(Math.abs(t.clientX-lp.x)+Math.abs(t.clientY-lp.y)>10){ clearTimeout(lp.timer); lp=null; tFree(); } else { lp.x=t.clientX; lp.y=t.clientY; } }
    if(drag){ e.preventDefault(); moveDrag(t.clientX,t.clientY); } }
  function tEnd(e){ if(e._cd) return; e._cd=1; tFree(); if(lp){ clearTimeout(lp.timer); lp=null; } if(drag){ e.preventDefault(); endDrag(); } }
  function tCancel(e){ if(e._cd) return; e._cd=1; tFree(); if(lp){ clearTimeout(lp.timer); lp=null; } if(drag) endDrag(); }
  document.addEventListener('touchstart',function(e){ if(!S.on||drag) return; var g=grab(e.target); if(!g) return; var t=e.touches[0]; tBind(e.target);
    lp={el:g.el,x:t.clientX,y:t.clientY,timer:setTimeout(function(){ var l=lp; lp=null; if(l) beginDrag(g.id,l.el,l.x,l.y); },280)}; },{passive:true});
  document.addEventListener('touchmove',tMove,tOpt);
  document.addEventListener('touchend',tEnd,tOpt);
  document.addEventListener('touchcancel',tCancel);
  document.addEventListener('contextmenu',function(e){ if(e.target.closest&&(e.target.closest('#tgrid .tcard')||e.target.closest('#tcamp .tspot'))) e.preventDefault(); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&S.placing!=null&&!drag){ stopPlacing(); toast('Cancelled.'); } });

  /* ---------------------------------------------------------------- hatching (the site shows it the moment the game reports it) */
  function tabDot(on){ var d=$('tmdot'); if(d) d.hidden=!on; }
  /* (a creature's name comes from the designer and changes when it evolves: players don't name or rename it) */
  var rvT=0;
  function hatchShow(m){ S.revealing=m.id; if(G.open) giftClose(); var o=$('trv'); if(!o) { drawTeam(); o=$('trv'); } if(!o) return;
    o.innerHTML='<div class="trvbox trvnew" data-act="keep" role="button" tabindex="0"><span class="rays" aria-hidden="true"></span><div class="mc tbig k-enemy t-'+esc(m.danger||'normal')+'"><span class="nin">'+esc(X.fitName(m.name))+'</span>'+img(m,112,'cspr')+'</div>'
      +'<div class="trvt"><p class="trvh">Your egg hatched!</p><p class="trvn">'+esc(m.name)+'</p></div></div>';
    o.hidden=false; pane.classList.add('rvon'); clearTimeout(rvT); rvT=setTimeout(function(){ if(S.revealing===m.id) nameDone(); },6000);
    if(ptNow()!=='team'||!pane.offsetParent){ tabDot(true); toast('Your egg hatched! Open '+PETS+' to meet it.'); } }
  /* seen: the "just hatched" mark comes off (team_name with no name keeps the designer's) */
  function nameDone(){ var id=S.revealing, m=M(id); clearTimeout(rvT); if(!m){ hatchClose(); return; }
    m.fresh=false; hatchClose();
    (api?api.name(id,''):demo.name(id,'')).then(function(j){ if(j&&j.members) stateIn(j); else soon(200); },function(){ soon(2000); }); }
  function hatchClose(){ var o=$('trv'); if(o){ o.hidden=true; o.innerHTML=''; } pane.classList.remove('rvon'); S.revealing=null; lastCamp=''; draw(); setTimeout(pickSync,400); }

  /* ---------------------------------------------------------------- evolving: shown on the site while the stream shows it */
  function evolved(m,from){ S.played[m.id]=1; var k=m.slot, w=k!=null&&campEl&&campEl.querySelector('.tspot[data-k="'+k+'"] .who');
    if(w){ w.classList.add('evolving'); setTimeout(function(){ w.classList.remove('evolving'); w.classList.add('arrive'); },1300); }
    toast(nameOf(m)+' evolved! Form '+(m.form|0)+(m.danger?', now '+tierName(m.danger):'')+'.'); if(ptNow()!=='team') tabDot(true); }

  /* ---------------------------------------------------------------- a small toast of its own (bottom of the screen) */
  var tEl=document.createElement('div'), tT=0; tEl.className='ttoast'; tEl.setAttribute('role','status'); tEl.setAttribute('aria-live','polite'); document.body.appendChild(tEl);
  function toast(t,bad){ tEl.textContent=t; tEl.classList.toggle('bad',!!bad); tEl.classList.add('on'); clearTimeout(tT); tT=setTimeout(function(){ tEl.classList.remove('on'); },3200); }

  var paneW=0; function resized(){ if(drag||!S.on||pane.hidden) return; var w=pane.clientWidth+'/'+innerHeight+'/'+(phone()?1:0); if(w===paneW) return; paneW=w; lastCamp=''; draw(); }
  if(window.ResizeObserver) new ResizeObserver(resized).observe(pane);
  window.addEventListener('resize',function(){ setTimeout(resized,120); });

  /* ---------------------------------------------------------------- tabs unlock one at a time (new visitors only)
     A first visit shows the stream and the chat. Then: Pets when the free egg is named, Power when a creature first comes
     home (or 5 minutes on the site), Shop at the first rubies (or 20 minutes), Collection at the first evolution or a second
     creature (or the 2nd visit). The server says what's unlocked (team_state.unlocks); the times are counted here and
     told to the server (unlock_seen). What's unlocked is also kept in this browser (cdUnl) so a reload shows the right
     tabs at once: the small script in the page's head reads it before anything is drawn. Players from before this (and
     any database that doesn't send unlocks) see everything. A new tab grows into its row; nothing jumps. */
  var KEYS=['pets','power','shop','col'], root=document.documentElement, NEWDEMO=DEMO&&/[?&]new=1\b/.test(location.search);
  var U={have:{},path:false,open:false,queue:[],busy:false,noSeen:false,site:0,visits:1,told:{}};
  function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
  (function(){ var u=NEWDEMO?'':DEMO?null:lsGet('cdUnl'), known=DEMO||!!(lsGet('cdTok')||lsGet('cdName'));
    if(u==null&&known){ KEYS.forEach(function(k){ U.have[k]=1; }); if(!DEMO) lsSet('cdUnl',KEYS.join(',')); }
    else { U.path=true; String(u||'').split(',').forEach(function(k){ if(KEYS.indexOf(k)>=0) U.have[k]=1; }); if(u==null&&!DEMO) lsSet('cdUnl',''); }
    U.site=NEWDEMO?0:(+lsGet('cdSite')||0); var last=+lsGet('cdSeenAt')||0, v=+lsGet('cdVisits')||0, now=Date.now();
    if(!DEMO){ if(!last||now-last>1800000){ v++; lsSet('cdVisits',String(v)); } lsSet('cdSeenAt',String(now)); } U.visits=Math.max(1,v); uPaint(); })();
  function lk(k){ return !U.open&&(!U.have[k]||(k!=='pets'&&!U.have.pets)); }
  function uPaint(){ KEYS.forEach(function(k){ root.classList.toggle('lk-'+k,lk(k)); }); root.classList.toggle('cdpath',U.path&&!U.open); }
  function uSave(){ if(!DEMO&&!U.open) lsSet('cdUnl',KEYS.filter(function(k){ return U.have[k]; }).join(',')); }
  /* everything, at once and without a show: team mode is off, or the database doesn't know about unlocks */
  function uAll(){ if(U.open) return; U.open=true; U.queue=[]; uPaint(); relabel(); if(X.layout) X.layout(); }
  function uWant(k){ if(U.open||U.have[k]||U.queue.indexOf(k)>=0) return; if(k!=='pets'&&!U.have.pets&&U.queue.indexOf('pets')<0) return; U.queue.push(k); uRun(); }
  function uRun(){ if(U.busy||!U.queue.length) return; U.busy=true; var k=U.queue.shift(); U.have[k]=1; uSave(); reveal(k); setTimeout(function(){ U.busy=false; uRun(); },1500); }
  /* a tab (or a bar) grows into its row from nothing, pushing its neighbours along */
  function growIn(el,down){ if(!el||still||!el.animate||!el.offsetParent) return; var r=el.getBoundingClientRect(), cs=getComputedStyle(el), ov=el.style.overflow; if(!r.width||!r.height) return;
    el.style.overflow='hidden';
    var a=down?el.animate([{height:'0px',minHeight:'0px',flex:'0 0 0px',paddingTop:'0px',paddingBottom:'0px',marginBottom:'-'+(parseFloat(getComputedStyle(el.parentNode).rowGap)||0)+'px',opacity:0},{height:r.height+'px',minHeight:'0px',flex:'0 0 '+r.height+'px',paddingTop:cs.paddingTop,paddingBottom:cs.paddingBottom,marginBottom:cs.marginBottom,opacity:1}],{duration:520,easing:'cubic-bezier(.2,.9,.3,1)'})
      :el.animate([{width:'0px',minWidth:'0px',flex:'0 0 0px',paddingLeft:'0px',paddingRight:'0px',marginRight:'-'+(parseFloat(getComputedStyle(el.parentNode).columnGap)||0)+'px',opacity:0},{width:r.width+'px',minWidth:'0px',flex:'0 0 '+r.width+'px',paddingLeft:cs.paddingLeft,paddingRight:cs.paddingRight,marginRight:cs.marginRight,opacity:1}],{duration:520,easing:'cubic-bezier(.2,.9,.3,1)'});
    a.onfinish=a.oncancel=function(){ el.style.overflow=ov; }; }
  function addDot(el,stab){ if(!el||el.querySelector('.tnew')) return; var d=document.createElement('i'); d.className=(stab?'dot':'pdot')+' tnew'; if(!stab) d.textContent='!'; el.appendChild(d); }
  function clearDot(el){ var d=el&&el.querySelector('.tnew'); if(d) d.remove(); }
  /* on a phone the store is a side tab: while Pets is all that's in it, that tab is the Pets tab */
  var tabRew=document.querySelector('.stabs [data-side="rewards"]'), rewHtml=tabRew?tabRew.innerHTML:'', rewPets=false;
  function relabel(){ if(!tabRew) return; var want=S.on&&lk('power')&&!lk('pets'); if(want===rewPets) return; rewPets=want;
    var dot=tabRew.querySelector('.tnew'); tabRew.innerHTML=want?'<span class="tegg">'+egg(38,1)+'</span>'+PETS:rewHtml; if(dot) tabRew.appendChild(dot);
    if(!still&&tabRew.offsetParent&&tabRew.animate) tabRew.animate([{opacity:.3},{opacity:1}],{duration:300}); }
  function reveal(k){ var q=function(s){ return document.querySelector(s); };
    root.classList.remove('lk-'+k); uPaint();
    if(k==='pets'){ relabel(); if(X.cards&&X.cards.ok&&S.on&&lk('power')&&ptNow()!=='team') X.pTab('team'); growIn(tabRew); }
    else if(k==='power'){ relabel(); var tb=q('#ptabs [data-pt="spawn"]'); growIn(tb); growIn(q('.dpbar'),true); growIn($('pchip')); growIn($('dbtn')); if(ptNow()!=='spawn') addDot(tb); if(phone()&&sideNow()!=='rewards') addDot(tabRew,true); }
    else if(k==='shop'){ var sb=q('.stabs [data-side="shop"]'); growIn(sb); growIn($('rbtn')); growIn($('pbuy')); if(sideNow()!=='shop') addDot(sb,true); }
    else if(k==='col'){ mount(); growIn(tabCol); if(sideNow()!=='collection') addDot(tabCol,true); var h=$('tcolhost'); if(h&&h.offsetParent&&h.animate&&!still) h.animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'none'}],{duration:450,easing:'cubic-bezier(.2,.9,.3,1)'}); drawCol(); }
    if(X.layout) X.layout(); lastCamp=''; setTimeout(draw,80); }
  function tell(k){ if(DEMO||!api||U.noSeen||U.told[k]) return; U.told[k]=1;
    api.seen(k==='col'?'collection':k).then(function(){},function(e){ if(/Could not find the function|schema cache|PGRST202/i.test(String(e&&e.message||''))) U.noSeen=true; else delete U.told[k]; }); }
  /* what the server says, then what this page can see for itself (so a tab is never stuck behind a slow poll) */
  function uSync(j){ if(!S.on||!j||!j.unlocks||typeof j.unlocks!=='object'){ uAll(); return; }
    var u=j.unlocks; if(u.pets) uWant('pets'); if(u.power) uWant('power'); if(u.shop) uWant('shop'); if(u.collection) uWant('col'); uLocal(); }
  function uLocal(){ if(U.open||!S.on||!U.have.pets) return; var ms=S.members, pts=X.pts||{};
    if(!U.have.power){ if(U.site>=300){ tell('power'); uWant('power'); } else if(ms.some(function(m){ return !m.egg&&(m.sends|0)>=1&&m.status!=='out'; })) uWant('power'); }
    if(!U.have.shop){ if(U.site>=1200){ tell('shop'); uWant('shop'); } else if((pts.rubies|0)>0) uWant('shop'); }
    if(!U.have.col){ if(U.visits>=2){ tell('collection'); uWant('col'); } else if(ms.filter(function(m){ return !m.gift; }).length>=2||ms.some(function(m){ return (m.form|0)>1; })) uWant('col'); } }
  /* time on the site: counted while the page is on show */
  setInterval(function(){ if(document.hidden) return; U.site++; if(U.site%5===0&&!DEMO){ lsSet('cdSite',String(U.site)); lsSet('cdSeenAt',String(Date.now())); } if(U.site%5===0) uLocal(); giftSync();
    if(S.on&&!lk('pets')&&lk('power')&&ptNow()==='spawn'&&X.cards&&X.cards.ok) X.pTab('team'); },1000);

  /* ---------------------------------------------------------------- the free egg: it just turns up in the Pets tab
     About a minute into a first visit the Pets tab appears with an egg already standing on the first spot (a player
     from before finds theirs on a free spot, or in the Collection when the team is full). The egg asks one thing:
     "What should it hatch into?" (20 letters). Until it's answered the egg is only on this page (id -1); once it is,
     the real egg takes its place. No present, no tab of its own, nothing over the stream. */
  var GIFT_AT=(function(){ var m=DEMO&&location.search.match(/[?&]gift=(\d+)/); return m?+m[1]:60; })(), WORD_MAX=20, GIFT=-1;
  var G={on:false,open:false,busy:false,asked:false};
  function giftCan(){ return !!(S.on&&S.free&&S.free.available&&!S.free.claimed); }
  /* the unnamed egg stands with the others: the first empty spot, else the Collection */
  function giftMember(){ if(!G.on||S.byId[GIFT]) return; var k=null, i; for(i=0;i<S.slots;i++) if(!onPad(i)){ k=i; break; }
    var m={id:GIFT,slot:k,egg:true,gift:true,hue:38,status:'home',until:0}; S.members.push(m); S.byId[GIFT]=m; }
  function giftDrop(){ S.members=S.members.filter(function(m){ return m.id!==GIFT; }); delete S.byId[GIFT]; }
  function giftSync(){ if(G.busy) return;
    if(!giftCan()){ if(G.on){ G.on=false; giftDrop(); giftClose(); redraw(); } return; }
    if(!G.on){ if(U.path&&U.site<GIFT_AT&&!U.have.pets) return; G.on=true; if(U.path&&!U.have.pets){ tell('pets'); uWant('pets'); } giftMember(); S.landed=GIFT; setTimeout(function(){ if(S.landed===GIFT) S.landed=null; },1200); redraw(); }
    giftAsk(); }
  /* a new visitor is asked as soon as the Pets tab is on show; anyone else clicks the egg when they like */
  function giftAsk(){ if(!G.on||G.open||G.asked||!U.path) return;
    if(paneSeen()){ G.asked=true; setTimeout(giftOpen,still?0:700); }
    else { if(ptNow()!=='team'&&!lk('power')) tabDot(true); if(phone()&&sideNow()!=='rewards') addDot(tabRew,true); } }
  function giftOpen(){ if(!G.on||G.open||S.revealing!=null||PK.id!=null||drag) return; var m=M(GIFT); if(!m) return;
    if(phone()&&sideNow()!=='rewards') X.sideTab('rewards'); if(ptNow()!=='team') X.pTab('team');
    var o=$('tgv'); if(!o){ drawTeam(); o=$('tgv'); } if(!o) return; G.open=true; G.asked=true;
    var others=S.members.some(function(x){ return x.id!==GIFT; });
    o.innerHTML='<div class="trvbox tgbox"><span class="rays" aria-hidden="true"></span><span class="tgegg" id="tgegg">'+egg(38,2,'wob',2)+'</span>'
      +'<form class="tgf" autocomplete="off"><p class="trvh">You got a free egg!</p><label for="tgword">What should it hatch into?</label>'
      +'<div class="tgrow"><input id="tgword" maxlength="'+WORD_MAX+'" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done"><button type="submit" class="tbtn sm" id="tggo">OK</button></div>'
      +'<p class="trverr" id="tgerr" role="status"></p></form>'+(others?'<button type="button" class="tx" data-act="giftclose" aria-label="Close">×</button>':'')+'</div>';
    o.hidden=false; pane.classList.add('rvon');
    if(!phone()) setTimeout(function(){ var i=$('tgword'); if(i&&G.open) try{ i.focus({preventScroll:true}); }catch(e){} },still?0:450); }
  function giftClose(){ var o=$('tgv'); G.open=false; if(o&&!o.hidden){ o.hidden=true; o.innerHTML=''; pane.classList.remove('rvon'); if(campEl) once2(campEl,'tback'); lastCamp=''; draw(); setTimeout(pickSync,400); } }
  function giftSend(){ var inp=$('tgword'), b=$('tggo'), er=$('tgerr'); if(!inp||G.busy) return;
    var t=inp.value.replace(/\s+/g,' ').trim().slice(0,WORD_MAX);
    if(!t){ shake(inp.parentNode); inp.focus(); return; }
    if(!DEMO&&!account()){ X.needAccount(giftSend); return; }
    G.busy=true; b.disabled=true; inp.readOnly=true; er.textContent=''; pane.classList.add('tgbusy');
    var had={}; S.members.forEach(function(m){ had[m.id]=1; });
    (api?api.claim(t):demo.claim(t)).then(function(j){ var st=j&&j.state&&j.state.members?j.state:j, id=j&&j.card!=null?+j.card:null;
      if(!st||!st.members) throw new Error('');
      eggsIn(st);
      if(id==null){ var nw=st.members.filter(function(m){ return !had[+m.id]; }); nw.sort(function(a,b){ return (b.making?1:0)-(a.making?1:0)||b.id-a.id; }); id=nw.length?+nw[0].id:null; }
      /* the real egg takes the place of the one that was asked about: a hop, its own colour, and it's picked */
      G.busy=false; G.on=false; S.free={available:false,claimed:true}; pane.classList.remove('tgbusy'); giftDrop(); uWant('pets'); stateIn(st);
      if(id!=null&&M(id)){ S.pick=M(id).slot!=null?id:null; S.spot=null; S.landed=id; setTimeout(function(){ if(S.landed===id) S.landed=null; },1200); }
      giftClose(); redraw(); soon(1500);
    }).catch(function(e){ G.busy=false; b.disabled=false; inp.readOnly=false; pane.classList.remove('tgbusy'); var m=String(e&&e.message||'');
      er.textContent=errText(e); shake(inp.parentNode); if(m==='claimed'){ soon(200); } else if(m==='no account'){ X.needAccount(giftSend); } else inp.focus(); }); }
  function once2(el,cls){ if(!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(function(){ el.classList.remove(cls); },700); }

  /* ---------------------------------------------------------------- "X is learning something new. Pick one:"
     When a creature comes home it may have a pick waiting (member.pick: three new moves or abilities made for it). The three
     show as cards in the Pets tab; picking one slides it into the creature's list. A creature knows 3 moves and 2 abilities
     at most: when it's full, the pick swaps with one it has (pick which). Skipping is allowed, and there's no hurry: the
     offer waits (a "!" on the creature) while it's sent out again with what it has. Moves get stronger by themselves when
     the creature evolves, so nothing here upgrades anything. */
  var CAP={move:3,ability:2};
  var AURA=pxIcon(['....w....','....w....','...wyw...','..wyyyw..','wwyyyyyww','..wyyyw..','...wyw...','....w....','....w....'],{w:'#fff3dc',y:'#7df0e0'},'au');
  var PK={id:null,mode:'pick',opt:null,busy:false,seen:{},arm:0,armT:0};
  function pickOf(m){ return m&&!m.egg&&m.pick&&m.pick.options&&m.pick.options.length?m.pick:null; }
  function kindOf(o){ return o&&o.kind==='ability'?'ability':'move'; }
  function has(m,kind){ return (kind==='ability'?m.abilities:m.moves)||[]; }
  function movesBlock(m){ if(m.egg) return ''; var mv=m.moves||[], ab=m.abilities||[], sg=m.signature; if(!mv.length&&!ab.length&&!sg) return '';
    var li=function(x,cls,tag){ return '<li class="'+cls+'"><b>'+esc(x.name)+(tag?'<i>'+tag+'</i>':'')+'</b><span>'+esc(x.line||'')+'</span></li>'; };
    return '<ul class="tmoves" aria-label="What it can do">'+(sg&&sg.name?li(sg,'sig','Signature'):'')+mv.map(function(x){ return li(x,'mv',''); }).join('')+ab.map(function(x){ return li(x,'ab','Ability'); }).join('')+'</ul>'; }
  function paneSeen(){ return !pane.hidden&&!!pane.offsetParent; }
  function pickSync(){ if(!S.on) return;
    if(PK.id!=null&&!PK.busy){ var cur=M(PK.id); if(!pickOf(cur)||cur.status==='out') pickClose(); else if(PK.pid!==cur.pick.id){ PK.pid=cur.pick.id; PK.mode='pick'; PK.opt=null; pkRender(false); } }
    if(PK.id!=null||S.revealing!=null||drag||S.placing!=null||G.open) return;
    var n=S.members.filter(function(m){ return pickOf(m)&&m.status!=='out'&&!PK.seen[m.pick.id]; })[0]; if(!n) return;
    if(paneSeen()){ PK.seen[n.pick.id]=1; pickOpen(n.id); }
    else if(!PK.seen['t'+n.pick.id]){ PK.seen['t'+n.pick.id]=1; if(ptNow()!=='team') tabDot(true); if(phone()&&sideNow()!=='rewards') addDot(tabRew,true); toast(nameOf(n)+' is learning something new.'); } }
  function pickOpen(id){ var m=M(id), box=$('tpk'); if(!pickOf(m)||m.status==='out'){ return; } if(!box){ drawTeam(); box=$('tpk'); } if(!box||S.revealing!=null) return;
    PK.seen[m.pick.id]=1; PK.id=id; PK.pid=m.pick.id; PK.mode='pick'; PK.opt=null; PK.busy=false; PK.arm=0;
    if(ptNow()!=='team') X.pTab('team');
    box.hidden=false; box.classList.remove('out'); pane.classList.add('pkon'); pkRender(false); once2(box,'in');
    if(phone()||!pane.classList.contains('fixed')){ var r=box.getBoundingClientRect(); if(r.top<0||r.bottom>innerHeight) box.scrollIntoView({block:'nearest',behavior:still?'auto':'smooth'}); } }
  function pickClose(){ var box=$('tpk'); PK.id=null; PK.busy=false; PK.mode='pick'; PK.opt=null; clearTimeout(PK.armT); if(!box||box.hidden) return;
    box.classList.add('out'); setTimeout(function(){ if(PK.id!=null) return; box.hidden=true; box.innerHTML=''; box.classList.remove('out'); pane.classList.remove('pkon'); if(campEl) once2(campEl,'tback'); lastCamp=''; draw(); },still?0:220); }
  function pkCard(o,key,act,attr,cls){ var ab=kindOf(o)==='ability';
    return '<button type="button" class="tpc '+(ab?'k-ab':'k-mv')+(cls?' '+cls:'')+'" data-key="'+key+'" data-act="'+act+'"'+(attr||'')+'><span class="tpk1">'+(ab?AURA+'Ability':SWORD+'Move')+'</span><b>'+esc(o.name)+'</b><span class="tpl">'+esc(o.line||'')+'</span></button>'; }
  function pkChips(m,kind,taking){ var l=has(m,kind), h='', n=CAP[kind], i;
    for(i=0;i<n;i++) h+=l[i]?'<span class="tpm '+(kind==='ability'?'ab':'mv')+'" data-slot="'+kind+i+'" title="'+esc(l[i].line||'')+'">'+esc(l[i].name)+'</span>':'<span class="tpm empty'+(taking===i?' take':'')+'" data-slot="'+kind+i+'"></span>';
    return h; }
  function pkHtml(){ var m=M(PK.id), p=pickOf(m); if(!p) return ''; var o=p.options, rows='', title, sg=m.signature, cs=camp.cs>=96&&!phone()?96:72;
    if(PK.mode==='swap'&&o[PK.opt]){ var nw=o[PK.opt], kind=kindOf(nw), old=has(m,kind);
      title='<p class="tpkt" data-key="t-swap">It can only '+(kind==='ability'?'have '+CAP.ability+' abilities':'know '+CAP.move+' moves')+'. Pick one to swap out:</p>';
      rows=pkCard(nw,'o'+PK.opt,'pkback','','sel')+'<span class="tpka" data-key="arrow" aria-hidden="true">&#8644;</span>'
        +old.map(function(x,i){ return pkCard({kind:kind,name:x.name,line:x.line},'h'+kind+i,'pkswap',' data-n="'+i+'"','old'); }).join(''); }
    else { title='<p class="tpkt" data-key="t-pick"><b>'+esc(m.name)+'</b> is learning something new. Pick one:</p>';
      rows=o.slice(0,3).map(function(x,i){ return pkCard(x,'o'+i,'pkpick',' data-i="'+i+'"',''); }).join(''); }
    return '<div class="tpkbox"><div class="tpkwho" data-key="who" style="--cc:'+(m.slot!=null?teamCol(m.slot):FUN[funCol(m)])+'">'+img(m,cs,'alive')+'</div><div class="tpkmain">'
      +'<div class="tpkh">'+title+'<span class="tpkx" data-key="x"><button type="button" class="tlink" data-act="pkskip">Skip</button><button type="button" class="tx" data-act="pkclose" aria-label="Close">×</button></span></div>'
      +'<div class="tpkrow'+(PK.mode==='swap'?' swap':'')+'">'+rows+'</div>'
      +'<div class="tpkhas" data-key="has">'+pkHas(m)+'</div></div></div>'; }
  function pkHas(m){ var sg=m.signature; return (sg&&sg.name?'<span class="tpm sig" title="'+esc(sg.line||'')+'">'+esc(sg.name)+'</span>':'')+'<span class="tpg"><em>Moves</em>'+pkChips(m,'move')+'</span><span class="tpg"><em>Abilities</em>'+pkChips(m,'ability')+'</span>'; }
  /* redraw the panel: what stays glides from where it was, what's new fades in */
  function pkRender(move){ var box=$('tpk'); if(!box) return; var old={};
    if(move&&!still) $$('[data-key]',box).forEach(function(e){ old[e.getAttribute('data-key')]=e.getBoundingClientRect(); });
    var fx=pane.classList.contains('fixed'); box.style.height=fx?camp.h+'px':''; box.classList.toggle('narrow',!fx&&(pane.clientWidth||600)<560); box.classList.toggle('short',fx&&camp.h<166);
    box.innerHTML=pkHtml();
    if(!move||still) return;
    $$('[data-key]',box).forEach(function(e,n){ if(!e.animate) return; var a=old[e.getAttribute('data-key')], b=e.getBoundingClientRect();
      if(a){ if(Math.abs(a.left-b.left)+Math.abs(a.top-b.top)+Math.abs(a.width-b.width)>1) e.animate([{transformOrigin:'0 0',transform:'translate('+(a.left-b.left)+'px,'+(a.top-b.top)+'px) scale('+(a.width/b.width).toFixed(3)+','+(a.height/b.height).toFixed(3)+')'},{transformOrigin:'0 0',transform:'none'}],{duration:360,easing:'cubic-bezier(.3,.8,.3,1)'}); }
      else e.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:300,delay:90+n*35,fill:'backwards',easing:'cubic-bezier(.2,.9,.3,1)'}); }); }
  /* change what the panel shows: what's leaving fades first, then the rest moves over */
  function pkMode(mode,opt){ var box=$('tpk'); if(!box) return; var keep={who:1,x:1,has:1}; if(opt!=null) keep['o'+opt]=1;
    var go=function(){ PK.mode=mode; PK.opt=mode==='swap'?opt:null; pkRender(true); };
    if(still){ go(); return; }
    $$('[data-key]',box).forEach(function(e){ if(!keep[e.getAttribute('data-key')]&&e.animate) e.animate([{opacity:1},{opacity:0,transform:'translateY(8px)'}],{duration:160,fill:'forwards',easing:'ease-in'}); });
    setTimeout(go,170); }
  function pkErr(e){ PK.busy=false; var m=String(e&&e.message||''); toast(errText(e),true);
    if(m==='full'&&PK.opt!=null){ PK.mode='swap'; pkRender(true); return; }
    if(m==='no pick'||m==='bad option'){ pickClose(); soon(200); return; }
    if(m==='bad replace') soon(200);
    PK.mode='pick'; PK.opt=null; pkRender(true); soon(400); }
  /* the picked card shrinks into its place in the list (an empty slot, or over the one it replaces) while the server is told */
  function pkTake(i,rep){ var m=M(PK.id), box=$('tpk'), p=pickOf(m); if(!m||!p||PK.busy) return; var o=p.options[i], kind=kindOf(o), l=has(m,kind), id=m.id;
    PK.busy=true; clearTimeout(PK.armT);
    var card=box.querySelector('[data-key="o'+i+'"]'), slot=box.querySelector('[data-slot="'+kind+(rep!=null?rep:l.length)+'"]'), oldCard=rep!=null?box.querySelector('[data-key="h'+kind+rep+'"]'):null;
    var call=(api?api.pick(id,i,rep!=null?l[rep].name:null):demo.pick(id,i,rep!=null?l[rep].name:null)), shown=new Promise(function(ok){ setTimeout(ok,still?0:560); });
    if(!still){ $$('.tpc',box).forEach(function(c){ if(c!==card&&c.animate) c.animate([{opacity:1},{opacity:0,transform:c===oldCard?'translateY(26px) rotate(6deg)':'translateY(10px)'}],{duration:c===oldCard?420:220,fill:'forwards',easing:'ease-in'}); c.disabled=true; });
      var ar=box.querySelector('.tpka'); if(ar&&ar.animate) ar.animate([{opacity:1},{opacity:0}],{duration:160,fill:'forwards'});
      if(card&&slot&&card.animate){ var a=card.getBoundingClientRect(), b=slot.getBoundingClientRect(); slot.classList.add('take');
        card.animate([{transformOrigin:'0 0',transform:'none',opacity:1},{transformOrigin:'0 0',transform:'translate('+(b.left-a.left)+'px,'+(b.top-a.top)+'px) scale('+(b.width/a.width).toFixed(3)+','+(b.height/a.height).toFixed(3)+')',opacity:.25}],{duration:520,delay:rep!=null?120:0,fill:'forwards',easing:'cubic-bezier(.5,0,.3,1)'}); } }
    Promise.all([call,shown]).then(function(r){ var j=r[0], st=j&&j.state&&j.state.members?j.state:j;
      /* the list with the new one in it shows for a moment, then the panel goes */
      var mm=M(id), list; if(mm&&!has(mm,kind).some(function(x){ return x.name===o.name; })){ list=has(mm,kind).slice(); if(rep!=null) list[rep]={name:o.name,line:o.line}; else list.push({name:o.name,line:o.line}); if(kind==='ability') mm.abilities=list; else mm.moves=list; } if(mm) mm.pick=null;
      var hasEl=box.querySelector('.tpkhas'); if(hasEl&&mm){ hasEl.innerHTML=pkHas(mm); var ns=hasEl.querySelector('[data-slot="'+kind+(rep!=null?rep:l.length)+'"]'); if(ns) once2(ns,'pop'); }
      var row=box.querySelector('.tpkrow'), tt=box.querySelector('.tpkt'); if(tt) tt.innerHTML='<b>'+esc(m.name)+'</b> picked <b>'+esc(o.name)+'</b>!'; if(row) row.classList.add('done'); var xx=box.querySelector('.tpkx'); if(xx) xx.style.visibility='hidden';
      if(box.classList.contains('narrow')) box.scrollIntoView({block:'nearest',behavior:still?'auto':'smooth'});
      setTimeout(function(){ if(st&&st.members) stateIn(st); else soon(200); PK.busy=false; if(PK.id===id) pickClose(); },still?0:1100);
    },function(e){ shown.then(function(){ pkErr(e); }); }); }
  function pickAct(act,el){ var m=M(PK.id), p=pickOf(m); if(!m||!p){ pickClose(); return; } if(PK.busy) return;
    if(act==='pkclose'){ pickClose(); return; }
    if(act==='pkskip'){ if(PK.arm&&Date.now()-PK.arm<3500){ PK.busy=true; clearTimeout(PK.armT);
        (api?api.skip(m.id):demo.skip(m.id)).then(function(j){ var st=j&&j.state&&j.state.members?j.state:j; m.pick=null; PK.busy=false; pickClose(); if(st&&st.members) stateIn(st); else soon(200); },function(e){ pkErr(e); });
        return; }
      PK.arm=Date.now(); el.textContent='Skip this pick?'; el.classList.add('arm'); clearTimeout(PK.armT); PK.armT=setTimeout(function(){ PK.arm=0; if(el.isConnected){ el.textContent='Skip'; el.classList.remove('arm'); } },3500); return; }
    if(act==='pkpick'){ var i=+el.getAttribute('data-i'), o=p.options[i]; if(!o) return; var kind=kindOf(o);
      if(has(m,kind).length>=CAP[kind]) pkMode('swap',i); else pkTake(i,null); return; }
    if(act==='pkback'){ pkMode('pick',PK.opt); return; }
    if(act==='pkswap'){ pkTake(PK.opt,+el.getAttribute('data-n')); return; } }

  /* ---------------------------------------------------------------- start */
  var demo=null;
  window.CDTEAM={S:S,draw:draw,stateIn:stateIn,poll:poll,api:api,setDemo:function(d){ demo=d; }};
  if(DEMO){ var s=document.createElement('script'); s.src=BASE+'team-demo.js?v='+VER+'.9'; s.onload=function(){ if(window.CDTEAM_DEMO){ demo=window.CDTEAM_DEMO(stateIn,X); } }; document.head.appendChild(s); }
  else { var wait=function(){ if(me()) poll(); else setTimeout(wait,1500); }; setTimeout(wait,800); }
})();
