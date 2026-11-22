/* Original expedition artwork, projected in the same metre coordinates as the rally. */
(() => {
  'use strict';
  const environments = {
    tracking: {
      sky:['#233f51','#527b84','#93afb0','#d6ccc0','#e8bf9c'],
      hill:['#759795','#8ea5a0','#608684','#71988c','#476c68','#568079','#344f51','#3e6561'],
      ground:['#64776b','#54685c','#354f4f'],
      shoulder:['#7e8975','#778574'], road:['#455d64','#455b62'], line:['#e8efd1','#c9dcc2']
    },
    avoid: {
      sky:['#4f4562','#985f6a','#d78a68','#ffd29a','#ed975e'],
      hill:['#c98678','#da9780','#ad6966','#c87c6e','#88535a','#a7655b','#633f49','#854c4b'],
      ground:['#c48054','#ad6545','#774739'],
      shoulder:['#ba8861','#b27e5b'], road:['#75645e','#72615c'], line:['#c7b49a','#a48d79']
    },
    fusion: {
      sky:['#192b47','#405271','#748297','#b1aaa4','#c3a28b'],
      hill:['#8692a4','#929bae','#697b91','#8290a2','#4c6279','#60758a','#354d64','#436078'],
      ground:['#5c6d76','#485863','#354854'],
      shoulder:['#718189','#687b83'], road:['#475865','#455560'], line:['#9bb0b7','#788d9b']
    }
  };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function noise(i) {
    const n = Math.sin(i * 73.813 + 31.73) * 45837.331;
    return n - Math.floor(n);
  }

  function drawValley(canvas, view) {
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const pixelRatio = Math.min(2, globalThis.devicePixelRatio || 1);
    const w = Math.round(box.width * pixelRatio), h = Math.round(box.height * pixelRatio);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const g = canvas.getContext('2d');
    // Preserve square pixels on every display. On narrow screens the chase camera
    // widens its angle so the rover, road markings and HUD still share the view.
    const H=450, W=H*w/h, horizon=162;
    const focal=clamp(W*1.04,198,570), roverScale=focal/570;
    const stage=view.stage || view.kind || 'tracking';
    const env=environments[stage] || environments.tracking;
    const sensors=view.sensor?.active !== false;
    g.setTransform(h/H,0,0,h/H,0,0);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    const distance = view.distance || 0, lateral = view.lateral || 0;
    const yaw = clamp(Math.tan(view.heading || 0), -0.8, 0.8);
    const speed = view.speed || 0, roadAt = view.roadAt;
    const half = Math.max(1, view.halfWidth || 4);
    const far = 145, near = -2.45;
    function rect(x,y,width,height,fill) {
      g.fillStyle = fill; g.fillRect(x,y,width,height);
    }
    function poly(points, fill) {
      g.beginPath(); g.moveTo(...points[0]);
      for (let i=1; i<points.length; i++) g.lineTo(...points[i]);
      g.closePath(); g.fillStyle = fill; g.fill();
    }
    function stroke(points, color, width=1) {
      g.beginPath(); g.moveTo(...points[0]);
      for (let i=1; i<points.length; i++) g.lineTo(...points[i]);
      g.strokeStyle = color; g.lineWidth = width; g.stroke();
    }
    function ellipse(x,y,rx,ry,fill) {
      g.beginPath(); g.ellipse(x,y,rx,ry,0,0,2*Math.PI); g.fillStyle = fill; g.fill();
    }
    function gradient(top, bottom, stops) {
      const grad = g.createLinearGradient(0,top,0,bottom);
      for (const [position, color] of stops) grad.addColorStop(position,color);
      return grad;
    }
    function project(x,z) {
      const dz = z - distance;
      const scale = focal / (dz + 9);
      return { x: W/2 + (x-lateral-yaw*dz*.9) * scale, y: horizon+1966.5/(dz+9), scale };
    }

    // A low, banded sun and hand-cut mesas establish the horizon before the track appears.
    rect(0,0,W,H,gradient(0,185,env.sky.map((color,i)=>[[0,.26,.55,.82,1][i],color])));
    const sx = W*(stage==='fusion'?.36:.69) - lateral*.4 - yaw*48;
    const halo = g.createRadialGradient(sx,96,5,sx,96,157);
    halo.addColorStop(0,'#ffe6ae90'); halo.addColorStop(.6,'#ffd49638'); halo.addColorStop(1,'#f4c09400');
    rect(sx-158,0,316,174,halo);
    g.save();
    g.beginPath(); g.arc(sx,96,39,0,Math.PI*2); g.clip();
    rect(sx-41,54,82,85,'#ffe7ae');
    for (let k=0;k<5;k++) rect(sx-41,102+k*7.1,82,1+k*.42,'#edbc91');
    g.restore();
    for(let i=0;i<58;i++) {
      const x=noise(i+12)*W, y=noise(i+80)*67;
      if(Math.abs(x-sx)>80) rect(x,y,i%9===0?2:1,1,i%8===0?'#e6f1d8a0':'#cde9db56');
    }
    function cloud(cx,cy,width,col) {
      const x=cx-yaw*13-lateral*.15;
      poly([[x-width*.55,cy],[x-width*.38,cy-2],[x-width*.19,cy-2],[x-width*.11,cy-5],[x+width*.12,cy-4],[x+width*.16,cy-3],[x+width*.44,cy-3],[x+width*.51,cy],[x+width*.22,cy+1],[x-width*.23,cy+2]],col);
    }
    cloud(W*.11,55,173,'#dbc9ac53'); cloud(W*.32,41,92,'#dbc9ac45');
    cloud(W*.58,67,102,'#fae6be80'); cloud(W*.80,49,120,'#f6dcb976'); cloud(W*.94,87,74,'#ffe3b680');

    function ridge(y,amp,spacing,seed,color,parallax,facets) {
      const drift = lateral*parallax + yaw*parallax*22 + distance*parallax*.045;
      const start = Math.floor((drift-spacing*3)/spacing), points=[];
      for(let n=start; n<start+Math.ceil(W/spacing)+9; n++) {
        const x=n*spacing-drift, peak=y-amp*(.13+.87*noise(n+seed));
        points.push([x,peak+amp*.32],[x+spacing*.31,peak+amp*.12],
          [x+spacing*.37,peak],[x+spacing*.55,peak+1],[x+spacing*.68,peak+amp*.23]);
      }
      poly([...points,[points[points.length-1][0],202],[points[0][0],202]],color);
      if(facets) for(let i=2;i<points.length-3;i+=5) {
        const p=points[i]; poly([p,points[i+1],points[i+2],[p[0]+spacing*.67,189],[p[0]+spacing*.24,168]],facets);
      }
    }
    ridge(134,51,88,42,env.hill[0],.35,env.hill[1]);
    ridge(151,47,69,94,env.hill[2],.65,env.hill[3]);
    ridge(167,57,119,103,env.hill[4],1.35,env.hill[5]);
    ridge(180,39,65,25,env.hill[6],2.05,env.hill[7]);

    if(stage==='avoid' || stage==='fusion'){
      // A split in the skyline frames the pass. Continuous bands use the same
      // rotation as the ridges so they never slide against the canyon walls.
      for(const side of [-1,1]){
        g.save();g.translate(side<0?0:W,0);g.scale(side<0?1:-1,1);
        const extent=Math.min(W*.41,270), shift=side*(yaw*14+lateral*.14);
        g.translate(shift,0);
        const slate=stage==='fusion', top=slate?11:61, shelf=slate?31:21;
        const points=[[-35,top],[extent*.18,top+8],[extent*.23,top+2],
          [extent*.38,top+7],[extent*.4,top+shelf],[extent*.48,top+shelf+3],
          [extent*.62,top+76],[extent*.73,top+74],[extent*.78,top+92],
          [extent,170],[extent+14,187],[-35,194]];
        poly(points,slate?'#354d64':'#a45d4d');
        poly([points[3],points[4],points[5],[extent*.50,150],[extent*.30,182],[extent*.34,96]],slate?'#465e73':'#c87e5a');
        poly([points[7],points[8],points[9],[extent*.63,184],[extent*.70,147]],slate?'#2c4359':'#8f5048');
        for(let k=0;k<4;k++){
          const y=top+shelf+31+k*12;
          stroke([[-15,y+5],[extent*.19,y],[extent*(.37+k*.035),y+3]],slate?'#7894a331':'#e2a0716a',1.8);
        }
        g.restore();
      }
    }
    rect(0,horizon+12,W,H-horizon-12,gradient(horizon+12,H,[[0,env.ground[0]],[.39,env.ground[1]],[1,env.ground[2]]]));
    // Wind-cut strata on both sides travel with the ground.
    for(let k=Math.floor((distance+near)/3); k<=Math.ceil((distance+far)/3); k++) {
      const z=k*3+.68;
      if(z<distance+near)continue;
      for(const side of [-1,1]) {
        const seed=k*5+side;
        const px=roadAt(z)+side*(half+2.0+noise(seed+5)*26);
        const p=project(px,z), span=(.28+noise(seed+11)*1.21)*p.scale;
        if(p.x+span<0 || p.x-span>W)continue;
        stroke([[p.x-span,p.y],[p.x-span*.25,p.y+.014*span],[p.x,p.y+.052*span],[p.x+span*.42,p.y+.048*span]],'#5c535c44',Math.max(.4,p.scale*.018));
      }
    }
    // Track width, all route bands and all world objects share this projection.
    function strip(a,b,lo,hi,color) {
      poly([[a.x+lo*a.scale,a.y],[a.x+hi*a.scale,a.y],
        [b.x+hi*b.scale,b.y],[b.x+lo*b.scale,b.y]],color);
    }
    const zs = [distance+near];
    for(let z=Math.ceil(distance+near); z<distance+far; z++) zs.push(z);
    zs.push(distance+far);
    const centers=zs.map(z=>project(roadAt(z),z));
    for(let n=zs.length-2;n>=0;n--) {
      const a=centers[n],b=centers[n+1], block=Math.floor((zs[n]+zs[n+1])*.5);
      const alternating = Math.floor(block/4)%2===0;
      strip(a,b,-half-.95,half+.95,env.shoulder[Number(alternating)]);
      strip(a,b,-half-.28,half+.28,'#394952');
      strip(a,b,-half,half,env.road[Number(alternating)]);
      const edgeColor=env.line[Number(alternating)];
      strip(a,b,-half-.03,-half+.075,edgeColor);
      strip(a,b,half-.075,half+.03,edgeColor);
      if(((block%9)+9)%9<4) strip(a,b,-.05,.05,stage==='tracking'?'#fff2a9':'#d5bb93');
      if(stage==='tracking'){
        // Broken layers of reflected sky in the wheel tracks.
        const wet=((block%17)+17)%17;
        if(wet<5){
          const x=(wet-2)*.10;
          strip(a,b,-half*.72+x,-half*.42+x,'#93b9b26b');
        }
        if(wet>8 && wet<14)strip(a,b,half*.44,half*(.5+.08*Math.sin(wet)),'#a9c6ba55');
      }
    }

    // The algorithm draws its own selected geometry on the road surface.
    const projectedPoint=(x,z)=>{const p=project(x,z);return [p.x,p.y];};
    const visiblePoint=p=>Number.isFinite(p?.x) && Number.isFinite(p?.z)
      && p.z>=distance && p.z<distance+far;
    if(sensors && stage==='tracking' && visiblePoint(view.target)){
      const p=project(view.target.x,view.target.z);
      const r=clamp(p.scale*.42,4,17);
      g.save();g.setLineDash([6,5]);
      stroke([projectedPoint(lateral,distance),[p.x,p.y]],'#a9f5df',1.7);
      g.restore();
      ellipse(p.x,p.y,r+3,r*.34+2,'#203f4c');
      ellipse(p.x,p.y,r,r*.32,'#9ff4d1');
      ellipse(p.x,p.y,r*.58,r*.16,'#416560');
      stroke([[p.x,p.y-2],[p.x,p.y-r*1.40]],'#b4ffdf',1.5);
      poly([[p.x,p.y-r*2.0],[p.x+r*.31,p.y-r*1.63],[p.x,p.y-r*1.26],[p.x-r*.31,p.y-r*1.63]],'#c4ffdf');
    }
    if(sensors && stage==='avoid' && Array.isArray(view.traces)){
      const traces=view.traces.slice().sort((a,b)=>Number(!!a.best)-Number(!!b.best));
      for(const trace of traces){
        const points=(trace.points || []).filter(visiblePoint).map(p=>projectedPoint(p.x,p.z));
        if(points.length<2) continue;
        if(trace.best){
          stroke(points,'#274c53',4.8);
          stroke(points,'#8bf6ce',2.6);
          const [x,y]=points[points.length-1];
          ellipse(x,y,3.9,2.2,'#b7ffdb');
        } else {
          stroke(points,'#f5bd85a4',1.35);
        }
      }
    }
    if(sensors && stage==='fusion'){
      function sensorMarker(x,filtered) {
        if(!Number.isFinite(x))return;
        const p=project(x,distance);
        const color=filtered?'#8bf6ce':'#ffba82';
        const yy=p.y+(filtered?28:20);
        g.save();if(!filtered)g.setLineDash([3,3]);
        stroke([[p.x,p.y-2],[p.x,yy-4]],color,1.6);g.restore();
        if(filtered) {
          g.beginPath();g.arc(p.x,yy,4.1,0,2*Math.PI);g.fillStyle='#243e49';g.fill();
          g.strokeStyle=color;g.lineWidth=2;g.stroke();
        } else {
          stroke([[p.x-3.5,yy-3.5],[p.x+3.5,yy+3.5]],color,2);
          stroke([[p.x+3.5,yy-3.5],[p.x-3.5,yy+3.5]],color,2);
        }
      }
      sensorMarker(view.gps,false);
      sensorMarker(view.targetX,true);
    }

    function stone(x,y,size,seed,danger=false) {
      if(size<.65) return;
      g.save();g.translate(x,y);g.scale(size,size);
      const skew=noise(seed)*.22;
      ellipse(.15,.05,1.22,.31,danger?'#24354485':'#50464d75');
      poly([[-1,0],[-.86,-.49],[-.44,-.70],[-.25,-.99+skew],[.24,-1.03],[.69,-.76],[1.04,-.19],[.73,.03],[-.37,.13]],danger?'#784f46':'#735952');
      poly([[-1,0],[-.86,-.49],[-.44,-.70],[-.25,-.99+skew],[.24,-1.03],[.46,-.72],[.09,-.55],[-.32,-.43],[-.54,-.14]],danger?'#deb084':'#ad836a');
      poly([[-.53,-.14],[-.32,-.43],[.09,-.55],[.46,-.72],[.69,-.76],[.53,-.33],[.25,-.09]],danger?'#aa745d':'#926e61');
      if(danger && size>5) {
        stroke([[-.90,-.47],[-.69,-.64],[-.47,-.64]],'#ffb271',.066);
        stroke([[.05,-.55],[.28,-.62]],'#e8af80',.045);
      }
      g.restore();
    }
    function beacon(x,y,s,left,variant) {
      if(s<1.5)return;
      g.save();g.translate(x,y);g.scale(s,s);
      ellipse(.08,.01,.17,.045,'#35414a80');
      poly([[-.075,0],[.075,0],[.055,-.91],[-.041,-.91]],'#363f4c');
      rect(-.038,-.79,.042,.67,'#bda68e');
      poly([[-.075,-.93],[.081,-.93],[.094,-.78],[-.083,-.78]],variant?'#b9fbd4':'#f4b37a');
      if(variant) {
        stroke([[0,-.9],[0,-1.52]],'#40465a',.023);
        poly([[0,-1.53],[left?.36:-.36,-1.44],[0,-1.33]],'#f0a16b');
        stroke([[-.14,-1],[0,-.8],[.14,-1]],'#526271',.035);
      }
      g.restore();
    }

    function pine(x,y,size,seed) {
      g.save();g.translate(x,y);g.scale(size,size);
      ellipse(.18,0,.48,.08,'#263f3e88');
      rect(-.05,-.8,.1,.8,'#494e43');
      const height=1.65+noise(seed)*.65;
      for(let tier=0;tier<3;tier++){
        const foot=-.20-tier*.35, breadth=.55-tier*.12;
        poly([[0,-height],[breadth,foot-.08],[breadth*.50,foot-.10],[breadth*.44,foot],[-breadth*.95,foot+.05]],'#314f4a');
        poly([[0,-height],[-breadth*.95,foot+.05],[-breadth*.19,foot-.13]],'#54756a');
      }
      g.restore();
    }
    function station(x,y,scale) {
      g.save();g.translate(x,y);g.scale(scale,scale);
      ellipse(.45,.04,2.3,.29,'#26324480');
      poly([[-1.4,0],[.6,.09],[1.4,-.19],[1.4,-1.34],[.6,-1.64],[-1.4,-1.5]],'#495f69');
      poly([[-1.4,-1.5],[.6,-1.64],[1.4,-1.34],[-.66,-1.2]],'#9fb4af');
      rect(-1.10,-1.05,.7,.39,'#263e50');rect(-.99,-.93,.47,.12,'#667b7d');
      stroke([[1.2,0],[1.48,-5.8],[1.88,0]],'#a5b6af',.13);
      for(let i=0;i<4;i++){const ht=-.35-i*1.15;stroke([[1.3+i*.035,ht],[1.75-i*.06,ht-.82]],'#819a9c',.065);}
      stroke([[1.49,-5.38],[.78,-5.38],[.65,-5.82]],'#bfcbba',.085);
      poly([[.22,-5.86],[1.17,-5.86],[.89,-5.37],[.50,-5.37]],'#b2c2ba');
      rect(1.40,-6.0,.17,.2,view.stationOnline?'#b2ffe1':'#4a464a');
      if(view.stationOnline){
        rect(-1.10,-1.05,.7,.39,'#f8d38d');
        ellipse(1.49,-5.94,.32,.32,'#8bffb74d');
      }
      g.restore();
    }

    // Dress the ground from fixed world coordinates so motion has proper parallax.
    const objects=[];
    const minZ=distance+near, maxZ=distance+far;
    for(let k=Math.floor(minZ/3)-1;k<=Math.ceil(maxZ/3);k++) {
      for(const side of [-1,1]) {
        const seed=k*23+side*19, z=k*3+noise(seed+3)*2.62;
        if(z<minZ || z>maxZ) continue;
        const shoulder = half+.65+Math.pow(noise(seed+91),1.5)*27;
        const pos=project(roadAt(z)+side*shoulder,z);
        const radius=(.08+Math.pow(noise(seed+32),2)*.85)*pos.scale;
        if(pos.x+radius<-5 || pos.x-radius>W+5) continue;
        objects.push({z,paint:()=>stone(pos.x,pos.y,radius,seed)});
      }
    }
    if(stage==='tracking'){
      for(let k=Math.floor(minZ/5);k<=Math.ceil(maxZ/5);k++){
        const z=k*5+noise(k+7)*2;
        if(z<minZ || z>maxZ)continue;
        for(const side of [-1,1]){
          const seed=k*17+side*11;
          const p=project(roadAt(z)+side*(half+2+noise(seed)*10),z);
          const size=p.scale*(.65+.95*noise(seed+19));
          if(p.x+size<0 || p.x-size>W)continue;
          objects.push({z,paint:()=>pine(p.x,p.y,size,seed)});
        }
      }
    }
    if(stage==='fusion' && Number.isFinite(view.length)){
      const z=view.length+9;
      if(z>minZ && z<distance+108){
        const p=project(roadAt(view.length)+half+1.5,z);
        objects.push({z,paint:()=>station(p.x,p.y,p.scale)});
      }
    }
    for(let k=Math.ceil(minZ/11);k<=Math.floor(maxZ/11);k++){
      const z=k*11;
      for(const side of [-1,1]) {
        const p=project(roadAt(z)+side*(half+.49),z);
        if(p.x<-12 || p.x>W+12)continue;
        objects.push({z,paint:()=>beacon(p.x,p.y,p.scale,side<0,k%4===0)});
      }
    }
    for(const o of view.obstacles || []) {
      if(o.z<minZ || o.z>maxZ || !Number.isFinite(o.x))continue;
      const p=project(o.x,o.z), radius=(o.r || .6)*p.scale;
      if(p.x+radius<-10 || p.x-radius>W+10)continue;
      objects.push({z:o.z,paint:()=> {
        stone(p.x,p.y,radius,o.z,true);
        if(sensors && radius>2 && stage==='avoid' && (!Array.isArray(view.sensor?.detected) || view.sensor.detected.some(hit=>Math.abs(hit.z-o.z)<1))) {
          const c=Math.max(5,radius*1.17), top=p.y-radius*1.25;
          stroke([[p.x-c,top+c*.25],[p.x-c,top],[p.x-c*.69,top]],'#ffbd73',1.4);
          stroke([[p.x+c*.69,top],[p.x+c,top],[p.x+c,top+c*.25]],'#ffbd73',1.4);
        }
      }});
    }
    objects.sort((a,b)=>b.z-a.z);
    for(const obj of objects)obj.paint();

    const roverY=horizon+3.45*(570/9);
    const bob=Math.sin(distance*2.7)*Math.min(1.25,speed*.14);
    g.save();g.translate(W/2,roverY+bob);g.scale(roverScale,roverScale);
    ellipse(0,6,67,13,'#17273455');ellipse(0,4,53,8,'#1023348f');
    if(speed>1) {
      for(let i=0;i<12;i++){
        const side=i%2?1:-1, phase=((distance*.8+i*.17)%1+1)%1;
        const alpha=(1-phase)*Math.min(.36,speed*.035);
        ellipse(side*(43+phase*22+noise(i)*8),2+phase*23,1+phase*4,1+phase*1.8,(stage==='tracking'?'rgba(166,212,214,':'rgba(229,184,143,')+alpha+')');
      }
    }
    const steer=clamp(view.steering || 0,-.85,.85), roll=steer*2.4;
    g.rotate(-roll*.009);
    function tire(cx,cy,scale) {
      g.save();g.translate(cx,cy);g.scale(scale,scale);
      poly([[-7,-21],[5,-22],[10,-17],[11,0],[7,6],[-5,6],[-10,1],[-11,-15]],'#172a39');
      poly([[-7,-21],[4,-22],[7,-18],[-5,-17],[-9,-12],[-10,-16]],'#53565c');
      for(let i=0;i<5;i++){
        const y=-15+i*4;
        stroke([[-8,y-1],[-5,y],[4,y-1],[7,y]],'#3e4950',1.6);
      }
      g.restore();
    }
    tire(-38,-31,.80);tire(38,-31,.80);
    stroke([[-48,-7],[-29,-17],[-15,-9],[15,-9],[29,-17],[48,-7]],'#1f2e3a',6);
    stroke([[-44,-10],[-28,-23]],'#99a49a',2);stroke([[44,-10],[28,-23]],'#99a49a',2);
    tire(-44,-2,1.04);tire(44,-2,1.04);
    poly([[-45,-19],[-41,-37],[-29,-47],[27,-47],[42,-37],[45,-19],[33,-9],[-32,-9]],'#273740');
    poly([[-40,-34],[-29,-47],[-19,-57],[20,-57],[29,-47],[40,-34],[31,-24],[-31,-24]],'#e8c795');
    poly([[-28,-46],[-19,-55],[18,-55],[27,-46],[21,-43],[-23,-43]],'#a8c8be');
    poly([[-21,-53],[15,-53],[20,-48],[-24,-48]],'#446673');
    stroke([[-19,-52],[11,-52]],'#b7ded0',1.5);
    poly([[-42,-34],[-32,-39],[-20,-38],[-25,-27],[-38,-24]],'#f0a06a');
    poly([[42,-34],[32,-39],[20,-38],[25,-27],[38,-24]],'#bd7959');
    poly([[-25,-37],[24,-37],[31,-30],[29,-19],[-28,-19],[-31,-30]],'#cfa77b');
    poly([[-22,-34],[21,-34],[24,-28],[21,-22],[-22,-22],[-25,-27]],'#4b5759');
    for(let i=0;i<6;i++)stroke([[-17+i*6,-31],[-19+i*6,-25]],'#869084',1.6);
    poly([[-41,-23],[-29,-25],[-29,-20],[-39,-18]],'#fc9669');
    poly([[41,-23],[29,-25],[29,-20],[39,-18]],'#fc9669');
    stroke([[-38,-22],[-31,-23]],'#ffdc9c',1.8);stroke([[38,-22],[31,-23]],'#ffdc9c',1.8);
    poly([[-34,-17],[-20,-19],[20,-19],[34,-17],[32,-12],[-32,-12]],'#647273');
    stroke([[-30,-14],[-15,-15],[16,-15],[30,-14]],'#a8aaa0',1.8);
    rect(-8,-20,16,6,'#263e47');rect(-5,-18.8,10,2.5,'#99dbcf');
    stroke([[28,-40],[28,-62],[31,-71]],'#283c46',2.3);
    ellipse(31,-71,2.3,2.3,'#f3bd78');
    poly([[-27,-44],[-32,-47],[-30,-51],[-23,-50],[-22,-46]],'#566d72');
    g.restore();

    const vignette=g.createRadialGradient(W*.5,H*.47,W*.30,W*.5,H*.46,W*.61);
    vignette.addColorStop(0,'#11283b00');vignette.addColorStop(1,'#11283b39');
    rect(0,0,W,H,vignette);
  }
  globalThis.drawValley=drawValley;
})();
