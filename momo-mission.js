(() => {
  'use strict';
  const id='momo',title='断桥中继';
  FieldMissions.push({id,title,algorithm:'ToF 落点检测与 Q 学习',region:'machines',lesson:null,native:true});
  DebriefNotes[id]={
    name:'深度观测与 Q 学习',question:'同一份策略为什么会在同一座断桥上跳向两个方向？',
    mechanism:'预训练策略仍给正面短跳很高的动作价值。水平雷达的射线从台面上方经过，前方没有回波也可能意味着脚下是空的。向下倾斜的 ToF 测量飞行时间得到深度，机器人用点云检查候选落点。如果首选处是缺口，就从有支撑的候选动作中重选。落地或失败得到的奖励再更新实际执行动作的 Q 值。',
    formula:'距离 = 光速 × 往返时间 ÷ 2　　Q ← Q + α [r + γ max Q′ − Q]',
    experiment:'进入自由实验，保留断桥与同一预训练策略。分别关闭、开启 ToF 再单步，对照首跳的深度、点云和落点。切换奖励函数并快进训练，可比较近 20 局通关率。'
  };
  function mount(root,free=false){
    root.innerHTML='<section class="momo-host"><header class="momo-bar"><a class="cg-nav" href="#jobs/machines">‹ 行动地图</a><div><small>峡谷回声　/　前线工程</small><h1>断桥中继</h1></div><a class="cg-nav" href="'+(free?'#field/momo':'#lab/momo')+'">'+(free?'返回任务':'自由实验')+'</a><button class="screen-toggle"></button></header><iframe class="momo-window" title="MOMO 断桥中继仿真"></iframe></section>';
    const host=root.querySelector('.momo-host'),frame=host.querySelector('iframe'),full=expedition.mountFullButton(host.querySelector('.screen-toggle'));
    let done=false,release=()=>{},tape=MissionDebrief.tape();
    function load(){done=false;tape=MissionDebrief.tape();frame.src='./momo-stage.html'+(free?'?mode=lab':'?mode=mission');}
    function capture(label,detail,decision=false){const display=frame.contentDocument?.getElementById(decision?'decision-evidence':'sensor-canvas');if(display){tape.mark(label,detail);tape.capture(display);}}
    function receive(event){
      if(done||free||event.source!==frame.contentWindow||event.origin!==location.origin||event.data?.game!=='canyon-momo')return;
      const {type,label,detail,summary}=event.data;
      if(type==='sample'){capture(label,detail,event.data.decision===true);return;}
      if(type!=='complete'||typeof summary!=='string')return;
      done=true;capture('抵达中继门',summary);FieldGame.complete(id,summary);
      release=MissionDebrief.show(host,{id,title,summary,history:tape.items,next:{href:'#lab/momo',text:'进入自由实验'},again:load});
    }
    window.addEventListener('message',receive);load();
    return ()=>{window.removeEventListener('message',receive);release();full();frame.remove();};
  }
  globalThis.MomoMission={mount};
})();
