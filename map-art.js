/* An isometric robot school. Coordinates are authored in a 960 x 520 world. */
(() => {
  "use strict";
  const anchors = [[13.5,48],[36.5,38],[60.5,46],[84,35],[84.5,82],[61.5,92],[37,80],[13.5,89]];
  globalThis.worldPoints = anchors;
  const sites = anchors.map(([x,y]) => [9.6*x, 5.2*y-73]);
  const palette = {
    metal: ["#c7e2e5","#668aa2","#4c627f"],
    ink: ["#566582","#34425b","#222e48"],
    mint: ["#9df9df","#479f9c","#266775"],
    coral: ["#ffc78c","#db845c","#a15750"],
    ivory: ["#fff0c9","#cbb99f","#8d8390"],
    violet: ["#cbbffb","#8a79b5","#68648c"]
  };
  function drawWorld(canvas, selectedIndex = 0, progressArray = []) {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width*dpr);
    canvas.height = Math.round(r.height*dpr);
    const g = canvas.getContext("2d");
    g.setTransform(canvas.width/960,0,0,canvas.height/520,0,0);
    g.lineJoin = "round";
    g.lineCap = "round";
    const poly = (pts, color) => {
      g.beginPath(); g.moveTo(...pts[0]);
      for (let i=1;i<pts.length;i++) g.lineTo(...pts[i]);
      g.closePath(); g.fillStyle=color; g.fill();
    };
    const line = (pts, color, width = 1) => {
      g.strokeStyle=color; g.lineWidth=width; g.beginPath(); g.moveTo(...pts[0]);
      for (let i=1;i<pts.length;i++) g.lineTo(...pts[i]);
      g.stroke();
    };
    const rect = (x,y,w,h,color) => {g.fillStyle=color; g.fillRect(x,y,w,h);};
    const oval = (x,y,rx,ry,c,fill=true,w=1) => {
      g.beginPath(); g.ellipse(x,y,rx,ry,0,0,2*Math.PI);
      if(fill){g.fillStyle=c;g.fill();}else {g.strokeStyle=c;g.lineWidth=w;g.stroke();}
    };
    function noise(n) {const q=Math.sin(n*127.1+311.7)*43758.5453123;return q-Math.floor(q);}
    const sky = g.createLinearGradient(0,0,950,520);
    sky.addColorStop(0,"#172744");sky.addColorStop(.53,"#223653");sky.addColorStop(1,"#172640");
    rect(0,0,960,520,sky);
    const haze = g.createRadialGradient(542,290,25,542,290,520);
    haze.addColorStop(0,"#2b53656b");haze.addColorStop(1,"#14264000");
    rect(0,0,960,520,haze);
    for (let t=-660;t<1300;t+=36) {
      line([[t,0],[t+1040,520]],"#91c7cf0b");
      line([[t,0],[t-1040,520]],"#91c7cf0b");
    }
    // Tiny registration marks and floating motes give the atlas a sense of scale.
    for (let i=0;i<176;i++) {
      const x=Math.round(noise(i+1)*956),y=Math.round(noise(i+245)*512);
      const c=i%9===0?"#c1d5b584":i%4===0?"#a4c6dd78":"#83b8c33b";
      rect(x,y,i%8===0?2:1,1.5,c);
      if(i%20===0){rect(x-2,y,5,1,c);rect(x,y-2,1,5,c);}
    }
    function contour(x,y,s) {
      g.save();g.translate(x,y);g.scale(s,s);
      for(let k=0;k<4;k++){
        const d=k*8;
        line([[-46-d,1],[-29-d,-8-k*3],[-11,-9-k*3],[7,-21-k*4],[28+d,-14-k*2],[45+d,-14-k*2],[56+d,-8],[39+d,1],[9,9+k*4],[-17,7+k*3],[-46-d,1]],"#6f9dbb26");
      }g.restore();
    }
    contour(213,34,.75);contour(470,467,1.05);contour(908,244,.9);contour(21,278,.65);
    const edges=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]];
    edges.forEach(([a,b])=>{
      const [ax,ay]=sites[a],[bx,by]=sites[b];
      const bend=(a===3?24:0);
      const mid=[(ax+bx)/2+bend,(ay+by)/2+8];
      const pts=[[ax,ay+8],mid,[bx,by+8]];
      line(pts.map(([x,y])=>[x,y+8]),"#111d32",12);
      line(pts,"#678297",9);line(pts,"#344b62",6);
      g.setLineDash([4,9]);line(pts,"#9dddd5",2);g.setLineDash([]);
    });
    const outline=[[-83,-2],[-64,-15],[-34,-22],[-10,-34],[23,-31],[54,-19],[77,-16],[87,-4],[79,6],[53,13],[35,23],[2,32],[-26,27],[-45,19],[-67,15],[-84,7]];
    function island(i) {
      const [cx,cy]=sites[i],sel=i===selectedIndex;
      const done=Boolean(progressArray&&progressArray[i]);
      g.save();g.translate(cx,cy);
      oval(2,43,83,18,"#0c19293d");
      // Rock strata are irregular, but each slab has a straight load-bearing deck.
      const lower=outline.map(([x,y],k)=>[x*.89,y+17+noise(k+36*i)*9]);
      for(let k=0;k<outline.length;k++){
        const j=(k+1)%outline.length;
        poly([outline[k],outline[j],lower[j],lower[k]],["#53627b","#495771","#40516b","#31475c","#5a677e"][k%5]);
      }
      for(let k=8;k<15;k++){
        const [x,y]=lower[k],q=noise(i*25+k);
        poly([[x-5,y-1],[x+4,y],[x+1,y+5+q*7]],"#34465e");
      }
      poly(outline,sel?"#83a4a6":"#71929b");
      const inner=outline.map(([x,y])=>[x*.96,y*.93-2]);
      poly(inner,sel?"#699498":"#63828d");
      line(inner.slice(8,15),sel?"#a8ecd8":"#95babc",1.3);
      g.save();g.beginPath();g.moveTo(...inner[0]);inner.slice(1).forEach(p=>g.lineTo(...p));g.closePath();g.clip();
      for(let k=-100;k<100;k+=16){
        line([[k-80,-42],[k+100,45]],"#b5d7d11c");
        line([[k+82,-42],[k-97,45]],"#b5d7d11c");
      }
      for(let k=0;k<58;k++){
        const x=noise(i*200+k)*171-85,y=noise(i*200+k+85)*61-31;
        rect(x,y,1+noise(k)*3,1, k%4===0?"#c3caaa":"#789a9b");
      }g.restore();
      // Isometric boxes have a fixed projection and individual material faces.
      const iso=(x,y,z=0)=>[x-y,(x+y)*.43-z];
      function box(x,y,z,w,d,h,p) {
        const a=iso(x,y,z+h),b=iso(x+w,y,z+h),c=iso(x+w,y+d,z+h),e=iso(x,y+d,z+h);
        poly([e,c,iso(x+w,y+d,z),iso(x,y+d,z)],p[1]);
        poly([b,iso(x+w,y,z),iso(x+w,y+d,z),c],p[2]);poly([a,b,c,e],p[0]);
        line([e,a,b],"#ffffff39",.7);
      }
      function seg(x,y,z,X,Y,Z,c,w){line([iso(x,y,z),iso(X,Y,Z)],c,w);}
      function column(x,y,z,rad,h,p){
        const [sx,sy]=iso(x,y,z);
        oval(sx,sy,rad,rad*.38,p[2]);rect(sx-rad,sy-h,rad*2,h,p[1]);
        rect(sx+rad*.28,sy-h,rad*.57,h,p[2]);oval(sx,sy-h,rad,rad*.38,p[0]);
      }
      const {metal,ink,mint,coral,ivory,violet}=palette;
      const base=i%2===0?mint:coral;
      // Common perimeter marker and ballast.
      box(-45,7,0,6,6,5,ink);box(-44,8,5,4,4,2,sel||done?mint:ivory);
      box(24,13,0,9,7,4,ink);box(26,14,4,4,4,2,base);
      if(i===0) {
        // A survey rover with two lit optics and a panoramic antenna.
        oval(-3,7,46,12,"#253c4a64");
        box(-21,-16,4,34,25,12,ink);
        for(const x of [-16,0])box(x,5,1,8,12,10,ink);
        box(-21,-16,15,34,26,22,ivory);
        box(-17,-13,37,26,20,3,metal);
        box(-17,10,20,25,2,10,ink);
        for(const x of [-12,1])box(x,12,22,4,1,5,mint);
        box(1,-9,40,4,4,12,ink);column(3,-7,52,4,3,coral);
        for(const [x,y,z] of [[-39,-6,27],[9,-36,20],[34,27,18]]){
          box(x,y,0,4,4,z,ink);column(x+2,y+2,z,3,3,mint);
        }
        oval(10,-56,17,5,"#89e4db80",false);
      } else if(i===1) {
        // A survey table projects a pale glass relief map with contour lines.
        box(-23,-17,0,45,30,6,ink);box(-21,-15,6,41,26,2,mint);
        for(const [x,y,h] of [[-16,-8,9],[-2,-12,14],[11,-8,7],[-10,1,5],[4,1,11]]){
          box(x,y,9,8,7,h,metal);box(x+1,y+1,9+h,6,5,1,ivory);
        }
        for(let k=0;k<3;k++){
          const z=26+k*9;seg(-23,-17,z,22,-17,z,"#9cebd36e",.9);
          seg(-23,-17,z,-23,13,z,"#9cebd36e",.9);
        }
        seg(-23,-17,8,-23,-17,48,"#a8f2d7a1",1.1);
        column(-28,15,0,6,26,ink);column(-28,15,26,6,3,coral);
      }else if(i===2){
        // Lidar on a tripod, with a translucent survey fan.
        for(const [x,y] of [[-15,10],[18,6],[-2,-19]]){
          seg(x,y,1,0,0,24,ink[2],4);seg(x,y,2,0,0,24,metal[1],1.4);
          box(x-2,y-2,0,4,4,2,ivory);
        }
        column(0,0,19,14,7,ink);column(0,0,26,15,8,ivory);
        column(0,0,34,12,9,mint);column(0,0,43,13,4,ink);
        poly([[0,-36],[40,-63],[57,-54],[60,-42]],"#a2f5dd2e");
        line([[0,-36],[53,-57]],"#b4f9dfb0");
        for(const [x,y,h] of [[-30,0,9],[19,-25,17],[30,7,10]])box(x,y,0,7,7,h,metal);
      }else if(i===3){
        // Route-planning test maze with a painted glowing route.
        box(-29,-25,0,54,47,4,ink);box(-28,-24,4,52,45,1,ivory);
        for(const [x,y,w,d] of [[-27,-24,51,3],[-27,-21,3,30],[-14,-14,3,22],[0,-21,3,16],[11,-9,3,20],[-10,10,15,3],[2,19,22,2]]){
          box(x,y,5,w,d,7,metal);
        }
        const route=[[-21,14],[-20,-12],[-19,-18],[-7,-18],[-7,4],[6,4],[6,-15],[18,-15],[18,12]];
        line(route.map(([x,y])=>iso(x,y,6)),coral[1],2.6);
        column(18,12,6,2,13,ink);poly([iso(18,12,19),iso(29,12,18),iso(18,12,13)],coral[0]);
      }else if(i===4){
        // A miniature road circuit and tracking vehicle.
        const road=[[-45,6],[-51,-1],[-46,-9],[-10,-23],[7,-23],[47,-7],[53,0],[48,7],[13,21],[-4,21],[-45,6]];
        line(road,ink[2],12);line(road,metal[1],9);
        g.setLineDash([4,5]);line(road,ivory[0],1.3);g.setLineDash([]);
        box(-5,-16,2,16,10,5,ink);box(-6,-16,7,17,11,6,coral);box(-2,-15,13,8,8,4,metal);
        box(-30,19,0,2,2,18,ink);poly([iso(-30,19,18),iso(-18,19,18),iso(-30,19,13)],mint[0]);
      }else if(i===5){
        // Articulated arm, high-contrast links and claw over a specimen cube.
        box(-23,-8,0,23,21,5,ink);column(-11,1,5,13,8,metal);
        const joints=[[-12,1,15],[-18,-2,34],[1,-13,54],[21,-11,40]];
        joints.slice(1).forEach((p,j)=>{
          const a=iso(...joints[j]),b=iso(...p);
          line([a,b],ink[2],9);line([[a[0],a[1]-1],[b[0],b[1]-1]],coral[1],6);
          line([[a[0]-1,a[1]-2.4],[b[0]-1,b[1]-2.4]],coral[0],2);
        });
        joints.forEach((p,j)=>{const [x,y]=iso(...p);oval(x,y,5,5,ink[1]);oval(x-1,y-1,2.6,2.6,j===3?ivory[0]:mint[0]);});
        const [xx,yy]=iso(...joints[3]);line([[xx-2,yy+2],[xx-5,yy+6],[xx-3,yy+10]],metal[0],2);
        line([[xx+2,yy+2],[xx+5,yy+6],[xx+4,yy+10]],metal[0],2);
        box(17,-16,0,10,10,12,mint);
      }else if(i===6){
        // Quadcopter hovers above a lit landing pad.
        oval(0,2,43,17,ink[2]);oval(0,0,40,15,metal[1]);oval(0,0,31,11,ivory[0],false,1.6);
        line([[-9,2],[2,-3]],ivory[0],2);line([[0,6],[11,1]],ivory[0],2);line([[-4,0],[6,4]],ivory[0],2);
        const z=38;
        for(const [x,y] of [[-17,-14],[17,-14],[-17,14],[17,14]]){
          seg(0,0,z,x,y,z,ink[2],5);seg(0,0,z+1,x,y,z+1,metal[0],1.7);
          column(x,y,z,3,3,coral);const [qx,qy]=iso(x,y,z+4);
          oval(qx,qy,11,3.2,"#d2f4e472",false,1);line([[qx-9,qy+1],[qx+9,qy-1]],mint[0],1.7);
        }box(-6,-5,z-2,12,10,6,ivory);
        box(-4,3,z-5,5,4,4,ink);
      }else{
        // Biped training rig. The asymmetric stance reads even at small scales.
        box(-13,-10,0,10,12,4,ink);box(3,-1,0,14,9,4,ink);
        const legs=[[[-8,-5,4],[-13,-3,13],[-5,-3,24]],[[8,4,4],[12,1,14],[5,-2,24]]];
        legs.forEach(path=>path.slice(1).forEach((p,j)=>{
          const a=iso(...path[j]),b=iso(...p);line([a,b],ink[1],7);line([a,b],metal[0],4);oval(...a,3,3,coral[1]);
        }));
        box(-9,-7,22,19,14,16,mint);box(-7,-7,40,14,12,11,ivory);
        box(-5,5,43,9,1,4,ink);box(-3,6,44,5,1,1,mint);
        for(const side of [-1,1]){const a=iso(side*10,0,34),b=iso(side*16,side*2,26),c=iso(side*18,side*3+3,31);
          line([a,b,c],metal[0],4);oval(...b,3,3,coral[1]);}
      }
      if(sel){
        // A small golden locator hovers to one side, leaving the object visible.
        poly([[-65,-30],[-58,-30],[-61.5,-24]],"#ffce88");
        oval(-61.5,-21,5,1.8,"#fecf8a8a");
      }
      g.restore();
    }
    sites.map((p,i)=>[p[1],i]).sort((a,b)=>a[0]-b[0]).forEach(([,i])=>island(i));
  }
  globalThis.drawWorld=drawWorld;
})();
