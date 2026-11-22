(() => {
  'use strict';
  const key = 'robot-atlas.rescue.v1';
  const model = globalThis.NavModel;
  const chapters = [
    ['激光测距','雾中探路'],
    ['A* 搜索','修复航线'],
    ['纯追踪','过弯送电']
  ];
  const fresh = variant => ({phase:'intro',variant,observations:{},expanded:[],route:[],lookahead:110,lastAttempt:null});
  let memory=fresh(0);
  function load(){
    try{const d=JSON.parse(localStorage.getItem(key));
      if(d&&['intro','remote','brief','scan','plan','track','delivery','end'].includes(d.phase)&&[0,1].includes(d.variant))
        memory={...fresh(d.variant),...d};
    }catch{}
    return memory;
  }
  function save(d){memory=d;try{localStorage.setItem(key,JSON.stringify(d));}catch{}}
  const metres=u=>(u*model.metersPerUnit).toFixed(1);
  const line=pts=>pts.map(p=>p.x.toFixed(2)+','+p.y.toFixed(2)).join(' ');
  const node=id=>model.nodes[id];
  const shortName=id=>id==='S'?'起点':id==='G'?'雨量站':id;
  const navIcons='<a href="#lobby" class="exit-nav">‹ 大厅</a><button class="screen-toggle" type="button"></button>';
  function mount(root,requested){
    let d=load(),disposed=false,clearScene=()=>{};
    if(requested==='replay'&&d.phase==='end'){d=fresh(1-d.variant);save(d);}
    const $=sel=>root.querySelector(sel);
    function next(phase){d.phase=phase;save(d);drawScene();}
    function teardown(){clearScene();clearScene=()=>{};}
    function cinematic(stage,title,lines,button,action){
      root.innerHTML='<section class="rescue-film '+stage+'"><div class="cine-top">'+navIcons+'</div><article class="film-card"><small class="speaker"></small><h1></h1><p></p><button class="launch" type="button"></button></article></section>';
      $('.speaker').textContent=stage==='story'?'基地通讯 · 发车前':'车载任务记录';
      $('.film-card h1').textContent=title;$('.film-card p').textContent=lines;
      const btn=$('.launch');btn.textContent=button;btn.onclick=action;
      clearScene=expedition.mountFullButton($('.screen-toggle'));
    }
    function remote(){
      cinematic('uplink','总部遥控台','备用电芯已经装车。当前由总部遥控，试着发送前进指令。','发送前进指令',start);
      $('.speaker').textContent='总部链路 · 在线';
      const shell=$('.rescue-film'),canvas=document.createElement('canvas');canvas.className='uplink-camera';shell.prepend(canvas);
      const sim=createDriveStage('tracking');
      let frame=0,last=0,elapsed=0;const off=clearScene;
      function paint(){drawValley(canvas,{...sim.state,roadAt:sim.roadAt,stage:'tracking',sensor:{active:false}});}
      const resize=new ResizeObserver(paint);resize.observe(canvas);paint();
      clearScene=()=>{cancelAnimationFrame(frame);resize.disconnect();off();};
      function start(){
        const btn=$('.launch');btn.disabled=true;btn.textContent='指令已送达';
        $('.film-card p').textContent='探测车驶入岩壁阴影。车载摄像头最后一次回传了前方画面。';
        function step(t){
          if(disposed)return;
          const dt=last?Math.min(.1,(t-last)/1000):0;last=t;elapsed+=dt;sim.update(dt,{assist:true,param:12});paint();
          $('.speaker').textContent='总部链路 · '+Math.max(0,Math.round(100-elapsed*40))+'%';
          if(elapsed<2.5){frame=requestAnimationFrame(step);return;}
          shell.classList.add('lost-link');$('.film-card h1').textContent='图传中断';
          $('.film-card p').textContent='最后一帧停在峡谷入口。向小车发送转向指令，检查它是否还能收到。';
          btn.disabled=false;btn.textContent='发送转向指令';btn.onclick=()=>{
            $('.speaker').textContent='指令未送达 · 车端保护停车';
            $('.film-card h1').textContent='切换到车载系统';
            $('.film-card p').textContent='总部已经无法操纵方向盘。接下来，你在车端处理传感器读数，让小车自己找到雨量站。';
            btn.textContent='启动车载自动模式';btn.onclick=()=>next('brief');
          };
        }
        frame=requestAnimationFrame(step);
      }
    }
    function terrain(chapter){
      const [method,title]=chapters[chapter];
      root.innerHTML='<section class="ops"><div class="ops-head"><a href="#lobby" class="exit-nav">‹ 大厅</a><div><small>车载导航 / '+(chapter+1)+' OF 3</small><h1>'+title+'</h1></div><button class="screen-toggle"></button></div><div class="ops-body"><section class="terrain" aria-label="峡谷路网俯视图"><div class="terrain-frame"><canvas aria-hidden="true"></canvas><svg class="tactical" viewBox="0 0 900 540" aria-label="导航操作地图"></svg><canvas class="unit-layer" aria-hidden="true"></canvas></div><div class="map-key"><span>俯视导航</span><span>起点 S　/　雨量站 G</span></div></section><aside class="mission-console"><small class="method">'+method+'</small><h2 data-goal></h2><p data-instruction></p><div class="mission-actions"></div><div class="mission-feedback" role="status"></div></aside></div></section>';
      const canvas=$('.terrain canvas'),overlay=$('.tactical'),actions=$('.mission-actions'),feedback=$('.mission-feedback');
      const full=expedition.mountFullButton($('.screen-toggle'));
      const view={rover:{...node('S'),heading:0},rock:d.blocked?model.rocks(d.variant)[0]:null};
      const unit=$('.unit-layer');
      function paint(){NavArt.render(canvas,{rock:view.rock});NavArt.renderRover(unit,view.rover);}
      const size=new ResizeObserver(paint);size.observe(canvas);paint();
      let release=()=>{};
      clearScene=()=>{size.disconnect();full();release();};
      function button(label,fn,cls='command'){
        const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=label;b.onclick=fn;actions.append(b);return b;
      }
      function setGoal(goal,instruction){$('[data-goal]').textContent=goal;$('[data-instruction]').textContent=instruction;}
      function message(text,ok=false){feedback.textContent=text;feedback.classList.toggle('ok',ok);}
      function pin(id,kind='idle',label=id){
        const p=node(id);
        return '<g class="pin '+kind+'" data-id="'+id+'" transform="translate('+p.x+' '+p.y+')"><circle class="hit" r="25"/><circle r="14"/><text y="5">'+label+'</text></g>';
      }
      function routeLine(route,cls){return '<polyline class="'+cls+'" points="'+line(route.map(node))+'"/>';}
      function barrier(){
        if(!d.blocked)return '';
        const p=model.rocks(d.variant)[0];return '<g transform="translate('+p.x+' '+p.y+')"><circle class="closure" r="14"/><path class="cross" d="M-5-5 5 5M-5 5 5-5"/></g>';
      }
      return {view,paint,overlay,actions,feedback,button,setGoal,message,pin,routeLine,barrier,onDispose(fn){release=fn;}};
    }
    function survey(){
      const ui=terrain(0),from=node('S');let angle=model.laneAngle('A'),beam=null,locked=false;
      ui.setGoal('标出封闭的岔路','点地图上的 A 或 B 瞄准，再发射激光。比较两条路的回波，给塌方的一侧放置封路标记。');
      const readings=document.createElement('div');readings.className='radar-readings';
      ui.actions.append(readings);
      const aimA=ui.button('瞄准 A',()=>aim('A')), aimB=ui.button('瞄准 B',()=>aim('B'));
      const fire=ui.button('发射激光',pulse,'command main-command');
      const markA=ui.button('封闭 A 路',()=>mark('A')),markB=ui.button('封闭 B 路',()=>mark('B'));
      let aimed=false;
      function coach(){
        if(locked)return;
        if(!d.observations.A&&!d.observations.B){
          ui.setGoal('标出封闭的岔路',aimed?'上手练习 2/2 · 按「发射激光」。光束碰到岩石会提前折返，仪表给出距离。':'上手练习 1/2 · 点击俯视图的 A 或 B 路标，转动车头的激光探头。');
        }else if(!d.observations.A||!d.observations.B){
          ui.setGoal('自己测一次另一条路','已取得一条测距记录。现在独立瞄准另一条岔路并测距，对比两份记录。');
        }else{
          ui.setGoal('给塌方的一侧放标记','一条路出现了近处回波，另一条在 55 米量程内没有回波。根据两次实测选择封路位置。');
        }
      }
      let onward;
      function aim(id){if(locked)return;angle=model.laneAngle(id);aimed=true;beam=null;paint();}
      function paint(){
        const max=beam?.range??model.rangeMax;
        const x=from.x+max*Math.cos(angle),y=from.y+max*Math.sin(angle);
        ui.view.rover={...from,heading:angle};ui.paint();
        const history=Object.values(d.observations).map(obs=>{
          const r=model.scan(d.variant,obs.angle);return '<path class="old-ray" d="M'+from.x+' '+from.y+' L'+r.point.x+' '+r.point.y+'"/>';
        }).join('');
        const contact=beam?.hit?'<circle class="echo" cx="'+x+'" cy="'+y+'" r="9"/>':'';
        const fog=locked?'':'<defs><radialGradient id="mist"><stop offset="0" stop-color="#c7dbd2" stop-opacity=".9"/><stop offset=".6" stop-color="#b7d0cb" stop-opacity=".78"/><stop offset="1" stop-color="#c4d5ce" stop-opacity="0"/></radialGradient><mask id="surveyFog"><rect width="900" height="540" fill="white"/>'+Object.values(d.observations).map(o=>{const r=model.scan(d.variant,o.angle);return '<path d="M'+from.x+' '+from.y+' L'+r.point.x+' '+r.point.y+'" stroke="black" stroke-width="24" stroke-linecap="round"/>';}).join('')+'</mask></defs><g mask="url(#surveyFog)" pointer-events="none"><ellipse cx="247" cy="336" rx="145" ry="85" fill="url(#mist)"/><ellipse cx="207" cy="390" rx="125" ry="68" fill="url(#mist)"/></g>';
        ui.overlay.innerHTML=fog+history+'<path class="'+(beam?'pulse-ray':'aim-ray')+'" d="M'+from.x+' '+from.y+' L'+x+' '+y+'"/>'+contact+ui.pin('A','pick')+ui.pin('B','pick')+ui.pin('G','goal')+ui.barrier();
        readings.innerHTML=['A','B'].map(id=>{
          const obs=d.observations[id],val=obs?obs.hit?metres(obs.range)+' m':'55 m 内无回波':'待测';
          return '<div><small>'+id+' 路测距</small><strong>'+val+'</strong></div>';
        }).join('');
        markA.disabled=markB.disabled=locked||!d.observations.A||!d.observations.B;
        aimA.disabled=aimB.disabled=locked;fire.disabled=locked||(!aimed&&!d.observations.A&&!d.observations.B);coach();
      }
      function pulse(){
        if(locked)return;
        aimed=true;beam=model.scan(d.variant,angle);
        if(beam.certified){d.observations[beam.lane]={range:beam.range,angle,hit:beam.hit};save(d);}
        ui.message(beam.certified?(beam.hit?'收到近处回波。光束在岩石表面折返。':'量程内没有回波。光束越过了这个路口。'):'这束光没有对准岔路。点 A 或 B 路标重新瞄准。');
        paint();
      }
      function mark(id){
        if(!d.observations.A||!d.observations.B||locked)return;
        if(!d.observations[id].hit){ui.message(id+' 路没有近处回波。比较另一条路的测距，再放标记。');return;}
        locked=true;ui.setGoal('障碍已写入地图','你用实际的回波找到了封路位置。下一关可以从这份观测继续规划。');d.blocked=id;save(d);ui.view.rock=model.rocks(d.variant)[0];paint();
        ui.message('已把 S–'+id+' 标为不可通行。这条封路记录将写入规划器。',true);
        onward=ui.button('把测绘结果交给规划器',()=>next('plan'),'command main-command');onward.focus({preventScroll:true});
      }
      ui.overlay.onclick=e=>{
        if(locked)return;
        const id=e.target.closest('[data-id]')?.dataset.id;
        if(id==='A'||id==='B'){aim(id);return;}
        const rect=ui.overlay.getBoundingClientRect();
        aimed=true;angle=Math.atan2((e.clientY-rect.top)*540/rect.height-from.y,(e.clientX-rect.left)*900/rect.width-from.x);beam=null;paint();
      };
      if(d.blocked&&d.observations[d.blocked]?.hit)mark(d.blocked);else paint();
    }
    function planning(){
      if(!['A','B'].includes(d.blocked)){next('scan');return;}
      const ui=terrain(1),search=model.makeSearch(d.blocked);
      for(const id of d.expanded)if(!search.expand(id).accepted)break;
      let showSum=false,selected=null;
      ui.setGoal('推演下一步搜索','点一个候选路口查看路线。青线的 g 是走到这里的代价，金色虚线的 h 是到站的直线估计。展开 g + h 最小的候选。');
      function autoSingles(){while(!search.done&&search.frontier.length===1)search.expand(search.frontier[0].id);}
      function choose(id){
        if(search.done)return;
        const f=search.frontier.find(e=>e.id===id);if(!f){ui.message('选择带金色圆环的候选路口。');return;}
        const best=Math.min(...search.frontier.map(e=>e.f));
        const result=search.expand(id);
        if(!result.accepted){ui.message((f.h===Math.min(...search.frontier.map(e=>e.h))?'这里离终点最近，但走到这里已经花了更多代价。':'')+id+' 的总代价是 '+f.g+' + '+f.h+' = '+f.f+'。还有候选路口的总代价为 '+best+'，先检查它。');return;}
        selected=null;ui.message('已检查 '+id+'，并更新了相邻路口的已走代价。',true);autoSingles();render();
      }
      function render(){
        d.expanded=search.closed;save(d);
        ui.actions.replaceChildren();
        const front=search.frontier;
        const pins=Object.keys(model.nodes).map(id=>ui.pin(id,search.closed.includes(id)?'visited':front.some(o=>o.id===id)?'pick':id==='G'?'goal':'idle')).join('');
        const tree=front.filter(n=>n.parent).map(n=>ui.routeLine([n.parent,n.id],'search-edge')).join('');
        const preview=selected?ui.routeLine(search.pathTo(selected),'cost-so-far')+ui.routeLine([selected,'G'],'cost-estimate'):'';
        ui.overlay.innerHTML=tree+preview+(search.done?ui.routeLine(search.route,'planned-path'):'')+pins+ui.barrier();
        if(search.done){
          d.route=search.route;save(d);ui.setGoal('绕行路线已生成','青色折线是沿搜索记录回溯得到的路线。小车下一关将沿这条折线行驶。');
          ui.message('路线 '+search.route.join(' › ')+'，已避开你封闭的 '+d.blocked+' 路。',true);
          ui.button('把路线发送给车轮控制器',()=>next('track'),'command main-command');return;
        }
        const row=document.createElement('div');row.className='cost-list';ui.actions.append(row);
        front.forEach(f=>{
          const b=document.createElement('button');b.className='candidate';b.innerHTML='<b>'+f.id+'</b><span>g '+f.g+'　+　h '+f.h+(showSum?'　= '+f.f:'')+'</span>';b.setAttribute('aria-pressed',String(selected===f.id));b.onclick=()=>inspect(f.id);row.append(b);
        });
        if(selected)ui.button('展开路口 '+selected,()=>choose(selected),'command main-command');
        ui.button(showSum?'隐藏代价之和':'显示代价之和',()=>{showSum=!showSum;render();},'command hint');
      }
      function inspect(id){
        if(search.done)return;
        const f=search.frontier.find(e=>e.id===id);
        if(!f){ui.message('金色路口在候选队列中。绿色路口已经检查过。');return;}
        selected=id;ui.message('观察 '+id+' 的两段距离。已走 '+f.g+'，剩余估计 '+f.h+'。可以切换路口对比。');render();
      }
      ui.overlay.onclick=e=>{const id=e.target.closest('[data-id]')?.dataset.id;if(id)inspect(id);};
      autoSingles();ui.message('已自动展开只有一个选择的起步路段。现在由你决定。');render();
    }
    function tracking(){
      if(!Array.isArray(d.route)||d.route.length<2){next('plan');return;}
      const ui=terrain(2),tracker=model.makeTracker(d.route,d.lookahead);
      let frame=0,prev=0,running=false,ghost=d.lastAttempt?.trail||[];
      ui.setGoal('把电芯运过急弯','折线能瞬间拐角，车轮需要转弯半径。调节车前方的预瞄点，让车沿上一关的路线行驶，偏离中心线不得超过 2 米。');
      const control=document.createElement('div');control.className='tracker-control';
      control.innerHTML='<label for="lookahead">预瞄距离 <output></output></label><input id="lookahead" type="range" min="12" max="140" step="2"><div class="range-ends"><span>近</span><span>远</span></div>';
      ui.actions.append(control);
      const input=control.querySelector('input'),out=control.querySelector('output');input.value=tracker.state.lookahead;
      const drive=ui.button('启动跟踪',start,'command main-command');
      const hud=document.createElement('p');hud.className='track-hud';ui.actions.append(hud);
      const keys=ui.button('查看瞄点原理',()=>ui.message('圆圈表示预瞄距离。控制器根据车辆朝向与前方瞄点的夹角转动前轮。长预瞄会更早转弯，在急弯里容易切角。'),'command hint');
      const s=tracker.state;
      function paint(){
        ui.view.rover={x:s.x,y:s.y,heading:s.heading};ui.paint();
        const prevTrace=ghost.length?'<polyline class="ghost" points="'+line(ghost)+'"/>':'';
        ui.overlay.innerHTML=ui.routeLine(d.route,'planned-path')+prevTrace+'<polyline class="wheel-trail" points="'+line(s.trail)+'"/>'+ui.barrier()+
          '<circle class="look-circle" cx="'+s.x+'" cy="'+s.y+'" r="'+s.lookahead+'"/><path class="aim-ray" d="M'+s.x+' '+s.y+' L'+s.target.x+' '+s.target.y+'"/><circle class="target" cx="'+s.target.x+'" cy="'+s.target.y+'" r="6"/>'+ui.pin('G','goal');
        out.textContent=metres(s.lookahead)+' 米';hud.textContent='路线进度 '+Math.round(s.progress*100)+'%　当前偏差 '+(s.error*model.metersPerUnit).toFixed(2)+' m';
      }
      function stop(){cancelAnimationFrame(frame);running=false;prev=0;}
      function result(){
        stop();
        if(s.passed){d.bestError=s.maxError;d.phase='delivery';save(d);ui.message('抵达雨量站。本次最大偏差 '+metres(s.maxError)+' 米，电芯完好。',true);drive.textContent='停靠站房';drive.onclick=()=>next('delivery');input.disabled=true;keys.hidden=true;return;}
        ghost=s.trail.map(p=>({...p}));d.lastAttempt={error:s.maxError,trail:ghost};save(d);
        ui.message('小车在弯内切出了安全线，已停车。橙红线保留这次轮迹。缩短预瞄距离，再试一次。');
        drive.textContent='从岔口重新试车';drive.onclick=start;
      }
      function tick(t){
        if(!running||disposed)return;
        if(prev)tracker.update(Math.min((t-prev)/1000,.1));prev=t;paint();
        if(s.done){result();return;}frame=requestAnimationFrame(tick);
      }
      function start(){
        if(running){stop();drive.textContent='继续行驶';return;}
        if(s.done)tracker.reset(Number(input.value));
        running=true;prev=0;drive.textContent='暂停观察';ui.message('白色轮迹是小车实际位置，青色折线是规划路线。');frame=requestAnimationFrame(tick);
      }
      input.oninput=()=>{d.lookahead=Number(input.value);if(s.done&&!s.passed)tracker.reset(d.lookahead);tracker.setLookahead(d.lookahead);save(d);paint();};
      function background(){if(document.hidden&&running){stop();drive.textContent='继续行驶';}}
      document.addEventListener('visibilitychange',background);
      ui.onDispose(()=>{stop();document.removeEventListener('visibilitychange',background);});
      if(d.lastAttempt)ui.message('上次偏差达到 '+metres(d.lastAttempt.error)+' 米。可以对照保留下来的轮迹重新试车。');paint();
    }
    function drawScene(){
      teardown();
      if(d.phase==='intro')cinematic('story','上游静默','暴雨前，峡谷最后一座雨量站断了电。探测车装上备用电芯，总部决定沿旧维修道遥控送达。','接入总部遥控台',()=>next('remote'));
      else if(d.phase==='remote')remote();
      else if(d.phase==='brief')cinematic('brief-map','送电任务','目的地是上游雨量站 G。车上只有一份暴雨前的路网图。先在俯视图测清岔路，再规划路线，最后让车轮执行。','展开俯视导航图',()=>next('scan'));
      else if(d.phase==='scan')survey();
      else if(d.phase==='plan')planning();
      else if(d.phase==='track')tracking();
      else if(d.phase==='delivery')cinematic('station-arrival','抵达雨量站','备用电芯已送到站房。插上供电接口，重新接通山谷里的中继台。','接入备用电芯',()=>next('end'));
      else {cinematic('restored','总部收到','雨量数据恢复回传。你的雷达记录封闭了 '+d.blocked+' 路，A* 找到了 '+d.route.join(' › ')+'，车轮把最大偏差控制在 '+metres(d.bestError||0)+' 米。重建委托已回传到任务航图。','领取重建任务',()=>{location.hash='jobs';});
        const again=document.createElement('button');again.className='command replay-job';again.textContent='换一处塌方再挑战';again.onclick=()=>{d=fresh(1-d.variant);next('scan');};$('.film-card').append(again);}
    }
    drawScene();
    return ()=>{disposed=true;teardown();};
  }
  globalThis.RescueGame={mount,menu:()=>{const phase=load().phase;return phase==='end'?{label:'重玩任务',href:'#rescue/replay'}:{label:phase==='intro'?'进入游戏':'继续游戏',href:'#rescue'};}};
})();
