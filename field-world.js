(() => {
  'use strict';
  const TAU=Math.PI*2, half=Math.PI/2;
  const palettes={
    survey:['#8eafad','#c7ccb4','#566e65','#354c48','#263d3a'],
    routes:['#9cb2ae','#d6cba7','#75816a','#4c5e50','#3d534c'],
    driving:['#859fae','#c1bdab','#707e74','#485b58','#354c4e'],
    machines:['#87a2ac','#c3c3b0','#76827c','#4b6160','#35494b']
  };
  const shades=new Map();
  function tint(color,f){
    if(!color||typeof color!=='string')return '#b6bbb0';
    const key=color+f;if(shades.has(key))return shades.get(key);
    let h=color.replace(/^#/,'');if(h.length===3||h.length===4)h=h.split('').map(c=>c+c).join('');
    if(!/^[a-f\d]{6}([a-f\d]{2})?$/i.test(h))return color;
    const result='#'+[0,2,4].map(i=>Math.min(255,Math.round(parseInt(h.slice(i,i+2),16)*f)).toString(16).padStart(2,'0')).join('')+h.slice(6);
    if(shades.size>5000)shades.clear();shades.set(key,result);return result;
  }
  function create(canvas,region,id){
    const ctx=canvas.getContext('2d'),pal=palettes[region]||palettes.survey;
    let w=800,h=460,cam=0,zoom=1,scale=1,ox=0,oy=0,cos=1,sin=0,cp=.6,sp=.8;
    let solids=[],floors=[],shadows=[],floorHeight=null,paths=[],labels=[],markers=[],baseImage=null,baseKey='';
    const lens=FieldLandscape.createLens(),site=FieldLandscape.landscape(region,id);
    let gpu=null,disposed=false,revision=0,subject=null,manualPan=false,briefing=false;
    function observe(world,pen){
      let rover=null,marked=null;const draw=Object.create(pen);
      draw.rover=(x,y,...rest)=>{if(!rover)rover={x,y};pen.rover(x,y,...rest);};
      draw.subject=(x,y)=>{marked={x,y};};world(draw);const target=marked||rover;
      if(target&&(!subject||Math.hypot(subject.x-target.x,subject.y-target.y)>.55)){
        subject=target;if(lens.mode===1&&!manualPan){lens.aim(target.x,target.y);revision++;}}
    }
    if(typeof WebGL2RenderingContext!=='undefined')import('./field-gpu.mjs').then(module=>{
      if(!disposed){try{gpu=module.create(canvas,region,id,lens,site);}catch{/* The perspective software scene runs on devices without WebGL. */}}
    }).catch(()=>{});
    function camera(width,height){
      w=width;h=height;lens.size(w,h);const o=lens.pose(),dx=o.x-o.cx,dy=o.z-o.cy,flat=Math.hypot(dx,dy);
      cos=dy/(flat||1);sin=dx/(flat||1);sp=o.y/Math.hypot(flat,o.y);cp=Math.sqrt(1-sp*sp);
      scale=lens.project(o.cx,o.cy).scale;
    }
    const project=(x,y,z=0)=>lens.project(x,y,z),ground=(x,y)=>lens.ground(x,y);
    function polygon(poly,color){
      ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(poly[0].x,poly[0].y);for(let i=1;i<poly.length;i++)ctx.lineTo(poly[i].x,poly[i].y);ctx.closePath();ctx.fill();
    }
    function poly(coords,color){
      const pts=coords.map(a=>project(...a));(floorHeight===null?solids:floors).push({pts,c:color,k:pts.reduce((sum,p)=>sum+p.depth,0)/pts.length,z:floorHeight});
    }
    function line(points,color,width=2,elev=2){
      if(!points?.length)return;
      const pts=points.map(a=>project(a.x??a[0],a.y??a[1],a.elevation??elev));
      paths.push({pts,c:color,width:Math.max(.65,width*scale),k:pts.reduce((v,p)=>v+p.depth,0)/pts.length,elev});
    }
    function ring(x,y,r,c,width=2,z=2){
      if(!(r>0))return;const pts=[];for(let i=0;i<=32;i++){const a=i*TAU/32;pts.push({x:x+r*Math.cos(a),y:y+r*Math.sin(a)});}line(pts,c,width,z);
    }
    function dot(x,y,c,r=3,z=3){const a=project(x,y,z);markers.push({a,c,r:Math.max(.9,r*scale)});}
    function box(x,y,dx,dy,dz,c,base=0,yaw=0){
      const co=Math.cos(yaw),si=Math.sin(yaw),p=[[-dx/2,-dy/2],[dx/2,-dy/2],[dx/2,dy/2],[-dx/2,dy/2]].map(([u,v])=>[x+co*u-si*v,y+si*u+co*v]);
      if(dz+base<=4.1)floorHeight=dz+base;
      if(base<=3&&dz>6)shadows.push(p.map(a=>project(a[0]+dz*.25,a[1]+dz*.14,.2)));
      for(let i=0;i<4;i++){const a=p[i],b=p[(i+1)%4];if((b[0]-a[0])*cos-(b[1]-a[1])*sin>=0)continue;poly([[...a,base],[...b,base],[...b,base+dz],[...a,base+dz]],tint(c,[.64,.83,.73,.61][i]));}
      poly(p.map(a=>[...a,base+dz]),c);floorHeight=null;
    }
    function tapered(x,y,r1,r2,height,c,base=0,count=8,skew=0){
      const p=[],q=[];for(let i=0;i<count;i++){const a=i*TAU/count+.22;
        p.push([x+r1*Math.cos(a),y+r1*Math.sin(a),base]);q.push([x+skew+r2*Math.cos(a),y+r2*Math.sin(a),base+height]);}
      if(base<=3&&height>7)shadows.push(p.map(a=>project(a[0]+height*.25,a[1]+height*.14,.2)));
      for(let i=0;i<count;i++){const j=(i+1)%count;if((p[j][0]-p[i][0])*cos-(p[j][1]-p[i][1])*sin>=0)continue;
        poly([p[i],p[j],q[j],q[i]],tint(c,.61+.20*(1+Math.cos(i*TAU/count-1))));}
      if(r2>.1)poly(q,c);
    }
    function post(x,y,r,h,c,base=0){tapered(x,y,r,r,h,c,base);}
    function rock(x,y,r,h,c='#9d9b88'){tapered(x,y,r,r*.53,h,c,0,7,r*.14);}
    function tree(x,y,s=16){post(x,y,s*.10,s*.38,'#796957');tapered(x,y,s*.48,.15,s*.88,'#547f70',s*.23,6);tapered(x,y,s*.37,.12,s*.78,'#779380',s*.55,6);}
    function beam(x1,y1,z1,x2,y2,z2,width,c){const a=project(x1,y1,z1),b=project(x2,y2,z2);solids.push({stroke:true,pts:[a,b],c,width:Math.max(1,width*scale),k:(a.depth+b.depth)/2});}
    function rover(x,y,yaw=0,c='#e6ac50'){
      const co=Math.cos(yaw),si=Math.sin(yaw),part=(u,v,w,d,h,col,z)=>box(x+u*co-v*si,y+u*si+v*co,w,d,h,col,z,yaw);
      for(const u of [-6,6])for(const v of [-5,5])part(u,v,5,4,4,'#25363c',0);
      part(0,0,21,10,4,c,3);part(2,0,9,8,4,'#8dada8',7);part(-6,0,5,8,3,'#a58f68',7);
      for(const v of [-3,3])part(10,v,1.3,2,1.8,'#ffe7ac',5);
    }
    function label(x,y,text,c='#ffecb2',z=12){if(text!==undefined&&text!=='')labels.push({a:project(x,y,z),text:String(text),c});}
    const p={box,post,rock,tree,rover,beam,dot,line,label,ring};
    function stroke(item){
      const a=item.pts;if(!a.length)return;ctx.beginPath();ctx.strokeStyle=item.c;ctx.lineWidth=item.width;ctx.lineJoin=ctx.lineCap='round';ctx.moveTo(a[0].x,a[0].y);for(let i=1;i<a.length;i++)ctx.lineTo(a[i].x,a[i].y);ctx.stroke();
    }
    function objects(){solids.sort((a,b)=>a.k-b.k);for(const obj of solids){if(obj.stroke)stroke(obj);else polygon(obj.pts,obj.c);}solids=[];}
    function paintGround(){
      const pal=site.palette,sky=ctx.createLinearGradient(0,0,0,h*.68);sky.addColorStop(0,pal.sky);sky.addColorStop(.66,pal.haze);sky.addColorStop(1,pal.earth);ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
      // The distant skyline and sun continue behind the triangulated, perspective terrain.
      for(let row=0;row<2;row++){const m=[{x:0,y:h}];for(let i=0;i<=60;i++)m.push({x:i*w/60,y:h*(.16+row*.08-.08*Math.abs(Math.sin(i*.16+row))-.021*Math.sin(i*1.5))});m.push({x:w,y:h});polygon(m,row?'#a0aaa0':'#bec2af');}
      for(const tile of site.terrain){const pts=tile.points.map(v=>project(...v));if(pts.every(q=>q.visible))solids.push({pts,c:tile.color,k:pts.reduce((s,q)=>s+q.depth,0)/3});}objects();
      site.decorate(p);
      for(const v of paths)stroke(v);objects();paths=[];solids=[];shadows=[];floors=[];markers=[];labels=[];
    }
    function draw(width,height,world){
      camera(width,height);
      if(gpu?.lost()){gpu.dispose();gpu=null;}
      if(gpu){const marks=gpu.draw(w,h,pen=>observe(world,pen));labels=marks.map(m=>({a:project(m.x,m.y,m.z),text:m.text,c:m.c}));drawLabels();return;}
      const k=[w,h,revision].join('|');
      if(baseKey!==k){paintGround();baseImage=document.createElement('canvas');baseImage.width=w;baseImage.height=h;baseImage.getContext('2d').drawImage(canvas,0,0);baseKey=k;}else ctx.drawImage(baseImage,0,0);
      labels=[];markers=[];paths=[];solids=[];floors=[];shadows=[];observe(world,p);
      floors.sort((a,b)=>a.z-b.z||a.k-b.k);for(const f of floors)polygon(f.pts,f.c);for(const shadow of shadows)polygon(shadow,'#17292b27');
      // Ink on the ground sits behind equipment. Elevated traces are drawn over its surface.
      for(const v of paths)if(v.elev<=4)stroke(v);objects();for(const v of paths)if(v.elev>4)stroke(v);
      for(const m of markers){ctx.fillStyle=m.c;ctx.beginPath();ctx.arc(m.a.x,m.a.y,m.r,0,TAU);ctx.fill();}
      drawLabels();
    }
    function drawLabels(){
      const px=Math.max(10,Math.min(21,12*devicePixelRatio)),rects=[];
      ctx.font='600 '+px+'px system-ui,sans-serif';ctx.textBaseline='bottom';
      for(const l of labels){const a=l.a;if(!a.visible||a.x<0||a.x>w||a.y<0||a.y>h)continue;const width=ctx.measureText(l.text).width+8;const x=Math.max(1,Math.min(w-width-1,a.x-width/2));let y=Math.min(h-2,a.y-3);
        for(let j=0;j<3&&rects.some(r=>x<r.x+r.w&&x+width>r.x&&Math.abs(y-r.y)<px+2);j++)y-=px+3;
        if(y<px)y=px+1;rects.push({x,y,w:width});ctx.fillStyle='#12262cd9';ctx.fillRect(x,y-px-3,width,px+5);ctx.fillStyle=l.c;ctx.fillText(l.text,x+4,y);}
      ctx.textBaseline='alphabetic';
    }
    function coachCue(target,time){
      if(!target)return;const a=project(target.x,target.y,1),b=target.kind==='drag'?project(target.tx,target.ty,1):a;
      const phase=(time%1.8)/1.8,t=Math.min(1,phase*1.3);ctx.save();
      if(b!==a){ctx.strokeStyle='#ffe67d';ctx.lineWidth=Math.max(2,2*scale);ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);}
      const u=a.x+(b.x-a.x)*t,v=a.y+(b.y-a.y)*t,r=Math.max(8,12*scale);
      ctx.strokeStyle='#ffe28c';ctx.lineWidth=2.3;ctx.beginPath();ctx.ellipse(a.x,a.y,r*(1+phase*.65),r*sp*(1+phase*.65),0,0,TAU);ctx.stroke();ctx.fillStyle='#ffeb93';ctx.strokeStyle='#354542';ctx.beginPath();ctx.moveTo(u,v);ctx.lineTo(u+3,v+17);ctx.lineTo(u+7,v+12);ctx.lineTo(u+14,v+11);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    }
    return {draw,project,ground,coachCue,
      aim(x,y){if(lens.mode!==1)lens.aim(x,y);},
      turn(){revision++;manualPan=false;if(subject)lens.aim(subject.x,subject.y);return lens.turn();},
      brief(active){if(active&&!briefing){briefing=true;if(lens.mode===0){lens.turn();revision++;}}else if(!active&&briefing){briefing=false;while(lens.mode!==0)lens.turn();revision++;}},

      orbit(dx,dy){revision++;lens.orbit(dx,dy);},
      pan(dx,dy){revision++;manualPan=true;lens.pan(dx,dy);},
      get mode(){return lens.mode;},
      dispose(){disposed=true;gpu?.dispose();gpu=null;baseImage=null;}
    };
  }
  globalThis.FieldWorld={create};
})();
