(() => {
  'use strict';
  // A side-on perspective display shares the real sensor pose and collision geometry on devices without WebGL.
  function fallbackView(api){
    const node=document.getElementById('stage-render'),canvas=document.createElement('canvas');
    node.replaceChildren(canvas);const ctx=canvas.getContext('2d');
    let mode='follow',landing=null,worldPoint=()=>null;
    function draw(pose,{bridge}){
      const dpr=Math.min(1.7,devicePixelRatio||1),w=Math.max(1,Math.round(node.clientWidth*dpr)),h=Math.max(1,Math.round(node.clientHeight*dpr));
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
      ctx.clearRect(0,0,w,h);const wide=mode==='overview',scale=Math.min(w/(wide?31:16),h/11);
      const center=wide?13:Math.min(22,Math.max(6,pose.x+2));
      const proj=(x,y,z)=>[w*.5+(x-center-(z-4)*.36)*scale,h*.56+((z-4)*.42-(y-1.5))*scale];
      worldPoint=p=>{const [x,y]=proj(p.x,p.y+.1,p.z);return {x:x/w,y:y/h};};
      function face(pts,col){ctx.beginPath();pts.forEach((v,i)=>{const [x,y]=proj(...v);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.closePath();ctx.fillStyle=col;ctx.fill();}
      function box(x,z,y,a,b,height,top,front,side){
        const A=[x,y,z],B=[x+a,y,z],C=[x+a,y,z+b],D=[x,y,z+b],down=v=>[v[0],v[1]-height,v[2]];
        face([D,C,down(C),down(D)],front);face([B,C,down(C),down(B)],side);face([A,B,C,D],top);
      }
      const layers=[];
      for(const slab of api.platforms){if(slab.id==='bridge'&&!bridge)continue;layers.push([slab.far,()=>box(slab.left,slab.near,slab.top,slab.right-slab.left,slab.far-slab.near,1.8,'#c3b899','#8b806a','#687c73')]);}
      for(const key of Object.keys(api.obstacles)){if(key==='spike'&&!pose.spike)continue;const o=api.obstacles[key];layers.push([o.z+o.d/2+.01,()=>box(o.x-o.w/2,o.z-o.d/2,o.y+o.h,o.w,o.d,o.h,'#e2b377','#947858','#546d6d')]);}
      layers.push([pose.z+.36,()=>{box(pose.x-.30,pose.z-.24,pose.y+.53,.60,.48,.40,'#d4ac66','#997850','#577571');box(pose.x-.31,pose.z-.26,pose.y+.93,.65,.54,.38,'#e3cca0','#786f5f','#526e70');const [x,y]=proj(pose.x,pose.y+.74,pose.z+.29);ctx.fillStyle='#9be3cd';ctx.fillRect(x-scale*.13,y,scale*.28,Math.max(2,scale*.055));}]);
      layers.sort((a,b)=>a[0]-b[0]).forEach(v=>v[1]());
      if(landing){const [x,y]=proj(landing.x,landing.y+.04,landing.z);ctx.strokeStyle='#9ae8cd';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,scale*.42,scale*.18,0,0,2*Math.PI);ctx.stroke();}
    }
    return {draw,worldPoint:p=>worldPoint(p),setMode:value=>{mode=value;},showLanding:value=>{landing=value;},showFrame(){}};
  }

  globalThis.mountMomoChallenge=function mountMomoChallenge(api,free){
    const el=id=>document.getElementById(id),go=el('mission-action'),hint=el('pilot-hint'),jump=el('jump-command'),jumpButton=el('send-jump');
    let phase='baseline',fault='',safe='',avoidances=0,trials=1,running=false,locked=false;
    const report=(type,extra={})=>{if(window.parent!==window)window.parent.postMessage({game:'canyon-momo',type,...extra},location.origin);};
    function task(k,title,guide,action){el('phase-title').textContent=k;el('mission-goal').textContent=title;hint.textContent=guide;go.textContent=action;}
    function lock(value){locked=value;go.disabled=value;jumpButton.disabled=value;}
    function monitor(open){el('monitor').classList.toggle('open',open);el('monitor-toggle').setAttribute('aria-expanded',String(open));}
    el('monitor-toggle').onclick=()=>monitor(!el('monitor').classList.contains('open'));
    el('open-training').onclick=()=>{api.stop();el('training-drawer').hidden=false;el('close-training').focus();};
    el('close-training').onclick=()=>{el('training-drawer').hidden=true;el('open-training').focus();};
    if(api.fallback())api.setFallback(fallbackView(api));
    document.body.dataset.mode=free?'lab':'mission';
    api.names.forEach((name,i)=>{const op=document.createElement('option');op.value=i;op.textContent=name;el('pilot-jump').append(op);});
    el('pilot-jump').value=5;
    const targets=el('landing-targets'),markers=new Map(),decision=document.createElement('canvas');
    decision.id='decision-evidence';decision.hidden=true;document.body.append(decision);
    function recordSensor(){const c=el('sensor-canvas');decision.width=c.width;decision.height=c.height;if(c.width&&c.height)decision.getContext('2d').drawImage(c,0,0);}
    function sendJump(action){if(phase!=='cross'||running||api.busy||locked)return;lock(true);api.command(action);}
    function updateTargets(){
      const ready=!free&&phase==='cross'&&!running&&!locked&&!api.busy&&!api.done;
      targets.hidden=!ready;if(!ready)return;
      const landings=api.sensor?.landings||[],seen=new Set();
      for(let i=0;i<landings.length;i++){
        const q=landings[i];if(!q.preview)continue;
        const pt=api.projectLanding(q);if(!pt||pt.x<.04||pt.x>.96||pt.y<.12||pt.y>.92)continue;
        let btn=markers.get(i);if(!btn){btn=document.createElement('button');btn.type='button';btn.onclick=()=>sendJump(i);targets.append(btn);markers.set(i,btn);}
        const state={gap:'缺口',blocked:'受阻',supported:'有台面',unknown:'未知'}[q.status];
        const caption=q.preview+' · '+state;if(btn.textContent!==caption)btn.textContent=caption;
        btn.dataset.state=q.status;btn.style.left=(pt.x*100)+'%';btn.style.top=(pt.y*100)+'%';btn.hidden=false;seen.add(i);
      }
      for(const [key,b] of markers)if(!seen.has(key))b.hidden=true;
    }
    el('accept-task').onclick=()=>{el('radio-intro').hidden=true;go.focus();};
    if(free){
      el('radio-intro').hidden=true;el('open-training').hidden=false;go.hidden=true;
      task('MOMO / 自由实验','传感器与策略试验台','用同一策略切换断桥与深度观测，也可以打开策略训练调整奖惩。','');
    }else{
      api.reset(false);el('depth-on').disabled=true;el('depth-switch-label').textContent='ToF 离线';el('comparison-note').textContent='';
      task('首跳对照　1 / 3','复现断桥误判','只开水平雷达。在原策略下单步试跳，观察机器人能否发现脚下的缺口。','只用雷达试跳');
    }
    go.onclick=()=>{
      if(free||locked)return;
      if(phase==='baseline'){document.querySelector('[data-sensor=radar]').click();recordSensor();lock(true);api.primaryStep();return;}
      if(phase==='depth'){api.reset(true);recordSensor();el('depth-switch-label').textContent='ToF 在线';lock(true);api.primaryStep();return;}
      if(phase==='cross'){
        if(running){api.stop();running=false;go.textContent='继续自主通行';jumpButton.disabled=api.busy;}
        else {running=true;jumpButton.disabled=true;go.textContent='暂停自主通行';api.run();}
      }
    };
    jumpButton.onclick=()=>{
      if(phase!=='cross'||running||api.busy||locked)return;
      sendJump(Number(el('pilot-jump').value));
    };
    function landed(run,ev){
      if(free)return;
      const name=api.names[ev.action],old=api.names[ev.proposed];
      if(phase==='baseline'){
        if(!run.fromStart||run.depthUsed||ev.reason!=='pit'){api.reset(false);lock(false);return;}
        fault=name+'落空';report('sample',{decision:true,label:'水平雷达首跳',detail:fault+'。下方缺口没有挡住水平射线。'});
        phase='depth';lock(false);task('首跳对照　2 / 3','给 MOMO 接上深度传感器','保留相同的起点、断桥和预训练策略。打开 ToF 重跳，看候选落脚点怎样变化。','接入 ToF 并复测');return;
      }
      if(phase==='depth'){
        if(!run.fromStart||!run.depthUsed||!ev.avoided||ev.reason!=='step'){lock(false);hint.textContent='重置同一策略，再测一次首跳。';return;}
        safe=name+'着陆';avoidances=1;report('sample',{decision:true,label:'接入 ToF 的首跳',detail:old+'被判为缺口，改为'+safe+'。'});
        phase='cross';lock(false);jump.hidden=false;task('中继维修　3 / 3','抵达对岸中继门','点击场景里的落点标记试跳，ToF 会复核落脚处。也可以放行自主策略，观察它怎样根据奖励调整后续动作。','放行自主通行');return;
      }
      if(phase!=='cross')return;
      if(ev.avoided)avoidances++;lock(false);jumpButton.disabled=running;
      if(ev.reason==='goal'){
        phase='done';api.stop();running=false;jump.hidden=true;lock(true);
        const summary='同一策略首跳：水平雷达下'+fault+'，接入 ToF 后'+safe+'。第 '+trials+' 趟抵达中继门，本趟 '+api.steps+' 步，累计奖励 '+api.reward.toFixed(2)+'。复测至通关共改选 '+avoidances+' 次落点。';
        task('中继已恢复','中继门回传正常',summary,'已到达');
        report('complete',{summary});return;
      }
      if(ev.reason!=='step'){
        api.stop();running=false;const reason={post:'碰到立柱',crusher:'撞到上方设备',spike:'踩中升降桩',timeout:'超出步数',pit:'落入缺口',ledge:'撞上台阶'}[ev.reason]||'未能着陆';
        report('sample',{label:'第 '+trials+' 趟试行',detail:reason+'，本步奖励 '+ev.gained.toFixed(1)+'。'});trials++;
        task('中继维修　3 / 3','带着这次经验再出发',reason+'。本步奖励已更新对应动作的 Q 值。重新放行或指定下一跳。','再次放行');jumpButton.disabled=false;
      }else if(!running){go.textContent='继续自主通行';hint.textContent=name+'着陆。可以选择下一跳，或交给自主策略。';}
    }
    return {landed,updateTargets};
  };
})();
