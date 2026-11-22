(() => {
  'use strict';
  const P = (x,y) => ({x,y});
  const meters = value => (value*.25).toFixed(1);
  const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const mix = (a,b,t) => P(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const length = path => path.slice(1).reduce((s,p,i)=>s+dist(path[i],p),0);
  const gap = (p,a,b) => {
    const dx=b.x-a.x,dy=b.y-a.y;
    return dist(p,mix(a,b,clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1)));
  };
  const inside = p => p.x>=18&&p.x<=782&&p.y>=25&&p.y<=435;
  const clear = (a,b,rocks,margin=8) => inside(a)&&inside(b)&&rocks.every(o=>gap(o,a,b)>=o.r+margin);
  const colors = {road:'#ffdc88',tree:'#8ce7d8',dim:'#b1cebe',fail:'#ffaa89',route:'#fff3ab'};
  function stroke(c,pts,color,width=2,dash=[]) {
    if(pts.length<2)return;
    c.save();c.beginPath();c.setLineDash(dash);c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';
    c.moveTo(pts[0].x,pts[0].y);pts.slice(1).forEach(p=>c.lineTo(p.x,p.y));c.stroke();c.restore();
  }
  function halo(c,p,r){
    c.save();c.beginPath();c.arc(p.x,p.y,r,0,Math.PI*2);c.strokeStyle='#f0d58b70';c.setLineDash([6,8]);c.lineWidth=1.4;c.stroke();c.restore();
  }
  function dot(c,p,r,fill,outline) {
    c.beginPath();c.arc(p.x,p.y,r,0,Math.PI*2);c.fillStyle=fill;c.fill();
    if(outline){c.strokeStyle=outline;c.lineWidth=2;c.stroke();}
  }
  function label(c,p,txt,color='#fff0be'){
    c.save();c.font='bold 16px system-ui';c.textAlign='center';c.lineWidth=4;c.strokeStyle='#142c2b';c.strokeText(txt,p.x,p.y);c.fillStyle=color;c.fillText(txt,p.x,p.y);c.restore();
  }
  function rock(c,o){
    c.save();c.translate(o.x,o.y);c.beginPath();
    const rim=Array.from({length:10},(_,i)=>{const a=i*Math.PI/5;return P(Math.cos(a)*o.r*(.93+.07*Math.cos(i*2)),Math.sin(a)*o.r);});
    c.moveTo(rim[0].x,rim[0].y);rim.slice(1).forEach(p=>c.lineTo(p.x,p.y));c.closePath();c.fillStyle='#877862';c.shadowBlur=5;c.shadowColor='#122b28';c.fill();c.shadowBlur=0;
    for(let i=0;i<rim.length;i++){c.beginPath();c.moveTo(-.22*o.r,-.16*o.r);c.lineTo(rim[i].x,rim[i].y);c.lineTo(rim[(i+1)%rim.length].x,rim[(i+1)%rim.length].y);c.closePath();c.fillStyle=['#8b8069','#958970','#ada082','#b1a082','#8b816c','#817a68','#716c5f','#79715f','#897964','#927e67'][i];c.fill();}
    c.restore();
  }
  function ends(c,start,goal){
    dot(c,start,10,'#286963','#bff2d2');dot(c,goal,12,'#273b36','#ffd383');dot(c,goal,4,'#ffd383');
    label(c,P(start.x,start.y-17),'出发');label(c,P(goal.x,goal.y-19),'接应点');
  }
  // All planning models and dioramas share planar metres; height is used only for the field equipment.
  const paint = {mint:'#82f0cc',amber:'#ffd37b',red:'#f98c6c',steel:'#607d80',chalk:'#f1e4bd',rock:'#9a8373',shadow:'#475955',lane:'#ac9471'};
  function bollard(w,p,color,height=12){
    w.post(p.x,p.y,4,height,'#526669');
    w.post(p.x,p.y,4.6,3,color,height-3);
  }
  function landingPad(w,p,color,caption){
    w.ring(p.x,p.y,16,color,3,1.4);
    w.box(p.x,p.y,15,15,2,'#6c7871');
    bollard(w,P(p.x-14,p.y+12),color,12);
    if(caption)w.label(p.x,p.y,caption,color,18);
  }
  function quarry(w,site){
    // The toe is the collision radius. The smaller blocks rise within that footprint.
    const r=site.r;
    w.rock(site.x,site.y,r*.94,r*.54+6,paint.rock);
    w.rock(site.x-r*.17,site.y-r*.12,r*.69,r*.74+5,'#a28b72');
    for(let i=0;i<7;i++){
      const angle=i*2.40+site.x*.03,rr=r*(.12+(i%3)*.045),rad=r*(.63+(i%2)*.1);
      w.rock(site.x+rad*Math.cos(angle),site.y+rad*Math.sin(angle),rr,rr*(.66+.19*(i%3)),i%2?'#857d6a':'#ab9579');
    }
    if(r>60){w.tree(site.x-r*.49,site.y-r*.49,r*.50);w.tree(site.x-r*.68,site.y-r*.27,r*.34);}
    w.ring(site.x,site.y,site.r,'#ddc7a1',1.8,1);
  }
  function depot(w,rect,index=0){
    const [l,t,r,b]=rect,x=(l+r)/2,y=(t+b)/2,ww=r-l,dd=b-t;
    const h=Math.min(31,Math.max(13,Math.min(ww,dd)*.21));
    w.box(x,y,ww,dd,h,'#596b65');
    w.box(x,y,ww+1,dd+1,3,index%2?'#bb936d':'#94a5a1',h);
    // Corrugations, doors and a rooftop ventilator give each footprint a readable industrial silhouette.
    for(let xx=l+8;xx<r-6;xx+=22)w.box(xx,y,1.5,dd,1.6,'#d1c3a2',h+3);
    if(ww>45&&dd>40){
      w.box(x+ww*.19,y-dd*.18,12,8,5,'#586d72',h+3);
      w.box(x,b-1,ww*.36,2,h*.7,'#354b50',0);
    }
  }
  function woodland(w,points){
    for(const [x,y,h] of points)w.tree(x,y,h);
  }
  function direction(w,a,b,color,h=7){
    const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
    if(d<.1)return;
    const x=dx/d,y=dy/d,tip=Math.min(10,d*.42),wing=tip*.56;
    w.line([a,b],color,3,h);
    w.line([P(b.x-x*tip-y*wing,b.y-y*tip+x*wing),b,P(b.x-x*tip+y*wing,b.y-y*tip-x*wing)],color,3,h);
  }
  // Path execution reuses the same geometry that the player built.
  function runner(api){
    let path=[],i=0,vehicle=null,heading=0,active=false,done;
    return {
      get active(){return active;},
      go(points,finish){path=points.map(p=>({...p}));i=1;vehicle={...path[0]};heading=path[0].h??0;active=true;done=finish;},
      tick(dt){if(!active)return;let travel=270*dt;
        while(i<path.length&&travel>0){
          const d=dist(vehicle,path[i]);heading=Number.isFinite(path[i].h)?path[i].h:Math.atan2(path[i].y-vehicle.y,path[i].x-vehicle.x);
          if(travel>=d){travel-=d;vehicle={...path[i++]};}
          else{vehicle=mix(vehicle,path[i],travel/d);travel=0;}
        }
        if(i>=path.length){active=false;done();}
      },
      world(w,idle,initialHeading=0){
        const p=vehicle||idle;
        if(p)w.rover(p.x,p.y,vehicle?heading:initialHeading,'#e6ad5f');
      },
      draw(c){if(vehicle)api.art.rover(c,vehicle.x,vehicle.y,heading);}
    };
  }
  function shortest(points,adj,start,end){
    const costs=points.map(()=>Infinity),prev=points.map(()=>-1),closed=new Set();costs[start]=0;
    while(closed.size<points.length){let u=-1;
      for(let i=0;i<points.length;i++)if(!closed.has(i)&&Number.isFinite(costs[i])&&(u<0||costs[i]<costs[u]))u=i;
      if(u<0)break;if(u===end){const path=[];for(let j=u;j!==-1;j=prev[j])path.unshift(j);return path;}
      closed.add(u);
      for(const v of adj[u]){const next=costs[u]+dist(points[u],points[v]);if(next<costs[v]){costs[v]=next;prev[v]=u;}}
    }return [];
  }
  function mission(id,title,algorithm,brief,goal,how,create){
    globalThis.FieldMissions.push({id,title,algorithm,region:'routes',lesson:id,brief,goal,how,create});
  }
  mission('prm','布设峡谷路标','PRM 概率路网','桥面记录丢失。巡检车能验证附近的路标连线，你来补足采样点。','在出发地与接应点之间建成连通路网。','点空地布设路标。相距 39.3 米以内且中途无岩石的节点会连线，接通后派车。',api=>{
    const s=P(60,226),g=P(740,222),obstacles=[{x:258,y:185,r:77},{x:450,y:315,r:83},{x:568,y:77,r:53}];
    const pts=[s,g],run=runner(api);let adj,route=[];
    function connect(){adj=pts.map(()=>[]);for(let i=0;i<pts.length;i++)for(let j=0;j<i;j++)
      if(dist(pts[i],pts[j])<=157&&clear(pts[i],pts[j],obstacles)){adj[i].push(j);adj[j].push(i);}
      route=shortest(pts,adj,0,1);}
    function update(){connect();api.status(route.length?'两端已接通，可以派车验证。':'已有 '+(pts.length-2)+' 个路标。寻找下一段能安全相连的空地。');}
    connect();
    api.button('撤下末个路标',()=>{if(!run.active&&pts.length>2){pts.pop();update();}});
    api.button('派车穿越',()=>{if(run.active)return;if(!route.length){api.status('两端仍在不同的连通分量中。补点跨过断口。');return;}
      const used=route.map(i=>pts[i]);run.go(used,()=>api.win('巡检车沿 '+(used.length-1)+' 条经碰撞检查的边抵达，行程 '+meters(length(used))+' 米。'));});
    return {pointer(t,x,y){if(t!=='down'||run.active)return;const p=P(x,y);
      if(!clear(p,p,obstacles)){api.status('此处岩体阻挡，改在边缘的空地采样。');return;}
      if(pts.some(q=>dist(p,q)<15))return;if(pts.length>=24){api.status('路标已用完，可撤回末个点。');return;}pts.push(p);update();},
      tick:dt=>run.tick(dt),world(w){
        woodland(w,[[30,68,19],[53,56,23],[747,385,20]]);
        obstacles.forEach(o=>quarry(w,o));
        const latest=(pts.length>2?pts.at(-1):s);
        w.ring(latest.x,latest.y,157,'#91bcac',1.4,1);
        adj.forEach((edges,i)=>edges.forEach(j=>{if(i<j)w.line([pts[i],pts[j]],'#a6cbbd',2,5);}));
        if(route.length)w.line(route.map(i=>pts[i]),paint.mint,4.5,7);
        pts.slice(2).forEach(p=>bollard(w,p,paint.mint,12));
        landingPad(w,s,paint.mint,'出发');landingPad(w,g,paint.amber,'接应点');
        run.world(w,s);
      },draw(c){halo(c,pts.length>2?pts[pts.length-1]:s,157);obstacles.forEach(o=>rock(c,o));adj.forEach((edges,i)=>edges.forEach(j=>{if(i<j)stroke(c,[pts[i],pts[j]],colors.dim,2,[5,4]);}));
        stroke(c,route.map(i=>pts[i]),colors.tree,4);pts.slice(2).forEach(p=>dot(c,p,6,'#365d55',colors.tree));ends(c,s,g);run.draw(c);}};
  });
  mission('rrt','探出落石隧道','RRT 随机树','双闸泵站断了电，维修队被落石堵在隧道口。先放飞探针，在碎石之间接出一条车能走的路。','将搜索树穿过狭道，接入东面的接应点。','点空地发出探针，最近的树枝会朝它延伸。也可启动持续探路，调节扩展步长和向出口采样的概率。',api=>{
    const s=P(64,325),g=P(736,112),rocks=[{x:245,y:282,r:83},{x:432,y:139,r:78},{x:573,y:316,r:82}];
    const tree=[{...s,parent:-1}],run=runner(api);let rejected=[],route=[],sample=null,nearest=s;
    let probe={...s},rotor=0;
    let branch=76,bias=.16,seed=60948,attempts=0,blocked=0,automatic=false,clock=0;
    const random=()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296);
    function expand(target){
      if(run.active||route.length)return;sample=target;attempts++;
      let near=0;tree.forEach((p,i)=>{if(dist(p,sample)<dist(tree[near],sample))near=i;});
      nearest=tree[near];const d=dist(nearest,sample);if(d<2)return;
      const p=mix(nearest,sample,Math.min(1,branch/d));
      if(!clear(nearest,p,rocks)){blocked++;rejected=[nearest,p];api.status('第 '+attempts+' 次采样 · 岩面截断了这根树枝。可调短步长或减少出口偏置。');return;}
      rejected=[];tree.push({...p,parent:near});const last=tree.length-1;
      if(dist(p,g)<=65&&clear(p,g,rocks)){automatic=false;route=[g];for(let j=last;j>=0;j=tree[j].parent)route.unshift(tree[j]);
        api.status('两端已连通。巡检车正沿回溯出的树枝穿越岩场。');
        run.go(route,()=>api.win('采样 '+attempts+' 次，受阻 '+blocked+' 次。搜索树含 '+tree.length+' 个节点，回溯路线 '+meters(length(route))+' 米。步长 '+meters(branch)+' 米，出口偏置 '+Math.round(bias*100)+'%。'));return;}
      api.status('采样 '+attempts+' 次 · 有效节点 '+tree.length+' · 受阻 '+blocked+' 次。金色标记为采样目标，青色为树枝。');
    }
    function sampleNext(){expand(random()<bias?g:P(20+random()*760,29+random()*402));}
    api.slider('扩展步长（米）',8,26,19,1,v=>{branch=v*4;});
    api.slider('出口偏置（%）',0,70,16,2,v=>{bias=v/100;});
    api.button('单次随机采样',sampleNext);
    const auto=api.button('持续探路',()=>{if(route.length)return;automatic=!automatic;auto.textContent=automatic?'暂停探路':'持续探路';});
    return {telemetry:()=>['探针发射',attempts,'树节点',tree.length,'岩面受阻',blocked],
      help(){if(route.length)return {label:'路径已接通，巡检车沿父节点回溯得到的路线穿越。'};
        if(automatic)return {label:'金点是采样目标，青线是保留的分支。可随时暂停，换步长或出口偏置再探。'};
        if(attempts)return {label:rejected.length?'刚才的分支碰壁了。换一个采样方向，或缩短步长。':'继续点空地指定采样方向，也可以启动持续探路。'};
        return {label:'点岩石一侧的空地发出探针，或按「单次随机采样」观察第一根树枝。',target:{kind:'down',x:132,y:390}};},
      pointer(type,x,y){if(type==='down'&&inside(P(x,y)))expand(P(x,y));},
      tick(dt){run.tick(dt);rotor+=dt*9;const tip=tree.at(-1),ease=1-Math.exp(-dt*5);probe=mix(probe,tip,ease);if(automatic){clock+=dt;while(automatic&&clock>=.10){clock-=.10;sampleNext();}}},world(w){
        rocks.forEach(o=>quarry(w,o));woodland(w,[[45,70,24],[68,51,20],[753,368,19]]);
        for(const node of tree.slice(1)){w.line([tree[node.parent],node],paint.mint,3,5);w.post(node.x,node.y,2.6,6,'#b3d3b9');}
        const tip=tree.at(-1);w.ring(tip.x,tip.y,branch,'#90bcb1',1.5,2);
        if(sample){w.ring(sample.x,sample.y,8,paint.amber,2.8,5);w.dot(sample.x,sample.y,paint.amber,4,10);w.line([nearest,sample],'#bea46e',1,5);}
        if(rejected.length){w.line(rejected,paint.red,4,8);w.label(rejected[1].x,rejected[1].y,'扩展受阻',paint.red,19);}
        if(route.length)w.line(route,paint.amber,5,8);
        landingPad(w,s,paint.mint,'出发');landingPad(w,g,paint.amber,'隧道出口');
        for(const q of [s,g]){
          const east=q===g,sideX=east?17:-17;
          w.box(q.x+sideX,q.y-21,23,14,13,'#59695e');
          w.box(q.x+sideX,q.y-21,26,17,2,'#c5a27f',13);
          w.box(q.x+sideX,q.y-13,12,1.5,5,'#57848b',6);
          w.post(q.x+sideX,q.y-25,1,31,'#707b72');w.dot(q.x+sideX,q.y-25,'#ffd269',2.2,32);
          for(const side of [-1,1])w.box(q.x,q.y+side*17,9,7,28,'#8c7967');w.box(q.x,q.y,10,41,5,'#c0a17a',26);w.dot(q.x,q.y,paint.amber,3,31);}
        if(!route.length){
          w.subject?.(probe.x,probe.y);
          const z=23+Math.sin(rotor)*1.5;w.box(probe.x,probe.y,12,8,4,'#e4b364',z);
          for(const dx of [-7,7])for(const dy of [-6,6]){
            w.beam(probe.x,probe.y,z+2,probe.x+dx,probe.y+dy,z+3,2,'#526b70');
            w.ring(probe.x+dx,probe.y+dy,4.2,'#e1dbb2',1.2,z+4);
          }
        }
        run.world(w,s);
      },draw(c){halo(c,tree[tree.length-1],branch);rocks.forEach(o=>rock(c,o));tree.slice(1).forEach(p=>stroke(c,[tree[p.parent],p],colors.tree,3));tree.forEach(p=>dot(c,p,4,'#fbe9ad'));stroke(c,rejected,colors.fail,4,[5,3]);stroke(c,route,colors.route,5);ends(c,s,g);run.draw(c);}};
  });
  mission('rrt-star','缩短绕山运输线','RRT* 邻域重连','第一辆车探出了过长的山脊绕道。供电车需要在同一棵树上找出更短的运输线。','通过补充采样和重连，把全程降到 177.5 米以内。','沿旧路下方的空地逐次点选采样位置。每次生长最多 28 米，近邻会比较经过新节点的总代价。',api=>{
    const pts=[P(65,240),P(113,110),P(238,67),P(367,76),P(502,81),P(627,101),P(703,160),P(735,240)];
    const tree=pts.map((p,i)=>({...p,parent:i-1,cost:0}));const goal=7,rocks=[{x:385,y:171,r:69}],run=runner(api);
    const eligible=(a,b)=>dist(a,b)<=167&&clear(a,b,rocks);
    function refresh(){const costOf=i=>i===0?0:costOf(tree[i].parent)+dist(tree[i],tree[tree[i].parent]);tree.forEach((v,i)=>v.cost=costOf(i));}
    function path(){const result=[];for(let i=goal;i>=0;i=tree[i].parent)result.unshift(tree[i]);return result;}
    refresh();const original=tree[goal].cost;let changed=[];
    api.button('检验运输线',()=>{if(run.active)return;const cost=tree[goal].cost;if(cost>710){api.status('当前路线 '+meters(cost)+' 米，超出限额。把新树枝一步步延伸到接应点附近。');return;}
      run.go(path(),()=>api.win('重连使路线从 '+meters(original)+' 米缩短到 '+meters(cost)+' 米。'));});
    return {pointer(t,x,y){if(t!=='down'||run.active)return;const sample=P(x,y);let near=0;
      tree.forEach((p,i)=>{if(i!==goal&&dist(p,sample)<dist(tree[near],sample))near=i;});const d=dist(tree[near],sample);if(d<6)return;
      const p=mix(tree[near],sample,Math.min(1,112/d));if(!clear(tree[near],p,rocks)){api.status('扩展被岩面截断，请绕过岩脚。');return;}
      const candidates=tree.map((q,i)=>i).filter(i=>i!==goal&&eligible(p,tree[i]));
      const costVia=i=>tree[i].cost+dist(tree[i],p);const parent=candidates.reduce((a,b)=>costVia(a)<costVia(b)?a:b,near);
      const id=tree.length;tree.push({...p,parent,cost:costVia(parent)});changed=[];
      for(let i=1;i<id;i++){if(eligible(tree[id],tree[i])&&tree[id].cost+dist(tree[id],tree[i])+.01<tree[i].cost){
        tree[i].parent=id;changed.push(i);refresh();}}
      api.status('新点接入，'+changed.length+' 个旧节点更换父节点。现路线 '+meters(tree[goal].cost)+' / 177.5 米。');},
      tick:dt=>run.tick(dt),world(w){
        quarry(w,rocks[0]);
        woodland(w,[[61,63,21],[86,49,17],[743,366,23]]);
        w.line(pts,'#bc9d80',3,2);
        tree.slice(1).forEach(node=>w.line([tree[node.parent],node],'#9bb9a9',2,5));
        w.line(path(),paint.amber,5,7);
        tree.forEach((p,i)=>{if(changed.includes(i))bollard(w,p,paint.mint,16);else w.dot(p.x,p.y,'#d3d0ac',3.2,6);});
        if(tree.length>8){
          const tip=tree.at(-1);w.ring(tip.x,tip.y,167,'#8bb2a7',1.4,1);
          w.label(tip.x,tip.y,'重连 '+changed.length+' 处',paint.mint,17);
        }
        landingPad(w,pts[0],paint.mint,'出发');landingPad(w,pts[goal],paint.amber,meters(tree[goal].cost)+' m');
        run.world(w,pts[0]);
      },draw(c){if(tree.length>8)halo(c,tree[tree.length-1],167);rock(c,rocks[0]);stroke(c,pts,'#b3a08c',2,[5,6]);tree.slice(1).forEach(p=>stroke(c,[tree[p.parent],p],'#90b8a6',2));stroke(c,path(),colors.route,4);
        tree.forEach((p,i)=>dot(c,p,changed.includes(i)?7:4.2,changed.includes(i)?'#a2ffe3':'#eee2bd'));ends(c,pts[0],pts[goal]);run.draw(c);}};
  });
  mission('potential','脱离力场低谷','人工势场','维修队已经穿过隧道。接近泵站时，抢修车在巨石前来回犹豫。接入导航仪，查出它为什么停住，再把电源送进站。','布置临时吸引点，引导车辆绕石并回到站房。','启动导航观察合力；点岩石侧方空地布置临时吸引点，抵达时自动切回站房。',api=>{
    const s=P(75,228),g=P(729,228),obstacles=[{x:385,y:228,r:68}];
    let p={...s},temporary=null,started=false,finished=false,heading=0,lastArrow=P(50,0),trail=[{...s}],elapsed=0,beacons=0,stalled=false;
    let attraction=1,repulsion=1,influence=125,attract=P(0,0),repel=P(0,0),closest=Infinity,distanceDriven=0;
    let showField=false;
    const overlay=api.button('显示力场',()=>{showField=!showField;overlay.textContent=showField?'收起力场':'显示力场';});
    api.slider('目标引力（%）',50,160,100,5,v=>{attraction=v/100;});
    api.slider('岩壁斥力（%）',50,180,100,5,v=>{repulsion=v/100;});
    api.button('启动导航',()=>{started=true;api.status('金箭头拉向目标，红箭头推离岩壁，青箭头给出实际行进方向。卡住时在侧面投一枚信标。');});
    return {telemetry:()=>['目标引力',Math.round(Math.hypot(attract.x,attract.y)),'岩壁斥力',Math.round(Math.hypot(repel.x,repel.y)),'导航合力',Math.round(Math.hypot(attract.x+repel.x,attract.y+repel.y))],
      help(){if(!started)return {label:'先启动导航，观察车头三根力箭头。',control:'启动导航'};
        if(stalled)return {label:'引力和斥力相抵了。在巨石一侧投下临时信标，让合力转向。',target:{kind:'down',x:390,y:60}};
        return {label:temporary?'信标正在侧向牵引小车。接近信标后会恢复向维修站导航。':'金色指向目标，红色推离障碍，青色合力决定前进方向。可打开力场看周围趋势。'};},
      pointer(t,x,y){if(t!=='down'||finished)return;const b=P(x,y);if(!clear(b,b,obstacles,22)){api.status('吸引点太靠近岩石，拖到有净空的位置。');return;}
      temporary=b;beacons++;stalled=false;started=true;api.status('临时吸引点已生效。观察合力转向，接近后将切回接应点。');},tick(dt){if(!started||finished)return;
      const target=temporary||g,range=dist(p,target);if(temporary&&range<9){temporary=null;api.status('已到临时吸引点，导航恢复朝向接应点。');return;}
      if(!temporary&&range<10){finished=true;api.win('布置信标 '+beacons+' 次，车行 '+meters(distanceDriven)+' 米，离岩壁最近 '+meters(closest)+' 米。终点引力 '+Math.round(attraction*100)+'%，岩壁斥力 '+Math.round(repulsion*100)+'%。');return;}
      attract=P((target.x-p.x)/Math.max(range,1)*100*attraction,(target.y-p.y)/Math.max(range,1)*100*attraction);let vx=attract.x,vy=attract.y;
      for(const o of obstacles){const dc=dist(p,o),clearance=Math.max(1,dc-o.r);closest=Math.min(closest,clearance);if(clearance<influence){
        const force=160000*repulsion*(1/clearance-1/influence)*100/(clearance*clearance);
        vx+=(p.x-o.x)/dc*force;vy+=(p.y-o.y)/dc*force;}}
      const speed=Math.hypot(vx,vy),step=Math.min(1,104/(speed||1))*dt;
      repel=P(vx-attract.x,vy-attract.y);const previous=p;
      p=P(clamp(p.x+vx*step,16,784),clamp(p.y+vy*step,20,440));distanceDriven+=dist(p,previous);lastArrow=P(vx*.48,vy*.48);if(speed>.5)heading=Math.atan2(vy,vx);
      elapsed+=dt;if(elapsed>.12){trail.push({...p});elapsed=0;if(trail.length>850)trail.shift();}
      if(speed<2&&!stalled){stalled=true;api.status('当前位置合力接近零。点击巨石上方或下方的空地，改变引力方向。');}},
      world(w){
        for(const o of obstacles){
          quarry(w,o);
          for(const r of [o.r+30,o.r+70,o.r+110])w.ring(o.x,o.y,r,'#bb9a65',1.6,1);
        }
        woodland(w,[[50,90,20],[77,59,18],[734,386,22]]);
        if(showField){
          const target=temporary||g;
          for(let x=120;x<=705;x+=58)for(let y=72;y<=380;y+=52){
            const q=P(x,y),to=dist(q,target);if(to<2||!clear(q,q,obstacles,5))continue;
            let fx=(target.x-x)/to*100*attraction,fy=(target.y-y)/to*100*attraction;
            for(const o of obstacles){const d=dist(q,o),e=Math.max(1,d-o.r);if(e>=influence)continue;
              const f=160000*repulsion*(1/e-1/influence)*100/(e*e);fx+=(x-o.x)/d*f;fy+=(y-o.y)/d*f;}
            const mag=Math.hypot(fx,fy),size=Math.min(17,mag*.11);if(mag>.1)direction(w,q,P(x+fx/mag*size,y+fy/mag*size),'#83b9a6',4);
          }
        }
        if(trail.length>1)w.line(trail,paint.chalk,2.5,3);
        if(temporary){bollard(w,temporary,paint.mint,18);w.ring(temporary.x,temporary.y,10,paint.mint,2,2);w.label(temporary.x,temporary.y,'临时吸引点',paint.mint,23);}
        landingPad(w,s,paint.mint,'出发');landingPad(w,g,paint.amber,'维修站');
        w.rover(p.x,p.y,heading,'#e6ad5f');
        if(started){direction(w,p,P(p.x+attract.x*.45,p.y+attract.y*.45),'#ffd27f',19);
          if(Math.hypot(repel.x,repel.y)>2)direction(w,p,P(p.x+repel.x*.45,p.y+repel.y*.45),'#e87c64',16);}
        direction(w,p,P(p.x+lastArrow.x,p.y+lastArrow.y),paint.mint,13);
        if(stalled)w.label(p.x,p.y,'合力接近零',paint.red,24);
      },draw(c){obstacles.forEach(o=>{for(const r of [o.r+30,o.r+70,o.r+110]){c.beginPath();c.strokeStyle='#e3bc784d';c.arc(o.x,o.y,r,0,2*Math.PI);c.stroke();}rock(c,o);});
        stroke(c,trail,'#edf0d4',2);if(temporary){dot(c,temporary,8,'#87e6ce','#fbefac');label(c,P(temporary.x,temporary.y-15),'临时吸引点');}
        ends(c,s,g);api.art.rover(c,p.x,p.y,heading);stroke(c,[p,P(p.x+lastArrow.x,p.y+lastArrow.y)],colors.tree,4);}};
  });
  mission('sweep','扫描失联滩地','往返扫描覆盖','雨水带走了桥梁传感器。无人车的探测带宽有限，要在电量耗尽前扫过滩地。','扫描采样覆盖率至少 98%，总行程不超过 825 米。','在滩地内拖出第一条扫描线的方向，再调整行距。金色探测带要覆盖整片滩地。',api=>{
    const zone=[P(97,112),P(646,98),P(712,167),P(676,343),P(158,363),P(90,299)];
    const inZone=p=>zone.every((a,i)=>{const b=zone[(i+1)%zone.length];return (b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x)>=0;});
    const soil=[];for(let y=100;y<=361;y+=9)for(let x=90;x<=711;x+=9)if(inZone(P(x,y)))soil.push(P(x,y));
    let origin=null,drag=null,angle=null,pitch=96,scans=[],route=[],coverage=0;
    const runnerCar=runner(api);
    function rebuild(){
      if(angle===null)return;
      const ux=Math.cos(angle),uy=Math.sin(angle),nx=-uy,ny=ux;
      const normal=p=>nx*p.x+ny*p.y,axis=p=>ux*p.x+uy*p.y;
      const vals=zone.map(normal),lo=Math.min(...vals),hi=Math.max(...vals);
      const count=Math.ceil((hi-lo)/pitch);scans=[];route=[];
      for(let i=0;i<count;i++){
        const n=lo+(i+.5)*(hi-lo)/count,hits=[];
        for(let k=0;k<zone.length;k++){const a=zone[k],b=zone[(k+1)%zone.length],na=normal(a),nb=normal(b);
          if((na<=n&&nb>n)||(nb<=n&&na>n))hits.push(mix(a,b,(n-na)/(nb-na)));}
        hits.sort((a,b)=>axis(a)-axis(b));if(hits.length<2)continue;
        const pair=[hits[0],hits[hits.length-1]];scans.push(pair);if(i%2)pair.reverse();route.push(...pair);
      }
      coverage=soil.filter(p=>scans.some(([a,b])=>gap(p,a,b)<=34)).length/soil.length;
      api.status('预计采样覆盖 '+(coverage*100).toFixed(1)+'%，行程 '+meters(length(route))+' / 825 米。');
    }
    api.slider('扫描行距（米）',7.5,27.5,pitch*.25,.25,value=>{if(runnerCar.active)return;pitch=Number(value)*4;rebuild();});
    api.button('执行扫描',()=>{if(runnerCar.active)return;if(!route.length){api.status('请在滩地内拖出一段足够长的扫描方向。');return;}
      if(coverage<.98){api.status('探测带之间留有空隙。缩小行距，或转动扫描方向。');return;}
      if(length(route)>3300){api.status('覆盖充足，里程超出电量。适当加宽行距或沿长边扫描。');return;}
      runnerCar.go(route,()=>api.win('已覆盖 '+(100*coverage).toFixed(1)+'% 的验收采样点，实际航线 '+meters(length(route))+' 米。'));});
    return {pointer(t,x,y){if(runnerCar.active)return;const p=P(x,y);if(t==='down'){if(inZone(p)){origin=p;drag=p;}return;}
      if(!origin)return;drag=p;if(t==='up'){if(dist(origin,p)>35){angle=Math.atan2(p.y-origin.y,p.x-origin.x);rebuild();}else api.status('按住一个点，拖动一段距离来指定方向。');origin=drag=null;}},
      tick:dt=>runnerCar.tick(dt),world(w){
        // Samples are inside the convex working area, including along tapering shores.
        w.line([...zone,zone[0]],'#dbca8b',4,2);
        for(const q of zone)bollard(w,q,'#fbca77',13);
        for(let k=0;k<soil.length;k+=9){const q=soil[k],covered=scans.some(([a,b])=>gap(q,a,b)<=34);w.dot(q.x,q.y,covered?'#a9db8c':'#859a77',2,1);}
        for(const [a,b] of scans)w.line([a,b],'#96ad68',7,1.5);
        if(route.length){w.line(route,paint.mint,3,5);landingPad(w,route[0],paint.amber,'起扫');}
        if(origin&&drag)direction(w,origin,drag,paint.amber,8);
        const base=P(54,360);
        w.box(base.x,base.y,28,22,12,'#758d84');w.box(base.x,base.y,32,26,3,'#d8b877',12);
        w.post(base.x+11,base.y-10,1.5,27,'#c6d9c6');
        woodland(w,[[61,65,22],[85,46,24],[748,396,24],[760,365,17]]);
        w.label(432,97,angle===null?'测区边界':Math.round(coverage*100)+'% 覆盖 · '+meters(length(route))+' m',paint.chalk,14);
        runnerCar.world(w,route[0]||P(80,375));
      },draw(c){c.save();c.beginPath();zone.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle='#526a45';c.fill();c.clip();
        for(const [a,b] of scans)stroke(c,[a,b],'#c5ce705e',68);for(const p of soil){if((p.x+p.y)%4===0)dot(c,p,1.3,'#839d74');}c.restore();
        stroke(c,[...zone,zone[0]],'#d2c078',3);stroke(c,route,'#ddf6c2',2);
        if(origin&&drag){stroke(c,[origin,drag],colors.road,4);dot(c,origin,6,colors.road);}
        if(route.length){dot(c,route[0],6,'#b2ffe1');label(c,P(route[0].x,route[0].y-12),'起扫');}
        runnerCar.draw(c);}};
  });

  mission('visibility','穿过仓房盲区','可见性图','叉车要从倒塌的仓房间运出测绘仪。两点之间只有在整段视线畅通时才能直接连线。','沿可见角点拼出安全路线，长度不超过最短路线的 105%。','从小车当前位置依次点墙角外的圆点，最后点接应点。虚线表示当前可直达的角点。',api=>{
    const s=P(70,310),g=P(736,122);
    const blocks=[[209,168,331,363],[424,75,525,243],[565,268,668,367]];
    const rects=blocks.map(([l,t,r,b])=>[l-9,t-9,r+9,b+9]);
    const pts=[s,g,...rects.flatMap(([l,t,r,b])=>[P(l,t),P(r,t),P(r,b),P(l,b)])];
    function visible(a,b){
      for(const [l,t,r,bot] of rects){
        let t0=0,t1=1;
        for(const [v,d,low,high] of [[a.x,b.x-a.x,l+.05,r-.05],[a.y,b.y-a.y,t+.05,bot-.05]]){
          if(Math.abs(d)<1e-8){if(v<=low||v>=high){t1=-1;break;}}
          else{const h1=(low-v)/d,h2=(high-v)/d;t0=Math.max(t0,Math.min(h1,h2));t1=Math.min(t1,Math.max(h1,h2));}
        }
        if(t1>t0+1e-7)return false;
      }return true;
    }
    const adj=pts.map((a,i)=>pts.map((p,j)=>j).filter(j=>j!==i&&visible(a,pts[j])));
    const best=shortest(pts,adj,0,1),budget=length(best.map(i=>pts[i]))*1.05,visited=[0];let reject=null;
    const run=runner(api);
    api.button('撤回一段',()=>{if(!run.active&&visited.length>1){visited.pop();reject=null;api.status('已退回上个角点，可重新选择。');}});
    return {pointer(t,x,y){if(t!=='down'||run.active)return;const p=P(x,y);
      let k=0;pts.forEach((a,i)=>{if(dist(a,p)<dist(pts[k],p))k=i;});if(dist(pts[k],p)>28){api.status('请点选墙角旁的圆点或接应点。');return;}
      const last=visited[visited.length-1];if(k===last)return;
      if(!adj[last].includes(k)){reject=[pts[last],pts[k]];api.status('这段线穿过了安全外廓。沿可见的虚线选一处角点。');return;}
      if(visited.includes(k)){api.status('这处角点已经经过，可以撤回先前的路段。');return;}
      reject=null;const trail=[...visited,k].map(i=>pts[i]);const cost=length(trail);
      if(k===1&&cost>budget){api.status('可到达，但行程 '+meters(cost)+' 米超过限额 '+meters(budget)+' 米。撤回并减少绕行。');return;}
      visited.push(k);api.status('已接入可见角点，累计 '+meters(cost)+' / '+meters(budget)+' 米。');
      if(k===1)run.go(trail,()=>api.win('安全走廊 '+meters(cost)+' 米，可见性图最短路 '+meters(budget/1.05)+' 米。'));},
      tick:dt=>run.tick(dt),world(w){
        blocks.forEach((rect,i)=>depot(w,rect,i));
        const here=visited.at(-1),route=visited.map(i=>pts[i]);
        rects.forEach(([l,t,r,b])=>w.line([P(l,t),P(r,t),P(r,b),P(l,b),P(l,t)],'#b99e79',1.5,2));
        for(const k of adj[here])w.line([pts[here],pts[k]],'#a9c4a7',1.5,5);
        pts.slice(2).forEach((p,i)=>{const lit=adj[here].includes(i+2);w.post(p.x,p.y,lit?5:3.5,lit?9:5,lit?paint.amber:'#7d8d86');});
        if(route.length>1)w.line(route,paint.mint,4.5,7);
        if(reject)w.line(reject,paint.red,3,8);
        landingPad(w,s,paint.mint,'出发');landingPad(w,g,paint.amber,'设备接应');
        run.world(w,pts[here]);
      },draw(c){
        for(const [l,t,r,b] of blocks){c.fillStyle='#202f30';c.fillRect(l+5,t+6,r-l,b-t);c.fillStyle='#8a8674';c.fillRect(l,t,r-l,b-t);
          c.fillStyle='#6e7166';c.fillRect(l+6,t+6,r-l-12,b-t-12);for(let xx=l+10;xx<r-6;xx+=13)stroke(c,[P(xx,t+7),P(xx,b-6)],'#8b9184',2);}
        const last=visited[visited.length-1];adj[last].forEach(k=>stroke(c,[pts[last],pts[k]],'#b3c2a6',1.3,[5,6]));
        pts.slice(2).forEach((p,i)=>dot(c,p,6,adj[last].includes(i+2)?'#f4ca78':'#5b746c','#d4d7b1'));
        stroke(c,visited.map(i=>pts[i]),colors.tree,4);if(reject)stroke(c,reject,colors.fail,3,[5,4]);
        ends(c,s,g);dot(c,pts[last],8,'#84e5ce','#fff7c9');run.draw(c);}};
  });

  mission('voronoi','守住绝壁净空','Voronoi 路网','运载高杆天线时，车辆要从悬岩和水沟之间穿行。道路骨架的每一段都离两处岩心等远。','沿连续的 Voronoi 边抵达接应点，全程车身净空至少 13.75 米。','点击与当前点相连的岔口逐段行驶。观察边两侧的岩团；窄边会触发净空预警，可撤回重走。',api=>{
    const centers=[[45,228],[175,192],[322,248],[472,207],[625,257],[754,222]];
    const sites=centers.flatMap(([x,y],i)=>[P(x,y-74-(i%2)*8),P(x,y+80+(i%3)*7)]);
    const radius=19,verts=[],edgeList=[],adj=[];
    function index(p){let i=verts.findIndex(q=>dist(q,p)<.5);if(i<0){i=verts.length;verts.push(p);adj.push([]);}return i;}
    function addBisector(i,j){
      const a=sites[i],b=sites[j],mid=mix(a,b,.5),d=dist(a,b),direction=P(-(b.y-a.y)/d,(b.x-a.x)/d);
      let lo=-1e5,hi=1e5;
      function limit(ax,ay,bound){
        const den=ax*direction.x+ay*direction.y,rest=bound-ax*mid.x-ay*mid.y;
        if(Math.abs(den)<1e-8){if(rest<-.0001)lo=1e6;}
        else if(den>0)hi=Math.min(hi,rest/den);else lo=Math.max(lo,rest/den);
      }
      limit(-1,0,-45);limit(1,0,754);limit(0,-1,-50);limit(0,1,413);
      for(const q of sites)limit(2*(q.x-a.x),2*(q.y-a.y),q.x*q.x+q.y*q.y-a.x*a.x-a.y*a.y);
      if(hi-lo<1)return;
      const u=index(P(mid.x+lo*direction.x,mid.y+lo*direction.y)),v=index(P(mid.x+hi*direction.x,mid.y+hi*direction.y));
      const width=Math.min(...sites.map(p=>gap(p,verts[u],verts[v])))-radius;
      edgeList.push({u,v,width,i,j});adj[u].push(v);adj[v].push(u);
    }
    for(let i=0;i<sites.length;i++)for(let j=0;j<i;j++)addBisector(i,j);
    const left=verts.findIndex(p=>Math.abs(p.x-45)<1&&p.y>180&&p.y<270);
    const right=verts.findIndex(p=>Math.abs(p.x-754)<1&&p.y>180&&p.y<270);
    const trail=[left],run=runner(api);let marked=null;
    api.button('退回上一岔口',()=>{if(!run.active&&trail.length>1){trail.pop();marked=null;api.status('已返回，可改走另一条等距边。');}});
    return {pointer(t,x,y){if(t!=='down'||run.active)return;
      const here=trail[trail.length-1],p=P(x,y),opts=adj[here];if(!opts.length)return;
      const k=opts.reduce((best,i)=>dist(verts[i],p)<dist(verts[best],p)?i:best,opts[0]);
      if(dist(verts[k],p)>28){api.status('先点与小车直接相连的金色岔口。');return;}
      if(trail.includes(k)){api.status('可使用撤回来调整先前的路线。');return;}
      const e=edgeList.find(e=>(e.u===here&&e.v===k)||(e.v===here&&e.u===k));marked=e;
      if(e.width<55){api.status('此边净空仅 '+meters(e.width)+' 米，低于天线所需的 13.75 米。另寻宽边。');return;}
      trail.push(k);api.status('已通过等距边，最窄净空 '+meters(e.width)+' 米。');
      if(k===right){const path=trail.map(i=>verts[i]);const min=Math.min(...trail.slice(1).map((v,i)=>edgeList.find(e=>[e.u,e.v].includes(trail[i])&&[e.u,e.v].includes(v)).width));
        run.go(path,()=>api.win('天线安全运抵，共走过 '+(path.length-1)+' 条等距边，最窄净空 '+meters(min)+' 米。'));}},
      tick:dt=>run.tick(dt),world(w){
        sites.forEach((q,i)=>{quarry(w,{...q,r:radius});if(i%2===0)w.post(q.x,q.y,2,24,'#cec3a2');});
        const here=trail.at(-1);
        for(const e of edgeList)w.line([verts[e.u],verts[e.v]],e===marked?paint.amber:'#a7bdaf',e===marked?3.5:1.8,3);
        if(marked){
          const mid=mix(verts[marked.u],verts[marked.v],.5);
          for(const k of [marked.i,marked.j])w.line([mid,sites[k]],'#d9b774',2,8);
          w.label(mid.x,mid.y,'净空 '+meters(marked.width)+' m',marked.width<55?paint.red:paint.mint,23);
        }
        if(trail.length>1)w.line(trail.map(i=>verts[i]),paint.mint,4.5,7);
        verts.forEach((q,i)=>{const can=adj[here].includes(i);w.post(q.x,q.y,can?4.6:2.2,can?10:4,can?paint.amber:'#7b9789');});
        landingPad(w,verts[left],paint.mint,'天线转运');landingPad(w,verts[right],paint.amber,'接应点');
        run.world(w,verts[here]);
      },draw(c){sites.forEach(p=>rock(c,{...p,r:radius}));const here=trail[trail.length-1];
        for(const e of edgeList)stroke(c,[verts[e.u],verts[e.v]],e===marked?'#f1c67d':'#b4c8a8',2);
        if(marked){const mid=mix(verts[marked.u],verts[marked.v],.5);for(const i of [marked.i,marked.j])stroke(c,[mid,sites[i]],'#e4cb8b',1.8,[4,3]);}
        stroke(c,trail.map(i=>verts[i]),colors.tree,4);verts.forEach((p,i)=>dot(c,p,adj[here].includes(i)?6.5:3.5,adj[here].includes(i)?colors.road:'#8eab9b'));
        ends(c,verts[left],verts[right]);dot(c,verts[here],7,'#96e3d3','#fff2a4');run.draw(c);}};
  });
  mission('dstar-lite','抢修断续的山路','D* Lite 增量重规划','巡检车仍在执行旧地图。两处烟尘下面的路基已经塌陷，需要把现场观测写回规划器。','勘察两处裂口，在道路更新后把巡检车送到接应点。','点尘带中心进行测绘，观察旧路线和更新后的绕行线。也可以先发车，车辆会在未知断口前停车。',api=>{
    const pts=[P(66,229),P(231,228),P(389,228),P(556,229),P(737,227),P(322,151),P(506,150),P(292,365),P(526,351)];
    const links=[[0,1],[1,2],[2,3],[3,4],[1,5],[5,6],[6,3],[1,7],[7,8],[8,3]];
    const adj=pts.map(()=>[]);links.forEach(([i,j])=>{adj[i].push(j);adj[j].push(i);});
    const damaged=new Set([1,5]),known=new Set(),target=4;
    const g=pts.map(()=>Infinity),rhs=pts.map(()=>Infinity),open=new Map();
    let here=0,km=0,last=0,oldPath=[],route=[],swept=null;
    const run=runner(api),edgeId=(i,j)=>links.findIndex(([a,b])=>(a===i&&b===j)||(a===j&&b===i));
    const cost=(i,j)=>known.has(edgeId(i,j))?Infinity:dist(pts[i],pts[j]);
    function key(i){const m=Math.min(g[i],rhs[i]);return [m+dist(pts[here],pts[i])+km,m];}
    function less(a,b){return a[0]<b[0]-1e-7||(Math.abs(a[0]-b[0])<1e-7&&a[1]<b[1]-1e-7);}
    function update(i){
      if(i!==target)rhs[i]=Math.min(...adj[i].map(n=>cost(i,n)+g[n]));
      open.delete(i);if(g[i]!==rhs[i])open.set(i,key(i));
    }
    function compute(){
      let count=0;
      while(open.size){
        let u=null;for(const [i,k] of open)if(u===null||less(k,open.get(u)))u=i;
        const old=open.get(u);if(!less(old,key(here))&&rhs[here]===g[here])break;
        count++;open.delete(u);
        if(less(old,key(u)))open.set(u,key(u));
        else if(g[u]>rhs[u]){g[u]=rhs[u];adj[u].forEach(update);}
        else{g[u]=Infinity;update(u);adj[u].forEach(update);}
      }
      route=[here];
      while(route.at(-1)!==target&&route.length<=pts.length){
        const i=route.at(-1),options=adj[i].filter(j=>Number.isFinite(cost(i,j)+g[j]));
        if(!options.length)break;
        const n=options.reduce((a,b)=>cost(i,a)+g[a]<cost(i,b)+g[b]?a:b);
        if(route.includes(n))break;route.push(n);
      }
      return count;
    }
    rhs[target]=0;open.set(target,key(target));compute();
    function moveStart(i){here=i;km+=dist(pts[last],pts[i]);last=i;compute();}
    api.button('沿当前路线行驶',()=>{
      if(run.active)return;let stop=0;
      while(stop+1<route.length&&!damaged.has(edgeId(route[stop],route[stop+1])))stop++;
      if(stop===0){api.status('前方道路已断。点选棕色尘带，取得路基观测。');return;}
      const destination=route[stop],trip=route.slice(0,stop+1).map(i=>pts[i]);
      run.go(trip,()=>{moveStart(destination);if(here===target&&known.size===damaged.size)api.win('两处边代价已更新，车辆沿修复后的路网安全抵达。');
        else api.status('巡检车停在前方断口。点选尘带中心，将测量写入旧地图。');});
    });
    return {pointer(t,x,y){if(t!=='down'||run.active)return;const p=P(x,y);swept=p;
      const found=[...damaged].find(e=>{const [a,b]=links[e];return dist(p,mix(pts[a],pts[b],.5))<=35;});
      if(found===undefined){api.status('此处未发现断口，向地图上的两条尘带中心测绘。');return;}
      if(known.has(found)){api.status('该断口已记录，继续勘察或派车。');return;}
      oldPath=route.slice();known.add(found);const [a,b]=links[found];update(a);update(b);const work=compute();
      api.status('已记录 '+known.size+' / 2 个断口。复用既有 g 值，修复 '+work+' 个队列状态；新路线 '+meters(length(route.map(i=>pts[i])))+' 米。');},
      tick:dt=>run.tick(dt),world(w){
        for(const [i,j] of links)w.line([pts[i],pts[j]],paint.lane,13,1);
        for(const q of pts)w.post(q.x,q.y,6,2.5,'#bda57b');
        if(oldPath.length)w.line(oldPath.map(i=>pts[i]),paint.red,2,5);
        if(route.length>1)w.line(route.map(i=>pts[i]),paint.mint,4,7);
        for(const e of damaged){
          const [a,b]=links[e],m=mix(pts[a],pts[b],.5);
          w.rock(m.x-4,m.y+2,11,known.has(e)?9:6,'#8a7564');
          w.rock(m.x+6,m.y-3,8,known.has(e)?8:5,'#ad886a');
          w.ring(m.x,m.y,18,known.has(e)?paint.red:paint.amber,2.4,3);
          if(known.has(e)){
            w.box(m.x,m.y,31,4,5,'#d7895e',9,.32);
            w.post(m.x-11,m.y,2,10,'#745d53');w.post(m.x+11,m.y,2,10,'#745d53');
          }else w.label(m.x,m.y,'待测路基',paint.amber,19);
        }
        if(swept)w.ring(swept.x,swept.y,35,'#93c8b8',2,3);
        woodland(w,[[47,54,22],[73,66,17],[721,382,22]]);
        landingPad(w,pts[0],paint.mint,'出发');landingPad(w,pts[target],paint.amber,'接应点');
        run.world(w,pts[here]);
      },draw(c){
        links.forEach(([a,b],e)=>stroke(c,[pts[a],pts[b]],known.has(e)?'#a06e5e':'#ad9674',9));
        stroke(c,oldPath.map(i=>pts[i]),'#ee9978',2,[6,5]);stroke(c,route.map(i=>pts[i]),colors.tree,4);
        for(const e of damaged){const [a,b]=links[e],m=mix(pts[a],pts[b],.5);if(known.has(e)){
          stroke(c,[P(m.x-8,m.y-8),P(m.x+8,m.y+8)],colors.fail,4);stroke(c,[P(m.x+8,m.y-8),P(m.x-8,m.y+8)],colors.fail,4);
        }else{for(let k=-2;k<=2;k++)dot(c,P(m.x+k*6,m.y+Math.sin(k)*5),13-Math.abs(k),'#d7aa7280');label(c,P(m.x,m.y-23),'待勘察');}}
        if(swept)halo(c,swept,35);pts.forEach(p=>dot(c,p,4,'#c4dab7'));ends(c,pts[0],pts[target]);
        if(!run.active)api.art.rover(c,pts[here].x,pts[here].y,0);else run.draw(c);}};
  });

  mission('pso','放飞探路粒子','粒子群路径优化','中继车将在巨岩旁转向一次。把探路粒子投放在地图上，每个粒子代表一个候选转向点。','找到一条避开岩石且总长不超过 185 米的两段路线。','点击不同走廊布下至少四个粒子，推进粒子群并查看金色最佳路径。粒子会兼顾自己的历史最佳位置和群体最佳位置。',api=>{
    const s=P(65,228),g=P(735,228),rocks=[{x:405,y:225,r:96},{x:260,y:130,r:57}];
    let seed=7013,iterations=0,winner=null,globalWeight=1.25;const swarm=[],run=runner(api);
    const random=()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)+1)/4294967297;
    function evaluate(p){
      const clearance=Math.min(...rocks.map(r=>Math.min(gap(r,s,p),gap(r,p,g))-r.r-8));
      const cost=dist(s,p)+dist(p,g);
      return {p:{...p},clearance,cost,fitness:cost+(clearance<0?700-24*clearance:0)};
    }
    function record(v){const score=evaluate(v.p);if(!v.best||score.fitness<v.best.fitness)v.best=score;if(!winner||score.fitness<winner.fitness)winner=score;}
    function info(){if(!winner)return;api.status('第 '+iterations+' 代 · '+swarm.length+' 个粒子。最佳路线 '+meters(winner.cost)+' 米，'+(winner.clearance>=0?'两段可通行。':'仍有岩石穿入车身安全带。'));}
    api.slider('群体吸引强度',.2,2.6,globalWeight,.1,v=>{globalWeight=Number(v);});
    api.button('推进十代',()=>{if(run.active)return;if(swarm.length<4){api.status('至少布设四个不同位置的粒子。');return;}
      for(let k=0;k<10;k++){const guide={...winner.p};for(const v of swarm){
        for(const axis of ['x','y'])v.velocity[axis]=clamp(.60*v.velocity[axis]+1.35*random()*(v.best.p[axis]-v.p[axis])+globalWeight*random()*(guide[axis]-v.p[axis]),-24,24);
        v.p=P(clamp(v.p.x+v.velocity.x,75,725),clamp(v.p.y+v.velocity.y,40,420));record(v);v.trail.push({...v.p});if(v.trail.length>12)v.trail.shift();}
        iterations++;}info();});
    api.button('派车验证',()=>{if(run.active)return;if(swarm.length<4||iterations<10){api.status('先布下至少四个粒子，再推进一次群体搜索。');return;}
      if(winner.clearance<0||winner.cost>740){api.status('现有最优方案未达标。向尚未探索的岩石另一侧增投粒子。');return;}
      run.go([s,winner.p,g],()=>api.win('粒子群筛出 '+meters(winner.cost)+' 米可通行路线，两段均通过车身净空检验。'));});
    return {pointer(t,x,y){if(t!=='down'||run.active)return;const p=P(x,y);if(!inside(p)||swarm.some(v=>dist(p,v.p)<8))return;
      if(swarm.length>=24){api.status('粒子已用满，可继续迭代或重新部署。');return;}
      const v={p,velocity:P((random()-.5)*8,(random()-.5)*8),best:null,trail:[{...p}]};swarm.push(v);record(v);info();},
      tick:dt=>run.tick(dt),world(w){
        rocks.forEach(o=>quarry(w,o));
        woodland(w,[[49,69,21],[78,80,17],[746,355,22]]);
        for(const v of swarm){
          if(v.trail.length>1)w.line(v.trail,'#80b9a3',1.7,4);
          w.dot(v.best.p.x,v.best.p.y,'#eee1b1',3,4);
          w.post(v.p.x,v.p.y,3.2,12,'#6dc3ab');
          w.dot(v.p.x,v.p.y,paint.mint,4.5,13);
        }
        if(winner){
          const col=winner.clearance<0?paint.red:paint.amber;
          w.line([s,winner.p,g],col,4,7);
          w.ring(winner.p.x,winner.p.y,10,col,2.5,2);
          w.label(winner.p.x,winner.p.y,'第 '+iterations+' 代 · '+meters(winner.cost)+' m',col,23);
        }
        landingPad(w,s,paint.mint,'出发');landingPad(w,g,paint.amber,'中继站');
        run.world(w,s);
      },draw(c){rocks.forEach(o=>rock(c,o));for(const v of swarm){stroke(c,v.trail,'#a4d7c399',1.5);dot(c,v.best.p,3,'#cadab2');dot(c,v.p,5,'#a2ead9','#35695f');}
        if(winner){stroke(c,[s,winner.p,g],winner.clearance<0?colors.fail:colors.route,3,[7,4]);dot(c,winner.p,7,'#f2c675','#ffedaa');}
        ends(c,s,g);run.draw(c);}};
  });

  mission('hybrid','倒入山口货栈','混合 A*','狭窄货栈要求电源接口朝外。车辆能前进、倒车和打方向，轮轴无法在原地转身。','设置一个可达的整备位，规划经过它并倒进库位的短路线。','在库外虚线框内按住并拖动，指定整备位和车头方向，然后试算。尽量在宽阔区域调头，最终车头要向左。',api=>{
    const start={x:78,y:324,h:0},goal={x:686,y:228,h:Math.PI},boxes=[[263,170,348,304],[538,76,745,190],[538,267,745,373],[720,190,745,267]];
    let pad=null,drag=false,solution=[],marks=[],info='',headingReady=false;const run=runner(api);
    const turnR=43,step=19,vehicleR=7;
    const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
    function free(p){
      for(const offset of [-10,0,10]){
        const x=p.x+offset*Math.cos(p.h),y=p.y+offset*Math.sin(p.h);
        if(x<23||x>777||y<32||y>428)return false;
        for(const [l,t,r,b] of boxes){
          if(Math.hypot(x-clamp(x,l,r),y-clamp(y,t,b))<vehicleR)return false;
        }
      }return true;
    }
    function advance(p,k,length){
      const h=p.h+k*length;
      return {x:p.x+(Math.abs(k)<1e-8?length*Math.cos(p.h):(Math.sin(h)-Math.sin(p.h))/k),
        y:p.y+(Math.abs(k)<1e-8?length*Math.sin(p.h):(Math.cos(p.h)-Math.cos(h))/k),h};
    }
    const cell=p=>[Math.round(p.x/11),Math.round(p.y/11),((Math.round(p.h/(Math.PI/12))%24)+24)%24,p.gear].join(',');
    function plan(initial,finish){
      const open=[],best=new Map();let expanded=0;
      function push(v){let i=open.length;open.push(v);while(i){const up=(i-1)>>1;if(open[up].f<=v.f)break;open[i]=open[up];i=up;}open[i]=v;}
      function pop(){const head=open[0],tail=open.pop();if(open.length){
        let i=0;while(i*2+1<open.length){let j=i*2+1;if(j+1<open.length&&open[j+1].f<open[j].f)j++;
          if(open[j].f>=tail.f)break;open[i]=open[j];i=j;}open[i]=tail;}return head;}
      const hcost=p=>Math.max(dist(p,finish),Math.abs(angleDiff(p.h,finish.h))*turnR);
      const origin={...initial,gear:initial.gear||1,g:0,f:0,prev:null};best.set(cell(origin),0);push(origin);
      while(open.length&&expanded<14000){
        const p=pop();if(p.g>best.get(cell(p))+.001)continue;expanded++;
        if(dist(p,finish)<=17&&Math.abs(angleDiff(p.h,finish.h))<.32){
          const path=[];for(let v=p;v;v=v.prev)path.unshift(v);return {path,expanded};
        }
        for(const gear of [1,-1])for(const k of [-1/turnR,0,1/turnR]){
          const samples=[.25,.5,.75,1].map(t=>advance(p,k,step*t*gear));if(!samples.every(free))continue;
          const q=samples[3];q.gear=gear;q.g=p.g+step*(gear<0?1.08:1)+(p.gear!==gear?16:0)+(k?1.2:0);q.f=q.g+1.20*hcost(q);q.prev=p;q.k=k;
          const id=cell(q);if(q.g>=(best.get(id)??Infinity))continue;best.set(id,q.g);push(q);
        }
      }return null;
    }
    function fullPath(chain){
      const path=[chain[0]];
      for(let i=1;i<chain.length;i++)for(const t of [.25,.5,.75,1])path.push({...advance(chain[i-1],chain[i].k,step*t*chain[i].gear),gear:chain[i].gear});
      return path;
    }
    api.button('计算进库动作',()=>{if(run.active)return;
      if(!pad||!headingReady){api.status('在虚线框内按住并拖动一小段距离，为整备位定向。');return;}
      if(!free(pad)){api.status('车身在这个整备位会贴墙，向空地移动。');return;}
      const a=plan(start,pad);const b=a&&plan(a.path.at(-1),goal);
      if(!b){solution=[];api.status('该整备姿态在当前搜索预算下不可达。将整备位置移到库前宽地，再指定车头。');return;}
      solution=fullPath([...a.path,...b.path.slice(1)]);marks=[a.path.at(-1)];
      const metersDriven=length(solution)*.25,shift=solution.slice(1).filter((p,i)=>solution[i].gear!==undefined&&p.gear!==solution[i].gear).length;
      info='行程 '+metersDriven.toFixed(1)+' 米，换挡 '+shift+' 次，搜索 '+(a.expanded+b.expanded)+' 个姿态。';
      api.status(info+(metersDriven<=183?' 可以执行。':' 超过 183 米，请重新放置整备姿态。'));});
    api.button('执行进库',()=>{if(run.active)return;
      if(!solution.length||length(solution)*.25>183){api.status('先生成经过整备位且总长不超过 183 米的有效轨迹。');return;}
      run.go(solution,()=>api.win('已将接口朝外停靠。'+info));});
    return {pointer(t,x,y){if(run.active)return;if(t==='down'){
        if(x<394||x>523||y<119||y>334){api.status('将整备位放在库外的绿色虚线框内。');return;}
        pad={x,y,h:0};drag=true;headingReady=false;solution=[];marks=[];return;}
      if(!drag||!pad)return;if(Math.hypot(x-pad.x,y-pad.y)>=18){pad.h=Math.atan2(y-pad.y,x-pad.x);headingReady=true;}
      if(t==='up'){drag=false;api.status(headingReady?'整备位置和朝向已记录，可计算进库动作。':'再拖远一点以设置车头方向。');}},
      tick:dt=>run.tick(dt),world(w){
        boxes.forEach((rect,i)=>depot(w,rect,i));
        const apron=[P(394,119),P(523,119),P(523,334),P(394,334)];
        w.line([...apron,apron[0]],'#91ceb1',3,2);w.label(458,119,'库前整备区',paint.mint,14);
        for(const q of apron)bollard(w,q,paint.mint,7);
        // Straight and curved motion primitives are drawn from the exact collision-checked trajectory.
        if(solution.length){
          let part=[solution[0]],gear=solution[1]?.gear;
          for(let i=1;i<solution.length;i++){
            const q=solution[i];
            if(q.gear!==gear){w.line(part,gear<0?paint.amber:paint.mint,3.5,5);part=[solution[i-1]];gear=q.gear;}
            part.push(q);
          }
          if(part.length>1)w.line(part,gear<0?paint.amber:paint.mint,3.5,5);
        }
        if(pad){
          w.ring(pad.x,pad.y,13,paint.mint,2,3);
          direction(w,pad,P(pad.x+33*Math.cos(pad.h),pad.y+33*Math.sin(pad.h)),paint.mint,7);
        }
        landingPad(w,start,paint.mint,'出发');landingPad(w,goal,paint.amber,'倒车入库');
        direction(w,goal,P(goal.x-26,goal.y),paint.amber,5);
        run.world(w,start);
      },draw(c){
        for(const [l,t,r,b] of boxes){c.fillStyle='#253e3c';c.fillRect(l+4,t+5,r-l,b-t);c.fillStyle='#8f8972';c.fillRect(l,t,r-l,b-t);
          for(let x=l+5;x<r;x+=12)stroke(c,[P(x,t+3),P(x,b-3)],'#756e5d',2);}
        c.save();c.setLineDash([7,5]);c.strokeStyle='#a1dec4';c.strokeRect(394,119,129,215);c.restore();label(c,P(458,106),'库前整备区');
        if(solution.length){for(let i=1;i<solution.length;i++)stroke(c,[solution[i-1],solution[i]],solution[i].gear<0?colors.road:colors.tree,3);}
        marks.forEach(p=>dot(c,p,4,'#fff4d0'));
        if(pad){api.art.rover(c,pad.x,pad.y,pad.h);stroke(c,[pad,P(pad.x+35*Math.cos(pad.h),pad.y+35*Math.sin(pad.h))],colors.tree,3);}
        ends(c,start,goal);label(c,P(goal.x,goal.y+32),'车头向左');run.draw(c);}};
  });
})();
