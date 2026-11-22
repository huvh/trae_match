(() => {
  "use strict";

  const mint = "#68e8c4", gold = "#ffcb79", violet = "#b8a9ff";
  const width = 540, height = 285;
  const styles = `
  .ra-lab{color:#eef5ff;background:#142037;border:1px solid #34445c;border-radius:14px;overflow:hidden;font-family:inherit}
  .ra-lab svg{display:block;width:100%;height:auto;max-height:400px;background:#111b30;touch-action:manipulation;outline-offset:-3px;cursor:crosshair}
  .ra-lab svg:focus-visible,.ra-lab button:focus-visible,.ra-lab select:focus-visible{outline:2px solid #ffcb79}
  .ra-lab .ra-pane{display:grid;gap:9px;padding:12px 14px}
  .ra-lab .ra-controls,.ra-lab .ra-key{display:flex;align-items:center;gap:6px 10px;flex-wrap:wrap}
  .ra-lab button,.ra-lab select{font:inherit;font-size:14px;font-weight:650;line-height:1.35;padding:7px 12px;min-height:34px;border:1px solid #41516a;border-radius:7px;background:#1c2b43;color:#e4effa;cursor:pointer;box-shadow:none;width:auto}
  .ra-lab button[data-action="play"],.ra-lab button[data-action="step"]:first-child{background:#68e8c4;color:#0a2c2a;border-color:transparent}
  .ra-lab button:hover,.ra-lab select:hover{border-color:#7ee5cc}
  .ra-lab button:disabled{opacity:.5;cursor:default}
  .ra-lab .ra-metrics{font-size:14px;color:#ffd79a;font-variant-numeric:tabular-nums}
  .ra-lab .ra-key,.ra-lab .ra-note{font-size:14px;color:#bbcbda;line-height:1.5}
  .ra-lab .ra-key span{display:inline-flex;align-items:center;gap:5px}
  .ra-lab .ra-key i{width:8px;height:8px;border-radius:2px;display:inline-block}
  .ra-lab .ra-key,.ra-lab .ra-note,.ra-lab .ra-metrics{margin:0}
  @media(max-width:480px){.ra-lab .ra-pane{padding:9px 10px}.ra-lab button{padding:6px 8px}}
  `;

  function svgLine(x1, y1, x2, y2, color, stroke = 1, extra = "") {
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${stroke}" ${extra}/>`;
  }
  function dot(x, y, r, fill, extra = "") {
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`;
  }
  function label(x, y, text, color = "#c1d1df", size = 13) {
    return `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-family="system-ui,sans-serif">${text}</text>`;
  }
  function gridBackground() {
    let lines = "";
    for (let x = 0; x < width; x += 24) lines += svgLine(x, 0, x, height, "#20304a");
    for (let y = 0; y < height; y += 24) lines += svgLine(0, y, width, y, "#20304a");
    return lines;
  }
  function key(items) {
    return items.map(([c, s]) => `<span><i style="background:${c}"></i>${s}</span>`).join("");
  }

  const cols = 19, rows = 9, cell = 27, left = 13.5, top = 21;
  const start = cols * 4 + 1, goal = cols * 4 + 17;
  function initialWalls() {
    const walls = new Set();
    for (let y = 2; y <= 7; y++) walls.add(y * cols + 8);
    for (let x = 8; x <= 11; x++) walls.add(7 * cols + x);
    return walls;
  }
  function gridSearch(walls, useHeuristic) {
    const distance = n => useHeuristic ? Math.abs(n % cols - goal % cols) +
      Math.abs(Math.floor(n / cols) - Math.floor(goal / cols)) : 0;
    const queue = [{n:start, g:0, h:distance(start), order:0}];
    const costs = new Map([[start, 0]]), parent = new Map(), visited = new Set(), history = [];
    let order = 0;
    while (queue.length) {
      queue.sort((a,b) => (a.g+a.h)-(b.g+b.h) || a.h-b.h || a.order-b.order);
      const cur = queue.shift();
      if (visited.has(cur.n)) continue;
      visited.add(cur.n);
      const higher = queue.filter(node => !visited.has(node.n) && node.g === costs.get(node.n) &&
        node.g + node.h > cur.g + cur.h);
      const choices = higher.length ? [cur, higher[0]] : [];
      const last = higher[higher.length - 1];
      if (higher.length > 1 && last.n !== higher[0].n) choices.push(last);
      choices.sort((a,b) => a.n-b.n);
      history.push({...cur, choices});
      if (cur.n === goal) {
        const path = [cur.n];
        while (path[path.length-1] !== start) path.push(parent.get(path[path.length-1]));
        return {history, path:path.reverse()};
      }
      const x = cur.n % cols, y = Math.floor(cur.n/cols);
      for (const [dx,dy] of [[1,0],[0,-1],[0,1],[-1,0]]) {
        const xx = x+dx, yy = y+dy;
        if (xx<0 || yy<0 || xx>=cols || yy>=rows) continue;
        const n = yy*cols+xx, g = cur.g+1;
        if (walls.has(n) || g >= (costs.get(n) ?? Infinity)) continue;
        costs.set(n,g);
        parent.set(n,cur.n);
        queue.push({n,g,h:distance(n),order:++order});
      }
    }
    return {history, path:[]};
  }

  function bindGrid(ui, kind) {
    let walls = initialWalls(), heuristic = kind === "astar", trace, step, timer, cursor = start + 1;
    let guessing = false;
    const point = n => [left + (n%cols+.5)*cell, top + (Math.floor(n/cols)+.5)*cell];
    ui.controls.innerHTML = '<button data-action="guess">猜下一格</button><button data-action="play">播放搜索</button><button data-action="step">单步</button><button data-action="mode"></button><button data-action="reset">恢复地图</button>';
    const answers=document.createElement("div");
    answers.className="ra-controls";
    answers.setAttribute("role","group");
    answers.setAttribute("aria-label","候选格");
    ui.controls.after(answers);
    ui.note.setAttribute("aria-live","polite");
    const editHint = "点空格放墙，点墙移除。键盘可用方向键选格、空格编辑。";
    function finishGuess() {
      guessing=false;
      answers.replaceChildren();
      answers.hidden=true;
    }
    ui.legend.innerHTML = key([["#405775","墙体"],["#2c827b","已检查"],[gold,"当前格"],[mint,"最短路"]]);
    function stop() {
      clearInterval(timer);
      timer = null;
    }
    function restart() {
      stop();
      finishGuess();
      ui.note.textContent=editHint;
      trace = gridSearch(walls, heuristic);
      step = 0;
      draw();
    }
    function draw() {
      const explored = new Set(trace.history.slice(0,step).map(n => n.n));
      const current = trace.history[step-1], finished = step === trace.history.length;
      let art = "";
      for (let n=0; n<cols*rows; n++) {
        const [cx,cy] = point(n);
        const fill = walls.has(n) ? "#405775" : current?.n === n ? gold : explored.has(n) ? "#2c827b" : "#1a2a43";
        art += `<rect x="${cx-cell/2+1}" y="${cy-cell/2+1}" width="${cell-2}" height="${cell-2}" rx="3" fill="${fill}"/>`;
      }
      if (finished && trace.path.length) {
        const coords = trace.path.map(n => point(n).join(",")).join(" ");
        art += `<polyline points="${coords}" fill="none" stroke="${mint}" stroke-width="4" stroke-linejoin="round"/>`;
      }
      for (const [n,color,caption] of [[start,mint,"起"],[goal,gold,"终"]]) {
        const [x,y] = point(n);
        art += dot(x,y,11,color) + label(x-6,y+4.4,caption,"#132638",12);
      }
      if (guessing) trace.history[step].choices.forEach(({n},i)=>{
        const [x,y]=point(n);
        art += dot(x,y,11,"#313958",`stroke="${violet}" stroke-width="2"`) +
          label(x-5,y+5,"ABC"[i],"#fff2c8",14);
      });
      if (document.activeElement === ui.scene) {
        const [x,y] = point(cursor);
        art += `<rect x="${x-12}" y="${y-12}" width="24" height="24" fill="none" stroke="#fff" stroke-width="2"/>`;
      }
      ui.scene.innerHTML = art;
      ui.metrics.textContent = `已检查 ${step} 格　` + (finished ? (trace.path.length ? `最短路 ${trace.path.length-1} 步` : "终点不可达") :
        current ? `当前格　g = ${current.g}　h = ${current.h}　f = ${current.g+current.h}` : "等待搜索");
      ui.action("play").textContent = timer ? "暂停" : finished ? "重新播放" : "播放搜索";
      ui.action("step").disabled = finished || guessing;
      ui.action("guess").textContent = guessing ? "退出猜题" : "猜下一格";
      ui.action("guess").setAttribute("aria-pressed",String(guessing));
      ui.action("mode").textContent = heuristic ? "启发函数：开启" : "启发函数：关闭";
      ui.action("mode").setAttribute("aria-pressed",String(heuristic));
    }
    function advance() {
      step = Math.min(trace.history.length,step+1);
      if (step >= trace.history.length) stop();
      draw();
    }
    function beginGuess() {
      stop();
      const before = step;
      let index=trace.history.findIndex((item,i)=>i>=before && item.choices.length);
      if (index===-1) index=trace.history.findIndex(item=>item.choices.length);
      if (index===-1) {
        ui.note.textContent="这张地图没有出现不同优先级的候选格。移除墙体或恢复地图再试。";
        draw();
        return;
      }
      step=index;
      guessing=true;
      const choices=trace.history[index].choices;
      cursor=choices[0].n;
      answers.hidden=false;
      answers.innerHTML=choices.map((p,i)=>{
        const cost=heuristic ? `g ${p.g} + h ${p.h} = ${p.g+p.h}` : `g = ${p.g}`;
        return `<button type="button" data-choice="${p.n}">${"ABC"[i]} · ${cost}</button>`;
      }).join("");
      const intro=before===index ? "搜索已暂停。" : `已定位到检查 ${step} 格后的分岔处。`;
      ui.note.textContent=intro+"比较标出的候选格，点击你认为接下来会被检查的格子。";
      draw();
    }
    function pick(n) {
      const next=trace.history[step], selected=next.choices.find(node=>node.n===n);
      if (!selected) {ui.note.textContent="请选一个带字母标记的候选格。";return;}
      const score=node=>node.g+node.h;
      const unit=heuristic ? "总分 f" : "已走步数 g";
      if (score(selected)!==score(next)) {
        ui.note.textContent=`这一格的${unit}是 ${score(selected)}，还有分数更低的候选。再试一次。`;
        return;
      }
      const letter="ABC"[next.choices.indexOf(selected)];
      finishGuess();
      advance();
      ui.note.textContent=`猜对了！在标出的候选格中，${letter} 的${unit}最小（${score(next)}），本步已检查这一格。可继续播放或再猜一格。`;
      ui.action("guess").focus();
    }
    answers.addEventListener("click",e=>{
      const button=e.target.closest("button[data-choice]");
      if (button && guessing) pick(Number(button.dataset.choice));
    });
    ui.onAction(action => {
      if (action==="guess") {
        if (!guessing) beginGuess();
        else {finishGuess();ui.note.textContent=editHint;draw();}
      } else if (action === "play") {
        finishGuess();
        ui.note.textContent=editHint;
        if (timer) stop();
        else {
          if (step === trace.history.length) step=0;
          timer = setInterval(advance,70);
        }
        draw();
      } else if (action === "step") { stop(); advance(); }
      else if (action === "mode") { heuristic = !heuristic; restart(); }
      else if (action === "reset") { walls=initialWalls(); heuristic=kind==="astar"; restart(); }
    });
    function edit(n) {
      if (guessing) {pick(n);return;}
      if (n===start || n===goal) return;
      if (walls.has(n)) walls.delete(n); else walls.add(n);
      restart();
    }
    ui.onPoint((x,y) => {
      const xx=Math.floor((x-left)/cell), yy=Math.floor((y-top)/cell);
      if (xx>=0 && xx<cols && yy>=0 && yy<rows) { cursor=yy*cols+xx; edit(cursor); }
    });
    ui.scene.addEventListener("keydown",e => {
      const dir = {ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
      if (dir) {
        e.preventDefault();
        const x = Math.max(0,Math.min(cols-1,cursor%cols+dir[0]));
        const y = Math.max(0,Math.min(rows-1,Math.floor(cursor/cols)+dir[1]));
        cursor = y*cols+x;
        draw();
      } else if (e.key === " " || e.key === "Enter") { e.preventDefault(); edit(cursor); }
    });
    ui.scene.addEventListener("focus",draw);
    ui.scene.addEventListener("blur",draw);
    restart();
    return stop;
  }

  const origin = [260,148], a = 80, b = 53;
  function solveArm(x,y,sign) {
    const dx = x-origin[0], dy = origin[1]-y;
    const cosine = (dx*dx+dy*dy-a*a-b*b)/(2*a*b);
    if (Math.abs(cosine)>1+1e-9) return null;
    const q2 = sign*Math.acos(Math.max(-1,Math.min(1,cosine)));
    const q1 = Math.atan2(dy,dx)-Math.atan2(b*Math.sin(q2),a+b*Math.cos(q2));
    return {q1,q2,elbow:[origin[0]+a*Math.cos(q1),origin[1]-a*Math.sin(q1)]};
  }
  function bindArm(ui) {
    let tx=341, ty=94, sign=1, lastTarget=[tx,ty];
    ui.controls.innerHTML = '<button data-action="branch">切换肘部方向</button><button data-action="outside">试试够不到的点</button><button data-action="reset">重置目标</button>';
    ui.legend.innerHTML = key([[mint,"第一连杆"],[violet,"第二连杆"],[gold,"目标"]]);
    ui.note.textContent = "点画布放置目标，或用方向键移动目标。虚线圆之间是末端可达范围。";
    function draw() {
      const solution=solveArm(tx,ty,sign);
      if (solution) lastTarget=[tx,ty];
      const pose = solution || solveArm(...lastTarget,sign);
      const [ox,oy] = origin, [ex,ey] = pose.elbow;
      let art=gridBackground();
      for (const r of [a+b,a-b]) art += dot(ox,oy,r,"none",'stroke="#57728b" stroke-dasharray="4 5"');
      art += svgLine(ox,oy,ex,ey,mint,12,'stroke-linecap="round"');
      art += svgLine(ex,ey,...lastTarget,violet,9,'stroke-linecap="round"');
      art += dot(ox,oy,9,"#17223a",'stroke="#bac9db" stroke-width="4"');
      art += dot(ex,ey,6,"#19263a",'stroke="#e0e9f2" stroke-width="3"') + dot(...lastTarget,4,"#f1f6ff");
      art += dot(tx,ty,10,"none",`stroke="${gold}" stroke-width="2"`);
      art += svgLine(tx-15,ty,tx-7,ty,gold,2)+svgLine(tx+7,ty,tx+15,ty,gold,2);
      if (!solution) art+=label(15,24,"目标超出可达范围",gold,14);
      ui.scene.innerHTML=art;
      const deg=q=>Math.round(q*180/Math.PI);
      ui.metrics.textContent = solution ? `目标可达　肩关节 ${deg(pose.q1)}°　肘关节 ${deg(pose.q2)}°` : "目标不可达　机械臂停留在上一个可达位置";
    }
    ui.onPoint((x,y)=>{ tx=x; ty=y; draw(); });
    ui.scene.addEventListener("keydown",e=>{
      const dir={ArrowLeft:[-6,0],ArrowRight:[6,0],ArrowUp:[0,-6],ArrowDown:[0,6]}[e.key];
      if (!dir) return;
      e.preventDefault(); tx=Math.max(0,Math.min(width,tx+dir[0])); ty=Math.max(0,Math.min(height,ty+dir[1])); draw();
    });
    ui.onAction(action=>{
      if (action==="branch") sign*=-1;
      if (action==="outside") {tx=465;ty=70;}
      if (action==="reset") {tx=341;ty=94;sign=1;}
      draw();
    });
    draw();
  }

  const colors=[mint,gold,violet,"#75bcff","#fc96ae"];
  function dataSet(seed) {
    function random() { seed=(1664525*seed+1013904223)>>>0; return seed/4294967296; }
    const points=[];
    for (const [x,y] of [[115,94],[227,203],[342,74],[414,190]]) {
      for (let i=0;i<18;i++) points.push([x+(random()+random()-1)*63,y+(random()+random()-1)*50]);
    }
    return points;
  }
  function fit(points,centers) {
    const groups=centers.map(()=>[]), labels=[];
    let error = 0;
    for (const p of points) {
      let best=0, distance=Infinity;
      centers.forEach(([x,y],j)=>{
        const d=(p[0]-x)**2+(p[1]-y)**2;
        if (d<distance) {distance=d;best=j;}
      });
      labels.push(best); groups[best].push(p); error+=distance;
    }
    const means=groups.map((g,j)=>g.length ? [0,1].map(i=>g.reduce((s,p)=>s+p[i],0)/g.length) : centers[j]);
    return {labels,error,means};
  }
  function bindClusters(ui) {
    let seed=92, centers, points, iteration, result, done;
    ui.controls.innerHTML='<button data-action="step">迭代一步</button><label>簇数 <select aria-label="簇数"><option>2</option><option selected>3</option><option>4</option><option>5</option></select></label><button data-action="rerun">换一组数据</button><button data-action="reset">重新迭代</button>';
    ui.legend.innerHTML=key([[mint,"圆点为观测"],[gold,"菱形为簇中心"]]);
    ui.note.textContent="每一步先按距离分组，再把各簇中心移到本组的平均位置。";
    const select=ui.controls.querySelector("select");
    function draw() {
      let art=gridBackground();
      points.forEach(([x,y],i)=>{art+=dot(x,y,3.9,colors[result.labels[i]]);});
      centers.forEach(([x,y],i)=>{
        art+=`<path d="M ${x} ${y-9} l 9 9 -9 9 -9 -9 Z" fill="#0e192c" stroke="${colors[i]}" stroke-width="3"/>`;
      });
      ui.scene.innerHTML=art;
      ui.action("step").disabled=done;
      ui.metrics.textContent=`第 ${iteration} 次迭代　平方误差 ${Math.round(result.error).toLocaleString("zh-CN")}${done?"　已收敛":""}`;
    }
    function reset() {
      points=dataSet(seed);
      centers=[points[0],points[20],points[11],points[55],points[33]].slice(0,Number(select.value));
      result=fit(points,centers); iteration=0; done=false; draw();
    }
    function advance() {
      centers=result.means;
      const next=fit(points,centers);
      done=next.labels.every((j,i)=>j===result.labels[i]);
      result=next; iteration++; draw();
    }
    select.addEventListener("change",reset);
    ui.onAction(action=>{
      if (action==="step" && !done) advance();
      if (action==="rerun") {seed++; reset();}
      if (action==="reset") reset();
    });
    ui.scene.removeAttribute("tabindex");
    ui.scene.style.cursor="default";
    reset();
  }

  globalThis.mountLab = (container,kind) => {
    const types={astar:"A* 栅格搜索",dijkstra:"Dijkstra 栅格搜索",arm:"双连杆机械臂",kmeans:"K-means 聚类"};
    if (!Object.hasOwn(types,kind)) return ()=>{};
    if (!document.getElementById("ra-lab-style")) {
      const style=document.createElement("style");style.id="ra-lab-style";style.textContent=styles;document.head.append(style);
    }
    const root=document.createElement("section");
    root.className="ra-lab";
    root.setAttribute("aria-label",types[kind]);
    root.innerHTML=`<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${types[kind]}交互图" tabindex="0"></svg><div class="ra-pane"><div class="ra-key"></div><p class="ra-metrics"></p><div class="ra-controls"></div><p class="ra-note"></p></div>`;
    container.replaceChildren(root);
    const scene=root.querySelector("svg"), controls=root.querySelector(".ra-controls");
    const ui={scene,controls,legend:root.querySelector(".ra-key"),metrics:root.querySelector(".ra-metrics"),note:root.querySelector(".ra-note"),
      action:name=>controls.querySelector(`[data-action="${name}"]`),
      onAction:handler=>controls.addEventListener("click",e=>{
        const button=e.target.closest("button[data-action]");
        if (button && controls.contains(button)) handler(button.dataset.action);
      }),
      onPoint:handler=>scene.addEventListener("click",e=>{
        const transform=scene.getScreenCTM();
        if (!transform) return;
        const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(transform.inverse());
        if (p.x>=0 && p.x<=width && p.y>=0 && p.y<=height) handler(p.x,p.y);
      })
    };
    const stop = kind==="arm" ? bindArm(ui) : kind==="kmeans" ? bindClusters(ui) : bindGrid(ui,kind);
    return ()=>{if(stop) stop();root.remove();};
  };
})();
