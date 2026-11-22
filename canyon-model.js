(() => {
  'use strict';
  const pt=(x,z)=>({x,z});
  const d=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
  const {nodes,lanes}=MountainSearch;
  const debris=[{x:.1,z:48,r:3.2},{x:1.6,z:50,r:2.0}];
  const stages=Object.freeze({rescue:'断讯山道',survey:'寻找失联信标',freight:'弯道送件'});
  function onSegment(p,a,b){
    const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);
    return pt(a.x+dx*t,a.z+dz*t);
  }
  function create(which='rescue'){
    const kind=stages[which]?which:'rescue';
    const gates=[pt(0,14),pt(-3.5,29),pt(-11,39),pt(-17,53),pt(-12,64),pt(-3,73),pt(0,88)];
    const surveySites=[pt(0,9),pt(-9,34),pt(11,37)];
    const target=pt(9,65), samples=[];
    const roadLines=lanes.map(list=>list.map(i=>nodes[i]));
    const s={kind,mode:'intro',time:0,rover:{x:0,z:0,yaw:0,speed:0},camera:'chase',focus:pt(0,52),roads:roadLines,rocks:kind==='rescue'?debris:[],goal:nodes[1],stations:[nodes[7]],waypoints:[],route:[],scanAge:99,checkpoint:pt(0,0),fixes:0,observation:null,samples,gateIndex:0,elapsed:0,bumps:0,routeMeters:0,lookahead:4.5,summary:'',hint:'',hintTime:0,choice:null,relay:-1};
    let routeIndex=0,impactLock=0,searchClock=0;
    s.policy='energy';s.mat=null;s.prediction=null;s.plan=null;s.frameIndex=-1;s.playSearch=false;s.comparisons=0;
    function clearPlan(){s.plan=null;s.frameIndex=-1;s.playSearch=false;s.route=[];s.hintTime=0;}
    function configure(policy,mat){
      if(s.mode!=='plan')return;
      if(policy)s.policy=policy==='metres'?'metres':'energy';
      if(mat!==undefined)s.mat=mat;
      clearPlan();
    }
    function predict(value){if(s.mode!=='plan'||!MountainSearch.routes.some(r=>r.id===value))return;s.prediction=value;clearPlan();}
    function startSearch(){if(s.mode!=='plan'||!s.prediction)return;s.plan=MountainSearch.evaluate(s.policy,s.mat);s.frameIndex=0;s.playSearch=true;s.comparisons++;s.route=[];searchClock=0;}
    function stepSearch(){
      if(!s.plan)return;
      const result=s.plan.astar;s.frameIndex=Math.min(s.frameIndex+1,result.frames.length-1);
      if(s.frameIndex===result.frames.length-1){s.playSearch=false;s.route=result.path.map(i=>nodes[i]);s.routeMeters=result.meters;}
    }
    function stepOnce(){if(!s.plan){startSearch();s.playSearch=false;}else{s.playSearch=false;stepSearch();}}
    function playPause(){if(!s.plan){startSearch();return;}if(s.frameIndex===s.plan.astar.frames.length-1){s.frameIndex=0;s.route=[];}s.playSearch=!s.playSearch;searchClock=0;}

    function say(message){s.hint=message;s.hintTime=4;}
    function mode(n){s.mode=n;s.hint='';s.hintTime=0;}
    function stop(){s.rover.speed=0;}
    function begin(){
      if(s.mode!=='intro')return;
      mode('drive');
      if(kind==='freight'){s.goal=gates[0];s.waypoints=gates.slice(1);}
      if(kind==='survey')s.goal=surveySites[0];
    }
    function finish(summary){mode('done');stop();s.summary=summary;}
    function record(){
      const r=s.rover;
      if(samples.length>=3)return;
      if(samples.some(p=>d(r,p)<6)){say('测站太近。开到下一个发光标记，再测一次。');return;}
      if(samples.length===2){const [a,b]=samples;if(Math.abs((b.x-a.x)*(r.z-a.z)-(b.z-a.z)*(r.x-a.x))<45){say('三个测点几乎在一条线上。向侧面开几米再测。');return;}}
      samples.push({...pt(r.x,r.z),range:d(r,target)});s.scanAge=0;
      if(samples.length===3){
        const [a,b,c]=samples;
        const row=p=>[2*(p.x-a.x),2*(p.z-a.z),a.range*a.range-p.range*p.range+p.x*p.x+p.z*p.z-a.x*a.x-a.z*a.z];
        const [i,j,k]=row(b),[u,v,w]=row(c),det=i*v-j*u;s.observation=pt((k*v-j*w)/det,(i*w-k*u)/det);
        s.goal=s.observation;mode('recover');say('三个测距圆相交了。开到交点取回信标。');
      }else{s.goal=surveySites[samples.length];say('已测得 '+samples.at(-1).range.toFixed(1)+' 米。下一站换个方向测距。');}
    }
    function act(){
      if(s.mode==='intro'){begin();return;}
      if(kind==='survey'&&s.mode==='drive'){if(Math.abs(s.rover.speed)>3){say('先松开油门，或按住刹车，再按测距。');return;}record();return;}
      if(s.mode==='scan'){s.scanAge=0;mode('sweeping');return;}
      if(s.mode==='plan'){
        if(!s.prediction){say('先在地图上标出你的路线预测。');return;}
        if(!s.plan){startSearch();return;}
        if(s.frameIndex<s.plan.astar.frames.length-1){s.playSearch=true;return;}
        if(s.plan.energy>90){say('这条路线超出 90 格电量。给其中一条路铺一段防滑板，再运行搜索。');return;}
        s.camera='chase';s.waypoints=[];routeIndex=1;s.goal=nodes[7];mode('auto');return;
      }
      if(s.mode==='dock'||s.mode==='recover'){
        if(d(s.rover,s.goal)>4.5){say('再靠近发光标记一些。');return;}
        if(Math.abs(s.rover.speed)>2.5){say('速度还太快，先刹车再交接。');return;}
        finish(kind==='survey'?'三次测距的交点定位了失联信标，回收误差 '+d(s.rover,target).toFixed(1)+' 米。':'电芯已接入。A* 找到 '+Math.round(s.routeMeters)+' 米的绕行路线，车辆沿路抵达雨量站。');return;
      }
    }
    function resetCar(){
      if(!['drive','recover','dock'].includes(s.mode))return;
      Object.assign(s.rover,s.checkpoint,{yaw:s.checkpoint.yaw||0,speed:0});say('车辆已回到最近的检查点。');
    }
    function manual(dt,input){
      const r=s.rover,brake=!!input.brake,throttle=!!input.gas;
      if(brake){r.speed=Math.max(0,r.speed-22*dt);}
      else if(input.reverse){r.speed=Math.max(-4,r.speed-7*dt);}
      else if(throttle){r.speed=Math.min(s.mode==='dock'?5:13,r.speed+8*dt);}
      else{r.speed*=Math.exp(-1.45*dt);if(Math.abs(r.speed)<.04)r.speed=0;}
      const turn=(input.right?1:0)-(input.left?1:0);
      r.yaw=angle(r.yaw+turn*r.speed*.16/(1+Math.abs(r.speed)*.045)*dt);
      const next=pt(r.x+Math.sin(r.yaw)*r.speed*dt,r.z+Math.cos(r.yaw)*r.speed*dt);
      if(next.x < -31||next.x>31||next.z< -5||next.z>113||s.rocks.some(o=>d(o,next)<o.r+1.2)){
        stop();if(impactLock<=0){s.bumps++;impactLock=1.4;say('车身接近障碍。倒车调整方向，或返回检查点。');}return;
      }
      Object.assign(r,next);
      if(kind==='freight'&&d(r,s.goal)<3.4){
        if(Math.abs(r.speed)>32/3.6){stop();s.bumps++;Object.assign(r,s.checkpoint,{yaw:s.checkpoint.yaw||0});say('货箱晃动过大。入门前刹到 32 km/h 以下，再穿过去。');return;}
        s.gateIndex++;s.checkpoint={...pt(r.x,r.z),yaw:r.yaw};
        if(s.gateIndex===gates.length){finish('全部 7 道门稳速通过，用时 '+s.elapsed.toFixed(1)+' 秒，超速或碰撞 '+s.bumps+' 次。');return;}
        s.goal=gates[s.gateIndex];s.waypoints=gates.slice(s.gateIndex+1);say('通过！前往下一扇门。');
      }
      if(kind==='rescue'&&s.mode==='drive'&&r.z>=17){
        s.checkpoint=pt(0,18);Object.assign(r,s.checkpoint,{speed:0,yaw:0});mode('scan');s.goal=nodes[3];
      }
      if(s.mode==='dock'&&d(r,s.goal)<1.8)stop();
    }
    function auto(dt){
      const r=s.rover,route=s.route;
      while(routeIndex<route.length-1&&d(r,route[routeIndex])<2.5)routeIndex++;
      const dest=route[routeIndex],dist=d(r,dest);
      if(routeIndex===route.length-1&&dist<2){mode('dock');stop();s.checkpoint={...pt(r.x,r.z),yaw:r.yaw};s.goal=nodes[7];return;}
      const foot=onSegment(r,route[routeIndex-1],dest);let aim=foot,left=s.lookahead;
      for(let i=routeIndex;i<route.length;i++){const span=d(aim,route[i]);if(span>=left){aim=pt(aim.x+(route[i].x-aim.x)*left/span,aim.z+(route[i].z-aim.z)*left/span);break;}left-=span;aim=route[i];}
      const alpha=angle(Math.atan2(aim.x-r.x,aim.z-r.z)-r.yaw);
      r.speed=Math.min(8,3.4+dist, r.speed+dt*4);
      r.yaw=angle(r.yaw+clamp(2*r.speed*Math.sin(alpha)/Math.max(1,d(aim,r)),-1.8,1.8)*dt);
      r.x+=r.speed*Math.sin(r.yaw)*dt;r.z+=r.speed*Math.cos(r.yaw)*dt;
    }
    function tick(dt,input={}){
      s.time+=dt;s.scanAge+=dt;s.hintTime=Math.max(0,s.hintTime-dt);impactLock-=dt;
      if(s.mode!=='intro'&&s.mode!=='done')s.elapsed+=dt;
      if(s.mode==='plan'&&s.playSearch){searchClock+=dt;if(searchClock>=.42){searchClock=0;stepSearch();}}
      if(s.mode==='sweeping'&&s.scanAge>1.35){mode('plan');s.camera='tactical';s.goal=nodes[6];s.waypoints=[];}
      if(['drive','dock','recover'].includes(s.mode))manual(dt,input);
      if(s.mode==='auto')auto(dt);
    }
    return {s,act,predict,configure,startSearch,stepOnce,playPause,tick,resetCar,nodes,surveySites,stages};
  }
  globalThis.CanyonRun={create,stages};
})();
