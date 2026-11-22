(() => {
  'use strict';
  const specs=MountainSearch.routes;
  function create(board,pins,scene,modelOf,requestRefresh){
    const panel=document.createElement('section');panel.className='search-instrument';panel.hidden=true;
    panel.innerHTML='<div class="si-tools"><label>代价 <select data-policy><option value="energy">最省电</option><option value="metres">最短里程</option></select></label><button data-carry type="button">拿起防滑板</button><button data-recall type="button" hidden>回收</button></div><p data-read aria-live="polite"></p><small data-front></small><div class="si-play"><button data-step>单步搜索</button><button data-play>播放搜索</button></div>';
    board.append(panel);
    const $=q=>panel.querySelector(q);let pinKey='',last='',lastAnnouncement='',carrying=false;
    const currentPin=document.createElement('span');currentPin.className='search-current-pin';board.append(currentPin);currentPin.hidden=true;
    function update(f){f(modelOf());last='';requestRefresh();}
    $('[data-policy]').onchange=e=>update(m=>m.configure(e.target.value));
    $('[data-carry]').onclick=()=>{carrying=!carrying;last='';sync(false);};
    $('[data-recall]').onclick=()=>{carrying=false;update(m=>m.configure(null,null));};
    function pick(route){
      if(carrying){carrying=false;update(m=>m.configure(null,route.id));}
      else update(m=>m.predict(route.id));
    }
    $('[data-step]').onclick=()=>update(m=>m.stepOnce());$('[data-play]').onclick=()=>update(m=>m.playPause());
    function sync(overlay){
      const model=modelOf(),s=model.s,d=s.plan,f=d?.astar.frames[s.frameIndex],show=s.mode==='plan'&&!overlay;
      panel.hidden=!show;pins.hidden=!show;if(!show){pinKey='';currentPin.hidden=true;if(s.mode!=='plan')carrying=false;return;}
      const key=s.mode+!!overlay;
      if(key!==pinKey){pinKey=key;pins.replaceChildren();for(const route of specs){
        const b=document.createElement('button');b.className='cg-survey-pin';b.dataset.route=route.id;b.innerHTML='<i></i><span></span>';b.querySelector('span').textContent=route.name;b.setAttribute('aria-label','预测路线 · '+route.name);b.onclick=()=>pick(route);pins.append(b);
      }}
      for(const b of pins.children){const route=specs.find(r=>r.id===b.dataset.route),n=model.nodes[route.mark],v=scene.project(n.x,.4,n.z);
        b.setAttribute('aria-label',(carrying?'在此铺板 · ':'预测路线 · ')+route.name);b.querySelector('span').textContent=route.name+(s.mat===route.id?' ▥':'');b.style.left=v.x+'px';b.style.top=v.y+'px';b.hidden=!v.visible;b.classList.toggle('chosen',s.prediction===route.id);b.setAttribute('aria-pressed',s.prediction===route.id);
      }
      currentPin.hidden=!f||!s.plan||s.frameIndex===d.astar.frames.length-1;
      if(!currentPin.hidden){const n=model.nodes[f.current],v=scene.project(n.x,3,n.z);currentPin.style.left=v.x+'px';currentPin.style.top=v.y+'px';currentPin.textContent='展开 '+f.current;}
      const status=[s.policy,s.mat,s.prediction,s.frameIndex,!!d,s.playSearch,carrying].join('|');if(last===status)return;last=status;
      $('[data-policy]').value=s.policy;$('[data-carry]').textContent=carrying?'取消布设':s.mat?'移动防滑板':'拿起防滑板';$('[data-carry]').setAttribute('aria-pressed',carrying);$('[data-recall]').hidden=!s.mat;
      const ended=!!d&&s.frameIndex===d.astar.frames.length-1;
      $('[data-step]').disabled=!s.prediction||ended;$('[data-play]').disabled=!s.prediction;
      $('[data-play]').textContent=s.playSearch?'暂停搜索':ended?'重看搜索':d?'继续搜索':'播放搜索';
      $('[data-front]').textContent=f&&!ended&&f.candidates.length?'候选 f　'+f.candidates.slice(0,3).map(n=>n.id+'号 '+n.f.toFixed(1)).join('　'):'';
      const copy=carrying?'点地图上的路标，把防滑板铺在那段路面。':ended?d.name+' · '+Math.round(d.astar.meters)+' 米 · '+d.energy.toFixed(1)+' / 90 格电量':f?'路口 '+f.current+'　g '+f.g.toFixed(1)+' + h '+f.h.toFixed(1)+' = f '+f.f.toFixed(1):s.prediction?'已标记预测路线。可启动搜索或单步观察。':'点路标预测路线。电芯余量 90 格。';
      if(copy!==lastAnnouncement){$('[data-read]').textContent=copy;lastAnnouncement=copy;}
    }
    return {sync};
  }
  globalThis.PlanningHUD={create};
})();
