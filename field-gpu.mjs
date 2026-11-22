import * as T from './vendor/three/three.module.min.js';

// The mission supplies survey coordinates (east, south, elevation). Three.js uses Y up.
export function create(display,region,id,lens,site){
  const output=document.createElement('canvas');
  const renderer=new T.WebGLRenderer({canvas:output,alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setClearColor(0,0);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  const scene=new T.Scene(),view=new T.PerspectiveCamera(52,1,2,7200),ctx=display.getContext('2d');
  const resources=[],materials=[],pools=[],v1=new T.Vector3(),v2=new T.Vector3(),up=new T.Vector3(0,1,0);
  const temp=new T.Object3D(),ink=new T.Color(),palette=site.palette;
  scene.fog=new T.FogExp2(palette.haze,.00039);
  scene.add(new T.HemisphereLight('#fff4d9','#9ba6a0',1.7));
  const sun=new T.DirectionalLight('#fff0d0',2.0);sun.position.set(130,680,-125);sun.target.position.set(400,0,230);
  sun.castShadow=true;Object.assign(sun.shadow.camera,{left:-560,right:560,top:470,bottom:-470,near:1,far:1800});sun.shadow.mapSize.set(1024,1024);sun.shadow.normalBias=.65;sun.shadow.bias=-.0003;scene.add(sun,sun.target);
  const positions=[],colors=[],uv=[];
  for(const tr of site.terrain){ink.set(tr.color);for(const p of [tr.points[0],tr.points[2],tr.points[1]]){positions.push(p[0],p[2],p[1]);colors.push(ink.r,ink.g,ink.b);uv.push(p[0]/155,p[1]/155);}}
  const earth=new T.BufferGeometry();earth.setAttribute('position',new T.Float32BufferAttribute(positions,3));earth.setAttribute('color',new T.Float32BufferAttribute(colors,3));earth.computeVertexNormals();
  earth.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  const grain=document.createElement('canvas');grain.width=grain.height=256;
  const gc=grain.getContext('2d');gc.fillStyle='#f3f1e9';gc.fillRect(0,0,256,256);
  let grainSeed=21365;const random=()=>((grainSeed=(Math.imul(1664525,grainSeed)+1013904223)>>>0)/4294967296);
  for(let i=0;i<7200;i++){const x=random()*256,y=random()*256,r=random();gc.fillStyle=r>.45?'#4b493520':'#ffffed88';gc.fillRect(x,y,1+r*1.8,1+r*.8);}
  const texture=new T.CanvasTexture(grain);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.colorSpace=T.SRGBColorSpace;resources.push(texture);
  const soil=new T.MeshLambertMaterial({map:texture,vertexColors:true,flatShading:true,side:T.DoubleSide});const terrain=new T.Mesh(earth,soil);terrain.receiveShadow=true;scene.add(terrain);resources.push(earth);materials.push(soil);
  const geom={box:new T.BoxGeometry(1,1,1),post:new T.CylinderGeometry(1,1,1,10),rock:new T.CylinderGeometry(.52,1,1,7),cone:new T.ConeGeometry(1,1,7),orb:new T.IcosahedronGeometry(1,0),rod:new T.CylinderGeometry(1,1,1,6)};
  geom.rock.dispose();
  const rockMesh=new T.IcosahedronGeometry(1,1),pos=rockMesh.attributes.position;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),noise=.89+.12*Math.sin(x*16+y*13+z*9);
    pos.setXYZ(i,x*noise+.095*y,Math.max(-.5,y*.63-.02),z*noise-.09*y);
  }
  rockMesh.computeVertexNormals();geom.rock=rockMesh;
  resources.push(...Object.values(geom));
  const solid=new T.MeshLambertMaterial({flatShading:true}),light=new T.MeshBasicMaterial({toneMapped:false});materials.push(solid,light);
  function batch(){
    const byKey=new Map();let labels=[];
    function emit(shape,x,y,z,sx,sy,sz,c,yaw=0,quat=null,lit=true){
      const name=shape+(lit?'':'-lit');let b=byKey.get(name);
      if(!b){b={shape,lit,n:0,mesh:null,capacity:0};byKey.set(name,b);pools.push(b);}
      if(b.n>=b.capacity){const capacity=b.capacity?b.capacity*2:32;
        const m=new T.InstancedMesh(geom[shape],lit?solid:light,capacity);m.frustumCulled=false;m.castShadow=lit&&shape!=='rod';m.receiveShadow=lit;
        m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.setColorAt(0,ink.set('#ffffff'));
        if(b.mesh){m.instanceMatrix.array.set(b.mesh.instanceMatrix.array);m.instanceColor.array.set(b.mesh.instanceColor.array);scene.remove(b.mesh);b.mesh.dispose();}
        b.capacity=capacity;b.mesh=m;scene.add(m);}
      temp.position.set(x,z,y);temp.scale.set(Math.max(.04,sx),Math.max(.04,sz),Math.max(.04,sy));if(quat)temp.quaternion.copy(quat);else temp.rotation.set(0,-yaw,0);temp.updateMatrix();
      b.mesh.setMatrixAt(b.n,temp.matrix);if(typeof c==='string'&&c.startsWith('#')&&c.length===9)c=c.slice(0,7);
      b.mesh.setColorAt(b.n,ink.set(c||'#baa987'));b.n++;
    }
    function box(x,y,sx,sy,h,c,base=0,angle=0){emit('box',x,y,base+h/2,sx,sy,h,c,angle);}
    function post(x,y,r,h,c,base=0){emit('post',x,y,base+h/2,r,r,h,c);}
    function rock(x,y,r,h,c='#9b9280'){emit('rock',x,y,h/2,r,r,h,c,x*.1);}
    function tree(x,y,s=19){post(x,y,s*.082,s*.36,'#77604c');emit('cone',x,y,s*.64,s*.42,s*.42,s*.93,'#426757');emit('cone',x,y,s*.94,s*.33,s*.33,s*.77,'#618370');}
    function segment(x,y,z,xx,yy,zz,r,c,lit){v1.set(xx-x,zz-z,yy-y);const len=v1.length();if(len<.02)return;
      const q=temp.quaternion.setFromUnitVectors(up,v1.multiplyScalar(1/len));emit('rod',(x+xx)/2,(y+yy)/2,(z+zz)/2,r,r,len,c,0,q,lit);}
    function line(pts,c,width=2,z=2){for(let k=1;k<pts.length;k++){const a=pts[k-1],b=pts[k];segment(a.x??a[0],a.y??a[1],a.elevation??z,b.x??b[0],b.y??b[1],b.elevation??z,Math.max(.38,width*.5),c,false);}}
    function ring(x,y,r,c,width=2,z=2){if(!(r>0))return;let a=[x+r,y];for(let i=1;i<=36;i++){const t=i*Math.PI/18,b=[x+r*Math.cos(t),y+r*Math.sin(t)];line([a,b],c,width,z);a=b;}}
    function dot(x,y,c,r=3,z=3){emit('orb',x,y,z,r,r,r,c,0,null,false);}
    function rover(x,y,a=0,c='#eab561'){
      const co=Math.cos(a),si=Math.sin(a);
      function part(u,v,w,d,h,color,base){box(x+u*co-v*si,y+u*si+v*co,w,d,h,color,base,a);}
      for(const u of [-7,7])for(const v of [-5.3,5.3])part(u,v,5,3.6,5,'#303d40',0);
      part(0,0,21,11,4,c,3.3);part(2,0,9.5,9,4.5,'#597d83',7.3);part(1.5,0,8,8,1,c,11.8);
      part(-6,0,5,8,3,'#ad855b',7);for(const v of [-3.4,3.4])part(10.4,v,.8,1.8,1.6,'#fff3b6',5);
    }
    const p={box,post,rock,tree,rover,beam:(x,y,z,xx,yy,zz,w,c)=>segment(x,y,z,xx,yy,zz,w*.5,c,true),line,ring,dot,
      label:(x,y,text,c='#ffe7ac',z=15)=>labels.push({x,y,z,text:String(text),c})};
    return {p,reset(){for(const b of byKey.values())b.n=0;labels=[];},finish(){for(const b of byKey.values()){
      b.mesh.count=b.n;b.mesh.instanceMatrix.needsUpdate=true;if(b.mesh.instanceColor)b.mesh.instanceColor.needsUpdate=true;}},labels:()=>labels};
  }
  const decor=batch(),moving=batch();site.decorate(decor.p);decor.finish();
  let lastW=0,lastH=0,sky;
  function draw(w,h,world){
    lens.size(w,h);const o=lens.pose();view.position.set(o.x,o.y,o.z);view.lookAt(o.cx,0,o.cy);view.aspect=w/h;view.fov=o.fov;view.updateProjectionMatrix();
    if(w!==lastW||h!==lastH){renderer.setSize(w,h,false);lastW=w;lastH=h;sky=ctx.createLinearGradient(0,0,0,h*.72);sky.addColorStop(0,palette.sky);sky.addColorStop(.63,palette.haze);sky.addColorStop(1,palette.earth);}
    moving.reset();world(moving.p);moving.finish();
    ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    const glow=ctx.createRadialGradient(w*.72,h*.13,0,w*.72,h*.13,h*.24);glow.addColorStop(0,'#fff8d7cc');glow.addColorStop(.12,'#fff5cb90');glow.addColorStop(1,'#fff5cb00');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h*.42);
    renderer.render(scene,view);ctx.drawImage(output,0,0,w,h);
    return moving.labels();
  }
  function dispose(){for(const b of pools)b.mesh?.dispose();for(const g of resources)g.dispose();for(const m of materials)m.dispose();sun.shadow.dispose();renderer.dispose();renderer.forceContextLoss();}
  return {draw,dispose,lost:()=>renderer.getContext().isContextLost()};
}
