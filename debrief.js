(() => {
  'use strict';
  function tape(){
    const items=[];let queued=null;
    function mark(label,detail=''){queued={label,detail};}
    function capture(source){
      if(!queued||!source.width||!source.height)return;const item=queued;queued=null;
      const thumb=document.createElement('canvas');thumb.width=440;thumb.height=Math.max(100,Math.round(440*source.height/source.width));
      thumb.getContext('2d').drawImage(source,0,0,thumb.width,thumb.height);item.image=thumb;
      if(items.length&&items.at(-1).label===item.label)items.pop();
      if(items.length>=5)items.splice(1,1);items.push(item);
    }
    return {items,mark,capture};
  }
  function show(host,config){
    host.querySelector('.mission-report')?.remove();
    const {id,title,summary,plan,prediction,next,again,lesson,history=[],diagram=false}=config;
    const note=(diagram&&DebriefNotes['diagram:'+id])||DebriefNotes[id]||{};
    const doc=document.createElement('section');doc.className='mission-report';doc.setAttribute('role','dialog');doc.setAttribute('aria-modal','true');doc.setAttribute('aria-label','行动复盘');
    const card=document.createElement('div');card.className='report-card';doc.append(card);host.append(doc);
    function el(parent,tag,text,cls){const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;parent.append(e);return e;}
    el(card,'small','行动完成　/　任务复盘','report-eyebrow');el(card,'h2',title);
    el(card,'p',summary,'report-summary');
    const storeKey='robot-atlas.report.v1.'+id+(diagram?'.diagram':'');
    let previous='';try{previous=localStorage.getItem(storeKey)||'';localStorage.setItem(storeKey,summary);}catch{}
    const grid=el(card,'div','','report-grid'),evidence=el(grid,'section','','report-evidence'),theory=el(grid,'section','','report-theory');
    el(theory,'small','本关算法');el(theory,'h3',note.name||title);el(theory,'p',note.question,'report-question');el(theory,'p',note.mechanism);
    if(note.formula)el(theory,'code',note.formula,'report-formula');el(theory,'h4','重玩时试试');el(theory,'p',note.experiment);
    if(previous){const last=el(theory,'details','','report-previous');el(last,'summary','和上次通关比较');el(last,'p',previous);}
    if(lesson){const a=el(theory,'a','查看原理与出处','report-source');a.href='#play/'+lesson;}
    if(plan){
      el(evidence,'h3','搜索怎样找到这条路');const select=el(evidence,'div','','replay-tabs'),chart=el(evidence,'canvas','','replay-canvas');
      const caption=el(evidence,'p','','replay-caption'),range=el(evidence,'input');range.type='range';range.min=0;range.step=1;range.setAttribute('aria-label','回放搜索步骤');
      let data=plan.astar,index=data.frames.length-1;
      function render(){const f=data.frames[index];range.max=data.frames.length-1;range.value=index;SearchReplay.draw(chart,data,index);
        caption.textContent='第 '+(index+1)+' / '+data.frames.length+' 步 · 路口 '+f.current+'　g '+f.g.toFixed(1)+' + h '+f.h.toFixed(1)+' = f '+f.f.toFixed(1);}
      for(const [name,result] of [['A*',plan.astar],['Dijkstra',plan.uniform]]){const b=el(select,'button',name+' · '+result.frames.length+' 个路口');b.type='button';b.setAttribute('aria-pressed',data===result);b.onclick=()=>{data=result;index=data.frames.length-1;for(const k of select.children)k.setAttribute('aria-pressed',k===b);render();};}
      range.oninput=()=>{index=Number(range.value);render();};
      el(evidence,'p','同一路网和代价。Dijkstra 令 h 为零。两者的最优代价都是 '+plan.astar.total.toFixed(1)+' '+plan.astar.unit+'。','report-observation');
      const predict=plan.options.find(v=>v.id===prediction);if(predict)el(evidence,'p','你预测「'+predict.name+'」，搜索结果为「'+plan.name+'」。','report-observation');
      const table=el(evidence,'table','','report-table'),hr=table.createTHead().insertRow();for(const name of ['可通路线','里程','耗电'])el(hr,'th',name);const body=table.createTBody();
      for(const r of plan.options){const row=body.insertRow();if(r.id===plan.best)row.className='report-chosen';for(const v of [r.name,r.meters.toFixed(1)+' m',r.energy.toFixed(1)+' 格'])el(row,'td',v);}
      const ro=new ResizeObserver(render);ro.observe(chart);doc._release=()=>ro.disconnect();render();
    }else{
      el(evidence,'h3','本局操作回看');
      if(history.length){
        const picture=el(evidence,'div','','report-photo'),caption=el(evidence,'p','','replay-caption'),tabs=el(evidence,'div','','replay-tabs stamp-tabs');
        function frame(i){const item=history[i];picture.replaceChildren(item.image);caption.textContent=item.label+(item.detail?' · '+item.detail:'');for(let j=0;j<tabs.children.length;j++)tabs.children[j].setAttribute('aria-pressed',j===i);}
        history.forEach((item,i)=>{const b=el(tabs,'button',String(i+1));b.title=item.label;b.setAttribute('aria-label','回看 '+item.label);b.onclick=()=>frame(i);});frame(history.length-1);
      }else el(evidence,'p',summary);
    }
    const foot=el(card,'div','','report-foot');const n=el(foot,'a',next?.text||'行动地图','report-primary');n.href=next?.href||'#jobs';
    const retry=el(foot,'button','改变条件再试');retry.onclick=()=>{doc._release?.();doc.remove();again();};
    const map=el(foot,'a','行动地图');map.href='#jobs';
    doc.onkeydown=e=>{if(e.key!=='Tab')return;const all=[...doc.querySelectorAll('button,a[href],input')];if(e.shiftKey&&document.activeElement===all[0]){e.preventDefault();all.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===all.at(-1)){e.preventDefault();all[0].focus();}};
    doc.tabIndex=-1;doc.focus({preventScroll:true});return ()=>{doc._release?.();doc.remove();};
  }
  globalThis.MissionDebrief={show,tape};
})();
