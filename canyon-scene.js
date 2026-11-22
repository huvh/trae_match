/* Original triangulated terrain and vehicle models. Coordinates are metres; +Z is forward. */
(() => {
  'use strict';
  const TAU=Math.PI*2, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
  const mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k];
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit=a=>mul(a,1/(Math.hypot(...a)||1));
  const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  const light=unit([-.55,.95,.38]);
  const colors=new Map();
  function color(hex){
    if(!colors.has(hex)){
      const n=parseInt(hex,16);colors.set(hex,[(n>>16)/255,((n>>8)&255)/255,(n&255)/255]);
    }
    return colors.get(hex);
  }
  function generator(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
  class Mesh{
    constructor(){this.vertices=[];this.pose=null;}
    transform(p){
      if(!this.pose)return p;
      const {x,y,z,c,s}=this.pose;
      return [x+p[0]*c+p[2]*s,y+p[1],z-p[0]*s+p[2]*c];
    }
    triangle(a,b,c,hex,lit=true){
      a=this.transform(a);b=this.transform(b);c=this.transform(c);
      const face=unit(cross(sub(b,a),sub(c,a))),rgb=color(hex);
      const shade=lit?.76+.26*dot(face,light):1;
      for(const p of [a,b,c])this.vertices.push(...p,rgb[0]*shade,rgb[1]*shade,rgb[2]*shade);
    }
    quad(a,b,c,d,hex,lit=true){this.triangle(a,b,c,hex,lit);this.triangle(a,c,d,hex,lit);}
    box(x,y,z,w,h,l,hex){
      const a=[x-w/2,y,z-l/2],b=[x+w/2,y,z-l/2],c=[x+w/2,y,z+l/2],d=[x-w/2,y,z+l/2];
      const A=add(a,[0,h,0]),B=add(b,[0,h,0]),C=add(c,[0,h,0]),D=add(d,[0,h,0]);
      this.quad(a,A,B,b,hex);this.quad(b,B,C,c,hex);this.quad(c,C,D,d,hex);this.quad(d,D,A,a,hex);
      this.quad(A,D,C,B,hex);this.quad(a,b,c,d,hex);
    }
    tube(a,b,r1,r2,n,hex,lit=true){
      const axis=unit(sub(b,a)),u=unit(cross(axis,Math.abs(axis[1])>.88?[1,0,0]:[0,1,0])),v=cross(axis,u);
      const ring=(p,r,j)=>add(p,add(mul(u,r*Math.cos(TAU*j/n)),mul(v,r*Math.sin(TAU*j/n))));
      for(let i=0;i<n;i++){
        const p=ring(a,r1,i),q=ring(a,r1,i+1),P=ring(b,r2,i),Q=ring(b,r2,i+1);
        this.quad(p,q,Q,P,hex,lit);
        if(r1)this.triangle(a,q,p,hex,lit);
        if(r2)this.triangle(b,P,Q,hex,lit);
      }
    }
    stroke(a,b,width,hex){this.tube(a,b,width,width,4,hex);}
    disk(x,y,z,rx,rz,hex,n=18){
      for(let i=0;i<n;i++){
        const a=TAU*i/n,b=TAU*(i+1)/n;
        this.triangle([x,y,z],[x+rx*Math.sin(a),y,z+rz*Math.cos(a)],[x+rx*Math.sin(b),y,z+rz*Math.cos(b)],hex,false);
      }
    }
    ring(x,y,z,r,width,hex,segments=44,skip=0){
      for(let i=0;i<segments;i++){
        if(skip&&i%skip===0)continue;
        const a=i*TAU/segments,b=(i+1)*TAU/segments;
        const point=(d,t)=>[x+d*Math.cos(t),y,z+d*Math.sin(t)];
        this.quad(point(r,a),point(r+width,a),point(r+width,b),point(r,b),hex,false);
      }
    }
  }
  function river(z){return -38+2.2*Math.sin(z*.045);}
  function rock(m,x,y,z,r,h,rng,swatches){
    const rings=[[],[],[]],n=7,tilt=(rng()-.5)*r*.35;
    for(let i=0;i<n;i++){
      const a=TAU*i/n+(rng()-.5)*.23,shape=.76+.26*rng();
      rings[0].push([x+Math.cos(a)*r*shape,y,z+Math.sin(a)*r*shape]);
      rings[1].push([x+Math.cos(a)*r*shape*.96,y+h*(.38+.25*rng()),z+Math.sin(a)*r*shape*.94]);
      rings[2].push([x+tilt+Math.cos(a)*r*.54*shape,y+h*(.75+.18*rng()),z+Math.sin(a)*r*.46*shape]);
    }
    const top=[x+tilt,y+h,z];
    for(let j=0;j<n;j++){
      const k=(j+1)%n,pick=()=>swatches[Math.floor(rng()*swatches.length)];
      m.quad(rings[0][j],rings[1][j],rings[1][k],rings[0][k],pick());
      m.quad(rings[1][j],rings[2][j],rings[2][k],rings[1][k],pick());
      m.triangle(rings[2][j],top,rings[2][k],pick());
    }
  }
  function pine(m,x,y,z,h,rand){
    m.tube([x,y,z],[x,y+h*.62,z],h*.044,h*.021,5,'67563f');
    const phase=rand()*TAU,col=['224a45','2d5b50','3b6854'];
    for(let k=0;k<3;k++){
      const radius=h*(.235-k*.047),base=y+h*(.16+k*.205);
      for(let i=0;i<7;i++){
        const a=TAU*i/7+phase+k*.41,b=TAU*(i+1)/7+phase+k*.41;
        m.triangle([x+Math.cos(a)*radius,base+(i%2)*.13,z+Math.sin(a)*radius],[x,base+h*.45,z],[x+Math.cos(b)*radius,base+((i+1)%2)*.13,z+Math.sin(b)*radius],col[k]);
      }
    }
  }
  function ground(m){
    const rand=generator(1961);
    // Rock, alluvium, and distant ridges share vertices so that the trails sit on continuous terrain.
    const lanes=[-175,-116,-84,-67,-59,-55,-50,-45,-43,-33,-30,-23,-12,0,12,22,30,35,39,42,46,51,66,87,130,176];
    const palette=['879b9a','8b9990','a99b81','bd8b64','cc9066','aa7554','c39b75','b4ac89','91a597','88a494','9d9c78','acaa7d','b1ae80','b5ad80','b4aa7b','aaa47c','b4a477','b3a382','b99a77','c4976d','ba8766','d09a71','ad9277','9d9788','8b9b9a'];
    const rows=[];
    for(let j=0;j<=51;j++){
      const z=-172+j*8.4,row=[];
      const left=river(z);
      for(const x of lanes){
        let xx=x,y=-.35;
        if(x>=-45&&x<=-30){xx=left+(x+38);y=x===-43||x===-33?-1.62:-.35;}
        else if(x<-45){
          const d=-x-45,front=.35+.65*Math.pow(Math.sin(z*.031+1.4),2);
          xx+=2.5*Math.sin(z*.085)+rand()*1.2;
          y=d<11?(d-1)*front*.56:(d<26?8+(d-11)*.78:17+(d-26)*.44);
          y*=.79+.23*Math.sin(z*.082)+.16*Math.sin(z*.192);y+=rand()*Math.min(3,d*.1);
        }else if(x>30){
          const d=x-30,wall=.51+.31*Math.sin(z*.042+.7)+.12*Math.sin(z*.11);
          xx+=Math.sin(z*.061)*2.7;
          y=d<8?d*.2:d<14?2+(d-8)*2.1:d<23?16+(d-14)*.35:20+(d-23)*.44;
          y=y*(.6+wall)+rand()*Math.min(3,d*.1);
        }
        row.push([xx,y,z+(Math.abs(x)>48?rand()*3:0)]);
      }
      rows.push(row);
    }
    for(let j=0;j+1<rows.length;j++)for(let i=0;i+1<lanes.length;i++){
      const a=rows[j][i],b=rows[j+1][i],c=rows[j+1][i+1],d=rows[j][i+1],t=palette[i];
      m.triangle(a,b,c,t);m.triangle(a,c,d,t);
    }
    for(let z=-166;z<250;z+=7){
      const a=river(z),b=river(z+7),y=-.79;
      m.quad([a-4.45,y,z],[b-4.45,y,z+7],[b+4.45,y,z+7],[a+4.45,y,z],'4b9191',false);
      for(let i=0;i<3;i++){
        const zz=z+rand()*6,xx=river(zz)+(rand()-.5)*7;
        m.quad([xx,y+.02,zz],[xx+.08,y+.02,zz+1.7],[xx+.22,y+.02,zz+1.55],[xx+.18,y+.02,zz],'91b9aa',false);
      }
    }
    for(let i=0;i<140;i++){
      const z=-100+rand()*300,x=rand()>.48?29.8+rand()*3:-30.2-rand()*2.2;
      if(rand()>.26){
        const h=2.2+rand()*5;
        m.disk(x+h*.23,-.31,z-h*.14,h*.47,h*.26,'848e72',7);
        pine(m,x,-.28,z,h,rand);
      }
      else rock(m,x,-.3,z,.5+rand()*1.4,.7+rand()*1.3,rand,['9d8c71','a99a78','c4a27b']);
    }
    for(let i=0;i<300;i++){
      const x=(rand()-.5)*59,z=rand()*200-57,h=rand()*.43+.08;
      const hue=rand()<.45?'918d62':'a2a372';
      m.triangle([x-.13,-.29,z],[x+.12,-.28,z+.05],[x+.18,h-.25,z+.08],hue);
      m.triangle([x-.08,-.28,z],[x+.15,-.28,z],[x-.12,h*.6-.25,z-.05],hue);
    }
    // Encircling mountain silhouettes are meshes with distinct snow and shadow faces.
    for(let ring=0;ring<2;ring++){
      const n=96,outer=ring?206:268,ridges=[];
      for(let i=0;i<n;i++){
        const a=TAU*i/n,rad=outer+rand()*14;
        const height=(ring?37:46)+12*Math.sin(a*11)+8*Math.cos(a*21)+rand()*12;
        ridges.push({base:[Math.cos(a)*rad,-12,51+Math.sin(a)*rad],top:[Math.cos(a)*rad,height,51+Math.sin(a)*rad]});
      }
      for(let i=0;i<n;i++){
        const a=ridges[i],b=ridges[(i+1)%n],topA=a.top,topB=b.top;
        const rib=(p,t)=>[p[0]*t,p[1],51+(p[2]-51)*t];
        const toeA=rib(a.base,.72),toeB=rib(b.base,.72);
        const ledgeA=rib(mix(a.base,topA,.80),.924),ledgeB=rib(mix(b.base,topB,.82),.936);
        const spine=rib(mix(ledgeA,ledgeB,.42),.956);spine[1]-=10+rand()*9;
        const rocks=ring?['638484','72908d','81968d','718c83']:['8197a2','8e9ca7','99a9a9','91a1a7'];
        m.triangle(toeA,ledgeA,spine,rocks[i%4],false);
        m.triangle(toeA,spine,toeB,rocks[(i+1)%4],false);
        m.triangle(toeB,spine,ledgeB,rocks[(i+2)%4],false);
        const snow=Math.max(topA[1],topB[1])>(ring?50:58);
        m.triangle(ledgeA,topA,spine,snow?'cdd1bb':rocks[i%4],false);
        m.triangle(spine,topA,topB,snow?'daddca':rocks[(i+1)%4],false);
        m.triangle(spine,topB,ledgeB,snow?'aec0b7':rocks[(i+2)%4],false);
      }
    }
  }
  function paintRoad(m,road){
    if(road.length<2)return;
    const nodes=[];
    for(let i=0;i<road.length-1;i++){
      const a=road[i],b=road[i+1],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/3);
      for(let j=0;j<steps;j++){const t=j/steps;nodes.push([a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t]);}
    }
    nodes.push([road.at(-1).x,road.at(-1).z]);
    const bands=[-3.0,-2.67,-2.36,-1.13,-.86,.86,1.13,2.36,2.67,3.0];
    const paint=['9f9575','d2b990','c7ad86','b29a79','c4aa82','b29a79','c7ad86','d2b990','9f9575'];
    const slices=nodes.map((p,i)=>{
      const a=nodes[Math.max(0,i-1)],b=nodes[Math.min(i+1,nodes.length-1)],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz)||1;
      return bands.map(w=>[p[0]+dz/len*w,-.2,p[1]-dx/len*w]);
    });
    for(let i=0;i<slices.length-1;i++)for(let k=0;k<paint.length;k++)
      m.quad(slices[i][k],slices[i+1][k],slices[i+1][k+1],slices[i][k+1],paint[k],false);
  }
  function tower(m,x,z,tall){
    const h=tall?12:5.6,w=tall?1.15:.68;
    m.disk(x,-.15,z,w*1.35,w*1.1,'827e68');
    const legs=[];
    for(const [a,b] of [[-1,-1],[-1,1],[1,1],[1,-1]]){
      const p=[x+a*w,-.2,z+b*w],q=[x+a*.14,h,z+b*.14];legs.push([p,q]);m.stroke(p,q,tall?.12:.07,'596566');
      m.box(p[0],-.2,p[2],.42,.3,.42,'ac9f85');
    }
    for(let k=0;k<4;k++){
      const a=legs[k],b=legs[(k+1)%4];
      for(let j=0;j<5;j++){
        const p=mix(a[0],a[1],j/5),q=mix(b[0],b[1],(j+1)/5);
        m.stroke(p,q,.045,j>2?'be7958':'687471');
      }
    }
    m.box(x,h-.5,z,.7,.3,.7,'e0cc9a');m.stroke([x,h,z],[x,h+1.7,z],.055,'67716b');
    m.box(x,h+.62,z,.13,.19,.13,'ffbd64');
  }
  function station(m,x,z){
    m.box(x,-.24,z,6.2,.4,5,'97856c');m.box(x,.16,z,5.7,2.7,4.46,'c6b99b');
    m.box(x,2.86,z,6.1,.23,4.82,'516562');m.box(x,.34,z-2.25,1.1,1.99,.12,'4c6463');
    for(const side of [-1,1]){m.box(x+side*1.76,1.18,z-2.24,1.03,.75,.16,'609292');m.box(x+side*1.76,1.17,z-2.34,1.12,.08,.12,'e3d4ad');}
    for(let i=0;i<3;i++){m.box(x+2.91,.45+i*.49,z+.6,.12,.16,1.2,'7c8b80');}
    tower(m,x+4.1,z+1.8,true);
  }
  function routeLine(m,points,width,hex,y){
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz)||1,nx=dz/length*width/2,nz=-dx/length*width/2;
      m.quad([a.x-nx,y,a.z-nz],[b.x-nx,y,b.z-nz],[b.x+nx,y,b.z+nz],[a.x+nx,y,a.z+nz],hex,false);
    }
  }
  const steel='414e4e',trim='242f32',gold='f4b650',orange='df853b',ivory='e9dcc0',glass='406169';
  function roverMesh(m,time,speed){
    const y=.04+Math.abs(Math.sin(time*8)*Math.min(Math.abs(speed)*.005,.028));
    m.disk(.22,-.03,-.22,1.59,2.42,'81765e',24);
    m.box(0,.47,0,1.86,.38,3.94,trim);m.box(0,.82+y,0,2.12,.53,3.73,orange);
    m.box(0,1.33+y,1.06,1.97,.16,1.54,gold);
    m.box(0,1.5+y,1.30,.43,.012,.37,'f3c77c');
    for(const x of [-.76,.76])m.box(x,1.49+y,1.19,.07,.035,.9,steel);
    m.box(0,.83+y,1.95,1.72,.49,.13,steel);
    for(let j=-3;j<=3;j++)m.box(j*.13,1+y,2.028,.065,.24,.022,'19282b');
    m.box(0,.65+y,2.04,2.23,.19,.21,trim);
    for(const x of [-.79,.79]){m.box(x,1.17+y,1.99,.45,.15,.12,'fff0b6');m.box(x,.86+y,2.10,.16,.10,.06,'f9ac50');}
    m.box(0,1.32+y,-1.29,2.02,.11,1.16,steel);
    // Sloped canopy, full windshield and visibly separate door frames.
    const front=.51,back=-.93,roofFront=.19,roofBack=-.84,base=1.39+y,roof=2.12+y;
    const a=[-.95,base,front],b=[.95,base,front],c=[.95,base,back],d=[-.95,base,back];
    const A=[-.78,roof,roofFront],B=[.78,roof,roofFront],C=[.78,roof,roofBack],D=[-.78,roof,roofBack];
    m.quad(a,b,B,A,'65969a');m.quad([-.67,base+.02,front+.012],[-.35,base+.02,front+.012],[.17,roof-.03,roofFront+.025],[-.12,roof-.03,roofFront+.025],'83acaa',false);m.quad(b,c,C,B,glass);m.quad(c,d,D,C,'46656a');m.quad(d,a,A,D,glass);m.quad(A,B,C,D,ivory);
    for(const pair of [[a,A],[b,B],[c,C],[d,D],[a,b],[b,c],[c,d],[d,a],[A,B],[B,C],[C,D],[D,A]]){
      m.stroke(pair[0],pair[1],.055,ivory);
    }
    for(const sign of [-1,1]){
      m.stroke([sign*.96,base,-.13],[sign*.79,roof,-.15],.042,'ccd6c5');
      m.box(sign*1.096,1.13+y,-.25,.06,.09,.23,trim);m.box(sign*1.1,.72+y,-.1,.22,.1,1.40,'536363');
      m.stroke([sign*.94,1.6+y,.28],[sign*1.19,1.66+y,.35],.035,steel);m.box(sign*1.2,1.58+y,.36,.13,.16,.21,trim);
    }
    m.box(0,roof+.02,-.30,1.72,.09,1.23,ivory);
    for(const side of [-1,1])m.stroke([side*.78,roof+.16,-.94],[side*.78,roof+.16,.23],.045,trim);
    for(let i=0;i<4;i++)m.stroke([-.8,roof+.12,-.87+i*.32],[.8,roof+.12,-.87+i*.32],.037,steel);
    m.tube([0,roof+.12,-.35],[0,roof+.28,-.35],.22,.23,12,'343e40');
    m.tube([0,roof+.28,-.35],[0,roof+.40,-.35],.25,.25,12,'e2d7ad');
    m.box(0,roof+.12,.20,1.4,.16,.13,trim);
    for(let i=0;i<6;i++)m.box(-.53+i*.21,roof+.15,.276,.15,.084,.03,'fff1b9');
    m.stroke([.72,1.45+y,-1.6],[.78,2.86+y,-1.85],.021,'293a3c');
    m.box(-.41,1.45+y,-1.42,.82,.34,.69,'b7ab7c');m.box(-.41,1.76+y,-1.42,.86,.07,.73,'7e8169');
    m.box(.48,1.45+y,-1.40,.69,.36,.71,'a66243');m.box(.48,1.80+y,-1.40,.74,.065,.75,'654f42');
    for(const x of [-.62,-.24,.32,.65])m.box(x,1.83+y,-1.4,.042,.033,.72,trim);
    m.box(0,.73+y,-2,2.24,.19,.19,trim);m.box(0,.99+y,-1.92,.49,.21,.036,ivory);
    for(const x of [-.86,.86])m.box(x,1.1+y,-1.91,.28,.14,.10,'ff7451');
    for(const sx of [-1,1])for(const z of [-1.22,1.24]){
      m.stroke([sx*.48,.68,z-.36],[sx*1.075,.57,z],.07,'87938b');
      m.box(sx*1.03,1.07+y,z,.38,.11,1.31,trim);
    }
  }
  function makeWheel(sign){
    const m=new Mesh(),outer=sign*.196;
    m.tube([-.19,0,0],[.19,0,0],.55,.55,16,'263337');
    m.tube([outer,0,0],[outer+sign*.036,0,0],.365,.365,14,'596467');
    m.tube([outer+sign*.04,0,0],[outer+sign*.065,0,0],.226,.226,8,'a5ab99');
    m.tube([outer+sign*.07,0,0],[outer+sign*.085,0,0],.105,.105,8,'39464a');
    for(let j=0;j<16;j++){
      const a=j*TAU/16,b=a+.17,c=a+.24;
      const tread=(x,t,r)=>[x,Math.sin(t)*r,Math.cos(t)*r];
      m.quad(tread(-.19,a,.553),tread(.01,b,.554),tread(.19,c,.553),tread(.19,c+.07,.553),'354248');
      if(j%2===0)m.box(outer+sign*.04,Math.sin(a)*.27,Math.cos(a)*.27,.044,.052,.053,'cad2be');
    }
    return new Float32Array(m.vertices);
  }
  const isAerial=s=>s.kind==='drone'||s.kind==='landing';
  const rotorArms=[[-1.15,-.90],[1.15,-.90],[-1.15,.90],[1.15,.90]];
  function quadcopter(){
    const m=new Mesh();
    // Rotor axes and landing skids share the hull origin used by the flight model.
    m.box(0,-.10,0,.90,.30,1.31,'30454a');
    m.box(0,.17,-.05,.80,.16,1.13,'eda548');
    m.box(0,.33,-.01,.47,.065,.63,'dbd6b6');
    m.box(0,.08,.67,.57,.12,.07,'a5ebdf');
    m.box(0,.12,-.69,.57,.10,.065,'e36e50');
    for(const [x,z] of rotorArms){
      m.stroke([x*.27,.085,z*.40],[x,.15,z],.082,'364a4b');
      m.stroke([x*.61,.13,z*.66],[x*.89,.15,z*.90],.1,z>0?'f0b553':'b0c6b7');
      m.tube([x,.08,z],[x,.27,z],.13,.11,8,'4f6465');
      m.tube([x,.27,z],[x,.31,z],.097,.09,8,'cabd91');
    }
    for(const sign of [-1,1]){
      m.stroke([sign*.34,-.07,.42],[sign*.46,-.52,.56],.041,'657575');
      m.stroke([sign*.34,-.07,-.42],[sign*.46,-.52,-.56],.041,'657575');
      m.stroke([sign*.46,-.52,-.68],[sign*.46,-.52,.68],.055,'3c4e50');
    }
    // The research package is strapped below the airframe and visible from the chase camera.
    m.box(0,-.62,-.12,.62,.42,.66,'be8b58');m.box(0,-.24,-.12,.65,.05,.69,'d3b78a');
    for(const x of [-.21,.21])m.box(x,-.64,-.12,.065,.43,.685,'465653');
    m.box(0,-.49,-.458,.19,.13,.024,'eddfb2');
    const rotor=new Mesh();
    for(const sign of [-1,1]){
      const a=[sign*.05,0,-.027],b=[sign*.42,.018,-.12],c=[sign*.65,.011,-.057],d=[sign*.61,0,.049],e=[sign*.17,0,.056];
      rotor.triangle(a,b,e,'354b50',false);rotor.quad(b,c,d,e,'42585c',false);
      rotor.quad([sign*.50,.016,-.086],[sign*.58,.013,-.072],[sign*.56,.005,.047],[sign*.49,.005,.04],'b7d1c3',false);
    }
    rotor.tube([0,-.012,0],[0,.075,0],.09,.065,8,'deac60');
    return {hull:new Float32Array(m.vertices),rotor:new Float32Array(rotor.vertices)};
  }
  function flightEffects(m,s){
    const rv=s.rover,h=Math.max(0,rv.y||0),x=rv.x+h*.13,z=rv.z-h*.09;
    const size=1+Math.min(h,17)*.022;
    m.disk(x,-.135,z,1.12*size,.85*size,h>7?'9d9274':'827b63',16);
    if(h<4)for(const [dx,dz] of rotorArms)m.disk(x+dx*.76,-.13,z+dz*.73,.39,.28,'8b826a',9);
    if(s.pad){
      const pad=s.pad,px=pad.x,pz=pad.z,r=pad.r||pad.radius||3.1;
      m.disk(px,-.10,pz,r,r,'5d7573',42);m.ring(px,-.078,pz,r*.83,r*.082,'e4c677',42);
      m.ring(px,-.07,pz,r*.61,r*.025,'aabeb0',42,3);
      m.box(px-r*.24,-.065,pz,r*.12,.028,r*.60,'f5ddb0');
      m.box(px+r*.24,-.065,pz,r*.12,.028,r*.60,'f5ddb0');
      m.box(px,-.060,pz,r*.51,.033,r*.095,'f5ddb0');
      for(let i=0;i<8;i++){
        const a=i*TAU/8,bx=px+Math.cos(a)*(r+.35),bz=pz+Math.sin(a)*(r+.35);
        m.tube([bx,-.14,bz],[bx,.13,bz],.10,.085,6,'465c5e');
        m.tube([bx,.13,bz],[bx,.24,bz],.084,.073,6,'b5f1d6',false);
      }
    }
    for(const [i,g] of (s.airGates||[]).entries()){
      const active=i===(s.gateIndex||0),past=i<(s.gateIndex||0),r=g.r||g.radius||2.8,cy=g.y||4;
      const inner=r-.13,outer=r+.13,n=30;
      const ringPoint=(a,rad,dz)=>[g.x+Math.cos(a)*rad,cy+Math.sin(a)*rad,g.z+dz];
      for(let j=0;j<n;j++){
        const a=j*TAU/n,b=(j+1)*TAU/n;
        const color=active?(j%5===0?'ffe9a4':'f2ae4c'):past?'719388':'7faaa5';
        m.quad(ringPoint(a,inner,-.095),ringPoint(b,inner,-.095),ringPoint(b,outer,-.095),ringPoint(a,outer,-.095),color,false);
        m.quad(ringPoint(a,outer,-.095),ringPoint(b,outer,-.095),ringPoint(b,outer,.095),ringPoint(a,outer,.095),active?'cd9649':'718f89');
      }
      for(const sign of [-1,1]){
        const gx=g.x+sign*r; m.stroke([gx,-.15,g.z],[gx,cy,g.z],.044,'8b9a8e');
        m.box(gx,-.15,g.z,.35,.21,.36,'887e66');
      }
    }
  }
  const defaultRoads=[[{x:0,z:-55},{x:0,z:108}]];
  function landscape(state){
    const m=new Mesh();ground(m);
    for(const road of state.roads?.length?state.roads:defaultRoads)paintRoad(m,road);
    // Apron extends behind the departure gates so there is ground for the title camera.
    paintRoad(m,[{x:0,z:-50},{x:0,z:0}]);
    const rng=generator(5285);
    for(const r of state.rocks||[]){
      rock(m,r.x,-.18,r.z,r.r||2,(r.r||2)*1.18,rng,['bd8d69','a7785c','c79a72','a3846d']);
      for(let j=0;j<3;j++){
        const angle=rng()*TAU,d=(r.r||2)*(.88+rng()*.28),rr=(r.r||2)*(.12+rng()*.13);
        rock(m,r.x+d*Math.cos(angle),-.18,r.z+d*Math.sin(angle),rr,rr*.84,rng,['ba9574','ab8668']);
      }
    }
    const goal=state.stations?.[0]||{x:0,z:105};station(m,goal.x+6.9,goal.z+5.6);
    tower(m,7,-17,true);
    // Trail delineators make vehicle speed and distance visible at ground level.
    for(const road of state.roads?.length?state.roads:defaultRoads){
      let carry=0;
      for(let i=1;i<road.length;i++){
        const a=road[i-1],b=road[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
        if(!len)continue;
        for(let t=carry;t<len;t+=10.5){
          const x=a.x+dx*t/len+dz/len*3.12,z=a.z+dz*t/len-dx/len*3.12;
          m.box(x,-.20,z,.13,.80,.16,'e4d9b5');m.box(x,.42,z,.14,.18,.17,'da9852');
        }
        carry=(carry+Math.ceil(Math.max(0,len-carry)/10.5)*10.5)-len;
      }
    }
    const roads=(state.roads?.length?state.roads:defaultRoads).concat([[{x:0,z:-52},{x:0,z:0}]]);
    function roadClearance(x,z){
      let best=Infinity;
      for(const path of roads)for(let i=1;i<path.length;i++){
        const a=path[i-1],b=path[i],dx=b.x-a.x,dz=b.z-a.z;
        const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);
        best=Math.min(best,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));
      }
      return best;
    }
    for(let i=0;i<115;i++){
      const x=(rng()-.5)*58,z=rng()*155-32,clearance=roadClearance(x,z);
      if(clearance<5.3||Math.hypot(x,z)<8||Math.hypot(x-goal.x,z-goal.z)<11)continue;
      const size=.32+rng()*.45;
      if(i%3===0){
        rock(m,x,-.3,z,size*1.45,size*.95,rng,['b19370','bca07b','aa886c']);
      }else{
        for(let k=0;k<4;k++){
          const angle=rng()*TAU,length=size*(.5+rng()),dx=Math.cos(angle)*length,dz=Math.sin(angle)*length;
          m.triangle([x-.28,-.29,z-.14],[x+dx*.33,-.29+length,z+dz*.33],[x+dx,-.29,z+dz],k%2?'7f8d67':'92a078');
        }
      }
    }
    for(const road of roads)for(let i=1;i<road.length;i++){
      const a=road[i-1],b=road[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1;
      for(let j=0;j<len*1.4;j++){
        const t=rng(),offset=(rng()-.5)*5.8,x=a.x+dx*t+dz/len*offset,z=a.z+dz*t-dx/len*offset;
        const sz=.06+rng()*.15;
        m.triangle([x-sz,-.19,z],[x+sz,-.19,z+sz*.4],[x+sz*.3,-.19,z-sz*.56],j%3?'b59e7e':'d9bf96',false);
      }
    }
    for(const s of state.stations||[]){
      m.box(s.x,-.18,s.z,.95,.13,.9,'a6a889');
      for(const [dx,dz] of [[-.4,-.3],[.4,-.3],[0,.4]])m.stroke([s.x+dx,-.04,s.z+dz],[s.x,1.1,s.z],.045,'ddc383');
      m.tube([s.x,.99,s.z],[s.x,1.55,s.z],.16,.13,7,'db943e');m.tube([s.x,1.55,s.z],[s.x,1.72,s.z],.17,.17,8,'8dd8ca');
    }
    return new Float32Array(m.vertices);
  }
  function indicators(s){
    const m=new Mesh(),t=s.time||0;
    if(s.camera==='menu')return new Float32Array();
    if(s.mode==='plan'&&s.kind==='rescue'){
      const n=MountainSearch.nodes,f=s.plan?.astar.frames[s.frameIndex];
      const segment=(a,b,color,w)=>routeLine(m,[n[a],n[b]],w,color,.12);
      segment(13,14,s.mat==='east'?'79e1ba':'b9a17e',.65);segment(9,10,s.mat==='west'?'79e1ba':'ba846a',.65);segment(16,17,s.mat==='cut'?'79e1ba':'a26347',.9);
      if(s.mat){const a=s.mat==='west'?9:s.mat==='east'?13:16,b=s.mat==='west'?10:s.mat==='east'?14:17;for(let i=1;i<9;i++){const v=i/9;m.box(n[a].x+(n[b].x-n[a].x)*v,.09,n[a].z+(n[b].z-n[a].z)*v,3.1,.13,.45,'d6bd83');}}
      if(f){for(const i of f.closed)m.ring(n[i].x,.14,n[i].z,.74,.23,'aec0ae',12);
        for(const i of f.open)m.ring(n[i].x,.15,n[i].z,.97,.27,'50e2e4',12);
        routeLine(m,f.path.map(i=>n[i]),.36,'cfb579',.15);
        const c=n[f.current];m.ring(c.x,.16,c.z,1.32,.32,'ffcb53',16);}
    }
    if(s.route?.length>1)routeLine(m,s.route,s.camera==='tactical'?.68:.24,'8de5c0',.045);
    for(const n of s.waypoints||[])m.ring(n.x,.064,n.z,1.05,.17,'a8ffdf',24);
    const goal=s.goal;
    if(isAerial(s))flightEffects(m,s);
    if(goal&&!isAerial(s)){m.ring(goal.x,.06,goal.z,2.25,.28,'f9cc6f',32,7);m.ring(goal.x,.07,goal.z,1.95,.055,'f2da93',32);}
    if(s.kind==='freight'&&goal){
      const checkpoints=[goal,...(s.waypoints||[])].slice(0,3);
      let previous=s.rover;
      for(let i=0;i<checkpoints.length;i++){
        const g=checkpoints[i],next=checkpoints[i+1]||g,dx=next.x-previous.x,dz=next.z-previous.z,length=Math.hypot(dx,dz)||1;
        const ux=dz/length,uz=-dx/length,span=3.45;
        const tint=i===0?'f6c86a':'9db9a8';
        for(const side of [-1,1]){
          const x=g.x+side*span*ux,z=g.z+side*span*uz;
          m.tube([x,-.18,z],[x,2.55,z],.105,.085,6,'4c6662');
          m.tube([x,1.26,z],[x,2.48,z],.112,.112,6,tint,false);
          m.stroke([x,2.55,z],[x-side*ux*.65,3.05,z-side*uz*.65],.12,tint);
        }
        previous=g;
      }
    }
    if(s.kind==='survey'){
      for(const [index,sample] of (s.samples||[]).entries()){
        const ink=['91e2df','f5c573','e3a9aa'][index%3];
        m.ring(sample.x,.075,sample.z,sample.range,.24,ink,96,4);
        m.stroke([sample.x,0,sample.z],[sample.x,1.45,sample.z],.032,'e6d6ac');
        m.triangle([sample.x,1.42,sample.z],[sample.x+.6,1.26,sample.z],[sample.x,.99,sample.z],ink,false);
      }
      if(s.observation){
        m.ring(s.observation.x,.09,s.observation.z,1,.28,'b8f5cf',34);
        m.tube([s.observation.x,0,s.observation.z],[s.observation.x,1.1,s.observation.z],.15,.12,7,'e9b865');
      }
    }
    if(s.scanAge>=0&&s.scanAge<2.45){
      const radius=.35+s.scanAge*19,rv=s.rover;
      m.ring(rv.x,.12,rv.z,radius,.20,'9af4ed',64);
      if(radius>2.1)m.ring(rv.x,.11,rv.z,radius-1.4,.06,'6abbb6',64,5);
      for(const r of s.rocks||[])if(Math.hypot(r.x-rv.x,r.z-rv.z)<radius+2)m.ring(r.x,.095,r.z,(r.r||2)*1.13,.18,'ffc176',24,4);
    }
    if(s.mode==='plan'&&s.camera==='tactical')for(const r of s.rocks||[])m.ring(r.x,.075,r.z,r.r+.42,.18,'df9863',24,4);
    if(s.mode==='dock'&&goal)m.ring(goal.x,.1,goal.z,2.1+.5*Math.sin(t*2.3),.08,'f6e6a0',28);
    return new Float32Array(m.vertices);
  }
  function camera(state,w,h){
    const rover=state.rover||{x:0,z:0,yaw:0};
    const yaw=rover.yaw||0,sn=Math.sin(yaw),cs=Math.cos(yaw),aspect=w/h;
    let eye,target,fov=.91,cx=.5,cy=.5;
    if(state.camera==='menu'){
      const a=.69+Math.sin((state.time||0)*.105)*.19+ yaw,dist=aspect<.84?8.75:7.6;
      eye=[rover.x+Math.sin(a)*dist,2.28+Math.sin((state.time||0)*.12)*.10,rover.z+Math.cos(a)*dist];
      target=[rover.x,1.06,rover.z];fov=.83;
      cx=aspect<.84?.54:.68;cy=aspect<.84?.47:.59;
    }else if(state.camera==='tactical'){
      const points=(state.roads||[]).flat();
      const focus=state.focus||{x:0,z:50};
      const halfX=Math.max(18,...points.map(p=>Math.abs(p.x-focus.x))),halfZ=Math.max(18,...points.map(p=>Math.abs(p.z-focus.z)));
      const distance=Math.max(halfZ*2.08,halfX*2.28/aspect,49);
      eye=[focus.x, distance*.966, focus.z-distance*.26];target=[focus.x,0,focus.z];cy=.5;fov=1.13;
    }else if(isAerial(state)){
      const h=Math.max(0,rover.y||0),d=aspect<.84?7.2:6.65;
      eye=[rover.x-sn*d,h+2.55,rover.z-cs*d];
      target=[rover.x+sn*4.2,h+.48,rover.z+cs*4.2];
      if(state.kind==='landing'){
        eye=[rover.x-sn*(d+2.1),h+5.6,rover.z-cs*(d+2.1)];
        target=[rover.x+sn*2.2,Math.max(0,h*.64-.15),rover.z+cs*2.2];
      }
      cy=.51;fov=aspect<.84?1.02:.92;
    }else{
      const d=aspect<.84?8.3:7.7;
      eye=[rover.x-sn*d,3.7,rover.z-cs*d];target=[rover.x+sn*5,1.34,rover.z+cs*5];
      fov=aspect<.84?1.04:.97;cy=.49;
    }
    const forward=unit(sub(target,eye)),right=unit(cross([0,1,0],forward)),up=cross(forward,right);
    return {eye,right,up,forward,cx,cy,focal:h/(2*Math.tan(fov/2)),w,h};
  }
  function projectPoint(c,p){
    const v=sub(p,c.eye),d=dot(v,c.forward);
    const x=c.w*c.cx+dot(v,c.right)*c.focal/Math.max(.01,d),y=c.h*c.cy-dot(v,c.up)*c.focal/Math.max(.01,d);
    return {x,y,depth:d,visible:d>.15&&x>=0&&x<=c.w&&y>=0&&y<=c.h};
  }
  const geomVS=`
    attribute vec3 aPos; attribute vec3 aColor;
    uniform vec3 uEye, uRight, uUp, uForward, uPlacement;
    uniform vec2 uScale, uCenter, uYaw, uSpin;
    varying vec3 vColor; varying float vDepth;
    void main(){
      vec3 local=vec3(aPos.x,aPos.y*uSpin.x-aPos.z*uSpin.y,aPos.y*uSpin.y+aPos.z*uSpin.x);
      vec3 p=vec3(local.x*uYaw.x+local.z*uYaw.y,local.y,-local.x*uYaw.y+local.z*uYaw.x)+uPlacement-uEye;
      float z=dot(p,uForward);
      gl_Position=vec4(dot(p,uRight)*uScale.x+uCenter.x*z,dot(p,uUp)*uScale.y+uCenter.y*z,1.00048*z-.24,z);
      vColor=aColor; vDepth=z;
    }`;
  const geomFS=`
    precision mediump float; varying vec3 vColor; varying float vDepth;
    void main(){float fog=1.-exp(-pow(max(vDepth-9.,0.)*.0058,1.34));gl_FragColor=vec4(mix(vColor,vec3(.74,.79,.754),fog*.85),1.);}`;
  const skyVS=`attribute vec2 aPos;varying vec2 vUV;void main(){vUV=aPos;gl_Position=vec4(aPos,0.,1.);}`;
  const skyFS=`
    precision mediump float; varying vec2 vUV;
    uniform vec3 uRight,uUp,uForward;uniform vec2 uCenter,uScale;
    float hash(vec2 p){return fract(sin(dot(p,vec2(13.27,7.61)))*97.736);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
    void main(){
      vec2 screen=(vUV-uCenter)/uScale;vec3 ray=normalize(uForward+uRight*screen.x+uUp*screen.y);
      float h=max(ray.y,0.);
      vec3 sky=mix(vec3(.88,.84,.70),vec3(.29,.57,.69),smoothstep(-.035,.48,h));
      vec2 cloud=ray.xz/max(.16,ray.y+.18)*3.;
      float n=.55*noise(cloud)+.3*noise(cloud*2.2)+.15*noise(cloud*4.5);
      sky=mix(sky,vec3(.95,.925,.81),smoothstep(.54,.77,n)*smoothstep(.025,.18,h)*.75);
      float sun=dot(ray,normalize(vec3(-.54,.30,-.78)));
      sky+=vec3(.22,.15,.06)*pow(max(sun,0.),55.);
      sky=mix(sky,vec3(1.,.965,.82),smoothstep(.9988,.99945,sun));
      gl_FragColor=vec4(sky,1.);
    }`;
  function program(gl,v,f){
    const shaders=[v,f].map((source,i)=>{
      const shader=gl.createShader(i?gl.FRAGMENT_SHADER:gl.VERTEX_SHADER);gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;
    });
    const p=gl.createProgram();for(const s of shaders)gl.attachShader(p,s);gl.linkProgram(p);
    for(const s of shaders)gl.deleteShader(s);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;
  }
  function gpu(canvas){
    const gl=canvas.getContext('webgl',{alpha:false,antialias:true,preserveDrawingBuffer:false,powerPreference:'low-power'});
    if(!gl)return null;
    const sky=program(gl,skyVS,skyFS),world=program(gl,geomVS,geomFS),quad=gl.createBuffer();
    const names=['uRight','uUp','uForward','uEye','uCenter','uScale','uPlacement','uYaw','uSpin'];
    function locations(p){
      const map=Object.fromEntries(names.map(k=>[k,gl.getUniformLocation(p,k)]));
      map.pos=gl.getAttribLocation(p,'aPos');map.col=gl.getAttribLocation(p,'aColor');return map;
    }
    const locSky=locations(sky),locGeom=locations(world),buffers=new Map();
    gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    function uniforms(l,c){
      gl.uniform3fv(l.uRight,c.right);gl.uniform3fv(l.uUp,c.up);gl.uniform3fv(l.uForward,c.forward);
      gl.uniform2f(l.uCenter,c.cx*2-1,1-c.cy*2);gl.uniform2f(l.uScale,c.focal*2/c.w,c.focal*2/c.h);
    }
    return {
      draw(c,batches){
        gl.viewport(0,0,canvas.width,canvas.height);
        gl.disable(gl.DEPTH_TEST);gl.useProgram(sky);uniforms(locSky,c);
        if(locGeom.col!==locSky.pos)gl.disableVertexAttribArray(locGeom.col);
        gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.enableVertexAttribArray(locSky.pos);gl.vertexAttribPointer(locSky.pos,2,gl.FLOAT,false,0,0);
        gl.drawArrays(gl.TRIANGLES,0,3);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.useProgram(world);uniforms(locGeom,c);gl.uniform3fv(locGeom.uEye,c.eye);
        for(const batch of batches){
          if(!batch.data.length)continue;
          let entry=buffers.get(batch.id);if(!entry){entry={handle:gl.createBuffer()};buffers.set(batch.id,entry);}
          gl.bindBuffer(gl.ARRAY_BUFFER,entry.handle);
          if(entry.data!==batch.data){gl.bufferData(gl.ARRAY_BUFFER,batch.data,batch.id==='effects'?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);entry.data=batch.data;}
          gl.enableVertexAttribArray(locGeom.pos);gl.enableVertexAttribArray(locGeom.col);
          gl.vertexAttribPointer(locGeom.pos,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(locGeom.col,3,gl.FLOAT,false,24,12);
          gl.uniform3fv(locGeom.uPlacement,batch.position||[0,0,0]);
          gl.uniform2f(locGeom.uYaw,Math.cos(batch.yaw||0),Math.sin(batch.yaw||0));
          gl.uniform2f(locGeom.uSpin,Math.cos(batch.spin||0),Math.sin(batch.spin||0));
          gl.drawArrays(gl.TRIANGLES,0,batch.data.length/6);
        }
      },
      dispose(){for(const b of buffers.values())gl.deleteBuffer(b.handle);gl.deleteBuffer(quad);gl.deleteProgram(world);gl.deleteProgram(sky);gl.getExtension('WEBGL_lose_context')?.loseContext();}
    };
  }
  function software(canvas){
    const ctx=canvas.getContext('2d',{alpha:false});
    function clip(points){
      const out=[];
      for(let i=0;i<points.length;i++){
        const p=points[i],q=points[(i+1)%points.length];
        if(p[2]>=.14)out.push(p);
        if((p[2]>=.14)!==(q[2]>=.14))out.push(mix(p,q,(.14-p[2])/(q[2]-p[2])));
      }
      return out;
    }
    let frame=null,zbuffer=null,skyPixels=null;
    function resize(){
      if(frame&&frame.width===canvas.width&&frame.height===canvas.height)return;
      frame=ctx.createImageData(canvas.width,canvas.height);zbuffer=new Float32Array(canvas.width*canvas.height);
      skyPixels=new Uint8ClampedArray(frame.data.length);
      for(let y=0;y<canvas.height;y++){
        const a=Math.min(1,y/(canvas.height*.65)),start=y*canvas.width*4;
        const r=113+104*a,g=166+49*a,b=186+4*a;
        for(let i=start;i<start+canvas.width*4;i+=4){skyPixels[i]=r;skyPixels[i+1]=g;skyPixels[i+2]=b;skyPixels[i+3]=255;}
      }
    }
    function raster(a,b,c,r,g,blue){
      const w=frame.width,h=frame.height;
      const left=Math.max(0,Math.ceil(Math.min(a[0],b[0],c[0])-.5));
      const right=Math.min(w-1,Math.floor(Math.max(a[0],b[0],c[0])-.5));
      const top=Math.max(0,Math.ceil(Math.min(a[1],b[1],c[1])-.5));
      const bottom=Math.min(h-1,Math.floor(Math.max(a[1],b[1],c[1])-.5));
      if(left>right||top>bottom)return;
      const abx=b[0]-a[0],aby=b[1]-a[1],acx=c[0]-a[0],acy=c[1]-a[1],area=abx*acy-aby*acx;
      if(Math.abs(area)<.002)return;
      const dUx=acy/area,dUy=-acx/area,dVx=-aby/area,dVy=abx/area;
      const x=left+.5-a[0],y=top+.5-a[1];
      let uRow=x*dUx+y*dUy,vRow=x*dVx+y*dVy;
      const ub=b[2]-a[2],vc=c[2]-a[2],pixels=frame.data;
      for(let py=top;py<=bottom;py++,uRow+=dUy,vRow+=dVy){
        let u=uRow,v=vRow,idx=py*w+left;
        for(let px=left;px<=right;px++,idx++,u+=dUx,v+=dVx){
          if(u<-.00001||v<-.00001||u+v>1.00001)continue;
          const inverseZ=a[2]+u*ub+v*vc;if(inverseZ<zbuffer[idx])continue;
          zbuffer[idx]=inverseZ;const k=idx*4;pixels[k]=r;pixels[k+1]=g;pixels[k+2]=blue;
        }
      }
    }
    return {
      maxResolution:800,
      draw(c,batches){
        resize();frame.data.set(skyPixels);zbuffer.fill(0);
        const w=frame.width,h=frame.height,f=c.focal*w/c.w;
        for(const batch of batches){
          const data=batch.data,pos=batch.position||[0,0,0],sn=Math.sin(batch.yaw||0),cs=Math.cos(batch.yaw||0),spinS=Math.sin(batch.spin||0),spinC=Math.cos(batch.spin||0);
          for(let i=0;i<data.length;i+=18){
            let pts=[];
            for(let k=0;k<3;k++){
              const j=i+k*6,x=data[j],y=data[j+1]*spinC-data[j+2]*spinS,z=data[j+1]*spinS+data[j+2]*spinC;
              const v=[x*cs+z*sn+pos[0]-c.eye[0],y+pos[1]-c.eye[1],-x*sn+z*cs+pos[2]-c.eye[2]];
              pts.push([dot(v,c.right),dot(v,c.up),dot(v,c.forward)]);
            }
            if(pts.every(p=>p[2]<=.14))continue;
            if(pts.some(p=>p[2]<=.14))pts=clip(pts);
            const screen=pts.map(p=>[w*c.cx+p[0]*f/p[2],h*c.cy-p[1]*f/p[2],1/p[2]]);
            const z=pts.reduce((sum,p)=>sum+p[2],0)/pts.length,fog=(1-Math.exp(-Math.pow(Math.max(z-9,0)*.0058,1.34)))*.85;
            const r=(data[i+3]*(1-fog)+.74*fog)*255,g=(data[i+4]*(1-fog)+.79*fog)*255,b=(data[i+5]*(1-fog)+.754*fog)*255;
            for(let j=1;j<screen.length-1;j++)raster(screen[0],screen[j],screen[j+1],r,g,b);
          }
        }
        ctx.putImageData(frame,0,0);
      },dispose(){}
    };
  }
  let cachedCar,cachedWheels,cachedDrone;
  function create(canvas){
    let renderer=gpu(canvas)||software(canvas),cam=null,landData=null,lastGeometry='',lost=false,wheelAngle=0,previousTime=null;
    if(!cachedCar){const model=new Mesh();roverMesh(model,0,0);cachedCar=new Float32Array(model.vertices);cachedWheels=[makeWheel(-1),makeWheel(1)];}
    function contextLost(e){e.preventDefault();lost=true;}
    function contextRestored(){renderer=gpu(canvas)||software(canvas);lost=false;}
    canvas.addEventListener?.('webglcontextlost',contextLost);canvas.addEventListener?.('webglcontextrestored',contextRestored);
    return {
      draw(s){
        if(lost)return;
        const w=Math.max(1,canvas.clientWidth||canvas.width||1),h=Math.max(1,canvas.clientHeight||canvas.height||1);
        const ratio=Math.min(globalThis.devicePixelRatio||1,1.5,(renderer.maxResolution||1500)/Math.max(w,h));
        if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){canvas.width=Math.max(1,Math.round(w*ratio));canvas.height=Math.max(1,Math.round(h*ratio));}
        cam=camera(s,w,h);
        const geom=JSON.stringify([s.roads,s.rocks,s.stations]);
        if(geom!==lastGeometry){landData=landscape(s);lastGeometry=geom;}
        const rv=s.rover||{x:0,z:0,yaw:0},bump=Math.sin((s.time||0)*12)*Math.min(.045,Math.abs(rv.speed||0)*.005);
        const batches=[{id:'terrain',data:landData},{id:'effects',data:indicators(s)}];
        const now=s.time||0,yaw=rv.yaw||0,cs=Math.cos(yaw),sn=Math.sin(yaw);
        if(isAerial(s)){
          if(!cachedDrone)cachedDrone=quadcopter();
          const altitude=Math.max(0,rv.y||0);
          batches.push({id:'airframe',data:cachedDrone.hull,position:[rv.x,altitude,rv.z],yaw});
          for(const [x,z] of rotorArms){
            const rotorYaw=yaw+now*22*Math.sign(x*z);
            batches.push({id:'rotor',data:cachedDrone.rotor,position:[rv.x+x*cs+z*sn,altitude+.32,rv.z-x*sn+z*cs],yaw:rotorYaw});
          }
        }else{
          batches.push({id:'rover',data:cachedCar,position:[rv.x,bump-.13,rv.z],yaw});
          wheelAngle+=Math.min(.1,Math.max(0,now-(previousTime??now)))*(rv.speed||0)/.55;
          for(const side of [-1,1])for(const z of [-1.22,1.24]){
            const x=side*1.075;
            batches.push({id:side<0?'wheelL':'wheelR',data:cachedWheels[side<0?0:1],position:[rv.x+x*cs+z*sn,.39+bump,rv.z-x*sn+z*cs],yaw,spin:wheelAngle});
          }
        }
        previousTime=now;
        renderer.draw(cam,batches);
      },
      project(x,y,z){return cam?projectPoint(cam,[x,y,z]):{x:0,y:0,depth:-1,visible:false};},
      dispose(){canvas.removeEventListener?.('webglcontextlost',contextLost);canvas.removeEventListener?.('webglcontextrestored',contextRestored);renderer.dispose();}
    };
  }
  globalThis.CanyonScene={create};
})();
