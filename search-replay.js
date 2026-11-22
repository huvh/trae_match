(() => {
  'use strict';
  const full = Math.PI * 2;
  const ink = {paper:'#132a30',edge:'#839f9d',front:'#7df4dc',active:'#ffcf73',closed:'#c3cdc5',blocked:'#f38e79',preview:'#f0ce8a',final:'#baf4ad',text:'#edf3e4'};
  const terrain = new WeakMap();

  function background(canvas, w, h, ratio) {
    let cached=terrain.get(canvas);
    if(cached && cached.w===w && cached.h===h && cached.ratio===ratio)return cached.image;
    const layer=document.createElement('canvas');
    layer.width=canvas.width;layer.height=canvas.height;
    const c=layer.getContext('2d');c.scale(ratio,ratio);
    const sky=c.createLinearGradient(0,0,w,h);sky.addColorStop(0,'#213d40');sky.addColorStop(.52,'#162e35');sky.addColorStop(1,'#203536');
    c.fillStyle=sky;c.fillRect(0,0,w,h);
    // Sparse contour fragments stay behind the road topology and are invariant during scrubbing.
    c.lineWidth=.8;c.strokeStyle='#93b7a41d';
    for(const [ox,oy,scale] of [[-.04,.03,.9],[.95,.87,1.04],[.49,1.16,.65]]){
      for(let band=1;band<11;band++){
        c.beginPath();
        for(let i=0;i<=70;i++){
          const a=i*full/70,n=1+.10*Math.sin(3*a+oy)+.07*Math.sin(5*a+ox+band*.15);
          const r=(band+1)*Math.min(w,h)*.069*scale*n;
          const x=ox*w+Math.cos(a)*r*1.52,y=oy*h+Math.sin(a)*r;
          if(i)c.lineTo(x,y);else c.moveTo(x,y);
        }
        c.stroke();
      }
    }
    c.strokeStyle='#a1bbac26';c.lineWidth=.8;
    for(let x=16;x<w;x+=21){c.beginPath();c.moveTo(x,1);c.lineTo(x,4);c.stroke();}
    terrain.set(canvas,{w,h,ratio,image:layer});return layer;
  }
  function segment(c, a, b, color, width, dash=[]) {
    c.strokeStyle=color;c.lineWidth=width;c.setLineDash(dash);
    c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.setLineDash([]);
  }
  function dot(c, p, r, fill, edge, width=1.5) {
    c.beginPath();c.arc(p.x,p.y,r,0,full);
    if(fill){c.fillStyle=fill;c.fill();}
    if(edge){c.strokeStyle=edge;c.lineWidth=width;c.stroke();}
  }
  function diamond(c,p,r,fill,stroke) {
    c.beginPath();c.moveTo(p.x,p.y-r);c.lineTo(p.x+r,p.y);c.lineTo(p.x,p.y+r);c.lineTo(p.x-r,p.y);c.closePath();
    c.fillStyle=fill;c.fill();if(stroke){c.lineWidth=1.5;c.strokeStyle=stroke;c.stroke();}
  }
  function path(c,nodes,ids,color,width,dash=[]) {
    const points=(ids||[]).map(i=>nodes[i]).filter(Boolean);
    if(points.length<2)return;
    c.lineWidth=width;c.lineCap=c.lineJoin='round';c.strokeStyle=color;c.setLineDash(dash);
    c.beginPath();c.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))c.lineTo(p.x,p.y);c.stroke();c.setLineDash([]);
  }
  function places(nodes, width, height) {
    const xs=nodes.map(n=>n.x),zs=nodes.map(n=>n.z);
    const x1=Math.min(...xs),x2=Math.max(...xs),z1=Math.min(...zs),z2=Math.max(...zs);
    const wide=(z2-z1)>(x2-x1)*1.2 && width>height*1.25;
    const dx=wide?z2-z1:x2-x1,dy=wide?x2-x1:z2-z1;
    const scale=Math.min((width-34)/Math.max(dx,1),(height-28)/Math.max(dy,1));
    return nodes.map(n=>({
      x:width/2+(wide?n.z-(z1+z2)/2:n.x-(x1+x2)/2)*scale,
      y:height/2+(wide?n.x-(x1+x2)/2:(z1+z2)/2-n.z)*scale
    }));
  }
  function key(c, width, y) {
    const items=[['候选',ink.front],['已展开',ink.closed],['本步',ink.active],['封路',ink.blocked]];
    const gap=Math.min(79,(width-16)/items.length),left=(width-gap*items.length)/2;
    c.font='600 11px system-ui,sans-serif';c.textBaseline='middle';c.textAlign='left';
    items.forEach(([label,color],i)=>{
      const p={x:left+i*gap+8,y};
      if(i===0)dot(c,p,3.3,null,color,1.7);
      if(i===1)dot(c,p,3.0,color,null);
      if(i===2)diamond(c,p,4.5,color,null);
      if(i===3){segment(c,{x:p.x-3,y:y-3},{x:p.x+3,y:y+3},color,1.8);segment(c,{x:p.x-3,y:y+3},{x:p.x+3,y:y-3},color,1.8);}
      c.fillStyle=ink.text;c.fillText(label,p.x+7,y+.3);
    });
  }
  function draw(canvas, data, step=0) {
    if(!canvas)return;
    const bounds=canvas.getBoundingClientRect(),w=Math.max(1,Math.round(bounds.width)),h=Math.max(1,Math.round(bounds.height));
    if(w<20||h<20)return;
    const ratio=Math.min(globalThis.devicePixelRatio||1,2);
    const wc=Math.round(w*ratio),hc=Math.round(h*ratio);
    if(canvas.width!==wc)canvas.width=wc;if(canvas.height!==hc)canvas.height=hc;
    const c=canvas.getContext('2d');if(!c)return;
    c.setTransform(1,0,0,1,0,0);c.drawImage(background(canvas,w,h,ratio),0,0);c.setTransform(ratio,0,0,ratio,0,0);
    c.lineJoin=c.lineCap='round';const raw=data?.nodes||[];
    if(!raw.length){canvas.setAttribute('aria-label','等待搜索路网');return;}
    const frames=data.frames||[],index=Math.max(0,Math.min(frames.length-1,Math.floor(Number(step)||0)));
    const frame=frames[index]||{},current=frame.current,closed=new Set(frame.closed||[]),open=new Set(frame.open||[]);
    const final=frames.length>0&&index===frames.length-1&&current===data.end&&data.path?.length>1;
    const reserve=h>=103?21:0,points=places(raw,w,h-reserve),edges=data.edges||[];
    for(const e of edges){
      const a=points[e.a],b=points[e.b];if(!a||!b)continue;
      segment(c,a,b,'#0d242a',4.8);
      segment(c,a,b,e.blocked?'#cc8e7e':ink.edge,e.blocked?1.4:2.5,e.blocked?[3,4]:[]);
    }
    path(c,points,final?data.path:frame.path,final?ink.final:ink.preview,final?4.2:2.6,final?[]:[7,3]);
    for(const e of edges){if(!e.blocked)continue;const a=points[e.a],b=points[e.b];if(!a||!b)continue;
      const p={x:(a.x+b.x)/2,y:(a.y+b.y)/2};dot(c,p,4.7,'#382c2a',null);
      segment(c,{x:p.x-2.5,y:p.y-2.5},{x:p.x+2.5,y:p.y+2.5},ink.blocked,1.8);
      segment(c,{x:p.x-2.5,y:p.y+2.5},{x:p.x+2.5,y:p.y-2.5},ink.blocked,1.8);
    }
    points.forEach((p,i)=>{
      if(open.has(i))dot(c,p,3.8,ink.paper,ink.front,1.8);
      else if(closed.has(i))dot(c,p,3.1,ink.closed,ink.paper,1);
      else dot(c,p,2.5,'#698985',ink.paper,1);
    });
    for(const [id,isStart,color] of [[data.start,true,ink.front],[data.end,false,ink.final]]){
      const p=points[id];if(!p)continue;
      const active=current===id;dot(c,p,active?8:7.6,'#19363c',active?ink.active:color,active?2.4:1.5);
      c.fillStyle=active?ink.active:color;
      if(isStart){
        c.beginPath();c.moveTo(p.x-2.5,p.y-3.5);c.lineTo(p.x+3.5,p.y);c.lineTo(p.x-2.5,p.y+3.5);c.closePath();c.fill();
      }else{
        segment(c,{x:p.x-2.5,y:p.y-3.5},{x:p.x-2.5,y:p.y+4},color,1.3);
        c.fillRect(p.x-2,p.y-3,2.1,2.1);c.fillRect(p.x+.1,p.y-.9,2.1,2.1);c.fillRect(p.x+2.2,p.y-3,2.1,2.1);
      }
    }
    if(points[current]&&current!==data.start&&current!==data.end)diamond(c,points[current],6.6,ink.active,'#604a26');
    if(reserve){c.fillStyle='#12272fec';c.fillRect(0,h-reserve,w,reserve);segment(c,{x:0,y:h-reserve},{x:w,y:h-reserve},'#5b79783d',1);key(c,w,h-reserve/2);}
    const f=[frame.g,frame.h,frame.f];
    const cost=f.every(Number.isFinite)?'，已走代价 '+f[0].toFixed(1)+'，估计剩余 '+f[1].toFixed(1)+'，总代价估计 '+f[2].toFixed(1)+(data.unit||''):'';
    canvas.setAttribute('role','img');canvas.setAttribute('aria-label',frames.length?'搜索回放第 '+(index+1)+' 步，已展开 '+closed.size+' 个路口，候选 '+open.size+' 个'+cost+'。':'搜索路网，尚无本次搜索记录。');
  }
  globalThis.SearchReplay={draw};
})();
