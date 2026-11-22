(() => {
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function run(root,id){
    const [title,region,brief]=RigModel.meta[id],flying=id==='landing'||id==='drone',third=id==='n-arm',pipe=id==='arm-obstacles',land=id==='landing',icon=CanyonGame.icon;
    const make=()=>flying?RigModel.aerial(id):RigModel.arm(id);
    let sim=make(),s=sim.s,frame,prev=0,started=false,paused=false,won=false,live=true,dialogType='',lastUI='',lastDraw=-1;
    root.innerHTML='<section class="cg-run rig-screen"><canvas class="cg-surface" aria-label="'+title+'三维作业区" tabindex="0"></canvas><div class="cg-vignette"></div><div class="cg-run-top"><a class="cg-nav" href="#jobs/machines">'+icon('back')+'航图</a><span class="cg-compass">'+region+'</span><button class="cg-icon-button" data-pause aria-label="暂停菜单">'+icon('pause')+'</button></div><div class="cg-objective"><small>三维作业 / '+region+'</small><h1>'+title+'</h1><p data-meter></p></div><div class="rig-tags"></div><div class="cg-lower"><div class="cg-instruct" role="status"><b>操作</b><span></span></div><div class="rig-bar"></div><div class="rig-nav"><button class="cg-minor" data-view></button><a href="#diagram/'+id+'">原理图</a></div></div><div class="cg-overlay" hidden></div></section>';
    const $=q=>root.querySelector(q),scene=(flying?CanyonScene:ArmScene).create($('canvas')),board=$('.cg-run'),bar=$('.rig-bar'),panel=$('.cg-overlay'),pins=$('.rig-tags'),canvas=$('canvas');
    let reportOff=()=>{},tape=MissionDebrief.tape(),lastRecord='';
    const held={},listeners=[];
    function on(obj,type,cb){obj.addEventListener(type,cb);listeners.push(()=>obj.removeEventListener(type,cb));}
    function clear(){for(const k of Object.keys(held))delete held[k];for(const b of bar.children)b.classList.remove('pressed');}
    const hintText=()=>{
      if(s.note)return s.note;
      if(land)return s.started?'横移对准 H。按住升力减慢下降，落地速度须低于 1.8 m/s。':'点「开始下降」。先左移对准 H，再按住升力缓冲。';
      if(flying){const g=s.goal,r=s.rover,dx=g.x-r.x,dy=g.y-r.y;if(Math.abs(dx)>1.45)return '目标在'+(dx<0?'左侧':'右侧')+' '+Math.abs(dx).toFixed(1)+' 米。按住横移键对准门心。';if(Math.abs(dy)>1.45)return '门心比机身'+(dy>0?'高':'低')+' '+Math.abs(dy).toFixed(1)+' 米。按住'+(dy>0?'爬升':'下降')+'调整。';return '机身已对准门心。按住前飞通过，松开会悬停。';}
      if(third)return '点发光的接口，再转腕。工具轴线与管道轴线吻合时接合。';
      if(!s.gripped)return '点亮起的电芯。夹爪到达后点「夹取」，或按 E。';
      return pipe?'点高处让关节绕过立管，然后点插座并放下。':'点亮起的插座。等夹爪到位，再放下电芯。';
    };
    function press(){if(!dialogType){sim.act();refresh();}}
    function setView(){if(dialogType)return;if(flying)s.camera=s.camera==='tactical'?'chase':'tactical';else s.view=s.view==='front'?'orbit':'front';refresh();}
    $('[data-view]').onclick=setView;
    function restart(){reportOff();tape=MissionDebrief.tape();lastRecord='';sim=make();s=sim.s;won=started=false;lastUI='';dialog('intro');refresh();}
    function dialog(type){
      dialogType=type;paused=type==='pause';clear();panel.hidden=!type;board.classList.toggle('cg-modal-open',!!type);if(!type)return;
      const next=id==='arm-ik'?'arm-obstacles':id==='arm-obstacles'?'n-arm':id==='n-arm'?'drone':id==='drone'?'landing':null;
      if(type==='win'){const nextField=next?null:FieldGame.nextField();panel.hidden=true;reportOff=MissionDebrief.show(board,{id,title,summary:s.summary,history:tape.items,lesson:id,
        next:{href:next?'#field/'+next:nextField?'#field/'+nextField.id:'#jobs/machines',text:next?'下个任务 · '+RigModel.meta[next][0]:nextField?'峡谷重建 · '+nextField.title:'返回行动地图'},again:restart});return;}
      panel.innerHTML='<div class="cg-transmission"><div class="cg-code">'+icon(type==='pause'?'pause':'radio')+' '+(type==='pause'?'行动暂停':region+' · 作业电台')+'</div><h2>'+title+'</h2><p></p><button class="cg-launch" data-go>'+icon('play')+(type==='pause'?'继续行动':'接管设备')+'</button><button class="cg-menu-option" data-retry>重新开始</button><a class="cg-menu-option" href="#jobs/machines">行动地图</a></div>';
      panel.querySelector('p').textContent=type==='pause'?'遥测与设备已暂停。':brief;
      const go=panel.querySelector('[data-go]');if(go){go.focus({preventScroll:true});go.onclick=()=>{started=true;dialog('');prev=0;refresh();};}
      panel.querySelector('[data-retry]').hidden=type==='intro';panel.querySelector('[data-retry]').onclick=restart;
    }
    $('[data-pause]').onclick=()=>{if(dialogType==='pause')dialog('');else if(!dialogType)dialog('pause');};
    const defs=flying?(land?[['left','左移','A'],['right','右移','D'],['up','升力','R'],['act','开始下降','E']]:[['left','左移','A'],['right','右移','D'],['up','爬升','R'],['down','下降','F'],['forward','前飞','W']]):(third?[['ccw','转腕 −','Q'],['cw','转腕 +','R'],['act','接合','E']]:[['act','夹取','E']]);
    for(const [k,text,short] of defs){const b=document.createElement('button');b.className=k==='act'?'cg-action':'rig-key';b.dataset.key=k;b.innerHTML='<span>'+text+'</span><kbd>'+short+'</kbd>';bar.append(b);
      if(k==='act')b.onclick=press;else if(k==='cw'||k==='ccw')b.onclick=()=>{sim.rotate(k==='cw'?1:-1);refresh();};
      else{b.onpointerdown=e=>{if(dialogType)return;e.preventDefault();b.setPointerCapture(e.pointerId);held[k]=true;b.classList.add('pressed');};b.onlostpointercapture=b.onpointerup=b.onpointercancel=()=>{held[k]=false;b.classList.remove('pressed');};}
    }
    const bindings={a:'left',arrowleft:'left',d:'right',arrowright:'right',r:'up',f:'down',w:'forward',arrowup:'up',arrowdown:'down'};
    on(window,'keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey)return;const k=e.key.toLowerCase();if(k==='escape'&&!e.repeat){if(dialogType==='pause')dialog('');else if(!dialogType)dialog('pause');return;}if(dialogType)return;
      if([' ','e'].includes(k)){e.preventDefault();if(!e.repeat)press();return;}if(k==='v'&&!e.repeat){setView();return;}
      if(flying&&bindings[k]){held[bindings[k]]=true;e.preventDefault();}
      if(!flying){const t=s.target;if(['arrowleft','arrowright','arrowup','arrowdown'].includes(k)){e.preventDefault();sim.aim({x:t.x+(k==='arrowright'?.15:k==='arrowleft'?-.15:0),y:t.y+(k==='arrowup'?.15:k==='arrowdown'?-.15:0)});}if(third&&['q','r'].includes(k)&&!e.repeat)sim.rotate(k==='r'?1:-1);}
    });
    on(window,'keyup',e=>{const k=bindings[e.key.toLowerCase()];if(k)held[k]=false;});
    function suspend(){clear();if(started&&!dialogType)dialog('pause');prev=0;}on(window,'blur',suspend);on(document,'visibilitychange',()=>{if(document.hidden)suspend();});
    // Project the z=0 work plane using the same live camera as the art. Newton iteration also works in oblique view.
    function aimAt(e){
      if(dialogType||flying)return;
      const rect=canvas.getBoundingClientRect(),tx=e.clientX-rect.left,ty=e.clientY-rect.top;let x=0,y=2.4;
      for(let i=0;i<6;i++){
        const p=scene.project(x,y,0),a=scene.project(x+.02,y,0),b=scene.project(x,y+.02,0);
        if(!p||!Number.isFinite(p.x))return;
        const u=(a.x-p.x)/.02,v=(a.y-p.y)/.02,w=(b.x-p.x)/.02,z=(b.y-p.y)/.02,det=u*z-v*w;if(Math.abs(det)<.01)return;
        const dx=tx-p.x,dy=ty-p.y;x+=(dx*z-dy*w)/det;y+=(u*dy-v*dx)/det;
      }
      sim.aim({x:clamp(x,-4.1,4.1),y:clamp(y,.3,4.75)});refresh();
    }
    let dragging=false;canvas.onpointerdown=e=>{if(flying||dialogType)return;dragging=true;canvas.setPointerCapture(e.pointerId);aimAt(e);};
    canvas.onpointermove=e=>{if(dragging)aimAt(e);};canvas.onpointerup=canvas.onpointercancel=()=>{dragging=false;};
    function labels(){
      if(dialogType){pins.hidden=true;return;}pins.hidden=false;const tags=[];
      if(!flying){if(!third&&!s.gripped)tags.push([s.cell,'电芯',true]);else tags.push([s.socket,third?'导管接口':'插座',true]);if(pipe&&s.gripped)tags.push([{x:0,y:4.45,z:0},'绕行点',true]);}
      else if(!land){tags.push([s.goal,'检验环 '+(s.gateIndex+1),false]);}
      const sk=tags.map(t=>t[1]).join('|');if(pins.dataset.labels!==sk){pins.replaceChildren();pins.dataset.labels=sk;for(const [p,name,clickable] of tags){const el=document.createElement(clickable?'button':'span');el.className='rig-pin';el.textContent=name;if(clickable)el.onclick=()=>{sim.aim(p);refresh();};pins.append(el);}}
      tags.forEach(([p],i)=>{const el=pins.children[i],v=scene.project(p.x,p.y,p.z||0);el.hidden=!v.visible;if(v.visible){el.style.left=v.x+'px';el.style.top=v.y+'px';}});
    }
    function refresh(){
      const key=hintText(),meter=flying?(land?'高度 '+s.rover.y.toFixed(1)+' m　下降 '+Math.max(0,-s.vy).toFixed(1)+' m/s　偏移 '+Math.abs(s.rover.x).toFixed(1)+' m':'高度 '+s.rover.y.toFixed(1)+' m　门心 '+s.goal.y+' m　航门 '+Math.min(3,s.gateIndex+1)+'/3'):third?'腕角 '+Math.round(s.toolAngle*180/Math.PI)+'°　接口 36°':s.gripped?'夹爪 · 已载物':'夹爪 · 空载';
      if(key+meter!==lastUI){$('.cg-instruct span').textContent=key;$('[data-meter]').textContent=meter;lastUI=key+meter;}
      $('[data-view]').textContent=flying?(s.camera==='tactical'?'跟随机位':'俯视机位'):(s.view==='orbit'?'正面机位':'侧面机位');
      const action=bar.querySelector('[data-key=act]');if(action){action.hidden=land&&s.started;if(!flying&&!third)action.querySelector('span').textContent=s.gripped?'放下':'夹取';}
      if(s.done&&!won){won=true;scene.draw(s);tape.mark('验收完成',s.summary);tape.capture(canvas);FieldGame.complete(id,s.summary);CanyonGame.save(id,s.time);dialog('win');}
    }
    function loop(t){if(!live)return;const dt=prev?Math.min(.075,(t-prev)/1000):0;prev=t;
      if(!document.hidden&&(!paused||lastDraw<0)){
        if(started&&!dialogType)for(let i=0;i<3;i++)sim.tick(dt/3,held);
        if(t-lastDraw>1000/42||lastDraw<0){scene.draw(s);
          const milestone=[started,s.gripped,s.gateIndex,s.bends,s.started,s.done,third?Math.round(s.toolAngle*18/Math.PI):0].join('/');
          if(milestone!==lastRecord){lastRecord=milestone;tape.mark(s.done?'验收完成':s.gripped?'夹取与避障':third?'腕部调姿':land?'下降检验':flying?'飞越航门':'设备就位',s.note||$('[data-meter]').textContent);}
          tape.capture(canvas);labels();refresh();lastDraw=t;}
      }frame=requestAnimationFrame(loop);
    }
    dialog('intro');refresh();frame=requestAnimationFrame(loop);
    return ()=>{live=false;reportOff();cancelAnimationFrame(frame);clear();listeners.forEach(f=>f());scene.dispose();};
  }
  globalThis.RigGame={run};
})();
