import {vec2} from 'littlejsengine';

import { obj, staticMasses, mobileMasses, futurePositions, futureMobilePositions, futureStepsObj, futureStepsMobiles, samplingConstant } from './state.js';
import { calcGravityAccel, calcMobileGravAccel, integratePosition } from './math.js';

export function computePredictedPath() {
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

  for (let i = 0; i < futureStepsObj; i++) {
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
    for (let mIndex = 0; mIndex < futureMobileMassesForObj.length; mIndex++) {
      const mm = futureMobileMassesForObj[mIndex];
      integratePosition(mm.pos, mm.vel, vec2(mm.ax, mm.ay));
    }

    // integrate futureObj last
    integratePosition(futureObj.pos, futureObj.vel, vec2(futureObj.ax, futureObj.ay));

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

  for (let i = 0; i < futureStepsMobiles; i++) {
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
    for (let mIndex = 0; mIndex < futureMobileMasses.length; mIndex++) {
      const mm = futureMobileMasses[mIndex];
      integratePosition(mm.pos, mm.vel, vec2(mm.ax, mm.ay));
    }

    // record
    for (let mIndex = 0; mIndex < futureMobileMasses.length; mIndex++) {
      futureMobilePositions[mIndex].push(futureMobileMasses[mIndex].pos.copy());
    }
  }
}

// exported for potential future use (not currently used directly)
export { samplingConstant };
