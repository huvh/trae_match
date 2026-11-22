(() => {
  'use strict';
  // Guides use the same world coordinates as mission.pointer and never send simulation input.
  const tap=(x,y,label,radius=28)=>({kind:'down',x,y,label,radius});
  const drag=(x,y,tx,ty,label,radius=40)=>({kind:'drag',x,y,tx,ty,label,radius});
  const button=(control,label)=>({kind:'button',control,label});
  const slider=(control,label)=>({kind:'slider',control,label});
  const paths={
    particle:[
      tap(150,100,'在山谷左岸投一枚信标，看粒子聚成弧形。',74),
      tap(650,110,'换到对岸测第二次，看两段测距弧在哪里相交。',80),
      tap(440,380,'从南面再测一次，把两处可能位置缩成一处。',75),
      button('标记救援位置','启动标记，然后自己点出粒子最密处。')],
    histogram:[
      button('向东移动一格','向东开一格，观察哪几根概率柱还亮着。'),
      button('向东移动一格','再向东一格，看新的色标排除了哪些站台。'),
      tap(444,340,'点最高的概率柱，向这个轨段投放药箱。',22)],
    kmeans:[
      tap(200,140,'在左上方的一堆货物中点一下，派出第一队。',55),
      tap(468,176,'把第二队放进中间的另一堆货物。',50),
      tap(575,345,'把第三队放在下方货堆，让每队先占一簇。',48),
      button('执行三轮聚类','启动重新分组，看三个队标怎样移向各自货堆的中心。')],
    icp:[
      drag(509,285,370,235,'按住蓝色扫描的中心，向左上方拖到浅色栈道。',45),
      slider('扫描朝向（度）','转动扫描方向，让两组线段的拐角朝向接近。'),
      button('启动 ICP 配准','开始匹配，看每次迭代怎样缩短对应点的距离。')],
    circle:[
      tap(502,240,'点右侧圆弧上的一粒回波，选取第一段罐壁。',18),
      tap(386,335,'再点下方的圆弧，给半径一个不同方向的约束。',18),
      tap(291,220,'接着点对侧圆弧。还要补一处上方回波，再拟合罐壁。',18)],
    rectangle:[
      drag(269,150,448,300,'从箱体左上向右下拖框，只圈住斜放的箱体回波。',35),
      button('计算夹具','让夹具旋转贴边，检查框内有没有混入外部回波。')],
    raycast:[
      tap(150,150,'在左侧泵房里点一下，观察射线在哪道墙前停住。',50),
      tap(390,290,'将第二台放进下方岔廊，补上隔墙后的盲区。',45),
      tap(630,150,'看看哪个作业区仍暗着，把下一台放在那里。',45)],
    gaussian:[
      tap(210,220,'点第一道雾门，补测一次两侧岩壁。',53),
      tap(400,220,'点第二道门，看橙色不确定区如何收窄。',55),
      tap(590,220,'再测第三道门，为车辆找出连续的通行空间。',55),
      slider('安全倍数（标准差）','调整安全倍数，比较绿线间距，再计算路线通行。')],
    ekf:[
      button('行驶 / 暂停','启动巡检车，留意车辆与第一座信标的距离。'),
      tap(208,135,'车驶近第一座信标时点它，用一次观测校正漂移。',32),
      tap(395,326,'靠近中段信标时再测一次。为后半程留一次校正。',32)],
    fastslam:[
      button('扫描地标','在基地先扫描，记住圈内出现的地标。'),
      tap(306,208,'点前方空地开过去，让新位置还能看见一个旧地标。',54),
      button('扫描地标','等车停稳再扫描。继续巡回，让新旧地标在观测中重叠。')],
    'graph-slam':[
      tap(105,300,'点左边的「闸房」，选中第一次到访记录。',26),
      tap(171,348,'再点另一条「闸房」记录，告诉地图它们是同一处。',26),
      tap(256,193,'同样配对两条「岗亭」，再优化整张地图。',26)],
    prm:[
      tap(160,300,'在基地连线范围内的空地布下第一枚路标。',38),
      tap(270,305,'在第一块岩石下方补路标，看哪两点自动连边。',32),
      tap(365,220,'穿过两岩间的缺口。继续沿空地搭路网直到能派车。',33)],
    rrt:[
      tap(132,390,'点入口右下的空地，让最近的树梢朝这里伸长。',40),
      tap(205,400,'继续沿岩石下缘采样，留意每次树枝只能生长一段。',34),
      tap(280,394,'带树梢绕到岩石右侧，再自己朝缺口和出口扩展。',30)],
    'rrt-star':[
      tap(162,260,'在起点右侧的空地采样，试着打开山脊下方的捷径。',35),
      tap(270,271,'沿岩脚继续补点，观察新节点选择了哪一条父边。',32),
      tap(378,278,'向出口延伸捷径，让旧节点能通过新枝缩短路线。',32)],
    potential:[
      button('启动导航','启动车辆，等它在几块岩石夹出的低谷前停住。'),
      tap(390,60,'在上侧空地布置临时吸引点，让合力有侧向分量。',60)],
    coverage:[button('启动清淤','先让清淤机寻找离它最近的淤泥。'),tap(397.5,138,'点北闸或用下方布桥键连通两岸。',36)],
    sweep:[
      drag(170,205,600,205,'在滩地上从左向右拖一条线，指定往返扫描方向。',50),
      slider('扫描行距（米）','缩小行距，查看航线间的漏扫空隙和总行程。'),
      button('执行扫描','派车按条带来回扫描，查看覆盖比例。')],
    visibility:[
      tap(200,372,'从起点点向仓房左下角，让第一段视线擦过外角。',24),
      tap(340,372,'沿墙面点右下角，再挑一处看得见的角点绕出仓区。',24)],
    voronoi:[
      tap(96,231,'点击小车右边第一个金色岔口，沿两岩等距线前行。',24),
      tap(131,195,'向右上方的相邻岔口前进，留意天线的最窄净空。',24),
      tap(226,195,'沿这段宽边向右，再自行选择足够宽的相邻边。',24)],
    'dstar-lite':[
      button('沿当前路线行驶','按旧地图发车，等车在第一处断口前停车。'),
      tap(310,228,'车辆停在断口前时，点断口更新这条路的通行代价。',32),
      button('沿当前路线行驶','沿修好的新路线出发，下一次遇阻再就地测绘。')],
    pso:[
      tap(370,380,'在岩石下方放一粒候选中转点，查看对应折线路线。',50),
      tap(410,355,'在它旁边再放一粒。试着分散布满四粒，再推进十代。',32)],
    hybrid:[
      drag(468,229,404,229,'在库前空地按住，向左拖出车头方向，设定整备姿态。',42),
      button('计算进库动作','计算带挡位的进库轨迹，检查能否在电量预算内完成。'),
      button('执行进库','执行计划，观察车辆在什么位置从前进换到倒挡。')],
    dijkstra:[
      tap(155,163,'点左上方路段中间的能耗数字，铺下第一块防滑板。',24),
      tap(584,213,'把另一块铺在同一路线的高耗能边，比较绿色路线。',24),
      button('派出满载车','派出满载车，查看两块板把总能耗降到了多少。')],
    bug:[
      button('沿目标线行驶','先沿直线向出口行驶，让车找出第一个碰壁点。'),
      button('沿墙探路','碰壁停车后沿墙走，等小车重新接触原目标线。'),
      button('在此离墙','到墙的另一侧、重新遇到目标线时离墙。')],
    breadth:[
      tap(228,255,'点左侧带支路的村庄，架设第一座广播塔。',23),
      tap(568,186,'给远端村落也设一座塔，让两股消息同时传播。',23),
      button('发送接力广播','开始广播，看每一轮消息能走几条边。')],
    depth:[
      tap(204,236,'点和入口直接相连的金色井口，放绳前进。',25),
      tap(307,107,'沿上方支路继续，记住绳索走过的先后次序。',24),
      tap(420,81,'走到这条支路的尽头，再收绳回到最近岔口。',24),
      button('收绳 · 回退一层','回退一层，继续检查旁边尚未探索的井口。')],
    quintic:[
      slider('行驶时长（秒）','拉长行驶时间，看加加速度如何下降，并留意渡板对齐时段。'),
      button('执行发车曲线','发车，观察车头经过渡板时它是否已经对齐。')],
    frenet:[
      tap(298,318,'点第一根横向标尺的下端，让轨迹错开第一辆施工车。',24),
      tap(536,150,'在第二根标尺上向另一侧偏移，给第二次会车留净空。',24),
      button('试跑廊道','让车沿这条偏移曲线试跑，检查会车时的间距。')],
    stanley:[
      slider('纠偏增益','向右调高纠偏增益，让前轴偏离巡检线时更积极地转向。'),
      button('从起点巡检','发车，观察黄色偏差线在侧风中能否逐渐缩短。')],
    'gps-imu':[
      tap(351,235,'在路线中段布下一座校正站，纠正已经积累的轮速漂移。',45),
      tap(614,165,'给后段留第二座站，避免校正后还要走很远。',47),
      button('发车测漂移','发车，对比独立推算和融合后的两条轨迹。')],
    dwa:[
      tap(140,91,'点左上方空地设临时目标，让车从第一块岩石上方绕行。',35),
      tap(324,90,'车接近上侧通道后再向右设点，观察绿色候选弧线。',36),
      tap(380,211,'把目标移到第一台仪器旁边，再去另一台采样。',29)],
    pose:[
      drag(278,155,340,155,'在管盘左上方按住，向右拖出中途停靠的车头朝向。',43),
      button('行驶至标记位姿','让车先到中间位姿，再从管盘侧面接近插口。')],
    'lqr-track':[
      slider('位置误差权重 Q','加大位置偏差的代价，观察控制器怎样分配侧向推力。'),
      button('启动侧滑台','启动试车，查看转弯处的偏差和最终均方根误差。')],
    dubins:[
      tap(411,111,'在泵房上方放中转位姿，为后方长管留出转弯空间。',33),
      button('试运长管','发车。注意车头已经过弯时，长管尾部扫过的范围。')],
    mpc:[
      button('发车 / 重新试车','先试一次短预测，看看车辆能提前看见哪道窄门。'),
      slider('预测步数','停车后加长预测窗口，看绿色轨迹能否预先瞄准下一道门。'),
      button('发车 / 重新试车','从起点再跑一次，比较过门时的运动轨迹。')],
    lattice:[
      button('直行一格','先编排一格直行，看地图上出现的下一车位。'),
      button('左弧 90°','接一段左转弧线，让车头朝向扫描台。'),
      button('直行一格','接上直行动作，继续编排能经过扫描台再入库的曲线。')],
    'arm-ik':[
      tap(184,248,'点左侧的备用电芯，让两个关节转动，把夹爪送过去。',23),
      button('夹取 / 放下','等夹爪到达电芯，再夹紧。'),
      tap(617,218,'点右侧圆形插座，等夹爪带着电芯靠过去。',22),
      button('夹取 / 放下','对准插座后释放，完成换装。')],
    'n-arm':[
      tap(518,260,'点发光的接口，把多节机械臂的管头移到接合位置。',26),
      slider('末节俯仰角（度）','调节最后一节的倾角，让管头与导管轴线对齐。'),
      button('接合导管','位置与方向都吻合后，执行接合。')],
    'arm-obstacles':[
      tap(220,140,'点立管左侧的电芯，让夹爪靠近。',24),
      button('夹取 / 放下','等夹爪就位后夹紧电芯。'),
      tap(280,280,'先把夹爪引到立管下方，观察肘部离管道有多远。',36),
      tap(580,140,'确认整条手臂都能绕过立管，再将电芯送到插座释放。',24)],
    drone:[
      tap(217,145,'点第一片障碍上方的空隙，布设爬升航点。',34),
      tap(340,148,'在高处再设一点，给飞行器足够的越障时间。',30),
      tap(458,277,'开始下降，给后面的低空走廊预留下降距离。',36)],
    landing:[
      button('开始 / 重试下降','放开吊舱，先读高度和向下的速度。'),
      slider('升力输出（%）','下落过快就增加升力。临近地面时让垂直速度接近零。')],
    biped:[
      slider('起步速度（米/秒）','调整起步速度，让捕获点落到前面第一座石台上。'),
      tap(198,325,'在第一座石台上点出落脚点，比较它与捕获点的位置。',25),
      button('落脚并试稳','落脚试稳，再按下一座石台的距离调速。')]
  };

  function near(x,y,tx,ty,r){return Math.hypot(x-tx,y-ty)<=r;}
  function cursor(g,x,y,contact){
    g.save();g.translate(x+1,y+1);
    const scale=contact ? .87 : 1;g.scale(scale,scale);
    g.beginPath();g.moveTo(0,0);g.lineTo(4,22);g.lineTo(9,17);g.lineTo(14,25);
    g.lineTo(18,22);g.lineTo(13,14);g.lineTo(21,13);g.closePath();
    g.strokeStyle='#10242c';g.lineJoin='round';g.lineWidth=5;g.stroke();
    g.fillStyle=contact?'#fff1bc':'#e7fbf3';g.fill();
    g.restore();
  }
  function ring(g,x,y,r,alpha){
    g.save();g.globalAlpha=alpha;
    g.beginPath();g.arc(x,y,r,0,2*Math.PI);
    g.strokeStyle='#08252a';g.lineWidth=5;g.stroke();g.strokeStyle='#ffda85';g.lineWidth=2.6;g.stroke();g.restore();
  }
  function create(mission){
    const steps=paths[mission.id]||[];
    let current=0,held=false;
    const reset=()=>{current=0;held=false;};
    const hide=()=>{current=steps.length;held=false;};
    function advance(kind,x,y,actionLabel){
      const s=steps[current];if(!s)return;
      let match=false;
      if(s.kind==='drag'){
        if(kind==='down'){held=near(x,y,s.x,s.y,s.radius);return;}
        if(kind==='up'){match=held&&near(x,y,s.tx,s.ty,s.radius*1.7);held=false;}
      }else if(s.kind===kind){
        match=s.control?String(actionLabel||'').includes(s.control):near(x,y,s.x,s.y,s.radius);
      }
      if(match){held=false;current++;}
    }
    function draw(g,time){
      const s=steps[current];if(!s||s.control)return;
      const phase=((Number(time)||0)%2.1)/2.1;
      g.save();g.lineCap='round';
      if(s.kind==='drag'){
        const f=Math.max(0,Math.min(1,(phase-.15)/.62));
        g.strokeStyle='#fff1be';g.lineWidth=3;g.setLineDash([6,7]);g.lineDashOffset=-phase*22;
        g.beginPath();g.moveTo(s.x,s.y);g.lineTo(s.tx,s.ty);g.stroke();g.setLineDash([]);
        ring(g,s.x,s.y,14,.78);ring(g,s.tx,s.ty,15+phase*5,.85-phase*.32);
        const ease=f*f*(3-2*f);
        cursor(g,s.x+(s.tx-s.x)*ease,s.y+(s.ty-s.y)*ease,phase>=.15&&phase<.87);
      }else{
        const contact=phase>.34&&phase<.68;
        ring(g,s.x,s.y,14,.89);ring(g,s.x,s.y,17+12*phase,(1-phase)*.58);
        const glide=contact?0:4+5*Math.cos(phase*Math.PI*2);
        cursor(g,s.x+glide,s.y+glide,contact);
      }
      g.restore();
    }
    return {draw,advance,reset,repeat:reset,hide,step:()=>current,
      target:()=>steps[current]&&!steps[current].control?steps[current]:null,label:()=>steps[current]?.label||'',control:()=>steps[current]?.control||null};
  }
  globalThis.FieldCoach={create};
})();
