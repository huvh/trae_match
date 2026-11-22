/* A perspective cutaway of the valley service workshop, in metres. */
(() => {
  'use strict';
  const p=(x,y,z)=>({x,y,z});
  const add=(a,b)=>p(a.x+b.x,a.y+b.y,a.z+b.z);
  const sub=(a,b)=>p(a.x-b.x,a.y-b.y,a.z-b.z);
  const mul=(a,n)=>p(a.x*n,a.y*n,a.z*n);
  const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
  const cross=(a,b)=>p(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
  const unit=a=>mul(a,1/(Math.hypot(a.x,a.y,a.z)||1));
  const between=(a,b,t)=>add(a,mul(sub(b,a),t));
  const clamp=(a,m,M)=>Math.max(m,Math.min(M,a));
  const light=unit(p(-.53,.79,.76));
  const TAU=Math.PI*2;
  const shades=new Map();
  function shade(hex,n) {
    const level=Math.round(clamp(n,.42,1.22)*44);
    const key=hex+level;
    if(shades.has(key))return shades.get(key);
    const k=level/44,v=parseInt(hex.slice(1),16);
    const c='rgb('+[v>>16,(v>>8)&255,v&255].map(q=>Math.min(255,Math.round(q*k))).join(',')+')';
    shades.set(key,c);return c;
  }
  function create(canvas){
    const g=canvas.getContext('2d');
    let W=1,H=1,fac=1,dp=1,base=null,bgkey='',cam,aim,fwd,right,up,queue=[],active=g;
    function camera(view){
      const yaw=view==='orbit'?.62:-.15, pitch=view==='orbit'?.29:.115,distance=14;
      aim=p(0,2.25,0);cam=add(aim,p(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance));
      fwd=unit(sub(aim,cam));right=unit(cross(fwd,p(0,1,0)));up=unit(cross(right,fwd));
      fac=Math.min(W/(view==='orbit'?9.0:9.55),H/6.65)*distance;
    }
    function at(q){
      const r=sub(q,cam),depth=dot(r,fwd);
      const x=W*.5+fac*dot(r,right)/Math.max(.05,depth),y=H*.50-fac*dot(r,up)/Math.max(.05,depth);
      return {x,y,depth,visible:depth>.05&&x>=0&&y>=0&&x<=W&&y<=H};
    }
    function project(x,y,z=0){return at(p(x,y,z));}
    function face(verts,col,fixed=false) {
      const pts=verts.map(at);
      if(pts.some(v=>v.depth<=.05))return;
      if(pts.every(v=>v.x<-2)||pts.every(v=>v.x>W+2)||pts.every(v=>v.y<-2)||pts.every(v=>v.y>H+2))return;
      const n=unit(cross(sub(verts[1],verts[0]),sub(verts[2],verts[0])));
      // Closed meshes are wound outwards. Flat decals and two-sided plates use their own ink.
      if(!fixed&&dot(n,sub(cam,verts[0]))<=0)return;
      const color=fixed?col:shade(col,.62+.53*Math.max(0,dot(n,light))+.08*Math.max(n.y,0));
      const depth=pts.reduce((sum,v)=>sum+v.depth,0)/pts.length;
      queue.push({pts,color,depth});
    }
    function line(points,color,width=1,dash=[]) {
      const pts=points.map(at);
      if(pts.some(v=>v.depth<=.05))return;
      queue.push({pts,color,width,dash,depth:pts.reduce((s,v)=>s+v.depth,0)/pts.length-.012});
    }
    function flush(){
      queue.sort((a,b)=>b.depth-a.depth);
      for(const el of queue){
        const {pts,color}=el;active.beginPath();active.moveTo(pts[0].x,pts[0].y);
        for(let i=1;i<pts.length;i++)active.lineTo(pts[i].x,pts[i].y);
        if(el.width){
          active.lineWidth=el.width;active.strokeStyle=color;active.setLineDash(el.dash);active.stroke();
          if(el.dash.length)active.setLineDash([]);
        }else{
          active.closePath();active.fillStyle=color;active.fill();active.lineWidth=.45;active.strokeStyle=color;active.stroke();
        }
      }queue=[];
    }
    function box(center,w,h,d,col){
      const v=[];
      for(const z of [-1,1])for(const y of [-1,1])for(const x of [-1,1])v.push(add(center,p(x*w/2,y*h/2,z*d/2)));
      for(const ids of [[0,4,6,2],[5,1,3,7],[2,6,7,3],[0,1,5,4],[4,5,7,6],[1,0,2,3]])face(ids.map(i=>v[i]),col);
    }
    // Circular section about an arbitrary world axis; fans use separate face normals.
    function cylinder(a,b,ra,rb,color,sides=12){
      const axis=unit(sub(b,a));
      const across=unit(cross(axis,Math.abs(axis.y)<.85?p(0,1,0):p(0,0,1)));
      const other=cross(axis,across),first=[],last=[];
      for(let i=0;i<sides;i++) {
        const t=TAU*i/sides,dir=add(mul(across,Math.cos(t)),mul(other,Math.sin(t)));
        first.push(add(a,mul(dir,ra)));last.push(add(b,mul(dir,rb)));
      }
      for(let i=0;i<sides;i++){const j=(i+1)%sides;face([first[i],first[j],last[j],last[i]],color);}
      face(first.reverse(),color);face(last,color);
    }
    function post(x,z,y0,y1,r0,r1,c,n=12){cylinder(p(x,y0,z),p(x,y1,z),r0,r1,c,n);}
    function bearing(o,r,thick,color,n=15){
      cylinder(add(o,p(0,0,-thick/2)),add(o,p(0,0,thick/2)),r,r,color,n);
    }
    function panel(x,y,w,h,z,c){face([p(x,y,z),p(x+w,y,z),p(x+w,y+h,z),p(x,y+h,z)],c,true);}
    function floorQuad(x,z,w,d,y,c){face([p(x,y,z),p(x+w,y,z),p(x+w,y,z+d),p(x,y,z+d)],c,true);}
    function screen(points,fill){
      const ps=points.map(at);if(ps.some(v=>v.depth<=.05))return;
      active.beginPath();active.moveTo(ps[0].x,ps[0].y);for(const q of ps.slice(1))active.lineTo(q.x,q.y);active.closePath();active.fillStyle=fill;active.fill();
    }
    function workshop() {
      const sky=active.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#0c1921');sky.addColorStop(.55,'#243b40');sky.addColorStop(1,'#14282d');active.fillStyle=sky;active.fillRect(0,0,W,H);
      // Recessed back wall framed by a double-height observation window.
      panel(-19,-.08,38,11,-4.0,'#172b31');
      for(let x=-16;x<17;x+=2.6){
        panel(x,.05,2.48,5.91,-3.96,'#243b41');panel(x+.07,.18,2.33,4.92,-3.94,'#21363c');
        panel(x+.13,4.5,2.15,.39,-3.92,'#1a3036');
        for(let j=0;j<7;j++)panel(x+.2+j*.3,4.57,.18,.045,-3.90,'#536969');
      }
      flush();
      panel(-6.6,1.86,9.5,3.0,-3.78,'#10252b');flush();
      panel(-6.44,2.0,9.18,2.69,-3.77,'#5e8289');flush();
      const distant=[p(-6.44,2,-3.75),p(-6.44,3.53,-3.75),p(-5.63,3.9,-3.75),p(-5.18,3.63,-3.75),p(-4.37,4.28,-3.75),p(-3.98,4.1,-3.75),p(-3.54,4.30,-3.75),p(-2.9,3.77,-3.75),p(-2.29,3.9,-3.75),p(-1.22,3.31,-3.75),p(-.66,3.57,-3.75),p(.11,3.33,-3.75),p(.9,3.86,-3.75),p(1.3,3.60,-3.75),p(2.74,3.33,-3.75),p(2.74,2,-3.75)];
      face(distant,'#4c6c75',true);flush();
      face([p(-6.44,2,-3.73),p(-6.44,2.95,-3.73),p(-5.8,3.2,-3.73),p(-4.8,2.94,-3.73),p(-3.1,3.30,-3.73),p(-2.56,3.16,-3.73),p(-1.8,3.38,-3.73),p(-.6,3.04,-3.73),p(1.38,3.25,-3.73),p(2.74,2.82,-3.73),p(2.74,2,-3.73)],'#3c5962',true);flush();
      for(let x=-6.45;x<=2.76;x+=1.82)box(p(x,3.35,-3.65),.10,2.8,.15,'#203337');
      box(p(-1.86,2.37,-3.61),9.3,.075,.10,'#314950');
      for(let i=0;i<4;i++){
        const x=3.16+i*.82;
        panel(x,.29,.71,3.08,-3.62,'#34484a');panel(x+.08,.62,.54,2.44,-3.60,'#2d3f42');
        for(let k=0;k<6;k++)panel(x+.13,2.52+k*.075,.45,.032,-3.59,'#172a2c');
        panel(x+.51,1.48,.037,.2,-3.58,'#9ca59a');
      }
      for(let x=-10;x<12;x+=3.45){
        box(p(x,2.91,-3.41),.16,6.0,.26,'#38515a');
        box(p(x,5.45,-2.6),.18,.24,2.1,'#344e55');
        box(p(x+.80,5.36,-2.39),1.42,.12,.30,'#697b75');
        panel(x+.14,5.27,1.32,.065,-2.23,'#b7cab8');
      }
      for(let i=0;i<2;i++)cylinder(p(-12,5.0+i*.19,-3.16),p(13,5.0+i*.19,-3.16),.052,.052,'#586d6c',6);
      flush();
      // A screened floor with precision alignment lines and recessed maintenance drains.
      screen([p(-19,-.035,-3.72),p(19,-.035,-3.72),p(17,-.035,7),p(-17,-.035,7)],'#33484a');
      for(let x=-16;x<=16;x++)line([p(x,-.031,-3.72),p(x,-.031,6.9)],'rgba(12,31,35,.65)',.85);
      for(let z=-3;z<=6;z++)line([p(-16,-.03,z),p(16,-.03,z)],'rgba(105,130,127,.46)',.8);
      for(let i=-12;i<12;i++){
        floorQuad(i,-1.95,.64,.045,-.022,'#a99c66');
        floorQuad(i+.17,1.86,.58,.045,-.021,'#ada16c');
      }
      floorQuad(-13,-2.74,26,.24,-.017,'#122427');
      for(let x=-13;x<13;x+=.20)floorQuad(x,-2.74,.032,.24,-.014,'#78908a');
      flush();
      // Wheel-stop markings and floor alignment crosses.
      for(const x of [-5.2,5.2])for(const z of [-1.4,1.45]){
        for(let i=-2;i<=2;i++)screen([p(x+i*.16,0,z),p(x+i*.16+.07,0,z),p(x+i*.16+.23,0,z+.38),p(x+i*.16+.16,0,z+.38)],'#c4a65a');
      }
      for(const x of [-4,-2,0,2,4])for(const z of [-.86,.8]){line([p(x-.08,.003,z),p(x+.08,.003,z)],'#b3b1a0',.8);line([p(x,.003,z-.09),p(x,.003,z+.09)],'#b3b1a0',.8);}
      flush();
      const vignette=active.createRadialGradient(W*.48,H*.50,Math.min(W,H)*.21,W*.5,H*.5,Math.hypot(W,H)*.55);
      vignette.addColorStop(0,'rgba(5,17,22,0)');vignette.addColorStop(.78,'rgba(6,17,23,.18)');vignette.addColorStop(1,'rgba(5,14,19,.58)');
      active.fillStyle=vignette;active.fillRect(0,0,W,H);
    }
    function link(a,b,thickness,index) {
      const forward=unit(sub(b,a)),normal=unit(p(-forward.y,forward.x,0));
      const paint=index===0?'#edab42':'#e88c34';
      const along=(t,n,z)=>add(add(between(a,b,t),mul(normal,n)),p(0,0,z));
      // A tapered double-sided casting, with recessed web, forearm hose and moving ram.
      const contour=[[.025,-.45],[.15,-1],[.79,-.68],[.98,-.43],[.98,.48],[.76,.68],[.16,1],[.025,.56]];
      const near=contour.map(([t,n])=>along(t,n*thickness,.18));
      const far=contour.map(([t,n])=>along(t,n*thickness,-.18));
      face(near,paint,true);face([...far].reverse(),'#94632f',true);
      for(let i=0;i<near.length;i++){
        const j=(i+1)%near.length;
        face([near[i],far[i],far[j],near[j]],i<4?'#885332':'#ffd579',true);
      }
      const stripe=[[.23,-.23],[.8,-.18],[.77,.13],[.26,.36]].map(([t,n])=>along(t,n*thickness,.19));
      face(stripe,index===0?'#8d663b':'#745536',true);
      for(const t of [.22,.70])bearing(along(t,0,.19),.041,.055,'#bbc2ae',8);
      const c=along(.12,thickness+.12,-.05),d=along(.64,thickness+.09,-.05),e=along(.88,thickness*.72,-.05);
      cylinder(c,d,.066,.066,'#344549',8);cylinder(d,e,.036,.036,'#c6cbbb',8);
      line([along(.06,-thickness*.6,.23),along(.16,-thickness-.08,.23),along(.57,-thickness*.88-.08,.23),along(.84,-thickness*.82,.23),along(.94,-thickness*.4,.23)],'#26373a',clamp(fac/14*.043,1.2,3.4));
    }
    function studJoint(o,r){
      bearing(o,r,.55,'#303f41',18);
      bearing(add(o,p(0,0,.24)),r*.86,.13,'#e8a244',17);
      bearing(add(o,p(0,0,.32)),r*.62,.075,'#485b61',16);
      bearing(add(o,p(0,0,.365)),r*.38,.04,'#99a5a1',14);
      for(let k=0;k<4;k++){
        const t=Math.PI*.25+k*Math.PI/2;
        bearing(add(o,p(Math.cos(t)*r*.73,Math.sin(t)*r*.73,.325)),r*.07,.04,'#283d41',6);
      }
    }
    function palmTip(end,prev,gripped,toolAngle){
      let d=unit(sub(end,prev));if(Number.isFinite(toolAngle))d=p(Math.cos(toolAngle),Math.sin(toolAngle),0);
      const n=unit(p(-d.y,d.x,0)),f=(along,side,z)=>add(end,add(add(mul(d,along),mul(n,side)),p(0,0,z)));
      cylinder(f(-.49,0,.12),f(-.26,0,.12),.14,.12,'#516065',10);
      bearing(f(-.34,0,.16),.145,.28,'#c8b492');
      const gap=gripped?.11:.17;
      for(const side of [-1,1]){
        const a=f(-.3,0,.18),b=f(-.21,side*(gap+.072),.18),c=f(.035,side*gap,.18);
        cylinder(a,b,.060,.052,'#84938e',8);cylinder(b,c,.051,.044,'#c4cbb6',8);
        cylinder(c,f(.064,side*(gap-.05),.18),.047,.035,'#344744',8);
      }
    }
    function cellPack(o,gripped,done) {
      if(!gripped&&!done){const pedestal=Math.max(.04,o.y-.165);box(p(o.x,pedestal/2,o.z),.56,pedestal,.4,'#45534f');box(p(o.x,pedestal,o.z),.65,.065,.46,'#99a493');}
      box(o,.43,.29,.31,done?'#88bea1':'#eaa641');
      for(const dx of [-.18,.18])box(add(o,p(dx,0,0)),.045,.31,.32,'#404d48');
      for(const dx of [-.10,0,.10])box(add(o,p(dx,.008,.161)),.030,.155,.014,'#503f2d');
      box(add(o,p(.015,.18,0)),.21,.05,.11,'#cad3b3');
    }
    function socketBay(o,done){
      const a=Math.max(.1,o.y-.35);
      post(o.x,o.z-.28,0,a,.115,.100,'#51686b');
      box(p(o.x,.075,o.z-.27),.79,.15,.65,'#596462');
      box(add(o,p(0,0,-.13)),.84,.67,.24,'#52696d');
      box(add(o,p(0,0,.012)),.66,.45,.065,'#172e31');
      const border=done?'#a9ffe0':'#6ee1cf';
      for(const sign of [-1,1]){
        box(add(o,p(sign*.309,0,.06)),.045,.405,.04,border);
        box(add(o,p(0,sign*.202,.06)),.61,.042,.04,border);
      }
      for(const dx of [-.36,.36])for(const dy of [-.26,.26])bearing(add(o,p(dx,dy,.006)),.021,.025,'#a5b3ac',6);
    }
    function pipe(o){
      const r=o.r||.35,front=o.z+.38,back=o.z-.81;
      box(p(o.x,.055,back+.14),.46,.11,.40,'#475552');
      post(o.x,back+.14,.08,Math.max(.12,o.y-r*.6),.075,.075,'#748078',8);
      cylinder(p(o.x,o.y,back),p(o.x,o.y,front),r,r,'#bc6842',20);
      for(const z of [back+.07,front-.11])bearing(p(o.x,o.y,z),r*1.16,.10,'#8e795e',18);
      bearing(p(o.x,o.y,front+.015),r*.82,.04,'#503f37',20);
      bearing(p(o.x,o.y,front+.045),r*.56,.035,'#654e3e',18);
      for(let i=0;i<6;i++){
        const t=TAU*i/6;bearing(p(o.x+Math.cos(t)*r*.93,o.y+Math.sin(t)*r*.93,front-.045),r*.10,.065,'#d4a671',6);
      }
    }
    function shadow(o,r) {
      const pts=[];for(let i=0;i<20;i++){const a=i*TAU/20;pts.push(p(o.x+.26+r*Math.cos(a),.007,o.z-.06+r*.62*Math.sin(a)));}
      screen(pts,'rgba(8,21,25,.31)');
    }
    function guide(o,s){
      if(!o||s.done)return;
      const q=at(o),rad=clamp(fac/q.depth*.19,6,20),t=s.time||0;
      active.save();active.strokeStyle='rgba(173,240,217,.8)';active.lineWidth=1.3;
      for(let i=0;i<4;i++){let a=(i*.5+.07)*Math.PI+t*.25;active.beginPath();active.arc(q.x,q.y,rad,a,a+Math.PI*.24);active.stroke();}
      active.restore();
    }
    function draw(s) {
      const rect=canvas.getBoundingClientRect();W=Math.round(rect.width);H=Math.round(rect.height);if(W<1||H<1)return;
      dp=Math.min(globalThis.devicePixelRatio||1,2);
      const sizex=Math.round(W*dp),sizey=Math.round(H*dp);
      if(canvas.width!==sizex||canvas.height!==sizey){canvas.width=sizex;canvas.height=sizey;}
      camera(s.view);
      const key=[W,H,dp,s.view].join('/');
      if(bgkey!==key){
        base=canvas.ownerDocument.createElement('canvas');base.width=sizex;base.height=sizey;active=base.getContext('2d');
        active.setTransform(dp,0,0,dp,0,0);active.lineJoin='round';workshop();bgkey=key;
      }
      active=g;g.setTransform(1,0,0,1,0,0);g.drawImage(base,0,0);g.setTransform(dp,0,0,dp,0,0);g.lineJoin='round';g.lineCap='round';
      const joints=s.joints||[],foot=joints[0],obstacles=s.obstacles||[];
      if(!foot)return;
      shadow(foot,1.03);
      if(s.socket){
        shadow(s.socket,.62);
        const q=at(s.socket),r=clamp(fac/q.depth*.65,8,80);
        const glow=g.createRadialGradient(q.x,q.y,0,q.x,q.y,r);
        glow.addColorStop(0,'rgba(104,242,215,.24)');glow.addColorStop(1,'rgba(104,242,215,0)');
        g.fillStyle=glow;g.fillRect(q.x-r,q.y-r,r*2,r*2);
      }
      if(s.cell&&!s.gripped)shadow(s.cell,.44);
      for(let i=1;i<joints.length;i++){
        const a=joints[i-1],b=joints[i],offset=q=>p(q.x+q.y*.21,.014,q.z-q.y*.14);
        const d=unit(sub(b,a)),n=p(-d.z*.10,0,d.x*.10+.075),A=offset(a),B=offset(b);
        screen([add(A,n),add(B,n),sub(B,n),sub(A,n)],'rgba(12,28,30,.29)');
      }
      box(p(foot.x,.10,foot.z),1.42,.2,1.05,'#435053');
      for(const dx of [-.55,.55])for(const dz of [-.4,.4])post(foot.x+dx,foot.z+dz,.19,.235,.074,.069,'#aab3a2',6);
      post(foot.x,foot.z,.18,.36,.59,.53,'#e8ac45',12);
      post(foot.x,foot.z,.35,.47,.50,.51,'#39494a',14);
      post(foot.x,foot.z,.47,Math.max(.5,foot.y-.15),.44,.31,'#edb247',10);
      if(s.socket)socketBay(s.socket,s.done);
      for(const o of obstacles)pipe(o);
      for(let i=1;i<joints.length;i++){
        const a=joints[i-1],b=joints[i],last=i===joints.length-1,distance=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
        const end=last&&distance>.45?between(a,b,1-.30/distance):b;
        link(a,end,Math.max(.10,.25-i*.034),i-1);
      }
      for(let i=0;i<joints.length-1;i++)studJoint(joints[i],i===0?.33:i===1?.27:.20);
      if(s.cell)cellPack(s.cell,Boolean(s.gripped),Boolean(s.done));
      if(joints.length>1)palmTip(joints[joints.length-1],joints[joints.length-2],s.gripped,s.toolAngle);
      flush();guide(s.target,s);
    }
    camera('front');
    return {draw,project,dispose(){base=null;bgkey='';queue=[];}};
  }
  globalThis.ArmScene={create};
})();
