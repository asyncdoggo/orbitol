import { vec2 } from 'littlejsengine';

import {
  obj,
  futurePositions,
  futureMobilePositions,
  futureStepsObj,
  futureStepsMobiles,
  samplingConstant,
  getStaticMasses,
  getMobileMasses,
  dtScale,
  keyboardAx,
  keyboardAy
} from './state.js';

import { calcGravityAccel, calcMobileGravAccel, integratePosition } from './math.js';

export function computePredictedPath() {
  const staticMasses = getStaticMasses();
  const mobileMasses = getMobileMasses();

  // Match live simulation's dtScale substep splitting
  const rawTimeScale = dtScale;
  const clampedTimeScale = rawTimeScale < 0 ? 0 : rawTimeScale;

  const fullSteps = Math.floor(clampedTimeScale);
  const frac = clampedTimeScale - fullSteps;

  // reset arrays (keep references from state module)
  futurePositions.length = 0;
  futureMobilePositions.length = 0;

  // --- Predict blue object for futureStepsObj (and also move masses along the way) ---
  const futureObj = {
    pos: obj.pos.copy(),
    vel: obj.vel.copy(),
    ax: 0,
    ay: 0,
    mass: obj.mass,
  };

  const futureStaticMasses = staticMasses.map(sm => ({
    pos: sm.pos.copy(),
    mass: sm.mass,
  }));

  const futureMobileMassesForObj = mobileMasses.map(mm => ({
    pos: mm.pos.copy(),
    vel: mm.vel.copy(),
    ax: 0,
    ay: 0,
    mass: mm.mass,
  }));

  futurePositions.push(futureObj.pos.copy());

  const runSubStepForObj = (subDt) => {
    futureObj.ax = 0;
    futureObj.ay = 0;

    for (const mm of futureMobileMassesForObj) {
      mm.ax = 0;
      mm.ay = 0;
    }

    // gravity from ALL masses to futureObj
    for (const sm of futureStaticMasses) {
      const a = calcGravityAccel(futureObj, sm.pos, sm.mass);
      futureObj.ax += a.x;
      futureObj.ay += a.y;
    }
    for (const mm of futureMobileMassesForObj) {
      const a = calcGravityAccel(futureObj, mm.pos, mm.mass);
      futureObj.ax += a.x;
      futureObj.ay += a.y;
    }

    // gravity to moving masses from static masses only
    for (const mm of futureMobileMassesForObj) {
      for (const sm of futureStaticMasses) {
        const a = calcMobileGravAccel(mm, sm.pos, sm.mass);
        mm.ax += a.x;
        mm.ay += a.y;
      }
    }

    // moving-mobile mutual gravity
    for (const sm1 of futureMobileMassesForObj) {
      for (const sm2 of futureMobileMassesForObj) {
        if (sm1 !== sm2) {
          const a = calcGravityAccel(sm1, sm2.pos, sm2.mass);
          sm1.ax += a.x;
          sm1.ay += a.y;
        }
      }
    }

    // integrate moving masses first
    for (const mm of futureMobileMassesForObj) {
      integratePosition(mm.pos, mm.vel, vec2(mm.ax, mm.ay), subDt);
    }

    // integrate futureObj last
    integratePosition(futureObj.pos, futureObj.vel, vec2(futureObj.ax, futureObj.ay), subDt);
  };

  const substepCount = fullSteps > 0 ? fullSteps : 0;

  for (let i = 0; i < futureStepsObj; i++) {
    for (let s = 0; s < substepCount; s++) runSubStepForObj(1);
    if (frac > 0) runSubStepForObj(frac);
    else if (clampedTimeScale === 0 && substepCount === 0) {
      // nothing
    } else if (substepCount === 0) {
      // dtScale between 0 and 1 => run one fractional dt
      runSubStepForObj(clampedTimeScale);
    }
    futurePositions.push(futureObj.pos.copy());
  }

  // --- Predict moving masses for futureStepsMobiles only ---
  const futureMobileMasses = mobileMasses.map(mm => ({
    pos: mm.pos.copy(),
    vel: mm.vel.copy(),
    ax: 0,
    ay: 0,
    mass: mm.mass,
  }));

  // init lists
  for (let mIndex = 0; mIndex < futureMobileMasses.length; mIndex++) {
    futureMobilePositions.push([futureMobileMasses[mIndex].pos.copy()]);
  }

  const runSubStepForMobiles = (subDt) => {
    for (const mm of futureMobileMasses) {
      mm.ax = 0;
      mm.ay = 0;
    }

    // gravity to moving masses from static masses only
    for (const mm of futureMobileMasses) {
      for (const sm of futureStaticMasses) {
        const a = calcMobileGravAccel(mm, sm.pos, sm.mass);
        mm.ax += a.x;
        mm.ay += a.y;
      }
    }

    // moving-mobile mutual gravity
    for (const sm1 of futureMobileMasses) {
      for (const sm2 of futureMobileMasses) {
        if (sm1 !== sm2) {
          const a = calcGravityAccel(sm1, sm2.pos, sm2.mass);
          sm1.ax += a.x;
          sm1.ay += a.y;
        }
      }
    }

    // integrate moving masses
    for (const mm of futureMobileMasses) {
      integratePosition(mm.pos, mm.vel, vec2(mm.ax, mm.ay), subDt);
    }
  };

  for (let i = 0; i < futureStepsMobiles; i++) {
    for (let s = 0; s < substepCount; s++) runSubStepForMobiles(1);
    if (frac > 0) runSubStepForMobiles(frac);
    else if (clampedTimeScale === 0 && substepCount === 0) {
      // nothing
    } else if (substepCount === 0) {
      runSubStepForMobiles(clampedTimeScale);
    }

    // record
    for (let mIndex = 0; mIndex < futureMobileMasses.length; mIndex++) {
      futureMobilePositions[mIndex].push(futureMobileMasses[mIndex].pos.copy());
    }
  }
}

// keep export to match any existing imports (even if unused)
export { samplingConstant };
