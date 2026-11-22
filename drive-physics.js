(() => {
  "use strict";

  // All distances are metres. Heading is measured from forward (+z) toward +x.
  const wheelbase = 2.6, carRadius = 0.87, maxSteering = 0.52;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const approach = (v, target, change) => v + clamp(target - v, -change, change);
  const modes = {
    tracking: {length: 362, halfWidth: 4.8, cruise: 11.6, param: 8, range: [4,18],
      objective: "抵达终点，平均循迹偏差 ≤ 1.2 米，驶出路面 ≤ 3 秒"},
    avoid: {length: 325, halfWidth: 5.6, cruise: 9.5, param: 1.2, range: [0.3,2.5],
      objective: "抵达终点，碰撞不超过 1 次，驶出路面 ≤ 3 秒"},
    fusion: {length: 340, halfWidth: 5.2, cruise: 10.5, param: 2.2, range: [0.2,6],
      objective: "抵达终点，融合定位均误差 ≤ 1 米，驶出路面 ≤ 3 秒"}
  };

  function createDriveStage(kind) {
    const spec = modes[kind];
    if (!spec) throw new Error("Unknown driving stage");
    const state = {};
    const hit = new Set();
    const deviceName = {tracking:"前视摄像头", avoid:"前向激光雷达", fusion:"轮速编码器"}[kind];
    let sensorEnabled = true, encoderRemainder = 0, encoderDistance = 0;
    let randomSeed, noiseClock, plannerClock, clearRoadSteering, plannedSpeed, shoulderClock;
    let covariance, rawErrorIntegral, estimateErrorIntegral, noisePhase;

    function roadAt(z) {
      if (kind === "tracking") return 5.4*Math.sin(z/17) + 3.5*Math.sin(z/31);
      if (kind === "avoid") return 3.0*Math.sin(z/32) + 2.1*Math.sin(z/58);
      return 3.9*Math.sin(z/24) + 2.8*Math.sin(z/41);
    }
    function tangent(z) {
      return Math.atan((roadAt(z+0.1)-roadAt(z-0.1))/0.2);
    }
    function uniform() {
      randomSeed=(Math.imul(1664525,randomSeed)+1013904223)>>>0;
      return (randomSeed+1)/4294967297;
    }
    function normal() {
      return Math.sqrt(-2*Math.log(uniform()))*Math.cos(2*Math.PI*uniform());
    }
    function refreshSensor() {
      const sensor = state.sensor;
      sensor.active = sensorEnabled;
      sensor.detected = [];
      sensor.value = null;
      if (!sensorEnabled) {
        sensor.sample = deviceName + "未接入";
        return;
      }
      if (kind === "tracking") {
        // Idealized camera: sample lane markings at discrete depths inside the view cone.
        for (let depth = 4; depth <= 24; depth += 4) {
          const z = state.distance + depth;
          const x = roadAt(z);
          const bearing = Math.atan2(x-state.lateral, depth) - state.heading;
          if (Math.cos(bearing) >= Math.cos(Math.PI/3)) sensor.detected.push({x,z});
        }
        sensor.value = sensor.detected.length;
        sensor.sample = "前视 24 m · 识别 " + sensor.value + " 个中心线采样点";
      } else if (kind === "avoid") {
        // Idealized clustered laser returns: only forward obstacles inside the 50 m field of view.
        for (const rock of state.obstacles) {
          const dx = rock.x-state.lateral, dz = rock.z-state.distance;
          const range = Math.max(0, Math.hypot(dx,dz)-rock.r);
          const bearing = Math.atan2(dx,dz)-state.heading;
          if (range <= 50 && Math.cos(bearing) >= Math.cos(70*Math.PI/180)) {
            sensor.detected.push({...rock,range});
            sensor.value = Math.min(sensor.value ?? Infinity,range);
          }
        }
        sensor.sample = sensor.value === null ? "前向 50 m · 未探测到落石" : "最近回波 " + sensor.value.toFixed(1) + " m · " + sensor.detected.length + " 处落石";
      } else {
        sensor.value = encoderDistance;
        sensor.sample = "轮速累计 " + encoderDistance.toFixed(2) + " m · 里程推算横坐标 " + state.deadReckoning.toFixed(2) + " m";
      }
    }
    function setSensorEnabled(enabled) {
      const previous = sensorEnabled;
      sensorEnabled = Boolean(enabled);
      if (previous === sensorEnabled) return state.sensor;
      if (kind === "fusion") {
        state.estimate = state.gps;
        state.deadReckoning = state.estimate;
        covariance = 1;
        state.uncertainty = sensorEnabled ? Math.sqrt(covariance) : state.gpsNoise;
        encoderRemainder = 0;
      }
      plannerClock = 0;
      state.traces = [];
      state.best = null;
      initializePerception();
      return state.sensor;
    }
    function initializePerception() {
      refreshSensor();
      if (kind === "tracking") pursue(state.lateral,state.param);
      if (kind === "avoid" && sensorEnabled) planWindow(state.param);
    }
    function restart() {
      hit.clear();
      const obstacles = kind === "avoid" ? [[47,-0.3],[94,1.1],[138,-1.25],[181,0.4],[222,-0.8],[265,1],[300,-0.2]]
        .map(([z,offset])=>({z,x:roadAt(z)+offset,r:1.05})) : [];
      randomSeed=1937; noiseClock=0; plannerClock=0; shoulderClock=0; noisePhase=0;
      covariance=0.3; rawErrorIntegral=0; estimateErrorIntegral=0;
      encoderRemainder=0; encoderDistance=0;
      clearRoadSteering=0; plannedSpeed=spec.cruise;
      Object.assign(state,{
        kind,distance:0,lateral:roadAt(0),heading:tangent(0),speed:3,steering:0,
        halfWidth:spec.halfWidth,length:spec.length,obstacles,collisions:0,offroadTime:0,errorSum:0,
        elapsed:0,done:false,passed:false,objective:spec.objective,score:0,assist:true,param:spec.param,
        trackingError:0,estimate:roadAt(0),gps:roadAt(0),uncertainty:Math.sqrt(covariance),gpsAge:0,
        deadReckoning:roadAt(0),gpsNoise:0,kalmanGain:0,lookahead:0,collisionFlash:0,recoveries:0,
        target:{x:roadAt(8),z:8},traces:[],best:null,offroad:false,
        sensor:{active:sensorEnabled,label:deviceName,sample:"",value:null,unit:kind==="tracking"?"点":"m",detected:[]},
        metrics:{meanTrackError:0,meanEstimateError:0,meanGpsError:0,nearestClearance:null,score:0}
      });
      initializePerception();
      return state;
    }
    // Pure pursuit uses the target transformed into the vehicle's local lateral axis.
    function pursue(x, lookahead) {
      let z = state.distance+lookahead;
      let targetX;
      if (kind === "tracking") {
        const points = state.sensor.detected;
        if (!points.length) {
          state.target = null;
          return 0;
        }
        const far = points.find(point=>point.z>=z) || points[points.length-1];
        const near = points[Math.max(0,points.indexOf(far)-1)];
        z = clamp(z,near.z,far.z);
        const ratio = far.z===near.z ? 0 : (z-near.z)/(far.z-near.z);
        targetX = near.x + (far.x-near.x)*ratio;
      } else {
        targetX = roadAt(z);
      }
      const dx = targetX-x, dz=z-state.distance;
      const localX = dx*Math.cos(state.heading)-dz*Math.sin(state.heading);
      state.target={x:targetX,z};
      return clamp(Math.atan2(2*wheelbase*localX, dx*dx+dz*dz),-maxSteering,maxSteering);
    }
    function setPose(p, command, speed, dt) {
      p.steering=approach(p.steering,command,1.45*dt);
      p.speed=approach(p.speed,speed,(speed<p.speed ? 6.8 : 3.0)*dt);
      const yawRate=p.speed/wheelbase*Math.tan(p.steering);
      const halfAngle=p.heading+yawRate*dt/2;
      p.lateral+=p.speed*Math.sin(halfAngle)*dt;
      p.distance+=p.speed*Math.cos(halfAngle)*dt;
      p.heading+=yawRate*dt;
    }
    // Sample a reachable velocity/steering window, roll each command forward,
    // and score obstacle clearance, travel, road bounds, and terminal heading.
    function planWindow(margin) {
      const obstacles=state.sensor.detected;
      const candidates=[];
      const desiredSteer=pursue(state.lateral,12);
      // Steering reaches a new command over a 0.32 s control window.
      const steerWindow=1.45*0.32;
      const lo=Math.max(-maxSteering,state.steering-steerWindow), hi=Math.min(maxSteering,state.steering+steerWindow);
      const commands=[clamp(desiredSteer,lo,hi)];
      for(let i=0;i<=14;i++) commands.push(lo+(hi-lo)*i/14);
      const nextCruise=approach(state.speed,spec.cruise,3*0.32);
      const nextSlow=approach(state.speed,Math.min(spec.cruise,6.5),6.8*0.32);
      for(const velocity of new Set([nextCruise,nextSlow])){
        for(const steer of commands){
          const p={lateral:state.lateral,distance:state.distance,heading:state.heading,speed:state.speed,steering:state.steering};
          let clearance=Infinity, border=Infinity, roadError=0, forward=true;
          const points=[{x:p.lateral,z:p.distance}];
          for(let t=0;t<18;t++){
            setPose(p,steer,velocity,0.12);
            const error=Math.abs(p.lateral-roadAt(p.distance));
            border=Math.min(border,spec.halfWidth-carRadius-error);
            roadError+=error/18;
            if(Math.cos(p.heading)<0.35) forward=false;
            for(const o of obstacles) clearance=Math.min(clearance,Math.hypot(p.lateral-o.x,p.distance-o.z)-o.r-carRadius);
            if(t%3===2) points.push({x:p.lateral,z:p.distance});
          }
          const edge=border<0?50-20*border:4*Math.max(0,.45-border);
          const proximity=clearance<0?100-45*clearance:12*Math.max(0,margin-clearance);
          const headingLoss=1-Math.cos(p.heading-tangent(p.distance));
          const progress=p.distance-state.distance;
          const cost=proximity+edge+6*headingLoss+.40*roadError+.18*Math.abs(p.lateral-roadAt(p.distance))-
            .35*progress+.35*Math.abs(steer-state.steering)+(forward?0:80);
          candidates.push({cost,steer,velocity,points,best:false});
        }
      }
      const best=candidates.reduce((winner,c)=>c.cost<winner.cost?c:winner);
      best.best=true;
      state.traces=candidates.filter((candidate,i)=>candidate===best || (i%3===0 && i<16));
      state.best=best;
      state.target=best.points[best.points.length-1];
      clearRoadSteering=best.steer;
      plannedSpeed=best.velocity;
    }
    function sense(dt, assumedNoise) {
      // Simulate 2 cm encoder pulses and a small heading calibration bias.
      if (sensorEnabled) {
        encoderRemainder+=state.speed*dt;
        const increment=Math.floor(encoderRemainder/.02)*.02;
        encoderRemainder-=increment;
        encoderDistance+=increment;
        const dx=increment*Math.sin(state.heading+.015+.009*Math.sin(state.elapsed*.4));
        state.deadReckoning+=dx;
        state.estimate+=dx;
        covariance+=.19*dt;
      }
      noiseClock-=dt;
      state.gpsAge+=dt;
      if(noiseClock<=0){
        noiseClock+=.45;
        const inCanyon=state.distance>100 && state.distance<210;
        state.gpsNoise=inCanyon?3.1:1.35;
        noisePhase++;
        const observation=state.lateral+normal()*state.gpsNoise;
        state.gps=observation;
        state.gpsAge=0;
        state.kalmanGain=sensorEnabled ? covariance/(covariance+assumedNoise*assumedNoise) : 1;
        state.estimate+=state.kalmanGain*(observation-state.estimate);
        if (sensorEnabled) covariance*=(1-state.kalmanGain);
        rawErrorIntegral+=Math.abs(observation-state.lateral);
      }
      state.uncertainty=sensorEnabled ? Math.sqrt(covariance) : state.gpsNoise;
      estimateErrorIntegral+=Math.abs(state.estimate-state.lateral)*dt;
    }
    function record(dt) {
      state.trackingError=state.lateral-roadAt(state.distance);
      state.errorSum+=Math.abs(state.trackingError)*dt;
      state.offroad=Math.abs(state.trackingError)>spec.halfWidth-carRadius;
      if(state.offroad) {state.offroadTime+=dt; shoulderClock+=dt;}
      else shoulderClock=0;
      // Return a car facing backwards or stuck on the shoulder to the route.
      if(shoulderClock>1.35 || Math.cos(state.heading)<-.45){
        state.lateral=roadAt(state.distance);
        state.heading=tangent(state.distance);
        state.speed=Math.min(3,state.speed); state.steering=0; state.recoveries++;
        shoulderClock=0; plannerClock=0;
        if(kind==="fusion") {state.estimate=state.lateral;state.deadReckoning=state.lateral;covariance=.3;}
      }
      for(const [i,o] of state.obstacles.entries()){
        const gap=Math.hypot(state.lateral-o.x,state.distance-o.z)-o.r-carRadius;
        state.metrics.nearestClearance=Math.min(state.metrics.nearestClearance??Infinity,gap);
        if(gap<0 && !hit.has(i)){
          hit.add(i);state.collisions++;state.collisionFlash=0.55;
          state.speed=Math.max(1.8,state.speed*.4);
        }
      }
      state.collisionFlash=Math.max(0,state.collisionFlash-dt);
      if(kind==="fusion") {
        state.metrics.meanEstimateError=estimateErrorIntegral/state.elapsed;
        state.metrics.meanGpsError=rawErrorIntegral/Math.max(1,noisePhase);
      }
      state.metrics.meanTrackError=state.errorSum/state.elapsed;
      const skillPenalty=kind==="avoid"?state.collisions*155:kind==="tracking"?
        state.metrics.meanTrackError*120:state.metrics.meanEstimateError*150;
      state.score=Math.max(0,Math.round(1000-skillPenalty-state.offroadTime*18-state.recoveries*30));
      state.metrics.score=state.score;
      if(state.distance>=spec.length){
        state.distance=spec.length; state.done=true;
        state.passed=state.offroadTime<=3 && (kind==="tracking"?state.metrics.meanTrackError<=1.2:
          kind==="avoid"?state.collisions<=1:state.metrics.meanEstimateError<=1);
      }
    }
    function update(dt,input={}) {
      if(state.done || !Number.isFinite(dt) || dt<=0) return state;
      const assist=input.assist!==false;
      const turn=clamp(Number(input.steer)||0,-1,1);
      const param=clamp(Number.isFinite(input.param)?input.param:spec.param,...spec.range);
      state.assist=assist;state.param=param;
      // Substeps uniform at the caller's standard 30 or 60 FPS; discard long idle gaps.
      let remaining=Math.min(dt,.25);
      while(remaining>1e-7 && !state.done){
        const tick=Math.min(remaining,1/60);
        remaining-=tick; state.elapsed+=tick;
        let commanded, targetSpeed=spec.cruise;
        if(kind==="avoid"){
          plannerClock-=tick;
          if(sensorEnabled){
            if(plannerClock<=0) {refreshSensor();planWindow(param);plannerClock=.12;}
            commanded=clearRoadSteering;
            if(assist) targetSpeed=plannedSpeed;
          } else {
            commanded=pursue(state.lateral,12);
          }
        } else {
          if(kind==="tracking") refreshSensor();
          state.lookahead=kind==="tracking"?param:9;
          commanded=pursue(kind==="fusion"?state.estimate:state.lateral,state.lookahead);
        }
        const steering=clamp((assist?commanded:0)+turn*(assist?.32:maxSteering),-maxSteering,maxSteering);
        if(input.brake) targetSpeed=0;
        if(state.offroad) targetSpeed=Math.min(targetSpeed,5);
        setPose(state,steering,targetSpeed,tick);
        if(kind==="fusion") {sense(tick,param);refreshSensor();}
        record(tick);
      }
      return state;
    }
    restart();
    return {state,roadAt,update,restart,setSensorEnabled,equipSensor:()=>setSensorEnabled(true)};
  }
  globalThis.createDriveStage=createDriveStage;
})();
