(() => {
  'use strict';
  const point=(x,y,z=0)=>({x,y,z}),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
  const meta={
    'arm-ik':['换装电芯','工程舱','点电芯移动夹爪。夹紧之后，点亮起的插座。'],
    'arm-obstacles':['立管检修','工程舱','先夹起电芯。移动目标时，既要看夹爪，也要看肘部和立管之间的距离。'],
    'n-arm':['接通斜向导管','工程舱','把三节机械臂的工具头移到接口，再转动腕部，让管口对齐。'],
    drone:['空廊穿行','飞行队','前方三道校验环高度各异。先调整位置和高度，再向前穿环。'],
    landing:['轻放仪器舱','飞行队','降落平台在机身左侧。先横移对准，接近地面时用升力减小下降速度。']
  };
  function arm(kind){
    const third=kind==='n-arm',base=point(0,.68),lengths=third?[1.95,1.85,.83]:[2.15,2.05],cell=point(-2.85,2.55),socket=third?point(2.6,2.45):point(2.85,1.65);
    const s={kind,time:0,view:'front',joints:[],cell:{...cell},socket,target:{...cell},toolAngle:0,socketAngle:Math.PI/5,obstacles:kind==='arm-obstacles'?[{...point(1.25,1.56),r:.38}]:[],gripped:false,done:false,summary:'',note:'',work:0,bends:0,step:0};
    const ik=(p,tilt)=>{
      const x=p.x-(third?lengths[2]*Math.cos(tilt):0),y=p.y-base.y-(third?lengths[2]*Math.sin(tilt):0);
      const [a,b]=lengths,c=(x*x+y*y-a*a-b*b)/(2*a*b);if(Math.abs(c)>1)return null;
      const elbow=-Math.acos(clamp(c,-1,1));return [Math.atan2(y,x)-Math.atan2(b*Math.sin(elbow),a+b*c),elbow,tilt];
    };
    let ang=ik(point(-2.1,2.45),0),desired=ang.slice(),blocked=false;s.target=point(-2.1,2.45);
    function joints(q){const [a,b]=lengths,one=point(a*Math.cos(q[0]),base.y+a*Math.sin(q[0])),two=point(one.x+b*Math.cos(q[0]+q[1]),one.y+b*Math.sin(q[0]+q[1]));return third?[base,one,two,point(two.x+lengths[2]*Math.cos(q[2]),two.y+lengths[2]*Math.sin(q[2]))]:[base,one,two];}
    s.joints=joints(ang);
    function blockedByPipe(parts){return s.obstacles.some(o=>parts.slice(1).some((b,i)=>{const a=parts[i],dx=b.x-a.x,dy=b.y-a.y,t=clamp(((o.x-a.x)*dx+(o.y-a.y)*dy)/(dx*dx+dy*dy),0,1);return Math.hypot(a.x+t*dx-o.x,a.y+t*dy-o.y)<o.r+.13;}));}
    function aim(p,tilt=s.toolAngle){
      if(s.done)return false;
      const ans=ik(p,tilt);if(!ans){s.note='超过机械臂的工作半径，换一个近一点的目标。';return false;}
      s.target=point(p.x,p.y);s.toolAngle=tilt;desired=ans;blocked=false;s.note='';return true;
    }
    function rotate(dir){if(third)aim(s.target,clamp(s.toolAngle+dir*Math.PI/18,-Math.PI/2,Math.PI/2));}
    function tick(dt){
      s.time+=dt;if(s.done||blocked)return;const end=s.joints.at(-1),dx=s.target.x-end.x,dy=s.target.y-end.y,f=Math.min(1,3.8*dt/(Math.hypot(dx,dy)||1));
      const q=ik(point(end.x+dx*f,end.y+dy*f),ang[2]+clamp(wrap(desired[2]-ang[2]),-1.8*dt,1.8*dt));if(!q)return;
      const parts=joints(q);if(blockedByPipe(parts)){blocked=true;s.note='肘部或连杆碰到立管。先点高处绕过管道，再靠近插座。';s.bends++;return;}
      ang=q;s.joints=parts;if(s.gripped)s.cell={...parts.at(-1)};
    }
    function act(){
      if(s.done||blocked)return;const end=s.joints.at(-1);
      if(third){
        if(distance(end,s.socket)>.27){s.note='把工具头移到发光接口再接合。';return;}
        const err=Math.abs(wrap(ang[2]-s.socketAngle))*180/Math.PI;
        if(err>6){s.note='位置已对准，腕部还差 '+Math.round(err)+'°。点转腕调到约 36°。';return;}
        s.done=true;s.summary='管口已接合。末端位置误差 '+distance(end,s.socket).toFixed(2)+' 米，轴向误差 '+err.toFixed(1)+'°。';return;
      }
      if(!s.gripped){if(distance(end,s.cell)>.3){s.note='空夹了。点左边电芯，让夹爪到位再合拢。';return;}s.gripped=true;s.step=1;s.note=kind==='arm-obstacles'?'电芯已夹紧。点高处的绕行点，给肘部留出空间。':'电芯已夹紧。点发光插座，将电芯移过去。';return;}
      if(distance(end,s.socket)>.32){s.note='还没有对准插座，继续移动夹爪。';return;}s.done=true;s.gripped=false;s.cell={...s.socket};s.summary=kind==='arm-obstacles'?'电芯已装入。整条机械臂绕过立管完成了搬运。':'电芯已装入。你指定了两个末端位置，逆运动学为每个位置求出了肩、肘关节角。';
    }
    return {s,aim,rotate,tick,act};
  }
  function aerial(kind){
    const landing=kind==='landing',gates=[point(-3,5,19),point(4,10,42),point(-3,6,67)],pad={x:0,z:50};
    const s={kind,time:0,view:'front',camera:'chase',mode:'drive',rover:{x:landing?4:0,y:landing?13:4,z:landing?50:0,yaw:0,speed:0},roads:[[point(0,0,-8),point(0,0,90)]],rocks:[],goal:landing?point(0,0,50):gates[0],pad:landing?pad:null,airGates:landing?[]:gates,gateIndex:0,route:[],waypoints:[],stations:[],focus:{x:0,z:38},scanAge:99,done:false,summary:'',note:'',started:false,vy:0,vx:0,cmdX:landing?4:0,cmdY:4,elapsed:0};
    let check={x:0,y:4,z:0},retries=0,notice=0;
    function restartFall(){Object.assign(s.rover,{x:4,y:13,z:50,speed:0});s.vy=s.vx=0;s.started=false;}
    function act(){if(landing){s.note="";s.started=true;};}
    function tick(dt,input={}){
      s.time+=dt;if(s.done)return;const r=s.rover,dir=(input.right?1:0)-(input.left?1:0);
      if(notice>0){notice-=dt;if(notice<=0)s.note='';}
      if(landing){
        if(!s.started)return;s.elapsed+=dt;
        s.vx+=(dir*3.1-s.vx)*Math.min(1,dt*3.3);r.x=clamp(r.x+s.vx*dt,-10,10);
        s.vy=clamp(s.vy+((input.up?4.4:0)-1.8-s.vy*.12)*dt,-7,4.5);r.y+=s.vy*dt;
        if(r.y>16){r.y=16;s.vy=0;}
        if(r.y<=.53){
          const v=Math.abs(s.vy),error=Math.abs(r.x-pad.x);if(v>1.8||error>1.75){retries++;restartFall();s.note=(error>1.75?'机身落在平台外。':'触地速度过快。')+' 点开始下降重试，末段保持在 1.8 m/s 以内。';return;}
          r.y=.53;s.done=true;s.summary='仪器舱安全着陆。触地速度 '+v.toFixed(2)+' m/s，距平台中心 '+error.toFixed(2)+' 米。';
        }
      }else{
        s.cmdX=clamp(s.cmdX+dir*4*dt,-12,12);s.cmdY=clamp(s.cmdY+((input.up?1:0)-(input.down?1:0))*3*dt,1,15);
        const vertical=(s.cmdY-r.y)*2.4,horizontal=(s.cmdX-r.x)*2.4;
        r.x+=horizontal*dt;r.y+=vertical*dt;s.vy=vertical;r.speed+=(Number(!!input.forward)*9-r.speed)*Math.min(1,dt*3);r.z+=r.speed*dt;
        const gate=gates[s.gateIndex];if(r.z>=gate.z){
          const e=Math.hypot(r.x-gate.x,r.y-gate.y);if(e>2.1){retries++;Object.assign(r,check,{speed:0});s.cmdX=r.x;s.cmdY=r.y;s.note='错过检验环，已回到检查点。按住升降或横移先对准，再前飞。';notice=4;return;}
          s.gateIndex++;check={x:r.x,y:r.y,z:r.z+.1};if(s.gateIndex===gates.length){s.done=true;s.summary='飞行器跟踪目标高度与横向位置，依次通过三道检验环。重试 '+retries+' 次。';return;}s.goal=gates[s.gateIndex];s.note='穿环成功。悬停调整下一段的高度和横向位置。';notice=3;
        }
      }
    }
    return {s,tick,act};
  }
  globalThis.RigModel={meta,arm,aerial};
})();
