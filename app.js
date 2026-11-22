'use strict';

const worlds = [
  { id:'localization',name:'定位观测站',label:'定位观测',color:'#78d8ff',task:'根据传感器的线索，判断机器人在地图上的位置。',icon:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>' },
  { id:'mapping',name:'地图测绘所',label:'地图测绘',color:'#93dfbd',task:'从一束束激光和散落的点，拼出周围环境的轮廓。',icon:'<path d="m3 5 6-2 6 3 6-2v15l-6 2-6-3-6 2zM9 3v15m6-12v15"/>' },
  { id:'slam',name:'探索前哨',label:'同步建图',color:'#c9b3fc',task:'在陌生环境中边走边测量，同时修正位置和地图。',icon:'<path d="m4 17 4-9 6 7 5-11"/><circle cx="4" cy="18" r="2"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="15" r="2"/>' },
  { id:'planning',name:'路径规划港',label:'路径规划',color:'#78eac5',task:'在障碍物之间找到一条路，观察每一步搜索如何改变路线。',icon:'<circle cx="5" cy="17" r="2.5"/><circle cx="19" cy="6" r="2.5"/><path d="M7 16c6-1-4-7 3-8s3 7 8 0"/>' },
  { id:'tracking',name:'轨迹试车场',label:'轨迹跟踪',color:'#ffc985',task:'观察方向盘如何修正误差，让小车跟上目标轨迹。',icon:'<path d="m3 19 6-14m6 14 6-14M9 19l1-3m2-4 1-3"/>' },
  { id:'arm',name:'机械臂工坊',label:'机械臂',color:'#ffad9d',task:'移动机械臂关节，把末端送到指定的位置。',icon:'<path d="M3 21h15M6 20l2-5 6-6-4-4m5 3 3-3 3 2"/><circle cx="8" cy="15" r="2.5"/><circle cx="14" cy="9" r="2.5"/><circle cx="9" cy="4" r="2"/>' },
  { id:'aerial',name:'飞行实验台',label:'空中导航',color:'#a2ceff',task:'改变飞行器的控制输入，观察它如何接近目标轨迹。',icon:'<path d="m6 6 12 12M6 18 18 6"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/>' },
  { id:'biped',name:'步态训练场',label:'双足步态',color:'#f5b5db',task:'观察落脚点与重心的变化，帮助机器人迈出下一步。',icon:'<circle cx="13" cy="4" r="2"/><path d="m12 7-2 6 5 3 2 5M10 13l-3 7H4m8-12 4 4h4"/>' }
];
const labs={astar:'astar',dijkstra:'dijkstra','arm-ik':'arm',kmeans:'kmeans'};
const lessons=globalThis.curriculum || [];
const progressKey='robot-atlas.completed.v1';
let completed;
try { const saved=JSON.parse(localStorage.getItem(progressKey)||'[]'); completed=new Set(Array.isArray(saved)?saved:[]); }
catch { completed=new Set(); }
let worldIndex=3;
let dispose=()=>{};
const main=document.getElementById('main');
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const worldById=id=>worlds.find(world=>world.id===id);
const inWorld=id=>lessons.filter(lesson=>lesson.group===id);
const icon=world=>'<span class="world-icon" style="--accent:'+world.color+'"><svg viewBox="0 0 24 24" aria-hidden="true">'+world.icon+'</svg></span>';
const enter=id=>'#play/'+encodeURIComponent(id);
function countDone(list){return list.filter(lesson=>completed.has(lesson.id)).length;}
function updateScore(){
  let passed=0;
  try{passed=Object.values(JSON.parse(localStorage.getItem('robot-atlas.rallies.v1')||'{}')).filter(record=>record.passed).length;}catch{}
  document.getElementById('score').innerHTML='<b aria-hidden="true"></b>'+(passed+countDone(lessons))+' 关已通关';
}
window.addEventListener('rally-finished',updateScore);
function complete(id){completed.add(id);try{localStorage.setItem(progressKey,JSON.stringify([...completed]));}catch{} updateScore();}
function preferredLesson(world){
  const list=inWorld(world.id);
  const featured=['astar','arm-ik','kmeans'].map(id=>list.find(item=>item.id===id)).find(Boolean);
  return [featured,...list].find(item=>item&&!completed.has(item.id))||featured||list[0];
}
function mapPage(){
  main.innerHTML='<div class="intro"><div><h1>算法群岛</h1><p>选择一座岛，进入机器人的算法实验。</p></div><span class="stat">8 座岛屿 · '+lessons.length+' 个关卡</span></div><div class="map-layout"><section class="map-shell" aria-label="可交互的算法群岛地图"><div class="windowbar"><b class="led"></b>WORLD MAP<span>选择岛屿</span></div><div class="world-map" id="worldmap"><canvas aria-hidden="true"></canvas></div></section><aside class="panel side" id="worldSide"></aside></div><div class="section-title"><h2>动手实验</h2><a class="quiet" href="#library">查看关卡手册</a></div><div class="featured" id="featured"></div>';
  const map=document.querySelector('#worldmap'),canvas=map.querySelector('canvas');
  const points=globalThis.worldPoints || [[13.5,48],[36.5,38],[60.5,46],[84,35],[84.5,82],[61.5,92],[37,80],[13.5,89]];
  const paint=()=>globalThis.drawWorld?.(canvas,worldIndex,worlds.map(w=>{const list=inWorld(w.id);return list.length?countDone(list)/list.length:0;}));
  function selection(index){
    worldIndex=index; const w=worlds[index], list=inWorld(w.id), done=countDone(list), next=preferredLesson(w);
    map.querySelectorAll('.marker').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===worldIndex)));
    document.querySelector('#worldSide').innerHTML=icon(w)+'<h2>'+w.name+'</h2><p>'+w.task+'</p><div class="side-info"><span>岛屿进度</span><strong>'+done+' / '+list.length+'</strong></div><div class="meter"><i style="width:'+(list.length?100*done/list.length:0)+'%"></i></div><div class="side-bottom">'+(next?'<a class="primary" href="'+enter(next.id)+'">'+(done?'继续闯关':'进入首关')+'</a>':'')+'<a class="secondary" href="#library/'+w.id+'">浏览岛上关卡</a></div>';
    paint();
  }
  worlds.forEach((w,i)=>{const btn=document.createElement('button');btn.className='marker';btn.textContent=w.label;btn.style.left=points[i][0]+'%';btn.style.top=points[i][1]+'%';btn.setAttribute('aria-label','选择'+w.name);btn.onclick=()=>selection(i);map.append(btn);});
  function islandUnderPointer(event){
    const rect=canvas.getBoundingClientRect();
    const x=(event.clientX-rect.left)*960/rect.width,y=(event.clientY-rect.top)*520/rect.height;
    return points.findIndex(([px,py])=>((x-px*9.6)/78)**2+((y-(py*5.2-78))/50)**2<=1);
  }
  canvas.onclick=event=>{const i=islandUnderPointer(event);if(i>=0)selection(i);};
  canvas.onpointermove=event=>{canvas.style.cursor=islandUnderPointer(event)>=0?'pointer':'';};
  selection(worldIndex);
  const observer=new ResizeObserver(paint);observer.observe(map);dispose=()=>observer.disconnect();
  const demos=[['astar','预测搜索的下一步'],['kmeans','亲眼看点云分组'],['arm-ik','点击目标操作机械臂']];
  document.querySelector('#featured').innerHTML=demos.map(([id,caption])=>{const l=lessons.find(item=>item.id===id);if(!l)return '';return '<a class="lesson-card" href="'+enter(id)+'">'+icon(worldById(l.group))+'<span><strong>'+escapeHTML(l.title)+'</strong><small>'+caption+'</small></span></a>';}).join('');
}
function libraryPage(group){
  main.innerHTML='<div class="intro"><div><h1>关卡手册</h1><p>按算法名查找原理、演示和对应的实操任务。</p></div><a class="quiet" href="#jobs">打开任务航图</a></div><div class="filter"><input id="find" aria-label="搜索算法" placeholder="搜索算法，例如 A*"><select id="group" aria-label="选择岛屿"><option value="">全部岛屿</option>'+worlds.map(w=>'<option value="'+w.id+'">'+w.name+'</option>').join('')+'</select><select id="status" aria-label="筛选进度"><option value="">全部进度</option><option value="todo">未通关</option><option value="done">已通关</option></select></div><div class="course-list" id="courses"></div>';
  const select=document.getElementById('group'),query=document.getElementById('find'),status=document.getElementById('status');select.value=worldById(group)?group:'';
  function render(){const q=query.value.trim().toLowerCase();const list=lessons.filter(l=>(!select.value||l.group===select.value)&&(!q||[l.title,l.id,l.concept].join(' ').toLowerCase().includes(q))&&(!status.value||(status.value==='done')===completed.has(l.id)));document.getElementById('courses').innerHTML=list.map(l=>{const w=worldById(l.group);return '<a class="course" href="'+enter(l.id)+'"><span class="tag" style="--accent:'+w.color+'">'+w.name+' · '+(completed.has(l.id)?'已通关':labs[l.id]?'动手实验':'观察挑战')+'</span><strong>'+escapeHTML(l.title)+'</strong><p>'+escapeHTML(l.concept)+'</p></a>';}).join('')||'<p class="empty">没有匹配的关卡，可更换关键词或筛选条件。</p>';}
  select.onchange=render;query.oninput=render;status.onchange=render;render();
}
function lessonPage(id){
  const l=lessons.find(item=>item.id===id);
  if(!l){main.innerHTML='<div class="intro"><h1>关卡不存在</h1></div><a class="primary" href="#library">返回关卡手册</a>';return;}
  const w=worldById(l.group);worldIndex=worlds.indexOf(w);
  const lab=labs[id]&&globalThis.mountLab;
  main.innerHTML='<div class="crumb"><a href="#map">世界地图</a>　/　<a href="#library/'+w.id+'">'+w.name+'</a></div><div class="lesson-head"><h1>'+escapeHTML(l.title)+'</h1><p class="sub">'+escapeHTML(l.concept)+'</p></div><div class="lesson-layout"><section class="panel practice"><h2>'+(lab?'动手实验':l.animation?'观察演示':'算法观察')+'</h2><div id="demo"></div><a class="source" href="'+escapeHTML(l.url)+'" target="_blank" rel="noreferrer">查看 PythonRobotics 原始示例 ↗</a></section><section class="panel quiz"><h2>知识自测</h2><p class="q">'+escapeHTML(l.question)+'</p><div class="choices" id="choices"></div><p role="status" class="feedback" id="feedback"></p><div class="quiz-actions" id="actions"></div></section></div>';
  const field=FieldMissions.find(m=>m.lesson===id);
  if(field){
    const launch=document.createElement('a');
    launch.className='primary';launch.href='#field/'+field.id;launch.textContent='进入实操 · '+field.title;
    main.querySelector('.lesson-head').append(launch);
  }
  if(id==='astar'){
    const launch=document.createElement('a');launch.className='primary';launch.href='#run/rescue';launch.textContent='进入山路搜索行动';main.querySelector('.lesson-head').append(launch);
  }
  const demo=document.getElementById('demo');
  if(lab){dispose=globalThis.mountLab(demo,labs[id])||(()=>{});}
  else if(l.animation){
    const guide=globalThis.watchGuide?.[id];
    if(guide){
      const hint=document.createElement('div');hint.className='watch-guide';
      hint.innerHTML='<p><b>先看这里</b>'+escapeHTML(guide.look)+'</p><p><b>接着观察</b>'+escapeHTML(guide.compare)+'</p>';demo.append(hint);
    }
    const clip=document.createElement('video');
    clip.controls=true;clip.muted=true;clip.playsInline=true;clip.loop=true;
    clip.autoplay=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    clip.preload='metadata';clip.setAttribute('aria-label',l.title+' 演示回放');
    clip.src='./media/'+encodeURIComponent(l.id)+'.mp4';
    const media=document.createElement('div');media.className='media';media.append(clip);demo.append(media);
    const tools=document.createElement('div');tools.className='playback-tools';
    tools.innerHTML='<button type="button">回看 1 秒</button><label>播放速度 <select aria-label="播放速度"><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>';
    tools.querySelector('button').onclick=()=>{clip.pause();clip.currentTime=Math.max(0,clip.currentTime-1);};
    tools.querySelector('select').onchange=event=>{clip.playbackRate=Number(event.target.value);};
    demo.append(tools);
    clip.onerror=()=>{tools.hidden=true;const img=new Image();img.alt=l.title+' 原作者动画';img.onerror=()=>{media.innerHTML='<p class="media-note">演示素材暂时未能载入，可从下方打开原始示例。</p>';};img.src=l.animation;media.replaceChildren(img);};
    const caption=document.createElement('p');caption.className='caption';
    caption.innerHTML='原演示 · Atsushi Sakai / PythonRoboticsGifs　<a class="quiet" href="./media/LICENSE.txt" target="_blank">MIT 许可</a>';demo.append(caption);
    dispose=()=>{clip.onerror=null;clip.pause();clip.removeAttribute('src');clip.load();};
  }else{demo.innerHTML='<p class="caption">'+escapeHTML(l.concept)+'</p>';}
  const choices=document.getElementById('choices'),feedback=document.getElementById('feedback'),actions=document.getElementById('actions');
  l.options.forEach((opt,i)=>{const button=document.createElement('button');button.className='choice';button.innerHTML='<span>'+String.fromCharCode(65+i)+'</span><span>'+escapeHTML(opt)+'</span>';button.onclick=()=>{
    if(i!==l.answer){button.classList.add('wrong');feedback.className='feedback';feedback.textContent='再试一次。回看左侧实验，观察哪种变化符合这个算法。';return;}
    button.classList.add('right');[...choices.children].forEach(el=>el.disabled=true);feedback.className='feedback ok';feedback.textContent='通关成功！'+l.explain;complete(id);
    const list=inWorld(w.id);const after=list.slice(list.indexOf(l)+1).concat(list.slice(0,list.indexOf(l)));const next=after.find(item=>!completed.has(item.id));
    actions.innerHTML=(next?'<a class="primary" href="'+enter(next.id)+'">挑战下一关</a>':'<a class="primary" href="#map">回世界地图</a>')+'<a class="secondary" href="#library/'+w.id+'">岛上关卡</a>';
  };choices.append(button);});
}
function route(){
  dispose();dispose=()=>{};const [page,parameter='']=location.hash.slice(1).split('/');
  document.body.classList.toggle('immersive',!['library','play','map'].includes(page));
  document.getElementById('navMap').className=page==='library'?'':'active';
  document.getElementById('navLibrary').className=page==='library'?'active':'';
  updateScore();if(page==='library')libraryPage(parameter);else if(page==='play')lessonPage(parameter);else if(page==='map')mapPage();else if(page==='drive'&&parameter)dispose=globalThis.mountDrive(main,parameter);else if(page==='jobs')dispose=CanyonGame.hub(main,parameter);else if(page==='run')dispose=CanyonGame.run(main,parameter);else if(['field','lab','diagram'].includes(page)&&parameter==='momo')dispose=MomoMission.mount(main,page!=='field');else if(page==='field'&&Object.hasOwn(RigModel.meta,parameter))dispose=RigGame.run(main,parameter);else if(page==='field'||page==='diagram')dispose=FieldGame.mount(main,parameter,page==='diagram');else if(page==='rescue')dispose=CanyonGame.run(main,'rescue');else if(page==='archive')dispose=RescueGame.mount(main,parameter);else if(page==='mission')dispose=expedition.mission(main,parameter);else if(page==='station')dispose=expedition.station(main);else dispose=CanyonGame.lobby(main);
  window.scrollTo(0,0);
}
window.addEventListener('hashchange',route);
window.addEventListener('storage',event=>{if(event.key===progressKey){try{const value=JSON.parse(event.newValue||'[]');if(Array.isArray(value)){completed=new Set(value);updateScore();if(!location.hash.startsWith('#play/'))route();}}catch{}}});
route();
