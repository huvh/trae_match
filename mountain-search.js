(() => {
  'use strict';
  const nodes=[[0,0],[0,18],[0,32],[0,49],[0,65],[0,77],[0,91],[0,105],[-10,38],[-17,50],[-16,60],[-7,69],[10,37],[16.5,46],[16.5,58],[9,69],[-6,43],[-6,54],[-20,30],[-26,25],[22,30],[29,25],[-25,63],[30,64]].map(([x,z])=>({x,z}));
  const lanes=[[0,1,2,3,4,5,6,7],[2,8,9,10,11,5],[2,12,13,14,15,5],[2,16,17,4],[8,18,19],[12,20,21],[10,22],[14,23]];
  const routes=[
    {id:'west',name:'西坡碎石路',mark:9,path:[1,2,8,9,10,11,5,6]},
    {id:'cut',name:'近道泥桥',mark:16,path:[1,2,16,17,4,5,6]},
    {id:'east',name:'东岸硬地',mark:14,path:[1,2,12,13,14,15,5,6]}
  ];
  const dist=(a,b)=>Math.hypot(nodes[a].x-nodes[b].x,nodes[a].z-nodes[b].z);
  const edges=lanes.flatMap(road=>road.slice(1).map((b,i)=>({a:road[i],b,blocked:road[i]===2&&b===3||road[i]===3&&b===4})));
  const adjacency=nodes.map(()=>[]);for(const e of edges){if(e.blocked)continue;adjacency[e.a].push(e.b);adjacency[e.b].push(e.a);}
  function cost(a,b,policy,mat){
    const i=Math.min(a,b),j=Math.max(a,b),len=dist(a,b);
    if(policy==='metres')return len;
    if(i===16&&j===17)return len*(mat==='cut'?1:4.6);
    if(i===13&&j===14)return len*(mat==='east'?1:1.52);
    if(i===9&&j===10)return len*(mat==='west'?1:1.8);
    return len;
  }
  function metrics(path,policy,mat){return path.slice(1).reduce((s,b,i)=>s+cost(path[i],b,policy,mat),0);}
  function solve(policy='energy',mat=null,useH=true){
    const start=1,end=6,open=new Set([start]),closed=new Set(),g=new Map([[start,0]]),parent=new Map(),frames=[];
    const heuristic=n=>useH?dist(n,end):0;
    function pathTo(n){const path=[n];while(parent.has(path[0]))path.unshift(parent.get(path[0]));return path;}
    let path=[];
    while(open.size){
      const current=[...open].sort((a,b)=>(g.get(a)+heuristic(a))-(g.get(b)+heuristic(b))||heuristic(a)-heuristic(b)||a-b)[0];
      open.delete(current);closed.add(current);const h=heuristic(current);
      if(current!==end)for(const next of adjacency[current]){if(closed.has(next))continue;const value=g.get(current)+cost(current,next,policy,mat);if(value<(g.get(next)??Infinity)){g.set(next,value);parent.set(next,current);open.add(next);}}
      path=pathTo(current);frames.push({current,g:g.get(current),h,f:g.get(current)+h,candidates:[...open].map(id=>({id,f:g.get(id)+heuristic(id)})).sort((a,b)=>a.f-b.f),open:[...open],closed:[...closed],path});
      if(current===end)break;
    }
    return {nodes,edges,frames,path,start,end,total:g.get(end),unit:policy==='metres'?'米':'电量',meters:metrics(path,'metres',mat)};
  }
  function evaluate(policy,mat){
    const astar=solve(policy,mat,true),uniform=solve(policy,mat,false);
    const options=routes.map(r=>({...r,cost:metrics(r.path,policy,mat),meters:metrics(r.path,'metres',mat),energy:metrics(r.path,'energy',mat)}));
    const best=options.find(r=>astar.path.includes(r.mark));
    return {astar,uniform,options,energy:best.energy,best:best.id,name:best.name,policy,mat};
  }
  globalThis.MountainSearch={nodes,lanes,routes,evaluate};
})();
