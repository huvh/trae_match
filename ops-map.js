/* Field atlas. Terrain, hydrography and station miniatures share one survey space. */
(() => {
  'use strict';
  const charts = new WeakMap();
  const stations = {
    survey:   { x: .25, y: .42, color: '#98dec7' },
    routes:   { x: .52, y: .28, color: '#f4ca86' },
    driving:  { x: .64, y: .60, color: '#9fd2ed' },
    machines: { x: .39, y: .73, color: '#f2ae84' }
  };
  const peaks = [
    [-.02,.04,.14,.24,.32],[.15,.16,.21,.18,.26],[.30,-.02,.18,.25,.29],
    [.44,.14,.13,.13,.22],[.68,.08,.22,.19,.29],[.85,.19,.26,.22,.29],
    [1.00,.24,.16,.18,.23],[.93,.48,.17,.22,.23],[.84,.63,.23,.19,.28],
    [.99,.79,.14,.17,.31],[.71,.92,.19,.22,.26],[.58,1.03,.20,.15,.30],
    [.10,.72,.20,.22,.27],[-.01,.70,.15,.19,.24],[.18,1.00,.23,.16,.27],
    [.32,.58,.08,.12,.13],[.48,.47,.09,.12,.18],[.67,.42,.10,.13,.15]
  ];
  const roads = [
    [[.25,.42],[.30,.39],[.33,.41],[.37,.39],[.38,.34],[.43,.33],[.45,.30],[.49,.31],[.52,.28]],
    [[.52,.28],[.58,.30],[.60,.34],[.57,.38],[.57,.42],[.63,.44],[.64,.48],[.61,.51],[.64,.55],[.64,.60]],
    [[.64,.60],[.60,.63],[.55,.61],[.50,.65],[.47,.70],[.43,.70],[.39,.73]],
    [[.39,.73],[.34,.69],[.29,.70],[.26,.65],[.26,.60],[.23,.57],[.20,.56],[.22,.50],[.25,.42]]
  ];
  const clamp=(v,lo=0,hi=1)=>Math.min(hi,Math.max(lo,v));
  const smooth=v=>{const n=clamp(v);return n*n*(3-2*n);};
  function hash(x,y) {
    let n=Math.imul(x,374761393)+Math.imul(y,668265263);
    n=Math.imul(n^(n>>>13),1274126177);
    return ((n^(n>>>16))>>>0)/4294967296;
  }
  function noise(x,y) {
    const a=Math.floor(x),b=Math.floor(y),s=smooth(x-a),t=smooth(y-b);
    return (hash(a,b)*(1-s)+hash(a+1,b)*s)*(1-t)+(hash(a,b+1)*(1-s)+hash(a+1,b+1)*s)*t;
  }
  function stream(y) {return .425+.145*Math.sin(y*6.7-.73)+.077*Math.sin(y*15+.9)+.027*Math.sin(y*25);}
  function waterWidth(y) {return .009+.006*Math.sin(y*6)**2+.023*Math.exp(-((y-.49)**2)/.0025);}
  function height(x,y) {
    const riverDistance=Math.abs(x-stream(y))-waterWidth(y);
    const bank=smooth((riverDistance+.002)/.061);
    const folds=noise(17*x+3*y,15*y-2*x);
    const grain=noise(44*x,46*y);
    let rock=0;
    for(const [u,v,rx,ry,z] of peaks) {
      const dx=x-u,dy=y-v;
      const r=Math.hypot((dx+dy*.35)/rx,(dy-dx*.3)/ry);
      if(r<1.7)rock=Math.max(rock,z*Math.exp(-r*r*2.3)*(1-.22*Math.min(1,r)));
    }
    const ridge=1-Math.abs(noise(x*15+y*4,y*9-x*2)*2-1);
    let h=(.014+.021*folds+rock*(.72+.32*folds+.23*ridge)+.012*grain)*bank;
    for(const {x:u,y:v} of Object.values(stations)) {
      const d=Math.hypot((x-u)*1.10,y-v);
      if(d<.075)h*=smooth(d/.075);
    }
    return h;
  }
  function makePlot(w,h) {
    const lift=Math.min(h*.82,w*.55),skew=lift*.16;
    const point=(u,v,z=height(u,v))=>({x:u*w+z*skew,y:v*h-z*lift,z});
    return {point,lift};
  }
  function path(g,pts,ink,width=1,dash=[]) {
    if(!pts.length)return;
    g.beginPath();g.moveTo(pts[0].x,pts[0].y);
    for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);
    g.lineWidth=width;g.strokeStyle=ink;g.setLineDash(dash);g.stroke();g.setLineDash([]);
  }
  function polygon(g,pts,color) {
    g.beginPath();g.moveTo(pts[0].x,pts[0].y);
    for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);
    g.closePath();g.fillStyle=color;g.fill();
  }
  function face(g,a,b,c) {
    const orient=(b.u-a.u)*(c.v-a.v)-(c.u-a.u)*(b.v-a.v);
    const dx=((b.z-a.z)*(c.v-a.v)-(c.z-a.z)*(b.v-a.v))/orient;
    const dy=((b.u-a.u)*(c.z-a.z)-(c.u-a.u)*(b.z-a.z))/orient;
    const light=clamp((dx*-.8+dy*.42+1.05)/Math.sqrt(1+dx*dx+dy*dy)*.58+.17);
    const elev=(a.z+b.z+c.z)/3, n=smooth((elev-.08)/.12);
    const shade=light*light;
    const col=[12+22*shade+24*n,31+43*shade+28*n,39+43*shade+34*n];
    const snow=smooth((elev-.184)/.096)*(.18+.82*light);
    const ice=[160,192,191];
    const rgb=col.map((v,i)=>Math.round(v*(1-snow)+ice[i]*snow));
    g.fillStyle='rgb('+rgb.join(',')+')';
    g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.lineTo(c.x,c.y);g.closePath();
    g.fill();g.strokeStyle=g.fillStyle;g.lineWidth=.55;g.stroke();
    const lo=Math.min(a.z,b.z,c.z),hi=Math.max(a.z,b.z,c.z);
    for(let k=Math.max(2,Math.ceil(lo/.017)); k*.017<hi; k++) {
      const z=k*.017, ends=[];
      for(const [p,q] of [[a,b],[b,c],[c,a]]) {
        if((p.z<=z)!==(q.z<=z)){
          const t=(z-p.z)/(q.z-p.z);
          ends.push({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t});
        }
      }
      if(ends.length===2)path(g,ends,k%4===0?'rgba(167,198,166,.42)':'rgba(141,182,167,.21)',k%4===0?.85:.58);
    }
  }
  function paintTerrain(g,w,h,plot) {
    const cols=clamp(Math.round(w/16),48,110), rows=clamp(Math.round(h/15),42,86);
    let previous;
    for(let iy=-1;iy<=rows+Math.ceil(rows*.33);iy++) {
      const line=[];
      for(let ix=-3;ix<=cols+2;ix++) {
        const u=(ix+(iy%2===0?.5:0)+(hash(ix,iy)-.5)*.45)/cols;
        const v=(iy+(hash(iy,ix+222)-.5)*.35)/rows;
        line.push({...plot.point(u,v),u,v});
      }
      if(previous) for(let i=0;i<line.length-1;i++) {
        if(iy%2===0){face(g,previous[i],previous[i+1],line[i]);face(g,line[i],previous[i+1],line[i+1]);}
        else{face(g,previous[i],previous[i+1],line[i+1]);face(g,line[i],previous[i],line[i+1]);}
      }
      previous=line;
    }
  }
  function paintRiver(g,w,h) {
    const left=[],right=[],flow=[];
    for(let i=-3;i<=175;i++){
      const v=i/165, x=stream(v),dw=waterWidth(v);
      left.push({x:(x-dw)*w,y:v*h});right.push({x:(x+dw)*w,y:v*h});
      flow.push({x:(x+.22*dw*Math.sin(v*90))*w,y:v*h});
    }
    const fill=g.createLinearGradient(0,0,w,h);fill.addColorStop(0,'#244851');fill.addColorStop(.52,'#38747b');fill.addColorStop(1,'#153d4c');
    polygon(g,left.concat([...right].reverse()),fill);
    path(g,left,'rgba(146,202,195,.51)',1);path(g,right,'rgba(91,166,163,.45)',.8);
    path(g,flow,'rgba(142,203,192,.35)',.8,[10,9,2,8]);
    for(let i=0;i<140;i++) {
      const v=hash(i,620),x=(stream(v)+(hash(i,779)*1.8-.9)*waterWidth(v))*w;
      path(g,[{x,y:v*h},{x:x+2+hash(i,640)*2.5,y:v*h-.5}],'rgba(164,218,211,.22)',.8);
    }
  }
  function paintRoad(g,w,h,world,road) {
    // A rounded survey traverse drapes to the local terrain.
    let p=road[0],smoothRoad=[p];
    for(let i=1;i<road.length-1;i++) {
      const a=road[i],b=road[i+1],end=[(a[0]+b[0])/2,(a[1]+b[1])/2];
      for(let k=1;k<=9;k++){const t=k/9,s=1-t;smoothRoad.push([s*s*p[0]+2*t*s*a[0]+t*t*end[0],s*s*p[1]+2*t*s*a[1]+t*t*end[1]]);}
      p=end;
    }
    smoothRoad.push(road[road.length-1]);
    const pts=smoothRoad.map(([u,v])=>world.point(u,v));
    g.lineJoin='round';g.lineCap='round';
    path(g,pts,'#162a30',4.8);path(g,pts,'#907b55',2.9);path(g,pts,'#d8c59a',1,[3,6]);
    for(let i=1;i<smoothRoad.length-1;i++) {
      const [u,v]=smoothRoad[i],dw=Math.abs(u-stream(v));
      if(dw>waterWidth(v)*.82||i%2)continue;
      const a=pts[i-1],b=pts[i+1],m=pts[i],len=Math.hypot(b.x-a.x,b.y-a.y);
      if(len<.1)continue;
      const tx=(b.y-a.y)/len*3.5,ty=(a.x-b.x)/len*3.5;
      path(g,[{x:m.x-tx,y:m.y-ty},{x:m.x+tx,y:m.y+ty}],'#c9bb95',1.8);
    }
  }
  function forest(g,w,h,plot) {
    const n=clamp(Math.round(w*h/500),550,2900),points=[];
    for(let i=0;i<n;i++) {
      const u=hash(i,85)*1.02-.01,v=hash(i,86)*1.05, z=height(u,v);
      if(z>.122||z<.021||noise(u*19,v*16)<.45)continue;
      if(Object.values(stations).some(s=>Math.hypot(u-s.x,v-s.y)<.037))continue;
      points.push({u,v,p:plot.point(u,v,z),size:(2+hash(i,111)*3.6)*clamp(Math.sqrt(w*h)/670,.7,1.4)});
    }
    points.sort((a,b)=>a.v-b.v);
    g.lineWidth=.6;
    for(const {p,size:s} of points) {
      const x=p.x,y=p.y;
      polygon(g,[{x:x-s*.50,y},{x,y:y-s*1.75},{x:x+s*.49,y}], '#162f34');
      polygon(g,[{x:x-s*.50,y},{x,y:y-s*1.75},{x:x-.07*s,y:y-.15*s}],'#557776');
    }
  }
  function stationScene(g,w,h,id,p) {
    const x=p.x*w,y=p.y*h,side=id==='driving'?-1:1;
    const s=clamp(Math.sqrt(w*h)/710,.78,1.5);
    g.save();g.translate(x+side*12*s,y+2*s);g.scale(s,s);
    const P=(a,b,c=0)=>({x:a*.89-b*.78,y:a*.32+b*.46-c});
    const line=(a,b,color,width=1)=>path(g,[P(...a),P(...b)],color,width);
    function hut(i,j,sx,sy,z) {
      const a=P(i,j),b=P(i+sx,j),c=P(i+sx,j+sy),d=P(i,j+sy);
      const A=P(i,j,z),B=P(i+sx,j,z),C=P(i+sx,j+sy,z),D=P(i,j+sy,z);
      polygon(g,[a,b,B,A],'#456671');polygon(g,[b,c,C,B],'#2b434b');
      polygon(g,[c,d,D,C],'#486369');polygon(g,[A,B,C,D],'#9ab0aa');
      path(g,[A,B,C,D,A],'#c1c7b2',.75);
      for(let l=2;l<sx;l+=3)line([i+l,j+sy,z-2],[i+l+1,j+sy,z-2],'#edc384',1.5);
    }
    function mast(i,j,hgt) {
      const peak=[i+2,j+2,hgt];
      for(const [du,dv] of [[-2,-2],[5,-2],[5,5]])line([i+du,j+dv,0],peak,'#a9c7b6',1);
      line([i-1,j,3],[i+3,j+3,hgt*.62],'#b2baa0',.7);
      const top=P(...peak);g.fillStyle='#ffd18c';g.fillRect(top.x-1,top.y-1,2,2);
    }
    g.fillStyle='rgba(12,27,31,.50)';g.beginPath();g.ellipse(1,4,21,6,.11,0,Math.PI*2);g.fill();
    if(id==='survey') {
      hut(0,1,11,7,5);mast(11,-5,23);
      const d=P(4,0,8);g.save();g.translate(d.x,d.y);g.rotate(-.6);g.fillStyle='#afc5b7';g.beginPath();g.ellipse(0,0,5,2.4,0,0,Math.PI);g.fill();g.restore();
    } else if(id==='routes') {
      for(const i of [-4,13]){line([i,0,0],[i,0,9],'#c2c8b1',1.5);line([i,6,0],[i,6,9],'#a7bbb0',1.3);}
      polygon(g,[P(-9,0,4),P(18,0,4),P(18,6,4),P(-9,6,4)],'#95a49a');
      for(const j of [0,6]){line([-8,j,5],[0,j,9],'#a7c4b8');line([0,j,9],[5,j,7],'#a7c4b8');line([5,j,7],[13,j,9],'#a7c4b8');}
    } else if(id==='driving') {
      hut(-13,0,14,7,4);hut(-10,7,7,5,4.2);
      for(let i=0;i<3;i++){line([i*3,1,0],[i*3,1,6],'#ded0a2',1);line([i*3,1,6],[i*3+1.6,1,6],'#ebb680',1.5);}
    } else {
      hut(-6,-1,14,7,7);hut(3,6,8,6,4);mast(-9,-2,17);
      line([-7,-2,15],[5,-2,15],'#ddd2a7',1.5);line([5,-2,15],[5,-2,7],'#b0bfae',.8);
    }
    g.restore();
  }
  function underlay(g,w,h) {
    const world=makePlot(w,h);g.fillStyle='#163139';g.fillRect(0,0,w,h);
    paintTerrain(g,w,h,world);paintRiver(g,w,h);forest(g,w,h,world);
    roads.forEach(r=>paintRoad(g,w,h,world,r));
    for(const [id,p] of Object.entries(stations))stationScene(g,w,h,id,p);
    const spacing=clamp(Math.min(w,h)*.13,44,94);
    g.save();g.strokeStyle='rgba(166,205,195,.095)';g.lineWidth=.65;g.beginPath();
    for(let x=w/2%spacing;x<w;x+=spacing){g.moveTo(x,0);g.lineTo(x,h);}
    for(let y=h/2%spacing;y<h;y+=spacing){g.moveTo(0,y);g.lineTo(w,y);}
    g.stroke();g.strokeStyle='rgba(175,208,194,.32)';g.beginPath();
    for(let x=w/2%spacing;x<w;x+=spacing)for(let y=h/2%spacing;y<h;y+=spacing){
      g.moveTo(x-2.5,y);g.lineTo(x+2.5,y);g.moveTo(x,y-2.5);g.lineTo(x,y+2.5);
    }g.stroke();g.restore();
    const vignette=g.createRadialGradient(w*.48,h*.5,Math.min(w,h)*.23,w*.5,h*.49,Math.hypot(w,h)*.56);
    vignette.addColorStop(0,'rgba(5,18,24,0)');vignette.addColorStop(.73,'rgba(5,18,24,.17)');vignette.addColorStop(1,'rgba(4,15,21,.69)');g.fillStyle=vignette;g.fillRect(0,0,w,h);
    for(let x=0;x<=w;x+=16){g.fillStyle='#738e885e';g.fillRect(x,1,1,x%64===0?6:3);g.fillRect(x,h-(x%64===0?6:3),1,6);}
  }
  function draw(canvas,selectedRegion) {
    const r=canvas.getBoundingClientRect(),w=Math.round(r.width),h=Math.round(r.height);
    if(!w||!h)return;
    const dpr=Math.min(2,globalThis.devicePixelRatio||1);
    const key=[w,h,dpr].join('/');let chart=charts.get(canvas);
    if(!chart){
      chart={};charts.set(canvas,chart);
      if(typeof ResizeObserver!=='undefined'){
        chart.observer=new ResizeObserver(()=>{if(canvas.isConnected===false){dispose(canvas);return;}draw(canvas,chart.selected);});
        chart.observer.observe(canvas);
      }
    }
    if(chart.key===key&&chart.selected===selectedRegion)return;
    if(chart.key!==key){
      const backing=canvas.ownerDocument.createElement('canvas');
      backing.width=Math.round(w*dpr);backing.height=Math.round(h*dpr);
      const bg=backing.getContext('2d');bg.setTransform(dpr,0,0,dpr,0,0);underlay(bg,w,h);
      chart.backing=backing;chart.key=key;
      canvas.width=backing.width;canvas.height=backing.height;
    }
    chart.selected=selectedRegion;
    const g=canvas.getContext('2d');g.setTransform(1,0,0,1,0,0);g.drawImage(chart.backing,0,0);g.setTransform(dpr,0,0,dpr,0,0);
    const p=stations[selectedRegion];if(!p)return;
    const x=p.x*w,y=p.y*h,rad=clamp(Math.min(w,h)*.075,26,48);
    const glow=g.createRadialGradient(x,y,rad*.28,x,y,rad);glow.addColorStop(0,p.color+'33');glow.addColorStop(1,p.color+'00');
    g.fillStyle=glow;g.fillRect(x-rad,y-rad,rad*2,rad*2);
    g.save();g.strokeStyle=p.color;g.globalAlpha=.58;g.lineWidth=1.25;
    for(let i=0;i<4;i++){g.beginPath();g.arc(x,y,rad*.86,(i+.13)*Math.PI/2,(i+.55)*Math.PI/2);g.stroke();}
    g.restore();
  }
  function dispose(canvas){const chart=charts.get(canvas);chart?.observer?.disconnect();charts.delete(canvas);}
  globalThis.OpsMap={draw,dispose};
})();
