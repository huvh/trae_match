/* Field robotics games: all screens and pointer coordinates use an 800 × 460 workspace. */
(() => {
  'use strict';
  const missions=globalThis.FieldMissions;
  const gold='#ffd38d', mint='#83f6cf', ink='#132e35', pale='#f1f0d8', red='#ff947a';
  const point=(x,y)=>({x,y});
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const angleDiff=a=>Math.atan2(Math.sin(a),Math.cos(a));
  function line(g,a,b,color,width=2,dashed=false){
    g.save();g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.setLineDash(dashed?[7,6]:[]);
    g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();g.restore();
  }
  function disk(g,p,r,fill,stroke,width=2){
    g.beginPath();g.arc(p.x,p.y,r,0,Math.PI*2);g.fillStyle=fill;g.fill();
    if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke();}
  }
  function polygon(g,p,fill){
    g.fillStyle=fill;g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();
  }
  function label(g,x,y,s,color=pale,size=16,center=false){
    g.save();g.font='650 '+size+'px system-ui,sans-serif';g.textAlign=center?'center':'left';g.textBaseline='middle';
    g.lineJoin='round';g.strokeStyle='#112b31dc';g.lineWidth=4;g.strokeText(s,x,y);g.fillStyle=color;g.fillText(s,x,y);g.restore();
  }
  function panel(g,x,y,w,h){g.fillStyle='#142e34dc';g.fillRect(x,y,w,h);g.fillStyle='#dbb470';g.fillRect(x,y,3,h);}
  function mountain(g){
    const sky=g.createLinearGradient(0,0,0,460);sky.addColorStop(0,'#557784');sky.addColorStop(.6,'#afbbb0');sky.addColorStop(1,'#eac39b');g.fillStyle=sky;g.fillRect(0,0,800,460);
    disk(g,point(651,70),30,'#f8dfac');
    for(let depth=0;depth<3;depth++){
      const pts=[[0,460]];for(let x=0;x<=810;x+=18){
        let y=185+62*depth+Math.sin(x/65+depth)*29+Math.sin(x/37+2*depth)*11+Math.sin(x/145)*35;
        pts.push([x,y]);
      }pts.push([810,460]);polygon(g,pts,['#879e9f','#6b8885','#4c6d66'][depth]);
    }
  }
  function workshop(g,title){
    const bg=g.createLinearGradient(0,0,800,460);bg.addColorStop(0,'#2a4549');bg.addColorStop(1,'#40565a');g.fillStyle=bg;g.fillRect(0,0,800,460);
    for(let x=-460;x<820;x+=56)line(g,point(x,460),point(x+460,0),'#71877d23',1);
    for(let x=8;x<=792;x+=112){disk(g,point(x,448),3,'#122a2d','#7a9087',1);}
    panel(g,12,12,234,35);label(g,25,30,title,gold,16);
  }
  function part(g,p,held=false){
    g.save();g.translate(p.x,p.y);g.fillStyle=held?'#f6bd69':'#eac079';g.fillRect(-12,-10,24,20);
    g.strokeStyle='#322e25';g.lineWidth=2;g.strokeRect(-12,-10,24,20);g.fillStyle='#405f59';g.fillRect(-6,-7,4,14);g.fillRect(2,-7,4,14);g.restore();
  }
  function pad(g,p,name){disk(g,p,24,'#234e4b',mint,2);disk(g,p,16,'#30615b','#609f86');label(g,p.x,p.y+38,name,mint,15,true);}
  function drawArm(g,points,holding){
    const base=points[0],tip=points[points.length-1];disk(g,base,24,'#152e37','#a6b3aa',3);
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i];
      line(g,a,b,'#1c3035',17);line(g,a,b,i%2? '#d8a363':'#88aba1',12);
      line(g,point(a.x,a.y-2),point(b.x,b.y-2),i%2?'#e8c68e':'#b2c5b5',3);
      disk(g,a,9,'#4f6669','#d3dcbd',2);disk(g,a,3,'#23373c');
    }
    disk(g,tip,8,holding?gold:mint,ink,2);
  }
  function dragPoint(update){
    let held=false;
    return (type,x,y)=>{
      if(type==='up'){held=false;return;}
      if(type==='down')held=true;
      if(held)update(x,y);
    };
  }
  const base=point(400,350),long=167,short=151;
  function ik2(target){
    const dx=target.x-base.x,dy=target.y-base.y,r=Math.hypot(dx,dy);
    if(r>long+short||r<Math.abs(long-short)+1)return null;
    const q2=Math.acos(clamp((r*r-long*long-short*short)/(2*long*short),-1,1));
    const q1=Math.atan2(dy,dx)-Math.atan2(short*Math.sin(q2),long+short*Math.cos(q2));
    return [base,point(base.x+long*Math.cos(q1),base.y+long*Math.sin(q1)),target];
  }
  function segmentDistance(p,a,b){
    const x=b.x-a.x,y=b.y-a.y;
    const t=clamp(((p.x-a.x)*x+(p.y-a.y)*y)/(x*x+y*y||1),0,1);
    return Math.hypot(a.x+t*x-p.x,a.y+t*y-p.y);
  }
  function armGame(api,obstacles){
    const supply=obstacles?point(220,140):point(184,248),destination=obstacles?point(580,140):point(617,218);
    const pipe=point(280,140),radius=31;
    let cursor=obstacles?point(230,250):point(291,281),target={...cursor},joints=ik2(cursor),holding=false,finished=false,flash=0,trail=[];
    function grip(){
      if(finished)return;
      if(!holding&&dist(cursor,supply)<19){holding=true;api.status('电芯已夹紧。移动末端到发光插座，再释放。');}
      else if(holding&&dist(cursor,destination)<18){holding=false;finished=true;api.win(obstacles?'电芯就位，运输过程中两段连杆均未触碰管道。':'两段关节完成抓取和送达，电芯已接入。');}
      else api.status(holding?'夹爪没有对准插座，继续移动后再释放。':'物件不在夹爪内。点电芯，把夹爪移到它的中心。');
    }
    api.button('夹取 / 放下',grip);
    function tick(dt){
      flash=Math.max(0,flash-dt);if(finished)return;
      let travel=Math.min(dist(cursor,target),dt*250);
      while(travel>.001){
        const left=dist(cursor,target),step=Math.min(3,travel,left);
        const p=point(cursor.x+(target.x-cursor.x)*step/left,cursor.y+(target.y-cursor.y)*step/left),next=ik2(p);
        if(!next){target={...cursor};api.status('目标超出连杆可达范围。沿工作半径内移动。');break;}
        if(obstacles&&next.slice(1).some((b,i)=>segmentDistance(pipe,next[i],b)<radius+8)){
          flash=.5;target={...cursor};api.status('防撞停机。连杆或夹爪会擦到立管，先把末端移到立管下方，再绕行。');break;
        }
        cursor=p;joints=next;travel-=step;if(holding&&(!trail.length||dist(trail[trail.length-1],p)>5))trail.push(p);
      }
    }
    function draw(g){
      workshop(g,obstacles?'站房检修台 · 管道区':'维护平台 · 电芯装配');
      g.save();g.beginPath();g.arc(base.x,base.y,long+short,Math.PI,2*Math.PI);g.strokeStyle='#b3ccb647';g.setLineDash([8,8]);g.stroke();g.restore();
      pad(g,destination,'电芯插座');if(!holding&&!finished){part(g,supply);label(g,supply.x,supply.y-23,'备用电芯',gold,15,true);}
      if(obstacles){disk(g,pipe,radius+8,'#cd865f31');disk(g,pipe,radius,flash?red:'#bb8c6c','#ecbc8e',3);disk(g,pipe,19,'#765f54','#d7a789',3);label(g,pipe.x,pipe.y-50,'固定立管',pale,15,true);}
      for(let i=1;i<trail.length;i++)line(g,trail[i-1],trail[i],'#87dfb3a0',2.5);
      line(g,cursor,target,'#b9f2d5',1.5,true);drawArm(g,joints,holding);if(holding||finished)part(g,finished?destination:cursor,true);
    }
    return {draw,tick,pointer:dragPoint((x,y)=>{if(!finished)target=point(x,y);})};
  }

  function wristGame(api){
    const origin=point(213,332),lengths=[105,99,78],wristLength=51,socket=point(518,260),required=-25*Math.PI/180;
    let target=point(354,205),pitch=38*Math.PI/180,active=false,done=false;
    let angles=[-.5,-1.3,1.1]; // Absolute link directions; CCD rotates the whole downstream chain.
    function chain(){
      const joints=[origin];for(let i=0;i<lengths.length;i++){const a=joints[i];joints.push(point(a.x+Math.cos(angles[i])*lengths[i],a.y+Math.sin(angles[i])*lengths[i]));}return joints;
    }
    function pose(){const j=chain(),w=j[j.length-1];return j.concat(point(w.x+wristLength*Math.cos(pitch),w.y+wristLength*Math.sin(pitch)));}
    function solve(){
      const w=point(target.x-wristLength*Math.cos(pitch),target.y-wristLength*Math.sin(pitch));
      for(let k=0;k<9;k++){
        for(let i=2;i>=0;i--){const j=chain(),p=j[i],end=j[3];const turn=clamp(angleDiff(Math.atan2(w.y-p.y,w.x-p.x)-Math.atan2(end.y-p.y,end.x-p.x)),-.18,.18);
          for(let m=i;m<angles.length;m++)angles[m]+=turn;}
      }
    }
    api.slider('末节俯仰角（度）',-65,65,38,1,v=>{if(!done)pitch=Number(v)*Math.PI/180;});
    api.button('接合导管',()=>{if(done)return;const p=pose(),err=dist(p[p.length-1],socket),deg=Math.abs(angleDiff(pitch-required))*180/Math.PI;
      if(active&&err<8&&deg<5){done=true;api.win('管头位置误差 '+err.toFixed(1)+' 像素，方向误差 '+deg.toFixed(1)+'°，导管接通。');}
      else api.status('接合失败：管头距接口 '+err.toFixed(0)+' 像素，轴向偏差 '+deg.toFixed(0)+'°。点接口调位置，转动末节调方向。');
    });
    function draw(g){
      workshop(g,'输水歧管 · 四轴检修臂');line(g,socket,point(690,180),'#152b30',26);line(g,socket,point(690,180),'#889b93',19);
      for(let t=0;t<4;t++){let x=552+t*36,y=244-t*17;line(g,point(x-4,y-9),point(x+4,y+9),'#414f52',6);}
      disk(g,socket,10,'#223d3a',mint,3);line(g,point(socket.x-59*Math.cos(required),socket.y-59*Math.sin(required)),socket,mint,2,true);
      label(g,560,290,'接口轴向 −25°',mint,17);drawArm(g,pose(),false);disk(g,target,5,gold);label(g,36,410,'末节方向 '+Math.round(pitch*180/Math.PI)+'°',gold,18);
    }
    return {draw,tick(){if(!done)solve();},pointer:dragPoint((x,y)=>{if(!done){active=true;target=point(x,y);solve();}})};
  }

  function quad(g,p){
    g.save();g.translate(p.x,p.y);line(g,point(-20,0),point(20,0),ink,5);g.fillStyle='#e6b068';g.fillRect(-8,-6,16,12);
    for(const side of [-1,1]){line(g,point(side*19,-2),point(side*19,-9),'#344c50',3);line(g,point(side*19-11,-10),point(side*19+11,-10),mint,3);}
    g.restore();
  }
  function airGame(api){
    const source=point(83,322),goal=point(722,319),blocks=[
      {x:252,y:212,w:61,h:202},{x:495,y:0,w:42,h:222}
    ];
    let route=[],p={...source},vx=0,vy=0,flying=false,index=0,trail=[],won=false;
    function launch(){
      if(won)return;if(flying)return;
      if(!route.length){api.status('航线为空。先点空域放置过渡航点。');return;}
      p={...source};vx=0;vy=0;index=0;trail=[{...p}];flying=true;api.status('位置控制器正在跟踪航点，白线显示实际航迹。');
    }
    api.button('执行航线',launch);api.button('撤销末个航点',()=>{if(!flying&&!won)route.pop();});
    function tick(dt){
      if(!flying)return;
      let remaining=Math.min(dt,.12);
      while(remaining>1e-6&&flying){
        const h=Math.min(.025,remaining),dest=route[index]||goal;remaining-=h;
        vx=clamp(vx+clamp(4*(dest.x-p.x)-3.4*vx,-215,215)*h,-143,143);
        vy=clamp(vy+clamp(4*(dest.y-p.y)-3.4*vy,-215,215)*h,-143,143);
        p=point(p.x+vx*h,p.y+vy*h);
        if(blocks.some(b=>p.x>b.x-14&&p.x<b.x+b.w+14&&p.y>b.y-13&&p.y<b.y+b.h+13)){
          flying=false;api.status('航迹侵入岩脊或悬吊设备。撤销或拖动航点，让实际轨迹留出净空。');break;
        }
        if(dist(trail[trail.length-1],p)>4)trail.push({...p});
        if(dist(p,dest)<8){if(index<route.length)index++;else{flying=false;won=true;api.win('样本已送达，飞行器跟踪了 '+route.length+' 个侧视航点并绕过两处障碍。');}}
      }
    }
    let drag=-1;
    function pointer(type,x,y){
      if(flying||won)return;
      if(type==='up'){drag=-1;return;}
      if(type==='down'){
        const i=route.findIndex(q=>dist(q,point(x,y))<21);
        if(i>=0){drag=i;return;}
        if(route.length>=6){api.status('已放置 6 个航点。拖动现有航点，或撤销末点。');return;}
        drag=route.length;route.push(point(clamp(x,35,765),clamp(y,26,378)));return;
      }
      if(type==='move'&&drag>=0)route[drag]=point(clamp(x,35,765),clamp(y,26,378));
    }
    function draw(g){
      mountain(g);g.fillStyle='#3a5146';g.fillRect(0,360,800,100);
      const b=blocks[0];polygon(g,[[b.x,460],[b.x,236],[b.x+9,212],[b.x+42,212],[b.x+b.w,228],[b.x+b.w,460]],'#685c50');
      polygon(g,[[b.x+14,232],[b.x+39,218],[b.x+51,363],[b.x+28,336]],'#947a63');
      g.fillStyle='#535e56';g.fillRect(495,0,42,222);for(let y=12;y<207;y+=30)line(g,point(495,y),point(537,y+20),gold,3);
      label(g,277,261,'岩脊',pale,16,true);label(g,514,185,'吊臂',gold,15,true);
      line(g,point(45,338),point(119,338),gold,5);line(g,point(693,338),point(751,338),mint,6);label(g,720,364,'接收台',mint,16,true);
      const points=[source,...route,goal];for(let i=1;i<points.length;i++)line(g,points[i-1],points[i],'#fbe1a3',2,true);
      route.forEach((q,i)=>{disk(g,q,10,ink,gold,2);label(g,q.x,q.y,String(i+1),gold,12,true);});
      for(let i=1;i<trail.length;i++)line(g,trail[i-1],trail[i],'#eaffee',3);quad(g,p);
      panel(g,12,12,240,36);label(g,25,30,'飞行走廊 · 高度剖面',gold,17);
    }
    return {draw,tick,pointer};
  }

  function landingGame(api){
    const gravity=3.5,maxThrust=7.0;
    let altitude=42,v=-3,throttle=.28,fuel=18,mode='ready',trail=[];
    const input=api.slider('升力输出（%）',0,100,28,1,n=>{throttle=Number(n)/100;});
    function setThrottle(value){throttle=clamp(value,0,1);input.value=Math.round(throttle*100);input.dispatchEvent?.(new Event('input'));}
    api.button('减小升力',()=>setThrottle(throttle-.08));api.button('增大升力',()=>setThrottle(throttle+.08));
    api.button('开始 / 重试下降',()=>{if(mode==='flying'||mode==='won')return;altitude=42;v=-3;fuel=18;trail=[];mode='flying';api.status('已进入下降段。用升力控制垂直速度，读数越接近零，落地越轻。');});
    function tick(dt){
      if(mode!=='flying')return;
      let left=Math.min(.15,dt);
      while(left>1e-7&&mode==='flying'){
        const h=Math.min(.02,left);left-=h;const burn=fuel>0?throttle:0;
        fuel=Math.max(0,fuel-burn*h);v+=(maxThrust*burn-gravity-.045*v)*h;altitude+=v*h;
        if(altitude>70){mode='failed';api.status('上升过高，退出接收区。降低初始升力再试。');}
        if(altitude<=0){altitude=0;if(Math.abs(v)<=1.45){mode='won';api.win('仪器舱已落稳，触地速度 '+Math.abs(v).toFixed(2)+' 米/秒。');}
          else{mode='failed';api.status('触地速度 '+Math.abs(v).toFixed(1)+' 米/秒，超过 1.45。下次提前加升力制动。');}}
      }
      if(!trail.length||Math.abs(trail[trail.length-1]-v)>.02)trail.push(v);if(trail.length>65)trail.shift();
    }
    function draw(g){
      mountain(g);const ground=377;g.fillStyle='#354b44';g.fillRect(0,ground,800,83);
      for(let m=0;m<=60;m+=10){const y=ground-m*5.0;line(g,point(164,y),point(188,y),'#dce7ce',2);label(g,114,y,m+' m',pale,14);}
      line(g,point(277,ground),point(455,ground),mint,7);label(g,363,413,'减震接收台',mint,16,true);
      const y=ground-altitude*5.0-11,x=366;g.save();g.translate(x,y);
      if(mode==='flying'&&fuel>0){for(const xx of [-16,16])polygon(g,[[xx-3,5],[xx,10+19*throttle],[xx+4,5]],'#ffcf7e');}
      polygon(g,[[-28,4],[-18,-15],[15,-15],[29,4],[18,10],[-17,10]],'#dfae71');
      polygon(g,[[-12,-11],[10,-11],[16,-4],[-15,-4]],'#587677');line(g,point(-17,6),point(-26,11),ink,3);line(g,point(17,6),point(26,11),ink,3);g.restore();
      panel(g,520,40,250,161);label(g,540,63,'着陆遥测',gold,19);
      label(g,540,97,'高度  '+altitude.toFixed(1)+' m');label(g,540,127,'垂直速度  '+v.toFixed(2)+' m/s',Math.abs(v)<1.45?mint:pale);
      label(g,540,157,'剩余能量  '+Math.round(fuel/18*100)+'%',gold,16);label(g,540,182,'软着陆上限  1.45 m/s',mint,14);
      if(trail.length>1){panel(g,532,240,220,90);line(g,point(540,273),point(740,273),'#829b91',1);
        for(let i=1;i<trail.length;i++)line(g,point(540+(i-1)*3,273-trail[i-1]*5),point(540+i*3,273-trail[i]*5),mint,2);}
    }
    return {draw,tick,pointer(){},key(k,down){if(!down)return;if(k==='ArrowUp')setThrottle(throttle+.04);if(k==='ArrowDown')setThrottle(throttle-.04);}};
  }


  function shopGate3(scene,q,h,color){
    const dx=-Math.sin(h)*13,dy=Math.cos(h)*13;
    scene.post(q.x+dx,q.y+dy,2.4,15,'#667c78');
    scene.post(q.x-dx,q.y-dy,2.4,15,'#667c78');
    scene.beam(q.x+dx,q.y+dy,16,q.x-dx,q.y-dy,16,2.7,color);
    scene.ring(q.x,q.y,13,color,2.5,1.8);
  }
  function poseArrow3(scene,q,h,color,length=27){
    const e=point(q.x+length*Math.cos(h),q.y+length*Math.sin(h));
    scene.line([q,e],color,3,3);
    scene.line([point(e.x-8*Math.cos(h-.55),e.y-8*Math.sin(h-.55)),e,
      point(e.x-8*Math.cos(h+.55),e.y-8*Math.sin(h+.55))],color,2.5,3);
  }
  function bipedGame(api){
    const stones=[93,198,279,397,482,600,699],omega=3.15,scale=112,T=.64;
    let i=0,foot=stones[0],x=foot+23,v=0,speed=1.3,mark=null,stage='plan',clock=0,home=foot,initialX=0,initialV=0,lastFeet=[foot];
    const initial=()=>foot+23,cp=()=>initial()+speed*scale/omega;
    function resetPlan(){x=initial();v=0;clock=0;mark=null;stage='plan';}
    api.slider('起步速度（米/秒）',.7,3.2,speed,.05,n=>{speed=Number(n);});
    api.button('落脚并试稳',()=>{
      if(stage==='won'||stage==='step')return;
      if(mark===null){api.status('先点下一块石台，放置落脚标记。');return;}
      const next=stones[i+1];if(Math.abs(mark-next)>17){api.status('目标不在下一块石台上，重新点石台表面。');return;}
      initialX=initial();initialV=speed*scale;home=foot;stage='step';clock=0;api.status('下一只脚已落地。观察重心能否停在支撑脚上方。');
    });
    function tick(dt){
      if(stage!=='step')return;
      clock=Math.min(T,clock+dt);
      const u=omega*clock,c=Math.cosh(u),s=Math.sinh(u);
      x=mark+(initialX-mark)*c+initialV*s/omega;v=omega*(initialX-mark)*s+initialV*c;
      if(clock<T)return;
      if(Math.abs(x-mark)<23&&Math.abs(v)<66){
        foot=mark;lastFeet.push(foot);i++;
        if(i===stones.length-1){stage='won';api.win('巡检机器人稳定跨过 '+i+' 段维修栈桥，每次落脚都接住了身体重心。');}
        else{resetPlan();api.status('已经站稳。下一段间距不同，重新调整速度并布置落脚点。');}
      }else{const direction=x>mark?'越过脚尖向前冲':'还没赶上支撑脚';resetPlan();api.status('失衡：重心'+direction+'。让预测捕获点与落脚标记更接近，再迈步。');}
    }
    function draw(g){
      mountain(g);g.fillStyle='#366c74';g.fillRect(0,352,800,108);
      for(let j=0;j<stones.length;j++){const st=stones[j];polygon(g,[[st-19,325],[st+19,325],[st+13,433],[st-10,453]],j<=i?'#739b88':'#8c8775');
        line(g,point(st-18,325),point(st+18,325),j<=i?mint:gold,4);}
      const bodyY=197,legY=322;const stance=stage==='step'?mark:foot,other=stage==='step'?home:lastFeet[Math.max(0,lastFeet.length-2)];
      for(const [p,col] of [[other,'#799a98'],[stance,'#e7c293']]){const knee=point((x+p)/2+12,262);line(g,point(x,bodyY+18),knee,col,8);line(g,knee,point(p,legY),col,8);line(g,point(p-7,legY),point(p+8,legY),ink,6);}
      g.fillStyle='#d6b47b';g.fillRect(x-13,bodyY-7,26,30);disk(g,point(x,bodyY-14),10,'#759991',ink,2);disk(g,point(x,bodyY+7),5,mint);
      if(stage==='plan'){const cap=cp();line(g,point(cap,225),point(cap,321),mint,2,true);disk(g,point(cap,319),5,mint);label(g,cap,209,'捕获点',mint,14,true);}
      if(mark!==null){disk(g,point(mark,325),8,'#f6bb6b',ink,2);label(g,mark,350,'落脚',gold,12,true);}
      panel(g,12,12,293,65);label(g,25,33,'桥墩步态 · 捕获点',gold,17);label(g,25,59,'已过 '+i+' / '+(stones.length-1)+' 段',mint,15);
    }

    function world(p){
      const lane=325,deckHeight=7;
      p.line([point(-28,261),point(165,312),point(358,329),point(553,326),point(824,344)],'#4e8484',108,.5);
      for(const [xx,yy] of [[116,343],[256,295],[363,362],[493,304],[649,357]])p.line([point(xx-12,yy),point(xx+3,yy+1),point(xx+15,yy-1)],'#96bab0',1.5,1);
      for(const [xx,yy,rr] of [[32,204,24],[61,222,14],[179,202,23],[629,180,27],[753,231,16]])p.rock(xx,yy,rr,rr*.83,'#9b8b70');
      for(const [xx,yy] of [[56,175],[76,184],[577,202],[598,188],[732,177]])p.tree(xx,yy,23);
      for(const xx of [55,736]){
        p.box(xx,lane,42,46,7,'#988b6e');
        for(const side of [-1,1])p.post(xx,lane+side*25,3.5,20,'#8d765b');
      }
      for(let j=0;j<stones.length;j++){
        const cx=stones[j],color=j<=i?'#90a89a':'#a99a78';
        p.box(cx,lane,25,26,5,'#737870',1);
        p.box(cx,lane,36,40,3,color,5);
        p.line([point(cx-16,lane-16),point(cx+16,lane-16)],j<=i?mint:gold,2,8.4);
      }
      const stance=stage==='step'?mark:foot,other=stage==='step'?home:lastFeet[Math.max(0,lastFeet.length-2)];
      const hip=stage==='step'?x:initial(),hipH=58;
      function limb(fx,depth,col){
        const ky=lane+depth,kn=(hip+fx)*.5+5;
        p.beam(hip,ky,hipH,kn,ky,32,5,col);
        p.beam(kn,ky,32,fx,ky,deckHeight+4,4,col);
        p.box(kn,ky,7,7,6,'#5a7279',29);p.box(fx,ky,13,7,3,'#344b53',deckHeight+1);
      }
      limb(other,-5,'#7c9396');limb(stance,5,'#d9b87d');
      p.box(hip,lane,17,15,18,'#d9a55b',hipH-3);p.box(hip+1,lane,12,12,9,'#c6c2a1',hipH+15);
      p.box(hip+7,lane,2,9,4,'#42636b',hipH+17);p.dot(hip,lane, mint,3.4,hipH+5);
      if(stage==='plan'){const cap=cp();p.ring(cap,lane,9,mint,2.5,9);p.post(cap,lane,1.5,15,mint,8);p.label(cap,lane,'捕获点',mint,32);}
      if(mark!==null){p.ring(mark,lane,7,gold,3,9.7);p.label(mark,lane+12,'落脚',gold,18);}
      if(i<stones.length-1)p.label(stones[i+1],lane+34,'下一块台面',gold,9);
      p.label(378,226,'已过 '+i+' / '+(stones.length-1)+' 段',pale,10);
    }
    return {world,draw,tick,pointer(type,x,y){if(stage==='plan'&&type==='down'){if(y<280){api.status('点下一块石台的台面设置落脚点。');return;}mark=x;}}};
  }

  const add=(id,title,algorithm,brief,goal,how,create)=>missions.push({id,title,algorithm,region:'machines',lesson:id,brief,goal,how,create});
  add('arm-ik','给巡检车换电芯','双连杆逆运动学','维修平台只能从底座转动两个关节。你负责指定夹爪位置，由逆解算出关节角。','抓起左边的备用电芯，送进右边的插座。','点电芯，等待夹爪到位后夹取。再点插座并放下，也可以拖动夹爪。',api=>armGame(api,false));
  add('n-arm','接通斜向导管','多关节迭代逆运动学','供水接口带有斜螺纹。多轴机械臂必须同时满足位置和末节朝向。','把管头移到接口中心，轴向误差控制在 5° 内。','点接口让关节逐节迭代，再调末节俯仰角使它平行于虚线，最后接合。',wristGame);
  add('arm-obstacles','绕开站房立管','机械臂整臂碰撞检测','固定管道挡在换电路线中央。夹爪和两段连杆都要留出净空。','把电芯从左侧搬到右侧插座。','点电芯后夹紧，分几段绕过立管。遇到防撞停机就改选中间落点。',api=>armGame(api,true));
  add('drone','穿过高低空走廊','航点轨迹跟踪','无人机带着水样返回接收台。前半段有凸起岩脊，后半段有低垂吊臂。','在侧视航图布置航点，使样本安全抵达接收台。','点击添加或拖动航点，再执行航线。飞过岩脊上方后从吊臂下方通过。',airGame);
  add('landing','把仪器舱轻放到岸边','升力与软着陆控制','岸边的减震台只能承受很低的触地速度。你可以实时改变仪器舱的升力。','让仪器舱触地时速度不超过 1.45 米/秒。','开始下降，观察高度和垂直速度。升力约 50% 可抵消重力，想减缓下落需暂时加大升力。',landingGame);
  add('biped','让两条腿走过断桥','线性倒立摆与捕获点','检修栈桥只剩零散桥墩。重心和前进速度一同决定机器人能在哪儿接住自己。','连续跨过六段桥面，在每次换脚后站稳。','调起步速度，让绿色捕获点落在下一块台面；点击那里放置脚印，再落脚试稳。',bipedGame);

  // Shortest forward-only connection between two poses. Moves are sampled at
  // fixed arc-length intervals so the long payload can be checked along the full curve.
  const tau=2*Math.PI;
  const wrap=a=>((a%tau)+tau)%tau;
  function advance(p,curvature,s){
    if(curvature===0)return {x:p.x+s*Math.cos(p.h),y:p.y+s*Math.sin(p.h),h:p.h};
    const h=p.h+s*curvature;
    return {x:p.x+(Math.sin(h)-Math.sin(p.h))/curvature,y:p.y+(Math.cos(p.h)-Math.cos(h))/curvature,h};
  }
  function dubins(from,to,r){
    const theta=Math.atan2(to.y-from.y,to.x-from.x),d=dist(from,to)/r;
    const a=wrap(from.h-theta),b=wrap(to.h-theta),sa=Math.sin(a),sb=Math.sin(b),ca=Math.cos(a),cb=Math.cos(b),ab=Math.cos(a-b);
    const choices=[];
    function csc(word,p2,t,q){if(p2>=0)choices.push({word,l:[wrap(t),Math.sqrt(p2),wrap(q)]});}
    let p2=2+d*d-2*ab+2*d*(sa-sb),u=Math.atan2(cb-ca,d+sa-sb);csc('LSL',p2,-a+u,b-u);
    p2=2+d*d-2*ab+2*d*(sb-sa);u=Math.atan2(ca-cb,d-sa+sb);csc('RSR',p2,a-u,-b+u);
    p2=-2+d*d+2*ab+2*d*(sa+sb);if(p2>=0){u=Math.atan2(-ca-cb,d+sa+sb)-Math.atan2(-2,Math.sqrt(p2));csc('LSR',p2,-a+u,-b+u);}
    p2=-2+d*d+2*ab-2*d*(sa+sb);if(p2>=0){u=Math.atan2(ca+cb,d-sa-sb)-Math.atan2(2,Math.sqrt(p2));csc('RSL',p2,a-u,b-u);}
    let c=(6-d*d+2*ab+2*d*(sa-sb))/8;
    if(Math.abs(c)<=1){const mid=tau-Math.acos(c),t=wrap(a-Math.atan2(ca-cb,d-sa+sb)+mid/2);choices.push({word:'RLR',l:[t,mid,wrap(a-b-t+mid)]});}
    c=(6-d*d+2*ab+2*d*(-sa+sb))/8;
    if(Math.abs(c)<=1){const mid=tau-Math.acos(c),t=wrap(-a-Math.atan2(ca-cb,d+sa-sb)+mid/2);choices.push({word:'LRL',l:[t,mid,wrap(b-a-t+mid)]});}
    const length=q=>q.l.reduce((sum,x)=>sum+x,0);
    const best=choices.reduce((shortest,q)=>length(q)<length(shortest)?q:shortest);
    const points=[from];
    best.l.forEach((norm,i)=>{
      const total=norm*r,count=Math.ceil(total/2.5),turn=best.word[i]==='S'?0:best.word[i]==='L'?1/r:-1/r;
      for(let n=0;n<count;n++)points.push(advance(points[points.length-1],turn,total/count));
    });
    return points;
  }
  function blockDraw(g,b,text){
    g.fillStyle='#192d2f';g.fillRect(b.x+3,b.y+6,b.w,b.h);g.fillStyle='#8d8370';g.fillRect(b.x,b.y,b.w,b.h);
    g.strokeStyle='#d0bb8d';g.lineWidth=2;g.strokeRect(b.x,b.y,b.w,b.h);
    for(let j=10;j<b.w;j+=15)line(g,point(b.x+j,b.y+3),point(b.x+j,b.y+b.h-3),'#786f60',1);
    if(text)label(g,b.x+b.w/2,b.y+b.h/2,text,pale,15,true);
  }
  const inBox=(p,b,margin)=>p.x>=b.x-margin&&p.x<=b.x+b.w+margin&&p.y>=b.y-margin&&p.y<=b.y+b.h+margin;
  function drawTrail(g,points,color,width=2){
    if(points.length<2)return;g.beginPath();g.moveTo(points[0].x,points[0].y);
    for(const p of points.slice(1))g.lineTo(p.x,p.y);g.strokeStyle=color;g.lineWidth=width;g.lineJoin='round';g.stroke();
  }
  function van(g,p,pipe=false){
    g.save();g.translate(p.x,p.y);g.rotate(p.h);g.fillStyle=ink;g.fillRect(-15,-9,30,18);g.fillStyle='#efbc77';g.fillRect(-12,-7,24,14);
    g.fillStyle='#587b75';g.fillRect(4,-6,5,12);
    for(const x of [-10,7])for(const y of [-11,8]){g.fillStyle=ink;g.fillRect(x,y,5,3);}
    if(pipe){line(g,point(-32,-1),point(32,-1),'#2c3738',8);line(g,point(-32,-2),point(32,-2),'#c4c7b4',4);}
    g.restore();
  }
  function pipeRun(api){
    const from={x:97,y:285,h:0},to={x:705,y:265,h:0},house={x:336,y:193,w:146,h:124},r=53;
    let via=null,heading=0,points=[],p=from,bad=-1,clock=0,mode='edit';
    function unsafe(q){
      for(let s=-32;s<=32;s+=4){const a=point(q.x+s*Math.cos(q.h),q.y+s*Math.sin(q.h));
        if(inBox(a,house,6)||a.x<15||a.x>785||a.y<18||a.y>438)return true;}return false;
    }
    function plan(){points=via?[...dubins(from,via,r),...dubins(via,to,r).slice(1)]:dubins(from,to,r);bad=points.findIndex(unsafe);p=from;}
    api.slider('中转车头朝向（度）',-90,90,0,5,n=>{heading=Number(n)*Math.PI/180;if(via&&mode==='edit'){via.h=heading;plan();}});
    api.button('试运长管',()=>{if(mode!=='edit')return;mode='run';clock=0;api.status('车辆沿选定航线前进，车头和管尾分别做净空检查。');});
    function tick(dt){if(mode!=='run')return;clock+=dt*68;const i=Math.min(points.length-1,Math.floor(clock));p=points[i];
      if(bad>=0&&i>=bad){p=points[bad];mode='edit';api.status('自动停车：车身或长管侵入泵房边界。把中转位姿移到泵房侧面留出转弯余量。');}
      else if(i===points.length-1){mode='won';api.win('已按指定朝向入库，曲率半径全程至少 53 地图单位，长管完好。');}}
    function draw(g){workshop(g,'管材转运场 · 俯视图');blockDraw(g,house,'泵房');pad(g,to,'入库方向 →');
      drawTrail(g,points,bad<0?'#8ddcc1':'#d8ae78',3);if(bad>=0)disk(g,points[bad],6,red);
      if(via){disk(g,via,8,ink,gold);line(g,via,point(via.x+26*Math.cos(via.h),via.y+26*Math.sin(via.h)),gold,3);label(g,via.x,via.y-18,'中转',gold,14,true);}
      van(g,p,true);label(g,35,410,'圆弧转弯 · 仅前进',mint,16);
    }

    function world(k){
      const cx=house.x+house.w/2,cy=house.y+house.h/2;
      k.box(cx,cy,house.w,house.h,31,'#927c63');
      k.box(cx,cy,house.w+3,house.h+4,4,'#6e807c',31);
      k.box(cx-27,cy,37,26,10,'#abb1a0',35);
      for(const yy of [-23,-7,9,25])k.box(cx+20,cy+yy,40,2,1.5,'#405c62',35);
      k.box(cx,cy+house.h/2+1,30,2,16,'#445c60');
      k.post(cx+34,cy-24,8,18,'#7f8680',34);
      k.label(cx,cy,'泵房',pale,48);
      shopGate3(k,to,0,mint);poseArrow3(k,to,0,mint);
      if(points.length>1)k.line(points.filter((_,i)=>i%2===0||i===points.length-1),bad<0?mint:gold,3.5,2.2);
      if(bad>=0){const q=points[bad];k.ring(q.x,q.y,10,red,3,3.8);k.label(q.x,q.y,'管尾净空不足',red,20);}
      if(via){k.ring(via.x,via.y,9,gold,3,2.7);poseArrow3(k,via,via.h,gold);k.label(via.x,via.y,'中转位姿',gold,19);}
      k.rover(p.x,p.y,p.h);
      k.beam(p.x-32*Math.cos(p.h),p.y-32*Math.sin(p.h),15,p.x+32*Math.cos(p.h),p.y+32*Math.sin(p.h),15,5.5,'#c8ccba');
      for(const sign of [-1,1])k.box(p.x+sign*9*Math.cos(p.h),p.y+sign*9*Math.sin(p.h),3,9,2,'#826e53',17,p.h);
    }
    plan();return {world,draw,tick,pointer:dragPoint((x,y)=>{if(mode==='edit'){via={x:clamp(x,47,753),y:clamp(y,45,404),h:heading};plan();}})};
  }

  function predictiveDrive(api){
    const gates=[{x:247,center:160},{x:446,center:310},{x:643,center:157}],half=39,step=.24,speed=66,acc=136;
    let horizon=2,state,mode='ready',timer=0,command=0,forecast=[],alternatives=[],trail=[];
    function reset(){state={x:83,y:235,vy:0};timer=0;command=0;forecast=[];alternatives=[];trail=[{...state}];}
    function move(p,u,dt){const vy=clamp(p.vy+u*dt,-110,110);return {x:p.x+speed*dt,y:p.y+(p.vy+vy)*dt/2,vy};}
    function targetY(x){const g=gates.find(g=>Math.abs(x-g.x)<38);return g?g.center:235;}
    function loss(p,previousX,u){
      let value=.012*(p.y-targetY(p.x))**2+.001*p.vy**2+.04*(u/acc)**2;
      for(const gate of gates)if(p.x>=gate.x-12&&previousX<=gate.x+12){const outside=Math.max(0,Math.abs(p.y-gate.center)-(half-11));value+=outside>0?1500+8*outside**2:0;}
      if(p.y<49||p.y>405)value+=8000;return value;
    }
    function replan(){
      let best=Infinity,bestPath=[],action=0;alternatives=[];
      function explore(p,n,cost,path,first){
        if(n===horizon){if(cost<best){best=cost;bestPath=path;action=first;}return;}
        for(const u of [-acc,0,acc]){
          const q=move(p,u,step),v=cost+loss(q,p.x,u);if(v>=best)continue;
          explore(q,n+1,v,[...path,q],n?first:u);
        }
      }
      explore(state,0,0,[state],0);command=action;forecast=bestPath;
      for(const u of [-acc,0,acc]){let q=state;const path=[q];for(let n=0;n<horizon;n++){q=move(q,u,step);path.push(q);}alternatives.push(path);}
    }
    api.slider('预测步数',2,8,2,1,n=>{horizon=clamp(Math.round(n),2,8);if(mode!=='won'){timer=0;if(mode!=='run'&&state)replan();}});
    api.button('发车 / 重新试车',()=>{if(mode==='won'||mode==='run')return;reset();mode='run';api.status('每 0.24 秒重新预测，只执行代价最低序列的第一步。观察绿色预瞄线。');});
    function tick(dt){
      if(mode!=='run')return;let left=Math.min(dt,.1);
      while(left>1e-7&&mode==='run'){
        if(timer<1e-7){replan();timer=step;}
        const t=Math.min(left,timer,.025),q=move(state,command,t);left-=t;timer-=t;state=q;
        if(dist(trail[trail.length-1],q)>3)trail.push(q);
        const collision=gates.find(g=>Math.abs(q.x-g.x)<10&&Math.abs(q.y-g.center)>half-9);
        if(collision||q.y<42||q.y>412){mode='failed';api.status('提前量不足或轨迹过界，试车中止。增大预测步数，让控制器更早看到下一个约束。');}
        else if(q.x>=729){mode='won';api.win('仪器车通过全部三个门架。滚动时域控制实时选择横向加速度，整车没有碰杆。');}
      }
    }
    function draw(g){
      workshop(g,'仪器缓运道 · 俯视图');g.fillStyle='#405451';g.fillRect(50,40,704,378);
      for(const gate of gates){g.fillStyle='#a19779';g.fillRect(gate.x-5,40,10,gate.center-half-40);g.fillRect(gate.x-5,gate.center+half,10,418-gate.center-half);
        for(const sign of [-1,1])disk(g,point(gate.x,gate.center+sign*half),7,gold,ink,2);}
      drawTrail(g,trail,'#b6c1b5',2);for(const alt of alternatives)drawTrail(g,alt,'#efce8a80',1.4);drawTrail(g,forecast,mint,3);
      van(g,{...state,h:Math.atan2(state.vy,speed)});label(g,56,438,'预测窗口 '+(horizon*step).toFixed(2)+' 秒   ·   已过 '+gates.filter(gate=>state.x>gate.x+10).length+' / 3 道门',gold,16);
    }

    function world(p){
      const boundary=[point(50,40),point(754,40),point(754,418),point(50,418),point(50,40)];
      p.line(boundary,'#a4ab8e',2.5,1.5);
      for(const yy of [35,423])for(const xx of [68,203,337,471,605,738])p.box(xx,yy,18,4,4,'#a89577');
      for(const [i,g] of gates.entries()){
        const low=g.center-half,high=g.center+half;
        for(const [y1,y2] of [[40,low],[high,418]])p.box(g.x,(y1+y2)/2,8,y2-y1,5,'#ae9a74',1);
        for(const yy of [low,high]){
          p.post(g.x,yy,5,17,'#b09162');
          p.post(g.x,yy,5.4,3,state.x>g.x+10?mint:gold,17);
        }
        p.label(g.x,g.center-half,'门 '+(i+1),state.x>g.x+10?mint:gold,26);
      }
      if(trail.length>1)p.line(trail,'#c2c8b9',2.6,2.2);
      alternatives.forEach(q=>{if(q.length>1)p.line(q,'#d9bc84',1.8,2.8);});
      if(forecast.length>1)p.line(forecast,mint,4,3.8);
      p.rover(state.x,state.y,Math.atan2(state.vy,speed));
      p.label(state.x,state.y,'预瞄 '+(horizon*step).toFixed(2)+' s',mint,26);
    }
    reset();replan();return {world,draw,tick,pointer(){}};
  }

  function warehouse(api){
    const radius=64,start={x:124,y:350,h:0},goal={x:636,y:286,h:0},tag=point(252,222);
    const shelves=[{x:299,y:219,w:54,h:173},{x:412,y:64,w:101,h:50},{x:469,y:304,w:61,h:78}];
    let poses=[start],moves=[],chains=[],preview=[],track=[],index=0,mode='edit',p=start,scan=false;
    const names={S:'直',L:'左',R:'右'};
    function primitive(from,action){const c=action==='S'?0:(action==='L'?-1:1)/radius,length=action==='S'?radius:Math.PI*radius/2;
      const count=Math.ceil(length/3),path=[from];for(let i=1;i<=count;i++)path.push(advance(from,c,length*i/count));return path;}
    const blocked=q=>q.x<41||q.x>763||q.y<39||q.y>413||shelves.some(b=>inBox(q,b,12));
    function add(action){
      if(mode!=='edit')return;if(moves.length>=15){api.status('动作存储区已满。撤销多余动作再继续。');return;}
      const path=primitive(poses[poses.length-1],action);
      if(path.some(blocked)){preview=path;api.status('这条动作原语会让车身碰上货架或越过边界。选择另一种转向或撤销上一步。');return;}
      moves.push(action);chains.push(path);poses.push(path[path.length-1]);preview=[];api.status('候选终点已更新。要先经过扫描台，再以车头向右的姿态停靠装卸位。');
    }
    api.button('直行一格',()=>add('S'));api.button('左弧 90°',()=>add('L'));api.button('右弧 90°',()=>add('R'));
    api.button('撤销一步',()=>{if(mode==='edit'&&moves.length){moves.pop();chains.pop();poses.pop();preview=[];}});
    api.button('执行动作链',()=>{
      if(mode!=='edit')return;const end=poses[poses.length-1],hasTag=chains.some(q=>q.some(a=>dist(a,tag)<15));
      if(!hasTag||dist(end,goal)>8||Math.abs(angleDiff(end.h))>.06){
        api.status(!hasTag?'未经过薄荷色扫描台，暂不能交货。':'末位姿还没对正装卸位。检查终点位置和车头方向。');return;}
      track=chains.flatMap(q=>q.slice(1));mode='run';index=0;p=start;scan=false;api.status('正在执行已验证可行的连续动作链。');
    });
    function tick(dt){if(mode!=='run')return;index=Math.min(track.length-1,index+dt*64);p=track[Math.floor(index)];
      if(dist(p,tag)<15)scan=true;if(index>=track.length-1){mode='won';api.win('车身沿 '+moves.length+' 个连续可行原语完成扫码与正向停靠。');}}
    function draw(g){
      workshop(g,'备件库 · 车头朝向与动作原语');for(const shelf of shelves)blockDraw(g,shelf,'货架');
      pad(g,tag,scan?'已扫码':'扫描台');pad(g,goal,'装卸位 →');for(const path of chains)drawTrail(g,path,'#9bedd0',3);
      if(mode==='edit'){for(const a of ['S','L','R']){const path=primitive(poses[poses.length-1],a);drawTrail(g,path,path.some(blocked)?'#ce827980':'#e3d5ad90',1.8);}
        drawTrail(g,preview,red,3);if(poses.length>1){van(g,poses[poses.length-1]);label(g,poses[poses.length-1].x,poses[poses.length-1].y-20,'规划车头',gold,13,true);}}
      van(g,p);label(g,32,428,'动作链  '+(moves.length?moves.map(a=>names[a]).join(' · '):'待编排'),pale,16);
    }

    function world(k){
      shelves.forEach(b=>{
        const cx=b.x+b.w/2,cy=b.y+b.h/2;
        k.box(cx,cy,b.w,b.h,3,'#575d57',1);
        for(const xx of [b.x+3,b.x+b.w-3])for(const yy of [b.y+3,b.y+b.h-3])k.post(xx,yy,2.6,26,'#ad9366');
        for(const h of [5,18]){
          k.box(cx,cy,b.w,b.h,2,'#92958a',h);
          k.box(cx-4,cy,b.w*.62,b.h*.73,8,'#9d8769',h+2);
        }
      });
      shopGate3(k,tag,0,scan?gold:mint);k.label(tag.x,tag.y,scan?'已扫码':'扫码台',mint,26);
      shopGate3(k,goal,0,gold);poseArrow3(k,goal,0,gold);k.label(goal.x,goal.y,'装卸位',gold,25);
      for(const path of chains)k.line(path,mint,3.5,2.2);
      if(mode==='edit'){
        const end=poses.at(-1);
        for(const action of ['S','L','R']){const path=primitive(end,action);k.line(path,path.some(blocked)?'#bb7f6d':'#d1bf90',2,2.8);}
        if(preview.length>1)k.line(preview,red,3.5,3.2);
        if(poses.length>1){poseArrow3(k,end,end.h,gold);k.ring(end.x,end.y,10,gold,2.5,2.5);k.label(end.x,end.y,'轨迹终点',gold,20);}
      }
      k.rover(p.x,p.y,p.h);k.label(430,417,'动作链 '+(moves.length?moves.map(a=>names[a]).join('·'):'待编排'),pale,9);
    }
    return {world,draw,tick,pointer(){}};
  }
  const vehicle=(id,title,algorithm,brief,goal,how,create)=>missions.push({id,title,algorithm,region:'driving',lesson:id,brief,goal,how,create});
  vehicle('dubins','把长管运过泵房','Dubins 前进曲线','运输架禁止倒车，管尾比车身更容易扫到泵房。指定中转位姿，让车辆用圆弧和直线连接两段路线。','让长管两端留在场内，车辆按规定朝向入库。','点泵房侧面的空地放中转点，可调整中转车头朝向。检查橙红碰撞点，再执行试运。',pipeRun);
  vehicle('mpc','连续窄门缓运道','滚动时域预测控制','易碎仪器车保持恒定纵速。控制器枚举受限的横向加速度序列，还要给后续窄门留出调整时间。','调节预测时域，连续穿过三道交错门架。','短时域先试一次。调长预测窗口，对比绿色预测轨迹、浅黄色候选轨迹和实际轮迹。',predictiveDrive);
  vehicle('lattice','编排搬运车入库','位姿格与运动原语','仓库搬运车不能原地转向。每个动作都连接一个确定的位置和车头朝向，可用的下一步会随姿态改变。','编排一条经过扫描台、最终面向右侧停靠装卸位的动作链。','用直行、左弧和右弧延长绿色路线，浅色分支显示下一步。可撤销修正，最后执行整条动作链。',warehouse);

})();
