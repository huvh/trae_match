(() => {
  'use strict';
  const schemes={
    survey:{sky:'#779eae',haze:'#e2dbc0',earth:'#8c9c7b',stone:'#849084',ridge:'#718787'},
    routes:{sky:'#84a6ae',haze:'#f0d7af',earth:'#b7a17d',stone:'#a28d78',ridge:'#7f8983'},
    driving:{sky:'#7796a8',haze:'#e4d3ba',earth:'#9c9e8b',stone:'#8b8d80',ridge:'#75888c'},
    machines:{sky:'#7899a6',haze:'#dfd7b9',earth:'#a4a18c',stone:'#98988b',ridge:'#7c8e8a'}
  };
  function createLens(){
    let width=1,height=1,focal=1,distance=1,azimuth=0,pitch=.40,mode=0,focus={x:400,y:230},center={...focus},cs=1,sn=0,cp=1,sp=0;
    const names=['全景','现场近景','航测俯视'];
    function size(w,h){
      width=w;height=h;focal=h*1.02;cs=Math.cos(azimuth);sn=Math.sin(azimuth);cp=Math.cos(pitch);sp=Math.sin(pitch);
      let fit=0;
      for(const x of [0,800])for(const y of [0,460]){
        const u=(x-400)*cs-(y-230)*sn,v=(x-400)*sn+(y-230)*cs;
        fit=Math.max(fit,v*cp+Math.max(Math.abs(u)*focal/(w*.465),Math.abs(v*sp)*focal/(h*.395)));
      }
      distance=mode===1?Math.max(185,fit*.35):fit;center=mode===1?focus:{x:400,y:230};
    }
    function project(x,y,z=0){x-=center.x;y-=center.y;const u=x*cs-y*sn,v=x*sn+y*cs,depth=v*cp+z*sp,d=Math.max(1,distance-depth);return {x:width*.5+u*focal/d,y:height*.5+(v*sp-z*cp)*focal/d,depth,visible:distance-depth>3,scale:focal/d};}
    function ground(x,y){const screenY=(y-height*.5)/focal,den=sp+screenY*cp;
      if(den<=.015)return {x:-9000,y:-9000};const v=screenY*distance/den,u=(x-width*.5)/focal*(distance-v*cp);
      return {x:center.x+u*cs+v*sn,y:center.y-u*sn+v*cs};}
    function aim(x,y){if(Number.isFinite(x)&&Number.isFinite(y))focus={x:Math.max(0,Math.min(800,x)),y:Math.max(0,Math.min(460,y))};}
    function turn(){mode=(mode+1)%3;pitch=[.40,.25,1.28][mode];azimuth=0;size(width,height);return names[mode];}
    function orbit(dx,dy){azimuth+=dx;pitch=Math.max(.21,Math.min(1.42,pitch+dy));size(width,height);}
    function pan(x,y){if(mode!==1)return;const a=ground(width/2,height/2),b=ground(width/2+x,height/2+y);aim(focus.x+a.x-b.x,focus.y+a.y-b.y);size(width,height);}
    return {size,project,ground,aim,turn,orbit,pan,get mode(){return mode;},get name(){return names[mode];},
      pose(){return {cx:center.x,cy:center.y,x:center.x+distance*cp*sn,y:distance*sp,z:center.y+distance*cp*cs, fov:2*Math.atan(height/(2*focal))*180/Math.PI};}};
  }
  const hash=(i,j)=>{const h=Math.sin(i*127.1+j*311.7)*43758.545;return h-Math.floor(h);};
  function shade(hex,f){return '#'+[1,3,5].map(i=>Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*f)).toString(16).padStart(2,'0')).join('');}
  function landscape(region,id){
    const palette={...(schemes[region]||schemes.routes)};
    if(id==='rrt'){Object.assign(palette,{earth:'#a38d75',sky:'#7794a5',haze:'#edd1ae'});}
    if(id==='potential')Object.assign(palette,{earth:'#ab9c81',sky:'#82989e',haze:'#f1d2ac'});
    if(id==='coverage')Object.assign(palette,{earth:'#919f90',sky:'#7fa4ac',haze:'#e9d9ba'});
    const terrain=[],props=[],stride=125,rows=[];
    for(let j=-17;j<=17;j++){const row=[];for(let i=-18;i<=18;i++){
      const x=400+(i+(hash(i,j)-.5)*.48)*stride,y=230+(j+(hash(i+77,j)-.5)*.48)*stride;
      const outside=Math.hypot(Math.max(0,Math.abs(x-400)-560),Math.max(0,Math.abs(y-230)-370));
      const rise=Math.min(1,outside/350);
      const h=-2+rise*(15+38*hash(i-3,j)+74*(.5+.5*Math.sin(x*.004+y*.006)))+
        Math.min(1,Math.max(0,(outside-380)/510))*164*(.3+.7*Math.abs(Math.sin(i*.41-j*.32)));
      row.push([x,y,h]);}rows.push(row);}
    for(let j=1;j<rows.length;j++)for(let i=1;i<rows[j].length;i++){
      const a=rows[j-1][i-1],b=rows[j-1][i],c=rows[j][i],d=rows[j][i-1];
      for(const tri of [[a,b,c],[a,c,d]]){const z=(tri[0][2]+tri[1][2]+tri[2][2])/3;
        terrain.push({points:tri,color:shade(z>270?palette.ridge:z>60?palette.stone:palette.earth,(z<1?.97:.91)+hash(i+tri[1][0],j)*(z<1?.055:.17))});}}
    function decorate(p){
      FieldLandmarks.paint(p,region,id);
      // Vegetation grows beyond the mission boundary so targets remain visible.
      for(let i=0;i<85;i++){const x=-140+hash(i,1)*1120,y=-180+hash(i,2)*165,s=10+hash(i,3)*26;if(i%5)p.tree(x,y,s);else p.rock(x,y,s*.6,s*.7,palette.stone);}
      for(let i=0;i<48;i++){const x=-180+hash(i,19)*1180,y=-250+hash(i,27)*115;p.tree(x,y,16+hash(i,8)*23);}
      for(let i=0;i<28;i++){const x=i%2?-30-hash(i,2)*105:830+hash(i,2)*105,y=hash(i,6)*500;p.rock(x,y,6+hash(i,3)*12,7+hash(i,4)*13,palette.stone);}
      for(let i=0;i<105;i++){const x=hash(i,55)*840-20,y=hash(i,71)*490-15,s=1+hash(i,23)*2;p.line([[x,y],[x+s*2,y+s]],shade(palette.earth,.88),1,.15);}
    }
    return {palette,terrain,decorate};
  }
  globalThis.FieldLandscape={createLens,landscape};
})();
