/* Chat Dungeon: the Bag (side tab beside Chat). Holds the rare items a viewer wins in the dungeon; for now that means
   evolver beans. Loaded by the streamer page (404.html), which hands over its helpers as window.CDX.
   Nothing shows until the database answers bag_state with on:true, or the page is opened with ?bag=demo (pretend items, no calls).
   Database (not built yet): bag_state(q_name,q_token) -> {on, items:[{id, kind:'bean', look:'b01'}]}, bag_use(q_name,q_token,q_item,q_card).
   The bean pictures are drawn in code: one 40x40 pixel sprite per look, animated. Design page: /mnt/project-files/evolver-beans. */
(function(){
  'use strict';
  var SRC=document.currentScript&&document.currentScript.src||'/bag.js';
  if(!window.CDX){ document.addEventListener('cdx',function go(){ document.removeEventListener('cdx',go); var sc=document.createElement('script'); sc.src=SRC; document.head.appendChild(sc); }); return; }
  if(window.CDBAG) return;
  (function(){ var m=SRC.match(/[?&]v=([\w.-]+)/), l=document.createElement('link'); l.rel='stylesheet'; l.href=SRC.replace(/bag\.js.*$/,'')+'bag.css?v='+(m?m[1]:'1'); document.head.appendChild(l); })();

  /* ---------------------------------------------------------------- the bean sprites */
var W=40,H=40,OUT='#140c10',SHADOW='#0a0705';
var still=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
function hash(x,y,s){var v=Math.sin(x*127.1+y*311.7+(s||0)*74.7)*43758.5453;return v-Math.floor(v);}

/* ---------- a 40x40 layer of colour names ---------- */
function Layer(){this.p=new Array(W*H);for(var i=0;i<W*H;i++)this.p[i]=null;}
Layer.prototype.set=function(x,y,c){x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<W&&y<H&&c)this.p[y*W+x]=c;};
Layer.prototype.get=function(x,y){x=Math.round(x);y=Math.round(y);return(x>=0&&y>=0&&x<W&&y<H)?this.p[y*W+x]:null;};
Layer.prototype.outline=function(c){var o=[],p=this.p;for(var y=0;y<H;y++)for(var x=0;x<W;x++){var i=y*W+x;if(p[i])continue;
  if((x>0&&p[i-1])||(x<W-1&&p[i+1])||(y>0&&p[i-W])||(y<H-1&&p[i+W]))o.push(i);}
  for(var k=0;k<o.length;k++)p[o[k]]=c;return this;};
Layer.prototype.onto=function(d){for(var i=0;i<W*H;i++)if(this.p[i])d.p[i]=this.p[i];};
function line(L,x0,y0,x1,y1,c){x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
  var dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,e=dx+dy,n=0;
  for(;;){L.set(x0,y0,typeof c==='function'?c(x0,y0,n):c);n++;if(x0===x1&&y0===y1)break;var e2=2*e;if(e2>=dy){e+=dy;x0+=sx;}if(e2<=dx){e+=dx;y0+=sy;}}}
function shadow(G,cx,y,hw,c){c=c||SHADOW;hw=Math.round(hw);for(var d=-hw;d<=hw;d++){G.set(cx+d,y,c);if(Math.abs(d)<hw-2)G.set(cx+d,y+1,c);}}

/* ---------- the two body shapes ---------- */
var A0=-142*Math.PI/180,A1=-38*Math.PI/180,BR=8,BC=6.5;
function beanSD(u,v){var dx=u,dy=v-BC,a=Math.atan2(dy,dx),d,s;
  if(a>=A0&&a<=A1){d=Math.abs(Math.sqrt(dx*dx+dy*dy)-BR);s=(a-A0)/(A1-A0);}
  else{var e0=Math.hypot(u-BR*Math.cos(A0),dy-BR*Math.sin(A0)),e1=Math.hypot(u-BR*Math.cos(A1),dy-BR*Math.sin(A1));if(e0<e1){d=e0;s=0;}else{d=e1;s=1;}}
  return d-(5.5+1.0*s);}
function smin(a,b,k){var h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;}
function boneSD(u,v){var d=Math.hypot(Math.max(Math.abs(u)-6.5,0),v)-3.6;
  for(var a=-1;a<=1;a+=2)for(var b=-1;b<=1;b+=2)d=smin(d,Math.hypot(u-a*7.8,v-b*3.1)-3.9,2.5);
  return Math.max(d,-(Math.hypot(u-11.6,v-6.6)-3.9));}
var BEAN={sd:beanSD,R:6,rot:-0.3,anchor:[4.2,-6.6],sprout:true,name:'bean'};
var TREAT={sd:boneSD,R:4.6,rot:-0.35,anchor:[-1,-3.2],sprout:false,name:'treat'};
var LX=-0.45,LY=-0.65,LZ=0.61;

function body(L,o){var F=o.form,rot=o.rot==null?F.rot:o.rot,k=o.k||1,sx=(o.sx||1)*k,sy=(o.sy||1)*k,c=Math.cos(rot),s=Math.sin(rot),m=Math.min(sx,sy),cx=o.cx,cy=o.cy,ramp=o.ramp;
  function sd(x,y){var px=x-cx,py=y-cy;return F.sd((px*c+py*s)/sx,(-px*s+py*c)/sy)*m;}
  var info=o.info||{mask:new Uint8Array(W*H),tone:new Int8Array(W*H),depth:new Float32Array(W*H)};
  info.cx=cx;info.cy=cy;info.world=function(u,v){return[cx+(u*sx*c-v*sy*s),cy+(u*sx*s+v*sy*c)];};
  for(var y=0;y<H;y++)for(var x=0;x<W;x++){var d=sd(x,y);if(d>=0)continue;
    var t=Math.min(1,-d/(F.R*m)),gx=sd(x+.5,y)-sd(x-.5,y),gy=sd(x,y+.5)-sd(x,y-.5),gl=Math.hypot(gx,gy)||1,q=1-t,nz=Math.sqrt(1-q*q);
    var lum=gx/gl*q*LX+gy/gl*q*LY+nz*LZ,tone=lum>.9?4:lum>.64?3:lum>.25?2:lum>-.08?1:0,i=y*W+x;
    info.mask[i]=1;info.tone[i]=tone;info.depth[i]=t;if(ramp)L.set(x,y,ramp[tone]);}
  return info;}
function edge(info,ang){var dx=Math.cos(ang),dy=Math.sin(ang),r=0;for(;r<30;r+=.5){var x=Math.round(info.cx+dx*r),y=Math.round(info.cy+dy*r);if(x<0||y<0||x>=W||y>=H||!info.mask[y*W+x])break;}return r;}

/* the shared sprout: one stem, one curl, one leaf */
var SPROUT=['..ggg....','.g...g...','.g.g.g.Ll','.gg..gLLl','.....gLl.','.....g...','.....g...'];
var GREEN={g:'#4aa83e',L:'#86dc5c',l:'#2f7d32'};
function sprout(L,ax,ay,pal){pal=pal||GREEN;for(var r=0;r<SPROUT.length;r++)for(var c=0;c<9;c++){var ch=SPROUT[r][c];if(ch!=='.')L.set(ax+c-5,ay+r-6,pal[ch]);}}

/* one item (or several merged into one blob): sprout behind, shaded body, black outline */
function item(G,list){if(!list.length)list=[list];var B=new Layer(),S=new Layer(),info=null,infos=[];
  for(var i=0;i<list.length;i++){var o=list[i];o.info=null;info=body(B,o);infos.push(info);
    var a=info.world(o.form.anchor[0],o.form.anchor[1]);info.ax=Math.round(a[0]);info.ay=Math.round(a[1]);
    if(o.form.sprout&&o.sprout!==false)sprout(S,info.ax,info.ay,o.sproutPal);
    if(o.deco)o.deco(B,info);}
  S.outline(OUT);S.onto(G);B.outline(OUT);B.onto(G);infos[0].all=infos;return infos[0];}

/* ---------- colour ramps: deep shadow, shadow, mid, light, shine ---------- */
var R={
  chestnut:['#33170f','#532a18','#7a4a26','#a3703a','#d9ac6c'],
  sky:['#4f5596','#7c86c8','#a9b5ea','#d5defb','#ffffff'],
  glass:['#240a0b','#451410','#6b2214','#8f3419','#ffe2b0'],
  navy:['#121430','#1f2356','#323a84','#5661b6','#a3aef2'],
  rubber:['#74103f','#b01c62','#e63d8c','#ff82ba','#fff0f7'],
  void:['#06040c','#110b20','#1d1436','#32235a','#7458c0'],
  teal:['#073a42','#0e686c','#18a299','#62dac6','#dafff4'],
  green:['#153a19','#256128','#3d9237','#78c653','#dbf8a4'],
  steel:['#1c2027','#38404c','#657080','#9ba6b6','#eef2f7'],
  kidney:['#2c090d','#541017','#811b21','#b23c35','#f3ad96'],
  bomb:['#090a10','#161824','#272b3d','#444a66','#aeb6dc'],
  hot:['#2a0606','#5a0c0c','#8f1c12','#cf452c','#ffc8a8'],
  rain:['#6a4706','#a6770e','#e2b31c','#ffdb4e','#fff8c8']
};

/* ---------- the beans ---------- */
function spiky(G,t,F){shadow(G,20,34,11);
  item(G,{cx:20,cy:24,form:F,ramp:R.chestnut,deco:function(B,info){
    var n=13,glint=Math.floor(t*2.5)%n;
    for(var i=0;i<n;i++){var a=i/n*Math.PI*2+.25,e=edge(info,a),dx=Math.cos(a),dy=Math.sin(a);
      if(a>1.0&&a<2.1)continue; /* keep the notch underneath clear */
      for(var k=0;k<5;k++){var x=info.cx+dx*(e+k-1),y=info.cy+dy*(e+k-1),c=k>=4?(i===glint?'#ffffff':'#f6ecc8'):k>=2?'#d8c492':'#a88d5c';
        B.set(x,y,c);if(k<2){B.set(x-dy,y+dx,'#8a7048');B.set(x+dy,y-dx,'#c9b27e');}}}
    var st=[[-7,0],[-2,-4],[3,-3],[7,-4],[0,1],[9,0]];
    for(var j=0;j<st.length;j++){var w=info.world(st[j][0],st[j][1]);B.set(w[0],w[1],'#f6ecc8');B.set(w[0]+1,w[1]+1,'#33170f');B.set(w[0]+1,w[1],'#a88d5c');}
  }});}

function floats(G,t,F){var bob=Math.round(Math.sin(t*2.2)*1.6),cy=16+bob;
  shadow(G,20,35,6-(bob<0?1:0));
  for(var i=0;i<4;i++){var ph=(t*.35+i*.27)%1,x=[7,13,28,34][i],y=34-ph*13;if(ph<.85||hash(i,Math.floor(t*10),1)>.5){G.set(x,y,'#b9a67c');G.set(x+1,y,'#8d7b5a');G.set(x,y+1,'#8d7b5a');G.set(x+1,y+1,'#5a4a30');}}
  item(G,{cx:20,cy:cy,form:F,ramp:R.sky});
  }

function fire(G,t,F){shadow(G,20,34,11);shadow(G,20,34,6,'#3a1a0a');
  var fr=Math.floor(t*10),ember=hash(fr,1,2)>.4?'#ff8a2a':'#c8401a';
  var info=item(G,{cx:20,cy:24,form:F,ramp:R.glass,sproutPal:{g:'#3a322c',L:'#57493f',l:'#241f1b'}});
  var fx0=info.cx+1,base=info.cy+3,flame=new Layer();
  for(var y=base-11;y<=base;y++)for(var x=fx0-6;x<=fx0+6;x++){var i=y*W+x;if(!info.mask[i]||info.depth[i]<.3)continue;
    var fy=base-y,top=8.5+hash(fr,3,4)*2,lean=Math.sin(t*7+fy*.8)*fy*.14,w=4.4*Math.pow(Math.max(0,1-fy/top),.75)+(hash(x,y,fr)-.5)*.9,ax=Math.abs(x-fx0-lean);
    if(fy<0||fy>top||ax>w)continue;
    flame.set(x,y,ax<w*.32&&fy<top*.55?'#fff6c0':ax<w*.68&&fy<top*.8?'#ffc53a':fy>top*.75?'#e2531b':'#ff8420');}
  for(y=0;y<H;y++)for(x=0;x<W;x++){i=y*W+x;if(!info.mask[i]||flame.p[i])continue;
    if(flame.get(x-1,y)||flame.get(x+1,y)||flame.get(x,y-1)||flame.get(x,y+1))G.set(x,y,'#b8481c');
    else if(info.depth[i]>.3&&info.tone[i]<4&&Math.hypot(x-fx0,y-base+4)<8)G.set(x,y,info.tone[i]>=2?'#8f3419':'#6b2214');}
  for(i=0;i<W*H;i++)if(flame.p[i]&&info.tone[i]<4)G.p[i]=flame.p[i];
  G.set(info.ax-2,info.ay-4,ember);
  var sp=(t*1.2)%1;G.set(info.ax-3+Math.round(Math.sin(t*5)),info.ay-6-sp*5,sp<.7?'#ffb23a':'#7a3a1a');}

function laser(G,t,F){var tr=F===TREAT,cx=17,cy=tr?25:24;shadow(G,cx,34,11);
  var info=item(G,{cx:cx,cy:cy,form:F,ramp:R.navy});
  var e=info.world(tr?0:-1,tr?0:.5),ex=Math.round(e[0]),ey=Math.round(e[1]),rx=tr?3:4,ry=tr?2:3;
  var cyc=t%3.6,firing=cyc>2.2&&cyc<3.0,charge=cyc>1.75&&cyc<=2.2,blink=cyc>.85&&cyc<1.0,fr=Math.floor(t*10);
  for(var dy=-ry-2;dy<=ry+2;dy++)for(var dx=-rx-2;dx<=rx+2;dx++){var q=Math.pow(dx/(rx+.4),2)+Math.pow(dy/(ry+.4),2),q2=Math.pow(dx/(rx+1.5),2)+Math.pow(dy/(ry+1.5),2);
    if(q<=1)G.set(ex+dx,ey+dy,blink?R.navy[2]:(dy>=ry?'#bdb6d0':'#f6f2e8'));else if(q2<=1)G.set(ex+dx,ey+dy,OUT);}
  if(blink){for(dx=-rx;dx<=rx;dx++)G.set(ex+dx,ey+1,OUT);return;}
  var ix=(firing||charge)?1:Math.round(Math.sin(t*1.7)*(rx-2)),iy=(firing||charge)?(tr?0:1):0;
  for(dy=-1;dy<=1;dy++)for(dx=-1;dx<=1;dx++)G.set(ex+ix+dx,ey+iy+dy,(charge||firing)?'#ff3a3a':'#d81e2c');
  G.set(ex+ix,ey+iy,firing?'#ffffff':charge?'#ffd0c0':'#2a0306');
  if(!firing&&!charge)G.set(ex+ix-1,ey+iy-1,'#ffb0b0');
  if(charge&&fr%2){G.set(ex-rx-2,ey-ry-1,'#ff5a4a');G.set(ex+rx+2,ey-ry-1,'#ff5a4a');G.set(ex-rx-2,ey+ry+1,'#ff5a4a');G.set(ex+rx+2,ey+ry+1,'#ff5a4a');}
  var tx=37,ty=35;
  if(firing){line(G,ex+ix+1,ey+iy+1,tx,ty+1,'#c8141e');line(G,ex+ix,ey+iy-1,tx,ty-1,fr%2?'#ff5a4a':'#c8141e');
    line(G,ex+ix,ey+iy,tx,ty,fr%2?'#ffffff':'#ffd0c0');
    for(var s=0;s<5;s++)G.set(tx-3+hash(s,fr,5)*6,ty-4+hash(s,fr,6)*5,s%2?'#ffd27a':'#ffffff');}
  if(cyc>=2.2){G.set(tx-1,ty+1,'#050303');G.set(tx,ty+1,'#050303');G.set(tx+1,ty+1,'#050303');}
  if(cyc>=3.0){G.set(tx,ty,cyc<3.3?'#ff7a1e':'#3a1a12');var up=(cyc-3)*14;G.set(tx+Math.round(Math.sin(up)),ty-1-up,'#7a7088');G.set(tx-1+Math.round(Math.sin(up+1)),ty-4-up,'#4a4458');}}

function bounce(G,t,F){var ph=(t%.9)/.9,hgt=14*4*ph*(1-ph),land=ph<.09||ph>.91,fast=!land&&(ph<.3||ph>.7);
  var sx=land?1.2:fast?.93:1,sy=land?.76:fast?1.1:1,cy=26-hgt+(land?2:0);
  shadow(G,20,35,Math.max(4,11-hgt*.45));
  if(land){G.set(6,35,'#b9a67c');G.set(4,34,'#8d7b5a');G.set(34,35,'#b9a67c');G.set(36,34,'#8d7b5a');}
  else if(ph<.22){G.set(5-ph*10,33-ph*8,'#8d7b5a');G.set(35+ph*10,33-ph*8,'#8d7b5a');}
  item(G,{cx:20,cy:Math.round(cy),sx:sx,sy:sy,form:F,ramp:R.rubber});}

function ultimate(G,t,F){var tr=F===TREAT,fr=Math.floor(t*10),bob=Math.round(Math.sin(t*1.6)),cx=20,cy=21+bob,pulse=(Math.sin(t*5)+1)/2;
  shadow(G,20,35,9,'#3a2408');shadow(G,20,35,5,'#7a5210');
  /* shards lifted off the floor, circling */
  for(var i=0;i<6;i++){var a=i/6*Math.PI*2+t*.7,x=cx+Math.cos(a)*17,y=cy+2+Math.sin(a)*10+Math.sin(t*2+i);
    G.set(x,y,'#32235a');G.set(x+1,y,'#110b20');G.set(x,y-1,'#7458c0');if(i%2)G.set(x+1,y+1,'#110b20');}
  var info=item(G,{cx:cx,cy:cy,form:F,ramp:R.void,sproutPal:{g:'#ffd84a',L:'#fffbe0',l:'#e09a1e'}});
  /* light leaking out past the shell */
  var rays=[-2.7,-2.0,-1.2,-.45,.25,2.9,3.6];
  for(i=0;i<rays.length;i++){if(hash(i,fr,9)<.3)continue;var e=edge(info,rays[i]),len=3+Math.round(pulse*3+hash(i,fr,8)*2),dx=Math.cos(rays[i]),dy=Math.sin(rays[i]);
    for(var k=2;k<2+len;k++){if(k%3===1)continue;G.set(cx+dx*(e+k),cy+dy*(e+k),k>len-1?'#b07aff':'#ffe98a');}}
  /* the cracks */
  var sv=tr?.42:1,su=tr?.9:1,C=new Layer(),cr=[[[-10,-1],[-6,1],[-3,-3],[0,-1],[2,-5],[5,-3],[9,-6]],[[-3,-3],[-5,-7]],[[0,-1],[1,3]],[[2,-5],[4,-9]],[[5,-3],[8,0],[7,4]],[[-6,1],[-8,4]]];
  for(i=0;i<cr.length;i++)for(k=0;k<cr[i].length-1;k++){var p=info.world(cr[i][k][0]*su,cr[i][k][1]*sv),q=info.world(cr[i][k+1][0]*su,cr[i][k+1][1]*sv);line(C,p[0],p[1],q[0],q[1],'c');}
  for(y=0;y<H;y++)for(x=0;x<W;x++){var j=y*W+x;if(!info.mask[j])continue;
    if(C.p[j])G.p[j]=pulse>.45?'#fffbe0':'#ffd84a';
    else if(C.get(x-1,y)||C.get(x+1,y)||C.get(x,y-1)||C.get(x,y+1))G.p[j]=pulse>.45?'#d9901c':'#8a4a12';}
  /* a stray arc to the floor */
  var cyc=t%1.7;if(cyc<.2){var x0=cx+(hash(Math.floor(t/1.7),1,3)>.5?9:-9),yy=cy+6,xx=x0;for(;yy<35;yy++){xx+=Math.round((hash(yy,fr,4)-.5)*2.6);G.set(xx,yy,'#f0e4ff');}}}

function invisible(G,t,F){shadow(G,20,34,11);
  var T=new Layer(),info=body(T,{cx:20,cy:24,form:F,ramp:R.sky});T.outline(OUT);
  var a=info.world(F.anchor[0],F.anchor[1]),S=new Layer();sprout(S,Math.round(a[0]),Math.round(a[1]));S.outline(OUT);
  var st=Math.floor(t*5);
  for(var y=0;y<H;y++)for(var x=0;x<W;x++){var i=y*W+x;
    if(T.p[i]===OUT){if((x+y*2+st)%3!==0)G.set(x,y,(x+y*2+st)%3===1?'#8f86a6':'#4e4760');}
    else if(info.mask[i]){var band=((x-y*.6+t*16)%46+46)%46;if(info.tone[i]>=3&&band<5)G.set(x,y,info.tone[i]===4?'#f2eefa':'#6e6480');
      else if(info.tone[i]===4&&(st%7)<2)G.set(x,y,'#b9b0cc');}}
  S.onto(G);}

function teleport(G,t,F){var A={cx:14,cy:25},B={cx:26,cy:21},cyc=t%3.2,fr=Math.floor(t*10),va,vb;
  if(cyc<1.1){va=1;vb=0;}else if(cyc<1.5){vb=(cyc-1.1)/.4;va=1-vb;}else if(cyc<2.8){va=0;vb=1;}else{va=(cyc-2.8)/.4;vb=1-va;}
  function at(P,vis){if(vis<=0)return;shadow(G,P.cx,P.cy+10,Math.round(11*vis));
    var T=new Layer();item(T,{cx:P.cx,cy:P.cy,form:F,ramp:R.teal});
    for(var y=0;y<H;y++)for(var x=0;x<W;x++){var c=T.p[y*W+x];if(!c)continue;var h=hash(x,y,7);
      if(vis>=1){G.set(x,y,c);continue;}
      if(h<vis)G.set(x,y-Math.round((1-vis)*5*hash(x,3,1)),h>vis-.2?'#dafff4':c);
      else if(hash(x,fr,2)>.93)G.set(x,y-Math.round((1-vis)*9),'#62dac6');}}
  at(A,va);at(B,vb);
  var gone=va===0?A:vb===0?B:null;
  if(gone){for(var i=0;i<4;i++)if(hash(i,fr,11)>.6)G.set(gone.cx-9+hash(i,Math.floor(t*3),12)*18,gone.cy-7+hash(i,Math.floor(t*3),13)*13,'#18a299');}}

function clones(G,t,F){var cyc=t%3.6,p=cyc<1?0:cyc<1.7?(cyc-1)/.7:1,dx=Math.round(p*9),k=1-.32*p,hop=p===1?Math.round(Math.abs(Math.sin(t*5))*1.2):0;
  var cy=24+Math.round(p*3);
  if(p===0){shadow(G,20,34,11);}else{shadow(G,20-dx,35,Math.round(11*k));shadow(G,20+dx,35,Math.round(11*k));}
  if(cyc>2.5){var up=Math.min(1,(cyc-2.5)/.25);item(G,{cx:20,cy:Math.round(23-up*8),k:.5,form:F,ramp:R.green});}
  if(p===0)item(G,{cx:20,cy:cy,form:F,ramp:R.green,sx:1+Math.max(0,cyc-.6)*.25});
  else item(G,[{cx:20-dx,cy:cy-hop,k:k,form:F,ramp:R.green},{cx:20+dx,cy:cy-(p===1?1-hop:0),k:k,form:F,ramp:R.green}]);}

function magnetic(G,t,F){shadow(G,20,34,11);var fr=Math.floor(t*6);
  var info=item(G,{cx:20,cy:24,form:F,ramp:R.steel});
  /* iron filings standing on end at both poles */
  for(var i=0;i<22;i++){var side=i<11?Math.PI:0,a=side+F.rot+((i%11)-5)*.19,e=edge(info,a),len=2+Math.round(hash(i,1,1)*2+Math.sin(t*4+i)*.6),dx=Math.cos(a),dy=Math.sin(a);
    for(var k=1;k<=len;k++)G.set(info.cx+dx*(e+k),info.cy+dy*(e+k),k===len?'#c4ccd8':'#6f7888');}
  function nail(x0,y0,x1,y1){line(G,x0+1,y0+1,x1+1,y1+1,'#1c2027');line(G,x0,y0,x1,y1,'#dfe4ea');G.set(x0,y0-1,'#dfe4ea');G.set(x0+1,y0,'#9ba6b6');G.set(x0-1,y0,'#dfe4ea');}
  var a1=info.world(-8,-9),b1=info.world(-4,-3);nail(a1[0],a1[1],b1[0],b1[1]);
  var c=info.world(4,0);for(dy=-2;dy<=2;dy++)for(dx=-2;dx<=2;dx++){var d=Math.hypot(dx,dy);if(d<2.4)G.set(c[0]+dx,c[1]+dy,d>1.6?'#7a5208':(dx+dy<0?'#fff0a0':'#e0b23a'));}
  var cyc=t%3.2,tip=info.world(8,-4),sx=39,sy=6;
  if(cyc>1.2){var q=Math.min(1,(cyc-1.2)/.35);q=q*q;var hx=tip[0]+(sx-tip[0])*(1-q),hy=tip[1]+(sy-tip[1])*(1-q);nail(hx+5,hy-4,hx,hy);
    if(q===1&&cyc<1.75){G.set(tip[0]-1,tip[1]-2,'#ffffff');G.set(tip[0]+2,tip[1]+1,'#ffffff');}}}

function giant(G,t,F){var cyc=t%2.6,sh=cyc<.3?(Math.floor(t*20)%2?1:-1):0,fr=Math.floor(t*10);
  item(G,{cx:19+sh,cy:29,k:1.6,form:F,ramp:R.kidney});
  if(cyc<.9)for(var i=0;i<5;i++){var x=3+hash(i,Math.floor(t/2.6),1)*34,y=cyc*26+hash(i,2,2)*8;if(y<12)G.set(x,y,i%2?'#b9a67c':'#6b5a3c');}}

function explodes(G,t,F){shadow(G,20,34,11);var fr=Math.floor(t*10),tick=(t%.8)<.14;
  var info=item(G,{cx:20,cy:tick?23:24,k:tick?1.05:1,form:F,ramp:tick?R.hot:R.bomb,sproutPal:{g:'#c9a56a',L:'#8a6a3a',l:'#5a4424'}});
  var sx=info.ax-2,sy=info.ay-4;
  G.set(sx,sy,'#ffffff');G.set(sx-1,sy,fr%2?'#ffb23a':'#fff3b0');G.set(sx+1,sy,fr%2?'#fff3b0':'#ffb23a');G.set(sx,sy-1,'#ffb23a');G.set(sx,sy+1,'#fff3b0');
  for(var i=0;i<5;i++){var a=hash(i,fr,3)*6.28,r=2+hash(i,fr,4)*4;G.set(sx+Math.cos(a)*r,sy+Math.sin(a)*r-1,i%2?'#ffd27a':'#e2531b');}}

function umbrella(G,t,F){var tr=F===TREAT,cx=20,cy=tr?28:27,fr=Math.floor(t*10);
  var B=new Layer(),info=body(B,{cx:cx,cy:cy,k:tr?.9:.8,form:F,ramp:R.rain});B.outline(OUT);
  var a=info.world(F.anchor[0],F.anchor[1]),ax=Math.round(a[0]),base=13,rx=13,ry=8;
  function roof(x){var nx=(x-ax)/rx;return Math.abs(nx)>1?null:base-ry*Math.sqrt(1-nx*nx);}
  /* the floor: wet either side, dry underneath */
  for(var x=0;x<W;x++){if(Math.abs(x-ax)>rx-1){G.set(x,36,'#1d3350');if((x+Math.floor(t*4))%5<3)G.set(x,35,'#2b4a72');}}
  shadow(G,cx,35,8);
  /* rain */
  for(var i=0;i<34;i++){var sp=20+hash(i,1,1)*10,y=((t*sp+hash(i,2,2)*60)%46)-5,x0=hash(i,3,3)*52-4,rxp=Math.round(x0-y*.22),top=roof(rxp);
    if(top!==null&&y>top-1){if(y<top+3){G.set(rxp-1,top-2,'#d6ecff');G.set(rxp+1,top-2,'#8fc3ff');}continue;}
    if(y>=34){G.set(rxp-1,34,'#d6ecff');G.set(rxp+1,34,'#d6ecff');G.set(rxp,33,'#8fc3ff');continue;}
    G.set(rxp,y,'#a9d2ff');G.set(rxp+.22,y-1,'#6fa3e6');G.set(rxp+.44,y-2,'#4a78c0');}
  /* drips off the two outer points */
  for(i=0;i<2;i++){var ph=(t*.9+i*.5)%1,dxp=ax+(i?rx:-rx),dy=base+1+ph*ph*21;if(dy<34){G.set(dxp,dy,'#d6ecff');G.set(dxp,dy-1,'#6fa3e6');}else{G.set(dxp-1,34,'#d6ecff');G.set(dxp+1,34,'#d6ecff');}}
  /* stem and canopy */
  var C=new Layer(),pal=tr?['#ff9cc8','#f6f2e8','#e63d8c','#d8d2c4','#b01c62']:['#86dc5c','#5cbf4a','#3f9a3c','#2f7d32','#1f5a24'],stem=tr?'#c9a56a':'#4aa83e';
  for(y=base;y<=a[1]+1;y++)C.set(ax,y,stem);
  for(y=base-ry;y<=base;y++)for(x=ax-rx;x<=ax+rx;x++){var nx=(x-ax)/rx,ny=(y-base)/ry;if(nx*nx+ny*ny>1)continue;
    if(y>base-2*Math.abs(Math.sin(Math.PI*(x-ax)/(rx/2))))continue;
    var w=Math.sqrt(Math.max(.0001,1-ny*ny)),u=nx/w,pn=Math.min(3,Math.floor((u+1)*2)),un=(x-1-ax)/rx/w,pp=Math.min(3,Math.floor((un+1)*2));
    C.set(x,y,(pn!==pp&&x>ax-rx)?pal[4]:pal[pn]);}
  C.set(ax,base-ry-1,stem);C.set(ax-4,base-ry+1,'#ffffff');C.set(ax-5,base-ry+2,'#ffffff');
  C.outline(OUT);B.onto(G);C.onto(G);}

  /* ---------------------------------------------------------------- the bag itself */
  /* What the database sends for a bean is only a look code. The hidden word never reaches the page. */
  var LOOKS={
    b01:[laser,'This bean watches you back. Wherever it looks for too long, something starts to smoke.',2.6],
    b02:[bounce,'This bean was dropped once, a long time ago. It still hasn’t settled.',.25],
    b03:[ultimate,'This bean is cracking from the inside. Whatever is in there has outgrown it.',.3],
    b04:[umbrella,'It is always raining on this bean. The bean is always dry.',.5],
    b05:[spiky,'This bean is hard as a nut and hurts to pick up.',0],
    b06:[floats,'Let go of this bean and it stays where your hand was.',0],
    b07:[fire,'This bean is warm. Something flickers inside it.',.2],
    b08:[explodes,'This bean ticks. Its sprout has caught a spark.',.3],
    b09:[invisible,'You can find this bean by its shadow, or by its sprout. Never by the bean.',.6],
    b10:[teleport,'Put this bean down and look away. It will be somewhere else.',.5],
    b11:[clones,'There was one bean in the bag. Count again.',3],
    b12:[magnetic,'Keep this bean away from your keys. And your sword.',2],
    b13:[giant,'The sprout on this bean is the normal size. The bean is not.',1]
  };
  var cache={};
  function rgb(c){ var v=cache[c]; if(!v){ var n=parseInt(c.slice(1),16); v=cache[c]=[n>>16&255,n>>8&255,n&255]; } return v; }
  function paint(cv,look,t){ var L=LOOKS[look]; if(!L||!cv) return; var ctx=cv._c||(cv._c=cv.getContext('2d')), img=cv._i||(cv._i=ctx.createImageData(W,H)), G=new Layer(), d=img.data;
    try{ L[0](G,t+L[2],BEAN); }catch(e){ return; }
    for(var i=0,j=0;i<W*H;i++,j+=4){ var c=G.p[i]; if(c){ var v=rgb(c); d[j]=v[0]; d[j+1]=v[1]; d[j+2]=v[2]; d[j+3]=255; } else d[j+3]=0; }
    ctx.putImageData(img,0,0); }

  var X=window.CDX, URLDEMO=/[?&]bag=demo\b/.test(location.search), TESTERS={mottatester:1};
  /* pretend beans: with ?bag=demo, or when signed in as a test name. Nothing is saved and nothing calls the database. */
  function demoOn(){ return URLDEMO||TESTERS[String(X.me||'').toLowerCase()]===1; }
  var view=document.querySelector('.sview[data-view="bag"]'), tab=document.querySelector('.stabs [data-side="bag"]');
  if(!view||!tab) return;
  var esc=X.esc;
  function me(){ return X.me||''; }
  function phone(){ return typeof X.phone==='function'?X.phone():false; }
  var S={on:false,items:[],sel:null,step:null,target:null,busy:false,msg:'',note:'',seen:{}};
  try{ S.seen=JSON.parse(localStorage.getItem('cdBagSeen')||'{}')||{}; }catch(e){}
  var demoItems=['b01','b04','b03','b02','b07','b09','b12','b05','b06','b08','b10','b11','b13'].map(function(k,i){ return {id:'d'+i,kind:'bean',look:k}; });
  var api={
    state:function(){ return demoOn()?Promise.resolve({on:true,items:demoItems.slice()}):X.rpc('bag_state',X.withTok({q_name:me()})); },
    use:function(item,card){ if(demoOn()){ demoItems=demoItems.filter(function(x){ return x.id!==item; }); return new Promise(function(ok){ setTimeout(function(){ ok({ok:true}); },700); }); }
      return X.rpc('bag_use',X.withTok({q_name:me(),q_item:item,q_card:card})); }
  };
  var ERR={'no item':'That item isn’t in your bag any more.','no card':'That creature isn’t yours.','busy':'It can’t eat while it’s in the dungeon.','not hatched':'It hasn’t hatched yet.','final':'It has already reached its final form.','no account':'Make an account first.'};
  function errText(e){ var m=String(e&&e.message||''); return ERR[m]||(!m||e instanceof TypeError?'Couldn’t reach the server. Try again.':'Server said: '+m.slice(0,100)); }
  function bagItem(id){ for(var i=0;i<S.items.length;i++) if(S.items[i].id===id) return S.items[i]; return null; }
  function team(){ var T=window.CDTEAM&&window.CDTEAM.S; return T&&T.members?T.members.filter(function(m){ return m.slot!=null; }).sort(function(a,b){ return a.slot-b.slot; }):[]; }
  function spr(m){ return typeof m.sprite==='string'&&/^[A-Za-z0-9+\/]+=*$/.test(m.sprite)&&m.sprite.length<60000?'<img class="bag-spr" alt="" width="48" height="48" src="data:image/png;base64,'+m.sprite+'">':'<span class="bag-spr">'+X.pix(m.egg?'cards':'enemy',40)+'</span>'; }
  function why(m){ return m.egg?'Not hatched yet':(m.out||m.status==='out')?'In the dungeon':''; }

  function stateIn(d){ var was=S.on; S.on=!!(d&&d.on); S.items=(d&&d.items||[]).filter(function(x){ return x&&LOOKS[x.look]; });
    if(S.sel&&!bagItem(S.sel)){ S.sel=null; if(S.step!=='done') S.step=null; }
    tab.hidden=!S.on; if(!S.on&&X.sideNow==='bag') X.sideTab('chat');
    dot(); if(!drag&&(open()||was!==S.on)) draw(); }
  function dot(){ var n=S.items.filter(function(x){ return !S.seen[x.id]; }).length, el=tab.querySelector('.dot'); if(n&&!open()){ if(!el){ el=document.createElement('i'); el.className='dot'; tab.appendChild(el); } } else if(el) el.remove(); }
  function open(){ return !view.hidden; }
  function seeAll(){ var ch=false; S.items.forEach(function(x){ if(!S.seen[x.id]){ S.seen[x.id]=1; ch=true; } }); if(ch){ try{ localStorage.setItem('cdBagSeen',JSON.stringify(S.seen)); }catch(e){} } dot(); }
  function poll(){ if(S.busy) return; var p; try{ p=api.state(); }catch(e){ return; } if(!p||!p.then) return; p.then(stateIn,function(){ /* no bag in the database yet: the tab stays hidden */ }); }

  function draw(){ if(!S.on){ view.innerHTML=''; return; }
    var it=S.sel&&bagItem(S.sel), h='';
    if(S.step==='done'){ h+='<div class="bag-card done"><p class="bag-big">Gulp.</p><p class="bag-line">'+esc(S.msg)+'</p><button type="button" class="bag-btn ghost" data-b="back">Back to the bag</button></div>'; }
    else if(it){ var L=LOOKS[it.look];
      h+='<div class="bag-card"><canvas class="bag-hero" width="40" height="40" data-look="'+it.look+'" role="img" aria-label="A bean"></canvas><div class="bag-info"><p class="bag-name">Bean</p><p class="bag-line">“'+esc(L[1])+'”</p>';
      if(!S.step) h+='<p class="bag-what">Feed it to a creature and it changes on the spot. What it turns into depends on the bean.</p><button type="button" class="bag-btn" data-b="feed">Feed to a creature</button>';
      h+='</div></div>';
      if(S.step==='pick'){ var T=team(); h+='<h3>Who eats it?</h3>';
        if(!T.length) h+='<p class="dim">You need a hatched creature on your team first.</p>';
        else { h+='<div class="bag-team">'; T.forEach(function(m){ var w=why(m); h+='<button type="button" class="bag-who" data-who="'+esc(String(m.id))+'"'+(w?' disabled':'')+'>'+spr(m)+'<b>'+esc(m.egg?'Egg':(m.name||'Creature'))+'</b>'+(w?'<i>'+w+'</i>':'')+'</button>'; }); h+='</div>'; }
        h+='<button type="button" class="bag-btn ghost" data-b="cancel">Not now</button>'; }
      if(S.step==='confirm'){ var m=who(S.target), nm=m?(m.name||'this creature'):'this creature';
        h+='<div class="bag-ask"><p><b>Feed this bean to '+esc(nm)+'?</b></p><p class="dim">'+esc(nm)+' changes right away and the bean is used up. This can’t be undone.</p><div class="bag-row"><button type="button" class="bag-btn" data-b="go"'+(S.busy?' disabled':'')+'>'+(S.busy?'Feeding…':'Feed it')+'</button><button type="button" class="bag-btn ghost" data-b="pick"'+(S.busy?' disabled':'')+'>Back</button></div>'+(S.msg?'<p class="bag-err">'+esc(S.msg)+'</p>':'')+'</div>'; } }
    if(S.step!=='pick'&&S.step!=='confirm'){
      h+='<h3>Your bag</h3>'; if(demoOn()) h+='<p class="dim">Test beans. Feeding one is pretend and nothing is saved.</p>';
      if(!S.items.length) h+='<div class="bag-empty">'+X.pix('bag',48)+'<p class="dim">Nothing in here yet. Rare finds from the dungeon land in your bag.</p></div>';
      else { h+='<div class="bag-grid">'; S.items.forEach(function(x){ h+='<button type="button" class="bag-it'+(x.id===S.sel?' on':'')+'" data-it="'+esc(String(x.id))+'" aria-label="Bean" aria-pressed="'+(x.id===S.sel)+'"><canvas width="40" height="40" data-look="'+x.look+'"></canvas></button>'; });
        for(var k=S.items.length;k<12;k++) h+='<span class="bag-it none"></span>';
        h+='</div>'; if(S.note) h+='<p class="bag-err">'+esc(S.note)+'</p>'; if(S.step!=='done') h+='<p class="dim">'+(teamOn()?(phone()?'Tap a bean for a closer look. Hold one and drag it onto a creature to feed it.':'Click a bean for a closer look. Drag one onto a creature on your team to feed it.'):'Tap a bean for a closer look.')+'</p>'; } }
    view.innerHTML=h; frame(); }
  function who(id){ var T=team(); for(var i=0;i<T.length;i++) if(String(T[i].id)===String(id)) return T[i]; return null; }

  view.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('button'); if(!b||b.disabled||justDragged) return;
    var it=b.getAttribute('data-it'), w=b.getAttribute('data-who'), a=b.getAttribute('data-b');
    if(it!=null){ S.sel=S.sel===it?null:it; S.step=null; S.msg=''; draw(); if(S.sel) view.scrollTop=0; return; }
    if(w!=null){ S.target=w; S.step='confirm'; S.msg=''; draw(); return; }
    if(a==='feed'){ if(typeof X.needAccount==='function'&&!X.account){ X.needAccount(); return; } S.step='pick'; draw(); }
    else if(a==='pick'){ S.step='pick'; S.msg=''; draw(); }
    else if(a==='cancel'){ S.step=null; draw(); }
    else if(a==='back'){ S.step=null; S.msg=''; draw(); }
    else if(a==='go'){ var m=who(S.target), nm=m?(m.name||'Your creature'):'Your creature'; S.busy=true; S.msg=''; draw();
      api.use(S.sel,S.target).then(function(){ S.busy=false; S.items=S.items.filter(function(x){ return x.id!==S.sel; }); S.sel=null; S.step='done'; S.msg=nm+' ate the bean and is starting to change. Watch the Team tab.'; draw(); setTimeout(poll,1500); if(window.CDTEAM&&window.CDTEAM.poll){ try{ window.CDTEAM.poll(); }catch(e2){} } },
        function(err){ S.busy=false; S.msg=errText(err); draw(); }); } });

  /* ---------------------------------------------------------------- drag a bean onto a creature (same feel as dragging a Collection card onto the team):
     a mouse drags after a small move, a finger presses and holds. The page shows the Team while the bean is in the air; letting go
     over a creature opens the "Feed this bean to ...?" question, anywhere else puts the bean back. */
  var drag=null, press=null, lp=null, justDragged=false;
  function teamOn(){ var T=window.CDTEAM&&window.CDTEAM.S; return !!(T&&T.on); }
  function onSpot(k){ var T=team(); for(var i=0;i<T.length;i++) if(T[i].slot===k) return T[i]; return null; }
  function spots(){ return [].slice.call(document.querySelectorAll('#tcamp .tspot')); }
  function markSpots(){ spots().forEach(function(p){ var m=onSpot(+p.getAttribute('data-k')), ok=!!(m&&!why(m)); p.classList.toggle('bag-ok',ok); p.classList.toggle('bag-no',!ok); }); }
  function clearSpots(){ document.documentElement.classList.remove('bagdrag'); spots().forEach(function(p){ p.classList.remove('bag-ok','bag-no','bag-hot'); }); }
  function showTeam(){ try{ if(phone()&&X.sideNow!=='rewards') X.sideTab('rewards'); if(X.ptNow!=='team') X.pTab('team'); }catch(e){}
    var camp=document.getElementById('tcamp'); if(camp&&!phone()){ var r=camp.getBoundingClientRect(); if(r.top<0||r.bottom>innerHeight) camp.scrollIntoView({block:'nearest',behavior:still?'auto':'smooth'}); } }
  function beginDrag(id,el,x,y){ var it=bagItem(id); if(!it||S.busy||!teamOn()) return;
    var g=document.createElement('div'); g.className='bag-ghost'; g.innerHTML='<canvas width="40" height="40"></canvas>'; document.body.appendChild(g); paint(g.firstChild,it.look,0);
    drag={id:id,el:el,g:g,hot:null,home:el.getBoundingClientRect()}; el.classList.add('lifted'); S.sel=id; S.step=null; S.msg='';
    if(navigator.vibrate) try{ navigator.vibrate(15); }catch(e){}
    document.documentElement.classList.add('bagdrag'); showTeam(); markSpots(); moveDrag(x,y); setTimeout(function(){ if(drag) markSpots(); },120); }
  function moveDrag(x,y){ if(!drag) return; drag.g.style.transform='translate('+(x-40)+'px,'+(y-48)+'px)'; markSpots();
    var hit=document.elementFromPoint(x,y), p=hit&&hit.closest&&hit.closest('#tcamp .tspot');
    if(p!==drag.hot){ if(drag.hot) drag.hot.classList.remove('bag-hot'); drag.hot=p; if(p) p.classList.add('bag-hot'); }
    drag.g.classList.toggle('over',!!(p&&p.classList.contains('bag-ok'))); }
  function endDrag(){ var d=drag; drag=null; justDragged=true; setTimeout(function(){ justDragged=false; },60);
    var m=d.hot?onSpot(+d.hot.getAttribute('data-k')):null, ok=!!(m&&!why(m)); clearSpots(); d.el.classList.remove('lifted');
    if(ok){ d.g.remove(); S.sel=d.id; S.target=String(m.id); S.step='confirm'; S.msg=''; X.sideTab('bag',true); draw(); return; }
    S.note=m?(m.egg?'An egg can’t eat a bean. Hatch it first.':(m.name||'It')+' is in the dungeon. Feed it when it’s back.'):(d.hot?'There’s nobody on that spot.':'');
    if(phone()||S.note) X.sideTab('bag'); draw(); S.note='';
    requestAnimationFrame(function(){ var el=view.querySelector('.bag-it[data-it="'+d.id+'"]'), r=el&&el.offsetParent?el.getBoundingClientRect():d.home; d.g.classList.add('back'); d.g.classList.remove('over'); d.g.style.transform='translate('+r.left+'px,'+r.top+'px)'; });
    setTimeout(function(){ d.g.remove(); },300); }
  function grab(e){ var el=e.target.closest&&e.target.closest('.bagv .bag-it[data-it], .bagv .bag-hero'); if(!el||S.step==='confirm'||S.step==='pick') return null;
    var id=el.getAttribute('data-it')||S.sel; return id&&teamOn()?{id:id,el:el}:null; }
  document.addEventListener('pointerdown',function(e){ if(e.pointerType==='touch'||e.button!==0||!S.on) return; var g=grab(e); if(g){ g.x=e.clientX; g.y=e.clientY; press=g; } });
  document.addEventListener('pointermove',function(e){ if(e.pointerType==='touch') return;
    if(press&&!drag&&Math.abs(e.clientX-press.x)+Math.abs(e.clientY-press.y)>7){ var p=press; press=null; beginDrag(p.id,p.el,e.clientX,e.clientY); }
    if(drag){ e.preventDefault(); moveDrag(e.clientX,e.clientY); } });
  document.addEventListener('pointerup',function(e){ if(e.pointerType==='touch') return; press=null; if(drag) endDrag(); });
  document.addEventListener('touchstart',function(e){ if(!S.on) return; var g=grab(e); if(!g) return; var t=e.touches[0];
    lp={x:t.clientX,y:t.clientY,timer:setTimeout(function(){ var l=lp; lp=null; if(l) beginDrag(g.id,g.el,l.x,l.y); },280)}; },{passive:true});
  document.addEventListener('touchmove',function(e){ var t=e.touches[0];
    if(lp){ if(Math.abs(t.clientX-lp.x)+Math.abs(t.clientY-lp.y)>10){ clearTimeout(lp.timer); lp=null; } else { lp.x=t.clientX; lp.y=t.clientY; } }
    if(drag){ e.preventDefault(); moveDrag(t.clientX,t.clientY); } },{passive:false});
  document.addEventListener('touchend',function(e){ if(lp){ clearTimeout(lp.timer); lp=null; } if(drag){ e.preventDefault(); endDrag(); } },{passive:false});
  document.addEventListener('touchcancel',function(){ if(lp){ clearTimeout(lp.timer); lp=null; } if(drag) endDrag(); });
  document.addEventListener('contextmenu',function(e){ if(e.target.closest&&e.target.closest('.bagv .bag-it')) e.preventDefault(); });
  document.addEventListener('dragstart',function(e){ if(e.target.closest&&e.target.closest('.bagv')) e.preventDefault(); });

  /* the beans only move while the bag is open */
  var t0=Date.now(), timer=null;
  function frame(){ var t=still?0:(Date.now()-t0)/1000, cs=view.querySelectorAll('canvas[data-look]'); for(var i=0;i<cs.length;i++) paint(cs[i],cs[i].getAttribute('data-look'),t); }
  function tick(){ if(open()&&S.on&&!document.hidden) frame(); }
  function watch(){ if(drag) return; if(open()){ seeAll(); draw(); poll(); if(!timer&&!still) timer=setInterval(tick,100); } else if(timer){ clearInterval(timer); timer=null; } }
  if(window.MutationObserver) new MutationObserver(watch).observe(view,{attributes:true,attributeFilter:['hidden']});
  window.CDBAG={S:S,poll:poll,stateIn:stateIn,draw:draw};
  var wasDemo=demoOn(); poll(); setInterval(function(){ if(!document.hidden) poll(); },90000);
  /* signing in or out as a test name shows or hides the pretend beans straight away */
  setInterval(function(){ var d=demoOn(); if(d!==wasDemo){ wasDemo=d; if(!d) stateIn({on:false,items:[]}); poll(); } },3000);
})();
