(() => {
  'use strict';
  const point=(x,y)=>({x,y});
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const angle=v=>Math.atan2(Math.sin(v),Math.cos(v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>t*t*t*(10+t*(-15+6*t));
  const colors={road:'#667369',edge:'#d6bd94',route:'#82ebc8',warn:'#f39971',aim:'#ffd489',ghost:'#b5c8cc'};
  function ring(g,p,r,color,fill){
    g.beginPath();g.arc(p.x,p.y,r,0,Math.PI*2);if(fill){g.fillStyle=fill;g.fill();}g.strokeStyle=color;g.lineWidth=2;g.stroke();
  }
  function roads(g,a,pts,width=48){
    a.line(g,pts,'#102a2d',width+8);a.line(g,pts,colors.edge,width+3);a.line(g,pts,colors.road,width);a.line(g,pts,'#dbcba17d',1.8,true);
  }
  function obstacle(g,p){
    g.save();g.translate(p.x,p.y);g.beginPath();
    for(let i=0;i<7;i++){const t=i*Math.PI*2/7,r=p.r*(i%2?.86:1);if(i)g.lineTo(r*Math.cos(t),r*Math.sin(t));else g.moveTo(r,0);}
    g.closePath();g.fillStyle='#b18b72';g.fill();g.lineWidth=2;g.strokeStyle='#4e5048';g.stroke();g.restore();
  }

  // Ground coordinates match the simulation; the renderer supplies the viewing camera.
  const paint={track:'#434e4d',shoulder:'#a69a7c',mint:'#64ecd0',gold:'#f7c668',clay:'#b87d5e',metal:'#667c82',light:'#cbd4ba'};
  function road3(p,points,width=35){
    p.line(points,paint.shoulder,width+4,.65);
    p.line(points,paint.track,width,1.15);
  }
  function antenna3(p,x,y,h,color){
    p.post(x,y,7,4,paint.metal);
    p.post(x,y,2,h,paint.light,4);
    p.box(x,y,11,3,4,color,h-2);
  }
  function shed3(p,x,y,w=32,d=23,color='#867b69'){
    p.box(x,y,w,d,14,color);
    p.box(x,y,w+4,d+3,3,'#526568',14);
    p.box(x,y+d/2+1,w*.45,2,9,'#404c4e',1);
  }
  function arrow3(p,pos,h,color,len=30){
    const co=Math.cos(h),si=Math.sin(h),end=point(pos.x+len*co,pos.y+len*si);
    const a=point(end.x-8*co+5*si,end.y-8*si-5*co),b=point(end.x-8*co-5*si,end.y-8*si+5*co);
    p.line([pos,end],color,3,3.5);p.line([a,end,b],color,3,3.5);
  }
  function register(id,title,algorithm,brief,goal,how,create){
    FieldMissions.push({id,title,algorithm,brief,goal,how,create,lesson:id,region:['breadth','depth','dijkstra','bug'].includes(id)?'routes':id==='graph-slam'?'survey':'driving'});
  }
  register('dijkstra','给运输线铺防滑板','Dijkstra 最小代价路径','满载电芯时，陡坡和泥地比绕远路更耗电。两块防滑板可以改善两段路面的能耗。','布置两块板，让基地到仓库的最小能耗降到 16 格以内。','点道路中间的数字铺板，再点可取回。看算法如何随边权变化改道。',api=>{
    const a=api.art;
    const pts=[[70,220],[240,105],[240,335],[438,165],[472,326],[660,110],[730,260]].map(([x,y])=>point(x,y));
    const edges=[[0,1,12],[0,2,7],[1,3,4],[2,3,11],[2,4,8],[3,5,6],[3,6,15],[4,6,10],[5,6,5]];
    const plates=new Set();
    const cost=i=>plates.has(i)?Math.ceil(edges[i][2]*.36):edges[i][2];
    function solve(){
      const d=pts.map(()=>Infinity),prev=pts.map(()=>null),open=new Set(pts.keys());d[0]=0;
      while(open.size){const u=[...open].sort((i,j)=>d[i]-d[j])[0];open.delete(u);
        edges.forEach(([v,w],i)=>{const n=u===v?w:u===w?v:-1;if(!open.has(n))return;const k=d[u]+cost(i);if(k<d[n]){d[n]=k;prev[n]=i;}});}
      const used=[];let n=6;while(n!==0){const i=prev[n];used.unshift(i);n=edges[i][0]===n?edges[i][1]:edges[i][0];}

      return {used,total:d[6]};
    }
    function mid(i){const [u,v]=edges[i];return point((pts[u].x+pts[v].x)/2,(pts[u].y+pts[v].y)/2);}
    api.button('派出满载车',()=>{const {total}=solve();if(plates.size===2&&total<=16)api.win('车辆沿新的最省电路线入库，共消耗 '+total+' 格电量。');else api.status('当前最少消耗 '+total+' 格。把有限的两块板用在同一条高收益路线。');});
    function world(p){
      const sol=solve(),used=new Set(sol.used);
      shed3(p,68,174,43,26,'#8a7760');shed3(p,732,215,56,34,'#7e8f79');
      for(const [x,y] of [[165,67],[420,380],[630,354]])p.rock(x,y,22,20,'#957b65');
      edges.forEach(([u,v],i)=>{
        const aa=pts[u],bb=pts[v],c=mid(i),h=Math.atan2(bb.y-aa.y,bb.x-aa.x),fitted=plates.has(i);
        road3(p,[aa,bb],15);
        if(used.has(i))p.line([aa,bb],paint.mint,4,2);
        p.box(c.x,c.y,28,14,3,fitted?'#d9ab53':'#806d55',1.5,h);
        for(let r=-8;r<=8;r+=8)p.box(c.x+r*Math.cos(h),c.y+r*Math.sin(h),2,14,1.5,fitted?'#f8d274':'#a99a7b',4.4,h);
        p.label(c.x,c.y,String(cost(i)),fitted?paint.gold:paint.light,12);
      });
      pts.forEach((q,i)=>p.post(q.x,q.y,6,3,i===6?paint.gold:paint.metal));
      p.rover(pts[0].x,pts[0].y,Math.atan2(pts[edges[sol.used[0]][1]].y-pts[0].y,pts[edges[sol.used[0]][1]].x-pts[0].x));
      p.label(70,179,'基地',paint.light,28);p.label(730,222,'仓库',paint.light,28);
      p.label(380,78,'最省电 '+sol.total+' 格　铺板 '+plates.size+'/2',paint.mint,10);
    }
    return {world,draw(g){const sol=solve();edges.forEach(([u,v],i)=>{a.line(g,[pts[u],pts[v]],sol.used.includes(i)?colors.route:'#8f997e',sol.used.includes(i)?9:5);});pts.forEach((p,i)=>a.pin(g,p.x,p.y,['基地','A','B','C','D','E','仓库'][i],'#f2d798'));edges.forEach((_,i)=>{const p=mid(i);ring(g,p,16,plates.has(i)?colors.route:'#c4bb98','#263936');a.text(g,p.x-8,p.y+5,String(cost(i)),'#fff1ca',15);});a.text(g,24,34,'防滑板 '+plates.size+' / 2     最省电路线 '+sol.total+' 格',colors.aim,18);},
    pointer(t,x,y){if(t!=='down')return;const i=edges.findIndex((e,j)=>dist(point(x,y),mid(j))<27);if(i<0)return;if(plates.has(i))plates.delete(i);else if(plates.size<2)plates.add(i);else{api.status('两块板都在使用，点已铺路段可取回一块。');return;}api.status('路网已重新计算，绿色路线能耗 '+solve().total+' 格。');}};
  });

  register('quintic','赶上移动渡板','五次多项式轨迹','装载精密雨量计后，车要以零速度、零加速度起步和停稳。浮桥只在限定时段对齐。','让整车在第 5.0 至 8.0 秒通过中段，峰值加加速度不超过 0.85 m/s³。','调整行驶时间与发车延迟。时间太短会让载荷受到冲击，太晚则错过渡口。',api=>{
    const a=api.art;let duration=6,delay=0,time=0,run=false,failed=false;const length=16;
    const start=point(80,240),goal=point(725,240);
    const jerk=()=>60*length/duration**3;
    const u=()=>clamp((time-delay)/duration,0,1);
    const pos=k=>point(mix(start.x,goal.x,k),start.y);
    api.slider('行驶时长（秒）',6,16,6,0.5,v=>{run=false;failed=false;time=0;duration=v;});
    api.slider('发车延迟（秒）',0,4,0,0.25,v=>{run=false;failed=false;time=0;delay=v;});
    api.button('执行发车曲线',()=>{time=0;failed=false;run=true;api.status('已生成起终点速度和加速度均为零的五次曲线。');});

    function world(p){
      const open=time>=5&&time<=8,yy=open?240:280,car=pos(smooth(u()));
      p.line([point(380,-45),point(395,86),point(398,260),point(407,505)],'#37838b',79,.6);
      for(const [x,y] of [[384,95],[411,136],[376,329],[414,389]])p.line([point(x-5,y-9),point(x,y),point(x-2,y+12)],'#93c3bd',1.6,1);
      for(const [x,y] of [[222,77],[244,93],[536,385],[554,376]])p.tree(x,y,20);
      for(const [x,y] of [[331,139],[457,321]])p.rock(x,y,14,9,'#8d8776');
      road3(p,[start,point(359,240)],43);road3(p,[point(439,240),goal],43);
      for(const x of [349,449])for(const y of [214,266])p.post(x,y,5,9,'#8c7760');
      p.box(398,yy,82,40,3,'#ad966a',1.4);
      for(let j=0;j<9;j++)p.box(361+j*9.1,yy,2.7,39,1,'#695c4a',4.4);
      p.post(348,204,3,16,'#657d78');p.dot(348,204,open?paint.mint:paint.clay,4,18);
      p.ring(goal.x,goal.y,17,paint.mint,3,2);shed3(p,724,187,40,28);
      p.rover(car.x,car.y,0);p.label(398,192,open?'渡板对齐':'渡板离岸',open?paint.mint:paint.gold,21);
      p.label(93,147,'发车 '+delay.toFixed(2)+' s',paint.light,10);
      p.label(610,323,time.toFixed(1)+' s　峰值加加速度 '+jerk().toFixed(2)+' m/s³',failed?paint.clay:paint.gold,10);
    }
    return {world,tick(dt){if(!run)return;time+=dt;const s=smooth(u());
      if((s>.44&&s<.56)&&(time<5||time>8)){run=false;failed=true;api.status('渡板此时没有对齐。车头到达的时间为 '+time.toFixed(1)+' 秒，请调整发车时刻。');}
      else if(u()>=1){run=false;if(jerk()<=.85)api.win('平稳完成转运。峰值加加速度 '+jerk().toFixed(2)+' m/s³。');else{failed=true;api.status('已进站，但载荷冲击超标。拉长行驶时间能降低峰值加加速度。');}}},draw(g){
      g.fillStyle='#2c666c';g.fillRect(360,55,78,340);roads(g,a,[start,point(362,240)],42);roads(g,a,[point(436,240),goal],42);
      const aligned=time>=5&&time<=8;g.fillStyle=aligned?'#bca97e':'#859998';g.fillRect(358,aligned?220:260,84,40);for(let i=0;i<9;i++){g.fillStyle='#655e48';g.fillRect(360+i*10,aligned?220:260,2,40);}
      a.pin(g,goal.x,goal.y,'卸货区',colors.route);a.rover(g,pos(smooth(u())).x,240,0);a.text(g,22,32,'时钟 '+time.toFixed(1)+' 秒    峰值加加速度 '+jerk().toFixed(2)+' m/s³',failed?colors.warn:colors.aim,17);
      const curve=Array.from({length:81},(_,i)=>point(90+i*7.5,401-45*(30*(i/80)**2*(1-i/80)**2)/1.875));a.line(g,curve,colors.route,3);a.text(g,90,429,'速度曲线 · 两端平稳停靠',colors.ghost,14);}
    };
  });

  register('frenet','会车廊道','Frenet 曲线坐标','山道转弯时既要前进，也要在路宽内错开两辆施工车。','给两段路设置横向偏移，让运输车依次避开施工车并回到中心线。','点击两条横向标尺放置控制点。s 沿道路增长，d 决定左右偏移，再开始试车。',api=>{
    const a=api.art,L=660,marks=[.34,.69],offsets=[0,0];
    function center(t){return point(70+L*t,224+58*Math.sin(t*Math.PI*2-.5));}
    function normal(t){const q=58*Math.PI*2*Math.cos(t*Math.PI*2-.5);const n=Math.hypot(q,L);return point(-q/n,L/n);}
    function map(t,d){const c=center(t),n=normal(t);return point(c.x+n.x*d,c.y+n.y*d);}
    const blocks=[map(marks[0],-10),map(marks[1],11)];
    let time=0,running=false,closest=Infinity,active=-1;
    function at(t){const ts=[0,...marks,1],ds=[0,...offsets,0];const i=t<=ts[1]?0:t<=ts[2]?1:2;return map(t,mix(ds[i],ds[i+1],smooth((t-ts[i])/(ts[i+1]-ts[i]))));}
    const samples=fn=>Array.from({length:91},(_,i)=>fn(i/90));
    api.button('试跑廊道',()=>{time=0;closest=Infinity;running=true;api.status('检查当前横向轨迹与两辆施工车的净空。');});
    function edit(i,x,y){const c=center(marks[i]),n=normal(marks[i]);offsets[i]=clamp((x-c.x)*n.x+(y-c.y)*n.y,-43,43);running=false;time=0;}

    function world(p){
      const road=Array.from({length:38},(_,i)=>center(i/37));road3(p,road,110);
      p.line(road,'#d2bc88',2,2);
      marks.forEach((m,i)=>{
        const c=map(m,offsets[i]);p.line([map(m,-47),map(m,47)],paint.gold,3,2.8);
        [-43,0,43].forEach(k=>{const q=map(m,k);p.dot(q.x,q.y,paint.gold,3,3);});
        p.ring(c.x,c.y,9,paint.gold,3,3.6);p.label(c.x,c.y,'d'+(i+1)+' = '+Math.round(offsets[i]),paint.gold,18);
      });
      p.line(samples(at).filter((v,i)=>i%2===0),paint.mint,3,2.5);
      blocks.forEach((b,i)=>{
        const t=marks[i],f=center(t+.01),e=center(t),h=Math.atan2(f.y-e.y,f.x-e.x)+(i===0?Math.PI:0);
        p.rover(b.x,b.y,h,'#ba7154');p.ring(b.x,b.y,17,'#d98565',2,2.5);
      });
      const v=at(time),w=at(time<1?time+.002:time-.002);p.rover(v.x,v.y,Math.atan2(w.y-v.y,w.x-v.x)+(time===1?Math.PI:0));
      for(const [x,y] of [[98,386],[123,391],[678,73],[698,69]])p.tree(x,y,13);
    }
    return {world,pointer(t,x,y){if(t==='down'){active=marks.findIndex(v=>dist(center(v),point(x,y))<70);if(active>=0)edit(active,x,y);}else if(t==='move'&&active>=0)edit(active,x,y);else if(t==='up')active=-1;},tick(dt){if(!running)return;time=Math.min(1,time+dt*.18);const p=at(time);
      closest=Math.min(closest,...blocks.map(b=>dist(p,b)-23));if(closest<0){running=false;api.status('擦碰施工车。将这一段的控制点移向另一侧，再试跑。');}else if(time===1){running=false;api.win('两次交会都留出净空，最窄处 '+(closest*.20).toFixed(1)+' 米。');}},draw(g){
      roads(g,a,samples(center),110);marks.forEach((m,i)=>{a.line(g,[map(m,-47),map(m,47)],'#fff3c0',3,true);const p=map(m,offsets[i]);ring(g,p,10,colors.aim,'#384d47');a.text(g,p.x+13,p.y-12,(i+1)+'号 d='+Math.round(offsets[i]),colors.aim,15);});
      a.line(g,samples(at),colors.route,4);blocks.forEach(b=>obstacle(g,{...b,r:18}));const p=at(time),q=at(Math.min(time+.005,1));a.rover(g,p.x,p.y,Math.atan2(q.y-p.y,q.x-p.x));a.text(g,22,30,'s '+Math.round(time*100)+'%    横向规划坐标 d',colors.ghost,16);}
    };
  });

  register('stanley','横风巡检线','Stanley 横向控制','巡检车受到持续侧风，单靠车头对齐仍会偏离电缆巡检线。','完成巡检，后半程的平均横向偏差不超过 8 个地图单位。','调节横向纠偏增益后发车。黄色连线是前轴到目标轨迹的偏差。',api=>{
    const a=api.art;const path=x=>218+45*Math.sin((x-50)/118);const slope=x=>45/118*Math.cos((x-50)/118);
    let gain=.1,car,run=false,trail=[],sum=0,n=0,peak=0;
    function reset(){car={x:56,y:path(56)+30,h:0};run=false;trail=[];sum=0;n=0;peak=0;}
    reset();api.slider('纠偏增益',.1,6,.1,.1,v=>{gain=v;});api.button('从起点巡检',()=>{reset();run=true;api.status('风把车辆向下推。观察前轴的横向偏差怎样随增益变化。');});

    function world(p){
      const route=Array.from({length:47},(_,i)=>point(40+720*i/46,path(40+720*i/46)));
      road3(p,route,68);p.line(route,paint.mint,3,2.3);if(trail.length>1)p.line(trail,paint.gold,3,3);
      const fx=car.x+15*Math.cos(car.h),fy=car.y+15*Math.sin(car.h);
      p.line([point(fx,fy),point(fx,path(fx))],'#fb8b64',4,3.4);p.dot(fx,fy,paint.gold,3,7);
      for(const x of [120,305,505,689]){p.post(x,104,2,24,'#77857d');p.box(x,110,6,18,4,'#efab72',21);arrow3(p,point(x,127),Math.PI/2,'#9acfcc',22);}
      p.rover(car.x,car.y,car.h);p.label(car.x,car.y,'前轴偏差 '+Math.abs(path(fx)-fy).toFixed(1),paint.gold,25);
      p.ring(737,path(737),12,paint.mint,3,2.5);
    }
    return {world,tick(dt){if(!run)return;let remaining=dt;while(remaining>0&&run){const h=Math.min(remaining,.02);remaining-=h;
      const v=85,L=15,fx=car.x+L*Math.cos(car.h),fy=car.y+L*Math.sin(car.h);const desired=Math.atan(slope(fx));const cross=(path(fx)-fy)*Math.cos(desired);
      const steer=clamp(angle(desired-car.h)+Math.atan2(gain*cross,v),-.58,.58);
      car.h+=v/L*Math.tan(steer)*h;car.x+=v*Math.cos(car.h)*h;car.y+=(v*Math.sin(car.h)+10)*h;
      if(car.x>380){sum+=Math.abs(cross)*h;n+=h;peak=Math.max(peak,Math.abs(cross));}
      if(!trail.length||dist(car,trail.at(-1))>3)trail.push(point(car.x,car.y));
      if(car.x>=737){run=false;const mean=sum/Math.max(n,.001);if(mean<=8)api.win('巡检完成，后半程平均横向偏差 '+mean.toFixed(1)+'。');else api.status('后半程偏差 '+mean.toFixed(1)+'，超过 8。增大纠偏增益抵消侧风，再跑一次。');}}},draw(g){
      const route=Array.from({length:91},(_,i)=>point(40+i*8,path(40+i*8)));roads(g,a,route,68);a.line(g,route,colors.route,3,true);a.line(g,trail,colors.aim,3);
      const fx=car.x+15*Math.cos(car.h),fy=car.y+15*Math.sin(car.h);a.line(g,[point(fx,fy),point(fx,path(fx))],colors.warn,4);a.rover(g,car.x,car.y,car.h);a.text(g,25,33,'横风 ↓    前轴偏差 '+Math.abs(path(fx)-fy).toFixed(1),colors.aim,18);
      for(let x=120;x<730;x+=100)a.text(g,x,115,'↓','#a3d1d599',24);}
    };
  });

  register('gps-imu','峡壁校时台','位置观测与里程融合','长峡谷里，轮速推算会逐段漂移。你只带了两个能提供绝对位置观测的校正站。','沿路线放置两座校正站，使全程均方根误差小于 5 米，并让终点误差小于 5 米。','在路线的两个不同位置点击放站，第三次点击会移动较早的一座。发车比较推算与融合轨迹。',api=>{
    const a=api.art,stations=[];let t=0,run=false,estimate=0,odom=0,P=.1,sum=0,samples=0,log=[];
    const pos=(s,e=0)=>point(60+675*s,211+45*Math.sin(s*6)+e*4);
    function reset(){t=0;estimate=0;odom=0;P=.1;sum=0;samples=0;log=[];run=false;}
    api.button('发车测漂移',()=>{if(stations.length<2){api.status('先在沿线放置两座校正站。');return;}reset();run=true;});

    function world(p){
      const path=Array.from({length:48},(_,i)=>pos(i/47));road3(p,path,40);p.line(path,'#c3c6a3',1.8,2);
      for(const [x,y,r,h] of [[96,86,36,38],[202,74,41,48],[385,98,29,33],[617,64,42,45],[699,375,29,34]])p.rock(x,y,r,h,'#99816b');
      stations.forEach((s,i)=>{const q=pos(s);antenna3(p,q.x,q.y,20,paint.gold);p.ring(q.x,q.y,12,paint.gold,2,2);p.label(q.x,q.y,'校正 '+(i+1),paint.gold,32);});
      if(log.length>1)p.line(log.filter((_,i)=>i%3===0||i===log.length-1),paint.mint,3,3);
      const r=pos(t),o=pos(t,odom),f=pos(t,estimate);p.line([r,o],paint.clay,2,3);
      p.dot(o.x,o.y,paint.clay,4,5);p.dot(f.x,f.y,paint.mint,5,7);
      const h=Math.atan2(270*Math.cos(t*6),675);p.rover(r.x,r.y,h);
      p.label(395,342,'里程漂移 '+odom.toFixed(1)+' m　融合偏差 '+estimate.toFixed(1)+' m',paint.light,11);
    }
    return {world,pointer(type,x,y){if(type!=='down')return;const f=clamp((x-60)/675,.04,.98);if(dist(point(x,y),pos(f))>78)return;
      if(stations.some(s=>Math.abs(f-s)<.04)){api.status('两次观测需要有间距，点另一段路。');return;}reset();if(stations.length===2)stations.shift();stations.push(f);api.status('校正站位置为 '+stations.map(s=>Math.round(s*100)+'%').join('、')+'。');},tick(dt){if(!run)return;
      const old=t;t=clamp(t+dt*.16,0,1);const du=t-old;estimate+=du*18;odom+=du*18;P+=du*12;
      for(const s of stations)if(old<s&&t>=s){const obs=.45*Math.sin(s*25),K=P/(P+.10);estimate+=K*(obs-estimate);P*=(1-K);}
      sum+=estimate**2*du;samples+=du;log.push(pos(t,estimate));
      if(t===1){run=false;const rms=Math.sqrt(sum/samples);if(rms<5&&Math.abs(estimate)<5)api.win('融合均方根误差 '+rms.toFixed(2)+' m，终点误差 '+Math.abs(estimate).toFixed(2)+' m。');else api.status('均方根 '+rms.toFixed(1)+' m，终点 '+estimate.toFixed(1)+' m。让观测分散在路上，并照顾终点前的漂移。');}},
      draw(g){const path=Array.from({length:101},(_,i)=>pos(i/100));roads(g,a,path,40);a.line(g,path,'#d5d5b7',2,true);stations.forEach((s,i)=>{const p=pos(s);a.pin(g,p.x,p.y-12,'校正站 '+(i+1),colors.aim);});a.line(g,log,colors.route,4);
        a.line(g,[pos(t),pos(t,odom)],colors.warn,2,true);const p=pos(t);a.rover(g,p.x,p.y,0);a.pin(g,pos(t,estimate).x,pos(t,estimate).y,'融合',colors.route);
        a.text(g,22,34,'纯里程漂移 '+odom.toFixed(1)+' m    融合偏差 '+estimate.toFixed(1)+' m',colors.aim,16);}
    };
  });

  register('graph-slam','闭环老林场','位姿图优化 · 平移模型','巡检路线绕回老林场，同一个岗亭在地图上出现了两份。里程约束的误差积累到了终点。','找出两对重复经过的地标，添加闭环约束并优化，使重复位置残差小于 3 个单位。','地图中带同一标识的站点是两次独立到访记录。依次点选一对，将它们约束到同一位置。',api=>{
    const a=api.art,truth=[[105,300],[245,185],[420,121],[596,212],[501,328],[245,185],[105,300]].map(([x,y])=>point(x,y));
    const ids=['闸房','岗亭','塔脚','水渠','林道','岗亭','闸房'];
    const od=truth.map((p,i)=>point(p.x+i*11,p.y+i*8)),p=od.map(p=>({...p}));const pairs=[];let pick=-1,iter=0,run=false;
    function diff(i,j){return point(od[j].x-od[i].x,od[j].y-od[i].y);}
    function relax(i,j,d,w){const ex=p[j].x-p[i].x-d.x,ey=p[j].y-p[i].y-d.y;const step=.13*w;
      if(i){p[i].x+=step*ex;p[i].y+=step*ey;}if(j){p[j].x-=step*ex;p[j].y-=step*ey;}}
    api.button('优化位姿图',()=>{if(pairs.length!==2){api.status('还缺闭环观测。找到两对重复到访的地点。');return;}iter=0;run=true;});

    function world(w){
      [[153,77],[172,90],[184,69],[610,339],[638,351],[671,331]].forEach(([x,y])=>w.tree(x,y,17));
      w.line(od,'#bf8c68',3,1.4);w.line(p,paint.mint,4,2.7);
      pairs.forEach(([u,v])=>w.line([p[u],p[v]],paint.gold,3,4));
      for(let i=0;i<p.length;i++){
        const v=p[i],c=pick===i?paint.gold:paint.mint;
        if(i===0||i===6)shed3(w,v.x,v.y,24,17,'#97856c');
        else if(i===2)antenna3(w,v.x,v.y,27,paint.gold);
        else if(i===1||i===5){w.post(v.x,v.y,7,11,'#a08f6a');w.box(v.x,v.y,19,18,3,'#687674',11);}
        else w.post(v.x,v.y,6,8,'#809995');
        w.ring(v.x,v.y,pick===i?16:11,c,2.5,2.3);
        const adj=i>=5?15:-10;w.label(v.x,v.y+adj,ids[i]+' '+(i+1),c,i>=5?16:29);
      }
      w.label(480,390,'闭环 '+pairs.length+'/2　优化 '+iter+' 次',paint.light,13);
    }
    return {world,pointer(t,x,y){if(t!=='down'||run)return;const n=p.map((v,i)=>({i,d:dist(v,point(x,y))})).sort((u,v)=>u.d-v.d)[0];if(n.d>28)return;
      if(pick<0){pick=n.i;api.status('已选 '+ids[pick]+'。寻找另一次同名到访。');return;}
      if(pick===n.i){pick=-1;return;}if(ids[pick]!==ids[n.i]){api.status('两份记录属于不同地标。不能把它们锁在同一位置。');pick=-1;return;}
      if(!pairs.some(q=>q.includes(n.i)))pairs.push([pick,n.i]);pick=-1;api.status('已添加 '+pairs.length+' / 2 对闭环约束。');},
      tick(dt){if(!run||!dt)return;for(let k=0;k<7;k++){for(let i=0;i<p.length-1;i++)relax(i,i+1,diff(i,i+1),.35);for(const [i,j] of pairs)relax(i,j,point(0,0),2.6);iter++;}
        if(iter>360){run=false;const err=Math.max(...pairs.map(([i,j])=>dist(p[i],p[j])));if(err<3)api.win('两组闭环校准完成，最大重复位置残差 '+err.toFixed(2)+'。');else api.status('继续优化，可进一步减小残差。');}},
      draw(g){a.line(g,od,'#e0977088',2,true);a.line(g,p,colors.route,4);pairs.forEach(([i,j])=>a.line(g,[p[i],p[j]],colors.aim,3,true));p.forEach((v,i)=>{ring(g,v,pick===i?13:8,pick===i?colors.aim:colors.route,'#293f40');a.text(g,v.x+10,v.y+(i>4?17:-10),ids[i]+' '+(i+1),'#fff2cf',15);});a.text(g,22,30,'实线 · 优化轨迹    虚线 · 初始里程估计',colors.ghost,15);}
    };
  });

  register('dwa','隧口穿行','动态窗口局部规划','两台巡检仪困在隧口两侧。探测车需要近距离采样，车轮只能逐步加速和改变转向。','在无碰撞的情况下抵达两个仪器的采集圈。','点击地面设置临时导航点。局部规划器在速度窗口里预测轨迹；遇到绕不过的障碍时移动导航点。',api=>{
    const a=api.art,rocks=[{x:250,y:236,r:53},{x:445,y:116,r:46},{x:512,y:300,r:57}];
    const jobs=[point(324,90),point(686,335)],visited=new Set();let car={x:68,y:328,h:-.25,v:0,w:0},target=null,traces=[],clock=0,blocked=false,chosen=null;
    function roll(p,v,w,dt){const h=p.h+w*dt/2;return {x:p.x+v*Math.cos(h)*dt,y:p.y+v*Math.sin(h)*dt,h:p.h+w*dt};}
    function gap(p){return Math.min(p.x-15,785-p.x,p.y-53,440-p.y,...rocks.map(r=>dist(p,r)-r.r-11));}
    function plan(){
      const dv=23,dw=.40,lo=Math.max(0,car.v-dv),hi=Math.min(77,car.v+dv);let best=-Infinity;traces=[];chosen=null;
      for(let i=0;i<4;i++)for(let j=0;j<11;j++){
        const v=mix(lo,hi,i/3),w=clamp(car.w+mix(-dw,dw,j/10),-1.8,1.8);let p={...car},clear=Infinity;const pts=[p];
        for(let k=0;k<14;k++){p=roll(p,v,w,.1);clear=Math.min(clear,gap(p));pts.push(p);}
        if(clear<v*v/(2*230))continue;
        const heading=Math.abs(angle(Math.atan2(target.y-p.y,target.x-p.x)-p.h));
        const score=dist(car,target)-dist(p,target)-heading*21+Math.min(35,clear)*.23+v*.03;
        const tr={v,w,pts};if(j%3===0&&i===3)traces.push(tr);if(score>best){best=score;chosen=tr;}
      }
      if(chosen){car.v=chosen.v;car.w=chosen.w;}else{car.v=0;car.w=0;}
    }

    function world(p){
      rocks.forEach(r=>p.rock(r.x,r.y,r.r,r.r*.77,'#a18469'));
      for(const [x,y] of [[73,130],[95,116],[655,85],[674,78]])p.tree(x,y,18);
      for(const [xx,yy] of [[46,310],[46,350]])p.box(xx,yy,12,9,30,'#79847e');
      p.beam(46,310,32,46,350,32,8,'#98a098');
      jobs.forEach((q,i)=>{const c=visited.has(i)?paint.mint:paint.gold;p.ring(q.x,q.y,26,c,3,2);antenna3(p,q.x,q.y,17,c);p.label(q.x,q.y,'巡检仪 '+(i+1),c,27);});
      traces.forEach(tr=>p.line(tr.pts,'#baab83',1.8,2.2));if(chosen)p.line(chosen.pts,paint.mint,3,3);
      if(target){p.ring(target.x,target.y,9,paint.mint,3,2.5);p.dot(target.x,target.y,paint.mint,3,4);}
      p.rover(car.x,car.y,car.h);p.label(car.x,car.y,'v '+Math.round(car.v)+'　ω '+car.w.toFixed(1),paint.light,27);
    }
    return {world,pointer(t,x,y){if(t!=='down'||blocked)return;const v=point(x,y);if(gap(v)<0){api.status('临时导航点落在岩石或路界外，换个位置。');return;}target=v;clock=0;api.status('导航点已更新。薄荷色弧线是当前选中的可行轨迹。');},
      tick(dt){if(!target||blocked)return;clock-=dt;if(clock<=0){plan();clock=.18;}const p=roll(car,car.v,car.w,dt);Object.assign(car,p);
        if(gap(car)<0){blocked=true;api.status('车身触碰障碍，请重新挑战并设置更宽的绕行通道。');return;}
        jobs.forEach((q,i)=>{if(dist(car,q)<27&&!visited.has(i)){visited.add(i);api.status('已采集 '+visited.size+' / 2 台巡检仪。');}});
        if(visited.size===2){target=null;api.win('两份现场数据均已收集，局部控制保持无碰撞。');}
        else if(dist(car,target)<12){target=null;car.v=car.w=0;}},
      draw(g){rocks.forEach(r=>obstacle(g,r));jobs.forEach((q,i)=>{ring(g,q,26,visited.has(i)?colors.route:colors.aim,'#a9c69d18');a.text(g,q.x-28,q.y-33,'巡检仪 '+(i+1),colors.aim,16);});
        traces.forEach(tr=>a.line(g,tr.pts,'#ddcd8f77',1));if(chosen)a.line(g,chosen.pts,colors.route,3);if(target)a.pin(g,target.x,target.y,'导航点','#c9ece3');a.rover(g,car.x,car.y,car.h);a.text(g,22,29,'采集 '+visited.size+' / 2    当前车速 '+Math.round(car.v)+'    局部预测 1.4 s',colors.ghost,16);}
    };
  });

  register('bug','沿墙摸出峡口','Bug2 边界跟随','雾中只能感知眼前墙面，但车上保留了通向出口的直线方位。','遇到断墙沿边探路，找到比碰壁点更接近出口的直线交点并离墙。','先沿目标线行驶。碰壁后沿墙走，经过右侧目标线时点「在此离墙」。',api=>{
    const a=api.art,start=point(64,228),goal=point(748,228);
    const walls=[{x:208,y:145,w:105,h:146},{x:468,y:145,w:113,h:158}];let p={...start},mode='idle',idx=0,walk=0,hit=0,trail=[{...p}],heading=0;
    api.button('沿目标线行驶',()=>{if(mode==='idle')mode='straight';});
    api.button('沿墙探路',()=>{if(mode==='hit'){walk=0;mode='follow';}else api.status('碰到目标线上挡路的墙后，再开始沿边探路。');});
    api.button('在此离墙',()=>{if(mode!=='follow'&&mode!=='opening')return;const w=walls[idx];if(Math.abs(p.y-goal.y)<13&&p.x>hit+10){p=point(w.x+w.w+1,goal.y);idx++;mode='straight';api.status('重新遇到目标线，且更接近终点。恢复直行。');}else api.status('这里还没有在更靠近出口的位置重新遇到目标线。');});

    function world(k){
      k.line([start,goal],'#decc8c',2.5,2);
      walls.forEach(w=>{
        k.box(w.x+w.w/2,w.y+w.h/2,w.w-18,w.h-18,24,'#80928a');
        k.box(w.x+w.w/2,w.y+w.h/2,w.w-15,w.h-15,2,'#a7aa91',24);
        for(let y=w.y+21;y<w.y+w.h-17;y+=26)k.box(w.x+w.w/2,y,w.w-24,3,1.5,'#879582',26);
        k.box(w.x+w.w/2,w.y+w.h-8,w.w*.3,3,11,'#69776c',1);
      });
      if(trail.length>1)k.line(trail,paint.mint,4,3.4);
      if(mode==='follow'||mode==='opening'){k.ring(hit,goal.y,10,paint.clay,3,3);k.label(hit,goal.y,'触墙',paint.clay,16);}
      for(const [xx,yy] of [[86,354],[101,375],[357,109],[699,108]])k.tree(xx,yy,16);
      k.ring(goal.x,goal.y,15,paint.gold,3,2.7);antenna3(k,goal.x+13,goal.y-12,16,paint.gold);
      k.rover(p.x,p.y,heading);if(mode==='opening')k.label(p.x,p.y,'目标线交点',paint.mint,27);
    }
    return {world,tick(dt){const v=110;if(mode==='straight'){heading=0;p.x+=v*dt;const w=walls[idx];
      if(w&&p.x>=w.x){p.x=w.x;hit=p.x;mode='hit';api.status('接触墙面。记住这个碰壁点，从此处切换边界跟随。');}
      else if(p.x>=goal.x){p={...goal};mode='done';api.win('用局部触觉通过两段断墙，两次离墙都满足回到目标线并更靠近终点。');}}
      else if(mode==='follow'){const w=walls[idx],up=goal.y-w.y,top=w.w;walk+=v*dt;
        if(walk<up){p=point(w.x,goal.y-walk);heading=-Math.PI/2;}else if(walk<up+top){p=point(w.x+walk-up,w.y);heading=0;}else{p=point(w.x+w.w,Math.min(goal.y,w.y+walk-up-top));heading=Math.PI/2;if(p.y===goal.y){mode='opening';api.status('触觉探头再次碰到目标线。判断是否应在这里离墙。');}}}
      if(dist(p,trail.at(-1))>2)trail.push({...p});},draw(g){a.line(g,[start,goal],'#dbd7a6',3,true);walls.forEach(w=>{g.fillStyle='#637171';g.fillRect(w.x+9,w.y+9,w.w-18,w.h-18);g.strokeStyle='#adb6a3';g.strokeRect(w.x+9,w.y+9,w.w-18,w.h-18);});a.line(g,trail,colors.route,4);a.pin(g,goal.x,goal.y,'出口',colors.aim);a.rover(g,p.x,p.y,heading);if(mode==='follow'||mode==='opening')a.pin(g,hit,goal.y,'碰壁点',colors.warn);a.text(g,22,30,'直线导航 + 接触后沿边行走',colors.ghost,16);}
    };
  });
  register('breadth','山村接力广播','多源广度优先搜索','道路中断，各村只能向相邻村庄转发紧急广播。两座信号塔可以同时发出第一声警报。','放置两座广播塔，让所有村庄在两轮转发内收到警报。','点击村庄放塔或收回，再发起广播。每轮只传播一条边。',api=>{
    const a=api.art,pts=Array.from({length:9},(_,i)=>point(58+i*85,213+44*Math.sin(i*.94)));
    pts.push(point(228,352),point(563,341));
    const edges=Array.from({length:8},(_,i)=>[i,i+1]).concat([[2,9],[6,10]]);
    const bases=[];let depths=[],clock=0,current=-1,run=false;
    api.button('发送接力广播',()=>{
      if(bases.length!==2){api.status('需要在两个不同村庄部署广播塔。');return;}
      depths=pts.map(()=>Infinity);const q=bases.slice();bases.forEach(i=>depths[i]=0);
      for(let i=0;i<q.length;i++){const src=q[i];for(const [u,v] of edges){const n=src===u?v:src===v?u:-1;if(n>=0&&depths[n]===Infinity){depths[n]=depths[src]+1;q.push(n);}}}
      run=true;clock=0;current=0;api.status('广播从两座塔同时向外传播。');
    });

    function world(p){
      edges.forEach(([u,v])=>{
        const lit=current>=0&&depths[u]<=current&&depths[v]<=current;
        road3(p,[pts[u],pts[v]],8);if(lit)p.line([pts[u],pts[v]],paint.mint,3,2.8);
      });
      pts.forEach((q,i)=>{
        const tower=bases.includes(i),lit=current>=0&&depths[i]<=current,c=lit?paint.mint:tower?paint.gold:'#bac8b0';
        shed3(p,q.x,q.y,21,16,tower?'#ae8558':'#879184');
        shed3(p,q.x+14,q.y-14,12,10,'#b19977');
        if(tower)antenna3(p,q.x+7,q.y-5,29,c);
        p.ring(q.x,q.y,17,c,2.5,2);
        p.label(q.x,q.y,tower?'广播塔':('村 '+(i+1))+(lit?' · 第'+depths[i]+'轮':''),c,tower?38:24);
      });
      [[90,112],[107,95],[317,393],[666,359]].forEach(([x,y])=>p.tree(x,y,14));
    }
    return {world,pointer(t,x,y){if(t!=='down')return;const i=pts.findIndex(p=>dist(p,point(x,y))<24);if(i<0)return;run=false;current=-1;
      if(bases.includes(i))bases.splice(bases.indexOf(i),1);else if(bases.length<2)bases.push(i);else api.status('塔已用完，点击原塔位置取回。');},
      tick(dt){if(!run)return;clock+=dt;current=Math.floor(clock/.65);const max=Math.max(...depths);if(current>=max){run=false;if(max<=2)api.win('所有村庄在 '+max+' 轮内接收警报，完成全谷预警。');else api.status('最远村庄经过 '+max+' 轮才收到。移动两座塔以缩小最远跳数。');}},
      draw(g){edges.forEach(([u,v])=>a.line(g,[pts[u],pts[v]],'#99aa8b',3));pts.forEach((p,i)=>{const b=bases.includes(i),received=current>=0&&depths[i]<=current;
        ring(g,p,b?16:11,received?colors.route:colors.edge,b?'#c49a52':'#274649');a.text(g,p.x-11,p.y-24,b?'塔':String(i+1),b?colors.aim:'#eee8d2',15);
        if(received)a.text(g,p.x-5,p.y+5,String(depths[i]),'#152727',13);});a.text(g,23,31,'已布塔 '+bases.length+' / 2     转发轮次 '+Math.max(0,current),colors.aim,17);}
    };
  });

  register('depth','暗渠巡表员','深度优先搜索 · 回溯','暗渠的蓝图丢了，巡检车只有近距离灯光和一条能拉回上一口井的引导绳。','登记全部 9 口井，沿栈中的绳索原路回到入口。','点亮邻接井口前进。遇到尽头才收绳回退一层，再探索剩余岔路。',api=>{
    const a=api.art,pts=[[79,233],[204,236],[307,107],[420,81],[422,199],[327,338],[476,360],[620,286],[682,127]].map(([x,y])=>point(x,y));
    const edges=[[0,1],[1,2],[2,3],[2,4],[1,5],[5,6],[6,7],[7,8],[4,7]];const stack=[0],visited=new Set([0]);let moves=0;
    const current=()=>stack.at(-1);
    const near=i=>edges.flatMap(([u,v])=>u===i?[v]:v===i?[u]:[]);
    function retreat(){const i=current();if(near(i).some(n=>!visited.has(n))){api.status('灯光内还有未巡检的井口，先把这条分支查完。');return;}
      if(stack.length===1)return;stack.pop();moves++;api.status('回退一层，当前绳栈 '+stack.map(i=>i+1).join(' › ')+'。');if(stack.length===1&&visited.size===pts.length)api.win('巡检 9 口井并返回入口，实际走过 '+moves+' 段暗渠。');}
    api.button('收绳 · 回退一层',retreat);

    function world(p){
      edges.forEach(([u,v])=>{
        if(!visited.has(u)&&!visited.has(v))return;
        p.line([pts[u],pts[v]],'#798c83',14,1);p.line([pts[u],pts[v]],'#273f43',9,1.6);
      });
      if(visited.size===1){p.box(68,195,24,17,14,'#a38d67');p.box(68,195,27,20,3,'#697d73',14);antenna3(p,86,194,16,paint.gold);}
      if(stack.length>1)p.line(stack.map(i=>pts[i]),paint.mint,3,3.2);
      pts.forEach((q,i)=>{
        if(!visited.has(i)&&!near(current()).includes(i))return;
        const c=visited.has(i)?paint.mint:paint.gold;
        p.post(q.x,q.y,16,3,'#77867a');p.post(q.x,q.y,11,1,'#2a3938',3);
        p.ring(q.x,q.y,13,c,2.5,4.2);p.label(q.x,q.y,'井 '+(i+1),c,22);
      });
      const r=pts[current()];p.rover(r.x,r.y,0);
      p.label(425,406,'绳栈 '+stack.map(i=>i+1).join(' › '),paint.mint,10);
    }
    return {world,pointer(t,x,y){if(t!=='down')return;const n=pts.findIndex(p=>dist(p,point(x,y))<=27);if(!near(current()).includes(n)||visited.has(n)){api.status('选择与当前车位相连的金色未巡检井口，走到尽头后收绳。');return;}stack.push(n);visited.add(n);moves++;api.status('已记录 '+visited.size+' / 9 口井，深度 '+(stack.length-1)+'。');},draw(g){
      g.fillStyle='#142028b5';g.fillRect(0,0,800,460);edges.forEach(([u,v])=>{if(visited.has(u)||visited.has(v))a.line(g,[pts[u],pts[v]],'#657e7b',8);});a.line(g,stack.map(i=>pts[i]),colors.route,3,true);
      pts.forEach((p,i)=>{if(!visited.has(i)&&!near(current()).includes(i))return;ring(g,p,14,visited.has(i)?colors.route:colors.aim,'#263d3e');a.text(g,p.x-5,p.y+5,String(i+1),'#fff0c9',14);});
      const p=pts[current()];a.rover(g,p.x,p.y,0);a.text(g,23,30,'巡表 '+visited.size+' / 9     绳栈 '+stack.map(i=>i+1).join(' › '),colors.ghost,16);}
    };
  });

  register('pose','插头最后一米','移动机器人目标位姿控制','水泵电源插座面向西侧。车既要抵达插口，又要把车头朝正东方向。','绕开中间的管盘，把车停在插口 12 个单位内，朝向误差小于 9°。','从地面目标点拖出一支朝向箭头，执行该位姿。可以分段设置中途停靠点。',api=>{
    const a=api.art,car={x:78,y:340,h:0},dock=point(690,201),reels=[{x:395,y:267,r:56},{x:512,y:111,r:36}];
    let target=null,drag=false,run=false,trail=[point(car.x,car.y)];
    api.button('行驶至标记位姿',()=>{if(!target){api.status('先拖出一个目标位置和朝向。');return;}run=true;});

    function world(p){
      reels.forEach(r=>{
        p.post(r.x,r.y,r.r,4,'#a89367');p.post(r.x,r.y,r.r*.87,12,'#645a49',4);
        p.post(r.x,r.y,r.r,4,'#b49e73',16);p.post(r.x,r.y,r.r*.25,4,'#4f5a58',20);
        p.ring(r.x,r.y,r.r*.68,'#8a795c',2,20.4);
      });
      shed3(p,710,147,64,45,'#91927f');
      p.beam(698,168,9,717,184,9,5,'#899896');
      p.box(dock.x+27,dock.y,20,29,23,'#667e7d');p.box(dock.x+16,dock.y,3,14,8,paint.mint,6);
      p.ring(dock.x,dock.y,13,paint.gold,3,2.5);arrow3(p,point(dock.x-31,dock.y),0,paint.gold,25);
      p.label(dock.x,dock.y,'泵站插口',paint.gold,32);
      if(trail.length>1)p.line(trail,paint.mint,3,2.2);
      if(target){p.ring(target.x,target.y,9,paint.mint,3,2.5);arrow3(p,target,target.h,paint.mint,40);}
      p.rover(car.x,car.y,car.h);p.label(car.x,car.y,'车头 '+Math.round(angle(car.h)*180/Math.PI)+'°',paint.light,26);
    }
    return {world,pointer(t,x,y){if(t==='down'){target={x,y,h:0};drag=true;run=false;}else if(drag){if(dist(target,point(x,y))>3)target.h=Math.atan2(y-target.y,x-target.x);if(t==='up')drag=false;}},
      tick(dt){if(!run)return;const rho=dist(car,target),alpha=angle(Math.atan2(target.y-car.y,target.x-car.x)-car.h);
        if(rho>2){car.h=angle(car.h+clamp(3*alpha,-2.2,2.2)*dt);const v=Math.min(110,rho*2.5)*Math.max(0,Math.cos(alpha));const q=point(car.x+Math.cos(car.h)*v*dt,car.y+Math.sin(car.h)*v*dt);
          if(reels.some(o=>dist(q,o)<o.r+12)){run=false;api.status('保险杠碰到管盘。当前位置已停车，先设置侧方停靠点再接近插口。');return;}Object.assign(car,q);}
        else{const e=angle(target.h-car.h);car.h=angle(car.h+clamp(4*e,-2.5,2.5)*dt);
          if(Math.abs(e)<.02){run=false;const gap=dist(car,dock),err=Math.abs(angle(car.h))*180/Math.PI;
            if(gap<12&&err<9)api.win('水泵对接成功。位置偏差 '+gap.toFixed(1)+'，朝向偏差 '+err.toFixed(1)+'°。');else api.status('该停靠点已到达。距插座 '+gap.toFixed(1)+'，车头与插入方向夹角 '+err.toFixed(0)+'°。');}}
        if(dist(car,trail.at(-1))>3)trail.push(point(car.x,car.y));},draw(g){reels.forEach(r=>{ring(g,r,r.r,'#bfa375','#6b6852');ring(g,r,r.r*.63,'#afa88a');ring(g,r,r.r*.3,'#b99d73');});a.line(g,trail,colors.route,3);ring(g,dock,13,colors.aim,'#294341');a.text(g,639,177,'泵站插口 →',colors.aim,16);
        if(target){ring(g,target,7,colors.route);a.line(g,[target,point(target.x+42*Math.cos(target.h),target.y+42*Math.sin(target.h))],colors.route,3);}
        a.rover(g,car.x,car.y,car.h);a.text(g,23,31,'当前车头 '+Math.round(angle(car.h)*180/Math.PI)+'°    对接方向 0°',colors.ghost,16);}
    };
  });

  register('lqr-track','侧滑检测台','离散 LQR 轨迹跟踪','低摩擦检测车沿电缆向前巡检，横向推进器需要同时控制位移与侧滑速度。','抵达终点，全程均方根横向偏差低于 13 个单位。','调整 LQR 的位置误差权重，再启动巡检。观察实际轨迹、误差与推力的变化。',api=>{
    const a=api.art,T=.04,B=[T*T/2,T],A=[[1,T],[0,1]],R=1;
    let q=.04,K=[],x=0,y=0,v=0,elapsed=0,acc=0,run=false,power=0,sum=0,n=0,trail=[];
    const reference=x=>18*Math.sin(x/72)+9*Math.cos(x/40);
    function gains(){let p00=q,p01=0,p11=.55;
      for(let i=0;i<800;i++){const a0=p00*B[0]+p01*B[1],a1=p01*B[0]+p11*B[1],den=R+B[0]*a0+B[1]*a1;
        const m0=a0,m1=a0*T+a1,k0=m0/den,k1=m1/den;K=[k0,k1];
        const s00=q+p00-m0*k0,s01=p00*T+p01-m0*k1,s11=.55+p11+2*T*p01+T*T*p00-m1*k1;p00=s00;p01=s01;p11=s11;}
    }
    gains();api.slider('位置误差权重 Q',.04,4,.04,.04,value=>{q=value;gains();});
    api.button('启动侧滑台',()=>{x=0;y=reference(0)+8;v=0;elapsed=0;acc=0;sum=0;n=0;power=0;trail=[];run=true;});

    function world(p){
      const curve=Array.from({length:58},(_,i)=>{const t=690*i/57;return point(55+t,232+2*reference(t));});
      road3(p,curve,68);p.line(curve,paint.mint,3,2.5);
      for(const xx of [122,328,568]){p.box(xx,104,24,14,16,'#697f81');p.post(xx,104,6,2,'#bbad8f',16);arrow3(p,point(xx,121),Math.PI/2,'#94c0c1',20);}
      if(trail.length>1)p.line(trail.filter((_,i)=>i%2===0||i===trail.length-1),paint.gold,3,3);
      const c=point(55+x,232+2*y);p.rover(c.x,c.y,Math.atan2(v,55));
      if(Math.abs(power)>1)arrow3(p,c,Math.sign(power)*Math.PI/2,'#e8a377',Math.min(35,9+Math.abs(power)*.55));
      p.label(460,350,'反馈增益 '+K.map(k=>k.toFixed(2)).join(' / ')+'　推力 '+power.toFixed(1),paint.light,11);
    }
    return {world,tick(dt){if(!run)return;acc+=dt;while(acc>=T&&run){acc-=T;const e=y-reference(x),refV=(reference(x+.1)-reference(x))/.1*55;power=clamp(-K[0]*e-K[1]*(v-refV),-50,50);
      const gust=5+4*Math.sin(elapsed*.85);y+=v*T+.5*(power+gust)*T*T;v+=(power+gust)*T;x+=55*T;elapsed+=T;sum+=e*e;n++;trail.push(point(55+x,232+2*y));
      if(x>=690){run=false;const rms=Math.sqrt(sum/n);if(rms<13)api.win('完成侧滑检测，全程均方根横向误差 '+rms.toFixed(1)+'。');else api.status('均方根偏差 '+rms.toFixed(1)+'，需要更积极地纠正侧移。调整权重后复测。');}}},
      draw(g){const curve=Array.from({length:100},(_,i)=>point(55+690*i/99,232+2*reference(690*i/99)));roads(g,a,curve,68);a.line(g,curve,colors.route,2,true);a.line(g,trail,colors.aim,3);a.rover(g,55+x,232+2*y,Math.atan2(v,55));a.text(g,22,30,'侧向反馈 K = ['+K.map(k=>k.toFixed(2)).join(', ')+']    推力 '+power.toFixed(1),colors.ghost,16);}
    };
  });
})();
