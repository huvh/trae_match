/* Perception missions use map coordinates; all displayed distances are calibrated at 0.1 m/px. */
(() => {
  'use strict';
  const teal='#91f0d0', amber='#ffce7b', pink='#ff9687', blue='#94ceff', white='#edf5e9';
  const colors=[teal,amber,blue];
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const p=(x,y)=>({x,y});
  const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
  function rng(seed){
    return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  }
  function dot(ctx,pt,r,color,stroke){
    ctx.beginPath();ctx.arc(pt.x,pt.y,r,0,2*Math.PI);ctx.fillStyle=color;ctx.fill();
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}
  }
  function ring(ctx,pt,r,color,width=2,dash=[]){
    ctx.beginPath();ctx.setLineDash(dash);ctx.arc(pt.x,pt.y,r,0,2*Math.PI);
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();ctx.setLineDash([]);
  }
  function path(ctx,points,color,width=2,close=false){
    if(!points.length)return;
    ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
    points.slice(1).forEach(v=>ctx.lineTo(v.x,v.y));if(close)ctx.closePath();
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
  }
  function label(ctx,x,y,text,color=white,size=17){
    ctx.font='600 '+size+'px system-ui,sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';
    ctx.strokeStyle='#16272a';ctx.lineWidth=4;ctx.lineJoin='round';ctx.strokeText(text,x,y);
    ctx.fillStyle=color;ctx.fillText(text,x,y);
  }
  function badge(ctx,x,y,text,color=teal){
    ctx.font='600 15px system-ui,sans-serif';const width=ctx.measureText(text).width+22;
    ctx.fillStyle='#10252be6';ctx.fillRect(x,y,width,29);ctx.fillStyle=color;ctx.fillRect(x,y,3,29);label(ctx,x+10,y+15,text,color,15);
  }

  // The scene and its input share survey coordinates. Heights only affect the projected artwork.
  function mast(world,at,tint,height=25){
    world.box(at.x,at.y,14,14,4,'#485c58');
    world.post(at.x,at.y,2.7,height,'#c5ccb6',4);
    world.post(at.x,at.y,5,4,tint,height+2);
    world.ring(at.x,at.y,10,tint,1.8,1);
  }
  function workshop(world,x,y,width,depth,tint){
    world.box(x,y,width+6,depth+6,3,'#56645b');
    world.box(x,y,width,depth,18,tint,3);
    world.box(x,y,width+3,depth+3,3,'#6b7771',21);
    world.box(x-width*.24,y+depth*.5,9,2,14,'#364840',3);
  }
  function outline(world,x1,y1,x2,y2,tint,height=1){
    world.line([p(x1,y1),p(x2,y1),p(x2,y2),p(x1,y2),p(x1,y1)],tint,2,height);
  }
  function deck(world,a,b,width,height,tint,base=0){
    const length=dist(a,b);
    world.box((a.x+b.x)/2,(a.y+b.y)/2,length,width,height,tint,base,Math.atan2(b.y-a.y,b.x-a.x));
  }
  function edgePines(world){
    [[48,45,15],[77,38,21],[107,55,13],[713,408,16],[739,425,19],[755,400,13]].forEach(([x,y,size])=>world.tree(x,y,size));
  }
  const add=(id,title,algorithm,brief,goal,how,create)=>globalThis.FieldMissions.push({
    id,title,algorithm,region:'survey',lesson:id,brief,goal,how,create
  });

  add('particle','雾谷失联车','粒子滤波定位','旧运载车只会回复测距请求。无人机能在山谷里空投测距信标。','布设信标，使粒子云半径降至 3.5 米以内，再标出运载车。','点地图布设最多四枚信标。把信标分散到不同方向，最后点击「标记救援位置」并点中粒子云。',api=>{
    const truth=p(466,244);
    const beacons=[];
    let cloud=[],spread=Infinity,lastEstimate=null,marking=false,aim=null,won=false;
    const random=rng(77431);
    function reset(){
      beacons.length=0;cloud=[];spread=Infinity;marking=false;aim=null;lastEstimate=null;
      for(let i=0;i<1300;i++)cloud.push(p(38+random()*724,42+random()*365));
      api.status('每颗粒子是一处可能的位置。先把信标投到谷地一侧。');
    }
    function observe(at){
      if(beacons.length>=4){api.status('四枚信标已用完。可标记位置，或回收后重新布局。');return;}
      if(beacons.some(b=>dist(at,b)<45)){api.status('与已有信标过近。拉开基线能提供新的方位约束。');return;}
      const reading=dist(at,truth)+[1.2,-1.7,1.0,-.7][beacons.length];
      beacons.push({...at,reading});
      const weights=cloud.map(q=>Math.exp(-.5*((dist(q,at)-reading)/12)**2));
      const total=weights.reduce((a,b)=>a+b,0);
      if(total<1e-12){reset();api.status('此次布设让有效粒子耗尽，已重新播撒粒子。');return;}
      const cdf=[];let acc=0;
      weights.forEach(w=>{acc+=w/total;cdf.push(acc);});
      const pts=[];let i=0,offset=random()/cloud.length;
      for(let k=0;k<cloud.length;k++){
        while(i<cdf.length-1&&cdf[i]<k/cloud.length+offset)i++;
        pts.push(p(clamp(cloud[i].x+(random()-.5)*8,15,785),clamp(cloud[i].y+(random()-.5)*8,24,436)));
      }
      cloud=pts;lastEstimate=p(cloud.reduce((a,q)=>a+q.x,0)/cloud.length,cloud.reduce((a,q)=>a+q.y,0)/cloud.length);
      spread=Math.sqrt(cloud.reduce((a,q)=>a+dist(q,lastEstimate)**2,0)/cloud.length);
      api.status('测距 '+(reading*.1).toFixed(1)+' 米，重采样后的均方根半径 '+(spread*.1).toFixed(1)+' 米。'+(beacons.length>=3&&spread<=35?'现在可以标记救援位置。':'继续从另一个方向测距。'));
    }
    api.button('标记救援位置',()=>{if(beacons.length<3||spread>35){api.status('至少从三个位置观测，并把粒子云收紧到 3.5 米以内。');return;}marking=true;api.status('点击地图上你判断的运载车位置。');});
    api.button('回收所有信标',reset);reset();
    return {world(w){
      edgePines(w);
      [[26,337,20],[53,367,15],[764,89,22],[741,81,14]].forEach(([x,y,r])=>w.rock(x,y,r,r*1.1,'#6d746a'));
      workshop(w,89,405,40,22,'#60756c');
      // Draw a deterministic thinning of the posterior. Each point is an actual current particle.
      for(let i=0;i<cloud.length;i+=4){const q=cloud[i];w.dot(q.x,q.y,teal,1.9,2+(i%5)*.65);}
      beacons.forEach((b,i)=>{
        const tint=colors[i%3];mast(w,b,tint);
        w.ring(b.x,b.y,b.reading,tint,1.5,3);
        w.label(b.x,b.y,'信标 '+(i+1)+' · '+(b.reading*.1).toFixed(1)+' m',tint,32);
      });
      if(lastEstimate){
        w.ring(lastEstimate.x,lastEstimate.y,Math.max(4,spread),'#d6ce8a',1.8,6);
        w.label(lastEstimate.x,lastEstimate.y,'粒子半径 '+(spread*.1).toFixed(1)+' m',amber,23);
      }else w.label(90,403,'勘测营地',white,31);
      if(aim)w.ring(aim.x,aim.y,11,amber,3,3);
      if(won)w.rover(truth.x,truth.y,-.35,amber);
    },draw(ctx){
      cloud.forEach(q=>dot(ctx,q,1.55,'#a9f6d49e'));
      beacons.forEach((b,i)=>{ring(ctx,b,b.reading,colors[i%3]+'7f',1.5,[5,5]);dot(ctx,b,6,colors[i%3],'#173234');label(ctx,b.x+9,b.y,'信标'+(i+1),colors[i%3],14);});
      if(aim){ring(ctx,aim,12,amber);path(ctx,[p(aim.x-18,aim.y),p(aim.x+18,aim.y)],amber);}
      badge(ctx,15,13,'信标 '+beacons.length+' / 4　粒子云半径 '+(Number.isFinite(spread)?(spread*.1).toFixed(1)+' m':'未知'));
    },pointer(type,x,y){if(type!=='down'||won)return;const at=p(x,y);
      if(marking){aim=at;const error=dist(aim,truth)*.1;if(error<=3.5){won=true;api.win('位置确认。救援点误差 '+error.toFixed(1)+' 米，使用了 '+beacons.length+' 枚信标。');}
        else api.status('救援队在标注处没有发现运载车。再观察粒子最密集的位置。');}
      else observe(at);
    }};
  });

  add('histogram','盲轨送药','直方图定位','检修车醒来时丢失了站号，只能读取脚下色标和车轮移动方向。','向不同轨段取样，使所在轨段的概率高于 72%，再把药箱送到估计位置。','用左右移动改变观测，比较概率柱。点击高概率轨段，将药箱投放到对应位置。',api=>{
    const codes=[0,1,0,1,2,0,1,2,2,0,1,0,2,1,1],names=['青线','金点','蓝纹'];
    const n=codes.length,cell=48,x0=40,history=[];
    let actual=6,posterior=Array(n).fill(1/n),steps=0,done=false;
    function correct(){
      const obs=codes[actual];posterior=posterior.map((v,i)=>v*(codes[i]===obs?.96:.02));
      const sum=posterior.reduce((a,b)=>a+b,0);posterior=posterior.map(x=>x/sum);history.push(names[obs]);if(history.length>7)history.shift();
    }
    function move(delta){
      if(done)return;
      const next=Array(n).fill(0);
      for(let i=0;i<n;i++){next[i]+=posterior[i]*.06;next[clamp(i+delta,0,n-1)]+=posterior[i]*.9;next[clamp(i+2*delta,0,n-1)]+=posterior[i]*.04;}
      actual=clamp(actual+delta,0,n-1);posterior=next;steps++;correct();
      api.status('轮速推算已移动一格，观测到'+names[codes[actual]]+'。最可能轨段的概率为 '+Math.round(Math.max(...posterior)*100)+'%。');
    }
    correct();api.button('向西移动一格',()=>move(-1));api.button('向东移动一格',()=>move(1));api.status('第一次观测是'+names[codes[actual]]+'。有几个站台采用相同色标，移动后再观察。');
    return {world(w){
      workshop(w,116,80,94,34,'#5b796f');workshop(w,703,83,80,39,'#68736e');
      for(const y of [164,182])w.box(400,y,742,4,6,'#aeb8b5',3);
      for(let i=0;i<n;i++){
        const x=x0+(i+.5)*cell,tint=colors[codes[i]],h=2+posterior[i]*130;
        w.box(x-9,173,7,35,3,'#66574e');w.box(x+9,173,7,35,3,'#66574e');
        w.box(x,136,38,18,5,tint);
        w.box(x,325,37,27,3,'#425852');
        w.box(x,325,28,21,h,tint,3);
        if(posterior[i]>.18)w.label(x,325,(i+1)+'号 '+Math.round(posterior[i]*100)+'%',amber,h+9);
      }
      w.label(78,78,'药品仓',white,32);
      w.label(400,95,'车载色标　'+history.join(' › '),colors[codes[actual]],16);
      if(done){const x=x0+(actual+.5)*cell;w.rover(x,172,0,'#b1935d');w.box(x,173,9,8,6,white,11);}
    },draw(ctx){
      badge(ctx,15,15,'车载观测　'+history.join(' › '));label(ctx,42,111,'维修轨道与固定色标',white);
      path(ctx,[p(30,165),p(770,165)],'#323e43',13);path(ctx,[p(30,180),p(770,180)],'#8e9690',5);
      for(let i=0;i<n;i++){
        const x=x0+i*cell;ctx.fillStyle='#37463f';ctx.fillRect(x+8,155,6,33);ctx.fillRect(x+32,155,6,33);ctx.fillStyle=colors[codes[i]];ctx.fillRect(x+4,127,40,23);
        label(ctx,x+11,138,['━','●','≋'][codes[i]],'#132b32',15);
        const height=Math.max(2,posterior[i]*156);ctx.fillStyle='#1e323a';ctx.fillRect(x+4,222,40,163);
        ctx.fillStyle=colors[codes[i]];ctx.fillRect(x+4,385-height,40,height);label(ctx,x+11,402,String(i+1),white,15);
        if(posterior[i]>.18)label(ctx,x,376-height,Math.round(posterior[i]*100)+'%',amber,14);
      }
      label(ctx,40,209,'位置概率',teal,15);label(ctx,40,432,'点选轨段，投放药箱',white,16);
    },pointer(type,x,y){
      if(type!=='down'||done||y<118||y>417)return;
      const i=Math.floor((x-x0)/cell);if(i<0||i>=n)return;
      if(steps>=2&&i===actual&&posterior[i]>.72){done=true;api.win('药箱已送到 '+(i+1)+' 号轨段。后验概率 '+Math.round(posterior[i]*100)+'%，累计移动 '+steps+' 格。');}
      else api.status('该轨段概率 '+Math.round(posterior[i]*100)+'%。至少移动两格并找到超过 72% 的位置再投放。');
    }};
  });

  add('kmeans','分拣山货','K-means 点云聚类','索道只能派出三支清障小队。用无人机点云把碎石坡划成三处工区。','放置三个集结点，用三轮重心更新得到紧凑且有人负责的工区。','在图上点三处集结点，再执行聚类。结果太分散时，点「重新布点」调整初始中心。',api=>{
    const targets=[p(205,141),p(468,176),p(575,345)],samples=[];
    const random=rng(215);for(const t of targets)for(let i=0;i<25;i++){const a=random()*Math.PI*2,r=Math.sqrt(random())*45;samples.push(p(t.x+r*Math.cos(a),t.y+r*Math.sin(a)*.73));}
    let centers=[],assign=[],round=0,timer=0,running=false,finished=false;
    function classify(){
      assign=samples.map(q=>centers.reduce((best,c,j)=>dist(q,c)<dist(q,centers[best])?j:best,0));
    }
    function update(){
      classify();
      centers=centers.map((c,j)=>{const group=samples.filter((_,i)=>assign[i]===j);return group.length?p(group.reduce((s,v)=>s+v.x,0)/group.length,group.reduce((s,v)=>s+v.y,0)/group.length):c;});
      classify();round++;
      if(round>=3){
        running=false;const rms=Math.sqrt(samples.reduce((a,q,i)=>a+dist(q,centers[assign[i]])**2,0)/samples.length)*.1;
        const smallest=Math.min(...centers.map((_,j)=>assign.filter(i=>i===j).length));
        if(rms<=4.2&&smallest>=12){finished=true;api.win('三支小队各自就位，点到中心的均方根距离 '+rms.toFixed(1)+' 米。');}
        else api.status('最小工区只有 '+smallest+' 个点，均方根距离 '+rms.toFixed(1)+' 米。重新布点，让每处石堆都有附近的初始中心。');
      }else api.status('第 '+round+' 轮。每颗回波归入最近工区，中心移动到工区均值。');
    }
    function reset(){centers=[];assign=[];running=false;round=0;timer=0;api.status('在点云上放下三处初始集结点。');}
    api.button('执行三轮聚类',()=>{if(finished||running)return;if(centers.length!==3||round){api.status('请先重新布设三处初始集结点。');return;}running=true;timer=.01;});
    api.button('重新布点',reset);reset();
    return {world(w){
      edgePines(w);workshop(w,92,339,52,32,'#667567');
      w.post(84,293,3,43,'#947851');w.post(720,85,3,43,'#947851');
      w.line([p(84,293),p(720,85)],'#9eaaa0',1.5,46);
      samples.forEach((q,i)=>{
        const tint=assign.length?colors[assign[i]]:'#929382';
        w.rock(q.x,q.y,3+(i%4)*.65,4+(i%6)*1.4,tint);
        if(round&&i%4===0)w.line([q,centers[assign[i]]],tint,1.2,2);
      });
      centers.forEach((c,i)=>{
        const tint=colors[i];w.rover(c.x,c.y,.45*i,tint);w.ring(c.x,c.y,14,tint,2,1.5);
        w.label(c.x,c.y,'队 '+(i+1)+(assign.length?' · '+assign.filter(j=>j===i).length+' 处':''),tint,24);
      });
      w.label(92,339,'工区调度　'+centers.length+'/3 队 · 第 '+round+' 轮',white,32);
    },draw(ctx){samples.forEach((q,i)=>{if(round&&i%3===0)path(ctx,[q,centers[assign[i]]],colors[assign[i]]+'65',1);dot(ctx,q,4.2,assign.length?colors[assign[i]]:'#c8cfb1','#334338');});
      centers.forEach((c,j)=>{ring(ctx,c,13,colors[j],3);dot(ctx,c,5,colors[j]);label(ctx,c.x+16,c.y,'队 '+(j+1),colors[j],15);});badge(ctx,15,15,'清障队 '+centers.length+' / 3　重心更新 '+round+' / 3');
    },pointer(type,x,y){if(type!=='down'||running||finished||centers.length>=3)return;centers.push(p(x,y));api.status('已布设 '+centers.length+' / 3 处。'+(centers.length===3?'可以执行聚类。':''));},tick(dt){if(!running)return;timer-=dt;if(timer<=0){timer=.55;update();}}};
  });

  add('icp','拼合旧测绘','ICP 点云配准','新旧两次激光扫描来自不同车身朝向。对齐它们，才能把维修栈道接回地图。','粗调第二次扫描的位置和角度，让 ICP 把两次扫描配准到均方根误差 1 米以内。','拖动蓝色扫描整片平移，用滑块调整朝向；两组形状重叠后运行配准。',api=>{
    const survey=[],origin=p(357,228);
    const corners=[p(-133,-74),p(-36,-74),p(-36,19),p(81,19),p(81,75),p(139,75)];
    for(let k=0;k<corners.length-1;k++){const a=corners[k],b=corners[k+1],n=Math.ceil(dist(a,b)/12);for(let j=0;j<n;j++)survey.push(p(a.x+(b.x-a.x)*j/n,a.y+(b.y-a.y)*j/n));}survey.push(corners.at(-1));
    const reference=survey.map(q=>p(origin.x+q.x,origin.y+q.y));
    let center=p(509,285),angle=.43,held=null,steps=0,done=false,clock=0,running=false;
    const current=()=>survey.map(q=>p(center.x+q.x*Math.cos(angle)-q.y*Math.sin(angle),center.y+q.x*Math.sin(angle)+q.y*Math.cos(angle)));
    function nearest(q){return reference.reduce((best,b)=>dist(q,b)<dist(q,best)?b:best,reference[0]);}
    const rms=()=>Math.sqrt(current().reduce((s,q,i)=>s+dist(q,reference[i])**2,0)/survey.length);
    const average=pts=>p(pts.reduce((s,q)=>s+q.x,0)/pts.length,pts.reduce((s,q)=>s+q.y,0)/pts.length);
    function iterate(){
      const src=current(),pairs=src.map(q=>[q,nearest(q)]).filter(pair=>dist(...pair)<36);
      if(pairs.length<survey.length*.65){running=false;api.status('重叠不足。拖动蓝色折线靠近浅色栈道，再微调角度。');return;}
      const a=average(pairs.map(k=>k[0])),b=average(pairs.map(k=>k[1]));let dotProduct=0,cross=0;
      for(const [s,t] of pairs){const x=s.x-a.x,y=s.y-a.y,u=t.x-b.x,v=t.y-b.y;dotProduct+=x*u+y*v;cross+=x*v-y*u;}
      const delta=Math.atan2(cross,dotProduct),cos=Math.cos(delta),sin=Math.sin(delta);
      center=p(b.x+cos*(center.x-a.x)-sin*(center.y-a.y),b.y+sin*(center.x-a.x)+cos*(center.y-a.y));angle+=delta;dial.value=String(Math.round(angle*180/Math.PI));
      steps++;const fit=rms()*.1;
      if(fit<=1){running=false;done=true;api.win('栈道接合成功，地标均方根偏差 '+fit.toFixed(2)+' 米。');}
      else if(steps===8){running=false;api.status('匹配停在局部位置，地标误差 '+fit.toFixed(1)+' 米。请把两端拐角再对齐。');}
    }
    const dial=api.slider('扫描朝向（度）',-60,60,25,1,v=>{if(!done){angle=Number(v)*Math.PI/180;running=false;}});
    api.button('启动 ICP 配准',()=>{if(done)return;steps=0;running=true;clock=0;});
    api.status('浅色是旧栈道，蓝色是新扫描。先粗调到相近的位置。');
    return {world(w){
      edgePines(w);
      const src=current();
      for(let i=1;i<corners.length;i++){
        const a=p(origin.x+corners[i-1].x,origin.y+corners[i-1].y),b=p(origin.x+corners[i].x,origin.y+corners[i].y);
        deck(w,a,b,13,4,'#948971',7);w.post(a.x,a.y,3,13,'#6e6758');
      }
      reference.forEach((q,i)=>{w.dot(q.x,q.y,'#e7e0c9',2.6,13);if(i%4===0)w.post(q.x,q.y,2.3,10,'#7b735f');});
      w.line(src,blue,2.4,13);
      src.forEach((q,i)=>{
        w.dot(q.x,q.y,blue,3.1,14);
        if(running&&i%3===0)w.line([q,nearest(q)],amber,1.6,13.5);
      });
      mast(w,center,blue,16);
      w.label(reference[0].x,reference[0].y,'旧栈道',white,24);
      w.label(center.x,center.y,'移动扫描 · 偏差 '+(rms()*.1).toFixed(1)+' m',blue,30);
    },draw(ctx){
      path(ctx,reference,'#b8ad88',13);path(ctx,reference,'#5b5949',7);reference.forEach(q=>dot(ctx,q,3.5,white));const src=current();path(ctx,src,blue+'92',3);src.forEach((q,i)=>{dot(ctx,q,4,blue);if(running&&i%3===0)path(ctx,[q,nearest(q)],amber,1);});ring(ctx,center,13,blue,2,[3,3]);
      badge(ctx,15,15,'均方根地标偏差 '+(rms()*.1).toFixed(1)+' m');label(ctx,reference[0].x-20,reference[0].y-21,'旧测绘',white,16);label(ctx,src.at(-1).x-30,src.at(-1).y+21,'移动扫描',blue,16);
    },pointer(type,x,y){if(done)return;const pt=p(x,y);if(type==='down'&&(dist(pt,center)<55||current().some(q=>dist(q,pt)<33))){held={dx:x-center.x,dy:y-center.y};running=false;}
      if(type==='move'&&held)center=p(clamp(x-held.dx,155,645),clamp(y-held.dy,95,355));if(type==='up')held=null;
    },tick(dt){if(running){clock-=dt;if(clock<=0){clock=.2;iterate();}}}};
  });

  function fitCircle(points){
    const n=points.length,mean=p(points.reduce((s,q)=>s+q.x,0)/n,points.reduce((s,q)=>s+q.y,0)/n);
    let xx=0,xy=0,yy=0,xr=0,yr=0;
    for(const q of points){const x=q.x-mean.x,y=q.y-mean.y,r=x*x+y*y;xx+=x*x;xy+=x*y;yy+=y*y;xr+=x*r;yr+=y*r;}
    const det=xx*yy-xy*xy;if(Math.abs(det)<1e-7)return null;
    const c=p(mean.x+(yy*xr-xy*yr)/(2*det),mean.y+(xx*yr-xy*xr)/(2*det));
    const radius=Math.sqrt(points.reduce((s,q)=>s+dist(q,c)**2,0)/n);
    const angles=points.map(q=>Math.atan2(q.y-c.y,q.x-c.x)).sort((a,b)=>a-b);
    const maxGap=Math.max(...angles.map((a,i)=>(angles[(i+1)%n]+(i+1===n?2*Math.PI:0))-a));
    return {c,radius,maxGap,rmse:Math.sqrt(points.reduce((s,q)=>s+(dist(q,c)-radius)**2,0)/n)};
  }
  add('circle','水塔口径','圆形点云拟合','备用水管要接上旧蓄水塔。扫描仪同时拍到了圆形罐壁和一旁的直管。','选择环绕罐壁的有效回波，测准半径；要求圆心与半径误差均小于 1 米。','点选至少四个圆周回波，再点「拟合罐壁」。再次点击已选点即可移除。',api=>{
    const center=p(396,230),radius=106;
    const points=Array.from({length:16},(_,i)=>{const a=2*Math.PI*i/16+.09,r=radius+Math.sin(i*5.6)*1.9;return p(center.x+r*Math.cos(a),center.y+r*Math.sin(a));});
    for(let i=0;i<7;i++)points.push(p(130+i*17,303+i*6));
    for(let i=0;i<7;i++)points.push(p(539+i*17,144+i*2));
    const selected=new Set();let fit=null,won=false;
    function measure(){
      if(selected.size<4){api.status('至少选择四个不同方位的罐壁回波。');return;}
      fit=fitCircle([...selected].map(i=>points[i]));
      if(!fit){api.status('这些点接近同一条直线，无法确定罐壁圆心。');return;}
      const width=fit.radius*.1,ok=Math.abs(fit.radius-radius)<10&&dist(fit.c,center)<10&&fit.rmse<5&&fit.maxGap<3.4;
      if(ok){won=true;api.win('接管尺寸取得。拟合半径 '+width.toFixed(2)+' 米，所选回波残差 '+(fit.rmse*.1).toFixed(2)+' 米。');}
      else api.status('拟合半径 '+width.toFixed(1)+' 米，残差 '+(fit.rmse*.1).toFixed(1)+' 米。'+(fit.maxGap>=3.4?'已选回波集中在一侧，再取对侧点。':'检查独立管线上的回波，点一下取消。'));
    }
    api.button('拟合罐壁',measure);api.button('清空取样',()=>{if(!won){selected.clear();fit=null;api.status('已移除上一组标记。');}});
    api.status('弧形回波属于罐体，两串直线回波属于管道。');
    return {world(w){
      workshop(w,90,91,74,37,'#59756c');
      w.post(center.x,center.y,radius,12,'#506662');
      w.post(center.x,center.y,radius*.93,1,'#354e52',12);
      w.ring(center.x,center.y,radius,teal,2,14);
      for(const off of [16,23])deck(w,points[off],points[off+6],8,7,'#707d73',1);
      points.forEach((q,i)=>{
        w.dot(q.x,q.y,selected.has(i)?amber:teal,4.4,i<16?15:9);
        w.ring(q.x,q.y,selected.has(i)?9:4.5,selected.has(i)?amber:'#8ccab9',selected.has(i)?2:1,1);
      });
      if(fit){
        w.ring(fit.c.x,fit.c.y,Math.min(fit.radius,800),amber,2.5,15);
        const edge=p(fit.c.x+fit.radius,fit.c.y);w.line([fit.c,edge],amber,2,15);
        w.label(fit.c.x,fit.c.y,'拟合半径 '+(fit.radius*.1).toFixed(2)+' m',amber,30);
      }
      w.label(90,91,'水塔泵站 · 已选 '+selected.size+' 点',white,31);
    },draw(ctx){
      if(fit){ring(ctx,fit.c,Math.min(fit.radius,1500),amber,2,[7,4]);dot(ctx,fit.c,4,amber);label(ctx,fit.c.x+9,fit.c.y,'拟合圆心',amber,15);}
      points.forEach((q,i)=>{dot(ctx,q,5.2,selected.has(i)?amber:teal,'#243e3d');if(selected.has(i))ring(ctx,q,11,amber,2);});
      badge(ctx,15,15,'标注 '+selected.size+' 个回波');label(ctx,129,356,'管路与罐壁的混合扫描',white,16);
    },pointer(type,x,y){if(type!=='down'||won)return;const pt=p(x,y),i=points.reduce((a,q,j)=>dist(q,pt)<dist(points[a],pt)?j:a,0);
      if(dist(points[i],pt)>20)return;
      if(selected.has(i))selected.delete(i);else selected.add(i);fit=null;api.status('选中 '+selected.size+' 个点。让取样覆盖罐壁的不同方向。');
    }};
  });

  function hull(points){
    const ordered=[...points].sort((a,b)=>a.x-b.x||a.y-b.y);
    const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
    function chain(arr){const out=[];for(const q of arr){while(out.length>=2&&cross(out.at(-2),out.at(-1),q)<=0)out.pop();out.push(q);}return out;}
    return chain(ordered).slice(0,-1).concat(chain(ordered.slice().reverse()).slice(0,-1));
  }
  function fitBox(points){
    const boundary=hull(points);let best=null;
    for(let i=0;i<boundary.length;i++){
      const a=boundary[i],b=boundary[(i+1)%boundary.length],angle=Math.atan2(b.y-a.y,b.x-a.x);
      const co=Math.cos(angle),si=Math.sin(angle),u=boundary.map(q=>q.x*co+q.y*si),v=boundary.map(q=>-q.x*si+q.y*co);
      const l=Math.min(...u),r=Math.max(...u),t=Math.min(...v),d=Math.max(...v),area=(r-l)*(d-t);
      if(best&&best.area<=area)continue;
      const corner=(x,y)=>p(x*co-y*si,x*si+y*co);
      best={area,center:corner((l+r)/2,(t+d)/2),corners:[corner(l,t),corner(r,t),corner(r,d),corner(l,d)],length:Math.max(r-l,d-t),width:Math.min(r-l,d-t)};
    }
    return best;
  }
  add('rectangle','吊装货箱','最小面积矩形拟合','碎石场里有一只两侧带箱锁的电池箱。选好扫描边界，给吊机计算夹具尺寸。','框住电池箱的四边，使拟合长宽各自误差小于 0.7 米。','从目标左上向右下拖出取样框，再点「计算夹具」。圈入隔壁杂物会撑大拟合框。',api=>{
    const center=p(356,226),len=145,w=75,points=[];
    function crate(cx,cy,l,h,angle,main){
      const co=Math.cos(angle),si=Math.sin(angle);
      const transform=(x,y)=>p(cx+x*co-y*si,cy+x*si+y*co);
      const corners=[transform(-l/2,-h/2),transform(l/2,-h/2),transform(l/2,h/2),transform(-l/2,h/2)];
      for(let j=0;j<4;j++){
        const a=corners[j],b=corners[(j+1)%4],n=Math.ceil(dist(a,b)/12);
        for(let i=0;i<n;i++)points.push({...p(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n),main});
      }return corners;
    }
    crate(center.x,center.y,len,w,-.44,true);crate(570,177,123,67,.2,false);crate(197,336,80,55,-.23,false);
    const total=points.filter(q=>q.main).length;
    let from=null,to=null,held=false,box=null,done=false;
    const inside=q=>from&&to&&q.x>=Math.min(from.x,to.x)&&q.x<=Math.max(from.x,to.x)&&q.y>=Math.min(from.y,to.y)&&q.y<=Math.max(from.y,to.y);
    api.button('计算夹具',()=>{
      const chosen=points.filter(inside);if(chosen.length<4){api.status('取样框中至少需要四个回波。');return;}
      box=fitBox(chosen);const coverage=chosen.filter(q=>q.main).length/total;
      if(box&&coverage>.85&&Math.abs(box.length-len)<7&&Math.abs(box.width-w)<7&&dist(box.center,center)<8){done=true;api.win('夹具就绪。包装箱长 '+(box.length*.1).toFixed(1)+' 米，宽 '+(box.width*.1).toFixed(1)+' 米。');}
      else api.status('目标边缘覆盖 '+Math.round(coverage*100)+'%，拟合尺寸 '+(box.length*.1).toFixed(1)+' × '+(box.width*.1).toFixed(1)+' 米。重新拖框，收齐四边并排除邻箱。');
    });
    api.status('带锁标记的是电池箱。请拖框选取它的边缘回波。');
    return {world(scene){
      workshop(scene,683,348,71,46,'#69736a');
      [[center.x,center.y,len,w,-.44,'#667765'],[570,177,123,67,.2,'#727b80'],[197,336,80,55,-.23,'#7e7460']].forEach(([cx,cy,l,d,yaw,tint])=>{
        scene.box(cx,cy,l,d,12,tint,0,yaw);
        for(const offset of [-l*.32,l*.32])scene.box(cx+Math.cos(yaw)*offset,cy+Math.sin(yaw)*offset,3,d,2,'#b4ba9f',12,yaw);
      });
      for(const dx of [-24,23])scene.box(center.x+dx,center.y,8,5,3,amber,13);
      points.forEach(q=>scene.dot(q.x,q.y,inside(q)?teal:'#d5d7be',3.2,14));
      if(from&&to)outline(scene,from.x,from.y,to.x,to.y,teal,2);
      if(box){scene.line([...box.corners,box.corners[0]],amber,3,17);scene.label(box.center.x,box.center.y,(box.length*.1).toFixed(1)+' × '+(box.width*.1).toFixed(1)+' m',amber,30);}
      scene.label(683,348,'吊装库 · '+points.filter(inside).length+' 个回波',white,34);
    },draw(ctx){
      if(from&&to){ctx.fillStyle='#a4eacd25';ctx.fillRect(from.x,from.y,to.x-from.x,to.y-from.y);ctx.strokeStyle=teal;ctx.lineWidth=2;ctx.strokeRect(from.x,from.y,to.x-from.x,to.y-from.y);}
      points.forEach(q=>dot(ctx,q,3.8,inside(q)?teal:'#e5e6c9','#354239'));
      for(const dx of [-24,23]){ctx.fillStyle='#ffce7b';ctx.fillRect(center.x+dx,center.y-3,9,7);}
      label(ctx,center.x-32,center.y+22,'电池箱',amber,15);
      if(box)path(ctx,box.corners,amber,3,true);badge(ctx,15,15,'取样 '+points.filter(inside).length+' 个回波');
    },pointer(type,x,y){if(done)return;if(type==='down'){held=true;from=p(x,y);to=p(x,y);box=null;}if(held&&(type==='move'||type==='up'))to=p(x,y);if(type==='up')held=false;}};
  });

  add('raycast','照亮岔廊','射线投射栅格建图','涵洞口的旧施工图只留下三处检修区。扫描会被隔墙挡住，需要从不同位置补测。','在四次扫描内，把三处检修区都测到至少 70%。','点击图面放下一个扫描仪。观察射线接触墙面后在哪里终止，为未照亮的区域补设测站。',api=>{
    const cols=36,rows=18,side=20,ox=40,oy=60,reach=148;
    const zones=[{x:5,y:4,name:'泵房'},{x:17,y:11,name:'岔廊'},{x:29,y:4,name:'闸室'}];
    const wall=(i,j)=>i===0||j===0||i===cols-1||j===rows-1||(i===8&&j>=3&&j<=10)||(j===7&&i>=13&&i<=19)||(i===26&&j>=3&&j<=8)||(j===13&&i>=24&&i<=31);
    const pos=(i,j)=>p(ox+(i+.5)*side,oy+(j+.5)*side);
    let known=new Uint8Array(cols*rows),stations=[],rays=[],age=2,done=false;
    function coverage(z){let seen=0,count=0;
      for(let j=z.y-2;j<=z.y+2;j++)for(let i=z.x-2;i<=z.x+2;i++){count++;if(known[j*cols+i])seen++;}return seen/count;
    }
    function scan(x,y){
      const ci=Math.floor((x-ox)/side),cj=Math.floor((y-oy)/side);
      if(ci<0||ci>=cols||cj<0||cj>=rows||wall(ci,cj)){api.status('测站需要放在涵洞内的可通行空间。');return;}
      if(stations.length>=4){api.status('本轮测站已用完。清除测站后尝试从遮挡物的另一侧补测。');return;}
      if(stations.some(q=>dist(q,p(x,y))<35)){api.status('附近已有测站，移到另一处观察盲区。');return;}
      stations.push(p(x,y));rays=[];age=0;
      for(let k=0;k<100;k++){
        const a=k*Math.PI/50;let end=p(x,y);
        for(let r=0;r<=reach;r+=3){
          end=p(x+Math.cos(a)*r,y+Math.sin(a)*r);
          const i=Math.floor((end.x-ox)/side),j=Math.floor((end.y-oy)/side);
          if(i<0||i>=cols||j<0||j>=rows)break;
          known[j*cols+i]=wall(i,j)?2:1;if(known[j*cols+i]===2)break;
        }rays.push(end);
      }
      const scores=zones.map(coverage);
      if(scores.every(v=>v>=.7)){done=true;api.win('三处检修区已建图，分别覆盖 '+scores.map(v=>Math.round(v*100)+'%').join('、')+'。共布设 '+stations.length+' 个测站。');}
      else api.status('已放置 '+stations.length+' / 4 个测站。'+zones.map((z,i)=>z.name+' '+Math.round(scores[i]*100)+'%').join('　'));
    }
    api.button('清除测站重测',()=>{if(done)return;known.fill(0);stations=[];rays=[];api.status('测站已回收，重新选择视角。');});
    api.status('黄色边框内是作业区。深色栅格尚未观测。');
    return {world(w){
      w.box(400,240,720,360,2,'#294047');
      // Merge adjacent observed cells so uncovering an entire corridor stays inexpensive.
      for(let j=0;j<rows;j++){
        let i=0;
        while(i<cols){
          const val=known[j*cols+i];let end=i+1;while(end<cols&&known[j*cols+end]===val)end++;
          if(val){const width=(end-i)*side;w.box(ox+i*side+width/2,oy+(j+.5)*side,width-.4,side-.4,val===2?15:1,val===2?'#c39f79':'#649483',2);}
          i=end;
        }
      }
      zones.forEach(z=>{
        const x=ox+(z.x-2)*side,y=oy+(z.y-2)*side;
        outline(w,x,y,x+5*side,y+5*side,amber,4);
        w.label(x+2.5*side,y,z.name+' '+Math.round(coverage(z)*100)+'%',amber,15);
      });
      stations.forEach((q,i)=>{mast(w,q,teal,15);w.label(q.x,q.y,'测站 '+(i+1),white,25);});
      if(age<1.25&&rays.length){const st=stations.at(-1);rays.forEach((q,i)=>{if(i%3===0)w.line([st,q],teal,1.5,8);});}
      workshop(w,72,435,48,23,'#556f6d');
    },draw(ctx){
      ctx.fillStyle='#182c30e6';ctx.fillRect(ox,oy,cols*side,rows*side);
      for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
        const val=known[j*cols+i];ctx.fillStyle=val===2?'#e1b487':val===1?'#668f7a':'#233a3b';ctx.fillRect(ox+i*side+.5,oy+j*side+.5,side-1,side-1);
      }
      zones.forEach(z=>{ctx.strokeStyle=amber;ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.strokeRect(ox+(z.x-2)*side,oy+(z.y-2)*side,5*side,5*side);ctx.setLineDash([]);label(ctx,ox+(z.x-2)*side+3,oy+(z.y-2)*side-10,z.name+' '+Math.round(coverage(z)*100)+'%',amber,14);});
      if(age<1.25&&rays.length){ctx.save();ctx.globalAlpha=.7*(1-age/1.25);const st=stations.at(-1);rays.forEach((q,i)=>{if(i%2===0)path(ctx,[st,q],teal,1);});ctx.restore();}
      stations.forEach((q,i)=>{dot(ctx,q,6,teal,'#284941');label(ctx,q.x+9,q.y,String(i+1),white,13);});
      badge(ctx,15,13,'激光测站 '+stations.length+' / 4');label(ctx,42,439,'浅绿表示通行空间，砂色表示第一处障碍。',white,15);
    },pointer(type,x,y){if(type==='down'&&!done)scan(x,y);},tick(dt){age+=dt;}};
  });

  add('gaussian','雾门净空','高斯概率地图','三道石门被雾遮住，旧图的边界带有测量误差。让装载电池的车在四次补测内穿过。','用补测收紧边界分布，选取合适的安全余量，使车身完整通过三道门。','点击石门补测上下边缘，暖色带表示可能被岩石占据的范围。调节安全倍数，再让车按估计地图通行。',api=>{
    const xs=[210,400,590],actual=[[150,221],[243,309],[153,219]],prior=[[146,245],[216,311],[142,240]];
    const carRadius=9,noise=12,priorVariance=22**2;
    let gates=[],budget=4,z=2.4,route=[],runX=60,moving=false,failed=-1,done=false;
    function reset(){
      gates=prior.map(m=>({mean:[...m],variance:priorVariance,n:0}));budget=4;route=[];runX=60;moving=false;failed=-1;
      api.status('地图初始边界标准差为 2.2 米。补测会按高斯观测模型缩小它。');
    }
    function sample(i){
      if(!budget||moving||done){if(!budget)api.status('补测额度已用完。可调整余量，或重新分配扫描。');return;}
      const g=gates[i];budget--;g.n++;
      const gain=g.variance/(g.variance+noise**2);
      g.mean=g.mean.map((old,side)=>old+gain*(actual[i][side]+[1,-1,-2,2][(g.n+side+i)%4]-old));
      g.variance*=(1-gain);route=[];failed=-1;runX=60;
      api.status('石门 '+(i+1)+' 补测完成，边界标准差降至 '+(Math.sqrt(g.variance)*.1).toFixed(2)+' 米。');
    }
    function plan(){
      if(done||moving)return;
      let prev=[{y:237,cost:0,ys:[]}];failed=-1;runX=60;
      for(let i=0;i<gates.length;i++){
        const {mean,variance}=gates[i],pad=z*Math.sqrt(variance)+carRadius,options=[];
        for(let y=Math.ceil((mean[0]+pad)/4)*4;y<=mean[1]-pad;y+=4){
          let winner=prev[0],cost=Infinity;
          for(const a of prev){const c=a.cost+Math.hypot(xs[i]-(xs[i-1]||60),a.y-y);if(c<cost){winner=a;cost=c;}}
          options.push({y,cost,ys:[...winner.ys,y]});
        }
        if(!options.length){route=[];api.status('第 '+(i+1)+' 道门的安全区间闭合。补测这道门，或降低安全倍数。');return;}
        prev=options;
      }
      const winner=prev.reduce((a,b)=>a.cost+Math.hypot(150,a.y-237)<b.cost+Math.hypot(150,b.y-237)?a:b);
      route=[p(60,237),...winner.ys.map((y,i)=>p(xs[i],y)),p(740,237)];moving=true;
      api.status('正在沿概率地图计算出的最短折线通行。');
    }
    function yAt(x){
      if(!route.length)return 237;
      const i=route.findIndex(q=>q.x>=x),a=route[Math.max(0,i-1)],b=route[i<0?route.length-1:i];
      return a.y+(b.y-a.y)*(b.x===a.x?0:(x-a.x)/(b.x-a.x));
    }
    api.slider('安全倍数（标准差）',0,3,2.4,.1,v=>{if(!moving&&!done){z=Number(v);route=[];runX=60;failed=-1;}});
    api.button('计算路线并通行',plan);api.button('重新分配补测',()=>{if(!done)reset();});reset();
    return {world(w){
      w.box(400,228,744,320,2,'#586457');
      gates.forEach((g,i)=>{
        const x=xs[i],sd=Math.sqrt(g.variance),lo=g.mean[0],hi=g.mean[1];
        // The batters terminate at the estimated edge. The true rock edge only appears on impact.
        w.box(x,(68+lo)/2,36,lo-68,20,'#737e6c',2);
        w.box(x,(hi+388)/2,36,388-hi,21,'#737e6c',2);
        for(const [edge,side] of [[lo,1],[hi,-1]]){
          w.line([p(x-20,edge),p(x+20,edge)],amber,3,3);
          for(const [sigma,tint] of [[.5,'#d7ad72'],[1,'#c59660'],[1.5,'#957a55']]){
            const y=edge+side*sigma*sd;w.line([p(x-20,y),p(x+20,y)],tint,2,3);
          }
        }
        for(const y of [lo+z*sd+carRadius,hi-z*sd-carRadius])w.line([p(x-21,y),p(x+21,y)],teal,2.5,4);
        if(failed===i)for(const y of actual[i])w.line([p(x-26,y),p(x+26,y)],pink,4,5);
        w.label(x,383,'门 '+(i+1)+' · σ '+(sd*.1).toFixed(2)+' m',g.n?teal:white,31);
      });
      if(route.length)w.line(route,amber,3,4);
      w.rover(runX,yAt(runX),Math.atan2(yAt(Math.min(runX+2,740))-yAt(runX),2),amber);
      w.label(63,237,'余量 '+z.toFixed(1)+'σ · 剩 '+budget+' 测',white,26);
    },pointer(type,x){if(type!=='down')return;const i=xs.reduce((b,v,j)=>Math.abs(v-x)<Math.abs(xs[b]-x)?j:b,0);if(Math.abs(xs[i]-x)<72)sample(i);},
      tick(dt){
        if(!moving)return;const x0=runX;runX=Math.min(740,runX+128*dt);
        for(let i=0;i<3;i++)if(x0<xs[i]&&runX>=xs[i]){
          const y=yAt(xs[i]);if(y-carRadius<actual[i][0]||y+carRadius>actual[i][1]){runX=xs[i];moving=false;failed=i;api.status('第 '+(i+1)+' 道门测得车身擦碰实际边界。给这里补测或增加余量。');return;}
        }
        if(runX===740){done=true;moving=false;const net=Math.min(...actual.map(([a,b],i)=>Math.min(yAt(xs[i])-a,b-yAt(xs[i]))-carRadius));api.win('三道石门全部通过。实测最窄处车身净空 '+(net*.1).toFixed(2)+' 米，共使用 '+(4-budget)+' 次补测。');}
      },
      draw(ctx){
        ctx.fillStyle='#172e36b8';ctx.fillRect(28,68,744,320);
        gates.forEach((g,i)=>{
          const x=xs[i],sd=Math.sqrt(g.variance),lo=g.mean[0],hi=g.mean[1];
          ctx.fillStyle='#6a736b';ctx.fillRect(x-20,68,40,lo-68);ctx.fillRect(x-20,hi,40,388-hi);
          for(let d=0;d<sd*3;d+=3){const a=Math.exp(-.5*(d/sd)**2)*.52;ctx.fillStyle='rgba(247,180,104,'+a+')';ctx.fillRect(x-22,lo+d,44,3);ctx.fillRect(x-22,hi-d-3,44,3);}
          for(const boundary of [lo+z*sd+carRadius,hi-z*sd-carRadius])path(ctx,[p(x-28,boundary),p(x+28,boundary)],teal,2);
          if(failed===i)for(const boundary of actual[i])path(ctx,[p(x-30,boundary),p(x+30,boundary)],pink,4);
          label(ctx,x-39,405,'门 '+(i+1)+' · '+g.n+' 测',g.n?teal:white,15);
        });
        if(route.length)path(ctx,route,amber,3);api.art.rover(ctx,runX,yAt(runX),0);badge(ctx,15,15,'剩余补测 '+budget+' / 4　安全倍数 '+z.toFixed(1));
      }};
  });

  add('ekf','峡底校位','扩展卡尔曼滤波','转运车沿沟底自主行驶，轮速推算逐渐漂移。路旁三座信标可以提供距离与方位。','用最多四次有效观测完成运输，终点横纵合成定位误差小于 2 米，并在前、后半程各校正一次。','启动车辆，点击范围内的信标测距测角。可暂停观察误差椭圆，给最后一段保留观测次数。',api=>{
    const track=x=>235+54*Math.sin((x-60)/96);
    const posts=[p(208,135),p(395,326),p(647,155)],reach=182;
    let x,y,est,P,reads,running,ended,early,late,used,lastBeam,baseTrail,estTrail;
    function reset(){
      x=58;y=track(x);est=p(x+5,y+11);P=[[62,0],[0,94]];reads=0;running=false;ended=false;early=late=false;used=[];lastBeam=null;baseTrail=[];estTrail=[];
      api.status('轮速位置会缓慢漂移。启动后，点击量程内的信标发送观测请求。');
    }
    function scalar(h,innovation,variance){
      const ph=[P[0][0]*h[0]+P[0][1]*h[1],P[1][0]*h[0]+P[1][1]*h[1]];
      const innovationVariance=h[0]*ph[0]+h[1]*ph[1]+variance;
      const gain=ph.map(v=>v/innovationVariance);
      est.x+=gain[0]*innovation;est.y+=gain[1]*innovation;
      P=P.map((r,i)=>r.map((v,j)=>v-gain[i]*ph[j]));
    }
    function measure(i){
      if(ended)return;if(reads>=4){api.status('四次观测已用完。');return;}
      const b=posts[i],r0=dist(p(x,y),b);
      if(r0>reach){api.status('该信标超出 '+(reach*.1).toFixed(1)+' 米量程，观测次数已保留。');return;}
      const oldSigma=Math.sqrt(P[0][0]+P[1][1]);let dx=est.x-b.x,dy=est.y-b.y,r=Math.max(1,Math.hypot(dx,dy));
      const measuredRange=r0+[1.2,-1.7,.9,-1.3][reads];
      scalar([dx/r,dy/r],measuredRange-r,4**2);
      dx=est.x-b.x;dy=est.y-b.y;r=Math.max(1,Math.hypot(dx,dy));
      const angle=Math.atan2(b.y-y,b.x-x)+[.004,-.009,.003,-.005][reads];
      const delta=angle-Math.atan2(-dy,-dx);
      scalar([-dy/(r*r),dx/(r*r)],Math.atan2(Math.sin(delta),Math.cos(delta)),.045**2);
      reads++;used.push(i);if(x<408)early=true;else late=true;lastBeam={from:p(x,y),to:b,time:1.1};
      api.status('信标 '+(i+1)+' 更新成功，观测后标准不确定度从 '+(oldSigma*.1).toFixed(1)+' 米降至 '+(.1*Math.sqrt(P[0][0]+P[1][1])).toFixed(1)+' 米。');
    }
    api.button('行驶 / 暂停',()=>{if(!ended){running=!running;api.status(running?'车辆沿巡检道行驶。':'车辆已暂停，可以对当前信标取样。');}});
    api.button('返回起点复测',reset);reset();
    return {world(w){
      edgePines(w);workshop(w,745,101,49,30,'#647871');
      const road=[];for(let at=58;at<=742;at+=8)road.push(p(at,track(at)));
      w.line(road,'#9a977a',22,1);if(estTrail.length>1)w.line(estTrail,amber,2,4);
      posts.forEach((b,i)=>{
        const inRange=dist(b,p(x,y))<reach;mast(w,b,inRange?teal:blue,31);
        w.ring(b.x,b.y,reach,inRange?'#80bda9':'#576d72',1,1);
        w.label(b.x,b.y,'信标 '+(i+1)+(used.includes(i)?' · 已测':''),inRange?teal:blue,39);
      });
      if(lastBeam?.time>0)w.line([lastBeam.from,lastBeam.to],teal,2.5,13);
      const angle=.5*Math.atan2(2*P[0][1],P[0][0]-P[1][1]),a=(P[0][0]+P[1][1])/2,b=Math.hypot((P[0][0]-P[1][1])/2,P[0][1]);
      const ellipse=[];for(let i=0;i<=40;i++){
        const t=2*Math.PI*i/40,u=2*Math.sqrt(Math.max(.1,a+b))*Math.cos(t),v=2*Math.sqrt(Math.max(.1,a-b))*Math.sin(t);
        ellipse.push(p(est.x+u*Math.cos(angle)-v*Math.sin(angle),est.y+u*Math.sin(angle)+v*Math.cos(angle)));
      }
      w.line(ellipse,amber,2.3,6);w.dot(est.x,est.y,amber,3.8,6);
      w.rover(x,y,Math.atan(54/96*Math.cos((x-60)/96)),white);w.label(x,y,'余 '+(4-reads)+' 测　进度 '+Math.round((x-58)/684*100)+'%',white,24);
    },pointer(type,px,py){if(type!=='down')return;const i=posts.findIndex(b=>dist(p(px,py),b)<37);if(i>=0)measure(i);},
      tick(dt){if(lastBeam)lastBeam.time-=dt;if(!running||ended)return;
        const old=x,oldY=y;x=Math.min(742,x+42*dt);y=track(x);const dx=x-old;est.x+=dx*1.018;est.y+=y-oldY+.079*dx;
        P[0][0]+=.24*dx;P[1][1]+=.42*dx;
        if(!baseTrail.length||x-baseTrail.at(-1).x>3){baseTrail.push(p(x,y));estTrail.push({...est});}
        if(x===742){
          running=false;ended=true;const error=dist(p(x,y),est)*.1;
          if(error<2&&early&&late&&new Set(used).size>=2)api.win('终点定位误差 '+error.toFixed(2)+' 米，使用 '+reads+' 次观测。');
          else api.status('终点误差 '+error.toFixed(2)+' 米。重试时让前后半程均有观测，并在较晚的路段保留一次校正。');
        }
      },
      draw(ctx){
        const trail=[];for(let i=58;i<=745;i+=3)trail.push(p(i,track(i)));path(ctx,trail,'#5a6053',26);path(ctx,trail,'#aca17c',16);
        path(ctx,estTrail,amber,2);posts.forEach((b,i)=>{ring(ctx,b,reach,blue+'55',1,[5,6]);dot(ctx,b,9,dist(b,p(x,y))<reach?teal:blue,'#25463d');label(ctx,b.x-27,b.y-22,'信标 '+(i+1),white,15);});
        if(lastBeam?.time>0)path(ctx,[lastBeam.from,lastBeam.to],teal,2);
        const angle=.5*Math.atan2(2*P[0][1],P[0][0]-P[1][1]),a=(P[0][0]+P[1][1])/2,b=Math.hypot((P[0][0]-P[1][1])/2,P[0][1]);
        ctx.beginPath();ctx.ellipse(est.x,est.y,2*Math.sqrt(Math.max(.1,a+b)),2*Math.sqrt(Math.max(.1,a-b)),angle,0,2*Math.PI);ctx.fillStyle='#ffce7b30';ctx.fill();ctx.strokeStyle=amber;ctx.stroke();
        dot(ctx,est,4,amber);api.art.rover(ctx,x,y,Math.atan(54/96*Math.cos((x-60)/96)));
        badge(ctx,15,15,'可用观测 '+(4-reads)+' / 4　运送进度 '+Math.round((x-58)/684*100)+'%');label(ctx,36,428,'金色为滤波估计与两倍标准差椭圆',amber,15);
      }};
  });

  add('fastslam','巡回测绘','FastSLAM 粒子建图','风暴移动了谷底的五个地标。小车只有指南针、轮速计和短距激光，需要巡回制作一份坐标图。','在 95 米里程和六次扫描内标全五个地标，绕行后回到起点复测，地图均方根误差低于 2 米。','点击地面驾驶，到站后点「扫描地标」。让相邻扫描圈看到公共地标，再回起点扫描消除累积误差。',api=>{
    const start=p(148,240),sites=[p(180,150),p(370,125),p(510,250),p(365,330),p(130,340)];
    const names=['岩针','风标','断塔','泵井','水尺'],reach=165,noise=25;
    let cloud,rover,trail,leg,mileage,scans,lastSeen,touchdown,mean,meanPos,closed,done,random,heading;
    function reset(){
      random=rng(95741);cloud=Array.from({length:64},()=>({x:start.x+(random()-.5)*8,y:start.y+(random()-.5)*8,map:{}}));
      rover={...start};trail=[{...start}];leg=null;mileage=0;scans=0;lastSeen={};touchdown=[];mean={};meanPos={...start};closed=false;done=false;heading=0;
      api.status('先在基地扫描附近的岩针和水尺，再规划让相邻视野重叠的巡回路线。');
    }
    function drive(to){
      if(leg||done)return;
      if(to.x<45||to.x>750||to.y<65||to.y>395)return;
      const d=dist(rover,to);if(d<8)return;
      if(mileage+d>950){api.status('单程累计将超过 95 米。点击近一点的位置，或重新出发。');return;}
      const from={...rover},dx=to.x-from.x,dy=to.y-from.y;heading=Math.atan2(dy,dx);
      const normal=()=>Math.sqrt(-2*Math.log(Math.max(1e-8,random())))*Math.cos(2*Math.PI*random());
      leg={from,to,d,progress:0,motions:cloud.map(q=>({x:q.x,y:q.y,dx:dx+.035*d+normal()*(1.6+.045*d),dy:dy-.023*d+normal()*(1.6+.045*d)}))};
    }
    function scan(){
      if(leg){api.status('车停稳后才能让一圈回波共用一个观测位姿。');return;}
      if(done)return;if(scans===6){api.status('六次扫描已用完。请提交地图，或从基地重新出发。');return;}
      const visible=sites.map((s,i)=>({s,i})).filter(({s})=>dist(rover,s)<=reach);
      if(!visible.length){api.status('扫描圈内没有地标，请驶近谷底设施。');return;}
      if(touchdown.length&&dist(rover,touchdown.at(-1))<25){api.status('刚刚扫描过这里。移动 2.5 米以上再观测，可获得不同视角。');return;}
      const obs=visible.map(({s,i})=>({i,dx:s.x-rover.x+2*Math.sin((scans+1)*(i+1)),dy:s.y-rover.y+2*Math.cos(scans+i+1)}));
      const logWeights=cloud.map(q=>{
        let total=0;
        for(const {i,dx,dy} of obs){
          const mx=q.x+dx,my=q.y+dy,l=q.map[i];
          if(!l){q.map[i]={x:mx,y:my,v:noise};continue;}
          const v=l.v+noise,ex=mx-l.x,ey=my-l.y,gain=l.v/v;
          total-=(ex*ex+ey*ey)/(2*v)+Math.log(v);
          l.x+=gain*ex;l.y+=gain*ey;l.v*=1-gain;
        }
        return total;
      });
      const top=Math.max(...logWeights),weights=logWeights.map(w=>Math.exp(w-top)),sum=weights.reduce((a,b)=>a+b);
      const w=weights.map(a=>a/sum);mean={};meanPos=p(0,0);
      cloud.forEach((q,i)=>{
        meanPos.x+=w[i]*q.x;meanPos.y+=w[i]*q.y;
        for(const [id,l] of Object.entries(q.map)){const pt=mean[id]||=p(0,0);pt.x+=w[i]*l.x;pt.y+=w[i]*l.y;}
      });
      let j=0,cdf=w[0],u=random()/cloud.length;
      cloud=Array.from({length:cloud.length},(_,i)=>{
        const t=u+i/w.length;while(j<w.length-1&&t>cdf)cdf+=w[++j];
        const q=cloud[j];return {x:q.x,y:q.y,map:Object.fromEntries(Object.entries(q.map).map(([id,l])=>[id,{...l}]))};
      });
      const overlap=obs.filter(o=>Object.hasOwn(lastSeen,o.i));
      if(dist(rover,start)<55&&mileage>270&&touchdown.some(a=>dist(a,start)>145)&&overlap.some(o=>lastSeen[o.i]<mileage-150))closed=true;
      obs.forEach(o=>{lastSeen[o.i]=mileage;});scans++;touchdown.push({...rover});
      api.status('收到 '+obs.length+' 个地标，其中 '+overlap.length+' 个已有记录。'+(closed?'已建立回环。':'每条粒子轨迹用自己的地图给这次观测打分。'));
    }
    function submit(){
      if(done||leg)return;const ids=Object.keys(mean);
      if(ids.length<sites.length){api.status('地图只覆盖 '+ids.length+' / 5。开到没有蓝色地图标记的地标附近扫描。');return;}
      if(!closed){api.status('还缺起点回环。绕行后回到基地附近，重新看到出发时的地标。');return;}
      const rms=Math.sqrt(ids.reduce((s,i)=>s+dist(mean[i],sites[i])**2,0)/ids.length)*.1;
      if(rms>=2){api.status('地图均方根误差 '+rms.toFixed(2)+' 米。优先选择同时看见多个熟悉地标的位置。');return;}
      done=true;api.win('五个地标全部入图。回环后地图均方根误差 '+rms.toFixed(2)+' 米，巡回里程 '+(mileage*.1).toFixed(1)+' 米。');
    }
    api.button('扫描地标',scan);api.button('提交闭环地图',submit);api.button('从基地重新出发',reset);reset();
    return {world(w){
      edgePines(w);
      w.box(start.x,start.y,48,38,1,'#778674');w.ring(start.x,start.y,28,amber,2,2);
      w.label(start.x,start.y+28,'基地',amber,8);
      w.rock(sites[0].x,sites[0].y,10,26,'#a5997c');
      mast(w,sites[1],amber,26);w.box(sites[1].x+5,sites[1].y,11,3,5,amber,28);
      w.box(sites[2].x,sites[2].y,16,13,24,'#849087');
      w.post(sites[3].x,sites[3].y,9,11,'#668779');w.ring(sites[3].x,sites[3].y,8,teal,2,12);
      w.box(sites[4].x,sites[4].y,5,5,23,'#87b7ac');
      sites.forEach((q,i)=>{
        const estimate=mean[i];w.label(q.x,q.y,names[i],estimate?blue:white,31);
        if(estimate){w.ring(estimate.x,estimate.y,9,blue,2.4,3);w.dot(estimate.x,estimate.y,blue,3,5);}
      });
      if(trail.length||leg)w.line([...trail,rover],'#ceac75',3,2);
      touchdown.forEach(q=>w.ring(q.x,q.y,11,teal,1.5,3));
      cloud.forEach((q,i)=>{if(i%2===0)w.dot(q.x,q.y,amber,2.1,5);});
      w.ring(rover.x,rover.y,reach,'#84b8a9',1.6,2);if(leg)w.ring(leg.to.x,leg.to.y,8,teal,2,3);
      w.rover(rover.x,rover.y,heading,white);
      w.label(rover.x,rover.y,'入图 '+Object.keys(mean).length+'/5 · '+(mileage*.1).toFixed(1)+' m',teal,24);
    },pointer(type,x,y){if(type==='down')drive(p(x,y));},
      tick(dt){
        if(!leg)return;const a=leg;a.progress=Math.min(1,a.progress+dt*123/a.d);const t=a.progress;
        rover=p(a.from.x+(a.to.x-a.from.x)*t,a.from.y+(a.to.y-a.from.y)*t);
        cloud.forEach((q,i)=>{const m=a.motions[i];q.x=m.x+m.dx*t;q.y=m.y+m.dy*t;});
        if(t===1){mileage+=a.d;trail.push({...rover});leg=null;api.status('车辆已停稳。扫描圈内的共有地标能帮助判断哪条轨迹更可靠。');}
      },
      draw(ctx){
        path(ctx,[...trail,rover],'#403b31',12);path(ctx,[...trail,rover],'#a78f60',2);ring(ctx,start,32,amber,2,[6,5]);
        label(ctx,start.x-60,start.y+37,'基地',amber,14);ring(ctx,rover,reach,'#a5ffdd8c',2,[5,6]);
        touchdown.forEach(t=>ring(ctx,t,11,teal,1,[3,2]));
        sites.forEach((s,i)=>{const r=11;path(ctx,[p(s.x-r,s.y+7),p(s.x-4,s.y-r),p(s.x+4,s.y-14),p(s.x+r,s.y+7)],'#cabfa8',4,true);
          label(ctx,s.x+15,s.y-13,names[i],white,14);if(mean[i]){ring(ctx,mean[i],7,blue,2);dot(ctx,mean[i],2,blue);}});
        cloud.forEach(q=>dot(ctx,q,2,'#fed59874'));if(leg)ring(ctx,leg.to,8,teal);
        api.art.rover(ctx,rover.x,rover.y,heading);badge(ctx,15,15,'入图 '+Object.keys(mean).length+' / 5　扫描 '+scans+' / 6　里程 '+(mileage*.1).toFixed(1)+' 米');
        label(ctx,35,426,'蓝环为地图估计　金色为轨迹粒子　虚线为车载扫描范围',white,15);
      }};
  });
})();
