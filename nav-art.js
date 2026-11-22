/* Original field map. Screen overlays and simulation share these world coordinates. */
(() => {
  'use strict';
  const width = 900, height = 540;
  let backdrop, cachedModel;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const mix = (a, b, t) => a + (b - a) * t;
  const riverPoints = [[532,-50],[549,12],[607,71],[598,102],[519,154],[537,193],[571,223],[566,259],[521,299],[532,345],[565,383],[552,407],[489,469],[480,502],[499,566]];
  function riverAt(y) {
    let i=1;
    while(i<riverPoints.length-1 && riverPoints[i][1]<y)i++;
    const a=riverPoints[i-1], b=riverPoints[i], t=clamp((y-a[1])/(b[1]-a[1]),0,1);
    const smooth=t*t*(3-2*t);
    return mix(a[0],b[0],smooth);
  }
  function riverHalf(y){return 13.5+3.7*Math.sin(y*.026)+2.0*Math.cos(y*.053);}
  function hash(x,y){
    let i=Math.imul(x,1597334677)^Math.imul(y,3812015801);
    i=Math.imul(i^(i>>>16),2246822519);
    return ((i^(i>>>13))>>>0)/4294967296;
  }
  function noise(x,y){
    const i=Math.floor(x),j=Math.floor(y);
    let a=x-i,b=y-j;a=a*a*(3-2*a);b=b*b*(3-2*b);
    return mix(mix(hash(i,j),hash(i+1,j),a),mix(hash(i,j+1),hash(i+1,j+1),a),b);
  }
  function ridge(x,y,cx,cy,rx,ry){
    const a=(x-cx)/rx,b=(y-cy)/ry;
    return Math.max(0,1-a*a-b*b);
  }
  function polygon(g,points,color){
    g.beginPath();g.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)g.lineTo(points[i][0],points[i][1]);
    g.closePath();g.fillStyle=color;g.fill();
  }
  function line(g,x,y,xx,yy,color,w=1){
    g.beginPath();g.moveTo(x,y);g.lineTo(xx,yy);g.strokeStyle=color;g.lineWidth=w;g.stroke();
  }
  function ellipse(g,x,y,rx,ry,color){
    g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle=color;g.fill();
  }
  function rect(g,x,y,w,h,color){g.fillStyle=color;g.fillRect(x,y,w,h);}
  function drawTerrain(g){
    const heights=new Float32Array(width*height);
    const image=g.createImageData(width,height),data=image.data;
    for(let y=0;y<height;y++){
      const river=riverAt(y);
      for(let x=0;x<width;x++){
        const n=noise(x/85,y/85), k=noise(x/26+41,y/24);
        const base=Math.max(ridge(x,y,80,56,209,137),ridge(x,y,790,-32,265,153),
          ridge(x,y,816,480,192,167),ridge(x,y,168,570,221,119),ridge(x,y,366,32,125,72),ridge(x,y,396,229,67,72));
        const edge=clamp((Math.abs(x-river)-10)/48,0,1);
        heights[y*width+x]=((base*74+9*n+8*k)*(0.65+n*.42+k*.18)+2.7*noise(x/9,y/10))*edge;
      }
    }
    for(let y=0;y<height;y++){
      const river=riverAt(y),half=riverHalf(y), direction=riverAt(y+1)-river;
      for(let x=0;x<width;x++){
        const i=y*width+x,h=heights[i],n=noise(x/38+7,y/42),m=noise(x/9,y/9);
        const slope=(h-heights[Math.max(0,y-2)*width+Math.max(0,x-2)])*.65;
        const rock=clamp((h-29)/30,0,1),terrace=Math.max(0,1-Math.abs((h+1)%6-2.8)*1.35);
        const shore=Math.abs(x-river)-half+(m-.5)*2.8;
        let r=81+n*26,gc=111+n*31,b=83+n*15;
        r=mix(r,159+22*n,rock);gc=mix(gc,138+21*n,rock);b=mix(b,107+18*n,rock);
        let lum=clamp(9*slope,-35,32)+(m-.5)*13+(hash(x+4,y+2)-.5)*7-terrace*(4+8*rock);
        if(shore<13){
          const sand=clamp(1-shore/13,0,1);
          r=mix(r,171+18*m,sand);gc=mix(gc,158+16*m,sand);b=mix(b,114+12*m,sand);
          if(shore<0){
            const deep=clamp(-shore/9,0,1);
            r=mix(118,48+n*8,deep);gc=mix(177,132+n*23,deep);b=mix(151,139+n*20,deep);
            const glint=Math.sin(y*.53+(x-river)*.22-direction*8+5*m);
            lum=(m-.5)*12+(glint>.91?13:0)+(shore> -1.6?27:0);
          }
        }
        const o=4*i;data[o]=r+lum;data[o+1]=gc+lum;data[o+2]=b+lum;data[o+3]=255;
      }
    }
    g.putImageData(image,0,0);
    return heights;
  }
  function segmentDistance(x,y,a,b){
    const dx=b.x-a.x,dy=b.y-a.y;
    const t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy),0,1);
    return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);
  }
  function evergreen(g,x,y,s,k){
    ellipse(g,x+3*s,y+1.5*s,5.3*s,2.3*s,'#233e3d5c');
    const dark=k>.5?'#294f48':'#32584d',mid=k>.5?'#447057':'#50795c';
    g.save();g.translate(x,y);g.scale(s,s);
    rect(g,-.5,-1,1.3,2.3,'#645a43');
    polygon(g,[[-4.4,-.2],[-2.6,-3.7],[-3.2,-3.1],[-1.5,-6.4],[-1.9,-6.1],[0,-10.5],[2.2,-6.0],[1.6,-6.1],[3.4,-3.1],[2.5,-3.4],[4.6,-.4],[1.8,-.3],[.3,1.1]],dark);
    polygon(g,[[-4.4,-.2],[-2.7,-3.7],[-3.2,-3.1],[-1.5,-6.4],[0,-10.5],[.35,-6.3],[-.5,-5.6],[.6,-2.7],[-.9,-2.2],[0,.55]],mid);
    line(g,-1.25,-6.5,-.15,-9.6,'#9aa675',.55);g.restore();
  }
  function rock(g,x,y,s,hue='#a49c80'){
    ellipse(g,x+s*.27,y+s*.2,s*.89,s*.45,'#323d374f');
    polygon(g,[[x-s,y],[x-s*.58,y-s*.55],[x+s*.22,y-s*.79],[x+s*.91,y-s*.23],[x+s*.7,y+s*.39],[x-s*.5,y+s*.35]],hue);
    polygon(g,[[x-s*.95,y],[x-s*.56,y-s*.55],[x+s*.22,y-s*.78],[x+.05*s,y-s*.14],[x-s*.52,y+s*.1]],'#c9b997');
    polygon(g,[[x+.05*s,y-s*.14],[x+s*.91,y-s*.23],[x+s*.70,y+s*.39],[x-s*.5,y+s*.35]],'#706e5e');
  }
  function buildings(g,s,goal){
    // Lower entrance of the maintenance hangar adjoins the origin's paved turnout.
    g.save();g.translate(s.x-21,s.y-20);g.rotate(-.18);
    rect(g,-21,-12,43,32,'#777863');rect(g,-18,-17,36,25,'#343f3f');
    rect(g,-18,-19,36,19,'#a99973');rect(g,-18,-19,36,8,'#d5c098');
    for(let i=-15;i<17;i+=4)line(g,i,-18,i,-1,'#747567',.8);
    rect(g,-14,0,27,6,'#233a3b');rect(g,-13,-1.4,26,1.6,'#e7b355');
    for(let i=-13;i<15;i+=6)line(g,i,10,i+3,8,'#e3c188',1.8);
    rect(g,-23,-11,4,11,'#93835f');g.restore();
    g.save();g.translate(goal.x+17,goal.y-22);g.rotate(.09);
    rect(g,-16,-8,33,24,'#80886d');rect(g,-13,-10,24,19,'#384d50');
    polygon(g,[[-15,-11],[-3,-18],[14,-11],[12,-5],[-14,-5]],'#e9d8a8');
    polygon(g,[[-15,-11],[-3,-18],[14,-11],[-3,-12]],'#abaca0');
    rect(g,-10,-4,6,4,'#a9cfba');rect(g,3,-4,5,12,'#dac797');
    line(g,18,11,18,-27,'#324b4b',2);line(g,18,-27,23,-27,'#ddddd0',1.4);
    ellipse(g,18,-29,2,2,'#f6bd70');line(g,13,9,18,-18,'#64756d',.8);
    line(g,18,-18,24,9,'#64756d',.8);g.restore();
  }
  function paintBase(model){
    const layer=document.createElement('canvas');layer.width=width;layer.height=height;
    const g=layer.getContext('2d');
    const elev=drawTerrain(g);
    const paths=model.edges.map(([a,b])=>[model.nodes[a],model.nodes[b]]);
    const nearRoad=(x,y)=>paths.some(([a,b])=>segmentDistance(x,y,a,b)<14);
    // Place clusters and cliff fragments in stable world coordinates.
    for(let row=0;row<91;row++){
      for(let col=0;col<150;col++){
        const k=hash(col+28,row),x=col*6+k*5.8,y=row*6+5.8*hash(row+2,col);
        if(x>=width||y>=height||Math.abs(x-riverAt(y))<riverHalf(y)+3||nearRoad(x,y))continue;
        const h=elev[Math.floor(y)*width+Math.floor(x)],coverage=noise(x/43,y/38+3)*.67+noise(x/93,y/81)*.33;
        if(h>43&&k>.79){rock(g,x,y,2.5+5*k);}
        else if(h<46&&k>1-clamp((coverage-.4)*3.2,0,.77)){evergreen(g,x,y,.62+.62*hash(row,col+9),coverage);}
        else if(k>.95){line(g,x,y,x+2,y-1.5,'#aeb38599',.85);}
      }
    }
    g.lineCap='round';g.lineJoin='round';
    for(const [stroke,w] of [['#5e6650',14],['#b8a780',11.5],['#d0bc92',8.4]]){
      for(const [a,b] of paths)line(g,a.x,a.y,b.x,b.y,stroke,w);
    }
    for(const [a,b] of paths){
      const length=Math.hypot(b.x-a.x,b.y-a.y),dx=(b.x-a.x)/length,dy=(b.y-a.y)/length;
      function roadLine(offset,color,w){
        line(g,a.x-dy*offset,a.y+dx*offset,b.x-dy*offset,b.y+dx*offset,color,w);
      }
      roadLine(2.1,'#baa882aa',.8);roadLine(-2.1,'#e5cc9a99',.8);
      let start=null;
      function bridge(first,last){
        const span=last-first,mid=(first+last)*.5,cx=a.x+dx*mid,cy=a.y+dy*mid;
        g.save();g.translate(cx,cy);g.rotate(Math.atan2(dy,dx));
        rect(g,-span*.5+1,-5,span,13,'#283e386e');
        rect(g,-span*.5,-6,span,12,'#90806a');
        for(let xx=-span*.5+1;xx<span*.5;xx+=3.1){
          line(g,xx,-5.4,xx,5.4,'#c0aa83',1.25);
        }
        for(const yy of [-6,6]){
          line(g,-span*.5,yy,span*.5,yy,'#544e44',1.8);
          line(g,-span*.5,yy-1,span*.5,yy-1,'#d6c59c',.8);
          for(let xx=-span*.5;xx<span*.5+1;xx+=9)rect(g,xx-.6,yy-1.4,1.4,2.7,'#614d3e');
        }
        g.restore();
      }
      for(let d=0;d<=length+2;d+=1.5){
        const x=a.x+dx*d,y=a.y+dy*d;
        const inRiver=d<=length&&Math.abs(x-riverAt(y))<riverHalf(y)+6;
        if(inRiver&&start===null)start=d;
        if(!inRiver&&start!==null){bridge(start,d);start=null;}
      }
    }
    buildings(g,model.nodes.S,model.nodes.G);
    return layer;
  }
  function rover(g,state){
    if(!state)return;
    const {x,y,heading=0}=state;
    g.save();g.translate(x,y);g.rotate(heading);
    ellipse(g,1.2,2,10.8,6.8,'#1c333286');
    for(const xx of [-6,4.7])for(const yy of [-6.3,4])rect(g,xx,yy,4.1,2.7,'#253237');
    polygon(g,[[-8.2,-4.8],[4,-4.8],[9,-2.5],[9,2.5],[4,4.8],[-8.2,4.8]],'#3a4946');
    polygon(g,[[-7.5,-4.1],[4,-4.1],[7,-2.2],[7,2.2],[4,4.1],[-7.5,4.1]],'#f4c36c');
    rect(g,-6.5,-2.8,4.6,5.6,'#d7ddd0');rect(g,-.8,-2.9,4.6,5.8,'#4b6768');
    rect(g,6,-2,1.7,1.1,'#e8ffdf');rect(g,6,1,1.7,1.1,'#e8ffdf');
    line(g,-5,-2,-8,-6,'#e0d8b9',.7);g.restore();
  }
  function render(canvas,view={}){
    const model=globalThis.NavModel;
    if(!model)return;
    if(!backdrop||cachedModel!==model){backdrop=paintBase(model);cachedModel=model;}
    const bounds=canvas.getBoundingClientRect(),dpr=Math.min(2,globalThis.devicePixelRatio||1);
    const w=Math.round(bounds.width*dpr),h=Math.round(bounds.height*dpr);
    if(!w||!h)return;
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    const g=canvas.getContext('2d');
    g.setTransform(w/width,0,0,h/height,0,0);
    g.drawImage(backdrop,0,0,width,height);
    if(view.rock){
      const {x,y,r=8}=view.rock;
      rock(g,x,y,r*1.06,'#9e826a');rock(g,x-r*.65,y+r*.51,.42*r,'#ac967a');rock(g,x+r*.68,y-r*.44,.33*r,'#b39d7c');
    }
    rover(g,view.rover);
  }
  function renderRover(canvas,state){
    const box=canvas.getBoundingClientRect(),ratio=Math.min(2,globalThis.devicePixelRatio||1);
    const w=Math.round(box.width*ratio),h=Math.round(box.height*ratio);
    if(!w||!h)return;
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    const g=canvas.getContext('2d');
    g.setTransform(w/width,0,0,h/height,0,0);g.clearRect(0,0,width,height);
    g.save();g.translate(state.x,state.y);g.scale(1.65,1.65);
    ellipse(g,0,0,12,10,'#152a265c');
    rover(g,{x:0,y:0,heading:state.heading});g.restore();
  }
  globalThis.NavArt={render,renderRover};
})();
