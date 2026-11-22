(() => {
  'use strict';
  const geometries={
    crest:'<path d="M2 19 11 3l4 7-3 5-2-3-4 7Zm11 0 5-9 5 9z"/>',
    play:'<path d="m7 4 12 8-12 8z"/>',map:'<path d="m2 5 7-3 6 3 7-3v17l-7 3-6-3-7 3zM9 2v17m6-14v17"/>',
    pause:'<path d="M7 4v16m10-16v16" stroke-width="4"/>',sound:'<path d="M3 9h4l5-5v16l-5-5H3zm13 0q4 3 0 6m3-10q7 7 0 14"/>',
    scan:'<circle cx="12" cy="12" r="8"/><path d="M12 12 20 5m-8 4v3h3"/>',
    pin:'<path d="m12 2 8 8-8 12-8-12z"/><circle cx="12" cy="10" r="2"/>',
    back:'<path d="m14 5-7 7 7 7"/>',next:'<path d="m9 5 7 7-7 7"/>',
    wheel:'<circle cx="12" cy="12" r="9"/><path d="m4 9 8 3 8-3m-8 3v8"/>',
    check:'<path d="m3 13 6 6L21 5"/>',speed:'<path d="M3 17a9 9 0 1 1 18 0m-9-3 5-7"/>',
    up:'<path d="m5 14 7-7 7 7"/>',brake:'<path d="M5 6h14v12H5zM9 9v6m6-6v6"/>',
    radio:'<path d="M9 8a6 6 0 0 0 0 8m7-8a6 6 0 0 1 0 8M6 4a11 11 0 0 0 0 16m13-16a11 11 0 0 1 0 16"/><circle cx="12" cy="12" r="1"/>'
  };
  const icon=k=>'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(geometries[k]||'')+'</svg>';
  const key=k=>'<kbd>'+k+'</kbd>';
  const clamp=(n,a,b)=>Math.max(a,Math.min(n,b));
  const missions={
    rescue:{zone:'01',title:'断讯山道',radio:'雨量站的电芯只够再发一次报。把备用电芯送上山，我在山口接应你。',objective:'把电芯送到上游雨量站',skill:'激光扫描 / A* / 纯追踪'},
    survey:{zone:'02',title:'寻找失联信标',radio:'雾里还有一支测绘队。我们只收得到信标的距离。在三个不同位置测距，就能交会出它的坐标。',objective:'用三次测距找到并回收信标',skill:'测距交会定位'},
    freight:{zone:'03',title:'弯道送件',radio:'仪器舱里装的是校准好的倾角仪。走七道检验门，每次过门都要把时速降到 32 公里以内。',objective:'稳速穿过七道检验门',skill:'速度与路径跟踪训练'}
  };
  const memory='robot-atlas.canyon-3d.v1';
  function records(){try{return JSON.parse(localStorage.getItem(memory))||{};}catch{return {};}}
  function save(id,elapsed){const p=records();p[id]={runs:(p[id]?.runs||0)+1,best:Math.min(elapsed,p[id]?.best||Infinity)};try{localStorage.setItem(memory,JSON.stringify(p));}catch{}}
  function crest(){return '<span class="cg-crest">'+icon('crest')+' <b>峡谷勘测队</b></span>';}
  function lobby(root){
    const info=records(),order=['rescue','survey','freight','arm-ik','arm-obstacles','n-arm','drone','landing'],go=order.find(id=>!info[id])||'rescue';
    const fieldNext=order.every(id=>info[id])?FieldGame.nextField():null;
    const link=fieldNext?'#field/'+fieldNext.id:missions[go]?'#run/'+go:'#field/'+go;
    const chapter=fieldNext?'峡谷重建 · '+fieldNext.title:missions[go]?'第 '+missions[go].zone+' 航段 · '+missions[go].title:RigModel.meta[go][1]+' · '+RigModel.meta[go][0];
    root.innerHTML='<section class="cg-menu"><canvas class="cg-surface" aria-hidden="true"></canvas><div class="cg-menu-wash"></div><div class="cg-top">'+crest()+'<button class="screen-toggle"></button></div><div class="cg-menu-title"><div class="cg-code"><i></i> CANYON ECHO</div><h1>峡谷回声</h1><p>山地救援驾驶行动</p></div><div class="cg-menu-controls"><a class="cg-launch" href="'+link+'">'+icon('play')+'<span>'+(!info.rescue?'开始行动':order.every(id=>info[id])&&!fieldNext?'重新出发':'继续行动')+'<small>'+chapter+'</small></span></a><a class="cg-menu-link" href="#jobs">'+icon('map')+'行动地图</a></div><div class="cg-menu-bottom"><span>勘测车 <b>R–07</b></span><a href="#library">算法手册</a></div></section>';
    const st=CanyonRun.create().s;st.camera='menu';const scene=CanyonScene.create(root.querySelector('canvas')),full=expedition.mountFullButton(root.querySelector('.screen-toggle'));
    let frame,last=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    function draw(t){if(!document.hidden&&(t-last>32||!last)){st.time=reduced?0:t/1000;scene.draw(st);last=t;}frame=requestAnimationFrame(draw);}frame=requestAnimationFrame(draw);
    return ()=>{cancelAnimationFrame(frame);scene.dispose();full();};
  }
  const zones=[
    {id:'survey',name:'岸线勘测',x:25,y:42,tag:'定位与测绘',run:'survey'},
    {id:'routes',name:'山路开拓',x:52,y:28,tag:'搜索与规划',run:'rescue'},
    {id:'driving',name:'峡谷运输',x:64,y:60,tag:'转向与控制',run:'freight'},
    {id:'machines',name:'前线工程',x:39,y:73,tag:'机器人操控',run:null}
  ];
  function hub(root,param){
    let zone=zones.find(z=>z.id===param)||zones[1];
    root.innerHTML='<section class="cg-map-screen"><div class="cg-top"><a class="cg-nav" href="#lobby">'+icon('back')+'大厅</a><h1>行动地图</h1><button class="screen-toggle"></button></div><div class="cg-map-layout"><div class="cg-terrain"><canvas aria-hidden="true"></canvas><div class="cg-map-markers"></div><span class="cg-map-legend">选择作业区</span></div><aside class="cg-manifest"><div class="cg-sector-title"><small></small><h2></h2></div><div class="cg-job-index"></div></aside></div></section>';
    const map=root.querySelector('canvas'),pick=root.querySelector('.cg-map-markers'),menu=root.querySelector('.cg-job-index'),full=expedition.mountFullButton(root.querySelector('.screen-toggle'));
    const done=records();let field={};try{field=JSON.parse(localStorage.getItem('robot-atlas.field-ops.v1'))||{};}catch{}
    function redraw(){OpsMap.draw(map,zone.id);}
    for(const [i,z] of zones.entries()){const b=document.createElement('button');b.style.left=z.x+'%';b.style.top=z.y+'%';b.dataset.id=z.id;b.innerHTML='<i>'+String(i+1).padStart(2,'0')+'</i><span>'+z.name+'</span>';b.onclick=()=>{zone=z;history.replaceState(null,'','#jobs/'+zone.id);render();};pick.append(b);}
    function render(){
      root.querySelector('.cg-sector-title small').textContent=zone.tag;root.querySelector('.cg-sector-title h2').textContent=zone.name;
      for(const el of pick.children)el.setAttribute('aria-pressed',el.dataset.id===zone.id);
      menu.replaceChildren();
      function add(href,title,sub,isDone,featured){const a=document.createElement('a');a.href=href;a.className=featured?'cg-sortie featured':'cg-sortie';a.innerHTML='<i>'+icon(isDone?'check':featured?'wheel':'pin')+'</i><span><strong></strong><small></small></span>'+icon('next');a.querySelector('strong').textContent=title;a.querySelector('small').textContent=sub;menu.append(a);}
      if(zone.run)add('#run/'+zone.run,missions[zone.run].title,'3D 驾驶行动 · '+missions[zone.run].skill,done[zone.run],true);

      const order=['rrt','potential','coverage','momo'];
      const rank=m=>order.includes(m.id)?order.indexOf(m.id):10;
      for(const m of FieldMissions.filter(m=>m.region===zone.id).sort((a,b)=>rank(a)-rank(b))){const rig=Object.hasOwn(RigModel.meta,m.id);add('#field/'+m.id,m.title,(rig||m.native?'3D 作业 · ':order.includes(m.id)?'外勤专线 · ':'三维实训 · ')+(m.id==='n-arm'?'三连杆末端位姿逆解':m.algorithm),field[m.id],rig||m.native);}
      menu.scrollTop=0;redraw();
    }
    const resize=new ResizeObserver(redraw);resize.observe(map);render();return ()=>{full();resize.disconnect();OpsMap.dispose?.(map);};
  }
  function run(root,kind){
    const meta=missions[kind]||missions.rescue;let model=CanyonRun.create(kind),s=model.s;
    root.innerHTML='<section class="cg-run"><canvas class="cg-surface" aria-label="三维峡谷驾驶场景"></canvas><div class="cg-vignette"></div><div class="cg-run-top"><span class="cg-squad">'+icon('crest')+' R–07</span><div class="cg-compass"><span>航向</span><b></b></div><button class="cg-icon-button" data-pause aria-label="暂停菜单">'+icon('pause')+'</button></div><div class="cg-objective"><small></small><h1></h1><p></p></div><div class="cg-pins"></div><div class="cg-target" hidden><i></i><span></span></div><div class="cg-lower"><div class="cg-instruct" role="status"><b></b><span></span></div><div class="cg-drivebar"><div class="cg-pads"><button data-pad="left" aria-label="向左转">'+icon('back')+'</button><button data-pad="right" aria-label="向右转">'+icon('next')+'</button></div><div class="cg-metric"><strong>00</strong><span>km/h</span></div><div class="cg-pads pedals"><button data-pad="reverse" aria-label="倒车">倒车</button><button data-pad="brake" aria-label="刹车">'+icon('brake')+'</button><button data-pad="gas" aria-label="按住油门">'+icon('up')+'油门</button></div></div><div class="cg-actionbar"><button class="cg-action" data-act></button><button class="cg-minor" data-view>切换视角</button></div></div><div class="cg-overlay" hidden></div></section>';
    const $=x=>root.querySelector(x),board=$('.cg-run'),surface=$('canvas'),scene=CanyonScene.create(surface),pins=$('.cg-pins'),targetBox=$('.cg-target'),panel=$('.cg-overlay'),act=$('[data-act]'),view=$('[data-view]'),hint=$('.cg-instruct'),obj=$('.cg-objective');
    let frame,last=0,lastPaint=-1,paused=false,saved=false,active=true,actionStamp='',overlayType='',snapshotKey='';
    let tape=MissionDebrief.tape(),reportOff=()=>{},lastRecord='';
    const held={},remove=[],pointerIds=new Map();
    function clearInput(){for(const k of Object.keys(held))delete held[k];pointerIds.clear();for(const b of root.querySelectorAll('[data-pad]'))b.classList.remove('pressed');}
    function listen(el,type,fn,options){el.addEventListener(type,fn,options);remove.push(()=>el.removeEventListener(type,fn,options));}
    function restart(){reportOff();tape=MissionDebrief.tape();lastRecord='';model=CanyonRun.create(kind);s=model.s;saved=paused=false;snapshotKey=actionStamp='';pins.replaceChildren();overlay('intro');refresh();}
    function overlay(type){
      overlayType=type;panel.hidden=!type;board.classList.toggle('cg-modal-open',!!type);if(!type)return;
      clearInput();
      if(type==='intro')panel.innerHTML='<div class="cg-transmission"><div class="cg-code">'+icon('radio')+' 调度电台 · 第 '+meta.zone+' 航段</div><h2>'+meta.title+'</h2><p>“'+meta.radio+'”</p><button class="cg-launch" data-go>'+icon('wheel')+'接管车辆</button><a class="cg-menu-option" href="#jobs">行动地图</a></div>';
      if(type==='pause')panel.innerHTML='<div class="cg-transmission"><div class="cg-code">'+icon('pause')+' R–07</div><h2>行动暂停</h2><button data-go class="cg-launch">'+icon('play')+'继续行动</button><button data-respawn class="cg-menu-option">返回检查点</button><button data-retry class="cg-menu-option">重开本次行动</button><a href="#jobs" class="cg-menu-option">行动地图</a><a href="#lobby" class="cg-menu-option">返回大厅</a></div>';
      if(type==='done'){const next=kind==='rescue'?'survey':kind==='survey'?'freight':'arm-ik';
        panel.innerHTML='';panel.hidden=true;
        reportOff=MissionDebrief.show(board,{id:kind,title:meta.title,summary:s.summary,plan:s.plan,prediction:s.prediction,history:tape.items,
          lesson:kind==='rescue'?'astar':null,
          next:{href:missions[next]?'#run/'+next:'#field/'+next,text:missions[next]?'下一航段 · '+missions[next].title:'下一任务 · 换装电芯'},
          again:restart});return;

      }
      const go=panel.querySelector('[data-go]');if(go)go.onclick=()=>{if(overlayType==='intro')model.act();paused=false;overlay('');last=0;refresh();};
      const retry=panel.querySelector('[data-retry]');if(retry)retry.onclick=restart;
      const spawn=panel.querySelector('[data-respawn]');if(spawn){spawn.hidden=!['drive','recover','dock'].includes(s.mode);spawn.onclick=()=>{model.resetCar();paused=false;overlay('');};}
      if(go)go.focus({preventScroll:true});
    }
    function pause(){if(s.mode==='done')return;if(s.mode==='intro'){location.hash='jobs';return;}paused=!paused;clearInput();overlay(paused?'pause':'');last=0;}
    $('[data-pause]').onclick=pause;
    function action(){if(!overlayType&&!paused){model.act();refresh();}}
    function switchView(){if(!overlayType&&['drive','auto','dock','recover'].includes(s.mode)){s.camera=s.camera==='tactical'?'chase':'tactical';refresh();}}
    act.onclick=action;view.onclick=switchView;
    const keyboard={w:'gas',arrowup:'gas',s:'brake',arrowdown:'reverse',a:'left',arrowleft:'left',d:'right',arrowright:'right'};
    listen(window,'keydown',e=>{const k=e.key.toLowerCase();if(e.altKey||e.metaKey||e.ctrlKey)return;
      if(k==='escape'&&!e.repeat){e.preventDefault();pause();return;}if(overlayType||e.target?.matches?.('select,input'))return;
      if(keyboard[k]){e.preventDefault();held[keyboard[k]]=true;}
      if(k===' '||k==='e'){e.preventDefault();if(!e.repeat)action();}
      if(k==='v'&&!e.repeat)switchView();
    });listen(window,'keyup',e=>{const k=keyboard[e.key.toLowerCase()];if(k)held[k]=false;});
    listen(window,'blur',()=>{clearInput();if(!overlayType&&!paused)pause();});listen(document,'visibilitychange',()=>{if(document.hidden){clearInput();if(!overlayType&&!paused)pause();}last=0;});
    for(const btn of root.querySelectorAll('[data-pad]')){
      const v=btn.dataset.pad;btn.onpointerdown=e=>{if(overlayType)return;e.preventDefault();pointerIds.set(e.pointerId,v);btn.setPointerCapture(e.pointerId);held[v]=true;btn.classList.add('pressed');};
      btn.onlostpointercapture=btn.onpointercancel=btn.onpointerup=e=>{pointerIds.delete(e.pointerId);held[v]=[...pointerIds.values()].includes(v);btn.classList.toggle('pressed',held[v]);};
    }
    const planning=PlanningHUD.create(board,pins,scene,()=>model,refresh);
    function place(el,v){if(!v||!v.visible){el.style.visibility='hidden';return;}el.style.visibility='';el.style.left=v.x+'px';el.style.top=v.y+'px';}
    function guidance(){
      if(s.mode==='scan')return ['遥控信号丢失','旧地图显示前方可通行。启动激光雷达，检查落石。','启动雷达'];
      if(s.mode==='sweeping')return ['扫描中','车载雷达正在测量前方路面。',''];
      if(s.mode==='plan'){
        if(!s.prediction)return ['哪条路最划算？','三条支路都通向雨量站。先点路标留下预测，再观察搜索。',''];
        if(!s.plan)return ['检查你的预测','珊瑚色是落石。点单步或启动 A*，观察候选路口。','启动 A*'];
        if(s.frameIndex<s.plan.astar.frames.length-1)return ['搜索前沿','金色为当前路口，青色为候选。A* 每次从候选中取 f 最小者。',''];
        return s.plan.energy>90?['电量不足','拿起防滑板，再点一段路铺下。重新搜索，看看它能省多少电。','']:['路线可执行','预算内有路了。接入自动驾驶，验证刚才规划的路线。','执行路线'];
      }
      if(s.mode==='auto')return ['自主导航','控制器瞄准前方路线，自动修正方向。可以切换到俯视观察。',''];
      if(s.mode==='dock')return ['雨量站就在前面','开进站台标记，松开油门，停车后接电。','接入电芯'];
      if(s.mode==='recover')return ['信标已定位','开到三次测距的交点，停车回收。','回收信标'];
      if(kind==='survey')return ['测距 '+s.samples.length+' / 3','开向菱形测站，松开油门，停稳后测距。','测量距离'];
      if(kind==='freight'){
        const speed=s.rover.speed,range=Math.hypot(s.rover.x-s.goal.x,s.rover.z-s.goal.z);
        const braking=Math.max(0,(speed*speed-(32/3.6)**2)/(2*22));
        const tip=braking>0&&range<3.4+braking+speed*.65?'现在刹车。按 S 或踩下刹车，把入门速度降到 32 km/h。':'对准发光检验门。入门时限速 32 km/h。';
        return ['检验门 '+Math.min(7,s.gateIndex+1)+' / 7',tip,''];
      }
      return ['驶出山口','按住油门或 W 前进。A / D 转向，S 刹车。',''];
    }
    function refresh(){
      const [title,tip,actionName]=guidance(),message=s.hintTime>0?s.hint:tip;
      const stateKey=[s.mode,title,message,actionName,s.camera,overlayType].join('|');
      if(stateKey!==snapshotKey){
        snapshotKey=stateKey;obj.querySelector('small').textContent='航段 '+meta.zone+' / '+meta.title;obj.querySelector('h1').textContent=title;obj.querySelector('p').textContent=meta.objective;
        hint.querySelector('b').textContent=s.mode==='scan'?'链路中断':s.hintTime>0?'车载反馈':'行动指引';hint.querySelector('span').textContent=message;
        act.hidden=!actionName;if(actionName){act.innerHTML=icon(s.mode==='scan'||kind==='survey'?'scan':'play')+'<span>'+actionName+'</span>'+key('E');}
        view.hidden=!['drive','auto','dock','recover'].includes(s.mode);view.textContent=s.camera==='chase'?'俯视地图':'回到车后';
        const steering=['drive','dock','recover'].includes(s.mode);board.classList.toggle('cg-stationary',!steering);
        board.classList.toggle('cg-planning',s.mode==='plan');
      }
      const speed=Math.round(Math.abs(s.rover.speed)*3.6),heading=(Math.round(s.rover.yaw*180/Math.PI)+360)%360;
      const readout=speed+' / '+heading;if(readout!==actionStamp){$('.cg-metric strong').textContent=String(speed).padStart(2,'0');$('.cg-compass b').textContent=String(heading).padStart(3,'0')+'°';actionStamp=readout;}
      if(s.mode==='done'&&!saved){saved=true;save(kind,s.elapsed);overlay('done');}
    }
    function draw(t){
      if(!active)return;const dt=last?Math.min((t-last)/1000,.08):0;last=t;
      if(!document.hidden&&(!paused||lastPaint<0)){
        if(!paused)for(let n=0;n<3;n++)model.tick(dt/3,held);
        if(t-lastPaint>=1000/45||lastPaint<0){
          scene.draw(s);lastPaint=t;
          const marker=[s.mode,s.gateIndex,s.samples.length].join('-');
          if(marker!==lastRecord){
            lastRecord=marker;
            const name=({intro:'接收任务',drive:kind==='survey'?'采集测距':'驾驶',scan:'遥控中断',plan:'路径搜索',auto:'驶入规划路线',dock:'接近站台',recover:'测距交会',done:'交接完成'})[s.mode];
            if(name)tape.mark(name,kind==='freight'?'已过 '+s.gateIndex+' 道门':kind==='survey'?'有效测距 '+s.samples.length+' 次':'');
          }
          tape.capture(surface);refresh();planning.sync(overlayType);
          targetBox.hidden=!!overlayType||!['drive','dock','recover'].includes(s.mode);
          if(!targetBox.hidden){const p=scene.project(s.goal.x,4.2,s.goal.z);place(targetBox,p);targetBox.querySelector('span').textContent=Math.round(Math.hypot(s.rover.x-s.goal.x,s.rover.z-s.goal.z))+' m';}
        }
      }frame=requestAnimationFrame(draw);
    }
    overlay('intro');refresh();frame=requestAnimationFrame(draw);
    return ()=>{active=false;reportOff();cancelAnimationFrame(frame);clearInput();remove.forEach(fn=>fn());scene.dispose();};
  }
  globalThis.CanyonGame={lobby,hub,run,icon,save};
})();
