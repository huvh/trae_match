/* Continuous map coordinates use 0.25 metres per unit; angles increase clockwise from east. */
(() => {
  'use strict';

  const nodes = {
    S:{x:108,y:341}, A:{x:292,y:285}, B:{x:235,y:415}, C:{x:475,y:349},
    D:{x:426,y:130}, E:{x:637,y:177}, F:{x:653,y:367}, G:{x:800,y:224}
  };
  const edges = [
    ['S','A'],['S','B'],['A','C'],['A','D'],['B','C'],['C','D'],
    ['C','E'],['C','F'],['D','E'],['E','G'],['F','G']
  ];
  const metersPerUnit = 0.25;
  const rangeMax = 220;
  const aimTolerance = 2.2 * Math.PI / 180;
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const clamp = (value,min,max) => Math.min(max,Math.max(min,value));
  const blockedLane = variant => Number(variant)===1?'B':'A';
  const laneAngle = lane => Math.atan2(nodes[lane].y-nodes.S.y,nodes[lane].x-nodes.S.x);
  const angleDifference = (a,b) => Math.atan2(Math.sin(a-b),Math.cos(a-b));

  function rocks(variant) {
    const lane = blockedLane(variant);
    const angle = laneAngle(lane), length = distance(nodes.S,nodes[lane])*.67;
    const along = {x:Math.cos(angle),y:Math.sin(angle)};
    const across = {x:-along.y,y:along.x};
    return [[-2,0,9.3],[2,-8,7.4],[3.3,8.5,6.9]].map(([shift,side,r])=>({
      x:nodes.S.x+(length+shift)*along.x+across.x*side,
      y:nodes.S.y+(length+shift)*along.y+across.y*side,r
    }));
  }

  function scan(variant,angle) {
    if (!Number.isFinite(angle)) throw new TypeError('A ray needs a finite angle');
    const dx=Math.cos(angle),dy=Math.sin(angle);
    let range=rangeMax,hit=false;
    for(const rock of rocks(variant)){
      const rx=rock.x-nodes.S.x,ry=rock.y-nodes.S.y;
      const projection=rx*dx+ry*dy, perpendicular=rx*dy-ry*dx;
      const discriminant=rock.r*rock.r-perpendicular*perpendicular;
      if(discriminant<0)continue;
      const entry=projection-Math.sqrt(discriminant);
      if(entry>=0 && entry<=range){range=entry;hit=true;}
    }
    const lane=['A','B'].find(id=>Math.abs(angleDifference(angle,laneAngle(id)))<=aimTolerance)||null;
    // Unobstructed evidence covers this sampled centre ray to the junction, not the entire fan.
    const certified=lane!==null && (hit || range>=distance(nodes.S,nodes[lane]));
    const status=certified?(hit?'blocked':'clear'):'unconfirmed';
    return {angle,lane,range,hit,status,certified,clear:status==='clear',
      point:{x:nodes.S.x+dx*range,y:nodes.S.y+dy*range}};
  }

  // Integer map costs keep the scores shown to the learner exact.
  // Rounded-down straight-line distance is admissible for rounded-up edge lengths.
  const edgeCost = (a,b) => Math.ceil(distance(nodes[a],nodes[b]));
  const heuristic = id => Math.floor(distance(nodes[id],nodes.G));
  function makeSearch(blocked) {
    if(blocked!=='A'&&blocked!=='B')throw new TypeError('A measured blocked lane is required');
    const frontier=new Map(),closed=new Set(),parents=new Map();
    let route=[],done=false;
    function offer(id,g,parent){
      const old=frontier.get(id);
      if(closed.has(id)||(old&&old.g<=g))return;
      const h=heuristic(id);
      frontier.set(id,{id,g,h,f:g+h,parent});
      parents.set(id,parent);
    }
    offer('S',0,null);
    function expand(id){
      const entry=frontier.get(id);
      let reason=done?'finished':!entry?'not-frontier':'';
      if(!reason && entry.f>Math.min(...Array.from(frontier.values(),n=>n.f)))reason='not-minimum';
      if(reason)return {accepted:false,reason,done,route:[...route]};
      frontier.delete(id);closed.add(id);
      if(id==='G'){
        done=true;
        for(let step='G';step;step=parents.get(step))route.unshift(step);
      }else{
        for(const [a,b] of edges){
          if(a==='S'&&b===blocked)continue;
          if(a===id)offer(b,entry.g+edgeCost(a,b),id);
          if(b===id)offer(a,entry.g+edgeCost(a,b),id);
        }
      }
      return {accepted:true,reason:'',done,route:[...route]};
    }
    function pathTo(id){
      const path=[];
      if(!parents.has(id))return path;
      for(let step=id;step;step=parents.get(step))path.unshift(step);
      return path;
    }
    return {expand,pathTo,get frontier(){return Array.from(frontier.values(),n=>({...n}));},
      get closed(){return [...closed];},get route(){return [...route];},get done(){return done;}};
  }

  const trackerThreshold=8;
  const trackerSpeed=64;
  function makeTracker(route,lookahead) {
    if(!Array.isArray(route)||route.length<2||route.some(id=>!nodes[id]))throw new TypeError('Expected a route of map junction IDs');
    const points=route.map(id=>nodes[id]);
    const segments=[];
    let total=0;
    for(let i=1;i<points.length;i++){
      const a=points[i-1], b=points[i],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
      if(!length)continue;
      segments.push({a,b,dx,dy,length,offset:total,ux:dx/length,uy:dy/length});total+=length;
    }
    if(!segments.length)throw new TypeError('Route has no length');
    const state={};
    const end=points[points.length-1];
    function setLookahead(value){
      if(!Number.isFinite(value))throw new TypeError('Expected a finite lookahead');
      state.lookahead=clamp(value,6,180);
    }
    function nearest(){
      let bestError=Infinity,bestAlong=0;
      for(const seg of segments){
        const projection=(state.x-seg.a.x)*seg.ux+(state.y-seg.a.y)*seg.uy;
        const along=clamp(projection,0,seg.length);
        const error=Math.hypot(seg.a.x+along*seg.ux-state.x,seg.a.y+along*seg.uy-state.y);
        if(error<bestError){bestError=error;bestAlong=seg.offset+along;}
      }
      return {error:bestError,along:bestAlong};
    }
    function findTarget(along){
      // Intersect the lookahead circle with the forward part of the route.
      for(const seg of segments){
        if(seg.offset+seg.length<along-1e-6)continue;
        const rx=state.x-seg.a.x,ry=state.y-seg.a.y;
        const projection=rx*seg.ux+ry*seg.uy,cross=rx*seg.uy-ry*seg.ux;
        const discriminant=state.lookahead**2-cross**2;
        if(discriminant<0)continue;
        const t=projection+Math.sqrt(discriminant);
        if(t>=0&&t<=seg.length&&seg.offset+t>=along-1e-6)
          return {x:seg.a.x+t*seg.ux,y:seg.a.y+t*seg.uy};
      }
      return {...end};
    }
    function reset(newLookahead=state.lookahead??lookahead??24){
      const start=points[0],first=segments[0];
      Object.assign(state,{x:start.x,y:start.y,heading:Math.atan2(first.dy,first.dx),
        progress:0,distance:0,totalLength:total,error:0,maxError:0,trail:[{...start}],
        done:false,passed:false,threshold:trackerThreshold,elapsed:0});
      setLookahead(newLookahead);state.target=findTarget(0);
      return state;
    }
    function step(dt){
      const to=state.target,dx=to.x-state.x,dy=to.y-state.y;
      const localY=-dx*Math.sin(state.heading)+dy*Math.cos(state.heading);
      const curvature=clamp(2*localY/Math.max(.01,dx*dx+dy*dy),-.14,.14);
      const travel=Math.min(trackerSpeed*dt,distance(state,end));
      const delta=curvature*travel;
      state.x+=Math.cos(state.heading+delta*.5)*travel;
      state.y+=Math.sin(state.heading+delta*.5)*travel;
      state.heading+=delta;state.elapsed+=dt;
      const near=nearest();
      state.distance=Math.max(state.distance,near.along);
      state.progress=state.distance/total;
      state.error=near.error;state.maxError=Math.max(state.maxError,state.error);
      state.target=findTarget(state.distance);
      const offRoad=state.error>state.threshold;
      const arrived=distance(state,end)<1.1;
      if(offRoad||arrived){
        state.done=true;state.passed=arrived&&!offRoad;
        if(state.passed){state.x=end.x;state.y=end.y;state.progress=1;state.distance=total;}
      }
      if(state.done||distance(state,state.trail[state.trail.length-1])>=2)state.trail.push({x:state.x,y:state.y});
    }
    function update(dt){
      if(!Number.isFinite(dt)||dt<=0)return state;
      let left=Math.min(dt,1);
      while(left>1e-8&&!state.done){const tick=Math.min(1/120,left);step(tick);left-=tick;}
      return state;
    }
    reset(lookahead??24);
    return {state,update,reset,setLookahead:value=>{setLookahead(value);state.target=findTarget(state.distance);}};
  }

  globalThis.NavModel={nodes,edges,metersPerUnit,rangeMax,aimTolerance,blockedLane,laneAngle,rocks,
    scan,edgeCost,heuristic,makeSearch,makeTracker,trackerThreshold,trackerSpeed};
})();
