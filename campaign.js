(() => {
  'use strict';
  const chapters = [
    {kind:'tracking',place:'雾线山道',device:'前视相机',method:'纯追踪',from:'基地调度 · 林遥',line:'山洪冲走了公路。维修道还在，但入谷后连续三个弯，遥控画面会延迟。车上那块电芯，是雨量站今晚恢复供电的唯一机会。',problem:'雾里还能看见路缘。要让小车自己转向，先获取前方道路中心的位置。',fit:'相机提取前方路缘，估计中心线。纯追踪控制器瞄准线上的一点，计算转向。',passed:'电芯已运过山口。前方传来碎石滑落的声音。',photo:'道路中心线',fail:['','激光测距能发现突出物。这段路需要从路缘读出弯道的走向。','轮速能推算走了多远，前方弯道的位置需要相机观测。']},
    {kind:'avoid',place:'落石隘口',device:'前向激光雷达',method:'动态窗口避障',from:'巡检中继 · 隘口',line:'上一班巡检车发回的地图已经过时。昨夜的落石横在路中央，相机描出的旧中心线正好穿过石堆。',problem:'先测出障碍物的距离和方位，再让小车比较眼前能转出的几条弧线。',fit:'激光回波提供近处障碍的位置。局部规划器试算候选轨迹，兼顾车身净空和前进距离。',passed:'车身和电芯通过了落石带。雨量站的天线已经出现在峡谷尽头。',photo:'障碍回波',fail:['现有相机可以沿路走。落石占了路面，这次需要它与车身之间的距离。','','轮速只能测量本车的运动，无法测量前方岩石。']},
    {kind:'fusion',place:'回声深谷',device:'轮速编码器',method:'卡尔曼融合',from:'雨量站 · 最后一条缓存',line:'两侧岩壁挡住卫星。车明明在路心，GPS 标记却跳到了路边。剩下这段路，需要另一份独立的位置线索。',problem:'车载 GPS 仍有读数。加装能量出车轮位移的设备，先做短时推算，再用 GPS 校正。',fit:'编码器测量轮子走过的距离。滤波器结合车头方向预测横向位置，再按观测噪声权衡 GPS 的校正量。',passed:'已抵达上游雨量站。把车上电芯接入站房，恢复雨量回传。',photo:'轮速与定位',fail:['相机能读取道路形状。这次需要独立于 GPS 的自身位移测量。','测距可以找近处障碍，当前任务需要量出车轮走过的距离。','']}
  ];
  const devices=['前视相机','前向激光雷达','轮速编码器'];
  const progressKey='robot-atlas.expedition.v1';
  const icons={
    camera:'<rect x="3" y="7" width="18" height="12" rx="3"/><circle cx="12" cy="13" r="3.5"/><path d="m7 7 2-3h6l2 3"/>',
    lidar:'<path d="M4 16h16v4H4zM6 16v-5q6-5 12 0v5M8 6q4-3 8 0M5 3q7-5 14 0"/>',
    wheel:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/><path d="m12 4 0 5m8 3h-5m-3 8v-5m-8-3h5"/>',
    full:'<path d="M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6"/>',
    radio:'<circle cx="12" cy="12" r="2"/><path d="M8 7a7 7 0 0 0 0 10m8-10a7 7 0 0 1 0 10M5 4a11 11 0 0 0 0 16M19 4a11 11 0 0 1 0 16"/>',
    battery:'<path d="M3 8h16v10H3zM19 11h2v4h-2m-8-6-3 4h4l-2 3"/>',
    flag:'<path d="M5 21V4m0 1q4-3 8 0t7-1v9q-4 3-8 0t-7 1"/>'
  };
  const glyph=name=>'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">'+icons[name]+'</svg>';
  const deviceIcon=index=>glyph(['camera','lidar','wheel'][index]);
  const memory={installed:[],passed:[],delivered:false};
  function read(){
    let v;try{v=JSON.parse(localStorage.getItem(progressKey));}catch{}
    if(v&&typeof v==='object'){for(const k of ['installed','passed'])memory[k]=Array.isArray(v[k])?v[k].filter(id=>chapters.some(c=>c.kind===id)):[];memory.delivered=v.delivered===true&&chapters.every(c=>memory.passed.includes(c.kind));}
    return memory;
  }
  function save(){try{localStorage.setItem(progressKey,JSON.stringify(memory));}catch{}}
  function mark(field,kind){read();if(!memory[field].includes(kind))memory[field].push(kind);save();}
  function nextIndex(){const p=read();const first=chapters.findIndex(c=>!p.passed.includes(c.kind));return first<0?2:first;}
  const home='#lobby';
  function mountFullButton(button){
    const doc=document.documentElement,activate=doc.requestFullscreen||doc.webkitRequestFullscreen;
    if(!activate){button.hidden=true;return ()=>{};}
    function sync(){button.innerHTML=glyph('full')+'<span>'+(document.fullscreenElement||document.webkitFullscreenElement?'退出全屏':'全屏')+'</span>';}
    button.onclick=async()=>{try{if(document.fullscreenElement||document.webkitFullscreenElement){await (document.exitFullscreen||document.webkitExitFullscreen).call(document);}else{await activate.call(doc);}}catch{button.textContent='已铺满游戏窗口';}};
    sync();document.addEventListener('fullscreenchange',sync);document.addEventListener('webkitfullscreenchange',sync);
    return ()=>{document.removeEventListener('fullscreenchange',sync);document.removeEventListener('webkitfullscreenchange',sync);};
  }
  function shell(root,content,mode){
    root.innerHTML='<section class="expedition '+mode+'"><div class="hangar-art" aria-hidden="true"></div><div class="hangar-shade"></div><div class="exp-top"><a class="exp-brand" href="#lobby">'+glyph('radio')+' ATLAS <span>/ 机器人工坊</span></a><div class="exp-nav"><a href="#library">资料库</a><button class="screen-toggle" type="button"></button></div></div>'+content+'</section>';
    return mountFullButton(root.querySelector('.screen-toggle'));
  }
  function lobby(root){
    const entry=globalThis.RescueGame.menu();
    const cleanup=shell(root,'<div class="lobby-copy title-screen"><h1>峡谷回声</h1><div class="lobby-start"><a class="launch" href="'+entry.href+'">'+entry.label+' <i>▶</i></a><a class="atlas-entry" href="#jobs">任务航图</a></div></div>', 'lobby');
    return cleanup;
  }
  function mission(root,kind){
    const index=chapters.findIndex(c=>c.kind===kind);
    if(index<0||index>nextIndex()){location.replace(home);return ()=>{};}
    const c=chapters[index],sim=globalThis.createDriveStage(kind);
    sim.setSensorEnabled(false);
    let cleanup=()=>{};
    let driving=false;
    function render(panel,mode){
      cleanup();cleanup=shell(root,'<section class="brief-container"><div class="brief-pane">'+panel+'</div></section><div class="brief-foot"><a href="#lobby">返回大厅</a><span>航段 '+(index+1)+' / 3</span></div>',mode);
    }
    function briefing(){
      render('<span class="radio-id">'+glyph('radio')+' 来电 · '+c.from+'</span><h1>'+c.place+'</h1><p class="transmission">“'+c.line+'”</p><p class="mission-task">'+c.problem+'</p><button class="launch" data-open>检查车载设备 <i>▶</i></button>','briefing');
      root.querySelector('[data-open]').onclick=bench;
    }
    function bench(){
      const fitted=read().installed.includes(kind);
      render('<span class="radio-id">ATLAS / 车载设备舱</span><h1>接通导航设备</h1><p>'+c.problem+'</p><div class="device-list">'+devices.map((d,i)=>'<button class="device" data-device="'+i+'">'+deviceIcon(i)+'<span>'+d+'</span></button>').join('')+'</div><div class="device-response" role="status">选择设备，查看它能提供的观测。</div><div class="sensor-feed" hidden></div><button class="launch" data-go hidden>启用'+c.method+'并出发 <i>▶</i></button>','workbench');
      const response=root.querySelector('.device-response'),feed=root.querySelector('.sensor-feed'),go=root.querySelector('[data-go]');
      function fit(i){
        if(i!==index){response.textContent=c.fail[i];return;}
        sim.equipSensor();mark('installed',kind);root.querySelectorAll('[data-device]').forEach(btn=>{btn.disabled=true;btn.classList.toggle('fitted',Number(btn.dataset.device)===index);});
        response.textContent=c.fit;feed.hidden=false;feed.innerHTML='<b>传感器在线</b><span></span>';feed.querySelector('span').textContent=sim.state.sensor.sample;go.hidden=false;go.focus({preventScroll:true});
      }
      root.querySelectorAll('[data-device]').forEach(btn=>btn.onclick=()=>fit(Number(btn.dataset.device)));
      go.onclick=()=>{if(driving)return;driving=true;cleanup();cleanup=globalThis.mountDrive(root,kind,{mission:c,sim,onPassed:()=>mark('passed',kind),next:()=>location.hash=index===2?'station':'mission/'+chapters[index+1].kind});};
      if(fitted)fit(index);
    }
    briefing();return ()=>cleanup();
  }
  function station(root){
    const p=read();if(!chapters.every(c=>p.passed.includes(c.kind))){location.replace(home);return ()=>{};}
    const cleanup=shell(root,'<div class="brief-container"><div class="brief-pane"><span class="radio-id">'+glyph('battery')+' 上游雨量站</span><h1></h1><p data-log></p><button class="launch" data-deliver>接入备用电芯</button><a class="launch" href="#lobby" data-back hidden>返回大厅</a></div></div>','station');
    const parked=createDriveStage('fusion');
    const scene=document.createElement('canvas');scene.className='station-scene';scene.setAttribute('aria-hidden','true');root.querySelector('.hangar-art').replaceWith(scene);
    function paint(){
      const end=parked.state.length;
      drawValley(scene,{...parked.state,stage:'fusion',roadAt:parked.roadAt,distance:end-4,lateral:parked.roadAt(end)+2,heading:0,speed:0,sensor:{active:false},stationOnline:memory.delivered});
    }
    const observer=new ResizeObserver(paint);observer.observe(scene);
    function display(){const done=memory.delivered;root.querySelector('h1').textContent=done?'信号恢复':'最后一米';root.querySelector('[data-log]').textContent=done?'“基地收到。雨量读数已恢复回传。辛苦了，小车。” 三件传感器和你做出的三次导航决策，让电芯抵达了终点。':'探测车停在站房的充电接口旁。电芯完好，回传天线仍然熄着。';root.querySelector('[data-deliver]').hidden=done;root.querySelector('[data-back]').hidden=!done;}
    root.querySelector('[data-deliver]').onclick=()=>{memory.delivered=true;save();display();paint();};display();paint();return ()=>{observer.disconnect();cleanup();};
  }
  globalThis.expedition={lobby,mission,station,mountFullButton};
})();
