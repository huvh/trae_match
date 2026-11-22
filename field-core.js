(() => {
  'use strict';
  globalThis.FieldMissions=[];
  const regions=[
    {id:'survey',title:'岸线勘测',icon:'◎',color:'#9bddc2',place:'测绘队',task:'查明河岸、设备和落石的位置。'},
    {id:'routes',title:'山路开拓',icon:'⌁',color:'#eaca88',place:'开路队',task:'为补给车铺出一条能走的路。'},
    {id:'driving',title:'峡谷运输',icon:'◈',color:'#a5cee9',place:'运输队',task:'把物资稳稳送过弯道和交会区。'},
    {id:'machines',title:'前线工程',icon:'⚙',color:'#e9b89a',place:'工程队',task:'操作机械臂、飞行器和步行机器人修复设施。'}
  ];
  const progressKey='robot-atlas.field-ops.v1';
  let sessionProgress={};
  function progress(){try{const p=JSON.parse(localStorage.getItem(progressKey));if(p&&typeof p==='object')sessionProgress=p;}catch{}return sessionProgress;}
  function save(id,summary){const p=progress();p[id]={count:(p[id]?.count||0)+1,summary};try{localStorage.setItem(progressKey,JSON.stringify(p));}catch{}}
  const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const titleOf=id=>regions.find(r=>r.id===id);
  const missions=()=>regions.flatMap(r=>FieldMissions.filter(m=>m.region===r.id));
  const top='<a class="exit-nav" href="#lobby">‹ 大厅</a>';
  function hub(root,selected){
    if(!titleOf(selected))selected='all';
    const all=missions(),p=progress(),count=all.filter(m=>p[m.id]).length;
    root.innerHTML='<section class="field-hub"><div class="field-head">'+top+'<div><small>ATLAS / 野外行动</small><h1>任务航图</h1></div><a class="exit-nav aux" href="#library">资料库</a><button class="screen-toggle"></button></div><div class="hub-scroll"><a class="origin-mission" href="#rescue"><div><small>主线 · 3 关</small><h2>雨量站送电</h2><p>遥控失联后，接管车载导航。</p></div><span>进入主线 ▶</span></a><div class="hub-line"><h2>峡谷重建</h2><span>'+count+' / '+all.length+' 项已完成</span></div><div class="region-filter"></div><div class="job-rows"></div></div></section>';
    const filters=root.querySelector('.region-filter'),rows=root.querySelector('.job-rows');
    for(const group of [{id:'all',title:'全部任务'},...regions]){
      const btn=document.createElement('button');btn.type='button';btn.textContent=group.title;btn.className='field-filter';btn.dataset.group=group.id;btn.onclick=()=>{selected=group.id;render();};filters.append(btn);
    }
    let thumbs;
    const terrainCache=new Map();
    function preview(canvas){
      const m=all.find(m=>m.id===canvas.dataset.preview);
      if(!m?.create)return;
      const g=canvas.getContext('2d');canvas.width=240;canvas.height=138;g.scale(.3,.3);
      if(!terrainCache.has(m.region))terrainCache.set(m.region,backdrop(m.region));
      g.drawImage(terrainCache.get(m.region),0,0);
      const noop=()=>{};
      const demo=m.create({art,button(){return document.createElement('button');},slider(){return document.createElement('input');},status:noop,win:noop,invalidate:noop});
      g.save();demo.draw(g);g.restore();demo.dispose?.();
    }
    function render(){
      thumbs?.disconnect();
      for(const b of filters.children)b.setAttribute('aria-pressed',String(b.dataset.group===selected));
      rows.innerHTML=regions.filter(r=>selected==='all'||r.id===selected).map(r=>{
        const jobs=all.filter(m=>m.region===r.id);return '<section class="jobs-region" style="--zone:'+r.color+'"><div class="zone-heading"><span aria-hidden="true">'+r.icon+'</span><div><h3>'+r.title+'</h3><p>'+r.task+'</p></div></div><div class="job-list">'+jobs.map((m,i)=>'<a href="#field/'+m.id+'" class="job"><span class="job-marker">'+(p[m.id]?'✓':String(i+1).padStart(2,'0'))+'</span><canvas class="job-preview" data-preview="'+m.id+'" aria-hidden="true"></canvas><span><b>'+esc(m.title)+'</b><small>'+esc(m.algorithm)+'</small></span><span class="job-play" aria-label="'+(p[m.id]?'重玩':'试玩')+'">▸</span></a>').join('')+'</div></section>';
      }).join('');
      thumbs=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){thumbs.unobserve(e.target);preview(e.target);}}, {root:root.querySelector('.hub-scroll'),rootMargin:'90px'});
      rows.querySelectorAll('[data-preview]').forEach(c=>thumbs.observe(c));
    }
    const full=expedition.mountFullButton(root.querySelector('.screen-toggle'));
    render();return ()=>{thumbs?.disconnect();full();};
  }
  function artLine(g,pts,color,width=2,dashed=false){if(!pts.length)return;g.save();g.strokeStyle=color;g.lineWidth=width;g.lineJoin=g.lineCap='round';if(dashed)g.setLineDash([6,5]);g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.stroke();g.restore();}
  function artText(g,x,y,str,color='#f3f1dc',size=15){g.save();g.font='650 '+size+'px system-ui,sans-serif';g.fillStyle=color;g.fillText(str,x,y);g.restore();}
  function pin(g,x,y,label,color='#ffce80'){g.save();g.beginPath();g.arc(x,y,8,0,Math.PI*2);g.fillStyle=color;g.fill();g.lineWidth=2;g.strokeStyle='#172829';g.stroke();if(label)artText(g,x+12,y-9,label,color,16);g.restore();}
  function rover(g,x,y,heading=0){g.save();g.translate(x,y);g.rotate(heading);g.fillStyle='#132329';for(const a of [-10,5])for(const b of [-9,5])g.fillRect(a,b,6,5);g.fillStyle='#efc67b';g.beginPath();g.roundRect(-12,-6.5,24,13,4);g.fill();g.fillStyle='#4c6c6c';g.fillRect(-2,-4,8,8);g.fillStyle='#e4f9e7';g.fillRect(9,-5,2,3);g.fillRect(9,2,2,3);g.restore();}
  const art={line:artLine,text:artText,pin,rover};
  function backdrop(region){
    const c=document.createElement('canvas');c.width=800;c.height=460;const g=c.getContext('2d');
    const colors={survey:['#203e41','#193035'],routes:['#2a443d','#243535'],driving:['#293e45','#233136'],machines:['#2f3c40','#243138']}[region];
    const grad=g.createLinearGradient(0,0,800,460);grad.addColorStop(0,colors[0]);grad.addColorStop(1,colors[1]);g.fillStyle=grad;g.fillRect(0,0,800,460);
    let seed=594;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
    for(let i=0;i<1750;i++){const x=random()*800,y=random()*460;g.fillStyle=random()>.45?'#c5d7a90b':'#0b151c12';g.fillRect(x,y,1+random()*3,1+random());}
    for(let i=0;i<15;i++){g.beginPath();for(let j=0;j<100;j++){const t=j/99;const x=-120+t*1100,y=-140+i*58+42*Math.sin(t*7+i*.17)+22*Math.cos(t*13+i*.2);if(j)g.lineTo(x,y);else g.moveTo(x,y);}g.strokeStyle='#b5d2b20a';g.stroke();}
    return c;
  }
  function mount(root,id,diagram=false){
    const all=missions(),mission=all.find(m=>m.id===id);if(!mission){location.replace('#jobs');return ()=>{};}
    const reg=titleOf(mission.region);let disposeRun=()=>{};
    root.innerHTML='<section class="field-play field-flight" style="--zone:'+reg.color+'"><header class="field-head"><a class="exit-nav" href="#jobs/'+reg.id+'">‹ 航图</a><div><small>'+reg.place+' / '+esc(mission.algorithm)+'</small><h1>'+esc(mission.title)+'</h1></div><button class="exit-nav" data-manual>任务简报</button><button class="screen-toggle"></button></header><div class="field-body"><section class="field-board"><div class="stage-glass"><canvas tabindex="0" aria-label="'+esc(mission.title)+'操作区域"></canvas></div></section><aside class="field-console"><p class="field-goal"><b>目标</b> '+esc(mission.goal)+'</p><div class="coach-line" aria-live="polite"><b>教练</b><span></span></div><div class="field-controls"></div><div class="field-status" role="status"></div><section class="field-receipt" hidden><h2>任务完成</h2><p></p><p class="field-takeaway"></p><a class="command main-command" data-next></a></section><div class="field-foot"><button data-guidance>收起引导</button><button data-restart>重新挑战</button></div></aside></div><div class="field-manual" hidden><section><small>'+reg.title+'</small><h2>'+esc(mission.title)+'</h2><p>'+esc(mission.brief)+'</p><p>'+esc(mission.how)+'</p><button class="command main-command" data-close>返回操作</button>'+(mission.lesson?'<a href="#play/'+mission.lesson+'">查看原算法演示</a>':'')+'</section></div></section>';
    const shell=root.querySelector('.field-flight');
    if(!diagram){
      shell.classList.add('field-diorama');
      const look=document.createElement('button');look.className='exit-nav';look.dataset.look='';look.textContent='环视';look.title='拖动场景转动镜头；近景可平移';look.setAttribute('aria-pressed','false');root.querySelector('[data-manual]').before(look);
      const turn=document.createElement('button');turn.className='exit-nav';turn.dataset.camera='';turn.textContent='镜头 · 全景';root.querySelector('[data-manual]').before(turn);
      const diagramLink=document.createElement('a');diagramLink.href='#diagram/'+id;diagramLink.textContent='原理图';root.querySelector('.field-foot').prepend(diagramLink);
    }else{
      const back=document.createElement('a');back.href='#field/'+id;back.textContent='返回三维任务';root.querySelector('.field-foot').prepend(back);
    }
    const manual=root.querySelector('.field-manual');
    root.querySelector('[data-manual]').onclick=()=>{manual.hidden=false;root.querySelector('[data-close]').focus();};
    root.querySelector('[data-close]').onclick=()=>{manual.hidden=true;root.querySelector('[data-manual]').focus();};
    const full=expedition.mountFullButton(root.querySelector('.screen-toggle'));
    const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d'),controls=root.querySelector('.field-controls'),feedback=root.querySelector('.field-status'),receipt=root.querySelector('.field-receipt');
    const bg=diagram?backdrop(reg.id):null;
    const scene=diagram?null:FieldWorld.create(canvas,reg.id,id);
    let looking=false;
    const look=root.querySelector('[data-look]');
    function lookMode(active){looking=active;if(look){look.setAttribute('aria-pressed',String(active));look.textContent=active?'结束环视':'环视';}canvas.classList.toggle('field-look',active);}
    if(look)look.onclick=()=>{lookMode(!looking);if(looking)root.querySelector('.field-status').textContent=scene.mode===1?'拖动平移近景，按住 Shift 或右键拖动可转动镜头。':'拖动场景转动镜头。再次点击「结束环视」继续作业。';};
    function start(){
      disposeRun();lookMode(false);controls.replaceChildren();feedback.textContent='';receipt.hidden=true;feedback.hidden=false;
      let live=true,won=false,frame=0,last=0,resize=true,w=1,h=1,hidden=document.hidden,keyboardCursor=false,holding=false;
      const cursor={x:400,y:230},pressed=new Set();let game,reportOff=()=>{},endData=null,customHelp=true;
      const instrument=document.createElement('div');instrument.className='field-instrument';instrument.hidden=true;if(scene)canvas.after(instrument);let lastRead='';
      const tape=MissionDebrief.tape();tape.mark('任务开始',mission.goal);
      const turn=root.querySelector('[data-camera]');if(turn)turn.onclick=()=>{turn.textContent='镜头 · '+scene.turn();draw();};
      const coach=FieldCoach.create(mission),coachLine=root.querySelector('.coach-line'),coachToggle=root.querySelector('[data-guidance]');
      function showCoach(){
        const hint=game?.help&&!diagram?(customHelp?game.help():{}):null;
        const label=hint?hint.label:coach.label(),clue=hint?hint.control:coach.control();
        coachLine.hidden=won||!label;coachLine.querySelector('span').textContent=label;
        coachToggle.hidden=won;coachToggle.textContent=label?'收起引导':'重播引导';
        for(const el of controls.children)el.classList.toggle('coach-lit',!!clue&&el.textContent.includes(clue));
      }
      function guide(kind,x,y,text){if(won)return;const last=coach.step(),label=coach.label();coach.advance(kind,x,y,text);showCoach();
        if(last!==coach.step()||kind==='button'||kind==='slider'||kind==='down')tape.mark(text||(last!==coach.step()?'引导第 '+(last+1)+' 步':'布置现场'),feedback.textContent||label);
      }
      coachToggle.onclick=()=>{if(game?.help&&!diagram){customHelp=!customHelp;showCoach();return;}if(coach.label())coach.hide();else coach.repeat();showCoach();};
      function status(text){if(feedback.textContent!==String(text))feedback.textContent=String(text);if(game?.help&&!diagram)showCoach();}
      const api={art,status,button(label,callback){const b=document.createElement('button');b.type='button';b.className='command';b.textContent=label;b.onclick=e=>{callback(e);guide('button',0,0,label);};controls.append(b);return b;},
        slider(label,min,max,value,step,callback){const wrap=document.createElement('label');wrap.className='field-range';const name=document.createElement('span'),out=document.createElement('output'),input=document.createElement('input');name.textContent=label;input.type='range';input.min=min;input.max=max;input.step=step;input.value=value;out.textContent=input.value;input.oninput=()=>{out.textContent=input.value;callback(Number(input.value));guide('slider',0,0,label);};wrap.append(name,out,input);controls.append(wrap);return input;},
        win(summary){if(won||!live)return;won=true;coach.hide();showCoach();save(id,summary);feedback.hidden=true;
          for(const control of controls.querySelectorAll('button,input'))control.disabled=true;
          endData=summary;tape.mark('任务验收',summary);},

        invalidate(){if(live&&game)draw();}
      };
      game=mission.create(api);showCoach();
      function draw(){
        if(resize){const b=canvas.getBoundingClientRect(),r=Math.min(devicePixelRatio||1,2);w=Math.max(1,Math.round(b.width*r));h=Math.max(1,Math.round(b.height*r));canvas.width=w;canvas.height=h;resize=false;}
        if(scene){ctx.setTransform(1,0,0,1,0,0);scene.draw(w,h,game.world);if(!won){const target=game.help?(customHelp?game.help().target:null):coach.target();scene.coachCue(target,performance.now()/1000);}
          if(game.telemetry){const values=game.telemetry(),key=values.join('|');if(key!==lastRead){lastRead=key;instrument.hidden=false;instrument.replaceChildren();for(let i=0;i<values.length;i+=2){const item=document.createElement('span'),lab=document.createElement('small'),num=document.createElement('b');lab.textContent=values[i];num.textContent=values[i+1];item.append(lab,num);instrument.append(item);}}}}
        else {ctx.setTransform(w/800,0,0,h/460,0,0);ctx.drawImage(bg,0,0,800,460);ctx.save();game.draw(ctx);ctx.restore();if(!won)coach.draw(ctx,performance.now()/1000);}
        if(keyboardCursor){const q=scene?scene.project(cursor.x,cursor.y):cursor;ctx.save();ctx.strokeStyle='#ffed90';ctx.lineWidth=2;ctx.setLineDash([3,4]);ctx.strokeRect(q.x-9,q.y-9,18,18);ctx.restore();}
        tape.capture(canvas);
        if(endData){const summary=endData;endData=null;const thread={rrt:'potential',potential:'coverage'};const sequel=!diagram&&all.find(m=>m.id===thread[id]);const next=sequel||all.slice(all.indexOf(mission)+1).concat(all.slice(0,all.indexOf(mission))).find(m=>!progress()[m.id]);
          reportOff=MissionDebrief.show(shell,{id,title:mission.title,lesson:mission.lesson,summary,diagram,history:tape.items,next:id==='coverage'&&!diagram?{href:'#field/momo',text:'前往断桥中继'}:next?{href:'#field/'+next.id,text:'下一项 · '+next.title}:null,again:start});
        }
      }
      function loop(t){if(!live||hidden)return;const dt=last?Math.min((t-last)/1000,.06):0;last=t;if(!won&&manual.hidden)game.tick?.(dt);if(!won||endData||resize)draw();frame=requestAnimationFrame(loop);}
      const observer=new ResizeObserver(()=>{resize=true;if(won)draw();});observer.observe(canvas);
      function pointer(e){if(won)return;const b=canvas.getBoundingClientRect();const x=(e.clientX-b.left)/b.width,y=(e.clientY-b.top)/b.height;return scene?scene.ground(x*w,y*h):{x:x*800,y:y*460};}
      let activePointer=null,orbitDrag=null;
      canvas.oncontextmenu=e=>e.preventDefault();
      canvas.onpointerdown=e=>{if(won||activePointer!==null)return;if(scene&&(looking||e.button===2||e.altKey)){activePointer=e.pointerId;orbitDrag={x:e.clientX,y:e.clientY,pan:scene.mode===1&&!e.shiftKey&&e.button!==2};canvas.setPointerCapture(e.pointerId);return;}
        const p=pointer(e);scene?.aim(p.x,p.y);keyboardCursor=false;activePointer=e.pointerId;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);game.pointer?.('down',p.x,p.y);guide('down',p.x,p.y);};
      canvas.onpointermove=e=>{if(won||(activePointer!==null&&activePointer!==e.pointerId))return;if(orbitDrag){const dx=e.clientX-orbitDrag.x,dy=e.clientY-orbitDrag.y;orbitDrag.x=e.clientX;orbitDrag.y=e.clientY;if(orbitDrag.pan){const r=w/canvas.clientWidth;scene.pan(dx*r,dy*r);}else scene.orbit(-dx*.006,dy*.004);return;}
        if(looking)return;const p=pointer(e);game.pointer?.('move',p.x,p.y);};
      canvas.onpointerup=canvas.onpointercancel=e=>{if(activePointer!==e.pointerId)return;activePointer=null;if(orbitDrag){orbitDrag=null;return;}if(won)return;const p=pointer(e);game.pointer?.('up',p.x,p.y);guide('up',p.x,p.y);};
      const move={ArrowRight:[1,0],ArrowLeft:[-1,0],ArrowDown:[0,1],ArrowUp:[0,-1]};
      function keys(e,down){if(won||e.ctrlKey||e.metaKey||e.altKey||document.activeElement!==canvas)return;
        if(game.key){if(down)pressed.add(e.key);else pressed.delete(e.key);game.key(e.key,down);}
        if(move[e.key]&&!game.key){e.preventDefault();if(down){keyboardCursor=true;cursor.x=Math.max(0,Math.min(800,cursor.x+move[e.key][0]*(e.shiftKey?2:10)));cursor.y=Math.max(0,Math.min(460,cursor.y+move[e.key][1]*(e.shiftKey?2:10)));game.pointer?.('move',cursor.x,cursor.y);}}
        if(!game.key&&[' ','Enter'].includes(e.key)){e.preventDefault();keyboardCursor=true;if(down&&!holding){holding=true;game.pointer?.('down',cursor.x,cursor.y);guide('down',cursor.x,cursor.y);}if(!down&&holding){holding=false;game.pointer?.('up',cursor.x,cursor.y);guide('up',cursor.x,cursor.y);}}
      }
      const kd=e=>keys(e,true),ku=e=>keys(e,false);canvas.onkeydown=kd;canvas.onkeyup=ku;
      function releaseKeys(){for(const k of pressed)game.key?.(k,false);pressed.clear();if(holding)game.pointer?.('up',cursor.x,cursor.y);holding=false;}
      canvas.onblur=releaseKeys;
      function visibility(){hidden=document.hidden;cancelAnimationFrame(frame);last=0;if(hidden)releaseKeys();else frame=requestAnimationFrame(loop);}
      document.addEventListener('visibilitychange',visibility);frame=requestAnimationFrame(loop);
      disposeRun=()=>{live=false;instrument.remove();reportOff();cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('visibilitychange',visibility);releaseKeys();game.dispose?.();canvas.onpointerdown=canvas.onpointermove=canvas.onpointerup=canvas.onpointercancel=canvas.onkeydown=canvas.onkeyup=canvas.onblur=null;};
    }
    root.querySelector('[data-restart]').onclick=start;start();
    if(scene){
      scene.brief(true);manual.hidden=false;manual.classList.add('field-radio');
      root.querySelector('[data-close]').textContent='接入现场';
      root.querySelector('[data-close]').focus({preventScroll:true});
      root.querySelector('[data-close]').addEventListener('click',()=>{scene.brief(false);manual.classList.remove('field-radio');root.querySelector('[data-close]').textContent='返回操作';canvas.focus({preventScroll:true});},{once:true});
    }
    return ()=>{disposeRun();scene?.dispose();full();};
  }
  function nextField(){const p=progress();return missions().find(m=>!Object.hasOwn(RigModel.meta,m.id)&&!p[m.id]);}
  globalThis.FieldGame={hub,mount,complete:save,nextField};
})();
