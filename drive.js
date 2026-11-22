(() => {
  'use strict';
  const stages = [
    {kind:'tracking',name:'弯道跟踪',method:'Pure Pursuit 纯跟踪',lesson:'pursuit',vehicle:'ATLAS / 01',param:'前视距离',min:4,max:18,step:1,start:15,unit:'米',tip:'缩短前视距离，观察车在急弯里会不会更贴近中心线。',legend:'薄荷色标记是车正在瞄准的前视点。',mission:'穿过连续弯道，控制车辆与中心线的平均距离。',detail:'控制器瞄准前方一个点，按它相对车身的位置计算转向。',metric:'平均循迹偏差'},
    {kind:'avoid',name:'碎石避障',method:'动态窗口局部规划',lesson:'dwa',vehicle:'ATLAS / 02',param:'避障余量',min:0.3,max:2.5,step:0.1,start:0.5,unit:'米',tip:'接近碎石时，调大避障余量，观察候选路线如何分开。',legend:'浅色弧线是候选轨迹，薄荷色是控制器选择的路线。',mission:'穿过七处落石，在窄路上给车身留出空间。',detail:'局部规划器试算车辆短时间内能走的轨迹，按净空、进度和路面边界选择控制量。',metric:'最近车身净空'},
    {kind:'fusion',name:'峡谷定位',method:'一维卡尔曼传感器融合',lesson:'gps-imu',vehicle:'ATLAS / 03',param:'假设的观测噪声',min:0.2,max:6,step:0.1,start:0.4,unit:'米',tip:'GPS 在峡谷中抖动时，调大观测噪声，让估计更依赖里程推算。',legend:'暖色是横向 GPS 读数，薄荷色是融合估计。',mission:'穿越 GPS 信号不稳定的峡谷，改善横向定位。',detail:'此处只估计横向位置。滤波器用轮速推算位置，再根据观测可信度校正。',metric:'平均定位误差'}
  ];
  const checkpoints=[
    {at:55,title:'接下来是连续急弯',text:'选择一个预瞄点，观察车身与中心线的距离。',choices:[['瞄近处 · 5 米',5],['瞄远处 · 16 米',16]]},
    {at:27,title:'前方发现落石',text:'为局部规划器设置净空偏好，再看它选择哪条弧线。',choices:[['贴近通过 · 0.3 米',0.3],['提前绕开 · 2 米',2]]},
    {at:93,title:'进入卫星信号波动区',text:'选择如何看待 GPS 观测误差，再比较两个位置标记。',choices:[['更信 GPS · 0.3 米',0.3],['更信推算 · 3 米',3]]}
  ];
  const key='robot-atlas.rallies.v1';
  const progress=()=>{try {return JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{return {};}};
  const fixed=(v,d=1)=>Number.isFinite(v)?v.toFixed(d):'—';
  const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));

  function mountDrive(root,requested,story){
    const ix=Math.max(0,stages.findIndex(s=>s.kind===requested)), config=stages[ix];
    const sim=story?.sim||globalThis.createDriveStage(config.kind);
    const s=sim.state;
    const saved=progress();
    root.innerHTML=`<section class="flight">
      <div class="sim-view"><canvas aria-label="探测车与前方实时路况"></canvas></div>
      <div class="flight-head"><a href="#lobby" class="exit-flight">‹ 大厅</a><div class="flight-title"><small>ATLAS / 航段 0${ix+1}</small><h1>${story?.mission.place||config.name}</h1></div><div class="flight-actions"><button data-act="pause">暂停</button><button class="screen-toggle"></button></div></div>
      <div class="flight-distance"><span class="distance"></span><div class="sim-progress"><i></i></div></div>
      <div class="cockpit-flash" hidden></div>
      <section class="sim-prompt" role="region" aria-label="驾驶任务"><h2></h2><p></p><button class="primary" data-act="start"></button><button class="inline-next" data-act="next" hidden>下一航段</button><div class="race-result" aria-live="polite" hidden><h3></h3><p></p></div></section>
      <div class="flight-panel"><div class="flight-bottom"><div class="flight-readings">
        <div><small>车速</small><b data-stat="speed"></b></div><div><small data-label="metric"></small><b data-stat="metric"></b></div><div><small data-label="extra"></small><b data-stat="extra"></b></div>
        </div><div class="field-sensor"><b>${sim.state.sensor.label}</b><span data-sensor></span></div>
        <div class="touch-controls"><button data-hold="left" aria-label="向左转向">◀</button><button data-hold="brake">制动</button><button data-hold="right" aria-label="向右转向">▶</button></div></div>
      <details class="flight-tune"><summary>调试导航 · ${config.method}</summary><div class="tune-body"><label class="settings-title" for="driveParam">${config.param} <output></output></label><input type="range" id="driveParam" min="${config.min}" max="${config.max}" step="${config.step}" value="${config.start}"><p>${config.tip} ${config.legend}</p><p>${s.objective}</p><div class="tune-options"><label class="assist"><input type="checkbox" checked>辅助转向</label><label><input data-sensor-power type="checkbox" checked>传感器供电</label><button data-act="restart">重置航段</button><a data-lesson>算法手册</a></div></div></details></div></section>`;
    const el=selector=>root.querySelector(selector);
    const canvas=el('.sim-view canvas'),value=el('#driveParam'),assist=el('.assist input'),prompt=el('.sim-prompt');
    const start=el('[data-act=start]'),next=el('[data-act=next]'),pause=el('[data-act=pause]'),restart=el('[data-act=restart]');
    const lesson=globalThis.curriculum.find(l=>l.id===config.lesson)||(config.kind==='tracking'?globalThis.curriculum.find(l=>l.title.includes('Pure Pursuit')):null);
    el('[data-lesson]').href=lesson?'#play/'+lesson.id:'#library';
    const removeFull=globalThis.expedition.mountFullButton(el('.screen-toggle'));
    el('[data-label=metric]').textContent=config.metric;
    el('[data-label=extra]').textContent=ix===0?'离开路面':ix===1?'碰撞次数':'GPS 平均误差';
    let checkpointTaken=false,decision='';
    let phase='ready',lastStamp=null,frame=0,accum=0,lastDisplay=-1000,disposed=false;
    const pressed=new Set(),keyboardHeld=new Set();
    const inputs={steer:0,brake:false,assist:true,param:config.start};
    const cp=checkpoints[ix];
    const decisionBox=document.createElement('div');decisionBox.className='decision-box';decisionBox.hidden=true;
    prompt.append(decisionBox);
    cp.choices.forEach(([name,val])=>{const b=document.createElement('button');b.type='button';b.className='primary';b.textContent=name;b.onclick=()=>{decision=name;value.value=val;setParams();decisionBox.hidden=true;start.hidden=false;run();};decisionBox.append(b);});
    function encounter(){phase='decision';release();pause.disabled=true;announce(cp.title,cp.text,'');start.hidden=true;decisionBox.hidden=false;next.hidden=true;}
    function announce(title,copy,action){prompt.hidden=false;prompt.querySelector('h2').textContent=title;prompt.querySelector('p').textContent=copy;start.textContent=action;}
    function setParams(){inputs.param=Number(value.value);inputs.assist=assist.checked;el('output').textContent=Number(value.value)+' '+config.unit;}
    value.oninput=setParams;assist.onchange=setParams;setParams();
    el('[data-sensor-power]').onchange=event=>{sim.setSensorEnabled(event.target.checked);display();draw();};
    el('.flight-tune').ontoggle=()=>{if(el('.flight-tune').open&&phase==='running')suspend();};
    const holdButtons=[...root.querySelectorAll('[data-hold]')];
    function updateInput(){const on=k=>pressed.has(k)||keyboardHeld.has(k);inputs.steer=Number(on('right'))-Number(on('left'));inputs.brake=on('brake');holdButtons.forEach(b=>b.classList.toggle('on',on(b.dataset.hold)));}
    function release(){pressed.clear();keyboardHeld.clear();updateInput();}
    for(const b of holdButtons){
      b.onpointerdown=e=>{if(phase!=='running')return;e.preventDefault();b.setPointerCapture(e.pointerId);pressed.add(b.dataset.hold);updateInput();};
      b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>{pressed.delete(b.dataset.hold);updateInput();};
    }
    function summary(){return ix===0?'平均偏差 '+fixed(s.metrics.meanTrackError,2)+' 米':ix===1?'碰撞 '+s.collisions+' 次 · 净空 '+fixed(s.metrics.nearestClearance,2)+' 米':'融合误差 '+fixed(s.metrics.meanEstimateError,2)+' 米 · GPS '+fixed(s.metrics.meanGpsError,2)+' 米';}
    function display(){
      el('[data-sensor]').textContent=s.sensor.sample;
      el('.distance').textContent=Math.floor(s.distance)+' / '+s.length+' m';
      el('[data-stat=speed]').textContent=Math.round((phase==='ready'||phase==='finished'?0:s.speed)*3.6)+' km/h';
      const reading=ix===0?s.metrics.meanTrackError:ix===1?s.metrics.nearestClearance:s.metrics.meanEstimateError;
      el('[data-stat=metric]').textContent=fixed(reading,2)+' m';
      el('[data-stat=extra]').textContent=ix===0?fixed(s.offroadTime)+' s':ix===1?s.collisions+' 次':fixed(s.metrics.meanGpsError,2)+' m';
      el('.sim-progress i').style.width=clamp(100*s.distance/s.length,0,100)+'%';
      el('.cockpit-flash').hidden=s.collisionFlash<=0;
    }
    function draw(){
      globalThis.drawValley(canvas,{...s,stage:config.kind,roadAt:sim.roadAt,targetX:ix===2?s.estimate:undefined,gps:ix===2?s.gps:undefined});
    }
    function finish(){
      phase='finished';release();display();pause.disabled=true;start.disabled=false;
      const prev=progress()[config.kind];const label=summary();
      const current={passed:!!(s.passed||prev?.passed),last:label,best:Math.max(s.score,prev?.best||0),score:s.score};
      saved[config.kind]=current;try{localStorage.setItem(key,JSON.stringify({...progress(),[config.kind]:current}));}catch{}
      if(s.passed&&story)story.onPassed();window.dispatchEvent(new Event('rally-finished'));announce(s.passed?'航段通过':'已抵达终点',s.passed&&story?story.mission.passed:label,'重新试驾');
      next.hidden=!s.passed||(!story&&ix===stages.length-1);next.textContent=ix===2?'前往站房':'前往下一航段';
      const result=el('.race-result');result.hidden=false;result.querySelector('h3').textContent=s.passed?'完成驾驶挑战':'再调一次参数';
      result.querySelector('p').textContent=(s.passed?'':'目标为'+s.objective+'。')+(decision?'你选择了「'+decision+'」。':'')+label+'。本次 '+s.score+' 分，耗时 '+fixed(s.elapsed,1)+' 秒。'+(prev?'上次结果为'+prev.last+'。':'再次挑战会在这里对比两次结果。');
    }
    function tick(stamp){
      frame=0;if(disposed||phase!=='running')return;
      if(lastStamp!==null)accum+=Math.min(.1,(stamp-lastStamp)/1000);
      lastStamp=stamp;
      while(accum>=1/60&&!s.done){sim.update(1/60,inputs);accum-=1/60;}
      draw();if(stamp-lastDisplay>100||s.done){display();lastDisplay=stamp;}
      if(s.done){finish();return;}if(!checkpointTaken&&s.distance>=cp.at){checkpointTaken=true;encounter();return;}frame=requestAnimationFrame(tick);
    }
    function ready(){
      cancelAnimationFrame(frame);release();sim.restart();checkpointTaken=false;decision='';decisionBox.hidden=true;start.hidden=false;lastStamp=null;accum=0;phase='ready';pause.disabled=true;
      next.hidden=true;el('.race-result').hidden=true;announce(config.name,config.mission,'开始试驾');display();draw();
    }
    function run(){
      if(phase==='finished')ready();if(phase==='running')return;
      phase='running';el('.flight-tune').open=false;lastStamp=null;prompt.hidden=true;pause.disabled=false;pause.textContent='暂停';if(document.activeElement instanceof HTMLElement)document.activeElement.blur();frame=requestAnimationFrame(tick);
    }
    function suspend(){
      if(phase!=='running')return;phase='paused';cancelAnimationFrame(frame);release();pause.textContent='继续';
      announce('已暂停','可以调整参数，再从当前位置继续。','继续行驶');
    }
    function toggle(){if(phase==='paused')run();else if(phase==='running')suspend();}
    start.onclick=run;pause.onclick=toggle;restart.onclick=ready;next.onclick=()=>{if(story){story.next();return;}if(ix<stages.length-1)location.hash='drive/'+stages[ix+1].kind;};
    const keys={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'brake'};
    function keydown(e){
      if(e.altKey||e.ctrlKey||e.metaKey||e.target.matches('input[type=range],select,textarea'))return;
      if(e.code==='KeyP'&&!e.repeat){toggle();e.preventDefault();return;}
      if(phase!=='running'||!keys[e.code])return;
      if(e.code==='Space'&&e.target.matches('input,button,a'))return;
      e.preventDefault();keyboardHeld.add(keys[e.code]);updateInput();
    }
    function keyup(e){if(keys[e.code]){keyboardHeld.delete(keys[e.code]);updateInput();}}
    function hidden(){if(document.hidden)suspend();}
    document.addEventListener('keydown',keydown);document.addEventListener('keyup',keyup);
    window.addEventListener('blur',suspend);document.addEventListener('visibilitychange',hidden);
    const observer=new ResizeObserver(()=>{if(phase!=='running')draw();});observer.observe(canvas);ready();if(story)run();
    return ()=>{removeFull();disposed=true;cancelAnimationFrame(frame);release();observer.disconnect();document.removeEventListener('keydown',keydown);document.removeEventListener('keyup',keyup);window.removeEventListener('blur',suspend);document.removeEventListener('visibilitychange',hidden);};
  }
  globalThis.mountDrive=mountDrive;
})();
