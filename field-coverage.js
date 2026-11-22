(() => {
  'use strict';
  // The inspection lattice lives under the plant floor; a bridge changes actual BFS adjacency.
  const cols=10,rows=6,west=87,north=82,dx=69,dy=56,dock=50;
  const blocked=new Set([1,12,23,32,13,16,17,37,48]);
  const stations=Array.from({length:cols*rows},(_,i)=>i).filter(i=>!blocked.has(i));
  const point=i=>({x:west+i%cols*dx,y:north+Math.floor(i/cols)*dy});
  const gates=[{row:1,name:'北闸'},{row:4,name:'南闸'}];
  const gx=west+4.5*dx,gateY=g=>north+g.row*dy;
  FieldMissions.push({id:'coverage',lesson:null,region:'routes',title:'重启双闸泵站',algorithm:'最近未覆盖点 · 广度优先搜索',
    brief:'抢修队送来了电源，泵房两岸却还积满淤泥。清淤机只有一块便桥，只能铺在北闸或南闸。抢在泵站复机前，把两岸清理干净。',
    goal:'铺一块便桥，清理全部可达作业点，再回到充电坞。',how:'启动清淤机。琥珀色代表待清理淤泥，青灯表示已经扫过。点击闸口放下便桥，观察它为抵达最近一块淤泥走过多少旧路。',create(api){
    const covered=new Set([dock]),history=[dock];let at=dock,next=null,route=[],fraction=0,active=false,bridge=-1,usedBridge=-1,heading=0,revisits=0,steps=0,brush=0,finished=false,changes=0;
    const pos=()=>{const a=point(at),b=next===null?a:point(next);return {x:a.x+(b.x-a.x)*fraction,y:a.y+(b.y-a.y)*fraction};};
    function plan(){
      const queue=[at],parents=new Map([[at,-1]]);
      for(let k=0;k<queue.length;k++){
        const n=queue[k];
        if(covered.size===stations.length?n===dock:!covered.has(n)){
          const path=[];for(let v=n;v!==at;v=parents.get(v))path.unshift(v);return path;}
        const r=Math.floor(n/cols),c=n%cols;
        for(const [dr,dc] of [[-1,0],[0,1],[1,0],[0,-1]]){
          const rr=r+dr,cc=c+dc,v=rr*cols+cc;
          if(rr<0||rr>=rows||cc<0||cc>=cols||blocked.has(v)||parents.has(v))continue;
          if(dc&&Math.min(c,cc)===4&&r!==gates[bridge]?.row)continue;
          parents.set(v,n);queue.push(v);}
      }return [];
    }
    function status(msg=''){api.status((msg?msg+'　':'')+'覆盖 '+covered.size+' / '+stations.length+'　重复 '+revisits+' 步　总步数 '+steps);}
    function setBridge(index){
      if(next!==null&&Math.min(at%cols,next%cols)===4&&Math.max(at%cols,next%cols)===5){status('正在过桥，过岸后可以移桥。');return;}
      if(bridge!==index){bridge=index;changes++;route=[];}status(gates[index].name+'便桥已落，下一次搜索会使用新连通关系。');}
    const run=api.button('启动清淤',()=>{if(finished)return;active=!active;run.textContent=active?'暂停清淤':'继续清淤';status(active?'寻找最近的淤泥。':'清淤机已暂停。');});
    gates.forEach((g,i)=>api.button('铺设'+g.name+'便桥',()=>setBridge(i)));
    function tick(dt){
      if(!active||finished)return;
      if(next===null){
        if(covered.size===stations.length&&at===dock){finished=true;active=false;api.win('双闸泵站已复机。清理 '+covered.size+' / '+stations.length+' 处，回坞共 '+steps+' 步，其中 '+revisits+' 步经过已清理区域。最后经'+gates[usedBridge].name+'过河，布桥 '+changes+' 次。');return;}
        if(!route.length)route=plan();
        if(!route.length){active=false;run.textContent='继续清淤';status('此岸已清空。给另一岸铺桥，然后继续清淤。');return;}
        next=route.shift();const a=point(at),b=point(next);heading=Math.atan2(b.y-a.y,b.x-a.x);
      }
      brush+=dt*12;fraction+=dt*4.2;
      if(fraction>=1){if(Math.abs(next%cols-at%cols)===1&&Math.min(next%cols,at%cols)===4)usedBridge=bridge;
        at=next;next=null;fraction=0;steps++;history.push(at);if(covered.has(at))revisits++;else covered.add(at);
        status(covered.size===stations.length?'全场已清理，正在回坞。':'');}
    }
    function world(w){
      w.box(398,223,730,352,2,'#8b978c',0);w.box(gx,223,28,353,2,'#527f87',2);
      // The waterworks are built into the canal; gantries and pipes sit clear of the cleaning lanes.
      for(const y of [74,194,316]){
        w.box(gx,y,22,28,2,'#67a8a5',3);for(let i=0;i<3;i++)w.line([[gx-8,y+i*5],[gx+7,y-2+i*5]],'#90c5bc',1,4.7);
      }
      for(const y of [60,384]){for(const x of [gx-32,gx+32]){w.box(x,y,9,12,30,'#617674',2);w.box(x,y,13,16,3,'#a79471',31);}
        w.beam(gx-35,y,33,gx+35,y,33,4,'#c29b69');w.beam(gx-29,y,5,gx-12,y,32,2,'#b6ab8c');}
      for(const x of [gx-17,gx+17])w.box(x,223,4,354,3,'#b5b9a5',1);
      for(const i of blocked){const p=point(i);w.post(p.x,p.y,17,23,'#688785',2);w.post(p.x,p.y,18,3,'#b7ad8d',25);w.post(p.x,p.y,5,6,'#51696b',27);w.post(p.x,p.y,17.3,1.8,'#b3afa0',11);
        w.beam(p.x,p.y,30,p.x+10,p.y,30,2.6,'#ac9270');w.beam(p.x+10,p.y,30,p.x+10,p.y+15,30,2.6,'#ac9270');w.post(p.x+10,p.y+15,1.6,25,'#986f4e',5);}
      for(const g of gates){const y=gateY(g),selected=gates[bridge]===g;
        for(const side of [-1,1]){w.box(gx+side*24,y,9,26,4,'#82785e',3);w.post(gx+side*23,y-15,2.4,12,'#ddad62',3);}
        if(selected){w.box(gx,y,45,22,3,'#d1aa70',4);for(let i=-16;i<=16;i+=8)w.box(gx+i,y,2,22,1,'#736c55',7);}
        else w.ring(gx,y,12,'#ffd078',2,5);
        w.label(gx,y,g.name+(selected?' · 已架桥':''),'#ffdc90',19);}
      for(const i of stations){const p=point(i),clean=covered.has(i);
        if(clean){w.ring(p.x,p.y,7,'#9bddc8',1.6,3.4);}
        else{w.rock(p.x,p.y,8+(i*7%6),3+(i%3),'#806949');w.rock(p.x-5,p.y+4,5,3,'#aa9169');w.dot(p.x+8,p.y-4,'#eab768',2.1,4);}}
      if(history.length>1)w.line(history.map(point),'#9eb6a7',2,3.6);
      if(next!==null)w.line([pos(),point(next),...route.map(point)],'#ffd383',3,7);
      const q=pos(),home=point(dock);w.subject?.(q.x,q.y);w.ring(home.x,home.y,17,'#84dbc1',3,5);w.label(home.x,home.y,'充电坞','#a8ead2',20);
      for(const side of [-1,1]){w.box(q.x+side*7,q.y,5,14,5,'#34454a',2);w.dot(q.x+side*6,q.y+7,'#c3e9d0',1.6,8);}
      w.post(q.x,q.y,11,5,'#344a4b',4);w.post(q.x,q.y,9,5,'#e1b467',9);w.post(q.x,q.y,6,3,'#526d72',14);w.box(q.x,q.y,11,7,3,'#e6b774',17,heading);
      w.post(q.x-2,q.y,1,7,'#384d50',17);w.dot(q.x-2,q.y,'#ffcb77',1.5,24);
      for(const side of [-1,1]){
        const x=q.x+Math.cos(heading)*7-Math.sin(heading)*side*9,y=q.y+Math.sin(heading)*7+Math.cos(heading)*side*9;
        w.post(x,y,5,2,'#40595a',4);for(let j=0;j<3;j++){const a=brush+j*2.094;w.beam(x,y,5,x+6*Math.cos(a),y+6*Math.sin(a),3,1.6,'#b5c5a9');}
      }
      const tip={x:q.x+Math.cos(heading)*16,y:q.y+Math.sin(heading)*16};w.beam(q.x,q.y,8,tip.x,tip.y,6,4,'#cbbd8e');
      if(active)w.ring(tip.x,tip.y,7+fraction*4,'#b4ead7',2,5);
    }
    function draw(ctx){for(const i of stations){const p=point(i);api.art.pin(ctx,p.x,p.y,'',covered.has(i)?'#6dd8c0':'#d8ac6c');}
      const q=pos();api.art.rover(ctx,q.x,q.y,heading);for(const g of gates)api.art.text(ctx,gx-15,gateY(g),g.name,g===gates[bridge]?'#83ead2':'#edc579');}
    status('从西岸充电坞出发。');
    return {world,draw,tick,telemetry:()=>['清淤覆盖',Math.round(covered.size/stations.length*100)+'%','重复步数',revisits,'便桥',gates[bridge]?.name||'待架设'],
      help(){if(bridge<0&&steps>0)return {label:'两岸被排水渠隔开。点击一座闸口放下便桥，或用下方布桥键。',target:{kind:'down',x:gx,y:gateY(gates[0])}};
        if(!active)return {label:steps?'继续清淤，让机器从当前位置重新搜索。':'先启动清淤机，观察它怎样寻找最近的一块淤泥。',control:steps?'继续清淤':'启动清淤'};
        return {label:covered.size===stations.length?'清淤机沿通路返回充电坞。':'金线是下一段航路。切到现场近景，看两侧转刷扫过淤泥。'};},
      pointer(type,x,y){if(type!=='down')return;const i=gates.findIndex(g=>Math.hypot(x-gx,y-gateY(g))<35);if(i>=0)setBridge(i);}};
  }});
})();
